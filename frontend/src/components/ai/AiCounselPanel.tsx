/**
 * AI 상담 패널
 *
 * 자유로운 투자 상담이 아니라 현재 내 상태와 서비스 결과를 묻는 기능이다.
 * 답변은 서버가 검증된 계산 결과와 검수된 근거로만 만들고, 화면은 출처와 기준일을 함께 표시한다.
 * 위험 신호가 있으면 상담사 연결 안내를 함께 보여준다.
 */

import React, { useCallback, useState } from "react";
import { PhoneCall, RefreshCw, Send } from "lucide-react";
import { dateText } from "../../api/format";
import { AI_SOURCE_LABEL } from "../../api/labels";
import { requestCounsel } from "../../data/aiClient";
import { buildCounselRequest } from "../../data/aiInputs";
import type { CounselResponse } from "../../data/aiContracts";
import { ActionButton, Callout, LoadingBlock, StatusChip } from "../ui/Primitives";
import { useAiSessionInput } from "./AiExplanationPanel";

/** 이 서비스가 답할 수 있는 질문 범위를 그대로 보여주는 예시 */
const PRESET_QUESTIONS = [
  "왜 이번 달 납입액이 달라졌나요?",
  "어떤 목표가 영향을 받았나요?",
  "이 계획을 거절하면 어떻게 되나요?",
  "확인할 수 있는 청년 정책은 무엇인가요?",
  "상담사 연결이 필요한 이유는 무엇인가요?",
];

const MAX_QUESTION_LENGTH = 300;

export const AiCounselPanel: React.FC = () => {
  const session = useAiSessionInput();
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState<string | null>(null);
  const [answer, setAnswer] = useState<CounselResponse | null>(null);
  const [loading, setLoading] = useState(false);

  const ask = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!session || trimmed.length === 0 || loading) return;
      setLoading(true);
      setAsked(trimmed);
      try {
        const result = await requestCounsel(buildCounselRequest(session, trimmed));
        setAnswer(result);
      } finally {
        setLoading(false);
      }
    },
    [session, loading],
  );

  if (!session) {
    return (
      <Callout tone="muted">
        고객을 선택하고 재무진단을 마치면 현재 상태에 대해 질문하실 수 있습니다.
      </Callout>
    );
  }

  const asOf = session.review?.currentAsOf ?? session.diagnosis.asOf;

  return (
    <div>
      <p className="text-sm text-[#526562] leading-relaxed break-keep">
        지금 내 재무 상태와 이번 달 계산 결과에 대해 물어보실 수 있습니다. 확인된 내용만 답하고, 근거가 없으면 없다고
        알려드립니다.
      </p>

      <ul className="mt-3 flex flex-wrap gap-2">
        {PRESET_QUESTIONS.map((preset) => (
          <li key={preset}>
            <button
              type="button"
              disabled={loading}
              onClick={() => void ask(preset)}
              className="min-h-[44px] px-3 py-2 rounded-2xl border border-[#DCE7E4] text-[13px] font-bold text-[#142B29] text-left break-keep hover:bg-[#EAFBF6] disabled:opacity-55"
            >
              {preset}
            </button>
          </li>
        ))}
      </ul>

      <form
        className="mt-3 flex flex-col sm:flex-row gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          void ask(question);
        }}
      >
        <label className="sr-only" htmlFor="ai-counsel-question">
          질문 입력
        </label>
        <input
          id="ai-counsel-question"
          type="text"
          value={question}
          maxLength={MAX_QUESTION_LENGTH}
          onChange={(event) => setQuestion(event.target.value)}
          placeholder="궁금한 내용을 입력해 주세요"
          className="flex-1 min-h-[44px] px-4 rounded-2xl border border-[#DCE7E4] text-sm text-[#142B29] placeholder:text-[#8FA6A1] focus-visible:outline-2 focus-visible:outline-[#00C4A6]"
        />
        <ActionButton
          type="submit"
          loading={loading}
          disabled={question.trim().length === 0}
          icon={<Send className="w-4 h-4" aria-hidden="true" />}
        >
          질문하기
        </ActionButton>
      </form>

      <div className="mt-4" aria-live="polite" aria-busy={loading}>
        {loading && <LoadingBlock label="답변을 준비하고 있습니다." rows={2} />}

        {!loading && answer && (
          <div className="rounded-2xl border border-[#DCE7E4] bg-white p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <p className="text-sm font-extrabold text-[#142B29] break-keep">{asked}</p>
              <StatusChip
                label={AI_SOURCE_LABEL[answer.metadata.source].label}
                tone={AI_SOURCE_LABEL[answer.metadata.source].tone}
              />
            </div>

            <p className="mt-2 text-sm text-[#142B29] leading-relaxed break-keep">{answer.answer}</p>

            {answer.keyPoints.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {answer.keyPoints.map((point) => (
                  <li key={point} className="text-sm text-[#526562] leading-relaxed break-keep">
                    · {point}
                  </li>
                ))}
              </ul>
            )}

            {answer.suggestedActions.length > 0 && (
              <div className="mt-3 pt-3 border-t border-[#EDF3F1]">
                <p className="text-xs font-bold text-[#526562] mb-1">이렇게 해 보세요</p>
                <ul className="space-y-1.5">
                  {answer.suggestedActions.map((action) => (
                    <li key={action} className="text-sm text-[#142B29] leading-relaxed break-keep">
                      · {action}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {answer.escalation.required && (
              <Callout
                tone="risk"
                title="상담사 연결이 필요해요"
                icon={<PhoneCall className="w-4 h-4" aria-hidden="true" />}
                className="mt-3"
              >
                {answer.escalation.reason ?? "위험 신호가 있어 상담사 확인이 필요합니다."}
              </Callout>
            )}

            {answer.citations.length > 0 && (
              <div className="mt-3 pt-3 border-t border-[#EDF3F1]">
                <p className="text-xs font-bold text-[#526562] mb-1">근거와 기준일</p>
                <ul className="space-y-1">
                  {answer.citations.map((citation) => (
                    <li key={`${citation.title}-${citation.asOf ?? ""}`} className="text-[11px] text-[#526562] leading-relaxed break-keep">
                      {citation.title} · 기준일 {dateText(citation.asOf)}
                      {citation.sourceUrl && (
                        <>
                          {" · "}
                          <a
                            href={citation.sourceUrl}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="underline text-[#006B5B]"
                          >
                            출처 보기
                          </a>
                        </>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="mt-3 pt-3 border-t border-[#EDF3F1] space-y-1">
              <p className="text-[11px] text-[#526562] leading-relaxed break-keep">
                {AI_SOURCE_LABEL[answer.metadata.source].help} · 데이터 기준일 {dateText(asOf)}
              </p>
              <p className="text-[11px] text-[#526562] leading-relaxed break-keep">{answer.metadata.disclaimer}</p>
            </div>

            <div className="mt-3">
              <ActionButton
                variant="ghost"
                onClick={() => asked && void ask(asked)}
                icon={<RefreshCw className="w-4 h-4" aria-hidden="true" />}
              >
                답변 다시 받기
              </ActionButton>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
