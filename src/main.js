/**
 * SynkCard Main Application Controller
 * Coordinates e-Paper Canvas (600x800), 4 Display Modes, and Jetson Orin API Link
 */

import EpaperDisplay from './modules/epaperCanvas.js';
import { TextMode, TEXT_PRESETS } from './modules/textMode.js';
import { ImageMode } from './modules/imageMode.js';
import { PixelMode, PIXEL_PRESETS } from './modules/pixelMode.js';
import { ProfileMode, PROFILE_PRESETS } from './modules/profileMode.js';
import { api } from './modules/apiClient.js';

// DOM Elements
const epaperCanvas = document.getElementById('epaperCanvas');
const pixelCanvas = document.getElementById('pixelCanvas');
const epaperBezel = document.getElementById('epaperBezel');

// Initialize Core Canvas & Modes
const display = new EpaperDisplay(epaperCanvas);
const textMode = new TextMode(display);
const imageMode = new ImageMode(display);
const pixelMode = new PixelMode(display, pixelCanvas);
const profileMode = new ProfileMode(display);

let activeMode = 'text'; // 'text', 'image', 'pixel', 'profile'

// Render helper for current mode
function renderActiveMode() {
  switch (activeMode) {
    case 'text':
      textMode.render();
      break;
    case 'image':
      imageMode.render();
      break;
    case 'pixel':
      pixelMode.render();
      break;
    case 'profile':
      profileMode.render();
      break;
  }
}

// ==========================================================================
// 1. Mode Switching & Tabs
// ==========================================================================
const tabs = {
  text: { btn: document.getElementById('tabBtnText'), panel: document.getElementById('panelText') },
  image: { btn: document.getElementById('tabBtnImage'), panel: document.getElementById('panelImage') },
  pixel: { btn: document.getElementById('tabBtnPixel'), panel: document.getElementById('panelPixel') },
  profile: { btn: document.getElementById('tabBtnProfile'), panel: document.getElementById('panelProfile') },
};

function switchMode(modeKey) {
  if (!tabs[modeKey]) return;
  activeMode = modeKey;

  Object.entries(tabs).forEach(([key, item]) => {
    const isActive = key === modeKey;
    item.btn.classList.toggle('active', isActive);
    item.btn.setAttribute('aria-selected', isActive ? 'true' : 'false');
    item.panel.style.display = isActive ? 'block' : 'none';
  });

  renderActiveMode();
}

Object.entries(tabs).forEach(([key, item]) => {
  item.btn.addEventListener('click', () => switchMode(key));
});

// ==========================================================================
// 2. Text / Note Mode Events
// ==========================================================================
const textTitle = document.getElementById('textTitle');
const textSubtitle = document.getElementById('textSubtitle');
const textBody = document.getElementById('textBody');
const textLayout = document.getElementById('textLayout');
const textFont = document.getElementById('textFont');
const alignLeftBtn = document.getElementById('alignLeftBtn');
const alignCenterBtn = document.getElementById('alignCenterBtn');
const textFooter = document.getElementById('textFooter');

// Initialize text inputs
textTitle.value = textMode.state.title;
textSubtitle.value = textMode.state.subtitle;
textBody.value = textMode.state.body;
textLayout.value = textMode.state.layout;
textFont.value = textMode.state.font;
textFooter.value = textMode.state.footerText;

const handleTextUpdate = () => {
  textMode.updateState({
    title: textTitle.value,
    subtitle: textSubtitle.value,
    body: textBody.value,
    layout: textLayout.value,
    font: textFont.value,
    footerText: textFooter.value,
  });
};

[textTitle, textSubtitle, textBody, textFooter].forEach((el) => {
  el.addEventListener('input', handleTextUpdate);
});

[textLayout, textFont].forEach((el) => {
  el.addEventListener('change', handleTextUpdate);
});

alignLeftBtn.addEventListener('click', () => {
  alignLeftBtn.classList.add('active');
  alignCenterBtn.classList.remove('active');
  textMode.updateState({ align: 'left' });
});

alignCenterBtn.addEventListener('click', () => {
  alignCenterBtn.classList.add('active');
  alignLeftBtn.classList.remove('active');
  textMode.updateState({ align: 'center' });
});

// Text Presets
document.querySelectorAll('[data-text-preset]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const presetId = btn.getAttribute('data-text-preset');
    textMode.loadPreset(presetId);
    textTitle.value = textMode.state.title;
    textSubtitle.value = textMode.state.subtitle;
    textBody.value = textMode.state.body;
    textLayout.value = textMode.state.layout;
    textFont.value = textMode.state.font;
    alignLeftBtn.classList.toggle('active', textMode.state.align === 'left');
    alignCenterBtn.classList.toggle('active', textMode.state.align === 'center');
    showToast(`Loaded "${btn.textContent.trim()}" template`);
  });
});

// ==========================================================================
// 3. Image Upload & Processing Mode Events
// ==========================================================================
const imageFileInput = document.getElementById('imageFileInput');
const imageDropzone = document.getElementById('imageDropzone');
const ditherAlgoSelect = document.getElementById('ditherAlgoSelect');
const contrastSlider = document.getElementById('contrastSlider');
const contrastVal = document.getElementById('contrastVal');
const brightnessSlider = document.getElementById('brightnessSlider');
const brightnessVal = document.getElementById('brightnessVal');
const scaleFitBtn = document.getElementById('scaleFitBtn');
const scaleCoverBtn = document.getElementById('scaleCoverBtn');
const invertOffBtn = document.getElementById('invertOffBtn');
const invertOnBtn = document.getElementById('invertOnBtn');
const imageCaption = document.getElementById('imageCaption');

imageFileInput.addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    await imageMode.handleFileUpload(file);
    showToast(`Image loaded: ${file.name}`);
  } catch (err) {
    showToast(err.message, 'error');
  }
});

// Drag and drop for desktop/tablet
['dragenter', 'dragover'].forEach((ev) => {
  imageDropzone.addEventListener(ev, (e) => {
    e.preventDefault();
    imageDropzone.style.borderColor = 'var(--accent-orange)';
  });
});

['dragleave', 'drop'].forEach((ev) => {
  imageDropzone.addEventListener(ev, (e) => {
    e.preventDefault();
    imageDropzone.style.borderColor = '';
  });
});

imageDropzone.addEventListener('drop', async (e) => {
  const file = e.dataTransfer.files?.[0];
  if (file) {
    try {
      await imageMode.handleFileUpload(file);
      showToast(`Image loaded: ${file.name}`);
    } catch (err) {
      showToast(err.message, 'error');
    }
  }
});

ditherAlgoSelect.addEventListener('change', () => {
  imageMode.updateState({ algorithm: ditherAlgoSelect.value });
});

contrastSlider.addEventListener('input', () => {
  const val = parseInt(contrastSlider.value, 10);
  contrastVal.textContent = (val > 0 ? `+${val}` : `${val}`) + '%';
  imageMode.updateState({ contrast: val });
});

brightnessSlider.addEventListener('input', () => {
  const val = parseInt(brightnessSlider.value, 10);
  brightnessVal.textContent = (val > 0 ? `+${val}` : `${val}`);
  imageMode.updateState({ brightness: val });
});

scaleFitBtn.addEventListener('click', () => {
  scaleFitBtn.classList.add('active');
  scaleCoverBtn.classList.remove('active');
  imageMode.updateState({ scaleMode: 'fit' });
});

scaleCoverBtn.addEventListener('click', () => {
  scaleCoverBtn.classList.add('active');
  scaleFitBtn.classList.remove('active');
  imageMode.updateState({ scaleMode: 'cover' });
});

invertOffBtn.addEventListener('click', () => {
  invertOffBtn.classList.add('active');
  invertOnBtn.classList.remove('active');
  imageMode.updateState({ invert: false });
});

invertOnBtn.addEventListener('click', () => {
  invertOnBtn.classList.add('active');
  invertOffBtn.classList.remove('active');
  imageMode.updateState({ invert: true });
});

imageCaption.addEventListener('input', () => {
  imageMode.updateState({ caption: imageCaption.value });
});

// Image Presets
document.querySelectorAll('[data-img-preset]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const preset = btn.getAttribute('data-img-preset');
    imageMode.loadSamplePreset(preset);
    showToast(`Loaded ${preset} graphic`);
  });
});

// ==========================================================================
// 4. Pixel-Art Mode Events
// ==========================================================================
const pixelPencilBtn = document.getElementById('pixelPencilBtn');
const pixelEraserBtn = document.getElementById('pixelEraserBtn');
const pixelFillBtn = document.getElementById('pixelFillBtn');
const pixelInvertBtn = document.getElementById('pixelInvertBtn');
const pixelClearBtn = document.getElementById('pixelClearBtn');
const pixelGridSizeSelect = document.getElementById('pixelGridSizeSelect');
const pixelLabelInput = document.getElementById('pixelLabelInput');

const toolBtns = [pixelPencilBtn, pixelEraserBtn, pixelFillBtn];

function setActiveTool(tool, activeBtn) {
  pixelMode.setTool(tool);
  toolBtns.forEach((b) => b.classList.remove('active'));
  activeBtn.classList.add('active');
}

pixelPencilBtn.addEventListener('click', () => setActiveTool('pencil', pixelPencilBtn));
pixelEraserBtn.addEventListener('click', () => setActiveTool('eraser', pixelEraserBtn));
pixelFillBtn.addEventListener('click', () => setActiveTool('fill', pixelFillBtn));

pixelInvertBtn.addEventListener('click', () => {
  pixelMode.invert();
  showToast('Inverted pixel colors');
});

pixelClearBtn.addEventListener('click', () => {
  pixelMode.clear();
  showToast('Cleared drawing canvas');
});

pixelGridSizeSelect.addEventListener('change', () => {
  pixelMode.setGridSize(parseInt(pixelGridSizeSelect.value, 10));
});

pixelLabelInput.addEventListener('input', () => {
  pixelMode.setLabel(pixelLabelInput.value);
});

// Pixel Presets
document.querySelectorAll('[data-pixel-preset]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const key = btn.getAttribute('data-pixel-preset');
    pixelMode.loadPreset(key);
    pixelGridSizeSelect.value = pixelMode.gridSize.toString();
    pixelLabelInput.value = pixelMode.label;
    showToast(`Loaded "${btn.textContent.trim()}" pixel art`);
  });
});

// ==========================================================================
// 5. Digital Profile & QR Code Mode Events
// ==========================================================================
const profileName = document.getElementById('profileName');
const profileRole = document.getElementById('profileRole');
const profileOrg = document.getElementById('profileOrg');
const profileBio = document.getElementById('profileBio');
const profileQR = document.getElementById('profileQR');
const profileLayout = document.getElementById('profileLayout');

// Initialize profile inputs
profileName.value = profileMode.state.fullName;
profileRole.value = profileMode.state.role;
profileOrg.value = profileMode.state.organization;
profileBio.value = profileMode.state.tagline;
profileQR.value = profileMode.state.qrData;
profileLayout.value = profileMode.state.layout;

const handleProfileUpdate = () => {
  profileMode.updateState({
    fullName: profileName.value,
    role: profileRole.value,
    organization: profileOrg.value,
    tagline: profileBio.value,
    qrData: profileQR.value,
    layout: profileLayout.value,
  });
};

[profileName, profileRole, profileOrg, profileBio, profileQR].forEach((el) => {
  el.addEventListener('input', handleProfileUpdate);
});

profileLayout.addEventListener('change', handleProfileUpdate);

// Profile Presets
document.querySelectorAll('[data-profile-preset]').forEach((btn) => {
  btn.addEventListener('click', () => {
    const id = btn.getAttribute('data-profile-preset');
    profileMode.loadPreset(id);
    profileName.value = profileMode.state.fullName;
    profileRole.value = profileMode.state.role;
    profileOrg.value = profileMode.state.organization;
    profileBio.value = profileMode.state.tagline;
    profileQR.value = profileMode.state.qrData;
    profileLayout.value = profileMode.state.layout;
    showToast(`Loaded "${btn.textContent.trim()}" profile`);
  });
});

// ==========================================================================
// 6. E-Paper Simulation Controls (Refresh, Sound, Export)
// ==========================================================================
const refreshScreenBtn = document.getElementById('refreshScreenBtn');
const downloadImageBtn = document.getElementById('downloadImageBtn');
const toggleAudioBtn = document.getElementById('toggleAudioBtn');
const audioIcon = document.getElementById('audioIcon');
const audioLabel = document.getElementById('audioLabel');

refreshScreenBtn.addEventListener('click', async () => {
  await display.triggerRefreshAnimation((ctx) => {
    renderActiveMode();
  });
  showToast('Display refreshed (waveform flash simulated)');
});

downloadImageBtn.addEventListener('click', () => {
  display.downloadScreen(`synkcard_${activeMode}_600x800.png`);
  showToast('Downloaded 600×800 monochrome PNG');
});

toggleAudioBtn.addEventListener('click', () => {
  display.soundEnabled = !display.soundEnabled;
  audioIcon.textContent = display.soundEnabled ? '🔊' : '🔇';
  audioLabel.textContent = display.soundEnabled ? 'Sound On' : 'Sound Off';
  showToast(`Tactile audio ${display.soundEnabled ? 'enabled' : 'muted'}`);
  if (display.soundEnabled) display.playTactileClick();
});

// ==========================================================================
// 7. Device Status & Bottom Sync Action Bar
// ==========================================================================
const statusLed = document.getElementById('statusLed');
const statusText = document.getElementById('statusText');
const batteryBar = document.getElementById('batteryBar');
const batteryPct = document.getElementById('batteryPct');
const barStatusLed = document.getElementById('barStatusLed');
const barDeviceName = document.getElementById('barDeviceName');
const barSyncTime = document.getElementById('barSyncTime');
const syncToDisplayBtn = document.getElementById('syncToDisplayBtn');
const syncBtnText = document.getElementById('syncBtnText');

api.onStatusChange((status) => {
  const isOnline = status.online;
  statusLed.className = `led-dot ${isOnline ? 'online' : 'offline'}`;
  barStatusLed.className = `led-dot ${isOnline ? 'online' : 'offline'}`;

  if (isOnline) {
    statusText.textContent = status.simulated ? 'SIMULATED' : 'ONLINE';
    barDeviceName.textContent = `${status.device || 'Jetson Orin'} (${status.ip || 'Connected'})`;
    if (status.battery !== null) {
      batteryPct.textContent = `${status.battery}%`;
      batteryBar.style.width = `${status.battery}%`;
      batteryBar.style.background = status.battery < 20 ? 'var(--accent-red)' : 'var(--accent-green)';
    }
  } else {
    statusText.textContent = 'OFFLINE';
    barDeviceName.textContent = `Jetson Orin (${api.getBaseUrl().replace(/^https?:\/\//, '')})`;
    batteryPct.textContent = '--%';
    batteryBar.style.width = '0%';
  }

  if (status.lastSync) {
    barSyncTime.textContent = `Last sync: ${status.lastSync}`;
  }
});

// Main Sync Button Action
syncToDisplayBtn.addEventListener('click', async () => {
  if (syncToDisplayBtn.disabled) return;

  syncToDisplayBtn.disabled = true;
  syncToDisplayBtn.classList.add('syncing');
  syncBtnText.innerHTML = '<span class="spinner"></span> TRANSMITTING...';

  try {
    let result;
    if (activeMode === 'text') {
      result = await api.syncText(textMode.getPayload());
    } else if (activeMode === 'image') {
      result = await api.syncImage(imageMode.getPayload());
    } else if (activeMode === 'pixel') {
      result = await api.syncImage(pixelMode.getPayload());
    } else if (activeMode === 'profile') {
      result = await api.syncProfile(profileMode.getPayload());
    }

    // Trigger physical e-paper refresh animation
    await display.triggerRefreshAnimation((ctx) => {
      renderActiveMode();
    });

    showToast(`✓ Synced ${activeMode.toUpperCase()} to SynkCard display!`, 'success');
  } catch (err) {
    showToast(`Sync error: ${err.message}`, 'error');
  } finally {
    syncToDisplayBtn.disabled = false;
    syncToDisplayBtn.classList.remove('syncing');
    syncBtnText.textContent = 'SYNC TO DISPLAY';
  }
});

// ==========================================================================
// 8. Diagnostics Drawer & Live Logs
// ==========================================================================
const toggleTerminalBtn = document.getElementById('toggleTerminalBtn');
const terminalDrawer = document.getElementById('terminalDrawer');
const terminalLogs = document.getElementById('terminalLogs');
const clearLogsBtn = document.getElementById('clearLogsBtn');
const drawerArrow = document.getElementById('drawerArrow');

toggleTerminalBtn.addEventListener('click', () => {
  const isOpen = terminalDrawer.classList.toggle('open');
  drawerArrow.textContent = isOpen ? '▲' : '▼';
});

clearLogsBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  api.clearLogs();
});

api.onLog((entry, allLogs) => {
  if (!entry && allLogs.length === 0) {
    terminalLogs.innerHTML = '<div class="log-entry" style="color: var(--text-muted);">Logs cleared.</div>';
    return;
  }
  if (!entry) return;

  const row = document.createElement('div');
  row.className = 'log-entry';
  row.innerHTML = `
    <span class="log-time">${entry.time}</span>
    <span class="log-tag ${entry.type}">${entry.type}</span>
    <span class="log-msg">${escapeHtml(entry.message)}</span>
  `;
  terminalLogs.insertBefore(row, terminalLogs.firstChild);

  // Keep max 60 elements in DOM
  while (terminalLogs.children.length > 60) {
    terminalLogs.removeChild(terminalLogs.lastChild);
  }
});

// ==========================================================================
// 9. Settings Modal (Base URL & Simulation Toggle)
// ==========================================================================
const settingsModal = document.getElementById('settingsModal');
const openSettingsBtn = document.getElementById('openSettingsBtn');
const closeSettingsBtn = document.getElementById('closeSettingsBtn');
const deviceStatusPill = document.getElementById('deviceStatusPill');
const settingsBaseUrl = document.getElementById('settingsBaseUrl');
const saveSettingsBtn = document.getElementById('saveSettingsBtn');
const testPingBtn = document.getElementById('testPingBtn');
const mockModeOffBtn = document.getElementById('mockModeOffBtn');
const mockModeOnBtn = document.getElementById('mockModeOnBtn');

const openModal = () => {
  settingsBaseUrl.value = api.getBaseUrl();
  mockModeOffBtn.classList.toggle('active', !api.isMockMode);
  mockModeOnBtn.classList.toggle('active', api.isMockMode);
  settingsModal.classList.add('open');
};

const closeModal = () => {
  settingsModal.classList.remove('open');
};

openSettingsBtn.addEventListener('click', openModal);
deviceStatusPill.addEventListener('click', openModal);
closeSettingsBtn.addEventListener('click', closeModal);
settingsModal.addEventListener('click', (e) => {
  if (e.target === settingsModal) closeModal();
});

// Preset IP buttons
document.getElementById('ipPresetJetson').addEventListener('click', () => {
  settingsBaseUrl.value = 'http://172.16.104.57:5000';
});
document.getElementById('ipPresetLocalhost').addEventListener('click', () => {
  settingsBaseUrl.value = 'http://localhost:5000';
});
document.getElementById('ipPresetLocal9999').addEventListener('click', () => {
  settingsBaseUrl.value = 'http://localhost:9999';
});

mockModeOffBtn.addEventListener('click', () => {
  mockModeOffBtn.classList.add('active');
  mockModeOnBtn.classList.remove('active');
  api.setMockMode(false);
});

mockModeOnBtn.addEventListener('click', () => {
  mockModeOnBtn.classList.add('active');
  mockModeOffBtn.classList.remove('active');
  api.setMockMode(true);
});

saveSettingsBtn.addEventListener('click', () => {
  api.setBaseUrl(settingsBaseUrl.value);
  closeModal();
  showToast(`Connected target: ${api.getBaseUrl()}`);
});

testPingBtn.addEventListener('click', async () => {
  testPingBtn.disabled = true;
  testPingBtn.textContent = 'Pinging...';
  api.setBaseUrl(settingsBaseUrl.value);
  const st = await api.checkStatus();
  testPingBtn.disabled = false;
  testPingBtn.textContent = 'Test Connection';

  if (st.online) {
    showToast(`✓ Jetson Orin reachable (${st.battery}% batt, ${st.rssi} dBm)`, 'success');
  } else {
    showToast(`✕ Unreachable: ${st.error}`, 'error');
  }
});

// ==========================================================================
// 10. Utility Functions
// ==========================================================================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✓' : type === 'error' ? '✕' : 'ℹ'}</span>
    <span>${escapeHtml(message)}</span>
  `;
  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(-10px)';
    toast.style.transition = 'all 0.2s ease';
    setTimeout(() => toast.remove(), 200);
  }, 3200);
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Initial Setup
renderActiveMode();
api.startPolling(8000);
