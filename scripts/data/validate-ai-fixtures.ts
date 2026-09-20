/**
 * AI 계약·fixture·대체 경로 검증 (npm run ai:validate 에서 실행)
 *
 * 확인 범위
 * 1. 준비된 AI 응답이 Schema를 통과하는지와 필요한 항목 수를 채웠는지
 * 2. fixture에 개인정보와 가상 고객 이름이 없는지
 * 3. 페르소나별 설명의 금액이 규칙 엔진 계산 결과와 같은지 (AI가 금액을 만들지 않는지)
 * 4. 비식별 처리가 식별정보와 계약 밖 필드를 제거하는지
 * 5. Schema 위반·JSON 아님·도구 왕복 실패가 대체 경로로 내려가는지
 * 6. API 키가 없을 때 세 API가 모두 표시 가능한 응답을 주는지
 */

import { readFile } from "node:fs/promises";
import path from "node:path";
import { handleCounsel } from "../../api/ai/counsel";
import { handleExplain } from "../../api/ai/explain";
import { handleStructurePolicy } from "../../api/ai/structure-policy";
import { aiConfig } from "../../backend/ai/claude-client";
import {
  buildRuleStructuredPolicy,
  counselWithoutClaude,
  explainWithoutClaude,
  resetFixtureCache,
} from "../../backend/ai/fallback";
import {
  AiSchemaError,
  parseJsonPayload,
  validateCounselPayload,
  validateExplainPayload,
  validateStructuredPolicyPayload,
} from "../../backend/ai/schemas";
import { AiInputError, redactFreeText, sanitizeCounselRequest, sanitizeExplainRequest } from "../../backend/ai/sanitize";
import type {
  CounselRequest,
  CounselResponse,
  ExplainRequest,
  ExplainResponse,
  StructuredPolicy,
} from "../../frontend/src/data/aiContracts";
import type { MonthlyReviewResponse, PersonaId } from "../../frontend/src/data/apiContracts";
import { buildCounselRequest, buildExplainRequest } from "../../frontend/src/data/aiInputs";
import { buildRuleCounsel, buildRuleExplanation } from "../../frontend/src/domain/aiFallback";
import { getDiagnosis, getEligibility } from "../../frontend/src/domain/mockBackend";
import { projectRoot } from "./shared";

const errors: string[] = [];
let checks = 0;
const check = (condition: unknown, message: string) => {
  checks += 1;
  if (!condition) errors.push(message);
};

const aiDir = path.join(projectRoot, "data", "mock", "ai");
const apiDir = path.join(projectRoot, "data", "mock", "api");
const readAiFixture = async (name: string) => JSON.parse(await readFile(path.join(aiDir, name), "utf8"));
const readApiFixture = async (name: string) => JSON.parse(await readFile(path.join(apiDir, name), "utf8"));

/** 검증은 실제 파일만 본다. 이전 실행의 캐시를 쓰지 않는다. */
resetFixtureCache();

/* ------------------------------------------------------------------ */
/* 0. 검증 환경                                                         */
/* ------------------------------------------------------------------ */

const config = aiConfig();
check(
  config.live === false,
  "이 검증은 Claude를 호출하지 않는 상태에서 실행해야 합니다. AI_MODE=fixture로 실행하세요.",
);

/* ------------------------------------------------------------------ */
/* 1. fixture Schema와 구성                                             */
/* ------------------------------------------------------------------ */

const explanationsFile = await readAiFixture("explanations.json");
const counselFile = await readAiFixture("counsel-responses.json");
const policiesFile = await readAiFixture("structured-policies.json");

const explanationEntries: Array<{ id: string; personaId: string | null; severity: string; payload: unknown }> =
  explanationsFile.explanations ?? [];
const counselEntries: Array<{ id: string; keywords: string[]; payload: unknown }> = counselFile.responses ?? [];
const policyEntries: Array<{ id: string; payload: unknown }> = policiesFile.policies ?? [];

for (const entry of explanationEntries) {
  try {
    validateExplainPayload(entry.payload);
    checks += 1;
  } catch (error) {
    check(false, `explanations.json ${entry.id}: Schema 위반 (${(error as Error).message})`);
  }
}
for (const entry of counselEntries) {
  try {
    validateCounselPayload(entry.payload);
    checks += 1;
  } catch (error) {
    check(false, `counsel-responses.json ${entry.id}: Schema 위반 (${(error as Error).message})`);
  }
}
for (const entry of policyEntries) {
  try {
    const payload = validateStructuredPolicyPayload(entry.payload);
    check(payload.needsHumanReview === true, `structured-policies.json ${entry.id}: needsHumanReview가 true가 아닙니다.`);
    check(
      payload.unknownConditions.length > 0,
      `structured-policies.json ${entry.id}: 검수가 필요한 항목(unknownConditions)이 비어 있습니다.`,
    );
  } catch (error) {
    check(false, `structured-policies.json ${entry.id}: Schema 위반 (${(error as Error).message})`);
  }
}

// 기획에서 요구한 최소 구성
for (const personaId of ["P01", "P02", "P03"]) {
  check(
    explanationEntries.some((entry) => entry.personaId === personaId),
    `explanations.json: ${personaId} 설명이 없습니다.`,
  );
}
check(
  explanationEntries.some((entry) => entry.personaId === null),
  "explanations.json: Claude 장애 시 쓸 공용 설명(personaId=null)이 없습니다.",
);
check(
  explanationEntries.some((entry) => entry.personaId === "P03" && entry.severity === "RISK"),
  "explanations.json: P03 위험 상담 설명이 없습니다.",
);
check(counselEntries.length >= 7, `counsel-responses.json: 답변이 7개 미만입니다 (${counselEntries.length}).`);
check(
  counselEntries.filter((entry) => entry.keywords.length > 0).length >= 5,
  "counsel-responses.json: 일반 상담 답변이 5개 미만입니다.",
);
check(
  counselEntries.some((entry) => entry.keywords.length === 0),
  "counsel-responses.json: 근거 부족 답변(키워드 없는 기본 답변)이 없습니다.",
);
check(
  counselEntries.some((entry) => {
    const payload = entry.payload as CounselResponse;
    return payload.escalation?.required === true;
  }),
  "counsel-responses.json: 상담사 연결 답변이 없습니다.",
);
check(policyEntries.length >= 3, `structured-policies.json: 정책 구조화 결과가 3개 미만입니다 (${policyEntries.length}).`);

/* ------------------------------------------------------------------ */
/* 2. fixture에 개인정보가 없는지                                        */
/* ------------------------------------------------------------------ */

const PII_PATTERNS: Array<[RegExp, string]> = [
  [/[\w.+-]+@[\w-]+\.[\w.-]+/, "이메일"],
  [/\d{6}\s*[-–]\s*[1-4]\d{6}/, "주민등록번호 형식"],
  [/0\d{1,2}[-\s]?\d{3,4}[-\s]?\d{4}/, "전화번호 형식"],
  [/\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}/, "카드번호 형식"],
];
// 합성 고객 이름도 프롬프트·설명에 넣지 않는다.
const SYNTHETIC_NAMES = ["김이룸", "박하늘", "이도윤", "정다온"];

for (const [fileName, content] of [
  ["explanations.json", explanationsFile],
  ["counsel-responses.json", counselFile],
  ["structured-policies.json", policiesFile],
] as const) {
  const text = JSON.stringify(content);
  for (const [pattern, label] of PII_PATTERNS) {
    check(!pattern.test(text), `${fileName}: ${label}으로 보이는 값이 있습니다.`);
  }
  for (const name of SYNTHETIC_NAMES) {
    check(!text.includes(name), `${fileName}: 고객 이름 ${name}이 들어 있습니다.`);
  }
}

// 고객마다 금액이 다른 답변에는 절대 금액을 쓰지 않는다.
const MONEY_PATTERN = /[\d,]+\s*원/;
for (const entry of counselEntries) {
  check(
    !MONEY_PATTERN.test(JSON.stringify(entry.payload)),
    `counsel-responses.json ${entry.id}: 상담 답변에는 금액을 적지 않습니다 (고객마다 값이 달라집니다).`,
  );
}
for (const entry of explanationEntries.filter((item) => item.personaId === null)) {
  check(
    !MONEY_PATTERN.test(JSON.stringify(entry.payload)),
    `explanations.json ${entry.id}: 공용 설명에는 금액을 적지 않습니다.`,
  );
}

/* ------------------------------------------------------------------ */
/* 3. 설명의 금액이 규칙 엔진 결과와 같은지                              */
/* ------------------------------------------------------------------ */

const krw = (value: number | null) => (value === null ? null : `${value.toLocaleString("ko-KR")}원`);
const monthLabel = (value: string | null) => {
  if (!value) return "산출 불가";
  const match = value.match(/^(\d{4})-(\d{2})$/);
  return match ? `${match[1]}년 ${Number(match[2])}월` : value;
};

for (const personaId of ["P01", "P02", "P03"] as PersonaId[]) {
  const review: MonthlyReviewResponse = await readApiFixture(`${personaId}.monthly-review.json`);
  const fixture = explanationEntries.find((entry) => entry.personaId === personaId);
  if (!fixture) continue;
  const payload = fixture.payload as ExplainResponse;
  const previous = review.previousPlan;
  const proposed = review.proposedPlan;
  const active = proposed ?? previous;

  // 계산 결과에 존재하는 금액 집합. 설명 문장의 금액은 모두 이 안에 있어야 한다.
  const allowedAmounts = new Set<string>();
  for (const metrics of [review.previousMetrics, review.currentMetrics]) {
    for (const value of Object.values(metrics)) if (typeof value === "number") allowedAmounts.add(krw(value)!);
  }
  for (const plan of [previous, proposed]) {
    if (!plan) continue;
    allowedAmounts.add(krw(plan.totalMonthlyAmount)!);
    allowedAmounts.add(krw(plan.unallocatedAmount)!);
    for (const allocation of plan.allocations) {
      allowedAmounts.add(krw(allocation.monthlyAmount)!);
      allowedAmounts.add(krw(allocation.remainingAmount)!);
    }
  }
  // 변화 이벤트 메시지에 이미 등장한 금액(월세 전후 등)도 계산 결과다.
  for (const event of review.events) {
    for (const found of event.message.match(/[\d,]+원/g) ?? []) allowedAmounts.add(found);
  }

  for (const found of JSON.stringify(payload).match(/[\d,]+원/g) ?? []) {
    check(
      allowedAmounts.has(found),
      `explanations.json ${fixture.id}: ${found}은 ${personaId} 계산 결과에 없는 금액입니다.`,
    );
  }

  const expected: Record<string, { before: string | null; after: string | null }> = {
    "월 납입액": {
      before: proposed ? krw(previous.totalMonthlyAmount) : null,
      after: krw(active.totalMonthlyAmount),
    },
    "잔액": {
      before: proposed ? krw(previous.unallocatedAmount) : null,
      after: krw(active.unallocatedAmount),
    },
    "1순위 목표 예상 달성 시점": {
      before: proposed ? monthLabel(previous.allocations[0]?.expectedCompletionMonth ?? null) : null,
      after: monthLabel(active.allocations[0]?.expectedCompletionMonth ?? null),
    },
    "월 저축 여력": { before: null, after: krw(review.currentMetrics.availableSurplus) },
  };

  for (const fact of payload.factsUsed) {
    const target = expected[fact.label];
    if (!target) continue;
    check(
      fact.after === target.after,
      `explanations.json ${fixture.id}: "${fact.label}" 이후 값이 계산 결과와 다릅니다 (${fact.after} ≠ ${target.after}).`,
    );
    check(
      fact.before === target.before,
      `explanations.json ${fixture.id}: "${fact.label}" 이전 값이 계산 결과와 다릅니다 (${fact.before} ≠ ${target.before}).`,
    );
  }
}

/* ------------------------------------------------------------------ */
/* 4. 비식별 처리                                                       */
/* ------------------------------------------------------------------ */

const redacted = redactFreeText(
  "이름 홍길동 이메일 test.user@example.com 전화 010-1234-5678 주민번호 900101-1234567 계좌 1002-345-678901 카드 1234-5678-9012-3456",
);
check(!/test\.user@example\.com/.test(redacted), "비식별 처리: 이메일이 남아 있습니다.");
check(!/010-1234-5678/.test(redacted), "비식별 처리: 전화번호가 남아 있습니다.");
check(!/900101-1234567/.test(redacted), "비식별 처리: 주민등록번호가 남아 있습니다.");
check(!/1002-345-678901/.test(redacted), "비식별 처리: 계좌번호가 남아 있습니다.");
check(!/1234-5678-9012-3456/.test(redacted), "비식별 처리: 카드번호가 남아 있습니다.");

// 계약 밖 필드는 화이트리스트에서 빠지므로 그대로 사라진다.
const sanitizedExplain = sanitizeExplainRequest({
  personaId: "P02",
  asOf: "2026-10-27",
  customerName: "박하늘",
  accountNumber: "1002-345-678901",
  transactions: [{ id: "tx-1", counterparty: "○○상사", description: "급여" }],
  financialSummary: { monthlyIncome: 3500000, monthlySavingCapacity: 1753700, secretField: "x" },
  detectedChanges: [{ type: "CHG-RENT-CHANGE", severity: "ADJUSTMENT", message: "월세가 올랐습니다.", transactionIds: ["tx-1"] }],
  previousPlan: { monthlyContribution: 960000, monthlyBalance: 761350, primaryGoalDate: "2027-09" },
  proposedPlan: null,
  policyMatches: [],
});
const sanitizedExplainText = JSON.stringify(sanitizedExplain);
check(!sanitizedExplainText.includes("박하늘"), "비식별 처리: 고객 이름이 요청에 남아 있습니다.");
check(!sanitizedExplainText.includes("1002-345-678901"), "비식별 처리: 계좌번호가 요청에 남아 있습니다.");
check(!sanitizedExplainText.includes("○○상사"), "비식별 처리: 거래 상대방이 요청에 남아 있습니다.");
check(!sanitizedExplainText.includes("tx-1"), "비식별 처리: 거래 식별자가 요청에 남아 있습니다.");
check(!sanitizedExplainText.includes("secretField"), "비식별 처리: 계약에 없는 필드가 요청에 남아 있습니다.");
check(sanitizedExplain.financialSummary.monthlySavingCapacity === 1753700, "비식별 처리: 허용된 합계가 사라졌습니다.");
check(sanitizedExplain.financialSummary.monthlyFixedExpense === null, "비식별 처리: 없는 값을 0으로 채웠습니다.");

// 질문 안의 식별정보도 제거한다.
const sanitizedCounsel = sanitizeCounselRequest({
  question: "내 계좌 1002-345-678901 와 010-1234-5678 로 확인해 주세요",
  asOf: "2026-10-27",
  financialSummary: {},
  detectedChanges: [],
  activePlan: null,
  proposedPlan: null,
  policyEligibility: [],
  consultationReason: null,
  references: [],
});
check(!/1002-345-678901/.test(sanitizedCounsel.question), "비식별 처리: 질문의 계좌번호가 남아 있습니다.");
check(!/010-1234-5678/.test(sanitizedCounsel.question), "비식별 처리: 질문의 전화번호가 남아 있습니다.");

let rejected = false;
try {
  sanitizeExplainRequest({ personaId: "UNKNOWN" });
} catch (error) {
  rejected = error instanceof AiInputError;
}
check(rejected, "비식별 처리: 잘못된 personaId를 거부하지 않았습니다.");

/* ------------------------------------------------------------------ */
/* 5. Schema 위반과 대체 경로                                            */
/* ------------------------------------------------------------------ */

const expectSchemaError = (run: () => unknown, label: string) => {
  checks += 1;
  try {
    run();
    errors.push(`${label}: Schema 오류를 던지지 않았습니다.`);
  } catch (error) {
    if (!(error instanceof AiSchemaError)) errors.push(`${label}: AiSchemaError가 아닌 오류입니다.`);
  }
};

expectSchemaError(() => parseJsonPayload("죄송하지만 JSON을 만들 수 없습니다."), "JSON이 아닌 응답");
expectSchemaError(() => parseJsonPayload('```json\n{"headline": '), "잘린 JSON 응답");
expectSchemaError(() => validateExplainPayload({ headline: "", reason: "r", impact: "i", nextAction: "n" }), "빈 headline");
expectSchemaError(
  () => validateExplainPayload({ headline: "한 줄\n두 줄", reason: "r", impact: "i", nextAction: "n" }),
  "여러 문장 headline",
);
expectSchemaError(
  () => validateCounselPayload({ answer: "a", escalation: { required: "yes" } }),
  "escalation.required 타입 위반",
);
expectSchemaError(
  () => validateStructuredPolicyPayload({ policyId: "p", title: "t", applicationPeriod: { start: "2026년 3월" } }),
  "신청 기간 날짜 형식 위반",
);

// 코드 펜스와 머리말이 붙은 정상 응답은 그대로 읽는다.
const fenced = parseJsonPayload('설명입니다.\n```json\n{"headline":"h","reason":"r","impact":"i","nextAction":"n"}\n```');
check(validateExplainPayload(fenced).headline === "h", "코드 펜스가 있는 정상 JSON을 읽지 못했습니다.");

// 모델이 needsHumanReview=false를 반환해도 검수 전 상태를 유지한다.
const forcedReview = validateStructuredPolicyPayload({
  policyId: "p",
  title: "t",
  needsHumanReview: false,
  eligibility: { age: { min: 19, max: 34 } },
});
check(forcedReview.needsHumanReview === true, "정책 구조화: needsHumanReview를 true로 고정하지 못했습니다.");

/* ------------------------------------------------------------------ */
/* 6. 키 없는 환경에서 세 API 응답                                       */
/* ------------------------------------------------------------------ */

type Captured = { code: number; payload: unknown };
const callHandler = async (
  handler: (req: { body?: unknown }, res: { status(code: number): { json(body: unknown): unknown } }) => Promise<void>,
  body: unknown,
): Promise<Captured> => {
  let captured: Captured | null = null;
  await handler(
    { body },
    {
      status: (code: number) => ({
        json: (payload: unknown) => {
          captured = { code, payload };
          return payload;
        },
      }),
    },
  );
  if (!captured) throw new Error("핸들러가 응답하지 않았습니다.");
  return captured;
};

const ALLOWED_SOURCES = ["FIXTURE", "RULE"];

for (const personaId of ["P01", "P02", "P03"] as PersonaId[]) {
  const review: MonthlyReviewResponse = await readApiFixture(`${personaId}.monthly-review.json`);
  const session = {
    personaId,
    diagnosis: getDiagnosis(personaId),
    eligibility: getEligibility(personaId),
    review,
    currentPlan: review.previousPlan,
    consultation: review.consultationCase,
  };

  const explainRequest: ExplainRequest = buildExplainRequest(session);
  const explainResult = await callHandler(handleExplain, explainRequest);
  const explanation = explainResult.payload as ExplainResponse;
  check(explainResult.code === 200, `${personaId} 설명: HTTP 200이 아닙니다 (${explainResult.code}).`);
  check(
    ALLOWED_SOURCES.includes(explanation.metadata.source),
    `${personaId} 설명: 키가 없는데 source가 ${explanation.metadata.source}입니다.`,
  );
  check(explanation.metadata.model === null, `${personaId} 설명: Claude를 부르지 않았는데 모델명이 있습니다.`);
  check(explanation.metadata.disclaimer.length > 0, `${personaId} 설명: 고지 문구가 없습니다.`);
  check(explanation.headline.length > 0, `${personaId} 설명: headline이 비어 있습니다.`);

  const counselRequest: CounselRequest = buildCounselRequest(session, "왜 이번 달 납입액이 달라졌나요?");
  const counselResult = await callHandler(handleCounsel, counselRequest);
  const counsel = counselResult.payload as CounselResponse;
  check(counselResult.code === 200, `${personaId} 상담: HTTP 200이 아닙니다 (${counselResult.code}).`);
  check(
    ALLOWED_SOURCES.includes(counsel.metadata.source),
    `${personaId} 상담: 키가 없는데 source가 ${counsel.metadata.source}입니다.`,
  );
  check(counsel.citations.length > 0, `${personaId} 상담: 출처가 표시되지 않았습니다.`);
  check(
    counsel.citations.every((citation) => citation.asOf !== null),
    `${personaId} 상담: 출처에 기준일이 없습니다.`,
  );

  // 위험 시나리오에서는 반드시 상담사 연결을 안내한다.
  if (review.overallType === "RISK") {
    check(counsel.escalation.required === true, `${personaId} 상담: 위험 상황인데 상담사 연결을 안내하지 않았습니다.`);
    check(counsel.escalation.reason !== null, `${personaId} 상담: 상담사 연결 사유가 없습니다.`);
  }

  // 규칙 기반 대체본도 같은 계약을 만족해야 한다.
  const ruleExplanation = buildRuleExplanation(explainRequest, true);
  validateExplainPayload(ruleExplanation);
  check(ruleExplanation.metadata.source === "RULE", `${personaId}: 규칙 기반 설명의 source가 RULE이 아닙니다.`);
  check(ruleExplanation.metadata.isFallback === true, `${personaId}: 대체 경로 표시가 없습니다.`);
  const ruleCounsel = buildRuleCounsel(counselRequest, true);
  validateCounselPayload(ruleCounsel);
  check(ruleCounsel.metadata.generatedAt === null, `${personaId}: 규칙 기반 응답에 생성 시각이 있습니다.`);

  // 대체 경로 응답의 금액도 계산 결과 그대로여야 한다.
  const engineAmounts = new Set(
    [
      review.previousPlan.totalMonthlyAmount,
      review.previousPlan.unallocatedAmount,
      review.proposedPlan?.totalMonthlyAmount,
      review.proposedPlan?.unallocatedAmount,
      review.currentMetrics.availableSurplus,
    ]
      .filter((value): value is number => typeof value === "number")
      .map((value) => `${value.toLocaleString("ko-KR")}원`),
  );
  for (const fact of ruleExplanation.factsUsed) {
    for (const value of [fact.before, fact.after]) {
      if (value && /[\d,]+원/.test(value)) {
        check(engineAmounts.has(value), `${personaId} 규칙 기반 설명: ${value}은 계산 결과에 없는 금액입니다.`);
      }
    }
  }
}

// 준비된 응답이 없는 정책은 모르는 값으로만 채운 초안을 만든다.
const unknownPolicy: StructuredPolicy = buildRuleStructuredPolicy(
  { policyId: "unknown-policy", title: "새 공고", sourceUrl: null, sourceAsOf: null, documentText: "만 19세 이상" },
  true,
);
check(unknownPolicy.eligibility.age.min === null, "규칙 기반 정책 초안: 확인하지 않은 나이 조건을 채웠습니다.");
check(unknownPolicy.eligibility.income.operator === "UNKNOWN", "규칙 기반 정책 초안: 소득 조건이 UNKNOWN이 아닙니다.");
check(unknownPolicy.needsHumanReview === true, "규칙 기반 정책 초안: needsHumanReview가 true가 아닙니다.");

const policyResult = await callHandler(handleStructurePolicy, {
  policyId: "mock-youth-001",
  title: "대구 청년 자산형성 지원",
  sourceUrl: "https://www.youthcenter.go.kr/",
  sourceAsOf: "2026-09-19",
  documentText: "지원 대상: 만 19~34세 대구광역시 거주 청년",
});
const structured = policyResult.payload as StructuredPolicy;
check(policyResult.code === 200, `정책 구조화: HTTP 200이 아닙니다 (${policyResult.code}).`);
check(structured.needsHumanReview === true, "정책 구조화: 검수 필요 표시가 없습니다.");
check(
  ALLOWED_SOURCES.includes(structured.metadata.source),
  `정책 구조화: 키가 없는데 source가 ${structured.metadata.source}입니다.`,
);

// 잘못된 입력은 400으로 거부한다.
const badRequest = await callHandler(handleExplain, { personaId: "NOPE" });
check(badRequest.code === 400, `잘못된 요청: 400이 아닙니다 (${badRequest.code}).`);

// 근거가 없는 질문에는 확인하기 어렵다고 답한다.
const noEvidence = await callHandler(handleCounsel, {
  question: "비트코인 수익률은 얼마나 되나요?",
  asOf: "2026-10-27",
  financialSummary: {},
  detectedChanges: [],
  activePlan: null,
  proposedPlan: null,
  policyEligibility: [],
  consultationReason: null,
  references: [],
});
const noEvidenceAnswer = noEvidence.payload as CounselResponse;
check(
  noEvidenceAnswer.answer.includes("확인하기 어렵") || noEvidenceAnswer.answer.includes("알려드릴 수 없"),
  "근거 부족 질문: 확인하기 어렵다는 답변이 아닙니다.",
);

// fixture 파일을 읽을 수 없는 상황에서도 응답이 나와야 한다(규칙 기반).
const explainOnlyRule = explainWithoutClaude(
  {
    personaId: "P01",
    asOf: "2026-10-15",
    financialSummary: {
      monthlyIncome: null,
      monthlyFixedExpense: null,
      monthlyVariableExpense: null,
      monthlyIrregularExpense: null,
      monthlyDebtPayment: null,
      monthlySavingCapacity: null,
    },
    detectedChanges: [],
    previousPlan: null,
    proposedPlan: null,
    policyMatches: [],
  },
  true,
);
validateExplainPayload(explainOnlyRule);
check(
  explainOnlyRule.factsUsed.every((fact) => fact.after !== "0원"),
  "결측값을 0원으로 채웠습니다.",
);

const counselOnlyRule = counselWithoutClaude(
  {
    question: "지금 상태를 알려주세요",
    asOf: "2026-10-15",
    financialSummary: {
      monthlyIncome: null,
      monthlyFixedExpense: null,
      monthlyVariableExpense: null,
      monthlyIrregularExpense: null,
      monthlyDebtPayment: null,
      monthlySavingCapacity: null,
    },
    detectedChanges: [{ type: "CHG-INCOME-STOP", severity: "RISK", message: "소득이 확인되지 않습니다." }],
    activePlan: null,
    proposedPlan: null,
    policyEligibility: [],
    consultationReason: null,
    references: [],
  },
  true,
);
validateCounselPayload(counselOnlyRule);
check(counselOnlyRule.escalation.required === true, "위험 신호가 있는데 상담사 연결을 안내하지 않았습니다.");

if (errors.length) {
  throw new Error(`AI 계약 검증 실패 (${errors.length}/${checks}):\n- ${errors.join("\n- ")}`);
}
console.log(
  `AI 계약이 유효합니다 (${checks} checks · 설명 ${explanationEntries.length}건 · 상담 ${counselEntries.length}건 · 정책 ${policyEntries.length}건 · mode ${config.mode}).`,
);
