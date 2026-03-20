<script lang="ts">
  import { onMount, createEventDispatcher } from 'svelte'
  import type { StimulationParams } from '../../../shared/types'

  export let params: StimulationParams

  const dispatch = createEventDispatcher<{ done: void }>()

  // Perimeter waypoints (% x, y) — travels around screen edge slowly
  const WAYPOINTS = [
    { x: 5,  y: 5  },   // top-left
    { x: 30, y: 2  },
    { x: 50, y: 2  },   // top-center
    { x: 70, y: 2  },
    { x: 95, y: 5  },   // top-right
    { x: 97, y: 30 },
    { x: 97, y: 50 },   // right-center
    { x: 97, y: 70 },
    { x: 95, y: 95 },  // bottom-right
    { x: 70, y: 97 },
    { x: 50, y: 97 },   // bottom-center
    { x: 30, y: 97 },
    { x: 5,  y: 95 },   // bottom-left
    { x: 3,  y: 70 },
    { x: 3,  y: 50 },   // left-center
    { x: 3,  y: 30 },
  ]

  const stepMs = Math.round(params.durationMs / WAYPOINTS.length)
  const sz = params.size * 2   // e.g. medium → 40px

  let idx = 0
  let x = WAYPOINTS[0].x
  let y = WAYPOINTS[0].y
  let visible = false

  onMount(() => {
    visible = true

    function advance() {
      idx = (idx + 1) % WAYPOINTS.length
      x = WAYPOINTS[idx].x
      y = WAYPOINTS[idx].y

      // Stop after one full loop (WAYPOINTS.length steps)
      if (idx === 0) {
        visible = false
        setTimeout(() => dispatch('done'), 400)
        return
      }
      setTimeout(advance, stepMs)
    }

    setTimeout(advance, stepMs)
  })
</script>

{#if visible}
  <div
    class="fixed pointer-events-none"
    style="
      width: {sz}px;
      height: {sz}px;
      left: {x}%;
      top: {y}%;
      transform: translate(-50%, -50%);
      transition: left {stepMs * 0.9}ms ease-in-out, top {stepMs * 0.9}ms ease-in-out;
      opacity: {params.opacity};
    "
  >
    <!-- Soft glowing orb -->
    <div
      class="orb"
      style="
        --sz: {sz}px;
        --c: rgba(168, 85, 247, {params.opacity});
        --g1: rgba(168, 85, 247, 0.7);
        --g2: rgba(236, 72, 153, 0.45);
      "
    ></div>
  </div>
{/if}

<style>
  .orb {
    width: var(--sz);
    height: var(--sz);
    border-radius: 50%;
    background: radial-gradient(circle at 40% 35%, var(--g1) 0%, var(--g2) 45%, transparent 75%);
    box-shadow:
      0 0 calc(var(--sz) * 0.4) var(--g1),
      0 0 calc(var(--sz) * 0.8) var(--g2);
    animation: drift-pulse 1.4s ease-in-out infinite;
  }

  @keyframes drift-pulse {
    0%, 100% { transform: scale(1);    filter: brightness(1); }
    50%       { transform: scale(1.18); filter: brightness(1.3); }
  }
</style>
