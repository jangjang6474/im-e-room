import React, { useState } from "react";
import { useEroom } from "../../context/EroomContext";
import { PolicyProduct } from "../../types";
import {
  FileText,
  ShieldCheck,
  AlertCircle,
  ExternalLink,
  CheckCircle,
  Clock,
  Send,
  Sparkles,
} from "lucide-react";

export const PolicyCenterTab: React.FC = () => {
  const { policies, customer } = useEroom();
  const [mockAppliedId, setMockAppliedId] = useState<string | null>(null);
  const [showApplyModal, setShowApplyModal] = useState<PolicyProduct | null>(null);

  const handleMockApplyConfirm = () => {
    if (showApplyModal) {
      setMockAppliedId(showApplyModal.id);
      setShowApplyModal(null);
    }
  };

  return (
    <div id="policy-center-tab" className="space-y-6">
      {/* 상단 안내 배너 */}
      <div className="bg-white rounded-2xl border border-[#DCE7E4] p-6 shadow-2xs">
        <div className="flex items-center space-x-2 text-[#006B5B] text-xs font-bold mb-1">
          <FileText className="w-4 h-4" />
          <span>청년 정책 및 제휴 금융상품 자격 진단 센터</span>
        </div>
        <h2 className="text-xl sm:text-2xl font-bold text-[#142B29]">
          {customer.name}님 맞춤 청년 지원제도 적격 진단
        </h2>
        <p className="text-xs text-[#526562] mt-1 max-w-3xl leading-relaxed">
          공식 정책 고시 및 약관 기준일에 기반하여 연령(만 {customer.age}세)·거주지({customer.residence})·소득 구간별 적격 여부를 자동 평가했습니다. 본 화면의 신청은 안전한 모의 연계입니다.
        </p>
      </div>

      {/* 정책 카드 그리드 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {policies.map((p) => {
          const isEligible = p.eligibility === "ELIGIBLE";
          const isNeedsVerif = p.eligibility === "NEEDS_VERIFICATION";
          const isApplied = mockAppliedId === p.id;

          return (
            <div
              key={p.id}
              className="bg-white rounded-2xl border border-[#DCE7E4] p-5 shadow-2xs flex flex-col justify-between hover:border-[#00C4A6] transition-colors"
            >
              <div>
                {/* 헤더 & 기관 */}
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <span className="text-[11px] font-semibold text-[#526562]">{p.provider}</span>
                    <h3 className="text-base font-bold text-[#142B29]">{p.name}</h3>
                  </div>

                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                      isEligible
                        ? "bg-[#EAFBF6] text-[#006B5B] border-[#DCE7E4]"
                        : isNeedsVerif
                        ? "bg-amber-50 text-amber-800 border-amber-200"
                        : "bg-slate-100 text-slate-500 border-slate-200"
                    }`}
                  >
                    {isEligible ? "✓ 자격 충족" : isNeedsVerif ? "서류 확인 필요" : "기준 미달"}
                  </span>
                </div>

                <p className="text-xs text-[#526562] mb-3 leading-relaxed">{p.eligibilityReason}</p>

                {/* 혜택 요약 */}
                <div className="p-3 bg-[#F6F9F8] rounded-xl border border-[#DCE7E4] space-y-1.5 text-xs mb-3">
                  <div className="flex justify-between">
                    <span className="text-[#526562]">최대 납입 한도:</span>
                    <strong className="font-mono text-[#142B29]">월 {p.maxMonthlyDeposit.toLocaleString()}원</strong>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-[#526562]">적용 금리 / 기여율:</span>
                    <strong className="font-mono text-[#006B5B]">
                      {p.baseRate > 0 ? `기본 ${p.baseRate}% ~ 최고 연 ${p.maxRate}%` : `최고 연 ${p.maxRate}%`}
                    </strong>
                  </div>
                  <div className="flex justify-between text-[#1d4ed8]">
                    <span>소득 요건:</span>
                    <strong className="truncate max-w-[200px] text-right">{p.incomeLimitDescription}</strong>
                  </div>
                </div>

                {/* 자격 조건 요약 */}
                <div className="text-[11px] text-[#526562] space-y-1">
                  <div>• 대상 연령: 만 {p.targetAgeRange[0]}세 ~ 만 {p.targetAgeRange[1]}세</div>
                  <div>• 공시 근거: {p.officialReference}</div>
                </div>
              </div>

              {/* 하단 모의 신청 버튼 */}
              <div className="pt-3 border-t border-[#DCE7E4] mt-4 flex items-center justify-between">
                <span className="text-[10px] text-[#526562]">약관 기준일: {p.asOfPolicy}</span>

                <button
                  onClick={() => setShowApplyModal(p)}
                  disabled={!isEligible || isApplied}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center space-x-1 ${
                    isApplied
                      ? "bg-[#EAFBF6] text-[#006B5B] border border-[#DCE7E4] cursor-default"
                      : isEligible
                      ? "bg-[#00C4A6] hover:bg-[#00b095] text-[#142B29] shadow-2xs"
                      : "bg-slate-100 text-slate-400 cursor-not-allowed"
                  }`}
                >
                  {isApplied ? (
                    <>
                      <CheckCircle className="w-3.5 h-3.5" />
                      <span>모의 신청 완료</span>
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5" />
                      <span>모의 간편 연계</span>
                    </>
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 모의 연계 신청 확인 모달 (window.alert 대신 인앱 모달) */}
      {showApplyModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-md w-full shadow-xl border border-[#DCE7E4] space-y-4">
            <div className="flex items-center space-x-2 text-[#006B5B]">
              <ShieldCheck className="w-5 h-5" />
              <h3 className="text-base font-bold text-[#142B29]">모의 상품 연계 안내</h3>
            </div>

            <p className="text-xs text-[#526562] leading-relaxed">
              선택하신 <strong className="text-[#142B29]">[{showApplyModal.name}]</strong> 상품에 대한 모의 연계 신청을 진행합니다.
            </p>

            <div className="p-3 bg-[#F6F9F8] rounded-xl border border-[#DCE7E4] text-xs text-[#526562] space-y-1">
              <div>• 제공 기관: {showApplyModal.provider}</div>
              <div>• 신청자: {customer.name} (만 {customer.age}세, {customer.residence})</div>
              <div>• 안내: 본 시스템은 공모전 프로토타입으로 실제 금융기관 계정계로 전송되지 않습니다.</div>
            </div>

            <div className="flex space-x-2 pt-2">
              <button
                onClick={() => setShowApplyModal(null)}
                className="flex-1 py-2.5 rounded-xl border border-[#DCE7E4] text-[#526562] font-semibold hover:bg-slate-50 text-xs"
              >
                취소
              </button>
              <button
                onClick={handleMockApplyConfirm}
                className="flex-1 py-2.5 rounded-xl bg-[#00C4A6] hover:bg-[#00b095] text-[#142B29] font-bold text-xs shadow-xs"
              >
                모의 신청 접수
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
