// js/persist.js — Persistência
export function saveSession() {
  const session = {
    fileName: pdfFile ? pdfFile.name : null,
    lastPdfPages: [currentPageStart, currentPageStart + 1],
    lastNotebookIndex: currentNoteIndex,
    savedAt: new Date().toISOString(),
    notebookPages,
    zoom,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
  setSaveStatus(`Salvo às ${formatDate()}`);
}

export function scheduleSave() {
  setSaveStatus('Salvando...');
  clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    if (currentNoteIndex >= 0) {
      notebookPages[currentNoteIndex].content = noteEditor.value;
      notebookPages[currentNoteIndex].updatedAt = new Date().toISOString();
    }
    saveSession();
    updateWordCount();
  }, 400);
}

export function loadSession() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

export function clearSession() {
  localStorage.removeItem(STORAGE_KEY);
}

// Expõe globalmente
window.saveSession = saveSession;
window.scheduleSave = scheduleSave;
window.loadSession = loadSession;
window.clearSession = clearSession;
