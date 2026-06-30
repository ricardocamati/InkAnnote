import { download, slugify, formatPageLink, markdownToPlain } from './utils.js';

function markdownToNotion(md) {
  // Notion importa MD como blocos; converte > quote para callout simples
  let html = md;
  html = html.replace(/\n/g, '\n');
  html = html.replace(/^\u003e\s*(.+)$/gm, (_, content) => `\n\n📎 *${content.trim()}*\n\n`);
  return html;
}

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

    let content = page.content || '_Sem conteúdo_';
    if (mode === 'notion') {
      content = markdownToNotion(content);
    } else if (mode === 'plain') {
      content = markdownToPlain(content, { keepUrls: true });
    }

    if (mode === 'obsidian') {
      const pages = page.linkedPdfPages || [];
      for (const p of pages) {
        md += `![[slide-pag-${p}.jpg]]\n`;
      }
      md += '\n';
    }

    md += `${content}\n\n`;
    const created = page.createdAt ? new Date(page.createdAt) : null;
    md += `_Criada em: ${created ? created.toLocaleString('pt-BR') : '—'}_\n\n`;
  }

  onProgress?.(98, 'Gerando arquivo...');
  const filename = slugify(title) + '-anotacoes.md';
  download(filename, md, 'text/markdown');
  onProgress?.(100, 'Concluído');
}