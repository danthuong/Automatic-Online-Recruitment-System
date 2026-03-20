import { contextBridge, ipcRenderer } from 'electron'

const IPC_CHANNELS = {
  EXAM: {
    SET_KIOSK: 'exam:setKiosk',
    GET_WINDOW_BOUNDS: 'exam:getWindowBounds',
    MINIMIZE: 'exam:minimize',
    MAXIMIZE: 'exam:maximize',
    CLOSE: 'exam:close',
    FORCE_CLOSE: 'exam:forceClose',
    ENABLE_FULLSCREEN: 'exam:enableFullscreen',
    DISABLE_FULLSCREEN: 'exam:disableFullscreen',
    SET_PREVENT_CLOSE: 'exam:setPreventClose',
    DISQUALIFY: 'exam:disqualify',
  },
  PROCTOR: {
    SEND_WARNING: 'proctor:sendWarning',
    LOG_EVENT: 'proctor:logEvent',
    GET_SCREEN_INFO: 'proctor:getScreenInfo',
    GET_FOCUS_STATUS: 'proctor:getFocusStatus',
  },
  PROCESS: {
    KILL: 'process:kill',
    GET_RUNNING: 'process:getRunning',
    SCAN_PROCESSES: 'process:scanProcesses',
    ON_WARNING: 'process:warning',
  },
  WINDOW: {
    ON_BLUR: 'window:onBlur',
    ON_FOCUS: 'window:onFocus',
    ON_DEVTOOLS_OPEN: 'window:onDevToolsOpen',
    ON_RESIZE: 'window:onResize',
  },
  CONTENT: {
    ENABLE_PROTECTION: 'content:enableProtection',
    DISABLE_PROTECTION: 'content:disableProtection',
  },
  AI: {
    START_SERVER: 'ai:startServer',
    STOP_SERVER: 'ai:stopServer',
  },
}

export interface ExamAPI {
  setKiosk: (enabled: boolean) => Promise<{ success: boolean }>
  enableFullscreen: () => Promise<{ success: boolean }>
  disableFullscreen: () => Promise<{ success: boolean }>
  setPreventClose: (enabled: boolean) => Promise<{ success: boolean }>
  getWindowBounds: () => Promise<{ x: number; y: number; width: number; height: number }>
  minimize: () => Promise<void>
  maximize: () => Promise<void>
  close: () => Promise<void>
  forceClose: () => Promise<void>
  disqualify: (data: { reason: string }) => Promise<{ success: boolean }>
  onDisqualified: (callback: (data: { reason: string }) => void) => () => void
}

export interface ProctorAPI {
  logEvent: (event: { type: string; data: Record<string, unknown> }) => Promise<{ received: boolean }>
  sendWarning: (warning: { type: string; message: string }) => Promise<{ received: boolean }>
  getScreenInfo: () => Promise<{ screenCount: number; isPrimary: boolean }>
  onWindowBlur: (callback: () => void) => () => void
  onWindowFocus: (callback: () => void) => () => void
  onDevToolsOpen: (callback: () => void) => () => void
  getFocusStats: () => Promise<{ focusLossCount: number; totalTimeOutside: number }>
}

export interface ProcessAPI {
  kill: (processName: string) => Promise<{ success: boolean; processName: string }>
  getRunning: () => Promise<{ processes: string[] }>
  onForbiddenProcess: (callback: (processName: string) => void) => () => void
  onProcessWarning: (callback: (data: { count: number; threshold: number; processes: string[] }) => void) => () => void
}

export interface ContentAPI {
  enableProtection: () => Promise<{ success: boolean }>
  disableProtection: () => Promise<{ success: boolean }>
}

export interface AIAPI {
  startServer: () => Promise<{ success: boolean }>
  stopServer: () => Promise<{ success: boolean }>
}

export interface WindowAPI {
  onBlur: (callback: () => void) => () => void
  onFocus: (callback: () => void) => () => void
  onDevToolsOpen: (callback: () => void) => () => void
}

let focusLossCount = 0
let totalTimeOutside = 0
let lastBlurTime: number | null = null

const examAPI: ExamAPI = {
  setKiosk: (enabled) => ipcRenderer.invoke(IPC_CHANNELS.EXAM.SET_KIOSK, enabled),
  enableFullscreen: () => ipcRenderer.invoke(IPC_CHANNELS.EXAM.ENABLE_FULLSCREEN),
  disableFullscreen: () => ipcRenderer.invoke(IPC_CHANNELS.EXAM.DISABLE_FULLSCREEN),
  setPreventClose: (enabled) => ipcRenderer.invoke(IPC_CHANNELS.EXAM.SET_PREVENT_CLOSE, enabled),
  getWindowBounds: () => ipcRenderer.invoke(IPC_CHANNELS.EXAM.GET_WINDOW_BOUNDS),
  minimize: () => ipcRenderer.invoke(IPC_CHANNELS.EXAM.MINIMIZE),
  maximize: () => ipcRenderer.invoke(IPC_CHANNELS.EXAM.MAXIMIZE),
  close: () => ipcRenderer.invoke(IPC_CHANNELS.EXAM.CLOSE),
  forceClose: () => ipcRenderer.invoke(IPC_CHANNELS.EXAM.FORCE_CLOSE),
  disqualify: (data) => ipcRenderer.invoke(IPC_CHANNELS.EXAM.DISQUALIFY, data),
  onDisqualified: (callback) => {
    ipcRenderer.on('exam:disqualified', (_, data) => callback(data))
    return () => ipcRenderer.removeAllListeners('exam:disqualified')
  },
}

const proctorAPI: ProctorAPI = {
  logEvent: (event) => ipcRenderer.invoke(IPC_CHANNELS.PROCTOR.LOG_EVENT, event),
  sendWarning: (warning) => ipcRenderer.invoke(IPC_CHANNELS.PROCTOR.SEND_WARNING, warning),
  getScreenInfo: () => ipcRenderer.invoke(IPC_CHANNELS.PROCTOR.GET_SCREEN_INFO),
  onWindowBlur: (callback) => {
    ipcRenderer.on(IPC_CHANNELS.WINDOW.ON_BLUR, () => {
      focusLossCount++
      lastBlurTime = Date.now()
      callback()
    })
    return () => ipcRenderer.removeAllListeners(IPC_CHANNELS.WINDOW.ON_BLUR)
  },
  onWindowFocus: (callback) => {
    ipcRenderer.on(IPC_CHANNELS.WINDOW.ON_FOCUS, () => {
      if (lastBlurTime) {
        totalTimeOutside += Date.now() - lastBlurTime
        lastBlurTime = null
      }
      callback()
    })
    return () => ipcRenderer.removeAllListeners(IPC_CHANNELS.WINDOW.ON_FOCUS)
  },
  onDevToolsOpen: (callback) => {
    ipcRenderer.on(IPC_CHANNELS.WINDOW.ON_DEVTOOLS_OPEN, () => callback())
    return () => ipcRenderer.removeAllListeners(IPC_CHANNELS.WINDOW.ON_DEVTOOLS_OPEN)
  },
  getFocusStats: () => Promise.resolve({ focusLossCount, totalTimeOutside }),
}

const processAPI: ProcessAPI = {
  kill: (processName) => ipcRenderer.invoke(IPC_CHANNELS.PROCESS.KILL, processName),
  getRunning: () => ipcRenderer.invoke(IPC_CHANNELS.PROCESS.GET_RUNNING),
  onForbiddenProcess: (callback) => {
    ipcRenderer.on('process:forbidden', (_, processName) => callback(processName))
    return () => ipcRenderer.removeAllListeners('process:forbidden')
  },
  onProcessWarning: (callback) => {
    ipcRenderer.on(IPC_CHANNELS.PROCESS.ON_WARNING, (_, data) => callback(data))
    return () => ipcRenderer.removeAllListeners(IPC_CHANNELS.PROCESS.ON_WARNING)
  },
}

const contentAPI: ContentAPI = {
  enableProtection: () => ipcRenderer.invoke(IPC_CHANNELS.CONTENT.ENABLE_PROTECTION),
  disableProtection: () => ipcRenderer.invoke(IPC_CHANNELS.CONTENT.DISABLE_PROTECTION),
}

const aiAPI: AIAPI = {
  startServer: () => ipcRenderer.invoke(IPC_CHANNELS.AI.START_SERVER),
  stopServer: () => ipcRenderer.invoke(IPC_CHANNELS.AI.STOP_SERVER),
}

contextBridge.exposeInMainWorld('electronAPI', {
  exam: examAPI,
  proctor: proctorAPI,
  process: processAPI,
  content: contentAPI,
  ai: aiAPI,
})

contextBridge.exposeInMainWorld('electronEvents', {
  onShortcutBlocked: (callback: (shortcut: string) => void) => {
    ipcRenderer.on('shortcut:blocked', (_, shortcut) => callback(shortcut))
    return () => ipcRenderer.removeAllListeners('shortcut:blocked')
  },
  onFocusLost: (callback: () => void) => {
    ipcRenderer.on(IPC_CHANNELS.WINDOW.ON_BLUR, () => callback())
    return () => ipcRenderer.removeAllListeners(IPC_CHANNELS.WINDOW.ON_BLUR)
  },
  onFocusGained: (callback: () => void) => {
    ipcRenderer.on(IPC_CHANNELS.WINDOW.ON_FOCUS, () => callback())
    return () => ipcRenderer.removeAllListeners(IPC_CHANNELS.WINDOW.ON_FOCUS)
  },
})

contextBridge.exposeInMainWorld('examEvents', {
  onDisqualified: (callback: (data: { reason: string }) => void) => {
    ipcRenderer.on('exam:disqualified', (_, data) => callback(data))
    return () => ipcRenderer.removeAllListeners('exam:disqualified')
  },
})

declare global {
  interface Window {
    electronAPI: {
      exam: ExamAPI
      proctor: ProctorAPI
      process: ProcessAPI
      content: ContentAPI
      ai: AIAPI
    }
    electronEvents?: {
      onShortcutBlocked: (callback: (shortcut: string) => void) => () => void
    }
    examEvents?: {
      onDisqualified: (callback: (data: { reason: string }) => void) => () => void
    }
  }
}
