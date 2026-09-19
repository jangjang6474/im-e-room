/**
 * 사용자 상품 바운더리 (안정형 · 균형형 · 목표집중형)
 * 투자 성향 진단이 아니라 예·적금의 유형·만기·월 납입 상한을 제한하는 결정적 필터이다.
 */

import type { BoundaryProductDecision, ProductBoundaryResponse } from "../data/apiContracts";
import { API_CONTRACT_VERSION } from "../data/apiContracts";
import type { FinancialProductReference, ProductBoundary, ProductBoundaryId } from "../data/contracts";
import { PRODUCT_BOUNDARIES } from "../data/adapters";
import { RULE_VERSION, formatWon } from "./ruleConfig";

const TYPE_LABEL = { DEPOSIT: "예금", SAVING: "적금" } as const;

export function findBoundary(boundaryId: ProductBoundaryId): ProductBoundary {
  const boundary = PRODUCT_BOUNDARIES.find((item) => item.id === boundaryId);
  if (!boundary) throw new Error(`Unknown product boundary: ${boundaryId}`);
  return boundary;
}

export function decideProduct(product: FinancialProductReference, boundary: ProductBoundary): BoundaryProductDecision {
  const exclusionReasons: string[] = [];
  if (!boundary.allowedProductTypes.includes(product.productType)) {
    exclusionReasons.push(`${boundary.label}은 ${boundary.allowedProductTypes.map((type) => TYPE_LABEL[type]).join("·")}만 허용`);
  }
  if (product.maturityMonths > boundary.maxMaturityMonths) {
    exclusionReasons.push(`만기 ${product.maturityMonths}개월 > 허용 ${boundary.maxMaturityMonths}개월`);
  }
  if (product.maxMonthlyDeposit > boundary.maxMonthlyDeposit) {
    exclusionReasons.push(`월 납입 한도 ${formatWon(product.maxMonthlyDeposit)} > 허용 ${formatWon(boundary.maxMonthlyDeposit)}`);
  }
  return {
    productId: product.id,
    name: product.name,
    provider: product.provider,
    productType: product.productType,
    maturityMonths: product.maturityMonths,
    maxMonthlyDeposit: product.maxMonthlyDeposit,
    baseRate: product.baseRate,
    maxRate: product.maxRate,
    included: exclusionReasons.length === 0,
    exclusionReasons,
  };
}

export function evaluateBoundary(products: FinancialProductReference[], boundaryId: ProductBoundaryId): ProductBoundaryResponse {
  const boundary = findBoundary(boundaryId);
  const decisions = products.map((product) => decideProduct(product, boundary));
  return {
    contractVersion: API_CONTRACT_VERSION,
    ruleVersion: RULE_VERSION,
    boundaryId,
    boundaryLabel: boundary.label,
    limits: { allowedProductTypes: [...boundary.allowedProductTypes], maxMaturityMonths: boundary.maxMaturityMonths, maxMonthlyDeposit: boundary.maxMonthlyDeposit },
    includedCount: decisions.filter((item) => item.included).length,
    products: decisions,
    isSynthetic: true,
  };
}
