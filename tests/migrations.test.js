/**
 * migrations.test.js — 单元测试 src/migrations.js
 *
 * 使用 Node 内置 node:test (Node ≥ 18),不引入任何依赖。
 * 运行: node --test tests/migrations.test.js
 *
 * 覆盖:
 *  - CURRENT_SCHEMA_VERSION 与 bundled catalog 同步
 *  - MIGRATIONS 注册表只读、键名格式
 *  - inferSchemaVersion 所有推断路径
 *  - needsMigration 真值表
 *  - migrate() 各场景: v2→v3 / 缺 schemaVersion / 已是 v3 / 含空 content skills / 非对象透传 / 倒退透传
 *  - 迁移函数幂等性 (v3 → migrate → v3 不变)
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  CURRENT_SCHEMA_VERSION,
  MIGRATIONS,
  inferSchemaVersion,
  needsMigration,
  migrate,
} from '../src/migrations.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');
const baselinePath = path.join(repoRoot, 'data-example', 'versions', 'baseline.json');
const catalogPath = path.join(repoRoot, 'data-example', 'catalog.json');

function makeV2Fixture() {
  return {
    schemaVersion: 2,
    name: '示例用户',
    title: 'Java 后端工程师',
    experience: '3 年经验',
    order: ['header', 'basicInfo', 'summary', 'work', 'projects', 'skills', 'education'],
    basicInfo: {
      items: [
        { label: '求职意向', value: 'Java 后端工程师' },
        { label: '现居城市', value: '杭州' },
        { label: '联系方式', value: 'xxx@yyy.com' },
      ],
    },
    summary: { items: ['一行简介'] },
    work: [{ company: '示例', position: 'Java', date: '2023', summary: ['完成迁移示例'] }],
    projects: [{ name: 'p1', date: '2024', summary: ['s1'] }],
    skills: [
      { category: '编程语言', keywords: '熟练:Java;了解:Python' },
      { category: '后端框架', keywords: '熟练:Spring Boot' },
    ],
    education: [{ institution: 'x', degree: 'y', date: 'z' }],
  };
}

function makeV3Fixture() {
  return {
    schemaVersion: 3,
    name: '示例用户',
    title: 'Java 后端工程师',
    experience: '3 年经验',
    theme: 'navy',
    order: ['header', 'summary', 'skills', 'work', 'projects', 'education'],
    contactMethod: {
      items: [
        { label: '手机', value: '请替换' },
        { label: '邮箱', value: 'user@example.com' },
      ],
    },
    summary: { items: ['3 年 Java 后端开发经验。'] },
    work: [{ company: '示例公司', position: 'Java', date: '2023', summary: ['工作描述'] }],
    projects: [{ name: 'p1', date: '2024', summary: ['s1'] }],
    skills: [
      { level: '熟练掌握', content: 'Java，了解 Python。' },
      { level: '熟悉', content: 'MySQL、Redis。' },
    ],
    education: [{ institution: 'x', degree: 'y', date: 'z' }],
  };
}

test('CURRENT_SCHEMA_VERSION 与 bundled catalog 同步', () => {
  const catalog = JSON.parse(fs.readFileSync(catalogPath, 'utf8'));
  assert.equal(CURRENT_SCHEMA_VERSION, catalog.schemaVersion);
  assert.equal(typeof CURRENT_SCHEMA_VERSION, 'number');
  assert.ok(CURRENT_SCHEMA_VERSION >= 3, 'schemaVersion 应已升到 3 或更高');
});

test('baseline.json schemaVersion 与 CURRENT_SCHEMA_VERSION 一致', () => {
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  assert.equal(baseline.schemaVersion, CURRENT_SCHEMA_VERSION, 'baseline.json 必须打上最新 schemaVersion 字段');
});

test('MIGRATIONS 注册表只读、键名规范', () => {
  assert.equal(typeof MIGRATIONS, 'object');
  for (const key of Object.keys(MIGRATIONS)) {
    assert.match(key, /^\d+->\d+$/, `迁移键名应为 X->Y 格式,实际: ${key}`);
    assert.equal(typeof MIGRATIONS[key], 'function');
  }
  // 不允许覆盖既有键(只许追加);修改既有键会让旧数据被错误再次迁移
  assert.equal(Object.isFrozen(MIGRATIONS), true, 'MIGRATIONS 应被 Object.freeze 锁住');
});

test('inferSchemaVersion 完整真值表', () => {
  // 显式声明 schemaVersion
  assert.equal(inferSchemaVersion({ schemaVersion: 2 }), 2);
  assert.equal(inferSchemaVersion({ schemaVersion: 3 }), 3);
  // 缺字段但有 basicInfo → 推断 v2
  assert.equal(inferSchemaVersion({ name: 'a', basicInfo: { items: [] } }), 2);
  // 缺字段且无 basicInfo → 推断 v3
  assert.equal(inferSchemaVersion({ name: 'a', contactMethod: { items: [] } }), 3);
  // 损坏数据
  assert.equal(inferSchemaVersion(null), null);
  assert.equal(inferSchemaVersion(undefined), null);
  assert.equal(inferSchemaVersion('string'), null);
  assert.equal(inferSchemaVersion([]), null);
  assert.equal(inferSchemaVersion(42), null);
});

test('needsMigration 真值表', () => {
  assert.equal(needsMigration(makeV3Fixture()), false);
  assert.equal(needsMigration(makeV2Fixture()), true);
  // 缺 schemaVersion 但结构像 v3 → 仍需迁移 (推断为 v3 但 data.schemaVersion !== 3)
  const noSchemaButV3Shape = { name: 'a', contactMethod: { items: [] }, summary: { items: [] }, work: [], projects: [], skills: [], education: [] };
  assert.equal(needsMigration(noSchemaButV3Shape), true);
  // 非对象
  assert.equal(needsMigration(null), false);
  assert.equal(needsMigration('xx'), false);
});

test('migrate: v2 → v3 完整转换', () => {
  const result = migrate(makeV2Fixture());
  assert.equal(result.schemaVersion, CURRENT_SCHEMA_VERSION);
  assert.equal('basicInfo' in result, false, 'basicInfo 必须被移除');
  assert.ok(result.contactMethod, 'contactMethod 必须存在');
  assert.equal(result.contactMethod.items.length, 3, 'basicInfo.items 应迁移到 contactMethod.items');
  assert.deepEqual(result.contactMethod.items[0], { label: '求职意向', value: 'Java 后端工程师' });
  assert.equal(result.order.includes('basicInfo'), false, 'order 中应剔除 basicInfo');
  assert.equal(result.order[0], 'header');
  // skills: 旧 category/keywords → 新 level/content
  assert.equal(result.skills[0].level, '编程语言');
  assert.equal(result.skills[0].content, '编程语言: 熟练:Java;了解:Python');
  assert.equal(result.skills[1].level, '后端框架');
});

test('migrate: 缺 schemaVersion 但有 basicInfo 推断为 v2 并迁移', () => {
  const raw = makeV2Fixture();
  delete raw.schemaVersion;
  const result = migrate(raw);
  assert.equal(result.schemaVersion, CURRENT_SCHEMA_VERSION);
  assert.equal('basicInfo' in result, false);
  assert.ok(result.contactMethod);
});

test('migrate: 缺 schemaVersion 且结构已 v3 (basicInfo 缺失) → 仅补 schemaVersion', () => {
  const v3shape = {
    name: 'a', title: 'b', experience: 'c',
    contactMethod: { items: [] },
    summary: { items: [] },
    work: [], projects: [], skills: [], education: [],
  };
  const result = migrate(v3shape);
  assert.equal(result.schemaVersion, CURRENT_SCHEMA_VERSION);
  // 原数据保留
  assert.equal(result.name, 'a');
  // 没被塞 basicInfo / 没被改 order
  assert.equal('basicInfo' in result, false);
});

test('migrate: skills 中空 content 在 v2→v3 时被剔除', () => {
  // 同一双为空 (无 category 无 keywords) 才能生成真正空 content。
  // v2 中只有 category 或只有 keywords 都不是空 content。
  const raw = {
    schemaVersion: 2,
    name: 'x', title: 'y', experience: 'z',
    order: ['header', 'skills'],
    basicInfo: { items: [] },
    summary: { items: [] }, work: [], projects: [], education: [],
    skills: [
      { category: '语言', keywords: 'Java' },
      {} /* 双空 */,
    ],
  };
  const result = migrate(raw);
  assert.equal(result.skills.length, 1);
  assert.equal(result.skills[0].level, '语言');
});

test('migrate: 已是 v3 数据原样返回且不修改', () => {
  const v3 = makeV3Fixture();
  const result = migrate(v3);
  assert.deepEqual(result, v3);
  // 1. migrate 必须不修改输入 (纯函数)
  const beforeJson = JSON.stringify(v3);
  migrate(v3);
  assert.equal(JSON.stringify(v3), beforeJson, '原对象不应被修改');
});

test('migrate: 非对象透传不抛错', () => {
  assert.equal(migrate(null), null);
  assert.equal(migrate(undefined), undefined);
  assert.equal(migrate('string'), 'string');
  assert.deepEqual(migrate([]), []);
});

test('migrate: schemaVersion 倒退 (v3 数据显式 toVersion=2) → 透传不报错', () => {
  const v3 = makeV3Fixture();
  // 调用者主动指定更早的 toVersion (无降级迁移函数)
  const result = migrate(v3, 3, 2);
  assert.equal(result.schemaVersion, 3, '降级场景应保留原 schemaVersion');
});

test('migrate: 缺失中间步骤迁移 (1→3) → 抛错而非静默跳步', () => {
  const raw = { schemaVersion: 1, name: 'a' };
  assert.throws(() => migrate(raw, 1, CURRENT_SCHEMA_VERSION), /缺少迁移步骤/);
});

test('migrate: 不会写回原对象 (纯函数)', () => {
  const v2 = makeV2Fixture();
  const beforeJson = JSON.stringify(v2);
  migrate(v2);
  assert.equal(JSON.stringify(v2), beforeJson, '原对象不应被修改');
  assert.equal(v2.schemaVersion, 2, '原 schemaVersion 应保留');
  assert.equal('basicInfo' in v2, true, '原 basicInfo 应保留');
});

test('migrate: 反复迁移 v3 数据,字节级输出相同', () => {
  const v3 = makeV3Fixture();
  const a = JSON.stringify(migrate(v3));
  const b = JSON.stringify(migrate(migrate(v3)));
  assert.equal(a, b);
});

test('baseline.json 经过 migrate 应当是 no-op', () => {
  const baseline = JSON.parse(fs.readFileSync(baselinePath, 'utf8'));
  const after = migrate(baseline);
  assert.deepEqual(after, baseline, '最新 schema 的 baseline 不应被 migrate 改动');
});

/**
 * v1→v3 链路迁移集成测试。
 *
 * 设计: `migrate()` 依靠注册表顺序运行 [from, to) 中的每个 step。
 * 当前注册表只含 '2->3'。这里手动插一个虚拟的 '1->2' step,
 * 在同一个测试内部仅模拟 step 本身、执行顺序与可组合性。
 *
 * 一旦未来真的添加了 '1->2' step 到注册表,这个测试仍然能起到“链路迁移契约”作用；
 * 可以将 MIGRATIONS_TEST_EXTRA 中的虚拟函数提为手写 step 调用验证。
 */
test('migrate: v1→v3 链路调用顺序 (两个 step 都会被执行)', () => {
  // 1. 虚拟 v1 数据: 没有 schemaVersion, 有 v2 之前更原始的字段比如 link 数组。
  //    v1 schema 本身不在本仓库历史里(没有 v1 示例文件), 这里用能区分 step1 / step2 的虚构字段构造。
  const v1 = {
    name: 'v1 fixture',
    title: 't',
    experience: 'e',
    order: ['header', 'basicInfo', 'summary'], // v1 的 order 含有 basicInfo
    basicInfo: { items: [{ label: '手机', value: '123' }] },
    summary: { items: ['s1'] },
    work: [], projects: [], skills: [], education: [],
    // v1 独有标记 (用来验证 step1 被跑了)
    _v1Only: 'must-be-stripped-by-1->2',
  };

  // 2. 虚拟 v1→v2 step:删除 _v1Only,补 schemaVersion: 2
  function fakeStep_1_to_2(data) {
    const out = JSON.parse(JSON.stringify(data));
    delete out._v1Only;
    out.schemaVersion = 2;
    return out;
  }
  // 3. 真正的 v2→v3 step(从注册表中取)
  const realStep_2_to_3 = MIGRATIONS['2->3'];
  assert.equal(typeof realStep_2_to_3, 'function', '2->3 必须存在于注册表');

  // 4. 手动以 step 列表的方式模拟 migrate() 的 [from, to) 循环
  let cur = JSON.parse(JSON.stringify(v1));
  const steps = [fakeStep_1_to_2, realStep_2_to_3];
  for (const step of steps) cur = step(cur);
  cur.schemaVersion = CURRENT_SCHEMA_VERSION; // 同 migrate() 末尾

  // 5. 验证两个 step 都被执行:
  assert.equal('_v1Only' in cur, false, '1->2 step 必须跑 (清掉 _v1Only)');
  assert.equal('basicInfo' in cur, false, '2->3 step 必须跑 (清掉 basicInfo)');
  assert.ok(cur.contactMethod, '2->3 step 必须跑 (产出 contactMethod)');
  assert.equal(cur.contactMethod.items[0].value, '123', '1->2 不应动 contactMethod items');
  assert.equal(cur.schemaVersion, CURRENT_SCHEMA_VERSION);
  assert.equal(cur.order.includes('basicInfo'), false, '2->3 step 必须跑 (从 order 中删 basicInfo)');

  // 6. 验证两个 step 都被执行 (而不是只跑 1->2 或 只跑 2->3):
  //    - 如果只跑 1->2 (未跑 2->3), basicInfo 仍存在
  //    - 如果只跑 2->3 (未跑 1->2), _v1Only 仍存在
  const onlyStep1 = fakeStep_1_to_2(JSON.parse(JSON.stringify(v1)));
  assert.equal('_v1Only' in onlyStep1, false);
  assert.equal('basicInfo' in onlyStep1, true, '只跑 step1 时 basicInfo 必在');

  const onlyStep2 = realStep_2_to_3(JSON.parse(JSON.stringify(v1)));
  assert.equal('basicInfo' in onlyStep2, false, '只跑 step2 时 basicInfo 不在');
  assert.equal('_v1Only' in onlyStep2, true, '只跑 step2 时 _v1Only 不被清');

  // 验证 final state 是两个 step 顺序走完后的产物
  assert.equal('_v1Only' in cur, false, '两 step 都跑了才能清掉 _v1Only');
  assert.equal('basicInfo' in cur, false, '两 step 都跑了才能清掉 basicInfo');
});

/**
 * 注册表连续性护栏:不允许出现“中间的 step 缺失 (有 X->Y 但没 (X+1)->(Y+1))”。
 * 今天只有 '2->3' 一个 step,从 1 跳到 3 会报错。
 * 这个护栏保证:以后加 step 必须是连號的 (1->2 与 2->3 必须同时存在,才允许 1->3)。
 */
test('migrate: 注册表不允许跳号 (实际调用从 1→3 应报错)', () => {
  // 1->2 在注册表中不存在,所以从 v1 直接跳到 v3 应该报错。
  assert.throws(
    () => migrate({ schemaVersion: 1, name: 'a' }, 1, CURRENT_SCHEMA_VERSION),
    /缺少迁移步骤: 1 -> 2/,
  );
});

test('migrate: 遍历所有注册表 step, 验证 from→to 连续递进 (不允许同一个起点对应多个终点)', () => {
  // 检查注册表中所有 step,确保 from/to 连续。从中可发现重复起点。
  const steps = Object.keys(MIGRATIONS).sort();
  if (steps.length === 0) return;
  // 以所有 step 起点为 set,多起点才报错。
  const froms = steps.map(key => Number(key.split('->')[0]));
  const tos = steps.map(key => Number(key.split('->')[1]));
  assert.equal(new Set(froms).size, froms.length, '不允许存在重复起点 step');
  // to 应该构成递增序列(保证注册表顺序)
  for (let i = 1; i < tos.length; i += 1) {
    assert.ok(tos[i] > tos[i - 1], `step to-version 应递增: ${steps[i - 1]} -> ${steps[i]}`);
  }
});