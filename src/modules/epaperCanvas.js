/**
 * SynkCard 600x800 Simulated E-Paper Display Engine
 * Implements hardware-authentic monochrome canvas, dithering algorithms,
 * realistic e-ink waveform flash refresh cycles, and audio feedback.
 */

export const CANVAS_WIDTH = 600;
export const CANVAS_HEIGHT = 800;

// Authentic e-paper color tones
export const EINK_PALETTE = {
  paperWhite: '#F3F2EB', // Warm reflective e-ink electrophoretic substrate
  paperDark: '#121212',  // Carbon black microcapsules
  rgbWhite: [243, 242, 235],
  rgbBlack: [18, 18, 18],
  gray1: '#555555',
  gray2: '#AAAAAA',
};

class EpaperDisplay {
  constructor(canvasElement) {
    this.canvas = canvasElement;
    this.canvas.width = CANVAS_WIDTH;
    this.canvas.height = CANVAS_HEIGHT;
    this.ctx = this.canvas.getContext('2d', { willReadFrequently: true });
    
    // Hidden offscreen canvas for compositing and raw pixel calculations
    this.offscreenCanvas = document.createElement('canvas');
    this.offscreenCanvas.width = CANVAS_WIDTH;
    this.offscreenCanvas.height = CANVAS_HEIGHT;
    this.offscreenCtx = this.offscreenCanvas.getContext('2d', { willReadFrequently: true });

    this.isRefreshing = false;
    this.soundEnabled = true;
    this.audioCtx = null;

    this.clearDisplay();
  }

  getCanvas() {
    return this.canvas;
  }

  getContext() {
    return this.ctx;
  }

  clearDisplay() {
    this.ctx.fillStyle = EINK_PALETTE.paperWhite;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  /**
   * Generates a subtle, authentic hardware e-paper tactile click via Web Audio API
   */
  playTactileClick() {
    if (!this.soundEnabled) return;
    try {
      if (!this.audioCtx) {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        if (AudioContext) this.audioCtx = new AudioContext();
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }
      if (!this.audioCtx) return;

      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      const now = this.audioCtx.currentTime;

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(120, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.05);

      gain.gain.setValueAtTime(0.12, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch {
      // Audio not permitted or supported; silent fail
    }
  }

  /**
   * Simulates the iconic physical e-paper multi-stage waveform refresh:
   * 1. Black flash (electrophoretic charge alignment)
   * 2. White flash (ghosting clearing)
   * 3. Final image settlement
   */
  async triggerRefreshAnimation(onRenderFrame = null) {
    if (this.isRefreshing) return;
    this.isRefreshing = true;
    this.playTactileClick();

    const parentFrame = this.canvas.closest('.epaper-bezel');
    if (parentFrame) {
      parentFrame.classList.add('refreshing');
    }

    // Save target drawing in offscreen canvas first
    if (onRenderFrame) {
      this.offscreenCtx.fillStyle = EINK_PALETTE.paperWhite;
      this.offscreenCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      onRenderFrame(this.offscreenCtx);
    } else {
      this.offscreenCtx.drawImage(this.canvas, 0, 0);
    }

    // Phase 1: Flash black
    this.ctx.fillStyle = EINK_PALETTE.paperDark;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    await new Promise((r) => setTimeout(r, 110));

    // Phase 2: Flash white
    this.ctx.fillStyle = EINK_PALETTE.paperWhite;
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.playTactileClick();
    await new Promise((r) => setTimeout(r, 130));

    // Phase 3: Paint target image
    this.ctx.drawImage(this.offscreenCanvas, 0, 0);
    await new Promise((r) => setTimeout(r, 80));

    if (parentFrame) {
      parentFrame.classList.remove('refreshing');
    }
    this.isRefreshing = false;
  }

  /**
   * Floyd-Steinberg error diffusion dithering
   * Converts any RGB imageData into authentic 1-bit monochrome e-ink
   */
  applyFloydSteinbergDither(imageData) {
    const data = imageData.data;
    const w = imageData.width;
    const h = imageData.height;

    // Convert to grayscale luminance array for error diffusion
    const gray = new Float32Array(w * h);
    for (let i = 0; i < data.length; i += 4) {
      // Perceived luminance
      gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const oldVal = gray[idx];
        const newVal = oldVal < 128 ? 0 : 255;
        const err = oldVal - newVal;

        gray[idx] = newVal;

        if (x + 1 < w) gray[idx + 1] += (err * 7) / 16;
        if (x - 1 >= 0 && y + 1 < h) gray[idx + w - 1] += (err * 3) / 16;
        if (y + 1 < h) gray[idx + w] += (err * 5) / 16;
        if (x + 1 < w && y + 1 < h) gray[idx + w + 1] += (err * 1) / 16;
      }
    }

    // Write back monochrome e-ink pixels
    const [wR, wG, wB] = EINK_PALETTE.rgbWhite;
    const [bR, bG, bB] = EINK_PALETTE.rgbBlack;

    for (let i = 0; i < gray.length; i++) {
      const isWhite = gray[i] > 127;
      const pIdx = i * 4;
      data[pIdx] = isWhite ? wR : bR;
      data[pIdx + 1] = isWhite ? wG : bG;
      data[pIdx + 2] = isWhite ? wB : bB;
      data[pIdx + 3] = 255;
    }

    return imageData;
  }

  /**
   * Atkinson Dithering (Iconic classic Mac / e-ink aesthetic)
   */
  applyAtkinsonDither(imageData) {
    const data = imageData.data;
    const w = imageData.width;
    const h = imageData.height;

    const gray = new Float32Array(w * h);
    for (let i = 0; i < data.length; i += 4) {
      gray[i / 4] = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    }

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const idx = y * w + x;
        const oldVal = gray[idx];
        const newVal = oldVal < 128 ? 0 : 255;
        const err = (oldVal - newVal) / 8;

        gray[idx] = newVal;

        if (x + 1 < w) gray[idx + 1] += err;
        if (x + 2 < w) gray[idx + 2] += err;
        if (x - 1 >= 0 && y + 1 < h) gray[idx + w - 1] += err;
        if (y + 1 < h) gray[idx + w] += err;
        if (x + 1 < w && y + 1 < h) gray[idx + w + 1] += err;
        if (y + 2 < h) gray[idx + 2 * w] += err;
      }
    }

    const [wR, wG, wB] = EINK_PALETTE.rgbWhite;
    const [bR, bG, bB] = EINK_PALETTE.rgbBlack;

    for (let i = 0; i < gray.length; i++) {
      const isWhite = gray[i] > 127;
      const pIdx = i * 4;
      data[pIdx] = isWhite ? wR : bR;
      data[pIdx + 1] = isWhite ? wG : bG;
      data[pIdx + 2] = isWhite ? wB : bB;
      data[pIdx + 3] = 255;
    }

    return imageData;
  }

  /**
   * Ordered Bayer 4x4 Dithering
   */
  applyBayerDither(imageData) {
    const data = imageData.data;
    const w = imageData.width;
    const h = imageData.height;

    const bayer4x4 = [
      [ 0,  8,  2, 10],
      [12,  4, 14,  6],
      [ 3, 11,  1,  9],
      [15,  7, 13,  5]
    ];

    const [wR, wG, wB] = EINK_PALETTE.rgbWhite;
    const [bR, bG, bB] = EINK_PALETTE.rgbBlack;

    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const pIdx = (y * w + x) * 4;
        const lum = 0.299 * data[pIdx] + 0.587 * data[pIdx + 1] + 0.114 * data[pIdx + 2];
        const threshold = ((bayer4x4[y % 4][x % 4] + 0.5) / 16) * 255;
        const isWhite = lum > threshold;

        data[pIdx] = isWhite ? wR : bR;
        data[pIdx + 1] = isWhite ? wG : bG;
        data[pIdx + 2] = isWhite ? wB : bB;
        data[pIdx + 3] = 255;
      }
    }

    return imageData;
  }

  /**
   * High contrast 1-bit threshold
   */
  applyThreshold(imageData, threshold = 128) {
    const data = imageData.data;
    const [wR, wG, wB] = EINK_PALETTE.rgbWhite;
    const [bR, bG, bB] = EINK_PALETTE.rgbBlack;

    for (let i = 0; i < data.length; i += 4) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      const isWhite = lum > threshold;
      data[i] = isWhite ? wR : bR;
      data[i + 1] = isWhite ? wG : bG;
      data[i + 2] = isWhite ? wB : bB;
      data[i + 3] = 255;
    }
    return imageData;
  }

  /**
   * Exports the canvas as a base64 DataURL (image/png)
   */
  getDataURL(type = 'image/png') {
    return this.canvas.toDataURL(type);
  }

  /**
   * Downloads the current 600x800 e-paper screen
   */
  downloadScreen(filename = 'synkcard_epaper_600x800.png') {
    const link = document.createElement('a');
    link.download = filename;
    link.href = this.getDataURL('image/png');
    link.click();
  }
}

export default EpaperDisplay;
