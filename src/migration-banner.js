/**
 * migration-banner.js — Dev mode 旧格式版本迁移提示 (PopOver 形式)
 *
 * 启动后每 8 秒探测一次 data/versions/*.json 的 schema 状态:
 *   - count = 0 → 页面上完全无痕
 *   - count > 0 → 右下角出现一个红色悬浮徽标 (不遮挡简历预览),点击弹出 PopOver:
 *       说明旧格式会影响展示 → 列出落后版本 → 「一键迁移」按钮
 *   - 迁移完成后徽标与 PopOver 自动消失
 *
 * 设计选择:
 *  - PopOver 而非顶置 banner: banner 会挤压/遮挡简历预览;PopOver 只在用户主动查看时展开。
 *  - 徽标常驻直至迁移完成,不可关闭——唯一解除途径是迁移完成,避免"稍后再处理"后遗忘。
 *  - 点击 PopOver 以外区域关闭 PopOver,但徽标仍在。
 *  - 不 import main.js / dev-panel.js,只 fetch + DOM,保持模块零耦合。
 */

const ENDPOINTS = {
  list: '/__resume_versions/legacy-versions',
  migrate: '/__resume_versions/migrate-all',
};

let rootElement = null;
let popoverOpen = true; // 默认弹出: 让"会丢失内容地展示"的警告第一眼就被看到
let popoverDismissedByUser = false; // 用户主动收起后,轮询不再强行弹回 (FAB 徽标仍在)
let inFlight = false;
let pollHandle = null;

function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function ensureRootElement() {
  if (rootElement && document.body.contains(rootElement)) return rootElement;
  const node = document.createElement('div');
  node.className = 'resume-migration-popover-root';
  node.innerHTML = `
    <button type="button" class="resume-migration-fab" data-migration-fab hidden aria-haspopup="dialog">
      <span class="resume-migration-fab-dot" aria-hidden="true"></span>
      <span class="resume-migration-fab-label">迁移</span>
    </button>
    <div class="resume-migration-popover" data-migration-popover role="dialog" aria-modal="false" aria-label="简历数据迁移" hidden></div>`;
  document.body.appendChild(node);
  rootElement = node;
  return node;
}

function renderPopoverContent(node, { target, count, versions, busy, error }) {
  if (error) {
    node.innerHTML = `
      <div class="resume-migration-popover-title resume-migration-popover-error">无法检查迁移状态</div>
      <div class="resume-migration-popover-detail">${escapeHtml(error)}</div>`;
    return;
  }
  const versionList = versions.slice(0, 5).map(v => `<code>${escapeHtml(v.id)}</code> <small>v${v.schemaVersion ?? '?'}</small>`).join(' ');
  const overflow = versions.length > 5 ? `<small>…还有 ${versions.length - 5} 个</small>` : '';
  node.innerHTML = `
    <div class="resume-migration-popover-title">⚠️ ${count} 个版本数据格式陈旧</div>
    <div class="resume-migration-popover-desc">旧格式数据<strong>会丢失内容地展示</strong>(如联系方式、技能条目不渲染),迁移后才能正确展示。</div>
    <div class="resume-migration-popover-detail">${versionList} ${overflow}</div>
    <button type="button" class="resume-migration-popover-button" data-action="migrate" ${busy ? 'disabled' : ''}>${busy ? '迁移中…' : '一键迁移'}</button>`;
}

/** 更新徽标可见性与 PopOver 内容。count=0 时整组无痕。 */
function applyState({ target, count, versions, busy, error }) {
  const root = ensureRootElement();
  const fab = root.querySelector('[data-migration-fab]');
  const popover = root.querySelector('[data-migration-popover]');

  if (!error && !count) {
    fab.hidden = true;
    popover.hidden = true;
    popoverOpen = false;
    return;
  }

  fab.hidden = false;
  const badge = fab.querySelector('.resume-migration-fab-badge');
  if (badge) badge.remove();
  if (!error && count) {
    const dot = document.createElement('span');
    dot.className = 'resume-migration-fab-badge';
    dot.textContent = count > 99 ? '99+' : String(count);
    fab.appendChild(dot);
  }
  renderPopoverContent(popover, { target, count, versions, busy, error });
  // 默认弹出: 只在 PopOver 尚未被用户主动收起过的会话内保持弹出;
  // 用户收起后不再纠缠 (FAB 徽标仍在,随时可再打开)。
  if (!popoverDismissedByUser) popover.hidden = !popoverOpen;
}

async function refreshState({ busy = false } = {}) {
  try {
    const res = await fetch(ENDPOINTS.list);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    applyState({ ...data, busy });
  } catch (error) {
    applyState({ error: error.message });
  }
}

function setPopoverOpen(open) {
  popoverOpen = open;
  if (!open) popoverDismissedByUser = true;
  const popover = rootElement?.querySelector('[data-migration-popover]');
  if (popover) popover.hidden = !open;
}

async function onRootClick(event) {
  const root = ensureRootElement();
  if (event.target.closest('[data-migration-fab]')) {
    setPopoverOpen(!popoverOpen);
    return;
  }
  const button = event.target.closest('[data-action="migrate"]');
  if (!button || inFlight) return;
  inFlight = true;
  applyState({ target: null, count: 1, versions: [], busy: true });
  try {
    const res = await fetch(ENDPOINTS.migrate, { method: 'POST' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
    popoverOpen = false;
  } catch (error) {
    inFlight = false;
    applyState({ error: `迁移失败: ${error.message}` });
    return;
  }
  inFlight = false;
  await refreshState({ busy: false });
}

function onDocumentPointerDown(event) {
  if (!popoverOpen || !rootElement) return;
  if (rootElement.contains(event.target)) return;
  setPopoverOpen(false);
}

export function ensureMigrationBanner() {
  const root = ensureRootElement();
  if (!root.dataset.bound) {
    root.addEventListener('click', onRootClick);
    document.addEventListener('pointerdown', onDocumentPointerDown);
    root.dataset.bound = 'true';
  }
  refreshState();
  // 每 8 秒轮询一次,覆盖 AI / 外部脚本同时编辑 data/ 的场景。
  // 注意: 不能用 "徽标可见才轮询" 作守卫——那会让无痕期间发生的格式退化永远不被发现,
  // 而 "从干净变脏" 恰恰是轮询存在的目的。dev-only 本地请求,无意义优化不开销。
  if (pollHandle == null) {
    pollHandle = window.setInterval(() => { refreshState(); }, 8000);
  }
}

export function teardownMigrationBanner() {
  if (pollHandle != null) {
    window.clearInterval(pollHandle);
    pollHandle = null;
  }
  document.removeEventListener('pointerdown', onDocumentPointerDown);
  if (rootElement && rootElement.parentElement) rootElement.remove();
  rootElement = null;
}