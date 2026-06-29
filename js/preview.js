// js/preview.js — Preview Markdown
export function updatePreview() {
  notePreview.innerHTML = marked.parse(noteEditor.value || '');
}

export function togglePreview() {
  previewMode = !previewMode;
  previewToggle.setAttribute('aria-pressed', previewMode);
  previewToggle.classList.toggle('active', previewMode);
  if (previewMode) {
    updatePreview();
    noteEditor.classList.add('hidden');
    notePreview.classList.remove('hidden');
  } else {
    notePreview.classList.add('hidden');
    noteEditor.classList.remove('hidden');
    focusEditor();
  }
}

previewToggle.addEventListener('click', togglePreview);

// Expõe globalmente
window.updatePreview = updatePreview;
window.togglePreview = togglePreview;
