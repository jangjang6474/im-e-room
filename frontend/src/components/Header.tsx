/**
 * 글로벌 상단 바
 *
 * 고객 화면에서는 내부 버전·시나리오 제어를 숨기고 `?demo=true`에서만 시연 도구를 노출한다.
 */

import React from "react";
import { RotateCcw, Sparkles, SlidersHorizontal, WifiOff } from "lucide-react";
import { useEroomSession } from "../api/EroomSession";
import { StatusChip } from "./ui/Primitives";

interface HeaderProps {
  onOpenGuide: () => void;
  onToggleDemoTool: () => void;
  isDemoToolOpen: boolean;
}

export const Header: React.FC<HeaderProps> = ({ onOpenGuide, onToggleDemoTool, isDemoToolOpen }) => {
  const { phase, persona, source, isDemoMode, resetSession } = useEroomSession();

  return (
    <header className="sticky top-0 z-30 bg-white/95 backdrop-blur border-b border-[#DCE7E4]">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 h-[64px] md:h-[72px] flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-2xl bg-[#00C4A6] text-[#0B2724] font-black flex items-center justify-center shrink-0">
            iM
          </div>
          <div className="min-w-0">
            <p className="font-extrabold text-[#142B29] leading-tight truncate">iM 이룸</p>
            <p className="text-[11px] text-[#526562] leading-tight truncate">
              {phase === "app" && persona ? `${persona.customerName} 님 (가상 고객)` : "청년 재무 목표 관리 체험판"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {source === "offline-fixture" && (
            <StatusChip label="오프라인 체험" tone="attention" className="hidden sm:inline-flex" />
          )}
          <button
            type="button"
            onClick={onOpenGuide}
            className="min-h-[44px] min-w-[44px] px-3 rounded-2xl border border-[#DCE7E4] text-[#006B5B] font-bold text-sm inline-flex items-center gap-1.5 hover:bg-[#EAFBF6]"
          >
            <Sparkles className="w-4 h-4" aria-hidden="true" />
            <span className="hidden sm:inline">AI 가이드</span>
            <span className="sr-only sm:hidden">AI 가이드 열기</span>
          </button>
          {phase === "app" && (
            <button
              type="button"
              onClick={() => void resetSession()}
              className="min-h-[44px] min-w-[44px] px-3 rounded-2xl border border-[#DCE7E4] text-[#142B29] font-bold text-sm inline-flex items-center gap-1.5 hover:bg-[#F6F9F8]"
            >
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
              className="min-h-[44px] min-w-[44px] px-3 rounded-2xl border border-[#00C4A6] text-[#006B5B] font-bold text-sm inline-flex items-center gap-1.5 hover:bg-[#EAFBF6]"
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
