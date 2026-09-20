/**
 * 시연 도구 (`?demo=true`에서만 노출)
 *
 * 일반 고객 화면에는 나타나지 않는다. 내부 버전·시나리오 전환·상담사 화면은 여기에서만 다룬다.
 */

import React from "react";
import { RefreshCw, Users, X } from "lucide-react";
import { useEroomSession } from "../api/EroomSession";
import { API_CONTRACT_VERSION } from "../data/apiContracts";
import { BOUNDARY_LABEL, PLAN_STATUS_LABEL } from "../api/labels";
import { ActionButton, StatusChip } from "./ui/Primitives";

interface DemoControllerBannerProps {
  isOpen: boolean;
  onClose: () => void;
  showConsultant: boolean;
  onToggleConsultant: () => void;
}

export const DemoControllerBanner: React.FC<DemoControllerBannerProps> = ({
  isOpen,
  onClose,
  showConsultant,
  onToggleConsultant,
}) => {
  const {
    personas,
    persona,
    personaId,
    selectPersona,
    currentPlan,
    boundaryId,
    source,
    phase,
    runMonthlyReview,
    revokeConsent,
    resetSession,
    pending,
  } = useEroomSession();

  if (!isOpen) return null;

  return (
    <div className="bg-[#103D36] text-white">
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-4 space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="font-extrabold text-sm">시연 도구</p>
            <p className="text-xs text-white/70 mt-0.5 leading-relaxed">
              고객 화면에는 노출되지 않습니다. 계약 {API_CONTRACT_VERSION} · 데이터 출처{" "}
              {source === "server" ? "Mock API 서버" : "번들 fixture(오프라인)"}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-2xl border border-white/30 inline-flex items-center justify-center hover:bg-white/10"
          >
            <X className="w-4 h-4" aria-hidden="true" />
            <span className="sr-only">시연 도구 닫기</span>
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {personas.map((item) => (
            <button
              key={item.personaId}
              type="button"
              onClick={() => selectPersona(item.personaId)}
              aria-pressed={personaId === item.personaId}
              className={`min-h-[44px] px-4 rounded-2xl border text-xs font-bold ${
                personaId === item.personaId ? "bg-[#00C4A6] text-[#0B2724] border-transparent" : "border-white/30 hover:bg-white/10"
              }`}
            >
              {item.personaId} · {item.title}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2 text-xs">
          <StatusChip label={`단계 ${phase}`} tone="muted" />
          {persona && <StatusChip label={`${persona.customerName} (${persona.personaId})`} tone="muted" />}
          <StatusChip label={`바운더리 ${BOUNDARY_LABEL[boundaryId].label}`} tone="muted" />
          {currentPlan && (
            <StatusChip label={`계획 v${currentPlan.version} · ${PLAN_STATUS_LABEL[currentPlan.status].label}`} tone="muted" />
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <ActionButton variant="ghost" loading={pending.review} onClick={() => void runMonthlyReview()}>
            월간 점검 실행
          </ActionButton>
          <ActionButton variant="ghost" loading={pending.consent} onClick={() => void revokeConsent()}>
            동의 철회
          </ActionButton>
          <ActionButton
            variant="ghost"
            onClick={onToggleConsultant}
            icon={<Users className="w-4 h-4" aria-hidden="true" />}
          >
            {showConsultant ? "고객 화면 보기" : "상담사 화면 보기"}
          </ActionButton>
          <ActionButton
            variant="ghost"
            onClick={() => void resetSession()}
            icon={<RefreshCw className="w-4 h-4" aria-hidden="true" />}
          >
            세션 초기화 (계획·실행 이력 포함)
          </ActionButton>
        </div>
      </div>
    </div>
  );
};
