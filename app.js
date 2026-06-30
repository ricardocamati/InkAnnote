(() => {
  'use strict';

  // ============================================================
  // Constantes / Magic numbers
  // ============================================================
  const DEBOUNCE_RENDER_MS = 200;
  const SAVE_TIMEOUT_MS = 400;
  const NOTE_TRANSITION_MS = 150;
  const OVERLAY_ERASER_WIDTH = 16;
  const OVERLAY_HIGHLIGHT_WIDTH = 18;
  const OVERLAY_PEN_WIDTH = 3;
  const OVERLAY_HIGHLIGHT_ALPHA = '88';
  const MIN_PANEL_PX = 320;
  const RESIZER_WIDTH_PCT = 0.6;
  const MAX_DPR = 3;
  const CROP_OFFSCREEN_SCALE = 2;
  const CROP_THRESHOLD = 240;
  const CROP_MARGIN = 0.97;

  const STORAGE_KEY = 'pdfnotes_session';
  const THEME_KEY = 'pdfnotes_theme';
  const SPLIT_KEY = 'pdfnotes_split';

  const TOOLS = {
    SELECT: 'select',
    HIGHLIGHT: 'highlight',
    PEN: 'pen',
    ERASER: 'eraser',
  };

  // ============================================================
  // Estado
  // ============================================================
  let pdfDocument = null;
  let pdfFile = null;
  let currentPageStart = 1;
  let totalPages = 0;
  let notebookPages = [];
  let currentNoteIndex = -1;
  let activeTool = TOOLS.SELECT;
  let toolColor = '#FFD700';
  let isDrawing = false;
  let lastPoint = null;
  let saveTimeout = null;
  let renderTimeout = null;
  let renderToken = 0;
  let lastRenderedPair = null;
  let milkdownEditor = null;
  let milkdownReady = false;
  let getMarkdownFn = null;
  let replaceAllFn = null;

  // PDF.js worker
  pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

  // ============================================================
  // DOM refs
  // ============================================================
  const $ = id => document.getElementById(id);

  const uploadScreen = $('uploadScreen');
  const workspaceScreen = $('workspaceScreen');
  const dropZone = $('dropZone');
  const openFileBtn = $('openFileBtn');
  const pdfInput = $('pdfInput');
  const uploadError = $('uploadError');
  const newFileBtn = $('newFileBtn');
  const fileNameEl = $('fileName');
  const pdfLoading = $('pdfLoading');
  const pdfContainer = $('pdfContainer');
  const pdfCanvas = $('pdfCanvasLeft');
  const drawingOverlay = $('drawingOverlay');
  const pdfPrev = $('pdfPrev');
  const pdfNext = $('pdfNext');
  const pdfPagesLabel = $('pdfPagesLabel');
  const pdfTotalPages = $('pdfTotalPages');
  const linkedIndicator = $('linkedIndicator');
  const notebookEmpty = $('notebookEmpty');
  const notebookPage = $('notebookPage');
  const pageHeader = $('pageHeader');
  const pageLinkLabel = $('pageLinkLabel');
  const pageLinkEdit = $('pageLinkEdit');
  const pageLinkInput = $('pageLinkInput');
  const pageNameDisplay = $('pageNameDisplay');
  const pageNameInput = $('pageNameInput');
  const noteEditor = $('noteEditor');
  const wordCount = $('wordCount');
  const saveStatus = $('saveStatus');
  const newNotePage = $('newNotePage');
  const createFirstPage = $('createFirstPage');
  const notesSidebar = $('notesSidebar');
  const sidebarToggle = $('sidebarToggle');
  const notesList = $('notesList');
  const toolBtns = document.querySelectorAll('.tool-btn');
  const colorPicker = $('colorPicker');
  const exportBtn = $('exportBtn');
  const exportMenu = $('exportMenu');
  const exportMarkdown = $('exportMarkdown');
  const exportJSON = $('exportJSON');
  const themeToggle = $('themeToggle');
  const themeIconMoon = $('themeIconMoon');
  const themeIconSun = $('themeIconSun');
  const workspace = $('workspace');
  const resizer = $('resizer');
  const restoreBanner = $('restoreBanner');
  const restoreYes = $('restoreYes');
  const restoreNo = $('restoreNo');

  const overlayCtx = drawingOverlay.getContext('2d');

  // ============================================================
  // Helpers
  // ============================================================
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
    const text = (milkdownReady ? getEditorMarkdown() : '').trim();
    const count = text ? text.split(/\s+/).length : 0;
    wordCount.textContent = `${count} palavra${count !== 1 ? 's' : ''}`;
  }

  function hasLinkedPage(pageNum) {
    return notebookPages.some(p => (p.linkedPdfPages || []).includes(pageNum));
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

  function suggestNoteName(linkedPages) {
    if (!linkedPages || linkedPages.length === 0) return 'Nova folha';
    const label = formatPageLink(linkedPages).replace(/ do PDF$/, '');
    const existing = notebookPages.filter(p => p.name && p.name.startsWith(label));
    return existing.length > 0 ? `${label} (${existing.length + 1})` : label;
  }

  function normalizeNoteIndex(idx) {
    if (notebookPages.length === 0) return -1;
    if (idx < 0) return 0;
    if (idx >= notebookPages.length) return notebookPages.length - 1;
    return idx;
  }

  function focusEditor() {
    if (currentNoteIndex < 0) return;
    setTimeout(() => {
      const pm = noteEditor.querySelector('.ProseMirror');
      if (pm) pm.focus();
      else noteEditor.focus();
    }, 50);
  }

  function pairKey(start) {
    return `${start},${start + 1}`;
  }

  function minOf(arr) {
    return arr.reduce((a, b) => (b < a ? b : a), arr[0]);
  }

  function debounce(fn, ms) {
    let t = null;
    return (...args) => {
      clearTimeout(t);
      t = setTimeout(() => fn(...args), ms);
    };
  }

  // ============================================================
  // Tema
  // ============================================================
  function setTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(THEME_KEY, theme);
    themeIconMoon.classList.toggle('hidden', theme === 'dark');
    themeIconSun.classList.toggle('hidden', theme === 'light');
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme') || 'light';
    setTheme(current === 'light' ? 'dark' : 'light');
  }

  const savedTheme = localStorage.getItem(THEME_KEY);
  setTheme(savedTheme === 'dark' || savedTheme === 'light' ? savedTheme : 'light');
  themeToggle.addEventListener('click', toggleTheme);

  // ============================================================
  // Persistência
  // ============================================================
  function saveSession() {
    const session = {
      fileName: pdfFile ? pdfFile.name : null,
      lastPdfPages: [currentPageStart, currentPageStart + 1],
      lastNotebookIndex: currentNoteIndex,
      savedAt: new Date().toISOString(),
      notebookPages,
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(session));
    setSaveStatus(`Salvo às ${formatDate()}`);
  }

  function getEditorMarkdown() {
    if (!milkdownReady || !milkdownEditor || !getMarkdownFn) return '';
    try {
      return milkdownEditor.action(getMarkdownFn()) || '';
    } catch {
      return '';
    }
  }

  function setEditorMarkdown(md) {
    if (!milkdownReady || !milkdownEditor || !replaceAllFn) return;
    try {
      milkdownEditor.action(replaceAllFn(md || ''));
    } catch { /* ignore */ }
  }

  function scheduleSave() {
    setSaveStatus('Salvando...');
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      if (currentNoteIndex >= 0) {
        notebookPages[currentNoteIndex].content = getEditorMarkdown();
        notebookPages[currentNoteIndex].updatedAt = new Date().toISOString();
      }
      saveSession();
      updateWordCount();
    }, SAVE_TIMEOUT_MS);
  }

  function loadSession() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return null;
      return JSON.parse(raw);
    } catch { return null; }
  }

  function clearSession() {
    localStorage.removeItem(STORAGE_KEY);
  }

  // ============================================================
  // Upload
  // ============================================================
  function handleFile(file) {
    if (!file) {
      showError('Por favor, envie um arquivo PDF válido.');
      return;
    }
    const name = file.name ? file.name.toLowerCase() : '';
    if (file.type !== 'application/pdf' && !name.endsWith('.pdf')) {
      showError('Por favor, envie um arquivo PDF válido.');
      return;
    }
    uploadError.classList.add('hidden');
    pdfFile = file;
    fileNameEl.textContent = file.name;
    openPdf(file);
  }

  openFileBtn.addEventListener('click', e => {
    e.stopPropagation();
    pdfInput.click();
  });
  pdfInput.addEventListener('change', e => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });
  dropZone.addEventListener('click', e => {
    e.stopPropagation();
    pdfInput.click();
  });
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFile(e.dataTransfer.files[0]);
  });
  newFileBtn.addEventListener('click', () => pdfInput.click());

  // ============================================================
  // PDF — renderização
  // ============================================================
  async function openPdf(file) {
    uploadScreen.classList.add('hidden');
    workspaceScreen.classList.remove('hidden');
    pdfLoading.classList.remove('hidden');
    pdfContainer.classList.add('hidden');

    try {
      const arrayBuffer = await file.arrayBuffer();
      pdfDocument = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      totalPages = pdfDocument.numPages;
      pdfTotalPages.textContent = totalPages;
      currentPageStart = 1;
      lastRenderedPair = null;
      await renderPages();
      pdfLoading.classList.add('hidden');
      pdfContainer.classList.remove('hidden');
      maybeCreateDefaultPage();
    } catch (err) {
      console.error('[PDFNotes] Falha ao carregar PDF:', err);
      uploadScreen.classList.remove('hidden');
      workspaceScreen.classList.add('hidden');
      showError('Não foi possível carregar o PDF.');
    }
  }

  async function renderPages() {
    if (!pdfDocument) return;
    const token = ++renderToken;
    const left = currentPageStart;
    const right = currentPageStart + 1;

    async function renderOffscreen(pageNum) {
      if (pageNum < 1 || pageNum > totalPages) return null;
      const page = await pdfDocument.getPage(pageNum);
      const vp = page.getViewport({ scale: CROP_OFFSCREEN_SCALE });
      const oc = new OffscreenCanvas(Math.floor(vp.width), Math.floor(vp.height));
      const ctx = oc.getContext('2d');
      await page.render({ canvasContext: ctx, viewport: vp }).promise;
      return { canvas: oc, ctx, page };
    }

    function detectCrop(oc) {
      const { canvas, ctx } = oc;
      const W = canvas.width, H = canvas.height;
      const data = ctx.getImageData(0, 0, W, H).data;
      let top = H, bottom = 0, left = W, right = 0;
      for (let y = 0; y < H; y++) {
        for (let x = 0; x < W; x++) {
          const i = (y * W + x) * 4;
          if (data[i] < CROP_THRESHOLD || data[i + 1] < CROP_THRESHOLD || data[i + 2] < CROP_THRESHOLD) {
            if (y < top) top = y;
            if (y > bottom) bottom = y;
            if (x < left) left = x;
            if (x > right) right = x;
          }
        }
      }
      if (top > bottom) return { top: 0, bottom: H, left: 0, right: W };
      return { top, bottom: bottom + 1, left, right: right + 1 };
    }

    const [ocL, ocR] = await Promise.all([
      renderOffscreen(left),
      renderOffscreen(right),
    ]);
    if (token !== renderToken) return;

    const cropL = ocL ? detectCrop(ocL) : null;
    const cropR = ocR ? detectCrop(ocR) : null;

    const cropTop = Math.min(cropL?.top ?? 0, cropR?.top ?? 0);
    const cropBottom = Math.max(
      cropL?.bottom ?? ocL?.canvas.height ?? 0,
      cropR?.bottom ?? ocR?.canvas.height ?? 0
    );
    const cropLeft = Math.min(cropL?.left ?? 0, cropR?.left ?? 0);
    const cropRight = Math.max(
      cropL?.right ?? ocL?.canvas.width ?? 0,
      cropR?.right ?? ocR?.canvas.width ?? 0
    );

    const cropW = cropRight - cropLeft;
    const cropH = cropBottom - cropTop;
    if (cropW <= 0 || cropH <= 0) return;

    const containerH = pdfContainer.clientHeight;
    const containerW = pdfContainer.clientWidth;
    if (!containerH || !containerW) return;

    const rows = ocR ? 2 : 1;
    const offScale = CROP_OFFSCREEN_SCALE;
    const scaleH = (containerH / rows) / (cropH / offScale);
    const scaleW = containerW / (cropW / offScale);
    const finalScale = Math.min(scaleH, scaleW) * CROP_MARGIN;

    const dispW = Math.max(1, Math.floor((cropW / offScale) * finalScale));
    const dispH = Math.max(1, Math.floor((cropH / offScale) * finalScale));

    const dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    pdfCanvas.width = dispW * dpr;
    pdfCanvas.height = dispH * dpr * rows;
    pdfCanvas.style.width = dispW + 'px';
    pdfCanvas.style.height = (dispH * rows) + 'px';

    const ctx = pdfCanvas.getContext('2d');
    ctx.clearRect(0, 0, pdfCanvas.width, pdfCanvas.height);

    const destW = pdfCanvas.width;
    const destH = dispH * dpr;

    if (ocL) {
      ctx.drawImage(ocL.canvas,
        cropLeft, cropTop, cropW, cropH,
        0, 0, destW, destH
      );
    }
    if (ocR) {
      ctx.drawImage(ocR.canvas,
        cropLeft, cropTop, cropW, cropH,
        0, destH, destW, destH
      );
    }

    if (token !== renderToken) return;
    pdfPagesLabel.textContent = ocR ? `${left}, ${right}` : `${left}`;
    const linked = [left, right].filter(p => p <= totalPages).some(hasLinkedPage);
    linkedIndicator.classList.toggle('visible', linked);

    resizeDrawingOverlay();
    restoreOverlayForCurrentPair();

    lastRenderedPair = pairKey(currentPageStart);
    updatePageNavButtons();
  }

  function updatePageNavButtons() {
    const atStart = currentPageStart <= 1;
    const atEnd = currentPageStart + 1 >= totalPages;
    pdfPrev.disabled = atStart;
    pdfNext.disabled = atEnd;
    pdfPrev.classList.toggle('disabled', atStart);
    pdfNext.classList.toggle('disabled', atEnd);
  }

  function changePage(delta) {
    const newStart = currentPageStart + delta * 2;
    if (newStart < 1 || newStart > totalPages) return;
    currentPageStart = newStart;
    renderPages().then(() => {
      const idx = notebookPages.findIndex(p =>
        (p.linkedPdfPages || []).some(n => n === currentPageStart || n === currentPageStart + 1)
      );
      if (idx >= 0 && idx !== currentNoteIndex) {
        setNoteIndex(idx, true);
      } else {
        focusEditor();
      }
      saveSession();
    });
  }

  pdfPrev.addEventListener('click', () => { if (!pdfPrev.disabled) changePage(-1); });
  pdfNext.addEventListener('click', () => { if (!pdfNext.disabled) changePage(1); });

  // ============================================================
  // Caderno
  // ============================================================
  function setNoteIndex(idx, focus = true) {
    const target = normalizeNoteIndex(idx);
    if (target === currentNoteIndex) {
      if (focus) focusEditor();
      return target;
    }
    notebookPage.classList.add('transitioning');
    setTimeout(() => {
      currentNoteIndex = target;
      renderNotebook();
      notebookPage.classList.remove('transitioning');
      if (focus) focusEditor();
    }, NOTE_TRANSITION_MS);
    return target;
  }

  function renderNotebook() {
    if (notebookPages.length === 0) {
      notebookEmpty.classList.remove('hidden');
      notebookPage.classList.add('hidden');
      pageHeader.classList.add('hidden');
      refreshNotesList();
      return;
    }
    notebookEmpty.classList.add('hidden');
    notebookPage.classList.remove('hidden');
    pageHeader.classList.remove('hidden');
    const page = notebookPages[currentNoteIndex];
    if (milkdownReady) {
      setEditorMarkdown(page.content || '');
    } else {
      const wait = setInterval(() => {
        if (milkdownReady) {
          setEditorMarkdown(page.content || '');
          clearInterval(wait);
        }
      }, 100);
    }
    pageLinkLabel.textContent = formatPageLink(page.linkedPdfPages);
    pageNameDisplay.textContent = page.name?.trim() || 'Sem título';
    refreshNotesList();
    updateWordCount();
    setSaveStatus(`Salvo às ${formatDate()}`);
  }

  function createNotePage(linkedPages = null) {
    if (linkedPages === null) {
      linkedPages = [currentPageStart, currentPageStart + 1].filter(p => p <= totalPages);
    }
    const page = {
      id: uuid(),
      name: suggestNoteName(linkedPages),
      linkedPdfPages: linkedPages,
      content: '',
      drawings: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    notebookPages.push(page);
    setNoteIndex(notebookPages.length - 1);
    refreshNotesList();
    saveSession();
  }

  newNotePage.addEventListener('click', () => createNotePage());
  createFirstPage.addEventListener('click', () => {
    createNotePage();
    initMilkdown().catch(err => {
      console.error('[PDFNotes] Falha ao inicializar Milkdown:', err);
    });
  });

  sidebarToggle.addEventListener('click', () => {
    notesSidebar.classList.toggle('collapsed');
  });

  function deleteNotePage(idx) {
    if (idx < 0 || idx >= notebookPages.length) return;
    const page = notebookPages[idx];
    const name = page.name?.trim() || 'Sem título';
    if (!confirm(`Apagar "${name}"? Esta ação não pode ser desfeita.`)) return;
    notebookPages.splice(idx, 1);
    if (notebookPages.length === 0) {
      currentNoteIndex = -1;
      renderNotebook();
      saveSession();
      return;
    }
    if (currentNoteIndex >= notebookPages.length) {
      currentNoteIndex = notebookPages.length - 1;
    } else if (idx < currentNoteIndex) {
      currentNoteIndex--;
    }
    renderNotebook();
    saveSession();
  }

  function refreshNotesList() {
    notesList.innerHTML = '';
    notebookPages.forEach((page, idx) => {
      const li = document.createElement('li');
      li.className = 'notes-list-item' + (idx === currentNoteIndex ? ' active' : '');
      const name = page.name?.trim() || 'Sem título';
      const link = formatPageLink(page.linkedPdfPages);
      li.innerHTML = `<span class="item-content"><span class="item-name"></span><span class="item-pages"></span></span><button class="item-delete" title="Apagar">✕</button>`;
      li.querySelector('.item-name').textContent = name;
      li.querySelector('.item-pages').textContent = link;
      li.title = name;
      li.querySelector('.item-content').addEventListener('click', () => goToLinkedPage(idx));
      li.querySelector('.item-delete').addEventListener('click', e => {
        e.stopPropagation();
        deleteNotePage(idx);
      });
      notesList.appendChild(li);
    });
  }

  function goToLinkedPage(targetIdx) {
    const resolved = normalizeNoteIndex(targetIdx);
    const pages = notebookPages[resolved]?.linkedPdfPages;
    setNoteIndex(resolved);
    if (pages && pages.length) goToPdfPage(minOf(pages));
  }

  function maybeCreateDefaultPage() {
    if (notebookPages.length === 0) {
      createNotePage();
    } else {
      renderNotebook();
    }
    initMilkdown().catch(err => {
      console.error('[PDFNotes] Falha ao inicializar Milkdown:', err);
    });
  }

  function goToPdfPage(pageNum) {
    if (pageNum >= 1 && pageNum <= totalPages) {
      currentPageStart = pageNum % 2 === 0 ? pageNum - 1 : pageNum;
      renderPages();
      saveSession();
    }
  }

  // ============================================================
  // Edição do vínculo inline
  // ============================================================
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
    refreshNotesList();
    saveSession();
    renderPages();
    focusEditor();
  }

  function cancelLink() {
    pageLinkEdit.classList.add('hidden');
    pageLinkLabel.classList.remove('hidden');
    focusEditor();
  }

  // ============================================================
  // Edição do nome inline
  // ============================================================
  function startEditName() {
    if (currentNoteIndex < 0) return;
    pageNameDisplay.classList.add('hidden');
    pageNameInput.classList.remove('hidden');
    pageNameInput.value = notebookPages[currentNoteIndex].name || '';
    pageNameInput.focus();
    pageNameInput.select();
  }

  function saveName() {
    if (currentNoteIndex < 0) return;
    const val = pageNameInput.value.trim();
    notebookPages[currentNoteIndex].name = val || suggestNoteName(notebookPages[currentNoteIndex].linkedPdfPages);
    pageNameDisplay.textContent = notebookPages[currentNoteIndex].name;
    pageNameDisplay.classList.remove('hidden');
    pageNameInput.classList.add('hidden');
    refreshNotesList();
    saveSession();
  }

  pageNameDisplay.addEventListener('click', e => {
    e.stopPropagation();
    startEditName();
  });
  pageNameInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); saveName(); }
    if (e.key === 'Escape') {
      pageNameDisplay.classList.remove('hidden');
      pageNameInput.classList.add('hidden');
    }
  });
  pageNameInput.addEventListener('blur', saveName);

  pageLinkLabel.addEventListener('click', e => {
    e.stopPropagation();
    startEditLink();
  });
  pageLinkInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') { e.preventDefault(); saveLink(); }
    if (e.key === 'Escape') cancelLink();
  });
  pageLinkInput.addEventListener('blur', saveLink);

  // ============================================================
  // Editor Milkdown (WYSIWYG markdown) — carregado via dynamic import
  // ============================================================
  let milkdownMods = null;

  async function loadMilkdownModules() {
    if (milkdownMods) return milkdownMods;
    const [core, preset, pluginListener, utils] = await Promise.all([
      import('https://esm.sh/@milkdown/core@7.21.2'),
      import('https://esm.sh/@milkdown/preset-commonmark@7.21.2'),
      import('https://esm.sh/@milkdown/plugin-listener@7.21.2'),
      import('https://esm.sh/@milkdown/utils@7.21.2'),
    ]);
    milkdownMods = {
      Editor: core.Editor,
      defaultValueCtx: core.defaultValueCtx,
      rootCtx: core.rootCtx,
      commonmark: preset.commonmark,
      listener: pluginListener.listener,
      listenerCtx: pluginListener.listenerCtx,
      getMarkdown: utils.getMarkdown,
      replaceAll: utils.replaceAll,
    };
    return milkdownMods;
  }

  async function initMilkdown() {
    if (milkdownReady) return;

    // Espera o notebookPage ficar visível (setNoteIndex tem transition de 150ms)
    let tries = 0;
    while (notebookPage.classList.contains('hidden') && tries < 20) {
      await new Promise(r => setTimeout(r, 50));
      tries++;
    }
    if (notebookPage.classList.contains('hidden')) {
      console.warn('[PDFNotes] notebookPage ainda hidden após retry, abortando Milkdown');
      return;
    }

    console.log('[PDFNotes] Inicializando Milkdown...');
    const { Editor, defaultValueCtx, rootCtx, commonmark, listener, listenerCtx, getMarkdown: gm, replaceAll: ra } = await loadMilkdownModules();
    getMarkdownFn = gm;
    replaceAllFn = ra;

    try {
      milkdownEditor = await Editor.make()
        .config(ctx => {
          ctx.set(rootCtx, noteEditor);
          ctx.set(defaultValueCtx, notebookPages[currentNoteIndex]?.content || '');
          ctx.get(listenerCtx).markdownUpdated(() => {
            scheduleSave();
          });
        })
        .use(commonmark)
        .use(listener)
        .create();

      milkdownReady = true;
      console.log('[PDFNotes] Milkdown pronto');
      if (currentNoteIndex >= 0) {
        setEditorMarkdown(notebookPages[currentNoteIndex].content || '');
      }
      updateWordCount();
      focusEditor();
    } catch (err) {
      console.error('[PDFNotes] Erro ao criar Milkdown:', err);
      milkdownEditor = null;
    }
  }

  // ============================================================
  // Toolbar ferramentas
  // ============================================================
  function updateToolButtons() {
    toolBtns.forEach(b => b.classList.toggle('active', b.dataset.tool === activeTool));
    drawingOverlay.style.pointerEvents = activeTool === TOOLS.SELECT ? 'none' : 'auto';
    updateOverlayCursor();
  }

  function updateOverlayCursor() {
    const cursorMap = {
      [TOOLS.SELECT]: 'default',
      [TOOLS.PEN]: 'crosshair',
      [TOOLS.HIGHLIGHT]: 'crosshair',
      [TOOLS.ERASER]: 'cell',
    };
    drawingOverlay.style.cursor = cursorMap[activeTool] || 'default';
  }

  toolBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      activeTool = btn.dataset.tool;
      updateToolButtons();
    });
  });
  colorPicker.addEventListener('input', e => { toolColor = e.target.value; });

  // ============================================================
  // Desenho sobre o PDF (com persistência por par de páginas)
  // ============================================================
  function getOverlayPoint(e) {
    const rect = drawingOverlay.getBoundingClientRect();
    const scaleX = drawingOverlay.width / rect.width;
    const scaleY = drawingOverlay.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function resizeDrawingOverlay() {
    drawingOverlay.width = pdfCanvas.clientWidth;
    drawingOverlay.height = pdfCanvas.clientHeight;
  }

  function clearOverlay() {
    overlayCtx.clearRect(0, 0, drawingOverlay.width, drawingOverlay.height);
  }

  function getCurrentPage() {
    return currentNoteIndex >= 0 ? notebookPages[currentNoteIndex] : null;
  }

  function saveOverlayForCurrentPair() {
    const page = getCurrentPage();
    if (!page) return;
    if (!drawingOverlay.width || !drawingOverlay.height) return;
    if (activeTool === TOOLS.SELECT) return;
    const dataURL = drawingOverlay.toDataURL();
    if (!page.drawings) page.drawings = {};
    page.drawings[pairKey(currentPageStart)] = dataURL;
    page.updatedAt = new Date().toISOString();
    scheduleSave();
  }

  function restoreOverlayForCurrentPair() {
    clearOverlay();
    const page = getCurrentPage();
    if (!page || !page.drawings) return;
    const dataURL = page.drawings[pairKey(currentPageStart)];
    if (!dataURL) return;
    const img = new Image();
    img.onload = () => {
      overlayCtx.drawImage(img, 0, 0, drawingOverlay.width, drawingOverlay.height);
    };
    img.src = dataURL;
  }

  drawingOverlay.addEventListener('pointerdown', e => {
    if (activeTool === TOOLS.SELECT) return;
    isDrawing = true;
    lastPoint = getOverlayPoint(e);
    drawingOverlay.setPointerCapture(e.pointerId);
  });

  drawingOverlay.addEventListener('pointermove', e => {
    if (!isDrawing || activeTool === TOOLS.SELECT) return;
    const point = getOverlayPoint(e);
    overlayCtx.lineCap = 'round';
    overlayCtx.lineJoin = 'round';
    if (activeTool === TOOLS.ERASER) {
      overlayCtx.globalCompositeOperation = 'destination-out';
      overlayCtx.lineWidth = OVERLAY_ERASER_WIDTH;
    } else {
      overlayCtx.globalCompositeOperation = 'source-over';
      overlayCtx.strokeStyle = activeTool === TOOLS.HIGHLIGHT
        ? toolColor + OVERLAY_HIGHLIGHT_ALPHA
        : toolColor;
      overlayCtx.lineWidth = activeTool === TOOLS.HIGHLIGHT
        ? OVERLAY_HIGHLIGHT_WIDTH
        : OVERLAY_PEN_WIDTH;
    }
    overlayCtx.beginPath();
    overlayCtx.moveTo(lastPoint.x, lastPoint.y);
    overlayCtx.lineTo(point.x, point.y);
    overlayCtx.stroke();
    lastPoint = point;
  });

  const stopDrawing = () => {
    if (!isDrawing) return;
    isDrawing = false;
    lastPoint = null;
    saveOverlayForCurrentPair();
  };
  drawingOverlay.addEventListener('pointerup', stopDrawing);
  drawingOverlay.addEventListener('pointerleave', stopDrawing);

  // ============================================================
  // Exportação
  // ============================================================
  function download(filename, content, type) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function exportAsMarkdown() {
    const title = pdfFile ? pdfFile.name : 'anotacoes';
    let md = `# Anotações — ${title}\n\n`;
    notebookPages.forEach((p, i) => {
      md += `---\n\n`;
      md += `## Folha ${i + 1} — ${formatPageLink(p.linkedPdfPages).replace(/ do PDF$/, '')}\n\n`;
      md += `_Criada em ${new Date(p.createdAt).toLocaleString('pt-BR')}_\n\n`;
      md += `${p.content || ''}\n\n`;
    });
    download(title.replace(/\.pdf$/i, '') + '-anotacoes.md', md, 'text/markdown');
  }

  function exportAsJSON() {
    const session = {
      fileName: pdfFile ? pdfFile.name : null,
      exportedAt: new Date().toISOString(),
      notebookPages,
    };
    download((pdfFile ? pdfFile.name.replace(/\.pdf$/i, '') : 'anotacoes') + '.json',
      JSON.stringify(session, null, 2), 'application/json');
  }

  exportBtn.addEventListener('click', e => {
    e.stopPropagation();
    exportMenu.classList.toggle('hidden');
  });
  document.addEventListener('click', e => {
    if (!exportBtn.contains(e.target) && !exportMenu.contains(e.target)) {
      exportMenu.classList.add('hidden');
    }
  });
  exportMarkdown.addEventListener('click', () => { exportAsMarkdown(); exportMenu.classList.add('hidden'); });
  exportJSON.addEventListener('click', () => { exportAsJSON(); exportMenu.classList.add('hidden'); });

  // ============================================================
  // Divisor redimensionável
  // ============================================================
  function loadSplit() {
    const saved = localStorage.getItem(SPLIT_KEY);
    if (saved) workspace.style.gridTemplateColumns = saved;
  }
  loadSplit();

  let isResizing = false;
  resizer.addEventListener('mousedown', e => {
    isResizing = true;
    resizer.classList.add('resizing');
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
    e.preventDefault();
  });

  document.addEventListener('mousemove', e => {
    if (!isResizing) return;
    const rect = workspace.getBoundingClientRect();
    const total = rect.width;
    let leftPct = ((e.clientX - rect.left) / total) * 100;
    const minPct = (MIN_PANEL_PX / total) * 100;
    const maxPct = 100 - minPct;
    leftPct = Math.max(minPct, Math.min(maxPct, leftPct));
    workspace.style.gridTemplateColumns =
      `${leftPct}% 6px ${100 - leftPct - RESIZER_WIDTH_PCT}%`;
  });

  document.addEventListener('mouseup', () => {
    if (!isResizing) return;
    isResizing = false;
    resizer.classList.remove('resizing');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    localStorage.setItem(SPLIT_KEY, workspace.style.gridTemplateColumns);
  });

  // ============================================================
  // Atalhos de teclado
  // ============================================================
  document.addEventListener('keydown', e => {
    const ae = document.activeElement;
    const inEditor = ae && (ae === noteEditor || noteEditor.contains(ae));
    if (inEditor || ae === pageLinkInput) return;

    const alt = e.altKey;
    const ctrl = e.ctrlKey || e.metaKey;
    const shift = e.shiftKey;
    const key = e.key.toLowerCase();

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (alt) goToLinkedPage(currentNoteIndex - 1);
      else changePage(-1);
      return;
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (alt) goToLinkedPage(currentNoteIndex + 1);
      else changePage(1);
      return;
    }
    if (alt && key === 'n') {
      e.preventDefault();
      createNotePage();
      return;
    }
    if (ctrl && key === 's') {
      e.preventDefault();
      saveSession();
      return;
    }
    if (ctrl && key === 'e') {
      e.preventDefault();
      exportAsMarkdown();
      return;
    }
    if (!ctrl && !alt && !shift && key === 'v') {
      activeTool = TOOLS.SELECT;
      updateToolButtons();
      return;
    }
    if (!ctrl && !alt && !shift && key === 'h') {
      activeTool = TOOLS.HIGHLIGHT;
      updateToolButtons();
      return;
    }
    if (!ctrl && !alt && shift && key === 'p') {
      e.preventDefault();
      activeTool = TOOLS.PEN;
      updateToolButtons();
      return;
    }
    if (!ctrl && !alt && !shift && key === 'x') {
      activeTool = TOOLS.ERASER;
      updateToolButtons();
      return;
    }
  });

  // ============================================================
  // Restauração de sessão
  // ============================================================
  function askRestore(session) {
    restoreBanner.classList.remove('hidden');
    const onYes = () => {
      notebookPages = session.notebookPages || [];
      currentNoteIndex = session.lastNotebookIndex || 0;
      currentPageStart = (session.lastPdfPages && session.lastPdfPages[0]) || 1;
      restoreBanner.classList.add('hidden');
      if (pdfDocument) {
        renderPages();
        renderNotebook();
        initMilkdown().catch(err => {
          console.error('[PDFNotes] Falha ao inicializar Milkdown:', err);
        });
      }
      cleanup();
    };
    const onNo = () => {
      clearSession();
      restoreBanner.classList.add('hidden');
      cleanup();
    };
    const cleanup = () => {
      restoreYes.removeEventListener('click', onYes);
      restoreNo.removeEventListener('click', onNo);
    };
    restoreYes.addEventListener('click', onYes);
    restoreNo.addEventListener('click', onNo);
  }

  // ============================================================
  // Inicialização
  // ============================================================
  uploadScreen.classList.remove('hidden');
  workspaceScreen.classList.add('hidden');

  const saved = loadSession();
  if (saved && saved.notebookPages && saved.notebookPages.length) {
    askRestore(saved);
  }

  const debouncedRender = debounce(() => {
    if (pdfDocument) renderPages();
  }, DEBOUNCE_RENDER_MS);

  window.addEventListener('resize', () => {
    resizeDrawingOverlay();
    debouncedRender();
  });

  // Re-renderiza PDF quando o container ganhar dimensões reais
  // (evita páginas microscópicas no primeiro carregamento)
  if (pdfContainer) {
    const resizeObserver = new ResizeObserver(debouncedRender);
    resizeObserver.observe(pdfContainer);
  }

})();