/**
 * iM 이룸 — 중앙 오케스트레이터 및 상태 관리 Context
 * TRD 아키텍처: 동의 -> 스케줄러 -> 수집 -> 정규화 -> 스냅샷 -> 감지 -> 재설계 -> 승인 -> 모의 실행
 */

import React, { createContext, useContext, useRef, useState } from "react";
import {
  DemoCustomer,
  ConsentState,
  FinancialSnapshot,
  Goal,
  PolicyProduct,
  AllocationPlan,
  ChangeEvent,
  ConsultationCase,
  MockExecutionRecord,
  ScenarioPresetId,
} from "../types";
import {
  DEFAULT_CUSTOMER,
  INITIAL_CONSENT,
  DEFAULT_GOALS,
  POLICIES_DATA,
  generate12MonthTransactions,
} from "../fixtures/syntheticData";
import {
  calculateSnapshotMetrics,
  calculateAllocationPlan,
  detectChanges,
  evaluatePolicyEligibility,
} from "../domain/financialEngine";

interface EroomContextType {
  // 상태
  customer: DemoCustomer;
  consent: ConsentState;
  currentDate: string; // YYYY-MM (e.g. 2026-09)
  snapshot: FinancialSnapshot;
  prevSnapshot: FinancialSnapshot | null;
  goals: Goal[];
  policies: PolicyProduct[];
  activePlan: AllocationPlan; // 현재 적용 중인 계획
  proposedPlan: AllocationPlan | null; // 변경 검토 중인 신규 조정안
  events: ChangeEvent[];
  consultationCases: ConsultationCase[];
  executions: MockExecutionRecord[];
  activeScenario: ScenarioPresetId;
  activeTab: "diagnostics" | "goals" | "replan" | "policies" | "history";
  viewMode: "intro" | "youth" | "consultant";
  isSimulatingMonth: boolean;
  isAiExplaining: boolean;

  // 액션
  setActiveTab: (tab: "diagnostics" | "goals" | "replan" | "policies" | "history") => void;
  setViewMode: (mode: "intro" | "youth" | "consultant") => void;
  toggleConsent: () => void;
  advanceMonth: () => void;
  applyScenario: (scenario: ScenarioPresetId) => void;
  updateGoals: (newGoals: Goal[]) => void;
  approveProposedPlan: () => Promise<void>;
  rejectProposedPlan: () => void;
  resolveConsultationCase: (caseId: string, notes: string) => void;
  requestAiExplanation: () => Promise<void>;
  resetDemo: () => void;
}

const EroomContext = createContext<EroomContextType | null>(null);

function getNextCollectionDate(baseMonth: string, anchorDay: number): string {
  const [yearText, monthText] = baseMonth.split("-");
  const year = Number(yearText);
  const monthIndex = Number(monthText) - 1;
  const nextMonth = new Date(Date.UTC(year, monthIndex + 1, 1));
  const lastDay = new Date(
    Date.UTC(nextMonth.getUTCFullYear(), nextMonth.getUTCMonth() + 1, 0)
  ).getUTCDate();
  const day = Math.min(anchorDay, lastDay);
  return `${nextMonth.getUTCFullYear()}-${String(nextMonth.getUTCMonth() + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}T09:00:00+09:00`;
}

function getNextPlanVersion(currentVersion: string): string {
  const match = currentVersion.match(/^v(\d+)(?:\.(\d+))?$/);
  if (!match) return "v2.0";
  return `v${Number(match[1]) + 1}.0`;
}

export const EroomProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [customer, setCustomer] = useState<DemoCustomer>(DEFAULT_CUSTOMER);
  const [consent, setConsent] = useState<ConsentState>(INITIAL_CONSENT);
  const [currentDate, setCurrentDate] = useState<string>("2026-09");
  const [activeScenario, setActiveScenario] = useState<ScenarioPresetId>("S01_INITIAL");
  const [activeTab, setActiveTab] = useState<"diagnostics" | "goals" | "replan" | "policies" | "history">("diagnostics");
  const [viewMode, setViewMode] = useState<"intro" | "youth" | "consultant">(() => {
    if (typeof window === "undefined") return "youth";
    return new URLSearchParams(window.location.search).get("demo") === "true"
      ? "intro"
      : "youth";
  });
  const [isSimulatingMonth, setIsSimulatingMonth] = useState<boolean>(false);
  const [isAiExplaining, setIsAiExplaining] = useState<boolean>(false);
  const executionKeysRef = useRef<Set<string>>(new Set(["INIT_MOCK_20260915"]));

  // 스냅샷 및 정책
  const [prevSnapshot, setPrevSnapshot] = useState<FinancialSnapshot | null>(null);
  const [snapshot, setSnapshot] = useState<FinancialSnapshot>(() => {
    return calculateSnapshotMetrics(generate12MonthTransactions("2026-09"));
  });

  const [goals, setGoals] = useState<Goal[]>(DEFAULT_GOALS);
  const [policies, setPolicies] = useState<PolicyProduct[]>(() => {
    return POLICIES_DATA.map((p) => {
      const evalRes = evaluatePolicyEligibility(DEFAULT_CUSTOMER, p);
      return {
        ...p,
        eligibility: evalRes.status,
        eligibilityReason: evalRes.reason,
      };
    });
  });

  // 계획 관리 (최초 v1.0)
  const [activePlan, setActivePlan] = useState<AllocationPlan>(() => {
    const initialSnap = calculateSnapshotMetrics(generate12MonthTransactions("2026-09"));
    const plan = calculateAllocationPlan(initialSnap, DEFAULT_GOALS, POLICIES_DATA, "v1.0");
    return { ...plan, status: "APPROVED" };
  });

  const [proposedPlan, setProposedPlan] = useState<AllocationPlan | null>(null);
  const [events, setEvents] = useState<ChangeEvent[]>([
    {
      id: "evt-init-01",
      type: "INFO",
      title: "최초 재무 진단 완료",
      message: "최근 12개월 가상 거래 내역을 정규화하여 기준 재무 스냅샷을 수립했습니다.",
      metric: "데이터 정규화",
      oldValue: "미수집",
      newValue: "12개월 완료",
      detectedAt: "2026-09-15T10:05:00+09:00",
      ruleVersion: "RULE_2026_V1",
      suggestedAction: "MAINTAIN",
    },
  ]);

  const [consultationCases, setConsultationCases] = useState<ConsultationCase[]>([]);
  const [executions, setExecutions] = useState<MockExecutionRecord[]>([
    {
      id: "exec-v1.0-initial",
      planVersion: "v1.0",
      idempotencyKey: "INIT_MOCK_20260915",
      executedAt: "2026-09-15T10:10:00+09:00",
      status: "SUCCESS",
      details: {
        totalExecutedAmount: 900000,
        itemsCount: 4,
        message: "최초 저축 포트폴리오 모의 배분 실행 완료 (실제 금융기관 전송 없음)",
      },
    },
  ]);

  // 동의 활성화 / 철회
  const toggleConsent = () => {
    if (consent.status === "ACTIVE") {
      setConsent((prev) => ({
        ...prev,
        status: "REVOKED",
        revokedAt: new Date().toISOString(),
      }));
      setEvents((prev) => [
        {
          id: `evt-revoke-${Date.now()}`,
          type: "INFO",
          title: "데이터 수집 동의 철회",
          message: "사용자 요청으로 데이터 수집이 중단되었으며 추가 스냅샷 생성이 정지됩니다.",
          metric: "수집 상태",
          oldValue: "ACTIVE",
          newValue: "REVOKED",
          detectedAt: new Date().toISOString(),
          ruleVersion: "RULE_2026_V1",
          suggestedAction: "MAINTAIN",
        },
        ...prev,
      ]);
    } else {
      setConsent((prev) => ({
        ...prev,
        status: "ACTIVE",
        consentedAt: new Date().toISOString(),
        revokedAt: undefined,
        nextScheduledCollection: getNextCollectionDate(currentDate, prev.anchorDay),
      }));
    }
  };

  // 다음 월 이동 (가상 시계)
  const advanceMonth = () => {
    if (consent.status !== "ACTIVE") {
      alert("동의가 철회된 상태에서는 다음 월 데이터 수집이 진행되지 않습니다.");
      return;
    }

    setIsSimulatingMonth(true);

    setTimeout(() => {
      // 2026-09 -> 2026-10 등 계산
      const [yearStr, monthStr] = currentDate.split("-");
      let year = parseInt(yearStr, 10);
      let month = parseInt(monthStr, 10) + 1;
      if (month > 12) {
        year += 1;
        month = 1;
      }
      const nextMonthStr = `${year}-${month < 10 ? `0${month}` : month}`;
      setCurrentDate(nextMonthStr);
      setConsent((prev) => ({
        ...prev,
        nextScheduledCollection: getNextCollectionDate(nextMonthStr, prev.anchorDay),
      }));

      // 이전 스냅샷 저장
      setPrevSnapshot(snapshot);

      // 기본적으로는 안정적인 스냅샷 유지
      const newSnapRaw = generate12MonthTransactions(nextMonthStr);
      const newSnap = calculateSnapshotMetrics(newSnapRaw);
      setSnapshot(newSnap);

      // 변화 감지
      const detected = detectChanges(snapshot, newSnap);
      setEvents((prev) => [...detected, ...prev]);

      setIsSimulatingMonth(false);
    }, 600);
  };

  // 시나리오 원클릭 주입
  const applyScenario = (scenario: ScenarioPresetId) => {
    setActiveScenario(scenario);
    setPrevSnapshot(snapshot);

    if (scenario === "S02_NO_CHANGE") {
      // 다음 월 평온한 상태 유지
      const [yearStr, monthStr] = currentDate.split("-");
      const nextMonth = `${yearStr}-${parseInt(monthStr, 10) === 9 ? "10" : "11"}`;
      setCurrentDate(nextMonth);
      const newSnap = calculateSnapshotMetrics(generate12MonthTransactions(nextMonth));
      setSnapshot(newSnap);

      const detected = detectChanges(snapshot, newSnap);
      setEvents((prev) => [...detected, ...prev]);
      setProposedPlan(null);
      setActiveTab("diagnostics");
    } else if (scenario === "S03_SALARY_RISE") {
      // 급여 260만 -> 290만 인상 (+30만)
      const newSnapRaw = generate12MonthTransactions(currentDate);
      newSnapRaw.monthlyIncome = 2900000;
      const updatedSnap = calculateSnapshotMetrics(newSnapRaw);
      setSnapshot(updatedSnap);

      // 이벤트 생성
      const detected = detectChanges(snapshot, updatedSnap);
      setEvents((prev) => [...detected, ...prev]);

      // 신규 조정안 v2.0 산출
      const newPlan = calculateAllocationPlan(updatedSnap, goals, policies, "v2.0");
      setProposedPlan(newPlan);
      setActiveTab("replan");
    } else if (scenario === "S04_INCOME_STOP") {
      // 소득 미입금 (위험)
      const newSnapRaw = generate12MonthTransactions(currentDate);
      newSnapRaw.monthlyIncome = 0; // 급여 미입금
      const riskSnap = calculateSnapshotMetrics(newSnapRaw);
      setSnapshot(riskSnap);

      const detected = detectChanges(snapshot, riskSnap);
      setEvents((prev) => [...detected, ...prev]);

      // 위험 케이스 생성 (상담사 대기 목록)
      const newCase: ConsultationCase = {
        id: `case-${Date.now()}`,
        riskEventId: detected[0]?.id || "evt-risk",
        customerId: customer.id,
        customerName: customer.name,
        riskType: "급여 미입금 및 소득 단절 의심",
        severity: "CRITICAL",
        briefing: {
          coreRisk: "전월 실소득 260만원 대비 당월 0원 입금. 고정비 75만원 및 대출 원리금 15만원 연체 가능성 발생.",
          financialState: `현재 비상자금 잔고: ${riskSnap.emergencyFundBalance.toLocaleString()}원 (약 1.4개월치 버퍼)`,
          impactOnGoals: "모든 신규 저축 납입 즉시 유예 필요, 청년도약계좌 납입 중단 방지책 검토 필요.",
          recommendedHumanAction: "고객 유선 연락을 통해 실직/이직 여부 확인 및 청년 긴급 생계비 대출·채무조정 상담 지원.",
        },
        createdAt: new Date().toISOString(),
        status: "WAITING",
      };
      setConsultationCases((prev) => [newCase, ...prev]);

      // 신규 저축 계획 중단안
      const riskPlan = calculateAllocationPlan(riskSnap, goals, policies, "v-risk");
      setProposedPlan(riskPlan);
      setActiveTab("replan");
    } else if (scenario === "S05_POLICY_UPDATE") {
      // 외부 정책 버전 변경을 가상으로 재현하고 현재 계획을 다시 계산한다.
      const updatedPolicies = policies.map((policy) =>
        policy.id === "policy-daegu-hope"
          ? {
              ...policy,
              maxMonthlyDeposit: 150000,
              asOfPolicy: `${currentDate}-15`,
              officialReference: "대구광역시 청년희망적금 데모 변경공고 v2",
            }
          : policy
      );
      setPolicies(updatedPolicies);
      setEvents((prev) => [
        {
          id: `evt-policy-update-${currentDate}`,
          type: "ADJUSTMENT",
          title: "청년희망적금 납입 한도 변경",
          message: "가상 정책 변경으로 월 납입 한도가 10만원에서 15만원으로 조정되었습니다.",
          metric: "정책 상품 월 납입 한도",
          oldValue: "100,000원",
          newValue: "150,000원",
          detectedAt: new Date().toISOString(),
          ruleVersion: "RULE_2026_V1",
          suggestedAction: "RECALCULATE",
        },
        ...prev,
      ]);
      setProposedPlan(
        calculateAllocationPlan(
          snapshot,
          goals,
          updatedPolicies,
          getNextPlanVersion(activePlan.version)
        )
      );
      setActiveTab("policies");
    } else if (scenario === "S06_OVER_BUDGET") {
      // 무리한 목표
      const overGoals: Goal[] = [
        {
          id: "goal-impossible",
          title: "1년 내 보증금 3,000만원 만들기",
          category: "WEALTH_BUILDING",
          targetAmount: 30000000,
          currentAmount: 1000000,
          targetMonths: 12,
          priority: 1,
        },
        ...goals.slice(1),
      ];
      setGoals(overGoals);
      const overPlan = calculateAllocationPlan(snapshot, overGoals, policies, "v-over");
      setProposedPlan(overPlan);
      setActiveTab("goals");
    }
  };

  // 목표 수정
  const updateGoals = (newGoals: Goal[]) => {
    setGoals(newGoals);
    const updatedPlan = calculateAllocationPlan(
      snapshot,
      newGoals,
      policies,
      getNextPlanVersion(activePlan.version)
    );
    setProposedPlan({ ...updatedPlan, status: "PROPOSED" });
    setActiveTab("replan");
  };

  // 신규 조정안 승인 및 멱등성 모의 실행
  const approveProposedPlan = async () => {
    if (!proposedPlan) return;

    const idempotencyKey = `EXEC_${customer.id}_${proposedPlan.version}_${proposedPlan.baselineSnapshotId}`;
    if (executionKeysRef.current.has(idempotencyKey)) {
      return;
    }
    executionKeysRef.current.add(idempotencyKey);
    const approvedPlan: AllocationPlan = {
      ...proposedPlan,
      status: "MOCK_EXECUTED",
    };

    setActivePlan(approvedPlan);
    setProposedPlan(null);

    const execRecord: MockExecutionRecord = {
      id: `exec-${Date.now()}`,
      planVersion: approvedPlan.version,
      idempotencyKey,
      executedAt: new Date().toISOString(),
      status: "SUCCESS",
      details: {
        totalExecutedAmount: approvedPlan.totalMonthlySavings,
        itemsCount: approvedPlan.items.filter((i) => i.monthlyAmount > 0).length,
        message: `조정 계획(${approvedPlan.version}) 승인 완료: 월 ${approvedPlan.totalMonthlySavings.toLocaleString()}원 모의 자동이체 등록 완료`,
      },
    };

    setExecutions((prev) => [execRecord, ...prev]);
    setActiveTab("history");
  };

  // 신규 조정안 거절 (기존안 유지)
  const rejectProposedPlan = () => {
    if (!proposedPlan) return;
    setEvents((prev) => [
      {
        id: `evt-reject-${Date.now()}`,
        type: "INFO",
        title: "사용자 계획 재설계 거절",
        message: `제안된 조정안(${proposedPlan.version})을 거절하고 기존 계획(${activePlan.version})을 유지하기로 결정했습니다.`,
        metric: "사용자 결정",
        oldValue: proposedPlan.version,
        newValue: "기존안 유지",
        detectedAt: new Date().toISOString(),
        ruleVersion: "RULE_2026_V1",
        suggestedAction: "MAINTAIN",
      },
      ...prev,
    ]);
    setProposedPlan(null);
    setActiveTab("goals");
  };

  // 상담 케이스 조치
  const resolveConsultationCase = (caseId: string, notes: string) => {
    setConsultationCases((prev) =>
      prev.map((c) =>
        c.id === caseId
          ? {
              ...c,
              status: "RESOLVED",
              consultantNotes: notes,
            }
          : c
      )
    );
  };

  // AI 설명 요청 (서버사이드 Gemini API 연동 + 실패 시 안전 정형 fallback)
  const requestAiExplanation = async () => {
    if (!proposedPlan) return;
    setIsAiExplaining(true);

    const surplusDiff = proposedPlan.totalMonthlySavings - activePlan.totalMonthlySavings;

    try {
      const res = await fetch("/api/explain-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer,
          changeEvent: events[0],
          oldPlan: activePlan,
          newPlan: proposedPlan,
          surplusChange: surplusDiff,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setProposedPlan((prev) =>
          prev
            ? {
                ...prev,
                aiExplanation: {
                  summary: data.summary,
                  reasons: data.reasons || [],
                  caution: data.caution || "",
                  mode: data.mode || "ai",
                },
              }
            : null
        );
      }
    } catch (e) {
      console.warn("AI explain fetch failed, using deterministic explanation", e);
    } finally {
      setIsAiExplaining(false);
    }
  };

  // 데모 초기화
  const resetDemo = () => {
    setCustomer(DEFAULT_CUSTOMER);
    setConsent(INITIAL_CONSENT);
    setCurrentDate("2026-09");
    setActiveScenario("S01_INITIAL");
    const initialSnap = calculateSnapshotMetrics(generate12MonthTransactions("2026-09"));
    setSnapshot(initialSnap);
    setPrevSnapshot(null);
    setGoals(DEFAULT_GOALS);
    const plan = calculateAllocationPlan(initialSnap, DEFAULT_GOALS, POLICIES_DATA, "v1.0");
    setActivePlan({ ...plan, status: "APPROVED" });
    setProposedPlan(null);
    setConsultationCases([]);
    executionKeysRef.current = new Set(["INIT_MOCK_20260915"]);
    setActiveTab("diagnostics");
  };

  return (
    <EroomContext.Provider
      value={{
        customer,
        consent,
        currentDate,
        snapshot,
        prevSnapshot,
        goals,
        policies,
        activePlan,
        proposedPlan,
        events,
        consultationCases,
        executions,
        activeScenario,
        activeTab,
        viewMode,
        isSimulatingMonth,
        isAiExplaining,
        setActiveTab,
        setViewMode,
        toggleConsent,
        advanceMonth,
        applyScenario,
        updateGoals,
        approveProposedPlan,
        rejectProposedPlan,
        resolveConsultationCase,
        requestAiExplanation,
        resetDemo,
      }}
    >
      {children}
    </EroomContext.Provider>
  );
};

export const useEroom = () => {
  const context = useContext(EroomContext);
  if (!context) {
    throw new Error("useEroom must be used within an EroomProvider");
  }
  return context;
};
