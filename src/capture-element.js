import html2canvas from 'html2canvas';

function nextFrame() {
  return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

function canvasHasInk(canvas) {
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  const { width, height } = canvas;
  if (width < 2 || height < 2) return false;
  const stepX = Math.max(1, Math.floor(width / 60));
  const stepY = Math.max(1, Math.floor(height / 60));
  const { data } = ctx.getImageData(0, 0, width, height);
  for (let y = 0; y < height; y += stepY) {
    for (let x = 0; x < width; x += stepX) {
      const index = (y * width + x) * 4;
      if (data[index + 3] === 0) continue;
      if (data[index] < 252 || data[index + 1] < 252 || data[index + 2] < 252) return true;
    }
  }
  return false;
}

function measureCaptureBox(element) {
  const rect = element.getBoundingClientRect();
  const width = Math.max(
    1,
    Math.ceil(Math.max(element.scrollWidth || 0, element.offsetWidth || 0, rect.width || 0)),
  );
  const height = Math.max(
    1,
    Math.ceil(Math.max(element.scrollHeight || 0, element.offsetHeight || 0, rect.height || 0)),
  );
  return { width, height };
}

export async function captureElement(element, { scale = 2, backgroundColor = '#ffffff' } = {}) {
  if (document.fonts?.ready) await document.fonts.ready.catch(() => {});
  await nextFrame();
  const { width, height } = measureCaptureBox(element);
  const canvas = await html2canvas(element, {
    backgroundColor,
    scale: Math.min(Math.max(Number(scale) || 2, 1), 3),
    useCORS: true,
    allowTaint: true,
    logging: false,
    width,
    height,
    windowWidth: width,
    windowHeight: height,
    scrollX: 0,
    scrollY: 0,
    onclone(doc, cloned) {
      // Split-mode #app rules add a large left margin; keep them off the clone.
      // Do not strip page-separator-mode — PDF pages rely on those layout rules.
      doc.documentElement.classList.remove('resume-editor-split-mode', 'resume-editor-toolbar-visible');
      cloned.style.transform = 'none';
      cloned.style.position = 'absolute';
      cloned.style.left = '0px';
      cloned.style.top = '0px';
      cloned.style.right = 'auto';
      cloned.style.bottom = 'auto';
      cloned.style.margin = '0px';
      cloned.style.inset = 'auto';
      cloned.style.maxWidth = 'none';
      cloned.style.minHeight = '0';
      cloned.style.width = `${width}px`;
      cloned.style.height = `${height}px`;
      cloned.style.overflow = 'visible';
      doc.documentElement.style.background = backgroundColor;
      doc.body.style.background = backgroundColor;
      doc.body.style.padding = '0px';
      doc.body.style.margin = '0px';
      doc.body.style.maxWidth = 'none';
      doc.body.style.minHeight = '0';
    },
  });
  if (!canvasHasInk(canvas)) throw new Error('截图结果是空白');
  return canvas;
}

export async function withCaptureStage(widthPx, build) {
  const stage = document.createElement('div');
  const bodyStyle = getComputedStyle(document.body);
  const width = Math.max(1, Math.ceil(widthPx));
  stage.className = 'resume-export-stage';
  stage.style.cssText = [
    'position:fixed',
    'left:0',
    'top:0',
    'z-index:1',
    `width:${width}px`,
    'max-width:none',
    'height:auto',
    'background:#fff',
    'color:' + bodyStyle.color,
    'font-family:' + bodyStyle.fontFamily,
    'font-size:' + bodyStyle.fontSize,
    'line-height:' + bodyStyle.lineHeight,
    'box-sizing:content-box',
    'overflow:visible',
    'pointer-events:none',
    'margin:0',
    'transform:none',
  ].join(';');
  document.body.appendChild(stage);
  try {
    await build(stage);
    await nextFrame();
    // Freeze the laid-out size so html2canvas captures the full long content
    // instead of a viewport-sized square.
    const box = measureCaptureBox(stage);
    stage.style.width = `${box.width}px`;
    stage.style.height = `${box.height}px`;
    await nextFrame();
    return stage;
  } catch (error) {
    stage.remove();
    throw error;
  }
}
