import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";
import { createMockApiRouter } from "./mockApi";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT || 3000);

app.use(express.json());

// 외부 API 키 없이 동작하는 합성 데이터 Mock API
app.use("/api/mock", createMockApiRouter());

// Gemini SDK lazy initialization
let genAIClient: GoogleGenAI | null = null;
function getGenAI(): GoogleGenAI | null {
  if (!genAIClient && process.env.GEMINI_API_KEY) {
    try {
      genAIClient = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    } catch (e) {
      console.warn("Failed to initialize GoogleGenAI client:", e);
    }
  }
  return genAIClient;
}

// Health check endpoint
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    service: "iM E-Room Engine API",
    hasApiKey: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// AI Plan Explanation endpoint
// TRD 규정: LLM은 계산을 하지 않고, 확정된 계산 결과(JSON)를 바탕으로 친절한 설명과 변경 이유를 요약함
app.post("/api/explain-plan", async (req, res) => {
  const { customer, changeEvent, oldPlan, newPlan, surplusChange } = req.body;

  const client = getGenAI();
  if (!client) {
    // API 키가 없거나 초기화 실패 시 정형 설명 반환
    return res.json({
      mode: "rule-based",
      summary: `월 가용 여력이 ${surplusChange > 0 ? `+${(surplusChange).toLocaleString()}원 증가` : `${(surplusChange).toLocaleString()}원 변동`}하여 목표별 저축 납입 계획을 재산정했습니다.`,
      reasons: [
        changeEvent?.message || "고객 재무 지표 변화 감지",
        `월 저축 여력: ${oldPlan?.totalMonthlySavings?.toLocaleString()}원 → ${newPlan?.totalMonthlySavings?.toLocaleString()}원`,
        "비상자금 충당 및 정책 금융상품(청년도약계좌 등) 한도 우선 배정",
      ],
      caution: "승인 시 변경된 포트폴리오로 모의 저축 실행이 반영되며, 거절 시 기존 계획이 유지됩니다.",
    });
  }

  try {
    const prompt = `
당신은 iM뱅크의 청년 재무관리 서비스 'iM 이룸'의 AI 설명 어시스턴트입니다.
반드시 아래의 **계산 결과 데이터**에만 기반하여 고객에게 변경 이유와 향후 영향을 친절하고 명확하게 한국어로 설명해주세요.
임의로 숫자를 지어내거나 계산을 바꾸지 마세요.

[고객 정보]
이름: ${customer?.name || "고객"} (만 ${customer?.age || 26}세)
상황 변화: ${changeEvent?.message || "소득/지출 변동"} (유형: ${changeEvent?.type || "ADJUSTMENT"})

[기존 계획]
월 총 저축액: ${oldPlan?.totalMonthlySavings?.toLocaleString() || 0}원
목표 목록: ${JSON.stringify(oldPlan?.items?.map((i: any) => ({ 목표: i.goalTitle, 월납입: i.monthlyAmount })))}

[신규 조정안]
월 총 저축액: ${newPlan?.totalMonthlySavings?.toLocaleString() || 0}원
목표 목록: ${JSON.stringify(newPlan?.items?.map((i: any) => ({ 목표: i.goalTitle, 월납입: i.monthlyAmount })))}
월 여력 변동: ${surplusChange > 0 ? `+${surplusChange.toLocaleString()}원` : `${surplusChange.toLocaleString()}원`}

다음 JSON 형식으로만 응답해주세요:
{
  "summary": "1~2문장의 핵심 요약",
  "reasons": ["변화 이유 1", "배분 변경 이유 2", "목표 달성 효과 3"],
  "caution": "고객이 알아야 할 주의점 또는 선택 안내"
}
`;

    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
      },
    });

    const text = response.text || "{}";
    const parsed = JSON.parse(text);
    return res.json({
      mode: "ai-gemini",
      ...parsed,
    });
  } catch (err: any) {
    console.error("Gemini explain error:", err?.message);
    return res.json({
      mode: "rule-based-fallback",
      summary: `월 가용 여력이 ${surplusChange > 0 ? `+${(surplusChange).toLocaleString()}원 증가` : `${(surplusChange).toLocaleString()}원 변동`}하여 목표별 저축 납입 계획을 재산정했습니다.`,
      reasons: [
        changeEvent?.message || "고객 재무 지표 변화 감지",
        `월 저축 여력: ${oldPlan?.totalMonthlySavings?.toLocaleString()}원 → ${newPlan?.totalMonthlySavings?.toLocaleString()}원`,
        "비상자금 충당 및 정책 금융상품(청년도약계좌 등) 한도 우선 배정",
      ],
      caution: "승인 시 변경된 포트폴리오로 모의 저축 실행이 반영되며, 거절 시 기존 계획이 유지됩니다.",
    });
  }
});

// Q&A endpoint for youth financial policies & savings
app.post("/api/qa", async (req, res) => {
  const { question, context } = req.body;
  const client = getGenAI();

  if (!client) {
    return res.json({
      answer: "현재 AI 답변 서비스는 정형 규칙 모드로 동작 중입니다. 청년도약계좌는 만 19~34세, 개인소득 7,500만원 이하 청년 대상 정부기여금 매칭 적금이며, 대구 청년희망적금은 대구 거주 청년 대상 1:1 매칭 지원 사업입니다. 상세 자격은 [지원제도 센터] 탭에서 확인하실 수 있습니다.",
      source: "정형 정책 데이터베이스",
    });
  }

  try {
    const prompt = `
청년 재무관리 서비스 'iM 이룸'의 정책 Q&A 안내원입니다.
질문: ${question}
참고 맥락: ${JSON.stringify(context || {})}
답변 지침:
1. 친절하고 정확하게 3문장 이내로 핵심만 설명하세요.
2. 정책 지원금이나 금리 등 확실하지 않은 정보는 '신청 시 확인 필요'를 명시하세요.
3. 근거 정책 출처를 함께 밝혀주세요.
`;
    const response = await client.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });
    return res.json({
      answer: response.text || "안내 정보를 불러오지 못했습니다.",
      source: "iM 이룸 AI 정책 안내봇 (Gemini 2.5 Flash)",
    });
  } catch (err) {
    return res.json({
      answer: "청년도약계좌 및 대구 청년희망적금 등 정책 상품은 매월 납입 한도와 거주지 요건에 따라 달라집니다. 시스템 자격 판정 탭에서 본인의 적격 여부를 확인해보세요.",
      source: "규칙 기반 기본 답변",
    });
  }
});

async function startServer() {
  const isProductionBuild =
    process.env.NODE_ENV === "production" || import.meta.url.includes("/dist/server.js");

  if (!isProductionBuild) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[iM E-Room] Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer();
