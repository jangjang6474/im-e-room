/**
 * Mock Backend 계약·규칙 검증 (npm run data:validate 에서 실행)
 * AGENTS.md 7장의 경계 사례를 합성 데이터로 확인한다: 월말, 철회, 결측, 중복 거래, 음수 여력,
 * 자격 미확인, 정책 만료, 목표 달성 불가, 오래된 승인, 중복 실행.
 */

import { readFile, readdir } from "node:fs/promises";
import path from "node:path";
import type { MonthlyAggregate, PersonaId, PlanProposal, SyntheticDataset } from "../../frontend/src/data/apiContracts";
import { REFERENCE_CATALOG } from "../../frontend/src/fixtures/generated/referenceCatalog";
import { MOCK_DATASETS } from "../../frontend/src/fixtures/mockDatasets";
import { PERSONA_SCENARIOS } from "../../frontend/src/fixtures/personaScenarios";
import { POLICIES_DATA } from "../../frontend/src/fixtures/syntheticData";
import { reviewNeedsAttention } from "../../frontend/src/api/labels";
import { detectMonthlyChanges } from "../../frontend/src/domain/changeDetection";
import { ageAt, nextCollectionDate } from "../../frontend/src/domain/dateUtils";
import { buildDiagnosis, customerAt } from "../../frontend/src/domain/diagnosis";
import { calculateSnapshotMetrics } from "../../frontend/src/domain/financialEngine";
import { buildGoalPlan } from "../../frontend/src/domain/goalPlanner";
import {
  MockBackendError,
  MockBackendSession,
  getDiagnosis,
  getEligibility,
  getExampleJourney,
  getInitialPlan,
  getMonthlyReview,
  getProductBoundary,
} from "../../frontend/src/domain/mockBackend";
import { projectRoot } from "./shared";

const errors: string[] = [];
let checks = 0;
const check = (condition: unknown, message: string) => {
  checks += 1;
  if (!condition) errors.push(message);
};
const personas = Object.keys(MOCK_DATASETS) as PersonaId[];

// 1. 합성 표시와 데이터 관계
for (const personaId of personas) {
  const d: SyntheticDataset = MOCK_DATASETS[personaId];
  check(d.isSynthetic === true && d.customer.isSynthetic === true, `${personaId}: isSynthetic must be true`);
  check(d.accounts.every((a) => a.isSynthetic === true), `${personaId}: every account must be synthetic`);
  check(!d.customer.birthDate || ageAt(d.customer.birthDate, d.asOf) === d.customer.age, `${personaId}: age does not match birthDate at asOf`);
  check(Number(d.consent.consentedAt.slice(8, 10)) === d.consent.anchorDay, `${personaId}: anchorDay must equal consent day`);
  const accountIds = new Set(d.accounts.map((a) => a.accountId));
  for (const tx of [...d.transactions, ...d.nextMonth.transactions]) {
    check(accountIds.has(tx.accountId), `${personaId}: ${tx.id} references unknown account`);
    check(Number.isInteger(tx.amount) && tx.amount > 0, `${personaId}: ${tx.id} amount must be a positive integer`);
    check(tx.postedAt <= d.nextMonth.asOf, `${personaId}: ${tx.id} is after the review date`);
  }
  for (const tx of d.transactions) check(tx.postedAt <= d.asOf, `${personaId}: ${tx.id} is after baseline asOf`);
  for (const goal of d.goals) {
    const known = goal.productId === null || POLICIES_DATA.some((p) => p.id === goal.productId) || REFERENCE_CATALOG.financialProducts.some((p) => p.id === goal.productId);
    check(known, `${personaId}: goal ${goal.id} references unknown product ${goal.productId}`);
  }
}

// 2. 결정성: 같은 입력·규칙 버전 → 같은 응답
for (const personaId of personas) {
  for (const [name, fn] of [["diagnosis", getDiagnosis], ["eligibility", getEligibility], ["plan", getInitialPlan], ["monthly-review", getMonthlyReview]] as const) {
    check(JSON.stringify(fn(personaId)) === JSON.stringify(fn(personaId)), `${personaId}: ${name} is not deterministic`);
  }
}
check(JSON.stringify(getExampleJourney()) === JSON.stringify(getExampleJourney()), "example journey is not deterministic");

// 3. 거래 정규화: 중복 제거, 내부이체 제외, 결측 ≠ 0
const p01 = getDiagnosis("P01");
check(p01.window.duplicatesRemoved === 2, `P01: expected 2 duplicates removed, got ${p01.window.duplicatesRemoved}`);
check(p01.metrics.monthlyIncome === 2_600_000, `P01: own transfers must not inflate income (got ${p01.metrics.monthlyIncome})`);
check(p01.transactions.filter((tx) => tx.merchantCategory === "CARD_PAYMENT").every((tx) => tx.excludedFromTotals), "P01: card bill payments must be excluded");
check(p01.window.completeness === "COMPLETE" && p01.window.monthsUsed === 6, "P01: expected 6 complete months");
const p03 = getDiagnosis("P03");
check(p03.window.completeness === "PARTIAL" && p03.window.missingMonths.join() === "2026-04", "P03: 2026-04 must be a missing month");
const gap = p03.monthly.find((m) => m.month === "2026-04");
check(!!gap && gap.isGap && gap.income === null && gap.variable === null, "P03: gap month values must be null, not 0");
check(p03.window.monthsUsed === 5, "P03: gap month must be excluded from averages");
const empty = buildDiagnosis({ ...MOCK_DATASETS.P01, transactions: [] });
check(empty.window.completeness === "INSUFFICIENT" && empty.metrics.availableSurplus === null && empty.metrics.monthlyIncome === null, "empty dataset: metrics must be null");
const emptyPlan = buildGoalPlan({ customerId: "x", version: 1, baselineSnapshotId: "s", boundaryId: "STABLE", asOf: "2026-09-15", createdAt: "2026-09-15T09:00:00+09:00", availableSurplus: null, goals: MOCK_DATASETS.P01.goals, eligibility: [] });
check(emptyPlan.totalMonthlyAmount === 0 && emptyPlan.allocations.every((a) => a.expectedMonths === null), "null surplus: nothing may be allocated");

// 4. 저축 여력 = 소득 - 고정 - 변동 - 비정기 - 부채
for (const personaId of personas) {
  const m = getDiagnosis(personaId).metrics;
  const expected = m.monthlyIncome! - m.fixedExpenses! - m.variableExpenses! - m.irregularExpensesMonthly! - m.debtPayment!;
  check(m.availableSurplus === expected, `${personaId}: surplus formula mismatch`);
}

// 5. 새는 돈 후보
const leakP01 = p01.leakageCandidates;
check(leakP01.some((l) => l.counterparty === "뮤직온" && l.type === "UNUSED_SUBSCRIPTION" && l.confidence === "HIGH"), "P01: unused 뮤직온 subscription must be detected");
check(!leakP01.some((l) => l.counterparty === "스트림플러스"), "P01: recently used subscription must not be a candidate");
const leakP02 = getDiagnosis("P02").leakageCandidates;
check(leakP02.some((l) => l.counterparty === "영상클럽" && l.confidence === "LOW"), "P02: unknown usage must be LOW confidence");
check(leakP02.some((l) => l.type === "REVOLVING_INTEREST"), "P02: revolving interest must be detected");
check(personas.every((p) => getDiagnosis(p).leakageCandidates.every((l) => l.reviewStatus === "NEEDS_USER_CONFIRMATION" && l.evidenceTransactionIds.length > 0)), "leakage candidates must be unconfirmed and evidenced");

// 6. 정책 자격
const status = (personaId: PersonaId, policyId: string) => getEligibility(personaId).results.find((r) => r.policyId === policyId)!;
check(status("P01", "policy-doyak").status === "NEEDS_VERIFICATION", "P01: unknown median income ratio must be NEEDS_VERIFICATION");
check(status("P02", "policy-doyak").status === "ELIGIBLE", "P02: doyak should be ELIGIBLE");
check(status("P02", "policy-daegu-hope").status === "INELIGIBLE", "P02: income above limit must be INELIGIBLE");
check(status("P03", "policy-daegu-hope").status === "INELIGIBLE", "P03: freelancer must not meet SALARIED requirement");
check(status("P01", "mock-youth-005").criteria.some((c) => c.key === "APPLICATION_PERIOD" && c.status === "UNMET"), "expired policy must be INELIGIBLE by application period");
check(status("P01", "mock-youth-009").status === "ELIGIBLE" && status("P02", "mock-youth-009").status === "INELIGIBLE", "age range 19~24 policy check failed");
for (const personaId of personas) for (const r of getEligibility(personaId).results) check(r.autoAllocatable === (r.status === "ELIGIBLE"), `${personaId}: autoAllocatable mismatch for ${r.policyId}`);

// 7. 상품 바운더리
for (const boundaryId of ["STABLE", "BALANCED", "GOAL_FOCUSED"] as const) {
  const res = getProductBoundary(boundaryId);
  for (const p of res.products.filter((item) => item.included)) {
    check(res.limits.allowedProductTypes.includes(p.productType) && p.maturityMonths <= res.limits.maxMaturityMonths && p.maxMonthlyDeposit <= res.limits.maxMonthlyDeposit, `${boundaryId}: ${p.productId} violates boundary`);
  }
  check(res.products.filter((p) => !p.included).every((p) => p.exclusionReasons.length > 0), `${boundaryId}: excluded products need reasons`);
}

// 8. 계획 제약
const checkPlan = (label: string, plan: PlanProposal, personaId: PersonaId, asOf: string) => {
  check(plan.availableSurplus === null || plan.totalMonthlyAmount <= Math.max(0, plan.availableSurplus), `${label}: allocation exceeds surplus`);
  const eligibility = getEligibility(personaId).results;
  for (const a of plan.allocations) {
    check(a.monthlyAmount % 10_000 === 0 && a.monthlyAmount >= 0, `${label}: ${a.goalId} amount must be a non-negative multiple of 10,000`);
    check((a.monthlyAmount === 0) === (a.expectedMonths === null) || a.feasibility === "ACHIEVED", `${label}: ${a.goalId} expectedMonths must be null only when nothing is allocated`);
    const policy = eligibility.find((r) => r.policyId === a.productId);
    if (policy && asOf === MOCK_DATASETS[personaId].asOf) check(policy.status === "ELIGIBLE" || a.monthlyAmount === 0, `${label}: ${a.goalId} allocated to non-eligible policy`);
  }
};
for (const personaId of personas) {
  checkPlan(`${personaId} v1`, getInitialPlan(personaId), personaId, MOCK_DATASETS[personaId].asOf);
  const review = getMonthlyReview(personaId);
  if (review.proposedPlan) checkPlan(`${personaId} v2`, review.proposedPlan, personaId, review.currentAsOf);
}
const p01Plan = getInitialPlan("P01");
check(p01Plan.allocations.find((a) => a.goalId === "p1-savings")?.feasibility === "DELAYED", "P01: product limit should delay the savings goal");
check(p01Plan.notices.some((n) => n.includes("더 필요합니다")), "P01: shortfall notice expected");
const p01Doyak = buildGoalPlan({ customerId: "x", version: 1, baselineSnapshotId: "s", boundaryId: "STABLE", asOf: "2026-09-15", createdAt: "t", availableSurplus: 1_000_000, eligibility: getEligibility("P01").results, goals: [{ id: "g", title: "도약", category: "POLICY_SAVINGS", targetAmount: 1_200_000, currentAmount: 0, targetMonths: 12, priority: 1, productId: "policy-doyak" }] });
check(p01Doyak.allocations[0].monthlyAmount === 0 && p01Doyak.allocations[0].feasibility === "BLOCKED", "NEEDS_VERIFICATION policy must not receive automatic allocation");
const negative = buildGoalPlan({ customerId: "x", version: 1, baselineSnapshotId: "s", boundaryId: "STABLE", asOf: "2026-09-15", createdAt: "t", availableSurplus: -120_000, eligibility: [], goals: MOCK_DATASETS.P03.goals });
check(negative.totalMonthlyAmount === 0 && !negative.isFeasible && negative.notices.some((n) => n.includes("불가능")), "negative surplus must block all allocation");

// 9. 월간 변화 감지 · 분류
const r1 = getMonthlyReview("P01");
check(r1.overallType === "INFO" && r1.routing === "REPORT_ONLY" && r1.proposedPlan === null, "P01 review should be INFO/REPORT_ONLY");
const r2 = getMonthlyReview("P02");
check(r2.overallType === "ADJUSTMENT" && r2.routing === "REPLAN" && r2.events.some((e) => e.ruleId === "CHG-RENT-CHANGE"), "P02 review should detect rent change");
check(reviewNeedsAttention(r2, r2.proposedPlan), "P02: proposed review must need attention");
check(
  !reviewNeedsAttention(r2, r2.proposedPlan ? { ...r2.proposedPlan, status: "MOCK_EXECUTED" } : null),
  "P02: executed review must not keep the attention badge",
);
const r3 = getMonthlyReview("P03");
check(r3.overallType === "RISK" && r3.routing === "CONSULTATION" && !!r3.consultationCase, "P03 review should route to consultation");
check(
  reviewNeedsAttention(r3, r3.proposedPlan ? { ...r3.proposedPlan, status: "MOCK_EXECUTED" } : null),
  "P03: unresolved consultation must keep the attention badge after plan execution",
);
check(
  r3.consultationCase?.briefing.financialState.includes("소득 1,300,000원") &&
    r3.consultationCase.briefing.financialState.includes("월 저축 여력 -318,300원"),
  `P03: consultation briefing must use current-month metrics (got ${r3.consultationCase?.briefing.financialState})`,
);
check(r3.events.some((e) => e.type === "INFO") && r3.events.some((e) => e.type === "RISK"), "P03: composite events must keep RISK alongside INFO");
check(r3.proposedPlan !== null && r3.proposedPlan.totalMonthlyAmount < r3.previousPlan.totalMonthlyAmount, "P03: risk replan must reduce contributions");
check(r3.nextCollectionAt.startsWith("2026-10-31"), `P03: month-end anchor 31 → 2026-10-31 (got ${r3.nextCollectionAt})`);
check(nextCollectionDate(31, "2027-01-31") === "2027-02-28" && nextCollectionDate(31, "2027-02-28") === "2027-03-31", "month-end correction must keep the original anchor day");
check(nextCollectionDate(29, "2028-01-29") === "2028-02-29", "leap-year month-end correction failed");
for (const personaId of personas) for (const e of getMonthlyReview(personaId).events) check(e.ruleVersion && e.dataAsOf && e.id.includes(e.ruleId), `${personaId}: event ${e.id} missing version/as-of`);

const series = (salaries: Array<number | null>): MonthlyAggregate[] =>
  salaries.map((salary, i) => ({
    month: `2026-0${i + 1}`,
    isGap: salary === null,
    salary,
    otherIncome: salary === null ? null : 0,
    income: salary,
    fixed: salary === null ? null : 700_000,
    variable: salary === null ? null : 600_000,
    irregular: salary === null ? null : 0,
    debt: salary === null ? null : 0,
    surplus: salary === null ? null : salary - 1_300_000,
    rentPayment: salary === null ? null : 400_000,
  }));
const customer = customerAt(MOCK_DATASETS.P01.customer, "2026-09-15");
const detect = (salaries: Array<number | null>) => detectMonthlyChanges({ customer, customerChanges: {}, monthly: series(salaries), reviewMonth: `2026-0${salaries.length}`, dataAsOf: "2026-09-15" });
check(detect([2_600_000, 2_600_000, 2_600_000, 0, 0]).events.some((e) => e.ruleId === "CHG-INCOME-STOP" && e.type === "RISK"), "2 months without salary must be RISK");
check(detect([2_600_000, 2_600_000, 2_600_000, 0]).events.some((e) => e.ruleId === "CHG-INCOME-MISSED" && e.type === "ADJUSTMENT"), "1 month without salary must be ADJUSTMENT");
check(detect([2_600_000, 2_600_000, 2_600_000, null]).events.every((e) => e.ruleId !== "CHG-INCOME-STOP" && e.ruleId !== "CHG-INCOME-MISSED"), "missing data must not be treated as zero income");
const rise = detect([2_600_000, 2_600_000, 2_800_000, 2_800_000, 2_800_000]);
check(rise.salaryRiseSavingsIncrease === 120_000 && rise.events.some((e) => e.ruleId === "CHG-SALARY-RISE"), "salary rise 3 months +200k → 120k savings candidate");
check(detect([2_600_000, 2_600_000, 2_800_000, 2_800_000]).salaryRiseSavingsIncrease === null, "salary rise requires 3 consecutive months");

// 10. 승인 · 거절 · 모의 실행 · 동의 철회
const session = new MockBackendSession();
const plan = session.proposeInitialPlan("P01");
check(session.proposeInitialPlan("P01").planId === plan.planId && session.listPlans(plan.customerId).length === 1, "re-proposing must be idempotent");
check(session.execute(plan.planId).outcome === "INVALID_STATE", "execution before approval must be blocked");
check(session.approve(plan.planId).outcome === "APPROVED", "approve failed");
check(session.approve(plan.planId).outcome === "ALREADY_APPROVED", "duplicate approval must be ignored");
const first = session.execute(plan.planId);
const again = session.execute(plan.planId);
const otherKey = session.execute(plan.planId, "another-key");
check(first.outcome === "MOCK_EXECUTED" && first.httpStatus === 201 && first.execution?.isMockExecution === true, "first execution must be MOCK_EXECUTED");
check(again.outcome === "DUPLICATE_IGNORED" && again.execution?.id === first.execution?.id, "duplicate execution must return the original record");
check(otherKey.outcome === "DUPLICATE_IGNORED" && session.listExecutions(plan.customerId).length === 1, "a plan must execute at most once");
const p02Plan = session.proposeInitialPlan("P02");
const review = session.runMonthlyReview("P02");
check(session.approve(p02Plan.planId).outcome === "STALE_BASELINE", "approval on an outdated snapshot must be blocked");
check(session.reject(review.proposedPlan!.planId).outcome === "REJECTED", "reject failed");
check(session.approve(review.proposedPlan!.planId).outcome === "INVALID_STATE", "rejected plan must not be approvable");
check(session.approve("missing").httpStatus === 404, "unknown plan must be 404");
session.runMonthlyReview("P03");
check(session.listConsultations().some((c) => c.severity === "CRITICAL" && c.status === "WAITING" && c.isMockCase), "P03 consultation case must be queued");
session.revokeConsent("P01");
try {
  session.runMonthlyReview("P01");
  check(false, "monthly review after consent revocation must fail");
} catch (error) {
  check(error instanceof MockBackendError && error.httpStatus === 409, "revoked consent must return 409");
}

// 11. 최종기획서 24개월 적용 예시
const journey = getExampleJourney();
check(journey.customer.age === 28 && journey.baseline.monthlyIncome === 2_600_000 && journey.baseline.depositTarget === 30_000_000, "EX24: customer baseline mismatch");
check(journey.baseline.initialSurplus === 550_000 && journey.baseline.leakageMonthly === 100_000 && journey.baseline.executableMonthly === 850_000, "EX24: 55만 → 85만 flow mismatch");
const stageAt = (month: number) => journey.stages.find((s) => s.month === month)!;
check(journey.stages.map((s) => s.month).join() === "0,1,7,11,15,21,24", "EX24: stage months mismatch");
check(stageAt(7).monthlyManagedAmount === 970_000 && stageAt(24).depositProgressPercent === 100, "EX24: raise or completion mismatch");
check(journey.stages.every((s, i, list) => i === 0 || s.depositProgressPercent >= list[i - 1].depositProgressPercent), "EX24: progress must not decrease");

// 12. 기존 화면용 페르소나 스냅샷이 Mock Backend 진단과 일치
for (const scenario of PERSONA_SCENARIOS) {
  const legacy = calculateSnapshotMetrics(scenario.createSnapshot());
  const diagnosis = getDiagnosis(scenario.personaId);
  check(legacy.availableSurplus === diagnosis.metrics.availableSurplus, `${scenario.id}: legacy snapshot surplus differs from diagnosis`);
  check(scenario.customer.isSynthetic === true && /^\d{4}-\d{2}-\d{2}T/.test(scenario.consent.nextScheduledCollection), `${scenario.id}: invalid legacy customer/consent`);
  check(!Number.isNaN(Date.parse(scenario.consent.consentedAt)), `${scenario.id}: consentedAt must be a valid date`);
}

// 13. 커밋된 예시 응답이 현재 코드 결과와 같은지
const apiDir = path.join(projectRoot, "data", "mock", "api");
const fixtureFiles = (await readdir(apiDir)).filter((file) => file.endsWith(".json"));
check(fixtureFiles.length >= 20, `data/mock/api must contain generated examples (found ${fixtureFiles.length}). Run npm run data:mock.`);
for (const personaId of personas) {
  const onDisk = JSON.parse(await readFile(path.join(apiDir, `${personaId}.diagnosis.json`), "utf8"));
  check(JSON.stringify(onDisk) === JSON.stringify(getDiagnosis(personaId)), `data/mock/api/${personaId}.diagnosis.json is stale. Run npm run data:mock.`);
}
for (const file of fixtureFiles) {
  const text = await readFile(path.join(apiDir, file), "utf8");
  check(!/"isSynthetic":\s*false/.test(text), `${file}: contains isSynthetic=false`);
}

if (errors.length) throw new Error(`Mock backend validation failed (${errors.length}/${checks}):\n- ${errors.join("\n- ")}`);
console.log(`Mock backend is valid (${checks} checks, personas ${personas.join("/")}).`);
