/**
 * 변경 내역 (필수 흐름 15)
 *
 * 모의 실행 이력과 이번 달 점검에서 감지된 변화를 시간 순으로 보여준다.
 * 모의 실행을 실제 금융 업무 성공으로 표현하지 않는다.
 */

import React from "react";
import { History, PlayCircle } from "lucide-react";
import { useEroomSession } from "../../api/EroomSession";
import { dateText, dateTimeText, won } from "../../api/format";
import { EVENT_LABEL, PLAN_STATUS_LABEL } from "../../api/labels";
import {
  ActionButton,
  Callout,
  EmptyState,
  KeyValueRow,
  Panel,
  SectionHeading,
  StatusChip,
} from "../ui/Primitives";

export const ExecutionHistoryTab: React.FC = () => {
  const { executions, currentPlan, review, consent, setTab } = useEroomSession();

  return (
    <div className="space-y-5">
      <Panel className="p-5" ariaLabelledBy="history-exec">
        <SectionHeading
          id="history-exec"
          title="모의 실행 이력"
          icon={<PlayCircle className="w-5 h-5 text-[#006B5B]" aria-hidden="true" />}
          description="실제 가입·이체는 없습니다. 자동이체를 설정한 것으로 기록만 남깁니다."
        />
        {executions.length === 0 ? (
          <EmptyState
            title="아직 모의 실행 기록이 없습니다"
            description="계획을 승인하고 모의 실행하면 이곳에 기록이 남습니다. 같은 계획을 여러 번 실행해도 중복 기록은 생기지 않습니다."
            action={
              <ActionButton variant="secondary" onClick={() => setTab("goals")}>
                계획 화면으로 가기
              </ActionButton>
            }
          />
        ) : (
          <ul className="space-y-3">
            {executions.map((record) => (
              <li key={record.id} className="rounded-2xl border border-[#DCE7E4] p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <p className="font-extrabold text-[#142B29]">계획 v{record.planVersion} 모의 실행</p>
                  <StatusChip label="모의 실행" tone="positive" />
                </div>
                <p className="text-sm text-[#526562] mt-2 leading-relaxed break-keep">{record.message}</p>
                <div className="mt-2">
                  <KeyValueRow label="실행 시각" value={dateTimeText(record.executedAt)} />
                  <KeyValueRow label="월 납입 합계" value={won(record.totalMonthlyAmount)} />
                  <KeyValueRow label="설정 항목" value={`${record.itemsCount}개 목표`} />
                  <KeyValueRow
                    label="중복 방지 키"
                    value={<span className="font-mono text-[11px] break-all">{record.idempotencyKey}</span>}
                    hint="같은 키의 재실행은 무시됩니다."
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Panel className="p-5" ariaLabelledBy="history-plan">
        <SectionHeading id="history-plan" title="계획 상태" description="승인된 계획은 수정하지 않고 새 버전으로 대체합니다." />
        {currentPlan ? (
          <div>
            <div className="flex flex-wrap items-center gap-2 mb-3">
              <StatusChip
                label={PLAN_STATUS_LABEL[currentPlan.status].label}
                tone={PLAN_STATUS_LABEL[currentPlan.status].tone}
              />
              <span className="text-sm font-bold text-[#142B29]">계획 v{currentPlan.version}</span>
            </div>
            <KeyValueRow label="월 납입 합계" value={won(currentPlan.totalMonthlyAmount)} />
            <KeyValueRow label="남기는 금액" value={won(currentPlan.unallocatedAmount)} />
            <KeyValueRow label="기준 스냅샷" value={<span className="font-mono text-[11px] break-all">{currentPlan.baselineSnapshotId}</span>} />
            <KeyValueRow label="생성 시각" value={dateTimeText(currentPlan.createdAt)} />
          </div>
        ) : (
          <Callout tone="muted">아직 등록한 계획이 없습니다.</Callout>
        )}
      </Panel>

      <Panel className="p-5" ariaLabelledBy="history-events">
        <SectionHeading
          id="history-events"
          title="변화 기록"
          icon={<History className="w-5 h-5 text-[#006B5B]" aria-hidden="true" />}
          description="이번 달 점검에서 감지된 변화입니다."
        />
        {review && review.events.length > 0 ? (
          <ul className="space-y-2">
            {review.events.map((event) => (
              <li key={event.id} className="flex items-start gap-2 py-2 border-b border-[#EDF3F1] last:border-b-0">
                <StatusChip label={EVENT_LABEL[event.type].label} tone={EVENT_LABEL[event.type].tone} />
                <div className="min-w-0">
                  <p className="text-sm font-bold text-[#142B29] break-keep">{event.title}</p>
                  <p className="text-xs text-[#526562] mt-0.5 leading-relaxed break-keep">{event.message}</p>
                  <p className="text-[11px] text-[#7A8B88] mt-1 tabular-nums">데이터 기준일 {dateText(event.dataAsOf)}</p>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState
            title="아직 감지된 변화가 없습니다"
            description="이번 달 점검을 실행하면 소득·지출·정책 변화가 여기에 기록됩니다."
            action={
              <ActionButton variant="secondary" onClick={() => setTab("review")}>
                이번 달 점검 실행하기
              </ActionButton>
            }
          />
        )}
        {consent?.status === "REVOKED" && (
          <Callout tone="attention" title="수집 동의 철회됨">
            {dateTimeText(consent.revokedAt)}에 동의를 철회했습니다. 이후 신규 수집은 진행되지 않습니다.
          </Callout>
        )}
      </Panel>
    </div>
  );
};
