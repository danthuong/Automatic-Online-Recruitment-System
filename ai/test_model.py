import cv2
import mediapipe as mp
import numpy as np
import pandas as pd
import pickle
import os

from mediapipe.tasks import python
from mediapipe.tasks.python import vision

# --- 1. ĐỊNH NGHĨA ĐƯỜNG DẪN MÔ HÌNH ---
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(CURRENT_DIR)
MODELS_DIR = os.path.join(ROOT_DIR, 'ai_testing')
MODEL_SAVE_PATH = os.path.join(MODELS_DIR, 'gesture_model.pkl')
HAND_TASK_PATH = "hand_landmarker.task"

# --- 2. LOAD MÔ HÌNH XGBOOST ---
if not os.path.exists(MODEL_SAVE_PATH):
    print(f"[LỖI] Không tìm thấy file mô hình tại: {MODEL_SAVE_PATH}")
    exit()

print("Đang tải mô hình XGBoost...")
with open(MODEL_SAVE_PATH, 'rb') as f:
    model, label_encoder = pickle.load(f)
print("Tải mô hình thành công! Bật webcam...")

# Khởi tạo tên cột (84 cột) cho 2 tay
feature_names = []
for hand_idx in [1, 2]:
    for i in range(21):
        feature_names.extend([f"h{hand_idx}_p{i}_x", f"h{hand_idx}_p{i}_y"])

# --- 3. KHAI BÁO CÁC ĐIỂM NỐI TAY ---
HAND_CONNECTIONS = [
    (0, 1), (1, 2), (2, 3), (3, 4),         
    (0, 5), (5, 6), (6, 7), (7, 8),         
    (5, 9), (9, 10), (10, 11), (11, 12),    
    (9, 13), (13, 14), (14, 15), (15, 16),  
    (13, 17), (0, 17), (17, 18), (18, 19), (19, 20) 
]

# --- 4. CÁC HÀM HỖ TRỢ ---
def draw_hand_skeleton(frame, hand_landmarks_list, w, h):
    pixel_points = []
    for lm in hand_landmarks_list:
        cx, cy = int(lm.x * w), int(lm.y * h)
        pixel_points.append((cx, cy))
        cv2.circle(frame, (cx, cy), 4, (0, 0, 255), -1) 

    for connection in HAND_CONNECTIONS:
        start_idx, end_idx = connection[0], connection[1]
        if start_idx < len(pixel_points) and end_idx < len(pixel_points):
            pt1 = pixel_points[start_idx]
            pt2 = pixel_points[end_idx]
            cv2.line(frame, pt1, pt2, (255, 0, 0), 2)

def preprocess_landmarks(landmark_list):
    temp_landmark_list = []
    base_x, base_y = landmark_list[0]

    for x, y in landmark_list:
        temp_landmark_list.append([x - base_x, y - base_y])

    max_value = max([max(abs(x), abs(y)) for x, y in temp_landmark_list])
    if max_value == 0:
        max_value = 1

    normalized = []
    for x, y in temp_landmark_list:
        normalized.append(x / max_value)
        normalized.append(y / max_value)

    return normalized

# --- 5. KHỞI TẠO MEDIAPIPE TASKS API ---
base_options = python.BaseOptions(model_asset_path=HAND_TASK_PATH)
options = vision.HandLandmarkerOptions(
    base_options=base_options,
    running_mode=vision.RunningMode.VIDEO,
    num_hands=2,
    min_hand_detection_confidence=0.5,
    min_hand_presence_confidence=0.5,
    min_tracking_confidence=0.5
)
hand_landmarker = vision.HandLandmarker.create_from_options(options)

# --- 6. CHẠY WEBCAM VÀ DỰ ĐOÁN REAL-TIME ---
cap = cv2.VideoCapture(1)
frame_timestamp_ms = 0

while cap.isOpened():
    ret, frame = cap.read()
    if not ret:
        break
        
    h, w, _ = frame.shape
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
    result = hand_landmarker.detect_for_video(mp_image, frame_timestamp_ms)
    frame_timestamp_ms += 33 

    if result.hand_landmarks:
        # Sắp xếp tay từ trái sang phải màn hình (Dựa vào tọa độ x của điểm gốc)
        hands = sorted(result.hand_landmarks, key=lambda hand: hand[0].x)
        
        final_features = []
        
        # --- VẼ KHUNG XƯƠNG CHO TẤT CẢ CÁC TAY ---
        for hand in hands:
             draw_hand_skeleton(frame, hand, w, h)
             
        # --- XỬ LÝ DỮ LIỆU ĐƯA VÀO XGBOOST (GỘP 2 TAY) ---
        # 1. Tay thứ nhất (Tay trái)
        lm_list_1 = [[lm.x, lm.y] for lm in hands[0]]
        final_features.extend(preprocess_landmarks(lm_list_1))
        
        # Lấy tọa độ để vẽ chữ cho tay 1
        wrist_x1 = int(hands[0][0].x * w)
        wrist_y1 = int(hands[0][0].y * h)
        
        # 2. Tay thứ hai (Tay phải)
        if len(hands) > 1:
            lm_list_2 = [[lm.x, lm.y] for lm in hands[1]]
            final_features.extend(preprocess_landmarks(lm_list_2))
            # Lấy tọa độ vẽ chữ cho tay 2
            wrist_x2 = int(hands[1][0].x * w)
            wrist_y2 = int(hands[1][0].y * h)
        else:
            # Padding nếu chỉ có 1 tay
            final_features.extend([0.0] * 42)
            
        # 3. Chuyển thành DataFrame
        df_input = pd.DataFrame([final_features], columns=feature_names)
        
        # 4. Dự đoán với XGBoost
        pred_encoded = model.predict(df_input)[0]
        prob = np.max(model.predict_proba(df_input)[0]) * 100
        predicted_label = str(label_encoder.inverse_transform([pred_encoded])[0])
        
        # Tùy chỉnh trạng thái hiển thị
        is_cheating = "cheat" in predicted_label.lower() or "1" in predicted_label
        color = (0, 0, 255) if is_cheating else (0, 255, 0)
        status_text = predicted_label.upper()
        
        # 5. In kết quả lên màn hình
        # In ở cổ tay thứ 1
        cv2.putText(frame, f"{status_text} ({prob:.1f}%)", (wrist_x1 - 50, wrist_y1 + 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2, cv2.LINE_AA)
        
        # Nếu có tay 2 thì in thêm ở cổ tay 2 cho trực quan
        if len(hands) > 1:
            cv2.putText(frame, f"{status_text} ({prob:.1f}%)", (wrist_x2 - 50, wrist_y2 + 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2, cv2.LINE_AA)

    cv2.putText(frame, "Press 'q' to quit", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 255), 2)
    cv2.imshow('Custom Draw - XGBoost Tester (2 Hands)', frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()