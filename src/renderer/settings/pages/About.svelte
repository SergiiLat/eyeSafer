<script lang="ts">
  import { onMount } from 'svelte'

  let version = ''
  let logPath = ''

  onMount(async () => {
    version = await window.api.getVersion()
    logPath = await window.api.getLogPath()
  })
</script>

<div class="space-y-8">
  <div>
    <h2 class="text-lg font-semibold text-white mb-1">About</h2>
    <p class="text-sm text-surface-200">HealthSafer — Protect your eyes from digital strain</p>
  </div>

  <div class="flex items-center gap-4">
    <div class="w-16 h-16 bg-primary-900/40 rounded-2xl border border-primary-700 flex items-center justify-center">
      <span class="text-3xl">👁</span>
    </div>
    <div>
      <h3 class="text-xl font-bold text-white">HealthSafer</h3>
      {#if version}
        <p class="text-sm text-surface-200">Version {version}</p>
      {/if}
    </div>
  </div>

  <div class="space-y-3 text-sm text-surface-200">
    <p>
      HealthSafer monitors your blink rate in real-time using your webcam and MediaPipe Face Mesh,
      then reminds you to exercise your eyes with visual micro-stimulation overlays.
    </p>
    <p>
      Regular blinking and eye movement exercises can significantly reduce digital eye strain,
      dry eyes, and headaches from extended screen time.
    </p>
  </div>

  <div class="space-y-2">
    <h3 class="text-sm font-medium text-surface-200 uppercase tracking-wider">Technology</h3>
    <ul class="space-y-1 text-sm text-surface-200">
      <li>• Electron + Svelte + TypeScript</li>
      <li>• MediaPipe Tasks Vision (Face Mesh)</li>
      <li>• Eye Aspect Ratio (EAR) blink detection</li>
      <li>• Multi-monitor overlay support</li>
    </ul>
  </div>

  <div class="space-y-2">
    <h3 class="text-sm font-medium text-surface-200 uppercase tracking-wider">Privacy</h3>
    <p class="text-sm text-surface-200">
      All processing happens locally on your device. No camera data, blink data, or personal
      information is ever sent to any server.
    </p>
  </div>

  <div class="space-y-2">
    <h3 class="text-sm font-medium text-surface-200 uppercase tracking-wider">Logs</h3>
    {#if logPath}
      <p class="text-xs font-mono text-surface-200 bg-surface-800 rounded px-3 py-2 break-all">{logPath}</p>
    {/if}
    <button
      on:click={() => window.api.openLog()}
      class="px-4 py-2 text-sm font-medium text-white bg-surface-700 hover:bg-surface-600 rounded-lg transition-colors"
    >
      Open Log File
    </button>
  </div>
</div>
