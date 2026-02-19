# Eye Care App — Claude Code Agent Teams Implementation Guide

## Project Overview

**Name:** EyeCare Desktop App  
**Platform:** Windows (primary), macOS (secondary)  
**Stack:** Electron + Svelte + Tailwind CSS + TypeScript + MediaPipe  
**Purpose:** Prevent eye strain through blink monitoring and visual micro-stimulation

---

## Architecture Decisions

### Overlay Strategy
Use **one transparent overlay window per monitor**. This approach:
- Properly handles multi-monitor setups with different resolutions/DPI
- Allows independent animations per screen
- Avoids coordinate calculation issues

**Blur Implementation:** Since CSS `backdrop-filter` cannot blur desktop content outside Electron, implement blur as:
- Semi-transparent dark/light overlay (`rgba(0,0,0,0.3)` or `rgba(255,255,255,0.2)`)
- Optional: Capture screenshot → apply canvas blur → display briefly (advanced, v2)

### MediaPipe Processing
Use **OffscreenCanvas in Web Worker** for best performance:
- Main renderer stays responsive
- Face detection runs at ~15-20 FPS (sufficient for blink detection)
- Falls back to hidden BrowserWindow if Worker not supported

### Framework Choice: Svelte
Selected for:
- Minimal bundle size (important for desktop app)
- No virtual DOM overhead
- Reactive state management built-in
- Excellent TypeScript support
- Clean component syntax

---

## Project Structure

```
eye-care-app/
├── package.json
├── electron-builder.json
├── tsconfig.json
├── tailwind.config.js
├── postcss.config.js
├── vite.config.ts
│
├── src/
│   ├── main/                      # Electron Main Process
│   │   ├── index.ts               # Entry point
│   │   ├── tray.ts                # System tray management
│   │   ├── ipc-handlers.ts        # IPC message handlers
│   │   ├── windows/
│   │   │   ├── settings.ts        # Settings window
│   │   │   ├── overlay.ts         # Overlay windows manager
│   │   │   └── camera.ts          # Hidden camera window
│   │   ├── services/
│   │   │   ├── scheduler.service.ts
│   │   │   ├── stimulation.service.ts
│   │   │   ├── notification.service.ts
│   │   │   └── store.service.ts   # electron-store wrapper
│   │   └── utils/
│   │       ├── screen.utils.ts    # Multi-monitor helpers
│   │       └── time.utils.ts      # Time window logic
│   │
│   ├── renderer/                  # Svelte UI
│   │   ├── settings/              # Settings window
│   │   │   ├── App.svelte
│   │   │   ├── main.ts
│   │   │   ├── pages/
│   │   │   │   ├── General.svelte
│   │   │   │   ├── Stimulation.svelte
│   │   │   │   ├── Schedule.svelte
│   │   │   │   ├── Camera.svelte
│   │   │   │   └── About.svelte
│   │   │   └── components/
│   │   │       ├── TestButton.svelte
│   │   │       ├── Toggle.svelte
│   │   │       ├── Slider.svelte
│   │   │       ├── TimePicker.svelte
│   │   │       ├── CameraPreview.svelte
│   │   │       └── EarMonitor.svelte
│   │   │
│   │   └── overlay/               # Overlay window
│   │       ├── App.svelte
│   │       ├── main.ts
│   │       └── effects/
│   │           ├── CornerMarkers.svelte
│   │           ├── BlurOverlay.svelte
│   │           ├── MovingObject.svelte
│   │           └── ColorShift.svelte
│   │
│   ├── worker/                    # Web Worker for MediaPipe
│   │   ├── blink-detector.worker.ts
│   │   └── ear-calculator.ts
│   │
│   ├── shared/                    # Shared types & constants
│   │   ├── types.ts
│   │   ├── constants.ts
│   │   ├── ipc-channels.ts
│   │   └── default-settings.ts
│   │
│   └── preload/
│       ├── settings.preload.ts
│       ├── overlay.preload.ts
│       └── camera.preload.ts
│
├── assets/
│   ├── icons/
│   │   ├── tray-icon.png
│   │   ├── tray-icon-paused.png
│   │   └── app-icon.ico
│   └── sounds/
│       ├── gentle-chime.mp3
│       ├── soft-ping.mp3
│       └── subtle-alert.mp3
│
└── tests/
    ├── unit/
    └── e2e/
```

---

## Agent Team Configuration

### Team Structure

```yaml
team:
  name: eye-care-app-team
  agents:
    - main-process-agent
    - renderer-agent
    - mediapipe-agent
    - integration-agent
    - playing devil's advocate
```

---

## Agent 1: Main Process Agent

**Role:** Electron main process, IPC, system integration, services

### Tasks

#### Task 1.1: Project Initialization
```
Initialize Electron + Svelte + TypeScript project:
- Use electron-vite or vite-plugin-electron
- Configure TypeScript for both main and renderer
- Setup Tailwind CSS with PostCSS
- Add electron-store for settings persistence
- Configure electron-builder for Windows

Dependencies to install:
- electron
- electron-builder
- electron-store
- @electron/remote (if needed)
- vite
- svelte
- typescript
- tailwindcss
- postcss
- autoprefixer
```

#### Task 1.2: Main Process Entry & Tray
```
Create src/main/index.ts:
- Initialize app with single instance lock
- Create system tray with icon
- Tray context menu:
  - "Open Settings" → opens settings window
  - "Pause (15 min / 30 min / 1 hour)" → DND mode
  - "Resume" → when paused
  - Separator
  - "Quit"
- Tray icon changes when paused (grayed out)
- Start hidden camera window on app ready
- Initialize SchedulerService
```

#### Task 1.3: Settings Window Manager
```
Create src/main/windows/settings.ts:
- BrowserWindow config:
  {
    width: 800,
    height: 600,
    resizable: false,
    frame: false,           // Custom title bar
    titleBarStyle: 'hidden',
    webPreferences: {
      preload: settings.preload.js,
      contextIsolation: true,
      nodeIntegration: false
    }
  }
- Load settings/index.html
- Show/hide from tray
- Save window position
```

#### Task 1.4: Overlay Windows Manager
```
Create src/main/windows/overlay.ts:

Function spawnOverlays():
- Get all displays via screen.getAllDisplays()
- For each display, create BrowserWindow:
  {
    x: display.bounds.x,
    y: display.bounds.y,
    width: display.bounds.width,
    height: display.bounds.height,
    transparent: true,
    frame: false,
    alwaysOnTop: true,
    focusable: false,
    skipTaskbar: true,
    hasShadow: false,
    type: 'toolbar',        // Windows: no taskbar entry
    webPreferences: {
      preload: overlay.preload.js
    }
  }
- After creation: overlay.setIgnoreMouseEvents(true)
- Load overlay/index.html
- Store references in Map<displayId, BrowserWindow>

Function closeOverlays():
- Close all overlay windows
- Clear map

Function triggerStimulation(method: StimulationMethod):
- Send IPC to all overlay windows with method & params
- Windows play animation
- Auto-close after animation completes

Handle display changes:
- screen.on('display-added') → recreate overlays
- screen.on('display-removed') → recreate overlays
```

#### Task 1.5: Hidden Camera Window
```
Create src/main/windows/camera.ts:
- BrowserWindow with show: false
- Loads camera processing page
- Receives video stream
- Runs MediaPipe via Worker
- Sends blink data to main via IPC
```

#### Task 1.6: Scheduler Service
```
Create src/main/services/scheduler.service.ts:

class SchedulerService {
  private mode: 'intensive' | 'normal' | 'relaxed'
  private intervalMs: number
  private timer: NodeJS.Timeout | null
  private isPaused: boolean
  private pauseUntil: Date | null
  
  // Intervals
  private readonly INTERVALS = {
    intensive: 10 * 60 * 1000,  // 10 min
    normal: 20 * 60 * 1000,     // 20 min
    relaxed: 30 * 60 * 1000     // 30 min
  }
  
  start()
  stop()
  pause(minutes: number)
  resume()
  setMode(mode)
  
  private tick():
    - Check if within active time window
    - If not paused and within window:
      - Trigger random enabled stimulation
    - Reschedule next tick
}
```

#### Task 1.7: Time Window Logic
```
Create src/main/utils/time.utils.ts:

function isWithinActiveWindow(settings): boolean
- Parse startTime and endTime from settings
- Get current time
- Handle overnight windows (e.g., 22:00 - 06:00)
- Return true if current time is within window

function getNextActiveWindowStart(settings): Date
- Calculate when next active window begins
```

#### Task 1.8: IPC Handlers
```
Create src/main/ipc-handlers.ts:

// Settings
ipcMain.handle('settings:get', () => store.store)
ipcMain.handle('settings:set', (_, key, value) => store.set(key, value))
ipcMain.handle('settings:reset', () => store.clear())

// Camera
ipcMain.handle('camera:list', async () => {
  // Return list of available cameras
})
ipcMain.handle('camera:select', (_, deviceId) => {
  // Switch camera
})

// Blink Detection
ipcMain.on('blink:data', (_, data: BlinkData) => {
  // data: { ear: number, bpm: number, isBlinking: boolean }
  // Forward to settings window for live display
  // Check for LOW_BLINK_RATE
})

// Stimulation
ipcMain.handle('stimulation:test', (_, method) => {
  // Trigger specific stimulation for testing
})
ipcMain.handle('stimulation:trigger', () => {
  // Trigger random enabled stimulation
})

// Overlay
ipcMain.handle('overlay:test', () => {
  // Spawn overlays briefly for testing
})

// Audio
ipcMain.handle('audio:test', (_, soundId) => {
  // Play notification sound
})

// DND
ipcMain.handle('dnd:pause', (_, minutes) => scheduler.pause(minutes))
ipcMain.handle('dnd:resume', () => scheduler.resume())
ipcMain.handle('dnd:status', () => scheduler.isPaused)
```

#### Task 1.9: Notification Service
```
Create src/main/services/notification.service.ts:

class NotificationService {
  private soundEnabled: boolean
  private soundVolume: number
  private currentSound: string
  
  playSound(soundId: string)
  setVolume(volume: number)
  enableSound(enabled: boolean)
  
  // Use Electron's native audio or node-wav-player
}
```

#### Task 1.10: Store Service
```
Create src/main/services/store.service.ts:

Using electron-store with schema:
{
  // General
  launchOnStartup: boolean (default: true)
  
  // Schedule
  mode: 'intensive' | 'normal' | 'relaxed' (default: 'normal')
  activeTimeStart: string (default: '09:00')
  activeTimeEnd: string (default: '18:00')
  activeOnWeekends: boolean (default: false)
  
  // Stimulation
  enabledMethods: string[] (default: ['corners', 'blur', 'moving', 'color'])
  intensity: 'low' | 'medium' | 'high' (default: 'medium')
  
  // Camera
  selectedCamera: string | null
  earThreshold: number (default: 0.25)
  lowBlinkRateThreshold: number (default: 8)
  
  // Audio
  soundEnabled: boolean (default: true)
  soundVolume: number (default: 0.5)
  selectedSound: string (default: 'gentle-chime')
}
```

---

## Agent 2: Renderer Agent

**Role:** Svelte UI components, settings pages, styling

### Tasks

#### Task 2.1: Tailwind Configuration
```
Create tailwind.config.js with custom theme:
- Dark mode support (class-based)
- Custom colors for eye-care theme:
  - primary: soft teal/cyan (#06B6D4)
  - surface: dark grays
  - accent: gentle green for success states
- Custom spacing for consistent UI
- Animation utilities for smooth transitions
```

#### Task 2.2: Settings App Shell
```
Create src/renderer/settings/App.svelte:
- Custom frameless title bar with:
  - App icon
  - Title: "EyeCare Settings"
  - Minimize, Close buttons
  - Draggable region
- Sidebar navigation:
  - General (home icon)
  - Stimulation (eye icon)
  - Schedule (clock icon)
  - Camera (camera icon)
  - About (info icon)
- Main content area (router)
- Use svelte-spa-router or custom routing
```

#### Task 2.3: General Settings Page
```
Create src/renderer/settings/pages/General.svelte:

Sections:
1. "Startup"
   - Toggle: Launch on system startup
   
2. "Schedule Mode"
   - Radio buttons: Intensive / Normal / Relaxed
   - Description for each mode
   
3. "Do Not Disturb"
   - Current status indicator
   - Quick pause buttons: 15 min / 30 min / 1 hour
   - Resume button (when paused)

4. "Reset"
   - Button: Reset all settings to defaults
   - Confirmation modal
```

#### Task 2.4: Stimulation Settings Page
```
Create src/renderer/settings/pages/Stimulation.svelte:

Sections:
1. "Active Methods"
   For each method, create a card with:
   - Checkbox to enable/disable
   - Method name & icon
   - Brief description
   - "Test" button (TestButton component)
   
   Methods:
   - Corner Focus (corners icon)
     "Markers appear in screen corners to trigger eye movement"
   - Brief Blur (blur icon)
     "Short screen blur to trigger refocus reflex"
   - Moving Object (motion icon)
     "Floating object across screen for smooth pursuit"
   - Color Shift (palette icon)
     "Brief warm/cool tint for pupil adaptation"

2. "Intensity"
   - Slider: Low — Medium — High
   - Live preview description:
     - Low: "Subtle, barely noticeable"
     - Medium: "Balanced visibility"
     - High: "More prominent effects"

3. "Test All"
   - Button to cycle through all enabled methods
```

#### Task 2.5: Schedule Settings Page
```
Create src/renderer/settings/pages/Schedule.svelte:

Sections:
1. "Active Hours"
   - Time picker: Start time
   - Time picker: End time
   - Quick presets: "Work day (9-18)" / "Extended (8-20)" / "All day"
   
2. "Weekend Settings"
   - Toggle: Active on weekends
   - Separate time pickers for weekends (if enabled)

3. "Current Status"
   - Visual indicator: "Active" / "Outside active hours"
   - Next activation time (if outside hours)
```

#### Task 2.6: Camera Settings Page
```
Create src/renderer/settings/pages/Camera.svelte:

Sections:
1. "Camera Selection"
   - Dropdown with available cameras
   - Refresh button
   - "Test Camera" button

2. "Live Preview" (when testing)
   - CameraPreview component
   - Shows camera feed
   - Face detection overlay (optional)

3. "Blink Detection"
   - EarMonitor component (live EAR values)
   - Current BPM display
   - Blink indicator (flashes on blink)

4. "Calibration"
   - Slider: EAR Threshold (0.15 - 0.35)
   - Slider: Low blink rate threshold (4 - 12 BPM)
   - "Calibrate" button (measures user's baseline)

5. "Test Blink Detection"
   - Button: Start 30-second test
   - Shows blink count and accuracy
```

#### Task 2.7: About Page
```
Create src/renderer/settings/pages/About.svelte:

- App logo and name
- Version number
- Brief description
- Links:
  - GitHub repository
  - Report issue
  - Documentation
- Credits / License info
```

#### Task 2.8: Reusable Components
```
Create components in src/renderer/settings/components/:

TestButton.svelte:
- Props: label, onClick, loading
- Styled button with loading spinner
- Click triggers test, shows feedback

Toggle.svelte:
- Props: checked, onChange, label, description
- Styled toggle switch
- Optional description text

Slider.svelte:
- Props: value, min, max, step, label, valueLabels
- Styled range slider
- Shows current value/label

TimePicker.svelte:
- Props: value, onChange
- Hour:Minute picker
- 24-hour or 12-hour format

CameraPreview.svelte:
- Props: deviceId, showOverlay
- Video element with camera feed
- Optional face mesh overlay

EarMonitor.svelte:
- Props: earLeft, earRight, bpm, isBlinking
- Real-time EAR graph (last 5 seconds)
- BPM counter
- Blink flash indicator
```

#### Task 2.9: Overlay App
```
Create src/renderer/overlay/App.svelte:

- Full screen transparent container
- Listens for IPC 'stimulation:play' events
- Dynamically loads requested effect component
- Auto-hides after animation completes
- Sends 'stimulation:complete' when done
```

#### Task 2.10: Overlay Effects
```
Create effects in src/renderer/overlay/effects/:

CornerMarkers.svelte:
- Props: intensity, duration
- 4 corner markers (circles/dots)
- Sequence: top-left → top-right → bottom-right → bottom-left
- Each marker: fade in → hold → fade out
- Intensity affects: size, opacity
- Total duration: ~4-6 seconds

BlurOverlay.svelte:
- Props: intensity, duration
- Full-screen semi-transparent overlay
- Fade in → hold → fade out
- Intensity affects: opacity (0.1 - 0.4)
- Duration: 200-400ms

MovingObject.svelte:
- Props: intensity, trajectory
- Floating circle/dot
- Trajectories: 'horizontal' | 'vertical' | 'diagonal-down' | 'diagonal-up'
- Smooth CSS animation with transform
- Intensity affects: size, opacity, speed
- Duration: ~3-5 seconds

ColorShift.svelte:
- Props: intensity, temperature
- Full-screen color overlay
- Alternates warm (orange tint) ↔ cool (blue tint)
- Intensity affects: opacity
- Duration: ~500ms per shift, 2-3 cycles
```

---

## Agent 3: MediaPipe Agent

**Role:** Blink detection, EAR calculation, performance optimization

### Tasks

#### Task 3.1: Web Worker Setup
```
Create src/worker/blink-detector.worker.ts:

- Import @mediapipe/face_mesh
- Initialize FaceMesh with:
  {
    maxNumFaces: 1,
    refineLandmarks: true,  // Important for eye landmarks
    minDetectionConfidence: 0.5,
    minTrackingConfidence: 0.5
  }
- Process frames from OffscreenCanvas
- Calculate EAR for both eyes
- Detect blinks using EAR threshold
- Maintain BPM sliding window (60 seconds)
- Post messages to main thread:
  {
    type: 'blink-data',
    data: {
      earLeft: number,
      earRight: number,
      earAverage: number,
      isBlinking: boolean,
      blinkCount: number,
      bpm: number,
      faceDetected: boolean
    }
  }
```

#### Task 3.2: EAR Calculator
```
Create src/worker/ear-calculator.ts:

Eye Aspect Ratio (EAR) formula:
EAR = (|p2-p6| + |p3-p5|) / (2 * |p1-p4|)

Where p1-p6 are eye landmark points:
- p1, p4: horizontal (outer, inner corners)
- p2, p6: upper vertical
- p3, p5: lower vertical

MediaPipe Face Mesh eye landmarks:
Left eye:  [33, 160, 158, 133, 153, 144]
Right eye: [362, 385, 387, 263, 373, 380]

function calculateEAR(landmarks: NormalizedLandmark[], eyeIndices: number[]): number

function euclideanDistance(p1, p2): number
```

#### Task 3.3: Blink Detection Algorithm
```
In blink-detector.worker.ts:

class BlinkDetector {
  private earThreshold: number = 0.25
  private consecutiveFrames: number = 2
  private frameCounter: number = 0
  private blinkTimestamps: number[] = []  // Last 60 seconds
  
  processFrame(landmarks):
    ear = calculateEAR(landmarks)
    
    if ear < threshold:
      frameCounter++
    else:
      if frameCounter >= consecutiveFrames:
        // Blink detected
        recordBlink()
      frameCounter = 0
    
    return { ear, isBlinking: frameCounter >= consecutiveFrames }
  
  recordBlink():
    blinkTimestamps.push(Date.now())
    // Remove timestamps older than 60 seconds
    cleanOldTimestamps()
  
  getBPM(): number
    return blinkTimestamps.length  // Count in last 60 seconds
}
```

#### Task 3.4: Camera Bridge
```
Create src/renderer/camera/camera-bridge.ts:

class CameraBridge {
  private stream: MediaStream | null
  private video: HTMLVideoElement
  private canvas: OffscreenCanvas
  private worker: Worker
  private animationFrame: number
  
  async initialize(deviceId?: string):
    - Request camera access
    - Create video element
    - Create OffscreenCanvas
    - Initialize worker
    - Start frame loop
  
  private processFrame():
    - Draw video frame to canvas
    - Transfer ImageBitmap to worker
    - Request next animation frame
  
  async switchCamera(deviceId: string)
  
  setThreshold(value: number):
    - Post message to worker to update threshold
  
  stop():
    - Stop stream
    - Terminate worker
    - Cancel animation frame
  
  onData(callback: (data: BlinkData) => void)
}
```

#### Task 3.5: Low Blink Rate Detection
```
Add to blink-detector.worker.ts:

private lowBlinkThreshold: number = 8  // BPM
private lowBlinkCooldown: number = 60000  // 1 minute
private lastLowBlinkAlert: number = 0

checkLowBlinkRate():
  if bpm < lowBlinkThreshold:
    if Date.now() - lastLowBlinkAlert > lowBlinkCooldown:
      postMessage({ type: 'low-blink-rate', bpm })
      lastLowBlinkAlert = Date.now()
```

---

## Agent 4: Integration Agent

**Role:** Testing, build configuration, final integration

### Tasks

#### Task 4.1: Preload Scripts
```
Create preload scripts with contextBridge:

src/preload/settings.preload.ts:
contextBridge.exposeInMainWorld('api', {
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    set: (key, value) => ipcRenderer.invoke('settings:set', key, value),
    reset: () => ipcRenderer.invoke('settings:reset'),
    onUpdate: (callback) => ipcRenderer.on('settings:updated', callback)
  },
  camera: {
    list: () => ipcRenderer.invoke('camera:list'),
    select: (id) => ipcRenderer.invoke('camera:select', id),
    onBlinkData: (callback) => ipcRenderer.on('blink:data', (_, data) => callback(data))
  },
  stimulation: {
    test: (method) => ipcRenderer.invoke('stimulation:test', method),
    testAll: () => ipcRenderer.invoke('stimulation:testAll')
  },
  overlay: {
    test: () => ipcRenderer.invoke('overlay:test')
  },
  audio: {
    test: (soundId) => ipcRenderer.invoke('audio:test', soundId),
    setVolume: (vol) => ipcRenderer.invoke('audio:setVolume', vol)
  },
  dnd: {
    pause: (minutes) => ipcRenderer.invoke('dnd:pause', minutes),
    resume: () => ipcRenderer.invoke('dnd:resume'),
    onStatusChange: (callback) => ipcRenderer.on('dnd:status', callback)
  },
  window: {
    minimize: () => ipcRenderer.invoke('window:minimize'),
    close: () => ipcRenderer.invoke('window:close')
  }
})

src/preload/overlay.preload.ts:
contextBridge.exposeInMainWorld('overlay', {
  onTrigger: (callback) => ipcRenderer.on('stimulation:play', (_, data) => callback(data)),
  complete: () => ipcRenderer.send('stimulation:complete')
})
```

#### Task 4.2: TypeScript Types
```
Create src/shared/types.ts:

interface BlinkData {
  earLeft: number
  earRight: number
  earAverage: number
  isBlinking: boolean
  blinkCount: number
  bpm: number
  faceDetected: boolean
}

type StimulationMethod = 'corners' | 'blur' | 'moving' | 'color'

type Intensity = 'low' | 'medium' | 'high'

type ScheduleMode = 'intensive' | 'normal' | 'relaxed'

interface AppSettings {
  launchOnStartup: boolean
  mode: ScheduleMode
  activeTimeStart: string
  activeTimeEnd: string
  activeOnWeekends: boolean
  enabledMethods: StimulationMethod[]
  intensity: Intensity
  selectedCamera: string | null
  earThreshold: number
  lowBlinkRateThreshold: number
  soundEnabled: boolean
  soundVolume: number
  selectedSound: string
}

interface StimulationParams {
  method: StimulationMethod
  intensity: Intensity
  trajectory?: string  // For moving object
  duration?: number
}
```

#### Task 4.3: IPC Channels Constants
```
Create src/shared/ipc-channels.ts:

export const IPC = {
  SETTINGS: {
    GET: 'settings:get',
    SET: 'settings:set',
    RESET: 'settings:reset',
    UPDATED: 'settings:updated'
  },
  CAMERA: {
    LIST: 'camera:list',
    SELECT: 'camera:select'
  },
  BLINK: {
    DATA: 'blink:data',
    LOW_RATE: 'blink:low-rate'
  },
  STIMULATION: {
    TEST: 'stimulation:test',
    TEST_ALL: 'stimulation:testAll',
    PLAY: 'stimulation:play',
    COMPLETE: 'stimulation:complete'
  },
  OVERLAY: {
    TEST: 'overlay:test'
  },
  AUDIO: {
    TEST: 'audio:test',
    SET_VOLUME: 'audio:setVolume'
  },
  DND: {
    PAUSE: 'dnd:pause',
    RESUME: 'dnd:resume',
    STATUS: 'dnd:status'
  },
  WINDOW: {
    MINIMIZE: 'window:minimize',
    CLOSE: 'window:close'
  }
} as const
```

#### Task 4.4: Default Settings
```
Create src/shared/default-settings.ts:

export const DEFAULT_SETTINGS: AppSettings = {
  launchOnStartup: true,
  mode: 'normal',
  activeTimeStart: '09:00',
  activeTimeEnd: '18:00',
  activeOnWeekends: false,
  enabledMethods: ['corners', 'blur', 'moving', 'color'],
  intensity: 'medium',
  selectedCamera: null,
  earThreshold: 0.25,
  lowBlinkRateThreshold: 8,
  soundEnabled: true,
  soundVolume: 0.5,
  selectedSound: 'gentle-chime'
}

export const INTENSITY_PARAMS = {
  low: {
    corners: { size: 20, opacity: 0.3, duration: 800 },
    blur: { opacity: 0.15, duration: 200 },
    moving: { size: 15, opacity: 0.25, speed: 4000 },
    color: { opacity: 0.05, duration: 300 }
  },
  medium: {
    corners: { size: 30, opacity: 0.5, duration: 600 },
    blur: { opacity: 0.25, duration: 300 },
    moving: { size: 25, opacity: 0.4, speed: 3000 },
    color: { opacity: 0.1, duration: 400 }
  },
  high: {
    corners: { size: 40, opacity: 0.7, duration: 500 },
    blur: { opacity: 0.35, duration: 400 },
    moving: { size: 35, opacity: 0.55, speed: 2500 },
    color: { opacity: 0.15, duration: 500 }
  }
}
```

#### Task 4.5: Electron Builder Config
```
Create electron-builder.json:

{
  "appId": "com.eyecare.app",
  "productName": "EyeCare",
  "directories": {
    "output": "dist"
  },
  "files": [
    "build/**/*",
    "node_modules/**/*"
  ],
  "win": {
    "target": ["nsis"],
    "icon": "assets/icons/app-icon.ico",
    "requestedExecutionLevel": "asInvoker"
  },
  "nsis": {
    "oneClick": false,
    "allowToChangeInstallationDirectory": true,
    "createDesktopShortcut": true,
    "createStartMenuShortcut": true
  },
  "mac": {
    "target": ["dmg"],
    "icon": "assets/icons/app-icon.icns",
    "category": "public.app-category.healthcare-fitness"
  }
}
```

#### Task 4.6: Package.json Scripts
```
Add to package.json:

{
  "scripts": {
    "dev": "vite",
    "build": "vite build && electron-builder",
    "build:win": "vite build && electron-builder --win",
    "build:mac": "vite build && electron-builder --mac",
    "electron:dev": "electron .",
    "lint": "eslint src --ext .ts,.svelte",
    "typecheck": "tsc --noEmit"
  }
}
```

#### Task 4.7: Test Scenarios
```
Create manual test checklist:

□ Camera Detection
  □ List available cameras
  □ Switch between cameras
  □ Face detection works
  □ EAR values displayed correctly
  □ Blink detection accurate

□ Stimulation Methods
  □ Test button works for each method
  □ Corner markers animate correctly
  □ Blur overlay appears/disappears smoothly
  □ Moving object smooth animation
  □ Color shift visible but not harsh

□ Multi-monitor
  □ Overlay spawns on all monitors
  □ Correct positioning on each
  □ Effects visible on all monitors

□ Schedule
  □ Mode switching works
  □ Time windows respected
  □ DND mode pauses correctly
  □ Auto-resume after DND timer

□ Audio
  □ Sound plays on notification
  □ Volume slider works
  □ Sound can be disabled

□ Settings Persistence
  □ Settings saved on change
  □ Settings restored on restart
  □ Reset to defaults works

□ System Integration
  □ System tray appears
  □ Tray menu works
  □ Launch on startup works
  □ App quits cleanly
```

---

## Implementation Order

### Phase 1: Foundation (Week 1)
1. Project initialization (Agent 1: Task 1.1)
2. Main process entry & tray (Agent 1: Task 1.2)
3. Settings window shell (Agent 1: Task 1.3, Agent 2: Task 2.2)
4. Store service (Agent 1: Task 1.10)
5. Types & constants (Agent 4: Tasks 4.2-4.4)

### Phase 2: Core Features (Week 2)
1. MediaPipe setup (Agent 3: Tasks 3.1-3.3)
2. Camera bridge (Agent 3: Task 3.4)
3. Camera settings page (Agent 2: Task 2.6)
4. IPC handlers (Agent 1: Task 1.8)
5. Preload scripts (Agent 4: Task 4.1)

### Phase 3: Stimulation (Week 3)
1. Overlay windows manager (Agent 1: Task 1.4)
2. Overlay effects (Agent 2: Task 2.10)
3. Stimulation settings page (Agent 2: Task 2.4)
4. Scheduler service (Agent 1: Task 1.6)
5. Test buttons integration

### Phase 4: Polish (Week 4)
1. Schedule settings (Agent 2: Task 2.5)
2. General settings (Agent 2: Task 2.3)
3. Notification service (Agent 1: Task 1.9)
4. Time window logic (Agent 1: Task 1.7)
5. Build configuration (Agent 4: Tasks 4.5-4.6)
6. Testing (Agent 4: Task 4.7)

---

## Notes for Agents

### Performance Considerations
- MediaPipe should run at 15-20 FPS max (sufficient for blink detection)
- Use requestAnimationFrame for smooth animations
- Overlay windows should be lightweight (minimal DOM)
- Prefer CSS transforms over layout properties

### Windows-Specific
- Use `type: 'toolbar'` for overlay to avoid taskbar entries
- Test with Windows Defender (may flag unsigned app)
- Handle HiDPI scaling correctly (use display.scaleFactor)

### Common Pitfalls
- `ignoreMouseEvents(true)` must be called AFTER window is ready
- MediaPipe WASM files need to be in public/accessible folder
- Electron screen API returns absolute coordinates for multi-monitor
- Web Worker cannot access DOM directly

### Deferred to v2
- DDC/CI hardware brightness control
- macOS optimization
- Ollama integration
- Screenshot-based real blur effect
