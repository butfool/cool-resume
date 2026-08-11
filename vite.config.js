import { defineConfig } from 'vite';
import { viteSingleFile } from 'vite-plugin-singlefile';
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import { buildThirdPartyNotices } from './scripts/third-party-notices.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataRoot = path.resolve(__dirname, 'data');
const exampleRoot = path.resolve(__dirname, 'data-example');
const catalogPath = path.join(dataRoot, 'catalog.json');
const execFileAsync = promisify(execFile);

function versionPath(versionId) {
  if (!/^[a-z0-9-]+$/i.test(versionId)) throw new Error('非法版本 ID');
  return path.join(dataRoot, 'versions', `${versionId}.json`);
}

async function readJson(file) {
  return JSON.parse(await fs.promises.readFile(file, 'utf8'));
}

async function writeJsonAtomic(file, value) {
  const temporary = `${file}.tmp-${process.pid}`;
  await fs.promises.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await fs.promises.rename(temporary, file);
}

async function readRequestJson(req) {
  const chunks = [];
  for await (const chunk of req) chunks.push(chunk);
  return JSON.parse(Buffer.concat(chunks).toString('utf8'));
}

function getVersion(catalog, versionId) {
  const version = catalog.versions?.find(item => item.id === versionId);
  if (!version) throw new Error(`未知简历版本：${versionId}`);
  return version;
}

function moveEntries(catalog, versionId, targetId, placement) {
  const moving = getVersion(catalog, versionId);
  const target = getVersion(catalog, targetId);
  if (moving.id === target.id) throw new Error('无效的拖拽目标');
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
  const now = new Date().toISOString();
  const nextMoving = catalog.versions.filter(item => movingIds.has(item.id)).map(item => item.id === versionId ? { ...item, parentId: placement === 'child' ? targetId : target.parentId, updatedAt: now } : item);
  remaining.splice(insertIndex, 0, ...nextMoving);
  return { ...catalog, versions: remaining };
}

function newVersionId() {
  return `v-${Date.now().toString(36)}-${randomUUID().slice(0, 8)}`;
}

const EMPTY_RESUME = {
  name: '', title: '', experience: '',
  basicInfo: { items: [] }, work: [], projects: [], skills: [], education: [],
};

function resumeSourceSyncPlugin() {
  return {
    name: 'resume-source-sync',
    // JSON 编辑器已经通过 onChange 重绘预览；它随后写回源文件时不能再触发
    // Vite 整页 HMR，否则会销毁编辑器、光标和打开状态。
    handleHotUpdate({ file }) {
    if (path.resolve(file).startsWith(dataRoot)) return [];
      return undefined;
    },
    configureServer(server) {
      server.middlewares.use('/__resume_versions', async (req, res, next) => {
        const parts = req.url.split('?')[0].split('/').filter(Boolean).map(decodeURIComponent);
        const send = (status, value) => { res.statusCode = status; res.setHeader('Content-Type', 'application/json; charset=utf-8'); res.end(JSON.stringify(value)); };
        try {
          const catalog = await readJson(catalogPath);
          if (req.method === 'GET' && parts.length === 0) {
            send(200, catalog);
            return;
          }
          if (req.method === 'POST' && parts.length === 0) {
            const { name, parentId = null, copyFromVersionId = null } = await readRequestJson(req);
            const normalizedName = String(name || '').trim();
            if (!normalizedName) throw new Error('版本名称不能为空');
            if (parentId !== null) getVersion(catalog, parentId);
            const source = copyFromVersionId === null ? null : getVersion(catalog, copyFromVersionId);
            const versionId = newVersionId();
            const now = new Date().toISOString();
            const version = { id: versionId, name: normalizedName, parentId, file: `versions/${versionId}.json`, createdAt: now, updatedAt: now };
            const data = source ? await readJson(versionPath(source.id)) : EMPTY_RESUME;
            await writeJsonAtomic(versionPath(versionId), data);
            const nextCatalog = { ...catalog, versions: [...catalog.versions, version] };
            await writeJsonAtomic(catalogPath, nextCatalog);
            send(201, { versionId, data, catalog: nextCatalog });
            return;
          }
          if (parts.length === 1 && parts[0] === 'active' && req.method === 'PUT') {
            const { versionId } = await readRequestJson(req);
            getVersion(catalog, versionId);
            const nextCatalog = { ...catalog, activeVersionId: versionId };
            await writeJsonAtomic(catalogPath, nextCatalog);
            send(200, nextCatalog);
            return;
          }
          if (parts.length === 2 && parts[1] === 'move' && req.method === 'POST') {
            const { targetId, placement } = await readRequestJson(req);
            const nextCatalog = moveEntries(catalog, parts[0], targetId, placement);
            await writeJsonAtomic(catalogPath, nextCatalog);
            send(200, nextCatalog);
            return;
          }
          if (parts.length === 1) {
            const version = getVersion(catalog, parts[0]);
            const file = versionPath(version.id);
            if (req.method === 'GET') { send(200, await readJson(file)); return; }
            if (req.method === 'PUT') {
              const value = await readRequestJson(req);
              if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('简历数据顶层必须是 JSON 对象');
              await writeJsonAtomic(file, value);
              const now = new Date().toISOString();
              const nextCatalog = { ...catalog, versions: catalog.versions.map(item => item.id === version.id ? { ...item, updatedAt: now } : item) };
              await writeJsonAtomic(catalogPath, nextCatalog);
              send(200, { ok: true });
              return;
            }
            if (req.method === 'PATCH') {
              const { name } = await readRequestJson(req);
              const normalizedName = String(name || '').trim();
              if (!normalizedName) throw new Error('版本名称不能为空');
              const now = new Date().toISOString();
              const nextCatalog = { ...catalog, versions: catalog.versions.map(item => item.id === version.id ? { ...item, name: normalizedName, updatedAt: now } : item) };
              await writeJsonAtomic(catalogPath, nextCatalog);
              send(200, nextCatalog);
              return;
            }
            if (req.method === 'DELETE') {
              const children = catalog.versions.filter(item => item.parentId === version.id);
              if (children.length) throw new Error('请先删除所有子版本');
              if (catalog.versions.length === 1) throw new Error('至少保留一个版本');
              const nextVersions = catalog.versions.filter(item => item.id !== version.id);
              const nextActiveVersionId = catalog.activeVersionId === version.id ? (version.parentId || nextVersions[0].id) : catalog.activeVersionId;
              const nextCatalog = { ...catalog, activeVersionId: nextActiveVersionId, versions: nextVersions };
              await writeJsonAtomic(catalogPath, nextCatalog);
              await execFileAsync('trash', [file]);
              send(200, nextCatalog);
              return;
            }
          }
          next();
        } catch (error) { send(400, { error: error.message }); }
      });
    },
  };
}

export default defineConfig({
  plugins: [
    resumeSourceSyncPlugin(),
    viteSingleFile(),
    {
      name: 'inject-resume-theme',
      transformIndexHtml: {
        order: 'pre',
        handler(html, ctx) {
          if (!ctx.filename.endsWith('index.html')) return html;
          try {
            const sourceRoot = ctx.server ? dataRoot : exampleRoot;
            const sourceCatalogPath = path.join(sourceRoot, 'catalog.json');
            const catalog = JSON.parse(fs.readFileSync(sourceCatalogPath, 'utf-8'));
            const activePath = path.join(sourceRoot, 'versions', `${catalog.activeVersionId}.json`);
            const theme = JSON.parse(fs.readFileSync(activePath, 'utf-8')).theme;
            if (theme && typeof theme === 'string') {
              return html.replace('<html lang="zh-hans">', `<html lang="zh-hans" data-theme="${theme}">`);
            }
          } catch {
            // ignore
          }
          return html;
        },
      },
    },
    {
      name: 'finalize-single-file',
      writeBundle() {
        const distIndex = path.resolve(__dirname, 'dist/index.html');
        const outputDir = path.resolve(__dirname, 'output');
        const target = path.join(outputDir, 'resume.html');
        if (fs.existsSync(distIndex)) {
          const notices = buildThirdPartyNotices();
          if (notices.includes('-->')) throw new Error('Third-party notices contain an unsafe HTML comment terminator');
          const html = fs.readFileSync(distIndex, 'utf8');
          const output = html.replace('<!DOCTYPE html>', `<!DOCTYPE html>\n<!--\n${notices}\n-->`);
          fs.writeFileSync(distIndex, output, 'utf8');
          fs.mkdirSync(outputDir, { recursive: true });
          fs.writeFileSync(target, output, 'utf8');
          console.log('✓ copied dist/index.html → output/resume.html');
        }
      },
    },
  ],
  server: {
    port: 60090,
    strictPort: false,
  },
  build: {
    target: 'esnext',
    cssCodeSplit: false,
    assetsInlineLimit: 100000000,
  },
});
