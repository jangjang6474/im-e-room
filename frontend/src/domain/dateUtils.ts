/**
 * 결정적 날짜 계산. 시스템 시각을 읽지 않고 입력 날짜 문자열(YYYY-MM-DD)만 사용한다.
 */

export const monthOf = (date: string) => date.slice(0, 7);

const parse = (date: string) => {
  const [y, m, d] = date.slice(0, 10).split("-").map(Number);
  return { y, m, d };
};

const pad = (value: number) => String(value).padStart(2, "0");

export const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();

export function addMonthsToMonth(month: string, count: number): string {
  const [y, m] = month.split("-").map(Number);
  const index = y * 12 + (m - 1) + count;
  return `${Math.floor(index / 12)}-${pad((index % 12) + 1)}`;
}

/** start~end 사이의 모든 월 (양 끝 포함) */
export function monthRange(startMonth: string, endMonth: string): string[] {
  const result: string[] = [];
  for (let month = startMonth; month <= endMonth; month = addMonthsToMonth(month, 1)) result.push(month);
  return result;
}

export const lastDayOfMonth = (month: string) => {
  const [y, m] = month.split("-").map(Number);
  return `${month}-${pad(daysInMonth(y, m))}`;
};

export function daysBetween(from: string, to: string): number {
  const a = parse(from);
  const b = parse(to);
  return Math.round((Date.UTC(b.y, b.m - 1, b.d) - Date.UTC(a.y, a.m - 1, a.d)) / 86_400_000);
}

/**
 * 동의 기준일(anchorDay)로 다음 수집일을 계산한다.
 * 해당 월에 기준일이 없으면 그 달의 말일로 보정하되, 다음 달에는 원래 기준일을 다시 사용한다.
 */
export function nextCollectionDate(anchorDay: number, afterDate: string): string {
  const { y, m } = parse(afterDate);
  const nextMonth = addMonthsToMonth(`${y}-${pad(m)}`, 1);
  const [ny, nm] = nextMonth.split("-").map(Number);
  return `${nextMonth}-${pad(Math.min(anchorDay, daysInMonth(ny, nm)))}`;
}

/** 만 나이 */
export function ageAt(birthDate: string, asOf: string): number {
  const b = parse(birthDate);
  const a = parse(asOf);
  let age = a.y - b.y;
  if (a.m < b.m || (a.m === b.m && a.d < b.d)) age -= 1;
  return age;
}

/** 특정 만 나이에 도달하는 날짜 */
export function dateAtAge(birthDate: string, age: number): string {
  const b = parse(birthDate);
  const y = b.y + age;
  return `${y}-${pad(b.m)}-${pad(Math.min(b.d, daysInMonth(y, b.m)))}`;
}

export const addDays = (date: string, days: number) => {
  const { y, m, d } = parse(date);
  const value = new Date(Date.UTC(y, m - 1, d + days));
  return `${value.getUTCFullYear()}-${pad(value.getUTCMonth() + 1)}-${pad(value.getUTCDate())}`;
};

/** 데이터 기준일을 KST 자정 ISO 문자열로 표현한다. 생성 시각이 필요한 곳에서 시스템 시각 대신 사용한다. */
export const kstTimestamp = (date: string, time = "09:00:00") => `${date.slice(0, 10)}T${time}+09:00`;
