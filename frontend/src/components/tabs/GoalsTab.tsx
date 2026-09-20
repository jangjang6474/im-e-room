/**
 * 나의 목표
 *
 * 카드에는 목표 이름·남은 금액·예상 달성 시점·이번 달 납입액·달성 가능 상태만 먼저 보여준다.
 * 필요한 월 납입액, 부족액, 계산 근거, 연결 상품은 바텀시트로 옮긴다.
 * 주요 행동(최초 계획 승인, 모의 실행)은 모바일 하단에 고정한다.
 *
 * 배분액·달성 기간·자격은 계약 응답 값이며 화면에서 재계산하지 않는다.
 */

import React, { useState } from "react";
import { CheckCircle2, CircleSlash, Info, PlayCircle, Sliders, Wallet } from "lucide-react";
import { useEroomSession } from "../../api/EroomSession";
import { monthText, months, percent, won } from "../../api/format";
import {
  BOUNDARY_LABEL,
  BOUNDARY_ORDER,
  FEASIBILITY_LABEL,
  GOAL_CATEGORY_LABEL,
  OUTCOME_TONE,
  PLAN_STATUS_LABEL,
  PRODUCT_TYPE_LABEL,
} from "../../api/labels";
import type { BoundaryProductDecision, GoalAllocation } from "../../data/apiContracts";
import { GoalMethodExplainer } from "../GoalMethodExplainer";
import {
  ActionButton,
  BottomSheet,
  Callout,
  Disclosure,
  HeadlineCard,
  LoadingBlock,
  Section,
  StatusChip,
  StickyActions,
  SummaryRow,
} from "../ui/Primitives";

const EXECUTION_NOTE = "모의 실행입니다. 실제 금융기관 전송, 상품 가입, 자동이체 등록은 일어나지 않습니다.";

export const GoalsTab: React.FC = () => {
  const {
    planPreview,
    currentPlan,
    products,
    boundaryId,
    changeBoundary,
    registerPlan,
    startGoalRedesign,
    approvePlan,
    rejectPlan,
    executePlan,
    setTab,
    pending,
    feedback,
    clearFeedback,
  } = useEroomSession();
  const [detailGoal, setDetailGoal] = useState<GoalAllocation | null>(null);
  /** 후보 상품은 목표를 고르는 흐름을 막지 않도록 바텀시트에서만 연다. */
  const [isProductSheetOpen, setProductSheetOpen] = useState(false);

  const plan = currentPlan ?? planPreview;
  if (!plan) return <LoadingBlock label="목표별 계획을 불러오는 중입니다." rows={4} />;

  const isRegistered = currentPlan !== null;
  const status = PLAN_STATUS_LABEL[plan.status];
  const topGoal = plan.allocations[0] ?? null;

  /* 하단 고정 영역에 둘 주요 행동 하나(필요하면 보조 행동 하나) */
  const primaryActions = (() => {
    if (!isRegistered) {
      return (
        <ActionButton
          full
          loading={pending.plan}
          onClick={() => void registerPlan()}
          icon={<CheckCircle2 className="w-4 h-4" aria-hidden="true" />}
        >
          이 계획으로 시작하기
        </ActionButton>
      );
    }
    if (plan.status === "PROPOSED") {
      return (
        <>
          <ActionButton
            full
            loading={pending[`approve:${plan.planId}`]}
            onClick={() => void approvePlan(plan.planId)}
            icon={<CheckCircle2 className="w-4 h-4" aria-hidden="true" />}
          >
            이 계획으로 확정하기
          </ActionButton>
          <ActionButton
            variant="ghost"
            full
            loading={pending[`reject:${plan.planId}`]}
            onClick={() => void rejectPlan(plan.planId)}
            icon={<CircleSlash className="w-4 h-4" aria-hidden="true" />}
          >
            지금은 확정하지 않기
          </ActionButton>
        </>
      );
    }
    if (plan.status === "APPROVED") {
      return (
        <ActionButton
          full
          loading={pending[`execute:${plan.planId}`]}
          onClick={() => void executePlan(plan.planId)}
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

      {/* 계획 요약 — 이 화면의 유일한 강조 영역 */}
      <HeadlineCard
        statusLabel={isRegistered ? status.label : "아직 시작 전"}
        headline={`매달 ${won(plan.totalMonthlyAmount)}을 목표에 나눠 모읍니다.`}
        description={
          plan.isFeasible
            ? "지금 계획이면 모든 목표를 기한 안에 모을 수 있습니다."
            : "기한 안에 모으기 어려운 목표가 있습니다. 아래에서 목표별 상태를 확인하세요."
        }
        tone={isRegistered ? status.tone : "neutral"}
        meta={`저축 여력 ${won(plan.availableSurplus)} 중 목표에 배분하지 않은 잔액은 ${won(plan.unallocatedAmount)}입니다.`}
      />

      {/* 목표별 카드 */}
      <Section id="goals-list" title="목표별 계획" description="우선순위가 높은 목표부터 저축 여력을 배분합니다.">
        <ul className="space-y-3">
          {plan.allocations.map((allocation, index) => {
            const feasibility = FEASIBILITY_LABEL[allocation.feasibility];
            return (
              <li key={allocation.goalId} className="rounded-2xl border border-[#DCE7E4] p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-[#006B5B]">
                      {index + 1}순위 · {GOAL_CATEGORY_LABEL[allocation.category]}
                    </p>
                    <p className="font-extrabold text-[#142B29] mt-0.5 break-keep">{allocation.goalTitle}</p>
                  </div>
                  <StatusChip label={feasibility.label} tone={feasibility.tone} />
                </div>
                <div className="mt-2">
                  <SummaryRow label="이번 달 납입액" value={won(allocation.monthlyAmount)} tone="strong" />
                  <SummaryRow label="남은 금액" value={won(allocation.remainingAmount)} />
                  <SummaryRow
                    label="예상 달성 시점"
                    value={allocation.expectedCompletionMonth ? monthText(allocation.expectedCompletionMonth) : "배분 없음"}
                  />
                </div>
                <div className="mt-3">
                  <ActionButton variant="ghost" full onClick={() => setDetailGoal(allocation)}>
                    계산 근거와 상세 보기
                  </ActionButton>
                </div>
              </li>
            );
          })}
        </ul>

        {isRegistered ? (
          <Callout tone="muted" title="시작한 계획의 목표는 바꾸지 않습니다" className="mt-3">
            시작한 계획은 덮어쓰지 않습니다. 목표를 바꾸려면 이번 달 점검에서 새 계획을 받거나 처음부터 다시 시작하세요.
          </Callout>
        ) : (
          <div className="mt-3">
            <ActionButton
              variant="secondary"
              full
              onClick={startGoalRedesign}
              icon={<Sliders className="w-4 h-4" aria-hidden="true" />}
            >
              목표 금액·기한·우선순위 다시 정하기
            </ActionButton>
          </div>
        )}
      </Section>

      {/* 목표를 어떻게 달성하는지 */}
      <Section id="goals-method" title="달성 방법">
        <GoalMethodExplainer plan={plan} />
      </Section>

      {/* 상품 바운더리 = 모으는 방식 */}
      <Section
        id="goals-boundary"
        title="어떤 방식으로 모을까요"
        description="선택에 따라 사용할 수 있는 상품 범위와 월 납입 한도가 달라집니다."
      >
        <fieldset disabled={pending.boundary || isRegistered}>
          <legend className="sr-only">모으는 방식 선택</legend>
          <div className="grid gap-2 md:grid-cols-3">
            {BOUNDARY_ORDER.map((id) => {
              const selected = boundaryId === id;
              return (
                <label
                  key={id}
                  className={`rounded-2xl border p-4 min-h-[44px] block cursor-pointer ${
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
                  <span className="block text-sm text-[#526562] mt-2 leading-relaxed break-keep">
                    {BOUNDARY_LABEL[id].summary}
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {pending.boundary && (
          <p className="text-sm text-[#526562] mt-3" aria-live="polite">
            선택한 방식으로 계획을 다시 계산하는 중입니다.
          </p>
        )}

        {/* 선택했을 때 달라지는 값 (모두 응답 값) */}
        <div className="mt-3" aria-live="polite">
          <p className="text-xs font-bold text-[#526562] mb-1">{BOUNDARY_LABEL[boundaryId].label}을 선택했을 때</p>
          <SummaryRow label="월 납입 합계" value={won(plan.totalMonthlyAmount)} tone="strong" />
          <SummaryRow
            label="1순위 목표 예상 달성"
            value={topGoal?.expectedCompletionMonth ? monthText(topGoal.expectedCompletionMonth) : "배분 없음"}
          />
          <SummaryRow label="잔액" value={won(plan.unallocatedAmount)} />
        </div>

        {products && (
          <div className="mt-3">
            <ActionButton
              variant="ghost"
              full
              onClick={() => setProductSheetOpen(true)}
              icon={<Wallet className="w-4 h-4" aria-hidden="true" />}
            >
              이 방식에서 쓰는 상품 {products.includedCount}개 보기
            </ActionButton>
          </div>
        )}
      </Section>

      {/* 계산 전제와 공지 */}
      <Section id="goals-basis" title="이 계획의 전제">
        {/* 공지는 여러 개의 강조 카드로 쪼개지 않고 한 블록에 모은다 */}
        {plan.notices.length > 0 && (
          <div className="rounded-2xl border border-[#DCE7E4] bg-white p-4 mb-3">
            <p className="text-sm font-extrabold text-[#142B29] mb-2 flex items-center gap-1.5">
              <Info className="w-4 h-4 text-[#5C5A14]" aria-hidden="true" />
              확인할 점
            </p>
            <ul className="space-y-1.5">
              {plan.notices.map((notice) => (
                <li key={notice} className="text-sm text-[#526562] leading-relaxed break-keep">
                  · {notice}
                </li>
              ))}
            </ul>
          </div>
        )}
        <Disclosure summary="계산 전제 보기">
          <ul className="space-y-1.5">
            {plan.assumptions.map((assumption) => (
              <li key={assumption} className="text-sm text-[#526562] leading-relaxed break-keep">
                · {assumption}
              </li>
            ))}
          </ul>
        </Disclosure>

        {isRegistered && plan.status !== "PROPOSED" && plan.status !== "APPROVED" && (
          <Callout tone="muted" title="이 계획은 이미 결정되었습니다" className="mt-3">
            이 체험에서 {status.label} 상태가 된 계획입니다. 시작한 계획은 수정하지 않고 새 버전으로만 바꾸므로, 같은
            고객으로 처음 흐름을 다시 보려면 시연 모드에서 체험을 초기화하거나 다른 고객을 선택하세요.
          </Callout>
        )}
      </Section>

      <StickyActions note={EXECUTION_NOTE}>{primaryActions}</StickyActions>

      {/* 후보 상품 — 목표를 고르는 흐름을 막지 않도록 바텀시트에서만 보여준다 */}
      <BottomSheet
        isOpen={isProductSheetOpen}
        onClose={() => setProductSheetOpen(false)}
        title={products ? `${products.boundaryLabel}에서 쓰는 상품` : "후보 상품"}
      >
        {products && (
          <>
            <p className="text-sm text-[#526562] leading-relaxed break-keep tabular-nums">
              {products.limits.allowedProductTypes.map((type) => PRODUCT_TYPE_LABEL[type]).join("·")} · 최대 만기{" "}
              {months(products.limits.maxMaturityMonths)} · 월 납입 한도 {won(products.limits.maxMonthlyDeposit)}
            </p>
            <ul className="mt-3 space-y-2">
              {products.products
                .filter((product: BoundaryProductDecision) => product.included)
                .map((product: BoundaryProductDecision) => (
                  <li key={product.productId} className="rounded-2xl border border-[#DCE7E4] p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-extrabold text-[#142B29] break-keep">{product.name}</p>
                        <p className="text-xs text-[#526562] mt-0.5 break-keep">{product.provider}</p>
                      </div>
                      <StatusChip label={PRODUCT_TYPE_LABEL[product.productType]} tone="neutral" />
                    </div>
                    <p className="text-xs text-[#526562] mt-2 tabular-nums leading-relaxed">
                      만기 {months(product.maturityMonths)} · 월 납입 한도 {won(product.maxMonthlyDeposit)} · 금리{" "}
                      {percent(product.baseRate, 2)} ~ {percent(product.maxRate, 2)}
                    </p>
                  </li>
                ))}
            </ul>
            <Callout tone="muted" className="mt-3">
              상품은 계산에 쓰는 후보일 뿐이며 권유가 아닙니다. 자격이 확인되지 않은 제도에는 자동으로 배분하지
              않습니다.
            </Callout>
            <div className="mt-3">
              <ActionButton
                variant="ghost"
                full
                onClick={() => {
                  setProductSheetOpen(false);
                  setTab("policy");
                }}
              >
                제도별 자격까지 확인하기
              </ActionButton>
            </div>
          </>
        )}
      </BottomSheet>

      {/* 목표 상세 — 필요한 월 납입액·부족액·근거·연결 상품 */}
      <BottomSheet
        isOpen={detailGoal !== null}
        onClose={() => setDetailGoal(null)}
        title={detailGoal?.goalTitle ?? "목표 상세"}
      >
        {detailGoal && (
          <>
            <SummaryRow label="이번 달 납입액" value={won(detailGoal.monthlyAmount)} tone="strong" />
            <SummaryRow label="남은 금액" value={won(detailGoal.remainingAmount)} />
            <SummaryRow label="목표 기한" value={months(detailGoal.targetMonths)} />
            <SummaryRow label="기한 내 달성에 필요한 월 납입액" value={won(detailGoal.requiredMonthly)} />
            <SummaryRow
              label="기한 내 달성에 부족한 금액"
              value={detailGoal.monthlyShortfall > 0 ? `월 ${won(detailGoal.monthlyShortfall)}` : "없음"}
            />
            <SummaryRow
              label="예상 소요 기간"
              value={detailGoal.expectedMonths === null ? "산출 불가" : months(detailGoal.expectedMonths)}
            />
            <SummaryRow label="연결 상품" value={detailGoal.productName} />
            <SummaryRow
              label="달성 가능 상태"
              value={
                <StatusChip
                  label={FEASIBILITY_LABEL[detailGoal.feasibility].label}
                  tone={FEASIBILITY_LABEL[detailGoal.feasibility].tone}
                />
              }
            />
            {detailGoal.reasons.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-bold text-[#526562] mb-1.5">이렇게 배분한 이유</p>
                <ul className="space-y-1.5">
                  {detailGoal.reasons.map((reason) => (
                    <li key={reason} className="text-sm text-[#526562] leading-relaxed break-keep">
                      · {reason}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </BottomSheet>
    </div>
  );
};
