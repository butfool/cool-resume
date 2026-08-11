import { t } from './app-i18n.js';

/*
 * renderer.js — 将版本 JSON 渲染为简历 HTML
 * 每个 section 对应一个 renderXxx 函数，结构与当前 resume.html 保持一致。
 */

const ICONS = {
  mail: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.991 5.727a2 2 0 0 1-2.009 0L2 7"/></svg>`,

  phone: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"/></svg>`,

  mapPin: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.993-5.539 10.193-7.399 11.799a1 1 0 0 1-1.202 0C9.539 20.193 4 14.993 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/></svg>`,

  user: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M20 21a8 8 0 0 0-16 0"/></svg>`,

  briefcase: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M16 20V4a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/><rect width="20" height="14" x="2" y="6" rx="2"/></svg>`,

  rocket: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 15v5s3.03-.55 4-2c1.08-1.62 0-5 0-5"/><path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09"/><path d="M9 12a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6 11a22.4 22.4 0 0 1-4 2z"/><path d="M9 12H4s.55-3.03 2-4c1.62-1.08 5 .05 5 .05"/></svg>`,

  wrench: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.106-3.105c.32-.322.863-.22.983.218a6 6 0 0 1-8.259 7.057l-7.91 7.91a1 1 0 0 1-2.999-3l7.91-7.91a6 6 0 0 1 7.057-8.259c.438.12.54.662.219.984z"/></svg>`,

  graduationCap: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21.42 10.922a1 1 0 0 0-.019-1.838L12.83 5.18a2 2 0 0 0-1.66 0L2.6 9.08a1 1 0 0 0 0 1.832l8.57 3.908a2 2 0 0 0 1.66 0z"/><path d="M22 10v6"/><path d="M6 12.5V16a6 3 0 0 0 12 0v-3.5"/></svg>`,

  award: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m15.477 12.89 1.515 8.526a.5.5 0 0 1-.81.47l-3.58-2.687a1 1 0 0 0-1.197 0l-3.586 2.686a.5.5 0 0 1-.81-.469l1.514-8.526"/><circle cx="12" cy="8" r="6"/></svg>`,
};

function icon(name) {
  return ICONS[name] || '';
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderInlineMarkdown(text) {
  if (text == null) return '';
  let html = escapeHtml(String(text));
  // 加粗 **text**
  html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // 斜体 *text*（在加粗之后处理，避免与 ** 冲突）
  html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
  // 高亮 ==text==
  html = html.replace(/==(.+?)==/g, '<mark>$1</mark>');
  return html;
}

function renderBullets(items) {
  if (!items || items.length === 0) return '';
  return `<ul>${items.map(item => `<li><p>${renderInlineMarkdown(item)}</p></li>`).join('')}</ul>`;
}

export function renderHeader(data) {
  return `
    <header class="resume-header">
      <div class="resume-header-top">
        <h1 class="resume-name">${escapeHtml(data.name)}</h1>
        <div class="resume-title-line">
          <span class="resume-headline">${escapeHtml(data.title)}</span>
          <span class="resume-title-separator">·</span>
          <span class="resume-years">${escapeHtml(data.experience)}</span>
        </div>
      </div>
    </header>
  `;
}

function renderSection(title, iconName, content) {
  return `
    <section class="resume-section">
      <h2 class="resume-section-title"><i class="resume-section-icon">${icon(iconName)}</i>${escapeHtml(title)}</h2>
      <div class="resume-section-content">${content}</div>
    </section>
  `;
}

function renderBasicInfo(basicInfo) {
  const items = basicInfo.items.map(item => `
    <div class="resume-basic-info-item">
      <span class="resume-basic-info-label">${escapeHtml(item.label)}</span>
      <span class="resume-basic-info-value">${escapeHtml(item.value)}</span>
    </div>
  `).join('');
  return `<div class="resume-basic-info">${items}</div>`;
}

function renderSummary(summary) {
  if (!summary || !summary.items || summary.items.length === 0) return '';
  return `<div class="resume-summary-content">${renderBullets(summary.items)}</div>`;
}

function renderWork(work) {
  const entries = work.map(entry => `
    <div class="resume-entry">
      <div class="resume-entry-header">
        <div class="resume-entry-title">
          ${escapeHtml(entry.company)}
          <span class="resume-entry-title-separator">·</span>
          ${escapeHtml(entry.position)}
        </div>
        <div class="resume-entry-date">${escapeHtml(entry.date)}</div>
      </div>
      <div class="resume-entry-summary">${renderBullets(entry.summary)}</div>
    </div>
  `).join('');
  return entries;
}

function renderProjectMeta(entry, locale) {
  const fields = [
    { key: 'background', label: t(locale, 'project.background') },
    { key: 'techStack', label: t(locale, 'project.techStack') },
    { key: 'role', label: t(locale, 'project.role') },
  ];
  const lines = fields
    .filter(({ key }) => entry[key])
    .map(({ key, label }) => `
      <div class="resume-project-meta">
        <span class="resume-project-meta-label">${escapeHtml(label)}</span>
        <span class="resume-project-meta-value">${renderInlineMarkdown(entry[key])}</span>
      </div>
    `);
  return lines.length ? `<div class="resume-project-meta-list">${lines.join('')}</div>` : '';
}

function renderProjects(projects, locale) {
  const entries = projects.map(entry => `
    <div class="resume-entry resume-project-entry">
      <div class="resume-entry-header">
        <div class="resume-entry-title">${escapeHtml(entry.name)}</div>
        <div class="resume-entry-date">${escapeHtml(entry.date)}</div>
      </div>
      ${renderProjectMeta(entry, locale)}
      <hr class="resume-project-divider">
      <div class="resume-entry-summary">${renderBullets(entry.summary)}</div>
    </div>
  `).join('');
  return entries;
}

function renderSkills(skills) {
  const items = skills.map(skill => `
    <div class="resume-skill-item">
      <div class="resume-skill-name">${escapeHtml(skill.category)}</div>
      <div class="resume-skill-keywords">${renderSkillKeywords(skill.keywords)}</div>
    </div>
  `).join('');
  return items;
}

function renderSkillKeywords(keywords) {
  const groups = String(keywords || '')
    .split('；')
    .map(part => part.trim())
    .filter(Boolean)
    .map(part => {
      const separator = part.indexOf(':');
      if (separator < 0) return `<span class="resume-skill-group">${escapeHtml(part)}</span>`;
      const level = part.slice(0, separator).trim();
      const values = part.slice(separator + 1).trim();
      return `<span class="resume-skill-group"><span class="resume-skill-level">${escapeHtml(level)}</span><span class="resume-skill-values">${escapeHtml(values)}</span></span>`;
    });

  return groups.join('') || '<span class="resume-skill-group">—</span>';
}

function renderEducation(education) {
  const entries = education.map(entry => `
    <div class="resume-entry">
      <div class="resume-entry-header">
        <div>
          <div class="resume-entry-title">${escapeHtml(entry.institution)}</div>
          <div class="resume-entry-organization">${escapeHtml(entry.degree)}</div>
        </div>
        <div class="resume-entry-date">${escapeHtml(entry.date)}</div>
      </div>
    </div>
  `).join('');
  return entries;
}

const SECTIONS = {
  basicInfo: { key: 'basicInfo', icon: 'user', render: renderBasicInfo },
  summary: { key: 'summary', icon: 'award', render: renderSummary },
  skills: { key: 'skills', icon: 'wrench', render: renderSkills },
  work: { key: 'work', icon: 'briefcase', render: renderWork },
  projects: { key: 'projects', icon: 'rocket', render: renderProjects },
  education: { key: 'education', icon: 'graduationCap', render: renderEducation },
};

const DEFAULT_ORDER = ['header', 'basicInfo', 'summary', 'skills', 'work', 'projects', 'education'];

export function renderResume(data, { locale = 'zh-CN' } = {}) {
  const order = data.order || DEFAULT_ORDER;
  return order.map(key => {
    if (key === 'header') return renderHeader(data);
    const section = SECTIONS[key];
    if (!section) return '';
    return renderSection(t(locale, `section.${section.key}`), section.icon, section.render(data[key], locale));
  }).join('');
}
