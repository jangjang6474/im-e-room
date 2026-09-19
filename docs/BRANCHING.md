# 브랜치·PR 운영 워크플로

## 1. 브랜치 역할

- `main`: 시연·제출 가능한 안정본. 직접 커밋하지 않는다.
- `dev`: 기능 통합과 전체 시나리오 검증 브랜치. 직접 기능 개발하지 않는다.
- `feature/<name>`: 최신 `dev`에서 분기하는 단일 기능 브랜치.
- `fix/<name>`: `dev`에서 분기하는 오류 수정 브랜치.

기본 병합 경로는 `feature/*` 또는 `fix/*` → `dev` → `main`이다.

## 역할별 기본 브랜치

| 역할 | 기본 브랜치 | dev 직접 push |
|---|---|---|
| 백엔드 담당 | `feature/mock-backend` | 금지 |
| 프론트엔드 담당 | `feature/customer-frontend` | 금지 |
| QA 및 디버깅 담당 | `fix/qa-<issue-name>` | 금지 |
| 병합 및 배포 담당 | PR 병합, 필요 시 `fix/integration-<name>` | 기능 개발 목적 직접 push 금지 |

세부 책임과 역할별 시작 프롬프트는 [TEAM_WORKFLOW.md](TEAM_WORKFLOW.md)를 따른다.

## 2. 작업 시작

```bash
git switch dev
git pull --ff-only origin dev
git switch -c feature/<name>
```

한 브랜치는 한 가지 사용자 동작 또는 기술 과제만 다룬다. 관련 없는 리팩터링과 서식 변경을 같은 PR에 섞지 않는다.

## 3. 선택적 스테이징과 커밋

PR은 작업 디렉터리의 스테이징 상태를 직접 전송하지 않는다. 선택한 파일을 스테이징해 커밋하고, 해당 브랜치의 커밋과 `dev` 사이 차이를 PR로 제출한다.

```bash
git status --short
git diff
git add frontend/src/path/to/file.tsx docs/TRD.md
git diff --cached
git commit -m "feat: add monthly review flow"
```

- 기본적으로 `git add .`를 사용하지 않는다.
- `git diff --cached`로 PR에 포함될 변경을 확인한다.
- `.env`, API 키, `data/raw`, 실제 개인정보는 스테이징하지 않는다.
- 생성 파일을 바꿨다면 생성 원본과 검증 결과를 함께 커밋한다.
- 커밋 하나는 되돌릴 수 있는 하나의 논리적 변경으로 만든다.

잘못 스테이징한 파일은 `git restore --staged <path>`로 작업 내용을 지우지 않고 제외한다.

## 4. PR 전 검증

```bash
npm run data:mock
npm run data:validate
npm run lint
npm run build
git status --short
git log --oneline origin/dev..HEAD
git diff --stat origin/dev...HEAD
```

UI 변경은 모바일 375px과 데스크톱 1280px에서 핵심 흐름을 확인한다. 실패한 검증은 숨기지 않고 PR에 원인과 범위를 기록한다.

## 5. Push와 PR 생성

```bash
git push -u origin feature/<name>
```

PR의 base는 `dev`, compare는 작업자의 `feature/<name>`으로 지정한다. PR 템플릿에 해결한 문제, 변경 범위, 검증 결과, 리뷰 시나리오와 남은 제한을 작성한다.

## 6. 리뷰와 병합 조건

다음 조건을 모두 만족한 뒤 병합한다.

1. PR base가 `dev`이다.
2. PR 범위 밖 파일이 포함되지 않았다.
3. CI의 데이터 검증, 타입 검사, 빌드가 모두 통과했다.
4. 최소 1명의 팀원이 변경과 사용자 흐름을 리뷰했다.
5. 실제 개인정보·비밀키·실제 금융 실행 코드가 없다.
6. 제품 결정이나 계약 변경이 관련 문서에 반영됐다.
7. 리뷰 대화가 해결됐다.

기능 PR은 `Squash and merge`를 기본으로 사용한다. 최종 커밋 제목은 `feat:`, `fix:`, `docs:`, `refactor:` 등 변경 의도가 드러나게 작성한다. 병합 후 원격 feature 브랜치를 삭제한다.

## 7. 최신 dev 반영과 충돌 처리

```bash
git fetch origin
git switch feature/<name>
git rebase origin/dev
npm run data:validate
npm run lint
npm run build
git push --force-with-lease
```

공유 중인 feature 브랜치에서는 임의의 force push를 피한다. 필요할 때는 팀원과 합의하고 `--force-with-lease`만 사용한다.

## 8. dev에서 main으로 승격

`dev`에서 P01~P03 페르소나와 정상·조정·위험 흐름을 통합 검증한 뒤 `dev` → `main` PR을 별도로 만든다. 이 PR에는 기능 개발을 추가하지 않고 릴리스 검증과 문서 갱신만 포함한다.

## 9. 저장소 설정 권장값

GitHub branch protection에서 `main`과 `dev`에 다음을 설정한다.

- Pull request 없이 병합 금지
- 승인 리뷰 최소 1명
- CI 상태 검사 필수
- 리뷰 대화 해결 필수
- force push 및 브랜치 삭제 금지

문서와 CI는 저장소에 포함되지만 branch protection은 GitHub 저장소 설정에서 별도로 활성화해야 한다.
