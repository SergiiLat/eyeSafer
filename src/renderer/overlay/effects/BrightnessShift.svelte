<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte'
  import type { StimulationParams } from '../../../shared/types'

  export let params: StimulationParams

  const dispatch = createEventDispatcher<{ done: void }>()

  // Alternates bright flash → dark dip → bright flash, 3 cycles
  const CYCLES = 3
  const phaseMs = Math.round(params.durationMs / (CYCLES * 2))
  const fadeMs = Math.min(100, Math.round(phaseMs * 0.4))

  // 'bright' = white overlay (simulate brightness up)
  // 'dark'   = black overlay (simulate brightness/contrast dip)
  let phase: 'bright' | 'dark' | 'none' = 'none'
  let overlayOpacity = 0

  onMount(() => {
    let step = 0
    const totalSteps = CYCLES * 2

    function next() {
      if (step >= totalSteps) {
        overlayOpacity = 0
        phase = 'none'
        setTimeout(() => dispatch('done'), fadeMs)
        return
      }
      phase = step % 2 === 0 ? 'bright' : 'dark'
      overlayOpacity = params.opacity
      step++
      setTimeout(next, phaseMs)
    }

    next()
  })

  $: overlayColor = phase === 'bright'
    ? `rgba(255, 255, 240, ${overlayOpacity})`
    : `rgba(0, 0, 20, ${overlayOpacity * 0.7})`
</script>

<div
  class="fixed inset-0 pointer-events-none"
  style="
    background: {overlayColor};
    transition: background {fadeMs}ms ease-in-out;
    mix-blend-mode: {phase === 'bright' ? 'screen' : 'multiply'};
  "
></div>
