#!/usr/bin/env node
/**
 * migrate.js — 离线迁移 data/versions/*.json 至当前 schema
 *
 * 用法:
 *   node scripts/migrate.js            # CLI,打印每个文件的迁移结果
 *   npm run migrate                   # 同上 (npm scripts 包装)
 *
 * 作为模块导入:
 *   import { findLegacyFiles, migrateAll } from './scripts/migrate.js'
 *
 * 设计原则:
 *  - 迁移逻辑只写一遍,供 CLI 与 Vite 中间件同时复用
 *  - 已是最新 schema 的文件不打印、不写回(幂等)
 *  - 不处理 schemaVersion 倒退的情况(透传)
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { migrate, needsMigration, CURRENT_SCHEMA_VERSION, inferSchemaVersion } from '../src/migrations.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const versionsDir = path.join(root, 'data', 'versions');

export async function readJson(file) {
  return JSON.parse(await fs.promises.readFile(file, 'utf8'));
}

export async function writeJsonAtomic(file, value) {
  const temporary = `${file}.tmp-${process.pid}`;
  await fs.promises.writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`, 'utf8');
  await fs.promises.rename(temporary, file);
}

/**
 * 列出 data/versions/ 下所有落后文件。
 * 严格按 needsMigration 定义: schemaVersion 未填写/低于目标/含遗留字段 任一为真。
 * @param {number} target - 目标 schemaVersion (默认 CURRENT_SCHEMA_VERSION)
 * @returns {Promise<Array<{ id, file, schemaVersion: number|null }>>}
 */
export async function findLegacyFiles(target = CURRENT_SCHEMA_VERSION) {
  if (!fs.existsSync(versionsDir)) return [];
  const entries = await fs.promises.readdir(versionsDir, { withFileTypes: true });
  const legacy = [];
  for (const entry of entries) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    const file = path.join(versionsDir, entry.name);
    const id = entry.name.replace(/\.json$/, '');
    try {
      const raw = await readJson(file);
      const inferred = inferSchemaVersion(raw);
      // needsMigration 包含了 schemaVersion 不一致与遗留字段两类判断
      if (needsMigration(raw) || (inferred != null && inferred < target)) {
        legacy.push({ id, file, schemaVersion: inferred });
      }
    } catch { /* 损坏的 JSON 不在本次迁移范围内,留待用户处理 */ }
  }
  return legacy;
}

/**
 * 迁移所有落后文件,返回每个文件的 before/after。
 * @param {{ verbose?: boolean }} [opts]
 */
export async function migrateAll({ verbose = false } = {}) {
  const legacy = await findLegacyFiles();
  const results = [];
  for (const { id, file, schemaVersion: from } of legacy) {
    const raw = await readJson(file);
    const migrated = migrate(raw);
    await writeJsonAtomic(file, migrated);
    const after = migrated.schemaVersion ?? CURRENT_SCHEMA_VERSION;
    results.push({ id, file, from, after });
    if (verbose) console.log(`✓ ${path.relative(root, file)} : v${from ?? '?'} → v${after}`);
  }
  return results;
}

// CLI entry — 只在直接执行本文件时跑
const invokedDirectly = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url));
if (invokedDirectly) {
  try {
    const legacy = await findLegacyFiles();
    if (legacy.length === 0) {
      console.log(`✓ 所有本地版本已是 schema v${CURRENT_SCHEMA_VERSION},无需迁移`);
      process.exit(0);
    }
    console.log(`→ 发现 ${legacy.length} 个版本落后 (目标 v${CURRENT_SCHEMA_VERSION})，开始迁移:`);
    const results = await migrateAll({ verbose: true });
    console.log(`\n✓ 已迁移 ${results.length} 个版本。请重新打开 Dev 页面或重启 npm run dev。`);
    process.exit(0);
  } catch (error) {
    console.error('× 迁移失败:', error.message);
    process.exit(1);
  }
}