// One self-contained drawing, one PDF page. Rasterizing with the browser keeps
// Thai text and the SVG's hatch/line styles consistent with the visible drawing.
const MM_PER_INCH = 25.4;
const PDF_MAX_MM = 5000; // Below jsPDF's 14,400 pt page limit; never silently clip.
const DEFAULT_DPI = 300;
const MAX_PIXELS = 36_000_000;
const MAX_SIDE = 16_384;

export function dimensionInMm(value) {
  const match = String(value ?? '').trim().match(/^((?:\d+(?:\.\d*)?|\.\d+))\s*(mm|cm|in|pt|px)?$/i);
  if (!match) throw new Error('The manufacturer drawing needs an explicit positive page size.');
  const amount = Number(match[1]);
  const factor = { mm: 1, cm: 10, in: MM_PER_INCH, pt: MM_PER_INCH / 72, px: MM_PER_INCH / 96 }[match[2]?.toLowerCase() || 'px'];
  const result = amount * factor;
  if (!Number.isFinite(result) || result <= 0 || result > PDF_MAX_MM) {
    throw new Error(`The manufacturer PDF page must be larger than zero and no larger than ${PDF_MAX_MM} mm.`);
  }
  return result;
}

export function manufacturerPdfRasterSize(widthMm, heightMm) {
  if (![widthMm, heightMm].every(value => Number.isFinite(value) && value > 0 && value <= PDF_MAX_MM)) {
    throw new Error('Invalid manufacturer PDF page dimensions.');
  }
  const desiredW = widthMm / MM_PER_INCH * DEFAULT_DPI;
  const desiredH = heightMm / MM_PER_INCH * DEFAULT_DPI;
  const scale = Math.min(1, Math.sqrt(MAX_PIXELS / (desiredW * desiredH)), MAX_SIDE / desiredW, MAX_SIDE / desiredH);
  const widthPx = Math.max(1, Math.floor(desiredW * scale));
  const heightPx = Math.max(1, Math.floor(desiredH * scale));
  return { widthMm, heightMm, widthPx, heightPx, dpi: Math.min(widthPx / widthMm, heightPx / heightMm) * MM_PER_INCH };
}

export function manufacturerPdfFilename(value) {
  const safe = String(value || 'manufacturer-drawing').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '-').replace(/\.pdf$/i, '').trim().replace(/[. ]+$/g, '').slice(0, 180);
  return `${safe || 'manufacturer-drawing'}.pdf`;
}

function selfContainedSvg(svgString) {
  if (typeof svgString !== 'string' || !svgString.trim() || /<!DOCTYPE|<!ENTITY/i.test(svgString)) {
    throw new Error('The manufacturer drawing is not a valid self-contained SVG.');
  }
  const xml = new DOMParser().parseFromString(svgString, 'image/svg+xml');
  const root = xml.documentElement;
  if (root.localName !== 'svg' || root.namespaceURI !== 'http://www.w3.org/2000/svg' || xml.querySelector('parsererror')) {
    throw new Error('The manufacturer drawing could not be read. Please refresh and try again.');
  }
  const viewBox = (root.getAttribute('viewBox') || '').trim().split(/[\s,]+/).map(Number);
  if (viewBox.length !== 4 || !viewBox.every(Number.isFinite) || viewBox[2] <= 0 || viewBox[3] <= 0) {
    throw new Error('The manufacturer drawing is missing a valid viewBox.');
  }
  for (const node of root.querySelectorAll('*')) {
    if (['script', 'foreignobject', 'iframe', 'object', 'embed', 'audio', 'video'].includes(node.localName.toLowerCase())) {
      throw new Error('The manufacturer drawing contains unsupported embedded content.');
    }
  }
  for (const node of [root, ...root.querySelectorAll('*')]) {
    for (const attribute of node.attributes) {
      if (/^on/i.test(attribute.name)) throw new Error('The manufacturer drawing contains unsupported event handlers.');
      if (attribute.localName === 'href' && attribute.value && !/^#/.test(attribute.value) && !/^data:image\/(?:png|jpeg|webp|gif);base64,[a-z\d+/=\s]+$/i.test(attribute.value)) {
        throw new Error('PDF export requires all drawing images and references to be embedded.');
      }
    }
  }
  // Inspect actual styles and attributes, not project/quotation text that may
  // legitimately contain the literal word "url(...)".
  const styles = [...root.querySelectorAll('style')].map(node => node.textContent).join('\n');
  const attributes = [root, ...root.querySelectorAll('*')].flatMap(node => [...node.attributes].map(attribute => attribute.value)).join('\n');
  if (/@import\b/i.test(styles) || [...`${styles}\n${attributes}`.matchAll(/url\(\s*([^)]+)\)/gi)].some(match => !/^['"]?#[\w:.-]+['"]?$/.test(match[1].trim()))) {
    throw new Error('PDF export cannot use external drawing styles, fonts or images.');
  }
  return { root, size: manufacturerPdfRasterSize(dimensionInMm(root.getAttribute('width')), dimensionInMm(root.getAttribute('height'))) };
}

function loadSvgImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const timeout = setTimeout(() => finish(new Error('The manufacturer drawing took too long to render. Please try again.')), 30_000);
    function finish(error) {
      clearTimeout(timeout);
      image.onload = null;
      image.onerror = null;
      if (error) { image.src = ''; reject(error); } else resolve(image);
    }
    image.onload = () => image.naturalWidth > 0 && image.naturalHeight > 0 ? finish() : finish(new Error('The manufacturer drawing rendered empty.'));
    image.onerror = () => finish(new Error('The manufacturer drawing could not be rendered for PDF export.'));
    image.src = url;
  });
}

function canvasPng(canvas) {
  return new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob?.size ? resolve(blob) : reject(new Error('The browser could not encode the manufacturer PDF image.')), 'image/png');
  });
}

/** Export the complete SVG as exactly one page; dimensions come from its root. */
export async function exportManufacturerPdf(svgString, { filename = 'manufacturer-drawing.pdf', download = true } = {}) {
  if (typeof document === 'undefined' || typeof DOMParser === 'undefined') throw new Error('PDF export requires a browser.');
  const { root, size } = selfContainedSvg(svgString);
  const safeName = manufacturerPdfFilename(filename);
  await document.fonts?.ready;
  const { jsPDF } = await import('./vendor/jspdf.js');
  if (typeof jsPDF !== 'function') throw new Error('The PDF exporter could not be loaded. Please refresh and try again.');
  root.setAttribute('width', String(size.widthPx));
  root.setAttribute('height', String(size.heightPx));
  const svgUrl = URL.createObjectURL(new Blob([new XMLSerializer().serializeToString(root)], { type: 'image/svg+xml;charset=utf-8' }));
  const canvas = document.createElement('canvas');
  let image;
  try {
    image = await loadSvgImage(svgUrl);
    canvas.width = size.widthPx;
    canvas.height = size.heightPx;
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('The browser does not have enough memory to render the manufacturer PDF.');
    context.fillStyle = '#fff';
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const png = new Uint8Array(await (await canvasPng(canvas)).arrayBuffer());
    const pdf = new jsPDF({ orientation: size.widthMm >= size.heightMm ? 'landscape' : 'portrait', unit: 'mm', format: [size.widthMm, size.heightMm], compress: true, putOnlyUsedFonts: true });
    pdf.setProperties({ title: safeName.replace(/\.pdf$/i, ''), subject: 'Manufacturer review drawing - all views and schedules on one page', creator: 'Schneider Elevator Configurator' });
    pdf.addImage(png, 'PNG', 0, 0, size.widthMm, size.heightMm, undefined, 'FAST');
    if (pdf.getNumberOfPages() !== 1) throw new Error('The manufacturer export must contain exactly one page.');
    const blob = pdf.output('blob');
    if (!(blob instanceof Blob) || blob.size < 100) throw new Error('The manufacturer PDF could not be generated.');
    if (download) {
      const downloadUrl = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = downloadUrl;
      anchor.download = safeName;
      anchor.hidden = true;
      document.body.appendChild(anchor);
      try { anchor.click(); } finally {
        anchor.remove();
        // A short grace period lets browsers finish handing the Blob to downloads.
        setTimeout(() => URL.revokeObjectURL(downloadUrl), 60_000);
      }
    }
    return { blob, filename: safeName, ...size, pages: 1 };
  } finally {
    URL.revokeObjectURL(svgUrl);
    if (image) image.src = '';
    canvas.width = 1;
    canvas.height = 1;
  }
}
