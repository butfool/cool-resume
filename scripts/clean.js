#!/usr/bin/env node
/**
 * clean.js — 删除构建产物
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const targets = ['dist', 'resume.html', 'resume.pdf'];

for (const target of targets) {
  const fullPath = path.join(ROOT, target);
  try {
    fs.rmSync(fullPath, { recursive: true, force: true });
  } catch {
    // ignore
  }
}

for (const target of fs.readdirSync(ROOT).filter(name => /^resume-.+\.pdf$/i.test(name))) {
  try { fs.rmSync(path.join(ROOT, target), { force: true }); } catch { /* ignore */ }
}

console.log('✓ 已清理构建产物');
