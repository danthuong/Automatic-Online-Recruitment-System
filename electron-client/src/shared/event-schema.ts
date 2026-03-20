export type EventType =
  | 'exam_start'
  | 'exam_end'
  | 'exam_submit'
  | 'window_blur'
  | 'window_focus'
  | 'forbidden_process_detected'
  | 'devtools_opened'
  | 'paste_event'
  | 'keystroke_suspicious'
  | 'multi_monitor_detected'
  | 'app_closed_during_exam'
  | 'idle_time'
  | 'keystroke_dynamics'

export interface BaseEvent {
  type: EventType
  timestamp: string
  candidateId: string
  testId: string
}

export interface WindowBlurEvent extends BaseEvent {
  type: 'window_blur'
  data: {
    duration: number
    focusLossCount: number
  }
}

export interface WindowFocusEvent extends BaseEvent {
  type: 'window_focus'
  data: {
    totalTimeOutside: number
  }
}

export interface ForbiddenProcessEvent extends BaseEvent {
  type: 'forbidden_process_detected'
  data: {
    processName: string
    action: 'detected' | 'killed'
  }
}

export interface DevToolsEvent extends BaseEvent {
  type: 'devtools_opened'
  data: {
    method: string
  }
}

export interface PasteEvent extends BaseEvent {
  type: 'paste_event'
  data: {
    length: number
    suspicious: boolean
  }
}

export interface KeystrokeDynamicsEvent extends BaseEvent {
  type: 'keystroke_dynamics'
  data: {
    wpm: number
    avgKeyLatency: number
    idleTime: number
  }
}

export interface MultiMonitorEvent extends BaseEvent {
  type: 'multi_monitor_detected'
  data: {
    monitorCount: number
  }
}

export interface IdleTimeEvent extends BaseEvent {
  type: 'idle_time'
  data: {
    duration: number
  }
}

export interface ExamStatusEvent extends BaseEvent {
  type: 'exam_start' | 'exam_end' | 'exam_submit'
  data: {
    status: string
  }
}

export type ProctorEvent =
  | WindowBlurEvent
  | WindowFocusEvent
  | ForbiddenProcessEvent
  | DevToolsEvent
  | PasteEvent
  | KeystrokeDynamicsEvent
  | MultiMonitorEvent
  | IdleTimeEvent
  | ExamStatusEvent

export interface EventBatch {
  batchId: string
  sessionId: string
  events: ProctorEvent[]
  sentAt: string
}

export interface ProctoringSummary {
  testId: string
  candidateId: string
  focusLossCount: number
  totalTimeOutside: number
  forbiddenProcessCount: number
  devToolsAccessCount: number
  pasteCount: number
  suspiciousPasteCount: number
  totalKeystrokes: number
  avgWpm: number
  monitorCount: number
  warningCount: number
  timeline: Array<{
    timestamp: string
    event: string
    details: string
  }>
}
