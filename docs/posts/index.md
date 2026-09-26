# Posts

이 폴더의 문서들은 **GitHub Actions 빌드 시점에 외부 레포지토리에서 자동 동기화**됩니다.

- 현재 동기화 대상: [huggingface/blog](https://github.com/huggingface/blog)
- 워크플로우 파일: `.github/workflows/deploy.yml`

> 로컬에서는 아래 샘플 글만 보입니다. 실제 외부 문서(예: `how-to-train-your-model.md`)는
> CI에서 복사되며, `docs/posts/**` 는 `.gitignore`에 포함되어 커밋되지 않습니다.
