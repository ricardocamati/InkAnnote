// Restauração de sessão
  function askRestore(session) {
    restoreBanner.classList.remove('hidden');
    restoreYes.addEventListener('click', () => {
      notebookPages = session.notebookPages || [];
      currentNoteIndex = session.lastNotebookIndex || 0;
      zoom = session.zoom || 1;
      zoomSelect.value = zoom;
      currentPageStart = (session.lastPdfPages && session.lastPdfPages[0]) || 1;
      restoreBanner.classList.add('hidden');
      if (pdfDocument) {
        renderPages();
        renderNotebook();
      }
    });
    restoreNo.addEventListener('click', () => {
      clearSession();
      restoreBanner.classList.add('hidden');
    });
  }
