/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from "react";
import { EroomProvider, useEroom } from "./context/EroomContext";
import { Header } from "./components/Header";
import { DemoControllerBanner } from "./components/DemoControllerBanner";
import { YouthView } from "./components/YouthView";
import { ConsultantView } from "./components/ConsultantView";
import { ServiceIntroView } from "./components/ServiceIntroView";
import { AiAssistantModal } from "./components/AiAssistantModal";
import { ShieldCheck, Info, Sparkles, SlidersHorizontal } from "lucide-react";

function MainContent() {
  const { viewMode, setViewMode } = useEroom();
  const [isAiModalOpen, setIsAiModalOpen] = useState(false);
  const isDemoMode = new URLSearchParams(window.location.search).get("demo") === "true";
  const [isDemoToolOpen, setIsDemoToolOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#F6F9F8] flex flex-col text-[#142B29] selection:bg-[#00C4A6]/20">
      {/* 1. 글로벌 헤더 (72px, max-w-[1200px]) */}
      <Header
        onOpenAiModal={() => setIsAiModalOpen(true)}
        onToggleDemoTool={() => setIsDemoToolOpen(!isDemoToolOpen)}
        isDemoToolOpen={isDemoToolOpen}
        isDemoMode={isDemoMode}
      />

      {/* 2. 접이식 데모 시나리오 컨트롤러 도구 */}
      {isDemoMode && (
        <DemoControllerBanner
          isOpen={isDemoToolOpen}
          onClose={() => setIsDemoToolOpen(false)}
        />
      )}

      {/* 3. 본문 메인 컨테이너 */}
      <main className="flex-1 w-full">
        {viewMode === "intro" ? (
          <ServiceIntroView />
        ) : (
          <div className="max-w-[1200px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-7">
            {viewMode === "youth" ? <YouthView /> : <ConsultantView />}
          </div>
        )}
      </main>

      {/* 4. 푸터 & 프로토타입 면책 고지 */}
      <footer className={`bg-white border-t border-[#DCE7E4] py-8 text-xs text-[#526562] ${viewMode === "youth" ? "mb-20 md:mb-0" : ""}`}>
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded-xl bg-[#00C4A6] flex items-center justify-center text-[#142B29] text-xs font-black shadow-xs">
              iM
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <span className="font-extrabold text-[#142B29]">iM 이룸 (iM E-Room)</span>
                {isDemoMode && (
                  <span className="text-[10px] px-2 py-0.2 rounded-full bg-[#EAFBF6] text-[#006B5B] font-bold border border-[#DCE7E4]">
                    시연 모드
                  </span>
                )}
              </div>
              <p className="text-[11px] text-[#526562] mt-0.5">
                상황이 바뀌어도 목표를 유지하도록 돕는 월간 적응형 재설계 엔진
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 text-[11px]">
            <span className="flex items-center text-[#526562] bg-[#F6F9F8] px-3 py-1.5 rounded-xl border border-[#DCE7E4]">
              <Info className="w-3.5 h-3.5 mr-1.5 text-[#006B5B]" />
              가상 데이터 기반 체험 · 실제 금융 거래 없음
            </span>
            {isDemoMode && <span className="font-mono text-[#526562]">DEMO MODE</span>}
          </div>
        </div>
      </footer>

      {/* 5. AI 정책 & 해설 어시스턴트 모달 */}
      <AiAssistantModal
        isOpen={isAiModalOpen}
        onClose={() => setIsAiModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <EroomProvider>
      <MainContent />
    </EroomProvider>
  );
}
