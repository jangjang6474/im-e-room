/**
 * AI 라우트의 요청·응답 최소 타입
 *
 * Express 핸들러와 Vercel Function 핸들러가 모두 이 형태를 만족하므로
 * `api/ai/*.ts`의 핸들러 하나를 두 실행 환경에서 그대로 쓸 수 있다.
 */

import { AI_CONTRACT_VERSION, type AiErrorResponse } from "../../frontend/src/data/aiContracts.js";

export interface AiHttpRequest {
  body?: unknown;
}

export interface AiHttpResponse {
  status(code: number): { json(body: unknown): unknown };
}

export type AiHandler = (req: AiHttpRequest, res: AiHttpResponse) => Promise<void>;

/** 개발자용 오류 본문. 고객 화면에는 이 문구를 그대로 노출하지 않는다. */
export function aiErrorBody(error: string, message: string): AiErrorResponse {
  return { contractVersion: AI_CONTRACT_VERSION, error, message };
}
