import { getStoredPageSeparators, setPageSeparators } from './page-separator-mode.js';
import { saveBlob } from './file-save.js';
import { captureElement, withCaptureStage } from './capture-element.js';

function nextFrame() {
  return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

function measureCssWidth(cssSize) {
  const probe = document.createElement('div');
  probe.style.cssText = `position:absolute;left:-9999px;top:0;width:${cssSize};height:0;pointer-events:none;visibility:hidden;`;
  document.body.appendChild(probe);
  const width = probe.getBoundingClientRect().width;
  probe.remove();
  return width;
}

function cloneNaturalResumeContent(app) {
  const source = app.querySelector('.page-separator-original-content') || app;
  const captureContent = document.createElement('div');
  captureContent.className = 'resume-export-content';
  Array.from(source.childNodes).forEach(node => {
    if (
      node.nodeType === Node.ELEMENT_NODE &&
      typeof node.className === 'string' &&
      (node.classList.contains('page-separator-page-wrapper') ||
        node.classList.contains('page-separator-original-content'))
    ) return;
    captureContent.appendChild(node.cloneNode(true));
  });
  captureContent.querySelectorAll('.page-separator-page-number').forEach(node => node.remove());
  return captureContent;
}

/**
 * 导出自然流简历为一张连续图片。分页分隔线开启时，暂时恢复自然流，
 * 避免把分页容器的截断和页间距带入图片。
 */
export async function exportResumeImage({ format = 'png', scale = 2, fileName = 'resume' } = {}) {
  const hadPageSeparators = getStoredPageSeparators();
  if (hadPageSeparators) {
    setPageSeparators(false);
    await nextFrame();
  }

  const target = document.getElementById('app');
  if (!target) throw new Error('找不到简历内容');

  const contentWidth = Math.max(
    1,
    Math.ceil(
      measureCssWidth('var(--resume-canvas-width)') ||
      target.getBoundingClientRect().width ||
      target.offsetWidth,
    ),
  );
  const stage = await withCaptureStage(contentWidth, async root => {
    const captureContent = cloneNaturalResumeContent(target);
    captureContent.style.width = '100%';
    captureContent.style.boxSizing = 'border-box';
    captureContent.style.padding = 'var(--resume-body-padding-y) var(--resume-canvas-padding-x)';
    captureContent.style.background = 'var(--theme-bg, #fff)';
    root.style.padding = '32px';
    root.appendChild(captureContent);
  });

  try {
    const canvas = await captureElement(stage, { scale });
    const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const extension = format === 'jpeg' ? 'jpg' : 'png';
    const blob = await new Promise(resolve => canvas.toBlob(resolve, mime, format === 'jpeg' ? 0.94 : undefined));
    if (!blob) throw new Error('图片编码失败');
    await saveBlob(blob, `${fileName}.${extension}`, [{
      name: format === 'jpeg' ? 'JPEG' : 'PNG',
      extensions: [extension],
    }]);
    return { width: canvas.width, height: canvas.height };
  } finally {
    stage.remove();
    if (hadPageSeparators) {
      setPageSeparators(true, true);
      await nextFrame();
    }
  }
}
