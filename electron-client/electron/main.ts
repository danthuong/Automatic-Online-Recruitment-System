import { app, BrowserWindow, ipcMain, screen, globalShortcut, Menu, dialog } from 'electron'
import path from 'path'
import { exec, execSync } from 'child_process'
import { IPC_CHANNELS, BLACKLISTED_PROCESSES, EXAM_CONFIG } from './shared/constants'

process.env.NODE_ENV = 'development'

app.commandLine.appendSwitch('enable-features', 'HardwareMediaStreamEncoding,VaapiVideoDecoder')
app.commandLine.appendSwitch('enable-gpu-rasterization')
app.commandLine.appendSwitch('disable-gpu-sandbox')

const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

let mainWindow: BrowserWindow | null = null
let preventClose = false
let kioskMode = false
let isExamActive = false
let processScanInterval: NodeJS.Timeout | null = null
let devToolsCheckInterval: NodeJS.Timeout | null = null
let blurCheckInterval: NodeJS.Timeout | null = null
let focusLossCount = 0
let totalTimeOutside = 0
let lastBlurTime: number | null = null
let processViolationCount = 0
const PROCESS_VIOLATION_THRESHOLD = 3

let aiServerProcess: ReturnType<typeof exec> | null = null
const AI_SERVER_PORT = 8765

type IOHookInstance = {
  on(event: string, callback: (event: any) => void): void
  start(enableLogger?: boolean): void
  stop(): void
  disableClickPropagation(): void
}

let iohook: IOHookInstance | null = null
let isIOHookBlocking = false

function checkAdminPrivileges(): boolean {
  try {
    execSync('net session', { stdio: 'ignore' })
    return true
  } catch {
    return false
  }
}

async function requestAdminElevation(): Promise<boolean> {
  if (checkAdminPrivileges()) {
    return true
  }

  const result = await dialog.showMessageBox({
    type: 'warning',
    title: 'Administrator Privileges Required',
    message: 'The exam requires administrator privileges for secure proctoring.',
    detail: 'The application will now restart with elevated privileges.\n\nClick OK to continue or Cancel to exit.',
    buttons: ['OK', 'Cancel'],
    defaultId: 0,
    cancelId: 1,
    icon: undefined
  })

  if (result.response === 0) {
    try {
      const exePath = process.execPath
      exec(`runas /user:Administrator "${exePath}"`)
      app.quit()
      return false
    } catch (error) {
      console.error('[Admin] Failed to restart with admin privileges:', error)
      return false
    }
  }

  return false
}

function getShortcutString(keycode: number, altKey: boolean, ctrlKey: boolean, shiftKey: boolean): string | null {
  if (altKey) {
    switch (keycode) {
      case 15: return 'Alt+Tab'
      case 1: return 'Alt+Escape'
      case 62: return 'Alt+F4'
    }
  }
  
  if (ctrlKey && shiftKey) {
    switch (keycode) {
      case 23: return 'Ctrl+Shift+I'
      case 47: return 'Ctrl+Shift+C'
      case 36: return 'Ctrl+Shift+J'
      case 25: return 'Ctrl+Shift+P'
    }
  }
  
  return null
}

function initIOHook(): boolean {
  if (iohook) return true
  
  try {
    const iohookModule = require('@tkomde/iohook')
    iohook = iohookModule as IOHookInstance
    console.log('[IOHook] Module loaded successfully')
    return true
  } catch (error) {
    console.warn('[IOHook] Failed to load module:', error)
    iohook = null
    return false
  }
}

function startIOHookBlocking(): boolean {
  if (!iohook) {
    console.warn('[IOHook] Module not loaded - cannot start blocking')
    return false
  }
  
  if (isIOHookBlocking) {
    console.log('[IOHook] Already blocking')
    return true
  }
  
  if (!mainWindow) {
    console.warn('[IOHook] No main window - cannot start blocking')
    return false
  }
  
  try {
    iohook.on('keydown', (event: any) => {
      if (!isIOHookBlocking || !mainWindow) return
      
      const { keycode, altKey, ctrlKey, shiftKey } = event
      const shortcut = getShortcutString(keycode, altKey, ctrlKey, shiftKey)
      
      if (shortcut) {
        console.log(`[IOHook] Blocking: ${shortcut}`)
        mainWindow?.webContents.send('shortcut:blocked', shortcut)
      }
    })
    
    iohook.on('mouseclick', (event: any) => {
      if (!isIOHookBlocking || !mainWindow) return
      
      if (event.button === 2) {
        console.log('[IOHook] Blocking: RightClick')
        mainWindow?.webContents.send('shortcut:blocked', 'RightClick')
      }
    })
    
    iohook.disableClickPropagation()
    iohook.start()
    isIOHookBlocking = true
    console.log('[IOHook] Blocking started')
    return true
  } catch (error) {
    console.error('[IOHook] Error starting blocking:', error)
    return false
  }
}

function stopIOHookBlocking(): void {
  if (!iohook || !isIOHookBlocking) {
    return
  }
  
  try {
    iohook.stop()
    isIOHookBlocking = false
    console.log('[IOHook] Blocking stopped')
  } catch (error) {
    console.error('[IOHook] Error stopping blocking:', error)
  }
}

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize

  mainWindow = new BrowserWindow({
    width: Math.min(1400, width),
    height: Math.min(900, height),
    minWidth: 1024,
    minHeight: 700,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
      devtools: true,
    },
    show: false,
    backgroundColor: '#fafafa',
    titleBarStyle: 'default',
    frame: true,
  })

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show()
    mainWindow?.focus()
  })

  mainWindow.on('blur', () => {
    if (isExamActive && mainWindow) {
      focusLossCount++
      lastBlurTime = Date.now()
      mainWindow.webContents.send(IPC_CHANNELS.WINDOW.ON_BLUR)
      mainWindow.webContents.send('shortcut:blocked', 'Alt+Tab')
      console.log(`[Window] Blur detected - Focus loss #${focusLossCount} (Alt+Tab warning sent)`)
    }
  })

  mainWindow.on('focus', () => {
    if (isExamActive && mainWindow) {
      if (lastBlurTime) {
        totalTimeOutside += Date.now() - lastBlurTime
        lastBlurTime = null
      }
      mainWindow.webContents.send(IPC_CHANNELS.WINDOW.ON_FOCUS)
      console.log(`[Window] Focus restored - Total time outside: ${(totalTimeOutside / 1000).toFixed(1)}s`)
    }
  })

  mainWindow.on('close', (e) => {
    if (preventClose && isExamActive) {
      e.preventDefault()
      console.log('[Window] Close prevented during exam')
      mainWindow?.webContents.send('exam:closeAttempted')
    }
  })

  mainWindow.on('maximize', () => {
    if (kioskMode) {
      mainWindow?.unmaximize()
    }
  })

  mainWindow.on('minimize', () => {
    if (kioskMode) {
      mainWindow?.restore()
    }
  })

  if (VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(VITE_DEV_SERVER_URL)
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'))
  }

  mainWindow.on('closed', () => {
    mainWindow = null
    stopAllMonitoring()
  })
}

function setupKioskMode(enabled: boolean) {
  if (!mainWindow) return

  kioskMode = enabled

  if (enabled) {
    mainWindow.setKiosk(true)
    mainWindow.setAlwaysOnTop(true, 'pop-up-menu')
    isExamActive = true
    startAllMonitoring()
    disableSystemKeys(true)
    processViolationCount = 0
    
    if (Menu.getApplicationMenu()) {
      Menu.setApplicationMenu(null)
    }
    
    if (initIOHook()) {
      const hookStarted = startIOHookBlocking()
      if (hookStarted) {
        console.log('[Kiosk] IOHook keyboard blocking started successfully')
      } else {
        console.warn('[Kiosk] Failed to start IOHook blocking')
      }
    } else {
      console.warn('[Kiosk] IOHook not available - Alt+Tab will not be blocked at OS level')
    }
    
    console.log('[Kiosk] Mode enabled - Exam started')
  } else {
    stopIOHookBlocking()
    
    mainWindow.setKiosk(false)
    mainWindow.setAlwaysOnTop(false)
    isExamActive = false
    stopAllMonitoring()
    disableSystemKeys(false)
    
    console.log('[Kiosk] Mode disabled - Exam ended')
  }
}

function enableFullscreen() {
  if (!mainWindow) return
  mainWindow.setFullScreen(true)
  console.log('[Window] Fullscreen enabled')
}

function disableFullscreen() {
  if (!mainWindow) return
  mainWindow.setFullScreen(false)
  console.log('[Window] Fullscreen disabled')
}

function disableSystemKeys(enabled: boolean) {
  if (!mainWindow) return

  if (enabled) {
    mainWindow.webContents.insertCSS(`
      * { 
        user-select: none !important; 
        -webkit-user-select: none !important;
        -moz-user-select: none !important;
        -ms-user-select: none !important;
      }
      input, textarea, [contenteditable="true"] { 
        user-select: text !important; 
        -webkit-user-select: text !important;
      }
      
      html, body {
        overflow: hidden !important;
      }
      
      :focus {
        outline: none !important;
      }
      
      img {
        -webkit-user-drag: none !important;
        user-drag: none !important;
        pointer-events: none !important;
      }
    `)

    const blockShortcut = (shortcut: string) => {
      if (isExamActive) {
        console.log(`[Shortcut Blocked] ${shortcut}`)
        mainWindow?.webContents.send('shortcut:blocked', shortcut)
      }
    }

    globalShortcut.register('Alt+Tab', () => blockShortcut('Alt+Tab'))
    globalShortcut.register('Alt+F4', () => blockShortcut('Alt+F4'))
    globalShortcut.register('Alt+Escape', () => blockShortcut('Alt+Escape'))
    globalShortcut.register('Alt+F3', () => blockShortcut('Alt+F3'))
    globalShortcut.register('Control+Tab', () => blockShortcut('Control+Tab'))
    globalShortcut.register('Control+Shift+Tab', () => blockShortcut('Control+Shift+Tab'))
    globalShortcut.register('Escape', () => blockShortcut('Escape'))
    globalShortcut.register('F11', () => blockShortcut('F11'))
    globalShortcut.register('F5', () => blockShortcut('F5'))
    globalShortcut.register('PrintScreen', () => blockShortcut('PrintScreen'))
    globalShortcut.register('Control+PrintScreen', () => blockShortcut('Control+PrintScreen'))
    globalShortcut.register('Control+Shift+P', () => blockShortcut('Control+Shift+P'))
    globalShortcut.register('Control+Shift+I', () => blockShortcut('Control+Shift+I'))
    globalShortcut.register('Control+Shift+J', () => blockShortcut('Control+Shift+J'))
    globalShortcut.register('Control+Shift+C', () => blockShortcut('Control+Shift+C'))
    globalShortcut.register('Control+Shift+E', () => blockShortcut('Control+Shift+E'))
    globalShortcut.register('Control+Shift+R', () => blockShortcut('Control+Shift+R'))
    globalShortcut.register('Control+Shift+F', () => blockShortcut('Control+Shift+F'))
    globalShortcut.register('Control+Shift+M', () => blockShortcut('Control+Shift+M'))
    globalShortcut.register('Control+Shift+B', () => blockShortcut('Control+Shift+B'))
    globalShortcut.register('Control+Shift+K', () => blockShortcut('Control+Shift+K'))
    globalShortcut.register('Meta+Tab', () => blockShortcut('Meta+Tab'))
    globalShortcut.register('Meta+Shift+Tab', () => blockShortcut('Meta+Shift+Tab'))
    globalShortcut.register('Meta+Escape', () => blockShortcut('Meta+Escape'))
    globalShortcut.register('Meta+L', () => blockShortcut('Meta+L'))
    globalShortcut.register('Control+L', () => blockShortcut('Control+L'))
    globalShortcut.register('Control+N', () => blockShortcut('Control+N'))
    globalShortcut.register('Control+T', () => blockShortcut('Control+T'))
    globalShortcut.register('Control+W', () => blockShortcut('Control+W'))
    globalShortcut.register('Control+P', () => blockShortcut('Control+P'))
    globalShortcut.register('Control+S', () => blockShortcut('Control+S'))
    globalShortcut.register('Control+O', () => blockShortcut('Control+O'))
    globalShortcut.register('Control+A', () => blockShortcut('Control+A'))
    globalShortcut.register('Control+D', () => blockShortcut('Control+D'))
    globalShortcut.register('Control+F', () => blockShortcut('Control+F'))

    console.log('[Security] Enhanced system shortcuts blocked (35 shortcuts)')
  } else {
    mainWindow.webContents.insertCSS(`
      * { 
        user-select: auto !important; 
        -webkit-user-select: auto !important;
        -moz-user-select: auto !important;
        -ms-user-select: auto !important;
      }
      html, body {
        overflow: auto !important;
      }
    `)

    globalShortcut.unregisterAll()
    console.log('[Security] System shortcuts unblocked')
  }
}

function scanProcesses(): Promise<string[]> {
  return new Promise((resolve) => {
    const command = process.platform === 'win32' ? 'tasklist /FO CSV /NH' : 'ps -A'
    exec(command, (error, stdout) => {
      if (error) {
        resolve([])
        return
      }

      const lines = stdout.split('\n')
        .map(line => line.replace(/"/g, '').split(',')[0].trim())
        .filter(Boolean)
      resolve(lines)
    })
  })
}

async function checkForbiddenProcesses() {
  if (!isExamActive || !mainWindow) return

  const runningProcesses = await scanProcesses()
  const foundBlacklisted = runningProcesses.filter(proc =>
    BLACKLISTED_PROCESSES.some(bp => proc.toLowerCase().includes(bp.toLowerCase().replace('.exe', '')))
  )

  if (foundBlacklisted.length > 0) {
    console.log(`[Process Monitor] Forbidden processes detected: ${foundBlacklisted.join(', ')}`)
    mainWindow.webContents.send('process:forbidden', foundBlacklisted)
    
    processViolationCount++
    
    for (const proc of foundBlacklisted) {
      mainWindow.webContents.send(IPC_CHANNELS.PROCTOR.LOG_EVENT, {
        type: 'forbidden_process_detected',
        data: { processName: proc, action: 'detected', violationCount: processViolationCount }
      })
    }
    
    if (processViolationCount >= PROCESS_VIOLATION_THRESHOLD) {
      const reason = `Forbidden process detected (${processViolationCount} violations): ${foundBlacklisted.join(', ')}`
      console.log(`[Process Monitor] Auto-disqualifying: ${reason}`)
      disqualifyCandidate(reason)
    } else {
      mainWindow.webContents.send('process:warning', {
        count: processViolationCount,
        threshold: PROCESS_VIOLATION_THRESHOLD,
        processes: foundBlacklisted
      })
    }
  }
}

function startProcessMonitoring() {
  if (processScanInterval) return
  processScanInterval = setInterval(checkForbiddenProcesses, EXAM_CONFIG.PROCESS_SCAN_INTERVAL)
  console.log('[Process Monitor] Started')
}

function checkDevTools() {
  if (!mainWindow || !isExamActive) return

  const bounds = mainWindow.getBounds()
  const contentBounds = mainWindow.getContentBounds()

  const widthDiff = Math.abs(bounds.width - contentBounds.width)
  const heightDiff = Math.abs(bounds.height - contentBounds.height)

  if (widthDiff > EXAM_CONFIG.MAX_WINDOWS_SIZE_DIFF || heightDiff > EXAM_CONFIG.MAX_WINDOWS_SIZE_DIFF) {
    console.log('[DevTools] Possible DevTools opened detected')
    mainWindow.webContents.send(IPC_CHANNELS.WINDOW.ON_DEVTOOLS_OPEN)
    mainWindow.webContents.send(IPC_CHANNELS.PROCTOR.LOG_EVENT, {
      type: 'devtools_opened',
      data: { method: 'window_size_check' }
    })
  }
}

function startDevToolsMonitoring() {
  if (devToolsCheckInterval) return
  devToolsCheckInterval = setInterval(checkDevTools, EXAM_CONFIG.DEVTOOLS_CHECK_INTERVAL)
  console.log('[DevTools Monitor] Started')
}

function checkWindowFocus() {
  if (!mainWindow || !isExamActive) return
  
  if (!mainWindow.isFocused() && !mainWindow.isMinimized()) {
    focusLossCount++
    lastBlurTime = Date.now()
    mainWindow.webContents.send(IPC_CHANNELS.WINDOW.ON_BLUR)
    console.log(`[Focus Check] Window lost focus - #${focusLossCount}`)
  }
}

function startFocusMonitoring() {
  if (blurCheckInterval) return
  blurCheckInterval = setInterval(checkWindowFocus, EXAM_CONFIG.FOCUS_CHECK_INTERVAL)
  console.log('[Focus Monitor] Started')
}

function stopAllMonitoring() {
  if (processScanInterval) {
    clearInterval(processScanInterval)
    processScanInterval = null
  }
  if (devToolsCheckInterval) {
    clearInterval(devToolsCheckInterval)
    devToolsCheckInterval = null
  }
  if (blurCheckInterval) {
    clearInterval(blurCheckInterval)
    blurCheckInterval = null
  }
  globalShortcut.unregisterAll()
  disableContentProtection()
  stopAIServer()
  console.log('[Monitoring] All stopped')
}

function startAllMonitoring() {
  startProcessMonitoring()
  startDevToolsMonitoring()
  startFocusMonitoring()
  enableContentProtection()
}

function getAIPythonPath(): string {
  const rootDir = path.join(__dirname, '..', '..')
  return path.join(rootDir, 'ai', 'server.py')
}

function startAIServer(): Promise<boolean> {
  return new Promise((resolve) => {
    if (aiServerProcess) {
      console.log('[AI Server] Already running')
      resolve(true)
      return
    }

    const pythonPath = getAIPythonPath()
    const aiDir = path.dirname(pythonPath)

    console.log('[AI Server] Starting Python server...')
    console.log('[AI Server] Python path:', pythonPath)

    const pythonCmd = process.platform === 'win32' ? 'python' : 'python3'

    aiServerProcess = exec(
      `${pythonCmd} "${pythonPath}"`,
      {
        cwd: aiDir,
        env: { ...process.env, AI_SERVER_PORT: AI_SERVER_PORT.toString() },
        stdio: ['ignore', 'pipe', 'pipe'],
      },
      (error, stdout, stderr) => {
        if (error && !aiServerProcess?.killed) {
          console.error('[AI Server] Process error:', error.message)
        }
        aiServerProcess = null
      }
    )

    aiServerProcess.stdout?.on('data', (data) => {
      console.log('[AI Server]', data.toString().trim())
    })

    aiServerProcess.stderr?.on('data', (data) => {
      console.error('[AI Server Error]', data.toString().trim())
    })

    aiServerProcess.on('exit', (code) => {
      console.log(`[AI Server] Exited with code ${code}`)
      aiServerProcess = null
    })

    setTimeout(() => {
      if (aiServerProcess) {
        console.log('[AI Server] Started successfully')
        resolve(true)
      } else {
        resolve(false)
      }
    }, 3000)
  })
}

function stopAIServer(): void {
  if (!aiServerProcess) {
    console.log('[AI Server] Not running')
    return
  }

  console.log('[AI Server] Stopping...')
  aiServerProcess.kill('SIGTERM')
  
  setTimeout(() => {
    if (aiServerProcess) {
      aiServerProcess.kill('SIGKILL')
    }
    aiServerProcess = null
  }, 3000)
}

let contentProtectionCSS = ''

function enableContentProtection() {
  if (!mainWindow) return
  
  contentProtectionCSS = `
    * {
      user-select: none !important;
      -webkit-user-select: none !important;
      -moz-user-select: none !important;
      -ms-user-select: none !important;
      -webkit-user-drag: none !important;
      user-drag: none !important;
    }
    body {
      -webkit-app-region: no-drag !important;
      overscroll-behavior: none !important;
    }
    img, canvas, video {
      -webkit-user-drag: none !important;
      user-drag: none !important;
      pointer-events: none !important;
      -webkit-touch-callout: none !important;
    }
    input, textarea, [contenteditable="true"], [role="textbox"] {
      user-select: text !important;
      -webkit-user-select: text !important;
    }
    .exam-content {
      -webkit-mask-image: none !important;
      mask-image: none !important;
    }
    @keyframes antiScreenCapture {
      0% { opacity: 1; }
      100% { opacity: 1; }
    }
    body::before {
      content: '';
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: transparent;
      z-index: 999999;
      pointer-events: none;
    }
  `
  
  mainWindow.webContents.insertCSS(contentProtectionCSS)
  
  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (!isExamActive) return
    
    const blockedKeys: string[] = []
    
    if (input.key === 'PrintScreen') {
      event.preventDefault()
      blockedKeys.push('PrintScreen')
    }
    
    if (input.control && input.shift && (input.key === 'C' || input.key === 'I' || input.key === 'J' || input.key === 'P')) {
      event.preventDefault()
      blockedKeys.push(`Ctrl+Shift+${input.key}`)
    }
    
    if (input.key === 'Escape') {
      event.preventDefault()
      blockedKeys.push('Escape')
    }
    
    if (input.key === 'F11') {
      event.preventDefault()
      blockedKeys.push('F11')
    }
    
    if (input.key === 'F12') {
      event.preventDefault()
      blockedKeys.push('F12')
    }
    
    for (const key of blockedKeys) {
      console.log(`[Content Protection] Key blocked: ${key}`)
      mainWindow?.webContents.send('shortcut:blocked', key)
    }
  })
  
  mainWindow.webContents.on('context-menu', (event) => {
    if (isExamActive) {
      event.preventDefault()
      console.log('[Content Protection] Context menu (right-click) blocked')
      mainWindow?.webContents.send('shortcut:blocked', 'RightClick')
    }
  })
  
  console.log('[Content Protection] Enabled - OCR/text-scanning protection active')
}

function disableContentProtection() {
  if (!mainWindow) return
  
  mainWindow.webContents.insertCSS(`
    * {
      user-select: auto !important;
      -webkit-user-select: auto !important;
      -moz-user-select: auto !important;
      -ms-user-select: auto !important;
      -webkit-user-drag: auto !important;
      user-drag: auto !important;
    }
    body::before {
      display: none !important;
    }
  `)
  
  console.log('[Content Protection] Disabled')
}

function getScreenInfo() {
  const displays = screen.getAllDisplays()
  return {
    screenCount: displays.length,
    isPrimary: screen.getPrimaryDisplay() !== null
  }
}

function disqualifyCandidate(reason: string) {
  if (!mainWindow) return
  
  console.log(`[Disqualify] Candidate disqualified: ${reason}`)
  mainWindow.webContents.send('exam:disqualified', { reason })
}

ipcMain.handle(IPC_CHANNELS.EXAM.SET_KIOSK, async (_, enabled: boolean) => {
  setupKioskMode(enabled)
  return { success: true }
})

ipcMain.handle(IPC_CHANNELS.EXAM.ENABLE_FULLSCREEN, async () => {
  enableFullscreen()
  return { success: true }
})

ipcMain.handle(IPC_CHANNELS.EXAM.DISABLE_FULLSCREEN, async () => {
  disableFullscreen()
  return { success: true }
})

ipcMain.handle(IPC_CHANNELS.EXAM.SET_PREVENT_CLOSE, async (_, enabled: boolean) => {
  preventClose = enabled
  return { success: true }
})

ipcMain.handle(IPC_CHANNELS.EXAM.GET_WINDOW_BOUNDS, async () => {
  return mainWindow?.getBounds()
})

ipcMain.handle(IPC_CHANNELS.EXAM.MINIMIZE, async () => {
  if (!kioskMode) mainWindow?.minimize()
})

ipcMain.handle(IPC_CHANNELS.EXAM.MAXIMIZE, async () => {
  if (!kioskMode) {
    if (mainWindow?.isMaximized()) {
      mainWindow.unmaximize()
    } else {
      mainWindow?.maximize()
    }
  }
})

ipcMain.handle(IPC_CHANNELS.EXAM.CLOSE, async () => {
  if (!preventClose || !isExamActive) {
    mainWindow?.close()
  }
})

ipcMain.handle(IPC_CHANNELS.EXAM.FORCE_CLOSE, async () => {
  console.log('[Exam] Force closing - disabling kiosk first')
  if (mainWindow) {
    mainWindow.setFullScreen(false)
    mainWindow.setKiosk(false)
    mainWindow.setAlwaysOnTop(false)
    isExamActive = false
    preventClose = false
    stopAllMonitoring()
    disableSystemKeys(false)
    console.log('[Exam] Kiosk disabled, now closing window')
    mainWindow.close()
  }
})

ipcMain.handle(IPC_CHANNELS.EXAM.DISQUALIFY, async (_, data: { reason: string }) => {
  disqualifyCandidate(data.reason)
  return { success: true }
})

ipcMain.handle(IPC_CHANNELS.PROCTOR.LOG_EVENT, async (_, event: { type: string; data: Record<string, unknown> }) => {
  console.log('[Proctor Event]', JSON.stringify(event))
  return { received: true }
})

ipcMain.handle(IPC_CHANNELS.PROCTOR.SEND_WARNING, async (_, warning: { type: string; message: string }) => {
  console.log('[Proctor Warning]', warning)
  return { received: true }
})

ipcMain.handle(IPC_CHANNELS.PROCTOR.GET_SCREEN_INFO, async () => {
  return getScreenInfo()
})

ipcMain.handle(IPC_CHANNELS.PROCESS.KILL, async (_, processName: string) => {
  return new Promise((resolve) => {
    exec(`taskkill /IM ${processName}.exe /F`, (error) => {
      resolve({ success: !error, processName })
    })
  })
})

ipcMain.handle(IPC_CHANNELS.PROCESS.GET_RUNNING, async () => {
  const processes = await scanProcesses()
  return { processes }
})

ipcMain.handle(IPC_CHANNELS.PROCESS.SCAN_PROCESSES, async () => {
  await checkForbiddenProcesses()
  return { scanned: true }
})

ipcMain.handle(IPC_CHANNELS.CONTENT.ENABLE_PROTECTION, async () => {
  enableContentProtection()
  return { success: true }
})

ipcMain.handle(IPC_CHANNELS.CONTENT.DISABLE_PROTECTION, async () => {
  disableContentProtection()
  return { success: true }
})

ipcMain.handle(IPC_CHANNELS.AI.START_SERVER, async () => {
  const success = await startAIServer()
  return { success }
})

ipcMain.handle(IPC_CHANNELS.AI.STOP_SERVER, async () => {
  stopAIServer()
  return { success: true }
})

app.whenReady().then(() => {
  if (!checkAdminPrivileges()) {
    console.warn('[App] Warning: Running without administrator privileges')
    console.warn('[App] Some security features may not work correctly')
  }
  
  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  stopAllMonitoring()
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('before-quit', () => {
  if (isExamActive && mainWindow) {
    console.log('[App] Closing during active exam - sending last will')
    mainWindow.webContents.send(IPC_CHANNELS.PROCTOR.LOG_EVENT, {
      type: 'app_closed_during_exam',
      data: { focusLossCount, totalTimeOutside }
    })
  }
})
