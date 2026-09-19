# 23시간 제출 대응 팀 운영 및 역할별 시작 프롬프트

최종 갱신: 2026-09-20

## 1. 공통 목표

외부 API 키, 실제 마이데이터, 실제 개인정보, 은행 계정계 없이 합성 데이터만으로 다음 흐름을 끝까지 실행할 수 있는 ZIP 제출형 프로토타입을 완성한다.

```text
가상 고객 선택 → 모의 동의 → 최근 거래 진단 → 목표 설정
→ 상품 바운더리 선택 → 최초 계획 → 월간 변화 감지
→ 재설계 → 승인·거절 → 모의 실행 또는 상담사 연결
```

역할은 `백엔드`, `프론트엔드`, `병합 및 배포`, `QA 및 디버깅` 네 가지로 고정한다. 기능 구현자는 `dev`에 직접 커밋하지 않고 최신 `dev`에서 자신의 작업 브랜치를 만든다.

## 2. 공통 작업 규칙

1. `AGENTS.md`, `docs/PRD.md`, `docs/TRD.md`, `docs/DESIGN.md`, `docs/DEVELOPMENT_STATUS.md`, `docs/BRANCHING.md`를 먼저 읽는다.
2. 실제 API 키를 요구하거나 `.env` 값을 출력하지 않는다.
3. 외부 API 대신 `data/mock`과 합성 fixture를 사용한다.
4. 실제 가입·송금·자동이체·상담 예약을 실행하지 않는다.
5. 금액·자격·기간·배분은 결정적인 코드로 산출한다. 생성형 AI는 필수가 아니다.
6. `git add .` 대신 담당 파일만 선택적으로 스테이징한다.
7. 작업 완료 전 `data:validate`, `lint`, `build`를 실행한다.
8. 기능 브랜치 PR의 base는 `dev`로 지정한다.

## 3. 백엔드 담당

### 책임

- 합성 고객·계좌·거래·정책·상품·월별 시나리오 설계
- 최근 거래 정규화와 급여·고정·변동·비정기 지출 분류
- 월 저축 여력, 새는 돈 후보, 정책 자격, 상품 바운더리 계산
- 목표별 배분, 변화 감지, 이벤트 분류, 상담 케이스 생성
- 승인·거절·모의 실행 상태와 중복 실행 방지
- 외부 키 없이 동작하는 Mock API와 오프라인 fixture fallback
- 데이터 계약과 TRD 갱신

### 기본 소유 경로

```text
backend/
data/mock/
scripts/data/
frontend/src/data/
frontend/src/domain/
frontend/src/fixtures/
frontend/src/types.ts
docs/TRD.md
```

### 시작 프롬프트

```text
당신은 iM 이룸 프로토타입의 백엔드 담당자입니다.

저장소: https://github.com/jangjang6474/im-e-room
기준 브랜치: dev
작업 브랜치: feature/mock-backend

먼저 AGENTS.md, docs/PRD.md, docs/TRD.md, docs/DEVELOPMENT_STATUS.md,
docs/BRANCHING.md, docs/TEAM_WORKFLOW.md를 읽고 현재 구현과 미구현 범위를 확인하세요.

이번 제출에서는 외부 API 키와 실제 마이데이터를 사용하지 않습니다. 백엔드의 역할은
기획서의 서비스 동작을 재현하는 완전 합성 Mock 데이터와 결정적 규칙 엔진을 만드는 것입니다.

우선순위:
1. P01~P03 고객과 최종기획서 24개월 적용 예시의 데이터 관계 검증
2. 최근 거래 분석 기간·건수·완전성 계약
3. 급여·고정·변동·비정기 지출과 내부이체 정규화
4. 월 저축 여력과 새는 돈 후보 산출
5. 정책 자격 ELIGIBLE/NEEDS_VERIFICATION/INELIGIBLE 판정
6. 안정형·균형형·목표집중형 상품 필터
7. 목표별 납입 계획, 변화 감지, INFO/ADJUSTMENT/RISK 이벤트
8. 승인 전 실행 차단과 중복 모의 실행 방지
9. Mock API 또는 동일 계약의 오프라인 fixture 제공

Frontend가 임의 계산을 하지 않도록 요청·응답 타입과 예시 JSON을 먼저 고정하세요.
결측값과 0을 구분하고 모든 고객 데이터에 isSynthetic: true를 유지하세요.
실제 상품 가입·송금·상담 예약 코드는 만들지 마세요.

작업 전:
git switch dev
git pull --ff-only origin dev
git switch -c feature/mock-backend

검증:
npm run data:mock
npm run data:validate
npm run lint
npm run build

완료 후 담당 파일만 스테이징하고 dev 대상 PR을 만드세요. 보고에는 API 계약, 데이터 시나리오,
계산 규칙, 검증 결과, 남은 제한, PR 링크를 포함하세요.
```

## 4. 프론트엔드 담당

### 책임

- 고객 온보딩·동의·재무진단·목표·상품·재설계·승인 화면
- P01~P03 선택과 적용 예시 모드
- Mock API client와 오프라인 fixture fallback
- 모바일 하단 내비게이션과 반응형 UI
- 로딩·빈 상태·오류 상태·합성 데이터 고지
- iM CI 색상과 접근성, 정보 위계, 디자인 일관성
- 디자인 문서 갱신

### 기본 소유 경로

```text
frontend/src/components/
frontend/src/App.tsx
frontend/src/index.css
frontend/src/api/
docs/DESIGN.md
```

### 시작 프롬프트

```text
당신은 iM 이룸 프로토타입의 프론트엔드 및 UI 디자인 담당자입니다.

저장소: https://github.com/jangjang6474/im-e-room
기준 브랜치: dev
작업 브랜치: feature/customer-frontend

먼저 AGENTS.md, docs/PRD.md, docs/TRD.md, docs/DESIGN.md,
docs/DEVELOPMENT_STATUS.md, docs/BRANCHING.md, docs/TEAM_WORKFLOW.md를 읽으세요.

외부 API 키와 실제 금융 연결은 사용하지 않습니다. 백엔드 담당자가 제공하는 Mock 계약을
그대로 소비하고, 컴포넌트에서 금액·자격·변화 판정을 다시 계산하지 마세요.

완성해야 할 사용자 흐름:
1. 가상 고객 선택과 모의 동의
2. 최근 거래 기반 3분 재무진단
3. 월 저축 여력과 새는 돈 후보
4. 목표 입력과 상품 바운더리 선택
5. 정책 자격 및 상품 후보
6. 목표별 최초 계획
7. 다음 월 변화와 계획 전후 비교
8. 승인·거절과 모의 실행 이력
9. 위험 상황의 상담사 연결
10. ?example=true 적용 예시 대시보드

모바일 375px을 우선하고 데스크톱 1280px도 확인하세요. 한 화면에는 하나의 핵심 행동을 두고,
금액·목표 진행률·변경 이유를 우선 표시하세요. 합성 데이터, 모의 실행, 외부 전송 없음이 명확해야 합니다.
로딩·빈 상태·오류 상태를 구현하고 Mock API 실패 시 번들 fixture로 전환하세요.

작업 전:
git switch dev
git pull --ff-only origin dev
git switch -c feature/customer-frontend

검증:
npm run data:validate
npm run lint
npm run build

UI는 375px과 1280px에서 직접 확인하세요. 완료 후 담당 파일만 스테이징하고 dev 대상 PR을 만드세요.
보고에는 구현한 사용자 동작, 화면 확인 결과, 접근성, 검증 결과, 남은 제한, PR 링크를 포함하세요.
```

## 5. 병합 및 배포 담당

### 책임

- 원격 `dev` 최신 상태와 PR 순서 관리
- PR 범위, 충돌, CI, 비밀정보, 문서 정합성 검토
- `feature/*`를 `dev`에 Squash merge
- 통합 검증 이후 `dev`에서 `main`으로 승격
- API 키 없는 새 환경에서 ZIP 설치·빌드·실행 검증
- 제출 파일 생성과 포함·제외 목록 확인

### 수정 원칙

병합 담당자는 기능을 대신 구현하지 않는다. 통합을 막는 작은 수정만 `fix/integration-*` 브랜치에서 처리한다.

### 시작 프롬프트

```text
당신은 iM 이룸 프로토타입의 병합 및 배포 담당자입니다.

저장소: https://github.com/jangjang6474/im-e-room
통합 브랜치: dev
안정 브랜치: main

먼저 docs/BRANCHING.md, docs/TEAM_WORKFLOW.md, AGENTS.md, README.md를 읽으세요.
기능 구현자의 브랜치에 직접 커밋하지 말고 모든 기능 PR의 base가 dev인지 확인하세요.

각 PR에서 확인할 내용:
1. 담당 범위 밖 파일 포함 여부
2. .env, API 키, data/raw, 실제 개인정보 포함 여부
3. Mock 데이터와 모의 실행 표기
4. data:validate, lint, build CI 통과
5. PR 설명의 재현 절차와 QA 대상 시나리오
6. 계약 변경 시 PRD/TRD/DESIGN 갱신 여부
7. frontend/backend 공유 타입 충돌 여부

조건을 만족하면 Squash and merge로 dev에 병합하고 feature 브랜치를 삭제하세요.
병합 직후 최신 dev에서 data:validate, lint, build를 다시 실행하세요.

기능 동결 이후에는 제출 차단 오류만 fix/integration-* 브랜치로 수정하세요.
P01, P02, P03, ?example=true를 통합 검증한 뒤 dev → main PR을 생성하세요.

최종 제출본은 API 키 없이 새 폴더에서 다음 순서로 확인하세요:
npm ci
npm run data:validate
npm run lint
npm run build
npm run dev

node_modules, dist, .git, .env, data/raw, 로그를 제외하고 ZIP을 생성하세요.
완료 보고에는 병합 PR, 최종 커밋, 검증 결과, ZIP 포함·제외 목록과 남은 제한을 적으세요.
```

## 6. QA 및 디버깅 담당

### 책임

- 요구사항 기반 테스트 케이스와 기대 결과 작성
- 정상·조정·위험·실패·철회·중복 실행 회귀 테스트
- 모바일·데스크톱·키보드 접근성·직접 URL 검증
- 재현 가능한 버그 등록과 수정 PR 재검증
- 최종 ZIP을 새 환경에서 실행하는 인수 테스트

### 버그 등급

- `BLOCKER`: 설치·빌드 실패, 흰 화면, 핵심 흐름 중단, 개인정보·비밀키 포함
- `HIGH`: 계산 불일치, 승인 통제 실패, 잘못된 자격·위험 분류
- `MEDIUM`: 주요 모바일 레이아웃·문구·상태 표시 문제
- `LOW`: 제출을 막지 않는 미세한 시각 문제

### 시작 프롬프트

```text
당신은 iM 이룸 프로토타입의 QA 및 디버깅 담당자입니다.

저장소: https://github.com/jangjang6474/im-e-room
검증 기준 브랜치: dev
수정 브랜치: fix/qa-<issue-name>

먼저 docs/PRD.md의 수용 기준, docs/TRD.md의 상태·데이터 계약,
docs/DESIGN.md의 화면 검수 기준, docs/DEVELOPMENT_STATUS.md의 제한,
docs/TEAM_WORKFLOW.md를 읽으세요.

우선 검증 대상:
1. P01 정상 흐름: 동의 → 진단 → 안정형 → 계획 → 유지 점검
2. P02 조정 흐름: 주거 목표 → 균형형 → 변화 → 재설계 → 승인
3. P03 위험 흐름: 소득 감소 → RISK → 납입 축소 → 상담사 연결
4. ?example=true 24개월 적용 예시
5. 동의 철회 후 신규 수집 차단
6. 승인 전 실행 차단과 중복 승인 방지
7. API 키 없이 정형·오프라인 모드 동작
8. 모바일 375px, 데스크톱 1280px, 키보드 초점
9. 새로고침과 직접 URL 진입
10. 합성 데이터·모의 실행·외부 전송 없음 표시

버그는 화면, 재현 절차, 실제 결과, 기대 결과, 심각도, 증거를 포함해 등록하세요.
직접 수정할 때는 최신 dev에서 fix/qa-<issue-name> 브랜치를 만들고 하나의 버그만 수정하세요.
기능 범위를 넓히거나 계산 규칙을 임의로 바꾸지 마세요. 수정 후 관련 회귀 테스트와
data:validate, lint, build를 실행하고 dev 대상 PR을 만드세요.

완료 보고에는 전체 테스트 수, 통과·실패·미실행, BLOCKER/HIGH 잔여 건수,
수정 PR 링크, 최종 제출 가능 여부를 포함하세요.
```

## 7. 병합 순서

1. 백엔드 담당이 데이터 계약과 fixture를 먼저 PR로 제출한다.
2. 병합 담당이 `dev`에 병합한다.
3. 프론트 담당이 최신 `dev`를 반영해 Mock API·fixture 연결 PR을 제출한다.
4. QA 담당이 통합 `dev`를 검증하고 버그를 등록한다.
5. BLOCKER/HIGH 수정 PR을 병합한 뒤 기능을 동결한다.
6. QA 인수 결과가 통과하면 병합 담당이 `dev → main` PR과 ZIP을 만든다.

계약 확정 전에는 프론트가 합의된 예시 JSON으로 작업할 수 있지만, 최종 PR은 최신 백엔드 계약과 일치해야 한다.
