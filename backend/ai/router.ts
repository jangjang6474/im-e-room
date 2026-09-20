/**
 * /api/ai 라우터
 *
 * Claude 호출은 서버에서만 일어난다. 브라우저는 이 경로만 호출하고 API 키를 알지 못한다.
 * 핸들러 본문은 `api/ai/*.ts`에 있어 Vercel Function 같은 다른 서버 실행 환경에서도 그대로 쓸 수 있다.
 */

import { Router, type RequestHandler } from "express";
import { AI_CONTRACT_VERSION } from "../../frontend/src/data/aiContracts";
import { handleCounsel } from "../../api/ai/counsel";
import { handleExplain } from "../../api/ai/explain";
import { handleStructurePolicy } from "../../api/ai/structure-policy";
import { aiConfig } from "./claude-client";
import type { AiHandler } from "./http";

/** 핸들러가 던진 예외를 500으로 바꾼다. 내부 메시지는 응답에 넣지 않는다. */
const route =
  (name: string, handler: AiHandler): RequestHandler =>
  async (req, res) => {
    try {
      await handler(req, res);
    } catch (error) {
      console.error(`[ai] ${name} 처리 중 오류`);
      res.status(500).json({ contractVersion: AI_CONTRACT_VERSION, error: "INTERNAL", message: "AI 요청을 처리하지 못했습니다." });
    }
  };

export function createAiRouter(): Router {
  const router = Router();

  /**
   * 운영 점검용. API 키 값은 노출하지 않고 존재 여부와 동작 모드만 알린다.
   * 모델 ID는 고객 화면에 드러낼 값이 아니라 여기서도 반환하지 않는다.
   */
  router.get("/health", (_req, res) => {
    const config = aiConfig();
    res.json({
      contractVersion: AI_CONTRACT_VERSION,
      mode: config.mode,
      hasApiKey: config.hasApiKey,
      /** 이 설정에서 우선 사용할 응답 경로 */
      primarySource: config.live ? "CLAUDE" : "FIXTURE",
    });
  });

  router.post("/explain", route("explain", handleExplain));
  router.post("/counsel", route("counsel", handleCounsel));
  router.post("/structure-policy", route("structure-policy", handleStructurePolicy));

  return router;
}
