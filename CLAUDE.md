# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**EyeSafer Desktop App** — prevents eye strain through blink monitoring and visual micro-stimulation.

- **Platform:** Windows (primary), macOS (secondary)
- **Stack:** Electron 28 + Svelte 4 + Tailwind CSS 3 + TypeScript + MediaPipe
- **Status:** Implemented and running. See `eye-care-app-implementation.md` for the full specification.

## Commands

```bash
npm run dev              # Start electron-vite dev server + launch Electron
npm run build            # Vite build + electron-builder (all platforms)
npm run build:win        # Windows build (NSIS installer)
npm run build:mac        # macOS build (DMG)
npm run lint             # ESLint on src/ (.ts and .svelte files)
npm run typecheck        # TypeScript type check (no emit)
npm run test             # Vitest unit tests
npm run dev:log          # Dev with output piped to logs/dev.log
```

## Architecture

### Process Structure

The app has three Electron processes with distinct roles:

**Main process** (`src/main/`): Orchestrates everything. Key files:
- `index.ts` — app lifecycle, single-instance lock, tray setup
- `logger.ts` — electron-log configuration; log file at `%APPDATA%/eyesafer/logs/main.log`
- `windows/overlay.ts` — spawns one transparent `BrowserWindow` per monitor; sets `ignoreMouseEvents(true)` after creation; recreates on display add/remove
- `windows/camera.ts` — hidden `BrowserWindow` (`show: false`) that runs MediaPipe; in dev mode opens detached DevTools automatically
- `windows/settings.ts` — frameless settings window (`frame: false`, custom title bar with minimize/maximize/close)
- `services/scheduler.service.ts` — interval-based trigger (10/20/30 min for intensive/normal/relaxed modes); respects active time windows and DND state
- `ipc-handlers.ts` — all `ipcMain.handle` registrations

**Renderer** (`src/renderer/`): Three separate entry points:
- `settings/` — multi-page settings UI with sidebar navigation
- `overlay/` — full-screen transparent container that plays stimulation effects on IPC trigger
- `camera/` — hidden window that runs MediaPipe blink detection directly in its main thread

### MediaPipe / Blink Detection

MediaPipe runs **directly in the camera renderer's main thread** (NOT in a Web Worker). Vite's module worker bundling is incompatible with `@mediapipe/tasks-vision`'s internal WASM loading — the package calls `self.import` which doesn't exist in module workers.

Key files:
- `src/renderer/camera/camera-bridge.ts` — initializes `FaceLandmarker` (CPU delegate), captures frames at 20 FPS via `requestAnimationFrame`, runs blink detection inline
- `src/worker/ear-calculator.ts` — EAR calculation (imported directly, not run in a worker)
- `src/shared/constants.ts` — thresholds and indices

EAR formula: `(|p2-p6| + |p3-p5|) / (2 * |p1-p4|)` using MediaPipe Face Mesh landmarks:
- Left eye: `[33, 160, 158, 133, 153, 144]`
- Right eye: `[362, 385, 387, 263, 373, 380]`

Blink detection defaults: `earThreshold=0.25`, `consecutiveFrames=1`, `lowBlinkThreshold=12`. Settings are loaded from the store on startup and updated live via `settings:changed` IPC.

`BlinkData` contains: `bpm` (60-second sliding window), `blinkCount` (cumulative total), `ear`, `leftEar`, `rightEar`, `timestamp`, `isLowBlink`.

### MediaPipe WASM Setup

WASM files must be in `public/mediapipe/` (served at `/mediapipe/` by Vite). Required files:
- `vision_wasm_internal.js` + `.wasm` — copied from `node_modules/@mediapipe/tasks-vision/wasm/`
- `vision_wasm_nosimd_internal.js` + `.wasm` — same source
- `face_landmarker.task` — downloaded from Google storage (~3.6 MB)

The renderer `publicDir` must be explicitly set in `electron.vite.config.ts`:
```ts
renderer: { publicDir: resolve(__dirname, 'public'), ... }
```
Without this, electron-vite sets the renderer root to `src/renderer/` and the `public/` folder at the project root is NOT served (404).

Camera window CSP requires `'wasm-unsafe-eval'` in `script-src` for WASM compilation.

GPU delegate fails silently in hidden Electron windows on Windows — always use `delegate: 'CPU'`.

### IPC Flow

All IPC channel names are defined as constants in `src/shared/ipc-channels.ts`. The pattern is `domain:action` (e.g., `settings:get`, `blink:data`).

Preload scripts (`src/preload/`) expose typed globals via `contextBridge`. Context isolation is `true`, `nodeIntegration` is `false`.

Window IPC: `window:minimize`, `window:maximize` (toggle), `window:maximized` (event → renderer), `window:close`.

### Stimulation Methods

Four overlay effects in `src/renderer/overlay/effects/`:
- `CornerMarkers.svelte` — sequential corner dots (~4-6s)
- `BlurOverlay.svelte` — semi-transparent full-screen overlay (200-400ms)
- `MovingObject.svelte` — floating dot with CSS transform animation (~3-5s)
- `ColorShift.svelte` — warm/cool tint cycles (~2-3 cycles)

Effect intensity parameters come from `src/shared/default-settings.ts` `INTENSITY_PARAMS`. Test buttons exist on both the Stimulation page and the Camera page (Stimulation Preview section).

### Settings Persistence

`electron-store` wrapper at `src/main/services/store.service.ts`. Schema and defaults in `src/shared/default-settings.ts`. All types in `src/shared/types.ts`.

### Multi-Monitor

`screen.getAllDisplays()` returns absolute coordinates. Each overlay window is positioned at `display.bounds.{x,y}` with matching width/height. Overlay `type: 'toolbar'` prevents taskbar entries on Windows.

## Build Configuration

### TypeScript

Three tsconfigs:
- `tsconfig.json` — solution file (references only); has `compilerOptions: { verbatimModuleSyntax: true }` so vite-plugin-svelte can find it
- `tsconfig.node.json` — main process + preload + shared
- `tsconfig.web.json` — renderer + worker + shared; has `verbatimModuleSyntax: true` (required by svelte-preprocess v6)

### Svelte + TypeScript

- `svelte.config.js` uses `svelte-preprocess` with `typescript: { tsconfigFile: './tsconfig.web.json' }` — must point explicitly; otherwise svelte-preprocess finds the root tsconfig which has no compilerOptions
- `electron.vite.config.ts` uses bare `svelte()` with **no** inline `preprocess:` — adding it conflicts with svelte.config.js
- `verbatimModuleSyntax: true` required in `tsconfig.web.json` — without it svelte-preprocess v6 elides Svelte component imports → "Component is not defined" errors

### Preload File Names

electron-vite names preload output files after the **entry key**, not the source filename. Keys `settings`, `overlay`, `camera` → output files:
- `out/preload/settings.mjs`
- `out/preload/overlay.mjs`
- `out/preload/camera.mjs`

Using `settings.preload.js` (the source filename) silently fails — preload won't load, `window.api` is undefined, IPC calls throw silently.

### Tailwind

Custom color palette in `tailwind.config.js`: `surface` (600–950) and `primary` (400–700).

## Common Pitfalls

- **TypeScript `as` casts in Svelte templates**: The Svelte compiler parses `{}` expressions before TypeScript preprocessing. Never write `(e.target as HTMLSelectElement)` inline — move the cast into a `<script lang="ts">` handler or typed variable.
- **Arrays with typed elements in templates**: Define them in `<script>` block, not inline in `{#each}`.
- **MediaPipe in Web Workers**: Don't. Vite module worker bundling breaks `@mediapipe/tasks-vision`. Run it in the renderer's main thread.
- **GPU delegate on Windows Electron**: Always use `delegate: 'CPU'` — GPU fails silently in hidden windows.
- **npm registry**: If `npm install` fails with `ECONNRESET`, use `--registry https://registry.npmmirror.com`.

## Known Harmless Errors

```
[ERROR:cache_util_win.cc] Unable to move the cache: Access is denied. (0x5)
[ERROR:gpu_disk_cache.cc] Gpu Cache Creation failed: -2
```
Chromium GPU cache errors on Windows — not actionable.

## Windows-Specific Notes

- `ignoreMouseEvents(true)` must be called after the window is ready
- `electron-builder` targets NSIS installer with `requestedExecutionLevel: asInvoker`
- App may trigger Windows Defender warnings when unsigned
