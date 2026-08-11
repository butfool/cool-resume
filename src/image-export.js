import html2canvas from 'html2canvas';
import { getStoredA4Preview, setA4Preview } from './a4-mode.js';

function nextFrame() {
  return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

/**
 * 导出自然流简历为一张连续图片。A4 预览开启时，暂时恢复自然流，
 * 避免把分页容器的截断和页间距带入图片。
 */
export async function exportResumeImage({ format = 'png', scale = 2, fileName = 'resume' } = {}) {
  const wasA4 = getStoredA4Preview();
  if (wasA4) {
    setA4Preview(false);
    await nextFrame();
  }

  const target = document.getElementById('app');
  if (!target) throw new Error('找不到简历内容');

  // 截图使用独立白色画布，避免自然流的 #app 内容紧贴图片边缘。
  const captureRoot = document.createElement('div');
  const captureContent = target.cloneNode(true);
  const contentWidth = Math.ceil(target.getBoundingClientRect().width);
  captureRoot.style.cssText = [
    'position:absolute', 'left:-100000px', 'top:0', 'z-index:-1',
    'box-sizing:content-box', 'width:' + contentWidth + 'px',
    'padding:32px', 'background:#fff', 'overflow:visible',
  ].join(';');
  captureContent.style.width = `${contentWidth}px`;
  captureRoot.appendChild(captureContent);
  document.body.appendChild(captureRoot);

  try {
    const canvas = await html2canvas(captureRoot, {
      backgroundColor: '#ffffff',
      scale: Math.min(Math.max(Number(scale) || 2, 1), 3),
      useCORS: true,
      logging: false,
      windowWidth: Math.max(document.documentElement.clientWidth, captureRoot.scrollWidth),
      height: captureRoot.scrollHeight,
      scrollX: 0,
      scrollY: 0,
    });
    const mime = format === 'jpeg' ? 'image/jpeg' : 'image/png';
    const extension = format === 'jpeg' ? 'jpg' : 'png';
    const blob = await new Promise(resolve => canvas.toBlob(resolve, mime, format === 'jpeg' ? 0.94 : undefined));
    if (!blob) throw new Error('图片编码失败');
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${fileName}.${extension}`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    return { width: canvas.width, height: canvas.height };
  } finally {
    captureRoot.remove();
    if (wasA4) {
      setA4Preview(true, true);
      await nextFrame();
    }
  }
}
