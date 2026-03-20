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
  import CornerFocus from './effects/CornerFocus.svelte'
  import PseudoBlur from './effects/PseudoBlur.svelte'
  import BrightnessShift from './effects/BrightnessShift.svelte'
  import PeripheralDrift from './effects/PeripheralDrift.svelte'
  import ExerciseOverlay from './effects/ExerciseOverlay.svelte'
  import type { StimulationTrigger, ExerciseTrigger } from '../../shared/types'

  let activeTrigger: StimulationTrigger | null = null
  let activeExercise: ExerciseTrigger | null = null
  let showTwenty = false
  let unsubscribeStim: (() => void) | null = null
  let unsubscribeTwenty: (() => void) | null = null
  let unsubscribeExercise: (() => void) | null = null
  let unsubscribeExerciseDismiss: (() => void) | null = null

  onMount(() => {
    unsubscribeStim = window.overlay.onTrigger((trigger) => {
      activeTrigger = trigger
    })
    unsubscribeTwenty = window.overlay.onTwentyTrigger(() => {
      showTwenty = true
    })
    unsubscribeExercise = window.overlay.onExerciseTrigger((exercise) => {
      activeExercise = exercise
    })
    unsubscribeExerciseDismiss = window.overlay.onExerciseDismiss(() => {
      activeExercise = null
    })
  })

  onDestroy(() => {
    unsubscribeStim?.()
    unsubscribeTwenty?.()
    unsubscribeExercise?.()
    unsubscribeExerciseDismiss?.()
  })

  function handleDone() {
    window.overlay.complete()
    activeTrigger = null
  }

  function handleTwentyDone() {
    window.overlay.twentyDone()
    showTwenty = false
  }

  function handleExerciseDone() {
    activeExercise = null
  }

  function handleExerciseSkip() {
    activeExercise = null
  }
</script>

<div class="fixed inset-0 pointer-events-none overflow-hidden">
  {#if activeExercise}
    {#key activeExercise}
      <ExerciseOverlay exercise={activeExercise} on:done={handleExerciseDone} on:skip={handleExerciseSkip} />
    {/key}
  {:else if showTwenty}
    <TwentyRule on:done={handleTwentyDone} />
  {:else if activeTrigger}
    <!-- {#key} forces component remount on every new trigger (needed for test-loop repeats) -->
    {#key activeTrigger}
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
      {:else if activeTrigger.method === 'cornerFocus'}
        <CornerFocus params={activeTrigger.params} on:done={handleDone} />
      {:else if activeTrigger.method === 'pseudoBlur'}
        <PseudoBlur params={activeTrigger.params} on:done={handleDone} />
      {:else if activeTrigger.method === 'brightnessShift'}
        <BrightnessShift params={activeTrigger.params} on:done={handleDone} />
      {:else if activeTrigger.method === 'peripheralDrift'}
        <PeripheralDrift params={activeTrigger.params} on:done={handleDone} />
      {/if}
    {/key}
  {/if}
</div>
