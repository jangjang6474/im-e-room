/**
 * Claude API 호출 어댑터 (서버 전용)
 *
 * - `ANTHROPIC_API_KEY`는 서버 환경변수로만 읽는다. 프론트엔드 번들과 응답에 넣지 않는다.
 * - 모델명은 `ANTHROPIC_MODEL`로 교체할 수 있다. 코드에 폐기 예정 모델을 고정하지 않는다.
 * - 모든 호출에 timeout을 두고, 실패하면 예외를 던져 호출부가 fixture → 규칙 기반으로 대체한다.
 * - 로그에는 API 키, 전체 프롬프트, 개인정보를 남기지 않는다. 실패 이유만 남긴다.
 */

import Anthropic from "@anthropic-ai/sdk";
import { parseJsonPayload } from "./schemas";

/** 기본 모델. 운영에서는 환경변수로 교체한다. */
const DEFAULT_MODEL = "claude-opus-5";

/** 한 요청의 제한 시간. 초과하면 준비된 설명으로 대체한다. */
const REQUEST_TIMEOUT_MS = 15_000;

/** 도구 왕복 상한. 무한 루프와 비용 폭증을 막는다. */
const MAX_TOOL_ROUNDS = 4;

export type AiMode = "live" | "fixture";

export interface AiConfig {
  mode: AiMode;
  hasApiKey: boolean;
  /** live 모드이고 키가 있을 때만 Claude를 호출한다. */
  live: boolean;
  model: string;
}

export function aiConfig(): AiConfig {
  const hasApiKey = Boolean(process.env.ANTHROPIC_API_KEY);
  const mode: AiMode = process.env.AI_MODE === "live" ? "live" : "fixture";
  return {
    mode,
    hasApiKey,
    live: mode === "live" && hasApiKey,
    model: process.env.ANTHROPIC_MODEL || DEFAULT_MODEL,
  };
}

export type AiCallFailure = "TIMEOUT" | "API_ERROR" | "REFUSAL" | "EMPTY_RESPONSE" | "SCHEMA";

export class AiCallError extends Error {
  constructor(
    public readonly failure: AiCallFailure,
    message: string,
  ) {
    super(message);
    this.name = "AiCallError";
  }
}

export interface AiCallResult {
  /** 모델이 반환한 JSON 본문. Schema 검증은 호출부에서 한다. */
  payload: unknown;
  model: string;
  generatedAt: string;
}

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    /**
     * apiKey는 SDK가 환경변수에서 읽는다. 값을 로그나 응답에 복사하지 않는다.
     *
     * 재시도는 끄고 한 번만 호출한다. 재시도를 켜면 시간 초과가 두 배로 늘어
     * 브라우저 제한 시간(20초)을 넘고, 화면은 서버가 준비한 대체 응답 대신
     * 규칙 기반 설명으로 내려간다. 실패는 재시도 대신 대체 경로로 처리한다.
     */
    client = new Anthropic({ maxRetries: 0 });
  }
  return client;
}

const textOf = (content: Anthropic.ContentBlock[]): string =>
  content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n");

/** SDK 오류를 실패 원인으로 바꾼다. 메시지에 프롬프트 내용이 섞이지 않게 요약만 남긴다. */
function toCallError(error: unknown): AiCallError {
  if (error instanceof AiCallError) return error;
  if (error instanceof Anthropic.APIConnectionTimeoutError) {
    return new AiCallError("TIMEOUT", "Claude 응답이 제한 시간을 넘었습니다.");
  }
  if (error instanceof Anthropic.APIError) {
    return new AiCallError("API_ERROR", `Claude API 오류 (status ${error.status ?? "unknown"})`);
  }
  return new AiCallError("API_ERROR", "Claude 호출에 실패했습니다.");
}

/** 남은 시간. 도구 왕복이 있어도 전체 제한 시간을 넘기지 않는다. */
const remainingMs = (deadline: number): number => Math.max(1_000, deadline - Date.now());

function assertUsableStop(message: Anthropic.Message): void {
  if (message.stop_reason === "refusal") {
    throw new AiCallError("REFUSAL", "Claude가 응답을 거절했습니다.");
  }
}

export interface ClaudeJsonRequest {
  system: string;
  user: string;
  maxTokens: number;
  /** 언어 변환 위주 작업은 낮은 effort로 충분하다. */
  effort?: "low" | "medium" | "high";
}

/** 단일 요청으로 JSON 본문을 받는다. (기능 1·2) */
export async function callClaudeJson(request: ClaudeJsonRequest): Promise<AiCallResult> {
  const { model } = aiConfig();
  try {
    const message = await getClient().messages.create(
      {
        model,
        max_tokens: request.maxTokens,
        system: request.system,
        output_config: { effort: request.effort ?? "low" },
        messages: [{ role: "user", content: request.user }],
      },
      { timeout: REQUEST_TIMEOUT_MS },
    );
    assertUsableStop(message);
    const raw = textOf(message.content);
    if (!raw.trim()) throw new AiCallError("EMPTY_RESPONSE", "Claude 응답이 비어 있습니다.");
    return { payload: parseJsonPayload(raw), model: message.model, generatedAt: new Date().toISOString() };
  } catch (error) {
    throw toCallError(error);
  }
}

export interface ClaudeToolJsonRequest extends ClaudeJsonRequest {
  tools: Anthropic.Tool[];
  /** 조회 전용 도구 실행기. 상태를 바꾸는 도구는 정의하지 않는다. */
  runTool: (name: string) => string;
}

/**
 * 읽기 전용 도구를 쓰는 JSON 요청. (기능 3)
 *
 * 도구 결과를 다시 모델에 전달해 최종 답변을 만든다.
 * 왕복 상한에 걸리면 실패로 처리해 준비된 설명으로 대체한다.
 */
export async function callClaudeJsonWithTools(request: ClaudeToolJsonRequest): Promise<AiCallResult> {
  const { model } = aiConfig();
  const deadline = Date.now() + REQUEST_TIMEOUT_MS;
  const messages: Anthropic.MessageParam[] = [{ role: "user", content: request.user }];

  try {
    for (let round = 0; round < MAX_TOOL_ROUNDS; round += 1) {
      const message = await getClient().messages.create(
        {
          model,
          max_tokens: request.maxTokens,
          system: request.system,
          output_config: { effort: request.effort ?? "low" },
          tools: request.tools,
          messages,
        },
        { timeout: remainingMs(deadline) },
      );
      assertUsableStop(message);

      const toolUses = message.content.filter(
        (block): block is Anthropic.ToolUseBlock => block.type === "tool_use",
      );

      if (toolUses.length === 0) {
        const raw = textOf(message.content);
        if (!raw.trim()) throw new AiCallError("EMPTY_RESPONSE", "Claude 응답이 비어 있습니다.");
        return { payload: parseJsonPayload(raw), model: message.model, generatedAt: new Date().toISOString() };
      }

      messages.push({ role: "assistant", content: message.content });
      messages.push({
        role: "user",
        content: toolUses.map((toolUse) => ({
          type: "tool_result" as const,
          tool_use_id: toolUse.id,
          content: request.runTool(toolUse.name),
        })),
      });
    }
    throw new AiCallError("EMPTY_RESPONSE", "도구 왕복 상한 안에서 답변을 받지 못했습니다.");
  } catch (error) {
    throw toCallError(error);
  }
}

/** 실패 로그. 프롬프트와 개인정보 없이 원인만 남긴다. */
export function logAiFailure(endpoint: string, error: unknown): void {
  const failure = error instanceof AiCallError ? error.failure : "UNKNOWN";
  const detail = error instanceof Error ? error.message : "";
  console.warn(`[ai] ${endpoint} 대체 경로 사용 (${failure}) ${detail}`);
}
