/**
 * 이번 달 점검
 *
 * 정보 순서: ① 무엇이 달라졌는지 ② 목표에 어떤 영향이 있는지 ③ 기존 계획과 조정안 차이 ④ 선택할 행동
 *
 * - 긴 이벤트 목록과 상세 지표는 접는다.
 * - 가로 스크롤 표 대신 세로 비교 줄을 쓴다. 비교 값은 모두 점검 응답에서 읽는다.
 * - 조정안을 거절하면 거절 상태는 이 비교 화면에 남고 활성 계획은 기존 계획으로 돌아간다.
 *   ("기존 계획 유지하기"는 거절 명령이며 다른 버튼으로 대체하지 않는다.)
 * - 위험이면 상담사 연결을 안내한다. 실제 예약이나 외부 전송은 없다.
 */

import React from "react";
import { AlertTriangle, CalendarCheck, CheckCircle2, CircleSlash, Info, PhoneCall, PlayCircle } from "lucide-react";
import { useEroomSession } from "../../api/EroomSession";
import { dateText, dateTimeText, eventValueText, monthText, won, wonDelta } from "../../api/format";
import {
  ACTION_LABEL,
  CONSULTATION_STATUS_LABEL,
  EVENT_LABEL,
  OUTCOME_TONE,
  PLAN_STATUS_LABEL,
  ROUTING_LABEL,
  resolveHomeStatus,
  resolveProposedStatus,
} from "../../api/labels";
import type { ChangeEventV1, PlanProposal } from "../../data/apiContracts";
import { AiExplanationPanel } from "../ai/AiExplanationPanel";
import { MonthTransitionPanel } from "../MonthTransitionPanel";
import {
  ActionButton,
  Callout,
  CompareRow,
  Disclosure,
  ErrorState,
  HeadlineCard,
  Section,
  StatusChip,
  StickyActions,
  SummaryRow,
} from "../ui/Primitives";

const EXECUTION_NOTE = "모의 실행입니다. 실제 금융기관 전송, 상품 가입, 자동이체 등록은 일어나지 않습니다.";

const allocationOf = (plan: PlanProposal | null, goalId: string) =>
  plan?.allocations.find((item) => item.goalId === goalId) ?? null;

const EventCard: React.FC<{ event: ChangeEventV1 }> = ({ event }) => (
  <li className="rounded-2xl border border-[#DCE7E4] p-4">
    <div className="flex flex-wrap items-start justify-between gap-2">
      <p className="font-extrabold text-[#142B29] break-keep">{event.title}</p>
      <StatusChip label={EVENT_LABEL[event.type].label} tone={EVENT_LABEL[event.type].tone} />
    </div>
    <p className="text-sm text-[#526562] mt-2 leading-relaxed break-keep">{event.message}</p>
    <p className="mt-2 flex flex-wrap items-baseline gap-2 text-sm tabular-nums">
      <span className="text-[#526562]">{event.metric}</span>
      <span className="font-bold text-[#142B29]">
        {eventValueText(event.oldValue, event.metric)}
        <span aria-hidden="true"> → </span>
        <span className="sr-only">에서</span>
        {eventValueText(event.newValue, event.metric)}
      </span>
    </p>
    <p className="text-[11px] text-[#526562] mt-2 tabular-nums leading-relaxed">
      권장 조치: {ACTION_LABEL[event.suggestedAction]} · 근거{" "}
      {event.evidence.months.map(monthText).join(", ") || "최근 거래"} · 거래 {event.evidence.transactionIds.length}건 ·
      데이터 기준일 {dateText(event.dataAsOf)}
    </p>
  </li>
);

export const MonthlyReviewTab: React.FC = () => {
  const {
    review,
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
    diagnosis,
    isConsentRevoked,
  } = useEroomSession();

  const proposed = review?.proposedPlan ?? null;
  const previous = review?.previousPlan ?? null;
  /** 사용자가 결정을 내린 뒤에는 그 결과 상태가 이 조정안의 최신 상태이다. */
  const decisionPlan = proposed && currentPlan?.planId === proposed.planId ? currentPlan : proposed;
  const decisionStatus = resolveProposedStatus(review, currentPlan);
  const status = resolveHomeStatus(review, currentPlan, isConsentRevoked);
  const explanationNextAction =
    review?.routing !== "REPLAN"
      ? undefined
      : decisionStatus === "APPROVED"
        ? "조정안을 승인했습니다. 모의 자동이체 등록을 완료하면 이번 달 처리가 끝납니다. 실제 이체는 없습니다."
        : decisionStatus === "MOCK_EXECUTED"
          ? "모의 실행을 완료했습니다. 다음 점검일까지 추가로 할 일이 없습니다."
          : decisionStatus === "REJECTED"
            ? "기존 계획을 유지하기로 했습니다. 조정안은 실행되지 않습니다."
            : undefined;

  const goalIds = Array.from(
    new Set([...(previous?.allocations ?? []), ...(proposed?.allocations ?? [])].map((item) => item.goalId)),
  );
  const consultation = review?.consultationCase ?? null;

  /* 하단 고정 행동 — 현재 상태에서 고를 수 있는 것만 둔다 */
  const actions = (() => {
    if (!review) {
      return (
        <ActionButton
          full
          loading={pending.review}
          disabled={isConsentRevoked}
          onClick={() => void runMonthlyReview()}
          icon={<CalendarCheck className="w-4 h-4" aria-hidden="true" />}
        >
          {isConsentRevoked ? "수집 중단됨 (동의 철회)" : "다음 달 수집·점검 실행"}
        </ActionButton>
      );
    }
    if (decisionPlan && decisionStatus === "PROPOSED") {
      return (
        <>
          <ActionButton
            full
            loading={pending[`approve:${decisionPlan.planId}`]}
            onClick={() => void approvePlan(decisionPlan.planId)}
            icon={<CheckCircle2 className="w-4 h-4" aria-hidden="true" />}
          >
            이 계획으로 변경하기
          </ActionButton>
          <ActionButton
            variant="ghost"
            full
            loading={pending[`reject:${decisionPlan.planId}`]}
            onClick={() => void rejectPlan(decisionPlan.planId)}
            icon={<CircleSlash className="w-4 h-4" aria-hidden="true" />}
          >
            기존 계획 유지하기
          </ActionButton>
        </>
      );
    }
    if (decisionPlan && decisionStatus === "APPROVED") {
      return (
        <ActionButton
          full
          loading={pending[`execute:${decisionPlan.planId}`]}
          onClick={() => void executePlan(decisionPlan.planId)}
          icon={<PlayCircle className="w-4 h-4" aria-hidden="true" />}
        >
          모의 자동이체 등록하기
        </ActionButton>
      );
    }
    return (
      <ActionButton variant="secondary" full onClick={() => setTab("history")}>
        변경 내역에서 확인하기
      </ActionButton>
    );
  })();

  return (
    <div className="space-y-6">
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

      {/* 이번 달 상태 결론 */}
      <div aria-live="polite">
        <HeadlineCard
          statusLabel={status.statusLabel}
          headline={review ? status.headline : "이번 달 점검을 실행해 보세요."}
          description={
            review
              ? status.description
              : "동의일 기준으로 매월 1회 다시 수집합니다. 지금 다음 달 수집을 실행해 볼 수 있습니다."
          }
          tone={review ? status.tone : "neutral"}
          icon={
            review && status.tone === "risk" ? (
              <AlertTriangle className="w-4 h-4" aria-hidden="true" />
            ) : (
              <CalendarCheck className="w-4 h-4" aria-hidden="true" />
            )
          }
          meta={
            review
              ? `${dateText(review.previousAsOf)} → ${dateText(review.currentAsOf)} · 다음 점검 ${dateTimeText(review.nextCollectionAt)}`
              : undefined
          }
        />
      </div>

      {/* 다음 달로 넘어가는 과정을 먼저 보여준다 (실행 전에는 예고, 실행 뒤에는 처리 결과) */}
      {diagnosis && (
        <MonthTransitionPanel
          review={review}
          planStatus={decisionStatus}
          asOf={diagnosis.asOf}
          isRunning={Boolean(pending.review)}
        />
      )}

      {isConsentRevoked && (
        <Callout tone="attention" title="데이터 수집 동의를 철회했습니다" icon={<Info className="w-4 h-4" aria-hidden="true" />}>
          철회한 상태에서는 새 수집을 진행하지 않습니다. 기존 계획은 그대로 유지됩니다. 이 체험에서는 철회를 되돌릴 수
          없으니, 처음부터 다시 보려면 다른 고객을 선택하거나 시연 모드에서 체험을 초기화하세요.
        </Callout>
      )}

      {error && <ErrorState message={error} onRetry={() => void runMonthlyReview()} />}

      {review && (
        <>
          {/* ① 무엇이 달라졌는지 */}
          <Section
            id="review-events"
            title="무엇이 달라졌나요"
            description={`감지된 변화 ${review.events.length}건`}
            action={<StatusChip label={ROUTING_LABEL[review.routing].title} tone={ROUTING_LABEL[review.routing].tone} />}
          >
            <ul className="space-y-3">
              {review.events.slice(0, 2).map((event) => (
                <EventCard key={event.id} event={event} />
              ))}
            </ul>
            {review.events.length > 2 && (
              <Disclosure summary={`나머지 변화 ${review.events.length - 2}건 보기`} className="mt-3">
                <ul className="space-y-3">
                  {review.events.slice(2).map((event) => (
                    <EventCard key={event.id} event={event} />
                  ))}
                </ul>
              </Disclosure>
            )}
          </Section>

          {/* 계산 설명은 서버 응답, 다음 행동은 현재 계획 상태를 표시한다. */}
          <AiExplanationPanel nextActionOverride={explanationNextAction} />

          {/* ② 목표에 어떤 영향이 있는지 */}
          {proposed && previous && (
            <Section
              id="review-goal-impact"
              title="목표에 어떤 영향이 있나요"
              description="목표별 월 납입액과 예상 달성 시점의 변화입니다."
            >
              <ul>
                {goalIds.map((goalId) => {
                  const before = allocationOf(previous, goalId);
                  const after = allocationOf(proposed, goalId);
                  const title = after?.goalTitle ?? before?.goalTitle ?? goalId;
                  return (
                    <CompareRow
                      key={goalId}
                      label={title}
                      before={before ? won(before.monthlyAmount) : "없음"}
                      after={after ? won(after.monthlyAmount) : "배분 없음"}
                      note={
                        before && after
                          ? `예상 달성 ${before.expectedCompletionMonth ? monthText(before.expectedCompletionMonth) : "산출 불가"} → ${after.expectedCompletionMonth ? monthText(after.expectedCompletionMonth) : "산출 불가"}`
                          : undefined
                      }
                    />
                  );
                })}
              </ul>
            </Section>
          )}

          {/* ③ 기존 계획과 조정안 차이 */}
          <Section
            id="review-compare"
            title="기존 계획과 조정안"
            description={
              !proposed
                ? "이번 달은 계획을 바꿀 만한 변화가 없어 조정안을 만들지 않았습니다."
                : decisionStatus === "REJECTED"
                  ? "기존 계획을 유지하기로 했습니다. 아래 조정안은 실행되지 않았습니다."
                  : decisionStatus === "MOCK_EXECUTED"
                    ? "조정안의 모의 실행을 완료했습니다. 실제 이체나 외부 전송은 없습니다."
                    : "승인하기 전까지 기존 계획이 그대로 유지됩니다."
            }
            action={
              decisionPlan && decisionStatus ? (
                <StatusChip label={PLAN_STATUS_LABEL[decisionStatus].label} tone={PLAN_STATUS_LABEL[decisionStatus].tone} />
              ) : undefined
            }
          >
            {proposed && previous ? (
              <>
                <ul>
                  <CompareRow
                    label="월 납입액"
                    before={won(previous.totalMonthlyAmount)}
                    after={won(proposed.totalMonthlyAmount)}
                    note={`차이 ${wonDelta(proposed.totalMonthlyAmount - previous.totalMonthlyAmount)}`}
                  />
                  <CompareRow
                    label="잔액"
                    before={won(previous.unallocatedAmount)}
                    after={won(proposed.unallocatedAmount)}
                  />
                  <CompareRow
                    label="기한 내 달성"
                    before={previous.isFeasible ? "모든 목표 가능" : "일부 목표 지연"}
                    after={proposed.isFeasible ? "모든 목표 가능" : "일부 목표 지연"}
                  />
                </ul>
                <p className="text-xs text-[#526562] mt-2 tabular-nums">
                  기존 계획 v{previous.version} · 조정안 v{proposed.version}
                </p>
                {/* 공지는 여러 개의 강조 카드로 쪼개지 않고 한 블록에 모은다 */}
                {proposed.notices.length > 0 && (
                  <div className="mt-3 rounded-2xl border border-[#DCE7E4] bg-white p-4">
                    <p className="text-sm font-extrabold text-[#142B29] mb-2 flex items-center gap-1.5">
                      <Info className="w-4 h-4 text-[#5C5A14]" aria-hidden="true" />
                      확인할 점
                    </p>
                    <ul className="space-y-1.5">
                      {proposed.notices.map((notice) => (
                        <li key={notice} className="text-sm text-[#526562] leading-relaxed break-keep">
                          · {notice}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            ) : (
              previous && (
                <>
                  <SummaryRow label="유지 중인 계획" value={`v${previous.version}`} />
                  <SummaryRow label="월 납입 합계" value={won(previous.totalMonthlyAmount)} tone="strong" />
                  <SummaryRow label="잔액" value={won(previous.unallocatedAmount)} />
                </>
              )
            )}

            {/* 지표 비교는 접어 둔다 */}
            <Disclosure summary="지난달과 이번 달 지표 비교 보기" className="mt-3">
              <ul>
                {(
                  [
                    ["월 평균 소득", "monthlyIncome"],
                    ["고정 지출", "fixedExpenses"],
                    ["변동 지출", "variableExpenses"],
                    ["부채 상환", "debtPayment"],
                    ["월 저축 여력", "availableSurplus"],
                  ] as const
                ).map(([label, key]) => (
                  <CompareRow
                    key={key}
                    label={label}
                    before={won(review.previousMetrics[key])}
                    after={won(review.currentMetrics[key])}
                  />
                ))}
              </ul>
              <p className="text-[11px] text-[#526562] mt-3 tabular-nums leading-relaxed">
                {dateText(review.previousAsOf)} → {dateText(review.currentAsOf)} · 이번 분석 기간{" "}
                {review.currentWindow.monthsCovered}개월 · 거래 {review.currentWindow.transactionCount}건 · 월평균 사용{" "}
                {review.currentWindow.monthsUsed}개월
              </p>
            </Disclosure>
          </Section>

          {/* 상담사 연결 */}
          {consultation && (
            <Section
              id="review-consult"
              title="상담사 연결이 필요한 상황입니다"
              description={`${persona?.customerName ?? consultation.customerName} 님의 위험 상황 요약`}
              action={
                <StatusChip
                  label={CONSULTATION_STATUS_LABEL[consultation.status].label}
                  tone={CONSULTATION_STATUS_LABEL[consultation.status].tone}
                />
              }
            >
              <Callout
                tone="risk"
                title={consultation.riskType}
                icon={<PhoneCall className="w-4 h-4" aria-hidden="true" />}
              >
                {consultation.briefing.coreRisk}
              </Callout>

              {/* 브리핑은 점검 월 기준 값이다. 화면에서 다시 계산하지 않고 그대로 보여준다. */}
              <div className="mt-3 space-y-3">
                <div>
                  <p className="text-xs font-bold text-[#526562] mb-1">현재 재무 상태 (이번 점검 월 기준)</p>
                  <p className="text-sm text-[#142B29] leading-relaxed break-keep tabular-nums">
                    {consultation.briefing.financialState}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-[#526562] mb-1">목표에 미치는 영향</p>
                  <p className="text-sm text-[#142B29] leading-relaxed break-keep">
                    {consultation.briefing.impactOnGoals}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold text-[#526562] mb-1">상담사 권장 조치</p>
                  <p className="text-sm text-[#142B29] leading-relaxed break-keep">
                    {consultation.briefing.recommendedHumanAction}
                  </p>
                </div>
              </div>

              <Callout tone="muted" className="mt-3">
                위험 사례는 상담사 대기 목록에 모의 등록되었습니다. 이 체험판은 실제 상담 예약이나 외부 기관 전송을 하지
                않습니다.
              </Callout>
            </Section>
          )}

          {/* 다시 실행 */}
          <Section id="review-rerun" title="다시 확인하기">
            <ActionButton
              variant="ghost"
              full
              loading={pending.review}
              disabled={isConsentRevoked}
              onClick={() => void runMonthlyReview()}
            >
              {isConsentRevoked ? "수집 중단됨 (동의 철회)" : "점검 다시 실행"}
            </ActionButton>
          </Section>
        </>
      )}

      <StickyActions note={EXECUTION_NOTE}>{actions}</StickyActions>
    </div>
  );
};
