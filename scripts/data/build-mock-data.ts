import path from "node:path";
import { mkdir, writeFile } from "node:fs/promises";
import { normalizeFinlife, normalizeOntongYouth } from "../../frontend/src/data/adapters";
import type { ReferenceCatalog } from "../../frontend/src/data/contracts";
import { generatedFile, mockRawDir, readJson } from "./shared";

const generatedAt = "2026-09-19T00:00:00+09:00";
const ontongUrl = "https://www.youthcenter.go.kr/opi/youthPlcyList.do";
const finlifeUrl = "https://finlife.fss.or.kr/finlifeapi";

const catalog: ReferenceCatalog = {
  generatedAt,
  mode: "mock",
  sources: [
    { source: "ONTONG_YOUTH", sourceUrl: ontongUrl, schemaVersion: "1.0", collectedAt: generatedAt, isMock: true },
    { source: "FINLIFE", sourceUrl: finlifeUrl, schemaVersion: "1.0", collectedAt: generatedAt, isMock: true },
  ],
  youthPolicies: normalizeOntongYouth(await readJson(path.join(mockRawDir, "ontong-youth-policy.json"))),
  financialProducts: [
    ...normalizeFinlife(await readJson(path.join(mockRawDir, "finlife-deposit.json")), "DEPOSIT"),
    ...normalizeFinlife(await readJson(path.join(mockRawDir, "finlife-saving.json")), "SAVING"),
  ],
};

await mkdir(path.dirname(generatedFile), { recursive: true });
await writeFile(
  generatedFile,
  `import type { ReferenceCatalog } from "../../data/contracts";\n\n// Generated file. Edit data/mock/raw and run npm run data:mock.\nexport const REFERENCE_CATALOG: ReferenceCatalog = ${JSON.stringify(catalog, null, 2)};\n`,
  "utf8",
);
console.log(`Generated offline catalog: ${catalog.youthPolicies.length} youth policies, ${catalog.financialProducts.length} financial products.`);
