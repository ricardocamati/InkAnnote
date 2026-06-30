import { getJsPDF, renderPageToDataURL, slugify, formatPageLink, markdownToPlain } from './utils.js';

const W = 210;
const H = 297;
const MARGIN_X = 10;
const MARGIN_Y = 10;
const CONTENT_W = W - MARGIN_X * 2;

export async function exportPdfWithNotes(session, { includeAllSlides } = {}) {
  const { fileName, pdfDocument, notebookPages, onProgress } = session;
  const jsPDF = await getJsPDF();
  const doc = new jsPDF('p', 'mm', 'a4');
  const title = (fileName || 'anotacoes').replace(/\.pdf$/i, '');

  let pages;
  if (includeAllSlides) {
    pages = [];
    for (let i = 1; i <= pdfDocument.numPages; i++) {
      pages.push(i);
    }
  } else {
    const linked = new Set();
    for (const note of notebookPages) {
      (note.linkedPdfPages || []).forEach(p => linked.add(p));
    }
    pages = [...linked].sort((a, b) => a - b);
  }

  const imgW = CONTENT_W;
  const maxImgH = (H / 2) - MARGIN_Y * 2;

  for (let i = 0; i < pages.length; i++) {
    const pageNum = pages[i];
    const pct = Math.round((i / pages.length) * 80) + 5;
    onProgress?.(pct, `Renderizando página ${pageNum}...`);

    if (i > 0) doc.addPage();

    const dataURL = await renderPageToDataURL(pdfDocument, pageNum, 0.8);
    const tmpPage = await pdfDocument.getPage(pageNum);
    const tmpVp = tmpPage.getViewport({ scale: 1 });
    const ratio = tmpVp.height / tmpVp.width;
    const imgH = Math.min(imgW * ratio, maxImgH);

    doc.addImage(dataURL, 'PNG', MARGIN_X, MARGIN_Y, imgW, imgH);

    const linkedNotes = notebookPages.filter(note =>
      (note.linkedPdfPages || []).some(p => p === pageNum)
    );

    let cursorY = MARGIN_Y + imgH + 8;
    const safeY = H - MARGIN_Y;

    doc.setDrawColor(200);
    doc.line(MARGIN_X, cursorY - 4, W - MARGIN_X, cursorY - 4);

    if (linkedNotes.length > 0) {
      for (const note of linkedNotes) {
        if (cursorY > safeY - 20) { doc.addPage(); cursorY = MARGIN_Y; }

        doc.setFontSize(11);
        doc.setFont(undefined, 'bold');
        doc.text(note.name?.trim() || 'Sem título', MARGIN_X, cursorY);
        cursorY += 6;

        doc.setFontSize(8);
        doc.setFont(undefined, 'normal');
        doc.setTextColor(120);
        doc.text(formatPageLink(note.linkedPdfPages), MARGIN_X, cursorY);
        cursorY += 5;
        doc.setTextColor(0);

        const plain = markdownToPlain(note.content || 'Sem conteúdo.', { collapseBlankLines: true });
        doc.setFontSize(10);
        const lines = doc.splitTextToSize(plain, CONTENT_W);
        const lineHeight = 4.5;
        const blockH = lines.length * lineHeight;

        if (cursorY + blockH > safeY) {
          doc.addPage();
          cursorY = MARGIN_Y;
        }

        doc.text(lines, MARGIN_X, cursorY);
        cursorY += blockH + 8;
      }
    } else {
      doc.setFontSize(10);
      doc.setTextColor(150);
      doc.text('Sem anotações para esta página.', MARGIN_X, cursorY);
      doc.setTextColor(0);
    }

    // Libera memória a cada página
    await new Promise(r => setTimeout(r, 0));
  }

  onProgress?.(98, 'Gerando PDF...');
  doc.save(`${slugify(title)}-anotacoes.pdf`);
  onProgress?.(100, 'Concluído');
}