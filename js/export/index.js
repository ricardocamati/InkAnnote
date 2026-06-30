import { exportMarkdown } from './exporter-md.js';
import { exportObsidianVault } from './exporter-zip.js';
import { exportPdfWithNotes } from './exporter-pdf.js';

export async function exportTo(type, session) {
  if (!session) {
    throw new Error('A sessão de exportação é obrigatória.');
  }
  if (!Array.isArray(session.notebookPages)) {
    throw new Error('O notebookPages da sessão deve ser um array válido.');
  }

  switch (type) {
    case 'md-notion':   return exportMarkdown(session, { mode: 'notion' });
    case 'md-plain':    return exportMarkdown(session, { mode: 'plain' });
    case 'obsidian-zip': return exportObsidianVault(session);
    case 'pdf-notes':   return exportPdfWithNotes(session, { includeAllSlides: false });
    case 'pdf-full':    return exportPdfWithNotes(session, { includeAllSlides: true });
    default: throw new Error(`Tipo de exportação desconhecido: ${type}`);
  }
}