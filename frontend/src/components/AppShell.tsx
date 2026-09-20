/**
 * 고객 화면 셸: 상단 바 + 탭/하단 내비게이션 + 푸터
 *
 * 모바일 하단 고정 바는 홈·목표·이번 달·혜택 4개만 둔다.
 * 재무진단 상세·변경 내역·서비스 안내·동의 철회는 홈의 보조 메뉴에서 연다.
 * 본문 하단에는 고정 바 높이와 기기 safe area 만큼 여백을 둔다.
 */

import React from "react";
import { CalendarCheck, Gift, History, Home, Stethoscope, Target } from "lucide-react";
import { useEroomSession, type TabId } from "../api/EroomSession";
import { reviewNeedsAttention } from "../api/labels";
import { SyntheticNotice } from "./ui/Primitives";

interface NavItem {
  id: TabId;
  /** 하단 고정 바에서 쓰는 짧은 이름 */
  shortLabel: string;
  label: string;
  icon: React.ReactNode;
  inBottomBar: boolean;
}

const NAV_ITEMS: NavItem[] = [
  { id: "home", shortLabel: "홈", label: "홈", icon: <Home className="w-5 h-5" aria-hidden="true" />, inBottomBar: true },
  { id: "goals", shortLabel: "목표", label: "나의 목표", icon: <Target className="w-5 h-5" aria-hidden="true" />, inBottomBar: true },
  {
    id: "review",
    shortLabel: "이번 달",
    label: "이번 달 점검",
    icon: <CalendarCheck className="w-5 h-5" aria-hidden="true" />,
    inBottomBar: true,
  },
  {
    id: "policy",
    shortLabel: "혜택",
    label: "받을 수 있는 혜택",
    icon: <Gift className="w-5 h-5" aria-hidden="true" />,
    inBottomBar: true,
  },
  {
    id: "diagnostics",
    shortLabel: "재무진단",
    label: "재무진단",
    icon: <Stethoscope className="w-5 h-5" aria-hidden="true" />,
    inBottomBar: false,
  },
  {
    id: "history",
    shortLabel: "변경 내역",
    label: "변경 내역",
    icon: <History className="w-5 h-5" aria-hidden="true" />,
    inBottomBar: false,
  },
];

export const AppShell: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { tab, setTab, review, currentPlan } = useEroomSession();
  const hasReviewBadge = reviewNeedsAttention(review, currentPlan);

  return (
    <>
      {/* 데스크톱·태블릿 탭 */}
      <nav aria-label="주요 메뉴" className="hidden md:block border-b border-[#DCE7E4] bg-white">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 flex items-center gap-1">
          {NAV_ITEMS.filter((item) => item.inBottomBar).map((item) => (
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
          {/* 보조 메뉴는 주요 메뉴와 시각적으로 분리한다 */}
          <span className="ml-auto flex items-center gap-1">
            {NAV_ITEMS.filter((item) => !item.inBottomBar).map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setTab(item.id)}
                aria-current={tab === item.id ? "page" : undefined}
                className={`min-h-[52px] px-3 inline-flex items-center gap-1.5 text-[13px] font-bold border-b-[3px] ${
                  tab === item.id
                    ? "border-[#00C4A6] text-[#006B5B]"
                    : "border-transparent text-[#7A8B88] hover:text-[#142B29]"
                }`}
              >
                {item.icon}
                {item.label}
              </button>
            ))}
          </span>
        </div>
      </nav>

      <main className="flex-1 w-full">
        <div className="max-w-[1200px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 md:py-7 pb-[calc(84px+env(safe-area-inset-bottom))] md:pb-10">
          {children}
        </div>
      </main>

      <footer className="bg-white border-t border-[#DCE7E4] py-6 pb-[calc(88px+env(safe-area-inset-bottom))] md:pb-6">
        <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 space-y-2">
          <p className="text-xs font-extrabold text-[#142B29]">iM 이룸 (iM E-Room) · 공모전 체험판</p>
          <SyntheticNotice />
        </div>
      </footer>

      {/* 모바일 하단 고정 내비게이션 (주요 메뉴 4개) */}
      <nav
        aria-label="주요 메뉴"
        className="md:hidden fixed bottom-0 inset-x-0 z-30 bg-white border-t border-[#DCE7E4] pb-[env(safe-area-inset-bottom)]"
      >
        <ul className="grid grid-cols-4">
          {NAV_ITEMS.filter((item) => item.inBottomBar).map((item) => {
            const isCurrent = tab === item.id;
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setTab(item.id)}
                  aria-current={isCurrent ? "page" : undefined}
                  className={`w-full min-h-[64px] flex flex-col items-center justify-center gap-1 px-1 pt-1 border-t-2 ${
                    isCurrent
                      ? "text-[#006B5B] border-[#00C4A6] bg-[#EAFBF6]"
                      : "text-[#526562] border-transparent"
                  }`}
                >
                  <span className="relative">
                    {item.icon}
                    {/* 색만으로 알리지 않도록 배지에도 텍스트 설명을 붙인다 */}
                    {item.id === "review" && hasReviewBadge && (
                      <span className="absolute -top-1 -right-2 w-2.5 h-2.5 rounded-full bg-[#9A3412] border border-white" aria-hidden="true" />
                    )}
                  </span>
                  <span
                    className={`text-[11px] leading-none text-center break-keep ${
                      isCurrent ? "font-extrabold" : "font-bold"
                    }`}
                  >
                    {item.shortLabel}
                  </span>
                  {item.id === "review" && hasReviewBadge && <span className="sr-only">확인 필요</span>}
                  {isCurrent && <span className="sr-only">현재 화면</span>}
                </button>
              </li>
            );
          })}
        </ul>
      </nav>
    </>
  );
};
