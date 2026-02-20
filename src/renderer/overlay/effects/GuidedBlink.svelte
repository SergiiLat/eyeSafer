<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte'
  import type { StimulationParams } from '../../../shared/types'

  export let params: StimulationParams

  const dispatch = createEventDispatcher<{ done: void }>()

  const PROMPT_MS = 1000
  const BLINK_MS = 500
  const CYCLE_MS = PROMPT_MS + BLINK_MS
  const count = Math.max(2, Math.floor(params.durationMs / CYCLE_MS))

  let phase: 'prompt' | 'blink' = 'prompt'
  let remaining = count
  let visible = true

  onMount(() => {
    function step() {
      if (remaining <= 0) {
        visible = false
        setTimeout(() => dispatch('done'), 200)
        return
      }
      phase = 'prompt'
      setTimeout(() => {
        phase = 'blink'
        remaining--
        setTimeout(step, BLINK_MS)
      }, PROMPT_MS)
    }

    step()
  })
</script>

{#if visible}
  <div
    class="fixed inset-0 flex flex-col items-center justify-center pointer-events-none gap-6"
    style="opacity: {params.opacity};"
  >
    <!-- Eye graphic: open ring vs filled -->
    <div
      class="rounded-full transition-all duration-150 border-4"
      style="
        width: {params.size * 3}px;
        height: {params.size * 3}px;
        border-color: rgba(20, 184, 166, 1);
        background: {phase === 'blink' ? 'rgba(20, 184, 166, 0.9)' : 'transparent'};
        box-shadow: 0 0 {params.size * 2}px rgba(20, 184, 166, 0.6);
      "
    ></div>

    <div class="text-center select-none">
      <div
        class="text-2xl font-bold tracking-widest transition-all duration-100"
        style="
          color: white;
          text-shadow: 0 0 16px rgba(20, 184, 166, 0.9);
          opacity: {phase === 'blink' ? 1 : 0.5};
        "
      >
        {phase === 'blink' ? 'BLINK' : 'BLINK NOW'}
      </div>
      <div class="text-sm mt-2" style="color: rgba(255,255,255,0.5)">
        {remaining} remaining
      </div>
    </div>
  </div>
{/if}
