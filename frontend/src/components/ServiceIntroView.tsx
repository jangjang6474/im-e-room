/**
 * 1) 서비스 소개
 *
 * 일반 접속에서 시나리오 주입·내부 버전·상담사 전환을 노출하지 않는다.
 */

import React from "react";
import { ArrowRight, CalendarCheck, LineChart, ShieldCheck, Sparkles, Users } from "lucide-react";
import { useEroomSession } from "../api/EroomSession";
import { ActionButton, Callout, Panel, SyntheticNotice } from "./ui/Primitives";

const STEPS = [
  {
    icon: <Users className="w-5 h-5" aria-hidden="true" />,
    title: "가상 고객으로 시작",
    body: "가상 데이터로 만든 청년 고객을 고르고 모의 데이터 수집에 동의하면 체험이 시작됩니다. 공모전 체험을 위한 단계입니다.",
  },
  {
    icon: <LineChart className="w-5 h-5" aria-hidden="true" />,
    title: "최근 거래로 3분 재무진단",
    body: "확보된 최근 거래를 분류해 급여·고정·변동·비정기 지출과 월 저축 여력, 새는 돈 후보를 정리합니다.",
  },
  {
    icon: <CalendarCheck className="w-5 h-5" aria-hidden="true" />,
    title: "매달 변화를 보고 계획을 다시 제안",
    body: "소득·지출·정책이 바뀌면 이유와 전후 금액을 보여주고, 승인하기 전까지 기존 계획을 유지합니다.",
  },
];

const PROMISES = [
  "금액과 자격은 같은 조건이면 늘 같은 결과가 나오도록 계산하고, 화면은 그 결과를 그대로 보여줍니다.",
  "확인되지 않은 요건은 충족으로 채우지 않고 ‘서류 확인 필요’로 표시합니다.",
  "승인 전에는 아무것도 실행되지 않습니다. 모든 실행은 모의 실행이며 실제 금융 거래가 없습니다.",
];

export const ServiceIntroView: React.FC = () => {
  const { goToPersonaSelect, personas, pending } = useEroomSession();

  return (
    <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 md:py-12 space-y-8">
      <section className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr] items-start">
        <div className="space-y-5">
          <span className="inline-flex items-center gap-2 text-xs font-extrabold px-3 py-1.5 rounded-full bg-[#EAFBF6] text-[#006B5B] border border-[#B6E7DA]">
            <Sparkles className="w-3.5 h-3.5" aria-hidden="true" />
            가상 데이터 기반 체험 · 실제 금융 거래 없음
          </span>
          <h1 className="text-3xl md:text-[42px] leading-tight font-black text-[#142B29] break-keep">
            상황이 바뀌어도
            <br />
            목표를 포기하지 않도록,
            <br />
            <span className="text-[#006B5B]">매달 다시 계획합니다.</span>
          </h1>
          <p className="text-base text-[#526562] leading-relaxed break-keep">
            iM 이룸은 청년의 최근 거래를 분석해 월 저축 여력을 찾고, 목표별 납입 계획을 만든 뒤 매달 변화를 감지해
            조정안을 제안하는 재무관리 서비스입니다. 이 화면은 실제 금융 거래 없이 가상 데이터로 흐름을 체험하는 화면입니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-3">
            <ActionButton
              onClick={goToPersonaSelect}
              loading={pending.personas}
              icon={<ArrowRight className="w-4 h-4" aria-hidden="true" />}
            >
              가상 고객으로 체험 시작
            </ActionButton>
            <ActionButton variant="ghost" onClick={() => { window.location.search = "?example=true"; }}>
              24개월 적용 예시 보기
            </ActionButton>
          </div>
          <p className="text-xs text-[#526562]">
            체험 가능한 가상 고객 {personas.length > 0 ? `${personas.length}명` : "준비 중"} · 실제 금융 거래는 일어나지 않습니다.
          </p>
        </div>

        <Panel className="p-5 md:p-6 space-y-4">
          <h2 className="font-extrabold text-[#142B29] flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-[#006B5B]" aria-hidden="true" />
            이 체험판의 약속
          </h2>
          <ul className="space-y-3">
            {PROMISES.map((item) => (
              <li key={item} className="text-sm text-[#526562] leading-relaxed flex gap-2">
                <span aria-hidden="true" className="text-[#00C4A6] font-black">
                  ·
                </span>
                {item}
              </li>
            ))}
          </ul>
          <Callout tone="muted">
            <SyntheticNotice />
          </Callout>
        </Panel>
      </section>

      <section aria-labelledby="intro-steps">
        <h2 id="intro-steps" className="text-xl font-extrabold text-[#142B29] mb-4">
          체험은 이렇게 진행됩니다
        </h2>
        <ol className="grid gap-4 md:grid-cols-3">
          {STEPS.map((step, index) => (
            <li key={step.title}>
              <Panel className="p-5 h-full">
                <div className="flex items-center gap-2 text-[#006B5B] font-extrabold text-sm">
                  <span className="w-7 h-7 rounded-full bg-[#EAFBF6] border border-[#B6E7DA] inline-flex items-center justify-center tabular-nums">
                    {index + 1}
                  </span>
                  {step.icon}
                </div>
                <h3 className="mt-3 font-extrabold text-[#142B29]">{step.title}</h3>
                <p className="mt-2 text-sm text-[#526562] leading-relaxed break-keep">{step.body}</p>
              </Panel>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
};
