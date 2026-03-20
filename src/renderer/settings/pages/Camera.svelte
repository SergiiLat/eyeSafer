<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import CameraPreview from '../components/CameraPreview.svelte'
  import EarMonitor from '../components/EarMonitor.svelte'
  import Slider from '../components/Slider.svelte'
  import type { AppSettings, CameraDevice, BlinkData, StimulationMethod } from '../../../shared/types'

  export let settings: AppSettings
  export let onUpdate: (patch: Partial<AppSettings>) => void

  // All stimulation methods grouped for display
  const stimulationMethods: { id: StimulationMethod; label: string; desc: string; emoji: string }[] = [
    { id: 'cornerMarkers',     label: 'Corner Markers',      desc: 'Dots light up sequentially in each corner',        emoji: '⬛' },
    { id: 'blurOverlay',       label: 'Blur Overlay',        desc: 'Brief semi-transparent overlay flashes',           emoji: '🌫️' },
    { id: 'movingObject',      label: 'Moving Object',       desc: 'Glowing dot floats across the screen',             emoji: '🔵' },
    { id: 'colorShift',        label: 'Color Shift',         desc: 'Warm/cool tint cycles across the display',         emoji: '🎨' },
    { id: 'figureEight',       label: 'Figure Eight',        desc: 'Eye tracks a dot in a Lissajous figure-8 path',    emoji: '∞' },
    { id: 'nearFarFocus',      label: 'Near/Far Focus',      desc: 'Central dot pulses large/small to shift focus',    emoji: '🔍' },
    { id: 'peripheralTriggers',label: 'Peripheral Triggers', desc: 'Dots fire around screen edge in sequence',         emoji: '👁️' },
    { id: 'guidedBlink',       label: 'Guided Blink',        desc: 'Prompts deliberate blinks at a set rhythm',        emoji: '😌' },
    { id: 'saccadeTraining',   label: 'Saccade Training',    desc: 'Alternating left/right flashes for eye movement',  emoji: '↔️' },
    { id: 'cornerFocus',       label: 'Corner Focus',        desc: 'Animated focus target hops between corners',       emoji: '🎯' },
    { id: 'pseudoBlur',        label: 'Pseudo Blur',         desc: 'Frosted-glass blur pulses to relax focal depth',   emoji: '💫' },
    { id: 'brightnessShift',   label: 'Brightness Shift',    desc: 'Brief brightness/contrast micro-flash',            emoji: '☀️' },
    { id: 'peripheralDrift',   label: 'Peripheral Drift',    desc: 'Glowing orb drifts slowly around screen edge',    emoji: '🌙' },
  ]

  let cameras: CameraDevice[] = []
  let blinkData: BlinkData | null = null

  // Blink test state
  let testBlinkCount = 0
  let isTesting = false
  let testTimer: ReturnType<typeof setInterval> | null = null
  let testSecondsLeft = 30
  let unsubscribeBlinkData: (() => void) | null = null

  // Stimulation 30s-test state
  let activeTestMethod: StimulationMethod | null = null
  let stimTestSecondsLeft = 0
  let stimTestTimer: ReturnType<typeof setInterval> | null = null

  onMount(async () => {
    cameras = await window.api.listCameras()
    unsubscribeBlinkData = window.api.onBlinkData((data) => {
      blinkData = data
      if (isTesting) testBlinkCount = data.blinkCount
    })
  })

  onDestroy(() => {
    unsubscribeBlinkData?.()
    if (testTimer) clearInterval(testTimer)
    stopStimTest()
  })

  async function selectCamera(deviceId: string) {
    await window.api.selectCamera(deviceId)
    onUpdate({ selectedCameraId: deviceId })
  }

  function handleCameraChange(e: Event) {
    selectCamera((e.target as HTMLSelectElement).value)
  }

  function startBlinkTest() {
    testBlinkCount = 0
    testSecondsLeft = 30
    isTesting = true
    const startBlink = blinkData?.blinkCount ?? 0
    testTimer = setInterval(() => {
      testSecondsLeft--
      if (blinkData) testBlinkCount = blinkData.blinkCount - startBlink
      if (testSecondsLeft <= 0) {
        clearInterval(testTimer!)
        testTimer = null
        isTesting = false
      }
    }, 1000)
  }

  async function startStimTest(method: StimulationMethod) {
    stopStimTest()
    activeTestMethod = method
    stimTestSecondsLeft = 30
    await window.api.testStimulationLoop(method, 30)
    stimTestTimer = setInterval(() => {
      stimTestSecondsLeft--
      if (stimTestSecondsLeft <= 0) stopStimTest()
    }, 1000)
  }

  function stopStimTest() {
    if (stimTestTimer) { clearInterval(stimTestTimer); stimTestTimer = null }
    if (activeTestMethod) {
      window.api.stopStimulationLoop()
      activeTestMethod = null
    }
    stimTestSecondsLeft = 0
  }
</script>

<div class="space-y-6">
  <div>
    <h2 class="text-lg font-semibold text-white mb-1">Camera</h2>
    <p class="text-sm text-surface-200">Configure blink detection and monitoring</p>
  </div>

  <!-- Two-column layout -->
  <div class="flex flex-col lg:flex-row gap-6">

    <!-- Left: camera source + preview -->
    <div class="w-full lg:w-[400px] lg:flex-shrink-0 space-y-4">

      <section class="space-y-3">
        <h3 class="text-sm font-medium text-surface-200 uppercase tracking-wider">Camera Source</h3>
        {#if cameras.length === 0}
          <p class="text-sm text-surface-200">No cameras detected</p>
        {:else}
          <select
            value={settings.selectedCameraId ?? ''}
            on:change={handleCameraChange}
            class="bg-surface-800 border border-surface-700 text-white text-sm rounded-lg
                   focus:ring-primary-500 focus:border-primary-500 block w-full p-2.5"
          >
            <option value="">Default camera</option>
            {#each cameras as cam}
              <option value={cam.deviceId}>{cam.label || `Camera ${cam.deviceId.slice(0, 8)}`}</option>
            {/each}
          </select>
        {/if}
      </section>

      <section class="space-y-3">
        <h3 class="text-sm font-medium text-surface-200 uppercase tracking-wider">Preview</h3>
        <CameraPreview {blinkData} />
      </section>

      {#if blinkData?.calibrated !== undefined}
        <div class="p-3 bg-surface-800 rounded-lg border border-surface-700 text-sm">
          {#if blinkData.calibrated}
            <span class="text-green-400 font-medium">Calibrated</span>
            <span class="text-surface-300 ml-2">Threshold: {blinkData.personalThreshold?.toFixed(3) ?? '—'}</span>
          {:else}
            <span class="text-yellow-400 font-medium">Calibrating…</span>
            <span class="text-surface-300 ml-2">{blinkData.calibrationProgress ?? 0}%</span>
            <div class="mt-2 h-1.5 bg-surface-700 rounded-full overflow-hidden">
              <div
                class="h-full bg-yellow-400 rounded-full transition-all duration-500"
                style="width: {blinkData.calibrationProgress ?? 0}%"
              ></div>
            </div>
          {/if}
        </div>
      {/if}
    </div>

    <!-- Right: controls -->
    <div class="flex-1 min-w-0 space-y-6">

      <section class="space-y-3">
        <h3 class="text-sm font-medium text-surface-200 uppercase tracking-wider">Blink Monitor</h3>
        <div class="p-4 bg-surface-800 rounded-xl border border-surface-700">
          <EarMonitor {blinkData} />
        </div>
      </section>

      <section class="space-y-4">
        <h3 class="text-sm font-medium text-surface-200 uppercase tracking-wider">Calibration</h3>
        <Slider
          value={settings.earThreshold}
          min={0.1} max={0.5} step={0.01}
          label="EAR Threshold (blink sensitivity)"
          onChange={(v) => onUpdate({ earThreshold: v })}
        />
        <Slider
          value={settings.consecutiveFrames}
          min={1} max={5} step={1}
          label="Min consecutive frames for blink"
          onChange={(v) => onUpdate({ consecutiveFrames: v })}
        />
        <Slider
          value={settings.lowBlinkThreshold}
          min={5} max={20} step={1}
          label="Low blink alert threshold (BPM)"
          onChange={(v) => onUpdate({ lowBlinkThreshold: v })}
        />
      </section>

      <!-- ── Stimulation Preview ─────────────────────────────────────── -->
      <section class="space-y-4">
        <div>
          <h3 class="text-sm font-medium text-surface-200 uppercase tracking-wider">Stimulation Preview</h3>
          <p class="text-sm text-surface-400 mt-1">
            Press <strong class="text-surface-200">▶</strong> for a single play, or
            <strong class="text-surface-200">30s</strong> to loop for 30 seconds so you can judge if it works.
          </p>
        </div>

        <!-- Active test banner -->
        {#if activeTestMethod}
          {@const m = stimulationMethods.find(m => m.id === activeTestMethod)}
          <div class="flex items-center justify-between p-3 bg-primary-600/20 border border-primary-500/40 rounded-xl">
            <div class="flex items-center gap-2">
              <span class="text-lg">{m?.emoji}</span>
              <div>
                <span class="text-sm font-medium text-white">Testing: {m?.label}</span>
                <span class="text-primary-300 font-mono text-sm ml-2">{stimTestSecondsLeft}s remaining</span>
              </div>
            </div>
            <button
              on:click={stopStimTest}
              class="px-3 py-1.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
            >
              Stop
            </button>
          </div>
        {/if}

        <div class="grid grid-cols-1 gap-2">
          {#each stimulationMethods as method}
            {@const isTesting30 = activeTestMethod === method.id}
            <div
              class="flex items-center gap-3 p-3 rounded-xl border transition-colors
                     {isTesting30 ? 'bg-primary-600/15 border-primary-500/50' : 'bg-surface-800 border-surface-700 hover:border-surface-600'}"
            >
              <!-- Icon + text -->
              <span class="text-2xl leading-none flex-shrink-0 w-8 text-center">{method.emoji}</span>
              <div class="flex-1 min-w-0">
                <p class="text-sm font-medium text-white leading-tight">{method.label}</p>
                <p class="text-xs text-surface-400 mt-0.5 leading-tight">{method.desc}</p>
              </div>

              <!-- Single-play button -->
              <button
                on:click={() => window.api.testStimulation(method.id)}
                title="Play once"
                class="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-lg
                       bg-surface-700 hover:bg-primary-600 text-white transition-colors text-sm font-bold"
              >▶</button>

              <!-- 30s test button -->
              {#if isTesting30}
                <button
                  on:click={stopStimTest}
                  class="flex-shrink-0 px-3 h-9 flex items-center justify-center rounded-lg
                         bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition-colors"
                >Stop</button>
              {:else}
                <button
                  on:click={() => startStimTest(method.id)}
                  title="Loop for 30 seconds"
                  class="flex-shrink-0 px-3 h-9 flex items-center justify-center rounded-lg
                         bg-surface-700 hover:bg-primary-600 text-white text-xs font-bold transition-colors"
                >30s</button>
              {/if}
            </div>
          {/each}
        </div>
      </section>

      <!-- ── 30-Second Blink Test ───────────────────────────────────── -->
      <section class="space-y-3">
        <h3 class="text-sm font-medium text-surface-200 uppercase tracking-wider">Blink Test</h3>
        <div class="p-4 bg-surface-800 rounded-xl border border-surface-700 space-y-3">
          {#if isTesting}
            <p class="text-sm text-white">
              Blink normally… <span class="text-primary-400 font-mono">{testSecondsLeft}s</span> remaining
            </p>
            <p class="text-3xl font-bold text-white">
              {testBlinkCount} <span class="text-sm font-normal text-surface-200">blinks counted</span>
            </p>
          {:else if testSecondsLeft === 0}
            <p class="text-sm text-white">
              Result: <span class="text-primary-400 font-bold text-lg">{testBlinkCount}</span> blinks in 30s
              <span class="text-surface-400 ml-1">≈ {(testBlinkCount * 2).toFixed(0)} BPM</span>
            </p>
            <button on:click={startBlinkTest} class="px-4 py-2 text-sm font-medium text-white bg-surface-700 rounded-lg hover:bg-surface-600 transition-colors">
              Test Again
            </button>
          {:else}
            <p class="text-sm text-surface-200">Blink naturally for 30 seconds to measure your blink rate.</p>
            <button on:click={startBlinkTest} class="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors">
              Start 30s Blink Test
            </button>
          {/if}
        </div>
      </section>

    </div>
  </div>
</div>
