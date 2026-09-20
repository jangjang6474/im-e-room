/**
 * AI 설명·상담 클라이언트
 *
 * 브라우저는 `/api/ai/*`만 호출한다. Anthropic API를 직접 호출하지 않고 API 키도 알지 못한다.
 * 서버에 연결하지 못하거나 응답이 늦으면 같은 계약의 규칙 기반 설명으로 바꿔 화면을 이어간다.
 * 이 함수들은 예외를 던지지 않는다. 화면은 항상 표시할 응답을 받는다.
 */

import type { CounselRequest, CounselResponse, ExplainRequest, ExplainResponse } from "./aiContracts";
import { buildRuleCounsel, buildRuleExplanation } from "../domain/aiFallback";

/** 서버 제한 시간(15초)에 왕복 여유를 더한 값 */
const CLIENT_TIMEOUT_MS = 20_000;

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);
  try {
    const response = await fetch(path, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.includes("json")) throw new TypeError("JSON 응답이 아닙니다.");
    return (await response.json()) as T;
  } finally {
    clearTimeout(timer);
  }
}

/** 응답의 형태가 계약과 다르면 대체 경로로 보낸다. */
const hasMetadata = (value: unknown): boolean =>
  typeof value === "object" && value !== null && "metadata" in (value as Record<string, unknown>);

export async function requestExplanation(input: ExplainRequest): Promise<ExplainResponse> {
  try {
    const result = await postJson<ExplainResponse>("/api/ai/explain", input);
    if (!hasMetadata(result) || typeof result.headline !== "string") throw new TypeError("설명 형식이 올바르지 않습니다.");
    return result;
  } catch {
    // 서버 오류 내용은 화면에 그대로 노출하지 않는다. 같은 계약의 정형 설명으로 이어간다.
    return buildRuleExplanation(input, true);
  }
}

export async function requestCounsel(context: CounselRequest): Promise<CounselResponse> {
  try {
    const result = await postJson<CounselResponse>("/api/ai/counsel", context);
    if (!hasMetadata(result) || typeof result.answer !== "string") throw new TypeError("답변 형식이 올바르지 않습니다.");
    return result;
  } catch {
    return buildRuleCounsel(context, true);
  }
}
