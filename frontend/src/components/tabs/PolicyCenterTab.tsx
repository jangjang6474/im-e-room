/**
 * 받을 수 있는 혜택
 *
 * 자격 판정과 상품 후보는 계약 응답 값이다. 확인되지 않은 요건을 충족으로 채우지 않는다.
 * 요건별 상세와 제외 사유는 접어 두고, 상태 라벨을 먼저 읽게 한다.
 */

import React, { useState } from "react";
import { Gift } from "lucide-react";
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
  Disclosure,
  HeadlineCard,
  LoadingBlock,
  Section,
  StatusChip,
} from "../ui/Primitives";

const STATUS_ORDER: EligibilityStatus[] = ["ELIGIBLE", "NEEDS_VERIFICATION", "INELIGIBLE"];

export const PolicyCenterTab: React.FC = () => {
  const { eligibility, products, pending } = useEroomSession();
  const [statusFilter, setStatusFilter] = useState<EligibilityStatus | "ALL">("ALL");
  const [showExcluded, setShowExcluded] = useState(false);

  if (pending.session && !eligibility) return <LoadingBlock label="정책 자격을 확인하는 중입니다." rows={4} />;
  if (!eligibility) return null;

  const filtered =
    statusFilter === "ALL" ? eligibility.results : eligibility.results.filter((item) => item.status === statusFilter);
  const includedProducts = products?.products.filter((product) => product.included) ?? [];
  const excludedProducts = products?.products.filter((product) => !product.included) ?? [];

  return (
    <div className="space-y-6">
      <HeadlineCard
        statusLabel="지원제도 확인 결과"
        headline={`지금 이용할 수 있는 제도가 ${eligibility.summary.ELIGIBLE}건 있어요.`}
        description={`서류 확인이 필요한 제도 ${eligibility.summary.NEEDS_VERIFICATION}건, 현재 대상이 아닌 제도 ${eligibility.summary.INELIGIBLE}건입니다.`}
        tone={eligibility.summary.ELIGIBLE > 0 ? "positive" : "neutral"}
        icon={<Gift className="w-4 h-4" aria-hidden="true" />}
        meta={`${dateText(eligibility.asOf)} 기준 · 확인되지 않은 요건은 충족으로 보지 않습니다.`}
      />

      <Section id="policy-list" title="제도별 자격">
        <div className="flex flex-wrap gap-2" role="group" aria-label="자격 상태 필터">
          <button
            type="button"
            onClick={() => setStatusFilter("ALL")}
            aria-pressed={statusFilter === "ALL"}
            className={`min-h-[44px] px-4 rounded-2xl border text-sm font-bold ${
              statusFilter === "ALL"
                ? "bg-[#142B29] text-white border-transparent"
                : "bg-white border-[#DCE7E4] text-[#526562]"
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
                        <StatusChip
                          label={`${CRITERION_LABEL[criterion.key]} ${criterionStatus.label}`}
                          tone={criterionStatus.tone}
                        />
                      </li>
                    );
                  })}
                </ul>

                <Disclosure summary="요건별 근거 보기" className="mt-3">
                  <ul className="space-y-1">
                    {policy.criteria.map((criterion) => (
                      <li
                        key={`${policy.policyId}-${criterion.key}-detail`}
                        className="text-xs text-[#526562] leading-relaxed break-keep"
                      >
                        · {CRITERION_LABEL[criterion.key]}: {criterion.required} / 확인된 값{" "}
                        {criterion.observed ?? "없음"}
                      </li>
                    ))}
                    <li className="text-xs text-[#526562] leading-relaxed break-keep">· {policy.sourceNote}</li>
                    {!policy.autoAllocatable && (
                      <li className="text-xs text-[#526562] leading-relaxed font-bold break-keep">
                        · 자동 배분 대상이 아닙니다. 자격을 확인한 뒤 다시 계산합니다.
                      </li>
                    )}
                  </ul>
                </Disclosure>
              </li>
            );
          })}
        </ul>

        {filtered.length === 0 && <Callout tone="muted">선택한 상태에 해당하는 제도가 없습니다.</Callout>}

        <Callout tone="muted" title="이 결과의 의미" className="mt-3">
          대출 승인이나 정책 최종 수혜 여부를 확정하지 않습니다. 실제 신청과 심사는 각 기관에서 진행됩니다.
        </Callout>
      </Section>

      <Section
        id="policy-products"
        title="상품 후보"
        description={
          products
            ? `${products.boundaryLabel} 기준 · 포함 ${products.includedCount}개 / 전체 ${products.products.length}개`
            : "상품 목록을 불러오는 중입니다."
        }
      >
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
                <ActionButton variant="ghost" full onClick={() => setShowExcluded((prev) => !prev)}>
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
                            <li key={reason} className="text-xs text-[#526562] leading-relaxed break-keep">
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
      </Section>
    </div>
  );
};
