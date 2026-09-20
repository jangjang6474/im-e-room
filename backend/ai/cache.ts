/**
 * 같은 입력의 중복 Claude 호출 방지
 *
 * 캐시 키는 비식별 처리를 끝낸 입력의 SHA-256 해시이며 입력 본문은 저장하지 않는다.
 * 캐시는 프로세스 메모리에만 있고 재시작하면 사라진다. 규칙 엔진 결과는 캐시하지 않는다.
 */

import crypto from "crypto";

const MAX_ENTRIES = 50;
const TTL_MS = 5 * 60 * 1000;

interface Entry<T> {
  value: T;
  expiresAt: number;
}

const store = new Map<string, Entry<unknown>>();

/** 입력 본문이 아니라 해시만 키로 쓴다. */
export function cacheKey(endpoint: string, payload: unknown): string {
  const digest = crypto.createHash("sha256").update(JSON.stringify(payload)).digest("hex");
  return `${endpoint}:${digest}`;
}

export function readCache<T>(key: string): T | null {
  const entry = store.get(key);
  if (!entry) return null;
  if (entry.expiresAt <= Date.now()) {
    store.delete(key);
    return null;
  }
  return entry.value as T;
}

/** Claude 응답만 캐시한다. 대체 경로 응답은 캐시하지 않아 다음 요청에서 다시 시도한다. */
export function writeCache<T>(key: string, value: T): void {
  if (store.size >= MAX_ENTRIES) {
    const oldestKey = store.keys().next().value;
    if (oldestKey !== undefined) store.delete(oldestKey);
  }
  store.set(key, { value, expiresAt: Date.now() + TTL_MS });
}

export function clearCache(): void {
  store.clear();
}
