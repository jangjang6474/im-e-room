export type ReferenceSource = "ONTONG_YOUTH" | "FINLIFE";

export interface SourceMetadata {
  source: ReferenceSource;
  sourceUrl: string;
  schemaVersion: "1.0";
  collectedAt: string;
  isMock: boolean;
}

export interface YouthPolicyReference {
  id: string;
  name: string;
  organization: string;
  description: string;
  ageDescription: string;
  ageRange: [number, number];
  incomeDescription: string;
  applicationPeriod: string;
  detailUrl: string;
}

export interface FinancialProductReference {
  id: string;
  productCode: string;
  providerCode: string;
  name: string;
  provider: string;
  productType: "DEPOSIT" | "SAVING";
  burdenLevel: "LOW" | "MEDIUM" | "HIGH";
  joinWay: string;
  maturityMonths: number;
  baseRate: number;
  maxRate: number;
  maxMonthlyDeposit: number;
  disclosureMonth: string;
  detailUrl: string;
}

export type ProductBoundaryId = "STABLE" | "BALANCED" | "GOAL_FOCUSED";

export interface ProductBoundary {
  id: ProductBoundaryId;
  label: string;
  description: string;
  allowedProductTypes: Array<FinancialProductReference["productType"]>;
  maxMaturityMonths: number;
  maxMonthlyDeposit: number;
}

export interface ReferenceCatalog {
  generatedAt: string;
  mode: "mock" | "live";
  sources: SourceMetadata[];
  youthPolicies: YouthPolicyReference[];
  financialProducts: FinancialProductReference[];
}
