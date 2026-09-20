/**
 * 받을 수 있는 혜택 (필수 흐름 10)
 *
 * 정책 자격 판정과 상품 후보는 백엔드 결과이다. 확인되지 않은 요건을 충족으로 채우지 않는다.
 */

import React, { useState } from "react";
import { Gift, PackageSearch } from "lucide-react";
import { useEroomSession } from "../../api/EroomSession";
import { dateText, months, percent, won } from "../../api/format";
import {
  CRITERION_LABEL,
  CRITERION_STATUS_LABEL,
  ELIGIBILITY_LABEL,
  PRODUCT_TYPE_LABEL,
} from "../../api/labels";
import type { EligibilityStatus } from "../../data/apiContracts";
import {
  ActionButton,
  Callout,
  LoadingBlock,
  Panel,
  SectionHeading,
  StatusChip,
} from "../ui/Primitives";

const STATUS_ORDER: EligibilityStatus[] = ["ELIGIBLE", "NEEDS_VERIFICATION", "INELIGIBLE"];

export const PolicyCenterTab: React.FC = () => {
  const { eligibility, products, pending } = useEroomSession();
  const [statusFilter, setStatusFilter] = useState<EligibilityStatus | "ALL">("ALL");
  const [showExcluded, setShowExcluded] = useState(false);

  if (pending.session && !eligibility) return <LoadingBlock label="정책 자격을 판정하는 중입니다." rows={4} />;
  if (!eligibility) return null;

  const filtered =
    statusFilter === "ALL" ? eligibility.results : eligibility.results.filter((item) => item.status === statusFilter);
  const includedProducts = products?.products.filter((product) => product.included) ?? [];
  const excludedProducts = products?.products.filter((product) => !product.included) ?? [];

  return (
    <div className="space-y-5">
      <Panel className="p-5" ariaLabelledBy="policy-list">
        <SectionHeading
          id="policy-list"
          title="정책 자격"
          icon={<Gift className="w-5 h-5 text-[#006B5B]" aria-hidden="true" />}
          description={`${dateText(eligibility.asOf)} 기준 판정 · 확인되지 않은 요건은 충족으로 보지 않습니다.`}
        />

        <div className="flex flex-wrap gap-2" role="group" aria-label="자격 상태 필터">
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            aria-pressed={statusFilter === "ALL"}
            className={`min-h-[44px] px-4 rounded-2xl border text-sm font-bold ${
              statusFilter === "ALL" ? "bg-[#142B29] text-white border-transparent" : "bg-white border-[#DCE7E4] text-[#526562]"
            }`}
          >
            전체 {eligibility.results.length}건
          </button>
          {STATUS_ORDER.map((status) => (
            <button
              key={status}
              type="button"
              onClick={() => setStatusFilter(status)}
              aria-pressed={statusFilter === status}
              className={`min-h-[44px] px-4 rounded-2xl border text-sm font-bold ${
                statusFilter === status
                  ? "bg-[#142B29] text-white border-transparent"
                  : "bg-white border-[#DCE7E4] text-[#526562]"
              }`}
            >
              {ELIGIBILITY_LABEL[status].label} {eligibility.summary[status]}건
            </button>
          ))}
        </div>

        <ul className="mt-4 space-y-3">
          {filtered.map((policy) => {
            const label = ELIGIBILITY_LABEL[policy.status];
            return (
              <li key={policy.policyId} className="rounded-2xl border border-[#DCE7E4] p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-extrabold text-[#142B29] break-keep">{policy.policyName}</p>
                    <p className="text-xs text-[#526562] mt-0.5">{policy.organization}</p>
                  </div>
                  <StatusChip label={label.label} tone={label.tone} />
                </div>
                <p className="text-sm text-[#526562] mt-2 leading-relaxed break-keep">{policy.reason}</p>

                <ul className="mt-3 flex flex-wrap gap-1.5">
                  {policy.criteria.map((criterion) => {
                    const criterionStatus = CRITERION_STATUS_LABEL[criterion.status];
                    return (
                      <li key={`${policy.policyId}-${criterion.key}`}>
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full border text-xs font-bold ${
                            criterionStatus.tone === "positive"
                              ? "bg-[#EAFBF6] text-[#006B5B] border-[#B6E7DA]"
                              : criterionStatus.tone === "risk"
                                ? "bg-[#FFF1EE] text-[#9A3412] border-[#FBD5C8]"
                                : "bg-[#F6FADC] text-[#5C5A14] border-[#E3E9A8]"
                          }`}
                          title={`요건: ${criterion.required}${criterion.observed ? ` / 확인된 값: ${criterion.observed}` : ""}`}
                        >
                          {CRITERION_LABEL[criterion.key]} {criterionStatus.label}
                        </span>
                      </li>
                    );
                  })}
                </ul>

                <div className="mt-3 text-[11px] text-[#526562] space-y-0.5">
                  {policy.criteria.map((criterion) => (
                    <p key={`${policy.policyId}-${criterion.key}-detail`} className="leading-relaxed">
                      · {CRITERION_LABEL[criterion.key]}: {criterion.required} / 확인된 값 {criterion.observed ?? "없음"}
                    </p>
                  ))}
                  <p className="leading-relaxed">· {policy.sourceNote} (정책 버전 {policy.policyVersion})</p>
                  {!policy.autoAllocatable && (
                    <p className="leading-relaxed font-bold">· 자동 배분 대상이 아닙니다. 자격 확인 후 다시 계산합니다.</p>
                  )}
                </div>
              </li>
            );
          })}
        </ul>

        {filtered.length === 0 && (
          <Callout tone="muted">선택한 상태에 해당하는 제도가 없습니다.</Callout>
        )}

        <Callout tone="muted" title="이 판정의 의미">
          대출 승인이나 정책 최종 수혜 여부를 확정하지 않습니다. 실제 신청과 심사는 각 기관에서 진행됩니다.
        </Callout>
      </Panel>

      <Panel className="p-5" ariaLabelledBy="policy-products">
        <SectionHeading
          id="policy-products"
          title="상품 후보"
          icon={<PackageSearch className="w-5 h-5 text-[#006B5B]" aria-hidden="true" />}
          description={
            products
              ? `${products.boundaryLabel} 기준 · 포함 ${products.includedCount}개 / 전체 ${products.products.length}개`
              : "상품 목록을 불러오는 중입니다."
          }
        />
        {products && (
          <>
            <ul className="space-y-3">
              {includedProducts.map((product) => (
                <li key={product.productId} className="rounded-2xl border border-[#DCE7E4] p-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="font-extrabold text-[#142B29] break-keep">{product.name}</p>
                      <p className="text-xs text-[#526562] mt-0.5">{product.provider}</p>
                    </div>
                    <StatusChip label={`${PRODUCT_TYPE_LABEL[product.productType]} · 후보 포함`} tone="positive" />
                  </div>
                  <p className="text-xs text-[#526562] mt-2 tabular-nums leading-relaxed">
                    만기 {months(product.maturityMonths)} · 월 납입 한도 {won(product.maxMonthlyDeposit)} · 기본 금리{" "}
                    {percent(product.baseRate, 2)} / 최고 {percent(product.maxRate, 2)}
                  </p>
                </li>
              ))}
            </ul>

            {excludedProducts.length > 0 && (
              <div className="mt-4">
                <ActionButton variant="ghost" onClick={() => setShowExcluded((prev) => !prev)}>
                  {showExcluded ? "제외된 상품 접기" : `이 기준에서 제외된 상품 ${excludedProducts.length}개 보기`}
                </ActionButton>
                {showExcluded && (
                  <ul className="mt-3 space-y-2">
                    {excludedProducts.map((product) => (
                      <li key={product.productId} className="rounded-2xl border border-[#DCE7E4] bg-[#F6F9F8] p-4">
                        <div className="flex flex-wrap items-start justify-between gap-2">
                          <p className="font-bold text-[#142B29] break-keep">{product.name}</p>
                          <StatusChip label="이 기준에서 제외" tone="muted" />
                        </div>
                        <ul className="mt-2 space-y-0.5">
                          {product.exclusionReasons.map((reason) => (
                            <li key={reason} className="text-xs text-[#526562] leading-relaxed">
                              · {reason}
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </>
        )}
      </Panel>
    </div>
  );
};
