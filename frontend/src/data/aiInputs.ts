/**
 * 화면 상태 → AI 요청 변환
 *
 * 이 파일은 값을 옮기기만 한다. 금액·자격·기간을 다시 계산하지 않는다.
 * 이름·계좌·거래 상대방·거래 ID 같은 식별정보는 애초에 옮기지 않으며,
 * 서버도 화이트리스트로 한 번 더 걸러낸다(backend/ai/sanitize.ts).
 */

import type {
  AiDetectedChange,
  AiFinancialSummary,
  AiPlanSummary,
  AiPolicyMatch,
  AiReference,
  CounselRequest,
  ExplainRequest,
} from "./aiContracts";
import type {
  ChangeEventV1,
  ConsultationCaseV1,
  DiagnosisMetrics,
  DiagnosisResponse,
  EligibilityResponse,
  MonthlyReviewResponse,
  PersonaId,
  PlanProposal,
} from "./apiContracts";

const financialSummaryOf = (metrics: DiagnosisMetrics): AiFinancialSummary => ({
  monthlyIncome: metrics.monthlyIncome,
  monthlyFixedExpense: metrics.fixedExpenses,
  monthlyVariableExpense: metrics.variableExpenses,
  monthlyIrregularExpense: metrics.irregularExpensesMonthly,
  monthlyDebtPayment: metrics.debtPayment,
  monthlySavingCapacity: metrics.availableSurplus,
});

/**
 * 계획 요약.
 *
 * 1순위 목표는 계획 엔진이 배분한 순서(비상자금 → 정부 지원 상품 → 청약 → 목표 적금)의 첫 목표이다.
 * 화면에서 순서를 다시 정하지 않는다.
 */
const planSummaryOf = (plan: PlanProposal | null | undefined): AiPlanSummary | null => {
  if (!plan) return null;
  return {
    monthlyContribution: plan.totalMonthlyAmount,
    monthlyBalance: plan.unallocatedAmount,
    primaryGoalDate: plan.allocations[0]?.expectedCompletionMonth ?? null,
  };
};

/** 변화 유형은 규칙 ID를 그대로 쓴다. 근거 거래 ID와 상대방은 전달하지 않는다. */
const detectedChangesOf = (events: ChangeEventV1[]): AiDetectedChange[] =>
  events.map((event) => ({ type: event.ruleId, severity: event.type, message: event.message }));

const policyMatchesOf = (eligibility: EligibilityResponse | null): AiPolicyMatch[] =>
  eligibility ? eligibility.results.map((result) => ({ policyName: result.policyName, status: result.status })) : [];

export interface AiSessionInput {
  personaId: PersonaId;
  diagnosis: DiagnosisResponse;
  eligibility: EligibilityResponse | null;
  /** 아직 점검을 실행하지 않았으면 null */
  review: MonthlyReviewResponse | null;
  /** 점검 전에는 현재 계획 또는 미리보기 계획 */
  currentPlan: PlanProposal | null;
  consultation: ConsultationCaseV1 | null;
}

export function buildExplainRequest(session: AiSessionInput): ExplainRequest {
  const { review, diagnosis } = session;
  return {
    personaId: session.personaId,
    asOf: review?.currentAsOf ?? diagnosis.asOf,
    financialSummary: financialSummaryOf(review?.currentMetrics ?? diagnosis.metrics),
    detectedChanges: detectedChangesOf(review?.events ?? []),
    previousPlan: planSummaryOf(review?.previousPlan ?? session.currentPlan),
    proposedPlan: planSummaryOf(review?.proposedPlan),
    policyMatches: policyMatchesOf(session.eligibility),
  };
}

/**
 * 상담 근거.
 *
 * 정책 근거는 자격 판정에 실제로 쓴 조건과 출처 메모이고,
 * 내부 계산 근거는 이번 진단이 사용한 분석 기간이다. 둘 다 이미 검증된 값이다.
 */
function referencesOf(session: AiSessionInput): AiReference[] {
  const references: AiReference[] = [];
  const window = session.diagnosis.window;
  references.push({
    title: "내부 계산 근거 (재무진단)",
    sourceUrl: null,
    asOf: session.diagnosis.asOf,
    excerpt: `분석 기간 ${window.startAt ?? "확인 필요"} ~ ${window.endAt ?? "확인 필요"}, 거래 ${window.transactionCount}건, 월평균 계산에 사용한 달 ${window.monthsUsed}개월.`,
  });

  for (const result of session.eligibility?.results.slice(0, 4) ?? []) {
    references.push({
      title: result.policyName,
      sourceUrl: null,
      asOf: session.eligibility?.asOf ?? null,
      excerpt: `${result.reason} (${result.sourceNote})`,
    });
  }
  return references;
}

export function buildCounselRequest(session: AiSessionInput, question: string): CounselRequest {
  const { review, diagnosis } = session;
  return {
    question,
    asOf: review?.currentAsOf ?? diagnosis.asOf,
    financialSummary: financialSummaryOf(review?.currentMetrics ?? diagnosis.metrics),
    detectedChanges: detectedChangesOf(review?.events ?? []),
    activePlan: planSummaryOf(review?.previousPlan ?? session.currentPlan),
    proposedPlan: planSummaryOf(review?.proposedPlan),
    policyEligibility: policyMatchesOf(session.eligibility),
    consultationReason: session.consultation
      ? `${session.consultation.riskType}: ${session.consultation.briefing.coreRisk}`
      : null,
    references: referencesOf(session),
  };
}
