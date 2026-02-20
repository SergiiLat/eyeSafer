<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte'
  import type { StimulationParams } from '../../../shared/types'

  export let params: StimulationParams

  const dispatch = createEventDispatcher<{ done: void }>()

  let x = 0.5
  let y = 0.5
  let visible = false

  function randomTarget() {
    // Keep away from edges
    return {
      x: 0.1 + Math.random() * 0.8,
      y: 0.1 + Math.random() * 0.8
    }
  }

  onMount(() => {
    visible = true
    const start = randomTarget()
    x = start.x
    y = start.y

    const steps = 3
    const stepInterval = params.durationMs / steps
    let step = 0

    function move() {
      if (step >= steps) {
        visible = false
        setTimeout(() => dispatch('done'), 300)
        return
      }
      const next = randomTarget()
      x = next.x
      y = next.y
      step++
      setTimeout(move, stepInterval)
    }

    setTimeout(move, stepInterval)
  })
</script>

{#if visible}
  <div
    class="fixed pointer-events-none rounded-full"
    style="
      width: {params.size * 2}px;
      height: {params.size * 2}px;
      left: calc({x * 100}% - {params.size}px);
      top: calc({y * 100}% - {params.size}px);
      background: radial-gradient(circle, rgba(20, 184, 166, {params.opacity}) 0%, transparent 70%);
      border: 2px solid rgba(20, 184, 166, {params.opacity * 0.8});
      transition: left {params.durationMs / 3}ms ease-in-out, top {params.durationMs / 3}ms ease-in-out;
      box-shadow: 0 0 {params.size}px rgba(20, 184, 166, 0.5);
    "
  ></div>
{/if}
