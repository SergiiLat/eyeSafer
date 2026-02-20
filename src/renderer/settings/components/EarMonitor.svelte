<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import type { BlinkData } from '../../../shared/types'

  export let blinkData: BlinkData | null = null

  // Rolling EAR history (last 5 seconds at ~15fps = ~75 samples)
  const maxSamples = 75
  let earHistory: number[] = Array(maxSamples).fill(1.0)
  let blinkFlash = false
  let flashTimeout: ReturnType<typeof setTimeout> | null = null

  let canvasEl: HTMLCanvasElement
  let animFrameId: number | null = null

  $: if (blinkData) {
    earHistory = [...earHistory.slice(1), blinkData.ear]
    if (blinkData.ear < 0.25 && !blinkFlash) {
      blinkFlash = true
      if (flashTimeout) clearTimeout(flashTimeout)
      flashTimeout = setTimeout(() => { blinkFlash = false }, 150)
    }
    drawSparkline()
  }

  function drawSparkline() {
    if (!canvasEl) return
    const ctx = canvasEl.getContext('2d')
    if (!ctx) return

    const { width, height } = canvasEl
    ctx.clearRect(0, 0, width, height)

    // Background
    ctx.fillStyle = '#1e293b'
    ctx.fillRect(0, 0, width, height)

    // EAR threshold line
    const thresholdY = height - (0.25 / 1.0) * height
    ctx.strokeStyle = '#f59e0b'
    ctx.lineWidth = 1
    ctx.setLineDash([4, 4])
    ctx.beginPath()
    ctx.moveTo(0, thresholdY)
    ctx.lineTo(width, thresholdY)
    ctx.stroke()
    ctx.setLineDash([])

    // EAR sparkline
    ctx.strokeStyle = '#14b8a6'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    earHistory.forEach((ear, i) => {
      const x = (i / (maxSamples - 1)) * width
      const y = height - (Math.min(ear, 1) / 1.0) * height
      if (i === 0) ctx.moveTo(x, y)
      else ctx.lineTo(x, y)
    })
    ctx.stroke()
  }

  onMount(() => {
    drawSparkline()
  })

  onDestroy(() => {
    if (animFrameId !== null) cancelAnimationFrame(animFrameId)
    if (flashTimeout) clearTimeout(flashTimeout)
  })
</script>

<div class="space-y-3">
  <div class="flex items-center gap-4 flex-wrap">
    <div class="flex items-center gap-2">
      <div
        class="w-3 h-3 rounded-full transition-colors duration-100 {blinkFlash ? 'bg-primary-400' : 'bg-surface-700'}"
      ></div>
      <span class="text-sm text-surface-200">Blink</span>
    </div>
    <div class="text-2xl font-bold text-white tabular-nums">
      {blinkData?.bpm ?? '--'}
      <span class="text-sm font-normal text-surface-200">BPM</span>
    </div>
    <div class="text-xl font-semibold text-primary-400 tabular-nums">
      {blinkData?.blinkCount ?? '--'}
      <span class="text-sm font-normal text-surface-200">total</span>
    </div>
    <div class="text-sm text-surface-200">
      EAR: <span class="font-mono text-primary-400">{blinkData?.ear.toFixed(3) ?? '-.---'}</span>
    </div>
    {#if blinkData?.fps !== undefined}
      <div class="text-sm text-surface-200">
        <span class="font-mono text-surface-400">{blinkData.fps}</span> fps
      </div>
    {/if}
  </div>

  <div class="relative">
    <canvas
      bind:this={canvasEl}
      width={400}
      height={80}
      class="w-full rounded-lg"
    ></canvas>
    <div class="absolute top-1 right-2 text-xs text-amber-400">─ threshold</div>
  </div>
</div>
