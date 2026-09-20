/**
 * POST /api/ai/explain — 규칙 엔진 결과를 쉬운 문장으로 설명
 *
 * 입력은 원본 거래 목록이 아니라 이미 계산된 재무 요약·변화·계획뿐이다.
 * Claude 호출이 불가능하거나 실패하면 준비된 설명 → 규칙 기반 설명으로 내려간다.
 * 어느 경로로 응답했는지는 metadata.source로 알린다.
 */

import type { ExplainResponse } from "../../frontend/src/data/aiContracts.js";
import { aiConfig, callClaudeJson, logAiFailure } from "../../backend/ai/claude-client.js";
import { cacheKey, readCache, writeCache } from "../../backend/ai/cache.js";
import { claudeMetadata, explainWithoutClaude } from "../../backend/ai/fallback.js";
import { aiErrorBody, type AiHandler } from "../../backend/ai/http.js";
import { EXPLAIN_SYSTEM_PROMPT, buildExplainUserMessage } from "../../backend/ai/prompts/explain.js";
import { validateExplainPayload } from "../../backend/ai/schemas.js";
import { AiInputError, sanitizeExplainRequest } from "../../backend/ai/sanitize.js";

const MAX_TOKENS = 6_000;

export const handleExplain: AiHandler = async (req, res) => {
  let input;
  try {
    input = sanitizeExplainRequest(req.body);
  } catch (error) {
    const message = error instanceof AiInputError ? error.message : "요청 본문을 읽을 수 없습니다.";
    res.status(400).json(aiErrorBody("INVALID_INPUT", message));
    return;
  }

  const key = cacheKey("explain", input);
  const cached = readCache<ExplainResponse>(key);
  if (cached) {
    res.status(200).json(cached);
    return;
  }

  if (aiConfig().live) {
    try {
      const result = await callClaudeJson({
        system: EXPLAIN_SYSTEM_PROMPT,
        user: buildExplainUserMessage(input),
        maxTokens: MAX_TOKENS,
      });
      const response: ExplainResponse = {
        ...validateExplainPayload(result.payload),
        metadata: claudeMetadata(result.model, result.generatedAt),
      };
      writeCache(key, response);
      res.status(200).json(response);
      return;
    } catch (error) {
      // 호출 실패·시간 초과·Schema 위반은 모두 같은 대체 경로로 보낸다.
      logAiFailure("explain", error);
      res.status(200).json(explainWithoutClaude(input, true));
      return;
    }
  }

  res.status(200).json(explainWithoutClaude(input, false));
};

export default handleExplain;
