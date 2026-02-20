<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import CameraPreview from '../components/CameraPreview.svelte'
  import EarMonitor from '../components/EarMonitor.svelte'
  import Slider from '../components/Slider.svelte'
  import type { AppSettings, CameraDevice, BlinkData, StimulationMethod } from '../../../shared/types'

  export let settings: AppSettings
  export let onUpdate: (patch: Partial<AppSettings>) => void

  const stimulationMethods: { id: StimulationMethod; label: string }[] = [
    { id: 'cornerMarkers', label: 'Corner Markers' },
    { id: 'blurOverlay',   label: 'Blur Overlay'   },
    { id: 'movingObject',  label: 'Moving Object'  },
    { id: 'colorShift',    label: 'Color Shift'    },
  ]

  let cameras: CameraDevice[] = []
  let blinkData: BlinkData | null = null
  let testBlinkCount = 0
  let isTesting = false
  let testTimer: ReturnType<typeof setInterval> | null = null
  let testSecondsLeft = 30
  let unsubscribeBlinkData: (() => void) | null = null

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
</script>

<div class="space-y-6">
  <div>
    <h2 class="text-lg font-semibold text-white mb-1">Camera</h2>
    <p class="text-sm text-surface-200">Configure blink detection and monitoring</p>
  </div>

  <!-- Two-column layout: preview left, controls right on large screens -->
  <div class="flex flex-col lg:flex-row gap-6">

    <!-- Left column: camera source + preview (fixed width on large) -->
    <div class="w-full lg:w-[400px] lg:flex-shrink-0 space-y-4">

      <!-- Camera Selection -->
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

      <!-- Camera Preview — max size constrained, never grows beyond container -->
      <section class="space-y-3">
        <h3 class="text-sm font-medium text-surface-200 uppercase tracking-wider">Preview</h3>
        <CameraPreview {blinkData} />
      </section>

      <!-- Calibration status indicator -->
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

    <!-- Right column: all controls, fills remaining space -->
    <div class="flex-1 min-w-0 space-y-6">

      <!-- EAR Monitor -->
      <section class="space-y-3">
        <h3 class="text-sm font-medium text-surface-200 uppercase tracking-wider">Blink Monitor</h3>
        <div class="p-4 bg-surface-800 rounded-xl border border-surface-700">
          <EarMonitor {blinkData} />
        </div>
      </section>

      <!-- Calibration -->
      <section class="space-y-4">
        <h3 class="text-sm font-medium text-surface-200 uppercase tracking-wider">Calibration</h3>
        <Slider
          value={settings.earThreshold}
          min={0.1}
          max={0.5}
          step={0.01}
          label="EAR Threshold (blink sensitivity)"
          onChange={(v) => onUpdate({ earThreshold: v })}
        />
        <Slider
          value={settings.consecutiveFrames}
          min={1}
          max={5}
          step={1}
          label="Min consecutive frames for blink"
          onChange={(v) => onUpdate({ consecutiveFrames: v })}
        />
        <Slider
          value={settings.lowBlinkThreshold}
          min={5}
          max={20}
          step={1}
          label="Low blink alert threshold (BPM)"
          onChange={(v) => onUpdate({ lowBlinkThreshold: v })}
        />
      </section>

      <!-- Stimulation Preview -->
      <section class="space-y-3">
        <h3 class="text-sm font-medium text-surface-200 uppercase tracking-wider">Stimulation Preview</h3>
        <p class="text-sm text-surface-200">Trigger each effect to see how it looks on screen.</p>
        <div class="grid grid-cols-2 gap-2">
          {#each stimulationMethods as method}
            <button
              on:click={() => window.api.testStimulation(method.id)}
              class="px-3 py-2 text-sm font-medium text-white bg-surface-800 border border-surface-700
                     rounded-lg hover:bg-surface-700 hover:border-primary-500 transition-colors text-left"
            >
              {method.label}
            </button>
          {/each}
        </div>
      </section>

      <!-- 30-Second Blink Test -->
      <section class="space-y-3">
        <h3 class="text-sm font-medium text-surface-200 uppercase tracking-wider">Blink Test</h3>
        <div class="p-4 bg-surface-800 rounded-xl border border-surface-700 space-y-3">
          {#if isTesting}
            <p class="text-sm text-white">
              Blink normally… <span class="text-primary-400 font-mono">{testSecondsLeft}s</span> remaining
            </p>
            <p class="text-2xl font-bold text-white">
              {testBlinkCount} <span class="text-sm font-normal text-surface-200">blinks</span>
            </p>
          {:else if testSecondsLeft === 0}
            <p class="text-sm text-white">
              Result: <span class="text-primary-400 font-bold">{testBlinkCount} blinks</span> in 30 seconds
              ({(testBlinkCount * 2).toFixed(0)} BPM estimated)
            </p>
            <button on:click={startBlinkTest} class="px-4 py-2 text-sm font-medium text-white bg-surface-700 rounded-lg hover:bg-surface-600 transition-colors">
              Test Again
            </button>
          {:else}
            <p class="text-sm text-surface-200">Blink naturally for 30 seconds to measure your blink rate</p>
            <button on:click={startBlinkTest} class="px-4 py-2 text-sm font-medium text-white bg-primary-600 rounded-lg hover:bg-primary-700 transition-colors">
              Start 30s Blink Test
            </button>
          {/if}
        </div>
      </section>

    </div>
  </div>
</div>
