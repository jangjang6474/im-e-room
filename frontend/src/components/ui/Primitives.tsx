/**
 * 공용 UI 요소
 *
 * DESIGN.md 기준: 16~24px 모서리, 얕은 그림자, 색만으로 상태를 구분하지 않음,
 * 터치 영역 최소 44px, 금액은 tabular numbers.
 */

import React from "react";
import { AlertTriangle, Inbox, Loader2, RefreshCw } from "lucide-react";
import { TONE_CLASS, type Tone } from "../../api/labels";
import { clampPercent } from "../../api/format";

export const Panel: React.FC<{
  children: React.ReactNode;
  className?: string;
  as?: "section" | "article" | "div";
  ariaLabelledBy?: string;
}> = ({ children, className = "", as = "section", ariaLabelledBy }) => {
  const Tag = as;
  return (
    <Tag
      aria-labelledby={ariaLabelledBy}
      className={`bg-white border border-[#DCE7E4] rounded-3xl shadow-[0_8px_32px_rgba(20,43,41,0.06)] ${className}`}
    >
      {children}
    </Tag>
  );
};

export const SectionHeading: React.FC<{
  id?: string;
  title: string;
  description?: string;
  action?: React.ReactNode;
  icon?: React.ReactNode;
}> = ({ id, title, description, action, icon }) => (
  <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
    <div className="min-w-0">
      <h2 id={id} className="text-lg font-extrabold text-[#142B29] flex items-center gap-2">
        {icon}
        {title}
      </h2>
      {description && <p className="text-sm text-[#526562] mt-1 leading-relaxed">{description}</p>}
    </div>
    {action}
  </div>
);

/** 상태 칩. 색과 함께 반드시 텍스트 라벨을 표시한다. */
export const StatusChip: React.FC<{ label: string; tone?: Tone; className?: string }> = ({
  label,
  tone = "muted",
  className = "",
}) => (
  <span
    className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-bold whitespace-nowrap ${TONE_CLASS[tone]} ${className}`}
  >
    {label}
  </span>
);

export const MetricTile: React.FC<{
  label: string;
  value: string;
  hint?: string;
  tone?: Tone;
}> = ({ label, value, hint, tone = "muted" }) => (
  <div className={`rounded-2xl border p-4 ${TONE_CLASS[tone]}`}>
    <p className="text-xs font-bold opacity-80">{label}</p>
    <p className="text-xl font-extrabold tabular-nums mt-1 break-keep">{value}</p>
    {hint && <p className="text-[11px] mt-1 opacity-80 leading-relaxed">{hint}</p>}
  </div>
);

export const KeyValueRow: React.FC<{ label: string; value: React.ReactNode; hint?: string }> = ({
  label,
  value,
  hint,
}) => (
  <div className="flex items-start justify-between gap-4 py-2 border-b border-[#EDF3F1] last:border-b-0">
    <div className="min-w-0">
      <span className="text-sm text-[#526562]">{label}</span>
      {hint && <p className="text-[11px] text-[#7A8B88] mt-0.5 leading-relaxed">{hint}</p>}
    </div>
    <span className="text-sm font-bold text-[#142B29] tabular-nums text-right shrink-0">{value}</span>
  </div>
);

/** 진행률 막대. 퍼센트는 접근성을 위해 텍스트로도 제공한다. */
export const ProgressBar: React.FC<{ percent: number; label: string; tone?: "mint" | "sky" }> = ({
  percent,
  label,
  tone = "mint",
}) => {
  const width = clampPercent(percent);
  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(width)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label}
      className="w-full h-2.5 rounded-full bg-[#EDF3F1] overflow-hidden"
    >
      <div
        className={`h-full rounded-full ${tone === "mint" ? "bg-[#00C4A6]" : "bg-[#7CB5FF]"}`}
        style={{ width: `${width}%` }}
      />
    </div>
  );
};

type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";

const VARIANT_CLASS: Record<ButtonVariant, string> = {
  primary: "bg-[#00C4A6] text-[#0B2724] hover:bg-[#00B398] border-transparent",
  secondary: "bg-white text-[#006B5B] border-[#00C4A6] hover:bg-[#EAFBF6]",
  ghost: "bg-white text-[#142B29] border-[#DCE7E4] hover:bg-[#F6F9F8]",
  danger: "bg-[#9A3412] text-white border-transparent hover:bg-[#7C2D12]",
};

export const ActionButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & {
    variant?: ButtonVariant;
    loading?: boolean;
    icon?: React.ReactNode;
    full?: boolean;
  }
> = ({ variant = "primary", loading = false, icon, full = false, children, className = "", disabled, ...rest }) => (
  <button
    type="button"
    {...rest}
    disabled={disabled || loading}
    aria-busy={loading}
    className={`min-h-[44px] px-5 py-2.5 rounded-2xl border font-bold text-sm inline-flex items-center justify-center gap-2 transition-colors disabled:opacity-55 disabled:cursor-not-allowed ${VARIANT_CLASS[variant]} ${full ? "w-full" : ""} ${className}`}
  >
    {loading ? <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" /> : icon}
    <span>{children}</span>
  </button>
);

export const Callout: React.FC<{
  tone?: Tone;
  title?: string;
  children: React.ReactNode;
  icon?: React.ReactNode;
  className?: string;
}> = ({ tone = "muted", title, children, icon, className = "" }) => (
  <div className={`rounded-2xl border p-4 text-sm leading-relaxed ${TONE_CLASS[tone]} ${className}`}>
    {title && (
      <p className="font-extrabold mb-1 flex items-center gap-2">
        {icon}
        {title}
      </p>
    )}
    <div className="opacity-90">{children}</div>
  </div>
);

/** 로딩 상태. 데이터가 없는 동안 성공 화면을 보여주지 않는다. */
export const LoadingBlock: React.FC<{ label: string; rows?: number }> = ({ label, rows = 3 }) => (
  <div aria-busy="true" aria-live="polite" className="space-y-3">
    <p className="text-sm text-[#526562] flex items-center gap-2">
      <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />
      {label}
    </p>
    {Array.from({ length: rows }).map((_, index) => (
      <div key={index} className="h-14 rounded-2xl bg-[#EDF3F1] animate-pulse" />
    ))}
  </div>
);

export const EmptyState: React.FC<{ title: string; description: string; action?: React.ReactNode }> = ({
  title,
  description,
  action,
}) => (
  <div className="text-center py-10 px-4">
    <Inbox className="w-8 h-8 mx-auto text-[#8FA6A1]" aria-hidden="true" />
    <p className="mt-3 font-extrabold text-[#142B29]">{title}</p>
    <p className="mt-1 text-sm text-[#526562] leading-relaxed max-w-md mx-auto">{description}</p>
    {action && <div className="mt-4 flex justify-center">{action}</div>}
  </div>
);

export const ErrorState: React.FC<{ message: string; onRetry?: () => void; retryLabel?: string }> = ({
  message,
  onRetry,
  retryLabel = "다시 시도",
}) => (
  <div role="alert" className="rounded-2xl border border-[#FBD5C8] bg-[#FFF1EE] p-4">
    <p className="font-extrabold text-[#9A3412] flex items-center gap-2">
      <AlertTriangle className="w-4 h-4" aria-hidden="true" />
      요청을 완료하지 못했습니다
    </p>
    <p className="text-sm text-[#9A3412] mt-1 leading-relaxed">{message}</p>
    {onRetry && (
      <div className="mt-3">
        <ActionButton variant="ghost" onClick={onRetry} icon={<RefreshCw className="w-4 h-4" aria-hidden="true" />}>
          {retryLabel}
        </ActionButton>
      </div>
    )}
  </div>
);

/** 합성 데이터·모의 실행 고지 */
export const SyntheticNotice: React.FC<{ className?: string }> = ({ className = "" }) => (
  <p className={`text-[11px] text-[#526562] leading-relaxed ${className}`}>
    이 화면의 고객·계좌·거래는 모두 합성 데이터입니다. 실제 마이데이터 연결, 상품 가입, 송금, 상담 예약은 일어나지 않습니다.
  </p>
);
