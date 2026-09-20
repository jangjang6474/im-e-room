/**
 * 다음 달로 넘어가는 과정을 보여주는 블록
 *
 * 점검 버튼 한 번에 여러 일이 한꺼번에 일어나면 무엇 때문에 계획이 바뀌었는지 알기 어렵다.
 * 그래서 "다음 달 수집 → 지난달과 비교 → 달라진 점 찾기 → 조정안 만들기"를 네 단계로 나눠 보여주고,
 * 실행 전에는 앞으로 할 일, 실행 뒤에는 실제로 처리한 건수를 같은 자리에서 알린다.
 *
 * 건수·기간·분류는 모두 점검 응답 값이다. 이 화면에서 다시 계산하지 않는다.
 */

import React from "react";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { dateText, dateTimeText, monthText } from "../api/format";
import { ROUTING_LABEL } from "../api/labels";
import type { MonthlyReviewResponse } from "../data/apiContracts";
import { StatusChip } from "./ui/Primitives";

/** 2026-09-20 → 2026-09 */
const monthKey = (value: string) => value.slice(0, 7);

const MonthPill: React.FC<{ label: string; caption: string; state: "done" | "pending" }> = ({
  label,
  caption,
  state,
}) => (
  <div
    className={`flex-1 min-w-0 rounded-2xl border px-3 py-3 text-center ${
      state === "done" ? "border-[#B6E7DA] bg-[#EAFBF6]" : "border-dashed border-[#B9C9C5] bg-white"
    }`}
  >
    <p
      className={`text-sm font-extrabold tabular-nums break-keep ${
        state === "done" ? "text-[#006B5B]" : "text-[#526562]"
      }`}
    >
      {label}
    </p>
    <p className="text-[11px] text-[#526562] mt-1 leading-relaxed break-keep">{caption}</p>
  </div>
);

export const MonthTransitionPanel: React.FC<{
  review: MonthlyReviewResponse | null;
  asOf: string;
  isRunning: boolean;
  className?: string;
}> = ({ review, asOf, isRunning, className = "" }) => {
  const done = review !== null;

  const steps = [
    {
      title: "다음 달 거래를 수집합니다",
      before: "동의한 범위의 가상 거래를 한 달치 더 가져옵니다.",
      after: review
        ? `${dateText(review.currentAsOf)}까지 거래 ${review.currentWindow.transactionCount}건을 수집했습니다.`
        : "",
    },
    {
      title: "지난달과 나란히 비교합니다",
      before: "소득·고정 지출·변동 지출·부채 상환·저축 여력을 같은 기준으로 다시 계산합니다.",
      after: review
        ? `월평균에 사용한 달 ${review.currentWindow.monthsUsed}개월 기준으로 지표를 다시 계산했습니다.`
        : "",
    },
    {
      title: "달라진 점을 찾습니다",
      before: "급여 인상, 소득 감소, 지출 급증처럼 계획을 바꿀 만한 변화를 찾습니다.",
      after: review
        ? review.events.length > 0
          ? `변화 ${review.events.length}건을 찾았습니다.`
          : "계획을 바꿀 만한 변화를 찾지 못했습니다."
        : "",
    },
    {
      title: "필요하면 조정안을 만듭니다",
      before: "변화가 있으면 조정안을 만들고, 없으면 기존 계획을 그대로 둡니다.",
      after: review
        ? review.proposedPlan
          ? `조정안 v${review.proposedPlan.version}을 만들었습니다. 승인 전까지 기존 계획이 유지됩니다.`
          : "바꿀 만한 변화가 없어 기존 계획을 그대로 둡니다."
        : "",
    },
  ];

  return (
    <div className={`rounded-2xl border border-[#DCE7E4] bg-white p-4 ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-extrabold text-[#142B29] break-keep">
          {done ? "이번 달 점검에서 일어난 일" : "다음 달로 넘어가면 이렇게 진행됩니다"}
        </p>
        {done && <StatusChip label={ROUTING_LABEL[review.routing].title} tone={ROUTING_LABEL[review.routing].tone} />}
      </div>

      {/* 어느 달에서 어느 달로 넘어가는지 */}
      <div className="mt-3 flex items-stretch gap-2">
        <MonthPill
          label={monthText(monthKey(review?.previousAsOf ?? asOf))}
          caption={`기준일 ${dateText(review?.previousAsOf ?? asOf)}`}
          state="done"
        />
        <div className="flex items-center shrink-0" aria-hidden="true">
          <ArrowRight className="w-5 h-5 text-[#8FA6A1]" />
        </div>
        <MonthPill
          label={done ? monthText(monthKey(review.currentAsOf)) : "다음 달"}
          caption={done ? `기준일 ${dateText(review.currentAsOf)}` : "아직 수집 전"}
          state={done ? "done" : "pending"}
        />
      </div>

      <ol className="mt-4 space-y-3">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <span
              className={`w-7 h-7 rounded-full inline-flex items-center justify-center border shrink-0 ${
                done
                  ? "bg-[#EAFBF6] border-[#B6E7DA] text-[#006B5B]"
                  : "bg-[#F6F9F8] border-[#DCE7E4] text-[#8FA6A1]"
              }`}
            >
              {done ? (
                <Check className="w-4 h-4" aria-hidden="true" />
              ) : isRunning ? (
                <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
              ) : (
                <span className="text-xs font-bold tabular-nums">{index + 1}</span>
              )}
            </span>
            <span className="min-w-0">
              <span className={`block text-sm break-keep ${done ? "font-bold text-[#142B29]" : "text-[#142B29]"}`}>
                {step.title}
                <span className="sr-only">{done ? " 완료" : isRunning ? " 진행 중" : " 대기 중"}</span>
              </span>
              <span className="block text-sm text-[#526562] mt-0.5 leading-relaxed break-keep tabular-nums">
                {done ? step.after : step.before}
              </span>
            </span>
          </li>
        ))}
      </ol>

      {done && (
        <p className="text-[11px] text-[#526562] mt-3 leading-relaxed tabular-nums">
          다음 점검 예정 {dateTimeText(review.nextCollectionAt)} · 수집은 처음 동의한 날을 기준으로 매월 1회입니다.
        </p>
      )}
    </div>
  );
};
