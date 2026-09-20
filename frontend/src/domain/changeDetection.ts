/**
 * 월간 변화 감지 · INFO / ADJUSTMENT / RISK 분류 · 위험 상담 케이스 생성
 *
 * - 결측 월은 0원 소득으로 보지 않는다. 데이터 결측은 별도 INFO 이벤트로 알린다.
 * - 복합 이벤트에서도 RISK가 하나라도 있으면 전체 등급은 RISK이다.
 */

import type {
  ChangeEventV1,
  ConsultationCaseV1,
  CustomerProfile,
  DiagnosisMetrics,
  EventType,
  MockGoal,
  MonthlyAggregate,
  PlanProposal,
} from "../data/apiContracts";
import { addMonthsToMonth, dateAtAge, kstTimestamp } from "./dateUtils";
import { RULE_CONFIG, RULE_VERSION, floorToUnit, formatWon, roundWon } from "./ruleConfig";

const SEVERITY_RANK: Record<EventType, number> = { INFO: 0, ADJUSTMENT: 1, RISK: 2 };

export const overallEventType = (events: ChangeEventV1[]): EventType =>
  events.reduce<EventType>((acc, event) => (SEVERITY_RANK[event.type] > SEVERITY_RANK[acc] ? event.type : acc), "INFO");

export interface ChangeDetectionInput {
  customer: CustomerProfile;
  customerChanges: Partial<Pick<CustomerProfile, "residenceRegion" | "residenceDistrict" | "employmentType">>;
  /** 과거 + 점검 월을 모두 포함한 월별 집계 */
  monthly: MonthlyAggregate[];
  reviewMonth: string;
  dataAsOf: string;
}

export interface ChangeDetectionResult {
  events: ChangeEventV1[];
  /** 급여 인상 규칙이 제안한 월 저축 증액 후보 (없으면 null) */
  salaryRiseSavingsIncrease: number | null;
}

export function detectMonthlyChanges(input: ChangeDetectionInput): ChangeDetectionResult {
  const { customer, reviewMonth, dataAsOf } = input;
  const events: ChangeEventV1[] = [];
  let salaryRiseSavingsIncrease: number | null = null;
  const event = (e: Omit<ChangeEventV1, "id" | "ruleVersion" | "dataAsOf">): ChangeEventV1 => ({
    id: `evt-${customer.id}-${reviewMonth}-${e.ruleId}`,
    ruleVersion: RULE_VERSION,
    dataAsOf,
    ...e,
  });

  const series = input.monthly.filter((m) => m.month <= reviewMonth);
  const current = series.find((m) => m.month === reviewMonth);
  const history = series.filter((m) => m.month < reviewMonth && !m.isGap);
  const baseline = history.slice(-3);

  if (!current || current.isGap) {
    events.push(
      event({
        ruleId: "CHG-DATA-GAP",
        type: "INFO",
        title: "이번 달 데이터 수집 불완전",
        message: `${reviewMonth} 거래를 수집하지 못해 변화 판단을 보류합니다. 소득을 0원으로 간주하지 않으며 다음 수집에서 다시 확인합니다.`,
        metric: "데이터 완전성",
        oldValue: "수집 완료",
        newValue: "수집 실패",
        evidence: { months: [reviewMonth], transactionIds: [] },
        suggestedAction: "MAINTAIN",
      }),
    );
  } else {
    const baselineIncome = baseline.length ? roundWon(baseline.reduce((acc, m) => acc + (m.income ?? 0), 0) / baseline.length) : null;
    const baselineMonths = baseline.map((m) => m.month);

    // 소득 단절: 최근 연속 미입금 월 수 (결측 월은 건너뛰지 않고 연속을 끊는다)
    let stopStreak = 0;
    for (let i = series.length - 1; i >= 0 && !series[i].isGap && series[i].salary === 0; i -= 1) stopStreak += 1;
    const hadSalary = history.some((m) => (m.salary ?? 0) > 0);

    if (hadSalary && stopStreak >= RULE_CONFIG.incomeStopRiskMonths) {
      events.push(
        event({
          ruleId: "CHG-INCOME-STOP",
          type: "RISK",
          title: "소득 단절 감지",
          message: `${stopStreak}개월 연속 급여·사업소득 입금이 확인되지 않습니다. 납입 조정·유예와 실업 관련 제도 확인이 필요합니다.`,
          metric: "월 급여·사업소득",
          oldValue: baselineIncome,
          newValue: 0,
          evidence: { months: series.slice(-stopStreak).map((m) => m.month), transactionIds: [] },
          suggestedAction: "CONSULT_REQUIRED",
        }),
      );
    } else if (hadSalary && stopStreak === 1) {
      events.push(
        event({
          ruleId: "CHG-INCOME-MISSED",
          type: "ADJUSTMENT",
          title: "이번 달 급여 미입금",
          message: `${reviewMonth} 급여·사업소득 입금이 없습니다. 지급일 변경인지 확인하고, 다음 달에도 없으면 위험으로 전환합니다.`,
          metric: "월 급여·사업소득",
          oldValue: baselineIncome,
          newValue: 0,
          evidence: { months: [reviewMonth], transactionIds: [] },
          suggestedAction: "RECALCULATE",
        }),
      );
    } else if (baselineIncome !== null && baselineIncome > 0 && current.income !== null) {
      const dropRatio = (baselineIncome - current.income) / baselineIncome;
      if (dropRatio >= RULE_CONFIG.incomeDropAdjustRatio) {
        const isRisk = dropRatio >= RULE_CONFIG.incomeDropRiskRatio;
        events.push(
          event({
            ruleId: isRisk ? "CHG-INCOME-DROP-RISK" : "CHG-INCOME-DROP",
            type: isRisk ? "RISK" : "ADJUSTMENT",
            title: isRisk ? "소득 급감 감지" : "소득 감소 감지",
            message: `이번 달 소득 ${formatWon(current.income)}이 직전 ${baseline.length}개월 평균 ${formatWon(baselineIncome)}보다 ${Math.round(dropRatio * 100)}% 줄었습니다. 저축 납입액 하향 조정이 필요합니다.`,
            metric: "월 소득",
            oldValue: baselineIncome,
            newValue: current.income,
            evidence: { months: [...baselineMonths, reviewMonth], transactionIds: [] },
            suggestedAction: isRisk ? "CONSULT_REQUIRED" : "RECALCULATE",
          }),
        );
      }
    }

    // 급여 인상: 최근 N개월 연속 기준월 대비 5% 이상
    const recent = series.slice(-(RULE_CONFIG.salaryRiseMonths + 1));
    if (recent.length === RULE_CONFIG.salaryRiseMonths + 1 && recent.every((m) => !m.isGap)) {
      const base = recent[0].salary ?? 0;
      const raised = recent.slice(1);
      if (base > 0 && raised.every((m) => (m.salary ?? 0) >= base * (1 + RULE_CONFIG.salaryRiseRatio))) {
        const increase = roundWon(raised.reduce((acc, m) => acc + (m.salary ?? 0), 0) / raised.length) - base;
        salaryRiseSavingsIncrease = floorToUnit(increase * RULE_CONFIG.salaryRiseSavingsShare);
        events.push(
          event({
            ruleId: "CHG-SALARY-RISE",
            type: "ADJUSTMENT",
            title: "급여 인상 확인",
            message: `${RULE_CONFIG.salaryRiseMonths}개월 연속 급여가 ${formatWon(base)}보다 ${Math.round(RULE_CONFIG.salaryRiseRatio * 100)}% 이상 많습니다. 증가분 ${formatWon(increase)} 중 ${Math.round(RULE_CONFIG.salaryRiseSavingsShare * 100)}%인 ${formatWon(salaryRiseSavingsIncrease)}을 저축 증액 후보로 제안합니다.`,
            metric: "월 급여",
            oldValue: base,
            newValue: base + increase,
            evidence: { months: recent.map((m) => m.month), transactionIds: [] },
            suggestedAction: "RECALCULATE",
          }),
        );
      }
    }

    // 지출 급증
    const spend = (m: MonthlyAggregate) => (m.fixed ?? 0) + (m.variable ?? 0) + (m.irregular ?? 0);
    const baselineSpend = baseline.length ? roundWon(baseline.reduce((acc, m) => acc + spend(m), 0) / baseline.length) : null;
    if (baselineSpend !== null && baselineSpend > 0) {
      const diff = spend(current) - baselineSpend;
      if (diff >= RULE_CONFIG.expenseSpikeMinAmount && diff / baselineSpend >= RULE_CONFIG.expenseSpikeRatio) {
        events.push(
          event({
            ruleId: "CHG-EXPENSE-SPIKE",
            type: "ADJUSTMENT",
            title: "지출 급증 감지",
            message: `이번 달 지출이 직전 평균보다 ${formatWon(diff)} 늘어 저축 여력이 줄었습니다.`,
            metric: "월 지출",
            oldValue: baselineSpend,
            newValue: spend(current),
            evidence: { months: [...baselineMonths, reviewMonth], transactionIds: [] },
            suggestedAction: "RECALCULATE",
          }),
        );
      }
    }

    // 필수 지출·부채가 소득을 초과 (비정기 지출 제외)
    const coreBalance = (current.income ?? 0) - (current.fixed ?? 0) - (current.variable ?? 0) - (current.debt ?? 0);
    if (coreBalance < 0) {
      events.push(
        event({
          ruleId: "CHG-NEGATIVE-SURPLUS",
          type: "RISK",
          title: "필수 지출이 소득 초과",
          message: `이번 달 고정·변동 지출과 부채 상환이 소득보다 ${formatWon(-coreBalance)} 많습니다. 연체 위험이 있어 상담 검토가 필요합니다.`,
          metric: "월 저축 여력",
          oldValue: null,
          newValue: coreBalance,
          evidence: { months: [reviewMonth], transactionIds: [] },
          suggestedAction: "CONSULT_REQUIRED",
        }),
      );
    }

    // 월세 변경 → 거주지 기준 정책 재확인
    const prevRent = [...history].reverse().find((m) => m.rentPayment !== null)?.rentPayment ?? null;
    if (prevRent !== null && current.rentPayment !== null && prevRent !== current.rentPayment) {
      events.push(
        event({
          ruleId: "CHG-RENT-CHANGE",
          type: "ADJUSTMENT",
          title: "월세 이체액 변경",
          message: `월세가 ${formatWon(prevRent)}에서 ${formatWon(current.rentPayment)}로 바뀌었습니다. 이사 여부와 주거 지원제도 자격을 다시 확인합니다.`,
          metric: "월세",
          oldValue: prevRent,
          newValue: current.rentPayment,
          evidence: { months: [reviewMonth], transactionIds: [] },
          suggestedAction: "RECALCULATE",
        }),
      );
    }
  }

  if (input.customerChanges.residenceRegion !== undefined && input.customerChanges.residenceRegion !== customer.residenceRegion) {
    events.push(
      event({
        ruleId: "CHG-RESIDENCE",
        type: "ADJUSTMENT",
        title: "거주지 변경",
        message: `거주지가 ${customer.residenceRegion ?? "미확인"}에서 ${input.customerChanges.residenceRegion ?? "미확인"}로 바뀌어 지역 정책 자격을 다시 판정합니다.`,
        metric: "거주지",
        oldValue: customer.residenceRegion,
        newValue: input.customerChanges.residenceRegion ?? null,
        evidence: { months: [reviewMonth], transactionIds: [] },
        suggestedAction: "RECALCULATE",
      }),
    );
  }

  // 청년 연령 요건 종료 사전 안내
  if (customer.birthDate) {
    // PRD 기준: 만 34세 도달 6개월 전부터 안내 (만 34세 이하 대상 제도는 만 35세 전까지 가입 가능)
    const limitDate = dateAtAge(customer.birthDate, RULE_CONFIG.youthAgeLimit);
    const noticeFrom = `${addMonthsToMonth(limitDate.slice(0, 7), -RULE_CONFIG.youthAgeNoticeMonths)}${limitDate.slice(7)}`;
    if (dataAsOf >= noticeFrom && dataAsOf < limitDate) {
      events.push(
        event({
          ruleId: "CHG-AGE-LIMIT",
          type: "INFO",
          title: "청년 연령 요건 종료 임박",
          message: `${limitDate}에 만 ${RULE_CONFIG.youthAgeLimit}세가 됩니다. 만 ${RULE_CONFIG.youthAgeLimit}세 이하 대상 청년 상품·제도는 요건이 끝나기 전에 가입 여부를 확인하세요.`,
          metric: "만 나이",
          oldValue: customer.age,
          newValue: `${limitDate} 만 ${RULE_CONFIG.youthAgeLimit}세`,
          evidence: { months: [reviewMonth], transactionIds: [] },
          suggestedAction: "MAINTAIN",
        }),
      );
    }
  }

  if (!events.some((e) => e.type !== "INFO" || e.ruleId === "CHG-DATA-GAP")) {
    events.unshift(
      event({
        ruleId: "CHG-STABLE",
        type: "INFO",
        title: "재무 상태 안정",
        message: "소득과 주요 지출에 기준 이상의 변화가 없습니다. 기존 계획을 유지합니다.",
        metric: "재무 지표",
        oldValue: "안정",
        newValue: "안정",
        evidence: { months: [reviewMonth], transactionIds: [] },
        suggestedAction: "MAINTAIN",
      }),
    );
  }

  events.sort((a, b) => SEVERITY_RANK[b.type] - SEVERITY_RANK[a.type] || (a.ruleId < b.ruleId ? -1 : a.ruleId > b.ruleId ? 1 : 0));
  return { events, salaryRiseSavingsIncrease };
}

export function buildConsultationCase(input: {
  customer: CustomerProfile;
  events: ChangeEventV1[];
  currentMonth: MonthlyAggregate;
  emergencyFundBalance: DiagnosisMetrics["emergencyFundBalance"];
  goals: MockGoal[];
  previousPlan: PlanProposal;
  proposedPlan: PlanProposal | null;
  reviewMonth: string;
}): ConsultationCaseV1 | null {
  const risks = input.events.filter((e) => e.type === "RISK");
  if (!risks.length) return null;
  const critical = risks.some((e) => e.ruleId === "CHG-INCOME-STOP" || e.ruleId === "CHG-NEGATIVE-SURPLUS");
  const m = input.currentMonth;
  const delayed = input.proposedPlan?.allocations.filter((a) => a.feasibility !== "ON_TRACK" && a.feasibility !== "ACHIEVED") ?? [];
  return {
    id: `case-${input.customer.id}-${input.reviewMonth}`,
    riskEventIds: risks.map((e) => e.id),
    customerId: input.customer.id,
    customerName: input.customer.name,
    riskType: risks.map((e) => e.title).join(" · "),
    severity: critical ? "CRITICAL" : "HIGH",
    briefing: {
      coreRisk: risks.map((e) => e.message).join(" "),
      financialState: `이번 달 기준 소득 ${formatWon(m.income)}, 고정 ${formatWon(m.fixed)}, 변동 ${formatWon(m.variable)}, 비정기 ${formatWon(m.irregular)}, 부채 상환 ${formatWon(m.debt)}, 월 저축 여력 ${formatWon(m.surplus)}, 비상자금 ${formatWon(input.emergencyFundBalance)}.`,
      impactOnGoals: `기존 계획 월 ${formatWon(input.previousPlan.totalMonthlyAmount)} → 조정안 월 ${formatWon(input.proposedPlan?.totalMonthlyAmount ?? 0)}. ${
        delayed.length ? `지연·보류 목표: ${delayed.map((a) => a.goalTitle).join(", ")}.` : "모든 목표가 기한 내 유지됩니다."
      } 목표 ${input.goals.length}개.`,
      recommendedHumanAction: critical
        ? "납입 유예·축소와 생활비 확보를 우선 상담하고, 부채 상담 지원 제도 확인을 안내하세요."
        : "소득 변동 원인과 지속 여부를 확인하고, 조정안 승인 전 비상자금 사용 계획을 함께 점검하세요.",
    },
    createdAt: kstTimestamp(risks[0].dataAsOf),
    status: "WAITING",
    isMockCase: true,
  };
}
