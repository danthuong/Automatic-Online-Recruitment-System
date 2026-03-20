/// <reference types="vite/client" />

interface ExamAPI {
  setKiosk: (enabled: boolean) => Promise<{ success: boolean }>
  enableFullscreen: () => Promise<{ success: boolean }>
  disableFullscreen: () => Promise<{ success: boolean }>
  setPreventClose: (enabled: boolean) => Promise<{ success: boolean }>
  getWindowBounds: () => Promise<WindowBounds>
  minimize: () => Promise<void>
  maximize: () => Promise<void>
  close: () => void
  forceClose: () => Promise<void>
  disqualify: (data: { reason: string }) => Promise<{ success: boolean }>
}

interface ProctorAPI {
  logEvent: (event: ProctorEvent) => void
  sendWarning: (warning: { type: string; message: string }) => Promise<{ received: boolean }>
  getScreenInfo: () => Promise<ScreenInfo>
  onWindowBlur: (callback: () => void) => () => void
  onWindowFocus: (callback: () => void) => () => void
  onDevToolsOpen: (callback: () => void) => () => void
  getFocusStats: () => Promise<{ focusLossCount: number; totalTimeOutside: number }>
}

interface ProcessAPI {
  kill: (processName: string) => Promise<{ success: boolean; processName: string }>
  getRunning: () => Promise<{ processes: string[] }>
  onForbiddenProcess: (callback: (processName: string) => void) => void
}

interface KioskAPI {
  enable: () => Promise<void>
  disable: () => Promise<void>
  isEnabled: () => Promise<boolean>
}

interface SecurityAPI {
  getMonitorCount: () => Promise<number>
  onFocusLost: (callback: () => void) => void
  onFocusGained: (callback: () => void) => void
  removeFocusListeners: () => void
}

interface ShortcutsAPI {
  block: () => Promise<void>
  unblock: () => Promise<void>
  onShortcutBlocked: (callback: (shortcut: string) => void) => void
  removeShortcutListeners: () => void
}

interface WindowAPI {
  minimize: () => void
  close: () => void
}

interface DevToolsAPI {
  open: () => void
  close: () => void
  isOpen: () => Promise<boolean>
  onOpen: (callback: () => void) => void
  removeDevToolsListeners: () => void
}

interface ElectronAPI {
  kiosk: KioskAPI
  proctor: ProctorAPI
  process: ProcessAPI
  security: SecurityAPI
  shortcuts: ShortcutsAPI
  window: WindowAPI
  exam: ExamAPI
  devTools: DevToolsAPI
  forceClose: () => void
}

interface WindowBounds {
  x: number
  y: number
  width: number
  height: number
}

interface ElectronEvents {
  onShortcutBlocked: (callback: (shortcut: string) => void) => () => void
  onViolation: (callback: (reason: string) => void) => void
  onForbiddenApp: (callback: (processName: string) => void) => void
  onFocusLost: (callback: () => void) => void
  onFocusGained: (callback: () => void) => void
  onDevToolsOpened: (callback: () => void) => void
  removeAllListeners: () => void
}

interface ExamEvents {
  onDisqualified: (callback: (data: { reason: string }) => void) => () => void
}

interface ScreenInfo {
  screenCount: number
  isPrimary: boolean
}

interface ProctorEvent {
  type: string
  data?: Record<string, unknown>
  timestamp?: number
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI
    electronEvents?: ElectronEvents
    examEvents?: ExamEvents
  }
}

export {}
