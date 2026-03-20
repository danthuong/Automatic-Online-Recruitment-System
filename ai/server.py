import os
import sys
import time
import base64
import io
import traceback
from contextlib import asynccontextmanager
from typing import Optional

import cv2
import numpy as np
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import uvicorn

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from proctoring import ProctoringEngine
from test_model import GestureDetector

CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
AI_TESTING_DIR = os.path.join(os.path.dirname(CURRENT_DIR), 'ai_testing')
FACE_MODEL_PATH = os.path.join(CURRENT_DIR, 'face_landmarker.task')
HAND_MODEL_PATH = os.path.join(CURRENT_DIR, 'gesture_model.pkl')
HAND_TASK_PATH = os.path.join(CURRENT_DIR, 'hand_landmarker.task')

proctor_engine: Optional[ProctoringEngine] = None
gesture_detector: Optional[GestureDetector] = None

frame_timestamp_ms = 0


class ProcessFrameRequest(BaseModel):
    camera_0: Optional[str] = None
    camera_1: Optional[str] = None


class ProcessFrameResponse(BaseModel):
    camera_0: dict
    camera_1: dict
    timestamp: float


@asynccontextmanager
async def lifespan(app: FastAPI):
    global proctor_engine, gesture_detector, frame_timestamp_ms
    print("[AI Server] Starting...")
    try:
        if not os.path.exists(FACE_MODEL_PATH):
            raise FileNotFoundError(f"face_landmarker.task not found at {FACE_MODEL_PATH}")
        if not os.path.exists(HAND_MODEL_PATH):
            raise FileNotFoundError(f"gesture_model.pkl not found at {HAND_MODEL_PATH}")
        if not os.path.exists(HAND_TASK_PATH):
            raise FileNotFoundError(f"hand_landmarker.task not found at {HAND_TASK_PATH}")

        proctor_engine = ProctoringEngine(camera_index=0, model_path=FACE_MODEL_PATH)
        proctor_engine.initialize()
        proctor_engine.frame_timestamp_ms = 0

        gesture_detector = GestureDetector(model_path=HAND_MODEL_PATH, hand_task_path=HAND_TASK_PATH)

        print("[AI Server] All AI models loaded successfully")
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

    if proctor_engine is None or gesture_detector is None:
        raise HTTPException(status_code=503, detail="AI models not initialized")

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

    if req.camera_0:
        frame_0 = base64_to_frame(req.camera_0)
        if frame_0 is not None:
            camera_0_result = proctor_engine.process_frame(frame_0)

    if req.camera_1:
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


if __name__ == "__main__":
    port = int(os.environ.get("AI_SERVER_PORT", 8765))
    print(f"[AI Server] Starting server on port {port}")
    uvicorn.run("server:app", host="127.0.0.1", port=port, reload=False)
