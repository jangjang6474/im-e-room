import React, { useState } from "react";
import { useEroom } from "../context/EroomContext";
import {
  Headphones,
  AlertOctagon,
  ShieldAlert,
  CheckCircle,
  Clock,
  Send,
  User,
  Phone,
  FileText,
  MessageSquare,
} from "lucide-react";

export const ConsultantView: React.FC = () => {
  const {
    consultationCases,
    resolveConsultationCase,
    applyScenario,
    customer,
  } = useEroom();

  const [selectedCaseId, setSelectedCaseId] = useState<string | null>(
    consultationCases[0]?.id || null
  );
  const [noteInput, setNoteInput] = useState<string>("");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const activeCase =
    consultationCases.find((c) => c.id === selectedCaseId) ||
    consultationCases[0];

  const handleResolve = (caseId: string) => {
    if (!noteInput.trim()) {
      setErrorMessage("상담 조치 및 권고 내용을 메모란에 입력해주세요.");
      return;
    }
    setErrorMessage(null);
    resolveConsultationCase(caseId, noteInput.trim());
    setNoteInput("");
  };

  return (
    <div id="consultant-view" className="space-y-6">
      {/* 상단 브리핑 헤더 */}
      <div className="bg-[#103D36] text-white rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 text-[#52E1E5] text-xs font-bold mb-1">
            <Headphones className="w-4 h-4" />
            <span>iM 청년 재무 상담사 전문 지원 대시보드</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold">
            고위험·위기 징후 고객 집중 관리 목록
          </h2>
          <p className="text-xs text-slate-300 mt-1 max-w-2xl leading-relaxed">
            급여 미입금, 급격한 지출 증가 등 자동화 규칙만으로 해결하기 어려운 위험 사례를 감지하여 근거 브리핑과 함께 상담 대기 목록으로 즉시 라우팅합니다. (외부 기관 전송 없음)
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {consultationCases.length === 0 && (
            <button
              onClick={() => applyScenario("S04_INCOME_STOP")}
              className="px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl transition-colors flex items-center shadow-xs"
            >
              <AlertOctagon className="w-4 h-4 mr-1.5" />
              [S04. 소득 미입금 위험 발생] 시연
            </button>
          )}
        </div>
      </div>

      {consultationCases.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#DCE7E4] p-12 text-center shadow-2xs space-y-3">
          <div className="w-12 h-12 rounded-full bg-[#EAFBF6] text-[#006B5B] flex items-center justify-center mx-auto">
            <CheckCircle className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-[#142B29]">현재 대기 중인 위험 상담 케이스가 없습니다</h3>
          <p className="text-xs text-[#526562] max-w-md mx-auto">
            모든 청년 고객의 재무 상태가 안정적으로 유지되고 있습니다. 상단 도구를 통해 소득 단절 상황을 모의 발생시켜 보세요.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* 좌측: 위험 케이스 대기 목록 */}
          <div className="bg-white rounded-2xl border border-[#DCE7E4] shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-[#DCE7E4] bg-[#F6F9F8] flex items-center justify-between">
              <h3 className="text-xs font-bold text-[#142B29]">
                상담 대기 큐 ({consultationCases.length})
              </h3>
              <span className="text-[11px] font-semibold text-rose-600">위험 순 정렬</span>
            </div>

            <div className="divide-y divide-[#DCE7E4] max-h-[500px] overflow-y-auto">
              {consultationCases.map((c) => {
                const isSelected = activeCase?.id === c.id;
                const isWaiting = c.status === "WAITING";

                return (
                  <div
                    key={c.id}
                    onClick={() => {
                      setSelectedCaseId(c.id);
                      setErrorMessage(null);
                    }}
                    className={`p-4 cursor-pointer transition-colors ${
                      isSelected ? "bg-[#EAFBF6] border-l-4 border-[#00C4A6]" : "hover:bg-slate-50"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-bold text-xs text-[#142B29] flex items-center">
                        <User className="w-3.5 h-3.5 mr-1 text-[#526562]" />
                        {c.customerName} 고객
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          isWaiting
                            ? "bg-rose-100 text-rose-800"
                            : "bg-slate-100 text-[#526562]"
                        }`}
                      >
                        {isWaiting ? "상담 대기" : "조치 완료"}
                      </span>
                    </div>

                    <div className="text-xs font-semibold text-rose-700 truncate">
                      {c.riskType}
                    </div>

                    <div className="text-[11px] text-[#526562] font-mono mt-1">
                      발생: {c.createdAt.replace("T", " ").substring(0, 16)}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 우측: 상담 브리핑 상세 및 조치 입력 */}
          {activeCase && (
            <div className="lg:col-span-2 bg-white rounded-2xl border border-[#DCE7E4] shadow-2xs p-6 space-y-6">
              {/* 케이스 헤더 */}
              <div className="border-b border-[#DCE7E4] pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center space-x-2">
                    <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-100 text-rose-800">
                      {activeCase.severity} RISK
                    </span>
                    <span className="text-xs text-[#526562] font-mono">ID: {activeCase.id}</span>
                  </div>
                  <h3 className="text-lg font-bold text-[#142B29] mt-1">
                    {activeCase.riskType} 브리핑 리포트
                  </h3>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-xs text-[#526562]">연락처:</span>
                  <span className="text-xs font-mono font-bold text-[#142B29] bg-[#F6F9F8] border border-[#DCE7E4] px-2 py-1 rounded">
                    010-5080-****
                  </span>
                </div>
              </div>

              {/* 4대 분석 브리핑 블록 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-rose-50/60 border border-rose-200">
                  <span className="text-xs font-bold text-rose-900 block mb-1">감지된 핵심 충격</span>
                  <p className="text-xs text-rose-800 leading-relaxed">{activeCase.briefing.coreRisk}</p>
                </div>

                <div className="p-4 rounded-xl bg-[#F6F9F8] border border-[#DCE7E4]">
                  <span className="text-xs font-bold text-[#142B29] block mb-1">고객 재무 상태 분석</span>
                  <p className="text-xs text-[#526562] leading-relaxed">{activeCase.briefing.financialState}</p>
                </div>
              </div>

              {/* 목표 영향도 & 권고 방안 */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200">
                  <span className="text-xs font-bold text-amber-900 block mb-1">청년 목표 영향도</span>
                  <p className="text-xs text-amber-800 leading-relaxed">{activeCase.briefing.impactOnGoals}</p>
                </div>

                <div className="p-4 rounded-xl bg-[#EAFBF6] border border-[#DCE7E4]">
                  <span className="text-xs font-bold text-[#006B5B] block mb-1">
                    상담사 권고 조치 방안
                  </span>
                  <p className="text-xs text-[#142B29] leading-relaxed">
                    {activeCase.briefing.recommendedHumanAction}
                  </p>
                </div>
              </div>

              {/* 상담 조치 입력 창 */}
              <div className="space-y-3 pt-2">
                <label className="text-xs font-bold text-[#142B29] block">
                  상담사 조치 기록 및 안내 메모
                </label>
                {activeCase.status === "WAITING" ? (
                  <>
                    <textarea
                      value={noteInput}
                      onChange={(e) => {
                        setNoteInput(e.target.value);
                        setErrorMessage(null);
                      }}
                      placeholder="예: 고객과 유선 상담 완료. 소득 단절 기간 동안 적금 납입 유예(최대 6개월) 및 대구 청년 구직지원금 신청 절차를 유선 안내함."
                      className="w-full h-24 p-3 rounded-xl border border-[#DCE7E4] text-xs focus:outline-none focus:border-[#00C4A6]"
                    />
                    {errorMessage && (
                      <p className="text-xs text-rose-600 font-medium">{errorMessage}</p>
                    )}
                    <div className="flex justify-end">
                      <button
                        onClick={() => handleResolve(activeCase.id)}
                        className="px-4 py-2 bg-[#00C4A6] hover:bg-[#00b095] text-[#142B29] font-bold text-xs rounded-xl transition-colors shadow-xs flex items-center"
                      >
                        <Send className="w-3.5 h-3.5 mr-1.5" />
                        상담 완료 처리 및 기록 저장
                      </button>
                    </div>
                  </>
                ) : (
                  <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs">
                    <span className="text-slate-500 block mb-1">조치 완료 기록:</span>
                    <p className="text-slate-800 font-medium">{activeCase.consultantNotes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
