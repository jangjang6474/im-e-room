/**
 * 재무진단 상세 (필수 흐름 4~7)
 *
 * - 분석 기간·거래 수·데이터 완전성
 * - 급여·고정·변동·비정기 지출
 * - 월 저축 여력과 새는 돈 후보
 *
 * 모든 값은 GET /personas/:id/diagnosis 응답을 그대로 표시한다. 화면에서 다시 계산하지 않는다.
 */

import React, { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, ReceiptText } from "lucide-react";
import { useEroomSession } from "../../api/EroomSession";
import { dateText, monthText, rangeText, shortMonth, won } from "../../api/format";
import {
  COMPLETENESS_LABEL,
  CONFIDENCE_LABEL,
  LEAKAGE_TYPE_LABEL,
  TRANSACTION_CLASS_LABEL,
} from "../../api/labels";
import {
  ActionButton,
  Callout,
  KeyValueRow,
  LoadingBlock,
  MetricTile,
  Panel,
  SectionHeading,
  StatusChip,
} from "../ui/Primitives";

export const DiagnosticsTab: React.FC = () => {
  const { diagnosis, pending } = useEroomSession();
  const [showTransactions, setShowTransactions] = useState(false);

  if (pending.session && !diagnosis) return <LoadingBlock label="재무진단 결과를 불러오는 중입니다." rows={4} />;
  if (!diagnosis) return null;

  const { window: analysisWindow, metrics, monthly, leakageCandidates } = diagnosis;
  const completeness = COMPLETENESS_LABEL[analysisWindow.completeness];
  const visibleTransactions = [...diagnosis.transactions]
    .sort((a, b) => (a.postedAt < b.postedAt ? 1 : -1))
    .slice(0, showTransactions ? 30 : 6);

  return (
    <div className="space-y-5">
      {/* 분석 기간 · 거래 수 · 완전성 */}
      <Panel className="p-5" ariaLabelledBy="diag-window">
        <SectionHeading
          id="diag-window"
          title="무엇을 근거로 진단했나요"
          description="고정된 기간이 아니라 실제로 확보된 최근 거래를 사용합니다."
          action={<StatusChip label={`데이터 완전성 ${completeness.label}`} tone={completeness.tone} />}
        />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <MetricTile label="분석 기간" value={rangeText(analysisWindow.startAt, analysisWindow.endAt)} tone="muted" />
          <MetricTile
            label="분석한 거래"
            value={`${analysisWindow.transactionCount.toLocaleString("ko-KR")}건`}
            hint={`중복 ${analysisWindow.duplicatesRemoved}건 제외 · 내부이체 ${analysisWindow.internalTransfersExcluded}건 제외`}
            tone="muted"
          />
          <MetricTile
            label="포함된 달"
            value={`${analysisWindow.monthsCovered}개월`}
            hint={`월평균 계산에 사용한 달 ${analysisWindow.monthsUsed}개월`}
            tone="muted"
          />
          <MetricTile label="데이터 완전성" value={completeness.label} hint={completeness.help} tone={completeness.tone} />
        </div>

        {analysisWindow.missingMonths.length > 0 && (
          <Callout tone="attention" title="수집하지 못한 달" icon={<AlertTriangle className="w-4 h-4" aria-hidden="true" />}>
            {analysisWindow.missingMonths.map((month) => monthText(month)).join(", ")} 자료를 가져오지 못해 월평균에서
            제외했습니다. 부족한 값을 0으로 채우지 않았습니다.
          </Callout>
        )}

        {analysisWindow.notes.length > 0 && (
          <ul className="mt-3 space-y-1.5">
            {analysisWindow.notes.map((note) => (
              <li key={note} className="text-xs text-[#526562] leading-relaxed">
                · {note}
              </li>
            ))}
          </ul>
        )}
      </Panel>

      {/* 소득·지출 구성 */}
      <Panel className="p-5" ariaLabelledBy="diag-metrics">
        <SectionHeading
          id="diag-metrics"
          title="소득과 지출 구성"
          description={`데이터 기준일 ${dateText(diagnosis.asOf)} · 결측 월을 제외한 월평균입니다.`}
        />
        <div className="grid gap-3 md:grid-cols-2">
          <div className="rounded-2xl border border-[#DCE7E4] p-4">
            <p className="text-sm font-extrabold text-[#142B29] mb-2">들어오는 돈</p>
            <KeyValueRow label="급여" value={won(metrics.monthlySalary)} />
            <KeyValueRow label="기타 소득" value={won(metrics.monthlyOtherIncome)} />
            <KeyValueRow label="월 평균 소득" value={won(metrics.monthlyIncome)} />
          </div>
          <div className="rounded-2xl border border-[#DCE7E4] p-4">
            <p className="text-sm font-extrabold text-[#142B29] mb-2">나가는 돈</p>
            <KeyValueRow label="고정 지출" value={won(metrics.fixedExpenses)} hint="월세·통신·보험 등 매달 반복" />
            <KeyValueRow label="변동 지출" value={won(metrics.variableExpenses)} hint="식비·교통·쇼핑 등" />
            <KeyValueRow
              label="비정기 지출 (월 환산)"
              value={won(metrics.irregularExpensesMonthly)}
              hint="경조사·여행·가전처럼 가끔 큰 지출"
            />
            <KeyValueRow label="부채 상환" value={won(metrics.debtPayment)} />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-4">
          <MetricTile
            label="월 저축 여력"
            value={won(metrics.availableSurplus)}
            tone="positive"
            hint="소득 − 고정 − 변동 − 비정기(월 환산) − 부채 상환"
          />
          <MetricTile label="비상자금 잔고" value={won(metrics.emergencyFundBalance)} tone="muted" />
          <MetricTile
            label="권장 비상자금"
            value={won(metrics.recommendedEmergencyFund)}
            tone="neutral"
            hint="고정·변동 지출의 3개월분"
          />
        </div>
      </Panel>

      {/* 월별 흐름 */}
      <Panel className="p-5" ariaLabelledBy="diag-monthly">
        <SectionHeading id="diag-monthly" title="달마다 어떻게 움직였나요" description="수집하지 못한 달은 값을 비워 둡니다." />
        <div className="overflow-x-auto -mx-1 px-1">
          <table className="w-full min-w-[520px] text-sm">
            <caption className="sr-only">월별 소득과 지출 집계</caption>
            <thead>
              <tr className="text-xs text-[#526562] text-left border-b border-[#DCE7E4]">
                <th scope="col" className="py-2 pr-2 font-bold">
                  월
                </th>
                <th scope="col" className="py-2 px-2 font-bold text-right">
                  소득
                </th>
                <th scope="col" className="py-2 px-2 font-bold text-right">
                  고정
                </th>
                <th scope="col" className="py-2 px-2 font-bold text-right">
                  변동
                </th>
                <th scope="col" className="py-2 px-2 font-bold text-right">
                  비정기
                </th>
                <th scope="col" className="py-2 pl-2 font-bold text-right">
                  남은 돈
                </th>
              </tr>
            </thead>
            <tbody>
              {monthly.map((row) => (
                <tr key={row.month} className="border-b border-[#EDF3F1] last:border-b-0">
                  <th scope="row" className="py-2 pr-2 font-bold text-[#142B29] text-left whitespace-nowrap">
                    {shortMonth(row.month)}
                    {row.isGap && <span className="ml-1.5 text-[11px] font-bold text-[#9A3412]">수집 실패</span>}
                  </th>
                  <td className="py-2 px-2 text-right tabular-nums">{won(row.income)}</td>
                  <td className="py-2 px-2 text-right tabular-nums">{won(row.fixed)}</td>
                  <td className="py-2 px-2 text-right tabular-nums">{won(row.variable)}</td>
                  <td className="py-2 px-2 text-right tabular-nums">{won(row.irregular)}</td>
                  <td className="py-2 pl-2 text-right tabular-nums font-bold">{won(row.surplus)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Panel>

      {/* 새는 돈 후보 */}
      <Panel className="p-5" ariaLabelledBy="diag-leakage">
        <SectionHeading
          id="diag-leakage"
          title="새는 돈 후보"
          description="확정이 아니라 후보입니다. 실제로 쓰지 않는 지출인지 직접 확인해 주세요."
        />
        {leakageCandidates.length === 0 ? (
          <Callout tone="positive">반복 지출 중에서 확인이 필요한 후보를 찾지 못했습니다.</Callout>
        ) : (
          <ul className="space-y-3">
            {leakageCandidates.map((candidate) => (
              <li key={candidate.id} className="rounded-2xl border border-[#DCE7E4] p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-extrabold text-[#142B29] break-keep">{candidate.title}</p>
                    <p className="text-xs text-[#526562] mt-0.5">
                      {LEAKAGE_TYPE_LABEL[candidate.type]} · {candidate.counterparty}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    <StatusChip label="확인 필요" tone="attention" />
                    <StatusChip
                      label={CONFIDENCE_LABEL[candidate.confidence].label}
                      tone={CONFIDENCE_LABEL[candidate.confidence].tone}
                    />
                  </div>
                </div>
                <p className="text-sm text-[#526562] mt-2 leading-relaxed break-keep">{candidate.reason}</p>
                <p className="text-sm font-bold text-[#142B29] mt-2 tabular-nums">
                  월 {won(candidate.estimatedMonthlyCost)} · 근거 거래 {candidate.evidenceTransactionIds.length}건
                </p>
              </li>
            ))}
          </ul>
        )}
        {diagnosis.surplusIfLeakageResolved !== null && leakageCandidates.length > 0 && (
          <Callout tone="neutral" title="후보를 모두 정리한다면">
            월 저축 여력이 {won(metrics.availableSurplus)}에서 {won(diagnosis.surplusIfLeakageResolved)}로 늘어날 수
            있습니다. 확정 금액이 아니라 후보를 정리했을 때의 추정입니다.
          </Callout>
        )}
      </Panel>

      {/* 거래 내역 */}
      <Panel className="p-5" ariaLabelledBy="diag-transactions">
        <SectionHeading
          id="diag-transactions"
          title="분류된 거래"
          icon={<ReceiptText className="w-5 h-5 text-[#006B5B]" aria-hidden="true" />}
          description="규칙 엔진이 분류한 결과입니다. 내부 이체와 카드 대금은 소득·지출 합계에서 제외됩니다."
        />
        <ul className="divide-y divide-[#EDF3F1]">
          {visibleTransactions.map((transaction) => {
            const classLabel = TRANSACTION_CLASS_LABEL[transaction.class];
            return (
              <li key={transaction.id} className="py-3 flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#142B29] truncate">{transaction.counterparty}</p>
                  <p className="text-xs text-[#526562] mt-0.5 tabular-nums">
                    {dateText(transaction.postedAt)} · {transaction.description}
                  </p>
                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                    <StatusChip label={classLabel.label} tone={classLabel.tone} />
                    {transaction.excludedFromTotals && <StatusChip label="합계 제외" tone="muted" />}
                    {transaction.inGapMonth && <StatusChip label="결측 월" tone="attention" />}
                  </div>
                </div>
                <p
                  className={`text-sm font-extrabold tabular-nums shrink-0 ${
                    transaction.direction === "IN" ? "text-[#006B5B]" : "text-[#142B29]"
                  }`}
                >
                  {transaction.direction === "IN" ? "+" : "−"}
                  {won(transaction.amount)}
                </p>
              </li>
            );
          })}
        </ul>
        <div className="mt-3">
          <ActionButton
            variant="ghost"
            onClick={() => setShowTransactions((prev) => !prev)}
            icon={
              showTransactions ? (
                <ChevronUp className="w-4 h-4" aria-hidden="true" />
              ) : (
                <ChevronDown className="w-4 h-4" aria-hidden="true" />
              )
            }
          >
            {showTransactions ? "거래 목록 접기" : `최근 거래 더 보기 (전체 ${diagnosis.transactions.length}건)`}
          </ActionButton>
        </div>
      </Panel>
    </div>
  );
};
