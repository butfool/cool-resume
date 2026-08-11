import './style.css';
import { renderResume } from './renderer.js';
import { initResumeEditor } from './resume-editor.js';
import { createResumeStore } from './version-store.js';
import { getInitialAppLocale, getSupportedAppLocales, i18nReady, setAppLocale } from './app-i18n.js';
import { getStoredA4Preview, setA4Preview, initA4ResizeListener } from './a4-mode.js';

const STORAGE_KEY = 'myresume2-theme';

await i18nReady;
const resumeStore = await createResumeStore().init();
const initialVersion = await resumeStore.getActive();
const DEFAULT_THEME = initialVersion.data.theme || 'minimal';

function getInitialTheme() {
  try { return localStorage.getItem(STORAGE_KEY) || DEFAULT_THEME; } catch { return DEFAULT_THEME; }
}

export function setTheme(themeName) {
  document.documentElement.setAttribute('data-theme', themeName);
  try { localStorage.setItem(STORAGE_KEY, themeName); } catch { /* ignore */ }
}

export function getCurrentTheme() {
  return document.documentElement.getAttribute('data-theme') || DEFAULT_THEME;
}

setTheme(getInitialTheme());

function applySpacing(spacing) {
  Object.entries(spacing || {}).forEach(([key, value]) => {
    const cssValue = key === 'resume-line-height' || typeof value !== 'number' ? String(value) : `${value}px`;
    document.documentElement.style.setProperty(`--${key}`, cssValue);
  });
}

let activeVersion = { versionId: initialVersion.versionId };
let activeResumeData = initialVersion.data;
let activeLocale = getInitialAppLocale();
applySpacing(activeResumeData?.style?.spacing);

function renderApp(data, { forceRecapture = false, renderResumeFn = renderResume } = {}) {
  applySpacing(data?.style?.spacing);
  document.documentElement.lang = activeLocale;
  document.title = `${data.name} - ${data.title}`;
  document.getElementById('app').innerHTML = renderResumeFn(data, { locale: activeLocale });
  setA4Preview(getStoredA4Preview(), forceRecapture);
}

renderApp(activeResumeData, { forceRecapture: true });

let editorController;
let panelController;
let initDevPanel;

function createEditor(wasOpen = false) {
  editorController = initResumeEditor({
    initialData: activeResumeData,
    defaultData: activeResumeData,
    locale: activeLocale,
    onChange: data => {
      activeResumeData = data;
      renderApp(data, { forceRecapture: true });
    },
    onSave: data => resumeStore.saveVersion(activeVersion.versionId, data),
  });
  if (wasOpen) editorController.setOpen(true);
}

function createPanel() {
  panelController = initDevPanel({
    currentTheme: getCurrentTheme(),
    defaultTheme: DEFAULT_THEME,
    defaultSpacing: activeResumeData?.style?.spacing || {},
    onThemeChange: setTheme,
    onEditorToggle: () => editorController.toggle(),
    locale: activeLocale,
    locales: getSupportedAppLocales(),
    onLocaleChange: changeLocale,
    catalog: resumeStore.getCatalog(),
    activeVersion,
    onVersionChange: changeVersion,
    onVersionCreate: createVersion,
    onVersionCopy: copyVersion,
    onVersionRename: renameVersion,
    onVersionDelete: deleteVersion,
    onVersionMove: moveVersion,
  });
  if (editorController?.isOpen()) window.dispatchEvent(new CustomEvent('resume-editor-toggle', { detail: { open: true } }));
}

async function changeVersion(nextActive) {
  if (nextActive.versionId === activeVersion.versionId) return;
  const wasOpen = editorController?.isOpen();
  const result = await resumeStore.setActive(nextActive.versionId);
  activeVersion = { versionId: result.versionId };
  activeResumeData = result.data;
  editorController?.destroy();
  panelController?.destroy();
  setTheme(activeResumeData.theme || DEFAULT_THEME);
  renderApp(activeResumeData, { forceRecapture: true });
  createEditor(wasOpen);
  createPanel();
}

async function reloadAfterVersionMutation(versionId, wasOpen) {
  const result = await resumeStore.setActive(versionId);
  activeVersion = { versionId: result.versionId };
  activeResumeData = result.data;
  editorController?.destroy();
  panelController?.destroy();
  setTheme(activeResumeData.theme || DEFAULT_THEME);
  renderApp(activeResumeData, { forceRecapture: true });
  createEditor(wasOpen);
  createPanel();
}

async function createVersion({ name, parentId = null }) {
  const wasOpen = editorController?.isOpen();
  const result = await resumeStore.createVersion({ name, parentId });
  await reloadAfterVersionMutation(result.versionId, wasOpen);
}

async function copyVersion({ name, sourceVersionId, parentId = null }) {
  const wasOpen = editorController?.isOpen();
  const result = await resumeStore.createVersion({ name, parentId, copyFromVersionId: sourceVersionId });
  await reloadAfterVersionMutation(result.versionId, wasOpen);
}

async function renameVersion({ versionId, name }) {
  await resumeStore.renameVersion(versionId, name);
  panelController?.destroy();
  createPanel();
}

async function deleteVersion(versionId) {
  const wasOpen = editorController?.isOpen();
  const result = await resumeStore.deleteVersion(versionId);
  await reloadAfterVersionMutation(result.versionId, wasOpen);
}

async function moveVersion(versionId, targetId, placement) {
  await resumeStore.moveVersion(versionId, targetId, placement);
  panelController?.destroy();
  createPanel();
}

async function changeLocale(locale) {
  if (locale === activeLocale) return;
  const wasOpen = editorController?.isOpen();
  editorController?.destroy();
  panelController?.destroy();
  await setAppLocale(locale);
  activeLocale = getInitialAppLocale();
  renderApp(activeResumeData, { forceRecapture: true });
  createEditor(wasOpen);
  createPanel();
}

createEditor();
initA4ResizeListener();
import('./dev-panel.js').then(module => {
  initDevPanel = module.initDevPanel;
  createPanel();
});

if (import.meta.env.DEV && import.meta.hot) {
  import.meta.hot.accept(['./renderer.js'], async () => {
    const { renderResume: newRenderResume } = await import('./renderer.js');
    renderApp(activeResumeData, { forceRecapture: true, renderResumeFn: newRenderResume });
  });
}

if (import.meta.env.DEV) {
  let lastExternalData = JSON.stringify(activeResumeData);
  window.setInterval(async () => {
    try {
      const externalData = await resumeStore.getVersion(activeVersion.versionId);
      const serialized = JSON.stringify(externalData);
      if (serialized === lastExternalData) return;
      lastExternalData = serialized;
      activeResumeData = externalData;
      editorController?.setData(externalData);
      renderApp(externalData, { forceRecapture: true });
    } catch { /* 外部文件暂时不可读时保留当前预览 */ }
  }, 1500);
}
