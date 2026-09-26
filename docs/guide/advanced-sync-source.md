# Advanced: Change Sync Source

동기화 대상은 `.github/workflows/deploy.yml` 의 "Sync external markdown files" 단계만
수정하면 됩니다.

```yaml
- name: Sync external markdown files
  run: |
    git clone --depth 1 https://github.com/huggingface/blog.git external_temp
    mkdir -p docs/posts
    cp -r external_temp/*.md docs/posts/ || true
    rm -rf external_temp
```

## 다른 레포로 바꾸기 / 여러 레포 합치기

```bash
mkdir -p docs/posts
git clone --depth 1 https://github.com/openai/blog.git tmp1
cp tmp1/*.md docs/posts/ || true && rm -rf tmp1

git clone --depth 1 https://github.com/microsoft/research.git tmp2
cp tmp2/**/*.md docs/posts/ || true && rm -rf tmp2
```

## 하위 폴더째로 복사하기

마크다운 파일이 특정 폴더(예: `blog/`) 안에 들어있는 경우:

```bash
mkdir -p docs/posts
cp -r external_temp/blog/*.md docs/posts/ || true
```

> 사이드바는 `docs/` 하위의 폴더 구조를 재귀적으로 스캔하므로,
> `docs/posts/llama/` 처럼 폴더째로 복사해도 그대로 다중 사이드바에 반영됩니다.
