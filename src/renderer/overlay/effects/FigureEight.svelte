<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte'
  import type { StimulationParams } from '../../../shared/types'

  export let params: StimulationParams

  const dispatch = createEventDispatcher<{ done: void }>()

  let x = 50
  let y = 50
  let visible = true

  onMount(() => {
    const start = performance.now()
    const duration = params.durationMs
    let rafId: number

    function animate(now: number) {
      const elapsed = now - start
      if (elapsed >= duration) {
        visible = false
        setTimeout(() => dispatch('done'), 200)
        return
      }
      // Lissajous figure-8: 2 complete loops over the duration
      const t = (elapsed / duration) * Math.PI * 4
      x = 50 + 38 * Math.cos(t)
      y = 50 + 20 * Math.sin(2 * t)
      rafId = requestAnimationFrame(animate)
    }

    rafId = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafId)
  })
</script>

{#if visible}
  <div
    class="fixed rounded-full pointer-events-none"
    style="
      width: {params.size * 2}px;
      height: {params.size * 2}px;
      left: {x}%;
      top: {y}%;
      transform: translate(-50%, -50%);
      background: rgba(99, 102, 241, {params.opacity});
      box-shadow: 0 0 {params.size * 2}px rgba(99, 102, 241, 0.7);
    "
  ></div>
{/if}
