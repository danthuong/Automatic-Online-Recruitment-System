import cv2
import mediapipe as mp
import numpy as np
import os
import onnxruntime as ort

from mediapipe.tasks import python
from mediapipe.tasks.python import vision

# --- 1. ĐỊNH NGHĨA ĐƯỜNG DẪN MÔ HÌNH ---
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
ROOT_DIR = os.path.dirname(CURRENT_DIR)
MODELS_DIR = os.path.join(ROOT_DIR, 'ai_testing')

MODEL_ONNX_PATH = os.path.join(MODELS_DIR, 'gesture_model.onnx')
HAND_TASK_PATH = "hand_landmarker.task"

if not os.path.exists(MODEL_ONNX_PATH):
    print(f"[LỖI] Không tìm thấy file ONNX tại: {MODEL_ONNX_PATH}")
    exit()

# --- 2. LOAD MÔ HÌNH BẰNG ONNX RUNTIME ---
print("Đang tải mô hình ONNX...")
# Khởi tạo phiên chạy (Inference Session)
sess = ort.InferenceSession(MODEL_ONNX_PATH)

# Lấy tên của cổng vào (Input) và cổng ra (Output) của mô hình ONNX
input_name = sess.get_inputs()[0].name
label_name = sess.get_outputs()[0].name
prob_name = sess.get_outputs()[1].name # Cổng này chứa xác suất (Probability)

# Label mapping thủ công dựa trên log lúc nãy bạn convert (0: cheating, 1: legit)
# Nếu log của bạn khác thì đổi lại thứ tự mảng này nhé
LABELS = ['cheating', 'legit'] 

print("Tải mô hình ONNX thành công! Bật webcam...")

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

# --- 6. CHẠY WEBCAM VÀ DỰ ĐOÁN VỚI ONNX ---
cap = cv2.VideoCapture(1) # Thay thành 0 nếu cam của bạn ở cổng 0
frame_timestamp_ms = 0

while cap.isOpened():
    ret, frame = cap.read()
    if not ret: break
        
    h, w, _ = frame.shape
    rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
    
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_frame)
    result = hand_landmarker.detect_for_video(mp_image, frame_timestamp_ms)
    frame_timestamp_ms += 33 

    if result.hand_landmarks:
        # Sắp xếp tay từ trái sang phải
        hands = sorted(result.hand_landmarks, key=lambda hand: hand[0].x)
        final_features = []
        
        for hand in hands:
             draw_hand_skeleton(frame, hand, w, h)
             
        # Tay 1
        lm_list_1 = [[lm.x, lm.y] for lm in hands[0]]
        final_features.extend(preprocess_landmarks(lm_list_1))
        wrist_x1, wrist_y1 = int(hands[0][0].x * w), int(hands[0][0].y * h)
        
        # Tay 2
        if len(hands) > 1:
            lm_list_2 = [[lm.x, lm.y] for lm in hands[1]]
            final_features.extend(preprocess_landmarks(lm_list_2))
            wrist_x2, wrist_y2 = int(hands[1][0].x * w), int(hands[1][0].y * h)
        else:
            final_features.extend([0.0] * 42) # Padding
            
        # ==========================================
        # CHẠY DỰ ĐOÁN BẰNG ONNX
        # ONNX nhận vào NumPy array kiểu float32
        # ==========================================
        input_data = np.array([final_features], dtype=np.float32)
        
        # Hàm run trả về kết quả tương ứng với danh sách output yêu cầu
        pred_onx = sess.run([label_name, prob_name], {input_name: input_data})
        
        # pred_onx[0] chứa nhãn dự đoán (0 hoặc 1)
        pred_idx = pred_onx[0][0]
        
        # pred_onx[1] chứa dict xác suất, vd: [{0: 0.9, 1: 0.1}]
        prob_dict = pred_onx[1][0]
        prob = prob_dict[pred_idx] * 100
        
        # Decode nhãn số thành chữ dựa vào mảng LABELS
        predicted_label = LABELS[pred_idx]
        
        # Tùy chỉnh trạng thái hiển thị
        is_cheating = predicted_label == 'cheating'
        color = (0, 0, 255) if is_cheating else (0, 255, 0)
        status_text = predicted_label.upper()
        
        # In kết quả
        cv2.putText(frame, f"{status_text} ({prob:.1f}%)", (wrist_x1 - 50, wrist_y1 + 30),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2, cv2.LINE_AA)
        
        if len(hands) > 1:
            cv2.putText(frame, f"{status_text} ({prob:.1f}%)", (wrist_x2 - 50, wrist_y2 + 30),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2, cv2.LINE_AA)

    cv2.putText(frame, "ONNX Runtime Testing", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 0.7, (255, 255, 0), 2)
    cv2.imshow('ONNX Tester', frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cap.release()
cv2.destroyAllWindows()