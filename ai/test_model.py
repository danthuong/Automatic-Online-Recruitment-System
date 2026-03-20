import cv2
import numpy as np
import pandas as pd
import pickle
import os

from mediapipe.tasks.python.core import base_options as mp_base_options
from mediapipe.tasks.python.vision import HandLandmarker, HandLandmarkerOptions, RunningMode
from mediapipe import Image, ImageFormat

HAND_CONNECTIONS = [
    (0, 1), (1, 2), (2, 3), (3, 4),
    (0, 5), (5, 6), (6, 7), (7, 8),
    (5, 9), (9, 10), (10, 11), (11, 12),
    (9, 13), (13, 14), (14, 15), (15, 16),
    (13, 17), (0, 17), (17, 18), (18, 19), (19, 20)
]

CHEATING_CONFIDENCE_THRESHOLD = 0.70
CHEATING_STRIKE_THRESHOLD = 0.90


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


class GestureDetector:
    def __init__(self, model_path=None, hand_task_path=None):
        self.model_path = model_path or self._find_model_path()
        self.hand_task_path = hand_task_path or self._find_hand_task_path()
        self.model = None
        self.label_encoder = None
        self.hand_landmarker = None
        self._load_model()
        self._init_mediapipe()

    def _find_model_path(self):
        root_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
        return os.path.join(root_dir, 'ai_testing', 'gesture_model.pkl')

    def _find_hand_task_path(self):
        return 'hand_landmarker.task'

    def _load_model(self):
        if not os.path.exists(self.model_path):
            raise FileNotFoundError(f"Model not found at: {self.model_path}")

        with open(self.model_path, 'rb') as f:
            self.model, self.label_encoder = pickle.load(f)

        feature_names = []
        for hand_idx in [1, 2]:
            for i in range(21):
                feature_names.extend([f"h{hand_idx}_p{i}_x", f"h{hand_idx}_p{i}_y"])
        self.feature_names = feature_names

    def _init_mediapipe(self):
        base_options = mp_base_options.BaseOptions(model_asset_path=self.hand_task_path)
        options = HandLandmarkerOptions(
            base_options=base_options,
            running_mode=RunningMode.VIDEO,
            num_hands=2,
            min_hand_detection_confidence=0.5,
            min_hand_presence_confidence=0.5,
            min_tracking_confidence=0.5
        )
        self.hand_landmarker = HandLandmarker.create_from_options(options)

    def process_frame(self, frame, frame_timestamp_ms=0):
        h, w, _ = frame.shape
        rgb_frame = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        mp_image = Image(ImageFormat.SRGB, rgb_frame)
        result = self.hand_landmarker.detect_for_video(mp_image, frame_timestamp_ms)

        if not result.hand_landmarks:
            return {
                'hands_detected': 0,
                'gesture': None,
                'cheating_probability': 0.0,
                'is_cheating': False,
                'is_strike': False,
            }

        hands = sorted(result.hand_landmarks, key=lambda hand: hand[0].x)
        hands_detected = len(hands)

        final_features = []
        lm_list_1 = [[lm.x, lm.y] for lm in hands[0]]
        final_features.extend(preprocess_landmarks(lm_list_1))

        if len(hands) > 1:
            lm_list_2 = [[lm.x, lm.y] for lm in hands[1]]
            final_features.extend(preprocess_landmarks(lm_list_2))
        else:
            final_features.extend([0.0] * 42)

        df_input = pd.DataFrame([final_features], columns=self.feature_names)
        pred_encoded = self.model.predict(df_input)[0]
        probs = self.model.predict_proba(df_input)[0]
        cheating_prob = 0.0

        for i, label in enumerate(self.label_encoder.classes_):
            if 'cheat' in str(label).lower():
                cheating_prob = float(probs[i])
                break

        predicted_label = str(self.label_encoder.inverse_transform([pred_encoded])[0])

        is_cheating = 'cheat' in predicted_label.lower() or cheating_prob >= CHEATING_CONFIDENCE_THRESHOLD
        is_strike = cheating_prob >= CHEATING_STRIKE_THRESHOLD

        return {
            'hands_detected': hands_detected,
            'gesture': predicted_label,
            'cheating_probability': float(cheating_prob * 100),
            'confidence': float(np.max(probs) * 100),
            'is_cheating': is_cheating,
            'is_strike': is_strike,
        }

    def stop(self):
        if self.hand_landmarker:
            self.hand_landmarker.close()
        print("[GestureDetector] Stopped")
