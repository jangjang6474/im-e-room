/**
 * AI 가이드
 *
 * 외부 API 키 없이 동작해야 하므로 생성형 모델을 호출하지 않는다.
 * 백엔드가 이미 계산한 근거(전제·공지·판정 사유·이벤트 메시지)를 그대로 모아 설명한다.
 * 화면에서 새로운 수치를 만들지 않으며, 근거가 없으면 없다고 표시한다.
 */

import React, { useEffect, useRef, useState } from "react";
import { MessageCircleQuestion, X } from "lucide-react";
import { useEroomSession } from "../api/EroomSession";
import { won } from "../api/format";
import { ELIGIBILITY_LABEL } from "../api/labels";
import { Callout, StatusChip } from "./ui/Primitives";

interface GuideTopic {
  id: string;
  question: string;
  lines: string[];
}

export const AiAssistantModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({ isOpen, onClose }) => {
  const { diagnosis, eligibility, currentPlan, planPreview, review } = useEroomSession();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [openTopic, setOpenTopic] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    dialogRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const plan = currentPlan ?? planPreview;
  const topics: GuideTopic[] = [];

  if (plan) {
    topics.push({
      id: "plan",
      question: "이번 계획은 어떤 기준으로 나왔나요?",
      lines: [
        `월 저축 여력 ${won(plan.availableSurplus)} 중 ${won(plan.totalMonthlyAmount)}을 목표에 배분하고 ${won(plan.unallocatedAmount)}은 남겼습니다.`,
        ...plan.assumptions,
        ...plan.notices,
      ],
    });
    topics.push({
      id: "goals",
      question: "목표별 납입액은 왜 이렇게 정해졌나요?",
      lines: plan.allocations.flatMap((allocation) => [
        `${allocation.goalTitle}: 월 ${won(allocation.monthlyAmount)}`,
        ...allocation.reasons.map((reason) => `  · ${reason}`),
      ]),
    });
  }

  if (diagnosis) {
    topics.push({
      id: "window",
      question: "어떤 거래를 근거로 진단했나요?",
      lines: [
        `분석 기간 ${diagnosis.window.startAt ?? "확인 필요"} ~ ${diagnosis.window.endAt ?? "확인 필요"}, 거래 ${diagnosis.window.transactionCount}건`,
        `월평균 계산에 사용한 달 ${diagnosis.window.monthsUsed}개월 / 전체 ${diagnosis.window.monthsCovered}개월`,
        ...diagnosis.window.notes,
      ],
    });
    if (diagnosis.leakageCandidates.length > 0) {
      topics.push({
        id: "leakage",
        question: "새는 돈 후보는 어떻게 찾았나요?",
        lines: diagnosis.leakageCandidates.map(
          (candidate) => `${candidate.title} (월 ${won(candidate.estimatedMonthlyCost)}): ${candidate.reason}`,
        ),
      });
    }
  }

  if (eligibility) {
    const needsVerification = eligibility.results.filter((item) => item.status === "NEEDS_VERIFICATION");
    topics.push({
      id: "eligibility",
      question: `왜 어떤 제도는 ‘${ELIGIBILITY_LABEL.NEEDS_VERIFICATION.label}’인가요?`,
      lines:
        needsVerification.length > 0
          ? needsVerification.map(
              (item) =>
                `${item.policyName}: ${item.criteria
                  .filter((criterion) => criterion.status === "UNKNOWN")
                  .map((criterion) => `${criterion.required} 확인 필요`)
                  .join(", ") || item.reason}`,
            )
          : ["현재 확인이 더 필요한 제도는 없습니다."],
    });
  }

  if (review) {
    topics.push({
      id: "review",
      question: "이번 달에는 무엇이 달라졌나요?",
      lines: review.events.map((event) => `${event.title}: ${event.message}`),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#0B2724]/40 p-0 sm:p-4">
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-guide-title"
        tabIndex={-1}
        className="bg-white w-full sm:max-w-[560px] max-h-[86vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-[#DCE7E4] p-5 pb-[calc(20px+env(safe-area-inset-bottom))]"
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 id="ai-guide-title" className="text-lg font-extrabold text-[#142B29] flex items-center gap-2">
              <MessageCircleQuestion className="w-5 h-5 text-[#006B5B]" aria-hidden="true" />
              AI 가이드
            </h2>
            <p className="text-xs text-[#526562] mt-1 leading-relaxed">
              계산 결과의 근거를 그대로 보여 줍니다. 이 화면은 외부 생성형 모델을 호출하지 않습니다.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-2xl border border-[#DCE7E4] inline-flex items-center justify-center hover:bg-[#F6F9F8]"
          >
            <X className="w-5 h-5" aria-hidden="true" />
            <span className="sr-only">AI 가이드 닫기</span>
          </button>
        </div>

        <div className="mt-3">
          <StatusChip label="규칙 기반 설명" tone="neutral" />
        </div>

        {topics.length === 0 ? (
          <Callout tone="muted" className="mt-4">
            아직 설명할 데이터가 없습니다. 고객을 선택하고 재무진단을 실행하면 계산 근거를 보여 드립니다.
          </Callout>
        ) : (
          <ul className="mt-4 space-y-2">
            {topics.map((topic) => {
              const expanded = openTopic === topic.id;
              return (
                <li key={topic.id} className="rounded-2xl border border-[#DCE7E4]">
                  <button
                    type="button"
                    onClick={() => setOpenTopic(expanded ? null : topic.id)}
                    aria-expanded={expanded}
                    className="w-full text-left min-h-[52px] px-4 py-3 font-bold text-sm text-[#142B29] hover:bg-[#F6F9F8] rounded-2xl"
                  >
                    {topic.question}
                  </button>
                  {expanded && (
                    <div className="px-4 pb-4">
                      {topic.lines.length === 0 ? (
                        <p className="text-sm text-[#526562]">표시할 근거가 없습니다.</p>
                      ) : (
                        <ul className="space-y-1.5">
                          {topic.lines.map((line, index) => (
                            <li key={`${topic.id}-${index}`} className="text-sm text-[#526562] leading-relaxed break-keep">
                              {line}
                            </li>
                          ))}
                        </ul>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
