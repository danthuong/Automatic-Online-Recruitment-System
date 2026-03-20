# WebRTC Phone Camera Setup

This folder contains the WebRTC signaling infrastructure for using a phone as a second camera.

## Quick Start

### 1. Start the AI Server

```bash
cd ai
pip install -r requirements.txt
python server.py
```

Or use the batch script:
```bash
cd ai
start_server.bat
```

The server will show:
```
================================================
[AI Server] Starting on port 8765
[AI Server] Local IP: 192.168.x.x
[AI Server] Phone URL: http://192.168.x.x:8765/phone
================================================
```

### 2. In the Exam App

1. Go to **Pre-Exam Check**
2. Select **Camera 2 source**:
   - **USB Cameras**: Use physical webcams (existing behavior)
   - **Phone Camera**: Scan QR code with your phone
3. Click **Connect** in the Phone Camera tab
4. Wait for the phone to connect

### 3. On the Phone

1. Make sure phone is on the **same WiFi network** as the computer
2. Open your phone's camera app
3. Scan the QR code displayed in the app
4. Allow camera access when prompted
5. Position your hands in the frame

## How It Works

```
Phone Browser ──WebRTC──► Exam Client ──HTTP──► AI Server (8765)
                                  │              │
                                  │              ├── FaceLandmarker (Camera 0)
                                  │              └── GestureDetector (Camera 1)
                                  │                   
                                  │◄── Socket.IO signaling (offer/answer/ICE)
                                  │
Phone opens: http://192.168.x.x:8765/phone
         (served by: backend/static/phone-cam.html)
```

## Requirements

- Phone and computer on the **same WiFi network**
- Modern browser on the phone (Chrome, Safari, Edge)
- Python dependencies installed

## Endpoints

| URL | Description |
|-----|-------------|
| `/phone` | Phone camera page (HTML) |
| `/qr` | QR code PNG image |
| `/qr/info` | QR info as JSON (base64 QR, IP, URL) |
| `/health` | Server health check |
| `/process_frame` | AI processing (existing) |
| `/signaling` | Socket.IO WebRTC signaling |

## Troubleshooting

### Phone can't connect
- Ensure phone and PC are on the **same WiFi**
- Check if firewall is blocking port **8765**
- Try opening `http://<pc-ip>:8765/phone` directly in phone browser

### QR code doesn't scan
- Use the URL text shown below the QR code
- Manually type the URL in the phone browser

### Connection unstable
- Move closer to the WiFi router
- Reduce WiFi congestion by disconnecting other devices
