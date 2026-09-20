/**
 * 규칙 기반 정형 설명 (source: "RULE")
 *
 * Claude 호출과 준비된 응답을 모두 쓸 수 없을 때의 마지막 대체 경로이다.
 * 서버(backend/ai)와 브라우저(frontend/src/data/aiClient.ts)가 같은 함수를 쓰므로
 * API 키가 없거나 서버에 연결하지 못해도 화면 문구가 달라지지 않는다.
 *
 * 규칙:
 * - 전달받은 값만 문장으로 바꾼다. 금액·기간을 새로 계산하지 않는다.
 * - 입력에 없는 원인을 추측하지 않는다.
 * - 값이 null이면 0으로 채우지 않고 "확인 필요"로 쓴다.
 * - 계획 변경은 제안이며 승인 전에는 기존 계획이 유지된다고 설명한다.
 */

import { AI_DISCLAIMER } from "../data/aiContracts.js";
import type {
  AiDetectedChange,
  AiFactUsed,
  AiPlanSummary,
  AiResponseMetadata,
  CounselRequest,
  CounselResponse,
  ExplainRequest,
  ExplainResponse,
} from "../data/aiContracts";
import type { EventType } from "../data/apiContracts";

const UNKNOWN = "확인 필요";

/** 표시용 금액 문자열. 계산하지 않고 형식만 바꾼다. */
const krw = (value: number | null | undefined): string =>
  value === null || value === undefined || Number.isNaN(value)
    ? UNKNOWN
    : `${Math.trunc(value).toLocaleString("ko-KR")}원`;

const monthText = (value: string | null): string => {
  if (!value) return "산출 불가";
  const match = value.match(/^(\d{4})-(\d{2})$/);
  return match ? `${match[1]}년 ${Number(match[2])}월` : value;
};

const SEVERITY_ORDER: Record<EventType, number> = { INFO: 0, ADJUSTMENT: 1, RISK: 2 };

/** 복합 이벤트에서도 가장 높은 등급을 유지한다. */
export function highestSeverity(changes: AiDetectedChange[]): EventType {
  return changes.reduce<EventType>(
    (highest, change) => (SEVERITY_ORDER[change.severity] > SEVERITY_ORDER[highest] ? change.severity : highest),
    "INFO",
  );
}

/** 규칙 기반 응답은 생성 시각과 모델이 없다. */
export function ruleMetadata(isFallback: boolean): AiResponseMetadata {
  return {
    source: "RULE",
    generatedAt: null,
    model: null,
    isFallback,
    disclaimer: AI_DISCLAIMER,
  };
}

const contributionDelta = (previous: AiPlanSummary | null, proposed: AiPlanSummary | null): number | null => {
  if (!previous || !proposed) return null;
  if (previous.monthlyContribution === null || proposed.monthlyContribution === null) return null;
  return proposed.monthlyContribution - previous.monthlyContribution;
};

/**
 * 결과 설명의 규칙 기반 대체본.
 *
 * 조정안이 없으면 유지, 있으면 납입액 증감 방향만 문장으로 바꾼다.
 */
export function buildRuleExplanation(input: ExplainRequest, isFallback: boolean): ExplainResponse {
  const severity = highestSeverity(input.detectedChanges);
  const { previousPlan, proposedPlan } = input;
  const delta = contributionDelta(previousPlan, proposedPlan);

  const headline = !proposedPlan
    ? "이번 달은 계획을 바꿀 만한 변화가 없어 기존 계획을 그대로 유지합니다."
    : delta === null
      ? "이번 달 변화를 반영해 목표별 납입 계획을 다시 계산했습니다."
      : delta < 0
        ? `이번 달 변화를 반영해 월 납입액을 ${krw(previousPlan?.monthlyContribution ?? null)}에서 ${krw(proposedPlan.monthlyContribution)}으로 줄이는 조정안을 준비했습니다.`
        : delta > 0
          ? `이번 달 변화를 반영해 월 납입액을 ${krw(previousPlan?.monthlyContribution ?? null)}에서 ${krw(proposedPlan.monthlyContribution)}으로 늘리는 조정안을 준비했습니다.`
          : "월 납입액 합계는 그대로 두고 목표별 배분만 다시 계산했습니다.";

  const reason =
    input.detectedChanges.length > 0
      ? `감지된 변화: ${input.detectedChanges.map((change) => change.message).join(" ")}`
      : "이번 달에는 계획을 다시 계산할 만한 변화가 감지되지 않았습니다.";

  const impact = !proposedPlan
    ? "목표별 예상 달성 시점은 기존 계획과 같습니다."
    : `1순위 목표의 예상 달성 시점은 ${monthText(previousPlan?.primaryGoalDate ?? null)}에서 ${monthText(proposedPlan.primaryGoalDate)}으로 표시됩니다.`;

  const nextAction =
    severity === "RISK"
      ? "혼자 결정하기 어려운 상황이라 상담사 연결 안내를 함께 확인해 주세요."
      : proposedPlan
        ? "조정안 내용을 확인하고 변경할지 선택해 주세요. 승인하기 전까지는 기존 계획이 그대로 유지됩니다."
        : "이번 달은 따로 하실 일이 없습니다. 다음 점검일에 다시 확인해 드립니다.";

  const factsUsed: AiFactUsed[] = [];
  if (previousPlan || proposedPlan) {
    factsUsed.push({
      label: "월 납입액",
      before: previousPlan ? krw(previousPlan.monthlyContribution) : null,
      after: krw((proposedPlan ?? previousPlan)?.monthlyContribution ?? null),
    });
    factsUsed.push({
      label: "생활비로 남겨두는 돈",
      before: previousPlan ? krw(previousPlan.monthlyBalance) : null,
      after: krw((proposedPlan ?? previousPlan)?.monthlyBalance ?? null),
    });
    factsUsed.push({
      label: "1순위 목표 예상 달성 시점",
      before: previousPlan ? monthText(previousPlan.primaryGoalDate) : null,
      after: monthText((proposedPlan ?? previousPlan)?.primaryGoalDate ?? null),
    });
  }
  factsUsed.push({
    label: "월 저축 여력",
    before: null,
    after: krw(input.financialSummary.monthlySavingCapacity),
  });

  const warnings: string[] = [];
  if (severity === "RISK") warnings.push("위험 신호가 있어 상담사 연결을 권장합니다.");
  if (input.financialSummary.monthlySavingCapacity === null) {
    warnings.push("일부 데이터를 수집하지 못해 월 저축 여력을 계산하지 못했습니다.");
  }
  if (input.policyMatches.some((policy) => policy.status === "NEEDS_VERIFICATION")) {
    warnings.push("서류 확인이 남은 지원제도가 있어 아직 이용 가능으로 보지 않습니다.");
  }

  return { headline, reason, impact, nextAction, factsUsed, warnings, metadata: ruleMetadata(isFallback) };
}

/**
 * 상담 답변의 규칙 기반 대체본.
 *
 * 질문의 의미를 해석하지 않는다. 확인된 상태만 그대로 안내하고,
 * 더 필요한 설명은 확인하기 어렵다고 분명히 말한다.
 */
export function buildRuleCounsel(context: CounselRequest, isFallback: boolean): CounselResponse {
  const severity = highestSeverity(context.detectedChanges);
  const plan = context.proposedPlan ?? context.activePlan;

  const keyPoints: string[] = [];
  if (plan) {
    keyPoints.push(`현재 안내 중인 월 납입액은 ${krw(plan.monthlyContribution)}입니다.`);
    keyPoints.push(`1순위 목표의 예상 달성 시점은 ${monthText(plan.primaryGoalDate)}입니다.`);
  }
  keyPoints.push(`월 저축 여력은 ${krw(context.financialSummary.monthlySavingCapacity)}으로 계산됐습니다.`);
  for (const change of context.detectedChanges.slice(0, 3)) keyPoints.push(change.message);
  if (context.proposedPlan) {
    keyPoints.push("조정안은 제안 단계이며 승인하기 전까지 기존 계획이 유지됩니다.");
  }

  const needsVerification = context.policyEligibility.filter((policy) => policy.status === "NEEDS_VERIFICATION");
  if (needsVerification.length > 0) {
    keyPoints.push(
      `${needsVerification.map((policy) => policy.policyName).join(", ")}은(는) 확인이 더 필요해 이용 가능으로 보지 않습니다.`,
    );
  }

  const escalationRequired = severity === "RISK" || context.consultationReason !== null;

  const suggestedActions = escalationRequired
    ? ["상담사 연결 안내를 확인해 주세요.", "이번 달 점검 화면에서 변화 근거를 확인해 주세요."]
    : context.proposedPlan
      ? ["이번 달 점검 화면에서 조정안을 확인하고 승인 여부를 선택해 주세요."]
      : ["받을 수 있는 혜택 화면에서 지원제도 확인 상태를 살펴보세요."];

  return {
    answer:
      "지금은 준비된 설명으로만 안내드릴 수 있어 질문에 맞춘 자세한 답변은 어렵습니다. 대신 현재 확인된 계산 결과를 그대로 알려드립니다.",
    // 계약 상한(6개)을 넘기지 않는다. 중요한 값이 앞에 오도록 쌓았으므로 뒤를 자른다.
    keyPoints: keyPoints.slice(0, 6),
    suggestedActions,
    citations: context.references.map((reference) => ({
      title: reference.title,
      sourceUrl: reference.sourceUrl,
      asOf: reference.asOf,
    })),
    escalation: {
      required: escalationRequired,
      reason: escalationRequired
        ? (context.consultationReason ?? "위험으로 분류된 변화가 있어 상담사 확인이 필요합니다.")
        : null,
    },
    metadata: ruleMetadata(isFallback),
  };
}
