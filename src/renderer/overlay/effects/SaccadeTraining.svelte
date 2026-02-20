<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte'
  import type { StimulationParams } from '../../../shared/types'

  export let params: StimulationParams

  const dispatch = createEventDispatcher<{ done: void }>()

  const SACCADE_MS = 550
  const count = Math.max(4, Math.floor(params.durationMs / SACCADE_MS))

  let activeSide: 'left' | 'right' | null = null
  let visible = true

  onMount(() => {
    let i = 0

    function step() {
      if (i >= count) {
        activeSide = null
        visible = false
        setTimeout(() => dispatch('done'), 200)
        return
      }
      activeSide = i % 2 === 0 ? 'left' : 'right'
      i++
      setTimeout(step, SACCADE_MS)
    }

    step()
  })
</script>

{#if visible}
  <!-- Left dot -->
  <div
    class="fixed rounded-full pointer-events-none transition-all duration-150"
    style="
      width: {params.size * 2}px;
      height: {params.size * 2}px;
      left: 12%;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(249, 115, 22, {activeSide === 'left' ? params.opacity : 0.08});
      box-shadow: {activeSide === 'left' ? `0 0 ${params.size * 2}px rgba(249, 115, 22, 0.7)` : 'none'};
    "
  ></div>

  <!-- Right dot -->
  <div
    class="fixed rounded-full pointer-events-none transition-all duration-150"
    style="
      width: {params.size * 2}px;
      height: {params.size * 2}px;
      right: 12%;
      top: 50%;
      transform: translateY(-50%);
      background: rgba(249, 115, 22, {activeSide === 'right' ? params.opacity : 0.08});
      box-shadow: {activeSide === 'right' ? `0 0 ${params.size * 2}px rgba(249, 115, 22, 0.7)` : 'none'};
    "
  ></div>
{/if}
