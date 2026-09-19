import { REFERENCE_CATALOG } from "../../frontend/src/fixtures/generated/referenceCatalog";

const errors: string[] = [];
if (REFERENCE_CATALOG.mode !== "mock") errors.push("Bundled catalog must use mock mode.");
if (!REFERENCE_CATALOG.sources.every((source) => source.isMock)) errors.push("Every bundled source must be marked isMock=true.");
if (REFERENCE_CATALOG.youthPolicies.length !== 10) errors.push("Bundled catalog must contain exactly 10 age-varied youth policies.");
if (REFERENCE_CATALOG.financialProducts.filter((item) => item.productType === "DEPOSIT").length !== 10) errors.push("Bundled catalog must contain exactly 10 deposit products.");
if (REFERENCE_CATALOG.financialProducts.filter((item) => item.productType === "SAVING").length !== 10) errors.push("Bundled catalog must contain exactly 10 saving products.");
for (const product of REFERENCE_CATALOG.financialProducts) {
  if (!product.id || !product.name || !product.productCode) errors.push(`Invalid product: ${JSON.stringify(product)}`);
  if (product.maxRate < product.baseRate) errors.push(`${product.id}: maxRate is lower than baseRate.`);
}
if (errors.length) throw new Error(errors.join("\n"));
console.log(`Reference catalog is valid (${REFERENCE_CATALOG.youthPolicies.length} policies, 10 deposits, 10 savings).`);

// 합성 고객 데이터·규칙 엔진·Mock API 계약 검증
await import("./validate-mock-backend");
