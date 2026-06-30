export async function renderPageToDataURL(pdfDocument, pageNum, scale = 1.5) {
  const page = await pdfDocument.getPage(pageNum);
  const vp = page.getViewport({ scale });
  const oc = new OffscreenCanvas(Math.floor(vp.width), Math.floor(vp.height));
  const ctx = oc.getContext('2d');
  await page.render({ canvasContext: ctx, viewport: vp }).promise;
  const blob = await oc.convertToBlob({ type: 'image/png' });
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}

export function download(filename, content, mimeType) {
  const blob = content instanceof Blob
    ? content
    : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function slugify(str) {
  return str.toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim().replace(/\s+/g, '-');
}

export function formatPageLink(nums) {
  if (!nums || nums.length === 0) return 'Sem vínculo';
  if (nums.length === 1) return `Pág. ${nums[0]} do PDF`;
  const sorted = [...nums].sort((a, b) => a - b);
  const ranges = [];
  let start = sorted[0], prev = sorted[0];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i] === prev + 1) { prev = sorted[i]; continue; }
    ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
    start = prev = sorted[i];
  }
  ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
  return `Págs. ${ranges.join(', ')} do PDF`;
}

export async function getJSZip() {
  if (window._JSZip) return window._JSZip;
  if (window.JSZip) return (window._JSZip = window.JSZip);
  await loadScript('/lib/jszip.min.js', '_jszip_load');
  if (!window.JSZip) throw new Error('JSZip não foi carregado corretamente');
  return (window._JSZip = window.JSZip);
}

export async function getJsPDF() {
  if (window._jsPDF) return window._jsPDF;
  if (window.jspdf && window.jspdf.jsPDF) return (window._jsPDF = window.jspdf.jsPDF);
  await loadScript('/lib/jspdf.umd.min.js', '_jspdf_load');
  const ctor = window.jspdf?.jsPDF || window.jsPDF;
  if (!ctor) throw new Error('jsPDF não foi carregado corretamente');
  return (window._jsPDF = ctor);
}

const scriptPromises = {};

function loadScript(src, key) {
  if (scriptPromises[key]) return scriptPromises[key];
  scriptPromises[key] = new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.onload = resolve;
    s.onerror = () => reject(new Error('Falha ao carregar ' + src));
    document.head.appendChild(s);
  });
  return scriptPromises[key];
}
