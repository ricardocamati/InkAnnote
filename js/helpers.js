// Helpers
  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      const v = c === 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  function formatDate(d = new Date()) {
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  }

  function showError(msg) {
    uploadError.textContent = msg;
    uploadError.classList.remove('hidden');
    setTimeout(() => uploadError.classList.add('hidden'), 4000);
  }

  function setSaveStatus(status) {
    saveStatus.textContent = status;
  }

  function updateWordCount() {
    const text = noteEditor.value.trim();
    const count = text ? text.split(/\s+/).length : 0;
    wordCount.textContent = `${count} palavra${count !== 1 ? 's' : ''}`;
  }

  function hasLinkedPage(pageNum) {
    return notebookPages.some(p => (p.linkedPdfPages || []).includes(pageNum));
  }

  function getLinkedNoteIndex(pageNum) {
    return notebookPages.findIndex(p => (p.linkedPdfPages || []).includes(pageNum));
  }

  function parsePageLink(value) {
    if (!value || !value.trim()) return [];
    const parts = value.split(',').map(s => s.trim()).filter(Boolean);
    const nums = new Set();
    for (const part of parts) {
      if (part.includes('-')) {
        const [a, b] = part.split('-').map(n => parseInt(n, 10));
        if (!isNaN(a) && !isNaN(b)) {
          for (let i = Math.min(a, b); i <= Math.max(a, b); i++) nums.add(i);
        }
      } else {
        const n = parseInt(part, 10);
        if (!isNaN(n)) nums.add(n);
      }
    }
    return Array.from(nums).sort((a, b) => a - b);
  }

  function formatPageLink(nums) {
    if (!nums || nums.length === 0) return 'Sem vínculo';
    if (nums.length === 1) return `Pág. ${nums[0]} do PDF`;
    const sorted = [...nums].sort((a, b) => a - b);
    const ranges = [];
    let start = sorted[0], prev = sorted[0];
    for (let i = 1; i < sorted.length; i++) {
      if (sorted[i] === prev + 1) { prev = sorted[i]; continue; }
      ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
      start = prev = sorted[i];
    }
    ranges.push(start === prev ? `${start}` : `${start}-${prev}`);
    return `Págs. ${ranges.join(', ')} do PDF`;
  }

  function normalizeNoteIndex(idx) {
    if (notebookPages.length === 0) return -1;
    if (idx < 0) return 0;
    if (idx >= notebookPages.length) return notebookPages.length - 1;
    return idx;
  }

  function focusEditor() {
    if (previewMode) {
      setTimeout(() => previewToggle.focus(), 50);
      return;
    }
    if (currentNoteIndex < 0) return;
    setTimeout(() => noteEditor.focus(), 50);
  }
