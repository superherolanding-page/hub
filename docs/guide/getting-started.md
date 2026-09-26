# Getting Started

## 1. 로컬 개발

```bash
npm install          # 의존성 설치
npm run docs:dev     # 로컬 미리보기 (http://localhost:5173/<repo>/)
```

## 2. 프로젝트 구조

```
.
├── .github/workflows/deploy.yml   # Sync & Build & Deploy 워크플로우
├── docs/
│   ├── .vitepress/
│   │   ├── config.mts             # VitePress 설정 (다중 사이드바 연결)
│   │   └── sidebar.mjs            # fs 기반 사이드바 자동 생성 스크립트
│   ├── index.md                   # 홈 페이지
│   ├── posts/                     # 외부 레포에서 동기화되는 마크다운 폴더 (gitignore됨)
│   └── guide/                     # 직접 작성하는 문서
└── package.json
```

## 3. GitHub 설정 (필수)

1. 레포지토리의 **Settings** 탭 → 왼쪽 메뉴 **Pages**
2. **Build and deployment** 의 **Source** 를 `Deploy from a branch` → **`GitHub Actions`** 로 변경

이제 `main` 브랜치에 push 하면 워크플로우가 자동으로:
외부 마크다운을 가져오고(`docs/posts`) → HTML로 빌드하고 → GitHub Pages에 배포합니다.
