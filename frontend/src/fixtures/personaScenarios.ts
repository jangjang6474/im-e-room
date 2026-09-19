import type { ConsentState, DemoCustomer, FinancialSnapshot, Goal } from "../types";
import type { ProductBoundaryId } from "../data/contracts";
import { generate12MonthTransactions } from "./syntheticData";

export type PersonaScenarioId = "P01_STABLE_STARTER" | "P02_HOUSING_PLANNER" | "P03_INCOME_RISK";

export interface PersonaScenario {
  id: PersonaScenarioId;
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

const consent = (day: number): ConsentState => ({
  status: "ACTIVE",
  consentedAt: `2026-09-${String(day).padStart(2, "0")}T10:00:00+09:00`,
  anchorDay: day,
  nextScheduledCollection: `2026-10-${String(day).padStart(2, "0")}T09:00:00+09:00`,
  scopes: ["account_balance", "account_transaction", "public_qualification"],
});

const snapshot = (customerId: string, mutate: (value: FinancialSnapshot) => void): FinancialSnapshot => {
  const value = generate12MonthTransactions("2026-09");
  value.id = `snap-${customerId}-2026-09`;
  value.customerId = customerId;
  mutate(value);
  return value;
};

export const PERSONA_SCENARIOS: PersonaScenario[] = [
  {
    id: "P01_STABLE_STARTER",
    title: "안정적인 사회초년생",
    summary: "월급은 일정하지만 비상자금이 부족해 단기 안정성을 우선하는 고객",
    expectedFlow: ["모의 동의", "최초 진단", "안정형 선택", "비상자금 우선 배분", "월간 유지 점검"],
    customer: { id: "cust-persona-01", scenarioId: "P01", name: "김이룸", age: 24, residence: "대구광역시 수성구", jobStatus: "중소기업 정규직 1년차", annualIncomeEstimated: 31200000, isSynthetic: true },
    consent: consent(15),
    baselineMonth: "2026-09",
    boundaryId: "STABLE",
    goals: [
      { id: "p1-emergency", title: "비상금 500만원", category: "EMERGENCY", targetAmount: 5000000, currentAmount: 1200000, targetMonths: 12, priority: 1 },
      { id: "p1-savings", title: "첫 목돈 1,000만원", category: "WEALTH_BUILDING", targetAmount: 10000000, currentAmount: 2500000, targetMonths: 24, priority: 2 },
    ],
    createSnapshot: () => snapshot("cust-persona-01", (value) => { value.monthlyIncome = 2600000; value.fixedExpenses = 850000; value.variableExpenses = 850000; value.debtPayment = 100000; value.emergencyFundBalance = 1200000; }),
  },
  {
    id: "P02_HOUSING_PLANNER",
    title: "주거 독립 준비 청년",
    summary: "2년 안에 보증금을 마련하기 위해 정책과 적금을 함께 비교하는 고객",
    expectedFlow: ["모의 동의", "연령 정책 필터", "균형형 선택", "주거 목표 재설계", "변경안 승인"],
    customer: { id: "cust-persona-02", scenarioId: "P02", name: "박하늘", age: 29, residence: "대구광역시 달서구", jobStatus: "IT 기업 재직 4년차", annualIncomeEstimated: 42000000, isSynthetic: true },
    consent: consent(27),
    baselineMonth: "2026-09",
    boundaryId: "BALANCED",
    goals: [
      { id: "p2-housing", title: "독립 보증금 2,000만원", category: "HOUSING_SUBSCRIPTION", targetAmount: 20000000, currentAmount: 7000000, targetMonths: 24, priority: 1 },
      { id: "p2-emergency", title: "생활비 3개월 비상금", category: "EMERGENCY", targetAmount: 6000000, currentAmount: 3500000, targetMonths: 12, priority: 2 },
    ],
    createSnapshot: () => snapshot("cust-persona-02", (value) => { value.monthlyIncome = 3500000; value.fixedExpenses = 950000; value.variableExpenses = 900000; value.debtPayment = 0; value.emergencyFundBalance = 3500000; }),
  },
  {
    id: "P03_INCOME_RISK",
    title: "소득 변동 위험 청년",
    summary: "프리랜서 소득 감소로 장기 납입보다 상담과 유동성 확보가 먼저인 고객",
    expectedFlow: ["모의 동의", "월간 소득 감소 감지", "위험 이벤트", "납입 축소안", "상담사 연결"],
    customer: { id: "cust-persona-03", scenarioId: "P03", name: "이도윤", age: 33, residence: "대구광역시 북구", jobStatus: "프리랜서 디자이너", annualIncomeEstimated: 26400000, isSynthetic: true },
    consent: consent(31),
    baselineMonth: "2026-09",
    boundaryId: "STABLE",
    goals: [
      { id: "p3-debt", title: "생활비 대출 상환", category: "WEALTH_BUILDING", targetAmount: 6000000, currentAmount: 1000000, targetMonths: 18, priority: 1 },
      { id: "p3-emergency", title: "소득 공백 비상금", category: "EMERGENCY", targetAmount: 4500000, currentAmount: 800000, targetMonths: 18, priority: 2 },
    ],
    createSnapshot: () => snapshot("cust-persona-03", (value) => { value.monthlyIncome = 2200000; value.fixedExpenses = 800000; value.variableExpenses = 900000; value.debtPayment = 350000; value.emergencyFundBalance = 800000; }),
  },
];

export const DEFAULT_PERSONA = PERSONA_SCENARIOS[0];
