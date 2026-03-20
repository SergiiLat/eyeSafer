<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte'
  import type { StimulationParams } from '../../../shared/types'

  export let params: StimulationParams

  const dispatch = createEventDispatcher<{ done: void }>()

  // Three pulses within the duration — in, hold, out, pause, repeat
  const PULSES = 3
  const pulseDuration = Math.round(params.durationMs / PULSES)
  const fadeMs = Math.min(120, Math.round(pulseDuration * 0.3))

  let blurAmount = 0
  let overlayOpacity = 0

  onMount(() => {
    let pulse = 0

    function doPulse() {
      if (pulse >= PULSES) {
        blurAmount = 0
        overlayOpacity = 0
        setTimeout(() => dispatch('done'), fadeMs)
        return
      }
      // Fade in
      overlayOpacity = params.opacity
      blurAmount = 6 + params.opacity * 10

      setTimeout(() => {
        // Fade out
        overlayOpacity = 0
        blurAmount = 0
        pulse++
        setTimeout(doPulse, pulseDuration - fadeMs * 2)
      }, pulseDuration - fadeMs * 2)
    }

    doPulse()
  })
</script>

<!-- Frosted-glass blur overlay pulse -->
<div
  class="fixed inset-0 pointer-events-none"
  style="
    backdrop-filter: blur({blurAmount}px) saturate(0.7);
    -webkit-backdrop-filter: blur({blurAmount}px) saturate(0.7);
    background: rgba(100, 140, 255, {overlayOpacity * 0.25});
    transition: opacity {fadeMs}ms ease-in-out, backdrop-filter {fadeMs}ms ease-in-out;
    opacity: {overlayOpacity > 0 ? 1 : 0};
  "
></div>
