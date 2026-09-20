/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

/**
 * iM 이룸 고객 웹앱 진입점
 *
 * 흐름: 서비스 소개 → 가상 고객 선택 → 모의 동의 → 3분 재무진단 → 목표 설계 → 홈/목표/점검/혜택/변경 내역
 * `?example=true`는 24개월 적용 예시 대시보드, `?demo=true`는 시연 도구와 상담사 화면을 노출한다.
 */

import React, { useState } from "react";
import { EroomSessionProvider, useEroomSession } from "./api/EroomSession";
import { Header } from "./components/Header";
import { AppShell } from "./components/AppShell";
import { ServiceIntroView } from "./components/ServiceIntroView";
import { PersonaSelectView } from "./components/PersonaSelectView";
import { ConsentView } from "./components/ConsentView";
import { DiagnosisProgressView } from "./components/DiagnosisProgressView";
import { GoalDesignView } from "./components/GoalDesignView";
import { ConsultantView } from "./components/ConsultantView";
import { DemoControllerBanner } from "./components/DemoControllerBanner";
import { AiAssistantModal } from "./components/AiAssistantModal";
import { ExampleJourneyDashboard } from "./components/ExampleJourneyDashboard";
import { HomeTab } from "./components/tabs/HomeTab";
import { DiagnosticsTab } from "./components/tabs/DiagnosticsTab";
import { GoalsTab } from "./components/tabs/GoalsTab";
import { MonthlyReviewTab } from "./components/tabs/MonthlyReviewTab";
import { PolicyCenterTab } from "./components/tabs/PolicyCenterTab";
import { ExecutionHistoryTab } from "./components/tabs/ExecutionHistoryTab";
import { Callout } from "./components/ui/Primitives";
import { OUTCOME_TONE } from "./api/labels";

const TAB_VIEWS = {
  home: <HomeTab />,
  diagnostics: <DiagnosticsTab />,
  goals: <GoalsTab />,
  review: <MonthlyReviewTab />,
  policy: <PolicyCenterTab />,
  history: <ExecutionHistoryTab />,
} as const;

function MainContent() {
  const { phase, tab, isDemoMode, feedback, clearFeedback } = useEroomSession();
  const [isGuideOpen, setGuideOpen] = useState(false);
  const [isDemoToolOpen, setDemoToolOpen] = useState(false);
  const [showConsultant, setShowConsultant] = useState(false);

  return (
    <div className="min-h-screen bg-[#F6F9F8] flex flex-col text-[#142B29] selection:bg-[#00C4A6]/20">
      <Header
        onOpenGuide={() => setGuideOpen(true)}
        onToggleDemoTool={() => setDemoToolOpen((prev) => !prev)}
        isDemoToolOpen={isDemoToolOpen}
      />

      {isDemoMode && (
        <DemoControllerBanner
          isOpen={isDemoToolOpen}
          onClose={() => setDemoToolOpen(false)}
          showConsultant={showConsultant}
          onToggleConsultant={() => setShowConsultant((prev) => !prev)}
        />
      )}

      {isDemoMode && showConsultant ? (
        <main className="flex-1 w-full">
          <ConsultantView />
        </main>
      ) : phase === "app" ? (
        <AppShell>{TAB_VIEWS[tab]}</AppShell>
      ) : phase === "design" ? (
        <GoalDesignView />
      ) : (
        <main className="flex-1 w-full">
          {/* 세션 초기화 결과처럼 온보딩 화면으로 돌아온 뒤에도 알려야 하는 처리 결과 */}
          {feedback && (
            <div role="status" aria-live="polite" className="max-w-[880px] mx-auto px-4 sm:px-6 pt-5">
              <Callout tone={feedback.outcome === "ERROR" ? "risk" : OUTCOME_TONE[feedback.outcome]} title="처리 결과">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="break-keep">{feedback.message}</span>
                  <button type="button" onClick={clearFeedback} className="min-h-[44px] text-xs font-bold underline">
                    닫기
                  </button>
                </div>
              </Callout>
            </div>
          )}
          {phase === "intro" && <ServiceIntroView />}
          {phase === "persona" && <PersonaSelectView />}
          {phase === "consent" && <ConsentView />}
          {phase === "diagnosing" && <DiagnosisProgressView />}
        </main>
      )}

      <AiAssistantModal isOpen={isGuideOpen} onClose={() => setGuideOpen(false)} />
    </div>
  );
}

export default function App() {
  const isExampleMode =
    typeof window !== "undefined" && new URLSearchParams(window.location.search).get("example") === "true";

  if (isExampleMode) return <ExampleJourneyDashboard />;

  return (
    <EroomSessionProvider>
      <MainContent />
    </EroomSessionProvider>
  );
}
