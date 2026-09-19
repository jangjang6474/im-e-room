import React, { useState } from "react";
import { useEroom } from "../context/EroomContext";
import { Sparkles, X, Send, BookOpen, Bot, User, Loader2 } from "lucide-react";

export const AiAssistantModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { customer, policies, activePlan } = useEroom();

  const [messages, setMessages] = useState<
    { sender: "user" | "ai"; text: string; source?: string }[]
  >([
    {
      sender: "ai",
      text: `안녕하세요, ${customer.name}님! iM 이룸의 AI 정책 및 금융 가이드입니다. 청년도약계좌, 대구 청년희망적금 자격 요건이나 이번 달 저축 계획에 대해 무엇이든 물어보세요.`,
      source: "iM 이룸 가이드 시스템",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const quickQuestions = [
    "청년도약계좌 가입 조건과 정부 기여금 한도는?",
    "대구 청년희망적금 1:1 매칭 지원금 자격은?",
    "급여가 오르면 왜 비상금과 도약계좌 납입을 늘리나요?",
  ];

  const handleSend = async (queryText?: string) => {
    const textToSend = queryText || input;
    if (!textToSend.trim() || loading) return;

    const userMsg = { sender: "user" as const, text: textToSend };
    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/qa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: textToSend,
          context: {
            customerAge: customer.age,
            residence: customer.residence,
            income: customer.annualIncomeEstimated,
            planVersion: activePlan.version,
            policies: policies.map((p) => ({
              name: p.name,
              limit: p.maxMonthlyDeposit,
              rate: p.maxRate,
              eligibility: p.eligibility,
            })),
          },
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setMessages((prev) => [
          ...prev,
          { sender: "ai", text: data.answer, source: data.source },
        ]);
      } else {
        throw new Error("API failed");
      }
    } catch {
      // Fallback
      setMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: "청년도약계좌는 만 19~34세, 개인소득 7,500만원 이하 청년 대상 정부기여금 매칭 적금이며, 대구 청년희망적금은 대구 거주 청년 대상 1:1 매칭 지원 사업입니다. 상세 자격은 [지원제도 센터] 탭에서 확인하실 수 있습니다.",
          source: "로컬 정형 정책 가이드",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl max-w-xl w-full h-[600px] shadow-2xl border border-[#DCE7E4] flex flex-col overflow-hidden">
        {/* 모달 헤더 */}
        <div className="p-4 bg-[#103D36] text-white flex items-center justify-between border-b border-[#1d5c52]">
          <div className="flex items-center space-x-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#00C4A6] flex items-center justify-center text-[#142B29]">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">iM 이룸 AI 정책 & 계획 가이드</h3>
              <p className="text-[11px] text-[#52E1E5]">
                근거 문서 기반 질의응답 (숫자 임의 계산 배제, Gemini 모델 연계)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* 메시지 영역 */}
        <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#F6F9F8]">
          {messages.map((m, idx) => (
            <div
              key={idx}
              className={`flex items-start space-x-2.5 ${
                m.sender === "user" ? "flex-row-reverse space-x-reverse" : ""
              }`}
            >
              <div
                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs shrink-0 font-bold ${
                  m.sender === "user"
                    ? "bg-[#00C4A6] text-[#142B29]"
                    : "bg-[#103D36] text-[#52E1E5]"
                }`}
              >
                {m.sender === "user" ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className="max-w-[80%] space-y-1">
                <div
                  className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                    m.sender === "user"
                      ? "bg-[#00C4A6] text-[#142B29] font-medium rounded-tr-xs"
                      : "bg-white text-[#142B29] border border-[#DCE7E4] rounded-tl-xs shadow-2xs"
                  }`}
                >
                  {m.text}
                </div>
                {m.source && (
                  <div className="text-[10px] text-[#526562] flex items-center space-x-1 pl-1">
                    <BookOpen className="w-3 h-3 text-[#006B5B]" />
                    <span>출처: {m.source}</span>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex items-center space-x-2 text-xs text-[#526562] pl-10">
              <Loader2 className="w-4 h-4 animate-spin text-[#006B5B]" />
              <span>근거 문서를 검토하여 답변을 생성 중입니다...</span>
            </div>
          )}
        </div>

        {/* 추천 빠른 질문 */}
        <div className="p-2.5 bg-white border-t border-[#DCE7E4] flex flex-wrap gap-1.5">
          {quickQuestions.map((q, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(q)}
              className="text-[11px] px-2.5 py-1 rounded-full bg-[#F6F9F8] border border-[#DCE7E4] text-[#526562] hover:text-[#142B29] hover:bg-[#EAFBF6] hover:border-[#00C4A6] transition-colors"
            >
              {q}
            </button>
          ))}
        </div>

        {/* 입력 영역 */}
        <div className="p-3 bg-white border-t border-[#DCE7E4] flex items-center space-x-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="정책 지원금 조건이나 저축 계획에 대해 질문하세요..."
            className="flex-1 p-2.5 rounded-xl border border-[#DCE7E4] text-xs text-[#142B29] focus:outline-none focus:border-[#00C4A6]"
          />
          <button
            onClick={() => handleSend()}
            disabled={!input.trim() || loading}
            className="p-2.5 rounded-xl bg-[#00C4A6] hover:bg-[#00b095] disabled:bg-slate-100 disabled:text-slate-400 text-[#142B29] font-bold transition-colors"
          >
            <Send className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
