/**
 * 최종기획서 24개월 적용 예시 (EX24)
 * 28세 · 세후 월 260만원 · 전세 보증금 3,000만원 (자기자금 1,080만원 + 전세자금대출 1,920만원 안내)
 * 시점별 수치는 진단·배분·변화 감지 규칙으로 계산한다. 가정값은 JOURNEY_ASSUMPTIONS에 명시한다.
 */

import type { ExampleJourneyResponse, JourneyStage, MonthlyAggregate, PlanProposal } from "../data/apiContracts";
import { API_CONTRACT_VERSION } from "../data/apiContracts";
import { REFERENCE_CATALOG } from "../fixtures/generated/referenceCatalog";
import { getDataset } from "../fixtures/mockDatasets";
import type { PolicyRule } from "../fixtures/policyRules";
import { detectMonthlyChanges } from "./changeDetection";
import { addDays, addMonthsToMonth, kstTimestamp, monthOf } from "./dateUtils";
import { buildDiagnosis, customerAt, evaluateAllPolicies, snapshotIdOf } from "./diagnosis";
import { evaluatePolicyRule } from "./eligibility";
import { buildGoalPlan } from "./goalPlanner";
import { RULE_CONFIG, RULE_VERSION, formatWon, roundWon } from "./ruleConfig";

export const JOURNEY_ASSUMPTIONS = {
  rentSupportMonthly: 200_000,
  salaryRiseFromMonth: 5,
  salaryRiseAmount: 200_000,
  depositTarget: 30_000_000,
  depositSelfFundTarget: 10_800_000,
  earlyTerminationRate: 1.0,
  depositLoanSpread: 1.0,
  urgentCashNeed: 2_000_000,
  urgentCashMonths: 3,
  marriageMonthly: 450_000,
} as const;

const NEW_POLICY: PolicyRule = {
  policyId: "mock-youth-new-2027",
  policyName: "대구 청년 전세보증금 이자지원 (신규 합성 예시)",
  organization: "대구광역시",
  policyVersion: "2027-12-01",
  ageRange: [19, 34],
  region: "대구광역시",
  maxAnnualIncome: null,
  maxMedianIncomeRatio: 150,
  employmentTypes: null,
  requiresHomeless: true,
  applicationStart: "2027-12-01",
  applicationEnd: "2028-01-31",
  announced: true,
  sourceNote: "EX24 시나리오 전용 합성 정책 (실제 정책 아님)",
};

/** 적금 누적 이자 (단리, 월 납입 n회, 원 단위 반올림) */
const installmentInterest = (monthly: number, annualRatePercent: number, months: number) => roundWon((monthly * (annualRatePercent / 100) * (months * (months + 1))) / 2 / 12);

export function buildExampleJourney(): ExampleJourneyResponse {
  const dataset = getDataset("EX24");
  const start = dataset.asOf; // 2026-09-10
  const dateAt = (month: number) => `${addMonthsToMonth(monthOf(start), month)}-${start.slice(8)}`;
  const diagnosis = buildDiagnosis(dataset);
  const initialSurplus = diagnosis.metrics.availableSurplus ?? 0;
  const leakageMonthly = diagnosis.leakageCandidates.reduce((acc, item) => acc + item.estimatedMonthlyCost, 0);
  const executable = initialSurplus + leakageMonthly + JOURNEY_ASSUMPTIONS.rentSupportMonthly;

  const plan1: PlanProposal = buildGoalPlan({
    customerId: dataset.customer.id,
    version: 1,
    baselineSnapshotId: snapshotIdOf(dataset.customer.id, dateAt(1)),
    boundaryId: dataset.boundaryId,
    asOf: dateAt(1),
    createdAt: kstTimestamp(dateAt(1)),
    availableSurplus: executable,
    goals: dataset.goals,
    eligibility: evaluateAllPolicies(customerAt(dataset.customer, dateAt(1)), dateAt(1)),
  });

  const allocationsOf = (plan: PlanProposal, extra: Record<string, number> = {}) =>
    plan.allocations.map((item) => ({ goalId: item.goalId, label: item.goalTitle, amount: item.monthlyAmount + (extra[item.goalId] ?? 0) }));
  const sum = (list: Array<{ amount: number }>) => list.reduce((acc, item) => acc + item.amount, 0);
  const depositMonthly = plan1.allocations.find((item) => item.goalId === "ex-deposit")!.monthlyAmount;
  const progress = (month: number) => {
    const saved = Math.min(JOURNEY_ASSUMPTIONS.depositSelfFundTarget, depositMonthly * month);
    return { depositSavedAmount: saved, depositProgressPercent: Math.floor((saved * 100) / JOURNEY_ASSUMPTIONS.depositSelfFundTarget) };
  };

  // 7개월차: 급여 인상 3개월 연속 확인 → 증가분 60%를 청년도약계좌에 증액
  const salarySeries: MonthlyAggregate[] = Array.from({ length: 8 }, (_, month) => {
    const salary = 2_600_000 + (month >= JOURNEY_ASSUMPTIONS.salaryRiseFromMonth ? JOURNEY_ASSUMPTIONS.salaryRiseAmount : 0);
    const base = diagnosis.monthly[diagnosis.monthly.length - 1];
    return { ...base, month: addMonthsToMonth(monthOf(start), month), salary, income: salary, surplus: (base.surplus ?? 0) + (salary - 2_600_000) };
  });
  const rise = detectMonthlyChanges({ customer: customerAt(dataset.customer, dateAt(7)), customerChanges: {}, monthly: salarySeries, reviewMonth: monthOf(dateAt(7)), dataAsOf: dateAt(7) });
  const riseEvent = rise.events.find((event) => event.ruleId === "CHG-SALARY-RISE");
  if (!riseEvent || rise.salaryRiseSavingsIncrease === null) throw new Error("EX24: salary rise rule did not fire at month 7");
  const doyakCap = 700_000;
  const doyakBase = plan1.allocations.find((item) => item.goalId === "ex-doyak")!.monthlyAmount;
  const doyakIncrease = Math.min(rise.salaryRiseSavingsIncrease, doyakCap - doyakBase);
  const afterRise = allocationsOf(plan1, { "ex-doyak": doyakIncrease });

  // 11개월차: 중도해지 vs 예·적금담보대출 비교
  const product = REFERENCE_CATALOG.financialProducts.find((item) => item.id === "finlife-BANK08-SAVE008")!;
  const paidMonths = 11;
  const interestFull = installmentInterest(depositMonthly, product.maxRate, paidMonths);
  const interestEarly = installmentInterest(depositMonthly, JOURNEY_ASSUMPTIONS.earlyTerminationRate, paidMonths);
  const terminationLoss = interestFull - interestEarly;
  const loanRate = product.maxRate + JOURNEY_ASSUMPTIONS.depositLoanSpread;
  const loanCost = roundWon((JOURNEY_ASSUMPTIONS.urgentCashNeed * (loanRate / 100) * JOURNEY_ASSUMPTIONS.urgentCashMonths) / 12);

  // 15개월차: 신규 정책 판정
  const policyCheck = evaluatePolicyRule(NEW_POLICY, customerAt(dataset.customer, dateAt(15)), dateAt(15));

  // 24개월차: 적금 만기 30일 전 안내 (1개월차 가입, 24회 납입)
  const maturityDate = dateAt(25);
  const noticeDate = addDays(maturityDate, -RULE_CONFIG.maturityNoticeDays);
  const atMaturity = afterRise
    .filter((item) => item.goalId === "ex-doyak")
    .concat({ goalId: "ex-marriage", label: "결혼자금 (다음 목표)", amount: JOURNEY_ASSUMPTIONS.marriageMonthly });

  const stage = (month: number, fields: Omit<JourneyStage, "month" | "date" | "label" | "depositSavedAmount" | "depositProgressPercent" | "monthlyManagedAmount">): JourneyStage => ({
    month,
    date: month === 24 ? noticeDate : dateAt(month),
    label: month === 0 ? "가입" : `${month}개월`,
    monthlyManagedAmount: sum(fields.allocations),
    ...progress(month),
    ...fields,
  });

  const stages: JourneyStage[] = [
    stage(0, {
      title: "3분 재무진단",
      summary: `최근 ${diagnosis.window.monthsUsed}개월 거래로 월 저축 여력 ${formatWon(initialSurplus)}을 확인하고, 새는 돈 후보 월 ${formatWon(leakageMonthly)}(미사용 구독·리볼빙 이자)을 찾았어요.`,
      eventType: "INFO",
      ruleId: "DIAGNOSIS",
      headlineLabel: "월 저축 여력",
      headlineAmount: initialSurplus,
      details: diagnosis.leakageCandidates.map((item) => ({ label: item.title, value: `월 ${formatWon(item.estimatedMonthlyCost)} (${item.confidence})` })),
      allocations: [],
      action: "최근 거래 진단 완료",
    }),
    stage(1, {
      title: "포트폴리오 실행",
      summary: `새는 돈 정리 ${formatWon(leakageMonthly)}과 월세지원 ${formatWon(JOURNEY_ASSUMPTIONS.rentSupportMonthly)}을 반영해 월 ${formatWon(plan1.totalMonthlyAmount)}을 네 가지 목표로 나눴어요.`,
      eventType: "ADJUSTMENT",
      ruleId: "PLAN-INITIAL",
      headlineLabel: "월 배분 합계",
      headlineAmount: plan1.totalMonthlyAmount,
      details: plan1.allocations.map((item) => ({ label: item.goalTitle, value: `${formatWon(item.monthlyAmount)} · ${item.productName}` })),
      allocations: allocationsOf(plan1),
      action: "모의 자동이체 승인",
    }),
    stage(7, {
      title: `급여 ${formatWon(JOURNEY_ASSUMPTIONS.salaryRiseAmount)} 인상`,
      summary: `${RULE_CONFIG.salaryRiseMonths}개월 연속 인상을 확인하고 증가분 중 ${formatWon(doyakIncrease)}을 정부기여금이 붙는 청년도약계좌에 더 배분했어요.`,
      eventType: riseEvent.type,
      ruleId: riseEvent.ruleId,
      headlineLabel: "월 배분 합계",
      headlineAmount: sum(afterRise),
      details: [
        { label: "기존 급여", value: formatWon(Number(riseEvent.oldValue)) },
        { label: "인상 후 급여", value: formatWon(Number(riseEvent.newValue)) },
        { label: "저축 증액 후보", value: formatWon(rise.salaryRiseSavingsIncrease) },
      ],
      allocations: afterRise,
      action: "증액안 확인",
    }),
    stage(11, {
      title: "중도해지 방어",
      summary: `급전 ${formatWon(JOURNEY_ASSUMPTIONS.urgentCashNeed)}이 필요한 상황에서 적금 해지 시 이자 손실 ${formatWon(terminationLoss)}과 담보대출 ${JOURNEY_ASSUMPTIONS.urgentCashMonths}개월 이자 ${formatWon(loanCost)}을 비교했어요.`,
      eventType: "ADJUSTMENT",
      ruleId: "CHG-EARLY-TERMINATION",
      headlineLabel: "월 배분 합계",
      headlineAmount: sum(afterRise),
      details: [
        { label: "적금 납입 누적", value: formatWon(depositMonthly * paidMonths) },
        { label: `만기 유지 시 이자 (${product.maxRate}%)`, value: formatWon(interestFull) },
        { label: `중도해지 이자 (${JOURNEY_ASSUMPTIONS.earlyTerminationRate}%)`, value: formatWon(interestEarly) },
        { label: "중도해지 손실", value: formatWon(terminationLoss) },
        { label: `예·적금담보대출 이자 (${loanRate}%, ${JOURNEY_ASSUMPTIONS.urgentCashMonths}개월)`, value: formatWon(loanCost) },
        { label: "권장", value: loanCost < terminationLoss ? "담보대출 후 적금 유지" : "중도해지 검토" },
      ],
      allocations: afterRise,
      action: "대안 비교",
    }),
    stage(15, {
      title: "신규 정책 발견",
      summary: `${NEW_POLICY.policyName}의 합성 자격 조건을 확인했어요. 판정: ${policyCheck.status}. 신청 기간 ${NEW_POLICY.applicationStart} ~ ${NEW_POLICY.applicationEnd}.`,
      eventType: "ADJUSTMENT",
      ruleId: "CHG-POLICY-NEW",
      headlineLabel: "월 배분 합계",
      headlineAmount: sum(afterRise),
      details: policyCheck.criteria.map((item) => ({ label: item.required, value: `${item.status} (${item.observed ?? "확인값 없음"})` })),
      allocations: afterRise,
      action: "지원제도 확인",
    }),
    stage(21, {
      title: "전세 계약 준비",
      summary: `자기자금 ${formatWon(progress(21).depositSavedAmount)}을 모았어요. 남은 보증금 ${formatWon(JOURNEY_ASSUMPTIONS.depositTarget - JOURNEY_ASSUMPTIONS.depositSelfFundTarget)}에 대한 전세자금대출 조건과 모의 영업점 상담을 안내했어요.`,
      eventType: "INFO",
      ruleId: "JOURNEY-HOUSING-PREP",
      headlineLabel: "월 배분 합계",
      headlineAmount: sum(afterRise),
      details: [
        { label: "보증금 목표", value: formatWon(JOURNEY_ASSUMPTIONS.depositTarget) },
        { label: "자기자금 목표", value: formatWon(JOURNEY_ASSUMPTIONS.depositSelfFundTarget) },
        { label: "전세자금대출 필요액 (심사·승인 아님)", value: formatWon(JOURNEY_ASSUMPTIONS.depositTarget - JOURNEY_ASSUMPTIONS.depositSelfFundTarget) },
      ],
      allocations: afterRise,
      action: "상담 준비",
    }),
    stage(24, {
      title: "만기·다음 목표",
      summary: `보증금 적금이 ${maturityDate}에 만기돼요(D-${RULE_CONFIG.maturityNoticeDays}). 자기자금 목표를 채웠고, 사라지는 월세 대신 결혼자금 월 ${formatWon(JOURNEY_ASSUMPTIONS.marriageMonthly)} 적립을 제안했어요.`,
      eventType: "ADJUSTMENT",
      ruleId: "CHG-MATURITY",
      headlineLabel: "결혼자금 월 적립",
      headlineAmount: JOURNEY_ASSUMPTIONS.marriageMonthly,
      details: [
        { label: "만기일", value: maturityDate },
        { label: "보증금 적금 원금", value: formatWon(depositMonthly * 24) },
        { label: "비상자금·청약", value: "목표 달성" },
      ],
      allocations: atMaturity,
      action: "다음 목표 시작",
    }),
  ];

  return {
    contractVersion: API_CONTRACT_VERSION,
    ruleVersion: RULE_VERSION,
    customer: diagnosis.customer,
    baseline: {
      monthlyIncome: diagnosis.metrics.monthlyIncome ?? 0,
      initialSurplus,
      leakageMonthly,
      rentSupportMonthly: JOURNEY_ASSUMPTIONS.rentSupportMonthly,
      executableMonthly: plan1.totalMonthlyAmount,
      depositTarget: JOURNEY_ASSUMPTIONS.depositTarget,
      depositSelfFundTarget: JOURNEY_ASSUMPTIONS.depositSelfFundTarget,
      depositLoanPortion: JOURNEY_ASSUMPTIONS.depositTarget - JOURNEY_ASSUMPTIONS.depositSelfFundTarget,
    },
    stages,
    assumptions: [
      `월세지원 ${formatWon(JOURNEY_ASSUMPTIONS.rentSupportMonthly)}은 선정을 가정한 시나리오 값입니다. 실제 정책 수혜를 확정하지 않습니다.`,
      "새는 돈 후보(미사용 구독·리볼빙 이자)는 사용자가 정리했다고 가정합니다.",
      `${JOURNEY_ASSUMPTIONS.salaryRiseFromMonth}개월차부터 급여가 ${formatWon(JOURNEY_ASSUMPTIONS.salaryRiseAmount)} 오른다고 가정합니다.`,
      "보증금 3,000만원 = 자기자금 1,080만원(목표 적금) + 전세자금대출 1,920만원. 대출은 조건 안내일 뿐 심사·승인이 아닙니다.",
      "진행률은 자기자금 목표 대비 적금 원금 누적이며 이자는 제외합니다.",
      `중도해지 이율 ${JOURNEY_ASSUMPTIONS.earlyTerminationRate}%, 담보대출 가산 ${JOURNEY_ASSUMPTIONS.depositLoanSpread}%p는 합성 가정값입니다.`,
    ],
    isSynthetic: true,
  };
}
