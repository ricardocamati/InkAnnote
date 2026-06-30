import { getJsPDF } from './utils.js';
import { renderPageToDataURL, slugify, formatPageLink } from './utils.js';

export async function exportPdfWithNotes(session, { includeAllSlides } = {}) {
  const { fileName, pdfDocument, notebookPages, onProgress } = session;
  const jsPDF = await getJsPDF();
  const doc = new jsPDF('p', 'mm', 'a4');
  const W = 210, marginX = 10, imgW = W - marginX * 2;
  const imgH = imgW * (9 / 16);
  const title = (fileName || 'anotacoes').replace(/\.pdf$/i, '');
  let firstPage = true;

  let pagePairs;
  if (includeAllSlides) {
    pagePairs = [];
    for (let i = 1; i <= pdfDocument.numPages; i += 2) {
      pagePairs.push([i, i + 1 <= pdfDocument.numPages ? i + 1 : null]);
    }
  } else {
    const linkedPages = new Set();
    for (const note of notebookPages) {
      (note.linkedPdfPages || []).forEach(p => linkedPages.add(p));
    }
    pagePairs = [...linkedPages].sort((a, b) => a - b).map(p => [p, null]);
  }

  for (let i = 0; i < pagePairs.length; i++) {
    const [pageNumA, pageNumB] = pagePairs[i];
    const pct = Math.round((i / pagePairs.length) * 80) + 5;
    onProgress?.(pct, `Renderizando página ${pageNumA}${pageNumB ? '-' + pageNumB : ''}...`);

    if (!firstPage) doc.addPage();
    firstPage = false;

    const dataA = await renderPageToDataURL(pdfDocument, pageNumA, 2);
    doc.addImage(dataA, 'PNG', marginX, 10, imgW, imgH);

    if (pageNumB) {
      const dataB = await renderPageToDataURL(pdfDocument, pageNumB, 2);
      doc.addImage(dataB, 'PNG', marginX, 10 + imgH + 3, imgW, imgH);
    }

    const linkedNotes = notebookPages.filter(note =>
      (note.linkedPdfPages || []).some(p => p === pageNumA || p === pageNumB)
    );

    let cursorY = 10 + imgH * (pageNumB ? 2 : 1) + (pageNumB ? 9 : 5);

    doc.setDrawColor(200);
    doc.line(marginX, cursorY, W - marginX, cursorY);
    cursorY += 5;

    if (linkedNotes.length > 0) {
      for (const note of linkedNotes) {
        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(note.name?.trim() || 'Sem título', marginX, cursorY);
        cursorY += 5;

        doc.setFontSize(9);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(120);
        doc.text(formatPageLink(note.linkedPdfPages), marginX, cursorY);
        cursorY += 5;
        doc.setTextColor(0);

        const plainText = (note.content || '')
          .replace(/^#{1,6}\s/gm, '')
          .replace(/\*\*(.+?)\*\*/g, '$1')
          .replace(/\*(.+?)\*/g, '$1')
          .replace(/`(.+?)`/g, '$1')
          .replace(/^[-*]\s/gm, '• ');

        doc.setFontSize(10);
        const lines = doc.splitTextToSize(plainText || 'Sem conteúdo.', imgW);
        doc.text(lines, marginX, cursorY);
        cursorY += lines.length * 5 + 8;
      }
    } else {
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text('Sem anotações para estas páginas.', marginX, cursorY);
      doc.setTextColor(0);
    }
  }

  onProgress?.(98, 'Gerando PDF...');
  doc.save(`${slugify(title)}-anotacoes.pdf`);
}