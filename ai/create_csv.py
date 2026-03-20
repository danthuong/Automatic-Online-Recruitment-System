# import os
# import csv
# import cv2
# import numpy as np
# import mediapipe as mp

# from mediapipe.tasks import python
# from mediapipe.tasks.python import vision


# # ===============================
# # Initialize MediaPipe HandLandmarker
# # ===============================

# base_options = python.BaseOptions(
#     model_asset_path="hand_landmarker.task"
# )

# options = vision.HandLandmarkerOptions(
#     base_options=base_options,
#     num_hands=1
# )

# detector = vision.HandLandmarker.create_from_options(options)


# # ===============================
# # Landmark normalization
# # ===============================

# def preprocess_landmarks(landmark_list):
#     """
#     Chuẩn hóa landmark:
#     1. Dời gốc về cổ tay
#     2. Scale theo kích thước bàn tay
#     """
#     temp_landmark_list = []
#     base_x, base_y = landmark_list[0]

#     for x, y in landmark_list:
#         temp_landmark_list.append([x - base_x, y - base_y])

#     max_value = max([max(abs(x), abs(y)) for x, y in temp_landmark_list])

#     if max_value == 0:
#         max_value = 1

#     normalized = []
#     for x, y in temp_landmark_list:
#         normalized.append(x / max_value)
#         normalized.append(y / max_value)

#     return normalized


# # ===============================
# # Helper: Detect & Preprocess 1 Frame
# # ===============================
# def detect_and_preprocess(rgb_image):
#     """Chạy AI trên 1 khung hình RGB và trả về mảng 42 phần tử"""
#     mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)
#     result = detector.detect(mp_image)

#     if not result.hand_landmarks:
#         return None

#     hand = result.hand_landmarks[0]
#     landmark_list = [[lm.x, lm.y] for lm in hand]
    
#     return preprocess_landmarks(landmark_list)


# # ===============================
# # Extract landmarks with Augmentation
# # ===============================

# def extract_landmarks_augmented(img_path):
#     """
#     Load ảnh, chạy AI trên ảnh GỐC và ảnh LẬT NGANG.
#     Trả về danh sách chứa [features_gốc, features_lật]
#     """
#     extracted_features = []
    
#     try:
#         # Load bằng OpenCV để dễ lật ảnh
#         image_bgr = cv2.imread(img_path)
#         if image_bgr is None:
#             return extracted_features

#         image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)

#         # 1. Trích xuất từ ảnh GỐC
#         features_orig = detect_and_preprocess(image_rgb)
#         if features_orig:
#             extracted_features.append(features_orig)

#         # 2. Trích xuất từ ảnh LẬT NGANG (Data Augmentation)
#         image_flipped = cv2.flip(image_rgb, 1)
#         features_flipped = detect_and_preprocess(image_flipped)
#         if features_flipped:
#             extracted_features.append(features_flipped)

#         return extracted_features

#     except Exception as e:
#         print(f"Lỗi khi đọc file {img_path}: {e}")
#         return extracted_features


# # ===============================
# # Dataset extraction
# # ===============================

# def run_extraction(data_dir, output_file):
    
#     output_dir = os.path.dirname(output_file)
#     if output_dir:
#         os.makedirs(output_dir, exist_ok=True)

#     with open(output_file, "w", newline="") as f:

#         writer = csv.writer(f)
#         header = [f"p{i}_{axis}" for i in range(21) for axis in ["x", "y"]] + ["label"]
#         writer.writerow(header)

#         total_images = 0
#         success = 0

#         for category in sorted(os.listdir(data_dir)):

#             cat_path = os.path.join(data_dir, category)

#             if not os.path.isdir(cat_path):
#                 continue

#             if category == "6-clap":
#                 continue

#             print(f"\n--- Processing label: {category} ---")

#             for root, dirs, files in os.walk(cat_path):

#                 for filename in files:

#                     if not filename.lower().endswith((".png", ".jpg", ".jpeg")):
#                         continue

#                     img_path = os.path.join(root, filename)
#                     total_images += 1

#                     # Nhận về 1 list chứa TỐI ĐA 2 feature (gốc và lật)
#                     features_list = extract_landmarks_augmented(img_path)

#                     # Ghi từng feature tìm được vào CSV
#                     for features in features_list:
#                         writer.writerow(features + [category])
#                         success += 1
#             print(f"Hoàn thành label '{category}'. Tổng ảnh: {total_images}, Dòng data thu được: {success}")

#     print("\n==============================")
#     print("Hoàn thành quá trình trích xuất")
#     print("Tổng số ảnh gốc đã quét:", total_images)
#     print("Tổng số dòng data thu được (Gốc + Lật):", success)
#     print("Đã lưu vào:", output_file)
#     print("==============================")


# # ===============================
# # Run script
# # ===============================

# if __name__ == "__main__":

#     run_extraction(
#         "D:/bku_docs/lotus hackathon/extracted_frames",
#         "hand_gestures.csv"
#     )


import os
import csv
import cv2
import numpy as np
import mediapipe as mp

from mediapipe.tasks import python
from mediapipe.tasks.python import vision


# ===============================
# Initialize MediaPipe HandLandmarker
# ===============================

base_options = python.BaseOptions(
    model_asset_path="hand_landmarker.task"
)

options = vision.HandLandmarkerOptions(
    base_options=base_options,
    num_hands=2  # [CẬP NHẬT] Bắt buộc tìm tối đa 2 tay
)

detector = vision.HandLandmarker.create_from_options(options)


# ===============================
# Landmark normalization
# ===============================

def preprocess_landmarks(landmark_list):
    """
    Chuẩn hóa landmark (Giữ nguyên logic cực xịn của bạn)
    """
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


# ===============================
# Helper: Detect & Preprocess 1 Frame (CẬP NHẬT CHO 2 TAY)
# ===============================
def detect_and_preprocess(rgb_image):
    """Chạy AI, trả về mảng ĐÚNG 84 phần tử (42 cho tay 1, 42 cho tay 2)"""
    mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb_image)
    result = detector.detect(mp_image)

    if not result.hand_landmarks:
        return None

    # Sắp xếp các tay từ trái sang phải màn hình dựa vào tọa độ x của cổ tay (điểm 0)
    # Điều này giúp feature tay trái luôn đứng trước tay phải, chống nhiễu data
    hands = result.hand_landmarks
    hands = sorted(hands, key=lambda hand: hand[0].x)

    final_features = []

    # XỬ LÝ TAY THỨ NHẤT (Tay bên trái)
    lm_list_1 = [[lm.x, lm.y] for lm in hands[0]]
    final_features.extend(preprocess_landmarks(lm_list_1))

    # XỬ LÝ TAY THỨ HAI (Nếu có)
    if len(hands) > 1:
        lm_list_2 = [[lm.x, lm.y] for lm in hands[1]]
        final_features.extend(preprocess_landmarks(lm_list_2))
    else:
        # PADDING: Nếu chỉ có 1 tay, đệm 42 số 0.0 vào vị trí của tay thứ 2
        # XGBoost sẽ tự động nhận diện mẫu [0.0]*42 này là "Không có tay 2"
        final_features.extend([0.0] * 42)

    return final_features


# ===============================
# Extract landmarks with Augmentation
# ===============================

def extract_landmarks_augmented(img_path):
    extracted_features = []
    
    try:
        image_bgr = cv2.imread(img_path)
        if image_bgr is None:
            return extracted_features

        image_rgb = cv2.cvtColor(image_bgr, cv2.COLOR_BGR2RGB)

        # 1. Trích xuất từ ảnh GỐC
        features_orig = detect_and_preprocess(image_rgb)
        if features_orig:
            extracted_features.append(features_orig)

        # 2. Trích xuất từ ảnh LẬT NGANG
        # Khi lật ảnh, tay trái thành tay phải, code sort by X ở trên sẽ tự đảo vị trí 2 tay. Quá mượt!
        image_flipped = cv2.flip(image_rgb, 1)
        features_flipped = detect_and_preprocess(image_flipped)
        if features_flipped:
            extracted_features.append(features_flipped)

        return extracted_features

    except Exception as e:
        print(f"Lỗi khi đọc file {img_path}: {e}")
        return extracted_features


# ===============================
# Dataset extraction
# ===============================

def run_extraction(data_dir, output_file):
    
    output_dir = os.path.dirname(output_file)
    if output_dir:
        os.makedirs(output_dir, exist_ok=True)

    with open(output_file, "w", newline="") as f:
        writer = csv.writer(f)
        
        # [CẬP NHẬT] Tạo Header 84 cột: h1_p0_x -> h1_p20_y và h2_p0_x -> h2_p20_y
        header = []
        for hand_idx in [1, 2]:
            for i in range(21):
                header.extend([f"h{hand_idx}_p{i}_x", f"h{hand_idx}_p{i}_y"])
        header.append("label")
        
        writer.writerow(header)

        total_images = 0
        success = 0

        for category in sorted(os.listdir(data_dir)):
            cat_path = os.path.join(data_dir, category)

            if not os.path.isdir(cat_path) or category == "6-clap":
                continue

            print(f"\n--- Processing label: {category} ---")

            for root, dirs, files in os.walk(cat_path):
                for filename in files:
                    if not filename.lower().endswith((".png", ".jpg", ".jpeg")):
                        continue

                    img_path = os.path.join(root, filename)
                    total_images += 1

                    features_list = extract_landmarks_augmented(img_path)

                    for features in features_list:
                        # Đảm bảo đúng 84 cột feature trước khi ghi
                        if len(features) == 84:
                            writer.writerow(features + [category])
                            success += 1

            print(f"Hoàn thành label '{category}'. Dòng data thu được: {success}")

    print("\n==============================")
    print("Hoàn thành quá trình trích xuất")
    print("Tổng số ảnh gốc đã quét:", total_images)
    print("Tổng số dòng data 84-features thu được (Gốc + Lật):", success)
    print("Đã lưu vào:", output_file)
    print("==============================")

if __name__ == "__main__":
    run_extraction(
        "D:/bku_docs/lotus hackathon/extracted_frames",
        "hand_gestures.csv"
    )