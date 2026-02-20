<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import type { BlinkData } from '../../../shared/types'

  export let blinkData: BlinkData | null = null

  let videoEl: HTMLVideoElement
  let canvasEl: HTMLCanvasElement
  let stream: MediaStream | null = null
  let animFrameId: number | null = null

  onMount(async () => {
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      if (videoEl) {
        videoEl.srcObject = stream
        videoEl.play()
      }
    } catch {
      // No camera available in settings preview
    }
  })

  onDestroy(() => {
    if (animFrameId !== null) cancelAnimationFrame(animFrameId)
    stream?.getTracks().forEach(t => t.stop())
  })
</script>

<div class="relative bg-surface-900 rounded-xl overflow-hidden aspect-video">
  <video
    bind:this={videoEl}
    playsinline
    muted
    class="w-full h-full object-cover"
  ></video>

  {#if !stream}
    <div class="absolute inset-0 flex items-center justify-center text-surface-200 text-sm">
      <span>No camera preview</span>
    </div>
  {/if}

  {#if blinkData}
    <div class="absolute bottom-2 left-2 right-2 flex gap-2 text-xs">
      <span class="bg-black/60 rounded px-2 py-1 text-white">
        EAR: {blinkData.ear.toFixed(3)}
      </span>
      <span class="bg-black/60 rounded px-2 py-1 text-white">
        BPM: {blinkData.bpm}
      </span>
    </div>
  {/if}
</div>
