/**
 * Text & Note Creation Mode for SynkCard 600x800 e-Paper
 */
import { CANVAS_WIDTH, CANVAS_HEIGHT, EINK_PALETTE } from './epaperCanvas.js';

export const TEXT_PRESETS = [
  {
    id: 'badge_busy',
    name: 'Desk: Do Not Disturb',
    title: 'DO NOT DISTURB',
    subtitle: 'FOCUS SPRINT IN PROGRESS',
    body: 'Deep work block until 04:30 PM.\nFor urgent queries, ping Slack #embedded-team.\nPlease do not knock unless building is on fire.',
    font: 'sans',
    layout: 'banner',
    align: 'center',
    badge: 'BUSY',
  },
  {
    id: 'project_demo',
    name: 'College Project Demo',
    title: 'SYNKCARD v1.2',
    subtitle: 'Low-Power Wireless E-Paper System',
    body: 'Dept. of Computer Science & Engineering\nFinal Year Capstone Project\n\n• Target: NVIDIA Jetson Orin Nano\n• Interface: SPI / Waveshare 4.3" EPD\n• Protocol: HTTP REST over Wi-Fi\n• Power: 15mW standby (Deep Sleep)',
    font: 'mono',
    layout: 'tech',
    align: 'left',
    badge: 'ACTIVE DEMO',
  },
  {
    id: 'room_schedule',
    name: 'Room 304 Schedule',
    title: 'LAB 304 - EMBEDDED SYS',
    subtitle: 'TODAY\'S RESERVATION SCHEDULE',
    body: '09:00 - 11:30 : Microcontrollers Lab (Batch A)\n11:30 - 01:00 : IoT Systems Architecture\n02:00 - 04:00 : Final Project Viva & Evaluations\n04:30 - 06:00 : Robotics Club Workshop',
    font: 'mono',
    layout: 'card',
    align: 'left',
    badge: 'SCHEDULE',
  },
  {
    id: 'quote',
    name: 'Daily Motivation',
    title: 'HARDWARE QUOTE',
    subtitle: 'ENGINEERING PRINCIPLES',
    body: '"Simplicity is prerequisite for reliability."\n\n— Edsger W. Dijkstra\n\nKeep constraints tight. Low power, high signal, zero distractions.',
    font: 'serif',
    layout: 'minimal',
    align: 'center',
    badge: 'QUOTE',
  },
];

export class TextMode {
  constructor(epaperDisplay) {
    this.display = epaperDisplay;
    this.state = {
      title: 'SYNKCARD v1.2',
      subtitle: 'Low-Power Wireless E-Paper Badge',
      body: 'Dept. of Computer Science & Engineering\nFinal Year Capstone Presentation\n\n• Target: NVIDIA Jetson Orin Nano\n• Display: Waveshare 4.3" 600×800 Monochrome\n• Protocol: IEEE 802.11 b/g/n REST API\n• Power: Sub-15mW deep-sleep consumption',
      font: 'sans',      // 'sans', 'mono', 'serif'
      fontSize: 'normal', // 'large', 'normal', 'compact'
      align: 'left',      // 'left', 'center'
      layout: 'tech',     // 'tech', 'banner', 'card', 'minimal'
      showFooter: true,
      footerText: 'Jetson Orin • 172.16.104.57',
    };
  }

  updateState(partial) {
    this.state = { ...this.state, ...partial };
    this.render();
  }

  loadPreset(presetId) {
    const preset = TEXT_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    this.updateState({
      title: preset.title,
      subtitle: preset.subtitle,
      body: preset.body,
      font: preset.font,
      layout: preset.layout,
      align: preset.align,
    });
  }

  getFontFamily() {
    switch (this.state.font) {
      case 'mono':
        return '"JetBrains Mono", "Courier New", Courier, monospace';
      case 'serif':
        return '"Georgia", "Times New Roman", serif';
      default:
        return 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';
    }
  }

  render() {
    const ctx = this.display.getContext();
    this.renderToContext(ctx);
  }

  renderToContext(ctx) {
    // Clear background to paper off-white
    ctx.fillStyle = EINK_PALETTE.paperWhite;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = EINK_PALETTE.paperDark;
    ctx.strokeStyle = EINK_PALETTE.paperDark;

    const fontFam = this.getFontFamily();
    const margin = 44;
    const contentWidth = CANVAS_WIDTH - margin * 2;

    switch (this.state.layout) {
      case 'banner':
        this._renderBannerLayout(ctx, fontFam, margin, contentWidth);
        break;
      case 'card':
        this._renderCardLayout(ctx, fontFam, margin, contentWidth);
        break;
      case 'minimal':
        this._renderMinimalLayout(ctx, fontFam, margin, contentWidth);
        break;
      case 'tech':
      default:
        this._renderTechLayout(ctx, fontFam, margin, contentWidth);
        break;
    }

    if (this.state.showFooter) {
      this._renderFooter(ctx, fontFam, margin);
    }
  }

  _renderTechLayout(ctx, fontFam, margin, contentWidth) {
    // Top hardware border & tech markings
    ctx.lineWidth = 3;
    ctx.strokeRect(margin, 34, contentWidth, CANVAS_HEIGHT - 68);

    // Decorative corner markers
    const markerLen = 14;
    ctx.lineWidth = 6;
    // Top-left
    ctx.beginPath();
    ctx.moveTo(margin, 34 + markerLen);
    ctx.lineTo(margin, 34);
    ctx.lineTo(margin + markerLen, 34);
    ctx.stroke();

    // Top-right
    ctx.beginPath();
    ctx.moveTo(CANVAS_WIDTH - margin - markerLen, 34);
    ctx.lineTo(CANVAS_WIDTH - margin, 34);
    ctx.lineTo(CANVAS_WIDTH - margin, 34 + markerLen);
    ctx.stroke();

    // Technical header pill
    ctx.fillStyle = EINK_PALETTE.paperDark;
    ctx.fillRect(margin + 18, 56, 120, 24);
    ctx.fillStyle = EINK_PALETTE.paperWhite;
    ctx.font = `bold 12px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.fillText('SYS.NOTE // 01', margin + 78, 72);

    // Battery / Status right tag
    ctx.fillStyle = EINK_PALETTE.paperDark;
    ctx.font = `bold 12px "JetBrains Mono", monospace`;
    ctx.textAlign = 'right';
    ctx.fillText('[ e-PAPER 4.3" ]', CANVAS_WIDTH - margin - 20, 72);

    // Title
    ctx.fillStyle = EINK_PALETTE.paperDark;
    ctx.font = `900 36px ${fontFam}`;
    ctx.textAlign = this.state.align;
    const titleX = this.state.align === 'center' ? CANVAS_WIDTH / 2 : margin + 24;
    ctx.fillText(this.state.title, titleX, 130);

    // Subtitle
    if (this.state.subtitle) {
      ctx.font = `bold 16px ${fontFam}`;
      ctx.fillText(this.state.subtitle.toUpperCase(), titleX, 162);
    }

    // Divider line
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(margin + 20, 185);
    ctx.lineTo(CANVAS_WIDTH - margin - 20, 185);
    ctx.stroke();

    // Dotted pattern divider accent
    for (let x = margin + 20; x < CANVAS_WIDTH - margin - 20; x += 12) {
      ctx.fillRect(x, 192, 3, 3);
    }

    // Body text
    this._renderWrappedBody(ctx, fontFam, margin + 24, 230, contentWidth - 48);
  }

  _renderBannerLayout(ctx, fontFam, margin, contentWidth) {
    // Massive inverted top banner
    ctx.fillStyle = EINK_PALETTE.paperDark;
    ctx.fillRect(margin, 40, contentWidth, 160);

    // Title in inverted banner
    ctx.fillStyle = EINK_PALETTE.paperWhite;
    ctx.font = `900 38px ${fontFam}`;
    ctx.textAlign = 'center';
    ctx.fillText(this.state.title, CANVAS_WIDTH / 2, 110);

    if (this.state.subtitle) {
      ctx.font = `bold 18px ${fontFam}`;
      ctx.fillText(this.state.subtitle, CANVAS_WIDTH / 2, 150);
    }

    // Outer double border
    ctx.strokeStyle = EINK_PALETTE.paperDark;
    ctx.lineWidth = 4;
    ctx.strokeRect(margin, 40, contentWidth, CANVAS_HEIGHT - 80);

    // Body
    ctx.fillStyle = EINK_PALETTE.paperDark;
    const titleX = this.state.align === 'center' ? CANVAS_WIDTH / 2 : margin + 30;
    this._renderWrappedBody(ctx, fontFam, titleX, 260, contentWidth - 60);
  }

  _renderCardLayout(ctx, fontFam, margin, contentWidth) {
    // Rounded-style card border
    ctx.strokeStyle = EINK_PALETTE.paperDark;
    ctx.lineWidth = 3;
    ctx.strokeRect(margin, 44, contentWidth, CANVAS_HEIGHT - 88);

    // Top icon/header
    ctx.fillStyle = EINK_PALETTE.paperDark;
    ctx.fillRect(margin + 24, 68, 6, 48);

    ctx.font = `900 32px ${fontFam}`;
    ctx.textAlign = 'left';
    ctx.fillText(this.state.title, margin + 42, 102);

    if (this.state.subtitle) {
      ctx.font = `600 15px ${fontFam}`;
      ctx.fillText(this.state.subtitle, margin + 42, 134);
    }

    ctx.beginPath();
    ctx.moveTo(margin + 24, 156);
    ctx.lineTo(CANVAS_WIDTH - margin - 24, 156);
    ctx.stroke();

    this._renderWrappedBody(ctx, fontFam, margin + 24, 200, contentWidth - 48);
  }

  _renderMinimalLayout(ctx, fontFam, margin, contentWidth) {
    ctx.fillStyle = EINK_PALETTE.paperDark;
    ctx.font = `300 42px ${fontFam}`;
    ctx.textAlign = this.state.align;
    const titleX = this.state.align === 'center' ? CANVAS_WIDTH / 2 : margin + 20;

    ctx.fillText(this.state.title, titleX, 120);

    if (this.state.subtitle) {
      ctx.font = `italic 18px ${fontFam}`;
      ctx.fillText(this.state.subtitle, titleX, 160);
    }

    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(margin + 40, 190);
    ctx.lineTo(CANVAS_WIDTH - margin - 40, 190);
    ctx.stroke();

    this._renderWrappedBody(ctx, fontFam, titleX, 240, contentWidth - 40);
  }

  _renderWrappedBody(ctx, fontFam, startX, startY, maxWidth) {
    ctx.fillStyle = EINK_PALETTE.paperDark;
    ctx.textAlign = this.state.align;

    const baseSize = this.state.fontSize === 'large' ? 24 : this.state.fontSize === 'compact' ? 17 : 20;
    const lineHeight = baseSize * 1.55;

    ctx.font = `normal ${baseSize}px ${fontFam}`;

    const paragraphs = this.state.body.split('\n');
    let y = startY;

    for (let p of paragraphs) {
      if (p.trim() === '') {
        y += lineHeight * 0.7;
        continue;
      }

      // Check for bullet lines
      const isBullet = p.startsWith('• ') || p.startsWith('- ') || p.startsWith('* ');
      const cleanLine = isBullet ? p.substring(2) : p;

      const words = cleanLine.split(' ');
      let currentLine = isBullet ? '• ' : '';

      for (let word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = ctx.measureText(testLine);
        if (metrics.width > maxWidth && currentLine !== '') {
          ctx.fillText(currentLine, startX, y);
          y += lineHeight;
          currentLine = isBullet ? '   ' + word : word;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        ctx.fillText(currentLine, startX, y);
        y += lineHeight;
      }
    }
  }

  _renderFooter(ctx, fontFam, margin) {
    const y = CANVAS_HEIGHT - 54;
    ctx.fillStyle = EINK_PALETTE.paperDark;
    ctx.font = `500 12px "JetBrains Mono", monospace`;
    ctx.textAlign = 'left';

    const now = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    ctx.fillText(`SYNKCARD • ${now}`, margin + 20, y);

    ctx.textAlign = 'right';
    ctx.fillText(this.state.footerText, CANVAS_WIDTH - margin - 20, y);
  }

  getPayload() {
    return {
      title: this.state.title,
      subtitle: this.state.subtitle,
      body: this.state.body,
      font: this.state.font,
      alignment: this.state.align,
      layout: this.state.layout,
      timestamp: new Date().toISOString(),
      image_base64: this.display.getDataURL('image/png'),
    };
  }
}
