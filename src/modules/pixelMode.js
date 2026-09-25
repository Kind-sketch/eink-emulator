/**
 * Pixel-Art Creation Mode for SynkCard 600x800 e-Paper
 * Optimized for touchscreens (pointer capture, no accidental scroll)
 */
import { CANVAS_WIDTH, CANVAS_HEIGHT, EINK_PALETTE } from './epaperCanvas.js';

export const PIXEL_PRESETS = {
  chip: {
    name: 'Microchip',
    size: 24,
    data: [
      "000000000000000000000000",
      "000100100100100100100000",
      "000100100100100100100000",
      "011111111111111111111110",
      "010000000000000000000010",
      "110111111111111111110011",
      "010100000000000000010010",
      "010101111111111110010010",
      "110101000000000010010011",
      "010101011111110010010010",
      "010101010000010010010010",
      "110101010110010010010011",
      "110101010110010010010011",
      "010101010000010010010010",
      "010101011111110010010010",
      "110101000000000010010011",
      "010101111111111110010010",
      "010100000000000000010010",
      "110111111111111111110011",
      "010000000000000000000010",
      "011111111111111111111110",
      "000100100100100100100000",
      "000100100100100100100000",
      "000000000000000000000000"
    ]
  },
  heart: {
    name: 'Pixel Heart',
    size: 16,
    data: [
      "0000000000000000",
      "0011100000111000",
      "0111110001111100",
      "1111111011111110",
      "1111111111111110",
      "1111111111111110",
      "1111111111111110",
      "0111111111111100",
      "0011111111111000",
      "0001111111110000",
      "0000111111100000",
      "0000011111000000",
      "0000001110000000",
      "0000000100000000",
      "0000000000000000",
      "0000000000000000"
    ]
  },
  gameboy: {
    name: 'Retro Console',
    size: 24,
    data: [
      "000000000000000000000000",
      "001111111111111111110000",
      "011111111111111111111000",
      "011000000000000000111000",
      "011011111111111100111000",
      "011010000000000100111000",
      "011010111111100100111000",
      "011010100000100100111000",
      "011010101100100100111000",
      "011010000000000100111000",
      "011011111111111100111000",
      "011000000000000000111000",
      "011111111111111111111000",
      "011100011111111100111000",
      "011010001111111101111000",
      "011111001111111100111000",
      "011100011111111111111000",
      "011111111111111111111000",
      "011111100111001111111000",
      "011111100111001111111000",
      "011111111111111111111000",
      "001111111111111111110000",
      "000000000000000000000000",
      "000000000000000000000000"
    ]
  },
  wifi: {
    name: 'Wireless Signal',
    size: 16,
    data: [
      "0000000000000000",
      "0001111111111000",
      "0011000000001100",
      "0100011111000010",
      "1001100000110001",
      "0010001110001000",
      "0000110001100000",
      "0001000100010000",
      "0000011111000000",
      "0000100000100000",
      "0000001110000000",
      "0000011111000000",
      "0000011111000000",
      "0000001110000000",
      "0000000000000000",
      "0000000000000000"
    ]
  }
};

export class PixelMode {
  constructor(epaperDisplay, editorCanvas) {
    this.display = epaperDisplay;
    this.editorCanvas = editorCanvas;
    this.editorCtx = this.editorCanvas.getContext('2d');

    this.gridSize = 24; // 16, 24, 32, 48
    this.pixels = this._createGrid(this.gridSize); // 2D array of 0 (white) or 1 (black)
    this.currentTool = 'pencil'; // 'pencil', 'eraser', 'fill'
    this.isDrawing = false;
    this.label = 'PIXEL ART';

    this._bindEvents();
    this.loadPreset('chip');
  }

  _createGrid(size) {
    const grid = [];
    for (let r = 0; r < size; r++) {
      grid.push(new Uint8Array(size));
    }
    return grid;
  }

  setGridSize(size) {
    this.gridSize = size;
    this.pixels = this._createGrid(size);
    this.drawEditor();
    this.render();
  }

  setTool(tool) {
    this.currentTool = tool;
  }

  setLabel(text) {
    this.label = text;
    this.render();
  }

  clear() {
    for (let r = 0; r < this.gridSize; r++) {
      this.pixels[r].fill(0);
    }
    this.drawEditor();
    this.render();
  }

  invert() {
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        this.pixels[r][c] = this.pixels[r][c] === 1 ? 0 : 1;
      }
    }
    this.drawEditor();
    this.render();
  }

  loadPreset(presetKey) {
    const preset = PIXEL_PRESETS[presetKey];
    if (!preset) return;
    this.gridSize = preset.size;
    this.pixels = this._createGrid(preset.size);
    this.label = preset.name.toUpperCase();

    for (let r = 0; r < preset.size; r++) {
      const rowStr = preset.data[r] || '';
      for (let c = 0; c < preset.size; c++) {
        this.pixels[r][c] = rowStr[c] === '1' ? 1 : 0;
      }
    }

    this.drawEditor();
    this.render();
  }

  _bindEvents() {
    const canvas = this.editorCanvas;

    const getCoord = (e) => {
      const rect = canvas.getBoundingClientRect();
      const clientX = e.clientX ?? e.touches?.[0]?.clientX;
      const clientY = e.clientY ?? e.touches?.[0]?.clientY;
      const x = clientX - rect.left;
      const y = clientY - rect.top;
      const cellW = rect.width / this.gridSize;
      const cellH = rect.height / this.gridSize;
      const col = Math.floor(x / cellW);
      const row = Math.floor(y / cellH);
      return {
        row: Math.max(0, Math.min(this.gridSize - 1, row)),
        col: Math.max(0, Math.min(this.gridSize - 1, col)),
      };
    };

    const handlePointerAction = (e) => {
      const { row, col } = getCoord(e);
      if (this.currentTool === 'fill') {
        this._floodFill(row, col, this.pixels[row][col] === 1 ? 0 : 1);
      } else {
        const val = this.currentTool === 'eraser' ? 0 : 1;
        this.pixels[row][col] = val;
      }
      this.drawEditor();
      this.render();
    };

    canvas.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      canvas.setPointerCapture(e.pointerId);
      this.isDrawing = true;
      handlePointerAction(e);
    });

    canvas.addEventListener('pointermove', (e) => {
      if (!this.isDrawing || this.currentTool === 'fill') return;
      e.preventDefault();
      handlePointerAction(e);
    });

    const stopDrawing = (e) => {
      if (this.isDrawing) {
        this.isDrawing = false;
        try {
          canvas.releasePointerCapture(e.pointerId);
        } catch {}
      }
    };

    canvas.addEventListener('pointerup', stopDrawing);
    canvas.addEventListener('pointercancel', stopDrawing);
  }

  _floodFill(startRow, startCol, targetVal) {
    const srcVal = this.pixels[startRow][startCol];
    if (srcVal === targetVal) return;

    const queue = [[startRow, startCol]];
    const visited = new Set();

    while (queue.length > 0) {
      const [r, c] = queue.pop();
      const key = `${r},${c}`;
      if (visited.has(key)) continue;
      visited.add(key);

      if (this.pixels[r][c] === srcVal) {
        this.pixels[r][c] = targetVal;
        if (r > 0) queue.push([r - 1, c]);
        if (r < this.gridSize - 1) queue.push([r + 1, c]);
        if (c > 0) queue.push([r, c - 1]);
        if (c < this.gridSize - 1) queue.push([r, c + 1]);
      }
    }
  }

  /**
   * Draws the interactive pixel-art editor grid
   */
  drawEditor() {
    const canvas = this.editorCanvas;
    const ctx = this.editorCtx;
    const w = canvas.width;
    const h = canvas.height;
    const cellW = w / this.gridSize;
    const cellH = h / this.gridSize;

    ctx.clearRect(0, 0, w, h);

    // Background checkerboard
    ctx.fillStyle = '#f3f2eb';
    ctx.fillRect(0, 0, w, h);

    // Draw active pixels
    ctx.fillStyle = '#141414';
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        if (this.pixels[r][c] === 1) {
          ctx.fillRect(c * cellW, r * cellH, cellW, cellH);
        }
      }
    }

    // Grid lines
    ctx.strokeStyle = 'rgba(0,0,0,0.15)';
    ctx.lineWidth = 1;
    for (let i = 0; i <= this.gridSize; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cellW, 0);
      ctx.lineTo(i * cellW, h);
      ctx.stroke();

      ctx.beginPath();
      ctx.moveTo(0, i * cellH);
      ctx.lineTo(w, i * cellH);
      ctx.stroke();
    }
  }

  /**
   * Renders the pixel art onto the 600x800 e-paper display canvas
   */
  render() {
    const ctx = this.display.getContext();
    this.renderToContext(ctx);
  }

  renderToContext(ctx) {
    // Paper background
    ctx.fillStyle = EINK_PALETTE.paperWhite;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Hardware frame border
    ctx.strokeStyle = EINK_PALETTE.paperDark;
    ctx.lineWidth = 4;
    ctx.strokeRect(36, 36, CANVAS_WIDTH - 72, CANVAS_HEIGHT - 72);

    // Header tag
    ctx.fillStyle = EINK_PALETTE.paperDark;
    ctx.fillRect(48, 50, 150, 26);
    ctx.fillStyle = EINK_PALETTE.paperWhite;
    ctx.font = 'bold 13px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`PIXEL // ${this.gridSize}x${this.gridSize}`, 123, 68);

    // Pixel Art Display Box
    const artBoxSize = 460;
    const artBoxX = (CANVAS_WIDTH - artBoxSize) / 2;
    const artBoxY = 120;
    const cellSize = artBoxSize / this.gridSize;

    // Outer art border
    ctx.strokeStyle = EINK_PALETTE.paperDark;
    ctx.lineWidth = 3;
    ctx.strokeRect(artBoxX - 2, artBoxY - 2, artBoxSize + 4, artBoxSize + 4);

    // Render big crisp pixels
    ctx.fillStyle = EINK_PALETTE.paperDark;
    for (let r = 0; r < this.gridSize; r++) {
      for (let c = 0; c < this.gridSize; c++) {
        if (this.pixels[r][c] === 1) {
          ctx.fillRect(artBoxX + c * cellSize, artBoxY + r * cellSize, cellSize, cellSize);
        }
      }
    }

    // Bottom info / label
    ctx.fillStyle = EINK_PALETTE.paperDark;
    ctx.font = '900 32px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.label, CANVAS_WIDTH / 2, 650);

    ctx.font = '600 16px "JetBrains Mono", monospace';
    ctx.fillText('CUSTOM 1-BIT GLYPH • SYNKCARD', CANVAS_WIDTH / 2, 685);

    // Technical barcode decoration at bottom
    this._renderBarcode(ctx, 160, 715, 280, 24);
  }

  _renderBarcode(ctx, x, y, width, height) {
    ctx.fillStyle = EINK_PALETTE.paperDark;
    let curX = x;
    const barWidths = [2, 4, 1, 6, 2, 1, 5, 2, 4, 2, 1, 7, 3, 2, 5, 2, 3, 1, 6, 3, 2, 4];
    let i = 0;
    while (curX < x + width) {
      const bw = barWidths[i % barWidths.length];
      if (i % 2 === 0) {
        ctx.fillRect(curX, y, bw, height);
      }
      curX += bw;
      i++;
    }
  }

  getPayload() {
    return {
      image: this.display.getDataURL('image/png'),
      format: 'monochrome-png',
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      mode: 'pixel-art',
      gridSize: this.gridSize,
      label: this.label,
    };
  }
}
