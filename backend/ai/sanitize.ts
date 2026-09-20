/**
 * Claude로 나가기 전의 비식별 처리
 *
 * 요청 본문은 신뢰할 수 없는 입력으로 본다. 아래 함수는 필요한 필드만 새 객체로 다시 만들며,
 * 계약에 없는 키(이름·연락처·주소 상세·계좌번호·카드번호·거래 상대방·거래 메모·거래 ID 등)는
 * 화이트리스트 밖이라 그대로 버려진다.
 *
 * 허용하는 값은 합계, 변화 유형, 목표 상태, 계산된 계획, 검수된 정책 조건뿐이다.
 * 자유 입력(질문·정책 원문)에는 추가로 식별정보 패턴 삭제를 적용한다.
 */

import type {
  AiDetectedChange,
  AiFinancialSummary,
  AiPlanSummary,
  AiPolicyMatch,
  AiReference,
  CounselRequest,
  ExplainRequest,
  StructurePolicyRequest,
} from "../../frontend/src/data/aiContracts";
import type { EligibilityStatus, EventType, PersonaId } from "../../frontend/src/data/apiContracts";

export class AiInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AiInputError";
  }
}

const PERSONA_IDS: PersonaId[] = ["P01", "P02", "P03", "EX24"];
const EVENT_TYPES: EventType[] = ["INFO", "ADJUSTMENT", "RISK"];
const ELIGIBILITY_STATUSES: EligibilityStatus[] = ["ELIGIBLE", "NEEDS_VERIFICATION", "INELIGIBLE"];

const REDACTED = "[삭제됨]";

/**
 * 식별정보 패턴 삭제.
 *
 * 순서가 중요하다. 주민등록번호·카드번호·전화번호를 먼저 지우고
 * 남은 긴 숫자열(계좌번호 등)을 마지막에 지운다.
 */
export function redactFreeText(value: string): string {
  return value
    .replace(/[\w.+-]+@[\w-]+\.[\w.-]+/g, REDACTED)
    .replace(/\d{6}\s*[-–]\s*[1-4]\d{6}/g, REDACTED)
    .replace(/\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/g, REDACTED)
    .replace(/0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{4}/g, REDACTED)
    .replace(/\d[\d-]{8,}\d/g, REDACTED);
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function requireRecord(value: unknown, field: string): Record<string, unknown> {
  if (!isRecord(value)) throw new AiInputError(`${field}은(는) 객체여야 합니다.`);
  return value;
}

function optionalRecord(value: unknown): Record<string, unknown> | null {
  return isRecord(value) ? value : null;
}

/** 금액·개수. 유한한 숫자가 아니면 0으로 채우지 않고 null로 남긴다. */
function amount(value: unknown): number | null {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  if (Math.abs(value) > 1_000_000_000_000) return null;
  return Math.trunc(value);
}

/** 화면·프롬프트에 들어갈 짧은 문자열. 식별정보 패턴을 지우고 길이를 자른다. */
function safeText(value: unknown, maxLength: number): string | null {
  if (typeof value !== "string") return null;
  const cleaned = redactFreeText(value).trim().slice(0, maxLength);
  return cleaned.length > 0 ? cleaned : null;
}

function requiredText(value: unknown, field: string, maxLength: number): string {
  const parsed = safeText(value, maxLength);
  if (parsed === null) throw new AiInputError(`${field}이(가) 비어 있습니다.`);
  return parsed;
}

function monthOrDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^\d{4}-\d{2}(-\d{2})?$/.test(trimmed) ? trimmed : null;
}

function httpUrl(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return /^https?:\/\/[^\s]{1,300}$/.test(trimmed) ? trimmed : null;
}

/* ------------------------------------------------------------------ */
/* 공통 조각                                                            */
/* ------------------------------------------------------------------ */

function financialSummary(value: unknown): AiFinancialSummary {
  const raw = optionalRecord(value) ?? {};
  return {
    monthlyIncome: amount(raw.monthlyIncome),
    monthlyFixedExpense: amount(raw.monthlyFixedExpense),
    monthlyVariableExpense: amount(raw.monthlyVariableExpense),
    monthlyIrregularExpense: amount(raw.monthlyIrregularExpense),
    monthlyDebtPayment: amount(raw.monthlyDebtPayment),
    monthlySavingCapacity: amount(raw.monthlySavingCapacity),
  };
}

function detectedChanges(value: unknown): AiDetectedChange[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 10)
    .map((item): AiDetectedChange | null => {
      const raw = optionalRecord(item);
      if (!raw) return null;
      const message = safeText(raw.message, 300);
      if (message === null) return null;
      const severity = EVENT_TYPES.includes(raw.severity as EventType) ? (raw.severity as EventType) : "INFO";
      return { type: safeText(raw.type, 60) ?? "UNKNOWN", severity, message };
    })
    .filter((item): item is AiDetectedChange => item !== null);
}

function planSummary(value: unknown): AiPlanSummary | null {
  const raw = optionalRecord(value);
  if (!raw) return null;
  return {
    monthlyContribution: amount(raw.monthlyContribution),
    monthlyBalance: amount(raw.monthlyBalance),
    primaryGoalDate: monthOrDate(raw.primaryGoalDate),
  };
}

function policyMatches(value: unknown): AiPolicyMatch[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 15)
    .map((item): AiPolicyMatch | null => {
      const raw = optionalRecord(item);
      if (!raw) return null;
      const policyName = safeText(raw.policyName, 120);
      if (policyName === null) return null;
      if (!ELIGIBILITY_STATUSES.includes(raw.status as EligibilityStatus)) return null;
      return { policyName, status: raw.status as EligibilityStatus };
    })
    .filter((item): item is AiPolicyMatch => item !== null);
}

/** 근거는 검수된 문장만 받는다. 출처 URL은 http(s)만 허용한다. */
function references(value: unknown): AiReference[] {
  if (!Array.isArray(value)) return [];
  return value
    .slice(0, 6)
    .map((item): AiReference | null => {
      const raw = optionalRecord(item);
      if (!raw) return null;
      const title = safeText(raw.title, 120);
      const excerpt = safeText(raw.excerpt, 600);
      if (title === null || excerpt === null) return null;
      return { title, sourceUrl: httpUrl(raw.sourceUrl), asOf: monthOrDate(raw.asOf), excerpt };
    })
    .filter((item): item is AiReference => item !== null);
}

/* ------------------------------------------------------------------ */
/* 요청별 비식별 처리                                                    */
/* ------------------------------------------------------------------ */

export function sanitizeExplainRequest(body: unknown): ExplainRequest {
  const raw = requireRecord(body, "요청 본문");
  if (!PERSONA_IDS.includes(raw.personaId as PersonaId)) {
    throw new AiInputError("personaId 값이 올바르지 않습니다.");
  }
  return {
    personaId: raw.personaId as PersonaId,
    asOf: monthOrDate(raw.asOf) ?? "",
    financialSummary: financialSummary(raw.financialSummary),
    detectedChanges: detectedChanges(raw.detectedChanges),
    previousPlan: planSummary(raw.previousPlan),
    proposedPlan: planSummary(raw.proposedPlan),
    policyMatches: policyMatches(raw.policyMatches),
  };
}

export function sanitizeCounselRequest(body: unknown): CounselRequest {
  const raw = requireRecord(body, "요청 본문");
  return {
    question: requiredText(raw.question, "question", 300),
    asOf: monthOrDate(raw.asOf) ?? "",
    financialSummary: financialSummary(raw.financialSummary),
    detectedChanges: detectedChanges(raw.detectedChanges),
    activePlan: planSummary(raw.activePlan),
    proposedPlan: planSummary(raw.proposedPlan),
    policyEligibility: policyMatches(raw.policyEligibility),
    consultationReason: safeText(raw.consultationReason, 300),
    references: references(raw.references),
  };
}

export function sanitizeStructurePolicyRequest(body: unknown): StructurePolicyRequest {
  const raw = requireRecord(body, "요청 본문");
  const documentText = requiredText(raw.documentText, "documentText", 12_000);
  return {
    policyId: requiredText(raw.policyId, "policyId", 60),
    title: requiredText(raw.title, "title", 200),
    sourceUrl: httpUrl(raw.sourceUrl),
    sourceAsOf: monthOrDate(raw.sourceAsOf),
    documentText,
  };
}
