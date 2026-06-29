// Estado
  export let pdfDocument = null;
  export let pdfFile = null;
  export let currentPageStart = 1;
  export let zoom = 1;
  export let totalPages = 0;
  export let notebookPages = [];
  export let currentNoteIndex = -1;
  export let activeTool = 'select';
  export let toolColor = '#FFD700';
  export let isDrawing = false;
  export let lastPoint = null;
  export let saveTimeout = null;
  export let previewMode = false;
  export let cropCache = new Map();

  const STORAGE_KEY = 'pdfnotes_session';
  const THEME_KEY = 'pdfnotes_theme';
  const SPLIT_KEY = 'pdfnotes_split';
