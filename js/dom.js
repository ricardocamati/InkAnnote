// js/dom.js — Referências do DOM
const uploadScreen = document.getElementById('uploadScreen');
const workspaceScreen = document.getElementById('workspaceScreen');
const dropZone = document.getElementById('dropZone');
const openFileBtn = document.getElementById('openFileBtn');
const pdfInput = document.getElementById('pdfInput');
const uploadError = document.getElementById('uploadError');
const newFileBtn = document.getElementById('newFileBtn');
const fileNameEl = document.getElementById('fileName');
const pdfLoading = document.getElementById('pdfLoading');
const pdfContainer = document.getElementById('pdfContainer');
const pdfCanvasLeft = document.getElementById('pdfCanvasLeft');
const pdfCanvasRight = document.getElementById('pdfCanvasRight');
const drawingOverlay = document.getElementById('drawingOverlay');
const pdfPrev = document.getElementById('pdfPrev');
const pdfNext = document.getElementById('pdfNext');
const pdfPagesLabel = document.getElementById('pdfPagesLabel');
const pdfTotalPages = document.getElementById('pdfTotalPages');
const linkedIndicator = document.getElementById('linkedIndicator');
const notebookEmpty = document.getElementById('notebookEmpty');
const notebookPage = document.getElementById('notebookPage');
const pageHeader = document.getElementById('pageHeader');
const pageLinkLabel = document.getElementById('pageLinkLabel');
const pageLinkEdit = document.getElementById('pageLinkEdit');
const pageLinkInput = document.getElementById('pageLinkInput');
const noteEditor = document.getElementById('noteEditor');
const notePreview = document.getElementById('notePreview');
const previewToggle = document.getElementById('previewToggle');
const wordCount = document.getElementById('wordCount');
const saveStatus = document.getElementById('saveStatus');
const notePrev = document.getElementById('notePrev');
const noteNext = document.getElementById('noteNext');
const noteIndex = document.getElementById('noteIndex');
const noteTotal = document.getElementById('noteTotal');
const newNotePage = document.getElementById('newNotePage');
const createFirstPage = document.getElementById('createFirstPage');
const zoomSelect = document.getElementById('zoomSelect');
const zoomIn = document.getElementById('zoomIn');
const zoomOut = document.getElementById('zoomOut');
const colorPicker = document.getElementById('colorPicker');
const exportBtn = document.getElementById('exportBtn');
const exportMenu = document.getElementById('exportMenu');
const exportMarkdown = document.getElementById('exportMarkdown');
const exportJSON = document.getElementById('exportJSON');
const themeToggle = document.getElementById('themeToggle');
const themeIconMoon = document.getElementById('themeIconMoon');
const themeIconSun = document.getElementById('themeIconSun');
const workspace = document.getElementById('workspace');
const resizer = document.getElementById('resizer');
const restoreBanner = document.getElementById('restoreBanner');
const restoreYes = document.getElementById('restoreYes');
const restoreNo = document.getElementById('restoreNo');
const toolBtns = document.querySelectorAll('.tool-btn');

export {
  uploadScreen,
  workspaceScreen,
  dropZone,
  openFileBtn,
  pdfInput,
  uploadError,
  newFileBtn,
  fileNameEl,
  pdfLoading,
  pdfContainer,
  pdfCanvasLeft,
  pdfCanvasRight,
  drawingOverlay,
  pdfPrev,
  pdfNext,
  pdfPagesLabel,
  pdfTotalPages,
  linkedIndicator,
  notebookEmpty,
  notebookPage,
  pageHeader,
  pageLinkLabel,
  pageLinkEdit,
  pageLinkInput,
  noteEditor,
  notePreview,
  previewToggle,
  wordCount,
  saveStatus,
  notePrev,
  noteNext,
  noteIndex,
  noteTotal,
  newNotePage,
  createFirstPage,
  zoomSelect,
  zoomIn,
  zoomOut,
  colorPicker,
  exportBtn,
  exportMenu,
  exportMarkdown,
  exportJSON,
  themeToggle,
  themeIconMoon,
  themeIconSun,
  workspace,
  resizer,
  restoreBanner,
  restoreYes,
  restoreNo,
  toolBtns
};

// Expõe refs globalmente para módulos legados
window.uploadScreen = uploadScreen;
window.workspaceScreen = workspaceScreen;
window.dropZone = dropZone;
window.openFileBtn = openFileBtn;
window.pdfInput = pdfInput;
window.uploadError = uploadError;
window.newFileBtn = newFileBtn;
window.fileNameEl = fileNameEl;
window.pdfLoading = pdfLoading;
window.pdfContainer = pdfContainer;
window.pdfCanvasLeft = pdfCanvasLeft;
window.pdfCanvasRight = pdfCanvasRight;
window.drawingOverlay = drawingOverlay;
window.pdfPrev = pdfPrev;
window.pdfNext = pdfNext;
window.pdfPagesLabel = pdfPagesLabel;
window.pdfTotalPages = pdfTotalPages;
window.linkedIndicator = linkedIndicator;
window.notebookEmpty = notebookEmpty;
window.notebookPage = notebookPage;
window.pageHeader = pageHeader;
window.pageLinkLabel = pageLinkLabel;
window.pageLinkEdit = pageLinkEdit;
window.pageLinkInput = pageLinkInput;
window.noteEditor = noteEditor;
window.notePreview = notePreview;
window.previewToggle = previewToggle;
window.wordCount = wordCount;
window.saveStatus = saveStatus;
window.notePrev = notePrev;
window.noteNext = noteNext;
window.noteIndex = noteIndex;
window.noteTotal = noteTotal;
window.newNotePage = newNotePage;
window.createFirstPage = createFirstPage;
window.zoomSelect = zoomSelect;
window.zoomIn = zoomIn;
window.zoomOut = zoomOut;
window.colorPicker = colorPicker;
window.exportBtn = exportBtn;
window.exportMenu = exportMenu;
window.exportMarkdown = exportMarkdown;
window.exportJSON = exportJSON;
window.themeToggle = themeToggle;
window.themeIconMoon = themeIconMoon;
window.themeIconSun = themeIconSun;
window.workspace = workspace;
window.resizer = resizer;
window.restoreBanner = restoreBanner;
window.restoreYes = restoreYes;
window.restoreNo = restoreNo;
window.toolBtns = toolBtns;
