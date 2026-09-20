/**
 * 글로벌 상단 바
 *
 * 어두운 바탕에 흰색 굵은 서비스명을 두어 금융 앱의 상단 바처럼 보이게 한다.
 * 고객 화면에서는 내부 버전·시나리오 제어를 숨기고 `?demo=true`에서만 시연 도구를 노출한다.
 */

import React from "react";
import { RotateCcw, Sparkles, SlidersHorizontal, WifiOff } from "lucide-react";
import { useEroomSession } from "../api/EroomSession";
import { BrandMark } from "./ui/BrandMark";
import { StatusChip } from "./ui/Primitives";

interface HeaderProps {
  onOpenGuide: () => void;
  onToggleDemoTool: () => void;
  isDemoToolOpen: boolean;
}

/** 어두운 바탕 위의 보조 버튼. 흰색 테두리와 글자로 대비를 확보한다. */
const HEADER_BUTTON =
  "min-h-[44px] min-w-[44px] px-3 rounded-2xl border border-white/25 text-white font-bold text-sm inline-flex items-center gap-1.5 hover:bg-white/10";

export const Header: React.FC<HeaderProps> = ({ onOpenGuide, onToggleDemoTool, isDemoToolOpen }) => {
  const { phase, persona, source, isDemoMode, resetSession } = useEroomSession();

  return (
    <header className="sticky top-0 z-30 bg-[#0B2724] border-b border-[#0B2724]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 h-[64px] md:h-[72px] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <BrandMark size={36} tone="light" />
          <div className="min-w-0">
            <p className="text-white font-extrabold leading-tight truncate">iM 이룸</p>
            <p className="text-[11px] text-white/70 leading-tight truncate">
              {phase === "app" && persona ? `${persona.customerName} 님` : "청년 재무 목표 관리 체험판"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {source === "offline-fixture" && (
            <StatusChip label="오프라인 체험" tone="attention" className="hidden sm:inline-flex" />
          )}
          <button type="button" onClick={onOpenGuide} className={HEADER_BUTTON}>
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">AI 가이드</span>
            <span className="sr-only sm:hidden">AI 가이드 열기</span>
          </button>
          {phase === "app" && (
            <button type="button" onClick={() => void resetSession()} className={HEADER_BUTTON}>
              <RotateCcw className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">처음으로</span>
              <span className="sr-only sm:hidden">처음 화면으로 돌아가기</span>
            </button>
          )}
          {isDemoMode && (
            <button
              type="button"
              onClick={onToggleDemoTool}
              aria-expanded={isDemoToolOpen}
              className={`${HEADER_BUTTON} border-[#00C4A6] text-[#00C4A6]`}
            >
              <SlidersHorizontal className="w-4 h-4" aria-hidden="true" />
              <span className="hidden sm:inline">시연 도구</span>
              <span className="sr-only sm:hidden">시연 도구 열기</span>
            </button>
          )}
        </div>
      </div>

      {source === "offline-fixture" && (
        <div role="status" className="bg-[#F6FADC] border-t border-[#E3E9A8]">
          <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-2 text-xs text-[#5C5A14] flex items-start gap-2">
            <WifiOff className="w-4 h-4 mt-0.5 shrink-0" aria-hidden="true" />
            <p className="leading-relaxed">
              오프라인 체험 상태입니다. 서버에 연결하지 못해 앱에 담아 둔 가상 데이터로 화면을 구성했습니다. 체험
              흐름은 그대로 확인할 수 있습니다.
            </p>
          </div>
        </div>
      )}
    </header>
  );
};
