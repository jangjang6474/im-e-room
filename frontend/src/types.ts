/**
 * iM 이룸 — 핵심 타입 정의
 * TRD v0.1 및 PRD v0.1 계약 명세 준수
 */

export type EligibilityStatus = "ELIGIBLE" | "NEEDS_VERIFICATION" | "INELIGIBLE";
export type EventSeverity = "INFO" | "ADJUSTMENT" | "RISK";
export type PlanStatus = "DRAFT" | "PROPOSED" | "APPROVED" | "REJECTED" | "MOCK_EXECUTED";
export type ConsultationStatus = "WAITING" | "IN_PROGRESS" | "RESOLVED";

export interface DemoCustomer {
  id: string;
  scenarioId: string;
  name: string;
  age: number;
  residence: string;
  jobStatus: string;
  annualIncomeEstimated: number;
  isSynthetic: true; // 데모 및 합성 데이터 명시
  // 자격 판정용 선택 필드. 모르면 null (충족으로 간주하지 않음)
  birthDate?: string | null;
  residenceRegion?: string | null;
  employmentType?: "SALARIED" | "FREELANCER" | "UNEMPLOYED" | null;
  householdMedianIncomeRatio?: number | null;
  isHomeless?: boolean | null;
}

export interface ConsentState {
  status: "ACTIVE" | "REVOKED" | "PENDING";
  consentedAt: string;
  revokedAt?: string;
  anchorDay: number; // 매월 수집일 (예: 15일)
  nextScheduledCollection: string;
  scopes: string[];
}

export interface AccountInfo {
  accountId: string;
  bankName: string;
  accountNumber: string;
  accountType: "CHECKING" | "SAVINGS" | "LOAN";
  balance: number;
}

export interface TransactionItem {
  id: string;
  date: string;
  description: string;
  category: "SALARY" | "LIVING" | "FIXED_RENT" | "UTILITIES" | "TRANSFER" | "DEBT_REPAYMENT" | "SAVINGS";
  amount: number;
  type: "IN" | "OUT";
  isInternalTransfer: boolean; // 계좌 간 이체 중복 제거 플래그
}

export interface FinancialSnapshot {
  id: string;
  customerId: string;
  asOf: string; // 데이터 기준일 YYYY-MM-DD
  isSynthetic: true;
  monthlyIncome: number; // 실소득 (중복 제외)
  fixedExpenses: number; // 월세, 공과금, 통신비 등 고정 지출
  variableExpenses: number; // 식비, 여가 등 변동 생활비 지출
  debtPayment: number; // 대출 원리금 상환액
  availableSurplus: number; // 월 가용 저축 여력 = 소득 - (고정+변동+부채)
  emergencyFundBalance: number; // 현재 비상자금 보유액
  recommendedEmergencyFund: number; // 권장 비상자금 (고정+변동지출 3개월치)
  accounts: AccountInfo[];
  transactions: TransactionItem[];
  completeness: boolean; // 데이터 완전성
}

export interface Goal {
  id: string;
  title: string;
  category: "EMERGENCY" | "POLICY_SAVINGS" | "HOUSING_SUBSCRIPTION" | "WEALTH_BUILDING";
  targetAmount: number; // 목표 금액 (KRW)
  currentAmount: number; // 현재 모은 금액 (KRW)
  targetMonths: number; // 목표 기간 (월)
  priority: number; // 1 (최우선) ~ 4
  recommendedProductId?: string;
}

export interface PolicyProduct {
  id: string;
  name: string;
  provider: string; // 예: "서민금융진흥원 / iM뱅크", "대구광역시", "국토교통부"
  category: "GOV_SUBSIDY" | "LOCAL_SPECIAL" | "HOUSING" | "COMMERCIAL";
  maxMonthlyDeposit: number; // 최대 월 납입 한도
  baseRate: number; // 기본 이율 (%)
  maxRate: number; // 우대 포함 최고 이율 또는 정부 기여율 (%)
  targetAgeRange: [number, number]; // [19, 34]
  incomeLimitDescription: string;
  eligibility: EligibilityStatus;
  eligibilityReason: string;
  sourceUrl?: string;
  officialReference: string;
  asOfPolicy: string;
}

export interface ChangeEvent {
  id: string;
  type: EventSeverity;
  title: string;
  message: string;
  metric: string;
  oldValue: string;
  newValue: string;
  detectedAt: string;
  ruleVersion: string;
  suggestedAction: "MAINTAIN" | "RECALCULATE" | "CONSULT_REQUIRED";
}

export interface AllocationItem {
  goalId: string;
  goalTitle: string;
  productId: string;
  productName: string;
  monthlyAmount: number; // 월 배분액 (KRW)
  expectedCompletionMonths: number; // 예상 달성 소요 개월
  allocationRatio: number; // 비율 (0 ~ 1)
}

export interface AllocationPlan {
  version: string; // e.g., "v1.0", "v2.0"
  createdAt: string;
  baselineSnapshotId: string;
  totalMonthlySavings: number; // 총 월 저축액 (<= 가용 여력)
  unallocatedSurplus: number; // 남은 유동성 예비금
  isFeasible: boolean; // 가용 여력 내 달성 가능 여부
  items: AllocationItem[];
  deficitsNotice?: string; // 여력 부족 시 경고 및 대안
  assumptions: string[];
  status: PlanStatus;
  ruleBasedExplanation: {
    summary: string;
    reasons: string[];
    burdenNotice: string;
  };
  aiExplanation?: {
    summary: string;
    reasons: string[];
    caution: string;
    mode: string;
  };
}

export interface ConsultationCase {
  id: string;
  riskEventId: string;
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
  status: ConsultationStatus;
  consultantNotes?: string;
}

export interface MockExecutionRecord {
  id: string;
  planVersion: string;
  idempotencyKey: string;
  executedAt: string;
  status: "SUCCESS" | "DUPLICATE_IGNORED" | "FAILED";
  details: {
    totalExecutedAmount: number;
    itemsCount: number;
    message: string;
  };
}

export type ScenarioPresetId = 
  | "S01_INITIAL"
  | "S02_NO_CHANGE"
  | "S03_SALARY_RISE"
  | "S04_INCOME_STOP"
  | "S05_POLICY_UPDATE"
  | "S06_OVER_BUDGET";
