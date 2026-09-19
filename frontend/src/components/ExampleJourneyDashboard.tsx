import React, { useState } from "react";
import { ArrowLeft, CalendarDays, Check, ChevronRight, Home, ShieldCheck, Sparkles, TrendingUp, WalletCards } from "lucide-react";

const stages = [
  { month: 0, label: "가입", title: "3분 재무진단", summary: "월 저축 여력 55만원을 확인하고 구독 해지·리볼빙 상환 계획을 세웠어요.", amount: 550000, progress: 0, action: "최근 거래 진단 완료" },
  { month: 1, label: "1개월", title: "포트폴리오 실행", summary: "월세지원 반영 후 월 85만원을 네 가지 목표로 나눴어요.", amount: 850000, progress: 3, action: "모의 자동이체 승인" },
  { month: 7, label: "7개월", title: "급여 20만원 인상", summary: "증가분 중 12만원을 정부기여금이 붙는 청년도약계좌에 더 배분했어요.", amount: 970000, progress: 28, action: "증액안 확인" },
  { month: 11, label: "11개월", title: "중도해지 방어", summary: "급전이 필요해진 상황에서 해지 손실과 예·적금 담보대출 대안을 비교했어요.", amount: 970000, progress: 44, action: "대안 비교" },
  { month: 15, label: "15개월", title: "신규 정책 발견", summary: "대구시 신규 청년 사업의 합성 자격 조건을 확인하고 신청 기간을 안내했어요.", amount: 970000, progress: 61, action: "지원제도 확인" },
  { month: 21, label: "21개월", title: "만기 전 준비", summary: "적금 만기 30일 전에 전세자금대출 조건과 모의 영업점 상담을 안내했어요.", amount: 970000, progress: 87, action: "상담 준비" },
  { month: 24, label: "24개월", title: "전세 입주·다음 목표", summary: "보증금 목표를 달성하고 사라진 월세를 결혼자금 적립으로 전환했어요.", amount: 450000, progress: 100, action: "다음 목표 시작" },
];

const allocations = [
  { label: "비상자금", amount: 100000, color: "bg-[#00C4A6]" },
  { label: "목표 적금", amount: 450000, color: "bg-[#7CB5FF]" },
  { label: "청년도약계좌", amount: 200000, color: "bg-[#D1B5FE]" },
  { label: "청약", amount: 100000, color: "bg-[#E0EE5F]" },
];

export const ExampleJourneyDashboard: React.FC = () => {
  const [selectedMonth, setSelectedMonth] = useState(1);
  const stage = stages.find((item) => item.month === selectedMonth) ?? stages[1];

  return (
    <div className="min-h-screen bg-[#F6F9F8] text-[#142B29]">
      <header className="border-b border-[#DCE7E4] bg-white">
        <div className="mx-auto flex min-h-[72px] max-w-[1200px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#00C4A6] text-lg font-black">iM</div>
            <div>
              <div className="flex items-center gap-2"><strong>iM 이룸</strong><span className="rounded-full bg-[#F5EFFF] px-2 py-0.5 text-[10px] font-bold text-[#6842a6]">적용 예시 모드</span></div>
              <p className="text-[11px] text-[#526562]">최종기획서의 2년 관리 과정을 한 화면에서 확인합니다</p>
            </div>
          </div>
          <a href="/" className="inline-flex items-center gap-1 rounded-xl border border-[#DCE7E4] px-3 py-2 text-xs font-bold text-[#526562] hover:bg-[#F6F9F8]"><ArrowLeft className="h-4 w-4" />서비스로 돌아가기</a>
        </div>
      </header>

      <main className="mx-auto max-w-[1200px] space-y-6 px-4 py-7 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-3xl bg-[#103D36] p-6 text-white sm:p-8">
          <div className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr] lg:items-end">
            <div>
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-bold text-[#52E1E5]"><Sparkles className="h-4 w-4" />합성 고객 여정</div>
              <h1 className="text-2xl font-extrabold sm:text-4xl">전세 보증금 3,000만원,<br />24개월 동안 함께 관리했어요.</h1>
              <p className="mt-4 max-w-2xl text-sm leading-relaxed text-slate-200">대구 거주 만 28세 · 세후 월 260만원 · 최근 거래 기반 진단 · 모든 금액과 시점은 서비스 구조 설명을 위한 합성 예시입니다.</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-5">
              <div className="flex justify-between text-xs text-slate-300"><span>보증금 목표 진행률</span><strong className="text-white">{stage.progress}%</strong></div>
              <div className="mt-3 h-3 overflow-hidden rounded-full bg-white/15"><div className="h-full rounded-full bg-[#00C4A6] transition-all duration-500" style={{ width: `${stage.progress}%` }} /></div>
              <div className="mt-3 flex items-end justify-between"><span className="text-xs text-slate-300">현재 선택 시점</span><strong className="text-xl">{stage.label}</strong></div>
            </div>
          </div>
        </section>

        <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: WalletCards, label: "세후 월소득", value: "260만원", note: "가입 기준" },
            { icon: TrendingUp, label: "최초 저축 여력", value: "55만원", note: "누수 정리 전" },
            { icon: ShieldCheck, label: "실행 포트폴리오", value: "85만원", note: "월세지원·누수 정리 반영" },
            { icon: Home, label: "최종 목표", value: "3,000만원", note: "전세 보증금" },
          ].map(({ icon: Icon, label, value, note }) => <div key={label} className="rounded-2xl border border-[#DCE7E4] bg-white p-5"><Icon className="h-5 w-5 text-[#006B5B]" /><span className="mt-4 block text-xs text-[#526562]">{label}</span><strong className="mt-1 block text-2xl tabular-nums">{value}</strong><span className="mt-1 block text-[11px] text-[#526562]">{note}</span></div>)}
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.35fr]">
          <div className="rounded-2xl border border-[#DCE7E4] bg-white p-5 sm:p-6">
            <p className="text-xs font-bold text-[#006B5B]">1개월차 승인 계획</p>
            <h2 className="mt-1 text-xl font-bold">월 85만원 배분</h2>
            <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-[#F6F9F8]">{allocations.map((item) => <div key={item.label} className={item.color} style={{ width: `${(item.amount / 850000) * 100}%` }} />)}</div>
            <div className="mt-5 space-y-3">{allocations.map((item) => <div key={item.label} className="flex items-center justify-between text-sm"><span className="flex items-center gap-2"><i className={`h-2.5 w-2.5 rounded-full ${item.color}`} />{item.label}</span><strong className="tabular-nums">{item.amount.toLocaleString()}원</strong></div>)}</div>
            <div className="mt-5 rounded-xl bg-[#EAFBF6] p-4 text-xs leading-relaxed text-[#006B5B]">추천 근거: 비상자금을 먼저 확보하고, 정부 지원 상품·청약·보증금 목표를 한도와 우선순위 안에서 배분한 합성 계획입니다.</div>
          </div>

          <div className="rounded-2xl border border-[#DCE7E4] bg-white p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold text-[#006B5B]">선택한 시점의 관리 내용</p><h2 className="mt-1 text-xl font-bold">{stage.title}</h2></div><span className="rounded-full bg-[#EAFBF6] px-3 py-1 text-xs font-bold text-[#006B5B]">{stage.label}</span></div>
            <p className="mt-4 text-sm leading-relaxed text-[#526562]">{stage.summary}</p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2"><div className="rounded-xl bg-[#F6F9F8] p-4"><span className="text-xs text-[#526562]">월 관리 금액</span><strong className="mt-1 block text-2xl tabular-nums">{stage.amount.toLocaleString()}원</strong></div><div className="rounded-xl bg-[#F6F9F8] p-4"><span className="text-xs text-[#526562]">다음 행동</span><strong className="mt-1 block text-base">{stage.action}</strong></div></div>
            <div className="mt-5 flex items-center gap-2 rounded-xl border border-[#DCE7E4] p-4 text-xs text-[#526562]"><Check className="h-4 w-4 shrink-0 text-[#00C4A6]" />계산 결과와 사용자 선택은 다음 월 점검 기준으로 저장되는 흐름을 재현합니다.</div>
          </div>
        </section>

        <section className="rounded-2xl border border-[#DCE7E4] bg-white p-5 sm:p-6">
          <div className="flex items-center gap-2"><CalendarDays className="h-5 w-5 text-[#006B5B]" /><h2 className="text-lg font-bold">2년 관리 타임라인</h2></div>
          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">{stages.map((item) => <button key={item.month} onClick={() => setSelectedMonth(item.month)} aria-pressed={selectedMonth === item.month} className={`rounded-xl border p-3 text-left transition-all ${selectedMonth === item.month ? "border-[#00C4A6] bg-[#EAFBF6]" : "border-[#DCE7E4] hover:border-[#00C4A6]"}`}><span className="text-[11px] font-bold text-[#006B5B]">{item.label}</span><span className="mt-1 block text-xs font-semibold leading-snug">{item.title}</span><ChevronRight className="mt-2 h-3.5 w-3.5 text-[#526562]" /></button>)}</div>
        </section>
      </main>

      <footer className="border-t border-[#DCE7E4] bg-white px-4 py-6 text-center text-xs text-[#526562]">가상 데이터 기반 적용 예시 · 실제 금융 거래, 상품 가입, 상담 예약 없음</footer>
    </div>
  );
};
