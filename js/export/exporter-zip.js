import { getJSZip, renderPageToDataURL, slugify, download, formatPageLink } from './utils.js';

function uniqueFilename(slug, existing) {
  let name = slug + '.md';
  if (!existing.has(name)) return name;
  let i = 2;
  while (existing.has(`${slug}-${i}.md`)) i++;
  return `${slug}-${i}.md`;
}

export async function exportObsidianVault(session) {
  const { fileName, pdfDocument, notebookPages, onProgress } = session;
  const JSZip = await getJSZip();
  const zip = new JSZip();
  const title = (fileName || 'anotacoes').replace(/\.pdf$/i, '');
  const baseSlug = slugify(title);

  const pagesToRender = new Set();
  for (const page of notebookPages) {
    (page.linkedPdfPages || []).forEach(p => pagesToRender.add(p));
  }

  zip.file('.gitkeep', '');

  const pageList = [...pagesToRender].sort((a, b) => a - b);
  for (let i = 0; i < pageList.length; i++) {
    const pageNum = pageList[i];
    onProgress?.(Math.round((i / pageList.length) * 60) + 5, `Renderizando slide ${pageNum}...`);
    const dataURL = await renderPageToDataURL(pdfDocument, pageNum, 1.5);
    const base64 = dataURL.split(',')[1];
    zip.file(`attachments/slide-pag-${pageNum}.jpg`, base64, { base64: true });
  }

  onProgress?.(70, 'Criando arquivos de anotação...');
  const usedNames = new Set();
  const noteFiles = [];

  for (const page of notebookPages) {
    const noteName = page.name?.trim() || 'Sem título';
    const filename = uniqueFilename(slugify(noteName), usedNames);
    usedNames.add(filename);
    const pages = page.linkedPdfPages || [];
    const dateStr = page.createdAt ? page.createdAt.slice(0, 10) : '';

    let md = `---\n`;
    md += `tags: [anotacao, pdf]\n`;
    if (pages.length) md += `paginas-pdf: ${pages.join(', ')}\n`;
    if (dateStr) md += `criada-em: ${dateStr}\n`;
    md += `---\n\n# ${noteName}\n\n`;

    for (const p of pages) {
      md += `![[attachments/slide-pag-${p}.jpg]]\n`;
    }
    md += `\n${page.content || '_Sem conteúdo_'}\n`;

    zip.file(filename, md);
    noteFiles.push({ filename, noteName, pages });
  }

  // Índice/MOC do vault
  let index = `# ${title}\n\n## Folhas\n\n`;
  for (const nf of noteFiles) {
    index += `- [[${nf.filename.replace(/\.md$/, '')}|${nf.noteName}]] — ${formatPageLink(nf.pages, '')}\n`;
  }
  zip.file(`${baseSlug}.md`, index);

  onProgress?.(90, 'Gerando ZIP...');
  const blob = await zip.generateAsync({ type: 'blob' });
  onProgress?.(100, 'Finalizando...');
  download(`${baseSlug}-vault.zip`, blob, 'application/zip');
}