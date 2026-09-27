// scripts/sanitize-markdown.mjs
// 외부 레포의 마크다운을 VitePress(docs/posts)로 복사할 때,
// Vue 컴파일러를 깨뜨리는 내용을 안전하게 치환하는 스크립트.
//
// 사용법: node scripts/sanitize-markdown.mjs <srcDir> <destDir>
//
// 처리 대상 (실제 CI 빌드 실패 원인들):
// 1. 불균형 HTML 태그 — 예: huggingface/blog/open-llm-leaderboard-mmlu.md 의
//    `<table><p>`(61행)처럼 종료 태그가 없거나 뒤섞인 원본이
//    "Element is missing end tag" 빌드 오류를 발생시킴.
//    → 스택 방식으로 짝을 맞춰 미닫힌 태그는 종료 태그를 보완하고,
//      매칭 불가/비알nown 태그는 텍스트로 이스케이프.
// 2. 제로폭 문자(U+200B 등)에 위장된 태그 조각 —
//    "The language '<class' is not loaded", "The language 'h'/'b' is not loaded"
//    식의 이상한 문법 하이라이트 경고의 주범이므로 전체 제거.
// 3. 본문 안의 {{ }} / [[ ]] — Vue 템플릿과 충돌하므로 엔티티로 회피.

import fs from 'fs';
import path from 'path';

const [, , srcDirArg, destDirArg] = process.argv;

if (!srcDirArg || !destDirArg) {
  console.error('Usage: node scripts/sanitize-markdown.mjs <srcDir> <destDir>');
  process.exit(1);
}

const srcDir = path.resolve(srcDirArg);
const destDir = path.resolve(destDirArg);

// ---------------------------------------------------------------------------
// 태그 사전
// ---------------------------------------------------------------------------
const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr',
]);

const KNOWN_TAGS = new Set([
  ...VOID_TAGS,
  'a', 'abbr', 'address', 'article', 'aside', 'audio', 'b', 'blockquote', 'body',
  'button', 'canvas', 'caption', 'cite', 'code', 'colgroup', 'data', 'datalist',
  'dd', 'del', 'details', 'dfn', 'dialog', 'div', 'dl', 'dt', 'em', 'fieldset',
  'figcaption', 'figure', 'footer', 'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'head', 'header', 'hgroup', 'html', 'i', 'iframe', 'ins', 'kbd', 'label',
  'legend', 'li', 'main', 'map', 'mark', 'menu', 'nav', 'noscript', 'object',
  'ol', 'optgroup', 'option', 'output', 'p', 'picture', 'pre', 'progress', 'q',
  'rp', 'rt', 'ruby', 's', 'samp', 'script', 'section', 'select', 'slot', 'small',
  'span', 'strong', 'style', 'sub', 'summary', 'sup', 'table', 'tbody', 'td',
  'template', 'textarea', 'tfoot', 'th', 'thead', 'time', 'title', 'tr', 'u',
  'ul', 'var', 'video',
]);


// 보이지 않는 문자 (제로폭 스페이스 등이 태그 안에 숨어 파서 오류를 유발)
const INVISIBLE_RE = /[\u200B\u200C\u200D\u2060\uFEFF]/g;

// ---------------------------------------------------------------------------
// 코드 블록(``` / ~~~)·인라인 코드 보호하며 라인 변환 적용
// ---------------------------------------------------------------------------
function mapOutsideCode(text, transformLineFn) {
  const lines = text.split('\n');
  const out = [];
  let inFence = false;
  let fenceChar = null;

  for (const line of lines) {
    const trimmed = line.trimStart();
    if (!inFence && (/^```/.test(trimmed) || /^~~~/.test(trimmed))) {
      inFence = true;
      fenceChar = trimmed[0];
      out.push(line);
      continue;
    }
    if (inFence) {
      out.push(line);
      if ((fenceChar === '`' && /^```/.test(trimmed)) ||
          (fenceChar === '~' && /^~~~/.test(trimmed))) {
        inFence = false;
        fenceChar = null;
      }
      continue;
    }
    // 인라인 코드 구간은 보존
    const parts = line.split(/(`[^`\n]*`)/g);
    out.push(parts.map((p, i) => (i % 2 === 1 ? p : transformLineFn(p))).join(''));
  }
  return out.join('\n');
}

// ---------------------------------------------------------------------------
// 태그 토큰화
// ---------------------------------------------------------------------------
const TOKEN_RE =
  /<!--[\s\S]*?(?:-->|$)|<\/\s*([a-zA-Z][\w:-]*)\s*>|<\s*([a-zA-Z][\w:-]*)((?:"[^"]*"|'[^']*'|[^'"<>])*?)(\/?)>/g;

function tokenize(html) {
  const tokens = [];
  let m;
  TOKEN_RE.lastIndex = 0;
  while ((m = TOKEN_RE.exec(html)) !== null) {
    const raw = m[0];
    const start = m.index;
    const end = start + raw.length;
    if (raw.startsWith('<!--')) {
      tokens.push({ type: 'comment', start, end });
    } else if (m[1] !== undefined) {
      tokens.push({ type: 'close', name: m[1].toLowerCase(), start, end });
    } else {
      tokens.push({
        type: 'open',
        name: m[2].toLowerCase(),
        selfClosing: m[4] === '/',
        complete: raw.endsWith('>'),
        start, end,
      });
    }
  }
  return tokens;
}

// ---------------------------------------------------------------------------
// 불균형 HTML 태그 복구
// ---------------------------------------------------------------------------
function fixUnbalancedTags(text) {
  const tokens = tokenize(text);
  const edits = []; // {start, end, replace?, insert?}
  const stack = [];

  const escape = (tok) =>
    text.slice(tok.start, tok.end).replace(/</g, '&lt;').replace(/>/g, '&gt;');

  for (const tok of tokens) {
    if (tok.type === 'comment') continue;

    if (tok.type === 'open') {
      if (VOID_TAGS.has(tok.name) || tok.selfClosing) continue;
      if (!KNOWN_TAGS.has(tok.name) || !tok.complete) {
        // 알 수 없는 태그(<class>, <b... 식 변형 포함) 또는 불완전 태그 → 텍스트화
        edits.push({ start: tok.start, end: tok.end, replace: escape(tok) });
        continue;
      }
      stack.push(tok);
      continue;
    }

    // close 태그
    if (!KNOWN_TAGS.has(tok.name)) {
      edits.push({ start: tok.start, end: tok.end, replace: escape(tok) });
      continue;
    }
    let idx = -1;
    for (let i = stack.length - 1; i >= 0; i--) {
      if (stack[i].name === tok.name) { idx = i; break; }
    }
    if (idx === -1) {
      // 열림 없이 닫힌 고아 태그 → 텍스트화
      edits.push({ start: tok.start, end: tok.end, replace: escape(tok) });
      continue;
    }
    // 매칭되는 열림 태그 사이에만 남아 열린 태그들을 즉시 종료 보강
    for (let i = stack.length - 1; i > idx; i--) {
      const unclosed = stack[i];
      edits.push({ start: unclosed.end, end: unclosed.end, insert: `</${unclosed.name}>` });
      stack.splice(i, 1);
    }
    stack.splice(idx, 1);
  }

  // 끝까지 닫히지 않은 태그는 문서 마지막에 종료 태그 추가
  while (stack.length) {
    const t = stack.pop();
    edits.push({ start: text.length, end: text.length, insert: `</${t.name}>` });
  }

  if (edits.length === 0) return text;

  // 역순 적용으로 오프셋 유지
  edits.sort((a, b) => b.start - a.start || b.end - a.end);
  let result = text;
  for (const e of edits) {
    if (e.replace !== undefined) {
      result = result.slice(0, e.start) + e.replace + result.slice(e.end);
    } else {
      result = result.slice(0, e.start) + e.insert + result.slice(e.start);
    }
  }
  return result;
}

// ---------------------------------------------------------------------------
// 메인 sanitize
// ---------------------------------------------------------------------------
function sanitize(content) {
  // 1) 제로폭/BOM 문자 제거 (여기서 제거해야 뒤에 </b​> 패턴도 정상 인식)
  let text = content.replace(INVISIBLE_RE, '');

  // 2) 비인쇄/위장 문자가 섞인 코드펜스 언어명 정리 (언어 로딩 경고 방지)
  //    예: "```bash\u200B" → "```bash", "```<class 'pandas...'>" → "```"
  //    ※ 한 줄 안에서만 매칭되도록 [^\n] 사용 ([^ -~]는 \n까지 매칭해 치명적)
  text = text.replace(
    /^(`{3,}|~{3,})[ \t]*(?:(?!`{3,}|~{3,})[^\n])*$/,
    (m, fence, _rest, offset, whole) => {
      const lineEnd = whole.indexOf('\n', offset);
      const line = whole.slice(offset, lineEnd === -1 ? undefined : lineEnd);
      const info = line.slice(fence.length).trim();
      if (!info) return m;
      const clean = info.replace(/[\u0000-\u001F\u007F-\u009F]/g, '');
      // 평범한 언어들(bash, python, js ... 또는 none)은 그대로 유지
      if (/^[A-Za-z][\w+#.-]*$/.test(clean)) return fence + line.slice(fence.length, line.length);
      // 그 외(태그 조각, 공백 포함 이상 문자열)는 언어 정보 제거
      return fence;
    }
  );

  // 3) Vue mustache / 위키 링크 회피 (코드 영역 제외)
  text = mapOutsideCode(text, (line) =>
    line
      .replace(/\{\{/g, '{&#123;')
      .replace(/\}\}/g, '&#125;}')
      .replace(/\[\[/g, '[&#91;')
      .replace(/\]\]/g, '&#93;]')
  );

  // 4) 불균형 HTML 태그 복구 (코드 블록/인라인 코드 밖에만 적용)
  text = applyTagFixOutsideCode(text);

  return text;
}

function applyTagFixOutsideCode(text) {
  const blocks = [];
  const stash = (m) => {
    blocks.push(m);
    return `\u0000BLK${blocks.length - 1}\u0000`;
  };
  // 펜스 블록 보호
  let protectedText = text.replace(/^(`{3,}[^\n]*\n[\s\S]*?^\1[ \t]*$|~{3,}[^\n]*\n[\s\S]*?^\1[ \t]*$)/gm, stash);
  // 인라인 코드 보호
  protectedText = protectedText.replace(/`[^`\n]+`/g, stash);

  protectedText = fixUnbalancedTags(protectedText);

  protectedText = protectedText.replace(/\u0000BLK(\d+)\u0000/g, (_, i) => blocks[Number(i)]);
  return protectedText;
}

// ---- main ----
if (!fs.existsSync(srcDir)) {
  console.error(`Source directory not found: ${srcDir}`);
  process.exit(1);
}
fs.mkdirSync(destDir, { recursive: true });

let copied = 0;
for (const entry of fs.readdirSync(srcDir)) {
  if (!entry.endsWith('.md')) continue;
  const srcPath = path.join(srcDir, entry);
  if (!fs.statSync(srcPath).isFile()) continue;

  const raw = fs.readFileSync(srcPath, 'utf8');
  fs.writeFileSync(path.join(destDir, entry), sanitize(raw));
  copied++;
}

console.log(`Sanitized & copied ${copied} markdown file(s): ${srcDir} -> ${destDir}`);
