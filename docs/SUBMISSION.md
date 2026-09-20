# 제출본 실행 및 포함 범위

## 실행

Node.js 22.12 이상(권장 24 LTS), npm을 준비한다. 압축을 새 폴더에 풀고 프로젝트 루트에서 다음 명령을 실행한다.

```sh
npm ci
npm run data:validate
npm run ai:validate
npm run lint
npm run build
npm start
```

http://localhost:3000 으로 접속한다. 개발 실행은 `npm run dev`다. 최초 의존성 설치에는 인터넷이 필요하다. `.env`와 API 키는 기본 체험에 필요하지 않다. AI는 준비된 응답과 규칙 기반 설명으로 동작하며 실제 Claude 호출은 포함되지 않는다. 선택적 라이브 설정은 서버의 `.env` 또는 환경변수에서만 한다.

## 체험 확인

- P01: 동의 → 진단 → 목표/계획 → 유지 점검.
- P02: 주거 목표 → 다음 달 점검 → 조정안 비교 → 승인/거절 → 모의 실행.
- P03: 소득 감소 → 위험 안내 → 상담사 연결 흐름.
- `?example=true`: 24개월 예시.
- 동의 철회, 승인 전 실행 제한, 중복 실행 제한, 모바일 화면을 확인한다.

## ZIP 포함

frontend/, backend/, api/, public/, data/mock/, scripts/, docs/, AGENTS.md, README.md, package.json, package-lock.json, index.html, tsconfig.json, vite.config.ts 및 원격 소스의 기타 실행 설정을 포함한다. public/images/im-symbol.png는 헤더 로고다. data/mock/raw/는 합성 원본이며 재생성에 필요하다.

## ZIP 제외

.git/, .github/, node_modules/, dist/, .server-build/, .env 및 .env.*(단 .env.example 포함), data/raw/, npm 캐시, 로그, 임시 파일, 백업, 편집기 설정과 개인 자격 증명을 제외한다. .env.example에는 실제 비밀키가 없어야 한다.

## 구현 한계

고객·거래는 합성 데이터이며 가입·이체·상담 예약은 모의 실행이다. 실 마이데이터 연결 및 실제 금융 실행은 없다. 기본 AI는 fixture 모드이며 네트워크 LLM 호출 성공을 의미하지 않는다. 브라우저 새로고침 시 상태가 초기화될 수 있다. 배포 주소와 로컬 실행은 별개다.

공모전의 지정 파일명·용량 제한·필수 제출 서식은 별도 공고에 맞춰 최종 확인해야 한다. 이 문서는 소스 ZIP의 기술적 제출 범위를 설명한다.
