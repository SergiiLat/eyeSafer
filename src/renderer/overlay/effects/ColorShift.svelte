<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte'
  import type { StimulationParams } from '../../../shared/types'

  export let params: StimulationParams

  const dispatch = createEventDispatcher<{ done: void }>()

  const cycles = params.cycles ?? 2
  const cycleDuration = params.durationMs / cycles / 2

  // Warm tint = orange/amber, Cool tint = blue
  const tints = [
    `rgba(255, 160, 50, ${params.opacity})`,
    `rgba(50, 120, 255, ${params.opacity})`
  ]

  let currentTint = 'transparent'
  let cycle = 0

  onMount(() => {
    function nextCycle() {
      if (cycle >= cycles * 2) {
        currentTint = 'transparent'
        setTimeout(() => dispatch('done'), cycleDuration)
        return
      }
      currentTint = tints[cycle % 2]
      cycle++
      setTimeout(nextCycle, cycleDuration)
    }
    nextCycle()
  })
</script>

<div
  class="fixed inset-0 pointer-events-none"
  style="
    background: {currentTint};
    transition: background {cycleDuration}ms ease-in-out;
  "
></div>
