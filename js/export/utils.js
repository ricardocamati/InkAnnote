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
  const mod = await import('https://esm.sh/jszip@3.10.1');
  return (window._JSZip = mod.default);
}

export async function getJsPDF() {
  if (window._jsPDF) return window._jsPDF;
  const mod = await import('https://esm.sh/jspdf@2.5.1');
  return (window._jsPDF = mod.jsPDF);
}