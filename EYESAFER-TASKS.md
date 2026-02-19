# EyeSafer — Improvement Tasks for Claude Code

> **Context:** EyeSafer is an Electron 28 + Svelte 4 + Tailwind CSS 3 + TypeScript + MediaPipe desktop app that prevents eye strain through blink monitoring and visual micro-stimulation. The app is v1.0.0, running on Windows. See `CLAUDE.md` for full architecture details.

---

## Current State Assessment

### What's Done (v1.0.0)

| Feature | Status | Notes |
|---------|--------|-------|
| General settings page | ✅ Complete | Launch at login, reminder frequency (10/20/30 min), DND, reset |
| Stimulation page | ✅ Complete | 4 methods: Corner Markers, Blur Flash, Moving Object, Color Shift. Test buttons + intensity slider (Low/Medium/High) |
| Schedule page | ✅ Complete | Active hours, quick presets, weekends toggle, current status display |
| Camera page | ⚠️ Partial | Camera source selector, preview window, blink monitor (BPM, total, EAR, threshold). Preview has sizing issues on maximize |
| About page | ✅ Complete | Version info, tech stack, privacy note, log file link |
| Multi-monitor overlays | ✅ Complete | One transparent overlay per display |
| Blink detection (MediaPipe) | ⚠️ Works but inaccurate | EAR-based detection with configurable threshold. Misses blinks and/or false positives |
| Data persistence | ❌ Missing | No historical blink data storage. No reports. No session tracking |
| Interactive reports | ❌ Missing | No charts, no daily/weekly/monthly summaries |
| 20-20-20 rule | ❌ Missing | No distance-focus break reminders |
| Eye exercise routines | ❌ Missing | No guided exercises beyond basic overlay effects |

### What's Needed (Priority Order)

1. **P0 — Bug Fix:** Camera preview sizing on maximize
2. **P0 — Core:** Improve blink detection accuracy
3. **P1 — Feature:** Data persistence layer (SQLite/electron-store)
4. **P1 — Feature:** Interactive reports dashboard (new settings page)
5. **P2 — Feature:** Enhanced stimulation methods (beyond simple dot)
6. **P2 — Feature:** 20-20-20 rule integration
7. **P3 — Nice to have:** Eye exercise guided routines
8. **P3 — Nice to have:** Export reports (CSV/PDF)

---

## Task 1: Fix Camera Preview Sizing on Maximize

**Priority:** P0  
**Estimated effort:** Small  
**Files to modify:** `src/renderer/settings/pages/CameraPage.svelte` (or equivalent)

### Problem

When the settings window is maximized, the camera preview video **expands to fill all available space**, pushing the Blink Monitor, Stimulation Preview, and other settings sections off-screen. The user has to scroll just to see the controls below the video. The goal of maximizing is to see MORE content at once without scrolling — but currently it shows LESS because the camera eats all the space.

### Root Cause

The video container likely uses `w-full` or `flex-grow` without any `max-width` / `max-height` constraint. When the window grows, the video container grows proportionally, dominating the layout.

### Requirements

- Camera preview must have a **fixed maximum size** that does NOT grow when the window is maximized
- On maximize, the extra space should reveal more settings content (Blink Monitor, Stimulation Preview, etc.) without scrolling
- The preview should remain at a reasonable, compact size (e.g., `max-w-lg` or `max-w-xl` — roughly 512-576px wide)
- Aspect ratio preserved (16:9 or native camera ratio)
- On the default (non-maximized) window, the preview can fill available width up to the max constraint

### Implementation Approach

```svelte
<!-- Camera preview container — CONSTRAIN the size -->
<div class="w-full max-w-lg">  <!-- max-w-lg = 512px, or use max-w-xl = 576px -->
  <div class="relative w-full aspect-video bg-surface-900 rounded-lg overflow-hidden">
    <video
      bind:this={videoElement}
      class="w-full h-full object-contain"
      autoplay
      playsinline
      muted
    />
  </div>
</div>
```

Key CSS fixes:
- Add `max-w-lg` (512px) or `max-w-xl` (576px) to the video container — prevents growth on maximize
- Do NOT use `flex-grow` or `flex-1` on the video container
- If the video is inside a flex column, ensure sibling elements (Blink Monitor, etc.) get priority space
- Consider a two-column layout on maximize: camera preview on the left, blink monitor + settings on the right (optional, more advanced)

Alternative — two-column layout on wide screens:
```svelte
<div class="flex flex-col lg:flex-row gap-6">
  <!-- Left: Camera (fixed width) -->
  <div class="w-full lg:w-[400px] lg:flex-shrink-0">
    <div class="aspect-video bg-surface-900 rounded-lg overflow-hidden">
      <video ... />
    </div>
  </div>
  <!-- Right: Blink Monitor + Controls (fills remaining space) -->
  <div class="flex-1 min-w-0">
    <!-- Blink Monitor, Stimulation Preview, etc. -->
  </div>
</div>
```

### Verification

- [ ] Window default size → preview fits naturally within content, all sections visible
- [ ] Window maximized → preview stays compact (max ~512px wide), Blink Monitor and other sections visible WITHOUT scrolling
- [ ] Extra space on maximize is used by content below/beside the preview
- [ ] Camera feed still renders correctly at the constrained size
- [ ] Aspect ratio preserved at all sizes

---

## Task 2: Improve Blink Detection Mechanism

**Priority:** P0  
**Estimated effort:** Large  
**Files to modify:** `src/renderer/camera/camera-bridge.ts`, `src/worker/ear-calculator.ts`, `src/shared/constants.ts`, `src/shared/default-settings.ts`

### Problem Analysis

The current EAR-based blink detection has several known issues:

1. **Single-frame threshold is too aggressive**: `consecutiveFrames=1` means any single frame where EAR drops below 0.25 counts as a blink. Camera noise, head movement, or partial face detection can trigger false positives.
2. **Fixed threshold doesn't adapt**: Different people have different resting EAR values depending on eye shape, camera angle, distance, and lighting. A fixed 0.25 threshold works poorly across users.
3. **No partial blink filtering**: The current system can't distinguish between full blinks (good for eye health) and partial blinks (incomplete lid closure).
4. **No face detection confidence check**: If MediaPipe returns low-confidence landmarks, EAR calculations become unreliable.

### Recommended Improvements

#### 2.1 — Adaptive EAR Threshold with Calibration

Instead of a fixed threshold, calculate a per-user baseline during a calibration phase:

```typescript
// In camera-bridge.ts
class AdaptiveBlinkDetector {
  private earHistory: number[] = [];
  private calibrated = false;
  private personalThreshold = 0.25; // fallback
  private baselineEar = 0.30;

  // Collect 60 seconds of EAR data during normal use
  calibrate(ear: number): void {
    if (this.earHistory.length < 1200) { // 60s × 20fps
      this.earHistory.push(ear);
      return;
    }
    if (!this.calibrated) {
      // Baseline = median of top 80% EAR values (open eyes)
      const sorted = [...this.earHistory].sort((a, b) => a - b);
      const top80 = sorted.slice(Math.floor(sorted.length * 0.2));
      this.baselineEar = top80[Math.floor(top80.length / 2)];
      // Threshold = 75% of baseline (research suggests blink EAR ≈ 50-60% of open)
      this.personalThreshold = this.baselineEar * 0.75;
      this.calibrated = true;
    }
  }
}
```

#### 2.2 — Consecutive Frames + State Machine

Replace the simple counter with a state machine:

```typescript
enum BlinkState {
  OPEN,       // EAR above threshold
  CLOSING,    // EAR dropping (1-2 frames below threshold)
  CLOSED,     // EAR below threshold for 2+ consecutive frames
  OPENING     // EAR rising back above threshold → blink confirmed
}

// A blink is only confirmed when transitioning from CLOSED → OPENING
// This eliminates single-frame noise spikes
// Require minimum 2 frames below threshold AND subsequent return above threshold
// Reject "blinks" longer than 500ms (likely eye closure, not blink)
```

#### 2.3 — EAR Smoothing

Apply exponential moving average to reduce noise:

```typescript
private smoothedEar = 0.3;
private readonly alpha = 0.3; // smoothing factor (lower = smoother)

smoothEar(rawEar: number): number {
  this.smoothedEar = this.alpha * rawEar + (1 - this.alpha) * this.smoothedEar;
  return this.smoothedEar;
}
```

#### 2.4 — Face Detection Confidence Gate

Only process EAR when MediaPipe reports high confidence:

```typescript
// In the FaceLandmarker callback
const result = faceLandmarker.detectForVideo(videoFrame, timestamp);
if (result.faceLandmarks.length > 0) {
  // Check face detection score if available
  const detection = result.faceBlendshapes?.[0];
  // If blendshapes available, use eyeBlinkLeft/eyeBlinkRight directly
  // They're more accurate than manual EAR calculation
  if (detection) {
    const leftBlink = detection.categories.find(c => c.categoryName === 'eyeBlinkLeft');
    const rightBlink = detection.categories.find(c => c.categoryName === 'eyeBlinkRight');
    // Use blendshape scores (0-1) instead of EAR
  }
}
```

> **Important:** MediaPipe Face Landmarker can output Face Blendshapes which include `eyeBlinkLeft` and `eyeBlinkRight` scores (0.0 = open, 1.0 = closed). These may be more reliable than manual EAR calculation. Investigate enabling `outputFaceBlendshapes: true` in the FaceLandmarker options.

#### 2.5 — Enhanced Blink Monitor UI

Update the Camera page blink monitor to show:
- Current EAR value with color coding (green = open, yellow = partial, red = closed)
- Calibration status indicator ("Calibrating... 45s remaining" → "Calibrated ✓")
- Personal threshold value
- Smoothed vs raw EAR (optional debug toggle)
- Blink quality indicator (full vs partial)

### Settings Additions

Add to settings store:
```typescript
interface BlinkSettings {
  earThreshold: number;         // existing, now used as fallback
  consecutiveFrames: number;    // increase default from 1 to 2
  autoCalibrate: boolean;       // new, default true
  earSmoothingFactor: number;   // new, default 0.3
  useBlendshapes: boolean;      // new, default true (if available)
  maxBlinkDurationMs: number;   // new, default 500
  minBlinkDurationMs: number;   // new, default 50
  lowBlinkThreshold: number;    // existing, blinks-per-minute threshold
}
```

### Verification

- [ ] False positive rate reduced (test by keeping eyes open for 60s — should register 0 blinks)
- [ ] Blink detection works within 3 seconds of actual blink
- [ ] Calibration completes after ~60 seconds and adjusts threshold
- [ ] Partial blinks not counted as full blinks
- [ ] Detection works with glasses, different lighting, various distances
- [ ] Smoothed EAR graph shows cleaner signal than raw

---

## Task 3: Data Persistence Layer

**Priority:** P1  
**Estimated effort:** Medium  
**New files:** `src/main/services/database.service.ts`, `src/shared/types/reports.ts`

### Requirements

Store blink data for historical reporting. Use **better-sqlite3** (synchronous, fast, works great with Electron) or **electron-store** JSON files for simplicity.

### Recommended: SQLite via better-sqlite3

```bash
npm install better-sqlite3
npm install -D @types/better-sqlite3
```

### Schema

```sql
-- Session tracking
CREATE TABLE sessions (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  started_at TEXT NOT NULL,       -- ISO 8601
  ended_at TEXT,                  -- ISO 8601, NULL if active
  duration_seconds INTEGER,
  avg_bpm REAL,
  total_blinks INTEGER,
  low_blink_seconds INTEGER,     -- time spent below threshold
  stimulations_triggered INTEGER
);

-- Per-minute aggregated blink data (for charts)
CREATE TABLE blink_minutes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER REFERENCES sessions(id),
  minute_ts TEXT NOT NULL,        -- ISO 8601, rounded to minute
  bpm REAL NOT NULL,
  avg_ear REAL,
  min_ear REAL,
  blink_count INTEGER NOT NULL,
  is_low_blink BOOLEAN DEFAULT 0
);

-- Stimulation events log
CREATE TABLE stimulations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  session_id INTEGER REFERENCES sessions(id),
  triggered_at TEXT NOT NULL,
  method TEXT NOT NULL,           -- 'corner_markers', 'blur_flash', etc.
  bpm_at_trigger REAL,
  user_responded BOOLEAN          -- did blink rate increase after?
);

-- Daily summaries (pre-computed for fast report loading)
CREATE TABLE daily_summaries (
  date TEXT PRIMARY KEY,          -- YYYY-MM-DD
  total_screen_time_minutes INTEGER,
  avg_bpm REAL,
  total_blinks INTEGER,
  low_blink_minutes INTEGER,
  stimulations_count INTEGER,
  health_score INTEGER            -- 0-100 computed score
);

CREATE INDEX idx_blink_minutes_ts ON blink_minutes(minute_ts);
CREATE INDEX idx_blink_minutes_session ON blink_minutes(session_id);
CREATE INDEX idx_daily_date ON daily_summaries(date);
```

### Data Flow

1. Camera renderer sends `blink:data` events via IPC every second
2. Main process accumulates data in memory buffer
3. Every 60 seconds, flush buffer to `blink_minutes` table
4. On session end (app quit, DND, schedule end), finalize session record
5. Nightly (or on app start), compute/update `daily_summaries`

### IPC Channels to Add

```typescript
// In src/shared/ipc-channels.ts
export const IPC = {
  // ... existing channels
  'reports:get-daily': 'reports:get-daily',           // (date) → DailySummary
  'reports:get-range': 'reports:get-range',           // (from, to) → BlinkMinute[]
  'reports:get-sessions': 'reports:get-sessions',     // (date) → Session[]
  'reports:get-weekly': 'reports:get-weekly',          // (weekStart) → WeeklySummary
  'reports:get-monthly': 'reports:get-monthly',        // (month) → MonthlySummary
  'reports:export-csv': 'reports:export-csv',          // (from, to) → filePath
};
```

### Database Location

```typescript
import { app } from 'electron';
import path from 'path';
const dbPath = path.join(app.getPath('userData'), 'eyesafer.db');
```

---

## Task 4: Interactive Reports Dashboard

**Priority:** P1  
**Estimated effort:** Large  
**New files:** `src/renderer/settings/pages/ReportsPage.svelte`, multiple chart components

### Overview

Add a new **"Reports"** page to the settings sidebar (between Camera and About). This page shows interactive visualizations of blink data over time.

### Sidebar Navigation Update

Add "Reports" entry with a chart icon (📊) between Camera and About in the sidebar component.

### Report Components

#### 4.1 — Real-Time BPM Timeline Chart (Primary)

This is the chart from the reference screenshot. A time-series area chart showing blink rate throughout the day.

```
┌─────────────────────────────────────────────────────────┐
│  Blinks per Minute: 13.10    Target BPM: [11.00 ▲▼]    │
│                                                         │
│  25 ─                                                   │
│  20 ─         ████                                      │
│  15 ─    ██████████████████          ████               │
│  13 ─ ── ── ── ── ── ── ── target ── ── ── ── ── ──   │
│  10 ─  ██              ████    ████                     │
│   5 ─ ████                ████                          │
│   0 ─┬────┬────┬────┬────┬────┬────┬────┬────┬────┬──  │
│     9:00 9:30 10:00 10:30 11:00 ...                     │
│                                                         │
│  🟢 Above target    🔴 Below target                     │
└─────────────────────────────────────────────────────────┘
```

**Implementation:** Use a `<canvas>` element with custom rendering (no heavy charting library needed for this specific chart). Alternatively, use **Chart.js** (already available in the Electron renderer) or **lightweight SVG**.

Features:
- Green fill for BPM above target threshold
- Red fill for BPM below target threshold
- Horizontal dashed line at target BPM
- Current BPM display (top-left)
- Adjustable target BPM spinner (top-right)
- Time axis with 30-minute intervals
- Y-axis with BPM values and horizontal guide lines
- Hover tooltip showing exact BPM + time
- Auto-scroll to show latest data, with ability to scroll back
- Smooth gradient at the target threshold boundary

**Data source:** `blink_minutes` table, queried for today's date range.

#### 4.2 — Daily Summary Cards

```
┌──────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Screen Time  │ │  Avg BPM     │ │ Total Blinks │ │ Health Score │
│   6h 42m     │ │   14.2       │ │    5,714     │ │    78/100    │
│  ▲ +12min    │ │  ▲ +1.3      │ │  ▲ +342     │ │  ▲ +5        │
│  vs yesterday│ │  vs yesterday│ │  vs yesterday│ │  vs yesterday│
└──────────────┘ └──────────────┘ └──────────────┘ └──────────────┘
```

#### 4.3 — Weekly Blink Pattern Heatmap

A 7-day × 24-hour grid showing blink rate intensity:

```
        Mon   Tue   Wed   Thu   Fri   Sat   Sun
 9:00   🟢    🟢    🟡    🟢    🔴    ─     ─
10:00   🟢    🟡    🟡    🟢    🟡    ─     ─
11:00   🟡    🔴    🟢    🟡    🟢    ─     ─
12:00   🟢    🟢    🟢    🟢    🟢    ─     ─
 ...
```

Color coding: 🟢 Good (>15 BPM) | 🟡 Warning (10-15 BPM) | 🔴 Low (<10 BPM) | ─ Inactive

#### 4.4 — Session History Table

Scrollable table of recent sessions:

| Date | Start | End | Duration | Avg BPM | Low Blink Time | Stimulations |
|------|-------|-----|----------|---------|----------------|--------------|
| Feb 19 | 9:00 | 12:30 | 3h 30m | 14.2 | 12 min | 8 |
| Feb 19 | 13:30 | 18:00 | 4h 30m | 12.8 | 28 min | 14 |
| Feb 18 | 9:15 | 17:45 | 8h 30m | 13.5 | 45 min | 22 |

#### 4.5 — EAR Distribution Histogram

Shows distribution of EAR values during the day. Helps users understand their baseline eye openness and calibration quality.

#### 4.6 — Stimulation Effectiveness Chart

Bar chart comparing blink rate 5 minutes before vs 5 minutes after each stimulation trigger. Shows which methods actually help:

```
Corner Markers:  Before 8.2 BPM → After 14.1 BPM  (+72%)
Blur Flash:      Before 9.1 BPM → After 11.3 BPM  (+24%)
Moving Object:   Before 7.8 BPM → After 15.2 BPM  (+95%)
Color Shift:     Before 8.5 BPM → After 10.1 BPM  (+19%)
```

#### 4.7 — Monthly Trend Line

Simple line chart showing daily average BPM over the past 30 days with a trend line.

### Date Navigation

Add a date picker at the top of the Reports page:
- Today / Yesterday quick buttons
- Calendar date picker for specific dates
- Week/Month view toggle
- "◀ Previous Day" / "Next Day ▶" arrows

### Tech Recommendations

For charts in Svelte within Electron:
1. **Option A (Recommended):** Custom `<canvas>` or `<svg>` rendering — lightest weight, full control, matches the reference screenshot style
2. **Option B:** [Chart.js](https://www.chartjs.org/) via `chart.js` npm package — well-documented, works in Electron
3. **Option C:** [Layercake](https://layercake.graphics/) — Svelte-native charting, very lightweight

Use Option A for the main BPM timeline (to exactly match the reference style) and Option B/C for secondary charts.

---

## Task 5: Enhanced Stimulation Methods

**Priority:** P2  
**Estimated effort:** Medium  
**Files to modify:** `src/renderer/overlay/effects/`, `src/shared/default-settings.ts`

### Problem

The current stimulation methods (corner dots, blur, floating dot, color shift) can become predictable and easy to ignore over time. Research shows that varied, engaging visual stimuli are more effective at prompting eye movement and blinking.

### New Stimulation Effects to Add

#### 5.1 — Figure-Eight Tracking Path

A smooth figure-8 (infinity symbol ∞) path that a small visual element follows, guiding the user's eyes through full range-of-motion exercise.

```typescript
// Path calculation
const figure8Path = (t: number, width: number, height: number) => ({
  x: width/2 + (width * 0.35) * Math.sin(t),
  y: height/2 + (height * 0.2) * Math.sin(2 * t)
});
```

Visual element options (not just a dot):
- Small butterfly SVG animation
- Glowing orb with trail effect
- Expanding/contracting circle
- Small arrow/chevron pointing in direction of travel

Duration: 6-8 seconds for 2 complete loops.

#### 5.2 — Near-Far Focus Shift

Simulates depth change by showing an element that "approaches" and "recedes":
- Circle starts small (simulating far) → grows large (simulating near) → shrinks back
- Accompanied by blur-to-sharp transition
- Prompts the user to shift focus, exercising the ciliary muscle

```svelte
<div
  class="absolute rounded-full bg-primary-500/60 transition-all"
  style="
    width: {size}px; height: {size}px;
    filter: blur({blur}px);
    transform: translate(-50%, -50%) scale({scale});
  "
/>
```

Duration: 4-6 seconds per cycle, 2-3 cycles.

#### 5.3 — Peripheral Vision Triggers

Elements that appear briefly at the extreme edges of the screen to exercise peripheral awareness:
- Small pulsing dots appear at random edge positions
- User naturally glances toward them, exercising eye muscles
- Each dot appears for 1-2 seconds then fades

#### 5.4 — Guided Blink Prompt

Instead of an indirect visual trigger, directly prompt the user to perform intentional blinking:
- Transparent overlay shows: "Close your eyes gently for 2 seconds" with a countdown
- Then: "Open and relax" for 3 seconds
- Total: 5-second micro-exercise
- Only trigger when BPM is critically low (below 8 BPM)

#### 5.5 — Saccade Training (Rapid Eye Movement)

Two dots appear at opposite sides of the screen simultaneously, alternating which one is highlighted:

```
[●]────────────────────────────────[○]  (look left)
[○]────────────────────────────────[●]  (look right)
[●]────────────────────────────────[○]  (look left)
```

Duration: 8-10 alternations over 4-5 seconds.

### Settings Updates

Add new methods to the Stimulation page with the same pattern (icon + description + Test button + toggle):

```typescript
interface StimulationSettings {
  // existing
  cornerMarkers: boolean;
  blurFlash: boolean;
  movingObject: boolean;
  colorShift: boolean;
  // new
  figureEight: boolean;       // default: true
  nearFarFocus: boolean;      // default: true
  peripheralTriggers: boolean; // default: true
  guidedBlink: boolean;       // default: false (opt-in, more intrusive)
  saccadeTraining: boolean;   // default: false (opt-in, more intrusive)
}
```

### Effect Rotation

Instead of triggering all enabled effects simultaneously, implement a rotation system:
- Each stimulation event picks ONE random effect from enabled methods
- Weight recent effects lower (avoid repetition)
- Track which effects produce the best BPM improvement (data from Task 3)
- Over time, auto-favor more effective methods

---

## Task 6: 20-20-20 Rule Integration

**Priority:** P2  
**Estimated effort:** Small-Medium  
**Files to modify:** `src/main/services/scheduler.service.ts`, new overlay component

### The Rule

Every **20 minutes**, look at something **20 feet away** for **20 seconds**.

### Implementation

1. Add a separate 20-minute timer in the scheduler (independent from stimulation timer)
2. When triggered, show a gentle overlay notification:
   - "👁️ Look away from your screen"
   - "Focus on something 20+ feet away"
   - 20-second countdown timer
   - "Skip" button (small, unobtrusive)
3. After 20 seconds, auto-dismiss with: "Great! Your eyes thank you 👏"
4. Log the event (completed/skipped) to the database

### Settings

Add toggle on the General page:
```
20-20-20 RULE
[Toggle] Enable 20-20-20 reminders
Show a 20-second break reminder every 20 minutes
```

---

## Task 7: Good-to-Have Improvements

These are smaller enhancements that improve overall quality.

### 7.1 — System Tray Enhancements

- Show current BPM in tray tooltip: "EyeSafer — 14.2 BPM"
- Tray icon color change: green (good), yellow (warning), red (low blink)
- Quick actions in tray menu: "Pause 30 min", "Show Reports", "Run Exercise"

### 7.2 — Notifications

- Desktop notification when blink rate drops below threshold for 5+ consecutive minutes
- Optional sound cue (soft chime) with stimulation triggers
- Weekly summary notification: "This week: avg 13.5 BPM, 42h screen time"

### 7.3 — Keyboard Shortcuts

- `Ctrl+Shift+E` — Trigger eye exercise manually
- `Ctrl+Shift+D` — Toggle DND mode
- `Ctrl+Shift+R` — Open reports

### 7.4 — Camera Page Improvements

- Add "Calibration" button to manually trigger EAR calibration
- Show face detection bounding box on camera preview
- Show eye landmark overlay (the 6 points per eye) on preview for debugging
- Add camera resolution selector dropdown
- Show FPS counter for MediaPipe processing

### 7.5 — Dark/Light Theme Toggle

Currently the app is dark-themed only. Add light theme option for users who prefer it or for daytime use.

### 7.6 — Onboarding / First Run

- First launch wizard:
  1. Camera permission request with explanation
  2. EAR calibration (look at camera normally for 30 seconds)
  3. Choose stimulation preferences
  4. Set schedule
- Skip option for power users

### 7.7 — Auto-Update

Implement `electron-updater` for automatic updates via GitHub Releases.

---

## Technical Notes

### Chart Implementation for BPM Timeline

The reference chart (green/red fill, time axis) can be implemented with a `<canvas>` element:

```typescript
// Pseudocode for the main BPM chart renderer
function renderBpmChart(
  ctx: CanvasRenderingContext2D,
  data: { timestamp: number; bpm: number }[],
  targetBpm: number,
  width: number,
  height: number
) {
  const padding = { top: 30, right: 60, bottom: 40, left: 50 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  // Calculate scales
  const timeRange = [data[0].timestamp, data[data.length - 1].timestamp];
  const bpmMax = Math.max(...data.map(d => d.bpm), targetBpm * 1.5);

  const xScale = (t: number) => padding.left + ((t - timeRange[0]) / (timeRange[1] - timeRange[0])) * chartW;
  const yScale = (bpm: number) => padding.top + chartH - (bpm / bpmMax) * chartH;

  // Draw filled area — green above target, red below
  for (let i = 1; i < data.length; i++) {
    const x0 = xScale(data[i-1].timestamp);
    const x1 = xScale(data[i].timestamp);
    const y0 = yScale(data[i-1].bpm);
    const y1 = yScale(data[i].bpm);
    const yTarget = yScale(targetBpm);

    // Green portion (above target)
    ctx.fillStyle = '#00ff00';
    ctx.beginPath();
    ctx.moveTo(x0, Math.min(y0, yTarget));
    ctx.lineTo(x1, Math.min(y1, yTarget));
    ctx.lineTo(x1, yTarget);
    ctx.lineTo(x0, yTarget);
    ctx.fill();

    // Red portion (below target)
    ctx.fillStyle = '#ff0000';
    ctx.beginPath();
    ctx.moveTo(x0, Math.max(y0, yTarget));
    ctx.lineTo(x1, Math.max(y1, yTarget));
    ctx.lineTo(x1, yScale(0));
    ctx.lineTo(x0, yScale(0));
    ctx.fill();
  }

  // Draw target line (dashed)
  ctx.setLineDash([5, 5]);
  ctx.strokeStyle = '#ffffff80';
  ctx.beginPath();
  ctx.moveTo(padding.left, yScale(targetBpm));
  ctx.lineTo(width - padding.right, yScale(targetBpm));
  ctx.stroke();
  ctx.setLineDash([]);

  // Draw axes, labels, time ticks...
}
```

### SQLite in Electron (better-sqlite3)

`better-sqlite3` requires native compilation. Add to `electron-builder` config:

```json
{
  "extraResources": [],
  "electronDownload": {},
  "npmRebuild": true
}
```

Ensure `better-sqlite3` is in `dependencies` (not devDependencies) and rebuild for Electron:

```bash
npx electron-rebuild -f -w better-sqlite3
```

Alternative: If native modules cause build issues, use `sql.js` (pure WASM SQLite) which requires no native compilation.

### MediaPipe Blendshapes Investigation

To check if blendshapes are available, update the FaceLandmarker creation:

```typescript
const faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
  baseOptions: {
    modelAssetPath: '/mediapipe/face_landmarker.task',
    delegate: 'CPU'
  },
  runningMode: 'VIDEO',
  numFaces: 1,
  outputFacialTransformationMatrixes: false,
  outputFaceBlendshapes: true  // ← ADD THIS
});
```

Then in the detection callback:
```typescript
const result = faceLandmarker.detectForVideo(videoFrame, timestamp);
if (result.faceBlendshapes?.[0]) {
  const shapes = result.faceBlendshapes[0].categories;
  const leftBlink = shapes.find(s => s.categoryName === 'eyeBlinkLeft')?.score ?? 0;
  const rightBlink = shapes.find(s => s.categoryName === 'eyeBlinkRight')?.score ?? 0;
  // Score 0.0 = fully open, 1.0 = fully closed
  // Much more reliable than manual EAR when available
}
```

> **Note:** Blendshape output may increase CPU usage slightly. Benchmark before and after. If too heavy, keep EAR as primary with the improvements from Task 2.

---

## Execution Order Recommendation

```
Phase 1 (Immediate):
  Task 1 — Camera sizing fix (quick win)
  Task 2 — Blink detection improvements (core quality)

Phase 2 (Foundation):
  Task 3 — Data persistence (needed for reports)

Phase 3 (Features):
  Task 4 — Interactive reports
  Task 5 — Enhanced stimulation methods

Phase 4 (Polish):
  Task 6 — 20-20-20 rule
  Task 7 — Good-to-have improvements
```

---

## Reminder

When working on the game "НЕЗЛАМНІ: ЛІНІЯ СВОБОДИ" — create geopolitician cards (Trump, Macron, Scholz, Metz, Kim Jong-un, Ursula, etc.) with effects 1-6 from dice roll.
