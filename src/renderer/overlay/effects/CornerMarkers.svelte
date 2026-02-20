<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte'
  import type { StimulationParams } from '../../../shared/types'

  export let params: StimulationParams

  const dispatch = createEventDispatcher<{ done: void }>()

  const corners = ['top-left', 'top-right', 'bottom-right', 'bottom-left'] as const
  type Corner = typeof corners[number]

  let activeCorner: Corner | null = null
  let visible = true

  const cornerStyles: Record<Corner, string> = {
    'top-left': 'top-8 left-8',
    'top-right': 'top-8 right-8',
    'bottom-right': 'bottom-8 right-8',
    'bottom-left': 'bottom-8 left-8'
  }

  onMount(() => {
    const intervalMs = params.durationMs / corners.length
    let i = 0

    function next() {
      if (i >= corners.length) {
        visible = false
        setTimeout(() => dispatch('done'), 200)
        return
      }
      activeCorner = corners[i++]
      setTimeout(next, intervalMs)
    }

    next()
  })
</script>

{#if visible}
  {#each corners as corner}
    <div
      class="fixed transition-all duration-300 ease-in-out rounded-full pointer-events-none"
      style="
        width: {params.size * 2}px;
        height: {params.size * 2}px;
        background: rgba(20, 184, 166, {activeCorner === corner ? params.opacity : 0});
        box-shadow: 0 0 {params.size}px rgba(20, 184, 166, {activeCorner === corner ? 0.6 : 0});
      "
      class:top-8={corner === 'top-left' || corner === 'top-right'}
      class:bottom-8={corner === 'bottom-left' || corner === 'bottom-right'}
      class:left-8={corner === 'top-left' || corner === 'bottom-left'}
      class:right-8={corner === 'top-right' || corner === 'bottom-right'}
    ></div>
  {/each}
{/if}
