import path from "node:path";
import { mkdir, readdir, rm } from "node:fs/promises";
import type { PersonaId } from "../../frontend/src/data/apiContracts";
import {
  MockBackendSession,
  getDiagnosis,
  getEligibility,
  getExampleJourney,
  getInitialPlan,
  getMonthlyReview,
  getProductBoundary,
  listPersonas,
} from "../../frontend/src/domain/mockBackend";
import { executionKeyOf } from "../../frontend/src/domain/planLifecycle";
import { projectRoot, writeJson } from "./shared";

// Generated example responses for the Mock API contract (frontend/src/data/apiContracts.ts).
const outDir = path.join(projectRoot, "data", "mock", "api");
await mkdir(outDir, { recursive: true });
for (const file of await readdir(outDir)) if (file.endsWith(".json")) await rm(path.join(outDir, file));

const personas: PersonaId[] = ["P01", "P02", "P03", "EX24"];
const files: Record<string, unknown> = { "personas.json": listPersonas(), "example-journey.json": getExampleJourney() };
for (const personaId of personas) {
  files[`${personaId}.diagnosis.json`] = getDiagnosis(personaId);
  files[`${personaId}.eligibility.json`] = getEligibility(personaId);
  files[`${personaId}.plan.json`] = getInitialPlan(personaId);
  files[`${personaId}.monthly-review.json`] = getMonthlyReview(personaId);
}
for (const boundaryId of ["STABLE", "BALANCED", "GOAL_FOCUSED"] as const) files[`products.${boundaryId}.json`] = getProductBoundary(boundaryId);

// 승인·거절·모의 실행 명령 시나리오 (요청 순서대로 응답 기록)
const session = new MockBackendSession();
const steps: Array<{ step: string; request: string; response: unknown }> = [];
const record = (step: string, request: string, response: unknown) => steps.push({ step, request, response });
const p01 = session.proposeInitialPlan("P01");
record("P01 최초 계획 등록", "POST /api/mock/personas/P01/plans", p01);
record("승인 전 실행 시도 → 차단", `POST /api/mock/plans/${p01.planId}/execute`, session.execute(p01.planId));
record("승인", `POST /api/mock/plans/${p01.planId}/approve`, session.approve(p01.planId));
record("중복 승인 → 무시", `POST /api/mock/plans/${p01.planId}/approve`, session.approve(p01.planId));
record("모의 실행", `POST /api/mock/plans/${p01.planId}/execute (Idempotency-Key: ${executionKeyOf(p01)})`, session.execute(p01.planId, executionKeyOf(p01)));
record("같은 키로 재시도 → 중복 무시", `POST /api/mock/plans/${p01.planId}/execute (Idempotency-Key: ${executionKeyOf(p01)})`, session.execute(p01.planId, executionKeyOf(p01)));
record("다른 키로 재실행 → 계획당 1회만 허용", `POST /api/mock/plans/${p01.planId}/execute (Idempotency-Key: retry-2)`, session.execute(p01.planId, "retry-2"));

const p02 = session.proposeInitialPlan("P02");
const p02Review = session.runMonthlyReview("P02");
record("P02 월간 점검 (월세 변경 → 조정안 v2)", "POST /api/mock/personas/P02/monthly-review", { overallType: p02Review.overallType, routing: p02Review.routing, proposedPlanId: p02Review.proposedPlan?.planId });
record("이전 스냅샷 기준 v1 승인 시도 → 오래된 승인 차단", `POST /api/mock/plans/${p02.planId}/approve`, session.approve(p02.planId));
record("조정안 v2 거절 → 기존 계획 유지", `POST /api/mock/plans/${p02Review.proposedPlan!.planId}/reject`, session.reject(p02Review.proposedPlan!.planId));
record("거절한 계획 승인 시도 → 상태 오류", `POST /api/mock/plans/${p02Review.proposedPlan!.planId}/approve`, session.approve(p02Review.proposedPlan!.planId));

session.proposeInitialPlan("P03");
const p03Review = session.runMonthlyReview("P03");
record("P03 월간 점검 (소득 급감 → 위험 → 상담 케이스)", "POST /api/mock/personas/P03/monthly-review", { overallType: p03Review.overallType, routing: p03Review.routing, consultationCaseId: p03Review.consultationCase?.id });
record("상담 대기 목록", "GET /api/mock/consultations (x-demo-role: consultant)", session.listConsultations());
record("P01 동의 철회", "POST /api/mock/personas/P01/consent/revoke", session.revokeConsent("P01"));
try {
  session.runMonthlyReview("P01");
  record("철회 후 월간 수집 시도", "POST /api/mock/personas/P01/monthly-review", "UNEXPECTED_SUCCESS");
} catch (error) {
  record("철회 후 월간 수집 시도 → 409", "POST /api/mock/personas/P01/monthly-review", { httpStatus: 409, message: (error as Error).message });
}
files["commands.scenario.json"] = steps;

for (const [name, value] of Object.entries(files)) await writeJson(path.join(outDir, name), value);
console.log(`Generated ${Object.keys(files).length} Mock API example responses in data/mock/api/.`);
