/**
 * iM 이룸 — 완전 합성 데이터 (Synthetic Fixtures)
 * 실사용자 데이터가 일절 없으며, API 명세 구조를 참고한 100% 모의 데이터셋입니다.
 */

import {
  DemoCustomer,
  Goal,
  PolicyProduct,
  FinancialSnapshot,
  ConsentState,
} from "../types";
import { REFERENCE_CATALOG } from "./generated/referenceCatalog";

const MOCK_SAVING_PRODUCT = REFERENCE_CATALOG.financialProducts[0];

export const DEFAULT_CUSTOMER: DemoCustomer = {
  id: "cust-demo-2026-001",
  scenarioId: "S01_INITIAL",
  name: "김이룸",
  age: 26,
  residence: "대구광역시 수성구",
  jobStatus: "제조/IT 중소기업 재직 (2년차 사회초년생)",
  annualIncomeEstimated: 31200000,
  isSynthetic: true,
};

export const INITIAL_CONSENT: ConsentState = {
  status: "ACTIVE",
  consentedAt: "2026-09-15T10:00:00+09:00",
  anchorDay: 15,
  nextScheduledCollection: "2026-10-15T09:00:00+09:00",
  scopes: ["account_balance", "account_transaction", "public_qualification"],
};

export const DEFAULT_GOALS: Goal[] = [
  {
    id: "goal-emergency",
    title: "최소 비상금 500만원 만들기",
    category: "EMERGENCY",
    targetAmount: 5000000,
    currentAmount: 2200000,
    targetMonths: 10,
    priority: 1, // 최우선
    recommendedProductId: "policy-emergency-saver",
  },
  {
    id: "goal-daegu-hope",
    title: "대구 청년희망적금 (매칭지원금 수령)",
    category: "POLICY_SAVINGS",
    targetAmount: 2400000,
    currentAmount: 0,
    targetMonths: 24,
    priority: 2,
    recommendedProductId: "policy-daegu-hope",
  },
  {
    id: "goal-doyak",
    title: "청년도약계좌 5년 목돈 5,000만원",
    category: "POLICY_SAVINGS",
    targetAmount: 42000000,
    currentAmount: 3500000,
    targetMonths: 60,
    priority: 3,
    recommendedProductId: "policy-doyak",
  },
  {
    id: "goal-housing",
    title: "청년 주택드림 청약 납입 (청약 가점)",
    category: "HOUSING_SUBSCRIPTION",
    targetAmount: 6000000,
    currentAmount: 1800000,
    targetMonths: 36,
    priority: 4,
    recommendedProductId: "policy-housing-dream",
  },
];

export const POLICIES_DATA: PolicyProduct[] = [
  {
    id: "policy-doyak",
    name: "정부 청년도약계좌 (iM뱅크 연계)",
    provider: "서민금융진흥원 & iM뱅크",
    category: "GOV_SUBSIDY",
    maxMonthlyDeposit: 700000,
    baseRate: 4.5,
    maxRate: 6.0,
    targetAgeRange: [19, 34],
    incomeLimitDescription: "개인소득 연 7,500만원 이하 & 가구소득 중위 250% 이하",
    eligibility: "NEEDS_VERIFICATION",
    eligibilityReason: "연령 충족. 소득금액증명원 자동 스크래핑 검증 대기 중",
    officialReference: "서민금융진흥원 고시 제2026-14호",
    asOfPolicy: "2026-09-01",
  },
  {
    id: "policy-daegu-hope",
    name: "대구시 청년희망적금 (1:1 시비 매칭)",
    provider: "대구광역시 청년정책과",
    category: "LOCAL_SPECIAL",
    maxMonthlyDeposit: 100000,
    baseRate: 3.5,
    maxRate: 100.0, // 원금 100% 매칭지원금
    targetAgeRange: [19, 34],
    incomeLimitDescription: "대구 주민등록 & 기준 중위소득 140% 이하 근로 청년",
    eligibility: "ELIGIBLE",
    eligibilityReason: "대구 거주 및 연소득 3,120만원으로 가입 요건 부합",
    officialReference: "대구광역시 청년지원 조례 제21조",
    asOfPolicy: "2026-08-20",
  },
  {
    id: "policy-housing-dream",
    name: "iM 청년 주택드림 청약종합저축",
    provider: "국토교통부 & iM뱅크",
    category: "HOUSING",
    maxMonthlyDeposit: 100000,
    baseRate: 2.8,
    maxRate: 4.5,
    targetAgeRange: [19, 34],
    incomeLimitDescription: "무주택 청년 & 연소득 5,000만원 이하",
    eligibility: "ELIGIBLE",
    eligibilityReason: "무주택 청년 자격 및 소득 요건 충족",
    officialReference: "주택도시기금 운용지침 2026",
    asOfPolicy: "2026-07-01",
  },
  {
    id: "policy-emergency-saver",
    name: MOCK_SAVING_PRODUCT?.name ?? "청년 목표 적금 예시",
    provider: MOCK_SAVING_PRODUCT?.provider ?? "iM뱅크 예시",
    category: "COMMERCIAL",
    maxMonthlyDeposit: MOCK_SAVING_PRODUCT?.maxMonthlyDeposit ?? 500000,
    baseRate: MOCK_SAVING_PRODUCT?.baseRate ?? 3.2,
    maxRate: MOCK_SAVING_PRODUCT?.maxRate ?? 4.1,
    targetAgeRange: [19, 39],
    incomeLimitDescription: "제한 없음 (수시 입출금 및 비상 출금 우대)",
    eligibility: "ELIGIBLE",
    eligibilityReason: "누구나 개설 가능, 마이데이터 연동 우대금리 적용",
    sourceUrl: MOCK_SAVING_PRODUCT?.detailUrl,
    officialReference: "금융감독원 금융상품 한눈에 응답 구조 기반 합성 레코드",
    asOfPolicy: MOCK_SAVING_PRODUCT?.disclosureMonth ?? "202609",
  },
];

/**
 * 12개월 가상 거래 내역 생성기
 */
export function generate12MonthTransactions(baseMonth: string): FinancialSnapshot {
  return {
    id: `snap-${baseMonth}-001`,
    customerId: "cust-demo-2026-001",
    asOf: `${baseMonth}-15`,
    isSynthetic: true,
    monthlyIncome: 2600000, // 기본 급여 260만원
    fixedExpenses: 750000, // 월세 45만 + 관리비/공과금 15만 + 통신 8만 + 보험 7만
    variableExpenses: 800000, // 식비 45만 + 생활쇼핑 20만 + 교통 15만
    debtPayment: 150000, // 학자금 대출 분할 상환
    availableSurplus: 900000, // 260만 - (75만 + 80만 + 15만) = 90만원
    emergencyFundBalance: 2200000,
    recommendedEmergencyFund: 4650000, // (75만 + 80만) * 3개월 = 465만원
    completeness: true,
    accounts: [
      {
        accountId: "acc-im-checking",
        bankName: "iM뱅크",
        accountNumber: "508-12-398472",
        accountType: "CHECKING",
        balance: 3120000,
      },
      {
        accountId: "acc-im-emergency",
        bankName: "iM뱅크",
        accountNumber: "508-01-987123",
        accountType: "SAVINGS",
        balance: 2200000,
      },
      {
        accountId: "acc-student-loan",
        bankName: "한국장학재단",
        accountNumber: "2022-LOAN-984",
        accountType: "LOAN",
        balance: 4800000,
      },
    ],
    transactions: [
      {
        id: "tx-sal-01",
        date: `${baseMonth}-10`,
        description: "(주)테크솔루션 급여입금",
        category: "SALARY",
        amount: 2600000,
        type: "IN",
        isInternalTransfer: false,
      },
      {
        id: "tx-rent-01",
        date: `${baseMonth}-11`,
        description: "원룸 월세 자동이체",
        category: "FIXED_RENT",
        amount: 450000,
        type: "OUT",
        isInternalTransfer: false,
      },
      {
        id: "tx-loan-01",
        date: `${baseMonth}-12`,
        description: "학자금대출 상환 원리금",
        category: "DEBT_REPAYMENT",
        amount: 150000,
        type: "OUT",
        isInternalTransfer: false,
      },
      {
        id: "tx-util-01",
        date: `${baseMonth}-13`,
        description: "전기/도시가스 요금",
        category: "UTILITIES",
        amount: 150000,
        type: "OUT",
        isInternalTransfer: false,
      },
      {
        id: "tx-food-01",
        date: `${baseMonth}-14`,
        description: "이마트 만촌점 장보기",
        category: "LIVING",
        amount: 124000,
        type: "OUT",
        isInternalTransfer: false,
      },
      {
        id: "tx-xfer-dummy",
        date: `${baseMonth}-08`,
        description: "내 비상금 통장으로 이체 (중복제거 확인용)",
        category: "TRANSFER",
        amount: 200000,
        type: "OUT",
        isInternalTransfer: true, // 내부 이체는 지출 이중 계산 방지
      },
    ],
  };
}

/**
 * 12개월 월별 소득/지출 추이 히스토리 (차트 시각화용)
 */
export const HISTORICAL_12_MONTHS = [
  { month: "25.10", income: 250, expense: 165, savings: 85 },
  { month: "25.11", income: 250, expense: 172, savings: 78 },
  { month: "25.12", income: 280, expense: 190, savings: 90 }, // 연말 지출
  { month: "26.01", income: 260, expense: 160, savings: 100 }, // 연봉협상 소폭 인상
  { month: "26.02", income: 260, expense: 168, savings: 92 },
  { month: "26.03", income: 260, expense: 175, savings: 85 },
  { month: "26.04", income: 260, expense: 170, savings: 90 },
  { month: "26.05", income: 260, expense: 185, savings: 75 }, // 5월 가정의달
  { month: "26.06", income: 260, expense: 168, savings: 92 },
  { month: "26.07", income: 260, expense: 175, savings: 85 },
  { month: "26.08", income: 260, expense: 170, savings: 90 },
  { month: "26.09", income: 260, expense: 170, savings: 90 }, // 현재 기준월
];
