import cv2
import numpy as np
import time
from collections import deque
from mediapipe.tasks.python.vision import FaceLandmarker, FaceLandmarkerOptions, RunningMode
from mediapipe.tasks.python.core import base_options as mp_base_options
from mediapipe.tasks.python.vision.core.image import ImageFormat
from mediapipe import Image

# ----------------- CẤU HÌNH NGƯỠNG -----------------
GAZE_X_DELTA_THRESHOLD = 0.045    # Ngưỡng liếc ngang (X) - Khoảng 4% chiều rộng mắt
GAZE_Y_DELTA_THRESHOLD = 0.007     # Ngưỡng liếc dọc (Y) - Để thấp hơn X một chút vì thường chiều cao màn hình ngắn hơn chiều dài
TIME_THRESHOLD_SEC = 1.0          # Nhìn đi chỗ khác LIÊN TỤC 1 giây mới cảnh báo
CALIBRATION_FRAMES = 30           # Số frame để lấy mốc ban đầu
EMA_ALPHA = 0.01                  # Tốc độ học tư thế mới (1% mỗi frame hợp lệ)
YAW_DELTA_THRESHOLD = 20.0        # Ngưỡng lệch ngang (Trái/Phải)
PITCH_DELTA_THRESHOLD = 20.0      # Ngưỡng lệch dọc (Cúi/Ngửa) - Rộng hơn để cho phép chống cằm/cúi viết bài

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
        
        # Biến cho Dynamic Baseline
        self.baseline_head = None
        
        # BỘ ĐỆM ROLLING MEDIAN CHO MẮT (Lưu 150 frame gần nhất)
        self.gaze_buffer_x = deque(maxlen=150)
        self.gaze_buffer_y = deque(maxlen=150)
        
        self.is_calibrated = False
        self.calibration_data = {'heads': [], 'gazes': []}
        
        # Biến cho Time Threshold
        self.anomaly_start_time = 0
        self.is_alerting = False

    def initialize(self):
        base_options = mp_base_options.BaseOptions(model_asset_path=self.model_path)
        options = FaceLandmarkerOptions(
            base_options=base_options,
            running_mode=RunningMode.VIDEO,
            num_faces=2,                       # set 2 để theo dõi coi có hơn 2 người không
            min_face_presence_confidence=0.5,
            min_tracking_confidence=0.5,
        )
        self.face_landmarker = FaceLandmarker.create_from_options(options)
        self.cap = cv2.VideoCapture(self.camera_index)
        self.cap.set(cv2.CAP_PROP_FRAME_WIDTH, 640)
        self.cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 480)
        
        if not self.cap.isOpened():
            raise RuntimeError("Cannot open camera")
        print("[Proctoring] Initialized successfully")
        return self

    def set_alert_callback(self, callback):
        self.alert_callback = callback

    def _emit_alert(self, alert_type, message):
        alert = {'type': alert_type, 'message': message, 'timestamp': time.time()}
        self.alerts.append(alert)
        if self.alert_callback:
            self.alert_callback(alert)

    def _calculate_head_angle_pnp(self, landmarks, frame_width, frame_height):
        # SỬ DỤNG "RIGID UPPER FACE" (Nửa trên cố định của khuôn mặt)
        face_3d = np.array([
            (0.0, 0.0, 0.0),             # Chóp mũi (Nose tip - 1)
            (0.0, 100.0, -20.0),         # Gốc mũi (Nasion - 168)
            (-225.0, 170.0, -135.0),     # Khóe mắt trái (33)
            (225.0, 170.0, -135.0),      # Khóe mắt phải (263)
            (-350.0, 100.0, -300.0),     # Thái dương trái / Cạnh tai (234)
            (350.0, 100.0, -300.0)       # Thái dương phải / Cạnh tai (454)
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
        
        # angle[0] là Cúi/Ngửa (Pitch), angle[1] là Trái/Phải (Yaw)
        return angles[0], angles[1]

    # TÍNH LIẾC MẮT SCALE-INVARIANT
    def _calculate_gaze_scale_invariant(self, landmarks):
        left_eye = [landmarks[LANDMARKS['left_eye_left']], landmarks[LANDMARKS['left_eye_right']], landmarks[LANDMARKS['left_eye_top']], landmarks[LANDMARKS['left_eye_bottom']]]
        right_eye = [landmarks[LANDMARKS['right_eye_left']], landmarks[LANDMARKS['right_eye_right']], landmarks[LANDMARKS['right_eye_top']], landmarks[LANDMARKS['right_eye_bottom']]]
        left_pupil, right_pupil = landmarks[LANDMARKS['left_pupil']], landmarks[LANDMARKS['right_pupil']]

        # Tâm mắt
        left_center_x, left_center_y = (left_eye[0].x + left_eye[1].x) / 2, (left_eye[2].y + left_eye[3].y) / 2
        right_center_x, right_center_y = (right_eye[0].x + right_eye[1].x) / 2, (right_eye[2].y + right_eye[3].y) / 2

        # Kích thước khung mắt
        left_w = np.linalg.norm([left_eye[1].x - left_eye[0].x, left_eye[1].y - left_eye[0].y]) + 1e-6
        left_h = np.linalg.norm([left_eye[3].x - left_eye[2].x, left_eye[3].y - left_eye[2].y]) + 1e-6
        right_w = np.linalg.norm([right_eye[1].x - right_eye[0].x, right_eye[1].y - right_eye[0].y]) + 1e-6
        right_h = np.linalg.norm([right_eye[3].x - right_eye[2].x, right_eye[3].y - right_eye[2].y]) + 1e-6

        # Tính tỷ lệ lệch
        left_gx, left_gy = (left_pupil.x - left_center_x) / left_w, (left_pupil.y - left_center_y) / left_h
        right_gx, right_gy = (right_pupil.x - right_center_x) / right_w, (right_pupil.y - right_center_y) / right_h

        return {'gaze_x': (left_gx + right_gx) / 2, 'gaze_y': (left_gy + right_gy) / 2}

    def _detect_anomaly(self, head_angle, gaze_data):
        # Đảm bảo đã có đủ data để tính toán
        if not self.is_calibrated or len(self.gaze_buffer_x) < CALIBRATION_FRAMES:
            return [], 0, 0, 0
        
        # 1. TÍNH TOÁN ĐỘ LỆCH ĐẦU (so với 30 frame đầu tiên đã Calibrate và sau đó có EMA để cập nhật dần baseline)
        delta_pitch = abs(head_angle[0] - self.baseline_head[0])
        delta_yaw = abs(head_angle[1] - self.baseline_head[1])
        
        # 2. TÍNH TOÁN ĐỘ LỆCH MẮT (Dùng Rolling Median của 150 frame gần nhất để làm baseline động)
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

    def _on_results(self, detection_result, frame_w, frame_h):
        anomalies = []
        delta_head = delta_gaze_x = delta_gaze_y = 0
        head_angle = (0, 0)


        num_faces = len(detection_result.face_landmarks) if detection_result.face_landmarks else 0
        # --- NẾU NHẬN DIỆN ĐƯỢC KHUÔN MẶT ---
        if num_faces == 1:
            landmarks = detection_result.face_landmarks[0]
            head_angle = self._calculate_head_angle_pnp(landmarks, frame_w, frame_h)
            gaze_data = self._calculate_gaze_scale_invariant(landmarks)
            
            # Quá trình Calibration cho Đầu
            if not self.is_calibrated:
                self.calibration_data['heads'].append(head_angle)
                
                # Trong lúc Calibrate, luôn nhét data vào buffer cho mắt
                self.gaze_buffer_x.append(gaze_data['gaze_x'])
                self.gaze_buffer_y.append(gaze_data['gaze_y'])
                
                if len(self.calibration_data['heads']) >= CALIBRATION_FRAMES:
                    self.baseline_head = (np.mean([h[0] for h in self.calibration_data['heads']]), np.mean([h[1] for h in self.calibration_data['heads']]))
                    self.is_calibrated = True
            else:
                anomalies, delta_head, delta_gaze_x, delta_gaze_y = self._detect_anomaly(head_angle, gaze_data)
                
                # Xử lý Cảnh báo khi có Khuôn mặt (Head/Gaze Anomalies)
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
        
        # --- NẾU KHÔNG NHẬN DIỆN ĐƯỢC KHUÔN MẶT NÀO ---
        else:
            if num_faces == 0:
                anomalies.append('FACE_MISSING')
                alert_prefix = "Face missing"
            else:
                anomalies.append('MULTIPLE_FACES')
                alert_prefix = f"Multiple faces detected"
            
            # Chỉ bắt đầu đếm giờ nếu hệ thống ĐÃ ĐƯỢC CALIBRATE
            # (Tránh trường hợp lúc mới bật app người dùng chưa kịp ngồi vào ghế đã bị phạt)
            if self.is_calibrated:
                if self.anomaly_start_time == 0:
                    self.anomaly_start_time = time.time()
                
                duration = time.time() - self.anomaly_start_time
                if duration >= TIME_THRESHOLD_SEC:
                    if not self.is_alerting:
                        msg = f"{alert_prefix} for {duration:.1f}s"
                        self._emit_alert('CRITICAL', msg)
                        self.is_alerting = True

        return anomalies, head_angle, delta_head, delta_gaze_x, delta_gaze_y

    def process_frame(self, frame):
        h, w, _ = frame.shape
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = Image(ImageFormat.SRGB, rgb_frame)
        
        detection_result = self.face_landmarker.detect_for_video(mp_image, self.frame_timestamp_ms)
        self.frame_timestamp_ms += self.frame_duration_ms
        
        # NHẬN BIẾN Gaze X và Gaze Y
        anomalies, head_angle, delta_head, delta_gaze_x, delta_gaze_y = self._on_results(detection_result, w, h)
        
        calib_status = "CALIBRATED" if self.is_calibrated else f"CALIBRATING ({CALIBRATION_FRAMES - len(self.calibration_data['heads'])})"
        
        violation_time = 0
        if self.anomaly_start_time > 0:
            violation_time = time.time() - self.anomaly_start_time
            
        status_color = (0, 0, 255) if self.is_alerting else ((0, 165, 255) if violation_time > 0 else (0, 255, 0))
        status_text = "ALERT!" if self.is_alerting else ("WARNING..." if violation_time > 0 else "OK")
        
        cv2.putText(frame, f"Status: {status_text}", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, status_color, 2)
        if violation_time > 0:
            cv2.putText(frame, f"Time: {violation_time:.1f}s / {TIME_THRESHOLD_SEC}s", (10, 60), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (0, 165, 255), 2)
            
        cv2.putText(frame, f"Head Delta: {delta_head:.1f} deg", (10, 90), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        
        # HIỂN THỊ RÕ Gaze X VÀ Gaze Y
        cv2.putText(frame, f"Gaze: X({delta_gaze_x:.3f}) Y({delta_gaze_y:.3f})", (10, 115), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 1)
        
        cv2.putText(frame, calib_status, (10, 140), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 0), 1)
        
        return frame

    def run(self):
        self.initialize()
        self.is_running = True
        
        while self.is_running:
            ret, frame = self.cap.read()
            if not ret: break
            
            frame = cv2.flip(frame, 1) # Lật ảnh cho giống soi gương
            annotated_frame = self.process_frame(frame)
            
            cv2.imshow('Proctoring AI V2', annotated_frame)
            if cv2.waitKey(1) & 0xFF == ord('q'): break
                
        self.stop()
        return self.alerts

    def stop(self):
        self.is_running = False
        if self.cap: self.cap.release()
        cv2.destroyAllWindows()
        print("[Proctoring] Stopped")

if __name__ == '__main__':
    model_path = "face_landmarker.task"
    try:
        proctoring = ProctoringEngine(camera_index=0, model_path=model_path)
        proctoring.set_alert_callback(lambda a: print(f"\n[!] ALERT: {a['message']}"))
        print("Starting proctoring... Press 'q' to quit")
        proctoring.run()
    except Exception as e:
        print(f"Error: {e}. Check webcam and face_landmarker.task path.")