# Auto Sync VitePress Docs

외부 레포지토리의 마크다운을 **GitHub Actions에서 자동 동기화(Sync)** 하여
**VitePress로 HTML 빌드 → GitHub Pages에 자동 배포**하는 프로젝트입니다.

## 핵심 장점

- 외부 마크다운 파일을 내 레포에 커밋하지 않습니다.
  CI 서버가 켜질 때마다 최신 파일을 임시로 내려받아 HTML로 변환한 뒤 원본은 삭제하므로,
  레포지토리는 항상 가볍고 깨끗하게 유지됩니다. (`docs/posts/*` 는 `.gitignore` 처리됨)
- `fs` 모듈 기반 스크립트로 **다중 사이드바를 자동 생성**합니다.
  (최상위 폴더 → 라우팅 키, 하위 폴더/파일 재귀 스캔, 숫자 접두사 제거 등)

## 구조

```
.
├── .github/workflows/deploy.yml   # Sync & Build & Deploy 워크플로우
├── docs/
│   ├── .vitepress/
│   │   ├── config.mts             # VitePress 설정 (base, 사이드바 연결)
│   │   └── sidebar.mjs            # fs 기반 다중 사이드바 자동 생성 스크립트
│   ├── index.md                   # 홈 (landing)
│   ├── posts/                     # 외부 레포에서 동기화되는 폴더 (커밋되지 않음)
│   └── guide/                     # 직접 작성하는 문서
└── package.json
```

## 로컬 개발

```bash
npm install
npm run docs:dev       # http://localhost:5173/hubv20/
npm run docs:build     # 정적 빌드 (docs/.vitepress/dist)
npm run docs:preview   # 빌드 결과 미리보기
```

## GitHub 설정 (필수)

1. 레포의 **Settings → Pages**
2. **Build and deployment → Source** 를 `Deploy from a branch` → **`GitHub Actions`** 로 변경

이후 `main` 브랜치에 push 하면 워크플로우가 자동으로 실행됩니다:

1. `huggingface/blog` 을 얕게 클론 → `docs/posts/` 에 `.md` 복사 → 임시 폴더 삭제
2. `npm ci` → `vitepress build` (base 경로는 리포 이름으로 자동 계산)
3. GitHub Pages에 artifact 업로드 및 배포
4. 매일 자정(UTC) cron과 수동 `workflow_dispatch`로도 재동기화 가능

## 동기화 대상 바꾸기

`.github/workflows/deploy.yml` 의 "Sync external markdown files" 단계에서
`EXTERNAL_REPO` 값만 수정하면 됩니다. 자세한 내용은 사이트 내
[Guide → Advanced](docs/guide/advanced-sync-source.md) 참고.
