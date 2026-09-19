import React, { useState } from "react";
import { useEroom } from "../context/EroomContext";
import {
  Calendar,
  ShieldCheck,
  ShieldAlert,
  ChevronRight,
  Headphones,
  User,
  Sparkles,
  RotateCcw,
  Clock,
  SlidersHorizontal,
  Home,
  Target,
  GitCompare,
  FileText,
  HelpCircle,
  Menu,
  X,
} from "lucide-react";

export const Header: React.FC<{
  onOpenAiModal: () => void;
  onToggleDemoTool?: () => void;
  isDemoToolOpen?: boolean;
  isDemoMode?: boolean;
}> = ({ onOpenAiModal, onToggleDemoTool, isDemoToolOpen, isDemoMode = false }) => {
  const {
    currentDate,
    consent,
    viewMode,
    setViewMode,
    activeTab,
    setActiveTab,
    advanceMonth,
    toggleConsent,
    resetDemo,
    consultationCases,
    isSimulatingMonth,
    proposedPlan,
  } = useEroom();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const waitingCasesCount = consultationCases.filter((c) => c.status === "WAITING").length;

  const handleNav = (mode: "intro" | "youth", tab?: "diagnostics" | "goals" | "replan" | "policies") => {
    setViewMode(mode);
    if (tab) setActiveTab(tab);
    setMobileMenuOpen(false);
  };

  return (
    <header id="app-header" className="bg-white border-b border-[#DCE7E4] sticky top-0 z-40">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-[72px]">
          {/* 1. 왼쪽: 로고 & 워드마크 */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => handleNav("intro")}
              className="flex items-center space-x-2.5 text-left group focus:outline-hidden"
            >
              <div className="w-9 h-9 rounded-xl bg-[#00C4A6] flex items-center justify-center text-[#142B29] font-black text-lg shadow-xs group-hover:bg-[#00b095] transition-colors">
                iM
              </div>
              <div>
                <div className="flex items-center space-x-2">
                  <span className="font-extrabold text-lg text-[#142B29] tracking-tight">
                    iM 이룸
                  </span>
                  {isDemoMode && (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EAFBF6] text-[#006B5B] border border-[#DCE7E4]">
                      시연 모드
                    </span>
                  )}
                </div>
                <span className="text-[11px] text-[#526562] hidden lg:block">
                  청년 목표 중심 적응형 재무관리
                </span>
              </div>
            </button>
          </div>

          {/* 2. 가운데: 주요 서비스 내비게이션 (데스크톱) */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2 text-xs font-bold text-[#526562]">
            <button
              onClick={() => handleNav("intro")}
              className={`px-3 py-2 rounded-lg transition-colors ${
                viewMode === "intro"
                  ? "bg-[#EAFBF6] text-[#006B5B]"
                  : "hover:text-[#142B29] hover:bg-slate-50"
              }`}
            >
              서비스 소개
            </button>
            <button
              onClick={() => handleNav("youth", "diagnostics")}
              className={`px-3 py-2 rounded-lg transition-colors ${
                viewMode === "youth" && activeTab === "diagnostics"
                  ? "bg-[#EAFBF6] text-[#006B5B]"
                  : "hover:text-[#142B29] hover:bg-slate-50"
              }`}
            >
              재무 홈
            </button>
            <button
              onClick={() => handleNav("youth", "goals")}
              className={`px-3 py-2 rounded-lg transition-colors ${
                viewMode === "youth" && activeTab === "goals"
                  ? "bg-[#EAFBF6] text-[#006B5B]"
                  : "hover:text-[#142B29] hover:bg-slate-50"
              }`}
            >
              나의 목표
            </button>
            <button
              onClick={() => handleNav("youth", "replan")}
              className={`px-3 py-2 rounded-lg transition-colors flex items-center ${
                viewMode === "youth" && activeTab === "replan"
                  ? "bg-[#EAFBF6] text-[#006B5B]"
                  : "hover:text-[#142B29] hover:bg-slate-50"
              }`}
            >
              <span>이번 달 점검</span>
              {proposedPlan && (
                <span className="ml-1.5 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              )}
            </button>
            <button
              onClick={() => handleNav("youth", "policies")}
              className={`px-3 py-2 rounded-lg transition-colors ${
                viewMode === "youth" && activeTab === "policies"
                  ? "bg-[#EAFBF6] text-[#006B5B]"
                  : "hover:text-[#142B29] hover:bg-slate-50"
              }`}
            >
              받을 수 있는 혜택
            </button>
          </nav>

          {/* 3. 오른쪽: 상태 & 액션 컨트롤 */}
          <div className="flex items-center space-x-2 sm:space-x-2.5">
            {/* 시나리오 도구 토글 버튼 */}
            {isDemoMode && onToggleDemoTool && (
              <button
                onClick={onToggleDemoTool}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center space-x-1 ${
                  isDemoToolOpen
                    ? "bg-[#142B29] text-white border-[#142B29]"
                    : "bg-white text-[#526562] border-[#DCE7E4] hover:border-[#142B29] hover:text-[#142B29]"
                }`}
                title="시나리오 체험 도구 열기/닫기"
              >
                <SlidersHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">시나리오 도구</span>
              </button>
            )}

            {/* AI Q&A 버튼 */}
            <button
              id="btn-open-ai-assistant"
              onClick={onOpenAiModal}
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-[#EEF5FF] text-[#1d4ed8] border border-[#d6e4fd] hover:bg-[#e0edff] transition-colors flex items-center space-x-1"
              title="AI 정책 및 계획 Q&A"
            >
              <Sparkles className="w-3.5 h-3.5 text-[#1d4ed8]" />
              <span className="hidden sm:inline">AI 가이드</span>
            </button>

            {/* 상담사 뷰 토글 */}
            {isDemoMode && <button
              onClick={() => setViewMode(viewMode === "consultant" ? "youth" : "consultant")}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-colors flex items-center space-x-1 ${
                viewMode === "consultant"
                  ? "bg-rose-600 text-white border-rose-600"
                  : "bg-white text-[#526562] border-[#DCE7E4] hover:text-[#142B29]"
              }`}
              title="상담사 전용 위험 대시보드"
            >
              <Headphones className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">상담사</span>
              {waitingCasesCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-rose-500 text-white">
                  {waitingCasesCount}
                </span>
              )}
            </button>}

            {/* 데모 체험하기 Primary CTA (소개 화면일 때 강조) */}
            {viewMode === "intro" ? (
              <button
                id="header-cta-btn"
                onClick={() => handleNav("youth", "diagnostics")}
                className="px-3.5 py-2 rounded-xl bg-[#00C4A6] hover:bg-[#00b095] text-[#142B29] font-bold text-xs shadow-xs transition-all flex items-center space-x-1"
              >
                <span>서비스 시작하기</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              /* 시간 이동 컨트롤 (실제 서비스 화면일 때 편리한 월간 점검 제공) */
              isDemoMode ? <div className="flex items-center bg-[#F6F9F8] rounded-lg p-0.5 border border-[#DCE7E4]">
                <div className="px-2 py-1 text-xs font-mono font-semibold text-[#142B29] hidden sm:block">
                  {currentDate}
                </div>
                <button
                  onClick={advanceMonth}
                  disabled={isSimulatingMonth || consent.status !== "ACTIVE"}
                  className="px-2 py-1 bg-[#00C4A6] hover:bg-[#00b095] disabled:bg-slate-200 text-[#142B29] disabled:text-slate-400 rounded-md font-bold text-xs transition-colors flex items-center"
                  title="다음 달로 시간 이동하여 월간 스냅샷 수집"
                >
                  {isSimulatingMonth ? (
                    <Clock className="w-3 h-3 animate-spin mr-1" />
                  ) : (
                    <ChevronRight className="w-3 h-3 mr-0.5" />
                  )}
                  <span className="hidden sm:inline">다음 점검</span>
                </button>
              </div> : null
            )}

            {/* 초기화 버튼 */}
            {isDemoMode && <button
              id="btn-reset-demo"
              onClick={resetDemo}
              className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition-colors"
              title="초기 상태로 리셋"
            >
              <RotateCcw className="w-4 h-4" />
            </button>}

            {/* 모바일 햄버거 메뉴 */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 text-slate-600 rounded-lg hover:bg-slate-100"
              aria-label={mobileMenuOpen ? "메뉴 닫기" : "메뉴 열기"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* 모바일 드롭다운 메뉴 */}
        {mobileMenuOpen && (
          <div className="md:hidden py-3 border-t border-[#DCE7E4] space-y-1 text-xs font-bold">
            <button
              onClick={() => handleNav("intro")}
              className="w-full text-left px-3 py-2 rounded-lg text-[#142B29] hover:bg-slate-50 flex items-center"
            >
              <Home className="w-4 h-4 mr-2 text-[#006B5B]" />
              서비스 소개
            </button>
            <button
              onClick={() => handleNav("youth", "diagnostics")}
              className="w-full text-left px-3 py-2 rounded-lg text-[#142B29] hover:bg-slate-50 flex items-center"
            >
              <Calendar className="w-4 h-4 mr-2 text-[#006B5B]" />
              홈
            </button>
            <button
              onClick={() => handleNav("youth", "goals")}
              className="w-full text-left px-3 py-2 rounded-lg text-[#142B29] hover:bg-slate-50 flex items-center"
            >
              <Target className="w-4 h-4 mr-2 text-[#006B5B]" />
              나의 목표
            </button>
            <button
              onClick={() => handleNav("youth", "replan")}
              className="w-full text-left px-3 py-2 rounded-lg text-[#142B29] hover:bg-slate-50 flex items-center justify-between"
            >
              <div className="flex items-center">
                <GitCompare className="w-4 h-4 mr-2 text-[#006B5B]" />
                이번 달 점검
              </div>
              {proposedPlan && (
                <span className="px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-rose-500 text-white">
                  조정 대기
                </span>
              )}
            </button>
            <button
              onClick={() => handleNav("youth", "policies")}
              className="w-full text-left px-3 py-2 rounded-lg text-[#142B29] hover:bg-slate-50 flex items-center"
            >
              <FileText className="w-4 h-4 mr-2 text-[#006B5B]" />
              받을 수 있는 혜택
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
