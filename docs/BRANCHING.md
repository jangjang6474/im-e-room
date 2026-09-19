# 브랜치 운영

- `main`: 시연·제출 가능한 안정본
- `dev`: 기능 통합 및 검증 브랜치
- `feature/<name>`: `dev`에서 분기하는 단일 기능 작업

기능 브랜치는 `npm run lint`, `npm run build`, 관련 데이터 검증을 통과한 뒤 `dev`에 병합한다. `dev`에서 통합 시나리오를 확인한 뒤에만 `main`으로 병합한다. API 키, `.env`, `data/raw`는 어떤 브랜치에도 커밋하지 않는다.
