/**
 * 2) 가상 고객 선택
 *
 * 페르소나 목록·나이·거주지·기준일은 Mock 계약(GET /personas) 결과를 그대로 표시한다.
 */

import React from "react";
import { ArrowLeft, ChevronRight, UserRound } from "lucide-react";
import { useEroomSession } from "../api/EroomSession";
import { BOUNDARY_LABEL } from "../api/labels";
import { dateText } from "../api/format";
import { ActionButton, ErrorState, LoadingBlock, Panel, StatusChip, SyntheticNotice } from "./ui/Primitives";

export const PersonaSelectView: React.FC = () => {
  const { personas, selectPersona, goToIntro, pending, error } = useEroomSession();

  return (
    <div className="max-w-[880px] mx-auto px-4 sm:px-6 py-8 space-y-5">
      <div>
        <button
          type="button"
          onClick={goToIntro}
          className="min-h-[44px] inline-flex items-center gap-1.5 text-sm font-bold text-[#526562] hover:text-[#142B29]"
        >
          <ArrowLeft className="w-4 h-4" aria-hidden="true" />
          서비스 소개로
        </button>
        <h1 className="text-2xl font-black text-[#142B29] mt-2">체험할 가상 고객을 선택하세요</h1>
        <p className="text-sm text-[#526562] mt-2 leading-relaxed">
          고객마다 소득 구조와 이번 달 변화가 다릅니다. 선택한 고객의 합성 거래로 진단부터 재설계까지 체험합니다.
        </p>
      </div>

      {error && <ErrorState message={error} />}

      {pending.personas && personas.length === 0 ? (
        <LoadingBlock label="가상 고객 목록을 불러오는 중입니다." rows={3} />
      ) : (
        <ul className="space-y-3">
          {personas.map((persona) => (
            <li key={persona.personaId}>
              <Panel as="article" className="p-0 overflow-hidden">
                <button
                  type="button"
                  onClick={() => selectPersona(persona.personaId)}
                  className="w-full text-left p-5 min-h-[44px] flex items-start gap-4 hover:bg-[#F6F9F8]"
                >
                  <span className="w-11 h-11 rounded-2xl bg-[#EAFBF6] border border-[#B6E7DA] text-[#006B5B] inline-flex items-center justify-center shrink-0">
                    <UserRound className="w-5 h-5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex flex-wrap items-center gap-2">
                      <span className="font-extrabold text-[#142B29]">{persona.title}</span>
                      <StatusChip label={BOUNDARY_LABEL[persona.boundaryId].label} tone="neutral" />
                      {persona.personaId === "EX24" && <StatusChip label="최종기획서 예시" tone="muted" />}
                    </span>
                    <span className="block text-sm text-[#526562] mt-1.5 leading-relaxed break-keep">
                      {persona.summary}
                    </span>
                    <span className="block text-xs text-[#7A8B88] mt-2 tabular-nums">
                      {persona.customerName} · 만 {persona.age}세 · {persona.residence ?? "거주지 확인 필요"} · 데이터 기준일{" "}
                      {dateText(persona.asOf)}
                    </span>
                  </span>
                  <ChevronRight className="w-5 h-5 text-[#8FA6A1] shrink-0 mt-3" aria-hidden="true" />
                </button>
              </Panel>
            </li>
          ))}
        </ul>
      )}

      {!pending.personas && personas.length === 0 && !error && (
        <Panel className="p-5">
          <ErrorState message="가상 고객 목록이 비어 있습니다." onRetry={() => window.location.reload()} retryLabel="새로고침" />
        </Panel>
      )}

      <Panel className="p-4">
        <SyntheticNotice />
      </Panel>

      <div className="md:hidden">
        <ActionButton variant="ghost" full onClick={goToIntro}>
          서비스 소개 다시 보기
        </ActionButton>
      </div>
    </div>
  );
};
