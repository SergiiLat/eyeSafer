import { app } from 'electron'
import { join, dirname } from 'path'
import { readFileSync, writeFileSync, existsSync } from 'fs'
import { createRequire } from 'module'
import log from '../logger'
import type {
  BlinkData,
  BlinkMinute,
  Session,
  DailySummary,
  WeeklySummary,
  StimulationMethod
} from '../../shared/types'

// createRequire with __filename works in the CJS-compiled main process
const _require = createRequire(__filename)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SqlJs = any

interface MinuteBuffer {
  bpmValues: number[]
  earValues: number[]
  blinkCount: number
  sessionId: number
  minuteTs: string
}

class DatabaseService {
  private SQL: SqlJs | null = null
  private db: SqlJs | null = null
  private dbPath = ''
  private saveTimer: ReturnType<typeof setInterval> | null = null

  // In-memory accumulation
  private currentSessionId: number | null = null
  private minuteBuffer: MinuteBuffer | null = null
  private flushTimer: ReturnType<typeof setInterval> | null = null
  private sessionStartTime = 0
  private sessionStimulations = 0
  private sessionLowBlinkSeconds = 0

  async init(): Promise<void> {
    this.dbPath = join(app.getPath('userData'), 'eyesafer.db')
    log.info(`[db] Database path: ${this.dbPath}`)

    // Dynamic import first so errors are surfaced before WASM loading
    const initSqlJs: (config?: object) => Promise<SqlJs> = (await import('sql.js')).default

    // Try multiple strategies to locate sql-wasm.wasm.
    // resolve('sql.js') → .../sql.js/dist/sql.js, so dirname = .../sql.js/dist/
    // The WASM sits in the same dist/ folder — do NOT append 'dist' again.
    const wasmCandidates: (() => string)[] = [
      // Strategy 1: same dir as sql.js entry (dev + most builds)
      () => join(dirname(_require.resolve('sql.js')), 'sql-wasm.wasm'),
      // Strategy 2: from app root node_modules
      () => join(app.getAppPath(), 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
      // Strategy 3: relative to compiled main bundle (electron-vite out/main/)
      () => join(dirname(__filename), '..', '..', 'node_modules', 'sql.js', 'dist', 'sql-wasm.wasm'),
    ]

    let wasmBinary: Buffer | undefined
    for (const getPath of wasmCandidates) {
      try {
        const p = getPath()
        wasmBinary = readFileSync(p)
        log.info(`[db] WASM loaded from: ${p}`)
        break
      } catch {
        // try next candidate
      }
    }

    if (!wasmBinary) {
      throw new Error('[db] Could not locate sql-wasm.wasm — checked node_modules in dev and app paths')
    }

    this.SQL = await initSqlJs({ wasmBinary })

    // Load existing DB or create new
    if (existsSync(this.dbPath)) {
      const fileBuffer = readFileSync(this.dbPath)
      this.db = new this.SQL.Database(fileBuffer)
      log.info('[db] Loaded existing database')
    } else {
      this.db = new this.SQL.Database()
      log.info('[db] Created new database')
    }

    this.createSchema()

    // Persist to disk every 60 seconds
    this.saveTimer = setInterval(() => this.saveToDisk(), 60_000)
  }

  private createSchema(): void {
    this.db.run(`
      CREATE TABLE IF NOT EXISTS sessions (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        started_at TEXT NOT NULL,
        ended_at TEXT,
        duration_seconds INTEGER,
        avg_bpm REAL,
        total_blinks INTEGER,
        low_blink_seconds INTEGER,
        stimulations_triggered INTEGER
      );

      CREATE TABLE IF NOT EXISTS blink_minutes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER REFERENCES sessions(id),
        minute_ts TEXT NOT NULL,
        bpm REAL NOT NULL,
        avg_ear REAL,
        min_ear REAL,
        blink_count INTEGER NOT NULL,
        is_low_blink INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS stimulations (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        session_id INTEGER REFERENCES sessions(id),
        triggered_at TEXT NOT NULL,
        method TEXT NOT NULL,
        bpm_at_trigger REAL
      );

      CREATE TABLE IF NOT EXISTS daily_summaries (
        date TEXT PRIMARY KEY,
        total_screen_time_minutes INTEGER,
        avg_bpm REAL,
        total_blinks INTEGER,
        low_blink_minutes INTEGER,
        stimulations_count INTEGER,
        health_score INTEGER
      );

      CREATE INDEX IF NOT EXISTS idx_blink_minutes_ts ON blink_minutes(minute_ts);
      CREATE INDEX IF NOT EXISTS idx_blink_minutes_session ON blink_minutes(session_id);
      CREATE INDEX IF NOT EXISTS idx_daily_date ON daily_summaries(date);
    `)
  }

  // ── Session management ────────────────────────────────────────────────────

  startSession(): number {
    if (!this.db) { log.warn('[db] startSession called before init'); return 0 }
    const now = new Date().toISOString()
    this.db.run(
      'INSERT INTO sessions (started_at) VALUES (?)',
      [now]
    )
    const result = this.db.exec('SELECT last_insert_rowid() as id')
    this.currentSessionId = result[0].values[0][0] as number
    this.sessionStartTime = Date.now()
    this.sessionStimulations = 0
    this.sessionLowBlinkSeconds = 0
    log.info(`[db] Session started: #${this.currentSessionId}`)

    // Flush every 60 seconds
    this.flushTimer = setInterval(() => this.flushMinuteBuffer(), 60_000)
    return this.currentSessionId
  }

  endSession(): void {
    if (!this.db || this.currentSessionId === null) return
    this.flushMinuteBuffer()

    const now = new Date().toISOString()
    const durationSeconds = Math.floor((Date.now() - this.sessionStartTime) / 1000)

    // Get session stats
    const bpmResult = this.db.exec(
      'SELECT AVG(bpm), SUM(blink_count), SUM(CASE WHEN is_low_blink THEN 1 ELSE 0 END) FROM blink_minutes WHERE session_id = ?',
      [this.currentSessionId]
    )
    const row = bpmResult[0]?.values[0]
    const avgBpm = row?.[0] ?? null
    const totalBlinks = row?.[1] ?? null
    const lowBlinkMinutes = (row?.[2] as number ?? 0)

    this.db.run(
      `UPDATE sessions SET ended_at=?, duration_seconds=?, avg_bpm=?,
       total_blinks=?, low_blink_seconds=?, stimulations_triggered=?
       WHERE id=?`,
      [now, durationSeconds, avgBpm, totalBlinks,
       lowBlinkMinutes * 60, this.sessionStimulations, this.currentSessionId]
    )

    this.updateDailySummary(now.substring(0, 10))
    log.info(`[db] Session ended: #${this.currentSessionId}, duration: ${durationSeconds}s`)

    clearInterval(this.flushTimer!)
    this.flushTimer = null
    this.currentSessionId = null
    this.minuteBuffer = null
    this.saveToDisk()
  }

  // ── Blink data accumulation ────────────────────────────────────────────────

  accumulateBlinkData(data: BlinkData): void {
    if (!this.db || this.currentSessionId === null) return

    const minuteTs = new Date(
      Math.floor(Date.now() / 60_000) * 60_000
    ).toISOString()

    if (!this.minuteBuffer || this.minuteBuffer.minuteTs !== minuteTs) {
      // New minute — flush old buffer first
      if (this.minuteBuffer) this.flushMinuteBuffer()
      this.minuteBuffer = {
        bpmValues: [],
        earValues: [],
        blinkCount: 0,
        sessionId: this.currentSessionId,
        minuteTs
      }
    }

    this.minuteBuffer.bpmValues.push(data.bpm)
    if (data.ear > 0) this.minuteBuffer.earValues.push(data.ear)
  }

  private flushMinuteBuffer(): void {
    if (!this.db || !this.minuteBuffer || this.minuteBuffer.bpmValues.length === 0) return
    const buf = this.minuteBuffer

    const avgBpm = buf.bpmValues.reduce((a, b) => a + b, 0) / buf.bpmValues.length
    const avgEar = buf.earValues.length
      ? buf.earValues.reduce((a, b) => a + b, 0) / buf.earValues.length
      : null
    const minEar = buf.earValues.length
      ? Math.min(...buf.earValues)
      : null

    // Estimate blink count from last blink data we have
    const isLowBlink = avgBpm < 12 ? 1 : 0

    this.db.run(
      `INSERT OR REPLACE INTO blink_minutes
       (session_id, minute_ts, bpm, avg_ear, min_ear, blink_count, is_low_blink)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [buf.sessionId, buf.minuteTs, avgBpm, avgEar, minEar, buf.bpmValues.length, isLowBlink]
    )

    if (isLowBlink) this.sessionLowBlinkSeconds += 60
    this.minuteBuffer = null
  }

  // ── Stimulation logging ────────────────────────────────────────────────────

  logStimulation(method: StimulationMethod, bpm: number | null): void {
    if (!this.db || this.currentSessionId === null) return
    this.sessionStimulations++
    this.db.run(
      'INSERT INTO stimulations (session_id, triggered_at, method, bpm_at_trigger) VALUES (?, ?, ?, ?)',
      [this.currentSessionId, new Date().toISOString(), method, bpm]
    )
  }

  // ── Daily summary ──────────────────────────────────────────────────────────

  private updateDailySummary(date: string): void {
    if (!this.db) return
    const result = this.db.exec(`
      SELECT
        COUNT(DISTINCT bm.session_id) as session_count,
        AVG(bm.bpm) as avg_bpm,
        SUM(bm.blink_count) as total_blinks,
        COUNT(bm.id) as total_minutes,
        SUM(CASE WHEN bm.is_low_blink THEN 1 ELSE 0 END) as low_blink_minutes,
        (SELECT COUNT(*) FROM stimulations s
          JOIN sessions sess ON s.session_id = sess.id
          WHERE substr(sess.started_at, 1, 10) = ?) as stim_count
      FROM blink_minutes bm
      JOIN sessions sess ON bm.session_id = sess.id
      WHERE substr(bm.minute_ts, 1, 10) = ?
    `, [date, date])

    const row = result[0]?.values[0]
    if (!row) return

    const avgBpm = row[1] as number | null
    const totalBlinks = row[2] as number | null
    const totalMinutes = row[3] as number ?? 0
    const lowBlinkMinutes = row[4] as number ?? 0
    const stimCount = row[5] as number ?? 0

    // Health score: 0–100 based on avg BPM (target 15 BPM = 100)
    const healthScore = avgBpm !== null
      ? Math.min(100, Math.round((avgBpm / 15) * 100))
      : null

    this.db.run(
      `INSERT OR REPLACE INTO daily_summaries
       (date, total_screen_time_minutes, avg_bpm, total_blinks,
        low_blink_minutes, stimulations_count, health_score)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [date, totalMinutes, avgBpm, totalBlinks, lowBlinkMinutes, stimCount, healthScore]
    )
  }

  // ── Query methods (for IPC handlers) ──────────────────────────────────────

  getBlinkMinutes(date: string): BlinkMinute[] {
    if (!this.db) return []
    const result = this.db.exec(
      `SELECT id, session_id, minute_ts, bpm, avg_ear, min_ear, blink_count, is_low_blink
       FROM blink_minutes
       WHERE substr(minute_ts, 1, 10) = ?
       ORDER BY minute_ts ASC`,
      [date]
    )
    return this.rowsToObjects<BlinkMinute>(result, [
      'id', 'sessionId', 'minuteTs', 'bpm', 'avgEar', 'minEar', 'blinkCount', 'isLowBlink'
    ])
  }

  getBlinkRange(from: string, to: string): BlinkMinute[] {
    if (!this.db) return []
    const result = this.db.exec(
      `SELECT id, session_id, minute_ts, bpm, avg_ear, min_ear, blink_count, is_low_blink
       FROM blink_minutes
       WHERE minute_ts >= ? AND minute_ts <= ?
       ORDER BY minute_ts ASC`,
      [from, to]
    )
    return this.rowsToObjects<BlinkMinute>(result, [
      'id', 'sessionId', 'minuteTs', 'bpm', 'avgEar', 'minEar', 'blinkCount', 'isLowBlink'
    ])
  }

  getSessions(date: string): Session[] {
    if (!this.db) return []
    const result = this.db.exec(
      `SELECT id, started_at, ended_at, duration_seconds, avg_bpm,
              total_blinks, low_blink_seconds, stimulations_triggered
       FROM sessions
       WHERE substr(started_at, 1, 10) = ?
       ORDER BY started_at DESC`,
      [date]
    )
    return this.rowsToObjects<Session>(result, [
      'id', 'startedAt', 'endedAt', 'durationSeconds', 'avgBpm',
      'totalBlinks', 'lowBlinkSeconds', 'stimulationsTriggered'
    ])
  }

  getDailySummary(date: string): DailySummary | null {
    if (!this.db) return null
    this.updateDailySummary(date)
    const result = this.db.exec(
      `SELECT date, total_screen_time_minutes, avg_bpm, total_blinks,
              low_blink_minutes, stimulations_count, health_score
       FROM daily_summaries WHERE date = ?`,
      [date]
    )
    const rows = this.rowsToObjects<DailySummary>(result, [
      'date', 'totalScreenTimeMinutes', 'avgBpm', 'totalBlinks',
      'lowBlinkMinutes', 'stimulationsCount', 'healthScore'
    ])
    return rows[0] ?? null
  }

  getWeeklySummary(weekStart: string): WeeklySummary {
    if (!this.db) return { weekStart, days: [], avgBpm: null, totalBlinks: 0, totalScreenTimeMinutes: 0 }
    const days: DailySummary[] = []
    const start = new Date(weekStart)
    for (let i = 0; i < 7; i++) {
      const d = new Date(start)
      d.setDate(d.getDate() + i)
      const date = d.toISOString().substring(0, 10)
      const summary = this.getDailySummary(date)
      if (summary) days.push(summary)
    }

    const bpms = days.filter(d => d.avgBpm !== null).map(d => d.avgBpm as number)
    return {
      weekStart,
      days,
      avgBpm: bpms.length ? bpms.reduce((a, b) => a + b, 0) / bpms.length : null,
      totalBlinks: days.reduce((a, d) => a + (d.totalBlinks ?? 0), 0),
      totalScreenTimeMinutes: days.reduce((a, d) => a + d.totalScreenTimeMinutes, 0)
    }
  }

  exportCsv(from: string, to: string): string {
    const rows = this.getBlinkRange(from, to)
    const header = 'minuteTs,bpm,avgEar,minEar,blinkCount,isLowBlink,sessionId\n'
    const lines = rows.map(r =>
      `${r.minuteTs},${r.bpm},${r.avgEar ?? ''},${r.minEar ?? ''},${r.blinkCount},${r.isLowBlink ? 1 : 0},${r.sessionId}`
    ).join('\n')
    return header + lines
  }

  getStimulationEffectiveness(): { method: string; avgBpmBefore: number; avgBpmAfter: number }[] {
    if (!this.db) return []
    const result = this.db.exec(`
      SELECT s.method,
             AVG(b_before.bpm) as avg_before,
             AVG(b_after.bpm) as avg_after
      FROM stimulations s
      LEFT JOIN blink_minutes b_before
        ON b_before.session_id = s.session_id
        AND b_before.minute_ts < s.triggered_at
        AND b_before.minute_ts >= datetime(s.triggered_at, '-5 minutes')
      LEFT JOIN blink_minutes b_after
        ON b_after.session_id = s.session_id
        AND b_after.minute_ts > s.triggered_at
        AND b_after.minute_ts <= datetime(s.triggered_at, '+5 minutes')
      GROUP BY s.method
    `)
    return this.rowsToObjects(result, ['method', 'avgBpmBefore', 'avgBpmAfter'])
  }

  getCurrentSessionId(): number | null {
    return this.currentSessionId
  }

  // ── Utilities ──────────────────────────────────────────────────────────────

  private rowsToObjects<T>(result: SqlJs[], keys: string[]): T[] {
    if (!result || result.length === 0) return []
    return result[0].values.map((row: unknown[]) => {
      const obj: Record<string, unknown> = {}
      keys.forEach((k, i) => { obj[k] = row[i] })
      return obj as T
    })
  }

  saveToDisk(): void {
    if (!this.db) return
    try {
      const data: Uint8Array = this.db.export()
      writeFileSync(this.dbPath, Buffer.from(data))
    } catch (err) {
      log.error(`[db] Failed to save: ${err}`)
    }
  }

  close(): void {
    clearInterval(this.saveTimer!)
    clearInterval(this.flushTimer!)
    this.flushMinuteBuffer()
    if (this.currentSessionId !== null) this.endSession()
    this.saveToDisk()
    this.db?.close()
    this.db = null
    log.info('[db] Database closed')
  }
}

export const databaseService = new DatabaseService()
