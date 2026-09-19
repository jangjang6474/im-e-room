/**
 * 정책 자격 판정
 * - 하나라도 UNMET → INELIGIBLE
 * - UNMET 없이 UNKNOWN이 있으면 → NEEDS_VERIFICATION (모르는 정보를 충족으로 간주하지 않음)
 * - 모두 MET → ELIGIBLE
 */

import type { CriterionResult, CustomerProfile, EligibilityStatus, PolicyEligibility } from "../data/apiContracts";
import type { PolicyRule } from "../fixtures/policyRules";
import { formatWon } from "./ruleConfig";

const EMPLOYMENT_LABEL = { SALARIED: "재직", FREELANCER: "프리랜서", UNEMPLOYED: "미취업" } as const;

export type EligibilitySubject = Pick<
  CustomerProfile,
  "age" | "residenceRegion" | "annualIncome" | "householdMedianIncomeRatio" | "employmentType" | "isHomeless"
>;

export function evaluateCriteria(rule: PolicyRule, subject: EligibilitySubject, asOf: string): CriterionResult[] {
  const criteria: CriterionResult[] = [];
  const [minAge, maxAge] = rule.ageRange;
  criteria.push({ key: "AGE", status: subject.age >= minAge && subject.age <= maxAge ? "MET" : "UNMET", required: `만 ${minAge}~${maxAge}세`, observed: `만 ${subject.age}세` });

  if (rule.region) {
    criteria.push({
      key: "RESIDENCE",
      status: subject.residenceRegion === null ? "UNKNOWN" : subject.residenceRegion === rule.region ? "MET" : "UNMET",
      required: `${rule.region} 거주`,
      observed: subject.residenceRegion,
    });
  }
  if (rule.maxAnnualIncome !== null) {
    criteria.push({
      key: "ANNUAL_INCOME",
      status: subject.annualIncome === null ? "UNKNOWN" : subject.annualIncome <= rule.maxAnnualIncome ? "MET" : "UNMET",
      required: `연소득 ${formatWon(rule.maxAnnualIncome)} 이하`,
      observed: subject.annualIncome === null ? null : formatWon(subject.annualIncome),
    });
  }
  if (rule.maxMedianIncomeRatio !== null) {
    const ratio = subject.householdMedianIncomeRatio;
    criteria.push({
      key: "MEDIAN_INCOME_RATIO",
      status: ratio === null ? "UNKNOWN" : ratio <= rule.maxMedianIncomeRatio ? "MET" : "UNMET",
      required: `가구 기준 중위소득 ${rule.maxMedianIncomeRatio}% 이하`,
      observed: ratio === null ? null : `${ratio}%`,
    });
  }
  if (rule.employmentTypes) {
    criteria.push({
      key: "EMPLOYMENT",
      status: subject.employmentType === null ? "UNKNOWN" : rule.employmentTypes.includes(subject.employmentType) ? "MET" : "UNMET",
      required: rule.employmentTypes.map((type) => EMPLOYMENT_LABEL[type]).join("·"),
      observed: subject.employmentType === null ? null : EMPLOYMENT_LABEL[subject.employmentType],
    });
  }
  if (rule.requiresHomeless) {
    criteria.push({
      key: "HOMELESS",
      status: subject.isHomeless === null ? "UNKNOWN" : subject.isHomeless ? "MET" : "UNMET",
      required: "무주택",
      observed: subject.isHomeless === null ? null : subject.isHomeless ? "무주택" : "주택 보유",
    });
  }
  if (!rule.announced) {
    criteria.push({ key: "APPLICATION_PERIOD", status: "UNKNOWN", required: "신청 기간 공고", observed: "공고 전" });
  } else if (rule.applicationStart || rule.applicationEnd) {
    const started = !rule.applicationStart || rule.applicationStart <= asOf;
    const ended = !!rule.applicationEnd && rule.applicationEnd < asOf;
    criteria.push({
      key: "APPLICATION_PERIOD",
      status: ended ? "UNMET" : started ? "MET" : "UNKNOWN",
      required: `${rule.applicationStart ?? "상시"} ~ ${rule.applicationEnd ?? "상시"}`,
      observed: ended ? "신청 마감" : started ? "신청 기간" : "신청 시작 전",
    });
  }
  return criteria;
}

const CRITERION_LABEL: Record<CriterionResult["key"], string> = {
  AGE: "연령",
  RESIDENCE: "거주지",
  ANNUAL_INCOME: "연소득",
  MEDIAN_INCOME_RATIO: "중위소득 비율",
  EMPLOYMENT: "고용 상태",
  HOMELESS: "무주택 여부",
  APPLICATION_PERIOD: "신청 기간",
};

export function summarizeCriteria(criteria: CriterionResult[]): { status: EligibilityStatus; reason: string } {
  const unmet = criteria.filter((item) => item.status === "UNMET");
  const unknown = criteria.filter((item) => item.status === "UNKNOWN");
  if (unmet.length) {
    return { status: "INELIGIBLE", reason: `미충족: ${unmet.map((item) => `${CRITERION_LABEL[item.key]}(${item.required}, 확인값 ${item.observed ?? "없음"})`).join(", ")}` };
  }
  if (unknown.length) {
    return { status: "NEEDS_VERIFICATION", reason: `확인 필요: ${unknown.map((item) => `${CRITERION_LABEL[item.key]}(${item.required})`).join(", ")}` };
  }
  return { status: "ELIGIBLE", reason: `충족: ${criteria.map((item) => CRITERION_LABEL[item.key]).join(", ")} 조건` };
}

export function evaluatePolicyRule(rule: PolicyRule, subject: EligibilitySubject, asOf: string): PolicyEligibility {
  const criteria = evaluateCriteria(rule, subject, asOf);
  const { status, reason } = summarizeCriteria(criteria);
  return {
    policyId: rule.policyId,
    policyName: rule.policyName,
    organization: rule.organization,
    policyVersion: rule.policyVersion,
    status,
    reason,
    criteria,
    autoAllocatable: status === "ELIGIBLE",
    sourceNote: rule.sourceNote,
  };
}
