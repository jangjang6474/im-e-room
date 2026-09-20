/**
 * POST /api/ai/structure-policy — 정책 공고문을 정책 요건 JSON 초안으로 정리
 *
 * 결과는 담당자 검수용 초안이다. 이 응답은 정책 규칙 DB에 바로 들어가지 않으며
 * `needsHumanReview`는 항상 true로 고정한다. 검수한 결과만 규칙 DB에 반영한다.
 */

import type { StructuredPolicy } from "../../frontend/src/data/aiContracts.js";
import { aiConfig, callClaudeJson, logAiFailure } from "../../backend/ai/claude-client.js";
import { cacheKey, readCache, writeCache } from "../../backend/ai/cache.js";
import { claudeMetadata, structuredPolicyWithoutClaude } from "../../backend/ai/fallback.js";
import { aiErrorBody, type AiHandler } from "../../backend/ai/http.js";
import {
  STRUCTURE_POLICY_SYSTEM_PROMPT,
  buildStructurePolicyUserMessage,
} from "../../backend/ai/prompts/structure-policy.js";
import { validateStructuredPolicyPayload } from "../../backend/ai/schemas.js";
import { AiInputError, sanitizeStructurePolicyRequest } from "../../backend/ai/sanitize.js";

const MAX_TOKENS = 10_000;

export const handleStructurePolicy: AiHandler = async (req, res) => {
  let input;
  try {
    input = sanitizeStructurePolicyRequest(req.body);
  } catch (error) {
    const message = error instanceof AiInputError ? error.message : "요청 본문을 읽을 수 없습니다.";
    res.status(400).json(aiErrorBody("INVALID_INPUT", message));
    return;
  }

  const key = cacheKey("structure-policy", input);
  const cached = readCache<StructuredPolicy>(key);
  if (cached) {
    res.status(200).json(cached);
    return;
  }

  if (aiConfig().live) {
    try {
      const result = await callClaudeJson({
        system: STRUCTURE_POLICY_SYSTEM_PROMPT,
        user: buildStructurePolicyUserMessage(input),
        maxTokens: MAX_TOKENS,
        // 근거 문장을 찾아 옮기는 작업이라 설명 생성보다 여유를 둔다.
        effort: "medium",
      });
      const payload = validateStructuredPolicyPayload(result.payload);
      const response: StructuredPolicy = {
        ...payload,
        // 요청에 주어진 출처를 기준으로 유지한다. 모델이 바꿔 적어도 따르지 않는다.
        policyId: input.policyId,
        sourceUrl: input.sourceUrl,
        sourceAsOf: input.sourceAsOf,
        metadata: claudeMetadata(result.model, result.generatedAt),
      };
      writeCache(key, response);
      res.status(200).json(response);
      return;
    } catch (error) {
      logAiFailure("structure-policy", error);
      res.status(200).json(structuredPolicyWithoutClaude(input, true));
      return;
    }
  }

  res.status(200).json(structuredPolicyWithoutClaude(input, false));
};

export default handleStructurePolicy;
