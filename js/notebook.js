// Caderno
  function setNoteIndex(idx, focus = true) {
    const target = normalizeNoteIndex(idx);
    if (target === currentNoteIndex) {
      if (focus) focusEditor();
      return;
    }
    notebookPage.classList.add('transitioning');
    setTimeout(() => {
      currentNoteIndex = target;
      renderNotebook();
      notebookPage.classList.remove('transitioning');
      if (focus) focusEditor();
    }, 150);
  }

  function renderNotebook() {
    if (notebookPages.length === 0) {
      notebookEmpty.classList.remove('hidden');
      notebookPage.classList.add('hidden');
      noteIndex.textContent = 0;
      noteTotal.textContent = 0;
      return;
    }
    notebookEmpty.classList.add('hidden');
    notebookPage.classList.remove('hidden');
    const page = notebookPages[currentNoteIndex];
    noteEditor.value = page.content || '';
    pageLinkLabel.textContent = formatPageLink(page.linkedPdfPages);
    noteIndex.textContent = currentNoteIndex + 1;
    noteTotal.textContent = notebookPages.length;
    updateWordCount();
    if (previewMode) updatePreview();
    setSaveStatus(`Salvo às ${formatDate()}`);
  }

  function createNotePage(linkedPages = null) {
    if (linkedPages === null) {
      linkedPages = [currentPageStart, currentPageStart + 1].filter(p => p <= totalPages);
    }
    const page = {
      id: uuid(),
      linkedPdfPages: linkedPages,
      content: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    notebookPages.push(page);
    setNoteIndex(notebookPages.length - 1);
    saveSession();
  }

  newNotePage.addEventListener('click', () => createNotePage());
  createFirstPage.addEventListener('click', () => createNotePage());

  notePrev.addEventListener('click', () => {
    setNoteIndex(currentNoteIndex - 1);
    const pages = notebookPages[currentNoteIndex]?.linkedPdfPages;
    if (pages && pages.length) goToPdfPage(Math.min(...pages));
  });
  noteNext.addEventListener('click', () => {
    setNoteIndex(currentNoteIndex + 1);
    const pages = notebookPages[currentNoteIndex]?.linkedPdfPages;
    if (pages && pages.length) goToPdfPage(Math.min(...pages));
  });

  function maybeCreateDefaultPage() {
    if (notebookPages.length === 0) {
      createNotePage();
    } else {
      focusEditor();
    }
  }

  noteEditor.addEventListener('input', scheduleSave);

  function goToPdfPage(pageNum) {
    if (pageNum >= 1 && pageNum <= totalPages) {
      currentPageStart = pageNum % 2 === 0 ? pageNum - 1 : pageNum;
      renderPages();
      saveSession();
    }
  }
