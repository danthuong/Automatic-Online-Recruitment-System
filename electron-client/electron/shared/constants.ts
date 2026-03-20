export const IPC_CHANNELS = {
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
} as const

export const BLACKLISTED_PROCESSES = [
  'TeamViewer.exe',
  'AnyDesk.exe',
  'OBS.exe',
  'obs64.exe',
  'firefox.exe',
  'Opera.exe',
  'Brave.exe',
  'VLC.exe',
  'PotPlayer.exe',
  'Steam.exe',
  'EpicGamesLauncher.exe',
  'Spotify.exe',
  'Zoom.exe',
  'Skype.exe',
  'Slack.exe',
  'Teams.exe',
  'Parsec.exe',
  'DeskPin.exe',
  'AutoHotkey.exe',
  'CheatEngine.exe',
  'ArtMoney.exe',
  'ProcessHacker.exe',
  'ProcessExplorer.exe',
]

export const SUSPICIOUS_KEYS = [
  'Escape',
  'F1', 'F2', 'F3', 'F4', 'F5', 'F6', 'F7', 'F8', 'F9', 'F10', 'F11', 'F12',
  'PrintScreen',
  'Insert',
  'Delete',
  'Home',
  'End',
  'PageUp',
  'PageDown',
  'LeftArrow',
  'RightArrow',
  'UpArrow',
  'DownArrow',
]

export const DEVTOOLS_SHORTCUTS = [
  { key: 'F12', ctrl: false, shift: false },
  { key: 'i', ctrl: true, shift: true },
  { key: 'j', ctrl: true, shift: true },
  { key: 'c', ctrl: true, shift: true },
]

export const EXAM_CONFIG = {
  PROCESS_SCAN_INTERVAL: 2000,
  FOCUS_CHECK_INTERVAL: 1000,
  DEVTOOLS_CHECK_INTERVAL: 1000,
  EVENT_BATCH_INTERVAL: 5000,
  MAX_WINDOWS_SIZE_DIFF: 200,
  WARNING_THRESHOLD: 3,
  CRITICAL_WARNING_THRESHOLD: 5,
}
