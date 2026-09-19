import React, { useState } from "react";
import { useEroom } from "../context/EroomContext";
import { ScenarioPresetId } from "../types";
import {
  PlayCircle,
  ShieldAlert,
  Sparkles,
  CheckCircle2,
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  X,
  Info,
} from "lucide-react";

export const DemoControllerBanner: React.FC<{
  isOpen?: boolean;
  onClose?: () => void;
}> = ({ isOpen = true, onClose }) => {
  const {
    activeScenario,
    applyScenario,
    consent,
    toggleConsent,
    currentDate,
    setViewMode,
    setActiveTab,
  } = useEroom();

  if (!isOpen) return null;

  const scenarios: {
    id: ScenarioPresetId;
    label: string;
    desc: string;
    badge: string;
    targetTab?: "diagnostics" | "goals" | "replan" | "policies";
  }[] = [
    {
      id: "S01_INITIAL",
      label: "S01. 최초 동의·진단",
      desc: "12개월 가상 거래 정규화 및 기준 계획 v1.0 산출",
      badge: "기준 상태",
      targetTab: "diagnostics",
    },
    {
      id: "S02_NO_CHANGE",
      label: "S02. 변동 없음 유지",
      desc: "다음 월 유의미한 변동 없음 → 불필요한 재설계 방지",
      badge: "안정 유지",
      targetTab: "diagnostics",
    },
    {
      id: "S03_SALARY_RISE",
      label: "S03. 급여 인상 (+30만)",
      desc: "급여 260만→290만 인상 → 목표별 추가 여력 배분 및 승인 대기",
      badge: "조정 이벤트",
      targetTab: "replan",
    },
    {
      id: "S04_INCOME_STOP",
      label: "S04. 소득 미입금 (위험)",
      desc: "급여 0원 감지 → 저축 유예 및 상담사 화면 브리핑 자동 연계",
      badge: "위험 감지",
    },
    {
      id: "S05_POLICY_UPDATE",
      label: "S05. 정책 지원 확대",
      desc: "대구 청년희망적금 등 정책 기준일 갱신 및 자격 재평가",
      badge: "정책 갱신",
      targetTab: "policies",
    },
    {
      id: "S06_OVER_BUDGET",
      label: "S06. 여력 초과 목표",
      desc: "1년 내 3천만원 등 무리한 목표 입력 시 부족분/기간 조정안",
      badge: "제약 검증",
      targetTab: "goals",
    },
  ];

  const handleSelectScenario = (s: typeof scenarios[0]) => {
    applyScenario(s.id);
    if (s.id === "S04_INCOME_STOP") {
      setViewMode("consultant");
    } else {
      setViewMode("youth");
      if (s.targetTab) setActiveTab(s.targetTab);
    }
  };

  return (
    <div
      id="demo-controller-bar"
      className="bg-[#103D36] text-white border-b border-[#1d5c52] px-4 py-3 text-xs shadow-md"
    >
      <div className="max-w-[1200px] mx-auto">
        <div className="flex items-center justify-between pb-2 mb-2 border-b border-white/10">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-2 py-0.5 rounded-full font-bold bg-[#00C4A6]/20 text-[#00C4A6] border border-[#00C4A6]/30 text-[11px]">
              <PlayCircle className="w-3.5 h-3.5 mr-1" />
              시나리오 도구
            </span>
            <span className="text-slate-300 hidden sm:inline text-[11px]">
              원클릭으로 다양한 청년 재무 상황을 주입하여 실시간 반응을 검증할 수 있습니다.
            </span>
          </div>

          <div className="flex items-center space-x-3 text-[11px]">
            <button
              onClick={toggleConsent}
              className={`px-2 py-0.5 rounded text-[11px] font-bold border transition-colors ${
                consent.status === "ACTIVE"
                  ? "bg-[#00C4A6]/20 text-[#00C4A6] border-[#00C4A6]/40"
                  : "bg-rose-500/20 text-rose-300 border-rose-500/40"
              }`}
              title="모의 수집 동의 상태 전환"
            >
              {consent.status === "ACTIVE" ? "✓ 모의동의 유지 (매월 15일)" : "✕ 동의 철회 상태"}
            </button>

            {onClose && (
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-white p-1 rounded hover:bg-white/10"
                title="도구 닫기"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 시나리오 프리셋 버튼 그리드 */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2">
          {scenarios.map((s) => {
            const isCurrent = activeScenario === s.id;
            return (
              <button
                key={s.id}
                id={`btn-scenario-${s.id}`}
                onClick={() => handleSelectScenario(s)}
                className={`p-2 rounded-xl text-left transition-all border ${
                  isCurrent
                    ? "bg-[#00C4A6] text-[#142B29] font-bold border-[#00C4A6] shadow-sm"
                    : "bg-white/5 hover:bg-white/10 text-slate-200 border-white/10"
                }`}
              >
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11px] font-bold truncate">{s.label.split(".")[0]}</span>
                  <span
                    className={`px-1.5 py-0.2 rounded text-[9px] font-bold ${
                      isCurrent ? "bg-[#142B29] text-white" : "bg-white/10 text-slate-300"
                    }`}
                  >
                    {s.badge}
                  </span>
                </div>
                <div className={`text-[11px] font-semibold truncate ${isCurrent ? "text-[#142B29]" : "text-white"}`}>
                  {s.label.split(". ")[1] || s.label}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};
