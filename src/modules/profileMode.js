/**
 * Digital Profile & Smart Badge Mode with Live QR Code for SynkCard 600x800 e-Paper
 */
import QRCode from 'qrcode';
import { CANVAS_WIDTH, CANVAS_HEIGHT, EINK_PALETTE } from './epaperCanvas.js';

export const PROFILE_PRESETS = [
  {
    id: 'student_badge',
    name: 'College Project Lead',
    fullName: 'ALEX RIVERA',
    role: 'SYSTEMS ARCHITECT & EMBEDDED DEV',
    organization: 'DEPT. OF COMPUTER SCIENCE & ENG',
    tagline: 'SynkCard: Ultra-Low-Power Wireless E-Paper Systems',
    qrData: 'https://github.com/Kind-sketch/eink-emulator',
    badgeType: 'PROJECT LEAD',
    layout: 'badge',
  },
  {
    id: 'conf_speaker',
    name: 'Tech Conference Badge',
    fullName: 'DR. ELENA VANCE',
    role: 'EDGE COMPUTING RESEARCHER',
    organization: 'AUTONOMOUS SYSTEMS LAB',
    tagline: 'Building zero-power ambient displays & neuromorphic edge chips',
    qrData: 'https://linkedin.com/in/edge-researcher',
    badgeType: 'KEYNOTE SPEAKER',
    layout: 'badge',
  },
  {
    id: 'vcard_clean',
    name: 'Minimal Business Card',
    fullName: 'JORDAN CHEN',
    role: 'HARDWARE PRODUCT DESIGNER',
    organization: 'SYNKTAL LABS',
    tagline: 'Industrial design • Embedded UI • Low-power electronics',
    qrData: 'https://jordan-chen.dev',
    badgeType: 'ALL ACCESS',
    layout: 'minimal',
  },
];

export class ProfileMode {
  constructor(epaperDisplay) {
    this.display = epaperDisplay;
    this.qrCanvas = document.createElement('canvas');
    this.qrCanvas.width = 240;
    this.qrCanvas.height = 240;

    this.state = {
      fullName: 'ALEX RIVERA',
      role: 'SYSTEMS ARCHITECT & EMBEDDED DEV',
      organization: 'DEPT. OF COMPUTER SCIENCE & ENG',
      tagline: 'SynkCard: Ultra-Low-Power Wireless E-Paper Systems',
      qrData: 'https://github.com/Kind-sketch/eink-emulator',
      badgeType: 'PROJECT LEAD',
      layout: 'badge', // 'badge', 'minimal', 'idcard'
      includePhotoPlaceholder: true,
    };

    this.generateQR();
  }

  updateState(partial) {
    const needQR = partial.qrData !== undefined && partial.qrData !== this.state.qrData;
    this.state = { ...this.state, ...partial };
    if (needQR) {
      this.generateQR();
    } else {
      this.render();
    }
  }

  loadPreset(presetId) {
    const preset = PROFILE_PRESETS.find((p) => p.id === presetId);
    if (!preset) return;
    this.updateState({
      fullName: preset.fullName,
      role: preset.role,
      organization: preset.organization,
      tagline: preset.tagline,
      qrData: preset.qrData,
      badgeType: preset.badgeType,
      layout: preset.layout,
    });
  }

  async generateQR() {
    try {
      await QRCode.toCanvas(this.qrCanvas, this.state.qrData || 'https://synkcard.dev', {
        width: 240,
        margin: 1,
        color: {
          dark: EINK_PALETTE.paperDark,
          light: EINK_PALETTE.paperWhite,
        },
        errorCorrectionLevel: 'M',
      });
    } catch (err) {
      console.error('QR Generation failed:', err);
    }
    this.render();
  }

  render() {
    const ctx = this.display.getContext();
    this.renderToContext(ctx);
  }

  renderToContext(ctx) {
    // Clear
    ctx.fillStyle = EINK_PALETTE.paperWhite;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    if (this.state.layout === 'minimal') {
      this._renderMinimal(ctx);
    } else if (this.state.layout === 'idcard') {
      this._renderIdCard(ctx);
    } else {
      this._renderBadge(ctx);
    }
  }

  _renderBadge(ctx) {
    const margin = 36;
    const contentW = CANVAS_WIDTH - margin * 2;

    // Outer card border
    ctx.strokeStyle = EINK_PALETTE.paperDark;
    ctx.lineWidth = 4;
    ctx.strokeRect(margin, 36, contentW, CANVAS_HEIGHT - 72);

    // Lanyard hole cutout simulation at very top
    ctx.fillStyle = EINK_PALETTE.paperDark;
    ctx.beginPath();
    ctx.roundRect(CANVAS_WIDTH / 2 - 40, 16, 80, 12, [6]);
    ctx.fill();

    // Top Header Badge Banner
    ctx.fillRect(margin, 36, contentW, 60);
    ctx.fillStyle = EINK_PALETTE.paperWhite;
    ctx.font = '900 16px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`[ SYNKCARD 2026 // ${this.state.badgeType} ]`, CANVAS_WIDTH / 2, 72);

    // Profile Avatar / Icon box
    const avatarY = 120;
    const avatarSize = 100;
    const avatarX = (CANVAS_WIDTH - avatarSize) / 2;

    ctx.strokeStyle = EINK_PALETTE.paperDark;
    ctx.lineWidth = 3;
    ctx.strokeRect(avatarX, avatarY, avatarSize, avatarSize);

    // Geometric badge icon
    ctx.fillStyle = EINK_PALETTE.paperDark;
    ctx.font = '54px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('⚡', CANVAS_WIDTH / 2, avatarY + 70);

    // Full Name
    ctx.fillStyle = EINK_PALETTE.paperDark;
    ctx.font = '900 36px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(this.state.fullName, CANVAS_WIDTH / 2, 270);

    // Role
    ctx.font = 'bold 16px "JetBrains Mono", monospace';
    ctx.fillText(this.state.role, CANVAS_WIDTH / 2, 305);

    // Organization / College
    ctx.font = '600 15px system-ui, sans-serif';
    ctx.fillText(this.state.organization, CANVAS_WIDTH / 2, 335);

    // Divider Line
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(margin + 30, 360);
    ctx.lineTo(CANVAS_WIDTH - margin - 30, 360);
    ctx.stroke();

    // Tagline / Bio
    if (this.state.tagline) {
      ctx.font = 'italic 16px Georgia, serif';
      this._renderWrappedText(ctx, this.state.tagline, CANVAS_WIDTH / 2, 395, contentW - 60, 24, 'center');
    }

    // QR Code Box
    const qrSize = 210;
    const qrX = (CANVAS_WIDTH - qrSize) / 2;
    const qrY = 460;

    // Crisp QR Code border
    ctx.lineWidth = 2;
    ctx.strokeRect(qrX - 8, qrY - 8, qrSize + 16, qrSize + 16);
    ctx.drawImage(this.qrCanvas, qrX, qrY, qrSize, qrSize);

    // "SCAN TO CONNECT" label
    ctx.fillStyle = EINK_PALETTE.paperDark;
    ctx.font = 'bold 14px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('▼ SCAN TO CONNECT // VCARD ▼', CANVAS_WIDTH / 2, 715);

    // Bottom technical ID
    ctx.font = '11px "JetBrains Mono", monospace';
    ctx.fillText('ID: SC-9042-JETSON • WIRELESS EPD', CANVAS_WIDTH / 2, 738);
  }

  _renderMinimal(ctx) {
    const margin = 48;
    ctx.fillStyle = EINK_PALETTE.paperDark;
    ctx.textAlign = 'left';

    // Top Brand Tag
    ctx.font = 'bold 13px "JetBrains Mono", monospace';
    ctx.fillText('SYNKCARD // DIGITAL IDENTITY', margin, 70);

    ctx.lineWidth = 2;
    ctx.strokeStyle = EINK_PALETTE.paperDark;
    ctx.beginPath();
    ctx.moveTo(margin, 85);
    ctx.lineTo(CANVAS_WIDTH - margin, 85);
    ctx.stroke();

    // Large Name
    ctx.font = '900 40px system-ui, sans-serif';
    ctx.fillText(this.state.fullName, margin, 150);

    // Role
    ctx.font = 'bold 18px "JetBrains Mono", monospace';
    ctx.fillText(this.state.role, margin, 190);

    // Org
    ctx.font = '600 16px system-ui, sans-serif';
    ctx.fillText(this.state.organization, margin, 225);

    // Bio
    if (this.state.tagline) {
      ctx.font = '16px Georgia, serif';
      this._renderWrappedText(ctx, this.state.tagline, margin, 275, CANVAS_WIDTH - margin * 2, 24, 'left');
    }

    // QR Code
    const qrSize = 220;
    const qrX = (CANVAS_WIDTH - qrSize) / 2;
    const qrY = 430;
    ctx.drawImage(this.qrCanvas, qrX, qrY, qrSize, qrSize);

    ctx.font = 'bold 14px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('CONNECT INSTANTLY', CANVAS_WIDTH / 2, 690);
    ctx.font = '12px "JetBrains Mono", monospace';
    ctx.fillText(this.state.qrData, CANVAS_WIDTH / 2, 715);
  }

  _renderIdCard(ctx) {
    const margin = 36;
    ctx.strokeStyle = EINK_PALETTE.paperDark;
    ctx.lineWidth = 4;
    ctx.strokeRect(margin, 36, CANVAS_WIDTH - margin * 2, CANVAS_HEIGHT - 72);

    // Top block
    ctx.fillStyle = EINK_PALETTE.paperDark;
    ctx.fillRect(margin, 36, CANVAS_WIDTH - margin * 2, 80);

    ctx.fillStyle = EINK_PALETTE.paperWhite;
    ctx.font = '900 24px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('COLLEGE OF ENGINEERING', CANVAS_WIDTH / 2, 74);
    ctx.font = 'bold 13px "JetBrains Mono", monospace';
    ctx.fillText('STUDENT RESEARCH IDENTIFICATION', CANVAS_WIDTH / 2, 98);

    // Split Row: Photo on Left, Details on Right
    ctx.fillStyle = EINK_PALETTE.paperDark;
    ctx.strokeStyle = EINK_PALETTE.paperDark;
    ctx.lineWidth = 3;
    ctx.strokeRect(margin + 20, 140, 130, 160);

    ctx.font = 'bold 12px "JetBrains Mono", monospace';
    ctx.fillText('[ PHOTO ]', margin + 85, 225);

    // Details on right
    ctx.textAlign = 'left';
    ctx.font = '900 22px system-ui, sans-serif';
    ctx.fillText(this.state.fullName, margin + 170, 175);

    ctx.font = 'bold 13px "JetBrains Mono", monospace';
    ctx.fillText('ROLE:', margin + 170, 210);
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(this.state.role.substring(0, 24), margin + 170, 230);

    ctx.font = 'bold 13px "JetBrains Mono", monospace';
    ctx.fillText('ORG:', margin + 170, 260);
    ctx.font = '13px system-ui, sans-serif';
    ctx.fillText(this.state.organization.substring(0, 24), margin + 170, 280);

    // Middle separator
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(margin + 20, 330);
    ctx.lineTo(CANVAS_WIDTH - margin - 20, 330);
    ctx.stroke();

    // Tagline
    ctx.font = 'italic 16px Georgia, serif';
    ctx.textAlign = 'center';
    this._renderWrappedText(ctx, this.state.tagline, CANVAS_WIDTH / 2, 365, CANVAS_WIDTH - margin * 2 - 40, 24, 'center');

    // QR
    const qrSize = 210;
    const qrX = (CANVAS_WIDTH - qrSize) / 2;
    const qrY = 450;
    ctx.drawImage(this.qrCanvas, qrX, qrY, qrSize, qrSize);

    ctx.fillStyle = EINK_PALETTE.paperDark;
    ctx.font = 'bold 13px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText('SCAN VERIFIED IDENTITY', CANVAS_WIDTH / 2, 700);
  }

  _renderWrappedText(ctx, text, x, y, maxW, lineH, align = 'center') {
    ctx.textAlign = align;
    const words = text.split(' ');
    let line = '';
    let curY = y;

    for (let w of words) {
      const test = line ? `${line} ${w}` : w;
      if (ctx.measureText(test).width > maxW && line !== '') {
        ctx.fillText(line, x, curY);
        curY += lineH;
        line = w;
      } else {
        line = test;
      }
    }
    if (line) {
      ctx.fillText(line, x, curY);
    }
  }

  getPayload() {
    return {
      name: this.state.fullName,
      role: this.state.role,
      organization: this.state.organization,
      bio: this.state.tagline,
      qr_data: this.state.qrData,
      badge_type: this.state.badgeType,
      image_base64: this.display.getDataURL('image/png'),
    };
  }
}
