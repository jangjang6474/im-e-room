import React, { useState } from "react";
import { useEroom } from "../../context/EroomContext";
import { Goal } from "../../types";
import {
  Target,
  Plus,
  ShieldCheck,
  Calendar,
  AlertCircle,
  Coins,
  CheckCircle,
  Clock,
  X,
} from "lucide-react";

export const GoalsTab: React.FC = () => {
  const { goals, activePlan, snapshot, updateGoals, applyScenario } = useEroom();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newAmount, setNewAmount] = useState<number>(3000000);
  const [newMonths, setNewMonths] = useState<number>(12);
  const [newPriority, setNewPriority] = useState<number>(5);

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle) return;

    const newGoal: Goal = {
      id: `goal-custom-${Date.now()}`,
      title: newTitle,
      category: "WEALTH_BUILDING",
      targetAmount: newAmount,
      currentAmount: 0,
      targetMonths: newMonths,
      priority: newPriority,
    };

    updateGoals([...goals, newGoal]);
    setIsModalOpen(false);
    setNewTitle("");
  };

  const totalMonthlySavings = activePlan.totalMonthlySavings;

  return (
    <div id="goals-tab" className="space-y-6">
      {/* 상단 요약 배너 */}
      <div className="bg-white rounded-2xl border border-[#DCE7E4] p-6 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[#006B5B] text-xs font-bold mb-1">
            <Target className="w-4 h-4" />
            <span>청년 다중 목표 포트폴리오 배분 엔진</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#142B29]">
            현재 활성 계획 ({activePlan.version}) 배분 현황
          </h2>
          <p className="text-xs text-[#526562] mt-1 max-w-2xl leading-relaxed">
            결정적 알고리즘이 우선순위와 정책 상품 한도(청년도약계좌 등)를 검증하여 월 가용 여력({snapshot.availableSurplus.toLocaleString()}원) 내에서 100% 자동 배분했습니다.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <div className="bg-[#F6F9F8] border border-[#DCE7E4] rounded-xl p-3 text-right">
            <span className="text-[11px] text-[#526562] block">계획 총 월 저축액</span>
            <span className="text-xl font-black text-[#006B5B] font-mono tabular-nums">
              {totalMonthlySavings.toLocaleString()}원
            </span>
          </div>

          <button
            id="btn-add-goal"
            onClick={() => setIsModalOpen(true)}
            className="flex items-center px-4 py-2.5 bg-[#00C4A6] hover:bg-[#00b095] text-[#142B29] rounded-xl text-xs font-bold transition-colors shadow-xs"
          >
            <Plus className="w-4 h-4 mr-1.5" />
            새 목표 추가
          </button>
        </div>
      </div>

      {/* 제약조건 검증 및 경고 바 */}
      {activePlan.deficitsNotice && (
        <div className="p-4 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start space-x-2.5">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <span className="font-bold block">배분 제약조건 알림:</span>
            {activePlan.deficitsNotice}
          </div>
        </div>
      )}

      {/* 목표 리스트 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {goals.map((g) => {
          const allocation = activePlan.items.find((item) => item.goalId === g.id);
          const monthly = allocation ? allocation.monthlyAmount : 0;
          const completion = allocation ? allocation.expectedCompletionMonths : 999;
          const percent = Math.min(100, Math.round((g.currentAmount / g.targetAmount) * 100));

          return (
            <div
              key={g.id}
              className="bg-white rounded-2xl border border-[#DCE7E4] p-5 shadow-2xs hover:border-[#00C4A6] transition-colors flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-[#F6F9F8] text-[#142B29] border border-[#DCE7E4]">
                      우선순위 #{g.priority}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[11px] font-medium bg-[#EAFBF6] text-[#006B5B]">
                      {g.category === "EMERGENCY"
                        ? "비상금"
                        : g.category === "POLICY_SAVINGS"
                        ? "정책 매칭 적금"
                        : g.category === "HOUSING_SUBSCRIPTION"
                        ? "주택 청약"
                        : "목돈 만들기"}
                    </span>
                  </div>
                  <span className="text-xs font-semibold text-[#526562] flex items-center">
                    <Clock className="w-3.5 h-3.5 mr-1" />
                    목표 {g.targetMonths}개월
                  </span>
                </div>

                <h3 className="text-base font-bold text-[#142B29] mb-1">{g.title}</h3>

                {allocation && (
                  <div className="text-xs text-[#006B5B] font-medium mb-3 flex items-center">
                    <Coins className="w-3.5 h-3.5 mr-1" />
                    연계 상품: {allocation.productName}
                  </div>
                )}

                {/* 프로그레스 바 */}
                <div className="w-full bg-[#F6F9F8] rounded-full h-2.5 mb-1.5 overflow-hidden border border-[#DCE7E4]/50">
                  <div
                    className="bg-[#00C4A6] h-full rounded-full transition-all duration-300"
                    style={{ width: `${percent}%` }}
                  />
                </div>

                <div className="flex justify-between text-xs text-[#526562] mb-4">
                  <span>
                    현재: <strong className="font-mono text-[#142B29]">{g.currentAmount.toLocaleString()}원</strong> ({percent}%)
                  </span>
                  <span>
                    목표: <strong className="font-mono text-[#142B29]">{g.targetAmount.toLocaleString()}원</strong>
                  </span>
                </div>
              </div>

              {/* 하단 월 납입 결과 */}
              <div className="pt-3 border-t border-[#DCE7E4] flex items-center justify-between">
                <div>
                  <span className="text-[11px] text-[#526562] block">월 추천 배분 납입액</span>
                  <span className="text-sm font-bold text-[#142B29] font-mono tabular-nums">
                    {monthly > 0 ? `${monthly.toLocaleString()}원 / 월` : "납입 일시 유예 (여력 부족)"}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] text-[#526562] block">예상 달성 소요</span>
                  <span className="text-xs font-bold text-[#006B5B]">
                    {completion < 900 ? `약 ${completion}개월 후` : "여력 초과 (달성 불가)"}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* 새 목표 추가 모달 */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-[#DCE7E4] space-y-4">
            <div className="flex items-center justify-between border-b border-[#DCE7E4] pb-3">
              <h3 className="text-base font-bold text-[#142B29]">새 청년 목표 추가하기</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddGoal} className="space-y-3.5 text-xs">
              <div>
                <label className="font-bold text-[#142B29] block mb-1">목표명</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="예: 취업 준비 자격증 취득 비용, 독립 이사비"
                  className="w-full p-2.5 rounded-xl border border-[#DCE7E4] text-[#142B29] focus:outline-none focus:border-[#00C4A6]"
                  required
                />
              </div>

              <div>
                <label className="font-bold text-[#142B29] block mb-1">목표 금액 (KRW)</label>
                <input
                  type="number"
                  step="100000"
                  value={newAmount}
                  onChange={(e) => setNewAmount(Number(e.target.value))}
                  className="w-full p-2.5 rounded-xl border border-[#DCE7E4] text-[#142B29] font-mono focus:outline-none focus:border-[#00C4A6]"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-bold text-[#142B29] block mb-1">목표 달성 기간 (개월)</label>
                  <input
                    type="number"
                    value={newMonths}
                    onChange={(e) => setNewMonths(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-[#DCE7E4] text-[#142B29] font-mono focus:outline-none focus:border-[#00C4A6]"
                    required
                  />
                </div>
                <div>
                  <label className="font-bold text-[#142B29] block mb-1">우선순위 (1~10)</label>
                  <input
                    type="number"
                    min="1"
                    max="10"
                    value={newPriority}
                    onChange={(e) => setNewPriority(Number(e.target.value))}
                    className="w-full p-2.5 rounded-xl border border-[#DCE7E4] text-[#142B29] font-mono focus:outline-none focus:border-[#00C4A6]"
                    required
                  />
                </div>
              </div>

              <div className="pt-3 flex space-x-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl border border-[#DCE7E4] text-[#526562] font-semibold hover:bg-slate-50"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="flex-1 py-2.5 rounded-xl bg-[#00C4A6] hover:bg-[#00b095] text-[#142B29] font-bold shadow-xs"
                >
                  목표 등록 및 재배분
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
