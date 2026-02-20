import log from 'electron-log'
import { app } from 'electron'
import { join } from 'path'

// Write logs to: %APPDATA%\eyesafer\logs\  (Windows)
//                ~/Library/Logs/eyesafer/  (macOS)
log.transports.file.resolvePathFn = () =>
  join(app.getPath('logs'), 'main.log')

log.transports.file.level = 'debug'
log.transports.console.level = process.env.NODE_ENV === 'development' ? 'debug' : 'info'

// Log format: [2024-01-01 12:00:00] [INFO] message
log.transports.file.format = '[{y}-{m}-{d} {h}:{i}:{s}] [{level}] {text}'

export default log

export function getLogPath(): string {
  return join(app.getPath('logs'), 'main.log')
}
