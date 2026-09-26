// docs/.vitepress/config.mts
import { defineConfig } from 'vitepress';
import { fileURLToPath } from 'url';
import path from 'path';
import { generateMultiSidebar } from './sidebar.mjs';

// 이 파일(docs/.vitepress/) 기준의 절대 경로 — CWD와 무관하게 안정적으로 동작
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const docsRoot = path.resolve(__dirname, '..'); // docs 폴더

// GitHub Actions에서 리포 이름(base 경로)과 동기화할 외부 레포 정보를 전달받음
const REPO_NAME = process.env.REPO_NAME || 'hubv20';
const EXTERNAL_REPO = process.env.EXTERNAL_REPO || 'huggingface/blog';

export default defineConfig({
  // 프로젝트 루트(마크다운 기준 폴더)를 docs로 지정
  srcDir: '.',

  // GitHub Pages 서브폴더 배포 시 필요한 base 경로 (환경변수로 자동 주입)
  base: `/${REPO_NAME}/`,

  title: 'My Auto Sync Docs',
  description: '외부 레포지토리의 마크다운을 자동 동기화하여 빌드하는 VitePress 사이트',

  // 로컬에 커밋하지 않는 동기화용 폴더도 정적 자산으로 안전하게 취급
  lastUpdated: true,
  cleanUrls: true,

  themeConfig: {
    nav: [
      { text: 'Home', link: '/' },
      { text: 'Posts', link: '/posts/' },
      { text: 'Guide', link: '/guide/' },
    ],

    // fs 기반 다중 사이드바 자동 생성 (docs/ 하위의 최상위 폴더별 라우팅 키 매핑)
    sidebar: generateMultiSidebar(docsRoot),

    socialLinks: [
      { icon: 'github', link: `https://github.com/${EXTERNAL_REPO}` },
    ],

    search: {
      provider: 'local',
    },

    outline: 'deep',
  },
});
