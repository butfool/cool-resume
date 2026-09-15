/**
 * migrations.js — cool-resume 简历版本数据的 schema 迁移
 *
 * 设计原则:
 *   1. 纯函数。每个迁移函数接收旧数据、返回新数据,无 IO、无副作用。
 *   2. 编号字典。键名固定为 `'X->Y'` (X、Y 是 schemaVersion 整数)。
 *      migrate() 顺序执行区间 [from, to) 内的所有迁移函数。
 *   3. 顺序单调。新增迁移只许追加在末尾,不许改写已有迁移函数;
 *      改写会让用户的旧数据被错误地再次升级,造成内容丢失。
 *
 * 加载语义 (version-store.js / vite.config.js 都会走一遍):
 *   raw = await readData()           // 读 IndexedDB 或文件
 *   migrated = migrate(raw, current) // 升级到当前 schema,带回退推断
 *   if (migrated !== raw) writeBack(migrated)
 *
 * 推断 schemaVersion: 当 raw 完全缺失 schemaVersion 时,按结构判定:
 *   - 有 basicInfo 字段 → v2 (升级到 v3)
 *   - 无 basicInfo 字段 → v3 (无需迁移)
 *   - 其他情况(完全空对象或损坏) → 视作 v3,直接通过。
 * 这条规则让 1c568f5 之前的旧 data/ 文件无需手动补 schemaVersion 就能跑起来。
 */

import bundledCatalog from '../data-example/catalog.json' with { type: 'json' };

export const CURRENT_SCHEMA_VERSION = bundledCatalog.schemaVersion;

/**
 * 推断旧数据的 schemaVersion。返回 null 表示不可推断。
 * @param {unknown} data
 * @returns {number|null}
 */
export function inferSchemaVersion(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null;
  if (typeof data.schemaVersion === 'number') return data.schemaVersion;
  if ('basicInfo' in data) return 2; // v2 用 basicInfo;v3 已迁移到 contactMethod
  return 3;
}

/**
 * v2 -> v3: basicInfo 重命名为 contactMethod;skills 从 {category, keywords} 改为 {level, content};
 *           从 order 中移除 'basicInfo'。
 */
function migrate_2_to_3(data) {
  const out = JSON.parse(JSON.stringify(data));
  delete out.schemaVersion; // 移除旧编号,migrate() 末尾会统一写上当前版本号

  if (out.basicInfo && !out.contactMethod) {
    out.contactMethod = { items: Array.isArray(out.basicInfo.items) ? out.basicInfo.items : [] };
  }
  delete out.basicInfo;

  if (Array.isArray(out.order)) {
    out.order = out.order.filter(key => key !== 'basicInfo');
  }

  if (Array.isArray(out.skills)) {
    out.skills = out.skills
      .filter(skill => skill && typeof skill === 'object')
      .map(skill => {
        if ('content' in skill) return skill; // 已经是新形态
        const { category, keywords, ...rest } = skill;
        return {
          level: category || '熟悉',
          content: keywords ? `${category ? category + ': ' : ''}${keywords}` : category || '',
          ...rest,
        };
      })
      .filter(skill => skill.content && skill.content.trim().length > 0);
  }

  return out;
}

/** 顺序执行 [from, to) 区间的所有迁移。 */
export function migrate(data, fromVersion = inferSchemaVersion(data), toVersion = CURRENT_SCHEMA_VERSION) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return data;
  const from = fromVersion ?? CURRENT_SCHEMA_VERSION;
  const to = toVersion ?? CURRENT_SCHEMA_VERSION;
  if (from === to) {
    // schemaVersion 缺失但已经处于最新形态的情况:补一个字段,不重复迁移
    if (data.schemaVersion !== to) return { ...data, schemaVersion: to };
    return data;
  }
  if (from > to) {
    // 不实现降级迁移;透传并保留原 schemaVersion 以便后续排查
    return data;
  }
  let cur = JSON.parse(JSON.stringify(data));
  for (let v = from; v < to; v += 1) {
    const step = MIGRATIONS[`${v}->${v + 1}`];
    if (!step) throw new Error(`缺少迁移步骤: ${v} -> ${v + 1}`);
    cur = step(cur);
  }
  return { ...cur, schemaVersion: to };
}

/** 是否需要升级(用于上层决定是否回写持久化层) */
export function needsMigration(data) {
  const inferred = inferSchemaVersion(data);
  if (inferred == null) return false;
  return inferred < CURRENT_SCHEMA_VERSION || data.schemaVersion !== CURRENT_SCHEMA_VERSION;
}

/**
 * 迁移函数注册表。键名固定为 `'X->Y'`,值是纯函数 (data) => data。
 * 修改历史迁移会导致用户数据被错误再次迁移——只许追加,不许改写。
 */
export const MIGRATIONS = Object.freeze({
  '2->3': migrate_2_to_3,
});