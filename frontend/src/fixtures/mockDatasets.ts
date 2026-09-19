/**
 * iM 이룸 — 완전 합성 Mock 데이터셋 (P01~P03, 최종기획서 24개월 적용 예시 EX24)
 *
 * 실제 개인정보·계좌·거래가 아니다. 이름·계좌번호·가맹점은 모두 가상이다.
 * 거래는 월별 규칙으로 결정적으로 생성하며 난수와 시스템 시각을 쓰지 않는다.
 */

import type {
  CollectionGap,
  MerchantCategory,
  MockAccount,
  MockTransaction,
  PersonaId,
  SyntheticDataset,
} from "../data/apiContracts";
import { monthRange } from "../domain/dateUtils";

export const DATASET_VERSION = "synthetic-2026-09-20.v1";

type Line = {
  day: number;
  account: string;
  dir: "IN" | "OUT";
  amount: number;
  counterparty: string;
  category: MerchantCategory;
  description?: string;
  to?: string | null;
};

const pad = (value: number) => String(value).padStart(2, "0");

function buildMonth(prefix: string, month: string, lines: Line[]): MockTransaction[] {
  return lines.map((line, index) => ({
    id: `${prefix}-${month.replace("-", "")}-${pad(index + 1)}`,
    accountId: line.account,
    postedAt: `${month}-${pad(line.day)}`,
    direction: line.dir,
    amount: line.amount,
    counterparty: line.counterparty,
    description: line.description ?? line.counterparty,
    merchantCategory: line.category,
    counterpartyAccountId: line.to ?? null,
  }));
}

/** 월 인덱스로 만드는 결정적 변동 (±) */
const wobble = (index: number, step: number, span: number) => ((index * step) % span) - Math.floor(span / 2);

/** 카드 사용분 → 다음 달 14일 결제대금 (본인 계좌 간 이동이므로 집계 제외 대상) */
function cardBill(prefix: string, month: string, amount: number, checking: string, card: string): MockTransaction {
  return {
    id: `${prefix}-${month.replace("-", "")}-bill`,
    accountId: checking,
    postedAt: `${month}-14`,
    direction: "OUT",
    amount,
    counterparty: "iM카드 결제대금",
    description: "카드 이용대금 자동납부",
    merchantCategory: "CARD_PAYMENT",
    counterpartyAccountId: card,
  };
}

function withCardBills(prefix: string, months: string[], byMonth: Record<string, MockTransaction[]>, checking: string, card: string, openingBill: number) {
  const result: MockTransaction[] = [];
  months.forEach((month, index) => {
    const prevCardTotal =
      index === 0 ? openingBill : byMonth[months[index - 1]].filter((tx) => tx.accountId === card && tx.direction === "OUT").reduce((acc, tx) => acc + tx.amount, 0);
    if (prevCardTotal > 0) result.push(cardBill(prefix, month, prevCardTotal, checking, card));
    result.push(...byMonth[month]);
  });
  return result;
}

const account = (accountId: string, institution: string, accountType: MockAccount["accountType"], maskedNumber: string, balance: number | null): MockAccount => ({
  accountId,
  institution,
  accountType,
  maskedNumber,
  balance,
  isSynthetic: true,
});

/* ------------------------------------------------------------------ */
/* P01 안정적인 사회초년생                                             */
/* ------------------------------------------------------------------ */

function p01Lines(month: string, index: number): Line[] {
  const lines: Line[] = [
    { day: 1, account: "p01-chk", dir: "OUT", amount: 400_000, counterparty: "수성원룸 임대인", category: "RENT", description: "월세 자동이체" },
    { day: 5, account: "p01-card", dir: "OUT", amount: 13_900, counterparty: "스트림플러스", category: "SUBSCRIPTION" },
    { day: 7, account: "p01-card", dir: "OUT", amount: 10_900, counterparty: "뮤직온", category: "SUBSCRIPTION" },
    { day: 10, account: "p01-chk", dir: "OUT", amount: 65_000, counterparty: "가상텔레콤", category: "TELECOM" },
    { day: 12, account: "p01-chk", dir: "OUT", amount: 50_000, counterparty: "이룸생명 실손보험", category: "INSURANCE" },
    { day: 15, account: "p01-chk", dir: "OUT", amount: 100_000, counterparty: "한국장학재단(가상)", category: "LOAN_REPAYMENT", description: "학자금대출 원리금" },
    { day: 20, account: "p01-chk", dir: "OUT", amount: 85_000 + wobble(index, 7_000, 20_000), counterparty: "대구도시가스(가상)", category: "UTILITIES" },
    { day: 3, account: "p01-card", dir: "OUT", amount: 112_000 + wobble(index, 4_300, 16_000), counterparty: "만촌마트", category: "GROCERY" },
    { day: 13, account: "p01-card", dir: "OUT", amount: 108_000 + wobble(index, 3_100, 14_000), counterparty: "만촌마트", category: "GROCERY" },
    { day: 24, account: "p01-card", dir: "OUT", amount: 110_000 + wobble(index, 5_900, 12_000), counterparty: "수성식자재", category: "GROCERY" },
    { day: 9, account: "p01-card", dir: "OUT", amount: 240_000 + wobble(index, 9_700, 40_000), counterparty: "동네식당 모음", category: "DINING" },
    { day: 2, account: "p01-card", dir: "OUT", amount: 150_000, counterparty: "대구교통카드", category: "TRANSPORT" },
    { day: 18, account: "p01-card", dir: "OUT", amount: 230_000 + wobble(index, 11_300, 60_000), counterparty: "온라인쇼핑몰", category: "SHOPPING" },
    { day: 25, account: "p01-chk", dir: "IN", amount: 2_600_000, counterparty: "(주)테크솔루션(가상)", category: "SALARY", description: "급여" },
    { day: 26, account: "p01-chk", dir: "OUT", amount: 200_000, counterparty: "본인 비상금통장", category: "OWN_TRANSFER", to: "p01-sav" },
    { day: 26, account: "p01-sav", dir: "IN", amount: 200_000, counterparty: "본인 입출금통장", category: "OWN_TRANSFER", to: "p01-chk" },
  ];
  if (month === "2026-05") lines.push({ day: 8, account: "p01-card", dir: "OUT", amount: 300_000, counterparty: "가정의달 선물", category: "EVENT" });
  if (month === "2026-07") lines.push({ day: 16, account: "p01-card", dir: "OUT", amount: 120_000, counterparty: "수성치과(가상)", category: "MEDICAL" });
  return lines;
}

function p01Transactions(months: string[]): MockTransaction[] {
  const byMonth = Object.fromEntries(months.map((month, i) => [month, buildMonth("p01", month, p01Lines(month, i))]));
  return withCardBills("p01", months, byMonth, "p01-chk", "p01-card", 950_000);
}

const P01_BASE = p01Transactions(monthRange("2026-03", "2026-08"));
// 마이데이터 재전송으로 같은 거래가 두 번 들어온 경우 (ID 동일 / ID만 다른 동일 내용)
const P01_DUPLICATES: MockTransaction[] = [
  { ...P01_BASE.find((tx) => tx.id === "p01-202608-08")! },
  { ...P01_BASE.find((tx) => tx.id === "p01-202608-09")!, id: "p01-202608-09-resent" },
];

const P01: SyntheticDataset = {
  datasetVersion: DATASET_VERSION,
  personaId: "P01",
  title: "안정적인 사회초년생",
  summary: "월급은 일정하지만 비상자금이 부족해 단기 안정성을 우선하는 고객",
  asOf: "2026-09-15",
  customer: {
    id: "cust-persona-01",
    personaId: "P01",
    name: "김이룸",
    age: 24,
    birthDate: "2002-03-20",
    residenceRegion: "대구광역시",
    residenceDistrict: "수성구",
    employmentType: "SALARIED",
    jobDescription: "중소기업 정규직 1년차",
    annualIncome: 31_200_000,
    householdMedianIncomeRatio: null,
    isHomeless: true,
    isSynthetic: true,
  },
  consent: { status: "ACTIVE", consentedAt: "2026-09-15T10:00:00+09:00", revokedAt: null, anchorDay: 15, scopes: ["account_balance", "account_transaction", "card_approval", "public_qualification"] },
  accounts: [
    account("p01-chk", "iM뱅크(가상)", "CHECKING", "508-**-***472", 1_840_000),
    account("p01-sav", "iM뱅크(가상)", "SAVINGS", "508-**-***123", 1_200_000),
    account("p01-card", "iM카드(가상)", "CARD", "9410-****-****-1201", null),
    account("p01-loan", "한국장학재단(가상)", "LOAN", "2022-LOAN-***", -4_300_000),
  ],
  transactions: [...P01_BASE, ...P01_DUPLICATES],
  collectionGaps: [],
  subscriptionUsage: { 스트림플러스: { lastUsedAt: "2026-09-12" }, 뮤직온: { lastUsedAt: "2026-06-10" } },
  goals: [
    { id: "p1-emergency", title: "비상금 500만원", category: "EMERGENCY", targetAmount: 5_000_000, currentAmount: 1_200_000, targetMonths: 12, priority: 1, productId: null },
    { id: "p1-daegu-hope", title: "대구 청년희망적금 매칭", category: "POLICY_SAVINGS", targetAmount: 2_400_000, currentAmount: 0, targetMonths: 24, priority: 2, productId: "policy-daegu-hope" },
    { id: "p1-savings", title: "첫 목돈 1,000만원", category: "WEALTH_BUILDING", targetAmount: 10_000_000, currentAmount: 2_500_000, targetMonths: 24, priority: 3, productId: "finlife-DBANK01-DEPOSIT001" },
  ],
  boundaryId: "STABLE",
  nextMonth: {
    asOf: "2026-10-15",
    transactions: [
      cardBill("p01", "2026-09", P01_BASE.filter((tx) => tx.accountId === "p01-card" && tx.postedAt.startsWith("2026-08")).reduce((acc, tx) => acc + tx.amount, 0), "p01-chk", "p01-card"),
      ...buildMonth("p01", "2026-09", p01Lines("2026-09", 6)),
    ],
    collectionGaps: [],
    customerChanges: {},
  },
  isSynthetic: true,
};

/* ------------------------------------------------------------------ */
/* P02 주거 독립 준비 청년                                             */
/* ------------------------------------------------------------------ */

function p02Lines(month: string, index: number, rent = 450_000): Line[] {
  const revolving = [23_000, 21_000, 19_000, 18_000, 17_000][index] ?? 17_000;
  const lines: Line[] = [
    { day: 1, account: "p02-chk", dir: "OUT", amount: rent, counterparty: "달서오피스텔 임대인", category: "RENT", description: "월세 자동이체" },
    { day: 4, account: "p02-card", dir: "OUT", amount: 17_000, counterparty: "영상클럽", category: "SUBSCRIPTION" },
    { day: 6, account: "p02-card", dir: "OUT", amount: 2_900, counterparty: "클라우드저장", category: "SUBSCRIPTION" },
    { day: 10, account: "p02-chk", dir: "OUT", amount: 70_000, counterparty: "가상텔레콤", category: "TELECOM" },
    { day: 11, account: "p02-chk", dir: "OUT", amount: 80_000, counterparty: "하늘손해보험(가상)", category: "INSURANCE" },
    { day: 14, account: "p02-card", dir: "OUT", amount: revolving, counterparty: "iM카드 리볼빙", category: "REVOLVING_INTEREST", description: "리볼빙 이월 수수료" },
    { day: 19, account: "p02-chk", dir: "OUT", amount: 90_000 + wobble(index, 6_000, 18_000), counterparty: "대구도시가스(가상)", category: "UTILITIES" },
    { day: 3, account: "p02-card", dir: "OUT", amount: 150_000 + wobble(index, 5_000, 20_000), counterparty: "달서마트", category: "GROCERY" },
    { day: 17, account: "p02-card", dir: "OUT", amount: 140_000 + wobble(index, 7_000, 20_000), counterparty: "달서마트", category: "GROCERY" },
    { day: 8, account: "p02-card", dir: "OUT", amount: 260_000 + wobble(index, 13_000, 40_000), counterparty: "회식·외식", category: "DINING" },
    { day: 2, account: "p02-card", dir: "OUT", amount: 120_000, counterparty: "대구교통카드", category: "TRANSPORT" },
    { day: 22, account: "p02-card", dir: "OUT", amount: 180_000 + wobble(index, 17_000, 50_000), counterparty: "온라인쇼핑몰", category: "SHOPPING" },
    { day: 21, account: "p02-chk", dir: "IN", amount: 3_500_000, counterparty: "(주)하늘소프트(가상)", category: "SALARY", description: "급여" },
    { day: 22, account: "p02-chk", dir: "OUT", amount: 300_000, counterparty: "본인 주거준비통장", category: "OWN_TRANSFER", to: "p02-sav" },
    { day: 22, account: "p02-sav", dir: "IN", amount: 300_000, counterparty: "본인 입출금통장", category: "OWN_TRANSFER", to: "p02-chk" },
  ];
  if (month === "2026-06") lines.push({ day: 12, account: "p02-card", dir: "OUT", amount: 890_000, counterparty: "전자랜드(가상)", category: "ELECTRONICS", description: "노트북 구매" });
  return lines;
}

const P02_MONTHS = monthRange("2026-05", "2026-08");
const P02_BY_MONTH = Object.fromEntries(P02_MONTHS.map((month, i) => [month, buildMonth("p02", month, p02Lines(month, i))]));
const P02_BASE = withCardBills("p02", P02_MONTHS, P02_BY_MONTH, "p02-chk", "p02-card", 820_000);
const P02_SEPT = buildMonth("p02", "2026-09", p02Lines("2026-09", 4, 520_000));

const P02: SyntheticDataset = {
  datasetVersion: DATASET_VERSION,
  personaId: "P02",
  title: "주거 독립 준비 청년",
  summary: "2년 안에 보증금을 마련하기 위해 정책과 적금을 함께 비교하는 고객",
  asOf: "2026-09-27",
  customer: {
    id: "cust-persona-02",
    personaId: "P02",
    name: "박하늘",
    age: 29,
    birthDate: "1997-05-02",
    residenceRegion: "대구광역시",
    residenceDistrict: "달서구",
    employmentType: "SALARIED",
    jobDescription: "IT 기업 재직 4년차",
    annualIncome: 42_000_000,
    householdMedianIncomeRatio: 130,
    isHomeless: true,
    isSynthetic: true,
  },
  consent: { status: "ACTIVE", consentedAt: "2026-09-27T10:00:00+09:00", revokedAt: null, anchorDay: 27, scopes: ["account_balance", "account_transaction", "card_approval", "public_qualification"] },
  accounts: [
    account("p02-chk", "iM뱅크(가상)", "CHECKING", "508-**-***880", 2_150_000),
    account("p02-sav", "iM뱅크(가상)", "SAVINGS", "508-**-***311", 3_500_000),
    account("p02-card", "iM카드(가상)", "CARD", "9410-****-****-2202", null),
  ],
  transactions: P02_BASE,
  collectionGaps: [],
  subscriptionUsage: { 클라우드저장: { lastUsedAt: "2026-09-20" }, 영상클럽: { lastUsedAt: null } },
  goals: [
    { id: "p2-emergency", title: "생활비 3개월 비상금", category: "EMERGENCY", targetAmount: 6_000_000, currentAmount: 3_500_000, targetMonths: 12, priority: 2, productId: null },
    { id: "p2-doyak", title: "청년도약계좌 목돈", category: "POLICY_SAVINGS", targetAmount: 12_000_000, currentAmount: 0, targetMonths: 60, priority: 3, productId: "policy-doyak" },
    { id: "p2-housing", title: "독립 보증금 2,000만원", category: "WEALTH_BUILDING", targetAmount: 20_000_000, currentAmount: 7_000_000, targetMonths: 24, priority: 1, productId: "finlife-BANK08-SAVE008" },
  ],
  boundaryId: "BALANCED",
  nextMonth: {
    asOf: "2026-10-27",
    transactions: [cardBill("p02", "2026-09", P02_BY_MONTH["2026-08"].filter((tx) => tx.accountId === "p02-card").reduce((acc, tx) => acc + tx.amount, 0), "p02-chk", "p02-card"), ...P02_SEPT],
    collectionGaps: [],
    customerChanges: {},
  },
  isSynthetic: true,
};

/* ------------------------------------------------------------------ */
/* P03 소득 변동 위험 청년 (프리랜서)                                   */
/* ------------------------------------------------------------------ */

const P03_INCOME: Record<string, number[]> = {
  "2026-03": [1_500_000, 800_000],
  "2026-04": [2_100_000],
  "2026-05": [1_600_000, 800_000],
  "2026-06": [2_200_000],
  "2026-07": [1_200_000, 800_000],
  "2026-08": [2_100_000],
  "2026-09": [1_300_000],
};

function p03Lines(month: string, index: number, variableScale = 1): Line[] {
  const lines: Line[] = [
    { day: 1, account: "p03-chk", dir: "OUT", amount: 380_000, counterparty: "북구원룸 임대인", category: "RENT", description: "월세 자동이체" },
    { day: 5, account: "p03-card", dir: "OUT", amount: 33_000, counterparty: "디자인툴 구독", category: "SUBSCRIPTION" },
    { day: 10, account: "p03-chk", dir: "OUT", amount: 60_000, counterparty: "가상텔레콤", category: "TELECOM" },
    { day: 12, account: "p03-chk", dir: "OUT", amount: 40_000, counterparty: "도윤실손보험(가상)", category: "INSURANCE" },
    { day: 14, account: "p03-card", dir: "OUT", amount: 45_000, counterparty: "iM카드 리볼빙", category: "REVOLVING_INTEREST", description: "리볼빙 이월 수수료" },
    { day: 15, account: "p03-chk", dir: "OUT", amount: 300_000, counterparty: "가상캐피탈 생활비대출", category: "LOAN_REPAYMENT", description: "대출 원리금" },
    { day: 20, account: "p03-chk", dir: "OUT", amount: 70_000 + wobble(index, 5_000, 14_000), counterparty: "대구도시가스(가상)", category: "UTILITIES" },
    { day: 4, account: "p03-card", dir: "OUT", amount: Math.round((230_000 + wobble(index, 9_000, 30_000)) * variableScale), counterparty: "북구마트", category: "GROCERY" },
    { day: 11, account: "p03-card", dir: "OUT", amount: Math.round((220_000 + wobble(index, 11_000, 40_000)) * variableScale), counterparty: "카페·식당", category: "DINING" },
    { day: 2, account: "p03-card", dir: "OUT", amount: Math.round(110_000 * variableScale), counterparty: "대구교통카드", category: "TRANSPORT" },
    { day: 23, account: "p03-card", dir: "OUT", amount: Math.round((240_000 + wobble(index, 13_000, 50_000)) * variableScale), counterparty: "온라인쇼핑몰", category: "SHOPPING" },
  ];
  (P03_INCOME[month] ?? []).forEach((amount, i) =>
    lines.push({ day: i === 0 ? 8 : 26, account: "p03-chk", dir: "IN", amount, counterparty: i === 0 ? "가상스튜디오" : "가상출판사", category: "FREELANCE_INCOME", description: "디자인 용역대금" }),
  );
  return lines;
}

const P03_MONTHS = monthRange("2026-03", "2026-08");
const P03_BY_MONTH = Object.fromEntries(P03_MONTHS.map((month, i) => [month, buildMonth("p03", month, p03Lines(month, i))]));
// 2026-04 카드사 응답 실패: 해당 월 카드 거래가 수집되지 않음 (0원이 아니라 결측)
P03_BY_MONTH["2026-04"] = P03_BY_MONTH["2026-04"].filter((tx) => tx.accountId !== "p03-card");
const P03_BASE = withCardBills("p03", P03_MONTHS, P03_BY_MONTH, "p03-chk", "p03-card", 780_000);

const P03: SyntheticDataset = {
  datasetVersion: DATASET_VERSION,
  personaId: "P03",
  title: "소득 변동 위험 청년",
  summary: "프리랜서 소득 감소로 장기 납입보다 상담과 유동성 확보가 먼저인 고객",
  asOf: "2026-08-31",
  customer: {
    id: "cust-persona-03",
    personaId: "P03",
    name: "이도윤",
    age: 33,
    birthDate: "1992-12-10",
    residenceRegion: "대구광역시",
    residenceDistrict: "북구",
    employmentType: "FREELANCER",
    jobDescription: "프리랜서 디자이너",
    annualIncome: 26_400_000,
    householdMedianIncomeRatio: null,
    isHomeless: null,
    isSynthetic: true,
  },
  consent: { status: "ACTIVE", consentedAt: "2026-08-31T10:00:00+09:00", revokedAt: null, anchorDay: 31, scopes: ["account_balance", "account_transaction", "card_approval", "public_qualification"] },
  accounts: [
    account("p03-chk", "iM뱅크(가상)", "CHECKING", "508-**-***905", 640_000),
    account("p03-sav", "iM뱅크(가상)", "SAVINGS", "508-**-***077", 800_000),
    account("p03-card", "iM카드(가상)", "CARD", "9410-****-****-3303", null),
    account("p03-loan", "가상캐피탈", "LOAN", "CAP-****-31", -5_000_000),
  ],
  transactions: P03_BASE,
  collectionGaps: [{ accountId: "p03-card", month: "2026-04", reason: "카드사 응답 지연(합성 재현)" }],
  subscriptionUsage: { "디자인툴 구독": { lastUsedAt: "2026-08-29" } },
  goals: [
    { id: "p3-emergency", title: "소득 공백 비상금", category: "EMERGENCY", targetAmount: 4_500_000, currentAmount: 800_000, targetMonths: 18, priority: 1, productId: null },
    { id: "p3-debt", title: "생활비 대출 상환 자금", category: "WEALTH_BUILDING", targetAmount: 6_000_000, currentAmount: 1_000_000, targetMonths: 18, priority: 2, productId: null },
  ],
  boundaryId: "STABLE",
  nextMonth: {
    asOf: "2026-09-30",
    transactions: [
      cardBill("p03", "2026-09", P03_BY_MONTH["2026-08"].filter((tx) => tx.accountId === "p03-card").reduce((acc, tx) => acc + tx.amount, 0), "p03-chk", "p03-card"),
      ...buildMonth("p03", "2026-09", p03Lines("2026-09", 6, 0.85)),
    ],
    collectionGaps: [],
    customerChanges: {},
  },
  isSynthetic: true,
};

/* ------------------------------------------------------------------ */
/* EX24 최종기획서 적용 예시 (28세 · 월 260만원 · 보증금 3,000만원)     */
/* ------------------------------------------------------------------ */

function ex24Lines(): Line[] {
  return [
    { day: 1, account: "ex-chk", dir: "OUT", amount: 500_000, counterparty: "동구원룸 임대인", category: "RENT", description: "월세 자동이체" },
    { day: 3, account: "ex-card", dir: "OUT", amount: 17_000, counterparty: "OTT 프리미엄", category: "SUBSCRIPTION" },
    { day: 4, account: "ex-card", dir: "OUT", amount: 10_900, counterparty: "음악 스트리밍", category: "SUBSCRIPTION" },
    { day: 6, account: "ex-card", dir: "OUT", amount: 14_100, counterparty: "전자책 구독", category: "SUBSCRIPTION" },
    { day: 10, account: "ex-chk", dir: "OUT", amount: 65_000, counterparty: "가상텔레콤", category: "TELECOM" },
    { day: 12, account: "ex-chk", dir: "OUT", amount: 60_000, counterparty: "다온실손보험(가상)", category: "INSURANCE" },
    { day: 14, account: "ex-card", dir: "OUT", amount: 58_000, counterparty: "iM카드 리볼빙", category: "REVOLVING_INTEREST", description: "리볼빙 이월 수수료" },
    { day: 20, account: "ex-chk", dir: "OUT", amount: 90_000, counterparty: "대구도시가스(가상)", category: "UTILITIES" },
    { day: 5, account: "ex-card", dir: "OUT", amount: 120_000, counterparty: "동구마트", category: "GROCERY" },
    { day: 15, account: "ex-card", dir: "OUT", amount: 120_000, counterparty: "동구마트", category: "GROCERY" },
    { day: 25, account: "ex-card", dir: "OUT", amount: 120_000, counterparty: "동구마트", category: "GROCERY" },
    { day: 7, account: "ex-card", dir: "OUT", amount: 75_000, counterparty: "배달앱", category: "DINING" },
    { day: 11, account: "ex-card", dir: "OUT", amount: 75_000, counterparty: "배달앱", category: "DINING" },
    { day: 16, account: "ex-card", dir: "OUT", amount: 75_000, counterparty: "배달앱", category: "DINING" },
    { day: 21, account: "ex-card", dir: "OUT", amount: 75_000, counterparty: "배달앱", category: "DINING" },
    { day: 27, account: "ex-card", dir: "OUT", amount: 75_000, counterparty: "배달앱", category: "DINING" },
    { day: 2, account: "ex-card", dir: "OUT", amount: 150_000, counterparty: "대구교통카드", category: "TRANSPORT" },
    { day: 18, account: "ex-card", dir: "OUT", amount: 350_000, counterparty: "온라인쇼핑몰", category: "SHOPPING" },
    { day: 25, account: "ex-chk", dir: "IN", amount: 2_600_000, counterparty: "(주)다온제조(가상)", category: "SALARY", description: "급여" },
  ];
}

const EX_MONTHS = monthRange("2026-06", "2026-08");
const EX_BY_MONTH = Object.fromEntries(EX_MONTHS.map((month) => [month, buildMonth("ex24", month, ex24Lines())]));
const EX_CARD_MONTHLY = EX_BY_MONTH["2026-06"].filter((tx) => tx.accountId === "ex-card").reduce((acc, tx) => acc + tx.amount, 0);

const EX24: SyntheticDataset = {
  datasetVersion: DATASET_VERSION,
  personaId: "EX24",
  title: "최종기획서 24개월 적용 예시",
  summary: "대구 거주 만 28세, 세후 월 260만원, 전세 보증금 3,000만원을 24개월 동안 준비하는 합성 고객",
  asOf: "2026-09-10",
  customer: {
    id: "cust-example-24",
    personaId: "EX24",
    name: "정다온",
    age: 28,
    birthDate: "1998-04-11",
    residenceRegion: "대구광역시",
    residenceDistrict: "동구",
    employmentType: "SALARIED",
    jobDescription: "제조업 사무직 3년차",
    annualIncome: 31_200_000,
    householdMedianIncomeRatio: 110,
    isHomeless: true,
    isSynthetic: true,
  },
  consent: { status: "ACTIVE", consentedAt: "2026-09-10T10:00:00+09:00", revokedAt: null, anchorDay: 10, scopes: ["account_balance", "account_transaction", "card_approval", "public_qualification"] },
  accounts: [
    account("ex-chk", "iM뱅크(가상)", "CHECKING", "508-**-***248", 980_000),
    account("ex-sav", "iM뱅크(가상)", "SAVINGS", "508-**-***510", 1_800_000),
    account("ex-card", "iM카드(가상)", "CARD", "9410-****-****-2424", null),
  ],
  transactions: withCardBills("ex24", EX_MONTHS, EX_BY_MONTH, "ex-chk", "ex-card", EX_CARD_MONTHLY),
  collectionGaps: [],
  subscriptionUsage: { "OTT 프리미엄": { lastUsedAt: "2026-05-01" }, "음악 스트리밍": { lastUsedAt: "2026-04-18" }, "전자책 구독": { lastUsedAt: "2026-03-02" } },
  goals: [
    { id: "ex-emergency", title: "비상자금", category: "EMERGENCY", targetAmount: 4_200_000, currentAmount: 1_800_000, targetMonths: 24, priority: 1, productId: null },
    { id: "ex-doyak", title: "청년도약계좌", category: "POLICY_SAVINGS", targetAmount: 12_000_000, currentAmount: 0, targetMonths: 60, priority: 1, productId: "policy-doyak" },
    { id: "ex-subscription", title: "주택청약", category: "HOUSING_SUBSCRIPTION", targetAmount: 2_400_000, currentAmount: 0, targetMonths: 24, priority: 1, productId: "policy-housing-dream" },
    { id: "ex-deposit", title: "전세 보증금 자기자금", category: "WEALTH_BUILDING", targetAmount: 10_800_000, currentAmount: 0, targetMonths: 24, priority: 1, productId: "finlife-BANK08-SAVE008" },
  ],
  boundaryId: "GOAL_FOCUSED",
  nextMonth: {
    asOf: "2026-10-10",
    transactions: [cardBill("ex24", "2026-09", EX_CARD_MONTHLY, "ex-chk", "ex-card"), ...buildMonth("ex24", "2026-09", ex24Lines())],
    collectionGaps: [],
    customerChanges: {},
  },
  isSynthetic: true,
};

export const MOCK_DATASETS: Record<PersonaId, SyntheticDataset> = { P01, P02, P03, EX24 };
export const PERSONA_IDS: PersonaId[] = ["P01", "P02", "P03"];

export const getDataset = (personaId: PersonaId): SyntheticDataset => {
  const dataset = MOCK_DATASETS[personaId];
  if (!dataset) throw new Error(`Unknown persona: ${personaId}`);
  return dataset;
};

export type { CollectionGap };
