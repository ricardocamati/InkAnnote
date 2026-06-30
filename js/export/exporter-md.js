import { download, slugify, formatPageLink } from './utils.js';

export async function exportMarkdown(session, { mode } = {}) {
  const { fileName, notebookPages, onProgress } = session;
  const title = (fileName || 'anotacoes').replace(/\.pdf$/i, '');
  let md = `# ${title} — Anotações\n\n`;

  for (let i = 0; i < notebookPages.length; i++) {
    const page = notebookPages[i];
    onProgress?.(Math.round((i / notebookPages.length) * 90) + 5, `Processando folha ${i + 1}...`);

    md += `---\n\n`;
    md += `## ${page.name?.trim() || 'Sem título'}\n\n`;
    md += `> 📎 ${formatPageLink(page.linkedPdfPages)}\n\n`;

    if (mode === 'obsidian') {
      const pages = page.linkedPdfPages || [];
      for (const p of pages) {
        md += `![[slide-pag-${p}.png]]\n`;
      }
      md += '\n';
    }

    md += `${page.content || '_Sem conteúdo_'}\n\n`;
    md += `_Criada em: ${page.createdAt ? new Date(page.createdAt).toLocaleString('pt-BR') : '—'}_\n\n`;
  }

  onProgress?.(98, 'Gerando arquivo...');
  const filename = slugify(title) + '-anotacoes.md';
  download(filename, md, 'text/markdown');
}