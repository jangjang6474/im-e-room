/**
 * AI 설명 패널
 *
 * 이번 달 점검 결과를 쉬운 문장으로 보여준다. 문장은 서버가 만들고 화면은 그대로 표시한다.
 * 금액은 계산 결과를 옮긴 값이며 이 화면에서 다시 계산하지 않는다.
 *
 * 표시 상태: 준비 중 / Claude 설명 / 미리 준비된 설명 / 규칙 기반 설명 / 상담사 연결 안내.
 * 서버 오류나 설정 문제는 고객 화면에 그대로 쓰지 않고 "설명을 불러오지 못했습니다"로만 알린다.
 */

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { MessageSquareText, PhoneCall, RefreshCw, Sparkles } from "lucide-react";
import { useEroomSession } from "../../api/EroomSession";
import { dateText } from "../../api/format";
import { AI_SOURCE_LABEL } from "../../api/labels";
import { requestExplanation } from "../../data/aiClient";
import { buildExplainRequest, type AiSessionInput } from "../../data/aiInputs";
import type { ExplainResponse } from "../../data/aiContracts";
import { ActionButton, Callout, LoadingBlock, Section, StatusChip } from "../ui/Primitives";

/** 화면 상태에서 AI 요청에 쓸 조각만 모은다. 진단 결과가 없으면 설명할 것도 없다. */
export function useAiSessionInput(): AiSessionInput | null {
  const { personaId, diagnosis, eligibility, review, currentPlan, planPreview, consultation } = useEroomSession();
  return useMemo(() => {
    if (!personaId || !diagnosis) return null;
    return {
      personaId,
      diagnosis,
      eligibility,
      review,
      currentPlan: currentPlan ?? planPreview,
      consultation,
    };
  }, [personaId, diagnosis, eligibility, review, currentPlan, planPreview, consultation]);
}

type PanelStatus = "idle" | "loading" | "ready";

export const AiSourceNotice: React.FC<{ source: ExplainResponse["metadata"]; asOf: string }> = ({ source, asOf }) => {
  const label = AI_SOURCE_LABEL[source.source];
  return (
    <div className="mt-4 pt-3 border-t border-[#EDF3F1] space-y-1">
      <p className="text-[11px] text-[#526562] leading-relaxed break-keep">
        {label.help} · 데이터 기준일 {dateText(asOf)}
      </p>
      <p className="text-[11px] text-[#526562] leading-relaxed break-keep">{source.disclaimer}</p>
    </div>
  );
};

export const AiExplanationPanel: React.FC<{ title?: string; description?: string }> = ({
  title = "이번 결과를 쉽게 설명해 드릴게요",
  description = "계산 결과를 바탕으로 무엇이 달라졌고 무엇을 확인하면 되는지 정리했습니다.",
}) => {
  const session = useAiSessionInput();
  const [status, setStatus] = useState<PanelStatus>("idle");
  const [explanation, setExplanation] = useState<ExplainResponse | null>(null);
  const [reloadToken, setReloadToken] = useState(0);

  /** 같은 상태에서 요청이 반복되지 않도록 요청 본문 자체를 의존성으로 쓴다. */
  const requestBody = useMemo(() => (session ? JSON.stringify(buildExplainRequest(session)) : null), [session]);

  useEffect(() => {
    if (!requestBody) {
      setStatus("idle");
      setExplanation(null);
      return;
    }
    let cancelled = false;
    setStatus("loading");
    void requestExplanation(JSON.parse(requestBody)).then((result) => {
      if (cancelled) return;
      setExplanation(result);
      setStatus("ready");
    });
    return () => {
      cancelled = true;
    };
  }, [requestBody, reloadToken]);

  const retry = useCallback(() => setReloadToken((token) => token + 1), []);

  if (!session) return null;

  const asOf = session.review?.currentAsOf ?? session.diagnosis.asOf;
  const needsConsultation =
    session.consultation !== null || (session.review?.overallType ?? "INFO") === "RISK";

  return (
    <Section
      id="ai-explanation"
      title={title}
      description={description}
      action={
        explanation ? (
          <StatusChip
            label={AI_SOURCE_LABEL[explanation.metadata.source].label}
            tone={AI_SOURCE_LABEL[explanation.metadata.source].tone}
          />
        ) : undefined
      }
    >
      <div className="rounded-2xl border border-[#DCE7E4] bg-white p-4" aria-live="polite" aria-busy={status === "loading"}>
        {status === "loading" && <LoadingBlock label="설명을 준비하고 있습니다." rows={2} />}

        {status === "ready" && explanation && (
          <>
            <p className="text-base font-extrabold text-[#142B29] leading-snug break-keep flex items-start gap-2">
              <Sparkles className="w-4 h-4 mt-1 shrink-0 text-[#006B5B]" aria-hidden="true" />
              <span>{explanation.headline}</span>
            </p>

            <dl className="mt-3 space-y-3">
              <div>
                <dt className="text-xs font-bold text-[#526562]">왜 이렇게 됐나요</dt>
                <dd className="text-sm text-[#142B29] leading-relaxed break-keep mt-0.5">{explanation.reason}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-[#526562]">목표에 미치는 영향</dt>
                <dd className="text-sm text-[#142B29] leading-relaxed break-keep mt-0.5">{explanation.impact}</dd>
              </div>
              <div>
                <dt className="text-xs font-bold text-[#526562]">다음에 확인할 것</dt>
                <dd className="text-sm text-[#142B29] leading-relaxed break-keep mt-0.5">{explanation.nextAction}</dd>
              </div>
            </dl>

            {explanation.factsUsed.length > 0 && (
              <ul className="mt-3 pt-3 border-t border-[#EDF3F1]">
                {explanation.factsUsed.map((fact) => (
                  <li
                    key={fact.label}
                    className="flex items-baseline justify-between gap-4 py-2 border-b border-[#EDF3F1] last:border-b-0"
                  >
                    <span className="text-sm text-[#526562] break-keep">{fact.label}</span>
                    <span className="text-sm font-bold text-[#142B29] tabular-nums text-right shrink-0">
                      {fact.before && fact.before !== fact.after ? (
                        <>
                          <span className="font-normal text-[#526562]">{fact.before}</span>
                          <span aria-hidden="true"> → </span>
                          <span className="sr-only">에서</span>
                        </>
                      ) : null}
                      {fact.after}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {explanation.warnings.length > 0 && (
              <Callout tone="attention" title="함께 확인해 주세요" className="mt-3">
                <ul className="space-y-1">
                  {explanation.warnings.map((warning) => (
                    <li key={warning} className="break-keep">
                      · {warning}
                    </li>
                  ))}
                </ul>
              </Callout>
            )}

            {needsConsultation && (
              <Callout
                tone="risk"
                title="상담사 연결이 필요해요"
                icon={<PhoneCall className="w-4 h-4" aria-hidden="true" />}
                className="mt-3"
              >
                자동 설명만으로 결정하기 어려운 상황입니다. 이번 달 점검의 상담사 연결 안내를 함께 확인해 주세요.
              </Callout>
            )}

            <AiSourceNotice source={explanation.metadata} asOf={asOf} />

            <div className="mt-3">
              <ActionButton
                variant="ghost"
                onClick={retry}
                icon={<RefreshCw className="w-4 h-4" aria-hidden="true" />}
              >
                설명 다시 받기
              </ActionButton>
            </div>
          </>
        )}

        {status === "idle" && (
          <p className="text-sm text-[#526562] leading-relaxed flex items-center gap-2">
            <MessageSquareText className="w-4 h-4" aria-hidden="true" />
            설명할 데이터가 아직 없습니다.
          </p>
        )}
      </div>
    </Section>
  );
};
