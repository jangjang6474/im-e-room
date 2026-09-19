/**
 * 최근 거래 정규화·분류·월별 집계
 *
 * 1. 중복 거래 제거 (같은 ID 재전송, 같은 계좌·일자·금액·상대방·적요의 중복 수신)
 * 2. 본인 계좌 간 이체와 카드 대금 결제를 집계에서 제외 (이중 집계 방지)
 * 3. 급여·기타소득·고정·변동·비정기·부채 분류
 * 4. 결측 월을 0이 아니라 null로 두고 월평균에서 제외
 */

import type {
  ClassifiedTransaction,
  CollectionGap,
  CompletenessLevel,
  DiagnosisMetrics,
  MerchantCategory,
  MockAccount,
  MockTransaction,
  MonthlyAggregate,
  TransactionClass,
  TransactionWindow,
} from "../data/apiContracts";
import { monthOf, monthRange } from "./dateUtils";
import { RULE_CONFIG, roundWon } from "./ruleConfig";

const FIXED_CATEGORIES: MerchantCategory[] = ["RENT", "UTILITIES", "TELECOM", "INSURANCE", "SUBSCRIPTION"];
const IRREGULAR_CATEGORIES: MerchantCategory[] = ["MEDICAL", "EVENT", "TRAVEL", "ELECTRONICS"];
const VARIABLE_CATEGORIES: MerchantCategory[] = ["GROCERY", "DINING", "TRANSPORT", "SHOPPING"];
const DEBT_CATEGORIES: MerchantCategory[] = ["LOAN_REPAYMENT", "REVOLVING_INTEREST"];
const INTERNAL_CATEGORIES: MerchantCategory[] = ["OWN_TRANSFER", "CARD_PAYMENT"];
const LABOR_INCOME: MerchantCategory[] = ["SALARY", "FREELANCE_INCOME"];

export interface DedupeResult {
  transactions: MockTransaction[];
  duplicatesRemoved: number;
}

const byDateThenId = (a: MockTransaction, b: MockTransaction) =>
  a.postedAt === b.postedAt ? (a.id < b.id ? -1 : a.id > b.id ? 1 : 0) : a.postedAt < b.postedAt ? -1 : 1;

export function dedupeTransactions(transactions: MockTransaction[]): DedupeResult {
  const seenIds = new Set<string>();
  const seenContent = new Set<string>();
  const kept: MockTransaction[] = [];
  for (const tx of [...transactions].sort(byDateThenId)) {
    const contentKey = [tx.accountId, tx.postedAt, tx.direction, tx.amount, tx.counterparty, tx.description].join("|");
    if (seenIds.has(tx.id) || seenContent.has(contentKey)) continue;
    seenIds.add(tx.id);
    seenContent.add(contentKey);
    kept.push(tx);
  }
  return { transactions: kept, duplicatesRemoved: transactions.length - kept.length };
}

/** 같은 상대방 지출이 여러 달에 비슷한 금액으로 반복되는지 */
function recurringCounterparties(transactions: MockTransaction[]): Set<string> {
  const byCounterparty = new Map<string, MockTransaction[]>();
  for (const tx of transactions) {
    if (tx.direction !== "OUT" || tx.merchantCategory !== "OTHER") continue;
    byCounterparty.set(tx.counterparty, [...(byCounterparty.get(tx.counterparty) ?? []), tx]);
  }
  const result = new Set<string>();
  for (const [counterparty, list] of byCounterparty) {
    const months = new Set(list.map((tx) => monthOf(tx.postedAt)));
    if (months.size < RULE_CONFIG.minMonthsForComplete) continue;
    const amounts = list.map((tx) => tx.amount).sort((a, b) => a - b);
    const median = amounts[Math.floor(amounts.length / 2)];
    if (amounts.every((amount) => Math.abs(amount - median) <= median * RULE_CONFIG.recurringAmountTolerance)) result.add(counterparty);
  }
  return result;
}

function classify(tx: MockTransaction, ownAccounts: Set<string>, recurring: Set<string>): { cls: TransactionClass; ruleId: string } {
  if ((tx.counterpartyAccountId && ownAccounts.has(tx.counterpartyAccountId)) || INTERNAL_CATEGORIES.includes(tx.merchantCategory)) {
    return { cls: "INTERNAL_TRANSFER", ruleId: tx.merchantCategory === "CARD_PAYMENT" ? "CLS-CARD-BILL" : "CLS-OWN-TRANSFER" };
  }
  if (tx.direction === "IN") {
    return LABOR_INCOME.includes(tx.merchantCategory) ? { cls: "SALARY", ruleId: "CLS-LABOR-INCOME" } : { cls: "OTHER_INCOME", ruleId: "CLS-OTHER-INCOME" };
  }
  if (DEBT_CATEGORIES.includes(tx.merchantCategory)) return { cls: "DEBT", ruleId: "CLS-DEBT" };
  if (FIXED_CATEGORIES.includes(tx.merchantCategory)) return { cls: "FIXED", ruleId: "CLS-FIXED-CATEGORY" };
  if (IRREGULAR_CATEGORIES.includes(tx.merchantCategory)) return { cls: "IRREGULAR", ruleId: "CLS-IRREGULAR-CATEGORY" };
  if (VARIABLE_CATEGORIES.includes(tx.merchantCategory)) return { cls: "VARIABLE", ruleId: "CLS-VARIABLE-CATEGORY" };
  // 코드가 없는 거래(OTHER)만 반복성·금액으로 판단한다.
  if (recurring.has(tx.counterparty)) return { cls: "FIXED", ruleId: "CLS-FIXED-RECURRING" };
  if (tx.amount >= RULE_CONFIG.irregularSingleAmount) return { cls: "IRREGULAR", ruleId: "CLS-IRREGULAR-LARGE" };
  return { cls: "VARIABLE", ruleId: "CLS-VARIABLE-OTHER" };
}

export interface TransactionAnalysis {
  classified: ClassifiedTransaction[];
  window: TransactionWindow;
  monthly: MonthlyAggregate[];
  metrics: Omit<DiagnosisMetrics, "emergencyFundBalance">;
}

export function analyzeTransactions(input: {
  transactions: MockTransaction[];
  accounts: MockAccount[];
  collectionGaps: CollectionGap[];
}): TransactionAnalysis {
  const { transactions, duplicatesRemoved } = dedupeTransactions(input.transactions);
  const ownAccounts = new Set(input.accounts.map((account) => account.accountId));
  const recurring = recurringCounterparties(transactions);

  const allMonths = transactions.length ? monthRange(monthOf(transactions[0].postedAt), monthOf(transactions[transactions.length - 1].postedAt)) : [];
  const activeMonths = new Set(transactions.map((tx) => monthOf(tx.postedAt)));
  const gapMonths = new Set<string>(input.collectionGaps.map((gap) => gap.month).filter((month) => allMonths.includes(month)));
  for (const month of allMonths) if (!activeMonths.has(month)) gapMonths.add(month);

  const classified: ClassifiedTransaction[] = transactions.map((tx) => {
    const { cls, ruleId } = classify(tx, ownAccounts, recurring);
    return { ...tx, class: cls, ruleId, excludedFromTotals: cls === "INTERNAL_TRANSFER", inGapMonth: gapMonths.has(monthOf(tx.postedAt)) };
  });

  const monthly: MonthlyAggregate[] = allMonths.map((month) => {
    if (gapMonths.has(month)) {
      return { month, isGap: true, salary: null, otherIncome: null, income: null, fixed: null, variable: null, irregular: null, debt: null, surplus: null, rentPayment: null };
    }
    const inMonth = classified.filter((tx) => monthOf(tx.postedAt) === month && !tx.excludedFromTotals);
    const sum = (cls: TransactionClass) => inMonth.filter((tx) => tx.class === cls).reduce((acc, tx) => acc + tx.amount, 0);
    const salary = sum("SALARY");
    const otherIncome = sum("OTHER_INCOME");
    const fixed = sum("FIXED");
    const variable = sum("VARIABLE");
    const irregular = sum("IRREGULAR");
    const debt = sum("DEBT");
    const rentTx = inMonth.filter((tx) => tx.merchantCategory === "RENT");
    return {
      month,
      isGap: false,
      salary,
      otherIncome,
      income: salary + otherIncome,
      fixed,
      variable,
      irregular,
      debt,
      surplus: salary + otherIncome - fixed - variable - irregular - debt,
      rentPayment: rentTx.length ? rentTx.reduce((acc, tx) => acc + tx.amount, 0) : null,
    };
  });

  const used = monthly.filter((item) => !item.isGap);
  const avg = (pick: (item: MonthlyAggregate) => number | null) =>
    used.length ? roundWon(used.reduce((acc, item) => acc + (pick(item) ?? 0), 0) / used.length) : null;

  const monthlySalary = avg((m) => m.salary);
  const monthlyOtherIncome = avg((m) => m.otherIncome);
  const fixedExpenses = avg((m) => m.fixed);
  const variableExpenses = avg((m) => m.variable);
  const irregularExpensesMonthly = avg((m) => m.irregular);
  const debtPayment = avg((m) => m.debt);
  const monthlyIncome = monthlySalary === null || monthlyOtherIncome === null ? null : monthlySalary + monthlyOtherIncome;
  const availableSurplus =
    monthlyIncome === null || fixedExpenses === null || variableExpenses === null || irregularExpensesMonthly === null || debtPayment === null
      ? null
      : monthlyIncome - fixedExpenses - variableExpenses - irregularExpensesMonthly - debtPayment;

  const completeness: CompletenessLevel =
    used.length === 0 ? "INSUFFICIENT" : gapMonths.size > 0 || used.length < RULE_CONFIG.minMonthsForComplete ? "PARTIAL" : "COMPLETE";

  const notes: string[] = [];
  if (duplicatesRemoved > 0) notes.push(`중복 수신된 거래 ${duplicatesRemoved}건을 제외했습니다.`);
  const internalCount = classified.filter((tx) => tx.excludedFromTotals).length;
  if (internalCount > 0) notes.push(`본인 계좌 간 이체·카드 대금 결제 ${internalCount}건은 소득·지출에서 제외했습니다.`);
  for (const gap of input.collectionGaps) notes.push(`${gap.month} ${gap.accountId} 수집 실패: ${gap.reason}. 해당 월은 월평균에서 제외했습니다.`);
  for (const month of allMonths) if (!activeMonths.has(month)) notes.push(`${month} 거래가 없어 결측 월로 처리했습니다.`);
  if (used.length > 0 && used.length < RULE_CONFIG.minMonthsForComplete) notes.push(`정상 수집 월이 ${used.length}개월로 ${RULE_CONFIG.minMonthsForComplete}개월 미만입니다.`);

  const window: TransactionWindow = {
    startAt: transactions.length ? transactions[0].postedAt : null,
    endAt: transactions.length ? transactions[transactions.length - 1].postedAt : null,
    monthsCovered: allMonths.length,
    monthsUsed: used.length,
    transactionCount: transactions.length,
    duplicatesRemoved,
    internalTransfersExcluded: internalCount,
    completeness,
    missingMonths: [...gapMonths].sort(),
    notes,
  };

  const recommendedEmergencyFund =
    fixedExpenses === null || variableExpenses === null ? null : (fixedExpenses + variableExpenses) * RULE_CONFIG.emergencyFundMonths;

  return {
    classified,
    window,
    monthly,
    metrics: {
      monthlyIncome,
      monthlySalary,
      monthlyOtherIncome,
      fixedExpenses,
      variableExpenses,
      irregularExpensesMonthly,
      debtPayment,
      availableSurplus,
      recommendedEmergencyFund,
    },
  };
}

/** 저축 계좌 잔액 합계. 하나라도 수집 실패(null)면 null */
export function emergencyFundBalance(accounts: MockAccount[]): number | null {
  const savings = accounts.filter((account) => account.accountType === "SAVINGS");
  if (savings.length === 0) return null;
  if (savings.some((account) => account.balance === null)) return null;
  return savings.reduce((acc, account) => acc + (account.balance ?? 0), 0);
}
