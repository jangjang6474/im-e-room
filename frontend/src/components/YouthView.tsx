import React from "react";
import { useEroom } from "../context/EroomContext";
import { DiagnosticsTab } from "./tabs/DiagnosticsTab";
import { GoalsTab } from "./tabs/GoalsTab";
import { ReplanComparisonTab } from "./tabs/ReplanComparisonTab";
import { PolicyCenterTab } from "./tabs/PolicyCenterTab";
import { ExecutionHistoryTab } from "./tabs/ExecutionHistoryTab";
import {
  Activity,
  Target,
  GitCompare,
  FileText,
  History,
} from "lucide-react";

export const YouthView: React.FC = () => {
  const { activeTab, setActiveTab, proposedPlan } = useEroom();

  const tabs: {
    id: "diagnostics" | "goals" | "replan" | "policies" | "history";
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    hasBadge?: boolean;
  }[] = [
    { id: "diagnostics", label: "홈", icon: Activity, hasBadge: false },
    { id: "goals", label: "나의 목표", icon: Target, hasBadge: false },
    {
      id: "replan",
      label: "이번 달 점검",
      icon: GitCompare,
      hasBadge: Boolean(proposedPlan),
    },
    { id: "policies", label: "받을 수 있는 혜택", icon: FileText, hasBadge: false },
    { id: "history", label: "변경 내역", icon: History, hasBadge: false },
  ];

  return (
    <div id="youth-view-container" className="space-y-6 pb-20 md:pb-0">
      {/* 탭 네비게이션 */}
      <div className="hidden md:block border-b border-[#DCE7E4]">
        <nav className="flex space-x-1 sm:space-x-2 overflow-x-auto pb-px" aria-label="Tabs">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                id={`tab-btn-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 px-3 sm:px-4 text-xs sm:text-sm font-bold border-b-2 whitespace-nowrap flex items-center rounded-t-xl transition-all ${
                  isActive
                    ? "border-[#00C4A6] text-[#006B5B] bg-[#EAFBF6]/80 shadow-2xs"
                    : "border-transparent text-[#526562] hover:text-[#142B29] hover:bg-slate-50"
                }`}
              >
                <Icon className={`w-4 h-4 mr-2 ${isActive ? "text-[#006B5B]" : "text-[#526562]"}`} />
                {tab.label}
                {tab.hasBadge && (
                  <span className="ml-2 px-1.5 py-0.2 rounded-full text-[10px] font-extrabold bg-rose-500 text-white animate-pulse">
                    새 조정안
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* 탭 콘텐츠 */}
      <div>
        {activeTab === "diagnostics" && <DiagnosticsTab />}
        {activeTab === "goals" && <GoalsTab />}
        {activeTab === "replan" && <ReplanComparisonTab />}
        {activeTab === "policies" && <PolicyCenterTab />}
        {activeTab === "history" && <ExecutionHistoryTab />}
      </div>

      {/* 모바일 웹앱 하단 내비게이션 */}
      <nav
        aria-label="주요 메뉴"
        className="md:hidden fixed inset-x-0 bottom-0 z-40 border-t border-[#DCE7E4] bg-white/95 backdrop-blur-xl shadow-[0_-8px_24px_rgba(20,43,41,0.08)]"
      >
        <div className="mx-auto grid max-w-lg grid-cols-4 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2">
          {tabs.slice(0, 4).map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                aria-current={isActive ? "page" : undefined}
                className={`relative min-h-14 rounded-xl px-1 py-1.5 text-[11px] font-bold transition-colors ${
                  isActive
                    ? "bg-[#EAFBF6] text-[#006B5B]"
                    : "text-[#526562] hover:bg-[#F6F9F8] hover:text-[#142B29]"
                }`}
              >
                <Icon className="mx-auto mb-1 h-5 w-5" aria-hidden="true" />
                <span>{tab.id === "policies" ? "혜택" : tab.label}</span>
                {tab.hasBadge && (
                  <span className="absolute right-[22%] top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white" aria-label="새 계획 있음" />
                )}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
};
