#!/usr/bin/env python3
"""
SynkCard Jetson Orin Real Backend Service
Runs on NVIDIA Jetson Orin at http://172.16.104.57:5000
Bridges the SynkCard Web Dashboard with the local e-Paper Emulator (http://127.0.0.1:9999).
"""

import sys
import logging
import urllib.parse
from datetime import datetime

from flask import Flask, request, jsonify
from flask_cors import CORS
import requests

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='[%(asctime)s] [%(levelname)s] %(message)s',
    datefmt='%H:%M:%S'
)
logger = logging.getLogger("JetsonBackend")

# Constants
HOST = '0.0.0.0'
PORT = 5000
EMULATOR_BASE_URL = 'http://127.0.0.1:9999'

app = Flask(__name__)
# Enable CORS for all routes (allows frontend on port 5173 to communicate seamlessly)
CORS(app, resources={r"/*": {"origins": "*"}})

@app.after_request
def apply_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, Accept'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS'
    return response


def forward_to_emulator(command_text: str):
    """
    Forwards a display command string to the local eInk emulator at http://127.0.0.1:9999/<encoded-text>
    """
    clean_text = command_text.strip()
    encoded_text = urllib.parse.quote(clean_text, safe='')
    target_url = f"{EMULATOR_BASE_URL}/{encoded_text}"
    
    logger.info(f"Forwarding to emulator: '{clean_text}' -> {target_url}")
    
    try:
        resp = requests.get(target_url, timeout=3.0)
        logger.info(f"Emulator response ({resp.status_code}): {resp.text[:100]}")
        return {
            "success": True,
            "forwarded_url": target_url,
            "emulator_status_code": resp.status_code,
            "emulator_reply": resp.text
        }
    except requests.exceptions.ConnectionError:
        logger.warning(f"Emulator connection refused at {EMULATOR_BASE_URL}. Is 'python main.py' running?")
        return {
            "success": False,
            "warning": f"Could not reach eInk emulator at {EMULATOR_BASE_URL}. Ensure 'python main.py' is running on the Jetson.",
            "forwarded_url": target_url
        }
    except Exception as e:
        logger.error(f"Error forwarding to emulator: {str(e)}")
        return {
            "success": False,
            "error": str(e),
            "forwarded_url": target_url
        }


@app.route('/api/status', methods=['GET'])
def get_status():
    """
    Health check endpoint returning device and display specs.
    Required keys: online, device, display, display_size
    """
    # Check if the local eInk emulator is responding
    emulator_reachable = False
    try:
        r = requests.get(EMULATOR_BASE_URL, timeout=1.0)
        emulator_reachable = True
    except Exception:
        emulator_reachable = False

    status_data = {
        "online": True,
        "device": "NVIDIA Jetson Orin Nano",
        "display": "Waveshare 4.3\" e-Paper",
        "display_size": "600x800",
        "ip": request.host.split(':')[0],
        "battery": 96,
        "rssi": -48,
        "emulator": {
            "url": EMULATOR_BASE_URL,
            "online": emulator_reachable
        },
        "last_sync": datetime.now().strftime("%H:%M:%S")
    }
    
    return jsonify(status_data), 200


@app.route('/api/display/text', methods=['POST'])
def display_text():
    """
    POST /api/display/text
    Receives text payload from frontend and forwards it to the eInk emulator.
    Payload: { title, subtitle, body, font, alignment, layout, timestamp }
    """
    payload = request.get_json(silent=True) or {}
    
    title = payload.get('title', '').strip()
    subtitle = payload.get('subtitle', '').strip()
    body = payload.get('body', '').strip()
    raw_text = payload.get('text', '').strip()

    # Determine display text to forward
    if raw_text:
        display_str = raw_text
    elif title and body:
        display_str = f"{title}: {body}"
    elif title:
        display_str = title
    elif body:
        display_str = body
    else:
        display_str = "SYNKCARD TEXT DEMO"

    # Forward command to eInk emulator: http://127.0.0.1:9999/<encoded-text>
    forward_result = forward_to_emulator(display_str)

    response_payload = {
        "success": True,
        "message": f"Text received: '{display_str}'",
        "text": display_str,
        "layout": payload.get('layout', 'default'),
        "font": payload.get('font', 'sans'),
        "timestamp": datetime.now().isoformat(),
        "emulator_forwarding": forward_result
    }

    return jsonify(response_payload), 200


@app.route('/api/display/image', methods=['POST'])
def display_image():
    """
    POST /api/display/image
    Receives dithered image or pixel-art payload.
    Payload: { image, format, width, height, algorithm }
    """
    payload = request.get_json(silent=True) or {}
    fmt = payload.get('format', 'monochrome-png')
    algo = payload.get('algorithm') or payload.get('mode', 'standard')
    label = payload.get('label', 'IMAGE')

    display_str = f"IMG: {label} [{algo}]"
    forward_result = forward_to_emulator(display_str)

    return jsonify({
        "success": True,
        "message": f"Image bitmap ({fmt}, {algo}) processed",
        "timestamp": datetime.now().isoformat(),
        "emulator_forwarding": forward_result
    }), 200


@app.route('/api/profile', methods=['POST'])
def display_profile():
    """
    POST /api/profile
    Receives digital profile with QR code data.
    Payload: { name, role, organization, bio, qr_data, badge_type }
    """
    payload = request.get_json(silent=True) or {}
    name = payload.get('name', 'Anonymous')
    role = payload.get('role', 'Member')

    display_str = f"BADGE: {name} ({role})"
    forward_result = forward_to_emulator(display_str)

    return jsonify({
        "success": True,
        "message": f"Profile badge updated for {name}",
        "name": name,
        "role": role,
        "timestamp": datetime.now().isoformat(),
        "emulator_forwarding": forward_result
    }), 200


if __name__ == '__main__':
    logger.info("=" * 65)
    logger.info("  SynkCard Jetson Orin Backend Server Starting")
    logger.info(f"  Listening on: http://{HOST}:{PORT}")
    logger.info(f"  eInk Emulator Target: {EMULATOR_BASE_URL}")
    logger.info("  Endpoints: GET /api/status, POST /api/display/text,")
    logger.info("             POST /api/display/image, POST /api/profile")
    logger.info("=" * 65)
    
    app.run(host=HOST, port=PORT, debug=False)
