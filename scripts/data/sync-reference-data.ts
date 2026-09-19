import "dotenv/config";
import path from "node:path";
import { rawDir, required, writeJson } from "./shared";

async function fetchJson(url: URL): Promise<unknown> {
  const response = await fetch(url, { headers: { accept: "application/json" } });
  if (!response.ok) throw new Error(`Reference API returned HTTP ${response.status} for ${url.origin}${url.pathname}`);
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("json")) throw new Error(`Expected JSON but received ${contentType || "unknown content type"}. Keep raw XML conversion isolated in a source adapter.`);
  return response.json();
}

const ontongUrl = new URL(process.env.ONTONG_YOUTH_API_URL || "https://www.youthcenter.go.kr/opi/youthPlcyList.do");
ontongUrl.searchParams.set("openApiVlak", required("ONTONG_YOUTH_API_KEY"));
ontongUrl.searchParams.set("pageIndex", "1");
ontongUrl.searchParams.set("display", "100");

const finlifeBase = process.env.FINLIFE_API_BASE_URL || "https://finlife.fss.or.kr/finlifeapi";
const finlifeKey = required("FINLIFE_API_KEY");
const finlifeUrl = (kind: "deposit" | "saving") => {
  const url = new URL(`${finlifeBase.replace(/\/$/, "")}/${kind}ProductsSearch.json`);
  url.searchParams.set("auth", finlifeKey);
  url.searchParams.set("topFinGrpNo", "020000");
  url.searchParams.set("pageNo", "1");
  return url;
};

// Secrets are kept only in request URLs and are never logged or written to disk.
const [ontong, deposit, saving] = await Promise.all([fetchJson(ontongUrl), fetchJson(finlifeUrl("deposit")), fetchJson(finlifeUrl("saving"))]);
await Promise.all([
  writeJson(path.join(rawDir, "ontong-youth-policy.json"), ontong),
  writeJson(path.join(rawDir, "finlife-deposit.json"), deposit),
  writeJson(path.join(rawDir, "finlife-saving.json"), saving),
]);
console.log("Saved live reference responses under ignored data/raw/. Review and sanitize before promoting them to mock fixtures.");
