<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import CornerMarkers from './effects/CornerMarkers.svelte'
  import BlurOverlay from './effects/BlurOverlay.svelte'
  import MovingObject from './effects/MovingObject.svelte'
  import ColorShift from './effects/ColorShift.svelte'
  import FigureEight from './effects/FigureEight.svelte'
  import NearFarFocus from './effects/NearFarFocus.svelte'
  import PeripheralTriggers from './effects/PeripheralTriggers.svelte'
  import GuidedBlink from './effects/GuidedBlink.svelte'
  import SaccadeTraining from './effects/SaccadeTraining.svelte'
  import TwentyRule from './effects/TwentyRule.svelte'
  import type { StimulationTrigger } from '../../shared/types'

  let activeTrigger: StimulationTrigger | null = null
  let showTwenty = false
  let unsubscribeStim: (() => void) | null = null
  let unsubscribeTwenty: (() => void) | null = null

  onMount(() => {
    unsubscribeStim = window.overlay.onTrigger((trigger) => {
      activeTrigger = trigger
    })
    unsubscribeTwenty = window.overlay.onTwentyTrigger(() => {
      showTwenty = true
    })
  })

  onDestroy(() => {
    unsubscribeStim?.()
    unsubscribeTwenty?.()
  })

  function handleDone() {
    window.overlay.complete()
    activeTrigger = null
  }

  function handleTwentyDone() {
    window.overlay.twentyDone()
    showTwenty = false
  }
</script>

<div class="fixed inset-0 pointer-events-none overflow-hidden">
  {#if showTwenty}
    <TwentyRule on:done={handleTwentyDone} />
  {:else if activeTrigger}
    {#if activeTrigger.method === 'cornerMarkers'}
      <CornerMarkers params={activeTrigger.params} on:done={handleDone} />
    {:else if activeTrigger.method === 'blurOverlay'}
      <BlurOverlay params={activeTrigger.params} on:done={handleDone} />
    {:else if activeTrigger.method === 'movingObject'}
      <MovingObject params={activeTrigger.params} on:done={handleDone} />
    {:else if activeTrigger.method === 'colorShift'}
      <ColorShift params={activeTrigger.params} on:done={handleDone} />
    {:else if activeTrigger.method === 'figureEight'}
      <FigureEight params={activeTrigger.params} on:done={handleDone} />
    {:else if activeTrigger.method === 'nearFarFocus'}
      <NearFarFocus params={activeTrigger.params} on:done={handleDone} />
    {:else if activeTrigger.method === 'peripheralTriggers'}
      <PeripheralTriggers params={activeTrigger.params} on:done={handleDone} />
    {:else if activeTrigger.method === 'guidedBlink'}
      <GuidedBlink params={activeTrigger.params} on:done={handleDone} />
    {:else if activeTrigger.method === 'saccadeTraining'}
      <SaccadeTraining params={activeTrigger.params} on:done={handleDone} />
    {/if}
  {/if}
</div>

