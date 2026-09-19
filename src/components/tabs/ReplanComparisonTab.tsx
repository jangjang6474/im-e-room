import React, { useState } from "react";
import { useEroom } from "../../context/EroomContext";
import {
  GitCompare,
  AlertTriangle,
  ArrowRight,
  CheckCircle2,
  XCircle,
  Sparkles,
  Info,
  ShieldAlert,
  Loader2,
  FileCheck,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export const ReplanComparisonTab: React.FC = () => {
  const isDemoMode = new URLSearchParams(window.location.search).get("demo") === "true";
  const {
    activePlan,
    proposedPlan,
    events,
    snapshot,
    approveProposedPlan,
    rejectProposedPlan,
    requestAiExplanation,
    isAiExplaining,
    applyScenario,
  } = useEroom();

  const [explanationMode, setExplanationMode] = useState<"rule" | "ai">("rule");
  const [isApproving, setIsApproving] = useState(false);
  const [showEvidence, setShowEvidence] = useState(false);

  // 최신 이벤트
  const latestEvent = events[0];

  const handleApprove = async () => {
    setIsApproving(true);
    await approveProposedPlan();
    setIsApproving(false);
  };

  if (!proposedPlan) {
    return (
      <div className="bg-white rounded-2xl border border-[#DCE7E4] p-10 text-center shadow-[0_4px_20px_rgba(20,43,41,0.04)] space-y-4">
        <div className="w-12 h-12 rounded-full bg-[#EAFBF6] flex items-center justify-center mx-auto text-[#006B5B]">
          <GitCompare className="w-6 h-6" />
        </div>
        <h3 className="text-lg font-bold text-[#142B29]">현재 대기 중인 신규 조정안이 없습니다</h3>
        <p className="text-xs text-[#526562] max-w-md mx-auto leading-relaxed">
          현재 계획이 안정적으로 유지되고 있습니다. 소득이나 지출이 달라지면 새로운 계획을 계산해 변경 전후를 보여드립니다.
        </p>
        <div className="pt-2">
          {isDemoMode && <button
            id="btn-replan-demo-s03"
            onClick={() => applyScenario("S03_SALARY_RISE")}
            className="px-4 py-2 bg-[#00C4A6] hover:bg-[#00b095] text-[#142B29] text-xs font-bold rounded-xl transition-colors shadow-xs"
          >
            [S03. 급여 인상 +30만원] 재설계 시연해보기
          </button>}
        </div>
      </div>
    );
  }

  const surplusDiff = proposedPlan.totalMonthlySavings - activePlan.totalMonthlySavings;

  return (
    <div id="replan-comparison-tab" className="space-y-6">
      {/* 1. 최상단 변화 감지 이유 헤더 (6.5 디자인 명세) */}
      <div className="bg-white rounded-2xl border border-[#DCE7E4] p-5 sm:p-6 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#DCE7E4] pb-3">
          <div className="flex items-center space-x-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-[#EAFBF6] text-[#006B5B] border border-[#DCE7E4]">
              이번 달에 달라진 점
            </span>
            {isDemoMode && <span className="text-xs text-[#526562] font-mono">규칙 버전: {latestEvent?.ruleVersion}</span>}
          </div>
          <div className="text-xs text-[#526562]">
            데이터 기준일: <strong className="text-[#142B29] font-mono">{snapshot.asOf}</strong>
          </div>
        </div>

        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-[#142B29]">
            {latestEvent?.title ? `${latestEvent.title}이 반영된 새 계획이에요` : "변화된 재무 상황이 반영된 새 계획이에요"}
          </h2>
          <p className="text-xs sm:text-sm text-[#526562] mt-1 leading-relaxed">
            {latestEvent?.message || "소득 또는 지출 변동에 따라 가용 여력을 재산정하고 목표별 납입액을 최적화했습니다."}
          </p>
        </div>

        {/* 근거 행: 이전 값, 현재 값, 적용 기간 */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
          <div className="p-2.5 rounded-xl bg-[#F6F9F8] border border-[#DCE7E4]">
            <span className="text-[#526562] block text-[11px]">변동 항목</span>
            <strong className="text-[#142B29]">{latestEvent?.metric || "월 실소득"}</strong>
          </div>
          <div className="p-2.5 rounded-xl bg-[#F6F9F8] border border-[#DCE7E4]">
            <span className="text-[#526562] block text-[11px]">이전 기준값</span>
            <span className="font-mono text-[#526562] line-through">{latestEvent?.oldValue || "2,500,000원"}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-[#EAFBF6] border border-[#DCE7E4]">
            <span className="text-[#006B5B] block text-[11px]">현재 감지값</span>
            <strong className="font-mono text-[#006B5B]">{latestEvent?.newValue || "3,100,000원"}</strong>
          </div>
          <div className="p-2.5 rounded-xl bg-[#F6F9F8] border border-[#DCE7E4]">
            <span className="text-[#526562] block text-[11px]">적용 대상</span>
            <strong className="text-[#142B29]">익월 모의 이체부터</strong>
          </div>
        </div>
      </div>

      {/* 2. 핵심 비교표: 변경된 행만 연한 민트(bg-[#EAFBF6]) 강조 */}
      <div className="bg-white rounded-2xl border border-[#DCE7E4] shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-[#DCE7E4] flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-[#F6F9F8]/50">
          <div>
            <h3 className="text-base font-bold text-[#142B29] flex items-center">
              <GitCompare className="w-4 h-4 mr-2 text-[#006B5B]" />
              현재 계획과 새 계획 비교
            </h3>
            <p className="text-xs text-[#526562] mt-0.5">
              변경된 항목만 민트색으로 강조 표시됩니다. 금액은 월 저축 가능 금액을 넘지 않도록 결정됩니다.
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs">
            <span className="text-[#526562]">총 저축액 차이:</span>
            <span className={`font-mono font-bold px-2 py-0.5 rounded-full ${
              surplusDiff >= 0
                ? "bg-[#EAFBF6] text-[#006B5B] border border-[#DCE7E4]"
                : "bg-rose-50 text-rose-800 border border-rose-200"
            }`}>
              {surplusDiff >= 0 ? `+${surplusDiff.toLocaleString()}원` : `${surplusDiff.toLocaleString()}원`}
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F6F9F8] text-[#526562] border-b border-[#DCE7E4] font-semibold">
              <tr>
                <th className="py-3 px-4">목표 및 연계 상품</th>
                <th className="py-3 px-4 text-right">현재 월 납입액</th>
                <th className="py-3 px-4 text-right">새 월 납입액</th>
                <th className="py-3 px-4 text-right">변동 차이</th>
                <th className="py-3 px-4 text-right">예상 달성 시점</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE7E4]">
              {proposedPlan.items.map((newItem) => {
                const oldItem = activePlan.items.find((i) => i.goalId === newItem.goalId);
                const oldMonthly = oldItem ? oldItem.monthlyAmount : 0;
                const diff = newItem.monthlyAmount - oldMonthly;
                const isChanged = diff !== 0;
                const oldCompletion = oldItem ? oldItem.expectedCompletionMonths : 999;
                const newCompletion = newItem.expectedCompletionMonths;

                return (
                  <tr
                    key={newItem.goalId}
                    className={`transition-colors ${
                      isChanged ? "bg-[#EAFBF6]/60 hover:bg-[#EAFBF6]" : "bg-white hover:bg-slate-50"
                    }`}
                  >
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-[#142B29]">{newItem.goalTitle}</div>
                      <div className="text-[11px] text-[#006B5B]">{newItem.productName}</div>
                    </td>
                    <td className="py-3.5 px-4 text-right text-[#526562] font-mono tabular-nums">
                      {oldMonthly > 0 ? `${oldMonthly.toLocaleString()}원` : "0원"}
                    </td>
                    <td className={`py-3.5 px-4 text-right font-mono tabular-nums font-bold ${
                      isChanged ? "text-[#006B5B]" : "text-[#142B29]"
                    }`}>
                      {newItem.monthlyAmount > 0 ? `${newItem.monthlyAmount.toLocaleString()}원` : "0원"}
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono tabular-nums font-bold">
                      {diff > 0 ? (
                        <span className="text-[#006B5B]">+{diff.toLocaleString()}원 ↑</span>
                      ) : diff < 0 ? (
                        <span className="text-rose-600">{diff.toLocaleString()}원 ↓</span>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <div className="font-semibold text-[#142B29]">
                        {newCompletion < 900 ? `약 ${newCompletion}개월 후` : "여력 미달"}
                      </div>
                      {oldCompletion !== newCompletion && (
                        <div className="text-[11px] text-[#006B5B]">
                          {oldCompletion < 900 && newCompletion < oldCompletion
                            ? `(${oldCompletion - newCompletion}개월 조기 달성)`
                            : ""}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot className="bg-[#F6F9F8] font-bold border-t border-[#DCE7E4]">
              <tr>
                <td className="py-3 px-4 text-[#142B29]">총 월 저축 배분 합계</td>
                <td className="py-3 px-4 text-right text-[#526562] font-mono tabular-nums">
                  {activePlan.totalMonthlySavings.toLocaleString()}원
                </td>
                <td className="py-3 px-4 text-right text-[#006B5B] font-mono tabular-nums font-black">
                  {proposedPlan.totalMonthlySavings.toLocaleString()}원
                </td>
                <td className="py-3 px-4 text-right text-[#006B5B] font-mono tabular-nums">
                  {surplusDiff >= 0 ? `+${surplusDiff.toLocaleString()}원` : `${surplusDiff.toLocaleString()}원`}
                </td>
                <td className="py-3 px-4 text-right text-[#526562] text-[11px]">
                  유동성 예비금: {proposedPlan.unallocatedSurplus.toLocaleString()}원 유지
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </div>

      {/* 3. 설명 및 출처·계산 근거 펼치기 (6.5 디자인 명세) */}
      <div className="bg-white rounded-2xl border border-[#DCE7E4] p-5 sm:p-6 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-[#DCE7E4] gap-2">
          <div className="flex items-center space-x-2">
            <FileCheck className="w-4 h-4 text-[#006B5B]" />
            <h4 className="text-sm font-bold text-[#142B29]">쉬운 설명 및 계획 조정 근거</h4>
          </div>

          <div className="flex items-center bg-[#F6F9F8] p-0.5 rounded-lg border border-[#DCE7E4] text-xs">
            <button
              onClick={() => setExplanationMode("rule")}
              className={`px-3 py-1 font-semibold rounded-md transition-all ${
                explanationMode === "rule"
                  ? "bg-white text-[#006B5B] shadow-xs"
                  : "text-[#526562] hover:text-[#142B29]"
              }`}
            >
              정형 계산 설명
            </button>
            <button
              onClick={() => {
                setExplanationMode("ai");
                if (!proposedPlan.aiExplanation && !isAiExplaining) {
                  requestAiExplanation();
                }
              }}
              className={`flex items-center px-3 py-1 font-semibold rounded-md transition-all ${
                explanationMode === "ai"
                  ? "bg-white text-[#1d4ed8] shadow-xs"
                  : "text-[#526562] hover:text-[#142B29]"
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 mr-1 text-[#1d4ed8]" />
              AI 맞춤 해설 (Gemini)
            </button>
          </div>
        </div>

        {explanationMode === "rule" ? (
          <div className="space-y-3 text-xs">
            <div className="p-3.5 bg-[#EAFBF6] border border-[#DCE7E4] rounded-xl text-[#006B5B] font-semibold leading-relaxed">
              {proposedPlan.ruleBasedExplanation.summary}
            </div>
            <ul className="space-y-1.5 pl-1">
              {proposedPlan.ruleBasedExplanation.reasons.map((r, idx) => (
                <li key={idx} className="flex items-start space-x-2 text-[#526562]">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#00C4A6] mt-1.5 shrink-0" />
                  <span className="text-[#142B29]">{r}</span>
                </li>
              ))}
            </ul>
            <div className="text-[11px] text-[#526562] pt-1">
              ※ 주의 및 부담 안내: {proposedPlan.ruleBasedExplanation.burdenNotice}
            </div>
          </div>
        ) : (
          <div className="space-y-3 text-xs">
            {isAiExplaining ? (
              <div className="p-6 flex items-center justify-center space-x-2 text-[#526562]">
                <Loader2 className="w-4 h-4 animate-spin text-[#1d4ed8]" />
                <span>계산 엔진 수치와 근거 문서를 바탕으로 자연스러운 설명을 생성 중입니다...</span>
              </div>
            ) : proposedPlan.aiExplanation ? (
              <div className="space-y-2.5">
                <div className="p-3.5 bg-[#EEF5FF] border border-[#d6e4fd] rounded-xl text-[#1d4ed8] font-medium leading-relaxed">
                  {proposedPlan.aiExplanation.summary}
                </div>
                <div className="space-y-1.5 pl-1">
                  {proposedPlan.aiExplanation.reasons?.map((r, i) => (
                    <div key={i} className="flex items-start space-x-2 text-[#526562]">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#1d4ed8] mt-1.5 shrink-0" />
                      <span className="text-[#142B29]">{r}</span>
                    </div>
                  ))}
                </div>
                {proposedPlan.aiExplanation.caution && (
                  <div className="text-[11px] text-[#1d4ed8] bg-[#EEF5FF]/60 p-2 rounded-lg border border-[#d6e4fd]">
                    안내: {proposedPlan.aiExplanation.caution}
                  </div>
                )}
              </div>
            ) : (
              <div className="p-4 text-center">
                <button
                  onClick={requestAiExplanation}
                  className="px-4 py-2 bg-[#1d4ed8] text-white rounded-xl text-xs font-bold"
                >
                  AI 설명 불러오기
                </button>
              </div>
            )}
          </div>
        )}

        {/* 출처·계산 근거 펼치기 토글 */}
        <div className="pt-2 border-t border-[#DCE7E4]">
          <button
            onClick={() => setShowEvidence(!showEvidence)}
            className="text-xs font-bold text-[#006B5B] hover:underline flex items-center"
          >
            <span>계산 공식 및 가정 상세 근거 {showEvidence ? "접기" : "펼치기"}</span>
            {showEvidence ? <ChevronUp className="w-3.5 h-3.5 ml-1" /> : <ChevronDown className="w-3.5 h-3.5 ml-1" />}
          </button>

          {showEvidence && (
            <div className="mt-3 p-3.5 rounded-xl bg-[#F6F9F8] border border-[#DCE7E4] text-xs text-[#526562] space-y-2">
              <div>• 월 가용 저축 여력 = 실소득 - (고정비 + 변동비 + 대출상환액)</div>
              <div>• 우선순위 1: 비상예비자금(월 필수지출 3개월치) 부족분 채우기</div>
              <div>• 우선순위 2: 정부·지자체 매칭 고금리 정책 적금(청년도약계좌 등) 월 한도 내 최대 적립</div>
              <div>• 우선순위 3: 주택청약종합저축 및 일반 목표 포트폴리오 잔여 배분</div>
              <div>• 미확인 조건: 추가적인 증빙 서류 심사 또는 대출 자격은 관할 기관 최종 심사를 따릅니다.</div>
            </div>
          )}
        </div>
      </div>

      {/* 4. 최종 의사결정 액션 바 (6.5 디자인 명세) */}
      <div className="bg-[#103D36] text-white p-6 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-md">
        <div>
          <span className="text-xs text-[#52E1E5]">변경 전 내용을 확인해 주세요</span>
          <h4 className="text-base sm:text-lg font-bold text-white mt-0.5">
            이 조정안을 승인하여 다음 달 모의 실행에 반영하시겠습니까?
          </h4>
          <p className="text-xs text-slate-300 mt-1">
            변경하면 다음 달부터 새 납입 계획이 적용됩니다. 유지하면 현재 계획이 그대로 이어집니다. 실제 금융 거래는 발생하지 않습니다.
          </p>
        </div>

        <div className="flex items-center space-x-3 shrink-0">
          <button
            id="btn-reject-plan"
            onClick={rejectProposedPlan}
            className="px-4 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition-colors"
          >
            현재 계획 유지하기
          </button>

          <button
            id="btn-approve-plan"
            onClick={handleApprove}
            disabled={isApproving}
            className="flex items-center px-5 py-2.5 rounded-xl bg-[#00C4A6] hover:bg-[#00b095] text-[#142B29] text-xs font-bold transition-colors shadow-xs"
          >
            {isApproving ? (
              <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
            ) : (
              <CheckCircle2 className="w-4 h-4 mr-1.5 text-[#142B29]" />
            )}
            이 계획으로 변경하기
          </button>
        </div>
      </div>
    </div>
  );
};
