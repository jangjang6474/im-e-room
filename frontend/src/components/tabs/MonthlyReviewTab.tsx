/**
 * 이번 달 점검 (필수 흐름 12·13·14·16)
 *
 * - 다음 달 모의 수집 → 변화 감지 결과 표시
 * - 기존안과 조정안 비교 (변경 이유와 전후 금액)
 * - 변경안 승인 또는 기존 계획 유지
 * - 위험이면 상담사 연결 안내 (실제 예약 없음)
 */

import React from "react";
import { AlertTriangle, CalendarCheck, CheckCircle2, CircleSlash, PhoneCall, PlayCircle } from "lucide-react";
import { useEroomSession } from "../../api/EroomSession";
import { dateText, dateTimeText, eventValueText, monthText, won, wonDelta } from "../../api/format";
import {
  ACTION_LABEL,
  CONSULTATION_STATUS_LABEL,
  EVENT_LABEL,
  OUTCOME_TONE,
  PLAN_STATUS_LABEL,
  ROUTING_LABEL,
} from "../../api/labels";
import type { PlanProposal } from "../../data/apiContracts";
import {
  ActionButton,
  Callout,
  ErrorState,
  KeyValueRow,
  MetricTile,
  Panel,
  SectionHeading,
  StatusChip,
} from "../ui/Primitives";

const allocationOf = (plan: PlanProposal | null, goalId: string) =>
  plan?.allocations.find((item) => item.goalId === goalId) ?? null;

export const MonthlyReviewTab: React.FC = () => {
  const {
    review,
    consent,
    currentPlan,
    runMonthlyReview,
    approvePlan,
    rejectPlan,
    executePlan,
    setTab,
    pending,
    error,
    feedback,
    clearFeedback,
    persona,
    isConsentRevoked,
  } = useEroomSession();

  const proposed = review?.proposedPlan ?? null;
  const previous = review?.previousPlan ?? null;
  const decisionPlan = proposed && currentPlan?.planId === proposed.planId ? currentPlan : proposed;
  const resolvedReplan =
    review?.routing === "REPLAN" &&
    decisionPlan &&
    (decisionPlan.status === "MOCK_EXECUTED" || decisionPlan.status === "REJECTED")
      ? {
          title: PLAN_STATUS_LABEL[decisionPlan.status].label,
          description:
            decisionPlan.status === "MOCK_EXECUTED"
              ? "승인한 조정안의 모의 실행을 완료했습니다. 실제 이체나 외부 전송은 없습니다."
              : "기존 계획을 유지하기로 선택했습니다. 조정안은 실행되지 않습니다.",
          tone: PLAN_STATUS_LABEL[decisionPlan.status].tone,
        }
      : null;
  const goalIds = Array.from(
    new Set([...(previous?.allocations ?? []), ...(proposed?.allocations ?? [])].map((item) => item.goalId)),
  );

  return (
    <div className="space-y-5">
      {feedback && (
        <div role="status" aria-live="polite">
          <Callout tone={feedback.outcome === "ERROR" ? "risk" : OUTCOME_TONE[feedback.outcome]} title="처리 결과">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="break-keep">{feedback.message}</span>
              <button type="button" onClick={clearFeedback} className="min-h-[44px] text-xs font-bold underline">
                닫기
              </button>
            </div>
          </Callout>
        </div>
      )}

      <Panel className="p-5" ariaLabelledBy="review-run">
        <SectionHeading
          id="review-run"
          title="다음 달 점검"
          icon={<CalendarCheck className="w-5 h-5 text-[#006B5B]" aria-hidden="true" />}
          description={
            review
              ? `${dateText(review.previousAsOf)} → ${dateText(review.currentAsOf)} 기준으로 다시 수집했습니다.`
              : "동의일 기준으로 매월 1회 수집합니다. 지금 다음 달 수집을 실행해 볼 수 있습니다."
          }
        />
        {isConsentRevoked && (
          <Callout tone="attention" title="수집 동의가 철회되었습니다">
            동의를 철회한 상태에서는 새 수집을 진행하지 않습니다. 기존 계획은 그대로 유지됩니다. 이 체험 세션에서는 철회를
            되돌릴 수 없으니, 다시 처음부터 보려면 다른 고객을 선택하거나 시연 모드에서 세션을 초기화하세요.
          </Callout>
        )}
        <div className="mt-3 flex flex-wrap gap-2">
          <ActionButton
            loading={pending.review}
            disabled={isConsentRevoked}
            onClick={() => void runMonthlyReview()}
          >
            {isConsentRevoked ? "수집 중단됨 (동의 철회)" : review ? "점검 다시 실행" : "다음 달 수집·점검 실행"}
          </ActionButton>
          {review && (
            <span className="inline-flex items-center text-xs text-[#526562] tabular-nums">
              다음 점검 예정 {dateTimeText(review.nextCollectionAt)}
            </span>
          )}
        </div>
        {error && <div className="mt-3"><ErrorState message={error} onRetry={() => void runMonthlyReview()} /></div>}
      </Panel>

      {review && (
        <>
          {/* 변화 감지 결과 */}
          <Panel className="p-5" ariaLabelledBy="review-events">
            <SectionHeading
              id="review-events"
              title="무엇이 달라졌나요"
              description={`감지된 변화 ${review.events.length}건`}
              action={
                <StatusChip
                  label={resolvedReplan?.title ?? ROUTING_LABEL[review.routing].title}
                  tone={resolvedReplan?.tone ?? ROUTING_LABEL[review.routing].tone}
                />
              }
            />
            <Callout tone={resolvedReplan?.tone ?? ROUTING_LABEL[review.routing].tone}>
              {resolvedReplan?.description ?? ROUTING_LABEL[review.routing].description}
            </Callout>
            <ul className="mt-3 space-y-3">
              {review.events.map((event) => (
                <li key={event.id} className="rounded-2xl border border-[#DCE7E4] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <p className="font-extrabold text-[#142B29] break-keep">{event.title}</p>
                    <StatusChip label={EVENT_LABEL[event.type].label} tone={EVENT_LABEL[event.type].tone} />
                  </div>
                  <p className="text-sm text-[#526562] mt-2 leading-relaxed break-keep">{event.message}</p>
                  <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                    <span className="text-[#526562]">{event.metric}</span>
                    <span className="text-right font-bold tabular-nums">
                      {eventValueText(event.oldValue, event.metric)} → {eventValueText(event.newValue, event.metric)}
                    </span>
                  </div>
                  <p className="text-[11px] text-[#526562] mt-2 tabular-nums">
                    권장 조치: {ACTION_LABEL[event.suggestedAction]} · 근거 {event.evidence.months.map(monthText).join(", ") || "최근 거래"} ·
                    거래 {event.evidence.transactionIds.length}건 · 데이터 기준일 {dateText(event.dataAsOf)}
                  </p>
                </li>
              ))}
            </ul>
          </Panel>

          {/* 지표 비교 */}
          <Panel className="p-5" ariaLabelledBy="review-metrics">
            <SectionHeading id="review-metrics" title="지난달과 이번 달 비교" description="백엔드가 계산한 두 시점의 지표입니다." />
            <div className="overflow-x-auto -mx-1 px-1">
              <table className="w-full min-w-[460px] text-sm">
                <caption className="sr-only">지난달과 이번 달 재무 지표 비교</caption>
                <thead>
                  <tr className="text-xs text-[#526562] border-b border-[#DCE7E4]">
                    <th scope="col" className="py-2 pr-2 text-left font-bold">
                      항목
                    </th>
                    <th scope="col" className="py-2 px-2 text-right font-bold">
                      {dateText(review.previousAsOf)}
                    </th>
                    <th scope="col" className="py-2 pl-2 text-right font-bold">
                      {dateText(review.currentAsOf)}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {(
                    [
                      ["월 평균 소득", "monthlyIncome"],
                      ["고정 지출", "fixedExpenses"],
                      ["변동 지출", "variableExpenses"],
                      ["부채 상환", "debtPayment"],
                      ["월 저축 여력", "availableSurplus"],
                    ] as const
                  ).map(([label, key]) => (
                    <tr key={key} className="border-b border-[#EDF3F1] last:border-b-0">
                      <th scope="row" className="py-2 pr-2 text-left font-bold text-[#142B29]">
                        {label}
                      </th>
                      <td className="py-2 px-2 text-right tabular-nums text-[#526562]">
                        {won(review.previousMetrics[key])}
                      </td>
                      <td className="py-2 pl-2 text-right tabular-nums font-bold">{won(review.currentMetrics[key])}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-[11px] text-[#526562] mt-3 tabular-nums">
              이번 분석 기간 {review.currentWindow.monthsCovered}개월 · 거래 {review.currentWindow.transactionCount}건 ·
              월평균 사용 {review.currentWindow.monthsUsed}개월
            </p>
          </Panel>

          {/* 기존안과 조정안 비교 */}
          <Panel className="p-5" ariaLabelledBy="review-compare">
            <SectionHeading
              id="review-compare"
              title="기존 계획과 조정안"
              description={
                resolvedReplan
                  ? resolvedReplan.description
                  : proposed
                  ? "승인하기 전까지 기존 계획이 그대로 유지됩니다."
                  : "이번 달은 계획을 바꿀 만한 변화가 없어 조정안을 만들지 않았습니다."
              }
            />
            {previous && (
              <div className="grid grid-cols-2 gap-3">
                <MetricTile
                  label={`기존 계획 v${previous.version}`}
                  value={won(previous.totalMonthlyAmount)}
                  hint={PLAN_STATUS_LABEL[previous.status].label}
                  tone="muted"
                />
                <MetricTile
                  label={proposed ? `조정안 v${proposed.version}` : "조정안 없음"}
                  value={proposed ? won(proposed.totalMonthlyAmount) : "기존 유지"}
                  hint={
                    proposed
                      ? `차이 ${wonDelta(proposed.totalMonthlyAmount - previous.totalMonthlyAmount)}`
                      : "변화가 작아 그대로 둡니다."
                  }
                  tone={proposed ? "attention" : "positive"}
                />
              </div>
            )}

            {proposed && (
              <div className="mt-4 overflow-x-auto -mx-1 px-1">
                <table className="w-full min-w-[520px] text-sm">
                  <caption className="sr-only">목표별 기존 계획과 조정안 월 납입액 비교</caption>
                  <thead>
                    <tr className="text-xs text-[#526562] border-b border-[#DCE7E4]">
                      <th scope="col" className="py-2 pr-2 text-left font-bold">
                        목표
                      </th>
                      <th scope="col" className="py-2 px-2 text-right font-bold">
                        기존
                      </th>
                      <th scope="col" className="py-2 px-2 text-right font-bold">
                        조정안
                      </th>
                      <th scope="col" className="py-2 pl-2 text-right font-bold">
                        차이
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {goalIds.map((goalId) => {
                      const before = allocationOf(previous, goalId);
                      const after = allocationOf(proposed, goalId);
                      const title = after?.goalTitle ?? before?.goalTitle ?? goalId;
                      return (
                        <tr key={goalId} className="border-b border-[#EDF3F1] last:border-b-0">
                          <th scope="row" className="py-2 pr-2 text-left font-bold text-[#142B29] break-keep">
                            {title}
                          </th>
                          <td className="py-2 px-2 text-right tabular-nums text-[#526562]">
                            {before ? won(before.monthlyAmount) : "없음"}
                          </td>
                          <td className="py-2 px-2 text-right tabular-nums font-bold">
                            {after ? won(after.monthlyAmount) : "배분 없음"}
                          </td>
                          <td className="py-2 pl-2 text-right tabular-nums">
                            {before && after ? wonDelta(after.monthlyAmount - before.monthlyAmount) : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {proposed && proposed.notices.length > 0 && (
              <div className="mt-4 space-y-2">
                {proposed.notices.map((notice) => (
                  <Callout key={notice} tone="attention">
                    {notice}
                  </Callout>
                ))}
              </div>
            )}

            {decisionPlan && (
              <div className="mt-5 space-y-3">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusChip
                    label={PLAN_STATUS_LABEL[decisionPlan.status].label}
                    tone={PLAN_STATUS_LABEL[decisionPlan.status].tone}
                  />
                  <span className="text-xs text-[#526562]">조정안 v{decisionPlan.version}</span>
                </div>
                <div className="flex flex-col sm:flex-row gap-2">
                  {decisionPlan.status === "PROPOSED" && (
                    <>
                      <ActionButton
                        loading={pending[`approve:${decisionPlan.planId}`]}
                        onClick={() => void approvePlan(decisionPlan.planId)}
                        icon={<CheckCircle2 className="w-4 h-4" aria-hidden="true" />}
                      >
                        조정안 승인하기
                      </ActionButton>
                      <ActionButton
                        variant="ghost"
                        loading={pending[`reject:${decisionPlan.planId}`]}
                        onClick={() => void rejectPlan(decisionPlan.planId)}
                        icon={<CircleSlash className="w-4 h-4" aria-hidden="true" />}
                      >
                        기존 계획 유지하기
                      </ActionButton>
                    </>
                  )}
                  {decisionPlan.status === "APPROVED" && (
                    <ActionButton
                      loading={pending[`execute:${decisionPlan.planId}`]}
                      onClick={() => void executePlan(decisionPlan.planId)}
                      icon={<PlayCircle className="w-4 h-4" aria-hidden="true" />}
                    >
                      모의 실행하기 (실제 이체 없음)
                    </ActionButton>
                  )}
                  {(decisionPlan.status === "MOCK_EXECUTED" || decisionPlan.status === "REJECTED") && (
                    <ActionButton variant="secondary" onClick={() => setTab("history")}>
                      변경 내역에서 확인하기
                    </ActionButton>
                  )}
                </div>
              </div>
            )}
          </Panel>

          {/* 상담사 연결 */}
          {review.consultationCase && (
            <Panel className="p-5" ariaLabelledBy="review-consult">
              <SectionHeading
                id="review-consult"
                title="상담사 연결이 필요한 상황입니다"
                icon={<PhoneCall className="w-5 h-5 text-[#9A3412]" aria-hidden="true" />}
                description={`${persona?.customerName ?? review.consultationCase.customerName} 님의 위험 상황 요약`}
                action={
                  <StatusChip
                    label={CONSULTATION_STATUS_LABEL[review.consultationCase.status].label}
                    tone={CONSULTATION_STATUS_LABEL[review.consultationCase.status].tone}
                  />
                }
              />
              <Callout tone="risk" title={review.consultationCase.riskType} icon={<AlertTriangle className="w-4 h-4" aria-hidden="true" />}>
                {review.consultationCase.briefing.coreRisk}
              </Callout>
              <div className="mt-3">
                <KeyValueRow label="현재 재무 상태" value={review.consultationCase.briefing.financialState} />
                <KeyValueRow label="목표에 미치는 영향" value={review.consultationCase.briefing.impactOnGoals} />
                <KeyValueRow label="상담사 권장 조치" value={review.consultationCase.briefing.recommendedHumanAction} />
              </div>
              <Callout tone="muted" title="프로토타입 안내">
                위험 사례는 상담사 대기 목록에 모의 등록되었습니다. 이 프로토타입은 실제 상담 예약이나 외부 기관 전송을
                하지 않습니다.
              </Callout>
            </Panel>
          )}
        </>
      )}
    </div>
  );
};
