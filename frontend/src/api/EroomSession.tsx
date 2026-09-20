/**
 * iM 이룸 고객 화면 세션 상태
 *
 * - 모든 금액·자격·변화 판정은 Mock 계약(/api/mock 또는 같은 계약의 오프라인 fixture) 결과를 그대로 보관한다.
 * - 이 파일과 컴포넌트는 금액을 다시 계산하지 않는다. 계산이 필요한 화면은 백엔드 응답 필드를 쓴다.
 * - 서버에 연결할 수 없으면 client가 오프라인 fixture로 전환하고 화면은 그 상태를 표시한다.
 * - 실제 가입·송금·상담 예약은 없다. 실행은 모두 모의 실행이다.
 */

import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import type {
  ConsultationCaseV1,
  DiagnosisResponse,
  EligibilityResponse,
  MockExecutionRecordV1,
  MonthlyReviewResponse,
  PersonaId,
  PersonaSummary,
  PlanCommandOutcome,
  PlanCommandResponse,
  PlanProposal,
  ProductBoundaryResponse,
} from "../data/apiContracts";
import type { ProductBoundaryId } from "../data/contracts";
import { MockApiError, createMockApiClient, type ApiSource } from "../data/mockApiClient";

export type Phase = "intro" | "persona" | "consent" | "diagnosing" | "app";
export type TabId = "home" | "diagnostics" | "goals" | "review" | "policy" | "history";

export interface CommandFeedback {
  outcome: PlanCommandOutcome | "ERROR";
  message: string;
}

export interface ConsentRecord {
  status: "ACTIVE" | "REVOKED";
  agreedAt: string;
  revokedAt: string | null;
  scopes: string[];
}

export const CONSENT_SCOPES = [
  "합성 계좌 잔액과 거래 내역 조회",
  "급여·고정·변동·비정기 지출 분류",
  "목표별 납입 계획 계산과 월 1회 재점검",
];

interface EroomSessionValue {
  /* 화면 상태 */
  phase: Phase;
  tab: TabId;
  source: ApiSource;
  isDemoMode: boolean;
  /* 데이터 */
  personas: PersonaSummary[];
  personaId: PersonaId | null;
  persona: PersonaSummary | null;
  consent: ConsentRecord | null;
  diagnosis: DiagnosisResponse | null;
  eligibility: EligibilityResponse | null;
  boundaryId: ProductBoundaryId;
  products: ProductBoundaryResponse | null;
  /** 아직 등록하지 않은 계획 미리보기 */
  planPreview: PlanProposal | null;
  /** 등록·승인·실행 상태가 있는 현재 계획 */
  currentPlan: PlanProposal | null;
  review: MonthlyReviewResponse | null;
  executions: MockExecutionRecordV1[];
  consultation: ConsultationCaseV1 | null;
  consultations: ConsultationCaseV1[];
  /* 진행·오류 */
  loadStep: number;
  pending: Record<string, boolean>;
  error: string | null;
  feedback: CommandFeedback | null;
  /* 액션 */
  setTab: (tab: TabId) => void;
  goToPersonaSelect: () => void;
  goToIntro: () => void;
  selectPersona: (personaId: PersonaId) => void;
  agreeAndDiagnose: () => Promise<void>;
  retryLoad: () => Promise<void>;
  changeBoundary: (boundaryId: ProductBoundaryId) => Promise<void>;
  registerPlan: () => Promise<void>;
  approvePlan: (planId: string) => Promise<void>;
  rejectPlan: (planId: string) => Promise<void>;
  executePlan: (planId: string) => Promise<void>;
  runMonthlyReview: () => Promise<void>;
  revokeConsent: () => Promise<void>;
  loadConsultations: () => Promise<void>;
  clearFeedback: () => void;
  resetSession: () => void;
}

const EroomSessionContext = createContext<EroomSessionValue | null>(null);

const queryFlag = (name: string) => {
  if (typeof window === "undefined") return false;
  return new URLSearchParams(window.location.search).get(name) === "true";
};

const errorMessage = (error: unknown) =>
  error instanceof MockApiError
    ? error.message
    : error instanceof Error
      ? `데이터를 불러오지 못했습니다: ${error.message}`
      : "데이터를 불러오지 못했습니다.";

export const EroomSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const isDemoMode = useMemo(() => queryFlag("demo"), []);
  const client = useMemo(() => createMockApiClient({ role: isDemoMode ? "demo" : "customer" }), [isDemoMode]);

  const [phase, setPhase] = useState<Phase>("intro");
  const [tab, setTab] = useState<TabId>("home");
  const [source, setSource] = useState<ApiSource>("server");
  const [personas, setPersonas] = useState<PersonaSummary[]>([]);
  const [personaId, setPersonaId] = useState<PersonaId | null>(null);
  const [consent, setConsent] = useState<ConsentRecord | null>(null);
  const [diagnosis, setDiagnosis] = useState<DiagnosisResponse | null>(null);
  const [eligibility, setEligibility] = useState<EligibilityResponse | null>(null);
  const [boundaryId, setBoundaryId] = useState<ProductBoundaryId>("BALANCED");
  const [products, setProducts] = useState<ProductBoundaryResponse | null>(null);
  const [planPreview, setPlanPreview] = useState<PlanProposal | null>(null);
  const [currentPlan, setCurrentPlan] = useState<PlanProposal | null>(null);
  const [review, setReview] = useState<MonthlyReviewResponse | null>(null);
  const [executions, setExecutions] = useState<MockExecutionRecordV1[]>([]);
  const [consultation, setConsultation] = useState<ConsultationCaseV1 | null>(null);
  const [consultations, setConsultations] = useState<ConsultationCaseV1[]>([]);
  const [loadStep, setLoadStep] = useState(0);
  const [pending, setPending] = useState<Record<string, boolean>>({});
  const [error, setError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<CommandFeedback | null>(null);

  /** 중복 클릭으로 같은 명령이 두 번 나가지 않게 한다. 서버·fixture 모두 멱등이지만 UI에서도 막는다. */
  const inFlight = useRef<Set<string>>(new Set());

  const runExclusive = useCallback(
    async <T,>(key: string, task: () => Promise<T>): Promise<T | undefined> => {
      if (inFlight.current.has(key)) return undefined;
      inFlight.current.add(key);
      setPending((prev) => ({ ...prev, [key]: true }));
      try {
        return await task();
      } finally {
        inFlight.current.delete(key);
        setPending((prev) => ({ ...prev, [key]: false }));
        setSource(client.source);
      }
    },
    [client],
  );

  /** 페르소나 목록은 화면 진입 시 1회 조회한다. (중복 호출 가드를 쓰지 않아 재마운트에도 안전하다) */
  useEffect(() => {
    let cancelled = false;
    setPending((prev) => ({ ...prev, personas: true }));
    client
      .listPersonas()
      .then((result) => {
        if (!cancelled) setPersonas(result.data);
      })
      .catch((caught) => {
        if (!cancelled) setError(errorMessage(caught));
      })
      .finally(() => {
        if (cancelled) return;
        setPending((prev) => ({ ...prev, personas: false }));
        setSource(client.source);
      });
    return () => {
      cancelled = true;
    };
  }, [client]);

  const persona = useMemo(
    () => personas.find((item) => item.personaId === personaId) ?? null,
    [personas, personaId],
  );

  const loadSession = useCallback(
    async (targetPersona: PersonaId, targetBoundary: ProductBoundaryId) => {
      setError(null);
      setLoadStep(1);
      const diagnosisResult = await client.getDiagnosis(targetPersona);
      setDiagnosis(diagnosisResult.data);
      setLoadStep(2);
      const eligibilityResult = await client.getEligibility(targetPersona);
      setEligibility(eligibilityResult.data);
      setLoadStep(3);
      const productsResult = await client.getProducts(targetBoundary);
      setProducts(productsResult.data);
      const previewResult = await client.previewPlan(targetPersona, targetBoundary);
      setPlanPreview(previewResult.data);
      setLoadStep(4);
    },
    [client],
  );

  const agreeAndDiagnose = useCallback(async () => {
    if (!personaId) return;
    const target = personas.find((item) => item.personaId === personaId);
    const targetBoundary = target?.boundaryId ?? boundaryId;
    setBoundaryId(targetBoundary);
    setConsent({
      status: "ACTIVE",
      agreedAt: target?.asOf ?? "",
      revokedAt: null,
      scopes: CONSENT_SCOPES,
    });
    setPhase("diagnosing");
    setLoadStep(0);
    await runExclusive("session", async () => {
      try {
        await loadSession(personaId, targetBoundary);
        setPhase("app");
        setTab("home");
      } catch (caught) {
        setError(errorMessage(caught));
      }
    });
  }, [personaId, personas, boundaryId, loadSession, runExclusive]);

  const retryLoad = useCallback(async () => {
    if (!personaId) return;
    setPhase("diagnosing");
    setLoadStep(0);
    await runExclusive("session", async () => {
      try {
        await loadSession(personaId, boundaryId);
        setPhase("app");
      } catch (caught) {
        setError(errorMessage(caught));
      }
    });
  }, [personaId, boundaryId, loadSession, runExclusive]);

  const changeBoundary = useCallback(
    async (nextBoundary: ProductBoundaryId) => {
      if (!personaId || nextBoundary === boundaryId) return;
      await runExclusive("boundary", async () => {
        try {
          setError(null);
          const productsResult = await client.getProducts(nextBoundary);
          const previewResult = await client.previewPlan(personaId, nextBoundary);
          setBoundaryId(nextBoundary);
          setProducts(productsResult.data);
          setPlanPreview(previewResult.data);
        } catch (caught) {
          setError(errorMessage(caught));
        }
      });
    },
    [client, personaId, boundaryId, runExclusive],
  );

  const applyCommand = useCallback((response: PlanCommandResponse) => {
    setFeedback({ outcome: response.outcome, message: response.message });
    if (response.plan) setCurrentPlan(response.plan);
    return response;
  }, []);

  const refreshExecutions = useCallback(async () => {
    const customerId = diagnosis?.customer.id;
    if (!customerId) return;
    try {
      const result = await client.listExecutions(customerId);
      setExecutions(result.data);
    } catch (caught) {
      setError(errorMessage(caught));
    }
  }, [client, diagnosis]);

  const registerPlan = useCallback(async () => {
    if (!personaId) return;
    await runExclusive("plan", async () => {
      try {
        setError(null);
        const result = await client.proposePlan(personaId, boundaryId);
        setCurrentPlan(result.data);
        setFeedback({ outcome: "APPROVED", message: "계획을 검토 목록에 등록했습니다. 승인 전에는 실행되지 않습니다." });
      } catch (caught) {
        setError(errorMessage(caught));
        setFeedback({ outcome: "ERROR", message: errorMessage(caught) });
      }
    });
  }, [client, personaId, boundaryId, runExclusive]);

  const approvePlan = useCallback(
    async (planId: string) => {
      await runExclusive(`approve:${planId}`, async () => {
        try {
          const result = await client.approvePlan(planId);
          applyCommand(result.data);
        } catch (caught) {
          setFeedback({ outcome: "ERROR", message: errorMessage(caught) });
        }
      });
    },
    [client, applyCommand, runExclusive],
  );

  const rejectPlan = useCallback(
    async (planId: string) => {
      await runExclusive(`reject:${planId}`, async () => {
        try {
          const result = await client.rejectPlan(planId);
          applyCommand(result.data);
        } catch (caught) {
          setFeedback({ outcome: "ERROR", message: errorMessage(caught) });
        }
      });
    },
    [client, applyCommand, runExclusive],
  );

  const executePlan = useCallback(
    async (planId: string) => {
      await runExclusive(`execute:${planId}`, async () => {
        try {
          const result = await client.executePlan(planId);
          applyCommand(result.data);
          await refreshExecutions();
        } catch (caught) {
          setFeedback({ outcome: "ERROR", message: errorMessage(caught) });
        }
      });
    },
    [client, applyCommand, refreshExecutions, runExclusive],
  );

  const runMonthlyReview = useCallback(async () => {
    if (!personaId) return;
    await runExclusive("review", async () => {
      try {
        setError(null);
        const result = await client.runMonthlyReview(personaId, boundaryId);
        setReview(result.data);
        setConsultation(result.data.consultationCase);
        if (result.data.proposedPlan) setCurrentPlan(result.data.proposedPlan);
        else setCurrentPlan(result.data.previousPlan);
        setTab("review");
      } catch (caught) {
        setError(errorMessage(caught));
        setFeedback({ outcome: "ERROR", message: errorMessage(caught) });
      }
    });
  }, [client, personaId, boundaryId, runExclusive]);

  const revokeConsent = useCallback(async () => {
    if (!personaId) return;
    await runExclusive("consent", async () => {
      try {
        const result = await client.revokeConsent(personaId);
        setConsent((prev) =>
          prev ? { ...prev, status: "REVOKED", revokedAt: result.data.revokedAt } : prev,
        );
        setFeedback({ outcome: "APPROVED", message: "데이터 수집 동의를 철회했습니다. 다음 달 수집이 중단됩니다." });
      } catch (caught) {
        setFeedback({ outcome: "ERROR", message: errorMessage(caught) });
      }
    });
  }, [client, personaId, runExclusive]);

  const loadConsultations = useCallback(async () => {
    await runExclusive("consultations", async () => {
      try {
        const result = await client.listConsultations();
        setConsultations(result.data);
      } catch (caught) {
        setError(errorMessage(caught));
      }
    });
  }, [client, runExclusive]);

  const selectPersona = useCallback((next: PersonaId) => {
    setPersonaId(next);
    setPhase("consent");
    setError(null);
    setFeedback(null);
    setDiagnosis(null);
    setEligibility(null);
    setProducts(null);
    setPlanPreview(null);
    setCurrentPlan(null);
    setReview(null);
    setConsultation(null);
    setExecutions([]);
    setConsent(null);
  }, []);

  const resetSession = useCallback(() => {
    setPhase("intro");
    setTab("home");
    setPersonaId(null);
    setConsent(null);
    setDiagnosis(null);
    setEligibility(null);
    setProducts(null);
    setPlanPreview(null);
    setCurrentPlan(null);
    setReview(null);
    setConsultation(null);
    setConsultations([]);
    setExecutions([]);
    setError(null);
    setFeedback(null);
    setLoadStep(0);
  }, []);

  const value: EroomSessionValue = {
    phase,
    tab,
    source,
    isDemoMode,
    personas,
    personaId,
    persona,
    consent,
    diagnosis,
    eligibility,
    boundaryId,
    products,
    planPreview,
    currentPlan,
    review,
    executions,
    consultation,
    consultations,
    loadStep,
    pending,
    error,
    feedback,
    setTab,
    goToPersonaSelect: () => setPhase("persona"),
    goToIntro: () => setPhase("intro"),
    selectPersona,
    agreeAndDiagnose,
    retryLoad,
    changeBoundary,
    registerPlan,
    approvePlan,
    rejectPlan,
    executePlan,
    runMonthlyReview,
    revokeConsent,
    loadConsultations,
    clearFeedback: () => setFeedback(null),
    resetSession,
  };

  return <EroomSessionContext.Provider value={value}>{children}</EroomSessionContext.Provider>;
};

export const useEroomSession = (): EroomSessionValue => {
  const context = useContext(EroomSessionContext);
  if (!context) throw new Error("useEroomSession must be used within an EroomSessionProvider");
  return context;
};
