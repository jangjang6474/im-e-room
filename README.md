# iM 이룸

청년의 재무 목표를 설정하고, 동의일 기준 월 1회 가상 재무 데이터를 점검해 달라진 상황에 맞는 계획을 다시 제안하는 공모전 프로토타입입니다.

실제 마이데이터·은행 계정계·송금·상품 가입 기능은 연결하지 않습니다. 모든 고객과 거래는 합성 데이터이며 실행 결과도 모의 기록입니다.

## 현재 구현 범위

- 서비스 소개, 청년용 재무 홈, 목표 관리, 월간 계획 비교
- 합성 거래 기반 재무 계산 및 목표별 자금 배분
- 정책 자격 상태 구분과 정책 변경 시나리오
- 소득 변화 감지와 위험 사례의 상담사 대시보드 연결
- 사용자 승인 후 모의 실행 기록
- Gemini 기반 설명 및 API 장애 시 정형 설명 대체
- 고객 페르소나 3종과 페르소나별 전체 시연 흐름

상태는 현재 브라우저 메모리에만 저장됩니다. 새로고침 이후에도 계획·승인·실행 기록을 유지하는 영속 저장소는 아직 구현되지 않았습니다. 상세 현황은 [개발 현황](docs/DEVELOPMENT_STATUS.md)을 참고하세요.

## 실행

Node.js가 필요합니다.

```bash
npm install
copy .env.example .env.local
npm run dev
```

`.env.local`의 `GEMINI_API_KEY`는 선택 사항입니다. 키가 없거나 호출이 실패하면 계산 결과를 사용한 정형 설명으로 동작합니다.

검증 명령:

```bash
npm run lint
npm run build
npm start
```

## 기준 데이터와 오프라인 mock

온통청년 정책 API와 금융감독원 금융상품 한눈에 API는 개발 중 기준 데이터 갱신에만 사용합니다. 브라우저는 API 키나 외부 API를 직접 호출하지 않으며, ZIP 제출본은 `src/fixtures/generated/referenceCatalog.ts`에 포함된 합성 데이터만 읽습니다.

```bash
# data/mock/raw을 정규화해 오프라인 fixture 재생성
npm run data:mock
npm run data:validate

# 선택 작업: .env에 키가 있을 때 실제 응답을 gitignore된 data/raw에 수집
npm run data:sync
```

실제 응답은 자동으로 mock에 승격하지 않습니다. 필드와 이용조건을 검토하고 개인정보·인증정보가 없음을 확인한 뒤 `data/mock/raw`에 합성 레코드로 반영합니다.

브랜치는 `main`을 안정본, `dev`를 기능 통합본으로 사용합니다. 기능 브랜치는 `dev`에서 만들고 검증 후 `dev`로 합친 다음, 배포 가능한 시점에 `main`으로 병합합니다.

## 프로젝트 구조

```text
frontend/src/       React 화면, 클라이언트 상태, 합성 시나리오
backend/            Express API, Gemini 프록시, 향후 수집·저장 작업
data/mock/raw/      공개 API 응답 구조를 재현한 합성 원본
scripts/data/       수집·정규화·fixture 생성·검증 명령
docs/               PRD, TRD, 디자인 및 개발 현황
```

프론트엔드는 외부 API 키를 읽지 않습니다. 백엔드는 비밀키와 외부 호출을 담당하며, ZIP 제출 환경에서는 프론트엔드에 번들된 합성 fixture만으로 핵심 시연이 동작합니다.

## 화면 모드

- 고객 모드: 재무 상태, 목표, 이번 달 변경안, 지원제도 확인
- 상담사 모드: 위험 사례와 상담 브리핑 확인
- 데모 도구: 공모전 시연을 위한 월 이동 및 합성 시나리오 주입

일반 접속은 고객용 재무 홈으로 시작합니다. `?demo=true`에서는 소개 화면과 시나리오 도구를 함께 사용할 수 있습니다.

## 문서

- [PRD](docs/PRD.md)
- [TRD](docs/TRD.md)
- [IDEATION](docs/IDEATION.md)
- [UI 디자인 기준](docs/DESIGN.md)
- [개발 에이전트 지침](AGENTS.md)
- [개발 현황](docs/DEVELOPMENT_STATUS.md)

AI Studio 원본: https://ai.studio/apps/56ac0402-8da0-4ab0-8621-7541387fa500
