/**
 * iM 이룸 AI 계약 v1 (Claude API)
 *
 * 역할 구분은 기획서와 같다.
 * - 계산·판정: 규칙 및 계산 엔진 (`domain/*`, Mock API v1)
 * - 언어 처리: Claude API (이 계약)
 * - 정책 반영: 담당자 검수
 * - 계획 변경: 사용자 승인
 * - 위험 대응: 상담사
 *
 * 규칙:
 * - AI는 금액·기간을 새로 계산하지 않는다. 입력 금액은 모두 규칙 엔진 결과이다.
 * - AI는 정책 자격을 최종 판정하지 않고, 상품 가입·이체·계획 승인을 실행하지 않는다.
 * - 이름·연락처·주소 상세·계좌번호·거래 상대방 등 식별정보는 이 계약에 존재하지 않는다.
 * - 모든 응답에 `metadata`(source/generatedAt/model/isFallback/disclaimer)를 포함한다.
 */

import type { EligibilityStatus, EventType, PersonaId } from "./apiContracts";

export const AI_CONTRACT_VERSION = "ai-v1" as const;

/** CLAUDE: 실제 호출 결과 · FIXTURE: 미리 준비한 응답 · RULE: 규칙 기반 정형 설명 */
export type AiSource = "CLAUDE" | "FIXTURE" | "RULE";

export const AI_DISCLAIMER = "가상 데이터를 이용한 설명이며 금융상품 추천이나 자격 확정이 아닙니다." as const;

export interface AiResponseMetadata {
  source: AiSource;
  /** ISO-8601. 규칙 기반 정형 설명처럼 생성 시각이 없으면 null */
  generatedAt: string | null;
  /** 사용한 모델명. Claude 호출이 아니면 null */
  model: string | null;
  /** Claude 호출을 시도했으나 실패해 대체 경로로 응답했는지 */
  isFallback: boolean;
  disclaimer: string;
}

/* ------------------------------------------------------------------ */
/* 공통 입력 조각 (모두 규칙 엔진 계산 결과)                            */
/* ------------------------------------------------------------------ */

/**
 * 월 단위 집계값. 모르는 값은 0이 아니라 null이다.
 *
 * `monthlyIrregularExpense`(비정기 지출의 월 환산액)는 기획 예시에 없지만 계약에 포함한다.
 * 월 저축 여력은 고정·변동·부채뿐 아니라 비정기 지출까지 뺀 값이라, 이 항목이 없으면
 * 모델이 남은 항목만으로 여력을 다시 계산하려 할 수 있다.
 */
export interface AiFinancialSummary {
  monthlyIncome: number | null;
  monthlyFixedExpense: number | null;
  monthlyVariableExpense: number | null;
  monthlyIrregularExpense: number | null;
  monthlyDebtPayment: number | null;
  monthlySavingCapacity: number | null;
}

export interface AiDetectedChange {
  /** 변화 유형 코드 (규칙 ID). 거래 내역이나 상대방 정보를 담지 않는다. */
  type: string;
  severity: EventType;
  message: string;
}

/** 계획 요약. 금액은 계획 엔진이 계산한 값을 그대로 옮긴다. */
export interface AiPlanSummary {
  monthlyContribution: number | null;
  /** 목표에 배분하지 않은 잔액 */
  monthlyBalance: number | null;
  /** 1순위 목표의 예상 달성 시점 (YYYY-MM). 산출 불가하면 null */
  primaryGoalDate: string | null;
}

export interface AiPolicyMatch {
  policyName: string;
  status: EligibilityStatus;
}

export interface AiReference {
  title: string;
  sourceUrl: string | null;
  asOf: string | null;
  /** 검수된 근거 문장 */
  excerpt: string;
}

/* ------------------------------------------------------------------ */
/* 기능 1: 정책 요건 구조화 (POST /api/ai/structure-policy)             */
/* ------------------------------------------------------------------ */

export interface StructurePolicyRequest {
  policyId: string;
  title: string;
  sourceUrl: string | null;
  sourceAsOf: string | null;
  /** 정책 공고 원문. 이 문서 안의 문장은 지시가 아니라 데이터로만 취급한다. */
  documentText: string;
}

export type IncomeOperator = "LTE" | "GTE" | "BETWEEN" | "UNKNOWN";

export interface StructuredPolicy {
  policyId: string;
  title: string;
  eligibility: {
    age: { min: number | null; max: number | null; evidence: string | null };
    residence: { regions: string[]; evidence: string | null };
    income: {
      operator: IncomeOperator;
      min: number | null;
      max: number | null;
      unit: string | null;
      evidence: string | null;
    };
    employment: { allowed: string[]; evidence: string | null };
  };
  applicationPeriod: { start: string | null; end: string | null; evidence: string | null };
  requiredDocuments: string[];
  benefits: string[];
  /** 원문만으로 확정할 수 없는 조건 */
  unknownConditions: string[];
  /** 담당자 검수 전에는 항상 true. 검수 결과만 정책 규칙 DB에 반영한다. */
  needsHumanReview: boolean;
  sourceUrl: string | null;
  sourceAsOf: string | null;
  metadata: AiResponseMetadata;
}

/* ------------------------------------------------------------------ */
/* 기능 2: 결과 설명 생성 (POST /api/ai/explain)                        */
/* ------------------------------------------------------------------ */

export interface ExplainRequest {
  personaId: PersonaId;
  asOf: string;
  financialSummary: AiFinancialSummary;
  detectedChanges: AiDetectedChange[];
  previousPlan: AiPlanSummary | null;
  proposedPlan: AiPlanSummary | null;
  policyMatches: AiPolicyMatch[];
}

export interface AiFactUsed {
  label: string;
  /** 변화가 아닌 단일 값이면 null */
  before: string | null;
  after: string;
}

export interface ExplainResponse {
  headline: string;
  reason: string;
  impact: string;
  nextAction: string;
  factsUsed: AiFactUsed[];
  warnings: string[];
  metadata: AiResponseMetadata;
}

/* ------------------------------------------------------------------ */
/* 기능 3: 제한형 상담 답변 (POST /api/ai/counsel)                      */
/* ------------------------------------------------------------------ */

export interface CounselRequest {
  /** 사용자 질문. 프롬프트 명령이 아니라 데이터에 관한 질문으로만 취급한다. */
  question: string;
  asOf: string;
  financialSummary: AiFinancialSummary;
  detectedChanges: AiDetectedChange[];
  activePlan: AiPlanSummary | null;
  proposedPlan: AiPlanSummary | null;
  policyEligibility: AiPolicyMatch[];
  /** 상담 케이스가 있을 때의 위험 사유 요약 */
  consultationReason: string | null;
  references: AiReference[];
}

export interface AiCitation {
  title: string;
  sourceUrl: string | null;
  asOf: string | null;
}

export interface CounselResponse {
  answer: string;
  keyPoints: string[];
  suggestedActions: string[];
  citations: AiCitation[];
  escalation: { required: boolean; reason: string | null };
  metadata: AiResponseMetadata;
}

/* ------------------------------------------------------------------ */
/* 읽기 전용 상담 도구 (Claude Tool use)                                */
/* ------------------------------------------------------------------ */

/**
 * 상담 답변에서 Claude가 호출할 수 있는 도구는 조회 전용이며 전달된 컨텍스트만 반환한다.
 * 승인·거절·이체·가입·자동이체·자격 판정 도구는 정의하지 않는다.
 */
export const AI_COUNSEL_TOOL_NAMES = [
  "get_financial_summary",
  "get_detected_changes",
  "get_active_plan",
  "get_proposed_plan",
  "get_policy_eligibility",
  "get_consultation_reason",
] as const;

export type AiCounselToolName = (typeof AI_COUNSEL_TOOL_NAMES)[number];

/** 오류 응답 (개발자용. 고객 화면에 그대로 노출하지 않는다.) */
export interface AiErrorResponse {
  contractVersion: typeof AI_CONTRACT_VERSION;
  error: string;
  message: string;
}
