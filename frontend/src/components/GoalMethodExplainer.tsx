/**
 * 목표를 어떻게 달성하는지 설명하는 블록
 *
 * "계획을 만들었습니다"로 끝내지 않고, 매달 무슨 일이 일어나 목표가 채워지는지 네 단계로 보여준다.
 * 모든 금액·기간은 계획 응답에서 읽은 값이며 이 화면에서 다시 계산하지 않는다.
 *
 * 강조 카드를 쓰지 않는다. 한 화면의 주요 강조 카드는 결론형 상태 카드 하나라는 규칙을 지킨다.
 */

import React from "react";
import { CalendarCheck, Coins, ListOrdered, ShieldCheck } from "lucide-react";
import { monthText, months, won } from "../api/format";
import type { PlanProposal } from "../data/apiContracts";

const ICON_CLASS = "w-4 h-4 text-[#006B5B]";

export const GoalMethodExplainer: React.FC<{ plan: PlanProposal; className?: string }> = ({ plan, className = "" }) => {
  const firstGoal = plan.allocations.find((item) => item.monthlyAmount > 0) ?? plan.allocations[0] ?? null;
  const blockedCount = plan.allocations.filter((item) => item.feasibility === "BLOCKED").length;

  const steps = [
    {
      icon: <Coins className={ICON_CLASS} aria-hidden="true" />,
      title: "매달 쓰고 남는 돈을 먼저 계산합니다",
      body: `들어온 돈에서 고정·변동·비정기 지출과 빚 갚는 돈을 뺀 ${won(plan.availableSurplus)}이 매달 저축에 쓸 수 있는 돈입니다.`,
    },
    {
      icon: <ListOrdered className={ICON_CLASS} aria-hidden="true" />,
      title: "정한 순서대로 목표에 나눕니다",
      body: `이 여력 중 ${won(plan.totalMonthlyAmount)}을 목표에 나누고, 남은 ${won(
        plan.unallocatedAmount,
      )}은 목표에 배분하지 않은 잔액으로 둡니다.`,
    },
    {
      icon: <ShieldCheck className={ICON_CLASS} aria-hidden="true" />,
      title: "상품 한도와 자격을 확인해 금액을 맞춥니다",
      body:
        blockedCount > 0
          ? `상품마다 매달 넣을 수 있는 한도가 있습니다. 자격이 확인되지 않은 제도에는 자동으로 넣지 않아 지금은 ${blockedCount}개 목표에 배분하지 않았습니다.`
          : "상품마다 매달 넣을 수 있는 한도가 있어 한도를 넘지 않게 맞췄습니다. 자격이 확인되지 않은 제도에는 자동으로 넣지 않습니다.",
    },
    {
      icon: <CalendarCheck className={ICON_CLASS} aria-hidden="true" />,
      title: "매달 다시 점검해 필요하면 조정합니다",
      body: firstGoal
        ? `이대로 넣으면 ${firstGoal.goalTitle}은 ${
            firstGoal.expectedMonths === null ? "배분이 없어 달성 시점을 계산할 수 없습니다" : `${months(firstGoal.expectedMonths)} 뒤인 ${monthText(firstGoal.expectedCompletionMonth)}에 채워집니다`
          }. 소득이나 지출이 달라지면 다음 달 점검에서 조정안을 만들어 확인을 받습니다.`
        : "소득이나 지출이 달라지면 다음 달 점검에서 조정안을 만들어 확인을 받습니다.",
    },
  ];

  return (
    <div className={`rounded-2xl border border-[#DCE7E4] bg-white p-4 ${className}`}>
      <p className="text-sm font-extrabold text-[#142B29] break-keep">이 목표는 이렇게 달성합니다</p>
      <ol className="mt-3 space-y-3">
        {steps.map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <span className="w-7 h-7 rounded-full bg-[#EAFBF6] border border-[#B6E7DA] text-[#006B5B] text-xs font-extrabold inline-flex items-center justify-center tabular-nums shrink-0">
              {index + 1}
            </span>
            <span className="min-w-0">
              <span className="flex items-center gap-1.5 font-bold text-[#142B29] text-sm break-keep">
                {step.icon}
                {step.title}
              </span>
              <span className="block text-sm text-[#526562] mt-1 leading-relaxed break-keep tabular-nums">
                {step.body}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
};
