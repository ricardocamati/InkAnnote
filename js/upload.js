// Upload
  function handleFile(file) {
    if (!file || file.type !== 'application/pdf') {
      const name = file ? file.name.toLowerCase() : '';
      if (!name.endsWith('.pdf')) {
        showError('Por favor, envie um arquivo PDF válido.');
        return;
      }
    }
    uploadError.classList.add('hidden');
    pdfFile = file;
    fileNameEl.textContent = file.name;
    openPdf(file);
  }

  openFileBtn.addEventListener('click', e => {
    e.stopPropagation();
    pdfInput.click();
  });
  pdfInput.addEventListener('change', e => {
    if (e.target.files[0]) handleFile(e.target.files[0]);
  });
  dropZone.addEventListener('click', e => {
    e.stopPropagation();
    pdfInput.click();
  });
  dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('dragover'); });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('dragover'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('dragover');
    handleFile(e.dataTransfer.files[0]);
  });
  newFileBtn.addEventListener('click', () => pdfInput.click());

    } catch (err) {
    console.error('[PDFNotes] Erro fatal na inicialização:', err);
  }
})();
