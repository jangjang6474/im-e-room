/**
 * 5) 목표 설계
 *
 * 재무진단이 끝난 사용자가 자신의 목표를 직접 만드는 단계이다.
 *
 * 흐름: 목표 선택 → 목표 금액 → 목표 기한 → 지금까지 모은 금액 → 우선순위 → 모으는 방식 → 계획 미리보기 → 승인
 *
 * - 한 화면에 질문 하나만 둔다. 다음으로 넘어가기 전에 그 단계의 입력만 검사한다.
 * - 시작값은 이 가상 고객이 이미 가지고 있는 목표이다. 그대로 두고 넘어가면 기존 계획과 같은 결과가 나온다.
 * - 이 화면은 금액을 계산하지 않는다. 미리보기의 납입액·달성 시점은 모두 계약 응답 값이다.
 */

import React, { useMemo, useState } from "react";
import { ArrowLeft, ArrowRight, Check, ChevronDown, ChevronUp, Plus, Sparkles, Trash2 } from "lucide-react";
import { useEroomSession } from "../api/EroomSession";
import { monthText, months, won } from "../api/format";
import { BOUNDARY_LABEL, BOUNDARY_ORDER, FEASIBILITY_LABEL, GOAL_CATEGORY_LABEL } from "../api/labels";
import {
  GOAL_DESIGN_LIMITS,
  GOAL_TEMPLATES,
  draftFromTemplate,
  findGoalTemplate,
  renumberDrafts,
  type GoalDraft,
} from "../domain/goalDesign";
import { GoalMethodExplainer } from "./GoalMethodExplainer";
import { ActionButton, Callout, LoadingBlock, StatusChip, SummaryRow } from "./ui/Primitives";

type StepId = "select" | "amount" | "deadline" | "current" | "priority" | "method" | "preview";

const STEPS: Array<{ id: StepId; title: string; question: string; help: string }> = [
  {
    id: "select",
    title: "목표 선택",
    question: "어떤 목표를 모으고 싶나요?",
    help: `최대 ${GOAL_DESIGN_LIMITS.maxGoals}개까지 고를 수 있습니다. 나중에 다시 바꿀 수 있습니다.`,
  },
  {
    id: "amount",
    title: "목표 금액",
    question: "얼마를 모을까요?",
    help: "목표마다 모으고 싶은 전체 금액을 적습니다.",
  },
  {
    id: "deadline",
    title: "목표 기한",
    question: "언제까지 모을까요?",
    help: "기한을 늘리면 매달 넣는 금액이 줄어듭니다.",
  },
  {
    id: "current",
    title: "지금까지 모은 금액",
    question: "이미 모아 둔 돈이 있나요?",
    help: "이미 모은 금액을 빼고 남은 금액만 계획에 넣습니다.",
  },
  {
    id: "priority",
    title: "우선순위",
    question: "어떤 목표를 먼저 채울까요?",
    help: "저축 여력은 위에 있는 목표부터 차례로 배분합니다.",
  },
  {
    id: "method",
    title: "모으는 방식",
    question: "어떤 방식으로 모을까요?",
    help: "선택에 따라 사용할 수 있는 상품 범위와 월 납입 한도가 달라집니다.",
  },
  {
    id: "preview",
    title: "계획 미리보기",
    question: "이 계획으로 시작할까요?",
    help: "승인하기 전에는 아무것도 실행되지 않습니다.",
  },
];

/** 금액 입력. 숫자만 받고 화면에는 천 단위 구분 기호를 보여준다. */
const MoneyField: React.FC<{
  id: string;
  label: string;
  value: number;
  onChange: (value: number) => void;
  hint?: string;
  invalid?: boolean;
}> = ({ id, label, value, onChange, hint, invalid }) => (
  <div>
    <label htmlFor={id} className="block text-sm font-bold text-[#142B29] break-keep">
      {label}
    </label>
    {hint && <p className="text-xs text-[#526562] mt-1 leading-relaxed break-keep">{hint}</p>}
    <div className="mt-2 flex items-center gap-2">
      <input
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        value={Number.isFinite(value) ? value.toLocaleString("ko-KR") : ""}
        onChange={(event) => {
          const digits = event.target.value.replace(/[^0-9]/g, "");
          onChange(digits === "" ? 0 : Number(digits));
        }}
        aria-invalid={invalid || undefined}
        className={`flex-1 min-w-0 min-h-[48px] px-4 rounded-2xl border bg-white text-right text-base font-extrabold tabular-nums text-[#142B29] ${
          invalid ? "border-[#9A3412]" : "border-[#758782]"
        }`}
      />
      <span className="text-sm font-bold text-[#526562] shrink-0">원</span>
    </div>
    <div className="mt-2 flex flex-wrap gap-2">
      {[1_000_000, 100_000].map((step) => (
        <button
          key={step}
          type="button"
          onClick={() => onChange(Math.max(0, value + step))}
          className="min-h-[36px] px-3 rounded-full border border-[#DCE7E4] bg-white text-xs font-bold text-[#006B5B] hover:bg-[#EAFBF6]"
        >
          +{(step / 10_000).toLocaleString("ko-KR")}만원
        </button>
      ))}
      <button
        type="button"
        onClick={() => onChange(0)}
        className="min-h-[36px] px-3 rounded-full border border-[#DCE7E4] bg-white text-xs font-bold text-[#526562] hover:bg-[#F6F9F8]"
      >
        0으로 지우기
      </button>
    </div>
  </div>
);

const MONTH_CHOICES = [6, 12, 24, 36, 60];

export const GoalDesignView: React.FC = () => {
  const {
    persona,
    diagnosis,
    goalDrafts,
    goalIssues,
    setGoalDrafts,
    previewDesignedPlan,
    finishGoalDesign,
    skipGoalDesign,
    registerPlan,
    planPreview,
    currentPlan,
    boundaryId,
    changeBoundary,
    pending,
    error,
  } = useEroomSession();

  const [stepIndex, setStepIndex] = useState(0);
  const [stepMessage, setStepMessage] = useState<string | null>(null);
  const step = STEPS[stepIndex];
  const drafts = goalDrafts;
  const surplus = diagnosis?.metrics.availableSurplus ?? null;

  const issueFor = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const issue of goalIssues) {
      map.set(issue.goalId, [...(map.get(issue.goalId) ?? []), issue.message]);
    }
    return map;
  }, [goalIssues]);

  const update = (goalId: string, patch: Partial<GoalDraft>) =>
    setGoalDrafts(drafts.map((draft) => (draft.id === goalId ? { ...draft, ...patch } : draft)));

  const toggleTemplate = (templateId: string) => {
    const template = findGoalTemplate(templateId);
    if (!template) return;
    setStepMessage(null);
    if (template.repeatable) {
      if (drafts.length >= GOAL_DESIGN_LIMITS.maxGoals) {
        setStepMessage(`목표는 최대 ${GOAL_DESIGN_LIMITS.maxGoals}개까지 고를 수 있습니다.`);
        return;
      }
      setGoalDrafts(renumberDrafts([...drafts, draftFromTemplate(template, drafts)]));
      return;
    }
    const existing = drafts.find((draft) => draft.templateId === templateId);
    if (existing) {
      setGoalDrafts(renumberDrafts(drafts.filter((draft) => draft.id !== existing.id)));
      return;
    }
    if (drafts.length >= GOAL_DESIGN_LIMITS.maxGoals) {
      setStepMessage(`목표는 최대 ${GOAL_DESIGN_LIMITS.maxGoals}개까지 고를 수 있습니다.`);
      return;
    }
    setGoalDrafts(renumberDrafts([...drafts, draftFromTemplate(template, drafts)]));
  };

  const move = (index: number, direction: -1 | 1) => {
    const next = index + direction;
    if (next < 0 || next >= drafts.length) return;
    const reordered = [...drafts];
    [reordered[index], reordered[next]] = [reordered[next], reordered[index]];
    setGoalDrafts(renumberDrafts(reordered));
  };

  /** 이 단계에서 확인해야 할 값만 검사한다. 전체 검증은 미리보기 직전에 한 번 더 한다. */
  const validateStep = (): string | null => {
    if (drafts.length === 0) return "목표를 1개 이상 선택하세요.";
    if (step.id === "amount") {
      const bad = drafts.find((draft) => draft.targetAmount < GOAL_DESIGN_LIMITS.minTargetAmount);
      if (bad) return `'${bad.title}'의 목표 금액을 ${GOAL_DESIGN_LIMITS.minTargetAmount.toLocaleString("ko-KR")}원 이상으로 정하세요.`;
    }
    if (step.id === "deadline") {
      const bad = drafts.find((draft) => draft.targetMonths < 1 || draft.targetMonths > GOAL_DESIGN_LIMITS.maxTargetMonths);
      if (bad) return `'${bad.title}'의 목표 기한을 1~${GOAL_DESIGN_LIMITS.maxTargetMonths}개월 사이로 정하세요.`;
    }
    if (step.id === "current") {
      const bad = drafts.find((draft) => draft.currentAmount > draft.targetAmount);
      if (bad) return `'${bad.title}'의 모은 금액이 목표 금액보다 많습니다.`;
    }
    if (step.id === "select") {
      const bad = drafts.find((draft) => draft.title.trim().length === 0);
      if (bad) return "목표 이름을 입력하세요.";
    }
    return null;
  };

  const goNext = async () => {
    const message = validateStep();
    setStepMessage(message);
    if (message) return;
    // 모으는 방식까지 고른 뒤에 설계한 목표로 계획을 다시 계산한다.
    if (step.id === "method") {
      const ok = await previewDesignedPlan(drafts);
      if (!ok) {
        setStepMessage("입력한 값을 다시 확인해 주세요.");
        return;
      }
    }
    setStepIndex((prev) => Math.min(prev + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setStepMessage(null);
    setStepIndex((prev) => Math.max(prev - 1, 0));
  };

  /** 등록에 실패하면 홈으로 넘기지 않고 이 화면에 오류를 남긴다. */
  const startPlan = async () => {
    const registered = await registerPlan();
    if (registered) finishGoalDesign();
  };

  const progressPercent = Math.round(((stepIndex + 1) / STEPS.length) * 100);

  return (
    <main className="flex-1 w-full">
      <div className="max-w-[560px] mx-auto px-4 sm:px-6 py-6 space-y-5">
        {/* 진행 상태 */}
        <div>
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-extrabold text-[#006B5B] tabular-nums">
              목표 설계 {stepIndex + 1} / {STEPS.length} · {step.title}
            </p>
            <button
              type="button"
              onClick={() => void skipGoalDesign()}
              className="min-h-[44px] text-xs font-bold text-[#526562] underline"
            >
              추천 목표 그대로 쓰기
            </button>
          </div>
          <div
            role="progressbar"
            aria-valuenow={progressPercent}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="목표 설계 진행률"
            className="mt-2 w-full h-2 rounded-full bg-[#EDF3F1] overflow-hidden"
          >
            <div className="h-full rounded-full bg-[#00C4A6]" style={{ width: `${progressPercent}%` }} />
          </div>
        </div>

        <div>
          <h1 className="text-2xl font-black text-[#142B29] leading-snug break-keep">{step.question}</h1>
          <p className="text-sm text-[#526562] mt-2 leading-relaxed break-keep">{step.help}</p>
          {stepIndex === 0 && (
            <p className="text-xs text-[#526562] mt-2 leading-relaxed break-keep">
              {persona ? `${persona.customerName} 님의 ` : ""}재무진단 결과 매달 저축할 수 있는 돈은{" "}
              <span className="font-extrabold text-[#142B29] tabular-nums">{won(surplus)}</span>입니다.
            </p>
          )}
        </div>

        {stepMessage && (
          <div role="alert">
            <Callout tone="risk" title="확인이 필요합니다">
              {stepMessage}
            </Callout>
          </div>
        )}

        {/* ① 목표 선택 */}
        {step.id === "select" && (
          <div className="space-y-3">
            <ul className="space-y-2">
              {GOAL_TEMPLATES.map((template) => {
                const selected = drafts.some((draft) => draft.templateId === template.id);
                return (
                  <li key={template.id}>
                    <button
                      type="button"
                      onClick={() => toggleTemplate(template.id)}
                      aria-pressed={template.repeatable ? undefined : selected}
                      className={`w-full text-left rounded-2xl border p-4 min-h-[44px] ${
                        selected && !template.repeatable
                          ? "border-[#00C4A6] bg-[#EAFBF6]"
                          : "border-[#DCE7E4] bg-white hover:bg-[#F6F9F8]"
                      }`}
                    >
                      <span className="flex items-start justify-between gap-2">
                        <span className="min-w-0">
                          <span className="block font-extrabold text-[#142B29] break-keep">{template.label}</span>
                          <span className="block text-sm text-[#526562] mt-1 leading-relaxed break-keep">
                            {template.description}
                          </span>
                        </span>
                        <span className="shrink-0">
                          {template.repeatable ? (
                            <Plus className="w-5 h-5 text-[#006B5B]" aria-hidden="true" />
                          ) : selected ? (
                            <StatusChip label="선택함" tone="positive" />
                          ) : (
                            <span className="text-xs font-bold text-[#7A8B88]">선택</span>
                          )}
                        </span>
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>

            {drafts.length > 0 && (
              <div className="rounded-2xl border border-[#DCE7E4] bg-white p-4">
                <p className="text-sm font-extrabold text-[#142B29] mb-2">선택한 목표 {drafts.length}개</p>
                <ul className="space-y-3">
                  {drafts.map((draft) => (
                    <li key={draft.id} className="flex items-center gap-2">
                      <label htmlFor={`title-${draft.id}`} className="sr-only">
                        목표 이름
                      </label>
                      <input
                        id={`title-${draft.id}`}
                        type="text"
                        value={draft.title}
                        maxLength={GOAL_DESIGN_LIMITS.maxTitleLength}
                        onChange={(event) => update(draft.id, { title: event.target.value })}
                        className="flex-1 min-w-0 min-h-[44px] px-3 rounded-2xl border border-[#758782] bg-white text-sm font-bold text-[#142B29]"
                      />
                      <button
                        type="button"
                        onClick={() => setGoalDrafts(renumberDrafts(drafts.filter((item) => item.id !== draft.id)))}
                        className="min-h-[44px] min-w-[44px] rounded-2xl border border-[#DCE7E4] inline-flex items-center justify-center hover:bg-[#F6F9F8]"
                      >
                        <Trash2 className="w-4 h-4 text-[#9A3412]" aria-hidden="true" />
                        <span className="sr-only">{draft.title} 목표 빼기</span>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ② 목표 금액 */}
        {step.id === "amount" && (
          <div className="space-y-4">
            {drafts.map((draft) => {
              const template = findGoalTemplate(draft.templateId);
              return (
                <div key={draft.id} className="rounded-2xl border border-[#DCE7E4] bg-white p-4">
                  <MoneyField
                    id={`amount-${draft.id}`}
                    label={draft.title}
                    value={draft.targetAmount}
                    onChange={(value) => update(draft.id, { targetAmount: value })}
                    hint={template?.amountHint}
                    invalid={issueFor.has(draft.id)}
                  />
                </div>
              );
            })}
          </div>
        )}

        {/* ③ 목표 기한 */}
        {step.id === "deadline" && (
          <div className="space-y-4">
            {drafts.map((draft) => (
              <fieldset key={draft.id} className="rounded-2xl border border-[#DCE7E4] bg-white p-4">
                <legend className="text-sm font-bold text-[#142B29] px-1 break-keep">{draft.title}</legend>
                <p className="text-xs text-[#526562] leading-relaxed tabular-nums">
                  목표 금액 {won(draft.targetAmount)}
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {MONTH_CHOICES.map((choice) => {
                    const selected = draft.targetMonths === choice;
                    return (
                      <button
                        key={choice}
                        type="button"
                        onClick={() => update(draft.id, { targetMonths: choice })}
                        aria-pressed={selected}
                        className={`min-h-[44px] px-4 rounded-2xl border text-sm font-bold ${
                          selected ? "border-[#00C4A6] bg-[#EAFBF6] text-[#006B5B]" : "border-[#DCE7E4] bg-white text-[#142B29]"
                        }`}
                      >
                        {choice}개월
                      </button>
                    );
                  })}
                </div>
                <div className="mt-3 flex items-center gap-2">
                  <label htmlFor={`months-${draft.id}`} className="text-xs font-bold text-[#526562]">
                    직접 입력
                  </label>
                  <input
                    id={`months-${draft.id}`}
                    type="number"
                    inputMode="numeric"
                    min={GOAL_DESIGN_LIMITS.minTargetMonths}
                    max={GOAL_DESIGN_LIMITS.maxTargetMonths}
                    value={draft.targetMonths}
                    onChange={(event) => update(draft.id, { targetMonths: Number(event.target.value) })}
                    className="w-24 min-h-[44px] px-3 rounded-2xl border border-[#758782] bg-white text-right text-sm font-bold tabular-nums text-[#142B29]"
                  />
                  <span className="text-sm font-bold text-[#526562]">개월</span>
                </div>
              </fieldset>
            ))}
          </div>
        )}

        {/* ④ 지금까지 모은 금액 */}
        {step.id === "current" && (
          <div className="space-y-4">
            <Callout tone="muted">
              가상 계좌에 이미 들어 있는 금액을 시작값으로 채웠습니다. 다르면 고칠 수 있습니다.
            </Callout>
            {drafts.map((draft) => (
              <div key={draft.id} className="rounded-2xl border border-[#DCE7E4] bg-white p-4">
                <MoneyField
                  id={`current-${draft.id}`}
                  label={draft.title}
                  value={draft.currentAmount}
                  onChange={(value) => update(draft.id, { currentAmount: value })}
                  hint={`목표 금액 ${won(draft.targetAmount)} · 남는 금액 ${won(Math.max(0, draft.targetAmount - draft.currentAmount))}`}
                  invalid={draft.currentAmount > draft.targetAmount}
                />
              </div>
            ))}
          </div>
        )}

        {/* ⑤ 우선순위 */}
        {step.id === "priority" && (
          <ol className="space-y-2">
            {drafts.map((draft, index) => (
              <li key={draft.id} className="rounded-2xl border border-[#DCE7E4] bg-white p-4">
                <div className="flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-[#EAFBF6] border border-[#B6E7DA] text-[#006B5B] font-extrabold text-sm inline-flex items-center justify-center tabular-nums shrink-0">
                    {index + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold text-[#142B29] break-keep">{draft.title}</p>
                    <p className="text-xs text-[#526562] mt-0.5 tabular-nums">
                      {GOAL_CATEGORY_LABEL[draft.category]} · {won(draft.targetAmount)} · {months(draft.targetMonths)}
                    </p>
                  </div>
                  <span className="flex flex-col gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => move(index, -1)}
                      disabled={index === 0}
                      className="min-h-[36px] min-w-[44px] rounded-xl border border-[#DCE7E4] inline-flex items-center justify-center disabled:opacity-40 hover:bg-[#F6F9F8]"
                    >
                      <ChevronUp className="w-4 h-4" aria-hidden="true" />
                      <span className="sr-only">{draft.title} 순서 올리기</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => move(index, 1)}
                      disabled={index === drafts.length - 1}
                      className="min-h-[36px] min-w-[44px] rounded-xl border border-[#DCE7E4] inline-flex items-center justify-center disabled:opacity-40 hover:bg-[#F6F9F8]"
                    >
                      <ChevronDown className="w-4 h-4" aria-hidden="true" />
                      <span className="sr-only">{draft.title} 순서 내리기</span>
                    </button>
                  </span>
                </div>
              </li>
            ))}
            <li>
              <Callout tone="muted" className="mt-1">
                비상자금과 정부 지원 상품은 같은 순서 안에서 먼저 채웁니다. 나머지 목표는 위에서 정한 순서대로
                남은 저축 여력을 나눕니다.
              </Callout>
            </li>
          </ol>
        )}

        {/* ⑥ 모으는 방식 */}
        {step.id === "method" && (
          <fieldset disabled={pending.boundary} className="space-y-2">
            <legend className="sr-only">모으는 방식 선택</legend>
            {BOUNDARY_ORDER.map((id) => {
              const selected = boundaryId === id;
              return (
                <label
                  key={id}
                  className={`block rounded-2xl border p-4 cursor-pointer ${
                    selected ? "border-[#00C4A6] bg-[#EAFBF6]" : "border-[#DCE7E4] bg-white hover:bg-[#F6F9F8]"
                  } ${pending.boundary ? "opacity-70 cursor-not-allowed" : ""}`}
                >
                  <span className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="design-boundary"
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
                  <span className="block text-xs text-[#7A8B88] mt-1 leading-relaxed break-keep">
                    {BOUNDARY_LABEL[id].detail}
                  </span>
                </label>
              );
            })}
          </fieldset>
        )}

        {/* ⑦ 계획 미리보기 */}
        {step.id === "preview" &&
          (pending["goal-preview"] || !planPreview ? (
            <LoadingBlock label="입력한 목표로 계획을 계산하는 중입니다." rows={4} />
          ) : (
            <div className="space-y-4">
              <section className="rounded-3xl border border-[#B6E7DA] bg-[#EAFBF6] p-5">
                <p className="inline-flex items-center gap-1.5 text-xs font-extrabold text-[#006B5B]">
                  <Sparkles className="w-4 h-4" aria-hidden="true" />내가 만든 계획
                </p>
                <h2 className="text-xl font-extrabold text-[#0B2724] mt-2 leading-snug break-keep">
                  매달 {won(planPreview.totalMonthlyAmount)}을 {planPreview.allocations.length}개 목표에 나눠 모읍니다.
                </h2>
                <p className="text-sm text-[#006B5B] mt-2 leading-relaxed break-keep">
                  {planPreview.isFeasible
                    ? "지금 입력한 금액과 기한이면 모든 목표를 기한 안에 모을 수 있습니다."
                    : "기한 안에 모으기 어려운 목표가 있습니다. 금액이나 기한을 바꿔 다시 볼 수 있습니다."}
                </p>
                <p className="text-xs text-[#006B5B]/90 mt-2 tabular-nums">
                  저축 여력 {won(planPreview.availableSurplus)} 중 목표에 배분하지 않은 잔액은
                  {" "}{won(planPreview.unallocatedAmount)}입니다.
                </p>
              </section>

              <ul className="space-y-2">
                {planPreview.allocations.map((allocation, index) => (
                  <li key={allocation.goalId} className="rounded-2xl border border-[#DCE7E4] bg-white p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#006B5B]">{index + 1}순위</p>
                        <p className="font-extrabold text-[#142B29] break-keep">{allocation.goalTitle}</p>
                      </div>
                      <StatusChip
                        label={FEASIBILITY_LABEL[allocation.feasibility].label}
                        tone={FEASIBILITY_LABEL[allocation.feasibility].tone}
                      />
                    </div>
                    <div className="mt-2">
                      <SummaryRow label="매달 넣는 금액" value={won(allocation.monthlyAmount)} tone="strong" />
                      <SummaryRow
                        label="예상 달성 시점"
                        value={allocation.expectedCompletionMonth ? monthText(allocation.expectedCompletionMonth) : "배분 없음"}
                      />
                    </div>
                  </li>
                ))}
              </ul>

              <GoalMethodExplainer plan={planPreview} />

              {planPreview.notices.length > 0 && (
                <div className="rounded-2xl border border-[#DCE7E4] bg-white p-4">
                  <p className="text-sm font-extrabold text-[#142B29] mb-2">확인할 점</p>
                  <ul className="space-y-1.5">
                    {planPreview.notices.map((notice) => (
                      <li key={notice} className="text-sm text-[#526562] leading-relaxed break-keep">
                        · {notice}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ))}

        {error && (
          <div role="alert">
            <Callout tone="risk" title="계획을 계산하지 못했습니다">
              {error}
            </Callout>
          </div>
        )}
      </div>

      {/* 모바일에서는 하단에 고정하고 데스크톱에서는 본문 흐름에 둔다. 이 화면에는 하단 내비게이션이 없다. */}
      <div aria-hidden="true" className="md:hidden h-[120px]" />
      <div className="fixed inset-x-0 bottom-0 z-20 bg-white border-t border-[#DCE7E4] px-4 pt-3 pb-[calc(12px+env(safe-area-inset-bottom))] md:static md:border-0 md:bg-transparent md:px-4 md:pb-10">
        <div className="max-w-[560px] mx-auto space-y-2">
          <div className="flex gap-2">
            {stepIndex > 0 && (
              <ActionButton variant="ghost" onClick={goBack} icon={<ArrowLeft className="w-4 h-4" aria-hidden="true" />}>
                이전
              </ActionButton>
            )}
            {step.id === "preview" ? (
              <ActionButton
                full
                loading={pending.plan}
                disabled={!planPreview || currentPlan !== null}
                onClick={() => void startPlan()}
                icon={<Check className="w-4 h-4" aria-hidden="true" />}
              >
                이 계획으로 시작하기
              </ActionButton>
            ) : (
              <ActionButton
                full
                loading={pending["goal-preview"] || pending.boundary}
                onClick={() => void goNext()}
                icon={<ArrowRight className="w-4 h-4" aria-hidden="true" />}
              >
                다음
              </ActionButton>
            )}
          </div>
          <p className="text-[11px] text-[#526562] leading-relaxed break-keep">
            승인하기 전에는 아무것도 실행되지 않습니다. 이 체험판의 실행은 모두 모의 실행이며 실제 상품 가입이나
            자동이체 등록은 일어나지 않습니다.
          </p>
        </div>
      </div>
    </main>
  );
};
