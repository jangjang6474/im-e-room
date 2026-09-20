/**
 * Frontend용 Mock API 클라이언트
 *
 * 1순위: 서버 /api/mock (backend/mockApi.ts)
 * 2순위: 서버에 연결할 수 없으면 같은 도메인 함수를 브라우저에서 실행하는 오프라인 fallback
 * 두 경로의 응답 계약은 apiContracts.ts로 같다. 컴포넌트는 금액·자격·판정을 다시 계산하지 않는다.
 */

import type {
  ConsultationCaseV1,
  DiagnosisResponse,
  EligibilityResponse,
  ExampleJourneyResponse,
  MockExecutionRecordV1,
  MonthlyReviewResponse,
  PersonaId,
  PersonaSummary,
  PlanCommandResponse,
  PlanProposal,
  ProductBoundaryResponse,
} from "./apiContracts";
import type { ProductBoundaryId } from "./contracts";
import {
  MockBackendError,
  MockBackendSession,
  getDiagnosis,
  getEligibility,
  getExampleJourney,
  getInitialPlan,
  getProductBoundary,
  listPersonas,
} from "../domain/mockBackend";

export type ApiSource = "server" | "offline-fixture";
export interface ApiResult<T> {
  data: T;
  source: ApiSource;
}

export class MockApiError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
  }
}

const offlineSession = new MockBackendSession();

export function createMockApiClient(options: { baseUrl?: string; role?: "customer" | "consultant" | "demo"; forceOffline?: boolean; fetchImpl?: typeof fetch } = {}) {
  const baseUrl = options.baseUrl ?? "/api/mock";
  const role = options.role ?? "customer";
  const fetchImpl = options.fetchImpl ?? (typeof fetch === "function" ? fetch.bind(globalThis) : undefined);
  let serverAvailable = !options.forceOffline && !!fetchImpl;

  async function call<T>(method: string, path: string, offline: () => T, init: { body?: unknown; headers?: Record<string, string> } = {}): Promise<ApiResult<T>> {
    if (serverAvailable && fetchImpl) {
      try {
        const response = await fetchImpl(`${baseUrl}${path}`, {
          method,
          headers: { "content-type": "application/json", "x-demo-role": role, ...init.headers },
          body: init.body === undefined ? undefined : JSON.stringify(init.body),
        });
        const isJson = (response.headers.get("content-type") ?? "").includes("json");
        if (!isJson) throw new TypeError("Mock API unavailable");
        const payload = await response.json();
        // 명령 응답(PlanCommandResponse)은 409/404도 정상 계약이다.
        if (!response.ok && !(payload && typeof payload === "object" && "outcome" in payload)) {
          throw new MockApiError(response.status, payload?.message ?? `HTTP ${response.status}`);
        }
        return { data: payload as T, source: "server" };
      } catch (error) {
        if (error instanceof MockApiError) throw error;
        serverAvailable = false; // 네트워크 실패 → 이후 요청은 오프라인 fixture로 처리
      }
    }
    try {
      return { data: offline(), source: "offline-fixture" };
    } catch (error) {
      if (error instanceof MockBackendError) throw new MockApiError(error.httpStatus, error.message);
      throw error;
    }
  }

  const boundaryQuery = (boundaryId?: ProductBoundaryId) => (boundaryId ? `?boundary=${boundaryId}` : "");

  return {
    get source(): ApiSource {
      return serverAvailable ? "server" : "offline-fixture";
    },
    listPersonas: () => call<PersonaSummary[]>("GET", "/personas", listPersonas),
    getDiagnosis: (personaId: PersonaId) => call<DiagnosisResponse>("GET", `/personas/${personaId}/diagnosis`, () => getDiagnosis(personaId)),
    getEligibility: (personaId: PersonaId) => call<EligibilityResponse>("GET", `/personas/${personaId}/eligibility`, () => getEligibility(personaId)),
    getProducts: (boundaryId: ProductBoundaryId) => call<ProductBoundaryResponse>("GET", `/products?boundary=${boundaryId}`, () => getProductBoundary(boundaryId)),
    previewPlan: (personaId: PersonaId, boundaryId?: ProductBoundaryId) =>
      call<PlanProposal>("GET", `/personas/${personaId}/plan/preview${boundaryQuery(boundaryId)}`, () => getInitialPlan(personaId, boundaryId)),
    proposePlan: (personaId: PersonaId, boundaryId?: ProductBoundaryId) =>
      call<PlanProposal>("POST", `/personas/${personaId}/plans`, () => offlineSession.proposeInitialPlan(personaId, boundaryId), { body: { boundaryId } }),
    runMonthlyReview: (personaId: PersonaId, boundaryId?: ProductBoundaryId) =>
      call<MonthlyReviewResponse>("POST", `/personas/${personaId}/monthly-review`, () => offlineSession.runMonthlyReview(personaId, boundaryId), { body: { boundaryId } }),
    revokeConsent: (personaId: PersonaId) =>
      call<{ personaId: PersonaId; revokedAt: string }>("POST", `/personas/${personaId}/consent/revoke`, () => offlineSession.revokeConsent(personaId)),
    approvePlan: (planId: string) => call<PlanCommandResponse>("POST", `/plans/${encodeURIComponent(planId)}/approve`, () => offlineSession.approve(planId)),
    rejectPlan: (planId: string) => call<PlanCommandResponse>("POST", `/plans/${encodeURIComponent(planId)}/reject`, () => offlineSession.reject(planId)),
    executePlan: (planId: string, idempotencyKey?: string) =>
      call<PlanCommandResponse>("POST", `/plans/${encodeURIComponent(planId)}/execute`, () => offlineSession.execute(planId, idempotencyKey), {
        headers: idempotencyKey ? { "idempotency-key": idempotencyKey } : {},
      }),
    listExecutions: (customerId?: string) =>
      call<MockExecutionRecordV1[]>("GET", `/executions${customerId ? `?customerId=${encodeURIComponent(customerId)}` : ""}`, () => offlineSession.listExecutions(customerId)),
    listConsultations: () => call<ConsultationCaseV1[]>("GET", "/consultations", () => offlineSession.listConsultations()),
    getExampleJourney: () => call<ExampleJourneyResponse>("GET", "/example-journey", getExampleJourney),
    /**
     * 체험 세션 초기화: 계획 상태·모의 실행 이력·상담 케이스·동의 철회를 버린다.
     *
     * 오프라인 fallback 세션은 이 브라우저 탭 것이므로 항상 초기화한다.
     * 서버 세션은 시연 제어 권한이므로 역할 검사를 서버에서 하고, customer 역할이면 서버 상태가 그대로 남는다.
     * 호출자는 serverReset 값을 보고 남은 상태를 화면에 사실대로 표시해야 한다.
     */
    resetSession: async (): Promise<{ serverReset: boolean; usedServer: boolean }> => {
      offlineSession.reset();
      const usedServer = serverAvailable && !!fetchImpl;
      if (!usedServer || !fetchImpl) return { serverReset: false, usedServer: false };
      try {
        const response = await fetchImpl(`${baseUrl}/reset`, {
          method: "POST",
          headers: { "content-type": "application/json", "x-demo-role": role },
        });
        return { serverReset: response.ok, usedServer: true };
      } catch {
        serverAvailable = false;
        return { serverReset: false, usedServer: false };
      }
    },
  };
}

export type MockApiClient = ReturnType<typeof createMockApiClient>;
