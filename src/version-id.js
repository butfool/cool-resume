/**
 * version-id.js — 版本 ID 的唯一来源。
 *
 * 版本 ID 就是 `data/versions/<id>.json` 的文件名主干，三处代码共同决定它：
 * 浏览器里的新建版本对话框（预填默认文件名）、开发模式的 Vite 中间件（校验并落盘）、
 * 静态模式的 IndexedDB 版本库（校验并写入 catalog）。三处必须给出完全相同的规则，
 * 否则会出现「界面允许、服务端拒绝」这类漂移，所以规则集中在本模块。
 *
 * ID 只允许小写字母、数字和短横线：不允许点号与路径分隔符，因此不存在路径穿越的空间。
 */

const VERSION_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const JSON_EXTENSION = '.json';

/** 把版本名称压成可读的文件名主干：保留 ASCII 字母数字，其余字符折成短横线。 */
export function slugifyVersionName(name) {
  return String(name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** 版本 ID 是否合法。 */
export function isValidVersionId(versionId) {
  return VERSION_ID_PATTERN.test(versionId);
}

/** 把用户输入的文件名（可带 .json）折成版本 ID。只去空白与去扩展名，不改写大小写。 */
export function versionIdFromFileName(fileName) {
  const raw = String(fileName ?? '').trim();
  return raw.toLowerCase().endsWith(JSON_EXTENSION) ? raw.slice(0, -JSON_EXTENSION.length) : raw;
}

/** 校验文件名并返回版本 ID；不合法时立即报错。 */
export function requireVersionId(fileName) {
  const versionId = versionIdFromFileName(fileName);
  if (!isValidVersionId(versionId)) throw new Error('文件名只能使用小写字母、数字和短横线，例如 java-application-v3-2.json');
  return versionId;
}

/** 无法从名称得到可读文件名时使用的随机 ID。 */
export function createRandomVersionId() {
  const suffix = globalThis.crypto?.randomUUID?.().slice(0, 8) || Math.random().toString(36).slice(2, 10);
  return `v-${Date.now().toString(36)}-${suffix}`;
}

/**
 * 新建版本对话框的默认文件名主干。
 * 名称里没有 ASCII 字母时（例如纯中文名称，或只剩年份的「明星辰 2026」），
 * slug 会退化成一个纯数字或空串，这种文件名没有辨识度，改用随机 ID，
 * 由用户在对话框里自己改成英文。
 */
export function defaultVersionFileName(name) {
  const slug = slugifyVersionName(name);
  return /[a-z]/.test(slug) ? slug : createRandomVersionId();
}

/** 在已有的版本 ID 集合中找一个不冲突的 ID：base、base-2、base-3…… */
export function uniqueVersionId(baseId, existingIds) {
  const taken = new Set(existingIds);
  if (!taken.has(baseId)) return baseId;
  let index = 2;
  while (taken.has(`${baseId}-${index}`)) index += 1;
  return `${baseId}-${index}`;
}
