# SynkCard — Wireless E-Paper Display Controller Dashboard

A mobile-first hardware-product companion dashboard for **SynkCard**, an ultra-low-power customizable e-paper display with wireless synchronization powered by an NVIDIA Jetson Orin backend.

Built for mobile demonstration, presentation, and hardware control over local network Wi-Fi.

---

## 🌟 Key Features

1. **Simulated 600×800 Monochrome E-Paper Canvas**
   - Exact 600×800 native resolution backing canvas embedded in a realistic hardware bezel with laser markings and status LEDs.
   - **Authentic Waveform Refresh Cycle**: Simulates the physical electrophoretic clear flash (black flash → white flash → settled high-contrast pigment) with optional tactile piezo sound clicks.
   - **Direct 600×800 PNG Export**: Save the generated 1-bit monochrome bitmap for hardware calibration or documentation.

2. **Note & Text Creation (`POST /api/display/text`)**
   - Headline title, subtitle, and multi-line body with automatic text wrapping and bullet-point formatting.
   - Pre-designed hardware templates: *College Project Demo*, *Desk: Do Not Disturb*, *Lab 304 Schedule*, and *Engineering Quote*.
   - Typography choices (JetBrains Mono, Clean Sans, Classic Serif) and card/grid/banner layouts.

3. **Image Upload & Hardware Dithering Engine (`POST /api/display/image`)**
   - Real-time conversion of photos and schematics into 1-bit monochrome e-paper bitmaps.
   - Camera direct capture support for smartphone presentations.
   - Dithering algorithms:
     - **Floyd-Steinberg Error Diffusion** (industry standard e-paper dithering)
     - **Atkinson Dithering** (retro Macintosh / high-clarity e-ink)
     - **Bayer 4×4 Ordered Dithering** (cross-hatch halftone)
     - **Binary Threshold** (high contrast black & white)
   - Real-time contrast, brightness, scale (Fit/Fill), and color inversion controls.

4. **Pixel-Art Mode (`POST /api/display/image`)**
   - Touchscreen-optimized drawing canvas with pointer capture (prevents accidental phone scrolling while sketching).
   - Tools: Pencil (1-bit draw), Eraser, Bucket Fill (flood fill), Invert, Clear.
   - Configurable grid resolutions (16×16, 24×24, 32×32) and preset glyphs (*Microchip*, *Heart*, *Wi-Fi*, *Retro Console*).

5. **Digital Profile & Live QR Code (`POST /api/profile`)**
   - Dynamic smart badge generator for conferences, project evaluations, and student IDs.
   - In-browser vector QR code generator embedded directly into the 600×800 canvas.
   - Multiple badge templates: *Conference Badge*, *College Student ID*, and *Minimalist vCard*.

6. **Jetson Orin Hardware Link & Diagnostics**
   - Default backend: `http://172.16.104.57:5000` (configurable via in-app Settings modal).
   - Auto-polling `GET /api/status` with LED ping, live battery level, RSSI, and last sync timestamp.
   - **Simulated / Mock Mode Toggle**: Seamless fallback if the Jetson Orin is offline or local Wi-Fi router isolates client devices during viva/evaluations.
   - Expandable live transmission console drawer showing HTTP status codes, payload sizes, and transmission latencies.

---

## 🚀 Quickstart

### 1. Launch the Frontend
```bash
# Install dependencies
npm install

# Start development server with LAN host exposure
npm run dev
```
The server will output:
- Local URL: `http://localhost:5173/`
- Mobile/Network URL: `http://<your-laptop-ip>:5173/`

Open the **Network URL** on your smartphone connected to the same Wi-Fi network to run the mobile presentation!

### 2. Run the Services on the Jetson Orin (172.16.104.57)

On your Jetson Orin device, you will run two lightweight processes:

#### Terminal 1 — Start the eInk Display Emulator
```bash
# Runs the Waveshare e-Paper emulator listening on port 9999
python main.py
```

#### Terminal 2 — Start the SynkCard Flask Backend
```bash
# Install dependencies (Flask, flask-cors, requests)
pip install -r requirements.txt

# Start the Flask backend server on port 5000
python app.py
```

The backend server listens on `0.0.0.0:5000` (accessible at `http://172.16.104.57:5000`).
When the frontend dashboard sends text via `POST /api/display/text`, the backend automatically translates and forwards the command to the emulator at `http://127.0.0.1:9999/<encoded-text>`.

---

## 📡 API Specification

| Method | Endpoint | Description | Payload |
|---|---|---|---|
| `GET` | `/api/status` | Device health check | Returns `{ status, battery, rssi, last_sync, model }` |
| `POST` | `/api/display/text` | Sends text note | `{ title, subtitle, body, font, alignment, layout, image_base64 }` |
| `POST` | `/api/display/image` | Sends dithered image | `{ image, format: "monochrome-png", width: 600, height: 800, algorithm }` |
| `POST` | `/api/profile` | Updates digital badge | `{ name, role, organization, bio, qr_data, image_base64 }` |

---

## 📱 Mobile Demonstration Workflow

1. Connect your phone and laptop to the same Wi-Fi or mobile hotspot.
2. Open `http://<laptop-ip>:5173` on your phone browser.
3. Tap the **Settings icon (⚙️)** to verify or set the Jetson Orin IP (`http://172.16.104.57:5000`).
4. Select any mode (**Note**, **Image**, **Pixel**, **Profile**), edit the parameters or select a preset.
5. Tap **“SYNC TO DISPLAY”** at the bottom of the screen to transmit the payload to the Jetson Orin and trigger the animated e-paper refresh flash!
