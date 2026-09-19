# iM 이룸 — TRD

버전: 0.1 · 작성일: 2026-09-19 · 상태: 구현 제안

제품 범위는 [PRD.md](PRD.md)를 따른다. 아래 API·스키마는 **프로젝트 내부 계약 초안**이며 공식 마이데이터 표준 명세가 아니다. 외부 API의 실제 필드·권한·제공 범위는 아직 검증하지 않았다.

## 1. 아키텍처

```mermaid
flowchart TD
    UI[React 사용자 화면 / 데모 제어] --> API[FastAPI / Express]
    API --> C[모의 동의 / 목표 / 승인]
    C --> S[월간 스케줄러]
    S --> O[오케스트레이터]
    MOCK[월별 합성 API 응답] --> AD[Mock 데이터 어댑터]
    O --> AD
    AD --> N[정규화 / 거래 분류 / 재무 계산]
    N --> DB[(재무 스냅샷 DB)]
    EXT[정책·상품 샘플 / 변경 시나리오] --> REVIEW[정책 구조화 초안 / 검수]
    REVIEW --> RULE[(정책·상품 버전 DB)]
    DB --> DET[변화 감지 / 이벤트 분류]
    RULE --> DET
    O --> DET
    DET --> INFO[정보: 리포트]
    DET --> PLAN[조정: 계획 재계산]
    DET --> HUMAN[위험: 상담 대기]
    RULE --> PLAN
    PLAN --> VALIDATE[조건 검증 / 전후 비교]
    VALIDATE --> EXPLAIN[LLM 또는 정형 설명]
    EXPLAIN --> UI
    C --> EXEC[승인 버전 모의 실행]
    EXEC --> DB
    HUMAN --> DASH[상담사 화면]
    DASH --> DB
```

오케스트레이터는 작업 순서·실행 상태·재시도·중복 방지·분기를 관리하는 백엔드 구성요소이다. LLM 에이전트가 임의로 도구를 선택하거나 금융 실행을 결정하는 구조로 만들지 않는다. 정책·상품 DB와 고객 스냅샷은 독립적으로 갱신하고 판단 단계에서 결합한다.

## 2. 기술 선택

| 계층 | 제안 | 적용 범위 |
|---|---|---|
| 프론트엔드 | React + TypeScript | 사용자·상담사·데모 화면 |
| 서버 | Node.js + Express / TypeScript | 데이터 계약, 상태 전이, 계산 API, Gemini 프록시 |
| 저장소 | 클라이언트/서버 인메모리 + LocalStorage 영속화 | 스냅샷·버전·계획·이벤트·실행 이력 |
| 최적화 | 우선순위 기반 결정적 배분 | 제약조건을 명시적으로 검증 |
| 거래 분류 | 규칙 기반 정규화 | ML 미구현 상태를 AI 학습 모델로 표기하지 않음 |
| 생성형 AI | Gemini API / 정형 설명 Fallback | 설명 생성 및 질의응답 보조 |

## 3. 합성 데이터 계약 및 핵심 모델

- 시나리오 ID (S01~S09)
- DemoCustomer: scenario_id, name, age, residence, is_synthetic: true
- Consent: status, consented_at, revoked_at, anchor_day: 15
- FinancialSnapshot: as_of, monthly_income, fixed_expenses, variable_budget, debt_payment, available_surplus, emergency_fund, accounts, transactions
- Goal: id, title, target_amount, current_amount, target_months, priority
- AllocationPlan: version, items: [{goal_id, product_id, monthly_amount, expected_completion}], assumptions, status (DRAFT/PROPOSED/APPROVED/REJECTED/MOCK_EXECUTED)
- ChangeEvent: type (INFO/ADJUSTMENT/RISK), severity, message, evidence, old_value, new_value
- ConsultationCase: id, risk_event_id, customer_name, risk_type, briefing, status (WAITING/IN_PROGRESS/COMPLETED)
- MockExecution: id, plan_version, idempotency_key, executed_at, status
