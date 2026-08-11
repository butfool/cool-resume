import bundledCatalog from '../data-example/catalog.json';

const bundledFiles = import.meta.glob('../data-example/versions/*.json', { eager: true, import: 'default' });
const ACTIVE_KEY = 'myresume2-active-version';
const DB_NAME = 'myresume2-resume-versions';
const DB_VERSION = 2;
const CATALOG_KEY = 'catalog';
const EMPTY_RESUME = {
  name: '', title: '', experience: '',
  basicInfo: { items: [] }, work: [], projects: [], skills: [], education: [],
};

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function bundledPath(file) {
  return `../data-example/${file}`;
}

function getBundledVersion(versionId, catalog = bundledCatalog) {
  const entry = catalog.versions.find(item => item.id === versionId);
  if (!entry) throw new Error(`未知简历版本：${versionId}`);
  const data = bundledFiles[bundledPath(entry.file)];
  if (!data) throw new Error(`找不到简历数据：${entry.file}`);
  return { entry, data: clone(data) };
}

function readStoredActive() {
  try { return localStorage.getItem(ACTIVE_KEY) || null; } catch { return null; }
}

function writeStoredActive(versionId) {
  try { localStorage.setItem(ACTIVE_KEY, versionId); } catch { /* ignore */ }
}

function openDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains('versions')) request.result.createObjectStore('versions', { keyPath: 'key' });
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function idbGet(key) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction('versions').objectStore('versions').get(key);
    request.onsuccess = () => resolve(request.result?.value);
    request.onerror = () => reject(request.error);
  });
}

async function idbPut(key, value) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction('versions', 'readwrite').objectStore('versions').put({ key, value });
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

async function idbDelete(key) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const request = db.transaction('versions', 'readwrite').objectStore('versions').delete(key);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}

function createVersionId() {
  const suffix = globalThis.crypto?.randomUUID?.().slice(0, 8) || Math.random().toString(36).slice(2, 10);
  return `v-${Date.now().toString(36)}-${suffix}`;
}

function moveEntries(catalog, versionId, targetId, placement) {
  const moving = catalog.versions.find(item => item.id === versionId);
  const target = catalog.versions.find(item => item.id === targetId);
  if (!moving || !target || moving.id === target.id) throw new Error('无效的拖拽目标');
  const movingIds = new Set([versionId]);
  let changed = true;
  while (changed) {
    changed = false;
    catalog.versions.forEach(item => {
      if (movingIds.has(item.parentId) && !movingIds.has(item.id)) { movingIds.add(item.id); changed = true; }
    });
  }
  if (movingIds.has(targetId)) throw new Error('不能移动到自身或子版本中');
  const remaining = catalog.versions.filter(item => !movingIds.has(item.id));
  const targetIndex = remaining.findIndex(item => item.id === targetId);
  const targetSubtreeIds = new Set([targetId]);
  let expanded = true;
  while (expanded) {
    expanded = false;
    remaining.forEach(item => {
      if (targetSubtreeIds.has(item.parentId) && !targetSubtreeIds.has(item.id)) { targetSubtreeIds.add(item.id); expanded = true; }
    });
  }
  const subtreeEnd = remaining.reduce((index, item, itemIndex) => targetSubtreeIds.has(item.id) ? Math.max(index, itemIndex) : index, targetIndex);
  const insertIndex = placement === 'before' ? targetIndex : placement === 'after' || placement === 'child' ? subtreeEnd + 1 : -1;
  if (insertIndex < 0) throw new Error('无效的拖拽位置');
  const nextMoving = catalog.versions.filter(item => movingIds.has(item.id)).map(item => item.id === versionId ? { ...item, parentId: placement === 'child' ? targetId : target.parentId, updatedAt: new Date().toISOString() } : item);
  remaining.splice(insertIndex, 0, ...nextMoving);
  return { ...catalog, versions: remaining };
}

export function createResumeStore() {
  const dev = import.meta.env.DEV;
  let catalog = clone(bundledCatalog);

  async function persistCatalog() {
    if (!dev) await idbPut(CATALOG_KEY, clone(catalog));
  }

  async function loadCatalog() {
    if (dev) {
      const response = await fetch('/__resume_versions');
      if (!response.ok) throw new Error(`版本目录读取失败：HTTP ${response.status}`);
      catalog = await response.json();
    } else {
      const stored = await idbGet(CATALOG_KEY);
      if (stored?.schemaVersion === bundledCatalog.schemaVersion && Array.isArray(stored.versions)) catalog = stored;
      else await persistCatalog();
    }
    return catalog;
  }

  function findEntry(versionId) {
    const entry = catalog.versions.find(item => item.id === versionId);
    if (!entry) throw new Error(`未知简历版本：${versionId}`);
    return entry;
  }

  function getChildren(versionId) {
    return catalog.versions.filter(item => item.parentId === versionId);
  }

  async function getVersion(versionId) {
    const entry = findEntry(versionId);
    if (dev) {
      const response = await fetch(`/__resume_versions/${encodeURIComponent(versionId)}`);
      if (!response.ok) throw new Error(`简历版本读取失败：HTTP ${response.status}`);
      return response.json();
    }
    const local = await idbGet(`data:${versionId}`);
    if (local) return clone(local);
    return getBundledVersion(entry.id, catalog).data;
  }

  async function setActive(versionId) {
    findEntry(versionId);
    if (dev) {
      const response = await fetch('/__resume_versions/active', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ versionId }) });
      if (!response.ok) throw new Error(`当前版本保存失败：HTTP ${response.status}`);
      catalog = await response.json();
    } else {
      catalog.activeVersionId = versionId;
      await persistCatalog();
      writeStoredActive(versionId);
    }
    return { versionId, data: await getVersion(versionId) };
  }

  return {
    mode: dev ? 'filesystem' : 'indexeddb',
    async init() { await loadCatalog(); return this; },
    getCatalog: () => clone(catalog),
    getActive: async () => {
      const stored = !dev && readStoredActive();
      const versionId = catalog.versions.some(item => item.id === stored) ? stored : catalog.activeVersionId;
      return { versionId, data: await getVersion(versionId) };
    },
    getVersion,
    setActive,
    async moveVersion(versionId, targetId, placement) {
      findEntry(versionId);
      findEntry(targetId);
      if (!['before', 'after', 'child'].includes(placement)) throw new Error('无效的拖拽位置');
      if (dev) {
        const response = await fetch(`/__resume_versions/${encodeURIComponent(versionId)}/move`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ targetId, placement }) });
        if (!response.ok) throw new Error((await response.json()).error || `版本移动失败：HTTP ${response.status}`);
        catalog = await response.json();
      } else {
        catalog = moveEntries(catalog, versionId, targetId, placement);
        await persistCatalog();
      }
      return clone(catalog);
    },
    async createVersion({ name, parentId = null, copyFromVersionId = null }) {
      const normalizedName = String(name || '').trim();
      if (!normalizedName) throw new Error('版本名称不能为空');
      if (parentId !== null) findEntry(parentId);
      if (copyFromVersionId !== null) findEntry(copyFromVersionId);
      if (dev) {
        const response = await fetch('/__resume_versions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: normalizedName, parentId, copyFromVersionId }) });
        if (!response.ok) throw new Error((await response.json()).error || `创建版本失败：HTTP ${response.status}`);
        const result = await response.json();
        catalog = result.catalog;
        return { versionId: result.versionId, data: result.data };
      }
      const versionId = createVersionId();
      const data = copyFromVersionId ? await getVersion(copyFromVersionId) : clone(EMPTY_RESUME);
      const now = new Date().toISOString();
      catalog.versions.push({ id: versionId, name: normalizedName, parentId, file: `versions/${versionId}.json`, createdAt: now, updatedAt: now });
      await idbPut(`data:${versionId}`, clone(data));
      await persistCatalog();
      return { versionId, data: clone(data) };
    },
    async renameVersion(versionId, name) {
      const normalizedName = String(name || '').trim();
      if (!normalizedName) throw new Error('版本名称不能为空');
      findEntry(versionId);
      if (dev) {
        const response = await fetch(`/__resume_versions/${encodeURIComponent(versionId)}`, {
          method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: normalizedName }),
        });
        if (!response.ok) throw new Error((await response.json()).error || `版本重命名失败：HTTP ${response.status}`);
        catalog = await response.json();
      } else {
        const now = new Date().toISOString();
        catalog = { ...catalog, versions: catalog.versions.map(item => item.id === versionId ? { ...item, name: normalizedName, updatedAt: now } : item) };
        await persistCatalog();
      }
      return clone(catalog);
    },
    async deleteVersion(versionId) {
      const entry = findEntry(versionId);
      if (getChildren(versionId).length) throw new Error('请先删除所有子版本');
      if (catalog.versions.length === 1) throw new Error('至少保留一个版本');
      if (dev) {
        const response = await fetch(`/__resume_versions/${encodeURIComponent(versionId)}`, { method: 'DELETE' });
        if (!response.ok) throw new Error((await response.json()).error || `删除版本失败：HTTP ${response.status}`);
        catalog = await response.json();
      } else {
        catalog.versions = catalog.versions.filter(item => item.id !== versionId);
        if (catalog.activeVersionId === versionId) catalog.activeVersionId = entry.parentId || catalog.versions[0].id;
        await idbDelete(`data:${versionId}`);
        await persistCatalog();
      }
      const nextVersionId = catalog.activeVersionId === versionId ? (entry.parentId || catalog.versions[0].id) : catalog.activeVersionId;
      writeStoredActive(nextVersionId);
      return { versionId: nextVersionId, data: await getVersion(nextVersionId) };
    },
    async saveVersion(versionId, data) {
      findEntry(versionId);
      if (dev) {
        const response = await fetch(`/__resume_versions/${encodeURIComponent(versionId)}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data) });
        if (!response.ok) throw new Error(`简历保存失败：HTTP ${response.status}`);
      } else await idbPut(`data:${versionId}`, clone(data));
    },
  };
}
