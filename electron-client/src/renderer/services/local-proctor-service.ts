import { ProctoringEngine } from "./proctoring-engine";
import type { AIProctorState, AIAlert } from "./ai-proctor-types";

const STATE_POLL_INTERVAL_MS = 100;

type AIProctorCallback = (state: AIProctorState) => void;
type AIAlertCallback = (alert: AIAlert) => void;

export class LocalProctorService {
  private engine: ProctoringEngine | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private isRunning = false;
  private isInitialized = false;
  private onStateUpdate: AIProctorCallback | null = null;
  private onAlert: AIAlertCallback | null = null;
  private lastFaceAlert: AIAlert | null = null;
  private lastGestureAlert: AIAlert | null = null;
  private hiddenFaceVideo: HTMLVideoElement | null = null;
  private hiddenHandVideo: HTMLVideoElement | null = null;
  private hiddenFaceCanvas: HTMLCanvasElement | null = null;
  private hiddenHandCanvas: HTMLCanvasElement | null = null;
  private streamFace: MediaStream | null = null;
  private streamHand: MediaStream | null = null;
  private connectCount = 0;
  private pendingConnect: { streamFace: MediaStream; streamHand: MediaStream } | null = null;

  async initializeModels(): Promise<void> {
    console.log("[LocalProctorService] initializeModels() START");
    
    if (this.isInitialized && this.engine) {
      console.log("[LocalProctorService] Already initialized, skipping");
      return;
    }
    
    try {
      this.engine = new ProctoringEngine({
        timeThresholdSec: 1.5,
        onFaceStatusChange: (faceStatus) => {
          this._handleFaceAlert(faceStatus);
        },
        onGestureStatusChange: (gestureStatus) => {
          this._handleGestureAlert(gestureStatus);
        },
      });
      
      await this.engine.initializeModels();
      this.isInitialized = true;
      console.log("[LocalProctorService] initializeModels() COMPLETE");
    } catch (err) {
      console.error("[LocalProctorService] initializeModels() FAILED:", err);
      this.engine = null;
      this.isInitialized = false;
      throw err;
    }
  }

  private _createHiddenElements(): void {
    this._destroyHiddenElements();

    this.hiddenFaceCanvas = document.createElement("canvas");
    this.hiddenFaceCanvas.style.display = "none";
    document.body.appendChild(this.hiddenFaceCanvas);

    this.hiddenHandCanvas = document.createElement("canvas");
    this.hiddenHandCanvas.style.display = "none";
    document.body.appendChild(this.hiddenHandCanvas);

    this.hiddenFaceVideo = document.createElement("video");
    this.hiddenFaceVideo.autoplay = true;
    this.hiddenFaceVideo.playsInline = true;
    this.hiddenFaceVideo.muted = true;
    this.hiddenFaceVideo.style.display = "none";
    document.body.appendChild(this.hiddenFaceVideo);

    this.hiddenHandVideo = document.createElement("video");
    this.hiddenHandVideo.autoplay = true;
    this.hiddenHandVideo.playsInline = true;
    this.hiddenHandVideo.muted = true;
    this.hiddenHandVideo.style.display = "none";
    document.body.appendChild(this.hiddenHandVideo);

    console.log("[LocalProctorService] Hidden elements created. DOM videos:", document.querySelectorAll('video').length);
  }

  private _destroyHiddenElements(): void {
    if (this.hiddenFaceVideo) {
      this.hiddenFaceVideo.srcObject = null;
      this.hiddenFaceVideo.pause();
      if (this.hiddenFaceVideo.parentNode) {
        this.hiddenFaceVideo.parentNode.removeChild(this.hiddenFaceVideo);
      }
      this.hiddenFaceVideo = null;
    }
    if (this.hiddenHandVideo) {
      this.hiddenHandVideo.srcObject = null;
      this.hiddenHandVideo.pause();
      if (this.hiddenHandVideo.parentNode) {
        this.hiddenHandVideo.parentNode.removeChild(this.hiddenHandVideo);
      }
      this.hiddenHandVideo = null;
    }
    if (this.hiddenFaceCanvas) {
      if (this.hiddenFaceCanvas.parentNode) {
        this.hiddenFaceCanvas.parentNode.removeChild(this.hiddenFaceCanvas);
      }
      this.hiddenFaceCanvas = null;
    }
    if (this.hiddenHandCanvas) {
      if (this.hiddenHandCanvas.parentNode) {
        this.hiddenHandCanvas.parentNode.removeChild(this.hiddenHandCanvas);
      }
      this.hiddenHandCanvas = null;
    }
  }

  async connect(
    streamFace: MediaStream,
    streamHand: MediaStream
  ): Promise<void> {
    const callId = ++this.connectCount;
    console.log(`[LocalProctorService] connect() #${callId} START - face=${streamFace?.active} hand=${streamHand?.active}`);
    
    if (!this.engine) {
      console.error("[LocalProctorService] Engine not initialized");
      throw new Error("Engine not initialized. Call initializeModels() first.");
    }
    
    if (!streamFace?.active || !streamHand?.active) {
      console.warn(`[LocalProctorService] connect() #${callId} Streams not active`);
      return;
    }

    this._stopEngineNoDestroy();
    this._createHiddenElements();

    if (!this.hiddenFaceVideo || !this.hiddenHandVideo || !this.hiddenFaceCanvas || !this.hiddenHandCanvas) {
      console.error("[LocalProctorService] Hidden elements not created properly");
      return;
    }

    this.streamFace = streamFace;
    this.streamHand = streamHand;
    this.hiddenFaceVideo.srcObject = streamFace;
    this.hiddenHandVideo.srcObject = streamHand;

    console.log(`[LocalProctorService] connect() #${callId} Hidden videos assigned - face readyState=${this.hiddenFaceVideo.readyState} hand readyState=${this.hiddenHandVideo.readyState}`);
    
    this.engine.start(
      this.hiddenFaceVideo,
      this.hiddenFaceCanvas,
      this.hiddenHandVideo,
      this.hiddenHandCanvas
    );
    
    this.isRunning = true;
    this._startPolling();
    
    console.log(`[LocalProctorService] connect() #${callId} COMPLETE`);
  }

  private _stopEngineNoDestroy(): void {
    const t0 = performance.now();
    const wasRunning = this.isRunning;
    this.isRunning = false;
    
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
    
    if (this.engine) {
      try {
        this.engine.stop();
      } catch (e) {
        console.warn("[LocalProctorService] Engine stop error:", e);
      }
    }
    
    console.log(`[LocalProctorService] _stopEngineNoDestroy() in ${(performance.now() - t0).toFixed(1)}ms (wasRunning=${wasRunning})`);
  }

  private _startPolling(): void {
    if (this.pollTimer !== null) {
      clearInterval(this.pollTimer);
    }

    this.pollTimer = setInterval(() => {
      if (!this.isRunning || !this.engine) return;
      
      try {
        const faceState = this.engine.getFaceState();
        const gestureState = this.engine.getGestureState();

        const state: AIProctorState = {
          isConnected: true,
          calibrationStatus: faceState.calibrated ? "calibrated" : faceState.calibrationProgress > 0 ? "calibrating" : "idle",
          calibrationProgress: faceState.calibrationProgress,
          faceCount: faceState.faceCount,
          gaze: { x: faceState.gazeX, y: faceState.gazeY },
          headAngle: { pitch: faceState.headPitch, yaw: faceState.headYaw },
          faceDirection: faceState.faceDirection,
          handsDetected: gestureState.handsDetected,
          gesture: gestureState.gesture,
          cheatingProbability: gestureState.probability,
          alerts: [],
          lastUpdateTime: Date.now(),
        };

        this.onStateUpdate?.(state);
      } catch (err) {
        console.warn("[LocalProctorService] Poll error:", err);
      }
    }, STATE_POLL_INTERVAL_MS);
  }

  private _handleFaceAlert(faceStatus: ReturnType<ProctoringEngine["getFaceState"]>): void {
    if (faceStatus.alertType === "ok" || faceStatus.alertType === "warning") return;

    const alert: AIAlert = {
      type: faceStatus.alertType === "critical" ? "CRITICAL" : "WARNING",
      message: faceStatus.alertMessage,
      timestamp: Date.now() / 1000,
    };

    if (!this.lastFaceAlert || this.lastFaceAlert.message !== alert.message) {
      this.lastFaceAlert = alert;
      this.onAlert?.(alert);
    }
  }

  private _handleGestureAlert(gestureStatus: ReturnType<ProctoringEngine["getGestureState"]>): void {
    if (!gestureStatus.isCheating) return;

    const alert: AIAlert = {
      type: "CRITICAL",
      message: `Cheating gesture detected: ${gestureStatus.gesture}`,
      timestamp: Date.now() / 1000,
    };

    if (!this.lastGestureAlert || this.lastGestureAlert.message !== alert.message) {
      this.lastGestureAlert = alert;
      this.onAlert?.(alert);
    }
  }

  setCallbacks(onStateUpdate: AIProctorCallback, onAlert: AIAlertCallback): void {
    this.onStateUpdate = onStateUpdate;
    this.onAlert = onAlert;
  }

  resetCalibration(): void {
    console.log("[LocalProctorService] resetCalibration()");
    this.lastFaceAlert = null;
    this.lastGestureAlert = null;
    this.engine?.resetCalibration();
  }

  stop(): void {
    console.log("[LocalProctorService] stop() called");
    this._stopEngineNoDestroy();
    this._destroyHiddenElements();
    this.lastFaceAlert = null;
    this.lastGestureAlert = null;
    console.log("[LocalProctorService] stop() COMPLETE");
  }
}

export const localProctorService = new LocalProctorService();
