/**
 * iM 이룸 Mock Backend API 계약 v1
 *
 * - Frontend는 이 파일의 응답 타입을 그대로 표시하고 금액·자격·판정을 다시 계산하지 않는다.
 * - 모든 금액은 KRW 정수이다. 알 수 없는 값은 0이 아니라 null이다.
 * - 같은 데이터셋 버전과 규칙 버전에서는 같은 응답이 나온다. 시각은 데이터셋 기준일에서 파생한다.
 * - 실제 가입·송금·자동이체·상담 예약은 없다. 실행 결과는 모두 모의 실행이다.
 */

import type { ProductBoundaryId } from "./contracts";

export const API_CONTRACT_VERSION = "mock-api-v1" as const;

export type PersonaId = "P01" | "P02" | "P03" | "EX24";
export type EligibilityStatus = "ELIGIBLE" | "NEEDS_VERIFICATION" | "INELIGIBLE";
export type EventType = "INFO" | "ADJUSTMENT" | "RISK";
export type SuggestedAction = "MAINTAIN" | "RECALCULATE" | "CONSULT_REQUIRED";

/* ------------------------------------------------------------------ */
/* 합성 원천 데이터 (Mock 마이데이터 응답 구조)                         */
/* ------------------------------------------------------------------ */

export type EmploymentType = "SALARIED" | "FREELANCER" | "UNEMPLOYED";

export interface CustomerProfile {
  id: string;
  personaId: PersonaId;
  name: string;
  /** 데이터 기준일 기준 만 나이 */
  age: number;
  birthDate: string | null;
  residenceRegion: string | null;
  residenceDistrict: string | null;
  employmentType: EmploymentType | null;
  jobDescription: string;
  /** 연 소득 추정치. 증빙 전이면 null이 아니라 추정치이며, 모르면 null */
  annualIncome: number | null;
  /** 가구 기준 중위소득 대비 비율(%). 모르면 null */
  householdMedianIncomeRatio: number | null;
  /** 무주택 여부. 모르면 null */
  isHomeless: boolean | null;
  isSynthetic: true;
}

export interface MockConsent {
  status: "ACTIVE" | "REVOKED";
  consentedAt: string;
  revokedAt: string | null;
  /** 최초 동의일의 일(day). 월말 보정 시에도 기준값은 유지한다. */
  anchorDay: number;
  scopes: string[];
}

export type AccountType = "CHECKING" | "SAVINGS" | "CARD" | "LOAN";

export interface MockAccount {
  accountId: string;
  institution: string;
  accountType: AccountType;
  maskedNumber: string;
  /** 잔액. 수집 실패 시 null */
  balance: number | null;
  isSynthetic: true;
}

/** 합성 거래의 가맹점·거래 성격 코드. 실제 업권 코드가 아니라 프로토타입 규칙용 코드이다. */
export type MerchantCategory =
  | "SALARY"
  | "FREELANCE_INCOME"
  | "PUBLIC_BENEFIT"
  | "RENT"
  | "UTILITIES"
  | "TELECOM"
  | "INSURANCE"
  | "SUBSCRIPTION"
  | "GROCERY"
  | "DINING"
  | "TRANSPORT"
  | "SHOPPING"
  | "MEDICAL"
  | "EVENT"
  | "TRAVEL"
  | "ELECTRONICS"
  | "LOAN_REPAYMENT"
  | "REVOLVING_INTEREST"
  | "CARD_PAYMENT"
  | "OWN_TRANSFER"
  | "OTHER";

export interface MockTransaction {
  id: string;
  accountId: string;
  postedAt: string; // YYYY-MM-DD
  direction: "IN" | "OUT";
  amount: number; // 양의 정수
  counterparty: string;
  description: string;
  merchantCategory: MerchantCategory;
  /** 본인 계좌 간 이체의 상대 계좌. 본인 계좌가 아니면 null */
  counterpartyAccountId: string | null;
}

export interface CollectionGap {
  accountId: string;
  month: string; // YYYY-MM
  reason: string;
}

export interface MockGoal {
  id: string;
  title: string;
  category: "EMERGENCY" | "POLICY_SAVINGS" | "HOUSING_SUBSCRIPTION" | "WEALTH_BUILDING";
  targetAmount: number;
  currentAmount: number;
  targetMonths: number;
  priority: number;
  /** 연결 상품·정책 ID. 없으면 자유 저축 */
  productId: string | null;
}

export interface SyntheticDataset {
  datasetVersion: string;
  personaId: PersonaId;
  title: string;
  summary: string;
  /** 최초 진단 기준일 */
  asOf: string;
  customer: CustomerProfile;
  consent: MockConsent;
  accounts: MockAccount[];
  transactions: MockTransaction[];
  collectionGaps: CollectionGap[];
  /** 앱 사용 기록 등 구독 이용 신호. 값이 null이면 이용 여부를 모른다. */
  subscriptionUsage: Record<string, { lastUsedAt: string | null }>;
  goals: MockGoal[];
  boundaryId: ProductBoundaryId;
  /** 월간 점검에 쓰는 다음 달 합성 거래 */
  nextMonth: {
    asOf: string;
    transactions: MockTransaction[];
    collectionGaps: CollectionGap[];
    customerChanges: Partial<Pick<CustomerProfile, "residenceRegion" | "residenceDistrict" | "employmentType">>;
  };
  isSynthetic: true;
}

/* ------------------------------------------------------------------ */
/* 거래 분석                                                            */
/* ------------------------------------------------------------------ */

export type TransactionClass =
  | "SALARY"
  | "OTHER_INCOME"
  | "FIXED"
  | "VARIABLE"
  | "IRREGULAR"
  | "DEBT"
  | "INTERNAL_TRANSFER";

export interface ClassifiedTransaction extends MockTransaction {
  class: TransactionClass;
  ruleId: string;
  /** 소득·지출 집계에서 제외되는 거래 (본인 계좌 간 이체, 카드 대금 결제) */
  excludedFromTotals: boolean;
  /** 결측 월에 속해 월평균에서 제외된 거래 */
  inGapMonth: boolean;
}

export type CompletenessLevel = "COMPLETE" | "PARTIAL" | "INSUFFICIENT";

export interface TransactionWindow {
  startAt: string | null;
  endAt: string | null;
  /** 분석 기간에 포함된 달력 월 수 */
  monthsCovered: number;
  /** 결측 월을 제외하고 월평균 계산에 사용한 월 수 */
  monthsUsed: number;
  /** 중복 제거 후 거래 건수 */
  transactionCount: number;
  duplicatesRemoved: number;
  internalTransfersExcluded: number;
  completeness: CompletenessLevel;
  missingMonths: string[];
  notes: string[];
}

export interface MonthlyAggregate {
  month: string; // YYYY-MM
  /** 결측 월이면 모든 값이 null */
  isGap: boolean;
  salary: number | null;
  otherIncome: number | null;
  income: number | null;
  fixed: number | null;
  variable: number | null;
  irregular: number | null;
  debt: number | null;
  surplus: number | null;
  rentPayment: number | null;
}

export interface DiagnosisMetrics {
  /** 결측 월 제외 월평균. 분석 불가하면 null */
  monthlyIncome: number | null;
  monthlySalary: number | null;
  monthlyOtherIncome: number | null;
  fixedExpenses: number | null;
  variableExpenses: number | null;
  /** 비정기 지출의 월 환산액 */
  irregularExpensesMonthly: number | null;
  debtPayment: number | null;
  /** 월 저축 여력 = 소득 - 고정 - 변동 - 비정기(월 환산) - 부채 */
  availableSurplus: number | null;
  emergencyFundBalance: number | null;
  /** 권장 비상자금 = (고정 + 변동) × 3 */
  recommendedEmergencyFund: number | null;
}

export interface LeakageCandidate {
  id: string;
  type: "UNUSED_SUBSCRIPTION" | "REVOLVING_INTEREST" | "OTHER";
  title: string;
  counterparty: string;
  evidenceTransactionIds: string[];
  estimatedMonthlyCost: number;
  confidence: "HIGH" | "MEDIUM" | "LOW";
  /** 후보는 사실 확정이 아니다. 사용자가 확인해야 한다. */
  reviewStatus: "NEEDS_USER_CONFIRMATION";
  reason: string;
}

export interface DiagnosisResponse {
  contractVersion: typeof API_CONTRACT_VERSION;
  ruleVersion: string;
  datasetVersion: string;
  personaId: PersonaId;
  asOf: string;
  customer: CustomerProfile;
  window: TransactionWindow;
  monthly: MonthlyAggregate[];
  metrics: DiagnosisMetrics;
  leakageCandidates: LeakageCandidate[];
  /** 새는 돈을 모두 정리했을 때의 추정 여력 (확정 아님) */
  surplusIfLeakageResolved: number | null;
  transactions: ClassifiedTransaction[];
  isSynthetic: true;
}

/* ------------------------------------------------------------------ */
/* 정책 자격 · 상품 바운더리                                             */
/* ------------------------------------------------------------------ */

export type CriterionKey = "AGE" | "RESIDENCE" | "ANNUAL_INCOME" | "MEDIAN_INCOME_RATIO" | "EMPLOYMENT" | "HOMELESS" | "APPLICATION_PERIOD";

export interface CriterionResult {
  key: CriterionKey;
  status: "MET" | "UNMET" | "UNKNOWN";
  required: string;
  observed: string | null;
}

export interface PolicyEligibility {
  policyId: string;
  policyName: string;
  organization: string;
  policyVersion: string;
  status: EligibilityStatus;
  reason: string;
  criteria: CriterionResult[];
  /** 자동 배분 가능 여부. ELIGIBLE만 true */
  autoAllocatable: boolean;
  sourceNote: string;
}

export interface EligibilityResponse {
  contractVersion: typeof API_CONTRACT_VERSION;
  ruleVersion: string;
  personaId: PersonaId;
  asOf: string;
  summary: Record<EligibilityStatus, number>;
  results: PolicyEligibility[];
  isSynthetic: true;
}

export interface BoundaryProductDecision {
  productId: string;
  name: string;
  provider: string;
  productType: "DEPOSIT" | "SAVING";
  maturityMonths: number;
  maxMonthlyDeposit: number;
  baseRate: number;
  maxRate: number;
  included: boolean;
  exclusionReasons: string[];
}

export interface ProductBoundaryResponse {
  contractVersion: typeof API_CONTRACT_VERSION;
  ruleVersion: string;
  boundaryId: ProductBoundaryId;
  boundaryLabel: string;
  limits: { allowedProductTypes: Array<"DEPOSIT" | "SAVING">; maxMaturityMonths: number; maxMonthlyDeposit: number };
  includedCount: number;
  products: BoundaryProductDecision[];
  isSynthetic: true;
}

/* ------------------------------------------------------------------ */
/* 목표별 계획                                                           */
/* ------------------------------------------------------------------ */

export type GoalFeasibility = "ACHIEVED" | "ON_TRACK" | "DELAYED" | "BLOCKED";

export interface GoalAllocation {
  goalId: string;
  goalTitle: string;
  category: MockGoal["category"];
  productId: string | null;
  productName: string;
  remainingAmount: number;
  /** 목표 기한 내 달성에 필요한 월 납입액 (만원 단위 올림) */
  requiredMonthly: number;
  monthlyAmount: number;
  /** 배분액이 0이면 null (달성 시점 산출 불가) */
  expectedMonths: number | null;
  expectedCompletionMonth: string | null;
  targetMonths: number;
  feasibility: GoalFeasibility;
  /** 기한 내 달성에 부족한 월 금액 */
  monthlyShortfall: number;
  reasons: string[];
}

export type PlanLifecycleStatus = "PROPOSED" | "APPROVED" | "REJECTED" | "MOCK_EXECUTED" | "SUPERSEDED";

export interface PlanProposal {
  planId: string;
  customerId: string;
  version: number;
  baselineSnapshotId: string;
  ruleVersion: string;
  boundaryId: ProductBoundaryId;
  createdAt: string;
  availableSurplus: number | null;
  totalMonthlyAmount: number;
  unallocatedAmount: number;
  isFeasible: boolean;
  allocations: GoalAllocation[];
  assumptions: string[];
  notices: string[];
  status: PlanLifecycleStatus;
  isSynthetic: true;
}

/* ------------------------------------------------------------------ */
/* 월간 변화 감지 · 상담                                                */
/* ------------------------------------------------------------------ */

export interface ChangeEventV1 {
  id: string;
  ruleId: string;
  ruleVersion: string;
  type: EventType;
  title: string;
  message: string;
  metric: string;
  oldValue: number | string | null;
  newValue: number | string | null;
  evidence: { months: string[]; transactionIds: string[] };
  dataAsOf: string;
  suggestedAction: SuggestedAction;
}

export interface ConsultationCaseV1 {
  id: string;
  riskEventIds: string[];
  customerId: string;
  customerName: string;
  riskType: string;
  severity: "HIGH" | "CRITICAL";
  briefing: {
    coreRisk: string;
    financialState: string;
    impactOnGoals: string;
    recommendedHumanAction: string;
  };
  createdAt: string;
  status: "WAITING" | "IN_PROGRESS" | "COMPLETED";
  /** 실제 상담 예약·외부 기관 전송 없음 */
  isMockCase: true;
}

export interface MonthlyReviewResponse {
  contractVersion: typeof API_CONTRACT_VERSION;
  ruleVersion: string;
  personaId: PersonaId;
  previousAsOf: string;
  currentAsOf: string;
  nextCollectionAt: string;
  /** 이벤트 중 가장 높은 등급. 복합 이벤트여도 RISK가 있으면 RISK */
  overallType: EventType;
  routing: "REPORT_ONLY" | "REPLAN" | "CONSULTATION";
  events: ChangeEventV1[];
  previousMetrics: DiagnosisMetrics;
  currentMetrics: DiagnosisMetrics;
  currentWindow: TransactionWindow;
  previousPlan: PlanProposal;
  /** INFO면 null (기존 계획 유지) */
  proposedPlan: PlanProposal | null;
  consultationCase: ConsultationCaseV1 | null;
  isSynthetic: true;
}

/* ------------------------------------------------------------------ */
/* 승인 · 거절 · 모의 실행                                              */
/* ------------------------------------------------------------------ */

export type PlanCommandOutcome =
  | "APPROVED"
  | "ALREADY_APPROVED"
  | "REJECTED"
  | "ALREADY_REJECTED"
  | "MOCK_EXECUTED"
  | "DUPLICATE_IGNORED"
  | "NOT_FOUND"
  | "INVALID_STATE"
  | "STALE_BASELINE";

export interface MockExecutionRecordV1 {
  id: string;
  planId: string;
  planVersion: number;
  idempotencyKey: string;
  executedAt: string;
  totalMonthlyAmount: number;
  itemsCount: number;
  message: string;
  isMockExecution: true;
}

export interface PlanCommandResponse {
  contractVersion: typeof API_CONTRACT_VERSION;
  outcome: PlanCommandOutcome;
  /** HTTP Mock API 상태 코드와 같은 값 */
  httpStatus: 200 | 201 | 404 | 409;
  message: string;
  plan: PlanProposal | null;
  execution: MockExecutionRecordV1 | null;
}

export interface PersonaSummary {
  personaId: PersonaId;
  title: string;
  summary: string;
  customerName: string;
  age: number;
  residence: string | null;
  boundaryId: ProductBoundaryId;
  asOf: string;
  isSynthetic: true;
}

/* ------------------------------------------------------------------ */
/* 최종기획서 24개월 적용 예시                                          */
/* ------------------------------------------------------------------ */

export interface JourneyStage {
  month: number;
  date: string;
  label: string;
  title: string;
  summary: string;
  eventType: EventType;
  ruleId: string;
  /** 카드 대표 수치 (예: 저축 여력, 월 배분 합계, 결혼자금 월 적립) */
  headlineLabel: string;
  headlineAmount: number;
  /** 시점별 부가 계산 근거 (중도해지 비교, 신규 정책 판정 등) */
  details: Array<{ label: string; value: string }>;
  /** 해당 시점의 월 관리 금액 (활성 배분 합계) */
  monthlyManagedAmount: number;
  allocations: Array<{ goalId: string; label: string; amount: number }>;
  /** 보증금 자기자금 누적액 */
  depositSavedAmount: number;
  /** 보증금 자기자금 목표 대비 진행률 (%, 내림) */
  depositProgressPercent: number;
  action: string;
}

export interface ExampleJourneyResponse {
  contractVersion: typeof API_CONTRACT_VERSION;
  ruleVersion: string;
  customer: CustomerProfile;
  baseline: {
    monthlyIncome: number;
    initialSurplus: number;
    leakageMonthly: number;
    rentSupportMonthly: number;
    executableMonthly: number;
    depositTarget: number;
    depositSelfFundTarget: number;
    depositLoanPortion: number;
  };
  stages: JourneyStage[];
  assumptions: string[];
  isSynthetic: true;
}
