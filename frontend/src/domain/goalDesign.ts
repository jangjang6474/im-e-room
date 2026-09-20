/**
 * 사용자가 직접 설계하는 목표 입력(드래프트)의 정의와 검증
 *
 * - 이 파일은 금액을 계산하지 않는다. 사용자가 고른 목표를 계약 타입(`MockGoal`)으로 옮기고,
 *   계산 엔진에 넣기 전에 값의 범위와 연결 상품 존재 여부만 확인한다.
 * - 배분액·달성 기간은 지금까지와 같이 `goalPlanner.buildGoalPlan()`이 결정한다.
 * - 같은 입력이면 같은 목표 배열이 나오도록 식별자와 정렬을 고정한다.
 */

import type { MockGoal } from "../data/apiContracts";
import { REFERENCE_CATALOG } from "../fixtures/generated/referenceCatalog";
import { POLICIES_DATA } from "../fixtures/syntheticData";

export type GoalCategory = MockGoal["category"];

/** 목표 설계 화면에서 고를 수 있는 목표 종류 */
export interface GoalTemplate {
  id: string;
  label: string;
  /** 고객 화면 설명 한 줄 */
  description: string;
  category: GoalCategory;
  /** 연결할 정책·상품. 없으면 자유 저축으로 모은다. */
  productId: string | null;
  defaultTargetAmount: number;
  defaultTargetMonths: number;
  /** 금액을 정할 때 참고할 기준 */
  amountHint: string;
  /** 여러 개 만들 수 있는 목표인지 (직접 입력만 허용) */
  repeatable: boolean;
}

/** 목표 설계 입력값. 화면과 계약 사이의 중간 형태이다. */
export interface GoalDraft {
  /** 계획 안에서 목표를 구분하는 값. 기존 목표를 수정하면 원래 식별자를 유지한다. */
  id: string;
  templateId: string;
  title: string;
  category: GoalCategory;
  productId: string | null;
  targetAmount: number;
  currentAmount: number;
  targetMonths: number;
  /** 사용자가 정한 순서. 1이 가장 먼저 모은다. */
  priority: number;
}

export const GOAL_DESIGN_LIMITS = {
  minGoals: 1,
  maxGoals: 5,
  minTargetAmount: 100_000,
  maxTargetAmount: 500_000_000,
  minTargetMonths: 1,
  maxTargetMonths: 120,
  maxTitleLength: 24,
  /** 금액 입력·증감 단위 (만원) */
  amountStep: 10_000,
} as const;

export const GOAL_TEMPLATES: GoalTemplate[] = [
  {
    id: "emergency",
    label: "비상자금",
    description: "갑작스러운 지출에 대비해 가장 먼저 모아 두는 돈입니다.",
    category: "EMERGENCY",
    productId: null,
    defaultTargetAmount: 5_000_000,
    defaultTargetMonths: 12,
    amountHint: "한 달 고정·변동 지출의 3개월치를 권장합니다.",
    repeatable: false,
  },
  {
    id: "doyak",
    label: "청년도약계좌 목돈",
    description: "정부 기여금을 받으며 장기로 모으는 정책 저축입니다.",
    category: "POLICY_SAVINGS",
    productId: "policy-doyak",
    defaultTargetAmount: 12_000_000,
    defaultTargetMonths: 60,
    amountHint: "만기가 길어 기한을 짧게 잡으면 월 납입 부담이 커집니다.",
    repeatable: false,
  },
  {
    id: "daegu-hope",
    label: "대구 청년희망적금",
    description: "대구시가 납입액에 맞춰 함께 적립해 주는 지역 정책 저축입니다.",
    category: "POLICY_SAVINGS",
    productId: "policy-daegu-hope",
    defaultTargetAmount: 2_400_000,
    defaultTargetMonths: 24,
    amountHint: "월 납입 한도가 있어 한도를 넘는 금액은 배분되지 않습니다.",
    repeatable: false,
  },
  {
    id: "housing",
    label: "주택청약",
    description: "청약 자격을 만들기 위해 매달 꾸준히 넣는 돈입니다.",
    category: "HOUSING_SUBSCRIPTION",
    productId: "policy-housing-dream",
    defaultTargetAmount: 2_400_000,
    defaultTargetMonths: 24,
    amountHint: "금액보다 매달 빠짐없이 넣는 것이 더 중요합니다.",
    repeatable: false,
  },
  {
    id: "deposit",
    label: "전월세 보증금",
    description: "독립이나 이사에 필요한 보증금 중 직접 마련할 금액입니다.",
    category: "WEALTH_BUILDING",
    productId: null,
    defaultTargetAmount: 20_000_000,
    defaultTargetMonths: 24,
    amountHint: "대출을 함께 쓸 계획이면 직접 마련할 금액만 적습니다.",
    repeatable: false,
  },
  {
    id: "wealth",
    label: "목돈 마련",
    description: "쓰임을 정해 두지 않고 모으는 목돈입니다.",
    category: "WEALTH_BUILDING",
    productId: null,
    defaultTargetAmount: 10_000_000,
    defaultTargetMonths: 24,
    amountHint: "기한을 늘리면 매달 넣는 금액이 줄어듭니다.",
    repeatable: false,
  },
  {
    id: "custom",
    label: "직접 입력",
    description: "위에 없는 목표를 이름부터 직접 정합니다.",
    category: "WEALTH_BUILDING",
    productId: null,
    defaultTargetAmount: 5_000_000,
    defaultTargetMonths: 12,
    amountHint: "목표 이름과 금액, 기한을 직접 정합니다.",
    repeatable: true,
  },
];

export const findGoalTemplate = (templateId: string): GoalTemplate | null =>
  GOAL_TEMPLATES.find((item) => item.id === templateId) ?? null;

/**
 * 연결 상품으로 종류를 찾지 못한 목표를 어느 종류로 볼지 정한다.
 * 같은 분류에 여러 종류가 있어(예: 전월세 보증금·목돈 마련) 목록 순서로 고르면 엉뚱한 항목이 선택된 것처럼 보인다.
 */
const GENERIC_TEMPLATE_BY_CATEGORY: Record<GoalCategory, string> = {
  EMERGENCY: "emergency",
  POLICY_SAVINGS: "custom",
  HOUSING_SUBSCRIPTION: "housing",
  WEALTH_BUILDING: "wealth",
};

/** 연결 상품이 실제로 있는지 확인한다. 없는 상품은 계산 단계에서 예외가 되므로 먼저 막는다. */
export function productExists(productId: string | null): boolean {
  if (productId === null) return true;
  if (POLICIES_DATA.some((item) => item.id === productId)) return true;
  return REFERENCE_CATALOG.financialProducts.some((item) => item.id === productId);
}

/** 기존 목표(페르소나 가상 데이터 또는 이미 만든 계획)를 설계 화면의 입력값으로 옮긴다. */
export function draftsFromGoals(goals: MockGoal[]): GoalDraft[] {
  return [...goals]
    .sort((a, b) => a.priority - b.priority || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0))
    .map((goal, index) => ({
      id: goal.id,
      templateId:
        GOAL_TEMPLATES.find((item) => item.productId !== null && item.productId === goal.productId)?.id ??
        GENERIC_TEMPLATE_BY_CATEGORY[goal.category],
      title: goal.title,
      category: goal.category,
      productId: goal.productId,
      targetAmount: goal.targetAmount,
      currentAmount: goal.currentAmount,
      targetMonths: goal.targetMonths,
      priority: index + 1,
    }));
}

/** 새 목표 입력값을 만든다. 같은 종류를 두 번 만들지 않도록 식별자는 종류에서 파생한다. */
export function draftFromTemplate(template: GoalTemplate, existing: GoalDraft[]): GoalDraft {
  const sameTemplateCount = existing.filter((item) => item.templateId === template.id).length;
  const id = template.repeatable ? `goal-${template.id}-${sameTemplateCount + 1}` : `goal-${template.id}`;
  return {
    id,
    templateId: template.id,
    title: template.repeatable ? `${template.label} ${sameTemplateCount + 1}` : template.label,
    category: template.category,
    productId: template.productId,
    targetAmount: template.defaultTargetAmount,
    currentAmount: 0,
    targetMonths: template.defaultTargetMonths,
    priority: existing.length + 1,
  };
}

/** 우선순위를 1부터 빈틈없이 다시 매긴다. 표시 순서와 배분 순서를 같게 유지한다. */
export const renumberDrafts = (drafts: GoalDraft[]): GoalDraft[] =>
  drafts.map((draft, index) => ({ ...draft, priority: index + 1 }));

export interface GoalDraftIssue {
  goalId: string;
  field: "title" | "targetAmount" | "currentAmount" | "targetMonths" | "productId";
  message: string;
}

/** 입력값 검증. 계산 전에 호출하며 값을 고치지 않고 문제만 돌려준다. */
export function validateGoalDrafts(drafts: GoalDraft[]): GoalDraftIssue[] {
  const issues: GoalDraftIssue[] = [];
  const limits = GOAL_DESIGN_LIMITS;

  for (const draft of drafts) {
    const title = draft.title.trim();
    if (title.length === 0) {
      issues.push({ goalId: draft.id, field: "title", message: "목표 이름을 입력하세요." });
    } else if (title.length > limits.maxTitleLength) {
      issues.push({
        goalId: draft.id,
        field: "title",
        message: `목표 이름은 ${limits.maxTitleLength}자 이내로 입력하세요.`,
      });
    }

    if (!Number.isInteger(draft.targetAmount)) {
      issues.push({ goalId: draft.id, field: "targetAmount", message: "목표 금액을 숫자로 입력하세요." });
    } else if (draft.targetAmount < limits.minTargetAmount) {
      issues.push({
        goalId: draft.id,
        field: "targetAmount",
        message: `목표 금액은 ${limits.minTargetAmount.toLocaleString("ko-KR")}원 이상으로 정하세요.`,
      });
    } else if (draft.targetAmount > limits.maxTargetAmount) {
      issues.push({
        goalId: draft.id,
        field: "targetAmount",
        message: `목표 금액은 ${limits.maxTargetAmount.toLocaleString("ko-KR")}원까지 정할 수 있습니다.`,
      });
    }

    if (!Number.isInteger(draft.currentAmount) || draft.currentAmount < 0) {
      issues.push({ goalId: draft.id, field: "currentAmount", message: "지금까지 모은 금액을 0원 이상으로 입력하세요." });
    } else if (Number.isInteger(draft.targetAmount) && draft.currentAmount > draft.targetAmount) {
      issues.push({
        goalId: draft.id,
        field: "currentAmount",
        message: "지금까지 모은 금액이 목표 금액보다 많습니다. 목표 금액을 올리거나 모은 금액을 줄이세요.",
      });
    }

    if (!Number.isInteger(draft.targetMonths) || draft.targetMonths < limits.minTargetMonths) {
      issues.push({ goalId: draft.id, field: "targetMonths", message: "목표 기한을 1개월 이상으로 정하세요." });
    } else if (draft.targetMonths > limits.maxTargetMonths) {
      issues.push({
        goalId: draft.id,
        field: "targetMonths",
        message: `목표 기한은 ${limits.maxTargetMonths}개월까지 정할 수 있습니다.`,
      });
    }

    if (!productExists(draft.productId)) {
      issues.push({ goalId: draft.id, field: "productId", message: "연결할 수 있는 상품이 아닙니다." });
    }
  }

  return issues;
}

/** 입력값을 계약 타입으로 옮긴다. 검증을 통과한 값에만 사용한다. */
export const goalsFromDrafts = (drafts: GoalDraft[]): MockGoal[] =>
  renumberDrafts(drafts).map((draft) => ({
    id: draft.id,
    title: draft.title.trim(),
    category: draft.category,
    targetAmount: draft.targetAmount,
    currentAmount: draft.currentAmount,
    targetMonths: draft.targetMonths,
    priority: draft.priority,
    productId: draft.productId,
  }));

/** 두 목표 배열이 계산에 영향을 주는 값에서 같은지 확인한다 (추천을 그대로 쓴 경우를 구분한다). */
export function sameGoals(a: MockGoal[], b: MockGoal[]): boolean {
  if (a.length !== b.length) return false;
  const key = (goal: MockGoal) =>
    [
      goal.id,
      goal.title,
      goal.category,
      goal.targetAmount,
      goal.currentAmount,
      goal.targetMonths,
      goal.priority,
      goal.productId,
    ].join("|");
  const left = [...a].map(key).sort();
  const right = [...b].map(key).sort();
  return left.every((value, index) => value === right[index]);
}

/**
 * 외부에서 받은 목표 배열(요청 본문 등)을 계약 타입으로 정규화한다.
 * 신뢰할 수 없는 입력이므로 형태가 어긋나면 문제 목록을 돌려주고 계산에 넘기지 않는다.
 */
export function parseGoalsPayload(value: unknown): { goals: MockGoal[] } | { errors: string[] } {
  if (!Array.isArray(value)) return { errors: ["목표 목록의 형식이 올바르지 않습니다."] };
  if (value.length < GOAL_DESIGN_LIMITS.minGoals) return { errors: ["목표를 1개 이상 선택하세요."] };
  if (value.length > GOAL_DESIGN_LIMITS.maxGoals) {
    return { errors: [`목표는 최대 ${GOAL_DESIGN_LIMITS.maxGoals}개까지 설계할 수 있습니다.`] };
  }

  const allowedCategories: GoalCategory[] = ["EMERGENCY", "POLICY_SAVINGS", "HOUSING_SUBSCRIPTION", "WEALTH_BUILDING"];
  const drafts: GoalDraft[] = [];
  const errors: string[] = [];
  const seenIds = new Set<string>();

  value.forEach((item, index) => {
    if (typeof item !== "object" || item === null) {
      errors.push(`${index + 1}번째 목표의 형식이 올바르지 않습니다.`);
      return;
    }
    const raw = item as Record<string, unknown>;
    const id = typeof raw.id === "string" ? raw.id : "";
    const title = typeof raw.title === "string" ? raw.title : "";
    const category = raw.category as GoalCategory;
    const productId =
      raw.productId === null || typeof raw.productId === "string" ? (raw.productId as string | null) : undefined;

    if (!/^[A-Za-z0-9-]{1,64}$/.test(id)) {
      errors.push(`${index + 1}번째 목표의 식별자가 올바르지 않습니다.`);
      return;
    }
    if (seenIds.has(id)) {
      errors.push("같은 목표가 두 번 들어 있습니다.");
      return;
    }
    seenIds.add(id);
    if (!allowedCategories.includes(category)) {
      errors.push(`${index + 1}번째 목표의 분류가 올바르지 않습니다.`);
      return;
    }
    if (productId === undefined) {
      errors.push(`${index + 1}번째 목표의 연결 상품이 올바르지 않습니다.`);
      return;
    }

    drafts.push({
      id,
      templateId: "custom",
      title,
      category,
      productId,
      targetAmount: Number(raw.targetAmount),
      currentAmount: Number(raw.currentAmount),
      targetMonths: Number(raw.targetMonths),
      priority: Number.isInteger(raw.priority) ? (raw.priority as number) : index + 1,
    });
  });

  if (errors.length > 0) return { errors };

  const issues = validateGoalDrafts(drafts);
  if (issues.length > 0) return { errors: issues.map((issue) => issue.message) };

  return { goals: goalsFromDrafts(drafts) };
}
