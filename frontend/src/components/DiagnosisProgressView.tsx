/**
 * 4) 3분 재무진단 진행 화면
 *
 * 각 단계는 실제 Mock API 응답이 도착했을 때만 완료로 표시한다. 실패하면 오류 상태를 보여주고 성공으로 덮지 않는다.
 */

import React from "react";
import { Check, Loader2 } from "lucide-react";
import { useEroomSession } from "../api/EroomSession";
import { ErrorState, Panel } from "./ui/Primitives";

const STEPS = [
  "동의 확인과 가상 계좌 연결",
  "최근 거래 수집과 중복·내부이체 정리",
  "정책 자격 판정",
  "모으는 방식과 목표별 계획 계산",
];

export const DiagnosisProgressView: React.FC = () => {
  const { loadStep, error, retryLoad, persona, goToPersonaSelect } = useEroomSession();

  return (
    <div className="max-w-[560px] mx-auto px-4 sm:px-6 py-10 space-y-4">
      <Panel className="p-6 space-y-5">
        <div>
          <h1 className="text-xl font-black text-[#142B29]">재무진단을 만들고 있습니다</h1>
          <p className="text-sm text-[#526562] mt-1.5 leading-relaxed">
            {persona ? `${persona.customerName} 님의 가상 거래를 분석하는 중입니다.` : "가상 거래를 분석하는 중입니다."}
          </p>
        </div>

        <ol className="space-y-3" aria-live="polite">
          {STEPS.map((step, index) => {
            const done = loadStep > index;
            const active = loadStep === index && !error;
            return (
              <li key={step} className="flex items-center gap-3">
                <span
                  className={`w-7 h-7 rounded-full inline-flex items-center justify-center border shrink-0 ${
                    done
                      ? "bg-[#EAFBF6] border-[#B6E7DA] text-[#006B5B]"
                      : "bg-[#F6F9F8] border-[#DCE7E4] text-[#8FA6A1]"
                  }`}
                >
                  {done ? (
                    <Check className="w-4 h-4" aria-hidden="true" />
                  ) : active ? (
                    <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
                  ) : (
                    <span className="text-xs font-bold tabular-nums">{index + 1}</span>
                  )}
                </span>
                <span className={`text-sm ${done ? "text-[#142B29] font-bold" : "text-[#526562]"}`}>
                  {step}
                  <span className="sr-only">{done ? " 완료" : active ? " 진행 중" : " 대기 중"}</span>
                </span>
              </li>
            );
          })}
        </ol>

        {error && (
          <ErrorState
            message={error}
            onRetry={() => void retryLoad()}
            retryLabel="진단 다시 시도"
          />
        )}
        {error && (
          <button
            type="button"
            onClick={goToPersonaSelect}
            className="min-h-[44px] text-sm font-bold text-[#526562] underline"
          >
            다른 고객 선택하기
          </button>
        )}
      </Panel>
    </div>
  );
};
