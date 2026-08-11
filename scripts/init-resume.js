#!/usr/bin/env node
/** Create the ignored local version store from the safe public example. */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'data-example', 'versions', 'baseline.json');
const dataRoot = path.join(root, 'data');
const catalogTarget = path.join(dataRoot, 'catalog.json');
const versionRoot = path.join(dataRoot, 'versions');
const versionTarget = path.join(versionRoot, 'baseline.json');

if (fs.existsSync(catalogTarget) || fs.existsSync(versionTarget)) {
  console.log('✓ 已存在本地版本库，未覆盖简历数据');
  process.exit(0);
}

fs.mkdirSync(versionRoot, { recursive: true });
fs.copyFileSync(source, versionTarget, fs.constants.COPYFILE_EXCL);
fs.writeFileSync(catalogTarget, `${JSON.stringify({
  schemaVersion: 2,
  activeVersionId: 'baseline',
  versions: [{ id: 'baseline', name: '基线版', parentId: null, file: 'versions/baseline.json', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() }],
}, null, 2)}\n`);
console.log('✓ 已从 data-example 创建本地 data 版本库（该目录已被 .gitignore 忽略）');
