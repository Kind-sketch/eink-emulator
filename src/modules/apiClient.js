/**
 * SynkCard Jetson Orin Hardware API Client
 * Base URL defaults to: http://172.16.104.57:5000
 */

const STORAGE_KEY_BASE_URL = 'synkcard_backend_url';
const DEFAULT_BASE_URL = 'http://172.16.104.57:5000';

class ApiClient {
  constructor() {
    this.baseUrl = localStorage.getItem(STORAGE_KEY_BASE_URL) || DEFAULT_BASE_URL;
    this.isMockMode = false;
    this.logs = [];
    this.logListeners = [];
    this.statusListeners = [];
    this.lastStatus = null;
    this.pollTimer = null;
  }

  getBaseUrl() {
    return this.baseUrl;
  }

  setBaseUrl(url) {
    let cleanUrl = url.trim().replace(/\/+$/, '');
    if (!cleanUrl.startsWith('http://') && !cleanUrl.startsWith('https://')) {
      cleanUrl = 'http://' + cleanUrl;
    }
    this.baseUrl = cleanUrl;
    localStorage.setItem(STORAGE_KEY_BASE_URL, cleanUrl);
    this.addLog('CONFIG', `Backend base URL updated to: ${cleanUrl}`);
    this.checkStatus();
  }

  setMockMode(enable) {
    this.isMockMode = !!enable;
    this.addLog('MODE', `Mock Mode ${this.isMockMode ? 'ENABLED (Simulating Jetson Orin)' : 'DISABLED (Using Live Network)'}`);
    this.checkStatus();
  }

  onLog(listener) {
    this.logListeners.push(listener);
  }

  onStatusChange(listener) {
    this.statusListeners.push(listener);
    if (this.lastStatus) listener(this.lastStatus);
  }

  notifyStatus(status) {
    this.lastStatus = status;
    this.statusListeners.forEach((fn) => fn(status));
  }

  addLog(type, message, details = null) {
    const logEntry = {
      id: Date.now() + Math.random().toString(36).substr(2, 4),
      time: new Date().toLocaleTimeString([], { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      type, // 'INFO', 'SUCCESS', 'ERROR', 'WARN', 'CONFIG', 'SYNC'
      message,
      details,
    };
    this.logs.unshift(logEntry);
    if (this.logs.length > 100) this.logs.pop();
    this.logListeners.forEach((fn) => fn(logEntry, this.logs));
  }

  getLogs() {
    return this.logs;
  }

  clearLogs() {
    this.logs = [];
    this.logListeners.forEach((fn) => fn(null, this.logs));
  }

  async checkStatus() {
    if (this.isMockMode) {
      const mockStatus = {
        online: true,
        device: 'SynkCard-Orin-E4',
        model: 'Jetson Orin Nano / Waveshare 4.3" e-Paper',
        battery: 89,
        rssi: -54,
        ip: this.baseUrl.replace(/^https?:\/\//, '').split(':')[0],
        port: 5000,
        firmware: 'v2.1.0-sim',
        lastSync: this.lastStatus?.lastSync || 'Never',
        simulated: true,
      };
      this.notifyStatus(mockStatus);
      return mockStatus;
    }

    const endpoint = `${this.baseUrl}/api/status`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    try {
      this.addLog('REQ', `GET /api/status -> ${endpoint}`);
      const res = await fetch(endpoint, {
        method: 'GET',
        headers: { 'Accept': 'application/json' },
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      const data = await res.json();
      const status = {
        online: true,
        device: data.device || 'SynkCard-Jetson',
        model: data.model || 'NVIDIA Jetson Orin',
        battery: data.battery ?? 92,
        rssi: data.rssi ?? -60,
        ip: data.ip || this.baseUrl,
        firmware: data.firmware || 'v1.4-prod',
        lastSync: data.last_sync || this.lastStatus?.lastSync || 'Active',
        simulated: false,
      };
      this.addLog('SUCCESS', `Connected to Jetson Orin (${status.battery}% battery, RSSI ${status.rssi} dBm)`);
      this.notifyStatus(status);
      return status;
    } catch (err) {
      clearTimeout(timeoutId);
      const isAbort = err.name === 'AbortError';
      const msg = isAbort ? 'Connection timed out (4s)' : err.message;
      this.addLog('WARN', `Status check failed: ${msg}`);

      const offlineStatus = {
        online: false,
        device: 'Jetson Orin (Unreachable)',
        model: 'SynkCard 4.3" e-Paper',
        battery: null,
        rssi: null,
        ip: this.baseUrl,
        error: msg,
        simulated: false,
      };
      this.notifyStatus(offlineStatus);
      return offlineStatus;
    }
  }

  startPolling(intervalMs = 10000) {
    this.stopPolling();
    this.checkStatus();
    this.pollTimer = setInterval(() => this.checkStatus(), intervalMs);
  }

  stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /**
   * POST /api/display/text
   * Payload: { title, body, font, alignment, timestamp, image }
   */
  async syncText(payload) {
    return this._post('/api/display/text', payload, 'Text Note');
  }

  /**
   * POST /api/display/image
   * Payload: { image, format, width, height, ditherMode }
   */
  async syncImage(payload) {
    return this._post('/api/display/image', payload, 'Image/PixelArt');
  }

  /**
   * POST /api/profile
   * Payload: { name, role, organization, bio, qr_data, image }
   */
  async syncProfile(payload) {
    return this._post('/api/profile', payload, 'Digital Profile');
  }

  async _post(path, payload, label) {
    const endpoint = `${this.baseUrl}${path}`;
    const startTime = Date.now();
    this.addLog('SYNC', `Sending ${label} payload to ${path}...`);

    if (this.isMockMode) {
      await new Promise((r) => setTimeout(r, 650)); // simulate wireless transmission latency
      const syncTime = new Date().toLocaleTimeString();
      if (this.lastStatus) {
        this.lastStatus.lastSync = syncTime;
        this.notifyStatus({ ...this.lastStatus, lastSync: syncTime });
      }
      this.addLog('SUCCESS', `[Simulated] Synced ${label} to e-Paper display!`, {
        status: 200,
        latency: `${Date.now() - startTime}ms`,
        payloadSize: `${Math.round(JSON.stringify(payload).length / 1024)} KB`,
      });
      return { success: true, simulated: true, message: 'Simulated transmission successful' };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 9000);

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json',
        },
        body: JSON.stringify(payload),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      const elapsed = Date.now() - startTime;
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}: ${res.statusText}`);
      }

      let data;
      try {
        data = await res.json();
      } catch {
        data = { message: 'OK' };
      }

      const syncTime = new Date().toLocaleTimeString();
      if (this.lastStatus) {
        this.lastStatus.lastSync = syncTime;
        this.notifyStatus({ ...this.lastStatus, lastSync: syncTime });
      }

      this.addLog('SUCCESS', `Successfully synced ${label} to Jetson Orin (${elapsed}ms)`, data);
      return { success: true, data, elapsed };
    } catch (err) {
      clearTimeout(timeoutId);
      const isAbort = err.name === 'AbortError';
      const msg = isAbort ? 'Request timed out after 9s' : err.message;
      this.addLog('ERROR', `Failed syncing ${label}: ${msg}`);
      throw new Error(msg);
    }
  }
}

export const api = new ApiClient();
