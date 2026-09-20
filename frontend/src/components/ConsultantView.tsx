/**
 * 상담사 대기 화면 (`?demo=true`에서만 접근)
 *
 * 위험 이벤트로 생성된 모의 상담 케이스를 읽기 전용으로 보여준다.
 * 실제 상담 예약·외부 기관 전송은 하지 않으며, 상태 변경은 상담 시스템의 역할이다.
 */

import React, { useEffect } from "react";
import { PhoneCall } from "lucide-react";
import { useEroomSession } from "../api/EroomSession";
import { dateTimeText } from "../api/format";
import { CONSULTATION_STATUS_LABEL } from "../api/labels";
import {
  Callout,
  EmptyState,
  KeyValueRow,
  LoadingBlock,
  Panel,
  SectionHeading,
  StatusChip,
} from "./ui/Primitives";

export const ConsultantView: React.FC = () => {
  const { consultations, loadConsultations, pending } = useEroomSession();

  useEffect(() => {
    void loadConsultations();
  }, [loadConsultations]);

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
      <Panel className="p-5" ariaLabelledBy="consult-title">
        <SectionHeading
          id="consult-title"
          title="상담사 대기 목록 (시연용)"
          icon={<PhoneCall className="w-5 h-5 text-[#006B5B]" aria-hidden="true" />}
          description="월간 점검에서 위험으로 분류된 합성 고객 사례입니다."
        />
        {pending.consultations && consultations.length === 0 ? (
          <LoadingBlock label="상담 케이스를 불러오는 중입니다." rows={2} />
        ) : consultations.length === 0 ? (
          <EmptyState
            title="대기 중인 상담 케이스가 없습니다"
            description="소득 급감처럼 위험으로 분류되는 변화가 감지되면 이곳에 사례가 등록됩니다. (예: P03 소득 변동 위험 청년)"
          />
        ) : (
          <ul className="space-y-3">
            {consultations.map((item) => {
              const status = CONSULTATION_STATUS_LABEL[item.status];
              return (
                <li key={item.id} className="rounded-2xl border border-[#DCE7E4] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-extrabold text-[#142B29] break-keep">{item.riskType}</p>
                      <p className="text-xs text-[#526562] mt-0.5">
                        {item.customerName} · 등록 {dateTimeText(item.createdAt)}
                      </p>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      <StatusChip label={item.severity === "CRITICAL" ? "긴급" : "높음"} tone="risk" />
                      <StatusChip label={status.label} tone={status.tone} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <KeyValueRow label="핵심 위험" value={item.briefing.coreRisk} />
                    <KeyValueRow label="재무 상태" value={item.briefing.financialState} />
                    <KeyValueRow label="목표 영향" value={item.briefing.impactOnGoals} />
                    <KeyValueRow label="권장 조치" value={item.briefing.recommendedHumanAction} />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
        <Callout tone="muted" title="프로토타입 범위">
          이 화면은 읽기 전용 시연입니다. 상담 배정·예약·상태 변경은 상담 시스템에서 처리해야 하며 현재 범위에 없습니다.
        </Callout>
      </Panel>
    </div>
  );
};
