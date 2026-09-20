/**
 * iM 이룸 Mock API (/api/mock)
 *
 * 외부 API 키·생성형 AI 없이 동작한다. 응답 계약은 frontend/src/data/apiContracts.ts,
 * 예시 응답은 data/mock/api/*.json 을 따른다. 실제 가입·송금·자동이체·상담 예약은 없다.
 * 상태(계획·실행·상담·동의 철회)는 서버 프로세스 메모리에만 있으며 재시작하면 초기화된다.
 */

import { Router, type NextFunction, type Request, type Response } from "express";
import { API_CONTRACT_VERSION } from "../frontend/src/data/apiContracts";
import {
  MockBackendError,
  MockBackendSession,
  assertBoundaryId,
  assertPersonaId,
  getDiagnosis,
  getEligibility,
  getExampleJourney,
  getGoals,
  getInitialPlan,
  getProductBoundary,
  listPersonas,
  optionalGoals,
} from "../frontend/src/domain/mockBackend";

type Role = "customer" | "consultant" | "demo";

/** 상담사·데모 제어 권한은 UI 숨김만으로 두지 않고 서버에서도 확인한다 (데모용 헤더 기반). */
const requireRole = (...roles: Role[]) => (req: Request, res: Response, next: NextFunction) => {
  const role = String(req.header("x-demo-role") ?? "customer") as Role;
  if (!roles.includes(role)) {
    res.status(403).json({ contractVersion: API_CONTRACT_VERSION, error: "FORBIDDEN", message: `이 요청은 ${roles.join("/")} 역할만 사용할 수 있습니다. (x-demo-role 헤더)` });
    return;
  }
  next();
};

const optionalBoundary = (value: unknown) => (typeof value === "string" && value ? assertBoundaryId(value) : undefined);

export function createMockApiRouter(session = new MockBackendSession()): Router {
  const router = Router();

  const handle = (fn: (req: Request) => unknown, status = 200) => (req: Request, res: Response) => {
    try {
      res.status(status).json(fn(req));
    } catch (error) {
      if (error instanceof MockBackendError) {
        res.status(error.httpStatus).json({ contractVersion: API_CONTRACT_VERSION, error: "MOCK_BACKEND_ERROR", message: error.message });
        return;
      }
      console.error("[mock-api] unexpected error:", error instanceof Error ? error.message : error);
      res.status(500).json({ contractVersion: API_CONTRACT_VERSION, error: "INTERNAL", message: "Mock API 내부 오류" });
    }
  };

  const command = (fn: (req: Request) => { httpStatus: number }) => (req: Request, res: Response) => {
    const result = fn(req);
    res.status(result.httpStatus).json(result);
  };

  router.get("/health", handle(() => ({ contractVersion: API_CONTRACT_VERSION, status: "ok", mode: "mock", externalApis: false })));
  router.get("/personas", handle(() => listPersonas()));
  router.get("/personas/:personaId/diagnosis", handle((req) => getDiagnosis(assertPersonaId(req.params.personaId))));
  router.get("/personas/:personaId/eligibility", handle((req) => getEligibility(assertPersonaId(req.params.personaId))));
  router.get("/products", handle((req) => getProductBoundary(assertBoundaryId(String(req.query.boundary ?? "BALANCED")))));
  router.get("/personas/:personaId/goals", handle((req) => getGoals(assertPersonaId(req.params.personaId))));
  router.get("/personas/:personaId/plan/preview", handle((req) => getInitialPlan(assertPersonaId(req.params.personaId), optionalBoundary(req.query.boundary))));
  // 사용자가 직접 설계한 목표는 본문으로 받는다. 목표를 주지 않으면 GET 미리보기와 같은 결과를 돌려준다.
  router.post(
    "/personas/:personaId/plan/preview",
    handle((req) =>
      getInitialPlan(assertPersonaId(req.params.personaId), optionalBoundary(req.body?.boundaryId), optionalGoals(req.body?.goals)),
    ),
  );
  router.post(
    "/personas/:personaId/plans",
    handle(
      (req) =>
        session.proposeInitialPlan(
          assertPersonaId(req.params.personaId),
          optionalBoundary(req.body?.boundaryId),
          optionalGoals(req.body?.goals),
        ),
      201,
    ),
  );
  router.post("/personas/:personaId/monthly-review", handle((req) => session.runMonthlyReview(assertPersonaId(req.params.personaId), optionalBoundary(req.body?.boundaryId))));
  router.post("/personas/:personaId/consent/revoke", handle((req) => session.revokeConsent(assertPersonaId(req.params.personaId))));

  router.get("/plans/:planId", handle((req) => {
    const plan = session.getPlan(req.params.planId);
    if (!plan) throw new MockBackendError(404, "계획을 찾을 수 없습니다.");
    return plan;
  }));
  router.post("/plans/:planId/approve", command((req) => session.approve(req.params.planId)));
  router.post("/plans/:planId/reject", command((req) => session.reject(req.params.planId)));
  router.post("/plans/:planId/execute", command((req) => session.execute(req.params.planId, req.header("idempotency-key") ?? undefined)));
  router.get("/executions", handle((req) => session.listExecutions(typeof req.query.customerId === "string" ? req.query.customerId : undefined)));

  router.get("/consultations", requireRole("consultant", "demo"), handle(() => session.listConsultations()));
  router.patch("/consultations/:caseId", requireRole("consultant"), handle((req) => session.updateConsultationStatus(req.params.caseId, req.body?.status)));

  router.get("/example-journey", handle(() => getExampleJourney()));
  router.post("/reset", requireRole("demo"), handle(() => {
    session.reset();
    return { contractVersion: API_CONTRACT_VERSION, reset: true };
  }));

  return router;
}
