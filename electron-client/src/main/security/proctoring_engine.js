import { FaceLandmarker, HandLandmarker, FilesetResolver, DrawingUtils } from "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3";

// Các hàm toán học hỗ trợ
const dist = (p1, p2) => Math.hypot(p2.x - p1.x, p2.y - p1.y);
const getMedian = (arr) => {
    if (arr.length === 0) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

export class ProctoringEngine {
    constructor(config = {}) {
        this.GAZE_X_DELTA = config.gazeXDelta || 0.047;
        this.GAZE_Y_DELTA = config.gazeYDelta || 0.02;
        this.TIME_THRESHOLD_SEC = config.timeThresholdSec || 1.5;
        this.CALIBRATION_FRAMES = config.calibFrames || 30;
        this.EMA_ALPHA = config.emaAlpha || 0.01;
        this.YAW_DELTA = config.yawDelta || 0.13;
        this.PITCH_DELTA = config.pitchDelta || 0.13;

        this.onFaceStatusChange = config.onFaceStatusChange || (() => {});
        this.onGestureStatusChange = config.onGestureStatusChange || (() => {});
        
        this.faceLandmarker = null;
        this.handLandmarker = null;
        this.gestureOnnxSession = null;
        
        this.isCalibrated = false;
        this.calibrationData = { heads: [], gazesX: [], gazesY: [] };
        this.baselineHead = { pitch: 0, yaw: 0 };
        this.gazeBufferX = [];
        this.gazeBufferY = [];
        this.anomalyStartTime = 0;
        this.isAlertingFace = false;
        
        this.lastFaceTimestamp = -1;
        this.lastGestureTimestamp = -1;

        this.videoFace = null;
        this.videoGesture = null;
        this.ctxFace = null;
        this.ctxGesture = null;
        this.drawingUtilsFace = null;

        this.isRunning = false;
        this.faceLoopRunning = false;
        this.gestureLoopRunning = false;
    }

    async initializeModels() {
        const wasmFileset = await FilesetResolver.forVisionTasks("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm");

        this.faceLandmarker = await FaceLandmarker.createFromOptions(wasmFileset, {
            baseOptions: { modelAssetPath: "./models/face_landmarker.task" },
            runningMode: "VIDEO",
            numFaces: 2
        });

        this.handLandmarker = await HandLandmarker.createFromOptions(wasmFileset, {
            baseOptions: { modelAssetPath: "./models/hand_landmarker.task" },
            runningMode: "VIDEO",
            numHands: 2
        });

        this.gestureOnnxSession = await ort.InferenceSession.create("./models/gesture_model.onnx");
        return true;
    }

    async start(videoFaceEl, canvasFaceEl, videoGestureEl, canvasGestureEl) {
        this.videoFace = videoFaceEl;
        this.videoGesture = videoGestureEl;
        this.ctxFace = canvasFaceEl.getContext("2d");
        this.ctxGesture = canvasGestureEl.getContext("2d");
        this.drawingUtilsFace = new DrawingUtils(this.ctxFace);

        try {
            const devices = await navigator.mediaDevices.enumerateDevices();
            const videoDevices = devices.filter(d => d.kind === "videoinput");
            
            if (videoDevices.length < 2) throw new Error("Cần ít nhất 2 Camera!");

            const cam1Id = videoDevices.length > 1 ? videoDevices[1].deviceId : videoDevices[0].deviceId;
            const cam2Id = videoDevices[0].deviceId;

            this.isRunning = true;

            // --- SET UP CAMERA 1 ---
            const streamFace = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: cam1Id } } });
            this.videoFace.srcObject = streamFace;
            
            this.videoFace.onloadeddata = () => {
                canvasFaceEl.width = this.videoFace.videoWidth;
                canvasFaceEl.height = this.videoFace.videoHeight;
                this.videoFace.play();
            };
            
            // CHỈ GỌI LOOP KHI VIDEO ĐÃ THỰC SỰ CHẠY (Rất quan trọng để tránh lỗi WebGL)
            this.videoFace.onplaying = () => {
                if (!this.faceLoopRunning) {
                    this.faceLoopRunning = true;
                    this._runFaceLoop();
                }
            };

            // --- SET UP CAMERA 2 ---
            const streamGesture = await navigator.mediaDevices.getUserMedia({ video: { deviceId: { exact: cam2Id } } });
            this.videoGesture.srcObject = streamGesture;
            
            this.videoGesture.onloadeddata = () => {
                canvasGestureEl.width = this.videoGesture.videoWidth;
                canvasGestureEl.height = this.videoGesture.videoHeight;
                this.videoGesture.play();
            };

            // CHỈ GỌI LOOP KHI VIDEO ĐÃ THỰC SỰ CHẠY
            this.videoGesture.onplaying = () => {
                if (!this.gestureLoopRunning) {
                    this.gestureLoopRunning = true;
                    this._runGestureLoop();
                }
            };

        } catch (error) {
            console.error("Lỗi Camera:", error);
            throw error;
        }
    }

    stop() {
        this.isRunning = false;
        this.faceLoopRunning = false;
        this.gestureLoopRunning = false;
        if (this.videoFace?.srcObject) this.videoFace.srcObject.getTracks().forEach(t => t.stop());
        if (this.videoGesture?.srcObject) this.videoGesture.srcObject.getTracks().forEach(t => t.stop());
    }

    _calcGaze(landmarks) {
        const leftEye = [landmarks[33], landmarks[133], landmarks[159], landmarks[145]];
        const rightEye = [landmarks[362], landmarks[263], landmarks[386], landmarks[374]];
        const lP = landmarks[468], rP = landmarks[473];

        const lCx = (leftEye[0].x + leftEye[1].x) / 2, lCy = (leftEye[2].y + leftEye[3].y) / 2;
        const rCx = (rightEye[0].x + rightEye[1].x) / 2, rCy = (rightEye[2].y + rightEye[3].y) / 2;

        const lW = dist(leftEye[0], leftEye[1]) + 1e-6, lH = dist(leftEye[2], leftEye[3]) + 1e-6;
        const rW = dist(rightEye[0], rightEye[1]) + 1e-6, rH = dist(rightEye[2], rightEye[3]) + 1e-6;

        return {
            gazeX: (((lP.x - lCx) / lW) + ((rP.x - rCx) / rW)) / 2,
            gazeY: (((lP.y - lCy) / lH) + ((rP.y - rCy) / rH)) / 2
        };
    }

    _calcHeadProxy(landmarks) {
        const nose = landmarks[1], lEye = landmarks[33], rEye = landmarks[263], mouth = landmarks[15];
        return {
            yaw: (nose.x - lEye.x) / (rEye.x - lEye.x + 1e-6),
            pitch: (nose.y - ((lEye.y + rEye.y) / 2)) / (mouth.y - ((lEye.y + rEye.y) / 2) + 1e-6)
        };
    }

    _preprocessHands(landmarkList) {
        const bX = landmarkList[0][0], bY = landmarkList[0][1];
        const temp = landmarkList.map(([x, y]) => [x - bX, y - bY]);
        let maxV = Math.max(...temp.flat().map(Math.abs));
        if (maxV === 0) maxV = 1;
        const norm = [];
        temp.forEach(([x, y]) => { norm.push(x / maxV); norm.push(y / maxV); });
        return norm;
    }

    _runFaceLoop() {
        if (!this.isRunning) return;
        
        // KHIÊN BẢO VỆ CHỐNG LỖI WEBGL: Đảm bảo luồng pixel đã sẵn sàng
        if (this.videoFace.readyState < 3 || this.videoFace.videoWidth === 0 || this.videoFace.currentTime === 0 || this.videoFace.paused) {
            requestAnimationFrame(() => this._runFaceLoop());
            return;
        }
        
        const t = performance.now();
        
        if (this.lastFaceTimestamp !== this.videoFace.currentTime) {
            this.lastFaceTimestamp = this.videoFace.currentTime;
            
            try {
                const res = this.faceLandmarker.detectForVideo(this.videoFace, t);
                this.ctxFace.clearRect(0, 0, this.ctxFace.canvas.width, this.ctxFace.canvas.height);

                const numFaces = res.faceLandmarks ? res.faceLandmarks.length : 0;
                let anomalies = [];
                const curSec = t / 1000;

                if (numFaces === 1) {
                    const lm = res.faceLandmarks[0];
                    this.drawingUtilsFace.drawConnectors(lm, FaceLandmarker.FACE_LANDMARKS_TESSELATION, { color: "#C0C0C040", lineWidth: 1 });
                    this.drawingUtilsFace.drawConnectors(lm, FaceLandmarker.FACE_LANDMARKS_RIGHT_EYE, { color: "#FF3030", lineWidth: 2 });
                    this.drawingUtilsFace.drawConnectors(lm, FaceLandmarker.FACE_LANDMARKS_LEFT_EYE, { color: "#30FF30", lineWidth: 2 });

                    const hA = this._calcHeadProxy(lm);
                    const gA = this._calcGaze(lm);

                    if (!this.isCalibrated) {
                        this.calibrationData.heads.push(hA);
                        this.gazeBufferX.push(gA.gazeX);
                        this.gazeBufferY.push(gA.gazeY);
                        
                        this.onFaceStatusChange(`ĐANG LẤY MỐC... (${this.calibrationData.heads.length}/${this.CALIBRATION_FRAMES})`, 'warning');

                        if (this.calibrationData.heads.length >= this.CALIBRATION_FRAMES) {
                            this.baselineHead.pitch = this.calibrationData.heads.reduce((s, h) => s + h.pitch, 0) / this.CALIBRATION_FRAMES;
                            this.baselineHead.yaw = this.calibrationData.heads.reduce((s, h) => s + h.yaw, 0) / this.CALIBRATION_FRAMES;
                            this.isCalibrated = true;
                        }
                    } else {
                        if (this.gazeBufferX.length > 150) this.gazeBufferX.shift();
                        if (this.gazeBufferY.length > 150) this.gazeBufferY.shift();

                        const cBx = getMedian(this.gazeBufferX);
                        const cBy = getMedian(this.gazeBufferY);

                        const dP = Math.abs(hA.pitch - this.baselineHead.pitch);
                        const dY = Math.abs(hA.yaw - this.baselineHead.yaw);
                        const dGx = Math.abs(gA.gazeX - cBx);
                        const dGy = Math.abs(gA.gazeY - cBy);

                        if (dY > this.YAW_DELTA || dP > this.PITCH_DELTA) anomalies.push('HEAD_TURN');
                        if (dGx > this.GAZE_X_DELTA || dGy > this.GAZE_Y_DELTA) anomalies.push('EYE_GAZE');

                        if (anomalies.length > 0) {
                            if (this.anomalyStartTime === 0) this.anomalyStartTime = curSec;
                            const duration = curSec - this.anomalyStartTime;

                            if (duration < this.TIME_THRESHOLD_SEC) {
                                this.gazeBufferX.push(gA.gazeX); this.gazeBufferY.push(gA.gazeY);
                            }

                            if (duration >= this.TIME_THRESHOLD_SEC) {
                                this.isAlertingFace = true;
                                this.onFaceStatusChange(`CẢNH BÁO: ${anomalies[0]} (${duration.toFixed(1)}s)`, 'critical');
                            } else {
                                this.onFaceStatusChange(`CHÚ Ý... (${duration.toFixed(1)}s)`, 'warning');
                            }
                        } else {
                            this.anomalyStartTime = 0;
                            this.isAlertingFace = false;
                            
                            this.gazeBufferX.push(gA.gazeX); this.gazeBufferY.push(gA.gazeY);
                            this.baselineHead.pitch = this.baselineHead.pitch * (1 - this.EMA_ALPHA) + hA.pitch * this.EMA_ALPHA;
                            this.baselineHead.yaw = this.baselineHead.yaw * (1 - this.EMA_ALPHA) + hA.yaw * this.EMA_ALPHA;

                            this.onFaceStatusChange("BÌNH THƯỜNG", 'ok');
                        }
                    }
                } else {
                    if (numFaces === 0) anomalies.push('FACE_MISSING'); else anomalies.push('MULTIPLE_FACES');
                    if (this.isCalibrated) {
                        if (this.anomalyStartTime === 0) this.anomalyStartTime = curSec;
                        const duration = curSec - this.anomalyStartTime;
                        if (duration >= this.TIME_THRESHOLD_SEC) {
                            this.onFaceStatusChange(`CẢNH BÁO: ${anomalies[0]} (${duration.toFixed(1)}s)`, 'critical');
                        } else {
                            this.onFaceStatusChange(`CHÚ Ý: ${anomalies[0]}...`, 'warning');
                        }
                    } else {
                        this.onFaceStatusChange("CHƯA THẤY MẶT ĐỂ LẤY MỐC!", 'critical');
                    }
                }
            } catch (err) {
                // Bỏ qua lỗi rớt frame lẻ tẻ, không để vòng lặp chết
                console.warn("Face AI rớt frame:", err);
            }
        }
        requestAnimationFrame(() => this._runFaceLoop());
    }

    async _runGestureLoop() {
        if (!this.isRunning) return;
        
        if (this.videoGesture.readyState < 3 || this.videoGesture.videoWidth === 0 || this.videoGesture.currentTime === 0 || this.videoGesture.paused) {
            requestAnimationFrame(() => this._runGestureLoop());
            return;
        }

        const t = performance.now();
        
        if (this.lastGestureTimestamp !== this.videoGesture.currentTime) {
            this.lastGestureTimestamp = this.videoGesture.currentTime;
            
            try {
                const res = this.handLandmarker.detectForVideo(this.videoGesture, t);
                this.ctxGesture.clearRect(0, 0, this.ctxGesture.canvas.width, this.ctxGesture.canvas.height);

                if (res.landmarks && res.landmarks.length > 0) {
                    let hands = res.landmarks.map(h => ({ lm: h, wX: h[0].x })).sort((a, b) => a.wX - b.wX);
                    const features = [];

                    features.push(...this._preprocessHands(hands[0].lm.map(l => [l.x, l.y])));
                    if (hands.length > 1) {
                        features.push(...this._preprocessHands(hands[1].lm.map(l => [l.x, l.y])));
                    } else {
                        features.push(...new Array(42).fill(0.0));
                    }

                    if (this.gestureOnnxSession && features.length === 84) {
                        const inputName = this.gestureOnnxSession.inputNames[0];
                        const feed = {};
                        feed[inputName] = new ort.Tensor("float32", new Float32Array(features), [1, 84]);
                        
                        const outputMap = await this.gestureOnnxSession.run(feed);
                        const labelName = this.gestureOnnxSession.outputNames[0];
                        const probName = this.gestureOnnxSession.outputNames[1];

                        const predictedLabel = String(outputMap[labelName].data[0]);
                        let maxProb = 100;
                        try { maxProb = Math.max(...Array.from(outputMap[probName].data)) * 100; } catch (e) {}

                        const isCheating = predictedLabel.toLowerCase().includes("cheat");
                        const statusType = isCheating ? 'critical' : 'ok';
                        this.onGestureStatusChange(`${predictedLabel.toUpperCase()} (${maxProb.toFixed(1)}%)`, statusType);
                    }
                } else {
                    this.onGestureStatusChange("NO HANDS", 'warning');
                }
            } catch (err) {
                console.warn("Gesture AI rớt frame:", err);
            }
        }
        requestAnimationFrame(() => this._runGestureLoop());
    }
}