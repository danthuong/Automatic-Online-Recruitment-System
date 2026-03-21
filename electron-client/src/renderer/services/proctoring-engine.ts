// @ts-nocheck
// ONNX Runtime loaded via script tag in index.html
// MediaPipe loaded dynamically from CDN with caching

const MODEL_WASM_PATH = "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm";
const FACE_MODEL_PATH = "/models/face_landmarker.task";
const HAND_MODEL_PATH = "/models/hand_landmarker.task";
const GESTURE_MODEL_PATH = "/models/gesture_model.onnx";

const dist = (p1: { x: number; y: number }, p2: { x: number; y: number }) =>
  Math.hypot(p2.x - p1.x, p2.y - p1.y);

const getMedian = (arr: number[]): number => {
  if (arr.length === 0) return 0;
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 !== 0 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
};

export interface FaceStatus {
  faceCount: number;
  calibrated: boolean;
  calibrationProgress: number;
  faceDirection: string;
  gazeX: number;
  gazeY: number;
  headPitch: number;
  headYaw: number;
  anomalies: string[];
  alertType: "ok" | "warning" | "critical";
  alertMessage: string;
}

export interface GestureStatus {
  handsDetected: number;
  gesture: string | null;
  isCheating: boolean;
  probability: number;
  alertType: "ok" | "warning" | "critical";
  alertMessage: string;
}

export interface ProctoringEngineConfig {
  gazeXDelta?: number;
  gazeYDelta?: number;
  timeThresholdSec?: number;
  calibFrames?: number;
  emaAlpha?: number;
  yawDelta?: number;
  pitchDelta?: number;
  onFaceStatusChange?: (status: FaceStatus) => void;
  onGestureStatusChange?: (status: GestureStatus) => void;
}

export class ProctoringEngine {
  private GAZE_X_DELTA: number;
  private GAZE_Y_DELTA: number;
  private TIME_THRESHOLD_SEC: number;
  private CALIBRATION_FRAMES: number;
  private EMA_ALPHA: number;
  private YAW_DELTA: number;
  private PITCH_DELTA: number;

  private faceLandmarker: any = null;
  private handLandmarker: any = null;
  private gestureOnnxSession: any = null;
  private mpModule: any = null;

  private isCalibrated = false;
  private calibrationData: { heads: Array<{ pitch: number; yaw: number }>; gazesX: number[]; gazesY: number[] } = {
    heads: [],
    gazesX: [],
    gazesY: [],
  };
  private baselineHead = { pitch: 0, yaw: 0 };
  private anomalyStartTime = 0;
  private isAlertingFace = false;

  private lastFaceTimestamp = -1;
  private lastGestureTimestamp = -1;

  private videoFace: HTMLVideoElement | null = null;
  private videoGesture: HTMLVideoElement | null = null;
  private canvasFace: HTMLCanvasElement | null = null;
  private canvasGesture: HTMLCanvasElement | null = null;
  private ctxFace: CanvasRenderingContext2D | null = null;
  private ctxGesture: CanvasRenderingContext2D | null = null;

  private isRunning = false;
  private faceLoopRunning = false;
  private gestureLoopRunning = false;
  private sessionId = 0;

  private _faceState: FaceStatus = {
    faceCount: 0,
    calibrated: false,
    calibrationProgress: 0,
    faceDirection: "unknown",
    gazeX: 0,
    gazeY: 0,
    headPitch: 0,
    headYaw: 0,
    anomalies: [],
    alertType: "ok",
    alertMessage: "BÌNH THƯỜNG",
  };

  private _gestureState: GestureStatus = {
    handsDetected: 0,
    gesture: null,
    isCheating: false,
    probability: 0,
    alertType: "ok",
    alertMessage: "NO HANDS",
  };

  private onFaceStatusChange: (status: FaceStatus) => void;
  private onGestureStatusChange: (status: GestureStatus) => void;

  constructor(config: ProctoringEngineConfig = {}) {
    console.log("[ProctoringEngine] Constructor called");
    
    this.GAZE_X_DELTA = config.gazeXDelta ?? 0.047;
    this.GAZE_Y_DELTA = config.gazeYDelta ?? 0.02;
    this.TIME_THRESHOLD_SEC = config.timeThresholdSec ?? 1.5;
    this.CALIBRATION_FRAMES = config.calibFrames ?? 30;
    this.EMA_ALPHA = config.emaAlpha ?? 0.01;
    this.YAW_DELTA = config.yawDelta ?? 0.13;
    this.PITCH_DELTA = config.pitchDelta ?? 0.13;
    this.onFaceStatusChange = config.onFaceStatusChange ?? (() => {});
    this.onGestureStatusChange = config.onGestureStatusChange ?? (() => {});
  }

  async initializeModels(): Promise<void> {
    console.log("[ProctoringEngine] initializeModels() START");
    
    // Step 1: Wait for ONNX Runtime
    console.log("[ProctoringEngine] Waiting for ONNX Runtime...");
    const ortWaitStart = Date.now();
    while (!(window as any).ort?.InferenceSession) {
      if (Date.now() - ortWaitStart > 15000) {
        throw new Error("ONNX Runtime failed to load within 15s");
      }
      await new Promise(r => setTimeout(r, 50));
    }
    console.log("[ProctoringEngine] ONNX Runtime ready");

    const ort = (window as any).ort;

    // Step 2: Load MediaPipe module (cached)
    if (!this.mpModule) {
      console.log("[ProctoringEngine] Loading MediaPipe from CDN...");
      const mpStart = Date.now();
      
      try {
        this.mpModule = await import("https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/+esm");
        console.log(`[ProctoringEngine] MediaPipe loaded in ${Date.now() - mpStart}ms`);
      } catch (err) {
        console.error("[ProctoringEngine] MediaPipe CDN load failed:", err);
        throw new Error("Failed to load MediaPipe from CDN");
      }
    }
    
    const { FilesetResolver, FaceLandmarker, HandLandmarker, DrawingUtils } = this.mpModule;

    // Expose for static access
    (window as any).FilesetResolver = FilesetResolver;
    (window as any).FaceLandmarker = FaceLandmarker;
    (window as any).HandLandmarker = HandLandmarker;
    (window as any).DrawingUtils = DrawingUtils;

    // Step 3: Create WASM fileset
    console.log("[ProctoringEngine] Creating WASM fileset...");
    const wasmFileset = await FilesetResolver.forVisionTasks(MODEL_WASM_PATH);
    console.log("[ProctoringEngine] WASM fileset ready");

    // Step 4: Create FaceLandmarker
    console.log("[ProctoringEngine] Creating FaceLandmarker...");
    this.faceLandmarker = await FaceLandmarker.createFromOptions(wasmFileset, {
      baseOptions: { modelAssetPath: FACE_MODEL_PATH },
      runningMode: "VIDEO",
      numFaces: 2,
    });
    console.log("[ProctoringEngine] FaceLandmarker ready");

    // Step 5: Create HandLandmarker
    console.log("[ProctoringEngine] Creating HandLandmarker...");
    this.handLandmarker = await HandLandmarker.createFromOptions(wasmFileset, {
      baseOptions: { modelAssetPath: HAND_MODEL_PATH },
      runningMode: "VIDEO",
      numHands: 2,
    });
    console.log("[ProctoringEngine] HandLandmarker ready");

    // Step 6: Create ONNX session
    console.log("[ProctoringEngine] Creating ONNX session...");
    this.gestureOnnxSession = await ort.InferenceSession.create(GESTURE_MODEL_PATH);
    console.log("[ProctoringEngine] ONNX session ready");
    
    console.log("[ProctoringEngine] initializeModels() COMPLETE");
  }

  start(
    videoFaceEl: HTMLVideoElement,
    canvasFaceEl: HTMLCanvasElement,
    videoGestureEl: HTMLVideoElement,
    canvasGestureEl: HTMLCanvasElement
  ): void {
    console.log("[ProctoringEngine] start() called");
    console.log(`[ProctoringEngine]   face: readyState=${videoFaceEl.readyState} videoWidth=${videoFaceEl.videoWidth} paused=${videoFaceEl.paused}`);
    console.log(`[ProctoringEngine]   gesture: readyState=${videoGestureEl.readyState} videoWidth=${videoGestureEl.videoWidth} paused=${videoGestureEl.paused}`);

    if (this.videoFace) {
      this.videoFace.onloadeddata = null;
      this.videoFace.onplaying = null;
      this.videoFace.onerror = null;
    }
    if (this.videoGesture) {
      this.videoGesture.onloadeddata = null;
      this.videoGesture.onplaying = null;
      this.videoGesture.onerror = null;
    }

    const faceW = videoFaceEl.videoWidth || 640;
    const faceH = videoFaceEl.videoHeight || 480;
    const handW = videoGestureEl.videoWidth || 640;
    const handH = videoGestureEl.videoHeight || 480;
    canvasFaceEl.width = faceW;
    canvasFaceEl.height = faceH;
    canvasGestureEl.width = handW;
    canvasGestureEl.height = handH;

    this.videoFace = videoFaceEl;
    this.videoGesture = videoGestureEl;
    this.canvasFace = canvasFaceEl;
    this.canvasGesture = canvasGestureEl;
    this.ctxFace = canvasFaceEl.getContext("2d");
    this.ctxGesture = canvasGestureEl.getContext("2d");

    this.isRunning = true;
    this.isCalibrated = false;
    this.calibrationData = { heads: [], gazesX: [], gazesY: [] };
    this.baselineHead = { pitch: 0, yaw: 0 };
    this.anomalyStartTime = 0;
    this.isAlertingFace = false;
    this.faceLoopRunning = false;
    this.gestureLoopRunning = false;
    this.lastFaceTimestamp = -1;
    this.lastGestureTimestamp = -1;
    this.gazeBufferX = [];
    this.gazeBufferY = [];
    this.sessionId++;

    console.log("[ProctoringEngine] Canvas dims set:", canvasFaceEl.width, "x", canvasFaceEl.height);
    console.log("[ProctoringEngine] Starting face detection loop");
    this._runFaceLoop();
    
    console.log("[ProctoringEngine] Starting gesture detection loop");
    this._runGestureLoop();
    
    console.log("[ProctoringEngine] start() COMPLETE");
  }

  stop(): void {
    console.log("[ProctoringEngine] stop() called — setting isRunning=false (sessionId=" + this.sessionId + ")");
    this.isRunning = false;
    this.faceLoopRunning = false;
    this.gestureLoopRunning = false;
    console.log("[ProctoringEngine] stop() COMPLETE");
  }

  resetCalibration(): void {
    console.log("[ProctoringEngine] resetCalibration() called");
    this.isCalibrated = false;
    this.calibrationData = { heads: [], gazesX: [], gazesY: [] };
    this.baselineHead = { pitch: 0, yaw: 0 };
    this.anomalyStartTime = 0;
    this.isAlertingFace = false;
  }

  getFaceState(): FaceStatus {
    return this._faceState;
  }

  getGestureState(): GestureStatus {
    return this._gestureState;
  }

  getCalibrationProgress(): number {
    if (this.isCalibrated) return this.CALIBRATION_FRAMES;
    return this.calibrationData.heads.length;
  }

  isEngineCalibrated(): boolean {
    return this.isCalibrated;
  }

  private _calcGaze(landmarks: Array<{ x: number; y: number; z?: number }>) {
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

  private _calcHeadProxy(landmarks: Array<{ x: number; y: number; z?: number }>) {
    const nose = landmarks[1], lEye = landmarks[33], rEye = landmarks[263], mouth = landmarks[15];
    return {
      yaw: (nose.x - lEye.x) / (rEye.x - lEye.x + 1e-6),
      pitch: (nose.y - ((lEye.y + rEye.y) / 2)) / (mouth.y - ((lEye.y + rEye.y) / 2) + 1e-6)
    };
  }

  private _preprocessHands(landmarkList: Array<[number, number]>) {
    const bX = landmarkList[0][0], bY = landmarkList[0][1];
    const temp = landmarkList.map(([x, y]) => [x - bX, y - bY]);
    let maxV = Math.max(...temp.flat().map(Math.abs));
    if (maxV === 0) maxV = 1;
    const norm: number[] = [];
    temp.forEach(([x, y]) => { norm.push(x / maxV); norm.push(y / maxV); });
    return norm;
  }

  private _emitFaceStatus(state: Partial<FaceStatus>): void {
    this._faceState = { ...this._faceState, ...state };
    this.onFaceStatusChange(this._faceState);
  }

  private _emitGestureStatus(state: Partial<GestureStatus>): void {
    this._gestureState = { ...this._gestureState, ...state };
    this.onGestureStatusChange(this._gestureState);
  }

  private _runFaceLoop(): void {
    const session = this.sessionId;
    if (!this.isRunning || session !== this.sessionId) return;
    if (!this.faceLandmarker || !this.videoFace || !this.ctxFace) {
      requestAnimationFrame(() => this._runFaceLoop());
      return;
    }

    const video = this.videoFace;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      requestAnimationFrame(() => this._runFaceLoop());
      return;
    }

    if (this.canvasFace && (this.canvasFace.width !== video.videoWidth || this.canvasFace.height !== video.videoHeight)) {
      this.canvasFace.width = video.videoWidth;
      this.canvasFace.height = video.videoHeight;
      console.log(`[ProctoringEngine] Face canvas dims updated: ${this.canvasFace.width}x${this.canvasFace.height}`);
    }

    if (video.readyState < 2 || video.paused) {
      requestAnimationFrame(() => this._runFaceLoop());
      return;
    }

    try {
      const t0 = performance.now();
      const res = this.faceLandmarker.detectForVideo(video, t0);
      const t1 = performance.now();

      this.ctxFace.clearRect(0, 0, this.ctxFace.canvas.width, this.ctxFace.canvas.height);

      const numFaces = res.faceLandmarks ? res.faceLandmarks.length : 0;
      const anomalies: string[] = [];
      const curSec = t0 / 1000;

      if (numFaces === 1) {
        const lm = res.faceLandmarks[0];

        const hA = this._calcHeadProxy(lm);
        const gA = this._calcGaze(lm);

        if (!this.isCalibrated) {
          this.calibrationData.heads.push(hA);
          this.calibrationData.gazesX.push(gA.gazeX);
          this.calibrationData.gazesY.push(gA.gazeY);
          const progress = this.calibrationData.heads.length;
          this._emitFaceStatus({ faceCount: 1, calibrated: false, calibrationProgress: progress, faceDirection: "unknown", gazeX: gA.gazeX, gazeY: gA.gazeY, headPitch: hA.pitch, headYaw: hA.yaw, anomalies: [], alertType: "warning", alertMessage: `ĐANG LẤY MỐC... (${progress}/${this.CALIBRATION_FRAMES})` });
          if (progress >= this.CALIBRATION_FRAMES) {
            this.baselineHead.pitch = this.calibrationData.heads.reduce((s, h) => s + h.pitch, 0) / this.CALIBRATION_FRAMES;
            this.baselineHead.yaw = this.calibrationData.heads.reduce((s, h) => s + h.yaw, 0) / this.CALIBRATION_FRAMES;
            this.isCalibrated = true;
            console.log("[ProctoringEngine] Calibration COMPLETE");
          }
        } else {
          if (this.gazeBufferX.length > 150) this.gazeBufferX.shift();
          if (this.gazeBufferY.length > 150) this.gazeBufferY.shift();
          this.gazeBufferX.push(gA.gazeX);
          this.gazeBufferY.push(gA.gazeY);
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
            if (duration >= this.TIME_THRESHOLD_SEC) {
              this.isAlertingFace = true;
              this._emitFaceStatus({ faceCount: 1, calibrated: true, calibrationProgress: this.CALIBRATION_FRAMES, faceDirection: "center", gazeX: gA.gazeX, gazeY: gA.gazeY, headPitch: hA.pitch, headYaw: hA.yaw, anomalies, alertType: "critical", alertMessage: `CẢNH BÁO: ${anomalies[0]} (${duration.toFixed(1)}s)` });
            } else {
              this._emitFaceStatus({ faceCount: 1, calibrated: true, calibrationProgress: this.CALIBRATION_FRAMES, faceDirection: "center", gazeX: gA.gazeX, gazeY: gA.gazeY, headPitch: hA.pitch, headYaw: hA.yaw, anomalies, alertType: "warning", alertMessage: `CHÚ Ý... (${duration.toFixed(1)}s)` });
            }
          } else {
            this.anomalyStartTime = 0;
            this.isAlertingFace = false;
            this.baselineHead.pitch = this.baselineHead.pitch * (1 - this.EMA_ALPHA) + hA.pitch * this.EMA_ALPHA;
            this.baselineHead.yaw = this.baselineHead.yaw * (1 - this.EMA_ALPHA) + hA.yaw * this.EMA_ALPHA;
            this._emitFaceStatus({ faceCount: 1, calibrated: true, calibrationProgress: this.CALIBRATION_FRAMES, faceDirection: "center", gazeX: gA.gazeX, gazeY: gA.gazeY, headPitch: hA.pitch, headYaw: hA.yaw, anomalies: [], alertType: "ok", alertMessage: "BÌNH THƯỜNG" });
          }
        }
      } else {
        if (numFaces === 0) anomalies.push('FACE_MISSING'); else anomalies.push('MULTIPLE_FACES');
        if (this.isCalibrated) {
          if (this.anomalyStartTime === 0) this.anomalyStartTime = curSec;
          const duration = curSec - this.anomalyStartTime;
          if (duration >= this.TIME_THRESHOLD_SEC) {
            this._emitFaceStatus({ faceCount: numFaces, calibrated: true, calibrationProgress: this.CALIBRATION_FRAMES, faceDirection: "unknown", gazeX: 0, gazeY: 0, headPitch: 0, headYaw: 0, anomalies, alertType: "critical", alertMessage: `CẢNH BÁO: ${anomalies[0]} (${duration.toFixed(1)}s)` });
          } else {
            this._emitFaceStatus({ faceCount: numFaces, calibrated: true, calibrationProgress: this.CALIBRATION_FRAMES, faceDirection: "unknown", gazeX: 0, gazeY: 0, headPitch: 0, headYaw: 0, anomalies, alertType: "warning", alertMessage: `CHÚ Ý: ${anomalies[0]}...` });
          }
        } else {
          this._emitFaceStatus({ faceCount: numFaces, calibrated: false, calibrationProgress: 0, faceDirection: "unknown", gazeX: 0, gazeY: 0, headPitch: 0, headYaw: 0, anomalies, alertType: "critical", alertMessage: "CHƯA THẤY MẶT ĐỂ LẤY MỐC!" });
        }
      }

      const t2 = performance.now();
      if (t2 - t0 > 100) {
        console.log(`[ProctoringEngine] Frame slow: detect=${(t1-t0).toFixed(1)}ms total=${(t2-t0).toFixed(1)}ms faces=${numFaces}`);
      }
    } catch (err) {
      console.warn("[ProctoringEngine] Face detect error:", err);
    }

    if (session === this.sessionId) {
      requestAnimationFrame(() => this._runFaceLoop());
    }
  }

  private gazeBufferX: number[] = [];
  private gazeBufferY: number[] = [];

  private async _runGestureLoop(): Promise<void> {
    const session = this.sessionId;
    if (!this.isRunning || session !== this.sessionId) return;
    if (!this.handLandmarker || !this.videoGesture || !this.ctxGesture) {
      requestAnimationFrame(() => this._runGestureLoop());
      return;
    }

    const video = this.videoGesture;
    if (video.videoWidth === 0 || video.videoHeight === 0) {
      requestAnimationFrame(() => this._runGestureLoop());
      return;
    }

    if (this.canvasGesture && (this.canvasGesture.width !== video.videoWidth || this.canvasGesture.height !== video.videoHeight)) {
      this.canvasGesture.width = video.videoWidth;
      this.canvasGesture.height = video.videoHeight;
      console.log(`[ProctoringEngine] Gesture canvas dims updated: ${this.canvasGesture.width}x${this.canvasGesture.height}`);
    }

    if (video.readyState < 2 || video.paused) {
      requestAnimationFrame(() => this._runGestureLoop());
      return;
    }

    try {
      const t = performance.now();
      const res = this.handLandmarker.detectForVideo(video, t);
      this.ctxGesture.clearRect(0, 0, this.ctxGesture.canvas.width, this.ctxGesture.canvas.height);

      if (res.landmarks && res.landmarks.length > 0) {
        let hands = res.landmarks.map((h: any[]) => ({ lm: h, wX: h[0].x })).sort((a: any, b: any) => a.wX - b.wX);
        const features: number[] = [];
        features.push(...this._preprocessHands(hands[0].lm.map((l: any) => [l.x, l.y])));
        if (hands.length > 1) {
          features.push(...this._preprocessHands(hands[1].lm.map((l: any) => [l.x, l.y])));
        } else {
          features.push(...new Array(42).fill(0.0));
        }

        if (this.gestureOnnxSession && features.length === 84) {
          const inputName = this.gestureOnnxSession.inputNames[0];
          const feed: Record<string, any> = {};
          feed[inputName] = new (window as any).ort.Tensor("float32", new Float32Array(features), [1, 84]);
          const outputMap = await this.gestureOnnxSession.run(feed);
          const labelName = this.gestureOnnxSession.outputNames[0];
          const probName = this.gestureOnnxSession.outputNames[1];
          const predictedLabel = String((outputMap[labelName].data as Float32Array)[0]);
          let maxProb = 100;
          try { maxProb = Math.max(...Array.from(outputMap[probName].data as Float32Array)) * 100; } catch (_) {}
          const isCheating = predictedLabel.toLowerCase().includes("cheat");
          this._emitGestureStatus({ handsDetected: hands.length, gesture: predictedLabel, isCheating, probability: maxProb, alertType: isCheating ? "critical" : "ok", alertMessage: `${predictedLabel.toUpperCase()} (${maxProb.toFixed(1)}%)` });
        }
      } else {
        this._emitGestureStatus({ handsDetected: 0, gesture: null, isCheating: false, probability: 0, alertType: "warning", alertMessage: "NO HANDS" });
      }
    } catch (err) {
      console.warn("[ProctoringEngine] Gesture detect error:", err);
    }

    if (session === this.sessionId) {
      requestAnimationFrame(() => this._runGestureLoop());
    }
  }
}
