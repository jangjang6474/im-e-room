/**
 * POST /api/ai/counsel — 검증된 상태와 근거만으로 답하는 제한형 상담
 *
 * 자유로운 투자 상담이 아니라 현재 사용자 상태와 서비스 결과를 설명하는 기능이다.
 * Claude에게는 조회 전용 도구만 준다. 승인·거절·이체·가입·자격 판정 도구는 없다.
 */

import type { CounselResponse } from "../../frontend/src/data/aiContracts";
import { aiConfig, callClaudeJsonWithTools, logAiFailure } from "../../backend/ai/claude-client";
import { cacheKey, readCache, writeCache } from "../../backend/ai/cache";
import { claudeMetadata, counselWithoutClaude } from "../../backend/ai/fallback";
import { aiErrorBody, type AiHandler } from "../../backend/ai/http";
import { COUNSEL_SYSTEM_PROMPT, COUNSEL_TOOLS, buildCounselUserMessage, runCounselTool } from "../../backend/ai/prompts/counsel";
import { validateCounselPayload } from "../../backend/ai/schemas";
import { AiInputError, sanitizeCounselRequest } from "../../backend/ai/sanitize";

const MAX_TOKENS = 6_000;

export const handleCounsel: AiHandler = async (req, res) => {
  let context;
  try {
    context = sanitizeCounselRequest(req.body);
  } catch (error) {
    const message = error instanceof AiInputError ? error.message : "요청 본문을 읽을 수 없습니다.";
    res.status(400).json(aiErrorBody("INVALID_INPUT", message));
    return;
  }

  const key = cacheKey("counsel", context);
  const cached = readCache<CounselResponse>(key);
  if (cached) {
    res.status(200).json(cached);
    return;
  }

  if (aiConfig().live) {
    try {
      const result = await callClaudeJsonWithTools({
        system: COUNSEL_SYSTEM_PROMPT,
        user: buildCounselUserMessage(context),
        maxTokens: MAX_TOKENS,
        tools: COUNSEL_TOOLS,
        // 도구는 이미 전달된 컨텍스트만 돌려준다. 새 조회도 상태 변경도 없다.
        runTool: (name) => runCounselTool(name, context),
      });
      const payload = validateCounselPayload(result.payload);
      // 위험 신호는 모델 판단보다 규칙 엔진 결과가 우선이다.
      const riskDetected = context.consultationReason !== null || context.detectedChanges.some((change) => change.severity === "RISK");
      const response: CounselResponse = {
        ...payload,
        escalation: riskDetected
          ? {
              required: true,
              reason:
                context.consultationReason ??
                payload.escalation.reason ??
                "위험으로 분류된 변화가 있어 상담사 확인이 필요합니다.",
            }
          : payload.escalation,
        metadata: claudeMetadata(result.model, result.generatedAt),
      };
      writeCache(key, response);
      res.status(200).json(response);
      return;
    } catch (error) {
      logAiFailure("counsel", error);
      res.status(200).json(counselWithoutClaude(context, true));
      return;
    }
  }

  res.status(200).json(counselWithoutClaude(context, false));
};

export default handleCounsel;
