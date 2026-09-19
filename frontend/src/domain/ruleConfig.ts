/**
 * iM 이룸 — 규칙 설정 (임시 수치)
 * 설명 문구와 계산 코드는 이 값을 참조한다. 수치는 최종기획서의 설계 기준이며 검증된 운영 기준이 아니다.
 */

export const RULE_VERSION = "RULE_2026_09_V2";

export const RULE_CONFIG = {
  /** 금액 반올림 단위: 월 납입액은 만원 단위 */
  amountUnit: 10_000,
  /** 월평균 산출에 필요한 최소 정상 월 수 */
  minMonthsForComplete: 3,
  /** 권장 비상자금 = (고정 + 변동) × N개월 */
  emergencyFundMonths: 3,
  /** 비정기 지출 판단: 반복되지 않는 단일 지출이 이 금액 이상 */
  irregularSingleAmount: 300_000,
  /** 반복 거래 판단: 금액 변동 허용 비율 */
  recurringAmountTolerance: 0.1,
  /** 미사용 구독: 마지막 이용일로부터 이 일수 이상 경과 */
  unusedSubscriptionDays: 60,
  /** 급여 인상: N개월 연속 기준 대비 X% 이상 */
  salaryRiseMonths: 3,
  salaryRiseRatio: 0.05,
  /** 급여 인상분 중 저축 증액 후보 비율 */
  salaryRiseSavingsShare: 0.6,
  /** 소득 감소: 직전 월평균 대비 감소율 */
  incomeDropAdjustRatio: 0.1,
  incomeDropRiskRatio: 0.2,
  /** 소득 단절: 연속 미입금 월 수 */
  incomeStopRiskMonths: 2,
  /** 지출 급증: 직전 월평균 대비 증가율과 최소 금액 */
  expenseSpikeRatio: 0.2,
  expenseSpikeMinAmount: 300_000,
  /** 적금 만기 사전 안내 일수 */
  maturityNoticeDays: 30,
  /** 청년 연령 요건 종료 안내 */
  youthAgeLimit: 34,
  youthAgeNoticeMonths: 6,
  /** 목표 우선순위: 비상자금 → 정부 지원 상품 → 청약 → 목표 적금 */
  goalCategoryRank: {
    EMERGENCY: 1,
    POLICY_SAVINGS: 2,
    HOUSING_SUBSCRIPTION: 3,
    WEALTH_BUILDING: 4,
  },
} as const;

export const floorToUnit = (value: number, unit: number = RULE_CONFIG.amountUnit) => Math.floor(value / unit) * unit;
export const ceilToUnit = (value: number, unit: number = RULE_CONFIG.amountUnit) => Math.ceil(value / unit) * unit;

/** 원 단위 반올림(0.5 올림). 월평균 등 나눗셈 결과에만 사용한다. */
export const roundWon = (value: number) => Math.round(value);

export const formatWon = (value: number | null) => (value === null ? "확인 불가" : `${value.toLocaleString("ko-KR")}원`);
