/**
 * schema-contract.test.js — docs/resume.schema.json 与代码常量的同步护栏
 *
 * 目的: schema 中的枚举/属性表是对代码常量 (THEMES / SECTIONS / SPACING_CONTROLS /
 * EMPTY_RESUME / baseline.json) 的人工镜像。人工镜像必然漂移——本文件把漂移从
 * "静默 bug" 变成 "npm test 红灯"。
 *
 * 提取方式: 用正则从源码中抽出常量块。正则对代码格式敏感是有意为之——
 * 如果有人改了源码结构导致正则失配,测试失败会促使他顺手检查 schema。
 *
 * 运行: node --test tests/schema-contract.test.js
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const read = rel => fs.readFileSync(path.join(repoRoot, rel), 'utf8');

const schema = JSON.parse(read('docs/resume.schema.json'));
const devPanelSource = read('src/dev-panel.js');
const rendererSource = read('src/renderer.js');
const versionStoreSource = read('src/version-store.js');
const viteConfigSource = read('vite.config.js');
const baseline = JSON.parse(read('data-example/versions/baseline.json'));
const bundledCatalog = JSON.parse(read('data-example/catalog.json'));

function extractBlock(source, declaration) {
  const start = source.indexOf(declaration);
  assert.ok(start !== -1, `源码中找不到 ${declaration.trim()}`);
  const from = source.indexOf('{', start);
  const fromBracket = source.indexOf('[', start);
  const isBracket = fromBracket !== -1 && (fromBracket < from || from === -1);
  const opener = isBracket ? '[' : '{';
  const closer = isBracket ? ']' : '}';
  let depth = 0;
  for (let i = (isBracket ? fromBracket : from); i < source.length; i += 1) {
    if (source[i] === opener) depth += 1;
    if (source[i] === closer) {
      depth -= 1;
      if (depth === 0) return source.slice((isBracket ? fromBracket : from), i + 1);
    }
  }
  assert.fail(`未能定位 ${declaration.trim()} 的闭合位置`);
}

test('schema $id 指向文件真实所在路径', () => {
  assert.match(schema.$id, /\/docs\/resume\.schema\.json$/, '$id 必须指向 docs/resume.schema.json (防止文件挪动后忘记改)');
});

test('schema theme enum 与 dev-panel THEMES ids 一致', () => {
  const themesBlock = extractBlock(devPanelSource, 'const THEMES =');
  const themeIds = [...themesBlock.matchAll(/id:\s*'([^']+)'/g)].map(m => m[1]);
  assert.ok(themeIds.length > 0, 'THEMES 提取失败');
  assert.deepEqual(
    [...schema.properties.theme.enum].sort(),
    [...themeIds].sort(),
    'schema theme enum 与 dev-panel.js THEMES 漂移——新增主题时两处都要加',
  );
});

test('schema order enum 与 renderer SECTIONS keys + header 一致', () => {
  const sectionsBlock = extractBlock(rendererSource, 'const SECTIONS =');
  const sectionKeys = [...sectionsBlock.matchAll(/^\s{2}(\w+):\s*\{\s*key:/gm)].map(m => m[1]);
  assert.ok(sectionKeys.length > 0, 'SECTIONS 提取失败');
  const expected = ['header', ...sectionKeys].sort();
  assert.deepEqual(
    [...schema.properties.order.items.enum].sort(),
    expected,
    'schema order enum 与 renderer.js SECTIONS 漂移——新增/删除章节时两处都要改',
  );
});

test('schema spacing keys 与 dev-panel SPACING_CONTROLS keys 一致', () => {
  const spacingBlock = extractBlock(devPanelSource, 'const SPACING_CONTROLS =');
  const spacingKeys = [...spacingBlock.matchAll(/key:\s*'([^']+)'/g)].map(m => m[1]);
  assert.ok(spacingKeys.length > 0, 'SPACING_CONTROLS 提取失败');
  const schemaKeys = Object.keys(schema.properties.style.properties.spacing.properties);
  assert.deepEqual(
    [...schemaKeys].sort(),
    [...spacingKeys].sort(),
    'schema spacing keys 与 dev-panel.js SPACING_CONTROLS 漂移——新增排版控件时两处都要加',
  );
});

test('schema 与 renderer spacing 语义一致: schema range 不窄于 UI 滑块范围', () => {
  const spacingBlock = extractBlock(devPanelSource, 'const SPACING_CONTROLS =');
  const controls = [...spacingBlock.matchAll(/\{[^}]*key:\s*'([^']+)'[^}]*min:\s*([\d.]+),\s*max:\s*([\d.]+)/g)]
    .map(([, key, min, max]) => ({ key, min: Number(min), max: Number(max) }));
  const spacingProps = schema.properties.style.properties.spacing.properties;
  for (const { key, min, max } of controls) {
    const prop = spacingProps[key];
    assert.ok(prop, `schema 缺少 spacing key: ${key}`);
    assert.ok(prop.minimum <= min, `${key}: schema minimum (${prop.minimum}) 不应窄于 UI min (${min})`);
    assert.ok(prop.maximum >= max, `${key}: schema maximum (${prop.maximum}) 不应窄于 UI max (${max})`);
  }
});

test('schema required 顶层键全部出现在 baseline.json 中', () => {
  for (const key of schema.required) {
    assert.ok(key in baseline, `schema.required 含 "${key}" 但 baseline.json 没有——契约与示例漂移`);
  }
});

test('baseline.json schemaVersion 与 bundled catalog 一致且等于 schema const', () => {
  assert.equal(baseline.schemaVersion, schema.properties.schemaVersion.const);
  assert.equal(bundledCatalog.schemaVersion, schema.properties.schemaVersion.const);
});

test('两处 EMPTY_RESUME 都包含 order 与 summary 键 (schema required)', () => {
  for (const [label, source] of [['version-store.js', versionStoreSource], ['vite.config.js', viteConfigSource]]) {
    const block = extractBlock(source, 'const EMPTY_RESUME =');
    assert.match(block, /order:/, `${label} EMPTY_RESUME 缺 order`);
    assert.match(block, /summary:/, `${label} EMPTY_RESUME 缺 summary`);
    assert.match(block, /contactMethod:/, `${label} EMPTY_RESUME 缺 contactMethod`);
    assert.match(block, /schemaVersion:/, `${label} EMPTY_RESUME 缺 schemaVersion`);
  }
});

test('EMPTY_RESUME 的 order 取值全部是 schema order enum 的合法键', () => {
  const legal = new Set(schema.properties.order.items.enum);
  const block = extractBlock(versionStoreSource, 'const EMPTY_RESUME =');
  const orderMatch = block.match(/order:\s*\[([^\]]*)\]/);
  assert.ok(orderMatch, 'EMPTY_RESUME 中提取 order 数组失败');
  const keys = [...orderMatch[1].matchAll(/'([^']+)'/g)].map(m => m[1]);
  assert.ok(keys.length > 0, 'EMPTY_RESUME order 为空');
  for (const key of keys) {
    assert.ok(legal.has(key), `EMPTY_RESUME order 含非法键 "${key}" (不在 schema order enum 中)`);
  }
});

test('schema 描述不得引用已删除的文件', () => {
  const serialized = JSON.stringify(schema);
  assert.equal(serialized.includes('ai-prompt'), false, 'schema 引用了已删除的 docs/ai-prompt.md');
  assert.equal(serialized.includes('data-example/schema'), false, 'schema 引用了已迁移的旧路径 data-example/schema');
});

test('CLAUDE.md 中 AI 约束层存在且引用 schema (结构性契约与质量约束分层的前提)', { skip: !fs.existsSync(path.join(repoRoot, 'CLAUDE.md')) ? 'CLAUDE.md 为 gitignore 的本地文件,当前检出中不存在' : false }, () => {
  const claudeMd = read('CLAUDE.md');
  assert.match(claudeMd, /resume\.schema\.json/, 'CLAUDE.md 必须引用 schema');
  assert.match(claudeMd, /AI 改写约束/, 'CLAUDE.md 必须包含 AI 改写约束层');
  assert.match(claudeMd, /原样保留/, 'AI 约束必须包含"未定义字段原样保留"规则');
});