<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte'
  import type { StimulationParams } from '../../../shared/types'

  export let params: StimulationParams

  const dispatch = createEventDispatcher<{ done: void }>()

  // Positions around the screen perimeter (percentage x, y)
  const positions = [
    { x: 25, y: 3 },
    { x: 75, y: 3 },
    { x: 97, y: 25 },
    { x: 97, y: 75 },
    { x: 75, y: 97 },
    { x: 25, y: 97 },
    { x: 3, y: 75 },
    { x: 3, y: 25 }
  ]

  let activeIndex = -1
  let visible = true

  onMount(() => {
    const intervalMs = Math.round(params.durationMs / positions.length)
    let i = 0

    function next() {
      if (i >= positions.length) {
        visible = false
        setTimeout(() => dispatch('done'), 200)
        return
      }
      activeIndex = i++
      setTimeout(next, intervalMs)
    }

    next()
  })
</script>

{#if visible}
  {#each positions as pos, i}
    <div
      class="fixed rounded-full pointer-events-none transition-all duration-200"
      style="
        width: {params.size * 2}px;
        height: {params.size * 2}px;
        left: {pos.x}%;
        top: {pos.y}%;
        transform: translate(-50%, -50%);
        background: rgba(168, 85, 247, {activeIndex === i ? params.opacity : 0});
        box-shadow: {activeIndex === i ? `0 0 ${params.size}px rgba(168, 85, 247, 0.6)` : 'none'};
      "
    ></div>
  {/each}
{/if}
