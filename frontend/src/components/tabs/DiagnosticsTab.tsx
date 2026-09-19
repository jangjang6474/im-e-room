import React from "react";
import { useEroom } from "../../context/EroomContext";
import {
  TrendingUp,
  Wallet,
  ArrowDownRight,
  ShieldCheck,
  CreditCard,
  Receipt,
  Info,
  Layers,
  ArrowRight,
  AlertCircle,
  Clock,
  Sparkles,
  Target,
  FileText,
  History,
  ChevronRight,
} from "lucide-react";

export const DiagnosticsTab: React.FC = () => {
  const {
    customer,
    snapshot,
    currentDate,
    goals,
    events,
    proposedPlan,
    activePlan,
    policies,
    consent,
    setActiveTab,
  } = useEroom();

  const primaryGoal = goals.find((g) => g.priority === 1) || goals[0];
  const primaryGoalPercent = primaryGoal
    ? Math.min(100, Math.round((primaryGoal.currentAmount / primaryGoal.targetAmount) * 100))
    : 0;

  const totalExpenses = snapshot.fixedExpenses + snapshot.variableExpenses + snapshot.debtPayment;
  const recentEvent = events[0];
  const primaryAllocation = activePlan.items.find((item) => item.goalId === primaryGoal?.id);
  const nextCollectionDate = consent.nextScheduledCollection.split("T")[0].replaceAll("-", ".");
  const isDemoMode = new URLSearchParams(window.location.search).get("demo") === "true";
  const policyStatus = {
    ELIGIBLE: { label: "이용 가능", className: "bg-[#EAFBF6] text-[#006B5B]" },
    NEEDS_VERIFICATION: { label: "서류 확인 필요", className: "bg-amber-50 text-amber-800" },
    INELIGIBLE: { label: "현재 대상 아님", className: "bg-slate-100 text-slate-600" },
  } as const;

  return (
    <div id="diagnostics-home" className="space-y-6">
      {/* 1. 상단 안내 헤더 (6.2 재무 홈) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[#DCE7E4] gap-2">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[#142B29]">
            이번 달도, 목표를 향해 한 걸음
          </h1>
          <p className="text-xs sm:text-sm text-[#526562] mt-1">
            {customer.name}님의 재무 상태를 {snapshot.asOf.replaceAll("-", ".")} 기준으로 정리했어요.
          </p>
        </div>

        <div className="flex items-center space-x-3 text-xs text-[#526562]">
          <span className="px-2.5 py-1 rounded-full bg-white border border-[#DCE7E4] font-medium">
            가상 데이터 · 기준일 <strong className="text-[#142B29] font-mono">{snapshot.asOf}</strong>
          </span>
          <span className="px-2.5 py-1 rounded-full bg-[#EAFBF6] border border-[#DCE7E4] text-[#006B5B] font-medium hidden sm:inline-flex items-center">
            <Clock className="w-3 h-3 mr-1" />
            다음 점검: <strong className="font-mono ml-1">{nextCollectionDate}</strong>
          </span>
        </div>
      </div>

      {/* 2. 8:4 분할 주요 영역 (목표 카드 & 이번 달 확인할 내용) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 좌측 (8열): 나의 핵심 목표 카드 (연한 민트 배경 #EAFBF6) */}
        <div className="lg:col-span-8 p-6 sm:p-7 rounded-[20px] bg-[#EAFBF6] border border-[#DCE7E4] flex flex-col justify-between space-y-5">
          <div className="flex items-start justify-between">
            <div>
              <div className="flex items-center space-x-2">
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-[#006B5B] text-white">
                  최우선 목표
                </span>
                <span className="text-sm font-semibold text-[#526562]">목표 기간 {primaryGoal?.targetMonths}개월</span>
              </div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#142B29] mt-2">
                나의 목표 — {primaryGoal?.title || "청년 전세 보증금 마련"}
              </h2>
            </div>
            <div className="text-right">
              <span className="text-2xl sm:text-3xl font-black text-[#006B5B] font-mono tabular-nums">
                {primaryGoalPercent}%
              </span>
              <span className="text-xs text-[#526562] block">누적 달성률</span>
            </div>
          </div>

          {/* 진행률 바 */}
          <div className="space-y-2">
            <div className="w-full h-3 bg-white/80 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#00C4A6] rounded-full transition-all duration-700"
                style={{ width: `${primaryGoalPercent}%` }}
              />
            </div>
            <div className="flex justify-between items-center text-xs text-[#526562]">
              <span>
                현재 적립: <strong className="text-[#142B29] font-mono tabular-nums">{primaryGoal?.currentAmount.toLocaleString()}원</strong>
              </span>
              <span>
                목표 금액: <strong className="text-[#142B29] font-mono tabular-nums">{primaryGoal?.targetAmount.toLocaleString()}원</strong>
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-[#DCE7E4] flex flex-col sm:flex-row sm:items-center justify-between text-xs text-[#526562] gap-2">
            <span>
              현재 계획에서 월 <strong className="text-[#142B29] font-mono">{(primaryAllocation?.monthlyAmount ?? 0).toLocaleString()}원</strong>을 이 목표에 배분하고 있어요.
            </span>
            <button
              onClick={() => setActiveTab("goals")}
              className="font-bold text-[#006B5B] hover:underline flex items-center text-left"
            >
              목표 전체 포트폴리오 관리 <ArrowRight className="w-3.5 h-3.5 ml-1" />
            </button>
          </div>
        </div>

        {/* 우측 (4열): 이번 달 확인할 내용 */}
        <div className="lg:col-span-4 p-6 rounded-[20px] bg-white border border-[#DCE7E4] flex flex-col justify-between space-y-4 shadow-[0_4px_20px_rgba(20,43,41,0.03)]">
          <div>
            <div className="flex items-center justify-between text-xs pb-3 border-b border-[#DCE7E4]">
              <span className="font-bold text-[#142B29] flex items-center">
                <Sparkles className="w-4 h-4 mr-1 text-[#00C4A6]" />
                이번 달 확인할 내용
              </span>
              {proposedPlan ? (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-rose-100 text-rose-800">
                  새 조정안 대기
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EAFBF6] text-[#006B5B]">
                  계획 안정
                </span>
              )}
            </div>

            <div className="mt-3 space-y-2">
              <h3 className="text-sm font-bold text-[#142B29]">
                {proposedPlan
                  ? "재무 상황 변화로 새 계획이 제안되었어요"
                  : recentEvent?.title || "정기 점검이 정상 완료되었습니다"}
              </h3>
              <p className="text-xs text-[#526562] leading-relaxed">
                {proposedPlan
                  ? "소득 또는 지출 변화를 반영한 새 계획을 준비했어요. 내용을 확인하고 승인하기 전까지는 기존 계획이 유지됩니다."
                  : recentEvent?.message || "유의미한 재무 충격 없이 목표 저축이 차질 없이 진행 중입니다."}
              </p>
            </div>
          </div>

          <div className="pt-3 border-t border-[#DCE7E4]">
            {proposedPlan ? (
              <button
                id="btn-goto-replan"
                onClick={() => setActiveTab("replan")}
                className="w-full py-2.5 rounded-xl bg-[#00C4A6] hover:bg-[#00b095] text-[#142B29] font-bold text-xs shadow-xs transition-colors flex items-center justify-center space-x-1"
              >
                <span>새 계획 살펴보기</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => setActiveTab("replan")}
                className="w-full py-2.5 rounded-xl bg-slate-50 hover:bg-slate-100 text-[#142B29] font-bold text-xs border border-[#DCE7E4] transition-colors flex items-center justify-center space-x-1"
              >
                <span>계획 상태 및 이력 보기</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 3. 하단 3단 핵심 지표 카드: [월 소득] [월 지출] [저축 가능 금액] */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 월 실소득 */}
        <div className="bg-white rounded-2xl border border-[#DCE7E4] p-5 shadow-2xs">
          <div className="flex items-center justify-between text-[#526562] text-xs mb-2">
            <span className="font-semibold">월 실소득</span>
            <Wallet className="w-4 h-4 text-[#006B5B]" />
          </div>
          <div className="text-2xl font-extrabold text-[#142B29] font-mono tabular-nums">
            {snapshot.monthlyIncome.toLocaleString()}원
          </div>
          <p className="text-[11px] text-[#526562] mt-1">
            급여 이체 등 실제 유입액 (계좌 간 대체 이체 제외)
          </p>
        </div>

        {/* 월 총 지출 */}
        <div className="bg-white rounded-2xl border border-[#DCE7E4] p-5 shadow-2xs">
          <div className="flex items-center justify-between text-[#526562] text-xs mb-2">
            <span className="font-semibold">월 총 지출 (고정+변동+부채)</span>
            <ArrowDownRight className="w-4 h-4 text-slate-500" />
          </div>
          <div className="text-2xl font-extrabold text-[#142B29] font-mono tabular-nums">
            {totalExpenses.toLocaleString()}원
          </div>
          <p className="text-[11px] text-[#526562] mt-1">
            고정비 {snapshot.fixedExpenses.toLocaleString()}원 · 생활비 {snapshot.variableExpenses.toLocaleString()}원 · 부채 {snapshot.debtPayment.toLocaleString()}원
          </p>
        </div>

        {/* 저축 가능 금액 (월 가용 저축 여력) */}
        <div className="bg-[#EAFBF6] rounded-2xl border border-[#DCE7E4] p-5 shadow-2xs">
          <div className="flex items-center justify-between text-[#006B5B] text-xs mb-2">
            <span className="font-bold">월 저축 가능 금액 (가용 여력)</span>
            <TrendingUp className="w-4 h-4 text-[#00C4A6]" />
          </div>
          <div className="text-2xl font-black text-[#006B5B] font-mono tabular-nums">
            {snapshot.availableSurplus.toLocaleString()}원
          </div>
          <p className="text-[11px] text-[#006B5B] mt-1">
            소득의 {snapshot.monthlyIncome > 0 ? Math.round((snapshot.availableSurplus / snapshot.monthlyIncome) * 100) : 0}% 수준 · 실현 가능한 저축 한도
          </p>
        </div>
      </div>

      {/* 4. 하단 상세 섹션: [목표별 납입 계획] [지원제도 빠른 확인] */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* 목표별 납입 계획 (8열) */}
        <div className="lg:col-span-8 bg-white rounded-2xl border border-[#DCE7E4] p-6 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-[#DCE7E4]">
            <div>
              <h3 className="text-sm font-bold text-[#142B29] flex items-center">
                <Target className="w-4 h-4 mr-1.5 text-[#006B5B]" />
                현재 실행 중인 목표별 납입 계획{isDemoMode ? ` (${activePlan.version})` : ""}
              </h3>
              <span className="text-sm text-[#526562]">생활 여유자금을 남긴 실행 가능한 계획</span>
            </div>
            <span className="text-xs font-mono font-bold text-[#142B29]">
              총 월 {activePlan.totalMonthlySavings.toLocaleString()}원
            </span>
          </div>

          <div className="space-y-3">
            {activePlan.items.map((item, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-[#F6F9F8] border border-[#DCE7E4] flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
              >
                <div className="flex items-center space-x-3">
                  <span className="w-6 h-6 rounded-full bg-[#142B29] text-white flex items-center justify-center font-bold text-[11px]">
                    {idx + 1}
                  </span>
                  <div>
                    <strong className="text-sm font-bold text-[#142B29] block">
                      {item.goalTitle}
                    </strong>
                    <span className="text-xs text-[#526562]">{item.productName}</span>
                  </div>
                </div>

                <div className="flex items-center justify-between sm:justify-end sm:space-x-4 text-right">
                  <div>
                    <span className="text-xs text-[#526562] block">월 납입액</span>
                    <span className="font-mono font-bold text-sm text-[#142B29]">
                      {item.monthlyAmount.toLocaleString()}원
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-[#526562] block">예상 소요</span>
                    <span className="font-medium text-xs text-[#006B5B]">
                      {item.monthlyAmount === 0 || item.expectedCompletionMonths >= 900
                        ? "납입 대기"
                        : `${item.expectedCompletionMonths}개월`}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="pt-2 flex items-center justify-between text-xs text-[#526562]">
            <span>비상금 보유 잔고: <strong className="font-mono text-[#142B29]">{snapshot.emergencyFundBalance.toLocaleString()}원</strong></span>
            <button
              onClick={() => setActiveTab("goals")}
              className="text-xs font-bold text-[#006B5B] hover:underline"
            >
              목표 설정 변경하기 →
            </button>
          </div>
        </div>

        {/* 지원제도 확인 및 수집 설정 (4열) */}
        <div className="lg:col-span-4 space-y-4">
          {/* 지원제도 확인 카드 */}
          <div className="bg-white rounded-2xl border border-[#DCE7E4] p-5 shadow-2xs space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#142B29] flex items-center">
                <FileText className="w-4 h-4 mr-1.5 text-[#1d4ed8]" />
                적격 청년 지원제도
              </h3>
              <button
                onClick={() => setActiveTab("policies")}
                className="text-[11px] font-bold text-[#006B5B] hover:underline"
              >
                전체보기
              </button>
            </div>

            <div className="space-y-2">
              {policies.slice(0, 2).map((p) => {
                const status = policyStatus[p.eligibility];
                return (
                <div key={p.id} className="p-2.5 rounded-xl bg-[#F6F9F8] border border-[#DCE7E4] text-xs">
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-[#142B29] truncate max-w-[150px]">{p.name}</span>
                    <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold ${status.className}`}>
                      {status.label}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-[#526562]">
                    <span>월 최대 {p.maxMonthlyDeposit.toLocaleString()}원</span>
                    <span className="font-bold text-[#006B5B]">최고 {p.maxRate}%</span>
                  </div>
                </div>
                );
              })}
            </div>
          </div>

          {/* 수집 설정 및 모의 계약 상태 */}
          <div className="bg-[#F6F9F8] rounded-2xl border border-[#DCE7E4] p-5 text-xs space-y-2">
            <div className="flex items-center justify-between text-[#142B29] font-bold">
              <span className="flex items-center">
                <ShieldCheck className="w-4 h-4 mr-1 text-[#006B5B]" />
                데이터 점검 설정
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] bg-[#EAFBF6] text-[#006B5B]">
                {consent.status === "ACTIVE" ? "동의 중" : "수집 중지"}
              </span>
            </div>
            <p className="text-[11px] text-[#526562] leading-relaxed">
              정기 수집 주기: <strong>매월 {consent.anchorDay}일 (월 1회)</strong>
              <br />
              실시간 상시 감시가 아니며, 사용자 승인 없이 실제 계좌 출금이 발생하지 않는 순수 시뮬레이션입니다.
            </p>
            <div className="pt-1">
              <button
                onClick={() => setActiveTab("history")}
                className="text-[11px] font-bold text-[#006B5B] hover:underline flex items-center"
              >
                <History className="w-3 h-3 mr-1" />
                변경 내역 확인
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
