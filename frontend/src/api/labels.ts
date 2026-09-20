/**
 * 계약 코드 → 화면 문구 매핑
 *
 * 상태는 색만으로 구분하지 않는다. 모든 상태에 텍스트 라벨을 함께 제공한다.
 * 판정 자체는 백엔드 결과이고, 이 파일은 그 코드를 한국어 문구로 바꾸기만 한다.
 */

import type {
  CompletenessLevel,
  CriterionKey,
  EligibilityStatus,
  EventType,
  GoalFeasibility,
  MockGoal,
  MonthlyReviewResponse,
  PlanCommandOutcome,
  PlanLifecycleStatus,
  PlanProposal,
  SuggestedAction,
} from "../data/apiContracts";
import type { AiSource } from "../data/aiContracts";
import type { ProductBoundaryId } from "../data/contracts";

/** 패널·칩의 시각 톤. 색은 보조 수단이고 라벨 텍스트가 1차 정보이다. */
export type Tone = "neutral" | "positive" | "attention" | "risk" | "muted";

export const TONE_CLASS: Record<Tone, string> = {
  neutral: "bg-[#EEF5FF] text-[#1B4C8C] border-[#C8DCF7]",
  positive: "bg-[#EAFBF6] text-[#006B5B] border-[#B6E7DA]",
  attention: "bg-[#F6FADC] text-[#5C5A14] border-[#E3E9A8]",
  risk: "bg-[#FFF1EE] text-[#9A3412] border-[#FBD5C8]",
  muted: "bg-[#F6F9F8] text-[#526562] border-[#DCE7E4]",
};

export const ELIGIBILITY_LABEL: Record<EligibilityStatus, { label: string; tone: Tone; help: string }> = {
  ELIGIBLE: { label: "이용 가능", tone: "positive", help: "확인된 정보로 신청 요건을 충족합니다." },
  NEEDS_VERIFICATION: { label: "서류 확인 필요", tone: "attention", help: "확인되지 않은 요건이 있어 충족으로 보지 않습니다." },
  INELIGIBLE: { label: "현재 대상 아님", tone: "muted", help: "현재 정보 기준으로는 요건을 충족하지 않습니다." },
};

export const CRITERION_LABEL: Record<CriterionKey, string> = {
  AGE: "나이",
  RESIDENCE: "거주지",
  ANNUAL_INCOME: "연 소득",
  MEDIAN_INCOME_RATIO: "중위소득 비율",
  EMPLOYMENT: "취업 형태",
  HOMELESS: "무주택 여부",
  APPLICATION_PERIOD: "신청 기간",
};

export const CRITERION_STATUS_LABEL: Record<"MET" | "UNMET" | "UNKNOWN", { label: string; tone: Tone }> = {
  MET: { label: "충족", tone: "positive" },
  UNMET: { label: "미충족", tone: "risk" },
  UNKNOWN: { label: "확인 필요", tone: "attention" },
};

export const EVENT_LABEL: Record<EventType, { label: string; tone: Tone }> = {
  INFO: { label: "안내", tone: "neutral" },
  ADJUSTMENT: { label: "조정 필요", tone: "attention" },
  RISK: { label: "위험", tone: "risk" },
};

export const ACTION_LABEL: Record<SuggestedAction, string> = {
  MAINTAIN: "기존 계획 유지",
  RECALCULATE: "계획 다시 계산",
  CONSULT_REQUIRED: "상담사 연결 권장",
};

export const ROUTING_LABEL: Record<"REPORT_ONLY" | "REPLAN" | "CONSULTATION", { title: string; description: string; tone: Tone }> = {
  REPORT_ONLY: {
    title: "이번 달은 알림만",
    description: "계획을 바꿀 만한 변화가 없어 기존 계획을 그대로 유지합니다.",
    tone: "positive",
  },
  REPLAN: {
    title: "조정안 확인 필요",
    description: "변화가 감지되어 조정안을 만들었습니다. 내용을 확인하고 승인 여부를 선택하세요.",
    tone: "attention",
  },
  CONSULTATION: {
    title: "상담사 연결 권장",
    description: "자동 조정만으로 해결하기 어려운 위험이 감지되었습니다.",
    tone: "risk",
  },
};

/**
 * 조정안의 현재 상태.
 *
 * 사용자가 승인·거절·모의 실행한 뒤에는 `currentPlan`이 같은 계획의 최신 상태를 들고 있고,
 * 아직 아무 결정도 하지 않았으면 점검 응답의 상태가 최신이다. 상태 판정은 백엔드 값이며
 * 여기서는 둘 중 어느 쪽이 최신인지만 고른다.
 */
export function resolveProposedStatus(
  review: MonthlyReviewResponse | null,
  currentPlan: PlanProposal | null,
): PlanLifecycleStatus | undefined {
  if (!review) return undefined;
  return currentPlan && currentPlan.planId === review.proposedPlan?.planId
    ? currentPlan.status
    : review.proposedPlan?.status;
}

export function reviewNeedsAttention(review: MonthlyReviewResponse | null, currentPlan: PlanProposal | null): boolean {
  if (!review) return false;
  const proposedStatus = resolveProposedStatus(review, currentPlan);
  const planNeedsAction = proposedStatus === "PROPOSED" || proposedStatus === "APPROVED";
  const consultationNeedsAction =
    review.routing === "CONSULTATION" && review.consultationCase?.status !== "COMPLETED";
  return planNeedsAction || consultationNeedsAction;
}

/** 홈 상단의 결론형 상태와 강조할 행동 하나. 탭 이동 대상은 `TabId`와 같은 값을 쓴다. */
export interface HomeStatus {
  /** 색이 아니라 텍스트로 상태를 알리는 짧은 라벨 */
  statusLabel: string;
  /** 결론형 문장 */
  headline: string;
  description: string;
  tone: Tone;
  needsAttention: boolean;
  action: { label: string; tab: "home" | "goals" | "review" | "policy" | "history" } | null;
}

/**
 * 홈 화면의 상태 문구를 고른다.
 *
 * 금액·위험도·변화 유형을 새로 계산하지 않고 백엔드가 준 `routing`·계획 상태·상담 상태와
 * `reviewNeedsAttention()`의 판정을 문구로 옮기기만 한다.
 */
export function resolveHomeStatus(
  review: MonthlyReviewResponse | null,
  currentPlan: PlanProposal | null,
  isConsentRevoked: boolean,
): HomeStatus {
  const needsAttention = reviewNeedsAttention(review, currentPlan);
  const proposedStatus = resolveProposedStatus(review, currentPlan);

  if (review) {
    const consultationOpen =
      review.routing === "CONSULTATION" && review.consultationCase?.status !== "COMPLETED";

    if (consultationOpen) {
      return {
        statusLabel: "상담 확인 필요",
        headline: "상담이 필요한 위험 신호가 발견됐어요.",
        description: "자동 조정만으로 해결하기 어려운 변화라 상담사 연결을 권장합니다.",
        tone: "risk",
        needsAttention,
        action: { label: "상담 내용 확인하기", tab: "review" },
      };
    }

    if (proposedStatus === "PROPOSED") {
      return {
        statusLabel: "확인 필요",
        headline: "확인이 필요한 변화가 있어요.",
        description: "달라진 상황에 맞춘 조정안을 만들었습니다. 승인 전까지 기존 계획이 그대로 유지됩니다.",
        tone: "attention",
        needsAttention,
        action: { label: "조정안 확인하기", tab: "review" },
      };
    }

    if (proposedStatus === "APPROVED") {
      return {
        statusLabel: "실행 필요",
        headline: "조정안을 승인했어요. 모의 실행만 남았어요.",
        description: "모의 자동이체를 등록하면 이번 달 처리가 끝납니다. 실제 금융기관 전송은 없습니다.",
        tone: "attention",
        needsAttention,
        action: { label: "모의 실행하기", tab: "review" },
      };
    }

    if (proposedStatus === "MOCK_EXECUTED") {
      return {
        statusLabel: "처리 완료",
        headline: "조정안의 모의 실행을 완료했어요.",
        description: "이번 달에 할 일이 남아 있지 않습니다. 다음 점검일에 다시 확인합니다.",
        tone: "positive",
        needsAttention,
        action: { label: "변경 내역 보기", tab: "history" },
      };
    }

    if (proposedStatus === "REJECTED") {
      return {
        statusLabel: "기존 계획 유지",
        headline: "기존 계획을 유지하기로 했어요.",
        description: "조정안은 실행되지 않았고 이전 계획이 그대로 활성 상태입니다.",
        tone: "neutral",
        needsAttention,
        action: { label: "목표 계획 보기", tab: "goals" },
      };
    }

    return {
      statusLabel: "정상 유지",
      headline: "이번 달 계획은 정상적으로 유지되고 있어요.",
      description: "계획을 바꿀 만한 변화가 없어 이번 달은 알림만 확인하면 됩니다.",
      tone: "positive",
      needsAttention,
      action: { label: "점검 결과 보기", tab: "review" },
    };
  }

  if (!currentPlan) {
    return {
      statusLabel: "시작 전",
      headline: "목표 계획을 아직 시작하지 않았어요.",
      description: "진단 결과로 만든 목표별 납입 계획을 확인하고 시작할 수 있습니다.",
      tone: "attention",
      needsAttention,
      action: { label: "목표 계획 시작하기", tab: "goals" },
    };
  }

  if (currentPlan.status === "PROPOSED") {
    return {
      statusLabel: "확인 필요",
      headline: "계획 승인이 남아 있어요.",
      description: "승인하기 전에는 아무것도 실행되지 않습니다.",
      tone: "attention",
      needsAttention,
      action: { label: "계획 확인하기", tab: "goals" },
    };
  }

  if (currentPlan.status === "APPROVED") {
    return {
      statusLabel: "실행 필요",
      headline: "승인한 계획의 모의 실행이 남아 있어요.",
      description: "모의 자동이체를 등록하면 계획이 시작된 것으로 기록됩니다. 실제 이체는 없습니다.",
      tone: "attention",
      needsAttention,
      action: { label: "모의 실행하기", tab: "goals" },
    };
  }

  if (currentPlan.status === "REJECTED") {
    return {
      statusLabel: "기존 계획 유지",
      headline: "기존 계획을 유지하기로 했어요.",
      description: "새 계획을 받으려면 이번 달 점검을 실행하세요.",
      tone: "neutral",
      needsAttention,
      action: isConsentRevoked ? null : { label: "이번 달 점검하기", tab: "review" },
    };
  }

  return {
    statusLabel: "정상 유지",
    headline: "이번 달 계획은 정상적으로 유지되고 있어요.",
    description: isConsentRevoked
      ? "수집 동의를 철회해 새로운 점검은 진행하지 않습니다. 기존 계획은 그대로 유지됩니다."
      : "달라진 점이 있는지 이번 달 점검으로 확인해 보세요.",
    tone: "positive",
    needsAttention,
    action: isConsentRevoked ? null : { label: "이번 달 점검하기", tab: "review" },
  };
}

export const COMPLETENESS_LABEL: Record<CompletenessLevel, { label: string; tone: Tone; help: string }> = {
  COMPLETE: { label: "완전", tone: "positive", help: "분석 기간의 모든 달에서 거래를 수집했습니다." },
  PARTIAL: { label: "일부 결측", tone: "attention", help: "수집하지 못한 달이 있어 월평균에서 제외했습니다." },
  INSUFFICIENT: { label: "부족", tone: "risk", help: "거래가 부족해 일부 지표를 계산하지 않았습니다." },
};

export const FEASIBILITY_LABEL: Record<GoalFeasibility, { label: string; tone: Tone }> = {
  ACHIEVED: { label: "목표 달성", tone: "positive" },
  ON_TRACK: { label: "기한 내 가능", tone: "positive" },
  DELAYED: { label: "기한 초과 예상", tone: "attention" },
  BLOCKED: { label: "현재 배분 없음", tone: "risk" },
};

export const PLAN_STATUS_LABEL: Record<PlanLifecycleStatus, { label: string; tone: Tone }> = {
  PROPOSED: { label: "검토 대기", tone: "attention" },
  APPROVED: { label: "승인됨", tone: "positive" },
  REJECTED: { label: "거절함", tone: "muted" },
  MOCK_EXECUTED: { label: "모의 실행 완료", tone: "positive" },
  SUPERSEDED: { label: "이전 계획", tone: "muted" },
};

export const OUTCOME_TONE: Record<PlanCommandOutcome, Tone> = {
  APPROVED: "positive",
  ALREADY_APPROVED: "neutral",
  REJECTED: "muted",
  ALREADY_REJECTED: "neutral",
  MOCK_EXECUTED: "positive",
  DUPLICATE_IGNORED: "neutral",
  NOT_FOUND: "risk",
  INVALID_STATE: "attention",
  STALE_BASELINE: "attention",
};

export const GOAL_CATEGORY_LABEL: Record<MockGoal["category"], string> = {
  EMERGENCY: "비상자금",
  POLICY_SAVINGS: "정책 저축",
  HOUSING_SUBSCRIPTION: "주거 준비",
  WEALTH_BUILDING: "목돈 마련",
};

export const BOUNDARY_LABEL: Record<ProductBoundaryId, { label: string; summary: string; detail: string }> = {
  STABLE: {
    label: "안정형",
    summary: "예·적금 중심 · 변동 최소화",
    detail: "짧은 만기와 낮은 월 납입 부담을 우선합니다.",
  },
  BALANCED: {
    label: "균형형",
    summary: "목표 기간과 월 부담의 균형",
    detail: "예금과 적금을 함께 비교하고 중간 수준의 납입 부담을 허용합니다.",
  },
  GOAL_FOCUSED: {
    label: "목표집중형",
    summary: "빠른 달성 우선 · 월 납입 부담 증가",
    detail: "목표 달성을 위해 더 긴 만기와 높은 납입 한도를 허용합니다.",
  },
};

export const BOUNDARY_ORDER: ProductBoundaryId[] = ["STABLE", "BALANCED", "GOAL_FOCUSED"];

export const PRODUCT_TYPE_LABEL: Record<"DEPOSIT" | "SAVING", string> = {
  DEPOSIT: "예금",
  SAVING: "적금",
};

export const CONSULTATION_STATUS_LABEL: Record<"WAITING" | "IN_PROGRESS" | "COMPLETED", { label: string; tone: Tone }> = {
  WAITING: { label: "연결 대기", tone: "attention" },
  IN_PROGRESS: { label: "상담 진행", tone: "neutral" },
  COMPLETED: { label: "상담 완료", tone: "positive" },
};

export const TRANSACTION_CLASS_LABEL: Record<
  "SALARY" | "OTHER_INCOME" | "FIXED" | "VARIABLE" | "IRREGULAR" | "DEBT" | "INTERNAL_TRANSFER",
  { label: string; tone: Tone }
> = {
  SALARY: { label: "급여", tone: "positive" },
  OTHER_INCOME: { label: "기타 소득", tone: "positive" },
  FIXED: { label: "고정 지출", tone: "neutral" },
  VARIABLE: { label: "변동 지출", tone: "muted" },
  IRREGULAR: { label: "비정기 지출", tone: "attention" },
  DEBT: { label: "부채 상환", tone: "risk" },
  INTERNAL_TRANSFER: { label: "내부 이체", tone: "muted" },
};

export const LEAKAGE_TYPE_LABEL: Record<"UNUSED_SUBSCRIPTION" | "REVOLVING_INTEREST" | "OTHER", string> = {
  UNUSED_SUBSCRIPTION: "미사용 의심 구독",
  REVOLVING_INTEREST: "리볼빙 이자",
  OTHER: "기타 반복 지출",
};

export const CONFIDENCE_LABEL: Record<"HIGH" | "MEDIUM" | "LOW", { label: string; tone: Tone }> = {
  HIGH: { label: "근거 많음", tone: "attention" },
  MEDIUM: { label: "근거 보통", tone: "muted" },
  LOW: { label: "근거 적음", tone: "muted" },
};

/**
 * AI 설명의 출처 표시.
 *
 * 고객 화면에는 어떤 경로로 만든 설명인지만 알린다.
 * 내부 모델 ID는 응답 metadata에만 두고 화면에 노출하지 않는다.
 */
export const AI_SOURCE_LABEL: Record<AiSource, { label: string; tone: Tone; help: string }> = {
  CLAUDE: {
    label: "Claude가 생성한 설명",
    tone: "positive",
    help: "계산 결과를 바탕으로 이번에 새로 작성한 설명입니다.",
  },
  FIXTURE: {
    label: "미리 준비된 AI 설명",
    tone: "neutral",
    help: "앱에 담아 둔 설명으로 안내하고 있습니다. 금액과 목표 상태는 계산 결과와 같습니다.",
  },
  RULE: {
    label: "규칙 기반 설명",
    tone: "muted",
    help: "계산 결과를 정해진 문장 형식으로 그대로 옮긴 설명입니다.",
  },
};
