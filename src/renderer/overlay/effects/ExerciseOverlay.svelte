<script lang="ts">
  import { createEventDispatcher, onDestroy } from 'svelte'
  import type { ExerciseTrigger } from '../../../shared/types'

  export let exercise: ExerciseTrigger

  const dispatch = createEventDispatcher<{ done: void; skip: void }>()

  // Track image load failures
  const imgFailed: Record<number, boolean> = {}

  function handleImgError(index: number) {
    return (e: Event) => {
      imgFailed[index] = true
      const img = e.target as HTMLImageElement
      img.style.display = 'none'
    }
  }

  function handleDone() {
    window.overlay.exerciseDone(exercise.exerciseId)
    dispatch('done')
  }

  function handleSkip() {
    window.overlay.exerciseSkip(exercise.exerciseId)
    dispatch('skip')
  }

  // ESC key support
  function onKeydown(e: KeyboardEvent) {
    if (e.key === 'Escape') handleSkip()
  }

  onDestroy(() => {
    window.removeEventListener('keydown', onKeydown)
  })

  // Register key handler
  window.addEventListener('keydown', onKeydown)
</script>

<!-- Full-screen backdrop — pointer-events-auto so clicks are captured -->
<div
  class="fixed inset-0 flex items-center justify-center pointer-events-auto"
  style="background: rgba(0,0,0,0.72); z-index: 9999;"
>
  <div class="bg-surface-900 border border-surface-700 rounded-2xl shadow-2xl w-full max-w-5xl mx-6 p-8 max-h-screen overflow-y-auto">

    <!-- Header -->
    <div class="mb-7">
      <div class="flex items-start justify-between gap-4">
        <div>
          <h1 class="text-2xl font-bold text-white">{exercise.title}</h1>
          <p class="text-surface-300 text-sm mt-1">{exercise.subtitle}</p>
        </div>
        <span class="text-xs text-surface-500 mt-1 flex-shrink-0">~{exercise.durationSeconds}s</span>
      </div>
    </div>

    <!-- Steps row -->
    <div class="flex items-start gap-2 overflow-x-auto pb-2">
      {#each exercise.steps as step, i}
        <!-- Arrow between steps -->
        {#if i > 0}
          <div class="flex-shrink-0 self-center px-1">
            <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
              <path d="M6 14h16M17 8l6 6-6 6" stroke="#60a5fa" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </div>
        {/if}

        <!-- Step card -->
        <div class="flex-shrink-0 flex flex-col items-center gap-3 w-44">
          <!-- Image container -->
          <div class="relative w-44 h-44 rounded-xl bg-surface-800 border border-surface-600 flex items-center justify-center overflow-hidden">
            <img
              src={step.imagePath}
              alt="Step {i + 1}"
              class="w-full h-full object-contain"
              on:error={handleImgError(i)}
            />
            <!-- Fallback shown when image fails or is missing -->
            <div class="absolute inset-0 flex flex-col items-center justify-center {imgFailed[i] ? '' : 'opacity-0'} transition-opacity">
              <span class="text-5xl font-bold text-surface-600">{i + 1}</span>
            </div>
          </div>

          <!-- Step label + description -->
          <div class="text-center">
            <span class="text-xs font-semibold text-primary-400 uppercase tracking-widest">Step {i + 1}</span>
            <p class="text-sm text-surface-200 mt-1 leading-snug">{step.description}</p>
          </div>
        </div>
      {/each}
    </div>

    <!-- Actions -->
    <div class="flex items-center justify-between mt-8">
      <p class="text-xs text-surface-500">Press ESC to skip</p>
      <div class="flex gap-3">
        <button
          on:click={handleSkip}
          class="px-5 py-2.5 text-sm font-medium text-surface-300 bg-surface-800 border border-surface-600 rounded-xl hover:bg-surface-700 hover:text-white transition-colors"
        >
          Skip
        </button>
        <button
          on:click={handleDone}
          class="px-8 py-2.5 text-sm font-bold text-white bg-primary-600 rounded-xl hover:bg-primary-500 transition-colors"
        >
          Done ✓
        </button>
      </div>
    </div>

  </div>
</div>
