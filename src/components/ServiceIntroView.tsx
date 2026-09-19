import React from "react";
import { useEroom } from "../context/EroomContext";
import {
  Activity,
  Target,
  FileText,
  GitCompare,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  Calendar,
  Sparkles,
  TrendingUp,
  AlertCircle,
  Clock,
  Headphones,
  Info,
  ChevronRight,
} from "lucide-react";

export const ServiceIntroView: React.FC = () => {
  const {
    setViewMode,
    setActiveTab,
    applyScenario,
    customer,
    snapshot,
    goals,
    policies,
    activePlan,
    consent,
  } = useEroom();
  const isDemoMode = new URLSearchParams(window.location.search).get("demo") === "true";

  const primaryGoal = goals.find((goal) => goal.priority === 1) ?? goals[0];
  const primaryGoalPercent = primaryGoal
    ? Math.min(100, Math.round((primaryGoal.currentAmount / primaryGoal.targetAmount) * 100))
    : 0;
  const totalExpenses = snapshot.fixedExpenses + snapshot.variableExpenses + snapshot.debtPayment;

  const handleStartDemo = (tab?: "diagnostics" | "goals" | "replan" | "policies") => {
    setViewMode("youth");
    if (tab) setActiveTab(tab);
  };

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div id="service-intro-view" className="space-y-16 pb-12">
      {/* 1. 중앙 히어로 섹션 (5.2 히어로) */}
      <section className="text-center pt-8 sm:pt-14 pb-8 max-w-[1120px] mx-auto px-4">
        {/* 서브 레이블 */}
        <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-[#EAFBF6] border border-[#DCE7E4] text-[#006B5B] text-xs font-bold mb-6">
          <Sparkles className="w-3.5 h-3.5 text-[#00C4A6]" />
          <span>나의 목표를 이어가는 월간 재무관리</span>
        </div>

        {/* 메인 헤드라인 */}
        <h1 className="text-3xl sm:text-5xl lg:text-[56px] font-extrabold text-[#142B29] tracking-tight leading-[1.2] max-w-[760px] mx-auto">
          목표를 세우고,
          <br />
          이룰 때까지 함께.
        </h1>

        {/* 보조 설명 */}
        <p className="mt-5 text-base sm:text-lg text-[#526562] max-w-[560px] mx-auto leading-relaxed">
          매달 달라진 재무 상황을 살피고,
          <br className="hidden sm:inline" />
          내 목표에 맞는 저축 계획을 다시 제안해요.
        </p>

        {/* CTA 버튼 그룹 */}
        <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
          <button
            id="hero-start-demo-btn"
            onClick={() => handleStartDemo("diagnostics")}
            className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-[#00C4A6] hover:bg-[#00b095] text-[#142B29] font-bold text-base shadow-[0_4px_16px_rgba(0,196,166,0.25)] transition-all flex items-center justify-center space-x-2"
          >
            <span>가상 고객으로 체험하기</span>
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            id="hero-view-flow-btn"
            onClick={() => scrollToSection("panels-section")}
            className="w-full sm:w-auto px-6 py-3.5 rounded-xl bg-white hover:bg-slate-50 border border-[#DCE7E4] text-[#142B29] font-bold text-sm transition-colors"
          >
            월간 관리 방식 보기
          </button>
        </div>

        {/* 가상 데이터 고지문 */}
        <div className="mt-4 flex items-center justify-center text-xs text-[#526562]">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-[#00C4A6] mr-2" />
          가상 데이터 기반 체험 · 실제 금융 거래 없음
        </div>

        {/* 히어로 실제 제품 미리보기 카드 (목표 진행 화면 미리보기) */}
        <div className="mt-12 max-w-[880px] mx-auto bg-white rounded-2xl border border-[#DCE7E4] p-6 sm:p-8 shadow-[0_8px_32px_rgba(20,43,41,0.06)] text-left">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 border-b border-[#DCE7E4] gap-2">
            <div>
              <span className="text-xs font-semibold text-[#526562]">현재 월간 점검 상태</span>
              <h3 className="text-lg font-bold text-[#142B29] flex items-center">
                {customer.name}님의 월간 재무 점검
                <span className="ml-2 px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#EAFBF6] text-[#006B5B] border border-[#DCE7E4]">
                  정상 유지 중
                </span>
              </h3>
            </div>
            <div className="text-xs text-[#526562] sm:text-right">
              <div>데이터 기준일: <span className="font-mono font-medium">{snapshot.asOf.replaceAll("-", ".")}</span></div>
              <div>다음 정기 점검: <span className="font-mono font-bold text-[#006B5B]">{consent.nextScheduledCollection.split("T")[0].replaceAll("-", ".")} (월 1회)</span></div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {/* 핵심 목표 카드 (연한 민트 배경) */}
            <div className="md:col-span-2 p-5 rounded-xl bg-[#EAFBF6] border border-[#DCE7E4] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-0.5 rounded-md text-[11px] font-bold bg-[#006B5B] text-white">
                    최우선 목표
                  </span>
                  <span className="text-sm font-bold text-[#142B29]">{primaryGoal?.title}</span>
                </div>
                <span className="text-xs font-bold text-[#006B5B]">{primaryGoalPercent}% 달성</span>
              </div>
              <div className="w-full h-2.5 bg-white/80 rounded-full overflow-hidden">
                <div className="h-full bg-[#00C4A6] rounded-full transition-all duration-500" style={{ width: `${primaryGoalPercent}%` }} />
              </div>
              <div className="flex justify-between items-center text-xs text-[#526562]">
                <span>현재 적립: <strong className="text-[#142B29] tabular-nums font-mono">{primaryGoal?.currentAmount.toLocaleString()}원</strong></span>
                <span>목표: <strong className="text-[#142B29] tabular-nums font-mono">{primaryGoal?.targetAmount.toLocaleString()}원</strong> ({primaryGoal?.targetMonths}개월)</span>
              </div>
            </div>

            {/* 이번 달 가용 여력 */}
            <div className="p-5 rounded-xl bg-[#F6F9F8] border border-[#DCE7E4] flex flex-col justify-between">
              <div>
                <span className="text-xs text-[#526562] block">월 가용 저축 여력</span>
                <span className="text-2xl font-extrabold text-[#142B29] font-mono tabular-nums mt-1 block">
                  {snapshot.availableSurplus.toLocaleString()}원
                </span>
              </div>
              <div className="text-[11px] text-[#006B5B] bg-white p-2 rounded-lg border border-[#DCE7E4] mt-3">
                소득 {snapshot.monthlyIncome.toLocaleString()}원에서 총지출 {totalExpenses.toLocaleString()}원을 제외했어요.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. 핵심 기능 바로가기 4개 (5.3 핵심 기능 바로가기) */}
      <section className="max-w-[1120px] mx-auto px-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            {
              id: "panel-01",
              tab: "diagnostics" as const,
              title: "재무진단",
              desc: "소득·지출·여력 자동 분석",
              icon: Activity,
              color: "text-[#006B5B] bg-[#EAFBF6]",
            },
            {
              id: "panel-02",
              tab: "goals" as const,
              title: "목표별 계획",
              desc: "비상금·지원제도 최적 배분",
              icon: Target,
              color: "text-[#4d6300] bg-[#F6FADC]",
            },
            {
              id: "panel-03",
              tab: "policies" as const,
              title: "지원제도 확인",
              desc: "청년도약·희망적금 자격 진단",
              icon: FileText,
              color: "text-[#1d4ed8] bg-[#EEF5FF]",
            },
            {
              id: "panel-04",
              tab: "replan" as const,
              title: "월간 재설계",
              desc: "변화 감지 시 새 계획 비교",
              icon: GitCompare,
              color: "text-[#6b21a8] bg-[#F5EFFF]",
            },
          ].map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.id}
                onClick={() => handleStartDemo(item.tab)}
                className="p-5 rounded-2xl bg-white border border-[#DCE7E4] hover:border-[#00C4A6] hover:shadow-[0_4px_20px_rgba(20,43,41,0.06)] transition-all text-left flex flex-col justify-between group"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${item.color}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-[#142B29] group-hover:text-[#006B5B] transition-colors flex items-center justify-between">
                    <span>{item.title}</span>
                    <ChevronRight className="w-4 h-4 text-[#526562] group-hover:translate-x-1 transition-transform" />
                  </h3>
                  <p className="text-xs text-[#526562] mt-1">{item.desc}</p>
                </div>
              </button>
            );
          })}
        </div>
      </section>

      {/* 3. 대형 기능 패널 4개 (5.4 대형 기능 패널) */}
      <section id="panels-section" className="max-w-[1120px] mx-auto px-4 space-y-8">
        {/* 패널 01: 재무진단 (panel-mint #EAFBF6) */}
        <div className="p-8 sm:p-12 rounded-[24px] bg-[#EAFBF6] border border-[#DCE7E4] space-y-6">
          <div className="max-w-2xl">
            <span className="text-xs font-bold text-[#006B5B] tracking-wider uppercase">01 · 재무진단</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#142B29] mt-1">
              내 돈의 흐름부터, 차근차근
            </h2>
            <p className="text-sm sm:text-base text-[#526562] mt-2 leading-relaxed">
              마이데이터 형식으로 재현한 합성 계좌에서 대체 이체를 지출에서 제외해 이중 집계를 막습니다. 실소득에서 고정비·변동비·부채 상환을 차감해 월 저축 가능 금액을 계산해요.
            </p>
          </div>

          {/* 실제 UI 미리보기 컴포넌트 */}
          <div className="bg-white rounded-2xl border border-[#DCE7E4] p-6 shadow-[0_8px_32px_rgba(20,43,41,0.06)]">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-[#F6F9F8] border border-[#DCE7E4]">
                <span className="text-xs text-[#526562] block">월 실소득</span>
                <span className="text-xl font-extrabold text-[#142B29] font-mono tabular-nums mt-1 block">
                  {snapshot.monthlyIncome.toLocaleString()}원
                </span>
                <span className="text-[11px] text-[#526562] mt-1 block">급여 이체 1건 (내부 이체 제외)</span>
              </div>
              <div className="p-4 rounded-xl bg-[#F6F9F8] border border-[#DCE7E4]">
                <span className="text-xs text-[#526562] block">월 총 지출 (고정+변동+부채)</span>
                <span className="text-xl font-extrabold text-[#142B29] font-mono tabular-nums mt-1 block">
                  {(snapshot.fixedExpenses + snapshot.variableExpenses + snapshot.debtPayment).toLocaleString()}원
                </span>
                <span className="text-[11px] text-[#526562] mt-1 block">월세 50만 + 공과금 등 25만 + 생활비</span>
              </div>
              <div className="p-4 rounded-xl bg-[#EAFBF6] border border-[#DCE7E4]">
                <span className="text-xs font-bold text-[#006B5B] block">월 가용 저축 가능 금액</span>
                <span className="text-2xl font-black text-[#006B5B] font-mono tabular-nums mt-1 block">
                  {snapshot.availableSurplus.toLocaleString()}원
                </span>
                <span className="text-[11px] font-medium text-[#006B5B] mt-1 block">가용 여력을 넘지 않는 계획 수립</span>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-[#DCE7E4] flex items-center justify-between">
              <span className="text-xs text-[#526562]">
                비상예비자금 보유: <strong className="text-[#142B29] font-mono">{snapshot.emergencyFundBalance.toLocaleString()}원</strong> (권장 3개월치의 85%)
              </span>
              <button
                onClick={() => handleStartDemo("diagnostics")}
                className="text-xs font-bold text-[#006B5B] hover:underline flex items-center"
              >
                진단 화면 직접 보기 <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </button>
            </div>
          </div>
        </div>

        {/* 패널 02: 목표 계획 (panel-lime #F6FADC) */}
        <div className="p-8 sm:p-12 rounded-[24px] bg-[#F6FADC] border border-[#e2e8b6] space-y-6">
          <div className="max-w-2xl">
            <span className="text-xs font-bold text-[#4d6300] tracking-wider uppercase">02 · 목표 계획</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#142B29] mt-1">
              목표에 맞춰, 얼마씩 모을지
            </h2>
            <p className="text-sm sm:text-base text-[#526562] mt-2 leading-relaxed">
              우선순위에 따라 비상예비자금을 채우고, 청년 특화 고금리 정책상품(청년도약계좌, 대구 청년희망적금 등)을 한도 내에서 우선 배분합니다. 무리한 계획 대신 실현 가능한 저축 포트폴리오를 구성해요.
            </p>
          </div>

          {/* 실제 UI 미리보기 컴포넌트 */}
          <div className="bg-white rounded-2xl border border-[#DCE7E4] p-6 shadow-[0_8px_32px_rgba(20,43,41,0.06)] space-y-4">
            <div className="flex items-center justify-between text-xs pb-3 border-b border-[#DCE7E4]">
              <span className="font-bold text-[#142B29]">현재 적용 중인 배분 계획</span>
              <span className="text-[#526562]">총 월 배분액: <strong className="text-[#142B29] font-mono">{activePlan.totalMonthlySavings.toLocaleString()}원</strong></span>
            </div>

            <div className="space-y-3">
              {activePlan.items.map((item, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-[#F6F9F8] border border-[#DCE7E4] text-xs">
                  <div className="flex items-center space-x-2">
                    <span className="w-5 h-5 rounded-full bg-[#142B29] text-white flex items-center justify-center font-bold text-[10px]">
                      {idx + 1}
                    </span>
                    <div>
                      <strong className="text-[#142B29] block">{item.goalTitle}</strong>
                      <span className="text-[#526562] text-[11px]">{item.productName}</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono font-bold text-sm text-[#142B29] block">
                      월 {item.monthlyAmount.toLocaleString()}원
                    </span>
                    <span className="text-[11px] text-[#526562]">예상 소요: {item.monthlyAmount === 0 || item.expectedCompletionMonths >= 900 ? "납입 대기" : `${item.expectedCompletionMonths}개월`}</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => handleStartDemo("goals")}
                className="text-xs font-bold text-[#006B5B] hover:underline flex items-center"
              >
                목표 포트폴리오 살펴보기 <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </button>
            </div>
          </div>
        </div>

        {/* 패널 03: 지원제도 안내 (panel-sky #EEF5FF) */}
        <div className="p-8 sm:p-12 rounded-[24px] bg-[#EEF5FF] border border-[#d6e4fd] space-y-6">
          <div className="max-w-2xl">
            <span className="text-xs font-bold text-[#1d4ed8] tracking-wider uppercase">03 · 지원제도 확인</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#142B29] mt-1">
              놓치기 쉬운 지원제도도 함께
            </h2>
            <p className="text-sm sm:text-base text-[#526562] mt-2 leading-relaxed">
              공식 고시 기준일과 약관에 기반하여 연령·거주지·소득 요건 적격 여부를 자동 평가합니다. '자격 충족'과 '증빙 확인 필요'를 투명하게 구분하여 청년 혜택을 놓치지 않도록 안내합니다.
            </p>
          </div>

          {/* 실제 UI 미리보기 컴포넌트 */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {policies.slice(0, 2).map((policy) => {
              const isEligible = policy.eligibility === "ELIGIBLE";
              return (
                <div key={policy.id} className="bg-white rounded-2xl border border-[#DCE7E4] p-5 shadow-[0_8px_32px_rgba(20,43,41,0.06)] flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[11px] text-[#526562]">{policy.provider}</span>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                        isEligible ? "bg-[#EAFBF6] text-[#006B5B] border border-[#DCE7E4]" : "bg-amber-50 text-amber-800 border border-amber-200"
                      }`}>
                        {isEligible ? "자격 충족 (적격)" : "증빙 확인 필요"}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-[#142B29]">{policy.name}</h3>
                    <p className="text-xs text-[#526562] mt-1 leading-relaxed">{policy.eligibilityReason}</p>
                  </div>
                  <div className="mt-4 pt-3 border-t border-[#DCE7E4] flex items-center justify-between text-xs">
                    <span className="text-[#526562]">월 최대 한도: <strong className="text-[#142B29] font-mono">{policy.maxMonthlyDeposit.toLocaleString()}원</strong></span>
                    <span className="font-bold text-[#006B5B]">최고 {policy.maxRate}%</span>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex justify-end">
            <button
              onClick={() => handleStartDemo("policies")}
              className="text-xs font-bold text-[#006B5B] hover:underline flex items-center"
            >
              전체 청년 지원제도 진단 센터 보기 <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
            </button>
          </div>
        </div>

        {/* 패널 04: 계획 재설계 (panel-lavender #F5EFFF) */}
        <div className="p-8 sm:p-12 rounded-[24px] bg-[#F5EFFF] border border-[#ebd9ff] space-y-6">
          <div className="max-w-2xl">
            <span className="text-xs font-bold text-[#6b21a8] tracking-wider uppercase">04 · 월간 재설계</span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#142B29] mt-1">
              상황이 바뀌면, 계획도 새롭게
            </h2>
            <p className="text-sm sm:text-base text-[#526562] mt-2 leading-relaxed">
              급여가 오르거나 지출이 달라졌을 때 기존 계획과 새 계획을 한눈에 비교해 드립니다. 사용자가 직접 승인하기 전에는 어떠한 금융 거래도 임의로 실행되지 않습니다.
            </p>
          </div>

          {/* 실제 UI 미리보기 컴포넌트 (비교표) */}
          <div className="bg-white rounded-2xl border border-[#DCE7E4] p-6 shadow-[0_8px_32px_rgba(20,43,41,0.06)] space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#DCE7E4]">
              <div>
                <span className="text-xs font-bold text-[#6b21a8] bg-purple-50 px-2.5 py-0.5 rounded-full border border-purple-200">
                  급여 인상 감지 예시
                </span>
                <h3 className="text-sm font-bold text-[#142B29] mt-1">소득 변화를 반영한 월 납입 계획 조정</h3>
              </div>
              <span className="text-xs text-[#526562]">현재 계획과 새 계획 비교</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F6F9F8] text-[#526562] border-b border-[#DCE7E4]">
                  <tr>
                    <th className="py-2.5 px-3 font-semibold">목표 및 배분 항목</th>
                    <th className="py-2.5 px-3 font-semibold text-right">기존 월 납입액</th>
                    <th className="py-2.5 px-3 font-semibold text-right">제안 월 납입액</th>
                    <th className="py-2.5 px-3 font-semibold text-right">변동 차이</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#DCE7E4]">
                  <tr className="bg-[#EAFBF6]/60">
                    <td className="py-2.5 px-3 font-bold text-[#142B29]">
                      청년 전세 보증금 마련 (비상금 충당)
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#526562]">200,000원</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-[#006B5B]">500,000원</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-[#006B5B]">+300,000원</td>
                  </tr>
                  <tr className="bg-[#EAFBF6]/60">
                    <td className="py-2.5 px-3 font-bold text-[#142B29]">
                      청년도약계좌 (정부기여금 매칭)
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#526562]">400,000원</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-[#006B5B]">700,000원</td>
                    <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-[#006B5B]">+300,000원</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <span className="text-[11px] text-[#526562]">
                승인한 계획만 한 번 실행되며 중복 요청은 자동으로 막아요.
              </span>
              <button
                onClick={() => {
                  if (isDemoMode) applyScenario("S03_SALARY_RISE");
                  handleStartDemo("replan");
                }}
                className="text-xs font-bold text-[#006B5B] hover:underline flex items-center"
              >
                {isDemoMode ? "재설계 비교 직접 체험하기" : "이번 달 점검 살펴보기"} <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* 4. 짙은 민트 강조 섹션 (5.5 짙은 민트 강조 섹션, dark-surface #103D36) */}
      <section className="max-w-[1120px] mx-auto px-4">
        <div className="p-8 sm:p-14 rounded-[28px] bg-[#103D36] text-white shadow-xl space-y-10">
          <div className="text-center max-w-2xl mx-auto">
            <span className="text-xs font-bold text-[#52E1E5] tracking-wider uppercase block mb-2">
              매달 이어지는 관리
            </span>
            <h2 className="text-2xl sm:text-4xl font-extrabold text-white tracking-tight">
              한 번의 계획을, 매달 이어지는 관리로.
            </h2>
            <p className="mt-3 text-sm sm:text-base text-slate-300 leading-relaxed">
              단발성 포트폴리오 추천에 그치지 않고, 매월 변화를 점검하여 달성할 때까지 함께합니다.
            </p>
          </div>

          {/* 5단계 가로 흐름 카드 */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3 text-xs">
            {[
              {
                step: "01",
                title: "모의 동의",
                desc: "수집 범위와 정기 일정 확인 (실제 개인정보 없음)",
              },
              {
                step: "02",
                title: "최초 진단",
                desc: "12개월 거래 내역 정규화 & 기준 재무 스냅샷 도출",
              },
              {
                step: "03",
                title: "매월 점검",
                desc: "동의일 기준 매월 1회 정기 수집 & 변화 감지",
              },
              {
                step: "04",
                title: "계획 제안",
                desc: "상황 변화 시 기존안 vs 새 조정안 투명 비교",
              },
              {
                step: "05",
                title: "승인 & 모의 실행",
                desc: "사용자가 직접 승인한 계획만 한 번 실행",
              },
            ].map((item, idx) => (
              <div
                key={item.step}
                className="p-4 rounded-xl bg-white/10 border border-white/15 backdrop-blur-xs flex flex-col justify-between hover:bg-white/15 transition-colors"
              >
                <div>
                  <span className="text-[#00C4A6] font-mono font-bold text-xs block mb-1">
                    단계 {item.step}
                  </span>
                  <strong className="text-sm text-white font-bold block mb-1">
                    {item.title}
                  </strong>
                  <p className="text-slate-300 text-[11px] leading-relaxed">
                    {item.desc}
                  </p>
                </div>
                {idx < 4 && (
                  <div className="hidden md:flex justify-end pt-2 text-[#00C4A6]">
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* 하단 순환 루프 표시 */}
          <div className="pt-4 border-t border-white/15 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-300 gap-2">
            <span className="flex items-center">
              <Clock className="w-4 h-4 mr-1.5 text-[#00C4A6]" />
              <strong>다음 점검으로 연결:</strong> 매월 1회 정기 수집일(15일)마다 재점검 루프가 가동됩니다.
            </span>
            <span className="text-slate-400 text-[11px]">
              * 실시간 상시 감시가 아닌 스케줄러 기반 정기 점검 규정 준수
            </span>
          </div>
        </div>
      </section>

      {/* 5. 시나리오 체험과 마무리 (5.6 시나리오 체험과 마무리) */}
      <section className={`${isDemoMode ? "" : "hidden"} max-w-[1120px] mx-auto px-4 space-y-8`}>
        <div className="text-center max-w-xl mx-auto">
          <h2 className="text-2xl sm:text-3xl font-bold text-[#142B29]">
            가상 고객 시나리오로 직접 확인해 보세요
          </h2>
          <p className="text-sm text-[#526562] mt-2">
            클릭 한 번으로 가상 재무 이벤트를 적용하고, 시스템이 어떻게 반응하는지 체험할 수 있습니다.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {/* 시나리오 1: 급여 인상 */}
          <div className="bg-white rounded-2xl border border-[#DCE7E4] p-6 shadow-[0_8px_32px_rgba(20,43,41,0.06)] flex flex-col justify-between hover:border-[#00C4A6] transition-all">
            <div>
              <div className="w-9 h-9 rounded-xl bg-[#EAFBF6] text-[#006B5B] flex items-center justify-center font-bold text-xs mb-3">
                <TrendingUp className="w-5 h-5 text-[#00C4A6]" />
              </div>
              <span className="text-[11px] font-bold text-[#006B5B]">시나리오 S03</span>
              <h3 className="text-base font-bold text-[#142B29] mt-0.5">
                급여가 늘었을 때
              </h3>
              <p className="text-xs text-[#526562] mt-2 leading-relaxed">
                승진 또는 이직으로 실소득이 260만 → 310만 원으로 증가한 상황. 목표별 납입액과 남겨 둘 생활 여유자금을 다시 비교합니다.
              </p>
            </div>
            <button
              onClick={() => {
                applyScenario("S03_SALARY_RISE");
                handleStartDemo("replan");
              }}
              className="mt-6 w-full py-2.5 rounded-xl bg-[#EAFBF6] hover:bg-[#00C4A6] text-[#006B5B] hover:text-[#142B29] font-bold text-xs transition-colors flex items-center justify-center space-x-1"
            >
              <span>급여 인상 시나리오 체험</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 시나리오 2: 여력 초과 목표 추가 */}
          <div className="bg-white rounded-2xl border border-[#DCE7E4] p-6 shadow-[0_8px_32px_rgba(20,43,41,0.06)] flex flex-col justify-between hover:border-[#00C4A6] transition-all">
            <div>
              <div className="w-9 h-9 rounded-xl bg-[#F6FADC] text-[#4d6300] flex items-center justify-center font-bold text-xs mb-3">
                <Target className="w-5 h-5 text-[#88a913]" />
              </div>
              <span className="text-[11px] font-bold text-[#4d6300]">시나리오 S06</span>
              <h3 className="text-base font-bold text-[#142B29] mt-0.5">
                지출이 달라지거나 목표를 추가할 때
              </h3>
              <p className="text-xs text-[#526562] mt-2 leading-relaxed">
                무리한 다중 목표 설정으로 가용 여력이 부족해진 상황. 임의로 실행하지 않고 우선순위 조정 또는 기간 연장 선택지를 제시합니다.
              </p>
            </div>
            <button
              onClick={() => {
                applyScenario("S06_OVER_BUDGET");
                handleStartDemo("goals");
              }}
              className="mt-6 w-full py-2.5 rounded-xl bg-[#F6FADC] hover:bg-[#E0EE5F] text-[#4d6300] hover:text-[#142B29] font-bold text-xs transition-colors flex items-center justify-center space-x-1"
            >
              <span>여력 초과 시나리오 체험</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* 시나리오 3: 소득 단절 및 상담사 개입 */}
          <div className="bg-white rounded-2xl border border-[#DCE7E4] p-6 shadow-[0_8px_32px_rgba(20,43,41,0.06)] flex flex-col justify-between hover:border-rose-300 transition-all">
            <div>
              <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs mb-3">
                <Headphones className="w-5 h-5" />
              </div>
              <span className="text-[11px] font-bold text-rose-700">시나리오 S04 (휴먼 개입)</span>
              <h3 className="text-base font-bold text-[#142B29] mt-0.5">
                상담이 필요할 때
              </h3>
              <p className="text-xs text-[#526562] mt-2 leading-relaxed">
                급여 미입금으로 소득 단절 위험이 발생한 상황. 자동화 제안을 멈추고 4대 근거 브리핑과 함께 전문 상담사 대기 큐로 안전하게 라우팅합니다.
              </p>
            </div>
            <button
              onClick={() => {
                applyScenario("S04_INCOME_STOP");
                setViewMode("consultant");
              }}
              className="mt-6 w-full py-2.5 rounded-xl bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white font-bold text-xs transition-colors flex items-center justify-center space-x-1"
            >
              <span>상담사 대시보드 체험</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* 최종 CTA 배너 */}
        <div className="p-8 sm:p-12 rounded-[24px] bg-[#EAFBF6] border border-[#DCE7E4] text-center space-y-4">
          <h3 className="text-xl sm:text-2xl font-extrabold text-[#142B29]">
            이번 달부터, 내 목표를 이어가 볼까요?
          </h3>
          <p className="text-xs sm:text-sm text-[#526562] max-w-md mx-auto">
            100% 완전 합성 데이터로 안전하게 동작하는 iM 이룸의 월간 적응형 재무관리를 지금 시작하세요.
          </p>
          <div className="pt-2">
            <button
              id="bottom-start-btn"
              onClick={() => handleStartDemo("diagnostics")}
              className="px-8 py-3.5 rounded-xl bg-[#00C4A6] hover:bg-[#00b095] text-[#142B29] font-bold text-sm sm:text-base shadow-[0_4px_16px_rgba(0,196,166,0.25)] transition-all inline-flex items-center space-x-2"
            >
              <span>가상 고객으로 시작하기</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>
    </div>
  );
};
