import React from "react";
import { useEroom } from "../../context/EroomContext";
import { History, CheckCircle2 } from "lucide-react";

export const ExecutionHistoryTab: React.FC = () => {
  const { executions } = useEroom();
  const isDemoMode = new URLSearchParams(window.location.search).get("demo") === "true";
  const statusLabel = {
    SUCCESS: "반영 완료",
    DUPLICATE_IGNORED: "중복 요청 건너뜀",
    FAILED: "반영 실패",
  } as const;

  return (
    <div id="execution-history-tab" className="space-y-6">
      {/* 상단 안내 배너 */}
      <div className="bg-white rounded-2xl border border-[#DCE7E4] p-6 shadow-2xs">
        <div className="flex items-center space-x-2 text-[#006B5B] text-xs font-bold mb-1">
          <History className="w-4 h-4" />
          <span>내 계획 변경 내역</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-[#142B29]">
          내가 승인한 계획을 확인하세요
        </h2>
        <p className="text-xs text-[#526562] mt-1 leading-relaxed">
          직접 승인한 계획만 한 번 반영됩니다. 이 화면의 실행 결과는 합성 데이터를 이용한 시뮬레이션이며 실제 이체나 상품 가입은 발생하지 않습니다.
        </p>
      </div>

      {/* 모의 실행 목록 테이블 */}
      <div className="bg-white rounded-2xl border border-[#DCE7E4] shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-[#DCE7E4] bg-[#F6F9F8] flex items-center justify-between">
          <h3 className="text-xs font-bold text-[#142B29] flex items-center">
            <CheckCircle2 className="w-4 h-4 mr-1.5 text-[#006B5B]" />
            계획 반영 내역 ({executions.length}건)
          </h3>
          <span className="text-[11px] text-[#526562]">가상 데이터 · 실제 금융 거래 없음</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#F6F9F8] text-[#526562] border-b border-[#DCE7E4]">
              <tr>
                <th className="py-2.5 px-4 font-semibold">실행 일시</th>
                {isDemoMode && <th className="py-2.5 px-4 font-semibold">계획 버전</th>}
                {isDemoMode && <th className="py-2.5 px-4 font-semibold">중복 방지 키</th>}
                <th className="py-2.5 px-4 font-semibold text-right">월 계획 금액</th>
                <th className="py-2.5 px-4 font-semibold text-center">상태</th>
                <th className="py-2.5 px-4 font-semibold">결과 메시지</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#DCE7E4]">
              {executions.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 text-[#526562] font-mono text-[11px]">
                    {item.executedAt.replace("T", " ").substring(0, 19)}
                  </td>
                  {isDemoMode && <td className="py-3 px-4 font-bold text-[#006B5B]">{item.planVersion}</td>}
                  {isDemoMode && <td className="py-3 px-4 font-mono text-[#526562] text-[11px]">{item.idempotencyKey}</td>}
                  <td className="py-3 px-4 text-right font-bold text-[#142B29] font-mono tabular-nums">
                    {item.details.totalExecutedAmount.toLocaleString()}원
                  </td>
                  <td className="py-3 px-4 text-center">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#EAFBF6] text-[#006B5B] border border-[#DCE7E4]">
                      {statusLabel[item.status]}
                    </span>
                  </td>
                  <td className="py-3 px-4 text-[#526562] text-xs">
                    {item.details.message}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
