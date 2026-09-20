/**
 * 재무 홈
 *
 * 우선순위: ① 목표별 진행 상황 ② 이번 달 확인할 변화 ③ 소득·지출·저축 가능 금액 ④ 납입 계획 ⑤ 지원제도 상태
 * 모든 수치는 Mock 계약 응답 필드를 그대로 표시한다.
 */

import React from "react";
import { ArrowRight, CalendarCheck, History, ShieldOff, Wallet } from "lucide-react";
import { useEroomSession } from "../../api/EroomSession";
import { dateText, dateTimeText, months, won } from "../../api/format";
import {
  ELIGIBILITY_LABEL,
  EVENT_LABEL,
  FEASIBILITY_LABEL,
  GOAL_CATEGORY_LABEL,
  PLAN_STATUS_LABEL,
  ROUTING_LABEL,
} from "../../api/labels";
import {
  ActionButton,
  Callout,
  KeyValueRow,
  MetricTile,
  Panel,
  ProgressBar,
  SectionHeading,
  StatusChip,
} from "../ui/Primitives";

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
  } = useEroomSession();

  if (!diagnosis) return null;
  const plan = currentPlan ?? planPreview;
  const metrics = diagnosis.metrics;

  return (
    <div className="space-y-5">
      {/* ① 목표별 진행 상황 */}
      <Panel className="p-5" ariaLabelledBy="home-goals">
        <SectionHeading
          id="home-goals"
          title="나의 목표"
          description={
            plan
              ? `${plan.boundaryId === "STABLE" ? "안정형" : plan.boundaryId === "BALANCED" ? "균형형" : "목표집중형"} 기준 계획 v${plan.version} · 월 합계 ${won(plan.totalMonthlyAmount)}`
              : "계획을 준비하는 중입니다."
          }
          action={
            plan ? (
              <StatusChip
                label={currentPlan ? PLAN_STATUS_LABEL[plan.status].label : "미리보기"}
                tone={currentPlan ? PLAN_STATUS_LABEL[plan.status].tone : "muted"}
              />
            ) : undefined
          }
        />
        {plan && (
          <ul className="space-y-3">
            {plan.allocations.map((allocation) => {
              const feasibility = FEASIBILITY_LABEL[allocation.feasibility];
              const schedulePercent =
                allocation.expectedMonths === null
                  ? 0
                  : (allocation.targetMonths / Math.max(allocation.expectedMonths, allocation.targetMonths)) * 100;
              return (
                <li key={allocation.goalId} className="rounded-2xl border border-[#DCE7E4] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-extrabold text-[#142B29] break-keep">{allocation.goalTitle}</p>
                      <p className="text-xs text-[#526562] mt-0.5">
                        {GOAL_CATEGORY_LABEL[allocation.category]} · {allocation.productName}
                      </p>
                    </div>
                    <StatusChip label={feasibility.label} tone={feasibility.tone} />
                  </div>
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <span className="text-[#526562]">월 납입</span>
                    <span className="text-right font-bold tabular-nums">{won(allocation.monthlyAmount)}</span>
                    <span className="text-[#526562]">남은 금액</span>
                    <span className="text-right font-bold tabular-nums">{won(allocation.remainingAmount)}</span>
                    <span className="text-[#526562]">예상 달성</span>
                    <span className="text-right font-bold tabular-nums">
                      {allocation.expectedCompletionMonth ?? "배분 없음"}
                    </span>
                  </div>
                  <div className="mt-3">
                    <ProgressBar
                      percent={schedulePercent}
                      label={`${allocation.goalTitle} 기한 대비 예상 소요`}
                      tone={allocation.feasibility === "DELAYED" ? "sky" : "mint"}
                    />
                    <p className="text-[11px] text-[#526562] mt-1.5 tabular-nums">
                      기한 {months(allocation.targetMonths)} · 예상 소요{" "}
                      {allocation.expectedMonths === null ? "산출 불가" : months(allocation.expectedMonths)}
                      {allocation.monthlyShortfall > 0 && ` · 기한 내 달성에 월 ${won(allocation.monthlyShortfall)} 부족`}
                    </p>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <div className="mt-4">
          <ActionButton variant="secondary" onClick={() => setTab("goals")} icon={<ArrowRight className="w-4 h-4" aria-hidden="true" />}>
            목표와 납입 계획 보기
          </ActionButton>
        </div>
      </Panel>

      {/* ② 이번 달 확인할 변화 */}
      <Panel className="p-5" ariaLabelledBy="home-review">
        <SectionHeading
          id="home-review"
          title="이번 달 확인할 변화"
          icon={<CalendarCheck className="w-5 h-5 text-[#006B5B]" aria-hidden="true" />}
          description={
            review
              ? `${dateText(review.currentAsOf)} 기준 점검 결과 · 다음 점검 ${dateTimeText(review.nextCollectionAt)}`
              : "아직 이번 달 점검을 실행하지 않았습니다."
          }
        />
        {review ? (
          <div className="space-y-3">
            <Callout tone={ROUTING_LABEL[review.routing].tone} title={ROUTING_LABEL[review.routing].title}>
              {ROUTING_LABEL[review.routing].description}
            </Callout>
            <ul className="space-y-2">
              {review.events.slice(0, 3).map((event) => (
                <li key={event.id} className="flex items-start gap-2 text-sm">
                  <StatusChip label={EVENT_LABEL[event.type].label} tone={EVENT_LABEL[event.type].tone} />
                  <span className="text-[#142B29] leading-relaxed break-keep">{event.title}</span>
                </li>
              ))}
            </ul>
            <ActionButton variant="secondary" onClick={() => setTab("review")}>
              점검 결과 자세히 보기
            </ActionButton>
          </div>
        ) : (
          <Callout tone="muted">
            다음 달 모의 수집을 실행하면 소득·지출·정책 변화가 있는지 확인하고, 필요할 때만 조정안을 제안합니다.
            <div className="mt-3">
              <ActionButton variant="secondary" onClick={() => setTab("review")}>
                이번 달 점검 화면으로
              </ActionButton>
            </div>
          </Callout>
        )}
      </Panel>

      {/* ③ 소득·지출·저축 가능 금액 */}
      <Panel className="p-5" ariaLabelledBy="home-metrics">
        <SectionHeading
          id="home-metrics"
          title="이번 진단 요약"
          icon={<Wallet className="w-5 h-5 text-[#006B5B]" aria-hidden="true" />}
          description={`데이터 기준일 ${dateText(diagnosis.asOf)} · 분석 거래 ${diagnosis.window.transactionCount.toLocaleString("ko-KR")}건`}
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricTile label="월 평균 소득" value={won(metrics.monthlyIncome)} tone="neutral" />
          <MetricTile label="고정 지출" value={won(metrics.fixedExpenses)} tone="muted" />
          <MetricTile label="변동 지출" value={won(metrics.variableExpenses)} tone="muted" />
          <MetricTile
            label="월 저축 여력"
            value={won(metrics.availableSurplus)}
            tone="positive"
            hint="소득에서 고정·변동·비정기·부채 상환을 뺀 금액입니다."
          />
        </div>
        <div className="mt-4">
          <ActionButton variant="ghost" onClick={() => setTab("diagnostics")}>
            진단 상세 보기
          </ActionButton>
        </div>
      </Panel>

      {/* ⑤ 지원제도 상태 */}
      {eligibility && (
        <Panel className="p-5" ariaLabelledBy="home-policy">
          <SectionHeading
            id="home-policy"
            title="받을 수 있는 혜택"
            description={`${eligibility.results.length}개 제도 판정 결과`}
          />
          <div className="flex flex-wrap gap-2">
            {(["ELIGIBLE", "NEEDS_VERIFICATION", "INELIGIBLE"] as const).map((status) => (
              <StatusChip
                key={status}
                label={`${ELIGIBILITY_LABEL[status].label} ${eligibility.summary[status]}건`}
                tone={ELIGIBILITY_LABEL[status].tone}
              />
            ))}
          </div>
          <div className="mt-4">
            <ActionButton variant="secondary" onClick={() => setTab("policy")}>
              혜택 자세히 보기
            </ActionButton>
          </div>
        </Panel>
      )}

      {/* 데이터·동의 상태 */}
      <Panel className="p-5" ariaLabelledBy="home-consent">
        <SectionHeading id="home-consent" title="데이터와 동의 상태" />
        <div className="space-y-1">
          <KeyValueRow label="고객" value={`${persona?.customerName ?? diagnosis.customer.name} (합성)`} />
          <KeyValueRow label="데이터 기준일" value={dateText(diagnosis.asOf)} />
          <KeyValueRow
            label="다음 월간 점검"
            value={review ? dateTimeText(review.nextCollectionAt) : "점검 실행 후 표시"}
          />
          <KeyValueRow
            label="수집 동의"
            value={
              consent?.status === "REVOKED"
                ? `철회함 (${dateTimeText(consent.revokedAt)})`
                : "동의함 · 매월 1회 재수집"
            }
          />
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          <ActionButton variant="ghost" onClick={() => setTab("history")} icon={<History className="w-4 h-4" aria-hidden="true" />}>
            변경 내역 보기
          </ActionButton>
          {consent?.status !== "REVOKED" && (
            <ActionButton
              variant="ghost"
              loading={pending.consent}
              onClick={() => void revokeConsent()}
              icon={<ShieldOff className="w-4 h-4" aria-hidden="true" />}
            >
              수집 동의 철회
            </ActionButton>
          )}
        </div>
      </Panel>
    </div>
  );
};
