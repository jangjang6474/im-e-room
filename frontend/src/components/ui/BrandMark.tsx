import React from "react";

/** Transparent logo asset; preserve proportions and trim empty canvas in the viewport. */
export const BrandMark: React.FC<{ size?: number; tone?: "brand" | "light"; className?: string }> = ({
  size = 36, tone = "brand", className = "",
}) => (
  <svg width={size * 2} height={size} viewBox="380 166 1124 574"
    preserveAspectRatio="xMidYMid meet" role="img" aria-label="iM 이룸"
    className={`shrink-0 ${className}`} style={{ width: size * 2, height: size, flexShrink: 0 }}>
    <image href="/images/im-symbol.png" width="1883" height="835"
      style={tone === "light" ? { filter: "brightness(0) invert(1)" } : undefined} />
  </svg>
);
