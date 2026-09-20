/**
 * 재무 홈
 *
 * 정보 순서: ① 이번 달 상태 ② 지금 필요한 행동 하나 ③ 가장 중요한 목표
 * ④ 소득·지출·저축 가능 금액 요약 ⑤ 새로 확인할 혜택 ⑥ 보조 메뉴
 *
 * 상단에는 결론형 문장을 먼저 보여주고, 강조하는 행동 버튼은 한 개만 둔다.
 * 상태 문구는 점검 응답과 `reviewNeedsAttention()` 판정을 그대로 옮긴 것이며
 * 금액·자격·위험도를 화면에서 다시 계산하지 않는다.
 */

import React, { useState } from "react";
import {
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  ChevronRight,
  History,
  Info,
  ShieldOff,
  Stethoscope,
} from "lucide-react";
import { useEroomSession } from "../../api/EroomSession";
import { dateText, dateTimeText, monthText, won } from "../../api/format";
import {
  ELIGIBILITY_LABEL,
  FEASIBILITY_LABEL,
  GOAL_CATEGORY_LABEL,
  PLAN_STATUS_LABEL,
  resolveHomeStatus,
  resolveProposedStatus,
} from "../../api/labels";
import {
  ActionButton,
  Callout,
  Disclosure,
  HeadlineCard,
  Section,
  StatusChip,
  SummaryRow,
} from "../ui/Primitives";

const TONE_ICON: Record<string, React.ReactNode> = {
  risk: <AlertTriangle className="w-4 h-4" aria-hidden="true" />,
  attention: <Info className="w-4 h-4" aria-hidden="true" />,
  positive: <CheckCircle2 className="w-4 h-4" aria-hidden="true" />,
  neutral: <Info className="w-4 h-4" aria-hidden="true" />,
  muted: <Info className="w-4 h-4" aria-hidden="true" />,
};

export const HomeTab: React.FC = () => {
  const {
    persona,
    diagnosis,
    eligibility,
    currentPlan,
    planPreview,
    review,
    consent,
    setTab,
    revokeConsent,
    pending,
    isConsentRevoked,
  } = useEroomSession();
  const [confirmRevoke, setConfirmRevoke] = useState(false);

  if (!diagnosis) return null;

  const proposedStatus = resolveProposedStatus(review, currentPlan);
  // 승인 전 조정안은 아직 적용 중인 계획이 아니다. 홈 요약은 기존 활성 계획을 보여준다.
  const plan =
    proposedStatus === "PROPOSED" && review?.previousPlan
      ? review.previousPlan
      : currentPlan ?? planPreview;
  const metrics = diagnosis.metrics;
  const status = resolveHomeStatus(review, currentPlan, isConsentRevoked);
  const topGoal = plan?.allocations[0] ?? null;
  const otherGoalCount = plan ? Math.max(plan.allocations.length - 1, 0) : 0;

  return (
    <div className="space-y-6">
      {/* ① 이번 달 상태 + ② 지금 필요한 행동 하나 */}
      <div role="status" aria-live="polite">
        <HeadlineCard
          statusLabel={status.statusLabel}
          headline={status.headline}
          description={status.description}
          tone={status.tone}
          icon={TONE_ICON[status.tone]}
          meta={
            review
              ? `${dateText(review.currentAsOf)} 기준 · 다음 점검 ${dateTimeText(review.nextCollectionAt)}`
              : `데이터 기준일 ${dateText(diagnosis.asOf)}`
          }
        >
          {status.action && (
            <ActionButton full onClick={() => setTab(status.action!.tab)} icon={<ArrowRight className="w-4 h-4" aria-hidden="true" />}>
              {status.action.label}
            </ActionButton>
          )}
        </HeadlineCard>
      </div>

      {/* ③ 가장 중요한 목표 */}
      {topGoal && (
        <Section
          id="home-top-goal"
          title="가장 중요한 목표"
          description={plan ? `${GOAL_CATEGORY_LABEL[topGoal.category]} · 우선순위 1순위` : undefined}
          action={
            <StatusChip
              label={FEASIBILITY_LABEL[topGoal.feasibility].label}
              tone={FEASIBILITY_LABEL[topGoal.feasibility].tone}
            />
          }
        >
          <p className="text-lg font-extrabold text-[#142B29] break-keep">{topGoal.goalTitle}</p>
          <div className="mt-2">
            <SummaryRow label="이번 달 납입액" value={won(topGoal.monthlyAmount)} tone="strong" />
            <SummaryRow label="남은 금액" value={won(topGoal.remainingAmount)} />
            <SummaryRow
              label="예상 달성 시점"
              value={topGoal.expectedCompletionMonth ? monthText(topGoal.expectedCompletionMonth) : "배분 없음"}
            />
          </div>
          <div className="mt-3">
            <ActionButton variant="ghost" full onClick={() => setTab("goals")} icon={<ChevronRight className="w-4 h-4" aria-hidden="true" />}>
              {otherGoalCount > 0 ? `다른 목표 ${otherGoalCount}개도 보기` : "목표 계획 자세히 보기"}
            </ActionButton>
          </div>
          {plan && (
            <p className="text-xs text-[#526562] mt-2 tabular-nums">
              계획 전체 월 납입 합계 {won(plan.totalMonthlyAmount)} ·{" "}
              {currentPlan ? PLAN_STATUS_LABEL[plan.status].label : "아직 시작 전"}
            </p>
          )}
        </Section>
      )}

      {/* ④ 소득·지출·저축 가능 금액 요약 */}
      <Section
        id="home-metrics"
        title="이번 달 돈의 흐름"
        description={`데이터 기준일 ${dateText(diagnosis.asOf)} 기준 월평균입니다.`}
      >
        <SummaryRow label="들어오는 돈" value={won(metrics.monthlyIncome)} />
        <SummaryRow label="나가는 돈 (고정)" value={won(metrics.fixedExpenses)} />
        <SummaryRow label="나가는 돈 (변동)" value={won(metrics.variableExpenses)} />
        <SummaryRow label="저축할 수 있는 돈" value={won(metrics.availableSurplus)} tone="strong" />
        <div className="mt-3">
          <ActionButton variant="ghost" full onClick={() => setTab("diagnostics")} icon={<Stethoscope className="w-4 h-4" aria-hidden="true" />}>
            재무진단 결과 자세히 보기
          </ActionButton>
        </div>
      </Section>

      {/* ⑤ 새로 확인할 정책 또는 혜택 */}
      {eligibility && (
        <Section
          id="home-policy"
          title="받을 수 있는 혜택"
          description={`${dateText(eligibility.asOf)} 기준으로 ${eligibility.results.length}개 제도를 확인했습니다.`}
        >
          <SummaryRow
            label={ELIGIBILITY_LABEL.ELIGIBLE.label}
            value={`${eligibility.summary.ELIGIBLE}건`}
            tone="strong"
          />
          <SummaryRow
            label={ELIGIBILITY_LABEL.NEEDS_VERIFICATION.label}
            value={`${eligibility.summary.NEEDS_VERIFICATION}건`}
          />
          <SummaryRow label={ELIGIBILITY_LABEL.INELIGIBLE.label} value={`${eligibility.summary.INELIGIBLE}건`} />
          <div className="mt-3">
            <ActionButton variant="ghost" full onClick={() => setTab("policy")} icon={<ChevronRight className="w-4 h-4" aria-hidden="true" />}>
              혜택 자세히 보기
            </ActionButton>
          </div>
        </Section>
      )}

      {/* ⑥ 보조 메뉴 — 하단 고정 바에서 뺀 화면들 */}
      <Section id="home-more" title="더 보기">
        <div className="space-y-2">
          <ActionButton variant="ghost" full onClick={() => setTab("diagnostics")} icon={<Stethoscope className="w-4 h-4" aria-hidden="true" />}>
            재무진단 상세
          </ActionButton>
          <ActionButton variant="ghost" full onClick={() => setTab("history")} icon={<History className="w-4 h-4" aria-hidden="true" />}>
            변경 내역
          </ActionButton>
        </div>

        <Disclosure summary="데이터와 동의 상태 보기" className="mt-3">
          <SummaryRow label="체험 고객" value={`${persona?.customerName ?? diagnosis.customer.name} (가상)`} />
          <SummaryRow label="데이터 기준일" value={dateText(diagnosis.asOf)} />
          <SummaryRow
            label="다음 점검 예정"
            value={review ? dateTimeText(review.nextCollectionAt) : "점검 실행 후 표시"}
          />
          <SummaryRow
            label="데이터 수집 동의"
            value={
              isConsentRevoked
                ? consent?.revokedAt
                  ? `철회함 (${dateTimeText(consent.revokedAt)})`
                  : "철회함"
                : "동의함 · 매월 1회"
            }
          />

          {isConsentRevoked ? (
            <Callout tone="attention" title="수집 동의를 철회했습니다" className="mt-3">
              새로운 데이터 수집과 이번 달 점검이 중단됐습니다. 기존 계획은 그대로 유지됩니다. 이 체험에서는 철회를
              되돌릴 수 없습니다.
            </Callout>
          ) : confirmRevoke ? (
            <Callout tone="attention" title="정말 철회할까요?" className="mt-3">
              철회하면 다음 달 수집과 이번 달 점검이 중단됩니다. 이 체험에서는 철회를 되돌릴 수 없습니다.
              <div className="mt-3 flex flex-col sm:flex-row gap-2">
                <ActionButton
                  variant="ghost"
                  loading={pending.consent}
                  onClick={async () => {
                    await revokeConsent();
                    setConfirmRevoke(false);
                  }}
                >
                  철회합니다
                </ActionButton>
                <ActionButton variant="ghost" onClick={() => setConfirmRevoke(false)}>
                  취소
                </ActionButton>
              </div>
            </Callout>
          ) : (
            <div className="mt-3">
              <ActionButton
                variant="ghost"
                full
                onClick={() => setConfirmRevoke(true)}
                icon={<ShieldOff className="w-4 h-4" aria-hidden="true" />}
              >
                데이터 수집 동의 철회
              </ActionButton>
            </div>
          )}
        </Disclosure>
      </Section>
    </div>
  );
};
