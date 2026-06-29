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
