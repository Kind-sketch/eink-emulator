/**
 * Image Upload & Dithering Processing Mode for 600x800 e-Paper
 */
import { CANVAS_WIDTH, CANVAS_HEIGHT, EINK_PALETTE } from './epaperCanvas.js';

export class ImageMode {
  constructor(epaperDisplay) {
    this.display = epaperDisplay;
    this.currentImage = null; // HTMLImageElement
    this.state = {
      brightness: 0,    // -100 to 100
      contrast: 15,     // -100 to 100
      invert: false,
      algorithm: 'floyd', // 'floyd', 'atkinson', 'bayer', 'threshold'
      scaleMode: 'fit',   // 'fit', 'cover'
      caption: '',
    };

    // Load initial sample generator
    this._loadDefaultPreset();
  }

  updateState(partial) {
    this.state = { ...this.state, ...partial };
    this.render();
  }

  handleFileUpload(file) {
    return new Promise((resolve, reject) => {
      if (!file || !file.type.startsWith('image/')) {
        return reject(new Error('Please upload a valid image file.'));
      }

      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          this.currentImage = img;
          this.render();
          resolve(img);
        };
        img.onerror = () => reject(new Error('Failed to load image.'));
        img.src = e.target.result;
      };
      reader.onerror = () => reject(new Error('Failed to read file.'));
      reader.readAsDataURL(file);
    });
  }

  loadSamplePreset(presetType) {
    const canvas = document.createElement('canvas');
    canvas.width = 600;
    canvas.height = 800;
    const ctx = canvas.getContext('2d');

    if (presetType === 'hardware') {
      // Circuit board / IC schematic art
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 600, 800);
      ctx.fillStyle = '#111111';
      ctx.strokeStyle = '#111111';

      // Circuit traces
      ctx.lineWidth = 4;
      for (let y = 80; y < 720; y += 40) {
        ctx.beginPath();
        ctx.moveTo(60, y);
        ctx.lineTo(240, y);
        ctx.lineTo(300, y + (y % 80 === 0 ? 30 : -30));
        ctx.lineTo(540, y + (y % 80 === 0 ? 30 : -30));
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(60, y, 6, 0, Math.PI * 2);
        ctx.fill();

        ctx.beginPath();
        ctx.arc(540, y + (y % 80 === 0 ? 30 : -30), 6, 0, Math.PI * 2);
        ctx.fill();
      }

      // Central Chip
      ctx.fillRect(180, 260, 240, 240);
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 26px monospace';
      ctx.textAlign = 'center';
      ctx.fillText('JETSON ORIN', 300, 370);
      ctx.font = '16px monospace';
      ctx.fillText('SOC // EDGE AI', 300, 410);

      ctx.fillStyle = '#111111';
      ctx.font = 'bold 32px monospace';
      ctx.fillText('SYNKCARD EMBEDDED', 300, 640);
      ctx.font = '18px monospace';
      ctx.fillText('600x800 LOW POWER EPD', 300, 680);
    } else if (presetType === 'emblem') {
      // University / Tech badge crest
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 600, 800);
      ctx.fillStyle = '#111111';
      ctx.strokeStyle = '#111111';

      // Outer rings
      ctx.lineWidth = 8;
      ctx.beginPath();
      ctx.arc(300, 360, 220, 0, Math.PI * 2);
      ctx.stroke();

      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(300, 360, 195, 0, Math.PI * 2);
      ctx.stroke();

      // Gear teeth around ring
      for (let a = 0; a < Math.PI * 2; a += Math.PI / 10) {
        const x1 = 300 + Math.cos(a) * 220;
        const y1 = 360 + Math.sin(a) * 220;
        const x2 = 300 + Math.cos(a) * 238;
        const y2 = 360 + Math.sin(a) * 238;
        ctx.lineWidth = 10;
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      }

      // Inner Symbol
      ctx.font = '900 84px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('⚡', 300, 390);

      ctx.font = '900 32px sans-serif';
      ctx.fillText('COLLEGE OF ENGINEERING', 300, 640);
      ctx.font = '600 20px monospace';
      ctx.fillText('AUTONOMOUS EDGE HARDWARE LAB', 300, 680);
    } else {
      // Geometric generative artwork
      ctx.fillStyle = '#f8f8f8';
      ctx.fillRect(0, 0, 600, 800);
      ctx.strokeStyle = '#222222';
      ctx.lineWidth = 2;

      for (let r = 20; r < 280; r += 14) {
        ctx.beginPath();
        ctx.arc(300, 400, r, 0, Math.PI * 2);
        ctx.stroke();
      }

      for (let i = 0; i < 36; i++) {
        const rad = (i * 10 * Math.PI) / 180;
        ctx.beginPath();
        ctx.moveTo(300, 400);
        ctx.lineTo(300 + Math.cos(rad) * 290, 400 + Math.sin(rad) * 290);
        ctx.stroke();
      }
    }

    const img = new Image();
    img.onload = () => {
      this.currentImage = img;
      this.render();
    };
    img.src = canvas.toDataURL();
  }

  _loadDefaultPreset() {
    this.loadSamplePreset('hardware');
  }

  render() {
    if (!this.currentImage) return;
    const ctx = this.display.getContext();
    this.renderToContext(ctx);
  }

  renderToContext(ctx) {
    if (!this.currentImage) return;

    // Clear background
    ctx.fillStyle = EINK_PALETTE.paperWhite;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Compute aspect ratio scaling
    const img = this.currentImage;
    const targetW = CANVAS_WIDTH;
    const targetH = this.state.caption ? CANVAS_HEIGHT - 60 : CANVAS_HEIGHT;

    let drawW, drawH, drawX, drawY;

    if (this.state.scaleMode === 'cover') {
      const scale = Math.max(targetW / img.width, targetH / img.height);
      drawW = img.width * scale;
      drawH = img.height * scale;
      drawX = (targetW - drawW) / 2;
      drawY = (targetH - drawH) / 2;
    } else {
      // fit
      const scale = Math.min(targetW / img.width, targetH / img.height);
      drawW = img.width * scale;
      drawH = img.height * scale;
      drawX = (targetW - drawW) / 2;
      drawY = (targetH - drawH) / 2;
    }

    // Draw source image to offscreen canvas for manipulation
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = CANVAS_WIDTH;
    tempCanvas.height = CANVAS_HEIGHT;
    const tempCtx = tempCanvas.getContext('2d');
    tempCtx.fillStyle = '#ffffff';
    tempCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    tempCtx.drawImage(img, drawX, drawY, drawW, drawH);

    // Get pixel data
    const imgData = tempCtx.getImageData(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    const data = imgData.data;

    // Apply Brightness & Contrast
    // Contrast formula: factor = (259 * (contrast + 255)) / (255 * (259 - contrast))
    const cFactor = (259 * (this.state.contrast + 255)) / (255 * (259 - this.state.contrast));
    const bAdd = this.state.brightness * 2.55;

    for (let i = 0; i < data.length; i += 4) {
      for (let c = 0; c < 3; c++) {
        let val = data[i + c];
        // Brightness
        val += bAdd;
        // Contrast
        val = cFactor * (val - 128) + 128;
        // Clamp
        val = Math.max(0, Math.min(255, val));
        // Invert if active
        if (this.state.invert) {
          val = 255 - val;
        }
        data[i + c] = val;
      }
    }

    // Apply selected dithering algorithm
    let dithered;
    switch (this.state.algorithm) {
      case 'atkinson':
        dithered = this.display.applyAtkinsonDither(imgData);
        break;
      case 'bayer':
        dithered = this.display.applyBayerDither(imgData);
        break;
      case 'threshold':
        dithered = this.display.applyThreshold(imgData, 128);
        break;
      case 'floyd':
      default:
        dithered = this.display.applyFloydSteinbergDither(imgData);
        break;
    }

    // Render dithered image
    ctx.putImageData(dithered, 0, 0);

    // Render optional caption bar at bottom
    if (this.state.caption) {
      ctx.fillStyle = EINK_PALETTE.paperDark;
      ctx.fillRect(0, CANVAS_HEIGHT - 60, CANVAS_WIDTH, 60);

      ctx.fillStyle = EINK_PALETTE.paperWhite;
      ctx.font = 'bold 20px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(this.state.caption.toUpperCase(), CANVAS_WIDTH / 2, CANVAS_HEIGHT - 24);
    }
  }

  getPayload() {
    return {
      image: this.display.getDataURL('image/png'),
      format: 'monochrome-png',
      width: CANVAS_WIDTH,
      height: CANVAS_HEIGHT,
      algorithm: this.state.algorithm,
      contrast: this.state.contrast,
      brightness: this.state.brightness,
    };
  }
}
