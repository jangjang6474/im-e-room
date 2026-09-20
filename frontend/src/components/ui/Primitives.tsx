/**
 * 공용 UI 요소
 *
 * DESIGN.md 기준: 16~24px 모서리, 얕은 그림자, 색만으로 상태를 구분하지 않음,
 * 터치 영역 최소 44px, 금액은 tabular numbers.
 */

import React from "react";
import { AlertTriangle, ChevronDown, Inbox, Loader2, RefreshCw, X } from "lucide-react";
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
    이 화면의 고객·계좌·거래는 모두 가상 데이터입니다. 실제 마이데이터 연결, 상품 가입, 송금, 자동이체, 상담 예약은 일어나지 않습니다.
  </p>
);

/* ------------------------------------------------------------------ */
/* 모바일 우선 레이아웃 요소                                             */
/*                                                                    */
/* 한 화면의 강조 카드는 1개만 쓰고 나머지는 중립 배경·여백·구분선으로     */
/* 구분한다. 아래 요소는 그 규칙을 위한 공용 조각이다.                    */
/* ------------------------------------------------------------------ */

/** 테두리 없는 중립 구역. 모든 내용을 카드로 만들지 않기 위해 사용한다. */
export const Section: React.FC<{
  id?: string;
  title?: string;
  description?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}> = ({ id, title, description, action, children, className = "" }) => (
  <section aria-labelledby={id} className={`pt-5 border-t border-[#DCE7E4] ${className}`}>
    {title && (
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div className="min-w-0">
          <h2 id={id} className="text-base font-extrabold text-[#142B29] break-keep">
            {title}
          </h2>
          {description && <p className="text-sm text-[#526562] mt-1 leading-relaxed break-keep">{description}</p>}
        </div>
        {action}
      </div>
    )}
    {children}
  </section>
);

/**
 * 결론형 상태 문장. 한 화면에서 강조 카드 역할을 맡는 유일한 요소로 쓴다.
 * 상태는 색만으로 구분하지 않고 아이콘과 텍스트 라벨을 함께 제공한다.
 */
export const HeadlineCard: React.FC<{
  statusLabel: string;
  headline: string;
  description?: string;
  tone?: Tone;
  icon?: React.ReactNode;
  meta?: string;
  children?: React.ReactNode;
}> = ({ statusLabel, headline, description, tone = "neutral", icon, meta, children }) => (
  <section className={`rounded-3xl border p-5 ${TONE_CLASS[tone]}`} aria-labelledby="headline-status">
    <p className="inline-flex items-center gap-1.5 text-xs font-extrabold">
      {icon}
      {statusLabel}
    </p>
    <h2 id="headline-status" className="text-xl font-extrabold mt-2 leading-snug break-keep">
      {headline}
    </h2>
    {description && <p className="text-sm mt-2 leading-relaxed opacity-90 break-keep">{description}</p>}
    {meta && <p className="text-xs mt-2 opacity-80 tabular-nums">{meta}</p>}
    {children && <div className="mt-4">{children}</div>}
  </section>
);

/** 접을 수 있는 근거 영역. 상세 지표와 긴 목록을 기본값으로 펼치지 않는다. */
export const Disclosure: React.FC<{
  summary: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
}> = ({ summary, children, defaultOpen = false, className = "" }) => {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className={`rounded-2xl border border-[#DCE7E4] bg-white ${className}`}>
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        className="w-full min-h-[48px] px-4 py-3 flex items-center justify-between gap-3 text-sm font-bold text-[#142B29] rounded-2xl hover:bg-[#F6F9F8]"
      >
        <span className="text-left break-keep">{summary}</span>
        <ChevronDown
          className={`w-4 h-4 shrink-0 transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
};

/** 세로 요약 줄. KeyValueRow보다 가벼워 한 카드에 여러 줄을 넣어도 덜 답답하다. */
export const SummaryRow: React.FC<{ label: string; value: React.ReactNode; tone?: "default" | "strong" }> = ({
  label,
  value,
  tone = "default",
}) => (
  <div className="flex items-baseline justify-between gap-4 py-2.5 border-b border-[#EDF3F1] last:border-b-0">
    <span className="text-sm text-[#526562] break-keep">{label}</span>
    <span
      className={`tabular-nums text-right shrink-0 ${
        tone === "strong" ? "text-base font-extrabold text-[#142B29]" : "text-sm font-bold text-[#142B29]"
      }`}
    >
      {value}
    </span>
  </div>
);

/**
 * 세로 비교 줄. 가로 스크롤 표 대신 "이전 → 이후"를 한 줄로 읽게 한다.
 * 두 값은 모두 백엔드 응답에서 읽은 값이어야 한다.
 */
export const CompareRow: React.FC<{
  label: string;
  before: string;
  after: string;
  note?: string;
}> = ({ label, before, after, note }) => (
  <li className="py-3 border-b border-[#EDF3F1] last:border-b-0">
    <p className="text-sm text-[#526562] break-keep">{label}</p>
    <p className="mt-1 flex flex-wrap items-baseline gap-2 tabular-nums">
      <span className="text-sm text-[#526562]">{before}</span>
      <span aria-hidden="true" className="text-[#8FA6A1] font-bold">
        →
      </span>
      <span className="sr-only">에서</span>
      <span className="text-base font-extrabold text-[#142B29]">{after}</span>
      <span className="sr-only">(으)로</span>
    </p>
    {note && <p className="text-xs text-[#526562] mt-1 leading-relaxed break-keep">{note}</p>}
  </li>
);

/**
 * 모바일 하단 고정 행동 영역.
 *
 * 하단 내비게이션 위에 겹치지 않도록 간격을 두고 safe area를 반영한다.
 * 같은 높이의 spacer를 문서 흐름에 넣어 본문 마지막 내용이 가려지지 않게 한다.
 */
export const StickyActions: React.FC<{
  children: React.ReactNode;
  note?: string;
  /** 하단 내비게이션이 없는 화면(예: 적용 예시 모드)에서는 false */
  aboveBottomNav?: boolean;
}> = ({ children, note, aboveBottomNav = true }) => (
  <>
    <div aria-hidden="true" className="md:hidden h-[150px]" />
    <div
      className={`fixed inset-x-0 z-20 bg-white border-t border-[#DCE7E4] px-4 pt-3 pb-3 md:static md:border-0 md:bg-transparent md:px-0 md:pt-0 ${
        aboveBottomNav
          ? // 하단 내비게이션(65px)과 겹치지 않도록 간격을 둔다
            "bottom-[calc(73px+env(safe-area-inset-bottom))]"
          : "bottom-0 pb-[calc(12px+env(safe-area-inset-bottom))]"
      }`}
    >
      <div className="max-w-[1200px] mx-auto space-y-2">
        <div className="flex flex-col sm:flex-row gap-2">{children}</div>
        {note && <p className="text-[11px] text-[#526562] leading-relaxed break-keep">{note}</p>}
      </div>
    </div>
  </>
);

/**
 * 바텀시트. 상세 근거처럼 첫 화면에서 빼낸 내용을 담는다.
 * 열릴 때 초점을 옮기고 닫히면 호출한 버튼으로 초점을 되돌린다.
 */
export const BottomSheet: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}> = ({ isOpen, onClose, title, children }) => {
  const panelRef = React.useRef<HTMLDivElement>(null);
  const restoreRef = React.useRef<HTMLElement | null>(null);
  /**
   * `onClose`는 호출부에서 매 렌더마다 새로 만들어지는 경우가 많다.
   * 의존성에 그대로 넣으면 열려 있는 동안 효과가 반복 실행되어 초점 복원 대상이 사라진다.
   */
  const onCloseRef = React.useRef(onClose);
  onCloseRef.current = onClose;

  React.useEffect(() => {
    if (!isOpen) return;
    restoreRef.current = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCloseRef.current();
        return;
      }
      if (event.key !== "Tab" || !panelRef.current) return;
      const focusable = panelRef.current.querySelectorAll<HTMLElement>(
        'a[href], button:not([disabled]), input:not([disabled]), [tabindex]:not([tabindex="-1"])',
      );
      if (focusable.length === 0) return;
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      restoreRef.current?.focus();
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-[#0B2724]/40">
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="bottom-sheet-title"
        tabIndex={-1}
        className="bg-white w-full sm:max-w-[520px] max-h-[86vh] overflow-y-auto rounded-t-3xl sm:rounded-3xl border border-[#DCE7E4] p-5 pb-[calc(20px+env(safe-area-inset-bottom))]"
      >
        <div className="flex items-start justify-between gap-3">
          <h2 id="bottom-sheet-title" className="text-lg font-extrabold text-[#142B29] break-keep">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="min-h-[44px] min-w-[44px] rounded-2xl border border-[#DCE7E4] inline-flex items-center justify-center hover:bg-[#F6F9F8] shrink-0"
          >
            <X className="w-5 h-5" aria-hidden="true" />
            <span className="sr-only">닫기</span>
          </button>
        </div>
        <div className="mt-4">{children}</div>
      </div>
    </div>
  );
};
