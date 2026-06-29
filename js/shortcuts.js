// js/shortcuts.js — Atalhos de teclado
document.addEventListener('keydown', e => {
  if (document.activeElement === noteEditor || document.activeElement === pageLinkInput) return;

  const alt = e.altKey;
  const ctrl = e.ctrlKey || e.metaKey;

  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    if (alt) {
      setNoteIndex(currentNoteIndex - 1);
      const pages = notebookPages[currentNoteIndex]?.linkedPdfPages;
      if (pages && pages.length) goToPdfPage(Math.min(...pages));
    } else changePage(-1);
  }
  if (e.key === 'ArrowRight') {
    e.preventDefault();
    if (alt) {
      setNoteIndex(currentNoteIndex + 1);
      const pages = notebookPages[currentNoteIndex]?.linkedPdfPages;
      if (pages && pages.length) goToPdfPage(Math.min(...pages));
    } else changePage(1);
  }
  if (alt && e.key.toLowerCase() === 'n') {
    e.preventDefault();
    createNotePage();
  }
  if (ctrl && (e.key === '+' || e.key === '=')) {
    e.preventDefault();
    zoomIn.click();
  }
  if (ctrl && e.key === '-') {
    e.preventDefault();
    zoomOut.click();
  }
  if (ctrl && e.key.toLowerCase() === 'e') {
    e.preventDefault();
    exportAsMarkdown();
  }
  if (ctrl && e.key.toLowerCase() === 'p') {
    e.preventDefault();
    togglePreview();
  }
  if (!ctrl && !alt && e.key.toLowerCase() === 'v') { activeTool = 'select'; updateToolButtons(); }
  if (!ctrl && !alt && e.key.toLowerCase() === 'h') { activeTool = 'highlight'; updateToolButtons(); }
  if (!ctrl && !alt && e.key.toLowerCase() === 'p') { activeTool = 'pen'; updateToolButtons(); }
  if (!ctrl && !alt && e.key.toLowerCase() === 'e') { activeTool = 'eraser'; updateToolButtons(); }
});

