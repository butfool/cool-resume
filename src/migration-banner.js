/**
 * migration-banner.js — Dev mode 旧格式版本横幅
 *
 * 启动时与每次版本树变更后调用 ensureMigrationBanner(),会在 body 顶部插入一条
 * 黄色边框的不可关闭 banner,直到所有本地版本 schemaVersion >= bundled target。
 *
 * 设计选择:
 *  - 永远不可关闭: 唯一解除途径是迁移完成或回到正确的 schema,避免用户“稍后再处理”后遗忘。
 *  - 位置: body 第一个元素,超出 toolbar 与 JSON editor 之上;不取 toolbar 位置,避免与现有 UI 状态机冲突。
 *  - 不重 import main.js / dev-panel.js ,只 fetch + DOM ,保持模块零耦合。
 */

const ENDPOINTS = {
  list: '/__resume_versions/legacy-versions',
  migrate: '/__resume_versions/migrate-all',
};

let bannerElement = null;
let inFlight = false;
let pollHandle = null;

function ensureBannerElement() {
  if (bannerElement && document.body.contains(bannerElement)) return bannerElement;
  const node = document.createElement('div');
  node.className = 'resume-migration-banner';
  node.setAttribute('role', 'alert');
  node.setAttribute('aria-live', 'assertive');
  node.hidden = true;
  document.body.prepend(node);
  bannerElement = node;
  return node;
}

function setBannerContent(node, { target, count, versions, busy, error }) {
  if (error) {
    node.className = 'resume-migration-banner resume-migration-banner-error';
    node.innerHTML = `
      <div class="resume-migration-banner-body">
        <strong>无法检查迁移状态</strong>
        <div class="resume-migration-banner-detail">${escapeHtml(error)}</div>
      </div>`;
    node.hidden = false;
    return;
  }
  if (!count) {
    node.hidden = true;
    node.innerHTML = '';
    return;
  }
  node.className = 'resume-migration-banner';
  const versionList = versions.slice(0, 5).map(v => `<code>${escapeHtml(v.id)}</code> <small>v${v.schemaVersion ?? '?'}</small>`).join(' ');
  const overflow = versions.length > 5 ? `<small>…还有 ${versions.length - 5} 个</small>` : '';
  node.innerHTML = `
    <div class="resume-migration-banner-body">
      <strong>发现 ${count} 个本地版本落后 (目标 schema v${target ?? '?'})</strong>
      <div class="resume-migration-banner-detail">${versionList} ${overflow}</div>
      <div class="resume-migration-banner-hint">运行 <code>npm run migrate</code> 升级,或点击下方按钮一键迁移。</div>
    </div>
    <div class="resume-migration-banner-actions">
      <button type="button" class="resume-migration-banner-button" data-action="migrate" ${busy ? 'disabled' : ''}>${busy ? '迁移中…' : '一键迁移'}</button>
    </div>`;
  node.hidden = false;
}

function escapeHtml(text) {
  return String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

async function refreshBanner({ busy = false } = {}) {
  const node = ensureBannerElement();
  try {
    const res = await fetch(ENDPOINTS.list);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    setBannerContent(node, { ...data, busy });
  } catch (error) {
    setBannerContent(node, { error: error.message });
  }
}

async function onBannerClick(event) {
  const button = event.target.closest('[data-action="migrate"]');
  if (!button || inFlight) return;
  inFlight = true;
  await refreshBanner({ busy: true });
  try {
    const res = await fetch(ENDPOINTS.migrate, { method: 'POST' });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      throw new Error(body.error || `HTTP ${res.status}`);
    }
  } catch (error) {
    inFlight = false;
    const node = ensureBannerElement();
    setBannerContent(node, { error: `迁移失败: ${error.message}` });
    return;
  }
  inFlight = false;
  await refreshBanner({ busy: false });
}

export function ensureMigrationBanner() {
  const node = ensureBannerElement();
  if (!node.dataset.bound) {
    node.addEventListener('click', onBannerClick);
    node.dataset.bound = 'true';
  }
  refreshBanner();
  // 每 8 秒轮询一次,覆盖 AI / 外部脚本同时编辑 data/ 的场景;有 banner 时才走轮询。
  if (pollHandle == null) {
    pollHandle = window.setInterval(() => {
      if (!bannerElement?.hidden) refreshBanner();
    }, 8000);
  }
}

export function teardownMigrationBanner() {
  if (pollHandle != null) {
    window.clearInterval(pollHandle);
    pollHandle = null;
  }
  if (bannerElement && bannerElement.parentElement) bannerElement.remove();
  bannerElement = null;
}