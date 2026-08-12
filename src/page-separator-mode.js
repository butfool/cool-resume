/**
 * page-separator-mode.js — 分页分隔线预览
 *
 * 将简历内容按真实 A4 尺寸（210×297mm）分页渲染，仅用于显示预览分页分隔线。
 * 顶部编辑栏可在连续预览与分页分隔线之间切换；打印时复用分页 DOM，
 * 保证预览分隔和 PDF 输出一致。
 *
 * 核心思路：
 * 1. 在屏幕外创建一个与 A4 内容区等宽的测量容器，克隆已渲染的简历 DOM；
 * 2. 把简历内容拆成更细的「行」单位：章节标题、条目头部、基本信息块、
 *    技能项、教育经历，以及每一条 bullet；
 * 3. 按行顺序打包进每一页，章节标题尽量与后续第一行保持在同一页；
 * 4. 每一页用 overflow:hidden 的 .page-separator-page 容器承载分配到的行；
 * 5. 用 CSS transform 按视口宽度缩放整页，避免使用非标准的 zoom；
 * 6. 保留一份原始 DOM 作为重新分页的数据源；打印时直接输出分页 DOM。
 */

const A4_WIDTH_MM = 210;
const A4_HEIGHT_MM = 297;
const A4_MARGIN_MM = 14;
// The separated-preview and A4 PDF contract is 210 x 297mm with a 14mm safe
// margin on every edge, leaving 182 x 269mm for normal page content.
const PAGE_CONTENT_WIDTH_MM = A4_WIDTH_MM - A4_MARGIN_MM * 2;
const PAGE_CONTENT_HEIGHT_MM = A4_HEIGHT_MM - A4_MARGIN_MM * 2;
const STORAGE_KEY = 'myresume2-page-separators';

let originalNodes = null;
let showPageSeparators = false;
let resizeHandler = null;

function mmToPx(mm) {
  // 标准 96 DPI：1 inch = 25.4mm = 96px
  return (mm / 25.4) * 96;
}

/**
 * 克隆 #app 下当前渲染的简历节点（排除分页分隔线自身产生的元素）。
 */
function cloneResumeNodes(app) {
  // 若已显示分页分隔线，原始内容被收纳在 .page-separator-original-content 中
  const originalContainer = app.querySelector('.page-separator-original-content');
  if (originalContainer) {
    return Array.from(originalContainer.childNodes).map(node => node.cloneNode(true));
  }
  return Array.from(app.childNodes)
    .filter(
      node =>
        !(node.nodeType === Node.ELEMENT_NODE &&
          typeof node.className === 'string' &&
          (node.classList.contains('page-separator-page-wrapper') ||
           node.classList.contains('page-separator-original-content')))
    )
    .map(node => node.cloneNode(true));
}

/**
 * 创建一行分页单位的外壳。
 */
function createRow(type, child) {
  const wrapper = document.createElement('div');
  wrapper.className = `page-separator-row page-separator-row-${type}`;
  wrapper.appendChild(child);
  return wrapper;
}

function createProjectSeparatorRow() {
  const separator = document.createElement('div');
  separator.className = 'page-separator-project-separator';
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
    ? 'page-separator-row-project-header-content'
    : 'page-separator-row-entry-header-content';

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
    if (rows[i].classList.contains('page-separator-row-section-title')) {
      rows[i].dataset.keepWithNext = '1';
    }
  }

  return rows;
}

/**
 * 在与已渲染页面相同的内容区上下文中测量候选行。
 * 页面首尾行的 margin 规则由 .page-separator-page-content 共同生效，避免
 * 从全局累计高度中减去不属于当前页面的间距。
 */
function createPageContentMeasurer(contentWidthMm) {
  const widthPx = mmToPx(contentWidthMm);
  const measurer = document.createElement('div');
  measurer.className = 'page-separator-measurer';
  measurer.style.width = `${widthPx}px`;

  const content = document.createElement('div');
  content.className = 'page-separator-page-content';
  measurer.appendChild(content);
  document.body.appendChild(measurer);

  return { measurer, content };
}

function measureCandidatePageContent(rows, contentWidthMm) {
  const { measurer, content } = createPageContentMeasurer(contentWidthMm);
  rows.forEach(row => content.appendChild(row.cloneNode(true)));
  const height = content.scrollHeight;

  document.body.removeChild(measurer);
  return height;
}

/**
 * 将行单位顺序打包到页面中。
 * 章节标题会与下一行做 keep-with-next 处理；单行超高时允许溢出独占一页。
 */
function distributeRowsIntoPages(rows, contentWidthMm, contentHeightMm) {
  if (rows.length === 0) return [];

  const pageHeightPx = mmToPx(contentHeightMm);
  const pages = [];
  let currentPage = [];
  let pendingKeepWithNext = null;

  function commitCurrentPage() {
    if (currentPage.length > 0) pages.push(currentPage);
    currentPage = [];
  }

  rows.forEach(row => {
    if (row.dataset.keepWithNext === '1') {
      pendingKeepWithNext = row;
      return;
    }

    let candidateRows = pendingKeepWithNext ? [pendingKeepWithNext, row] : [row];
    while (candidateRows.length > 0) {
      const candidatePage = [...currentPage, ...candidateRows];
      const fits = measureCandidatePageContent(candidatePage, contentWidthMm) <= pageHeightPx;
      if (fits) {
        currentPage = candidatePage;
        pendingKeepWithNext = null;
        break;
      }

      if (currentPage.length > 0) {
        const pendingIsProjectSeparator = pendingKeepWithNext?.classList.contains(
          'page-separator-row-project-separator'
        );
        commitCurrentPage();
        if (pendingIsProjectSeparator) {
          // A project separator only describes an on-page relationship. Drop it
          // before starting the next project on a fresh page so it reserves no height.
          pendingKeepWithNext = null;
          candidateRows = [row];
        }
        continue;
      }

      if (pendingKeepWithNext?.classList.contains('page-separator-row-project-separator')) {
        pendingKeepWithNext = null;
        candidateRows = [row];
        continue;
      }

      if (pendingKeepWithNext) {
        // Keep a title with its first row whenever that pair fits. If the pair
        // itself is too tall, retain the title and retry the following row alone.
        currentPage = [pendingKeepWithNext];
        pendingKeepWithNext = null;
        candidateRows = [row];
        continue;
      }

      // A single exceptional row exceeds the safe content height. Keep it in a
      // dedicated page rather than dropping or duplicating it.
      currentPage = candidateRows;
      commitCurrentPage();
      break;
    }
  });

  if (pendingKeepWithNext) {
    if (pendingKeepWithNext.classList.contains('page-separator-row-project-separator')) {
      pendingKeepWithNext = null;
    } else {
      const candidatePage = [...currentPage, pendingKeepWithNext];
      if (measureCandidatePageContent(candidatePage, contentWidthMm) > pageHeightPx && currentPage.length > 0) {
        commitCurrentPage();
      }
      currentPage.push(pendingKeepWithNext);
    }
  }
  commitCurrentPage();

  return pages;
}

/**
 * 根据视口宽度更新分页分隔线预览缩放比例。
 * 单页宽度 210mm，若视口不够则等比缩小；大屏保持 1:1。
 */
function updatePageSeparatorScale() {
  const availableWidth = Math.max(320, window.innerWidth - 32); // 留 16px 边距
  const pageWidthPx = mmToPx(A4_WIDTH_MM);
  const scale = Math.min(1, availableWidth / pageWidthPx);
  document.documentElement.style.setProperty('--page-separator-scale', String(scale));
}

/**
 * 渲染分页分隔线预览。
 */
function renderSeparatedPages(app, naturalNodes) {
  const rows = splitIntoRows(naturalNodes);
  const pages = distributeRowsIntoPages(rows, PAGE_CONTENT_WIDTH_MM, PAGE_CONTENT_HEIGHT_MM);

  // 清空 #app，随后放入原始内容（打印用）与分页预览容器
  app.innerHTML = '';

  // 保留原始内容，打印时自动切回
  const originalContainer = document.createElement('div');
  originalContainer.className = 'page-separator-original-content';
  naturalNodes.forEach(node => originalContainer.appendChild(node.cloneNode(true)));
  app.appendChild(originalContainer);

  pages.forEach((pageRows, index) => {
    const wrapper = document.createElement('div');
    wrapper.className = 'page-separator-page-wrapper';

    const contentHeightPx = measureCandidatePageContent(pageRows, PAGE_CONTENT_WIDTH_MM);
    const safeContentHeightPx = mmToPx(PAGE_CONTENT_HEIGHT_MM);
    if (contentHeightPx > safeContentHeightPx) {
      // An exceptional one-row page cannot fit on A4. Grow only the preview
      // wrapper so every line remains inspectable instead of being clipped.
      const expandedPageHeightPx = contentHeightPx + mmToPx(A4_MARGIN_MM * 2);
      wrapper.style.setProperty('--page-separator-page-height', `${expandedPageHeightPx}px`);
      wrapper.classList.add('page-separator-page-wrapper-oversized');
    }

    const page = document.createElement('div');
    page.className = 'page-separator-page';

    const content = document.createElement('div');
    content.className = 'page-separator-page-content';
    pageRows.forEach(row => content.appendChild(row.cloneNode(true)));

    const pageNumber = document.createElement('span');
    pageNumber.className = 'page-separator-page-number';
    pageNumber.textContent = `${index + 1} / ${pages.length}`;

    page.appendChild(content);
    page.appendChild(pageNumber);
    wrapper.appendChild(page);
    app.appendChild(wrapper);
  });

  updatePageSeparatorScale();
}

export function getStoredPageSeparators() {
  try {
    return localStorage.getItem(STORAGE_KEY) === '1';
  } catch {
    return false;
  }
}

export function setPageSeparators(enabled, forceRecapture = false) {
  showPageSeparators = !!enabled;
  const app = document.getElementById('app');
  if (!app) return;

  if (showPageSeparators) {
    // 始终以自然流 DOM 为源；若当前已是预览状态，.page-separator-original-content 里就是自然流副本
    const naturalContainer = app.querySelector('.page-separator-original-content');
    if (forceRecapture || !originalNodes || !naturalContainer) {
      originalNodes = naturalContainer
        ? Array.from(naturalContainer.childNodes).map(node => node.cloneNode(true))
        : cloneResumeNodes(app);
    }

    document.documentElement.classList.add('page-separator-mode');
    document.body.classList.add('page-separator-mode');
    renderSeparatedPages(app, originalNodes);
  } else {
    document.documentElement.classList.remove('page-separator-mode');
    document.body.classList.remove('page-separator-mode');
    app.querySelectorAll('.page-separator-page-wrapper').forEach(el => el.remove());
    const originalContainer = app.querySelector('.page-separator-original-content');
    if (originalContainer) originalContainer.remove();
    if (originalNodes) {
      app.innerHTML = '';
      originalNodes.forEach(node => app.appendChild(node.cloneNode(true)));
    }
  }

  try {
    localStorage.setItem(STORAGE_KEY, showPageSeparators ? '1' : '0');
  } catch {
    // ignore
  }
}

/**
 * 当分页分隔线已开启时，强制重新分页（用于间距或主题变化后）。
 */
export function refreshPageSeparators() {
  if (!showPageSeparators) return;
  const app = document.getElementById('app');
  if (!app) return;
  // 从当前保存的自然流副本重新捕获
  originalNodes = cloneResumeNodes(app);
  if (!originalNodes || originalNodes.length === 0) return;
  renderSeparatedPages(app, originalNodes);
}

/**
 * 初始化窗口 resize 监听，动态调整分页分隔线缩放。
 */
export function initPageSeparatorResizeListener() {
  if (resizeHandler) return;
  resizeHandler = () => {
    if (showPageSeparators) updatePageSeparatorScale();
  };
  window.addEventListener('resize', resizeHandler);
}
