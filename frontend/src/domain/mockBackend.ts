/**
 * iM 이룸 Mock Backend 서비스
 *
 * Express Mock API(backend/mockApi.ts)와 Frontend 오프라인 fallback이 같은 함수를 사용한다.
 * 외부 API·생성형 AI·시스템 시각 없이 동작하며 같은 입력에서 같은 응답을 만든다.
 */

import type {
  ConsultationCaseV1,
  DiagnosisResponse,
  EligibilityResponse,
  MonthlyReviewResponse,
  PersonaId,
  PersonaSummary,
  PlanCommandResponse,
  PlanProposal,
  ProductBoundaryResponse,
} from "../data/apiContracts";
import { API_CONTRACT_VERSION } from "../data/apiContracts";
import type { ProductBoundaryId } from "../data/contracts";
import { REFERENCE_CATALOG } from "../fixtures/generated/referenceCatalog";
import { MOCK_DATASETS, PERSONA_IDS, getDataset } from "../fixtures/mockDatasets";
import { buildConsultationCase, detectMonthlyChanges, overallEventType } from "./changeDetection";
import { kstTimestamp, monthOf, nextCollectionDate } from "./dateUtils";
import { buildDiagnosis, buildEligibility, customerAt, evaluateAllPolicies, snapshotIdOf } from "./diagnosis";
import { buildExampleJourney } from "./exampleJourney";
import { buildGoalPlan } from "./goalPlanner";
import { MockPlanStore } from "./planLifecycle";
import { evaluateBoundary } from "./productBoundary";
import { RULE_VERSION } from "./ruleConfig";

export class MockBackendError extends Error {
  constructor(public readonly httpStatus: 404 | 409 | 400, message: string) {
    super(message);
  }
}

const isPersonaId = (value: string): value is PersonaId => Object.prototype.hasOwnProperty.call(MOCK_DATASETS, value);

export function assertPersonaId(value: string): PersonaId {
  if (!isPersonaId(value)) throw new MockBackendError(404, `알 수 없는 페르소나입니다: ${value}`);
  return value;
}

export function assertBoundaryId(value: string): ProductBoundaryId {
  if (value !== "STABLE" && value !== "BALANCED" && value !== "GOAL_FOCUSED") throw new MockBackendError(400, `알 수 없는 상품 바운더리입니다: ${value}`);
  return value;
}

/* -------------------------- 조회 (상태 없음) -------------------------- */

export function listPersonas(): PersonaSummary[] {
  return ([...PERSONA_IDS, "EX24"] as PersonaId[]).map((personaId) => {
    const dataset = getDataset(personaId);
    const customer = customerAt(dataset.customer, dataset.asOf);
    return {
      personaId,
      title: dataset.title,
      summary: dataset.summary,
      customerName: customer.name,
      age: customer.age,
      residence: customer.residenceRegion ? `${customer.residenceRegion} ${customer.residenceDistrict ?? ""}`.trim() : null,
      boundaryId: dataset.boundaryId,
      asOf: dataset.asOf,
      isSynthetic: true,
    };
  });
}

export function getDiagnosis(personaId: PersonaId): DiagnosisResponse {
  return buildDiagnosis(getDataset(personaId));
}

export function getEligibility(personaId: PersonaId): EligibilityResponse {
  const dataset = getDataset(personaId);
  return buildEligibility(dataset, customerAt(dataset.customer, dataset.asOf), dataset.asOf);
}

export function getProductBoundary(boundaryId: ProductBoundaryId): ProductBoundaryResponse {
  return evaluateBoundary(REFERENCE_CATALOG.financialProducts, boundaryId);
}

export function getInitialPlan(personaId: PersonaId, boundaryId?: ProductBoundaryId): PlanProposal {
  const dataset = getDataset(personaId);
  const diagnosis = buildDiagnosis(dataset);
  return buildGoalPlan({
    customerId: dataset.customer.id,
    version: 1,
    baselineSnapshotId: snapshotIdOf(dataset.customer.id, dataset.asOf),
    boundaryId: boundaryId ?? dataset.boundaryId,
    asOf: dataset.asOf,
    createdAt: kstTimestamp(dataset.asOf),
    availableSurplus: diagnosis.metrics.availableSurplus,
    goals: dataset.goals,
    eligibility: evaluateAllPolicies(diagnosis.customer, dataset.asOf),
  });
}

export function getMonthlyReview(personaId: PersonaId, boundaryId?: ProductBoundaryId): MonthlyReviewResponse {
  const dataset = getDataset(personaId);
  const previous = buildDiagnosis(dataset);
  const previousPlan = getInitialPlan(personaId, boundaryId);
  const currentAsOf = dataset.nextMonth.asOf;
  const customer = customerAt(dataset.customer, currentAsOf, dataset.nextMonth.customerChanges);
  const current = buildDiagnosis(dataset, {
    asOf: currentAsOf,
    customer,
    transactions: [...dataset.transactions, ...dataset.nextMonth.transactions],
    collectionGaps: [...dataset.collectionGaps, ...dataset.nextMonth.collectionGaps],
  });
  const reviewMonth = current.monthly.length ? current.monthly[current.monthly.length - 1].month : monthOf(currentAsOf);
  const { events, salaryRiseSavingsIncrease } = detectMonthlyChanges({
    customer: customerAt(dataset.customer, currentAsOf),
    customerChanges: dataset.nextMonth.customerChanges,
    monthly: current.monthly,
    reviewMonth,
    dataAsOf: currentAsOf,
  });
  const overallType = overallEventType(events);
  const currentMonth = current.monthly.find((item) => item.month === reviewMonth);

  const proposedPlan =
    overallType === "INFO"
      ? null
      : buildGoalPlan({
          customerId: dataset.customer.id,
          version: 2,
          baselineSnapshotId: snapshotIdOf(dataset.customer.id, currentAsOf),
          boundaryId: boundaryId ?? dataset.boundaryId,
          asOf: currentAsOf,
          createdAt: kstTimestamp(currentAsOf),
          availableSurplus: current.metrics.availableSurplus,
          budget: salaryRiseSavingsIncrease !== null ? previousPlan.totalMonthlyAmount + salaryRiseSavingsIncrease : undefined,
          goals: dataset.goals,
          eligibility: evaluateAllPolicies(customer, currentAsOf),
          extraNotices: events.filter((event) => event.type !== "INFO").map((event) => `[${event.type}] ${event.title}: ${event.message}`),
        });

  const consultationCase = currentMonth
    ? buildConsultationCase({
        customer,
        events,
        currentMonth,
        emergencyFundBalance: current.metrics.emergencyFundBalance,
        goals: dataset.goals,
        previousPlan,
        proposedPlan,
        reviewMonth,
      })
    : null;

  return {
    contractVersion: API_CONTRACT_VERSION,
    ruleVersion: RULE_VERSION,
    personaId,
    previousAsOf: dataset.asOf,
    currentAsOf,
    nextCollectionAt: kstTimestamp(nextCollectionDate(dataset.consent.anchorDay, currentAsOf)),
    overallType,
    routing: overallType === "RISK" ? "CONSULTATION" : overallType === "ADJUSTMENT" ? "REPLAN" : "REPORT_ONLY",
    events,
    previousMetrics: previous.metrics,
    currentMetrics: current.metrics,
    currentWindow: current.window,
    previousPlan,
    proposedPlan,
    consultationCase,
    isSynthetic: true,
  };
}

export const getExampleJourney = buildExampleJourney;

/* -------------------------- 세션 (상태 있음) -------------------------- */

/**
 * 한 데모 세션의 계획·실행·상담·동의 상태.
 * 서버는 프로세스당 하나, 오프라인 fallback은 브라우저 탭당 하나를 사용한다(영속 저장 없음).
 */
export class MockBackendSession {
  private store: MockPlanStore;
  private virtualNow = kstTimestamp("2026-09-20");
  private consultations = new Map<string, ConsultationCaseV1>();
  private revoked = new Map<PersonaId, string>();
  private reviewed = new Set<PersonaId>();

  constructor() {
    this.store = new MockPlanStore(() => this.virtualNow);
  }

  reset() {
    this.store = new MockPlanStore(() => this.virtualNow);
    this.virtualNow = kstTimestamp("2026-09-20");
    this.consultations.clear();
    this.revoked.clear();
    this.reviewed.clear();
  }

  /** 최초 계획을 제안(등록)한다. 같은 요청을 반복해도 같은 계획을 돌려준다. */
  proposeInitialPlan(personaId: PersonaId, boundaryId?: ProductBoundaryId): PlanProposal {
    const plan = getInitialPlan(personaId, boundaryId);
    // 월간 점검이 이미 수집됐다면 최신 기준은 점검 스냅샷이므로 되돌리지 않는다.
    if (!this.reviewed.has(personaId)) {
      this.virtualNow = kstTimestamp(getDataset(personaId).asOf);
      this.store.setLatestBaseline(plan.customerId, plan.baselineSnapshotId);
    }
    return this.store.propose(plan);
  }

  /** 다음 달 모의 수집 → 변화 감지 → 조정안 등록 → 위험이면 상담 케이스 생성 */
  runMonthlyReview(personaId: PersonaId, boundaryId?: ProductBoundaryId): MonthlyReviewResponse {
    if (this.revoked.has(personaId)) {
      throw new MockBackendError(409, `${this.revoked.get(personaId)}에 수집 동의가 철회되어 신규 수집을 하지 않습니다.`);
    }
    const review = getMonthlyReview(personaId, boundaryId);
    this.store.propose(review.previousPlan);
    this.reviewed.add(personaId);
    this.store.setLatestBaseline(review.previousPlan.customerId, snapshotIdOf(review.previousPlan.customerId, review.currentAsOf));
    this.virtualNow = kstTimestamp(review.currentAsOf);
    const proposedPlan = review.proposedPlan ? this.store.propose(review.proposedPlan) : null;
    if (review.consultationCase && !this.consultations.has(review.consultationCase.id)) {
      this.consultations.set(review.consultationCase.id, review.consultationCase);
    }
    return {
      ...review,
      previousPlan: this.store.get(review.previousPlan.planId) ?? review.previousPlan,
      proposedPlan,
      consultationCase: review.consultationCase ? this.consultations.get(review.consultationCase.id)! : null,
    };
  }

  revokeConsent(personaId: PersonaId): { personaId: PersonaId; revokedAt: string } {
    const revokedAt = this.revoked.get(personaId) ?? this.virtualNow;
    this.revoked.set(personaId, revokedAt);
    return { personaId, revokedAt };
  }

  approve(planId: string): PlanCommandResponse {
    return this.store.approve(planId);
  }

  reject(planId: string): PlanCommandResponse {
    return this.store.reject(planId);
  }

  execute(planId: string, idempotencyKey?: string): PlanCommandResponse {
    return this.store.execute(planId, idempotencyKey);
  }

  getPlan(planId: string): PlanProposal | null {
    return this.store.get(planId);
  }

  listPlans(customerId?: string) {
    return this.store.list(customerId);
  }

  listExecutions(customerId?: string) {
    return this.store.executions(customerId);
  }

  listConsultations(): ConsultationCaseV1[] {
    return [...this.consultations.values()].sort((a, b) => (a.severity === b.severity ? (a.id < b.id ? -1 : 1) : a.severity === "CRITICAL" ? -1 : 1));
  }

  updateConsultationStatus(caseId: string, status: ConsultationCaseV1["status"]): ConsultationCaseV1 {
    const found = this.consultations.get(caseId);
    if (!found) throw new MockBackendError(404, "상담 케이스를 찾을 수 없습니다.");
    const order = { WAITING: 0, IN_PROGRESS: 1, COMPLETED: 2 } as const;
    if (!(status in order)) throw new MockBackendError(400, `알 수 없는 상담 상태입니다: ${String(status)}`);
    if (order[status] < order[found.status]) throw new MockBackendError(409, `${found.status}에서 ${status}로 되돌릴 수 없습니다.`);
    found.status = status;
    return { ...found };
  }
}
