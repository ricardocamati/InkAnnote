import { getJsPDF, renderPageToImageObject, blobToArrayBuffer, slugify, formatPageLink, markdownToPlain } from './utils.js';

// A4 paisagem
const W = 297;
const H = 210;
const MARGIN_X = 10;
const MARGIN_Y = 10;
const GAP_COLS = 8;

const COL_SLIDES_W = (W - MARGIN_X * 2 - GAP_COLS) * 0.45;
const COL_NOTES_W = (W - MARGIN_X * 2 - GAP_COLS) * 0.55;
const COL_NOTES_X = MARGIN_X + COL_SLIDES_W + GAP_COLS;

const HEADER_Y = 6;
const FOOTER_Y = H - 4;
const USABLE_H = H - MARGIN_Y * 2;

export async function exportPdfWithNotes(session, { includeAllSlides } = {}) {
  const { fileName, pdfDocument, notebookPages, onProgress } = session;
  const jsPDF = await getJsPDF();
  const doc = new jsPDF('l', 'mm', 'a4');
  const title = (fileName || 'anotacoes').replace(/\.pdf$/i, '');

  // Detecta orientação baseada na primeira página
  const firstPage = await pdfDocument.getPage(1);
  const firstVp = firstPage.getViewport({ scale: 1 });
  const pdfIsPortrait = firstVp.height > firstVp.width;

  // 1. Gera pares de páginas (esquerda/direita), igual ao app principal
  let pagePairs;
  if (includeAllSlides) {
    pagePairs = [];
    for (let i = 1; i <= pdfDocument.numPages; i += 2) {
      pagePairs.push([i, i + 1 <= pdfDocument.numPages ? i + 1 : null]);
    }
  } else {
    const linked = new Set();
    for (const note of notebookPages) {
      (note.linkedPdfPages || []).forEach(p => linked.add(p));
    }
    const sorted = [...linked].sort((a, b) => a - b);
    pagePairs = [];
    const used = new Set();
    for (const p of sorted) {
      if (used.has(p)) continue;
      const left = p % 2 === 0 ? p - 1 : p;
      const right = left + 1;
      pagePairs.push([left, right <= pdfDocument.numPages ? right : null]);
      used.add(left);
      used.add(right);
    }
  }

  const totalPairs = pagePairs.length;

  // 2. Helpers de desenho
  function drawPageChrome(label, pageIndex, totalPages) {
    doc.setFontSize(9);
    doc.setTextColor(140);
    doc.setFont(undefined, 'normal');
    doc.text(`InkAnnote — ${title}`, MARGIN_X, HEADER_Y);
    doc.text(label, W - MARGIN_X, HEADER_Y, { align: 'right' });

    const dateStr = new Date().toLocaleDateString('pt-BR');
    doc.text(`Exportado em ${dateStr}`, MARGIN_X, FOOTER_Y);
    const counterText = totalPages ? `${pageIndex} / ${totalPages}` : `${pageIndex}`;
    doc.text(counterText, W - MARGIN_X, FOOTER_Y, { align: 'right' });
    doc.setTextColor(0);
  }

  async function drawSlides(leftNum, rightNum) {
    const slideGapY = 6;
    const maxSlideH = (USABLE_H - slideGapY) / 2;

    if (pdfIsPortrait && rightNum) {
      const halfGap = 4;
      const halfW = (COL_SLIDES_W - halfGap) / 2;
      await drawSlide(leftNum, MARGIN_X, MARGIN_Y, halfW, USABLE_H);
      await drawSlide(rightNum, MARGIN_X + halfW + halfGap, MARGIN_Y, halfW, USABLE_H);
    } else {
      await drawSlide(leftNum, MARGIN_X, MARGIN_Y, COL_SLIDES_W, maxSlideH);
      if (rightNum) await drawSlide(rightNum, MARGIN_X, MARGIN_Y + maxSlideH + slideGapY, COL_SLIDES_W, maxSlideH);
    }
  }

  async function drawSlide(pageNum, x, y, maxW, maxH) {
    if (!pageNum || pageNum > pdfDocument.numPages) return { w: 0, h: 0 };
    const { blob, width, height } = await renderPageToImageObject(pdfDocument, pageNum, 1.5);
    const arrayBuffer = await blobToArrayBuffer(blob);
    const uint8 = new Uint8Array(arrayBuffer);
    const ratio = height / width;

    let drawW = maxW;
    let drawH = drawW * ratio;
    if (drawH > maxH) {
      drawH = maxH;
      drawW = drawH / ratio;
    }
    const offsetX = x + (maxW - drawW) / 2;
    const offsetY = y + (maxH - drawH) / 2;
    doc.addImage(uint8, 'JPEG', offsetX, offsetY, drawW, drawH);
    await new Promise(r => setTimeout(r, 0));
    return { w: drawW, h: drawH };
  }

  function renderNoteHeader(note, cursorY) {
    doc.setFontSize(12);
    doc.setFont(undefined, 'bold');
    doc.text(note.name?.trim() || 'Sem título', COL_NOTES_X, cursorY);
    cursorY += 6;

    doc.setFontSize(8);
    doc.setFont(undefined, 'normal');
    doc.setTextColor(120);
    doc.text(formatPageLink(note.linkedPdfPages), COL_NOTES_X, cursorY);
    cursorY += 4;
    doc.setTextColor(0);

    doc.setDrawColor(220);
    doc.line(COL_NOTES_X, cursorY, COL_NOTES_X + COL_NOTES_W, cursorY);
    cursorY += 5;
    return cursorY;
  }

  function measureNoteBlock(note) {
    const plain = markdownToPlain(note.content || 'Sem conteúdo.', { collapseBlankLines: true });
    doc.setFontSize(10);
    const lines = doc.splitTextToSize(plain, COL_NOTES_W);
    const lineHeight = 4.5;
    const headerH = 6 + 4 + 5; // nome + vínculo + divisória
    return { plain, lines, headerH, blockH: headerH + lines.length * lineHeight };
  }

  // 3. Loop principal por par de páginas
  let pageCounter = 0;
  let totalPages = 0; // será calculado ao final
  const pageCounterByPair = [];

  function startNewPage(label) {
    if (pageCounter > 0) doc.addPage();
    pageCounter++;
    drawPageChrome(label, pageCounter, totalPages || null);
    return pageCounter;
  }

  for (let i = 0; i < totalPairs; i++) {
    const [leftNum, rightNum] = pagePairs[i];
    const pct = Math.round((i / totalPairs) * 80) + 5;
    onProgress?.(pct, `Renderizando páginas ${leftNum}${rightNum ? ', ' + rightNum : ''}...`);

    const pairLabel = formatPageLink([leftNum, rightNum].filter(Boolean));

    // Coleta e mede todas as notas do par
    const linkedNotes = notebookPages.filter(note =>
      (note.linkedPdfPages || []).some(p => p === leftNum || p === rightNum)
    );
    const noteBlocks = linkedNotes.map(n => ({ note: n, ...measureNoteBlock(n) }));

    // Layout: desenha slides à esquerda e distribui notas entre páginas
    let pairPageCount = 0;
    startNewPage(pairLabel);
    pairPageCount++;
    await drawSlides(leftNum, rightNum);

    let cursorY = MARGIN_Y;
    const safeY = H - MARGIN_Y;

    if (noteBlocks.length === 0) {
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text('Sem anotações para estas páginas.', COL_NOTES_X, cursorY);
      doc.setTextColor(0);
    }

    for (const block of noteBlocks) {
      // Se a nota inteira não cabe, quebra para nova página com slides repetidos
      if (cursorY + block.blockH > safeY) {
        startNewPage(`${pairLabel} (cont.)`);
        pairPageCount++;
        await drawSlides(leftNum, rightNum);
        cursorY = MARGIN_Y;
      }

      cursorY = renderNoteHeader(block.note, cursorY);
      doc.text(block.lines, COL_NOTES_X, cursorY);
      cursorY += block.lines.length * 4.5 + 8;

      await new Promise(r => setTimeout(r, 0));
    }

    pageCounterByPair.push(pairPageCount);
    await new Promise(r => setTimeout(r, 0));
  }

  // Recalcula total de páginas real e redesenha rodapés com numeração final
  totalPages = pageCounter;
  const pageLabels = [];
  for (let i = 0; i < totalPairs; i++) {
    const pair = pagePairs[i];
    const label = formatPageLink(pair.filter(Boolean));
    for (let j = 0; j < (pageCounterByPair[i] || 1); j++) {
      pageLabels.push(j === 0 ? label : `${label} (cont.)`);
    }
  }
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFillColor(255);
    doc.rect(MARGIN_X, H - 8, W - MARGIN_X * 2, 6, 'F');
    drawPageChrome(pageLabels[i - 1] || '', i, totalPages);
  }

  onProgress?.(98, 'Gerando PDF...');
  doc.save(`${slugify(title)}-anotacoes.pdf`);
  onProgress?.(100, 'Concluído');
}
