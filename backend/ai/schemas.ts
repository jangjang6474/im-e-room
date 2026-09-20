/**
 * AI 응답 Schema 검증
 *
 * Claude 응답과 준비된 fixture는 모두 이 검증을 통과해야 화면으로 나간다.
 * 검증에 실패하면 호출부가 fixture → 규칙 기반 설명 순서로 대체한다.
 *
 * 검증은 형식만 본다. 금액이 맞는지, 자격이 맞는지는 규칙 엔진의 책임이며
 * AI 응답에는 애초에 새 금액을 만들 자리를 주지 않는다(문자열 표시값만 받는다).
 */

import type {
  AiCitation,
  AiFactUsed,
  CounselResponse,
  ExplainResponse,
  IncomeOperator,
  StructuredPolicy,
} from "../../frontend/src/data/aiContracts";

/** metadata는 서버가 붙인다. 모델과 fixture는 본문만 만든다. */
export type ExplainPayload = Omit<ExplainResponse, "metadata">;
export type CounselPayload = Omit<CounselResponse, "metadata">;
export type StructuredPolicyPayload = Omit<StructuredPolicy, "metadata">;

export class AiSchemaError extends Error {
  constructor(public readonly path: string, detail: string) {
    super(`${path}: ${detail}`);
    this.name = "AiSchemaError";
  }
}

/* ------------------------------------------------------------------ */
/* 기본 검사기                                                          */
/* ------------------------------------------------------------------ */

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function record(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) throw new AiSchemaError(path, "객체가 아닙니다.");
  return value;
}

/** 길이 상한을 둔다. 모델이 장문을 반환해도 화면 계약을 벗어나지 않게 한다. */
function text(value: unknown, path: string, maxLength = 600): string {
  if (typeof value !== "string") throw new AiSchemaError(path, "문자열이 아닙니다.");
  const trimmed = value.trim();
  if (trimmed.length === 0) throw new AiSchemaError(path, "빈 문자열입니다.");
  if (trimmed.length > maxLength) throw new AiSchemaError(path, `${maxLength}자를 넘습니다.`);
  return trimmed;
}

function nullableText(value: unknown, path: string, maxLength = 600): string | null {
  if (value === null || value === undefined || value === "") return null;
  return text(value, path, maxLength);
}

function textArray(value: unknown, path: string, maxItems = 10, maxLength = 400): string[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new AiSchemaError(path, "배열이 아닙니다.");
  if (value.length > maxItems) throw new AiSchemaError(path, `${maxItems}개를 넘습니다.`);
  return value.map((item, index) => text(item, `${path}[${index}]`, maxLength));
}

function nullableNumber(value: unknown, path: string): number | null {
  if (value === null || value === undefined) return null;
  if (typeof value !== "number" || !Number.isFinite(value)) throw new AiSchemaError(path, "숫자가 아닙니다.");
  return value;
}

function array(value: unknown, path: string, maxItems: number): unknown[] {
  if (value === undefined || value === null) return [];
  if (!Array.isArray(value)) throw new AiSchemaError(path, "배열이 아닙니다.");
  if (value.length > maxItems) throw new AiSchemaError(path, `${maxItems}개를 넘습니다.`);
  return value;
}

/** YYYY-MM 또는 YYYY-MM-DD. 형식이 다르면 모르는 값으로 본다. */
function nullableDate(value: unknown, path: string): string | null {
  const parsed = nullableText(value, path, 40);
  if (parsed === null) return null;
  if (!/^\d{4}-\d{2}(-\d{2})?$/.test(parsed)) throw new AiSchemaError(path, "날짜 형식이 아닙니다.");
  return parsed;
}

/* ------------------------------------------------------------------ */
/* 기능 2: 결과 설명                                                     */
/* ------------------------------------------------------------------ */

function factUsed(value: unknown, path: string): AiFactUsed {
  const raw = record(value, path);
  return {
    label: text(raw.label, `${path}.label`, 60),
    before: nullableText(raw.before, `${path}.before`, 80),
    after: text(raw.after, `${path}.after`, 80),
  };
}

export function validateExplainPayload(value: unknown): ExplainPayload {
  const raw = record(value, "explain");
  const headline = text(raw.headline, "explain.headline", 200);
  if (/\n/.test(headline)) throw new AiSchemaError("explain.headline", "한 문장이어야 합니다.");
  return {
    headline,
    reason: text(raw.reason, "explain.reason", 600),
    impact: text(raw.impact, "explain.impact", 600),
    nextAction: text(raw.nextAction, "explain.nextAction", 400),
    factsUsed: array(raw.factsUsed, "explain.factsUsed", 8).map((item, index) =>
      factUsed(item, `explain.factsUsed[${index}]`),
    ),
    warnings: textArray(raw.warnings, "explain.warnings", 5, 300),
  };
}

/* ------------------------------------------------------------------ */
/* 기능 3: 제한형 상담 답변                                              */
/* ------------------------------------------------------------------ */

function citation(value: unknown, path: string): AiCitation {
  const raw = record(value, path);
  return {
    title: text(raw.title, `${path}.title`, 120),
    sourceUrl: nullableText(raw.sourceUrl, `${path}.sourceUrl`, 300),
    asOf: nullableDate(raw.asOf, `${path}.asOf`),
  };
}

export function validateCounselPayload(value: unknown): CounselPayload {
  const raw = record(value, "counsel");
  const escalation = record(raw.escalation ?? {}, "counsel.escalation");
  if (typeof escalation.required !== "boolean") {
    throw new AiSchemaError("counsel.escalation.required", "true/false가 아닙니다.");
  }
  return {
    answer: text(raw.answer, "counsel.answer", 800),
    keyPoints: textArray(raw.keyPoints, "counsel.keyPoints", 6, 300),
    suggestedActions: textArray(raw.suggestedActions, "counsel.suggestedActions", 5, 300),
    citations: array(raw.citations, "counsel.citations", 6).map((item, index) =>
      citation(item, `counsel.citations[${index}]`),
    ),
    escalation: {
      required: escalation.required,
      reason: nullableText(escalation.reason, "counsel.escalation.reason", 300),
    },
  };
}

/* ------------------------------------------------------------------ */
/* 기능 1: 정책 요건 구조화                                              */
/* ------------------------------------------------------------------ */

const INCOME_OPERATORS: IncomeOperator[] = ["LTE", "GTE", "BETWEEN", "UNKNOWN"];

function incomeOperator(value: unknown, path: string): IncomeOperator {
  if (value === null || value === undefined) return "UNKNOWN";
  if (typeof value !== "string" || !INCOME_OPERATORS.includes(value as IncomeOperator)) {
    throw new AiSchemaError(path, `${INCOME_OPERATORS.join("/")} 중 하나가 아닙니다.`);
  }
  return value as IncomeOperator;
}

/**
 * 원문에 없는 조건을 채우지 않는다.
 * 값이 불명확하면 null 또는 UNKNOWN으로 남기고 `needsHumanReview`는 항상 true로 고정한다.
 */
export function validateStructuredPolicyPayload(value: unknown): StructuredPolicyPayload {
  const raw = record(value, "policy");
  const eligibility = record(raw.eligibility ?? {}, "policy.eligibility");
  const age = record(eligibility.age ?? {}, "policy.eligibility.age");
  const residence = record(eligibility.residence ?? {}, "policy.eligibility.residence");
  const income = record(eligibility.income ?? {}, "policy.eligibility.income");
  const employment = record(eligibility.employment ?? {}, "policy.eligibility.employment");
  const period = record(raw.applicationPeriod ?? {}, "policy.applicationPeriod");

  return {
    policyId: text(raw.policyId, "policy.policyId", 60),
    title: text(raw.title, "policy.title", 200),
    eligibility: {
      age: {
        min: nullableNumber(age.min, "policy.eligibility.age.min"),
        max: nullableNumber(age.max, "policy.eligibility.age.max"),
        evidence: nullableText(age.evidence, "policy.eligibility.age.evidence", 400),
      },
      residence: {
        regions: textArray(residence.regions, "policy.eligibility.residence.regions", 20, 60),
        evidence: nullableText(residence.evidence, "policy.eligibility.residence.evidence", 400),
      },
      income: {
        operator: incomeOperator(income.operator, "policy.eligibility.income.operator"),
        min: nullableNumber(income.min, "policy.eligibility.income.min"),
        max: nullableNumber(income.max, "policy.eligibility.income.max"),
        unit: nullableText(income.unit, "policy.eligibility.income.unit", 40),
        evidence: nullableText(income.evidence, "policy.eligibility.income.evidence", 400),
      },
      employment: {
        allowed: textArray(employment.allowed, "policy.eligibility.employment.allowed", 12, 60),
        evidence: nullableText(employment.evidence, "policy.eligibility.employment.evidence", 400),
      },
    },
    applicationPeriod: {
      start: nullableDate(period.start, "policy.applicationPeriod.start"),
      end: nullableDate(period.end, "policy.applicationPeriod.end"),
      evidence: nullableText(period.evidence, "policy.applicationPeriod.evidence", 400),
    },
    requiredDocuments: textArray(raw.requiredDocuments, "policy.requiredDocuments", 15, 120),
    benefits: textArray(raw.benefits, "policy.benefits", 10, 200),
    unknownConditions: textArray(raw.unknownConditions, "policy.unknownConditions", 15, 200),
    // 모델이 false를 반환해도 검수 전에는 규칙 DB에 반영하지 않는다.
    needsHumanReview: true,
    sourceUrl: nullableText(raw.sourceUrl, "policy.sourceUrl", 300),
    sourceAsOf: nullableDate(raw.sourceAsOf, "policy.sourceAsOf"),
  };
}

/* ------------------------------------------------------------------ */
/* 모델 출력 파싱                                                        */
/* ------------------------------------------------------------------ */

/**
 * 모델이 코드 펜스나 짧은 머리말을 붙여도 JSON 본문만 읽는다.
 * 그래도 JSON이 아니면 Schema 오류로 처리해 대체 경로로 보낸다.
 */
export function parseJsonPayload(rawText: string): unknown {
  const withoutFence = rawText.replace(/```(?:json)?/gi, "").trim();
  const start = withoutFence.indexOf("{");
  const end = withoutFence.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) {
    throw new AiSchemaError("response", "JSON 객체를 찾지 못했습니다.");
  }
  try {
    return JSON.parse(withoutFence.slice(start, end + 1));
  } catch {
    throw new AiSchemaError("response", "JSON 형식이 올바르지 않습니다.");
  }
}
