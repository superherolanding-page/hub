---
layout: home

hero:
  name: "Auto Sync Docs"
  text: "외부 레포 마크다운 자동 동기화 사이트"
  tagline: GitHub Actions가 외부 리포지토리의 .md 파일을 가져와 HTML로 빌드해 GitHub Pages에 배포합니다.
  actions:
    - theme: brand
      text: Posts 보기
      link: /posts/
    - theme: alt
      text: Guide
      link: /guide/

features:
  - title: 커밋 없는 동기화
    details: 외부 마크다운은 CI 서버에서만 임시로 다운로드됩니다. 레포지토리는 항상 가볍고 깨끗하게 유지됩니다.
  - title: 매일 자동 실행
    details: schedule(cron) 트리거로 매일 자정(UTC)에 외부 레포를 확인하고 자동으로 재생성·배포합니다.
  - title: 동적 사이드바
    details: Node.js fs 모듈로 폴더 구조를 재귀 스캔하여 다중 사이드바를 자동 생성합니다.
---
