// js/state.js — Estado global
export let pdfDocument = null;
export let pdfFile = null;
export let currentPageStart = 1;
export let zoom = 1;
export let totalPages = 0;
export let notebookPages = [];
export let currentNoteIndex = -1;
export let activeTool = 'select';
export let toolColor = '#FFD700';
export let isDrawing = false;
export let lastPoint = null;
export let saveTimeout = null;
export let previewMode = false;
export let cropCache = new Map();
export const STORAGE_KEY = 'pdfnotes_session';
export const THEME_KEY = 'pdfnotes_theme';
export const SPLIT_KEY = 'pdfnotes_split';

// Expõe estado globalmente
window.pdfDocument = pdfDocument;
window.pdfFile = pdfFile;
window.currentPageStart = currentPageStart;
window.zoom = zoom;
window.totalPages = totalPages;
window.notebookPages = notebookPages;
window.currentNoteIndex = currentNoteIndex;
window.activeTool = activeTool;
window.toolColor = toolColor;
window.isDrawing = isDrawing;
window.lastPoint = lastPoint;
window.saveTimeout = saveTimeout;
window.previewMode = previewMode;
window.cropCache = cropCache;
window.STORAGE_KEY = STORAGE_KEY;
window.THEME_KEY = THEME_KEY;
window.SPLIT_KEY = SPLIT_KEY;
