import os
import sys
import time
import base64
import io
import socket
import qrcode
from contextlib import asynccontextmanager
from typing import Optional

import cv2
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, Response
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import uvicorn
import socketio

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from proctoring import ProctoringEngine
from test_model import GestureDetector

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
BACKEND_DIR = os.path.join(os.path.dirname(CURRENT_DIR), 'backend')
STATIC_DIR = os.path.join(BACKEND_DIR, 'static')
FACE_MODEL_PATH = os.path.join(CURRENT_DIR, 'face_landmarker.task')
HAND_MODEL_PATH = os.path.join(CURRENT_DIR, 'gesture_model.pkl')
HAND_TASK_PATH = os.path.join(CURRENT_DIR, 'hand_landmarker.task')

proctor_engine: Optional[ProctoringEngine] = None
gesture_detector: Optional[GestureDetector] = None
frame_timestamp_ms = 0


def get_local_ip() -> str:
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(("8.8.8.8", 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        return "127.0.0.1"


def generate_qr_png(url: str) -> bytes:
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    return buffer.getvalue()


class ProcessFrameRequest(BaseModel):
    camera_0: Optional[str] = None
    camera_1: Optional[str] = None


class ProcessFrameResponse(BaseModel):
    camera_0: dict
    camera_1: dict
    timestamp: float


sio = socketio.AsyncServer(
    async_mode='asgi',
    cors_allowed_origins='*',
    logger=True,
    engineio_logger=True,
)


@sio.event
async def connect(sid, environ):
    print(f"[Signaling] Client connected: {sid}")


@sio.event
async def disconnect(sid):
    print(f"[Signaling] Client disconnected: {sid}")


@sio.event
async def phone_join(sid, data):
    print(f"[Signaling] Phone joined: {sid}, data: {data}")
    await sio.enter_room(sid, 'exam-room')
    await sio.emit('phone_joined', {'phoneId': sid, 'type': data.get('type', 'hand_camera')}, room='exam-room', skip_sid=sid)
    # await sio.emit('exam_ready', room='exam-room', skip_sid=sid)
    await sio.emit('exam_ready', to = sid)
    print(f"[Signaling] Phone {sid} joined exam-room")


@sio.event
async def exam_join(sid, data=None):
    print(f"[Signaling] Exam client joined: {sid}")
    await sio.enter_room(sid, 'exam-room')
    await sio.emit('exam_joined', {'examId': sid, 'phoneId': sid}, to=sid)
    await sio.emit('exam_ready', room='exam-room', skip_sid=sid)
    print(f"[Signaling] Exam {sid} joined exam-room")


@sio.event
async def offer(sid, data):
    print(f"[Signaling] Offer from {sid}")
    await sio.emit('offer', data, room='exam-room', skip_sid=sid)


@sio.event
async def answer(sid, data):
    print(f"[Signaling] Answer from {sid}")
    await sio.emit('answer', data, room='exam-room', skip_sid=sid)


@sio.event
async def ice_candidate(sid, data):
    await sio.emit('ice_candidate', data, room='exam-room', skip_sid=sid)


@asynccontextmanager
async def lifespan(app: FastAPI):
    global proctor_engine, gesture_detector, frame_timestamp_ms
    print("[AI Server] Starting...")
    try:
        if not os.path.exists(FACE_MODEL_PATH):
            print(f"[AI Server] WARNING: face_landmarker.task not found")
        if not os.path.exists(HAND_MODEL_PATH):
            print(f"[AI Server] WARNING: gesture_model.pkl not found")
        if not os.path.exists(HAND_TASK_PATH):
            print(f"[AI Server] WARNING: hand_landmarker.task not found")

        if os.path.exists(FACE_MODEL_PATH) and os.path.exists(HAND_MODEL_PATH) and os.path.exists(HAND_TASK_PATH):
            proctor_engine = ProctoringEngine(camera_index=0, model_path=FACE_MODEL_PATH)
            proctor_engine.initialize()
            proctor_engine.frame_timestamp_ms = 0
            gesture_detector = GestureDetector(model_path=HAND_MODEL_PATH, hand_task_path=HAND_TASK_PATH)
            print("[AI Server] AI models loaded")
        else:
            print("[AI Server] AI models not loaded - signaling-only mode")

        print("[AI Server] Ready")
        yield
    finally:
        if proctor_engine:
            proctor_engine.stop()
        if gesture_detector:
            gesture_detector.stop()
        print("[AI Server] Shutdown complete")


app = FastAPI(
    title="HCMUT AI Proctoring Server",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

if os.path.exists(STATIC_DIR):
    app.mount("/static", StaticFiles(directory=STATIC_DIR, html=False), name="static")
    print(f"[AI Server] Static files at /static")

socket_app = socketio.ASGIApp(sio, app)


def base64_to_frame(b64_str: str) -> Optional[np.ndarray]:
    if not b64_str:
        return None
    try:
        img_bytes = base64.b64decode(b64_str)
        nparr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(nparr, cv2.IMREAD_COLOR)
        return frame
    except Exception:
        return None


@app.get("/health")
async def health_check():
    return {
        "status": "ok",
        "proctor_loaded": proctor_engine is not None,
        "gesture_loaded": gesture_detector is not None,
    }


@app.post("/process_frame", response_model=ProcessFrameResponse)
async def process_frame(req: ProcessFrameRequest):
    global frame_timestamp_ms, proctor_engine, gesture_detector

    camera_0_result = {
        'face_count': 0,
        'calibrated': False,
        'calibration_progress': 0,
        'alerts': [],
        'gaze': {'gaze_x': 0.0, 'gaze_y': 0.0},
        'head_angle': {'pitch': 0.0, 'yaw': 0.0},
        'face_direction': 'unknown',
        'is_alerting': False,
        'violation_time': 0.0,
    }

    camera_1_result = {
        'hands_detected': 0,
        'gesture': None,
        'cheating_probability': 0.0,
        'is_cheating': False,
        'is_strike': False,
    }

    if proctor_engine is not None and req.camera_0:
        frame_0 = base64_to_frame(req.camera_0)
        if frame_0 is not None:
            camera_0_result = proctor_engine.process_frame(frame_0)

    if gesture_detector is not None and req.camera_1:
        frame_1 = base64_to_frame(req.camera_1)
        if frame_1 is not None:
            camera_1_result = gesture_detector.process_frame(frame_1, frame_timestamp_ms)
            frame_timestamp_ms += 33

    return ProcessFrameResponse(
        camera_0=camera_0_result,
        camera_1=camera_1_result,
        timestamp=time.time(),
    )


@app.post("/calibrate")
async def calibrate():
    global proctor_engine
    if proctor_engine is None:
        raise HTTPException(status_code=503, detail="Proctor engine not initialized")

    proctor_engine.is_calibrated = False
    proctor_engine.calibration_data = {'heads': [], 'gazes': []}
    proctor_engine.baseline_head = None
    proctor_engine.gaze_buffer_x.clear()
    proctor_engine.gaze_buffer_y.clear()

    return {"status": "calibration_reset", "message": "Calibration restarted"}


@app.get("/calibration_status")
async def calibration_status():
    if proctor_engine is None:
        raise HTTPException(status_code=503, detail="Proctor engine not initialized")

    from proctoring import CALIBRATION_FRAMES
    return {
        'is_calibrated': proctor_engine.is_calibrated,
        'frames_collected': len(proctor_engine.calibration_data['heads']),
        'frames_needed': CALIBRATION_FRAMES,
    }


@app.get("/phone")
async def phone_page():
    phone_html = os.path.join(STATIC_DIR, 'phone-cam.html')
    if os.path.exists(phone_html):
        return FileResponse(phone_html)
    return {"error": "phone-cam.html not found"}


@app.get("/qr")
async def qr_code(port: int = 8765):
    local_ip = get_local_ip()
    url = f"https://{local_ip}:{port}/phone"
    png_data = generate_qr_png(url)
    return Response(content=png_data, media_type="image/png")


@app.get("/qr/info")
async def qr_info(port: int = 8765):
    local_ip = get_local_ip()
    phone_url = f"https://{local_ip}:{port}/phone"
    qr_b64 = generate_qr_png(phone_url)
    return {
        'ip': local_ip,
        'url': phone_url,
        'qr': f"data:image/png;base64,{base64.b64encode(qr_b64).decode('utf-8')}",
    }


if __name__ == "__main__":
    port = int(os.environ.get("AI_SERVER_PORT", 8765))
    local_ip = get_local_ip()
    phone_url = f"https://{local_ip}:{port}/phone"
    qr_data = generate_qr_png(phone_url)

    print("=" * 50)
    print(f"[AI Server] Starting on port {port} (HTTPS)")
    print(f"[AI Server] Local IP: {local_ip}")
    print(f"[AI Server] Phone URL: {phone_url}")
    print(f"[AI Server] QR Code generated ({len(qr_data)} bytes)")
    print("=" * 50)
    print(" On the phone:")
    print(" 1. Open: " + phone_url)
    print(" 2. Click 'Advanced' on the security warning")
    print(" 3. Click 'Proceed to site (unsafe)")
    print(" 4. Allow camera access when prompted")
    print("=" * 50)

    uvicorn.run(
        socket_app,
        host="0.0.0.0",
        port=port,
        ssl_keyfile=os.path.join(CURRENT_DIR, "key.pem"),
        ssl_certfile=os.path.join(CURRENT_DIR, "cert.pem"),
        reload=False,
        log_level="info",
    )
