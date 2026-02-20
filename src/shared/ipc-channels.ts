export const IPC = {
  SETTINGS: {
    GET: 'settings:get',
    SET: 'settings:set',
    RESET: 'settings:reset',
    CHANGED: 'settings:changed'
  },
  CAMERA: {
    LIST: 'camera:list',
    LIST_RESPONSE: 'camera:list-response',
    SELECT: 'camera:select',
    START: 'camera:start',
    STOP: 'camera:stop'
  },
  BLINK: {
    DATA: 'blink:data',
    LOW_RATE: 'blink:low-rate',
    RELAY: 'blink:relay'
  },
  STIMULATION: {
    PLAY: 'stimulation:play',
    COMPLETE: 'stimulation:complete',
    TEST: 'stimulation:test'
  },
  OVERLAY: {
    TRIGGER: 'overlay:trigger',
    DONE: 'overlay:done'
  },
  DND: {
    SET: 'dnd:set',
    GET: 'dnd:get'
  },
  WINDOW: {
    MINIMIZE: 'window:minimize',
    MAXIMIZE: 'window:maximize',
    MAXIMIZED: 'window:maximized',
    CLOSE: 'window:close',
    SHOW_SETTINGS: 'window:show-settings'
  },
  SCHEDULER: {
    PAUSE: 'scheduler:pause',
    RESUME: 'scheduler:resume',
    STATUS: 'scheduler:status'
  },
  APP: {
    VERSION: 'app:version',
    QUIT: 'app:quit',
    LOG_PATH: 'app:log-path',
    OPEN_LOG: 'app:open-log'
  },
  TWENTY: {
    TRIGGER: 'twenty:trigger',  // main → overlay renderers
    DONE: 'twenty:done'         // overlay → main (auto-dismissed)
  },
  REPORTS: {
    GET_DAILY: 'reports:get-daily',           // (date: string) → BlinkMinute[]
    GET_DAILY_SUMMARY: 'reports:get-daily-summary', // (date: string) → DailySummary
    GET_RANGE: 'reports:get-range',           // (from, to) → BlinkMinute[]
    GET_SESSIONS: 'reports:get-sessions',     // (date: string) → Session[]
    GET_WEEKLY: 'reports:get-weekly',         // (weekStart: string) → WeeklySummary
    EXPORT_CSV: 'reports:export-csv'          // (from, to) → filePath
  }
} as const
