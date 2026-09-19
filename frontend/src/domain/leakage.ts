/**
 * 새는 돈 후보 탐지 (미사용 구독 · 리볼빙 이자)
 * 결과는 후보이며 확정 사실이 아니다. 모든 후보는 사용자 확인이 필요하다.
 */

import type { ClassifiedTransaction, LeakageCandidate } from "../data/apiContracts";
import { daysBetween, monthOf } from "./dateUtils";
import { RULE_CONFIG, formatWon, roundWon } from "./ruleConfig";

const groupBy = (list: ClassifiedTransaction[]) => {
  const map = new Map<string, ClassifiedTransaction[]>();
  for (const tx of list) map.set(tx.counterparty, [...(map.get(tx.counterparty) ?? []), tx]);
  return [...map.entries()].sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
};

export function detectLeakage(
  transactions: ClassifiedTransaction[],
  subscriptionUsage: Record<string, { lastUsedAt: string | null }>,
  asOf: string,
  monthsUsed: number,
): LeakageCandidate[] {
  const counted = transactions.filter((tx) => !tx.excludedFromTotals && !tx.inGapMonth && tx.direction === "OUT");
  const candidates: LeakageCandidate[] = [];

  for (const [counterparty, list] of groupBy(counted.filter((tx) => tx.merchantCategory === "SUBSCRIPTION"))) {
    const months = new Set(list.map((tx) => monthOf(tx.postedAt)));
    if (months.size < 2) continue;
    const monthlyCost = roundWon(list.reduce((acc, tx) => acc + tx.amount, 0) / months.size);
    const usage = subscriptionUsage[counterparty];
    const lastUsedAt = usage?.lastUsedAt ?? null;
    const idleDays = lastUsedAt ? daysBetween(lastUsedAt, asOf) : null;
    if (idleDays !== null && idleDays < RULE_CONFIG.unusedSubscriptionDays) continue;

    candidates.push({
      id: `leak-sub-${list[0].id}`,
      type: "UNUSED_SUBSCRIPTION",
      title: `${counterparty} 구독`,
      counterparty,
      evidenceTransactionIds: list.map((tx) => tx.id),
      estimatedMonthlyCost: monthlyCost,
      confidence: idleDays === null ? "LOW" : "HIGH",
      reviewStatus: "NEEDS_USER_CONFIRMATION",
      reason:
        idleDays === null
          ? `${months.size}개월 연속 월 ${formatWon(monthlyCost)} 결제. 이용 기록이 없어 실제 사용 여부 확인이 필요합니다.`
          : `${months.size}개월 연속 월 ${formatWon(monthlyCost)} 결제, 마지막 이용 후 ${idleDays}일 경과 (기준 ${RULE_CONFIG.unusedSubscriptionDays}일).`,
    });
  }

  for (const [counterparty, list] of groupBy(counted.filter((tx) => tx.merchantCategory === "REVOLVING_INTEREST"))) {
    const monthlyCost = monthsUsed > 0 ? roundWon(list.reduce((acc, tx) => acc + tx.amount, 0) / monthsUsed) : 0;
    candidates.push({
      id: `leak-rev-${list[0].id}`,
      type: "REVOLVING_INTEREST",
      title: `${counterparty} 리볼빙 이자`,
      counterparty,
      evidenceTransactionIds: list.map((tx) => tx.id),
      estimatedMonthlyCost: monthlyCost,
      confidence: list.length >= 2 ? "HIGH" : "MEDIUM",
      reviewStatus: "NEEDS_USER_CONFIRMATION",
      reason: `분석 기간 ${monthsUsed}개월 중 ${list.length}회 리볼빙 이자 결제, 월평균 ${formatWon(monthlyCost)}. 잔액 상환 시 절감 가능한 추정치입니다.`,
    });
  }

  return candidates;
}
