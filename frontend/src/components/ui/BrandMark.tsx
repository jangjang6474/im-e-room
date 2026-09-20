/**
 * iM 이룸 로고
 *
 * 글자 타일 대신 서비스가 하는 일을 그림으로 쓴다.
 * 세 개의 기둥은 목표별로 나눠 모으는 금액이고, 오른쪽 위 점은 달성 시점이다.
 * 기둥이 왼쪽에서 오른쪽으로 높아지는 모양으로 "모아서 이룬다"는 흐름을 나타낸다.
 *
 * - `tone="brand"`: 밝은 배경 (민트 바탕 + 짙은 기둥)
 * - `tone="light"`: 어두운 배경 (짙은 바탕 + 민트 기둥)
 */

import React from "react";

export const BrandMark: React.FC<{ size?: number; tone?: "brand" | "light"; className?: string }> = ({
  size = 36,
  tone = "brand",
  className = "",
}) => {
  const surface = tone === "light" ? "#0B2724" : "#00C4A6";
  const bar = tone === "light" ? "#00C4A6" : "#0B2724";
  const goal = tone === "light" ? "#E0EE5F" : "#FFFFFF";

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      role="img"
      aria-label="iM 이룸"
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      <rect x="0" y="0" width="40" height="40" rx="13" fill={surface} />
      {/* 목표별로 나눠 모으는 금액 */}
      <rect x="8" y="23" width="6" height="9" rx="3" fill={bar} opacity="0.55" />
      <rect x="17" y="18" width="6" height="14" rx="3" fill={bar} opacity="0.78" />
      <rect x="26" y="13" width="6" height="19" rx="3" fill={bar} />
      {/* 달성 시점 */}
      <circle cx="29" cy="8" r="3.4" fill={goal} />
    </svg>
  );
};
