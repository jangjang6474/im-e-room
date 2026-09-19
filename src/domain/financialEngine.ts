/**
 * iM 이룸 — 결정적 재무 계산 및 규칙 엔진
 * TRD 규정: 금액은 정수(KRW), 계산과 규칙은 100% 재현 가능한 순수 함수로 처리
 */

import {
  FinancialSnapshot,
  Goal,
  PolicyProduct,
  AllocationPlan,
  AllocationItem,
  ChangeEvent,
  DemoCustomer,
} from "../types";

/**
 * 1. 거래 정규화 및 월간 스냅샷 재무 집계
 * 중복 이체 및 카드 대금 이중 차감 방지
 */
export function calculateSnapshotMetrics(snapshot: Omit<FinancialSnapshot, "availableSurplus" | "recommendedEmergencyFund">): FinancialSnapshot {
  const monthlyIncome = Math.round(snapshot.monthlyIncome);
  const fixedExpenses = Math.round(snapshot.fixedExpenses);
  const variableExpenses = Math.round(snapshot.variableExpenses);
  const debtPayment = Math.round(snapshot.debtPayment);

  // 월 가용 저축 여력 = 실소득 - (고정지출 + 변동지출 + 부채원리금)
  const totalOutflow = fixedExpenses + variableExpenses + debtPayment;
  const availableSurplus = monthlyIncome - totalOutflow;

  // 권장 비상자금: 필수 지출(고정+변동)의 3개월분
  const recommendedEmergencyFund = (fixedExpenses + variableExpenses) * 3;

  return {
    ...snapshot,
    monthlyIncome,
    fixedExpenses,
    variableExpenses,
    debtPayment,
    availableSurplus,
    recommendedEmergencyFund,
  };
}

/**
 * 2. 목표별 결정적 자금 배분 알고리즘
 * 제약조건: 총 배분액 <= 월 가용 여력, 상품별 월 납입 한도 준수, 비상자금 우선순위
 */
export function calculateAllocationPlan(
  snapshot: FinancialSnapshot,
  goals: Goal[],
  policies: PolicyProduct[],
  version: string = "v1.0"
): AllocationPlan {
  const surplus = Math.max(0, snapshot.availableSurplus);
  const isSurplusNegative = snapshot.availableSurplus < 0;

  // 정렬: priority 오름차순 (1이 최우선)
  const sortedGoals = [...goals].sort((a, b) => a.priority - b.priority);

  let remainingBudget = surplus;
  const items: AllocationItem[] = [];

  for (const goal of sortedGoals) {
    if (remainingBudget <= 0 || isSurplusNegative) {
      items.push({
        goalId: goal.id,
        goalTitle: goal.title,
        productId: goal.recommendedProductId || "direct-saving",
        productName: getProductName(goal.recommendedProductId, policies),
        monthlyAmount: 0,
        expectedCompletionMonths: 999,
        allocationRatio: 0,
      });
      continue;
    }

    // 목표 달성에 필요한 이상적 월 납입액
    const neededMonths = Math.max(1, goal.targetMonths);
    const neededAmount = Math.max(0, goal.targetAmount - goal.currentAmount);
    const idealMonthly = Math.ceil(neededAmount / neededMonths);

    // 정책 상품 연계 시 상품 최대 한도 확인
    const matchedPolicy = policies.find((p) => p.id === goal.recommendedProductId);

    // 자격이 확인되지 않았거나 미충족인 상품은 자동 배분하지 않는다.
    // 사용자가 증빙을 마치기 전까지 해당 목표는 0원으로 유지한다.
    if (matchedPolicy && matchedPolicy.eligibility !== "ELIGIBLE") {
      items.push({
        goalId: goal.id,
        goalTitle: goal.title,
        productId: matchedPolicy.id,
        productName: matchedPolicy.name,
        monthlyAmount: 0,
        expectedCompletionMonths: 999,
        allocationRatio: 0,
      });
      continue;
    }
    const policyLimit = matchedPolicy ? matchedPolicy.maxMonthlyDeposit : Infinity;

    // 할당 가능한 월 납입액 = min(이상적 필요액, 상품 한도, 현재 잔여 예산)
    // 10,000원 단위로 절사
    let allocated = Math.min(idealMonthly, policyLimit, remainingBudget);
    allocated = Math.floor(allocated / 10000) * 10000;

    // 만약 예산이 남아있고 마지막 목표라면 남은 여력 흡수 (단, 한도 내)
    if (allocated > remainingBudget) {
      allocated = Math.floor(remainingBudget / 10000) * 10000;
    }

    remainingBudget -= allocated;

    const completionMonths = allocated > 0 ? Math.ceil(neededAmount / allocated) : 999;
    const ratio = surplus > 0 ? Number((allocated / surplus).toFixed(2)) : 0;

    items.push({
      goalId: goal.id,
      goalTitle: goal.title,
      productId: goal.recommendedProductId || "direct-saving",
      productName: getProductName(goal.recommendedProductId, policies),
      monthlyAmount: allocated,
      expectedCompletionMonths: completionMonths,
      allocationRatio: ratio,
    });
  }

  const totalMonthlySavings = items.reduce((acc, curr) => acc + curr.monthlyAmount, 0);
  const unallocatedSurplus = Math.max(0, surplus - totalMonthlySavings);

  const isFeasible = !isSurplusNegative && totalMonthlySavings > 0;
  const deficitsNotice = isSurplusNegative
    ? `월 필수 지출과 부채가 소득을 ${Math.abs(snapshot.availableSurplus).toLocaleString()}원 초과하여 신규 저축이 불가능합니다.`
    : unallocatedSurplus > 0
    ? `안전 마진으로 월 ${unallocatedSurplus.toLocaleString()}원이 유동성 비상금으로 자동 유보됩니다.`
    : undefined;

  // 정형 설명 생성
  const ruleExplanation = generateRuleBasedExplanation(
    snapshot,
    items,
    totalMonthlySavings,
    unallocatedSurplus,
    isSurplusNegative
  );

  return {
    version,
    createdAt: new Date().toISOString(),
    baselineSnapshotId: snapshot.id,
    totalMonthlySavings,
    unallocatedSurplus,
    isFeasible,
    items,
    deficitsNotice,
    assumptions: [
      "월 가용 여력 범위 내 100% 배분 (마이너스 통장/신용대출 저축 배제)",
      "정부지원 정책 상품(청년도약계좌 등) 최고 우대금리 기준 추산",
      "중도 해지 없이 만기 유지 조건",
    ],
    status: "PROPOSED",
    ruleBasedExplanation: ruleExplanation,
  };
}

function getProductName(productId: string | undefined, policies: PolicyProduct[]): string {
  if (!productId) return "iM 자유저축통장";
  const found = policies.find((p) => p.id === productId);
  return found ? found.name : "일반 저축 상품";
}

/**
 * 3. 정형 설명 자동 생성기 (Deterministic Rule Explanation)
 */
function generateRuleBasedExplanation(
  snapshot: FinancialSnapshot,
  items: AllocationItem[],
  totalSavings: number,
  unallocated: number,
  isNegative: boolean
) {
  if (isNegative) {
    return {
      summary: "현재 지출과 부채 상환액이 소득을 초과하여 저축 계획 조기 방어가 필요합니다.",
      reasons: [
        `월 실소득(${snapshot.monthlyIncome.toLocaleString()}원) 대비 지출(${ (snapshot.fixedExpenses + snapshot.variableExpenses + snapshot.debtPayment).toLocaleString() }원)이 과다합니다.`,
        "무리한 저축을 중단하고 단기 고정비 절감 및 비상 대기 상태로 전환을 권고합니다.",
      ],
      burdenNotice: "대출 연체 위험이 있으므로 전문 재무상담 연계가 필요합니다.",
    };
  }

  const mainItem = items.find((i) => i.monthlyAmount > 0);
  const summary = `월 가용 여력 ${snapshot.availableSurplus.toLocaleString()}원 중 총 ${totalSavings.toLocaleString()}원을 ${items.filter((i) => i.monthlyAmount > 0).length}개 핵심 목표에 분산 배분했습니다.`;

  const reasons = items
    .filter((i) => i.monthlyAmount > 0)
    .map(
      (i) =>
        `[${i.goalTitle}] ${i.productName}에 매월 ${i.monthlyAmount.toLocaleString()}원 납입 (약 ${i.expectedCompletionMonths}개월 소요 예상)`
    );

  if (unallocated > 0) {
    reasons.push(`예기치 못한 지출에 대비해 월 ${unallocated.toLocaleString()}원은 수시입출금 유동성으로 유지합니다.`);
  }

  return {
    summary,
    reasons,
    burdenNotice: "기존 계획 대비 목표별 납입 기한과 우대 금리 요건을 확인 후 승인해주세요.",
  };
}

/**
 * 4. 월간 변화 감지 엔진 (Event Detection Engine)
 * 이전 스냅샷과 현재 스냅샷을 비교하여 INFO, ADJUSTMENT, RISK로 분류
 */
export function detectChanges(
  prevSnapshot: FinancialSnapshot,
  currSnapshot: FinancialSnapshot
): ChangeEvent[] {
  const events: ChangeEvent[] = [];
  const now = new Date().toISOString();

  // (1) 소득 단절 또는 급감 (RISK)
  if (prevSnapshot.monthlyIncome > 0 && currSnapshot.monthlyIncome === 0) {
    events.push({
      id: `evt-risk-incomestop-${Date.now()}`,
      type: "RISK",
      title: "급여 미입금 및 소득 단절 의심 감지",
      message: `전월 실소득(${prevSnapshot.monthlyIncome.toLocaleString()}원) 대비 이번 달 급여 입금 내역이 확인되지 않습니다.`,
      metric: "월 소득",
      oldValue: `${prevSnapshot.monthlyIncome.toLocaleString()}원`,
      newValue: "0원",
      detectedAt: now,
      ruleVersion: "RULE_2026_V1",
      suggestedAction: "CONSULT_REQUIRED",
    });
    return events; // 위험 시 최우선 반환
  }

  // (2) 급여 인상 (ADJUSTMENT)
  const incomeDiff = currSnapshot.monthlyIncome - prevSnapshot.monthlyIncome;
  const incomeRatio = prevSnapshot.monthlyIncome > 0 ? (incomeDiff / prevSnapshot.monthlyIncome) * 100 : 0;

  if (incomeRatio >= 5) {
    events.push({
      id: `evt-adj-income-up-${Date.now()}`,
      type: "ADJUSTMENT",
      title: "월 소득 증가에 따른 저축 여력 확대",
      message: `월 급여가 전월 대비 +${incomeDiff.toLocaleString()}원(+${incomeRatio.toFixed(1)}%) 인상되었습니다. 늘어난 여력(${currSnapshot.availableSurplus.toLocaleString()}원)을 반영한 재설계를 추천합니다.`,
      metric: "월 소득",
      oldValue: `${prevSnapshot.monthlyIncome.toLocaleString()}원`,
      newValue: `${currSnapshot.monthlyIncome.toLocaleString()}원`,
      detectedAt: now,
      ruleVersion: "RULE_2026_V1",
      suggestedAction: "RECALCULATE",
    });
  } else if (incomeRatio <= -10) {
    events.push({
      id: `evt-risk-income-down-${Date.now()}`,
      type: "RISK",
      title: "소득 감소로 인한 여력 위축",
      message: `소득이 전월 대비 ${Math.abs(incomeDiff).toLocaleString()}원 감소하여 저축 납입액 하향 조정이 필요합니다.`,
      metric: "월 소득",
      oldValue: `${prevSnapshot.monthlyIncome.toLocaleString()}원`,
      newValue: `${currSnapshot.monthlyIncome.toLocaleString()}원`,
      detectedAt: now,
      ruleVersion: "RULE_2026_V1",
      suggestedAction: "RECALCULATE",
    });
  }

  // (3) 지출 급증 감지
  const prevExpenses = prevSnapshot.fixedExpenses + prevSnapshot.variableExpenses;
  const currExpenses = currSnapshot.fixedExpenses + currSnapshot.variableExpenses;
  const expenseDiff = currExpenses - prevExpenses;

  if (expenseDiff > 400000) {
    events.push({
      id: `evt-adj-expense-up-${Date.now()}`,
      type: "ADJUSTMENT",
      title: "월 생활 지출 급증 감지",
      message: `이번 달 소비 지출이 전월 대비 +${expenseDiff.toLocaleString()}원 증가하여 가용 저축 여력이 감소했습니다.`,
      metric: "월 총지출",
      oldValue: `${prevExpenses.toLocaleString()}원`,
      newValue: `${currExpenses.toLocaleString()}원`,
      detectedAt: now,
      ruleVersion: "RULE_2026_V1",
      suggestedAction: "RECALCULATE",
    });
  }

  // (4) 유의미한 변동이 없는 경우 (INFO)
  if (events.length === 0) {
    events.push({
      id: `evt-info-stable-${Date.now()}`,
      type: "INFO",
      title: "안정적인 재무 상태 유지",
      message: "소득 및 주요 고정 지출에 유의미한 변동이 없습니다. 기존 수립된 저축 계획을 그대로 유지합니다.",
      metric: "재무 지표 변동률",
      oldValue: "안정",
      newValue: "안정 (편차 2% 이내)",
      detectedAt: now,
      ruleVersion: "RULE_2026_V1",
      suggestedAction: "MAINTAIN",
    });
  }

  return events;
}

/**
 * 5. 정책 및 금융상품 자격 검증 (Eligibility Evaluator)
 */
export function evaluatePolicyEligibility(
  customer: DemoCustomer,
  policy: PolicyProduct
): { status: "ELIGIBLE" | "NEEDS_VERIFICATION" | "INELIGIBLE"; reason: string } {
  // 연령 체크
  const [minAge, maxAge] = policy.targetAgeRange;
  if (customer.age < minAge || customer.age > maxAge) {
    return {
      status: "INELIGIBLE",
      reason: `연령 기준(만 ${minAge}~${maxAge}세) 미충족 (고객: 만 ${customer.age}세)`,
    };
  }

  // 대구 지역 특화 정책 체크
  if (policy.category === "LOCAL_SPECIAL") {
    if (!customer.residence.includes("대구")) {
      return {
        status: "INELIGIBLE",
        reason: `대구광역시 거주 요건 미충족 (고객 거주지: ${customer.residence})`,
      };
    }
  }

  // 청년도약계좌: 개인소득 기준 증빙 필요
  if (policy.id === "policy-doyak") {
    if (customer.annualIncomeEstimated <= 75000000) {
      return {
        status: "NEEDS_VERIFICATION",
        reason: "연령 및 예상 소득 요건 충족. 국세청 소득금액증명원 제출 후 최종 확정 필요",
      };
    } else {
      return {
        status: "INELIGIBLE",
        reason: "개인소득 연 7,500만원 초과로 기준 미충족",
      };
    }
  }

  // 대구 청년희망적금: 근로 청년 대상
  if (policy.id === "policy-daegu-hope") {
    if (customer.residence.includes("대구") && customer.annualIncomeEstimated <= 36000000) {
      return {
        status: "ELIGIBLE",
        reason: "대구 거주 및 연소득 3,600만원 이하 근로 청년 요건 충족",
      };
    } else {
      return {
        status: "NEEDS_VERIFICATION",
        reason: "건강보험 자격득실확인서 및 소득 증빙 서류 확인 필요",
      };
    }
  }

  return {
    status: "ELIGIBLE",
    reason: "기본 가입 자격 요건 충족",
  };
}
