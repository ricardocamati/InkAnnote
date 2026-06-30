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
const LINE_HEIGHT = 3.8;       // compacto para caber mais linhas
const TITLE_LINE_H = 5;        // título
const LINK_LINE_H = 3.5;       // vínculo
const DIVIDER_H = 4;           // divisória + espaço
const NOTE_GAP = 5;            // gap entre notas

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
  let pageCounter = 0;
  let totalPages = 0; // recalculado ao final
  const pageLabels = []; // rótulo de cada página gerada

  // 2. Helpers de desenho
  function drawPageChrome(label, pageIndex, totalPagesKnown) {
    doc.setFontSize(9);
    doc.setTextColor(140);
    doc.setFont(undefined, 'normal');
    doc.text(`InkAnnote — ${title}`, MARGIN_X, HEADER_Y);
    doc.text(label, W - MARGIN_X, HEADER_Y, { align: 'right' });

    const dateStr = new Date().toLocaleDateString('pt-BR');
    doc.text(`Exportado em ${dateStr}`, MARGIN_X, FOOTER_Y);
    const counterText = totalPagesKnown ? `${pageIndex} / ${totalPagesKnown}` : `${pageIndex}`;
    doc.text(counterText, W - MARGIN_X, FOOTER_Y, { align: 'right' });
    doc.setTextColor(0);
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

  function measureNoteBlock(note, colWidth) {
    const plain = markdownToPlain(note.content || 'Sem conteúdo.', { collapseBlankLines: true });
    doc.setFontSize(9); // fonte ligeiramente menor para economizar espaço
    const lines = doc.splitTextToSize(plain, colWidth);
    const headerH = TITLE_LINE_H + LINK_LINE_H + DIVIDER_H; // título + vínculo + divisória
    const blockH = headerH + (lines.length * LINE_HEIGHT) + NOTE_GAP;
    return { lines, blockH };
  }

  function drawNoteHeader(note, x, cursorY) {
    doc.setFontSize(11); // título compacto
    doc.setFont(undefined, 'bold');
    doc.text(note.name?.trim() || 'Sem título', x, cursorY);
    cursorY += TITLE_LINE_H;

    doc.setFontSize(7); // vínculo compacto
    doc.setFont(undefined, 'normal');
    doc.setTextColor(120);
    doc.text(formatPageLink(note.linkedPdfPages), x, cursorY);
    cursorY += LINK_LINE_H;
    doc.setTextColor(0);

    doc.setDrawColor(220);
    doc.line(x, cursorY, x + (W - MARGIN_X * 2), cursorY);
    cursorY += DIVIDER_H - 1; // já incluímos parte do espaço na linha
    return cursorY;
  }

  function startPage(label) {
    if (pageCounter > 0) doc.addPage();
    pageCounter++;
    drawPageChrome(label, pageCounter, null);
    pageLabels.push(label);
    return pageCounter;
  }

  function drawNotesInColumn(notes, x, startY, colWidth, maxY) {
    let cursorY = startY;
    let renderedCount = 0;

    for (const note of notes) {
      const { lines, blockH } = measureNoteBlock(note, colWidth);

      // Nota não cabe inteira? Para aqui, devolve resto.
      if (cursorY + blockH > maxY) break;

      cursorY = drawNoteHeader(note, x, cursorY);
      doc.setFontSize(9);
      doc.text(lines, x, cursorY);
      cursorY += lines.length * LINE_HEIGHT + NOTE_GAP;
      renderedCount++;
    }

    if (notes.length === 0) {
      doc.setFontSize(9);
      doc.setTextColor(150);
      doc.text('Sem anotações para estas páginas.', x, startY);
      doc.setTextColor(0);
    }

    return { renderedCount };
  }

  async function drawExtraNotesPages(notes, leftNum, rightNum) {
    const fullX = MARGIN_X;
    const fullW = W - MARGIN_X * 2;
    let remaining = notes.map(n => ({ ...n }));
    const pairLabel = formatPageLink([leftNum, rightNum].filter(Boolean));

    while (remaining.length > 0) {
      startPage(`${pairLabel} (continuação)`);
      let cursorY = MARGIN_Y + 6;
      const consumed = [];

      for (const note of remaining) {
        const { lines, blockH } = measureNoteBlock(note, fullW);

        // Caso extremo: nota gigante não cabe nem em página cheia — faz split parcial
        if (cursorY + blockH > H - MARGIN_Y && consumed.length === 0) {
          const availableH = (H - MARGIN_Y) - cursorY - 15;
          const maxLines = Math.max(1, Math.floor(availableH / LINE_HEIGHT));
          const partial = lines.slice(0, maxLines);
          const restText = lines.slice(maxLines).join('\n');

          cursorY = drawNoteHeader(note, fullX, cursorY);
          doc.setFontSize(9);
          doc.text(partial, fullX, cursorY);

          if (restText.trim()) {
            remaining = [{ ...note, content: restText }, ...remaining.slice(1)];
          }
          break;
        }

        if (cursorY + blockH > H - MARGIN_Y) break;

        cursorY = drawNoteHeader(note, fullX, cursorY);
        doc.setFontSize(9);
        doc.text(lines, fullX, cursorY);
        cursorY += lines.length * LINE_HEIGHT + NOTE_GAP;
        consumed.push(note);
        await new Promise(r => setTimeout(r, 0));
      }

      remaining = remaining.filter(n => !consumed.includes(n));
    }
  }

  // 3. Loop principal por par de páginas
  for (let i = 0; i < totalPairs; i++) {
    const [leftNum, rightNum] = pagePairs[i];
    const pct = Math.round((i / totalPairs) * 80) + 5;
    onProgress?.(pct, `Renderizando páginas ${leftNum}${rightNum ? ', ' + rightNum : ''}...`);

    const pairLabel = formatPageLink([leftNum, rightNum].filter(Boolean));

    // FASE 1: desenha os slides uma única vez
    startPage(pairLabel);

    if (pdfIsPortrait && rightNum) {
      const halfGap = 4;
      const halfW = (COL_SLIDES_W - halfGap) / 2;
      await drawSlide(leftNum, MARGIN_X, MARGIN_Y, halfW, USABLE_H);
      await drawSlide(rightNum, MARGIN_X + halfW + halfGap, MARGIN_Y, halfW, USABLE_H);
    } else {
      const slideGapY = 6;
      const maxSlideH = (USABLE_H - slideGapY) / 2;
      await drawSlide(leftNum, MARGIN_X, MARGIN_Y, COL_SLIDES_W, maxSlideH);
      if (rightNum) await drawSlide(rightNum, MARGIN_X, MARGIN_Y + maxSlideH + slideGapY, COL_SLIDES_W, maxSlideH);
    }

    // FASE 2: desenha notas na coluna direita até estourar
    const linkedNotes = notebookPages.filter(note =>
      (note.linkedPdfPages || []).some(p => p === leftNum || p === rightNum)
    );
    const { renderedCount } = drawNotesInColumn(linkedNotes, COL_NOTES_X, MARGIN_Y, COL_NOTES_W, H - MARGIN_Y);

    // FASE 3: notas excedentes vão para página(s) só com notas
    const remainingNotes = linkedNotes.slice(renderedCount);
    if (remainingNotes.length > 0) {
      await drawExtraNotesPages(remainingNotes, leftNum, rightNum);
    }

    await new Promise(r => setTimeout(r, 0));
  }

  // 4. Recalcula total de páginas e redesenha rodapés
  totalPages = pageCounter;
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
