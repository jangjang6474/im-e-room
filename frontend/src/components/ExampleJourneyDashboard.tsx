/**
 * 24개월 적용 예시 대시보드 (`?example=true`)
 *
 * 최종기획서의 2년 관리 여정을 독립 화면으로 보여준다. 수치는 GET /example-journey 응답을 그대로 표시한다.
 */

import React, { useEffect, useMemo, useState } from "react";
import { ArrowLeft, Flag } from "lucide-react";
import { createMockApiClient, type ApiSource } from "../data/mockApiClient";
import type { ExampleJourneyResponse } from "../data/apiContracts";
import { dateText, percent, won } from "../api/format";
import { EVENT_LABEL } from "../api/labels";
import {
  ActionButton,
  Callout,
  ErrorState,
  LoadingBlock,
  MetricTile,
  Panel,
  ProgressBar,
  SectionHeading,
  StatusChip,
  SyntheticNotice,
} from "./ui/Primitives";

export const ExampleJourneyDashboard: React.FC = () => {
  const client = useMemo(() => createMockApiClient({ role: "customer" }), []);
  const [journey, setJourney] = useState<ExampleJourneyResponse | null>(null);
  const [source, setSource] = useState<ApiSource>("server");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedMonth, setSelectedMonth] = useState(0);

  const load = useMemo(
    () => async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await client.getExampleJourney();
        setJourney(result.data);
        setSelectedMonth(result.data.stages[0]?.month ?? 0);
        setSource(result.source);
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "적용 예시를 불러오지 못했습니다.");
      } finally {
        setLoading(false);
      }
    },
    [client],
  );

  useEffect(() => {
    void load();
  }, [load]);

  const selectedStage = journey?.stages.find((stage) => stage.month === selectedMonth) ?? journey?.stages[0];

  return (
    <div className="min-h-screen bg-[#F6F9F8] text-[#142B29]">
      <header className="bg-white border-b border-[#DCE7E4]">
        <div className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-[#00C4A6] text-[#0B2724] font-black flex items-center justify-center">
              iM
            </div>
            <div>
              <p className="font-extrabold leading-tight">iM 이룸 · 24개월 적용 예시</p>
              <p className="text-[11px] text-[#526562] leading-tight">최종기획서 시나리오를 합성 데이터로 재현한 화면</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {source === "offline-fixture" && <StatusChip label="오프라인 체험" tone="attention" />}
            <a
              href="/"
              className="min-h-[44px] px-4 rounded-2xl border border-[#DCE7E4] text-sm font-bold inline-flex items-center gap-2 hover:bg-[#F6F9F8]"
            >
              <ArrowLeft className="w-4 h-4" aria-hidden="true" />
              체험 화면으로
            </a>
          </div>
        </div>
      </header>

      <main className="max-w-[1120px] mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-5">
        {loading && <LoadingBlock label="24개월 적용 예시를 불러오는 중입니다." rows={4} />}
        {error && <ErrorState message={error} onRetry={() => void load()} />}

        {journey && (
          <>
            <Panel className="p-5" ariaLabelledBy="example-baseline">
              <SectionHeading
                id="example-baseline"
                title={`${journey.customer.name} 님의 시작점`}
                description={`만 ${journey.customer.age}세 · ${journey.customer.residenceRegion ?? ""} ${journey.customer.residenceDistrict ?? ""} · ${journey.customer.jobDescription}`}
              />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <MetricTile label="월 소득" value={won(journey.baseline.monthlyIncome)} tone="muted" />
                <MetricTile label="최초 저축 여력" value={won(journey.baseline.initialSurplus)} tone="muted" />
                <MetricTile
                  label="새는 돈 정리"
                  value={won(journey.baseline.leakageMonthly)}
                  tone="attention"
                  hint="후보를 정리했을 때의 추정"
                />
                <MetricTile
                  label="실행 가능 월 금액"
                  value={won(journey.baseline.executableMonthly)}
                  tone="positive"
                  hint={`월세지원 ${won(journey.baseline.rentSupportMonthly)} 포함 가정`}
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-3">
                <MetricTile label="보증금 목표" value={won(journey.baseline.depositTarget)} tone="neutral" />
                <MetricTile label="자기자금 목표" value={won(journey.baseline.depositSelfFundTarget)} tone="neutral" />
                <MetricTile label="대출 활용 가정" value={won(journey.baseline.depositLoanPortion)} tone="muted" />
              </div>
            </Panel>

            <Panel className="p-5" ariaLabelledBy="example-stages">
              <SectionHeading
                id="example-stages"
                title="24개월 동안 일어난 일"
                icon={<Flag className="w-5 h-5 text-[#006B5B]" aria-hidden="true" />}
                description="시점을 선택하면 감지된 변화와 그때 다시 계산한 금액을 확인할 수 있습니다."
              />
              <div className="mb-4">
                <p id="example-stage-selector" className="text-xs font-bold text-[#526562] mb-2">
                  확인할 시점
                </p>
                {/* 가로 스크롤로 숨기지 않고 모든 시점을 그리드로 보여준다 */}
                <div
                  className="grid grid-cols-4 sm:grid-cols-7 gap-2"
                  role="group"
                  aria-labelledby="example-stage-selector"
                >
                  {journey.stages.map((stage) => {
                    const selected = stage.month === selectedStage?.month;
                    return (
                      <button
                        key={stage.month}
                        type="button"
                        aria-pressed={selected}
                        onClick={() => setSelectedMonth(stage.month)}
                        className={`min-h-[44px] rounded-2xl border px-2 text-sm font-extrabold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#006B5B] focus-visible:ring-offset-2 ${
                          selected
                            ? "border-[#006B5B] bg-[#E7F7F3] text-[#005A4D]"
                            : "border-[#DCE7E4] bg-white text-[#526562] hover:bg-[#F6F9F8]"
                        }`}
                      >
                        {stage.month === 0 ? "가입" : `${stage.month}개월`}
                        {selected && <span className="sr-only"> 선택함</span>}
                      </button>
                    );
                  })}
                </div>
              </div>
              {selectedStage && (
                <article
                  key={`${selectedStage.month}-${selectedStage.ruleId}`}
                  className="rounded-2xl border border-[#DCE7E4] p-4"
                  aria-live="polite"
                >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-[#006B5B] tabular-nums">
                          {selectedStage.month}개월차 · {dateText(selectedStage.date)} · {selectedStage.label}
                        </p>
                        <p className="font-extrabold text-[#142B29] mt-1 break-keep">{selectedStage.title}</p>
                      </div>
                      <StatusChip label={EVENT_LABEL[selectedStage.eventType].label} tone={EVENT_LABEL[selectedStage.eventType].tone} />
                    </div>
                    <p className="text-sm text-[#526562] mt-2 leading-relaxed break-keep">{selectedStage.summary}</p>

                    <div className="grid gap-3 md:grid-cols-2 mt-3">
                      <MetricTile label={selectedStage.headlineLabel} value={won(selectedStage.headlineAmount)} tone="positive" />
                      <MetricTile
                        label="이 시점 월 관리 금액"
                        value={won(selectedStage.monthlyManagedAmount)}
                        tone="muted"
                        hint={selectedStage.action}
                      />
                    </div>

                    {selectedStage.allocations.length > 0 && (
                      <ul className="mt-3 space-y-1">
                        {selectedStage.allocations.map((allocation) => (
                          <li
                            key={`${selectedStage.month}-${allocation.goalId}`}
                            className="flex items-center justify-between text-sm border-b border-[#EDF3F1] last:border-b-0 py-1.5"
                          >
                            <span className="text-[#526562]">{allocation.label}</span>
                            <span className="font-bold tabular-nums">{won(allocation.amount)}</span>
                          </li>
                        ))}
                      </ul>
                    )}

                    {selectedStage.details.length > 0 && (
                      <ul className="mt-3 space-y-1">
                        {selectedStage.details.map((detail) => (
                          <li key={`${selectedStage.month}-${detail.label}`} className="text-xs text-[#526562] leading-relaxed">
                            · {detail.label}: {detail.value}
                          </li>
                        ))}
                      </ul>
                    )}

                    <div className="mt-3">
                      <ProgressBar
                        percent={selectedStage.depositProgressPercent}
                        label={`${selectedStage.month}개월차 보증금 자기자금 진행률`}
                      />
                      <p className="text-[11px] text-[#526562] mt-1.5 tabular-nums">
                        보증금 자기자금 {won(selectedStage.depositSavedAmount)} / {won(journey.baseline.depositSelfFundTarget)} ·
                        진행률 {percent(selectedStage.depositProgressPercent)}
                      </p>
                    </div>
                </article>
              )}
            </Panel>

            <Panel className="p-5" ariaLabelledBy="example-assumptions">
              <SectionHeading id="example-assumptions" title="이 예시의 전제" />
              <ul className="space-y-1.5">
                {journey.assumptions.map((assumption) => (
                  <li key={assumption} className="text-sm text-[#526562] leading-relaxed break-keep">
                    · {assumption}
                  </li>
                ))}
              </ul>
              <Callout tone="muted" className="mt-3">
                <SyntheticNotice />
              </Callout>
            </Panel>

            <div className="pb-8">
              <ActionButton variant="ghost" onClick={() => { window.location.href = "/"; }}>
                체험 화면으로 돌아가기
              </ActionButton>
            </div>
          </>
        )}
      </main>
    </div>
  );
};
