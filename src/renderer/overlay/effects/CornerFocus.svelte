<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte'
  import type { StimulationParams } from '../../../shared/types'

  export let params: StimulationParams

  const dispatch = createEventDispatcher<{ done: void }>()

  const CORNERS = ['top-left', 'top-right', 'bottom-right', 'bottom-left'] as const
  type Corner = typeof CORNERS[number]

  const STOPS = 4
  const stopMs = Math.round(params.durationMs / STOPS)

  let cornerIdx = Math.floor(Math.random() * CORNERS.length)
  let corner: Corner = CORNERS[cornerIdx]
  let showing = false

  const cornerPos: Record<Corner, string> = {
    'top-left':     'top-6 left-6',
    'top-right':    'top-6 right-6',
    'bottom-right': 'bottom-6 right-6',
    'bottom-left':  'bottom-6 left-6',
  }

  const sz = params.size * 2  // e.g. medium → 64px

  onMount(() => {
    showing = true

    let stops = 0
    function hop() {
      stops++
      if (stops >= STOPS) {
        showing = false
        setTimeout(() => dispatch('done'), 300)
        return
      }
      // Fade out, reposition, fade in
      showing = false
      setTimeout(() => {
        cornerIdx = (cornerIdx + 1) % CORNERS.length
        corner = CORNERS[cornerIdx]
        showing = true
        setTimeout(hop, stopMs)
      }, 250)
    }

    setTimeout(hop, stopMs)
  })
</script>

{#if corner}
  <div
    class="fixed pointer-events-none {cornerPos[corner]}"
    style="opacity: {showing ? params.opacity : 0}; transition: opacity 0.25s ease;"
  >
    <div class="target" style="--sz: {sz}px; --c: rgba(20,184,166,{params.opacity}); --g: rgba(20,184,166,0.55);">
      <div class="ring outer"></div>
      <div class="ring mid"></div>
      <div class="ring inner"></div>
      <div class="core"></div>
    </div>
  </div>
{/if}

<style>
  .target {
    position: relative;
    width: var(--sz);
    height: var(--sz);
    display: flex;
    align-items: center;
    justify-content: center;
  }

  .ring {
    position: absolute;
    border-radius: 50%;
    border: 2.5px solid var(--c);
    box-shadow: 0 0 10px var(--g), inset 0 0 6px var(--g);
  }

  .outer {
    width: 100%;
    height: 100%;
    border-style: dashed;
    animation: spin-cw 2.5s linear infinite;
  }

  .mid {
    width: 68%;
    height: 68%;
    border-width: 2px;
    animation: spin-ccw 1.8s linear infinite;
  }

  .inner {
    width: 38%;
    height: 38%;
    border-width: 1.5px;
    animation: spin-cw 1.2s linear infinite;
  }

  .core {
    position: absolute;
    width: 18%;
    height: 18%;
    border-radius: 50%;
    background: var(--c);
    box-shadow: 0 0 14px var(--g), 0 0 28px var(--g);
    animation: pulse 0.7s ease-in-out infinite;
  }

  @keyframes spin-cw {
    from { transform: rotate(0deg); }
    to   { transform: rotate(360deg); }
  }
  @keyframes spin-ccw {
    from { transform: rotate(0deg); }
    to   { transform: rotate(-360deg); }
  }
  @keyframes pulse {
    0%, 100% { transform: scale(1);   opacity: 1; }
    50%       { transform: scale(1.5); opacity: 0.6; }
  }
</style>
