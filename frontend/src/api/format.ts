/**
 * 표시 전용 포맷터
 *
 * 금액·자격·기간은 Mock 계약(backend) 결과를 그대로 표시한다.
 * 이 파일은 숫자를 다시 계산하지 않고 문자열로만 바꾼다.
 * 알 수 없는 값(null)은 0으로 채우지 않고 "확인 필요"로 표시한다.
 */

export const UNKNOWN_TEXT = "확인 필요";

/** 1,234,000원. null이면 계산할 수 없는 값이므로 0으로 바꾸지 않는다. */
export function won(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return UNKNOWN_TEXT;
  return `${Math.trunc(value).toLocaleString("ko-KR")}원`;
}

/** 부호를 붙인 증감 표시 (백엔드가 준 두 값의 차이를 표시할 때만 사용) */
export function wonDelta(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return UNKNOWN_TEXT;
  const sign = value > 0 ? "+" : value < 0 ? "−" : "±";
  return `${sign}${Math.abs(Math.trunc(value)).toLocaleString("ko-KR")}원`;
}

/** 만원 단위 축약 (보조 설명용) */
export function manwon(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return UNKNOWN_TEXT;
  const man = Math.trunc(value / 10000);
  return man === 0 ? won(value) : `${man.toLocaleString("ko-KR")}만원`;
}

export function months(value: number | null | undefined): string {
  if (value === null || value === undefined) return UNKNOWN_TEXT;
  return `${value}개월`;
}

export function percent(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return UNKNOWN_TEXT;
  return `${value.toFixed(digits)}%`;
}

/** 진행률 막대 길이용 0~100 값. 표시용 클램프일 뿐 금액 계산이 아니다. */
export function clampPercent(value: number | null | undefined): number {
  if (value === null || value === undefined || Number.isNaN(value)) return 0;
  return Math.max(0, Math.min(100, value));
}

/** 2026-09-15 → 2026년 9월 15일 */
export function dateText(value: string | null | undefined): string {
  if (!value) return UNKNOWN_TEXT;
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value;
  return `${match[1]}년 ${Number(match[2])}월 ${Number(match[3])}일`;
}

/** 2026-09-15T09:00:00+09:00 → 2026년 9월 15일 09:00 */
export function dateTimeText(value: string | null | undefined): string {
  if (!value) return UNKNOWN_TEXT;
  const time = value.match(/T(\d{2}):(\d{2})/);
  return time ? `${dateText(value)} ${time[1]}:${time[2]}` : dateText(value);
}

/** 2026-09 → 2026년 9월 */
export function monthText(value: string | null | undefined): string {
  if (!value) return UNKNOWN_TEXT;
  const match = value.match(/^(\d{4})-(\d{2})$/);
  return match ? `${match[1]}년 ${Number(match[2])}월` : value;
}

/** 2026-09 → 9월 (표·칩 등 좁은 영역) */
export function shortMonth(value: string): string {
  const match = value.match(/^\d{4}-(\d{2})$/);
  return match ? `${Number(match[1])}월` : value;
}

export function rangeText(start: string | null, end: string | null): string {
  if (!start || !end) return UNKNOWN_TEXT;
  return `${dateText(start)} ~ ${dateText(end)}`;
}

/**
 * 이벤트의 oldValue/newValue는 숫자 또는 문자열이다.
 * 이 계약에서 금액은 KRW 정수라 최소 천 단위이고, 나이·비율·건수는 그보다 작다.
 * 그래서 지표 이름과 자릿수로 금액 여부를 구분해 표시한다. 값 자체는 바꾸지 않는다.
 */
export function eventValueText(value: number | string | null, metric?: string): string {
  if (value === null) return UNKNOWN_TEXT;
  if (typeof value !== "number") return value;
  const nonMoneyMetric = metric ? /나이|세|비율|%|개월|건|횟수/.test(metric) : false;
  if (nonMoneyMetric || Math.abs(value) < 1000) return value.toLocaleString("ko-KR");
  return won(value);
}
