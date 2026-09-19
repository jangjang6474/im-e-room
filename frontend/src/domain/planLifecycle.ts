/**
 * 계획 승인 · 거절 · 모의 실행 상태 관리 (인메모리)
 *
 * PROPOSED ─approve→ APPROVED ─execute→ MOCK_EXECUTED
 *    └─reject→ REJECTED            (새 계획 승인 시 이전 APPROVED/MOCK_EXECUTED → SUPERSEDED)
 *
 * - 승인 전 실행 차단, 같은 계획의 중복 승인·중복 실행은 최초 결과를 그대로 돌려준다.
 * - 계획 내용은 수정하지 않는다. 변경은 새 버전 계획과 새 승인으로 처리한다.
 * - 최신 스냅샷이 아닌 기준으로 만든 계획은 승인·실행하지 않는다(오래된 승인 방지).
 * - 실제 가입·이체는 없다. 실행 기록은 모두 모의 실행이다.
 */

import type { MockExecutionRecordV1, PlanCommandOutcome, PlanCommandResponse, PlanProposal } from "../data/apiContracts";
import { API_CONTRACT_VERSION } from "../data/apiContracts";
import { formatWon } from "./ruleConfig";

const clone = <T,>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const HTTP: Record<PlanCommandOutcome, PlanCommandResponse["httpStatus"]> = {
  APPROVED: 200,
  ALREADY_APPROVED: 200,
  REJECTED: 200,
  ALREADY_REJECTED: 200,
  MOCK_EXECUTED: 201,
  DUPLICATE_IGNORED: 200,
  NOT_FOUND: 404,
  INVALID_STATE: 409,
  STALE_BASELINE: 409,
};

export const executionKeyOf = (plan: Pick<PlanProposal, "customerId" | "version" | "baselineSnapshotId">) =>
  `EXEC_${plan.customerId}_v${plan.version}_${plan.baselineSnapshotId}`;

export class MockPlanStore {
  private plans = new Map<string, PlanProposal>();
  private executionsByKey = new Map<string, MockExecutionRecordV1>();
  private executionsByPlan = new Map<string, MockExecutionRecordV1>();
  private latestBaseline = new Map<string, string>();

  /** clock은 주입한다. 기본값을 두지 않아 결과가 시스템 시각에 의존하지 않게 한다. */
  constructor(private readonly clock: () => string) {}

  setLatestBaseline(customerId: string, snapshotId: string) {
    this.latestBaseline.set(customerId, snapshotId);
  }

  /** 같은 planId를 다시 제안하면 기존 계획을 그대로 반환한다 (재시도 안전). */
  propose(plan: PlanProposal): PlanProposal {
    const existing = this.plans.get(plan.planId);
    if (existing) return clone(existing);
    const stored = clone({ ...plan, status: "PROPOSED" as const });
    this.plans.set(plan.planId, stored);
    return clone(stored);
  }

  get(planId: string): PlanProposal | null {
    const plan = this.plans.get(planId);
    return plan ? clone(plan) : null;
  }

  list(customerId?: string): PlanProposal[] {
    return [...this.plans.values()].filter((plan) => !customerId || plan.customerId === customerId).map(clone);
  }

  executions(customerId?: string): MockExecutionRecordV1[] {
    return [...this.executionsByPlan.values()].filter((record) => !customerId || this.plans.get(record.planId)?.customerId === customerId).map(clone);
  }

  private respond(outcome: PlanCommandOutcome, message: string, plan: PlanProposal | null, execution: MockExecutionRecordV1 | null = null): PlanCommandResponse {
    return { contractVersion: API_CONTRACT_VERSION, outcome, httpStatus: HTTP[outcome], message, plan: plan ? clone(plan) : null, execution: execution ? clone(execution) : null };
  }

  private isStale(plan: PlanProposal) {
    const latest = this.latestBaseline.get(plan.customerId);
    return latest !== undefined && latest !== plan.baselineSnapshotId;
  }

  approve(planId: string): PlanCommandResponse {
    const plan = this.plans.get(planId);
    if (!plan) return this.respond("NOT_FOUND", "계획을 찾을 수 없습니다.", null);
    if (plan.status === "APPROVED" || plan.status === "MOCK_EXECUTED") return this.respond("ALREADY_APPROVED", "이미 승인된 계획입니다. 중복 승인은 무시했습니다.", plan);
    if (plan.status !== "PROPOSED") return this.respond("INVALID_STATE", `${plan.status} 상태의 계획은 승인할 수 없습니다. 새 계획을 요청하세요.`, plan);
    if (this.isStale(plan)) return this.respond("STALE_BASELINE", "더 최신 재무 스냅샷이 있어 이 계획은 승인할 수 없습니다. 최신 기준으로 다시 계산하세요.", plan);
    if (!plan.isFeasible && plan.totalMonthlyAmount === 0) return this.respond("INVALID_STATE", "배분액이 없는 계획은 승인할 수 없습니다.", plan);

    for (const other of this.plans.values()) {
      if (other.customerId === plan.customerId && other.planId !== plan.planId && (other.status === "APPROVED" || other.status === "MOCK_EXECUTED")) other.status = "SUPERSEDED";
    }
    plan.status = "APPROVED";
    return this.respond("APPROVED", `v${plan.version} 계획을 승인했습니다. 모의 실행 전까지 실제 이체는 없습니다.`, plan);
  }

  reject(planId: string): PlanCommandResponse {
    const plan = this.plans.get(planId);
    if (!plan) return this.respond("NOT_FOUND", "계획을 찾을 수 없습니다.", null);
    if (plan.status === "REJECTED") return this.respond("ALREADY_REJECTED", "이미 거절한 계획입니다.", plan);
    if (plan.status !== "PROPOSED") return this.respond("INVALID_STATE", `${plan.status} 상태의 계획은 거절할 수 없습니다.`, plan);
    plan.status = "REJECTED";
    return this.respond("REJECTED", "조정안을 거절했습니다. 기존 승인 계획을 유지합니다.", plan);
  }

  execute(planId: string, idempotencyKey?: string): PlanCommandResponse {
    const plan = this.plans.get(planId);
    if (!plan) return this.respond("NOT_FOUND", "계획을 찾을 수 없습니다.", null);
    const key = idempotencyKey ?? executionKeyOf(plan);
    const previous = this.executionsByKey.get(key) ?? this.executionsByPlan.get(planId);
    if (previous) return this.respond("DUPLICATE_IGNORED", "이미 모의 실행된 요청입니다. 중복 실행하지 않았습니다.", this.plans.get(previous.planId) ?? plan, previous);
    if (plan.status !== "APPROVED") return this.respond("INVALID_STATE", "승인된 계획만 모의 실행할 수 있습니다.", plan);
    if (this.isStale(plan)) return this.respond("STALE_BASELINE", "승인 이후 새 재무 스냅샷이 수집되어 실행을 중단했습니다. 최신 기준 계획을 다시 승인하세요.", plan);

    const items = plan.allocations.filter((item) => item.monthlyAmount > 0);
    const record: MockExecutionRecordV1 = {
      id: `mockexec-${plan.planId}`,
      planId: plan.planId,
      planVersion: plan.version,
      idempotencyKey: key,
      executedAt: this.clock(),
      totalMonthlyAmount: plan.totalMonthlyAmount,
      itemsCount: items.length,
      message: `모의 실행 완료: ${items.length}개 목표에 월 ${formatWon(plan.totalMonthlyAmount)} 자동이체를 설정한 것으로 기록했습니다. 실제 가입·이체는 없습니다.`,
      isMockExecution: true,
    };
    this.executionsByKey.set(key, record);
    this.executionsByPlan.set(planId, record);
    plan.status = "MOCK_EXECUTED";
    return this.respond("MOCK_EXECUTED", record.message, plan, record);
  }
}
