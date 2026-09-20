/**
 * 3) 모의 데이터 수집 동의
 *
 * 실제 마이데이터 연결이 아니다. 동의 후 최초 1회 수집하고, 이후 동의일 기준 매월 1회 재수집한다.
 */

import React, { useState } from "react";
import { ArrowLeft, CheckCircle2, ShieldCheck } from "lucide-react";
import { CONSENT_SCOPES, useEroomSession } from "../api/EroomSession";
import { dateText } from "../api/format";
import { ActionButton, Callout, Panel, SyntheticNotice } from "./ui/Primitives";

export const ConsentView: React.FC = () => {
  const { persona, agreeAndDiagnose, goToPersonaSelect, pending } = useEroomSession();
  const [agreed, setAgreed] = useState(false);

  if (!persona) return null;

  return (
    <div className="max-w-[720px] mx-auto px-4 sm:px-6 py-8 space-y-5">
      <button
        type="button"
        onClick={goToPersonaSelect}
        className="min-h-[44px] inline-flex items-center gap-1.5 text-sm font-bold text-[#526562] hover:text-[#142B29]"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden="true" />
        고객 다시 선택
      </button>

      <Panel className="p-5 md:p-6 space-y-5">
        <div className="flex items-start gap-3">
          <span className="w-11 h-11 rounded-2xl bg-[#EAFBF6] border border-[#B6E7DA] text-[#006B5B] inline-flex items-center justify-center shrink-0">
            <ShieldCheck className="w-5 h-5" aria-hidden="true" />
          </span>
          <div>
            <h1 className="text-xl font-black text-[#142B29]">모의 데이터 수집에 동의하시겠어요?</h1>
            <p className="text-sm text-[#526562] mt-1.5 leading-relaxed break-keep">
              {persona.customerName} 님({persona.title})의 가상 계좌·거래를 불러와 재무진단을 만듭니다. 실제 마이데이터
              기관 연결은 일어나지 않습니다.
            </p>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-extrabold text-[#142B29] mb-2">수집·이용 범위</h2>
          <ul className="space-y-2">
            {CONSENT_SCOPES.map((scope) => (
              <li key={scope} className="text-sm text-[#526562] flex items-start gap-2 leading-relaxed">
                <CheckCircle2 className="w-4 h-4 text-[#00C4A6] mt-0.5 shrink-0" aria-hidden="true" />
                {scope}
              </li>
            ))}
          </ul>
        </div>

        <Callout tone="neutral" title="수집 주기">
          동의 직후 1회 수집하고, 이후에는 동의일({dateText(persona.asOf)}) 기준으로 매월 1회 다시 수집합니다. 동의는
          언제든지 홈 화면에서 철회할 수 있고, 철회하면 다음 달 수집이 중단됩니다.
        </Callout>

        <label className="flex items-start gap-3 p-4 rounded-2xl border border-[#DCE7E4] bg-[#F6F9F8] cursor-pointer min-h-[44px]">
          <input
            type="checkbox"
            checked={agreed}
            onChange={(event) => setAgreed(event.target.checked)}
            className="w-5 h-5 mt-0.5 accent-[#00C4A6]"
          />
          <span className="text-sm text-[#142B29] leading-relaxed">
            가상 데이터 기반 모의 수집과 모의 실행에 동의합니다. 실제 가입·송금·상담 예약이 없다는 점을 확인했습니다.
          </span>
        </label>

        <ActionButton full disabled={!agreed} loading={pending.session} onClick={() => void agreeAndDiagnose()}>
          동의하고 3분 재무진단 시작
        </ActionButton>
        <SyntheticNotice />
      </Panel>
    </div>
  );
};
