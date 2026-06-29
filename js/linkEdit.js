// Edição do vínculo inline
  function startEditLink() {
    if (currentNoteIndex < 0) return;
    pageLinkEdit.classList.remove('hidden');
    pageLinkLabel.classList.add('hidden');
    const nums = notebookPages[currentNoteIndex].linkedPdfPages || [];
    pageLinkInput.value = formatPageLink(nums).replace(/^Págs?\.\s*/, '').replace(/\s*do PDF$/, '');
    pageLinkInput.focus();
  }

  function saveLink() {
    if (currentNoteIndex < 0) return;
    const nums = parsePageLink(pageLinkInput.value).filter(n => n >= 1 && n <= totalPages);
    notebookPages[currentNoteIndex].linkedPdfPages = nums;
    notebookPages[currentNoteIndex].updatedAt = new Date().toISOString();
    pageLinkLabel.textContent = formatPageLink(nums);
    pageLinkEdit.classList.add('hidden');
    pageLinkLabel.classList.remove('hidden');
    saveSession();
    renderPages();
    focusEditor();
  }

  function cancelLink() {
    pageLinkEdit.classList.add('hidden');
    pageLinkLabel.classList.remove('hidden');
    focusEditor();
  }

  pageHeader.addEventListener('click', e => {
    if (!pageLinkEdit.classList.contains('hidden')) return;
    startEditLink();
  });
  pageLinkInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); saveLink(); }
    if (e.key === 'Escape') cancelLink();
  });
  pageLinkInput.addEventListener('blur', () => saveLink());
