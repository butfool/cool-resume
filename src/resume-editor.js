import './resume-editor.css';
import { t } from './app-i18n.js';
import { createIcons } from 'lucide';
import { APP_ICONS } from './icon-set.js';
import { basicSetup } from 'codemirror';
import { json } from '@codemirror/lang-json';
import { EditorState } from '@codemirror/state';
import { EditorView, keymap } from '@codemirror/view';
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands';
import { bracketMatching } from '@codemirror/language';
import { linter, lintGutter } from '@codemirror/lint';
import { oneDark } from '@codemirror/theme-one-dark';

const WIDTH_KEY = 'myresume2-resume-editor-width-v2';

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function downloadJson(value) {
  const blob = new Blob([JSON.stringify(value, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${value.name || 'resume'}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function getStoredWidth() {
  try {
    const value = Number(localStorage.getItem(WIDTH_KEY));
    return Number.isFinite(value) ? Math.min(760, Math.max(360, value)) : 520;
  } catch { return 520; }
}
function saveWidth(value) {
  try { localStorage.setItem(WIDTH_KEY, String(value)); } catch { /* ignore */ }
}

export function getInitialResumeData(defaultData) {
  return clone(defaultData);
}

/** JSON 编辑器：通过运行模式对应的 ResumeStore 保存当前版本。 */
export function initResumeEditor({ initialData, initialText, defaultData, onChange, onSave, locale = 'zh-CN' }) {
  const editor = document.createElement('aside');
  editor.className = 'resume-json-editor';
  editor.setAttribute('aria-label', t(locale, 'editor.title'));
  editor.innerHTML = `
    <div class="resume-json-editor-header">
      <div>
        <div class="resume-json-editor-title"><i data-lucide="code-2"></i>${t(locale, 'editor.title')}</div>
    <div class="resume-json-editor-subtitle">${t(locale, 'editor.subtitle')}</div>
      </div>
      <button type="button" class="resume-json-editor-icon-button" data-editor-action="close" aria-label="${t(locale, 'editor.close')}" title="${t(locale, 'editor.close')}"><i data-lucide="x"></i></button>
    </div>
    <div class="resume-json-editor-status" data-editor-status role="status">${t(locale, 'editor.loaded')}</div>
    <div class="resume-json-editor-input" role="textbox" aria-label="${t(locale, 'editor.contentAria')}"></div>
    <div class="resume-json-editor-actions">
      <button type="button" class="resume-json-editor-button primary" data-editor-action="apply"><i data-lucide="check"></i>${t(locale, 'editor.apply')}</button>
      <button type="button" class="resume-json-editor-button" data-editor-action="format">${t(locale, 'editor.format')}</button>
      <button type="button" class="resume-json-editor-button" data-editor-action="copy"><i data-lucide="copy"></i>${t(locale, 'editor.copy')}</button>
      <button type="button" class="resume-json-editor-button" data-editor-action="upload"><i data-lucide="upload"></i>${t(locale, 'editor.upload')}</button>
      <button type="button" class="resume-json-editor-button" data-editor-action="download"><i data-lucide="download"></i>${t(locale, 'editor.download')}</button>
      <button type="button" class="resume-json-editor-button quiet" data-editor-action="reset"><i data-lucide="rotate-ccw"></i>${t(locale, 'editor.reset')}</button>
    </div>
    <div class="resume-json-editor-hint">${t(locale, 'editor.hint')}</div>
    <input type="file" class="resume-json-editor-file-input" accept="application/json,.json" hidden />
    <div class="resume-json-editor-resize-handle" role="separator" aria-label="${t(locale, 'editor.resize')}" title="${t(locale, 'editor.resize')}"></div>
  `;

  const input = editor.querySelector('.resume-json-editor-input');
  const status = editor.querySelector('[data-editor-status]');
  const fileInput = editor.querySelector('.resume-json-editor-file-input');
  let currentData = clone(initialData);
  let inputTimer = null;

  function setStatus(message, type = 'ok') {
    status.textContent = message;
    status.dataset.type = type;
  }
  let editorView;
  function getValue() { return editorView?.state.doc.toString() || ''; }
  function setValue(value) {
    if (!editorView) return;
    editorView.dispatch({ changes: { from: 0, to: editorView.state.doc.length, insert: JSON.stringify(value, null, 2) } });
  }
  function parseInput() {
    try {
      const parsed = JSON.parse(getValue());
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error(locale === 'en-US' ? 'Top level must be a JSON object' : '顶层必须是 JSON 对象');
      return parsed;
    } catch (error) {
      setStatus(t(locale, 'editor.jsonError', { message: error.message }), 'error');
      return null;
    }
  }
  async function applyInput({ silent = false } = {}) {
    const parsed = parseInput();
    if (!parsed) return false;
    try {
      onChange(clone(parsed));
    } catch (error) {
      setStatus(t(locale, 'editor.dataError', { message: error.message }), 'error');
      return false;
    }
    currentData = parsed;
    try {
      await onSave?.(clone(parsed));
    } catch (error) {
      setStatus(t(locale, 'editor.dataError', { message: error.message }), 'error');
      return false;
    }
    setStatus(silent ? t(locale, 'editor.live') : t(locale, 'editor.applied'), 'ok');
    return true;
  }
  function writeInput(value) { setValue(value); }

  function jsonDiagnostics(view) {
    try { JSON.parse(view.state.doc.toString()); return []; } catch (error) {
      const match = String(error.message).match(/position (\d+)/i);
      const position = match ? Math.min(Number(match[1]), view.state.doc.length) : 0;
      return [{ from: position, to: Math.min(position + 1, view.state.doc.length), severity: 'error', message: error.message }];
    }
  }

  editorView = new EditorView({
    state: EditorState.create({
      doc: initialText ?? JSON.stringify(currentData, null, 2),
      extensions: [
        basicSetup,
        json(),
        oneDark,
        bracketMatching(),
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        lintGutter(),
        linter(jsonDiagnostics, { delay: 250 }),
        EditorView.updateListener.of(update => {
          if (!update.docChanged) return;
          setStatus(t(locale, 'editor.checking'), 'pending');
          window.clearTimeout(inputTimer);
          inputTimer = window.setTimeout(() => { applyInput({ silent: true }); }, 260);
        }),
        EditorView.theme({ '&': { height: '100%' }, '.cm-scroller': { overflow: 'auto' } }),
      ],
    }),
    parent: input,
  });
  editor.querySelector('[data-editor-action="apply"]').addEventListener('click', () => applyInput());
  editor.querySelector('[data-editor-action="format"]').addEventListener('click', () => {
    const parsed = parseInput();
    if (parsed) { writeInput(parsed); setStatus(t(locale, 'editor.formatted'), 'ok'); }
  });
  editor.querySelector('[data-editor-action="copy"]').addEventListener('click', async () => {
    if (!parseInput()) return;
    try {
      await navigator.clipboard.writeText(getValue());
      setStatus(t(locale, 'editor.copied'), 'ok');
    } catch { setStatus(t(locale, 'editor.copyFailed'), 'error'); }
  });
  editor.querySelector('[data-editor-action="download"]').addEventListener('click', () => {
    const parsed = parseInput();
    if (parsed) { downloadJson(parsed); setStatus(t(locale, 'editor.downloaded'), 'ok'); }
  });
  editor.querySelector('[data-editor-action="upload"]').addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files?.[0];
    if (!file) return;
    const imported = await file.text();
    editorView.dispatch({ changes: { from: 0, to: editorView.state.doc.length, insert: imported } });
    if (await applyInput()) setStatus(t(locale, 'editor.imported', { file: file.name }), 'ok');
    fileInput.value = '';
  });
  editor.querySelector('[data-editor-action="reset"]').addEventListener('click', () => {
    currentData = clone(defaultData);
    writeInput(currentData);
    onChange(clone(currentData));
    onSave?.(clone(currentData)).then?.(() => setStatus(t(locale, 'editor.resetDone'), 'ok')).catch?.(error => setStatus(t(locale, 'editor.dataError', { message: error.message }), 'error'));
  });

  let isOpen = false;
  function setOpen(open) {
    isOpen = Boolean(open);
    editor.classList.toggle('is-open', isOpen);
    document.documentElement.classList.toggle('resume-editor-split-mode', isOpen);
    window.dispatchEvent(new CustomEvent('resume-editor-toggle', { detail: { open: isOpen } }));
    if (isOpen) editorView.focus();
  }
  editor.querySelector('[data-editor-action="close"]').addEventListener('click', () => setOpen(false));
  const handleEditorShortcut = event => {
    if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'e') {
      event.preventDefault();
      setOpen(!isOpen);
    }
  };
  document.addEventListener('keydown', handleEditorShortcut);
  document.body.appendChild(editor);
  const resizeHandle = editor.querySelector('.resume-json-editor-resize-handle');
  let resizing = false;
  function resizeEditor(event) {
    if (!resizing) return;
    const width = Math.min(760, Math.max(360, event.clientX));
    document.documentElement.style.setProperty('--resume-json-editor-width', `${width}px`);
    saveWidth(width);
  }
  function endResize() {
    if (!resizing) return;
    resizing = false;
    document.documentElement.classList.remove('resume-editor-is-resizing');
  }
  resizeHandle.addEventListener('pointerdown', event => {
    if (window.innerWidth <= 640) return;
    resizing = true;
    resizeHandle.setPointerCapture?.(event.pointerId);
    document.documentElement.classList.add('resume-editor-is-resizing');
  });
  document.addEventListener('pointermove', resizeEditor);
  document.addEventListener('pointerup', endResize);
  document.documentElement.style.setProperty('--resume-json-editor-width', `${getStoredWidth()}px`);
  createIcons({ icons: APP_ICONS });

  return {
    toggle: () => setOpen(!isOpen),
    setOpen,
    isOpen: () => isOpen,
    getValue,
    setData: value => { currentData = clone(value); writeInput(currentData); },
    destroy: () => {
      window.clearTimeout(inputTimer);
      document.removeEventListener('keydown', handleEditorShortcut);
      document.removeEventListener('pointermove', resizeEditor);
      document.removeEventListener('pointerup', endResize);
      editorView.destroy();
      editor.remove();
    },
  };
}
