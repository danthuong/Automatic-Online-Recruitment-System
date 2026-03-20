import pickle
import onnxmltools
from onnxmltools.convert.common.data_types import FloatTensorType
import os

# Đường dẫn file
MODEL_PKL_PATH = 'gesture_model.pkl'
MODEL_ONNX_PATH = 'gesture_model.onnx'

if not os.path.exists(MODEL_PKL_PATH):
    print(f"[LỖI] Không tìm thấy {MODEL_PKL_PATH}")
    exit()

print("1. Đang tải mô hình XGBoost từ file pickle...")
with open(MODEL_PKL_PATH, 'rb') as f:
    model, label_encoder = pickle.load(f)

labels = label_encoder.classes_
print(f"-> Các nhãn mô hình đã học: {labels}")

# ==========================================
# FIX LỖI TÊN FEATURE CỦA ONNXMLTOOLS
# Đổi "h1_p8_y" thành "f0", "f1", "f2"...
# ==========================================
print("2. Đang chuẩn hóa tên feature để tương thích với ONNX...")
booster = model.get_booster()
booster.feature_names = [f"f{i}" for i in range(len(booster.feature_names))]

print("3. Đang cấu hình Input cho ONNX...")
initial_type = [('float_input', FloatTensorType([None, 84]))]

print("4. Đang chuyển đổi sang ONNX...")
onnx_model = onnxmltools.convert_xgboost(model, initial_types=initial_type)

print("5. Đang lưu file...")
with open(MODEL_ONNX_PATH, "wb") as f:
    f.write(onnx_model.SerializeToString())

print(f"\n[THÀNH CÔNG] Đã xuất mô hình ra: {MODEL_ONNX_PATH}")