import type { FinancialProductReference, ProductBoundary, YouthPolicyReference } from "./contracts";

type Dict = Record<string, unknown>;
const text = (value: unknown) => value == null ? "" : String(value).trim();
const number = (value: unknown) => Number.parseFloat(text(value).replace(/,/g, "")) || 0;
const list = (value: unknown): Dict[] => Array.isArray(value) ? value.filter((item): item is Dict => !!item && typeof item === "object") : [];
const ageRange = (value: unknown): [number, number] => {
  const ages = text(value).match(/\d+/g)?.map(Number) ?? [];
  return ages.length >= 2 ? [ages[0], ages[1]] : ages.length === 1 ? [ages[0], ages[0]] : [0, 99];
};

export function normalizeOntongYouth(payload: unknown): YouthPolicyReference[] {
  const root = (payload && typeof payload === "object" ? payload : {}) as Dict;
  const candidates = list(root.youthPolicyList ?? root.policyList ?? root.items ?? (root.result as Dict | undefined)?.youthPolicyList);
  return candidates.map((item, index) => ({
    id: text(item.bizId ?? item.plcyNo ?? item.id) || `ontong-${index + 1}`,
    name: text(item.polyBizSjnm ?? item.plcyNm ?? item.title),
    organization: text(item.cnsgNmor ?? item.operInstCdNm ?? item.organization),
    description: text(item.polyItcnCn ?? item.plcyExplnCn ?? item.description),
    ageDescription: text(item.ageInfo ?? item.sprtTrgtAgeLmtYn ?? item.ageDescription),
    ageRange: ageRange(item.ageInfo ?? item.sprtTrgtAgeLmtYn ?? item.ageDescription),
    incomeDescription: text(item.earnCndSeCd ?? item.incomeDescription),
    applicationPeriod: text(item.rqutPrdCn ?? item.aplyYmd ?? item.applicationPeriod),
    detailUrl: text(item.rqutUrla ?? item.aplyUrlAddr ?? item.detailUrl),
  })).filter((item) => item.name.length > 0);
}

export function normalizeFinlife(payload: unknown, productType: "DEPOSIT" | "SAVING"): FinancialProductReference[] {
  const root = (payload && typeof payload === "object" ? payload : {}) as Dict;
  const result = (root.result && typeof root.result === "object" ? root.result : {}) as Dict;
  const baseList = list(result.baseList);
  const optionList = list(result.optionList);

  return baseList.map((base) => {
    const code = text(base.fin_prdt_cd);
    const options = optionList.filter((option) => text(option.fin_prdt_cd) === code);
    const representative = [...options].sort((a, b) => number(b.save_trm) - number(a.save_trm))[0] ?? {};
    return {
      id: `finlife-${text(base.fin_co_no)}-${code}`,
      productCode: code,
      providerCode: text(base.fin_co_no),
      name: text(base.fin_prdt_nm),
      provider: text(base.kor_co_nm),
      productType,
      burdenLevel: (number(base.max_limit) <= 300000 ? "LOW" : number(base.max_limit) <= 600000 ? "MEDIUM" : "HIGH") as FinancialProductReference["burdenLevel"],
      joinWay: text(base.join_way),
      maturityMonths: number(representative.save_trm),
      baseRate: number(representative.intr_rate),
      maxRate: number(representative.intr_rate2),
      maxMonthlyDeposit: number(base.max_limit),
      disclosureMonth: text(base.dcls_month),
      detailUrl: text(base.fin_co_subm_day),
    };
  }).filter((item) => item.name.length > 0 && item.productCode.length > 0);
}

export const PRODUCT_BOUNDARIES: ProductBoundary[] = [
  { id: "STABLE", label: "안정형", description: "짧은 만기와 낮은 월 납입 부담을 우선합니다.", allowedProductTypes: ["DEPOSIT"], maxMaturityMonths: 12, maxMonthlyDeposit: 300000 },
  { id: "BALANCED", label: "균형형", description: "예금과 적금을 함께 비교하고 중간 수준의 납입 부담을 허용합니다.", allowedProductTypes: ["DEPOSIT", "SAVING"], maxMaturityMonths: 24, maxMonthlyDeposit: 600000 },
  { id: "GOAL_FOCUSED", label: "목표집중형", description: "장기 목표 달성을 위해 더 긴 만기와 높은 납입 한도를 허용합니다.", allowedProductTypes: ["SAVING"], maxMaturityMonths: 36, maxMonthlyDeposit: 1000000 },
];

export function selectProductsByBoundary(products: FinancialProductReference[], boundaryId: string): FinancialProductReference[] {
  const boundary = PRODUCT_BOUNDARIES.find((item) => item.id === boundaryId) ?? PRODUCT_BOUNDARIES[1];
  return products.filter((product) =>
    boundary.allowedProductTypes.includes(product.productType) &&
    product.maturityMonths <= boundary.maxMaturityMonths &&
    product.maxMonthlyDeposit <= boundary.maxMonthlyDeposit,
  );
}
