<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte'

  const dispatch = createEventDispatcher<{ done: void }>()

  const TOTAL_SECONDS = 20

  let secondsLeft = TOTAL_SECONDS
  let phase: 'look-away' | 'done' = 'look-away'
  let visible = true

  onMount(() => {
    const interval = setInterval(() => {
      secondsLeft--
      if (secondsLeft <= 0) {
        clearInterval(interval)
        phase = 'done'
        setTimeout(() => {
          visible = false
          dispatch('done')
        }, 1500)
      }
    }, 1000)

    return () => clearInterval(interval)
  })

  $: progressPct = ((TOTAL_SECONDS - secondsLeft) / TOTAL_SECONDS) * 100
</script>

{#if visible}
  <div class="fixed inset-0 flex flex-col items-center justify-center pointer-events-none"
       style="background: rgba(0, 0, 0, 0.55);">
    <div class="flex flex-col items-center gap-6 select-none">

      <!-- Icon -->
      <div class="text-7xl" style="filter: drop-shadow(0 0 20px rgba(20, 184, 166, 0.8))">
        {phase === 'done' ? '✓' : '↗'}
      </div>

      <!-- Message -->
      {#if phase === 'look-away'}
        <div class="text-center">
          <div class="text-2xl font-bold text-white"
               style="text-shadow: 0 0 16px rgba(20, 184, 166, 0.9)">
            20-20-20 Break
          </div>
          <div class="text-base text-white/70 mt-2">
            Look at something 6 metres away
          </div>
        </div>
      {:else}
        <div class="text-xl font-semibold text-white"
             style="text-shadow: 0 0 12px rgba(20, 184, 166, 0.9)">
          Great! Your eyes thank you.
        </div>
      {/if}

      <!-- Countdown -->
      {#if phase === 'look-away'}
        <div class="flex flex-col items-center gap-3">
          <div class="text-5xl font-mono font-bold text-white tabular-nums"
               style="text-shadow: 0 0 20px rgba(20, 184, 166, 0.8)">
            {secondsLeft}
          </div>

          <!-- Progress bar -->
          <div class="w-48 h-1.5 bg-white/20 rounded-full overflow-hidden">
            <div
              class="h-full rounded-full transition-all duration-1000 ease-linear"
              style="width: {progressPct}%; background: rgba(20, 184, 166, 0.9);"
            ></div>
          </div>
        </div>
      {/if}

    </div>
  </div>
{/if}
