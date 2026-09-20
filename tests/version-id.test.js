/**
 * version-id.test.js — 版本 ID 规则的护栏
 *
 * 版本 ID 同时是文件名、catalog 主键和 IndexedDB 键。规则一旦漂移，
 * 后果是「界面允许新建、服务端拒绝落盘」或者更糟——写到版本库外面去。
 * 运行: node --test tests/version-id.test.js
 */
import test from 'node:test';
import assert from 'node:assert/strict';
import {
  createRandomVersionId,
  defaultVersionFileName,
  isValidVersionId,
  requireVersionId,
  slugifyVersionName,
  uniqueVersionId,
  versionIdFromFileName,
} from '../src/version-id.js';

test('slugifyVersionName 把名称压成小写短横线形式', () => {
  assert.equal(slugifyVersionName('Java Application V3.1'), 'java-application-v3-1');
  assert.equal(slugifyVersionName('  Java   后端  '), 'java');
  assert.equal(slugifyVersionName('2026'), '2026');
  assert.equal(slugifyVersionName('后端开发'), '');
  assert.equal(slugifyVersionName(''), '');
  assert.equal(slugifyVersionName(null), '');
});

test('versionIdFromFileName 去掉 .json 扩展名与两端空白', () => {
  assert.equal(versionIdFromFileName('java-application-v3-2.json'), 'java-application-v3-2');
  assert.equal(versionIdFromFileName('  java-application-v3-2.json  '), 'java-application-v3-2');
  assert.equal(versionIdFromFileName('java-application-v3-2'), 'java-application-v3-2');
  assert.equal(versionIdFromFileName(''), '');
  assert.equal(versionIdFromFileName(null), '');
});

test('isValidVersionId 拒绝点号、路径分隔符、大写字母与空串', () => {
  assert.equal(isValidVersionId('java-application-v3-1'), true);
  assert.equal(isValidVersionId('baseline'), true);
  assert.equal(isValidVersionId('v3'), true);
  assert.equal(isValidVersionId('..'), false);
  assert.equal(isValidVersionId('../secrets'), false);
  assert.equal(isValidVersionId('nested/version'), false);
  assert.equal(isValidVersionId('Java-App'), false);
  assert.equal(isValidVersionId('-java'), false);
  assert.equal(isValidVersionId('应用开发'), false);
  assert.equal(isValidVersionId(''), false);
});

test('requireVersionId 合法时返回 ID，不合法时立即报错', () => {
  assert.equal(requireVersionId('java-application-v3-2.json'), 'java-application-v3-2');
  assert.throws(() => requireVersionId('Java-App.json'), /小写字母/);
  assert.throws(() => requireVersionId(''), /小写字母/);
  assert.throws(() => requireVersionId('../secrets'), /小写字母/);
});

test('defaultVersionFileName 在名称给不出可读文件名时退回随机 ID', () => {
  assert.equal(defaultVersionFileName('Java Application V3'), 'java-application-v3');
  assert.equal(defaultVersionFileName('AI Agent 版本'), 'ai-agent');
  assert.equal(defaultVersionFileName('Java 应用开发 V3.2'), 'java-v3-2');
  // 纯中文或只剩年份的名称没有 ASCII 字母，slug 没有辨识度，退回随机 ID 交给用户改写
  assert.match(defaultVersionFileName('明星辰 2026'), /^v-[a-z0-9]+-[a-z0-9]+$/);
  assert.match(defaultVersionFileName('后端开发'), /^v-[a-z0-9]+-[a-z0-9]+$/);
  assert.match(defaultVersionFileName(''), /^v-[a-z0-9]+-[a-z0-9]+$/);
});

test('uniqueVersionId 在冲突时追加序号', () => {
  assert.equal(uniqueVersionId('java-application-v4', []), 'java-application-v4');
  assert.equal(uniqueVersionId('java-application-v4', ['java-application-v4']), 'java-application-v4-2');
  assert.equal(uniqueVersionId('java-application-v4', ['java-application-v4', 'java-application-v4-2']), 'java-application-v4-3');
});

test('createRandomVersionId 生成合法且互不相同的 ID', () => {
  const first = createRandomVersionId();
  const second = createRandomVersionId();
  assert.equal(isValidVersionId(first), true);
  assert.equal(isValidVersionId(second), true);
  assert.notEqual(first, second);
});
