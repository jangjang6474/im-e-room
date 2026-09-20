/**
 * iM 이룸 브랜드 마크
 *
 * iM금융그룹 심볼에서 착안한 곡선형 M을 사용한다.
 * 밝은 상단 바에서는 초록색으로 표시한다.
 */

import React from "react";

export const BrandMark: React.FC<{ size?: number; tone?: "brand" | "light"; className?: string }> = ({
  size = 36,
  tone = "brand",
  className = "",
}) => {
  const left = tone === "light" ? "#FFFFFF" : "#24C999";
  const right = tone === "light" ? "#FFFFFF" : "#00C4A6";

  return (
    <svg
      width={Math.round(size * 1.6)}
      height={size}
      viewBox="0 0 64 40"
      role="img"
      aria-label="iM 이룸"
      focusable="false"
      className={`shrink-0 ${className}`}
    >
      <path d="M2 17h10v16H2z" fill={left} />
      <path d="M12 8h4c11 0 19 5.8 22 16.2V33H28C28 23.5 22.2 18 12 18V8Z" fill={left} />
      <path d="M38 24.2C41.8 13.7 50 8 62 8v10c-9.8 0-14 5.5-14 15H38v-8.8Z" fill={right} />
    </svg>
  );
};
