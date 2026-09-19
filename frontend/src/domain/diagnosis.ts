/**
 * 데이터셋 → 진단·자격 응답 조립 (순수 함수)
 */

import type {
  CollectionGap,
  CustomerProfile,
  DiagnosisResponse,
  EligibilityResponse,
  EligibilityStatus,
  MockTransaction,
  PolicyEligibility,
  SyntheticDataset,
} from "../data/apiContracts";
import { API_CONTRACT_VERSION } from "../data/apiContracts";
import { POLICY_RULES } from "../fixtures/policyRules";
import { ageAt } from "./dateUtils";
import { evaluatePolicyRule } from "./eligibility";
import { detectLeakage } from "./leakage";
import { RULE_VERSION } from "./ruleConfig";
import { analyzeTransactions, emergencyFundBalance } from "./transactionAnalysis";

export const snapshotIdOf = (customerId: string, asOf: string) => `snap-${customerId}-${asOf}`;

/** 기준일의 고객 프로필 (만 나이·변경 사항 반영) */
export function customerAt(customer: CustomerProfile, asOf: string, changes: Partial<CustomerProfile> = {}): CustomerProfile {
  return { ...customer, ...changes, age: customer.birthDate ? ageAt(customer.birthDate, asOf) : customer.age, isSynthetic: true };
}

export function buildDiagnosis(
  dataset: SyntheticDataset,
  options: { asOf?: string; transactions?: MockTransaction[]; collectionGaps?: CollectionGap[]; customer?: CustomerProfile } = {},
): DiagnosisResponse {
  const asOf = options.asOf ?? dataset.asOf;
  const customer = options.customer ?? customerAt(dataset.customer, asOf);
  const analysis = analyzeTransactions({
    transactions: options.transactions ?? dataset.transactions,
    accounts: dataset.accounts,
    collectionGaps: options.collectionGaps ?? dataset.collectionGaps,
  });
  const leakageCandidates = detectLeakage(analysis.classified, dataset.subscriptionUsage, asOf, analysis.window.monthsUsed);
  const leakageTotal = leakageCandidates.reduce((acc, item) => acc + item.estimatedMonthlyCost, 0);
  return {
    contractVersion: API_CONTRACT_VERSION,
    ruleVersion: RULE_VERSION,
    datasetVersion: dataset.datasetVersion,
    personaId: dataset.personaId,
    asOf,
    customer,
    window: analysis.window,
    monthly: analysis.monthly,
    metrics: { ...analysis.metrics, emergencyFundBalance: emergencyFundBalance(dataset.accounts) },
    leakageCandidates,
    surplusIfLeakageResolved: analysis.metrics.availableSurplus === null ? null : analysis.metrics.availableSurplus + leakageTotal,
    transactions: analysis.classified,
    isSynthetic: true,
  };
}

export function evaluateAllPolicies(customer: CustomerProfile, asOf: string): PolicyEligibility[] {
  return POLICY_RULES.map((rule) => evaluatePolicyRule(rule, customer, asOf));
}

export function buildEligibility(dataset: SyntheticDataset, customer: CustomerProfile, asOf: string): EligibilityResponse {
  const results = evaluateAllPolicies(customer, asOf);
  const summary: Record<EligibilityStatus, number> = { ELIGIBLE: 0, NEEDS_VERIFICATION: 0, INELIGIBLE: 0 };
  for (const result of results) summary[result.status] += 1;
  return { contractVersion: API_CONTRACT_VERSION, ruleVersion: RULE_VERSION, personaId: dataset.personaId, asOf, summary, results, isSynthetic: true };
}
