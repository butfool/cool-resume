import { getStoredPageSeparators, setPageSeparators } from './page-separator-mode.js';
import { saveBlob } from './file-save.js';
import { captureElement, withCaptureStage } from './capture-element.js';

function nextFrame() {
  return new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)));
}

function concatBytes(chunks) {
  const total = chunks.reduce((sum, chunk) => sum + chunk.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    out.set(chunk, offset);
    offset += chunk.length;
  }
  return out;
}

function buildA4PdfFromJpegs(pages) {
  if (!pages.length) throw new Error('PDF 没有页面');
  const text = value => new TextEncoder().encode(value);
  const pageWidth = 595.28;
  const pageHeight = 841.89;
  const objects = [null];
  const add = body => {
    objects.push(body);
    return objects.length - 1;
  };

  const catalogId = add(null);
  const pagesId = add(null);
  const pageIds = [];

  for (const page of pages) {
    const imageId = add(concatBytes([
      text(`<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.bytes.length} >>\nstream\n`),
      page.bytes,
      text('\nendstream'),
    ]));
    const content = `q\n${pageWidth} 0 0 ${pageHeight} 0 0 cm\n/Im0 Do\nQ\n`;
    const contentBytes = text(content);
    const contentId = add(concatBytes([
      text(`<< /Length ${contentBytes.length} >>\nstream\n`),
      contentBytes,
      text('endstream'),
    ]));
    pageIds.push(add(text(`<< /Type /Page /Parent ${pagesId} 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${contentId} 0 R /Resources << /XObject << /Im0 ${imageId} 0 R >> >> >>`)));
  }

  objects[catalogId] = text(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  objects[pagesId] = text(`<< /Type /Pages /Kids [${pageIds.map(id => `${id} 0 R`).join(' ')}] /Count ${pageIds.length} >>`);

  const chunks = [text('%PDF-1.4\n')];
  const offsets = [0];
  let cursor = chunks[0].length;
  for (let id = 1; id < objects.length; id += 1) {
    offsets[id] = cursor;
    const header = text(`${id} 0 obj\n`);
    const footer = text('\nendobj\n');
    chunks.push(header, objects[id], footer);
    cursor += header.length + objects[id].length + footer.length;
  }

  let xref = `xref\n0 ${objects.length}\n0000000000 65535 f \n`;
  for (let id = 1; id < objects.length; id += 1) {
    xref += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  }
  xref += `trailer\n<< /Size ${objects.length} /Root ${catalogId} 0 R >>\nstartxref\n${cursor}\n%%EOF\n`;
  chunks.push(text(xref));
  return new Blob([concatBytes(chunks)], { type: 'application/pdf' });
}

async function canvasToJpeg(canvas, quality = 0.92) {
  const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', quality));
  if (!blob) throw new Error('图片编码失败');
  return {
    bytes: new Uint8Array(await blob.arrayBuffer()),
    width: canvas.width,
    height: canvas.height,
  };
}

export async function exportResumePdf({ fileName = 'resume' } = {}) {
  const hadPageSeparators = getStoredPageSeparators();
  if (!hadPageSeparators) {
    setPageSeparators(true);
    await nextFrame();
  }

  try {
    const pages = [...document.querySelectorAll('#app .page-separator-page')];
    if (!pages.length) throw new Error('找不到分页内容');
    const jpegPages = [];
    for (const page of pages) {
      const width = Math.max(1, Math.ceil(page.offsetWidth));
      const height = Math.max(1, Math.ceil(page.offsetHeight));
      const stage = await withCaptureStage(width, async root => {
        const clone = page.cloneNode(true);
        clone.style.transform = 'none';
        clone.style.position = 'relative';
        clone.style.left = '0';
        clone.style.top = '0';
        clone.style.right = 'auto';
        clone.style.bottom = 'auto';
        clone.style.margin = '0';
        clone.style.width = `${width}px`;
        clone.style.height = `${height}px`;
        clone.style.overflow = 'hidden';
        clone.querySelectorAll('.page-separator-page-number').forEach(node => node.remove());
        root.appendChild(clone);
      });
      try {
        jpegPages.push(await canvasToJpeg(await captureElement(stage, { scale: 2 })));
      } finally {
        stage.remove();
      }
    }
    return saveBlob(buildA4PdfFromJpegs(jpegPages), `${fileName}.pdf`, [{ name: 'PDF', extensions: ['pdf'] }]);
  } finally {
    if (!hadPageSeparators) {
      setPageSeparators(false, true);
      await nextFrame();
    }
  }
}
