/**
 * GET /api/ai/health — Vercel AI 함수의 동작 모드 확인
 *
 * API 키 값과 모델 ID는 반환하지 않는다. 키 존재 여부와 우선 응답 경로만 공개한다.
 */

import { aiConfig } from "../../backend/ai/claude-client.js";
import type { AiHandler } from "../../backend/ai/http.js";

export const handleHealth: AiHandler = async (_req, res) => {
  const config = aiConfig();
  res.status(200).json({
    ok: true,
    mode: config.mode,
    hasApiKey: config.hasApiKey,
    primarySource: config.live ? "CLAUDE" : "FIXTURE",
  });
};

export default handleHealth;
