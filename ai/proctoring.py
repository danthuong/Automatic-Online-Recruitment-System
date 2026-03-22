import cv2
import numpy as np
import time
import os
from collections import deque
from mediapipe.tasks.python.vision import FaceLandmarker, FaceLandmarkerOptions, RunningMode
from mediapipe.tasks.python.core import base_options as mp_base_options
from mediapipe.tasks.python.vision.core.image import ImageFormat
from mediapipe import Image

GAZE_X_DELTA_THRESHOLD = 0.045
GAZE_Y_DELTA_THRESHOLD = 0.007
TIME_THRESHOLD_SEC = 1.0
CALIBRATION_FRAMES = 30
EMA_ALPHA = 0.01
YAW_DELTA_THRESHOLD = 20.0
PITCH_DELTA_THRESHOLD = 20.0

LANDMARKS = {
    'nose_tip': 1, 'chin': 152,
    'left_eye_left': 33, 'left_eye_right': 133,
    'right_eye_left': 362, 'right_eye_right': 263,
    'left_pupil': 468, 'right_pupil': 473,
    'left_eye_top': 159, 'left_eye_bottom': 145,
    'right_eye_top': 386, 'right_eye_bottom': 374,
    'mouth_left': 61, 'mouth_right': 291
}


class ProctoringEngine:
    def __init__(self, camera_index=0, model_path=None):
        self.camera_index = camera_index
        self.model_path = model_path
        self.cap = None
        self.face_landmarker = None
        
        self.is_running = False
        self.alerts = []
        self.alert_callback = None
        
        self.frame_timestamp_ms = 0
        self.frame_duration_ms = 33
        
        self.baseline_head = None
        
        self.gaze_buffer_x = deque(maxlen=150)
        self.gaze_buffer_y = deque(maxlen=150)
        
        self.is_calibrated = False
        self.calibration_data = {'heads': [], 'gazes': []}
        
        self.anomaly_start_time = 0
        self.is_alerting = False

    def initialize(self):
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(f"Model not found at: {self.model_path}")
        with open(self.model_path, 'rb') as f:
            model_data = f.read()
        base_options = mp_base_options.BaseOptions(model_asset_buffer=model_data)
        options = FaceLandmarkerOptions(
            base_options=base_options,
            running_mode=RunningMode.VIDEO,
            num_faces=2,
            min_face_presence_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        self.face_landmarker = FaceLandmarker.create_from_options(options)
        self.cap = cv2.VideoCapture(self.camera_index)
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        
        if not self.cap.isOpened():
            raise RuntimeError("Cannot open camera")
        print(f"[ProctoringEngine] Initialized camera {self.camera_index}")
        return self

    def set_alert_callback(self, callback):
        self.alert_callback = callback

    def _emit_alert(self, alert_type, message):
        alert = {'type': alert_type, 'message': message, 'timestamp': time.time()}
        self.alerts.append(alert)
        if self.alert_callback:
            self.alert_callback(alert)

    def _calculate_head_angle_pnp(self, landmarks, frame_width, frame_height):
        face_3d = np.array([
            (0.0, 0.0, 0.0),
            (0.0, 100.0, -20.0),
            (-225.0, 170.0, -135.0),
            (225.0, 170.0, -135.0),
            (-350.0, 100.0, -300.0),
            (350.0, 100.0, -300.0)
        ], dtype=np.float64)

        face_2d = np.array([
            [landmarks[1].x * frame_width, landmarks[1].y * frame_height],
            [landmarks[168].x * frame_width, landmarks[168].y * frame_height],
            [landmarks[33].x * frame_width, landmarks[33].y * frame_height],
            [landmarks[263].x * frame_width, landmarks[263].y * frame_height],
            [landmarks[234].x * frame_width, landmarks[234].y * frame_height],
            [landmarks[454].x * frame_width, landmarks[454].y * frame_height]
        ], dtype=np.float64)

        focal_length = frame_width
        cam_matrix = np.array([[focal_length, 0, frame_width / 2], [0, focal_length, frame_height / 2], [0, 0, 1]], dtype=np.float64)
        dist_coeffs = np.zeros((4, 1), dtype=np.float64)

        success, rvec, tvec = cv2.solvePnP(face_3d, face_2d, cam_matrix, dist_coeffs)
        if not success:
            return 0, 0
        
        rmat, _ = cv2.Rodrigues(rvec)
        angles, _, _, _, _, _ = cv2.RQDecomp3x3(rmat)
        
        return angles[0], angles[1]

    def _calculate_gaze_scale_invariant(self, landmarks):
        left_eye = [landmarks[LANDMARKS['left_eye_left']], landmarks[LANDMARKS['left_eye_right']], landmarks[LANDMARKS['left_eye_top']], landmarks[LANDMARKS['left_eye_bottom']]]
        right_eye = [landmarks[LANDMARKS['right_eye_left']], landmarks[LANDMARKS['right_eye_right']], landmarks[LANDMARKS['right_eye_top']], landmarks[LANDMARKS['right_eye_bottom']]]
        left_pupil, right_pupil = landmarks[LANDMARKS['left_pupil']], landmarks[LANDMARKS['right_pupil']]

        left_center_x, left_center_y = (left_eye[0].x + left_eye[1].x) / 2, (left_eye[2].y + left_eye[3].y) / 2
        right_center_x, right_center_y = (right_eye[0].x + right_eye[1].x) / 2, (right_eye[2].y + right_eye[3].y) / 2

        left_w = np.linalg.norm([left_eye[1].x - left_eye[0].x, left_eye[1].y - left_eye[0].y]) + 1e-6
        left_h = np.linalg.norm([left_eye[3].x - left_eye[2].x, left_eye[3].y - left_eye[2].y]) + 1e-6
        right_w = np.linalg.norm([right_eye[1].x - right_eye[0].x, right_eye[1].y - right_eye[0].y]) + 1e-6
        right_h = np.linalg.norm([right_eye[3].x - right_eye[2].x, right_eye[3].y - right_eye[2].y]) + 1e-6

        left_gx, left_gy = (left_pupil.x - left_center_x) / left_w, (left_pupil.y - left_center_y) / left_h
        right_gx, right_gy = (right_pupil.x - right_center_x) / right_w, (right_pupil.y - right_center_y) / right_h

        return {'gaze_x': (left_gx + right_gx) / 2, 'gaze_y': (left_gy + right_gy) / 2}

    def _detect_anomaly(self, head_angle, gaze_data):
        if not self.is_calibrated or len(self.gaze_buffer_x) < CALIBRATION_FRAMES:
            return [], 0, 0, 0
        
        delta_pitch = abs(head_angle[0] - self.baseline_head[0])
        delta_yaw = abs(head_angle[1] - self.baseline_head[1])
        
        current_base_gaze_x = np.median(self.gaze_buffer_x)
        current_base_gaze_y = np.median(self.gaze_buffer_y)
        
        delta_gaze_x = abs(gaze_data['gaze_x'] - current_base_gaze_x)
        delta_gaze_y = abs(gaze_data['gaze_y'] - current_base_gaze_y)
        
        anomalies = []
        
        if delta_yaw > YAW_DELTA_THRESHOLD or delta_pitch > PITCH_DELTA_THRESHOLD: 
            anomalies.append('HEAD_TURN')
            
        if delta_gaze_x > GAZE_X_DELTA_THRESHOLD or delta_gaze_y > GAZE_Y_DELTA_THRESHOLD: 
            anomalies.append('EYE_GAZE')
        
        max_head_delta = max(delta_pitch, delta_yaw)
        
        return anomalies, max_head_delta, delta_gaze_x, delta_gaze_y

    def process_frame(self, frame):
        h, w, _ = frame.shape
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = Image(ImageFormat.SRGB, rgb_frame)
        
        detection_result = self.face_landmarker.detect_for_video(mp_image, self.frame_timestamp_ms)
        self.frame_timestamp_ms += self.frame_duration_ms
        
        return self._process_result(detection_result, w, h)

    def _process_result(self, detection_result, frame_w, frame_h):
        anomalies = []
        delta_head = delta_gaze_x = delta_gaze_y = 0
        head_angle = (0, 0)
        gaze_data = {'gaze_x': 0, 'gaze_y': 0}

        num_faces = len(detection_result.face_landmarks) if detection_result.face_landmarks else 0
        
        if num_faces == 1:
            landmarks = detection_result.face_landmarks[0]
            head_angle = self._calculate_head_angle_pnp(landmarks, frame_w, frame_h)
            gaze_data = self._calculate_gaze_scale_invariant(landmarks)
            
            if not self.is_calibrated:
                self.calibration_data['heads'].append(head_angle)
                self.gaze_buffer_x.append(gaze_data['gaze_x'])
                self.gaze_buffer_y.append(gaze_data['gaze_y'])
                
                if len(self.calibration_data['heads']) >= CALIBRATION_FRAMES:
                    self.baseline_head = (np.mean([h[0] for h in self.calibration_data['heads']]), np.mean([h[1] for h in self.calibration_data['heads']]))
                    self.is_calibrated = True
            else:
                anomalies, delta_head, delta_gaze_x, delta_gaze_y = self._detect_anomaly(head_angle, gaze_data)
                
                if anomalies:
                    if self.anomaly_start_time == 0:
                        self.anomaly_start_time = time.time()
                    
                    duration = time.time() - self.anomaly_start_time
                    if duration < TIME_THRESHOLD_SEC:
                        self.gaze_buffer_x.append(gaze_data['gaze_x'])
                        self.gaze_buffer_y.append(gaze_data['gaze_y'])
                    
                    if duration >= TIME_THRESHOLD_SEC:
                        if not self.is_alerting:
                            msg = f"Looked away for {duration:.1f}s ({anomalies[0]})"
                            self._emit_alert('SUSPICIOUS', msg)
                            self.is_alerting = True
                else:
                    self.anomaly_start_time = 0
                    self.is_alerting = False
                    
                    self.gaze_buffer_x.append(gaze_data['gaze_x'])
                    self.gaze_buffer_y.append(gaze_data['gaze_y'])
                    
                    self.baseline_head = (
                        self.baseline_head[0] * (1 - EMA_ALPHA) + head_angle[0] * EMA_ALPHA,
                        self.baseline_head[1] * (1 - EMA_ALPHA) + head_angle[1] * EMA_ALPHA
                    )
        
        else:
            if num_faces == 0:
                anomalies.append('FACE_MISSING')
                alert_prefix = "Face missing"
            else:
                anomalies.append('MULTIPLE_FACES')
                alert_prefix = f"Multiple faces detected"
            
            if self.is_calibrated:
                if self.anomaly_start_time == 0:
                    self.anomaly_start_time = time.time()
                
                duration = time.time() - self.anomaly_start_time
                if duration >= TIME_THRESHOLD_SEC:
                    if not self.is_alerting:
                        msg = f"{alert_prefix} for {duration:.1f}s"
                        self._emit_alert('CRITICAL', msg)
                        self.is_alerting = True

        calibration_progress = 0
        if not self.is_calibrated:
            calibration_progress = len(self.calibration_data['heads'])

        face_direction = 'center'
        if self.is_calibrated and num_faces == 1:
            if abs(head_angle[1]) > 15:
                face_direction = 'left' if head_angle[1] < 0 else 'right'
            elif abs(head_angle[0]) > 15:
                face_direction = 'up' if head_angle[0] < 0 else 'down'

        return {
            'face_count': num_faces,
            'calibrated': self.is_calibrated,
            'calibration_progress': calibration_progress,
            'alerts': [{'type': a, 'message': msg, 'timestamp': time.time()} 
                       for a in anomalies for msg in ([''])],
            'gaze': gaze_data,
            'head_angle': {'pitch': float(head_angle[0]), 'yaw': float(head_angle[1])},
            'delta_head': float(delta_head),
            'delta_gaze_x': float(delta_gaze_x),
            'delta_gaze_y': float(delta_gaze_y),
            'face_direction': face_direction,
            'is_alerting': self.is_alerting,
            'violation_time': time.time() - self.anomaly_start_time if self.anomaly_start_time > 0 else 0,
        }

    def stop(self):
        self.is_running = False
        if self.cap:
            self.cap.release()
        print("[ProctoringEngine] Stopped")

if __name__ == '__main__':
    model_path = "face_landmarker.task"
    try:
        proctoring = ProctoringEngine(camera_index=0, model_path=model_path)
        proctoring.set_alert_callback(lambda a: print(f"\n[!] ALERT: {a['message']}"))
        print("Starting proctoring... Press 'q' to quit")
        proctoring.run()
    except Exception as e:
        print(f"Error: {e}. Check webcam and face_landmarker.task path.")