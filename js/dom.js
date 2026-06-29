(() => {
  'use strict';

  try {
    console.log('[PDFNotes] Iniciando app...');

    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

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
  const toolBtns = document.querySelectorAll('.tool-btn');
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
