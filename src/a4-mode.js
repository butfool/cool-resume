/**
 * a4-mode.js — A4 预览模式
 *
 * 将简历内容按真实 A4 尺寸（210×297mm）分页渲染，模拟 PDF 输出效果。
 * 顶部编辑栏可在自然流与此模式间切换；打印时复用当前分页 DOM，
 * 保证编辑器中的预览与 PDF 输出一致。
 *
 * 核心思路：
 * 1. 在屏幕外创建一个与 A4 内容区等宽的测量容器，克隆已渲染的简历 DOM；
 * 2. 把简历内容拆成更细的「行」单位：章节标题、条目头部、基本信息块、
 *    技能项、教育经历，以及每一条 bullet；
 * 3. 按行顺序打包进每一页，章节标题尽量与后续第一行保持在同一页；
 * 4. 每一页用 overflow:hidden 的 .a4-page 容器承载分配到的行；
 * 5. 用 CSS transform 按视口宽度缩放整页，避免使用非标准的 zoom；
 * 6. 保留一份原始 DOM 作为重新分页的数据源；打印时直接输出分页 DOM。
 */

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const A4_MARGIN_MM = 14;
const STORAGE_KEY = 'myresume2-a4-preview';

let originalNodes = null;
let isEnabled = false;
let resizeHandler = null;

function mmToPx(mm) {
  // 标准 96 DPI：1 inch = 25.4mm = 96px
  return (mm / 25.4) * 96;
}

/**
 * 克隆 #app 下当前渲染的简历节点（排除 A4 预览自身产生的元素）。
 */
function cloneResumeNodes(app) {
  // 若处于 A4 预览模式，原始内容被收纳在 .a4-original-content 中
  const originalContainer = app.querySelector('.a4-original-content');
  if (originalContainer) {
    return Array.from(originalContainer.childNodes).map(node => node.cloneNode(true));
  }
  return Array.from(app.childNodes)
    .filter(
      node =>
        !(node.nodeType === Node.ELEMENT_NODE &&
          typeof node.className === 'string' &&
          (node.classList.contains('a4-page-wrapper') ||
           node.classList.contains('a4-original-content')))
    )
    .map(node => node.cloneNode(true));
}

/**
 * 创建一行分页单位的外壳。
 */
function createRow(type, child) {
  const wrapper = document.createElement('div');
  wrapper.className = `a4-row a4-row-${type}`;
  wrapper.appendChild(child);
  return wrapper;
}

function createProjectSeparatorRow() {
  const separator = document.createElement('div');
  separator.className = 'a4-project-separator';
  const row = createRow('project-separator', separator);
  row.dataset.keepWithNext = '1';
  return row;
}

/**
 * 把一条 bullet 包装成独立行，保留 list-style 与缩进。
 */
function makeBulletRow(li) {
  const ul = document.createElement('ul');
  ul.style.listStyleType = 'disc';
  ul.style.listStylePosition = 'outside';
  ul.style.paddingLeft = '20px';
  ul.style.margin = '0';
  ul.appendChild(li.cloneNode(true));
  return createRow('bullet', ul);
}

/**
 * 从工作经历 / 项目经历 / 教育经历的 entry 中提取行：
 * - 头部（公司/岗位/日期、项目背景/技术栈/职责、分隔线）作为一行
 * - 每条 summary bullet 作为独立行
 */
function extractEntryRows(entryNode) {
  const rows = [];
  const isProject = entryNode.classList.contains('resume-project-entry');

  const headerRowContent = document.createElement('div');
  headerRowContent.className = isProject
    ? 'a4-row-project-header-content'
    : 'a4-row-entry-header-content';

  const header = entryNode.querySelector(':scope > .resume-entry-header');
  if (header) headerRowContent.appendChild(header.cloneNode(true));

  const meta = entryNode.querySelector(':scope > .resume-project-meta-list');
  if (meta) headerRowContent.appendChild(meta.cloneNode(true));

  const divider = entryNode.querySelector(':scope > .resume-project-divider');
  if (divider) headerRowContent.appendChild(divider.cloneNode(true));

  rows.push(createRow(isProject ? 'project-header' : 'entry-header', headerRowContent));

  const summary = entryNode.querySelector(':scope > .resume-entry-summary');
  if (summary) {
    summary.querySelectorAll(':scope > ul > li').forEach(li => {
      rows.push(makeBulletRow(li));
    });
  }

  return rows;
}

/**
 * 从一个 section 中提取所有行单位。
 */
function extractSectionRows(sectionNode) {
  const rows = [];
  let hasProjectEntry = false;
  const title = sectionNode.querySelector(':scope > .resume-section-title');
  if (title) rows.push(createRow('section-title', title.cloneNode(true)));

  const content = sectionNode.querySelector(':scope > .resume-section-content');
  if (!content) return rows;

  Array.from(content.children).forEach(child => {
    if (child.classList.contains('resume-entry')) {
      if (child.classList.contains('resume-project-entry')) {
        if (hasProjectEntry) rows.push(createProjectSeparatorRow());
        hasProjectEntry = true;
      }
      rows.push(...extractEntryRows(child));
    } else if (child.classList.contains('resume-summary-content')) {
      const ul = child.querySelector(':scope > ul');
      if (ul) {
        Array.from(ul.children).forEach(li => rows.push(makeBulletRow(li)));
      }
    } else if (
      child.classList.contains('resume-basic-info') ||
      child.classList.contains('resume-skill-item')
    ) {
      // 基本信息块保持原有网格布局，每个技能项作为一行
      const type = child.classList.contains('resume-basic-info') ? 'basic-info' : 'skill-item';
      rows.push(createRow(type, child.cloneNode(true)));
    } else {
      rows.push(createRow('other', child.cloneNode(true)));
    }
  });

  return rows;
}

/**
 * 把 #app 下的自然流 DOM 拆分为行单位数组。
 */
function splitIntoRows(naturalNodes) {
  const rows = [];
  naturalNodes.forEach(node => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    if (node.classList.contains('resume-header')) {
      rows.push(createRow('header', node.cloneNode(true)));
    } else if (node.classList.contains('resume-section')) {
      rows.push(...extractSectionRows(node));
    } else {
      rows.push(createRow('other', node.cloneNode(true)));
    }
  });

  // 章节标题尽量与紧随其后的内容行保持在同一页，避免标题孤悬页尾
  for (let i = 0; i < rows.length - 1; i++) {
    if (rows[i].classList.contains('a4-row-section-title')) {
      rows[i].dataset.keepWithNext = '1';
    }
  }

  return rows;
}

/**
 * 在屏幕外测量每个行单位按顺序加入后的累积高度。
 * 返回的 cumulativeHeights[i] 表示前 i+1 个行在 A4 内容区里的总高度。
 */
function measureCumulativeHeights(rows, contentWidthMm) {
  const widthPx = mmToPx(contentWidthMm);
  const measurer = document.createElement('div');
  measurer.className = 'a4-measurer';
  measurer.style.width = `${widthPx}px`;
  document.body.appendChild(measurer);

  const cumulativeHeights = [];
  rows.forEach(row => {
    measurer.appendChild(row.cloneNode(true));
    cumulativeHeights.push(measurer.scrollHeight);
  });

  document.body.removeChild(measurer);
  return cumulativeHeights;
}

/**
 * 将行单位顺序打包到页面中。
 * 章节标题会与下一行做 keep-with-next 处理；单行超高时允许溢出独占一页。
 */
function distributeRowsIntoPages(rows, contentWidthMm, contentHeightMm) {
  if (rows.length === 0) return [];

  const pageHeightPx = mmToPx(contentHeightMm);
  const cumulativeHeights = measureCumulativeHeights(rows, contentWidthMm);
  const pages = [];
  let pageStart = 0;

  function heightOf(start, end) {
    // [start, end)
    return cumulativeHeights[end - 1] - (start > 0 ? cumulativeHeights[start - 1] : 0);
  }

  let i = 0;
  while (i < rows.length) {
    let desiredEnd = i + 1;
    const shouldGroup =
      rows[i].dataset.keepWithNext === '1' && i + 1 < rows.length;

    if (shouldGroup) {
      const freshGroupHeight = cumulativeHeights[i + 1] - (i > 0 ? cumulativeHeights[i - 1] : 0);
      if (freshGroupHeight <= pageHeightPx) {
        desiredEnd = i + 2;
      }
    }

    const projectedHeight = heightOf(pageStart, desiredEnd);

    if (projectedHeight <= pageHeightPx) {
      i = desiredEnd;
      continue;
    }

    // 当前页放不下，先结束当前页
    if (i > pageStart) {
      pages.push(rows.slice(pageStart, i));
      pageStart = i;
      continue;
    }

    // 已经在新页开头仍放不下
    if (desiredEnd === i + 2) {
      // 标题 + 下一行整体放不下，尝试只放标题
      const singleHeight = cumulativeHeights[i] - (i > 0 ? cumulativeHeights[i - 1] : 0);
      if (singleHeight <= pageHeightPx) {
        i = i + 1;
        continue;
      }
    }

    // 单行就超过一页高度，强制独占一页（允许溢出）
    pages.push(rows.slice(i, desiredEnd));
    pageStart = desiredEnd;
    i = desiredEnd;
  }

  if (pageStart < rows.length) {
    pages.push(rows.slice(pageStart));
  }

  // 项目边界若刚好跨页，换页本身已形成分隔；不要在新页顶部再留 32px。
  return pages.map(pageRows =>
    pageRows[0]?.classList.contains('a4-row-project-separator')
      ? pageRows.slice(1)
      : pageRows
  );
}

/**
 * 根据视口宽度更新 A4 预览缩放比例。
 * 单页宽度 210mm，若视口不够则等比缩小；大屏保持 1:1。
 */
function updateA4Scale() {
  const availableWidth = Math.max(320, window.innerWidth - 32); // 留 16px 边距
  const pageWidthPx = mmToPx(A4_WIDTH_MM);
  const scale = Math.min(1, availableWidth / pageWidthPx);
  document.documentElement.style.setProperty('--a4-preview-scale', String(scale));
}

/**
 * 渲染 A4 分页预览。
 */
function renderA4Pages(app, naturalNodes) {
  const contentWidthMm = A4_WIDTH_MM - A4_MARGIN_MM * 2;
  const contentHeightMm = A4_HEIGHT_MM - A4_MARGIN_MM * 2;

  const rows = splitIntoRows(naturalNodes);
  const pages = distributeRowsIntoPages(rows, contentWidthMm, contentHeightMm);

  // 清空 #app，随后放入原始内容（打印用）与分页预览容器
  app.innerHTML = '';

  // 保留原始内容，打印时自动切回
  const originalContainer = document.createElement('div');
  originalContainer.className = 'a4-original-content';
  naturalNodes.forEach(node => originalContainer.appendChild(node.cloneNode(true)));
  app.appendChild(originalContainer);

  pages.forEach((pageRows, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'a4-page-wrapper';

    const page = document.createElement('div');
    page.className = 'a4-page';

    const content = document.createElement('div');
    content.className = 'a4-page-content';
    pageRows.forEach(row => content.appendChild(row.cloneNode(true)));

    const pageNumber = document.createElement('span');
    pageNumber.className = 'a4-page-number';
    pageNumber.textContent = `${index + 1} / ${pages.length}`;

    page.appendChild(content);
    page.appendChild(pageNumber);
    wrapper.appendChild(page);
    app.appendChild(wrapper);
  });

  updateA4Scale();
}

export function getStoredA4Preview() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setA4Preview(enabled, forceRecapture = false) {
  isEnabled = !!enabled;
  const app = document.getElementById('app');
  if (!app) return;

  if (isEnabled) {
    // 始终以自然流 DOM 为源；若当前已是预览状态，.a4-original-content 里就是自然流副本
    const naturalContainer = app.querySelector('.a4-original-content');
    if (forceRecapture || !originalNodes || !naturalContainer) {
      originalNodes = naturalContainer
        ? Array.from(naturalContainer.childNodes).map(node => node.cloneNode(true))
        : cloneResumeNodes(app);
    }

    document.documentElement.classList.add('a4-preview-mode');
    document.body.classList.add('a4-preview-mode');
    renderA4Pages(app, originalNodes);
  } else {
    document.documentElement.classList.remove('a4-preview-mode');
    document.body.classList.remove('a4-preview-mode');
    app.querySelectorAll('.a4-page-wrapper').forEach(el => el.remove());
    const originalContainer = app.querySelector('.a4-original-content');
    if (originalContainer) originalContainer.remove();
    if (originalNodes) {
      app.innerHTML = '';
      originalNodes.forEach(node => app.appendChild(node.cloneNode(true)));
    }
  }

  try {
    localStorage.setItem(STORAGE_KEY, isEnabled ? '1' : '0');
  } catch {
    // ignore
  }
}

/**
 * 当 A4 模式已开启时，强制重新分页（用于间距/主题变化后）。
 */
export function refreshA4Preview() {
  if (!isEnabled) return;
  const app = document.getElementById('app');
  if (!app) return;
  // 从当前保存的自然流副本重新捕获
  originalNodes = cloneResumeNodes(app);
  if (!originalNodes || originalNodes.length === 0) return;
  renderA4Pages(app, originalNodes);
}

/**
 * 初始化窗口 resize 监听，动态调整 A4 缩放。
 */
export function initA4ResizeListener() {
  if (resizeHandler) return;
  resizeHandler = () => {
    if (isEnabled) updateA4Scale();
  };
  window.addEventListener('resize', resizeHandler);
}
