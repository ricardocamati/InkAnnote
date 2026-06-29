// js/main.js — Ponto de entrada modular do PDFNotes

console.log('[PDFNotes] Iniciando app modular...');

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

import { dom } from './dom.js';
import { state, STORAGE_KEY, THEME_KEY, SPLIT_KEY } from './state.js';
import * as helpers from './helpers.js';
import { initTheme, toggleTheme } from './theme.js';
import { saveSession, scheduleSave, loadSession, clearSession } from './persist.js';
import { initUpload, handleFile } from './upload.js';
import { openPdf, renderPages, changePage, setZoom } from './pdf.js';
import { setNoteIndex, renderNotebook, createNotePage, normalizeNoteIndex, focusEditor, goToPdfPage } from './notebook.js';
import { initLinkEdit } from './linkEdit.js';
import { togglePreview, updatePreview } from './preview.js';
import { initToolbar, updateToolButtons } from './toolbar.js';
import { initDrawing } from './drawing.js';
import { exportAsMarkdown, exportAsJSON } from './export.js';
import { initResizer } from './resizer.js';
import { initShortcuts } from './shortcuts.js';
import { askRestore } from './restore.js';

// Expõe dependências compartilhadas via namespace global
window.PDFNotes = {
  dom, state, helpers,
  saveSession, scheduleSave, loadSession, clearSession,
  openPdf, renderPages, changePage, setZoom,
  setNoteIndex, renderNotebook, createNotePage, normalizeNoteIndex, focusEditor, goToPdfPage,
  togglePreview, updatePreview,
  updateToolButtons,
  exportAsMarkdown, exportAsJSON,
  handleFile
};

function init() {
  try {
    initTheme();
    initUpload();
    initLinkEdit();
    initToolbar();
    initDrawing();
    initResizer();
    initShortcuts();

    dom.uploadScreen.classList.remove('hidden');
    dom.workspaceScreen.classList.add('hidden');

    const saved = loadSession();
    if (saved && saved.notebookPages && saved.notebookPages.length) {
      askRestore(saved);
    }

    console.log('[PDFNotes] App pronto');
  } catch (err) {
    console.error('[PDFNotes] Erro fatal na inicialização:', err);
  }
}

init();
