<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte'
  import type { StimulationParams } from '../../../shared/types'

  export let params: StimulationParams

  const dispatch = createEventDispatcher<{ done: void }>()

  let opacity = 0

  onMount(() => {
    // Fade in
    requestAnimationFrame(() => {
      opacity = params.opacity
    })

    setTimeout(() => {
      // Fade out
      opacity = 0
      setTimeout(() => dispatch('done'), 150)
    }, params.durationMs)
  })
</script>

<div
  class="fixed inset-0 pointer-events-none transition-opacity"
  style="
    background: rgba(180, 200, 255, {opacity});
    transition-duration: 150ms;
  "
></div>
