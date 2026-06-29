(() => {
  'use strict';

  try {
    console.log('[PDFNotes] Iniciando app...');

    pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

    // DOM refs
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

  // Estado
  let pdfDocument = null;
  let pdfFile = null;
  let currentPageStart = 1;
  let zoom = 1;
  let totalPages = 0;
  let notebookPages = [];
  let currentNoteIndex = -1;
  let activeTool = 'select';
  let toolColor = '#FFD700';
  let isDrawing = false;
  let lastPoint = null;
  let saveTimeout = null;
  let previewMode = false;
  let cropCache = new Map();

  const STORAGE_KEY = 'pdfnotes_session';
  const THEME_KEY = 'pdfnotes_theme';
  const SPLIT_KEY = 'pdfnotes_split';

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

  // Tema
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
  if (savedTheme === 'dark' || savedTheme === 'light') setTheme(savedTheme);
  else setTheme('light');
  themeToggle.addEventListener('click', toggleTheme);

  // Persistência
  function saveSession() {
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

  function scheduleSave() {
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

  // Upload
  function handleFile(file) {
    if (!file || file.type !== 'application/pdf') {
      const name = file ? file.name.toLowerCase() : '';
      if (!name.endsWith('.pdf')) {
        showError('Por favor, envie um arquivo PDF válido.');
        return;
      }
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

  // Crop automático de margens
  async function detectCrop(page, scale) {
    const key = `${page.pageNumber}@${scale}`;
    if (cropCache.has(key)) return cropCache.get(key);

    const vp = page.getViewport({ scale });
    const offscreen = document.createElement('canvas');
    offscreen.width = Math.floor(vp.width);
    offscreen.height = Math.floor(vp.height);
    const ctx = offscreen.getContext('2d');
    await page.render({ canvasContext: ctx, viewport: vp }).promise;

    const imageData = ctx.getImageData(0, 0, offscreen.width, offscreen.height);
    const data = imageData.data;
    const w = offscreen.width;
    const h = offscreen.height;

    function isWhiteRow(y) {
      for (let x = 0; x < w; x++) {
        const i = (y * w + x) * 4;
        const avg = (data[i] + data[i+1] + data[i+2]) / 3;
        if (avg < 250) return false;
      }
      return true;
    }

    function isWhiteCol(x) {
      for (let y = 0; y < h; y++) {
        const i = (y * w + x) * 4;
        const avg = (data[i] + data[i+1] + data[i+2]) / 3;
        if (avg < 250) return false;
      }
      return true;
    }

    let cropTop = 0, cropBottom = 0, cropLeft = 0, cropRight = 0;
    for (let y = 0; y < h; y++) { if (!isWhiteRow(y)) { cropTop = y; break; } }
    for (let y = h - 1; y >= 0; y--) { if (!isWhiteRow(y)) { cropBottom = h - 1 - y; break; } }
    for (let x = 0; x < w; x++) { if (!isWhiteCol(x)) { cropLeft = x; break; } }
    for (let x = w - 1; x >= 0; x--) { if (!isWhiteCol(x)) { cropRight = w - 1 - x; break; } }

    // margem mínima de segurança
    const pad = 4;
    cropTop = Math.max(0, cropTop - pad);
    cropBottom = Math.max(0, cropBottom - pad);
    cropLeft = Math.max(0, cropLeft - pad);
    cropRight = Math.max(0, cropRight - pad);

    const crop = { cropTop, cropBottom, cropLeft, cropRight };
    cropCache.set(key, crop);
    return crop;
  }

  // PDF
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
      cropCache.clear();
      await renderPages();
      pdfLoading.classList.add('hidden');
      pdfContainer.classList.remove('hidden');
      maybeCreateDefaultPage();
    } catch (err) {
      console.error(err);
      uploadScreen.classList.remove('hidden');
      workspaceScreen.classList.add('hidden');
      showError('Não foi possível carregar o PDF.');
    }
  }

  async function renderPage(canvas, pageNum) {
    if (pageNum > totalPages || pageNum < 1) {
      canvas.width = 0;
      canvas.height = 0;
      return;
    }
    const page = await pdfDocument.getPage(pageNum);
    const container = pdfContainer;
    // TODO(ajuste): as páginas estão miúdas. O cálculo abaixo fita 2 páginas empilhadas
    // dentro do container. Ajuste `availableH`/`availableW` ou remova o divisor por 2
    // se quiser exibir só 1 página por vez, ou aumente o multiplicador de zoom.
    const availableH = container.clientHeight - 32; // padding only, gap handled by layout
    const availableW = container.clientWidth - 32;
    const baseVp = page.getViewport({ scale: 1 });
    // Fit two pages stacked: each page gets half height, then apply zoom multiplier
    let fitScale = Math.min(availableW / baseVp.width, (availableH / 2) / baseVp.height);
    let scale = fitScale * zoom;
    if (scale < 0.05) scale = 0.05;
    const viewport = page.getViewport({ scale });

    let crop = { cropTop: 0, cropBottom: 0, cropLeft: 0, cropRight: 0 };
    try { crop = await detectCrop(page, scale); } catch (e) { /* ignore crop errors */ }

    const croppedW = Math.max(1, viewport.width - crop.cropLeft - crop.cropRight);
    const croppedH = Math.max(1, viewport.height - crop.cropTop - crop.cropBottom);

    canvas.width = Math.floor(croppedW);
    canvas.height = Math.floor(croppedH);
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Preenche fundo com branco (evita transparência em páginas escaneadas)
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.save();
    ctx.translate(-crop.cropLeft, -crop.cropTop);
    await page.render({ canvasContext: ctx, viewport }).promise;
    ctx.restore();
  }

  async function renderPages() {
    const left = currentPageStart;
    const right = currentPageStart + 1;
    await Promise.all([
      renderPage(pdfCanvasLeft, left),
      renderPage(pdfCanvasRight, right)
    ]);
    pdfPagesLabel.textContent = right <= totalPages ? `${left}, ${right}` : `${left}`;
    const linked = [left, right].filter(p => p <= totalPages).some(hasLinkedPage);
    linkedIndicator.classList.toggle('visible', linked);
    resizeDrawingOverlay();
    clearOverlay();
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

  pdfPrev.addEventListener('click', () => changePage(-1));
  pdfNext.addEventListener('click', () => changePage(1));

  // Zoom
  function setZoom(value) {
    zoom = parseFloat(value);
    zoomSelect.value = zoom;
    renderPages();
  }
  zoomSelect.addEventListener('change', e => setZoom(e.target.value));
  zoomIn.addEventListener('click', () => {
    const options = Array.from(zoomSelect.options).map(o => parseFloat(o.value));
    const next = options.find(v => v > zoom);
    if (next) setZoom(next);
  });
  zoomOut.addEventListener('click', () => {
    const options = Array.from(zoomSelect.options).map(o => parseFloat(o.value)).sort((a, b) => b - a);
    const prev = options.find(v => v < zoom);
    if (prev) setZoom(prev);
  });

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

  // Preview Markdown
  function updatePreview() {
    notePreview.innerHTML = marked.parse(noteEditor.value || '');
  }

  function togglePreview() {
    previewMode = !previewMode;
    previewToggle.setAttribute('aria-pressed', previewMode);
    previewToggle.classList.toggle('active', previewMode);
    if (previewMode) {
      updatePreview();
      noteEditor.classList.add('hidden');
      notePreview.classList.remove('hidden');
    } else {
      notePreview.classList.add('hidden');
      noteEditor.classList.remove('hidden');
      focusEditor();
    }
  }

  previewToggle.addEventListener('click', togglePreview);

  // Toolbar ferramentas
  toolBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      activeTool = btn.dataset.tool;
      updateToolButtons();
    });
  });
  colorPicker.addEventListener('input', e => toolColor = e.target.value);

  function updateToolButtons() {
    toolBtns.forEach(b => b.classList.toggle('active', b.dataset.tool === activeTool));
    drawingOverlay.style.pointerEvents = activeTool === 'select' ? 'none' : 'auto';
  }

  // Desenho sobre o PDF
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
    drawingOverlay.width = pdfContainer.clientWidth;
    drawingOverlay.height = pdfContainer.clientHeight;
  }

  function clearOverlay() {
    const ctx = drawingOverlay.getContext('2d');
    ctx.clearRect(0, 0, drawingOverlay.width, drawingOverlay.height);
  }

  const overlayCtx = drawingOverlay.getContext('2d');

  drawingOverlay.addEventListener('pointerdown', e => {
    if (activeTool === 'select') return;
    isDrawing = true;
    lastPoint = getOverlayPoint(e);
    drawingOverlay.setPointerCapture(e.pointerId);
  });

  drawingOverlay.addEventListener('pointermove', e => {
    if (!isDrawing || activeTool === 'select') return;
    const point = getOverlayPoint(e);
    overlayCtx.lineCap = 'round';
    overlayCtx.lineJoin = 'round';
    if (activeTool === 'eraser') {
      overlayCtx.globalCompositeOperation = 'destination-out';
      overlayCtx.lineWidth = 16;
    } else {
      overlayCtx.globalCompositeOperation = 'source-over';
      overlayCtx.strokeStyle = activeTool === 'highlight' ? toolColor + '88' : toolColor;
      overlayCtx.lineWidth = activeTool === 'highlight' ? 18 : 3;
    }
    overlayCtx.beginPath();
    overlayCtx.moveTo(lastPoint.x, lastPoint.y);
    overlayCtx.lineTo(point.x, point.y);
    overlayCtx.stroke();
    lastPoint = point;
  });

  const stopDrawing = () => { isDrawing = false; lastPoint = null; };
  drawingOverlay.addEventListener('pointerup', stopDrawing);
  drawingOverlay.addEventListener('pointerleave', stopDrawing);

  // Exportação
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

  exportBtn.addEventListener('click', () => exportMenu.classList.toggle('hidden'));
  document.addEventListener('click', e => {
    if (!exportBtn.contains(e.target) && !exportMenu.contains(e.target)) exportMenu.classList.add('hidden');
  });
  exportMarkdown.addEventListener('click', () => { exportAsMarkdown(); exportMenu.classList.add('hidden'); });
  exportJSON.addEventListener('click', () => { exportAsJSON(); exportMenu.classList.add('hidden'); });

  // Divisor redimensionável
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
    const minPct = (320 / total) * 100;
    const maxPct = 100 - minPct;
    leftPct = Math.max(minPct, Math.min(maxPct, leftPct));
    workspace.style.gridTemplateColumns = `${leftPct}% 6px ${100 - leftPct - 0.6}%`;
  });

  document.addEventListener('mouseup', () => {
    if (!isResizing) return;
    isResizing = false;
    resizer.classList.remove('resizing');
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
    localStorage.setItem(SPLIT_KEY, workspace.style.gridTemplateColumns);
  });

  // Atalhos de teclado
  document.addEventListener('keydown', e => {
    if (document.activeElement === noteEditor || document.activeElement === pageLinkInput) return;

    const alt = e.altKey;
    const ctrl = e.ctrlKey || e.metaKey;

    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      if (alt) {
        setNoteIndex(currentNoteIndex - 1);
        const pages = notebookPages[currentNoteIndex]?.linkedPdfPages;
        if (pages && pages.length) goToPdfPage(Math.min(...pages));
      } else changePage(-1);
    }
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      if (alt) {
        setNoteIndex(currentNoteIndex + 1);
        const pages = notebookPages[currentNoteIndex]?.linkedPdfPages;
        if (pages && pages.length) goToPdfPage(Math.min(...pages));
      } else changePage(1);
    }
    if (alt && e.key.toLowerCase() === 'n') {
      e.preventDefault();
      createNotePage();
    }
    if (ctrl && (e.key === '+' || e.key === '=')) {
      e.preventDefault();
      zoomIn.click();
    }
    if (ctrl && e.key === '-') {
      e.preventDefault();
      zoomOut.click();
    }
    if (ctrl && e.key.toLowerCase() === 'e') {
      e.preventDefault();
      exportAsMarkdown();
    }
    if (ctrl && e.key.toLowerCase() === 'p') {
      e.preventDefault();
      togglePreview();
    }
    if (!ctrl && !alt && e.key.toLowerCase() === 'v') { activeTool = 'select'; updateToolButtons(); }
    if (!ctrl && !alt && e.key.toLowerCase() === 'h') { activeTool = 'highlight'; updateToolButtons(); }
    if (!ctrl && !alt && e.key.toLowerCase() === 'p') { activeTool = 'pen'; updateToolButtons(); }
    if (!ctrl && !alt && e.key.toLowerCase() === 'e') { activeTool = 'eraser'; updateToolButtons(); }
  });

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

  // Inicialização
  console.log('[PDFNotes] DOM carregado, elementos principais:', !!uploadScreen, !!workspaceScreen, !!pdfInput);
  uploadScreen.classList.remove('hidden');
  workspaceScreen.classList.add('hidden');

  const saved = loadSession();
  if (saved && saved.notebookPages && saved.notebookPages.length) {
    askRestore(saved);
  }

  window.addEventListener('resize', () => {
    resizeDrawingOverlay();
    if (pdfDocument) renderPages();
  });

  console.log('[PDFNotes] App pronto');
  } catch (err) {
    console.error('[PDFNotes] Erro fatal na inicialização:', err);
  }
})();
