import { getJsPDF, renderPageToImageObject, blobToArrayBuffer, slugify, formatPageLink, markdownToPlain } from './utils.js';

// A4 paisagem
const W = 297;
const H = 210;
const MARGIN_X = 10;
const MARGIN_Y = 10;
const GAP_COLS = 8;
const SLIDE_GAP_X = 6;

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

  const slideGapY = 6;
  const maxSlideH = (USABLE_H - slideGapY) / 2;

  async function drawSlide(pageNum, x, y, maxW, maxH) {
    if (!pageNum || pageNum > pdfDocument.numPages) return { w: 0, h: 0 };
    const { blob, width, height } = await renderPageToImageObject(pdfDocument, pageNum, 0.8);
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

  // 3. Loop principal por par de páginas
  let pageCounter = 0;
  const totalPairs = pagePairs.length;

  for (let i = 0; i < totalPairs; i++) {
    const [leftNum, rightNum] = pagePairs[i];
    const pct = Math.round((i / totalPairs) * 80) + 5;
    onProgress?.(pct, `Renderizando páginas ${leftNum}${rightNum ? ', ' + rightNum : ''}...`);

    if (i > 0 || pageCounter > 0) doc.addPage();
    pageCounter++;

    const pairLabel = formatPageLink([leftNum, rightNum].filter(Boolean));
    drawPageChrome(pairLabel, pageCounter, totalPairs);

    if (pdfIsPortrait && rightNum) {
      // Retrato: dois slides lado a lado dentro da coluna de slides
      const halfGap = 4;
      const halfW = (COL_SLIDES_W - halfGap) / 2;
      await drawSlide(leftNum, MARGIN_X, MARGIN_Y, halfW, USABLE_H);
      await drawSlide(rightNum, MARGIN_X + halfW + halfGap, MARGIN_Y, halfW, USABLE_H);
    } else {
      // Paisagem: dois slides empilhados
      await drawSlide(leftNum, MARGIN_X, MARGIN_Y, COL_SLIDES_W, maxSlideH);
      await drawSlide(rightNum, MARGIN_X, MARGIN_Y + maxSlideH + slideGapY, COL_SLIDES_W, maxSlideH);
    }

    // 4. Coluna de anotações
    const linkedNotes = notebookPages.filter(note =>
      (note.linkedPdfPages || []).some(p => p === leftNum || p === rightNum)
    );

    let cursorY = MARGIN_Y;
    const safeY = H - MARGIN_Y;

    if (linkedNotes.length > 0) {
      for (const note of linkedNotes) {
        // Nome da folha
        doc.setFontSize(12);
        doc.setFont(undefined, 'bold');
        doc.text(note.name?.trim() || 'Sem título', COL_NOTES_X, cursorY);
        cursorY += 6;

        // Vínculo
        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(120);
        doc.text(formatPageLink(note.linkedPdfPages), COL_NOTES_X, cursorY);
        cursorY += 4;
        doc.setTextColor(0);

        // Divisória
        doc.setDrawColor(220);
        doc.line(COL_NOTES_X, cursorY, COL_NOTES_X + COL_NOTES_W, cursorY);
        cursorY += 5;

        // Conteúdo
        const plain = markdownToPlain(note.content || 'Sem conteúdo.', { collapseBlankLines: true });
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(plain, COL_NOTES_W);
        const lineHeight = 4.5;
        const blockH = lines.length * lineHeight;

        // Quebra para página de continuação
        if (cursorY + blockH > safeY) {
          doc.addPage();
          pageCounter++;
          drawPageChrome(`${pairLabel} (cont.)`, pageCounter, null);
          cursorY = MARGIN_Y + 10;
        }

        doc.text(lines, COL_NOTES_X, cursorY);
        cursorY += blockH + 8;

        await new Promise(r => setTimeout(r, 0));
      }
    } else {
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text('Sem anotações para estas páginas.', COL_NOTES_X, cursorY);
      doc.setTextColor(0);
    }

    await new Promise(r => setTimeout(r, 0));
  }

  onProgress?.(98, 'Gerando PDF...');
  doc.save(`${slugify(title)}-anotacoes.pdf`);
  onProgress?.(100, 'Concluído');
}
