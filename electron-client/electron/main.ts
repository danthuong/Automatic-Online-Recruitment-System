import { app, BrowserWindow, ipcMain, screen, globalShortcut, Menu } from 'electron'
import path from 'path'
import { exec } from 'child_process'
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
      console.log(`[Window] Blur detected - Focus loss #${focusLossCount}`)
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
    mainWindow.webContents.openDevTools()
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
    mainWindow.setAlwaysOnTop(true, 'screen-saver')
    isExamActive = true
    startAllMonitoring()
    disableSystemKeys(true)
    
    if (Menu.getApplicationMenu()) {
      Menu.setApplicationMenu(null)
    }
    
    console.log('[Kiosk] Mode enabled - Exam started')
  } else {
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
    `)

    globalShortcut.register('Alt+Tab', () => {
      if (isExamActive) {
        console.log('[Shortcut Blocked] Alt+Tab')
        mainWindow?.webContents.send('shortcut:blocked', 'Alt+Tab')
      }
    })

    globalShortcut.register('Alt+F4', () => {
      if (isExamActive) {
        console.log('[Shortcut Blocked] Alt+F4')
        mainWindow?.webContents.send('shortcut:blocked', 'Alt+F4')
      }
    })

    globalShortcut.register('Control+Tab', () => {
      if (isExamActive) {
        console.log('[Shortcut Blocked] Control+Tab')
        mainWindow?.webContents.send('shortcut:blocked', 'Control+Tab')
      }
    })

    globalShortcut.register('Escape', () => {
      if (isExamActive) {
        console.log('[Shortcut Blocked] Escape')
        mainWindow?.webContents.send('shortcut:blocked', 'Escape')
      }
    })

    globalShortcut.register('F11', () => {
      if (isExamActive) {
        console.log('[Shortcut Blocked] F11')
      }
    })

    globalShortcut.register('PrintScreen', () => {
      if (isExamActive) {
        console.log('[Shortcut Blocked] PrintScreen')
        mainWindow?.webContents.send('shortcut:blocked', 'PrintScreen')
      }
    })

    console.log('[Security] System shortcuts blocked')
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
    
    for (const proc of foundBlacklisted) {
      mainWindow.webContents.send(IPC_CHANNELS.PROCTOR.LOG_EVENT, {
        type: 'forbidden_process_detected',
        data: { processName: proc, action: 'detected' }
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
  console.log('[Monitoring] All stopped')
}

function startAllMonitoring() {
  startProcessMonitoring()
  startDevToolsMonitoring()
  startFocusMonitoring()
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

app.whenReady().then(() => {
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
