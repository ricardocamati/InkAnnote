// Crop automático de margens — DESLIGADO por padrão. Em PDFs com fundos
  // escuros e divisórias claras (como o DNA-test.pdf), o algoritmo confunde
  // elementos internos com margens e corta a página. Para reativar no futuro,
  // substituir por análise mais robusta (limiar adaptativo por canal).
  async function detectCrop(page, scale) {
    return { cropTop: 0, cropBottom: 0, cropLeft: 0, cropRight: 0 };
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

    // Calcula scale dinâmico para caber duas páginas empilhadas no container
    const baseVp = page.getViewport({ scale: 1 });
    const containerH = container.clientHeight || container.getBoundingClientRect().height;
    const containerW = container.clientWidth || container.getBoundingClientRect().width;
    const pageH = (containerH - 32) / 2;
    const pageW = containerW - 32;
    const scaleByHeight = pageH / baseVp.height;
    const scaleByWidth = pageW / baseVp.width;
    // fit-to-container (contain) sem cortar, depois aplica o zoom do usuário
    let fitScale = Math.min(scaleByHeight, scaleByWidth);
    let scale = fitScale * zoom;
    // Impede que o PDF fique microscópico quando o container ainda não tem altura
    if (scale < 1.50) scale = 1.50;
    const viewport = page.getViewport({ scale });

    let crop = { cropTop: 0, cropBottom: 0, cropLeft: 0, cropRight: 0 };
    try { crop = await detectCrop(page, scale); } catch (e) { /* ignore crop errors */ }

    canvas.width = Math.max(1, Math.floor(viewport.width - crop.cropLeft - crop.cropRight));
    canvas.height = Math.max(1, Math.floor(viewport.height - crop.cropTop - crop.cropBottom));
    // Limpa estilos inline anteriores para deixar o CSS controlar tamanho visual
    canvas.style.width = '';
    canvas.style.height = '';
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Não preenche fundo com branco: páginas com fundo escuro geram linhas
    // brancas ao redor do conteúdo quando o crop remove margens. O próprio
    // PDF renderiza seu fundo.

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
