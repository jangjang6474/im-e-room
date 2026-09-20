/**
 * 대체 경로: 준비된 응답(FIXTURE) → 규칙 기반 설명(RULE)
 *
 * 호출 순서는 항상 Claude → fixture → 규칙이다.
 * - `AI_MODE=fixture`이거나 API 키가 없으면 Claude를 건너뛰고 fixture부터 시작한다.
 * - fixture 파일이 없거나 Schema 검증에 실패하면 규칙 기반 설명으로 내려간다.
 *
 * fixture 파일은 읽을 때 한 번 검증하고 메모리에 보관한다. 검증에 실패한 항목은 버린다.
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { AI_DISCLAIMER } from "../../frontend/src/data/aiContracts.js";
import type {
  AiResponseMetadata,
  CounselRequest,
  CounselResponse,
  ExplainRequest,
  ExplainResponse,
  StructurePolicyRequest,
  StructuredPolicy,
} from "../../frontend/src/data/aiContracts.js";
import type { EventType, PersonaId } from "../../frontend/src/data/apiContracts.js";
import { buildRuleCounsel, buildRuleExplanation, highestSeverity } from "../../frontend/src/domain/aiFallback.js";
import {
  validateCounselPayload,
  validateExplainPayload,
  validateStructuredPolicyPayload,
  type CounselPayload,
  type ExplainPayload,
  type StructuredPolicyPayload,
} from "./schemas.js";

const moduleDir = path.dirname(fileURLToPath(import.meta.url));

/** 개발 서버(tsx)와 빌드 산출물(dist/server.js) 모두에서 같은 파일을 찾는다. */
const FIXTURE_DIRS = [
  path.join(process.cwd(), "data", "mock", "ai"),
  path.resolve(moduleDir, "..", "..", "data", "mock", "ai"),
  path.resolve(moduleDir, "..", "data", "mock", "ai"),
];

function readFixtureFile(fileName: string): Record<string, unknown> | null {
  for (const dir of FIXTURE_DIRS) {
    const filePath = path.join(dir, fileName);
    try {
      if (!fs.existsSync(filePath)) continue;
      const parsed = JSON.parse(fs.readFileSync(filePath, "utf8"));
      if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
    } catch (error) {
      console.warn(`[ai] 준비된 응답 파일을 읽지 못했습니다: ${fileName}`);
      return null;
    }
  }
  console.warn(`[ai] 준비된 응답 파일이 없습니다: ${fileName}`);
  return null;
}

const asArray = (value: unknown): Record<string, unknown>[] =>
  Array.isArray(value) ? value.filter((item): item is Record<string, unknown> => typeof item === "object" && item !== null) : [];

const asString = (value: unknown): string | null => (typeof value === "string" && value.trim() ? value.trim() : null);

/** fixture는 준비 시각을 생성 시각으로 쓴다. 시스템 시각에 의존하지 않아 응답이 재현된다. */
export function fixtureMetadata(preparedAt: string | null, isFallback: boolean): AiResponseMetadata {
  return { source: "FIXTURE", generatedAt: preparedAt, model: null, isFallback, disclaimer: AI_DISCLAIMER };
}

export function claudeMetadata(model: string, generatedAt: string): AiResponseMetadata {
  return { source: "CLAUDE", generatedAt, model, isFallback: false, disclaimer: AI_DISCLAIMER };
}

/* ------------------------------------------------------------------ */
/* 설명 fixture                                                         */
/* ------------------------------------------------------------------ */

interface ExplanationFixture {
  id: string;
  personaId: PersonaId | null;
  severity: EventType;
  payload: ExplainPayload;
}

interface LoadedExplanations {
  preparedAt: string | null;
  entries: ExplanationFixture[];
}

let explanationCache: LoadedExplanations | null = null;

function loadExplanations(): LoadedExplanations {
  if (explanationCache) return explanationCache;
  const file = readFixtureFile("explanations.json");
  const entries: ExplanationFixture[] = [];
  for (const raw of asArray(file?.explanations)) {
    const id = asString(raw.id);
    if (!id) continue;
    try {
      entries.push({
        id,
        personaId: (asString(raw.personaId) as PersonaId | null) ?? null,
        severity: (asString(raw.severity) as EventType | null) ?? "INFO",
        payload: validateExplainPayload(raw.payload),
      });
    } catch (error) {
      console.warn(`[ai] 준비된 설명 항목을 건너뜁니다: ${id}`);
    }
  }
  explanationCache = { preparedAt: asString(file?.preparedAt), entries };
  return explanationCache;
}

/**
 * 페르소나와 변화 등급이 모두 맞는 설명을 먼저 찾는다.
 *
 * 금액이 들어 있는 설명은 해당 페르소나의 계산 결과에만 맞으므로
 * 조건이 다르면 금액이 없는 공용 설명(FALLBACK-GENERIC)을 쓴다.
 */
export function explainFromFixture(input: ExplainRequest, isFallback: boolean): ExplainResponse | null {
  const { preparedAt, entries } = loadExplanations();
  if (entries.length === 0) return null;
  const severity = highestSeverity(input.detectedChanges);
  const matched =
    entries.find((entry) => entry.personaId === input.personaId && entry.severity === severity) ??
    entries.find((entry) => entry.personaId === null);
  if (!matched) return null;
  return { ...matched.payload, metadata: fixtureMetadata(preparedAt, isFallback) };
}

/* ------------------------------------------------------------------ */
/* 상담 fixture                                                         */
/* ------------------------------------------------------------------ */

interface CounselFixture {
  id: string;
  keywords: string[];
  payload: CounselPayload;
}

interface LoadedCounsel {
  preparedAt: string | null;
  entries: CounselFixture[];
}

let counselCache: LoadedCounsel | null = null;

function loadCounsel(): LoadedCounsel {
  if (counselCache) return counselCache;
  const file = readFixtureFile("counsel-responses.json");
  const entries: CounselFixture[] = [];
  for (const raw of asArray(file?.responses)) {
    const id = asString(raw.id);
    if (!id) continue;
    try {
      entries.push({
        id,
        keywords: Array.isArray(raw.keywords) ? raw.keywords.filter((word): word is string => typeof word === "string") : [],
        payload: validateCounselPayload(raw.payload),
      });
    } catch (error) {
      console.warn(`[ai] 준비된 상담 답변 항목을 건너뜁니다: ${id}`);
    }
  }
  counselCache = { preparedAt: asString(file?.preparedAt), entries };
  return counselCache;
}

/**
 * 준비된 상담 답변 선택.
 *
 * 질문을 이해하는 것이 아니라 키워드가 겹치는 답변을 고르는 방식이다.
 * 겹치는 키워드가 없으면 "근거 부족" 답변을 쓴다.
 */
export function counselFromFixture(context: CounselRequest, isFallback: boolean): CounselResponse | null {
  const { preparedAt, entries } = loadCounsel();
  if (entries.length === 0) return null;

  const question = context.question.toLowerCase();
  const scored = entries
    .map((entry) => ({
      entry,
      score: entry.keywords.filter((keyword) => question.includes(keyword.toLowerCase())).length,
    }))
    .sort((left, right) => right.score - left.score);

  const best = scored[0];
  const fallbackEntry = entries.find((entry) => entry.keywords.length === 0) ?? entries[0];
  const matched = best && best.score > 0 ? best.entry : fallbackEntry;

  // 위험 신호는 준비된 문구보다 현재 상태가 우선이다.
  const riskDetected = highestSeverity(context.detectedChanges) === "RISK" || context.consultationReason !== null;
  const escalation = riskDetected
    ? {
        required: true,
        reason:
          context.consultationReason ??
          matched.payload.escalation.reason ??
          "위험으로 분류된 변화가 있어 상담사 확인이 필요합니다.",
      }
    : matched.payload.escalation;

  // 출처는 준비된 목록이 아니라 이번 요청에 전달된 검수 근거를 표시한다.
  const citations =
    context.references.length > 0
      ? context.references.map((reference) => ({
          title: reference.title,
          sourceUrl: reference.sourceUrl,
          asOf: reference.asOf,
        }))
      : matched.payload.citations;

  return { ...matched.payload, citations, escalation, metadata: fixtureMetadata(preparedAt, isFallback) };
}

/* ------------------------------------------------------------------ */
/* 정책 구조화 fixture                                                   */
/* ------------------------------------------------------------------ */

interface LoadedPolicies {
  preparedAt: string | null;
  entries: Array<{ id: string; payload: StructuredPolicyPayload }>;
}

let policyCache: LoadedPolicies | null = null;

function loadPolicies(): LoadedPolicies {
  if (policyCache) return policyCache;
  const file = readFixtureFile("structured-policies.json");
  const entries: LoadedPolicies["entries"] = [];
  for (const raw of asArray(file?.policies)) {
    const id = asString(raw.id);
    if (!id) continue;
    try {
      entries.push({ id, payload: validateStructuredPolicyPayload(raw.payload) });
    } catch (error) {
      console.warn(`[ai] 준비된 정책 구조화 항목을 건너뜁니다: ${id}`);
    }
  }
  policyCache = { preparedAt: asString(file?.preparedAt), entries };
  return policyCache;
}

export function structuredPolicyFromFixture(
  input: StructurePolicyRequest,
  isFallback: boolean,
): StructuredPolicy | null {
  const { preparedAt, entries } = loadPolicies();
  const matched = entries.find((entry) => entry.id === input.policyId);
  if (!matched) return null;
  return { ...matched.payload, metadata: fixtureMetadata(preparedAt, isFallback) };
}

/**
 * 규칙 기반 정책 구조화 대체본.
 *
 * 원문을 해석하지 않는다. 모든 조건을 모르는 값으로 두고 검수가 필요하다고만 기록한다.
 * 빈 값을 충족으로 착각하지 않도록 unknownConditions에 이유를 남긴다.
 */
export function buildRuleStructuredPolicy(input: StructurePolicyRequest, isFallback: boolean): StructuredPolicy {
  return {
    policyId: input.policyId,
    title: input.title,
    eligibility: {
      age: { min: null, max: null, evidence: null },
      residence: { regions: [], evidence: null },
      income: { operator: "UNKNOWN", min: null, max: null, unit: null, evidence: null },
      employment: { allowed: [], evidence: null },
    },
    applicationPeriod: { start: null, end: null, evidence: null },
    requiredDocuments: [],
    benefits: [],
    unknownConditions: [
      "자동 구조화를 수행하지 못했습니다. 모든 요건은 담당자가 원문에서 직접 확인해야 합니다.",
      "이 초안에는 확인된 조건이 없으므로 자격 판정에 사용할 수 없습니다.",
    ],
    needsHumanReview: true,
    sourceUrl: input.sourceUrl,
    sourceAsOf: input.sourceAsOf,
    metadata: {
      source: "RULE",
      generatedAt: null,
      model: null,
      isFallback,
      disclaimer: AI_DISCLAIMER,
    },
  };
}

/* ------------------------------------------------------------------ */
/* 대체 경로 묶음                                                        */
/* ------------------------------------------------------------------ */

/** fixture가 없으면 규칙 기반 설명으로 내려간다. */
export function explainWithoutClaude(input: ExplainRequest, isFallback: boolean): ExplainResponse {
  return explainFromFixture(input, isFallback) ?? buildRuleExplanation(input, isFallback);
}

export function counselWithoutClaude(context: CounselRequest, isFallback: boolean): CounselResponse {
  return counselFromFixture(context, isFallback) ?? buildRuleCounsel(context, isFallback);
}

export function structuredPolicyWithoutClaude(input: StructurePolicyRequest, isFallback: boolean): StructuredPolicy {
  return structuredPolicyFromFixture(input, isFallback) ?? buildRuleStructuredPolicy(input, isFallback);
}

/** 테스트·검증 스크립트에서 파일을 다시 읽게 한다. */
export function resetFixtureCache(): void {
  explanationCache = null;
  counselCache = null;
  policyCache = null;
}
