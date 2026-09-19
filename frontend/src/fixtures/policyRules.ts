/**
 * 정책 자격 규칙 (합성)
 * 온통청년 mock 레코드와 기존 정책 상품 fixture의 자격 조건을 구조화한 검수본이다.
 * 실제 정책의 조건·금액이 아니며, 프로토타입의 판정 흐름을 재현하기 위한 값이다.
 */

import type { EmploymentType } from "../data/apiContracts";

export interface PolicyRule {
  policyId: string;
  policyName: string;
  organization: string;
  policyVersion: string;
  ageRange: [number, number];
  /** 거주 요건 (시·도). null이면 요건 없음 */
  region: string | null;
  maxAnnualIncome: number | null;
  maxMedianIncomeRatio: number | null;
  employmentTypes: EmploymentType[] | null;
  requiresHomeless: boolean;
  /** 신청 기간. 둘 다 null이면 상시 신청. start만 null이고 announced=false면 공고 전 */
  applicationStart: string | null;
  applicationEnd: string | null;
  announced: boolean;
  sourceNote: string;
}

const MOCK_NOTE = "온통청년 응답 구조 기반 합성 레코드 (실제 정책 조건 아님)";

export const POLICY_RULES: PolicyRule[] = [
  // 기존 정책 상품 fixture (syntheticData.POLICIES_DATA)
  { policyId: "policy-doyak", policyName: "정부 청년도약계좌 (iM뱅크 연계)", organization: "서민금융진흥원 & iM뱅크", policyVersion: "2026-09-01", ageRange: [19, 34], region: null, maxAnnualIncome: 75_000_000, maxMedianIncomeRatio: 250, employmentTypes: null, requiresHomeless: false, applicationStart: null, applicationEnd: null, announced: true, sourceNote: "합성 정책 상품 fixture" },
  { policyId: "policy-daegu-hope", policyName: "대구시 청년희망적금 (1:1 시비 매칭)", organization: "대구광역시 청년정책과", policyVersion: "2026-08-20", ageRange: [19, 34], region: "대구광역시", maxAnnualIncome: 36_000_000, maxMedianIncomeRatio: null, employmentTypes: ["SALARIED"], requiresHomeless: false, applicationStart: null, applicationEnd: null, announced: true, sourceNote: "합성 정책 상품 fixture" },
  { policyId: "policy-housing-dream", policyName: "iM 청년 주택드림 청약종합저축", organization: "국토교통부 & iM뱅크", policyVersion: "2026-07-01", ageRange: [19, 34], region: null, maxAnnualIncome: 50_000_000, maxMedianIncomeRatio: null, employmentTypes: null, requiresHomeless: true, applicationStart: null, applicationEnd: null, announced: true, sourceNote: "합성 정책 상품 fixture" },
  { policyId: "policy-emergency-saver", policyName: "청년 목표 적금 예시", organization: "iM뱅크 예시", policyVersion: "202609", ageRange: [19, 39], region: null, maxAnnualIncome: null, maxMedianIncomeRatio: null, employmentTypes: null, requiresHomeless: false, applicationStart: null, applicationEnd: null, announced: true, sourceNote: "금융상품 한눈에 응답 구조 기반 합성 레코드" },

  // 온통청년 mock 레코드 (data/mock/raw/ontong-youth-policy.json)
  { policyId: "mock-youth-001", policyName: "대구 청년 자산형성 지원", organization: "대구광역시", policyVersion: "2026-09-19", ageRange: [19, 34], region: "대구광역시", maxAnnualIncome: null, maxMedianIncomeRatio: 140, employmentTypes: ["SALARIED", "FREELANCER"], requiresHomeless: false, applicationStart: null, applicationEnd: null, announced: true, sourceNote: MOCK_NOTE },
  { policyId: "mock-youth-002", policyName: "청년 주거비 지원 예시", organization: "대구광역시", policyVersion: "2026-09-19", ageRange: [19, 34], region: "대구광역시", maxAnnualIncome: null, maxMedianIncomeRatio: 150, employmentTypes: null, requiresHomeless: true, applicationStart: null, applicationEnd: null, announced: false, sourceNote: MOCK_NOTE },
  { policyId: "mock-youth-003", policyName: "청년 재무상담 지원 예시", organization: "한국고용정보원", policyVersion: "2026-09-19", ageRange: [19, 39], region: null, maxAnnualIncome: null, maxMedianIncomeRatio: null, employmentTypes: null, requiresHomeless: false, applicationStart: null, applicationEnd: null, announced: true, sourceNote: MOCK_NOTE },
  { policyId: "mock-youth-004", policyName: "청년 취업역량 강화 예시", organization: "고용노동부", policyVersion: "2026-09-19", ageRange: [18, 34], region: null, maxAnnualIncome: null, maxMedianIncomeRatio: null, employmentTypes: ["UNEMPLOYED"], requiresHomeless: false, applicationStart: null, applicationEnd: null, announced: true, sourceNote: MOCK_NOTE },
  { policyId: "mock-youth-005", policyName: "청년 생활안정 지원 예시", organization: "대구광역시", policyVersion: "2026-09-19", ageRange: [19, 34], region: "대구광역시", maxAnnualIncome: null, maxMedianIncomeRatio: 120, employmentTypes: null, requiresHomeless: false, applicationStart: "2026-03-01", applicationEnd: "2026-08-31", announced: true, sourceNote: `${MOCK_NOTE} · 예산 소진으로 2026-08-31 마감 가정` },
  { policyId: "mock-youth-006", policyName: "청년 창업 초기비용 지원 예시", organization: "중소벤처기업부", policyVersion: "2026-09-19", ageRange: [19, 39], region: null, maxAnnualIncome: null, maxMedianIncomeRatio: null, employmentTypes: ["FREELANCER"], requiresHomeless: false, applicationStart: "2026-10-01", applicationEnd: "2026-10-31", announced: true, sourceNote: MOCK_NOTE },
  { policyId: "mock-youth-007", policyName: "청년 교통비 지원 예시", organization: "대구광역시", policyVersion: "2026-09-19", ageRange: [19, 34], region: "대구광역시", maxAnnualIncome: 40_000_000, maxMedianIncomeRatio: null, employmentTypes: null, requiresHomeless: false, applicationStart: null, applicationEnd: null, announced: false, sourceNote: MOCK_NOTE },
  { policyId: "mock-youth-008", policyName: "청년 직무교육 지원 예시", organization: "고용노동부", policyVersion: "2026-09-19", ageRange: [18, 34], region: null, maxAnnualIncome: null, maxMedianIncomeRatio: null, employmentTypes: ["SALARIED", "UNEMPLOYED"], requiresHomeless: false, applicationStart: null, applicationEnd: null, announced: true, sourceNote: MOCK_NOTE },
  { policyId: "mock-youth-009", policyName: "청년 문화생활 지원 예시", organization: "문화체육관광부", policyVersion: "2026-09-19", ageRange: [19, 24], region: null, maxAnnualIncome: null, maxMedianIncomeRatio: null, employmentTypes: null, requiresHomeless: false, applicationStart: null, applicationEnd: null, announced: true, sourceNote: MOCK_NOTE },
  { policyId: "mock-youth-010", policyName: "청년 부채상담 지원 예시", organization: "서민금융진흥원", policyVersion: "2026-09-19", ageRange: [19, 39], region: null, maxAnnualIncome: null, maxMedianIncomeRatio: null, employmentTypes: null, requiresHomeless: false, applicationStart: null, applicationEnd: null, announced: true, sourceNote: MOCK_NOTE },
];

export const findPolicyRule = (policyId: string) => POLICY_RULES.find((rule) => rule.policyId === policyId);
