import type { AIProctorResponse, AIAlert, AIProctorState } from './ai-proctor-types'
import { getAIServerUrl } from './ai-server'

const FRAME_INTERVAL_MS = 200
const FRAME_QUALITY = 0.75

const CANVAS_WIDTH = 640
const CANVAS_HEIGHT = 360

export type AIProctorCallback = (state: AIProctorState) => void
export type AIAlertCallback = (alert: AIAlert) => void

export class AIProctorService {
  private stream0: MediaStream | null = null
  private stream1: MediaStream | null = null
  private canvas0: HTMLCanvasElement | null = null
  private canvas1: HTMLCanvasElement | null = null
  private video0: HTMLVideoElement | null = null
  private video1: HTMLVideoElement | null = null
  private frameTimer: ReturnType<typeof setTimeout> | null = null
  private isProcessing = false
  private isRunning = false
  private lastResponse: AIProctorResponse | null = null

  private onStateUpdate: AIProctorCallback | null = null
  private onAlert: AIAlertCallback | null = null

  async connect(
    stream0: MediaStream,
    stream1: MediaStream,
    onStateUpdate: AIProctorCallback,
    onAlert: AIAlertCallback
  ): Promise<void> {
    if (this.isRunning) {
      this.stop()
    }

    this.stream0 = stream0
    this.stream1 = stream1
    this.onStateUpdate = onStateUpdate
    this.onAlert = onAlert

    this.canvas0 = document.createElement('canvas')
    this.canvas1 = document.createElement('canvas')
    this.canvas0.width = CANVAS_WIDTH
    this.canvas0.height = CANVAS_HEIGHT
    this.canvas1.width = CANVAS_WIDTH
    this.canvas1.height = CANVAS_HEIGHT

    this.video0 = document.createElement('video')
    this.video0.autoplay = true
    this.video0.playsInline = true
    this.video0.muted = true
    this.video0.srcObject = stream0

    this.video1 = document.createElement('video')
    this.video1.autoplay = true
    this.video1.playsInline = true
    this.video1.muted = true
    this.video1.srcObject = stream1

    try {
      const healthy = await this.healthCheck()
      if (!healthy) {
        throw new Error('AI Server is not running. Please start the server first.')
      }
    } catch (err) {
      this._cleanup()
      throw err
    }

    try {
      await Promise.all([
        this._waitForVideoReady(this.video0),
        this._waitForVideoReady(this.video1),
      ])
    } catch (err) {
      console.error('[AIProctorService] Video failed to start:', err)
      this._cleanup()
      throw new Error('Failed to start one or both cameras.')
    }

    this.isRunning = true
    this.startFrameLoop()
    console.log('[AIProctorService] Connected and running')
  }

  private _waitForVideoReady(video: HTMLVideoElement): Promise<void> {
    return new Promise((resolve, reject) => {
      if (video.readyState >= 2) {
        resolve()
        return
      }

      const timeout = setTimeout(() => {
        reject(new Error('Video ready timeout'))
      }, 10000)

      const onPlaying = () => {
        clearTimeout(timeout)
        video.removeEventListener('playing', onPlaying)
        video.removeEventListener('error', onError)
        resolve()
      }
      const onError = () => {
        clearTimeout(timeout)
        video.removeEventListener('playing', onPlaying)
        video.removeEventListener('error', onError)
        reject(new Error('Video error'))
      }

      video.addEventListener('playing', onPlaying, { once: true })
      video.addEventListener('error', onError, { once: true })

      video.play().catch(() => {})
    })
  }

  async healthCheck(): Promise<boolean> {
    try {
      const baseUrl = await getAIServerUrl()
      const res = await fetch(`${baseUrl}/health`, {
        method: 'GET',
        signal: AbortSignal.timeout(3000),
      })
      if (!res.ok) return false
      const data = await res.json()
      console.log('[AIProctorService] Health check:', data)
      return data.status === 'ok'
    } catch {
      console.warn('[AIProctorService] Health check failed - server may not be running')
      return false
    }
  }

  async calibrate(): Promise<void> {
    try {
      const baseUrl = await getAIServerUrl()
      await fetch(`${baseUrl}/calibrate`, { method: 'POST' })
    } catch (e) {
      console.error('[AIProctorService] Calibrate failed:', e)
    }
  }

  async resetCalibration(): Promise<void> {
    await this.calibrate()
  }

  private startFrameLoop(): void {
    if (this.frameTimer !== null) return

    const tick = async () => {
      if (!this.isRunning) return
      if (this.isProcessing) {
        this.frameTimer = setTimeout(tick, FRAME_INTERVAL_MS)
        return
      }

      await this.captureAndSend()
      this.frameTimer = setTimeout(tick, FRAME_INTERVAL_MS)
    }

    tick()
  }

  private async captureAndSend(): Promise<void> {
    if (
      !this.canvas0 || !this.canvas1 ||
      !this.stream0 || !this.stream1 ||
      !this.video0 || !this.video1
    ) return

    if (this.video0.readyState < 2 || this.video1.readyState < 2) return

    this.isProcessing = true

    try {
      const ctx0 = this.canvas0.getContext('2d')
      const ctx1 = this.canvas1.getContext('2d')
      if (!ctx0 || !ctx1) return

      this._drawVideoToCanvas(ctx0, this.video0, this.canvas0.width, this.canvas0.height)
      this._drawVideoToCanvas(ctx1, this.video1, this.canvas1.width, this.canvas1.height)

      const frame0 = this.canvas0.toDataURL('image/jpeg', FRAME_QUALITY)
      const frame1 = this.canvas1.toDataURL('image/jpeg', FRAME_QUALITY)

      const b64_0 = frame0.split(',')[1] || ''
      const b64_1 = frame1.split(',')[1] || ''

      const controller = new AbortController()
      const timeout = setTimeout(() => controller.abort(), 10000)

      try {
        const baseUrl = await getAIServerUrl()
        const res = await fetch(`${baseUrl}/process_frame`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ camera_0: b64_0, camera_1: b64_1 }),
          signal: controller.signal,
        })

        clearTimeout(timeout)

        if (!res.ok) {
          console.warn('[AIProctorService] Server responded with error:', res.status)
          return
        }

        const data: AIProctorResponse = await res.json()
        this.lastResponse = data
        this.processResponse(data)
      } catch (e) {
        clearTimeout(timeout)
        if ((e as Error).name !== 'AbortError') {
          console.warn('[AIProctorService] Frame send failed:', e)
        }
      }
    } finally {
      this.isProcessing = false
    }
  }

  private _drawVideoToCanvas(
    ctx: CanvasRenderingContext2D,
    video: HTMLVideoElement,
    targetW: number,
    targetH: number
  ): void {
    const vW = video.videoWidth
    const vH = video.videoHeight

    if (vW === 0 || vH === 0) return

    const targetRatio = targetW / targetH
    const videoRatio = vW / vH

    let sx = 0, sy = 0, sw = vW, sh = vH
    let dx = 0, dy = 0, dw = targetW, dh = targetH

    if (videoRatio > targetRatio) {
      sh = vH
      sw = vH * targetRatio
      sx = (vW - sw) / 2
    } else if (videoRatio < targetRatio) {
      sw = vW
      sh = vW / targetRatio
      sy = (vH - sh) / 2
    }

    ctx.drawImage(video, sx, sy, sw, sh, dx, dy, dw, dh)
  }

  private processResponse(data: AIProctorResponse): void {
    const prevAlerts = this.lastResponse?.camera_0.alerts || []

    const newAlerts = data.camera_0.alerts.filter((alert) => {
      return !prevAlerts.some(
        (prev) =>
          prev.type === alert.type &&
          prev.message === alert.message
      )
    })

    for (const alert of newAlerts) {
      this.onAlert?.(alert)
    }

    let calibrationStatus: AIProctorState['calibrationStatus'] = 'idle'
    if (data.camera_0.calibration_progress > 0 && !data.camera_0.calibrated) {
      calibrationStatus = 'calibrating'
    } else if (data.camera_0.calibrated) {
      calibrationStatus = 'calibrated'
    }

    const state: AIProctorState = {
      isConnected: true,
      calibrationStatus,
      calibrationProgress: data.camera_0.calibration_progress,
      faceCount: data.camera_0.face_count,
      gaze: data.camera_0.gaze ? { x: data.camera_0.gaze.gaze_x, y: data.camera_0.gaze.gaze_y } : null,
      headAngle: data.camera_0.head_angle,
      faceDirection: data.camera_0.face_direction,
      handsDetected: data.camera_1.hands_detected,
      gesture: data.camera_1.gesture,
      cheatingProbability: data.camera_1.cheating_probability,
      alerts: data.camera_0.alerts,
      lastUpdateTime: data.timestamp,
    }

    this.onStateUpdate?.(state)
  }

  getLastResponse(): AIProctorResponse | null {
    return this.lastResponse
  }

  private _cleanup(): void {
    if (this.video0) {
      this.video0.srcObject = null
      this.video0 = null
    }
    if (this.video1) {
      this.video1.srcObject = null
      this.video1 = null
    }
    this.canvas0 = null
    this.canvas1 = null
  }

  stop(): void {
    this.isRunning = false
    if (this.frameTimer !== null) {
      clearTimeout(this.frameTimer)
      this.frameTimer = null
    }
    this._cleanup()
    this.stream0 = null
    this.stream1 = null
    this.lastResponse = null
    this.isProcessing = false
    console.log('[AIProctorService] Stopped')
  }
}

export const aiProctorService = new AIProctorService()
