import { EXAM_CONFIG } from '@/shared/constants'
import type { PasteEvent, KeystrokeDynamicsEvent, IdleTimeEvent } from '@/shared/event-schema'

export interface InputTrackerCallbacks {
  onPaste?: (event: PasteEvent) => void
  onKeystrokeDynamics?: (event: KeystrokeDynamicsEvent) => void
  onIdleTime?: (event: IdleTimeEvent) => void
  onSuspiciousPaste?: (length: number) => void
}

export interface KeystrokeData {
  timestamp: number
  key: string
}

export class InputTracker {
  private keystrokes: KeystrokeData[] = []
  private pasteCount = 0
  private suspiciousPasteCount = 0
  private totalPasteLength = 0
  private lastActivityTime = Date.now()
  private idleThreshold = 30000
  private maxPasteLength = 200
  private callbacks: InputTrackerCallbacks = {}
  private idleCheckInterval: NodeJS.Timeout | null = null
  private isTracking = false

  constructor(callbacks: InputTrackerCallbacks = {}) {
    this.callbacks = callbacks
  }

  start() {
    if (this.isTracking) return
    this.isTracking = true
    this.lastActivityTime = Date.now()

    document.addEventListener('paste', this.handlePaste.bind(this))
    document.addEventListener('keydown', this.handleKeyDown.bind(this))
    document.addEventListener('click', this.handleActivity.bind(this))
    document.addEventListener('mousemove', this.handleActivity.bind(this))
    document.addEventListener('scroll', this.handleActivity.bind(this))

    this.idleCheckInterval = setInterval(() => this.checkIdleTime, 5000)

    console.log('[InputTracker] Started')
  }

  stop() {
    if (!this.isTracking) return
    this.isTracking = false

    document.removeEventListener('paste', this.handlePaste.bind(this))
    document.removeEventListener('keydown', this.handleKeyDown.bind(this))
    document.removeEventListener('click', this.handleActivity.bind(this))
    document.removeEventListener('mousemove', this.handleActivity.bind(this))
    document.removeEventListener('scroll', this.handleActivity.bind(this))

    if (this.idleCheckInterval) {
      clearInterval(this.idleCheckInterval)
      this.idleCheckInterval = null
    }

    console.log('[InputTracker] Stopped')
  }

  private handlePaste(e: ClipboardEvent) {
    const text = e.clipboardData?.getData('text') || ''
    const length = text.length
    this.lastActivityTime = Date.now()

    this.pasteCount++
    this.totalPasteLength += length

    const suspicious = length > this.maxPasteLength

    if (suspicious) {
      this.suspiciousPasteCount++
      this.callbacks.onSuspiciousPaste?.(length)
    }

    const event: PasteEvent = {
      type: 'paste_event',
      timestamp: new Date().toISOString(),
      candidateId: '',
      testId: '',
      data: { length, suspicious }
    }

    this.callbacks.onPaste?.(event)
    console.log(`[InputTracker] Paste detected - Length: ${length}, Suspicious: ${suspicious}`)
  }

  private handleKeyDown(e: KeyboardEvent) {
    this.lastActivityTime = Date.now()

    const target = e.target as HTMLElement
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
      this.keystrokes.push({
        timestamp: Date.now(),
        key: e.key
      })

      if (this.keystrokes.length > 1000) {
        this.keystrokes = this.keystrokes.slice(-500)
      }
    }
  }

  private handleActivity() {
    this.lastActivityTime = Date.now()
  }

  private checkIdleTime() {
    const idleTime = Date.now() - this.lastActivityTime

    if (idleTime >= this.idleThreshold) {
      const event: IdleTimeEvent = {
        type: 'idle_time',
        timestamp: new Date().toISOString(),
        candidateId: '',
        testId: '',
        data: { duration: idleTime }
      }

      this.callbacks.onIdleTime?.(event)
      console.log(`[InputTracker] Idle time detected: ${(idleTime / 1000).toFixed(0)}s`)
    }
  }

  getKeystrokeDynamics(): { wpm: number; avgKeyLatency: number; totalKeystrokes: number } {
    if (this.keystrokes.length < 10) {
      return { wpm: 0, avgKeyLatency: 0, totalKeystrokes: this.keystrokes.length }
    }

    const sortedKeystrokes = [...this.keystrokes].sort((a, b) => a.timestamp - b.timestamp)

    let totalLatency = 0
    let latencyCount = 0

    for (let i = 1; i < sortedKeystrokes.length; i++) {
      const latency = sortedKeystrokes[i].timestamp - sortedKeystrokes[i - 1].timestamp
      if (latency < 1000) {
        totalLatency += latency
        latencyCount++
      }
    }

    const avgLatency = latencyCount > 0 ? totalLatency / latencyCount : 0
    const avgKeyLatency = avgLatency / 1000

    const timeSpan = sortedKeystrokes[sortedKeystrokes.length - 1].timestamp - sortedKeystrokes[0].timestamp
    const minutes = timeSpan / 60000
    const wpm = minutes > 0 ? Math.round((this.keystrokes.length / 5) / minutes) : 0

    return { wpm, avgKeyLatency, totalKeystrokes: this.keystrokes.length }
  }

  getPasteStats(): { count: number; totalLength: number; suspiciousCount: number } {
    return {
      count: this.pasteCount,
      totalLength: this.totalPasteLength,
      suspiciousCount: this.suspiciousPasteCount
    }
  }

  getStats() {
    return {
      keystrokes: this.getKeystrokeDynamics(),
      paste: this.getPasteStats(),
      idleThreshold: this.idleThreshold
    }
  }

  reset() {
    this.keystrokes = []
    this.pasteCount = 0
    this.suspiciousPasteCount = 0
    this.totalPasteLength = 0
    this.lastActivityTime = Date.now()
  }
}

export const inputTracker = new InputTracker()
