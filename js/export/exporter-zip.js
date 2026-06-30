import { getJSZip } from './utils.js';
import { renderPageToDataURL, slugify, download } from './utils.js';

export async function exportObsidianVault(session) {
  const { fileName, pdfDocument, notebookPages, onProgress } = session;
  const JSZip = await getJSZip();
  const zip = new JSZip();
  const title = (fileName || 'anotacoes').replace(/\.pdf$/i, '');

  const pagesToRender = new Set();
  for (const page of notebookPages) {
    (page.linkedPdfPages || []).forEach(p => pagesToRender.add(p));
  }

  const pageList = [...pagesToRender].sort((a, b) => a - b);
  for (let i = 0; i < pageList.length; i++) {
    const pageNum = pageList[i];
    onProgress?.(Math.round((i / pageList.length) * 70) + 5, `Renderizando slide ${pageNum}...`);
    const dataURL = await renderPageToDataURL(pdfDocument, pageNum, 1.5);
    const base64 = dataURL.split(',')[1];
    zip.file(`attachments/slide-pag-${pageNum}.png`, base64, { base64: true });
  }

  onProgress?.(75, 'Criando arquivos de anotação...');
  for (const page of notebookPages) {
    const noteName = page.name?.trim() || 'Sem título';
    const filename = slugify(noteName) + '.md';
    const pages = page.linkedPdfPages || [];
    const dateStr = page.createdAt ? page.createdAt.slice(0, 10) : '';

    let md = `---\ntags: [anotacao, pdf]\n`;
    if (pages.length) md += `paginas-pdf: ${pages.join(', ')}\n`;
    if (dateStr) md += `criada-em: ${dateStr}\n`;
    md += `---\n\n# ${noteName}\n\n`;

    for (const p of pages) {
      md += `![[attachments/slide-pag-${p}.png]]\n`;
    }
    md += `\n${page.content || '_Sem conteúdo_'}\n`;

    zip.file(filename, md);
  }

  onProgress?.(90, 'Gerando ZIP...');
  const blob = await zip.generateAsync({ type: 'blob' });
  onProgress?.(98, 'Finalizando...');
  download(`${slugify(title)}-vault.zip`, blob, 'application/zip');
}