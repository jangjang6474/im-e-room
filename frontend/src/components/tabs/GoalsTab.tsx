/**
 * 나의 목표 (필수 흐름 8·9·11·14)
 *
 * - 목표 금액·기한·우선순위 확인
 * - 안정형·균형형·목표집중형 상품 바운더리 선택 (백엔드가 다시 계산한 계획을 표시)
 * - 목표별 최초 계획 등록 → 승인 → 모의 실행
 *
 * 배분액·달성 기간·자격은 백엔드 결과이며 화면에서 재계산하지 않는다.
 */

import React from "react";
import { CheckCircle2, CircleSlash, Info, PlayCircle, Target } from "lucide-react";
import { useEroomSession } from "../../api/EroomSession";
import { months, won } from "../../api/format";
import {
  BOUNDARY_LABEL,
  BOUNDARY_ORDER,
  FEASIBILITY_LABEL,
  GOAL_CATEGORY_LABEL,
  OUTCOME_TONE,
  PLAN_STATUS_LABEL,
  PRODUCT_TYPE_LABEL,
} from "../../api/labels";
import {
  ActionButton,
  Callout,
  KeyValueRow,
  LoadingBlock,
  MetricTile,
  Panel,
  SectionHeading,
  StatusChip,
} from "../ui/Primitives";

export const GoalsTab: React.FC = () => {
  const {
    planPreview,
    currentPlan,
    products,
    boundaryId,
    changeBoundary,
    registerPlan,
    approvePlan,
    rejectPlan,
    executePlan,
    setTab,
    pending,
    feedback,
    clearFeedback,
  } = useEroomSession();

  const plan = currentPlan ?? planPreview;
  if (!plan) return <LoadingBlock label="목표별 계획을 불러오는 중입니다." rows={4} />;

  const isRegistered = currentPlan !== null;
  const status = PLAN_STATUS_LABEL[plan.status];

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

      {/* 목표 확인 */}
      <Panel className="p-5" ariaLabelledBy="goals-list">
        <SectionHeading
          id="goals-list"
          title="목표 금액과 기한"
          icon={<Target className="w-5 h-5 text-[#006B5B]" aria-hidden="true" />}
          description="우선순위가 높은 목표부터 저축 여력을 배분합니다."
        />
        <ul className="space-y-3">
          {plan.allocations.map((allocation, index) => {
            const feasibility = FEASIBILITY_LABEL[allocation.feasibility];
            return (
              <li key={allocation.goalId} className="rounded-2xl border border-[#DCE7E4] p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#006B5B]">{index + 1}순위 · {GOAL_CATEGORY_LABEL[allocation.category]}</p>
                    <p className="font-extrabold text-[#142B29] mt-0.5 break-keep">{allocation.goalTitle}</p>
                  </div>
                  <StatusChip label={feasibility.label} tone={feasibility.tone} />
                </div>
                <div className="mt-3">
                  <KeyValueRow label="남은 목표 금액" value={won(allocation.remainingAmount)} />
                  <KeyValueRow label="목표 기한" value={months(allocation.targetMonths)} />
                  <KeyValueRow
                    label="기한 내 달성에 필요한 월 납입"
                    value={won(allocation.requiredMonthly)}
                  />
                  <KeyValueRow
                    label="이번 계획의 월 납입"
                    value={won(allocation.monthlyAmount)}
                    hint={allocation.productName}
                  />
                  <KeyValueRow
                    label="예상 달성 시점"
                    value={
                      allocation.expectedCompletionMonth
                        ? `${allocation.expectedCompletionMonth} (${months(allocation.expectedMonths)})`
                        : "배분 없음"
                    }
                  />
                </div>
                {allocation.reasons.length > 0 && (
                  <ul className="mt-2 space-y-1">
                    {allocation.reasons.map((reason) => (
                      <li key={reason} className="text-xs text-[#526562] leading-relaxed">
                        · {reason}
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            );
          })}
        </ul>
        <Callout tone="muted" title="목표 편집에 대한 안내" icon={<Info className="w-4 h-4" aria-hidden="true" />}>
          이번 제출본은 합성 고객에 등록된 목표 금액·기한·우선순위를 사용합니다. 목표를 바꾸는 입력은 기존 승인 계획을
          덮어쓰지 않고 새 계획 제안으로 처리해야 하므로, 백엔드 계약에 목표 편집이 추가된 뒤 연결할 예정입니다.
        </Callout>
      </Panel>

      {/* 상품 바운더리 선택 */}
      <Panel className="p-5" ariaLabelledBy="goals-boundary">
        <SectionHeading
          id="goals-boundary"
          title="어떤 방식으로 모을까요"
          description="선택에 따라 사용할 수 있는 상품 범위와 월 납입 한도가 달라집니다."
        />
        <fieldset disabled={pending.boundary || isRegistered}>
          <legend className="sr-only">상품 바운더리 선택</legend>
          <div className="grid gap-3 md:grid-cols-3">
            {BOUNDARY_ORDER.map((id) => {
              const selected = boundaryId === id;
              return (
                <label
                  key={id}
                  className={`rounded-2xl border p-4 cursor-pointer min-h-[44px] block ${
                    selected ? "border-[#00C4A6] bg-[#EAFBF6]" : "border-[#DCE7E4] bg-white hover:bg-[#F6F9F8]"
                  } ${pending.boundary || isRegistered ? "opacity-70 cursor-not-allowed" : ""}`}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="boundary"
                      value={id}
                      checked={selected}
                      onChange={() => void changeBoundary(id)}
                      className="w-5 h-5 accent-[#00C4A6]"
                    />
                    <span className="font-extrabold text-[#142B29]">{BOUNDARY_LABEL[id].label}</span>
                    {selected && <StatusChip label="선택함" tone="positive" />}
                  </span>
                  <span className="block text-xs text-[#526562] mt-2 leading-relaxed break-keep">
                    {BOUNDARY_LABEL[id].summary}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {pending.boundary && <p className="text-sm text-[#526562] mt-3" aria-live="polite">선택한 기준으로 계획을 다시 계산하는 중입니다.</p>}

        {isRegistered && (
          <Callout tone="muted" title="계획 등록 후에는 기준을 바꾸지 않습니다">
            등록한 계획은 수정하지 않습니다. 다른 기준을 보려면 이번 달 점검에서 새 계획을 받거나 처음부터 다시 시작하세요.
          </Callout>
        )}

        {products && (
          <div className="mt-4 rounded-2xl border border-[#DCE7E4] p-4">
            <p className="text-sm font-extrabold text-[#142B29]">
              {products.boundaryLabel} 기준 후보 상품 {products.includedCount}개
            </p>
            <p className="text-xs text-[#526562] mt-1 leading-relaxed tabular-nums">
              {products.limits.allowedProductTypes.map((type) => PRODUCT_TYPE_LABEL[type]).join("·")} · 최대 만기{" "}
              {months(products.limits.maxMaturityMonths)} · 월 납입 한도 {won(products.limits.maxMonthlyDeposit)}
            </p>
            <div className="mt-3">
              <ActionButton variant="ghost" onClick={() => setTab("policy")}>
                후보 상품과 정책 자격 보기
              </ActionButton>
            </div>
          </div>
        )}
      </Panel>

      {/* 계획 요약과 승인 */}
      <Panel className="p-5" ariaLabelledBy="goals-plan">
        <SectionHeading
          id="goals-plan"
          title={`목표별 납입 계획 v${plan.version}`}
          description={isRegistered ? "등록된 계획입니다." : "아직 등록하지 않은 미리보기입니다."}
          action={<StatusChip label={isRegistered ? status.label : "미리보기"} tone={isRegistered ? status.tone : "muted"} />}
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricTile label="월 저축 여력" value={won(plan.availableSurplus)} tone="muted" />
          <MetricTile label="월 납입 합계" value={won(plan.totalMonthlyAmount)} tone="positive" />
          <MetricTile label="남기는 금액" value={won(plan.unallocatedAmount)} tone="muted" hint="생활 유동성으로 남깁니다." />
          <MetricTile
            label="기한 내 달성"
            value={plan.isFeasible ? "모든 목표 가능" : "일부 목표 지연"}
            tone={plan.isFeasible ? "positive" : "attention"}
          />
        </div>

        {plan.notices.length > 0 && (
          <div className="mt-4 space-y-2">
            {plan.notices.map((notice) => (
              <Callout key={notice} tone="attention">
                {notice}
              </Callout>
            ))}
          </div>
        )}

        <div className="mt-4">
          <p className="text-xs font-bold text-[#526562] mb-1.5">계산 전제</p>
          <ul className="space-y-1">
            {plan.assumptions.map((assumption) => (
              <li key={assumption} className="text-xs text-[#526562] leading-relaxed">
                · {assumption}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-5 flex flex-col sm:flex-row gap-2">
          {!isRegistered && (
            <ActionButton loading={pending.plan} onClick={() => void registerPlan()} icon={<CheckCircle2 className="w-4 h-4" aria-hidden="true" />}>
              이 계획으로 시작하기
            </ActionButton>
          )}
          {isRegistered && plan.status === "PROPOSED" && (
            <>
              <ActionButton
                loading={pending[`approve:${plan.planId}`]}
                onClick={() => void approvePlan(plan.planId)}
                icon={<CheckCircle2 className="w-4 h-4" aria-hidden="true" />}
              >
                계획 승인하기
              </ActionButton>
              <ActionButton
                variant="ghost"
                loading={pending[`reject:${plan.planId}`]}
                onClick={() => void rejectPlan(plan.planId)}
                icon={<CircleSlash className="w-4 h-4" aria-hidden="true" />}
              >
                지금은 승인하지 않기
              </ActionButton>
            </>
          )}
          {isRegistered && plan.status === "APPROVED" && (
            <ActionButton
              loading={pending[`execute:${plan.planId}`]}
              onClick={() => void executePlan(plan.planId)}
              icon={<PlayCircle className="w-4 h-4" aria-hidden="true" />}
            >
              모의 실행하기 (실제 이체 없음)
            </ActionButton>
          )}
          {isRegistered && (plan.status === "MOCK_EXECUTED" || plan.status === "REJECTED" || plan.status === "SUPERSEDED") && (
            <ActionButton variant="secondary" onClick={() => setTab("history")}>
              변경 내역에서 확인하기
            </ActionButton>
          )}
        </div>
        {isRegistered && plan.status !== "PROPOSED" && plan.status !== "APPROVED" && (
          <Callout tone="muted" title="이 계획은 이미 결정되었습니다" className="mt-3">
            이 체험 세션에서 {status.label} 상태가 된 계획입니다. 승인된 계획은 수정하지 않고 새 버전으로만 바꾸므로, 같은
            고객으로 처음 흐름을 다시 보려면 시연 모드에서 세션을 초기화하거나 다른 고객을 선택하세요.
          </Callout>
        )}
        <p className="text-[11px] text-[#526562] mt-3 leading-relaxed">
          승인 전에는 아무것도 실행되지 않습니다. 모의 실행은 자동이체를 설정한 것으로 기록만 남기며 실제 금융기관 전송은 없습니다.
        </p>
      </Panel>
    </div>
  );
};
