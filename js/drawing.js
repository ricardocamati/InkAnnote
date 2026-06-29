// Desenho sobre o PDF
  function getOverlayPoint(e) {
    const rect = drawingOverlay.getBoundingClientRect();
    const scaleX = drawingOverlay.width / rect.width;
    const scaleY = drawingOverlay.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  }

  function resizeDrawingOverlay() {
    drawingOverlay.width = pdfContainer.clientWidth;
    drawingOverlay.height = pdfContainer.clientHeight;
  }

  function clearOverlay() {
    const ctx = drawingOverlay.getContext('2d');
    ctx.clearRect(0, 0, drawingOverlay.width, drawingOverlay.height);
  }

  const overlayCtx = drawingOverlay.getContext('2d');

  drawingOverlay.addEventListener('pointerdown', e => {
    if (activeTool === 'select') return;
    isDrawing = true;
    lastPoint = getOverlayPoint(e);
    drawingOverlay.setPointerCapture(e.pointerId);
  });

  drawingOverlay.addEventListener('pointermove', e => {
    if (!isDrawing || activeTool === 'select') return;
    const point = getOverlayPoint(e);
    overlayCtx.lineCap = 'round';
    overlayCtx.lineJoin = 'round';
    if (activeTool === 'eraser') {
      overlayCtx.globalCompositeOperation = 'destination-out';
      overlayCtx.lineWidth = 16;
    } else {
      overlayCtx.globalCompositeOperation = 'source-over';
      overlayCtx.strokeStyle = activeTool === 'highlight' ? toolColor + '88' : toolColor;
      overlayCtx.lineWidth = activeTool === 'highlight' ? 18 : 3;
    }
    overlayCtx.beginPath();
    overlayCtx.moveTo(lastPoint.x, lastPoint.y);
    overlayCtx.lineTo(point.x, point.y);
    overlayCtx.stroke();
    lastPoint = point;
  });

  const stopDrawing = () => { isDrawing = false; lastPoint = null; };
  drawingOverlay.addEventListener('pointerup', stopDrawing);
  drawingOverlay.addEventListener('pointerleave', stopDrawing);
