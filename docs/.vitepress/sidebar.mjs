// docs/.vitepress/sidebar.mjs
// VitePress 다중 사이드바(Multi Sidebar) 자동 생성 스크립트
// - 최상위 폴더를 기준으로 라우팅 키(예: '/posts/', '/guide/')를 자동 생성하고,
//   하위 폴더와 .md 파일을 재귀적으로 스캔하여 사이드바 트리를 자동으로 구성합니다.
import fs from 'fs';
import path from 'path';

// 파일 및 폴더명을 읽기 좋은 제목으로 변환하는 함수
export function formatTitle(name) {
  return name
    .replace(/\.md$/, '') // 확장자 제거
    .replace(/[-_]/g, ' ') // 대시, 언더바를 공백으로 변환
    .replace(/^\d+-\s*/, '') // 정렬용 숫자 접두사(예: 01-) 제거
    .replace(/\b\w/g, (char) => char.toUpperCase()); // 첫 글자 대문자화
}

// 특정 디렉토리를 재귀적으로 스캔하여 sidebar items 배열을 생성하는 함수
function buildSidebarItems(dirPath, basePath) {
  const items = [];
  let files = [];

  try {
    files = fs.readdirSync(dirPath);
  } catch (e) {
    // 폴더가 없거나 읽을 수 없는 경우 빈 배열 반환 (빌드 에러 방지)
    return items;
  }

  // 이름순 정렬 (정렬용 숫자 접두사를 쓰면 자연스러운 순서 유지 가능)
  files.sort();

  for (const file of files) {
    if (file.startsWith('.')) continue; // 숨김 파일/폴더 제외

    const fullPath = path.join(dirPath, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      const subItems = buildSidebarItems(fullPath, `${basePath}${file}/`);
      // 하위에 표시할 항목이 하나도 없으면 빈 폴더는 건너뜀
      if (subItems.length === 0) continue;

      items.push({
        text: formatTitle(file),
        collapsed: true, // 하위 폴더 기본 접힘 상태
        items: subItems,
      });
    } else if (file.endsWith('.md')) {
      const isIndex = file === 'index.md';
      const name = isIndex ? '' : file.replace(/\.md$/, '');
      const link = `${basePath}${name}`;

      items.push({
        text: isIndex ? 'Overview' : formatTitle(file),
        link,
      });
    }
  }

  return items;
}

// 최상위 디렉토리를 기준으로 다중 사이드바 객체를 생성하는 메인 함수
// docsDir: 문서 루트 폴더 (기본값: ./docs, 이 파일 기준으로는 ../ 위치)
export function generateMultiSidebar(docsDir = './docs') {
  const sidebar = {};

  let rootEntries = [];
  try {
    rootEntries = fs.readdirSync(docsDir);
  } catch (e) {
    return sidebar;
  }

  // 스캔에서 제외할 폴더 및 파일
  const excludes = ['.vitepress', 'public', 'node_modules', 'index.md'];

  for (const entry of rootEntries) {
    if (excludes.includes(entry)) continue;

    const fullPath = path.join(docsDir, entry);
    const stat = fs.statSync(fullPath);

    // 최상위 항목이 폴더인 경우에만 다중 사이드바의 Key로 사용
    if (stat.isDirectory()) {
      const routeKey = `/${entry}/`;
      sidebar[routeKey] = [
        {
          text: formatTitle(entry),
          items: buildSidebarItems(fullPath, routeKey),
        },
      ];
    }
  }

  return sidebar;
}
