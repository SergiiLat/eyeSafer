<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte'
  import type { StimulationParams } from '../../../shared/types'

  export let params: StimulationParams

  const dispatch = createEventDispatcher<{ done: void }>()

  const CYCLES = 3
  const phaseMs = Math.round(params.durationMs / (CYCLES * 2))

  let scale = 1
  let visible = true

  onMount(() => {
    let step = 0
    const totalSteps = CYCLES * 2

    function next() {
      if (step >= totalSteps) {
        visible = false
        setTimeout(() => dispatch('done'), 200)
        return
      }
      // Odd steps = near (large), even = far (small)
      scale = step % 2 === 0 ? 2.8 : 1
      step++
      setTimeout(next, phaseMs)
    }

    next()
  })
</script>

{#if visible}
  <div class="fixed inset-0 flex items-center justify-center pointer-events-none">
    <div
      class="rounded-full"
      style="
        width: {params.size * 2}px;
        height: {params.size * 2}px;
        transform: scale({scale});
        transition: transform {phaseMs * 0.85}ms ease-in-out;
        background: rgba(20, 184, 166, {params.opacity});
        box-shadow: 0 0 {params.size * 2}px rgba(20, 184, 166, 0.6);
      "
    ></div>
  </div>
{/if}
