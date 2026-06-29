// js/toolbar.js — Toolbar ferramentas
toolBtns.forEach(btn => {
  btn.addEventListener('click', () => {
    activeTool = btn.dataset.tool;
    updateToolButtons();
  });
});
colorPicker.addEventListener('input', e => toolColor = e.target.value);

export function updateToolButtons() {
  toolBtns.forEach(b => b.classList.toggle('active', b.dataset.tool === activeTool));
  drawingOverlay.style.pointerEvents = activeTool === 'select' ? 'none' : 'auto';
}

// Expõe globalmente
window.updateToolButtons = updateToolButtons;
