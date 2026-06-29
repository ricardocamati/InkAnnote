// js/init.js — Inicialização da aplicação
// Inicialização
console.log('[PDFNotes] DOM carregado, elementos principais:', !!uploadScreen, !!workspaceScreen, !!pdfInput);
uploadScreen.classList.remove('hidden');
workspaceScreen.classList.add('hidden');

const saved = loadSession();
if (saved && saved.notebookPages && saved.notebookPages.length) {
  askRestore(saved);
}

window.addEventListener('resize', () => {
  resizeDrawingOverlay();
  if (pdfDocument) renderPages();
});

// Re-renderiza PDF quando o container ganhar dimensões reais
// (evita páginas microscópicas no primeiro carregamento)
if (pdfContainer) {
  const resizeObserver = new ResizeObserver(entries => {
    if (pdfDocument && entries[0].contentRect.width > 0 && entries[0].contentRect.height > 0) {
      renderPages();
    }
  });
  resizeObserver.observe(pdfContainer);
}

console.log('[PDFNotes] App pronto');
