/**
 * 목표별 월 납입액 · 예상 달성 기간 산출 (결정적 우선순위 배분)
 *
 * 순서: 비상자금 → 정부 지원 상품 → 청약 → 목표 적금, 같은 분류 안에서는 사용자 priority 오름차순.
 * 제약: 총 배분 ≤ 배분 예산(월 저축 여력 이하), 상품 월 한도, 바운더리 월 한도,
 *       ELIGIBLE이 아닌 정책 상품에는 자동 배분하지 않음. 이자는 반영하지 않는다(보수적 가정).
 */

import type { GoalAllocation, MockGoal, PlanProposal, PolicyEligibility } from "../data/apiContracts";
import type { ProductBoundaryId } from "../data/contracts";
import { REFERENCE_CATALOG } from "../fixtures/generated/referenceCatalog";
import { POLICIES_DATA } from "../fixtures/syntheticData";
import { addMonthsToMonth, monthOf } from "./dateUtils";
import { decideProduct, findBoundary } from "./productBoundary";
import { RULE_CONFIG, RULE_VERSION, ceilToUnit, floorToUnit, formatWon } from "./ruleConfig";

interface ProductInfo {
  name: string;
  maxMonthlyDeposit: number | null;
  kind: "POLICY" | "CATALOG" | "FREE";
}

function lookupProduct(productId: string | null): ProductInfo {
  if (!productId) return { name: "iM 자유저축통장", maxMonthlyDeposit: null, kind: "FREE" };
  const policy = POLICIES_DATA.find((item) => item.id === productId);
  if (policy) return { name: policy.name, maxMonthlyDeposit: policy.maxMonthlyDeposit, kind: "POLICY" };
  const product = REFERENCE_CATALOG.financialProducts.find((item) => item.id === productId);
  if (product) return { name: product.name, maxMonthlyDeposit: product.maxMonthlyDeposit, kind: "CATALOG" };
  throw new Error(`Unknown product: ${productId}`);
}

export const sortGoalsForAllocation = (goals: MockGoal[]) =>
  [...goals].sort(
    (a, b) =>
      RULE_CONFIG.goalCategoryRank[a.category] - RULE_CONFIG.goalCategoryRank[b.category] ||
      a.priority - b.priority ||
      (a.id < b.id ? -1 : a.id > b.id ? 1 : 0),
  );

export interface PlanInput {
  customerId: string;
  version: number;
  baselineSnapshotId: string;
  boundaryId: ProductBoundaryId;
  asOf: string;
  createdAt: string;
  /** 표시용 월 저축 여력. null이면 데이터 부족 */
  availableSurplus: number | null;
  /** 배분 예산. 생략하면 월 저축 여력 전체. 여력보다 클 수 없다. */
  budget?: number;
  goals: MockGoal[];
  eligibility: PolicyEligibility[];
  extraNotices?: string[];
}

export const planIdOf = (customerId: string, version: number, baselineSnapshotId: string) => `plan-${customerId}-v${version}-${baselineSnapshotId}`;

export function buildGoalPlan(input: PlanInput): PlanProposal {
  const boundary = findBoundary(input.boundaryId);
  const notices = [...(input.extraNotices ?? [])];
  const surplus = input.availableSurplus;
  const budgetBase = surplus === null ? 0 : Math.max(0, Math.min(surplus, input.budget ?? surplus));
  let remaining = floorToUnit(budgetBase);

  if (surplus === null) notices.push("최근 거래가 부족해 월 저축 여력을 확인할 수 없습니다. 계획 산출을 보류합니다.");
  else if (surplus < 0) notices.push(`월 지출과 부채 상환이 소득보다 ${formatWon(-surplus)} 많아 신규 저축 배분이 불가능합니다.`);

  const allocations: GoalAllocation[] = sortGoalsForAllocation(input.goals).map((goal) => {
    const product = lookupProduct(goal.productId);
    const remainingAmount = Math.max(0, goal.targetAmount - goal.currentAmount);
    const requiredMonthly = remainingAmount === 0 ? 0 : ceilToUnit(remainingAmount / Math.max(1, goal.targetMonths));
    const reasons: string[] = [];
    const base = {
      goalId: goal.id,
      goalTitle: goal.title,
      category: goal.category,
      productId: goal.productId,
      productName: product.name,
      remainingAmount,
      requiredMonthly,
      targetMonths: goal.targetMonths,
    };

    if (remainingAmount === 0) {
      return { ...base, monthlyAmount: 0, expectedMonths: 0, expectedCompletionMonth: monthOf(input.asOf), feasibility: "ACHIEVED" as const, monthlyShortfall: 0, reasons: ["목표 금액을 이미 달성했습니다."] };
    }

    let cap = Number.POSITIVE_INFINITY;
    let blockedReason: string | null = null;
    if (product.kind === "POLICY") {
      const result = input.eligibility.find((item) => item.policyId === goal.productId);
      if (!result || !result.autoAllocatable) {
        blockedReason = `${product.name} 자격이 '${result?.status ?? "NEEDS_VERIFICATION"}' 상태라 자동 배분하지 않습니다. ${result?.reason ?? "자격 판정 결과 없음"}`;
      }
    }
    if (product.kind === "CATALOG") {
      const catalogProduct = REFERENCE_CATALOG.financialProducts.find((item) => item.id === goal.productId)!;
      const decision = decideProduct(catalogProduct, boundary);
      if (!decision.included) blockedReason = `${boundary.label} 바운더리 밖 상품입니다: ${decision.exclusionReasons.join(", ")}`;
      cap = Math.min(cap, boundary.maxMonthlyDeposit);
    }
    if (product.maxMonthlyDeposit !== null) cap = Math.min(cap, product.maxMonthlyDeposit);

    let monthlyAmount = 0;
    if (blockedReason) reasons.push(blockedReason);
    else {
      monthlyAmount = floorToUnit(Math.min(requiredMonthly, cap, remaining));
      remaining -= monthlyAmount;
      if (monthlyAmount < requiredMonthly) {
        if (cap < requiredMonthly && monthlyAmount === floorToUnit(cap)) reasons.push(`상품 월 한도 ${formatWon(cap)}로 제한됩니다.`);
        else reasons.push(`우선순위가 높은 목표에 먼저 배분해 남은 여력이 부족합니다.`);
      } else reasons.push(`목표 기한 ${goal.targetMonths}개월 내 달성에 필요한 월 ${formatWon(requiredMonthly)}을 배분했습니다.`);
    }

    const expectedMonths = monthlyAmount > 0 ? Math.ceil(remainingAmount / monthlyAmount) : null;
    const feasibility = monthlyAmount === 0 ? ("BLOCKED" as const) : expectedMonths! <= goal.targetMonths ? ("ON_TRACK" as const) : ("DELAYED" as const);
    if (feasibility === "DELAYED") reasons.push(`현재 배분으로는 ${expectedMonths}개월이 걸려 목표 기한보다 ${expectedMonths! - goal.targetMonths}개월 늦어집니다.`);
    return {
      ...base,
      monthlyAmount,
      expectedMonths,
      expectedCompletionMonth: expectedMonths === null ? null : addMonthsToMonth(monthOf(input.asOf), expectedMonths),
      feasibility,
      monthlyShortfall: Math.max(0, requiredMonthly - monthlyAmount),
      reasons,
    };
  });

  const totalMonthlyAmount = allocations.reduce((acc, item) => acc + item.monthlyAmount, 0);
  const unallocatedAmount = surplus === null ? 0 : Math.max(0, surplus - totalMonthlyAmount);
  const shortfall = allocations.reduce((acc, item) => acc + item.monthlyShortfall, 0);
  if (shortfall > 0 && surplus !== null && surplus >= 0) notices.push(`모든 목표를 기한 내 달성하려면 월 ${formatWon(shortfall)}이 더 필요합니다. 기한 연장 또는 목표 금액 조정을 검토하세요.`);
  if (unallocatedAmount > 0) notices.push(`월 ${formatWon(unallocatedAmount)}은 배분하지 않고 생활 유동성으로 남깁니다.`);

  return {
    planId: planIdOf(input.customerId, input.version, input.baselineSnapshotId),
    customerId: input.customerId,
    version: input.version,
    baselineSnapshotId: input.baselineSnapshotId,
    ruleVersion: RULE_VERSION,
    boundaryId: input.boundaryId,
    createdAt: input.createdAt,
    availableSurplus: surplus,
    totalMonthlyAmount,
    unallocatedAmount,
    isFeasible: surplus !== null && surplus >= 0 && totalMonthlyAmount > 0 && allocations.every((item) => item.feasibility === "ON_TRACK" || item.feasibility === "ACHIEVED"),
    allocations,
    assumptions: [
      "월 납입액은 만원 단위로 내림하며 총 배분은 월 저축 여력을 넘지 않습니다.",
      "예상 달성 기간은 이자·우대금리·정부기여금을 반영하지 않은 보수적 추정입니다.",
      "자격이 확인되지 않은 정책 상품에는 자동 배분하지 않습니다.",
      "모든 실행은 모의 실행이며 실제 가입·이체가 일어나지 않습니다.",
    ],
    notices,
    status: "PROPOSED",
    isSynthetic: true,
  };
}
