/**
 * 고객 화면 셸: 상단 바 + 탭/하단 내비게이션 + 푸터
 *
 * 모바일은 주요 메뉴 4개를 하단 고정 바로 제공하고, 본문 하단에 고정 바 높이와 safe area 만큼 여백을 둔다.
 */

import React from "react";
import { CalendarCheck, Gift, History, Home, Stethoscope, Target } from "lucide-react";
import { useEroomSession, type TabId } from "../api/EroomSession";
import { SyntheticNotice } from "./ui/Primitives";

interface NavItem {
  id: TabId;
  label: string;
  icon: React.ReactNode;
  inBottomBar: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: "home", label: "홈", icon: <Home className="w-5 h-5" aria-hidden="true" />, inBottomBar: true },
  { id: "goals", label: "나의 목표", icon: <Target className="w-5 h-5" aria-hidden="true" />, inBottomBar: true },
  { id: "review", label: "이번 달 점검", icon: <CalendarCheck className="w-5 h-5" aria-hidden="true" />, inBottomBar: true },
  { id: "policy", label: "받을 수 있는 혜택", icon: <Gift className="w-5 h-5" aria-hidden="true" />, inBottomBar: true },
  { id: "diagnostics", label: "재무진단", icon: <Stethoscope className="w-5 h-5" aria-hidden="true" />, inBottomBar: false },
  { id: "history", label: "변경 내역", icon: <History className="w-5 h-5" aria-hidden="true" />, inBottomBar: false },
];

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tab, setTab, review } = useEroomSession();
  const hasReviewBadge = review !== null && review.overallType !== "INFO";

  return (
    <>
      {/* 데스크톱·태블릿 탭 */}
      <nav aria-label="주요 메뉴" className="hidden md:block border-b border-[#DCE7E4] bg-white">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 flex gap-1">
          {NAV_ITEMS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              aria-current={tab === item.id ? "page" : undefined}
              className={`min-h-[52px] px-4 inline-flex items-center gap-2 text-sm font-bold border-b-[3px] ${
                tab === item.id
                  ? "border-[#00C4A6] text-[#006B5B]"
                  : "border-transparent text-[#526562] hover:text-[#142B29]"
              }`}
            >
              {item.icon}
              {item.label}
              {item.id === "review" && hasReviewBadge && (
                <span className="ml-1 text-[10px] font-extrabold px-1.5 py-0.5 rounded-full bg-[#F6FADC] text-[#5C5A14] border border-[#E3E9A8]">
                  확인 필요
                </span>
              )}
            </button>
          ))}
        </div>
      </nav>

      <main className="flex-1 w-full">
        <div className="max-w-[1200px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 md:py-7 pb-[calc(96px+env(safe-area-inset-bottom))] md:pb-10">
          {children}
        </div>
      </main>

      <footer className="bg-white border-t border-[#DCE7E4] py-6 pb-[calc(88px+env(safe-area-inset-bottom))] md:pb-6">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 space-y-2">
          <p className="text-xs font-extrabold text-[#142B29]">iM 이룸 (iM E-Room) · 공모전 프로토타입</p>
          <SyntheticNotice />
        </div>
      </footer>

      {/* 모바일 하단 고정 내비게이션 */}
      <nav
        aria-label="주요 메뉴"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-[#DCE7E4] pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="grid grid-cols-4">
          {NAV_ITEMS.filter((item) => item.inBottomBar).map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => setTab(item.id)}
                aria-current={tab === item.id ? "page" : undefined}
                className={`w-full min-h-[60px] flex flex-col items-center justify-center gap-1 px-1 ${
                  tab === item.id ? "text-[#006B5B]" : "text-[#526562]"
                }`}
              >
                <span className="relative">
                  {item.icon}
                  {item.id === "review" && hasReviewBadge && (
                    <span
                      className="absolute -top-1 -right-2 w-2 h-2 rounded-full bg-[#9A3412]"
                      aria-hidden="true"
                    />
                  )}
                </span>
                <span className="text-[11px] font-bold leading-none text-center break-keep">
                  {item.label === "받을 수 있는 혜택" ? "혜택" : item.label}
                </span>
                {tab === item.id && <span className="sr-only">현재 화면</span>}
              </button>
            </li>
          ))}
        </ul>
      </nav>
    </>
  );
};
