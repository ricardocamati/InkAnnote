// Exportação
  function download(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function exportAsMarkdown() {
    const title = pdfFile ? pdfFile.name : 'anotacoes';
    let md = `# Anotações — ${title}\n\n`;
    notebookPages.forEach((p, i) => {
      md += `---\n\n`;
      md += `## Folha ${i + 1} — ${formatPageLink(p.linkedPdfPages).replace(/ do PDF$/, '')}\n\n`;
      md += `_Criada em ${new Date(p.createdAt).toLocaleString('pt-BR')}_\n\n`;
      md += `${p.content || ''}\n\n`;
    });
    download(title.replace(/\.pdf$/i, '') + '-anotacoes.md', md, 'text/markdown');
  }

  function exportAsJSON() {
    const session = {
      fileName: pdfFile ? pdfFile.name : null,
      exportedAt: new Date().toISOString(),
      notebookPages,
    };
    download((pdfFile ? pdfFile.name.replace(/\.pdf$/i, '') : 'anotacoes') + '.json',
      JSON.stringify(session, null, 2), 'application/json');
  }

  exportBtn.addEventListener('click', () => exportMenu.classList.toggle('hidden'));
  document.addEventListener('click', e => {
    if (!exportBtn.contains(e.target) && !exportMenu.contains(e.target)) exportMenu.classList.add('hidden');
  });
  exportMarkdown.addEventListener('click', () => { exportAsMarkdown(); exportMenu.classList.add('hidden'); });
  exportJSON.addEventListener('click', () => { exportAsJSON(); exportMenu.classList.add('hidden'); });
