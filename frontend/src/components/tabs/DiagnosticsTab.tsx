/**
 * 재무진단 결과
 *
 * 결론을 먼저 보여주고, 급여·고정·변동·비정기 지출은 간단한 세로 요약으로 정리한다.
 * 거래 수·분석 기간·데이터 완전성·결측 월·제외된 내부이체는 "분석 근거 보기"로 접는다.
 * 새는 돈은 확정 사실이 아니라 "확인 후보"로 표시한다.
 *
 * 모든 값은 진단 응답을 그대로 표시한다. 화면에서 다시 계산하지 않는다.
 */

import React, { useState } from "react";
import { AlertTriangle, CheckCircle2, Info, Wallet } from "lucide-react";
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
  Disclosure,
  HeadlineCard,
  LoadingBlock,
  Section,
  StatusChip,
  SummaryRow,
} from "../ui/Primitives";

export const DiagnosticsTab: React.FC = () => {
  const { diagnosis, pending } = useEroomSession();
  const [showTransactions, setShowTransactions] = useState(false);

  if (pending.session && !diagnosis) return <LoadingBlock label="재무진단 결과를 불러오는 중입니다." rows={4} />;
  if (!diagnosis) return null;

  const { window: analysisWindow, metrics, monthly, leakageCandidates } = diagnosis;
  const completeness = COMPLETENESS_LABEL[analysisWindow.completeness];
  const surplus = metrics.availableSurplus;

  /* 결론 문장. 금액은 응답 값을 그대로 쓰고 부호만 보고 문장을 고른다. */
  const headline =
    surplus === null
      ? "저축할 수 있는 금액을 계산하지 못했어요."
      : surplus < 0
        ? `이번 진단에서는 매달 ${won(Math.abs(surplus))}이 모자랍니다.`
        : `매달 ${won(surplus)}을 저축할 수 있어요.`;
  const headlineDescription =
    surplus === null
      ? "분석에 쓸 거래가 부족해 값을 채우지 않았습니다."
      : surplus < 0
        ? "들어오는 돈보다 나가는 돈이 많은 달입니다. 아래 지출 구성을 함께 확인하세요."
        : "들어오는 돈에서 고정·변동·비정기 지출과 부채 상환을 뺀 금액입니다.";

  const visibleTransactions = [...diagnosis.transactions]
    .sort((a, b) => (a.postedAt < b.postedAt ? 1 : -1))
    .slice(0, showTransactions ? 30 : 6);

  return (
    <div className="space-y-6">
      {/* 결론 먼저 */}
      <HeadlineCard
        statusLabel="재무진단 결과"
        headline={headline}
        description={headlineDescription}
        tone={surplus !== null && surplus >= 0 ? "positive" : "attention"}
        icon={
          surplus !== null && surplus >= 0 ? (
            <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
          ) : (
            <AlertTriangle className="w-4 h-4" aria-hidden="true" />
          )
        }
        meta={`데이터 기준일 ${dateText(diagnosis.asOf)}`}
      />

      {leakageCandidates.length > 0 && (
        <Callout tone="attention" title="확인이 필요한 지출 후보가 있어요" icon={<Info className="w-4 h-4" aria-hidden="true" />}>
          반복 지출 {leakageCandidates.length}건이 실제로 쓰는 돈인지 확인이 필요합니다. 확정된 낭비가 아니라 후보입니다.
        </Callout>
      )}

      {/* 들어오는 돈 · 나가는 돈 세로 요약 */}
      <Section id="diag-flow" title="들어오는 돈" description="결측 월을 제외한 월평균입니다.">
        <SummaryRow label="급여" value={won(metrics.monthlySalary)} />
        <SummaryRow label="기타 소득" value={won(metrics.monthlyOtherIncome)} />
        <SummaryRow label="합계" value={won(metrics.monthlyIncome)} tone="strong" />
      </Section>

      <Section id="diag-out" title="나가는 돈">
        <SummaryRow label="고정 지출" value={won(metrics.fixedExpenses)} />
        <SummaryRow label="변동 지출" value={won(metrics.variableExpenses)} />
        <SummaryRow label="비정기 지출 (월 환산)" value={won(metrics.irregularExpensesMonthly)} />
        <SummaryRow label="부채 상환" value={won(metrics.debtPayment)} />
        <SummaryRow label="저축할 수 있는 돈" value={won(surplus)} tone="strong" />
      </Section>

      <Section id="diag-emergency" title="비상자금" description="갑작스러운 지출에 대비하는 돈입니다.">
        <SummaryRow label="지금 모아둔 금액" value={won(metrics.emergencyFundBalance)} />
        <SummaryRow label="권장 금액" value={won(metrics.recommendedEmergencyFund)} />
      </Section>

      {/* 새는 돈 = 확인 후보 */}
      <Section
        id="diag-leakage"
        title="확인 후보"
        description="확정된 낭비가 아닙니다. 실제로 쓰지 않는 지출인지 직접 확인해 주세요."
      >
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
                  <StatusChip label="확인 후보" tone="attention" />
                </div>
                <p className="text-base font-extrabold text-[#142B29] mt-2 tabular-nums">
                  월 {won(candidate.estimatedMonthlyCost)}
                </p>
                <p className="text-sm text-[#526562] mt-1 leading-relaxed break-keep">{candidate.reason}</p>
                <p className="text-[11px] text-[#526562] mt-2 tabular-nums">
                  {CONFIDENCE_LABEL[candidate.confidence].label} · 근거 거래{" "}
                  {candidate.evidenceTransactionIds.length}건
                </p>
              </li>
            ))}
          </ul>
        )}
        {diagnosis.surplusIfLeakageResolved !== null && leakageCandidates.length > 0 && (
          <Callout tone="neutral" className="mt-3">
            후보를 모두 정리하면 저축할 수 있는 돈이 {won(surplus)}에서 {won(diagnosis.surplusIfLeakageResolved)}로 늘어날
            수 있습니다. 확정 금액이 아니라 추정입니다.
          </Callout>
        )}
      </Section>

      {/* 분석 근거 — 기본으로 접어 둔다 */}
      <Section id="diag-evidence" title="분석 근거">
        <div className="space-y-2">
          <Disclosure summary="어떤 거래로 진단했는지 보기">
            <SummaryRow label="분석 기간" value={rangeText(analysisWindow.startAt, analysisWindow.endAt)} />
            <SummaryRow
              label="분석한 거래 수"
              value={`${analysisWindow.transactionCount.toLocaleString("ko-KR")}건`}
            />
            <SummaryRow label="포함된 달" value={`${analysisWindow.monthsCovered}개월`} />
            <SummaryRow label="월평균에 사용한 달" value={`${analysisWindow.monthsUsed}개월`} />
            <SummaryRow
              label="데이터 완전성"
              value={<StatusChip label={completeness.label} tone={completeness.tone} />}
            />
            <SummaryRow
              label="결측 월"
              value={
                analysisWindow.missingMonths.length === 0
                  ? "없음"
                  : analysisWindow.missingMonths.map((month) => monthText(month)).join(", ")
              }
            />
            <SummaryRow label="제외한 중복 거래" value={`${analysisWindow.duplicatesRemoved}건`} />
            <SummaryRow label="제외한 내부 이체" value={`${analysisWindow.internalTransfersExcluded}건`} />
            <p className="text-xs text-[#526562] mt-2 leading-relaxed">{completeness.help}</p>

            {analysisWindow.missingMonths.length > 0 && (
              <Callout tone="attention" title="수집하지 못한 달" className="mt-3" icon={<AlertTriangle className="w-4 h-4" aria-hidden="true" />}>
                해당 달 자료를 가져오지 못해 월평균에서 제외했습니다. 부족한 값을 0으로 채우지 않았습니다.
              </Callout>
            )}

            {analysisWindow.notes.length > 0 && (
              <ul className="mt-3 space-y-1.5">
                {analysisWindow.notes.map((note) => (
                  <li key={note} className="text-xs text-[#526562] leading-relaxed break-keep">
                    · {note}
                  </li>
                ))}
              </ul>
            )}
          </Disclosure>

          <Disclosure summary="달마다 어떻게 움직였는지 보기">
            <ul className="divide-y divide-[#EDF3F1]">
              {monthly.map((row) => (
                <li key={row.month} className="py-3">
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="font-extrabold text-[#142B29]">
                      {shortMonth(row.month)}
                      {row.isGap && <span className="ml-2 text-[11px] font-bold text-[#9A3412]">수집 실패</span>}
                    </p>
                    <p className="text-sm font-extrabold tabular-nums">남은 돈 {won(row.surplus)}</p>
                  </div>
                  <p className="text-xs text-[#526562] mt-1 tabular-nums leading-relaxed">
                    소득 {won(row.income)} · 고정 {won(row.fixed)} · 변동 {won(row.variable)} · 비정기{" "}
                    {won(row.irregular)}
                  </p>
                </li>
              ))}
            </ul>
          </Disclosure>

          <Disclosure summary="분류된 거래 보기">
            <p className="text-xs text-[#526562] leading-relaxed mb-2">
              내부 이체와 카드 대금은 소득·지출 합계에서 제외됩니다.
            </p>
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
              <ActionButton variant="ghost" full onClick={() => setShowTransactions((prev) => !prev)}>
                {showTransactions ? "거래 목록 접기" : `더 보기 (전체 ${diagnosis.transactions.length}건)`}
              </ActionButton>
            </div>
          </Disclosure>
        </div>

        <p className="text-[11px] text-[#526562] mt-3 leading-relaxed flex items-start gap-1.5">
          <Wallet className="w-3.5 h-3.5 mt-0.5 shrink-0" aria-hidden="true" />
          고정된 기간이 아니라 실제로 확보된 최근 거래를 분석했습니다.
        </p>
      </Section>
    </div>
  );
};
