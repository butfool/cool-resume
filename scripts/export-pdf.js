#!/usr/bin/env node
/**
 * export-pdf.js — 用 Chrome 无头模式把当前简历版本导出为带版本和时间的 PDF
 * 复用原 Makefile 中的 Chrome 路径，通过 Puppeteer 连接本机 Chrome，
 * 以 0 边距打印 A4，确保与分页分隔线预览的边距完全一致。
 */
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');

const HTML_FILE = path.join(ROOT, 'resume.html');
let pdfFile;

function safeFilePart(value, fallback = 'resume') {
  return String(value || fallback).trim()
    .replace(/[\\/:*?"<>|\u0000-\u001f]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 80) || fallback;
}

function exportTimestamp() {
  const now = new Date();
  const pad = value => String(value).padStart(2, '0');
  return `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}-${pad(now.getHours())}${pad(now.getMinutes())}`;
}

function findChrome() {
  const candidates = [
    process.env.CHROME_PATH,
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
  ].filter(Boolean);
  for (const candidate of candidates) {
    if (path.isAbsolute(candidate) && fs.existsSync(candidate)) return candidate;
    if (!path.isAbsolute(candidate)) {
      try {
        return execFileSync('which', [candidate], { encoding: 'utf8' }).trim();
      } catch {
        // continue searching
      }
    }
  }
  return null;
}

const CHROME = findChrome();

if (!CHROME || !fs.existsSync(CHROME)) {
  console.error('✗ 未找到 Chrome/Chromium。请安装浏览器，或设置 CHROME_PATH。');
  process.exit(1);
}

let browser;
try {
  browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const page = await browser.newPage();
  // PDF 显式开启分页分隔线后，直接打印同一份页面 DOM。
  await page.goto(`file://${HTML_FILE}`, {
    waitUntil: 'networkidle0',
  });

  const exportInfo = await page.evaluate(() => ({
    versionName: document.querySelector('.resume-version-picker-button > span')?.textContent?.trim() || document.title,
    versionId: document.querySelector('.resume-version-tree-item[aria-current="true"]')?.dataset.versionId || 'active-version',
  }));
  pdfFile = path.join(ROOT, `resume-${safeFilePart(exportInfo.versionName)}-${safeFilePart(exportInfo.versionId)}-${exportTimestamp()}.pdf`);

  // 静态产物没有开发服务器的默认状态；显式开启分页后再导出。
  if (await page.$('.page-separator-page-wrapper') === null) {
    await page.evaluate(() => {
      const toggle = document.querySelector('.resume-editor-page-separator-toggle');
      if (toggle && !toggle.checked) toggle.click();
    });
  }

  // 等待 JS 分页完成（main.js 在 load 时同步完成，这里再做一次保险检查）
  await page.waitForFunction(() => {
    return document.querySelectorAll('.page-separator-page-wrapper').length > 0;
  }, { timeout: 10000 });

  await page.pdf({
    path: pdfFile,
    format: 'A4',
    printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });

  console.log(`✓ 已生成 ${pdfFile}`);
} catch (err) {
  console.error('✗ PDF 导出失败');
  console.error(err.message);
  process.exit(1);
} finally {
  if (browser) await browser.close();
}

// dist 是过程目录；resume.html 与带版本信息的 PDF 都是正式产物，保留以便核对。
fs.rmSync(path.join(ROOT, 'dist'), { recursive: true, force: true });
console.log(`✓ 已清理过程目录 dist，保留 ${path.basename(pdfFile || 'resume.pdf')}`);
