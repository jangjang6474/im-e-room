import type { ConsentState, DemoCustomer, FinancialSnapshot, Goal, TransactionItem } from "../types";
import type { ProductBoundaryId } from "../data/contracts";
import type { ClassifiedTransaction, PersonaId, SyntheticDataset } from "../data/apiContracts";
import { buildDiagnosis } from "../domain/diagnosis";
import { kstTimestamp, monthOf, nextCollectionDate } from "../domain/dateUtils";
import { getDataset } from "./mockDatasets";
import { POLICIES_DATA } from "./syntheticData";

export type PersonaScenarioId = "P01_STABLE_STARTER" | "P02_HOUSING_PLANNER" | "P03_INCOME_RISK";

export interface PersonaScenario {
  id: PersonaScenarioId;
  /** Mock API 페르소나 ID (P01~P03) */
  personaId: PersonaId;
  title: string;
  summary: string;
  expectedFlow: string[];
  customer: DemoCustomer;
  consent: ConsentState;
  baselineMonth: string;
  boundaryId: ProductBoundaryId;
  goals: Goal[];
  createSnapshot: () => FinancialSnapshot;
}

/**
 * 기존 화면 모델(types.ts)로의 변환.
 * 금액은 Mock Backend 진단 결과(domain/diagnosis.ts)를 그대로 사용한다.
 * 기존 FinancialSnapshot은 null을 표현하지 못하므로, 값이 없으면 0으로 두고 completeness=false로 표시한다.
 */
const LEGACY_CATEGORY: Record<string, TransactionItem["category"]> = {
  SALARY: "SALARY",
  FREELANCE_INCOME: "SALARY",
  RENT: "FIXED_RENT",
  UTILITIES: "UTILITIES",
  TELECOM: "UTILITIES",
  INSURANCE: "UTILITIES",
  SUBSCRIPTION: "UTILITIES",
  LOAN_REPAYMENT: "DEBT_REPAYMENT",
  REVOLVING_INTEREST: "DEBT_REPAYMENT",
  OWN_TRANSFER: "TRANSFER",
  CARD_PAYMENT: "TRANSFER",
};

const toLegacyTransaction = (tx: ClassifiedTransaction): TransactionItem => ({
  id: tx.id,
  date: tx.postedAt,
  description: tx.description,
  category: LEGACY_CATEGORY[tx.merchantCategory] ?? "LIVING",
  amount: tx.amount,
  type: tx.direction,
  isInternalTransfer: tx.excludedFromTotals,
});

function toLegacySnapshot(dataset: SyntheticDataset): FinancialSnapshot {
  const diagnosis = buildDiagnosis(dataset);
  const m = diagnosis.metrics;
  const lastMonth = diagnosis.monthly.filter((item) => !item.isGap).at(-1)?.month;
  return {
    id: `snap-${dataset.customer.id}-${dataset.asOf}`,
    customerId: dataset.customer.id,
    asOf: dataset.asOf,
    isSynthetic: true,
    monthlyIncome: m.monthlyIncome ?? 0,
    fixedExpenses: m.fixedExpenses ?? 0,
    // 기존 모델은 비정기 지출 칸이 없어 월 환산액을 변동 지출에 합산한다 (여력 계산 결과는 동일).
    variableExpenses: (m.variableExpenses ?? 0) + (m.irregularExpensesMonthly ?? 0),
    debtPayment: m.debtPayment ?? 0,
    availableSurplus: m.availableSurplus ?? 0,
    emergencyFundBalance: m.emergencyFundBalance ?? 0,
    recommendedEmergencyFund: m.recommendedEmergencyFund ?? 0,
    completeness: diagnosis.window.completeness === "COMPLETE" && Object.values(m).every((value) => value !== null),
    accounts: dataset.accounts
      .filter((account) => account.accountType !== "CARD")
      .map((account) => ({
        accountId: account.accountId,
        bankName: account.institution,
        accountNumber: account.maskedNumber,
        accountType: account.accountType as "CHECKING" | "SAVINGS" | "LOAN",
        balance: account.balance ?? 0,
      })),
    transactions: diagnosis.transactions.filter((tx) => monthOf(tx.postedAt) === lastMonth).map(toLegacyTransaction),
  };
}

function toLegacyCustomer(dataset: SyntheticDataset): DemoCustomer {
  const c = dataset.customer;
  return {
    id: c.id,
    scenarioId: c.personaId,
    name: c.name,
    age: c.age,
    residence: [c.residenceRegion, c.residenceDistrict].filter(Boolean).join(" "),
    jobStatus: c.jobDescription,
    annualIncomeEstimated: c.annualIncome ?? 0,
    isSynthetic: true,
    birthDate: c.birthDate,
    residenceRegion: c.residenceRegion,
    employmentType: c.employmentType,
    householdMedianIncomeRatio: c.householdMedianIncomeRatio,
    isHomeless: c.isHomeless,
  };
}

const toLegacyConsent = (dataset: SyntheticDataset): ConsentState => ({
  status: dataset.consent.status,
  consentedAt: dataset.consent.consentedAt,
  anchorDay: dataset.consent.anchorDay,
  nextScheduledCollection: kstTimestamp(nextCollectionDate(dataset.consent.anchorDay, dataset.asOf)),
  scopes: dataset.consent.scopes,
});

const toLegacyGoals = (dataset: SyntheticDataset): Goal[] =>
  dataset.goals.map((goal) => ({
    id: goal.id,
    title: goal.title,
    category: goal.category,
    targetAmount: goal.targetAmount,
    currentAmount: goal.currentAmount,
    targetMonths: goal.targetMonths,
    priority: goal.priority,
    // 기존 배분 엔진은 정책 상품만 알고 있으므로 예·적금 카탈로그 상품은 연결하지 않는다.
    recommendedProductId: goal.productId && POLICIES_DATA.some((policy) => policy.id === goal.productId) ? goal.productId : undefined,
  }));

function persona(id: PersonaScenarioId, personaId: PersonaId, expectedFlow: string[]): PersonaScenario {
  const dataset = getDataset(personaId);
  return {
    id,
    personaId,
    title: dataset.title,
    summary: dataset.summary,
    expectedFlow,
    customer: toLegacyCustomer(dataset),
    consent: toLegacyConsent(dataset),
    baselineMonth: monthOf(dataset.asOf),
    boundaryId: dataset.boundaryId,
    goals: toLegacyGoals(dataset),
    createSnapshot: () => toLegacySnapshot(dataset),
  };
}

export const PERSONA_SCENARIOS: PersonaScenario[] = [
  persona("P01_STABLE_STARTER", "P01", ["모의 동의", "최초 진단", "안정형 선택", "비상자금 우선 배분", "월간 유지 점검"]),
  persona("P02_HOUSING_PLANNER", "P02", ["모의 동의", "연령 정책 필터", "균형형 선택", "주거 목표 재설계", "변경안 승인"]),
  persona("P03_INCOME_RISK", "P03", ["모의 동의", "월간 소득 감소 감지", "위험 이벤트", "납입 축소안", "상담사 연결"]),
];

export const DEFAULT_PERSONA = PERSONA_SCENARIOS[0];
