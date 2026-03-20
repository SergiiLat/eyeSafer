<script lang="ts">
  import Toggle from '../components/Toggle.svelte'
  import TestButton from '../components/TestButton.svelte'
  import type { AppSettings, ExerciseId, EffectOrder } from '../../../shared/types'
  import { EXERCISE_CATALOG } from '../../../shared/exercises'

  export let settings: AppSettings
  export let onUpdate: (patch: Partial<AppSettings>) => void

  const exercises: { id: ExerciseId; icon: string }[] = [
    { id: 'chinTuck', icon: '↩' },
    { id: 'chestOpener', icon: '⟷' },
    { id: 'neckMassage', icon: '⊙' },
    { id: 'shoulderRolls', icon: '↻' },
    { id: 'spinalTwist', icon: '↺' }
  ]

  const orderOptions: { value: EffectOrder; label: string; desc: string }[] = [
    { value: 'sequential', label: 'Sequential', desc: 'Rotate through enabled exercises one by one' },
    { value: 'random', label: 'Random', desc: 'Pick a random exercise each time' }
  ]

  // Interval presets in minutes
  const intervalPresets = [15, 30, 45, 60, 90, 120]

  function toggleExercise(id: ExerciseId, enabled: boolean) {
    onUpdate({ enabledExercises: { ...settings.enabledExercises, [id]: enabled } })
  }

  $: isExerciseActive = settings.exercisesEnabled
  $: enabledCount = Object.values(settings.enabledExercises).filter(Boolean).length
</script>

<div class="space-y-8">
  <div>
    <h2 class="text-lg font-semibold text-white mb-1">Posture Exercises</h2>
    <p class="text-sm text-surface-200">Back, neck and shoulder exercises with step-by-step overlay</p>
  </div>

  {#if !isExerciseActive}
    <div class="p-4 bg-surface-800 border border-surface-600 rounded-xl text-sm text-surface-300">
      Exercises are disabled. Go to <span class="text-primary-400 font-medium">General → Active Features</span> and select "Both" or "Exercises only".
    </div>
  {/if}

  <!-- Exercises list -->
  <section class="space-y-3">
    <h3 class="text-sm font-medium text-surface-200 uppercase tracking-wider">Exercises</h3>
    {#each exercises as ex}
      {@const def = EXERCISE_CATALOG[ex.id]}
      <div class="p-4 bg-surface-800 rounded-xl border border-surface-700 {!isExerciseActive ? 'opacity-50' : ''}">
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-start gap-3">
            <span class="text-2xl text-primary-400 mt-0.5 font-mono">{ex.icon}</span>
            <div>
              <span class="block text-sm font-medium text-white">{def.title}</span>
              <span class="block text-xs text-surface-200 mt-0.5">{def.subtitle}</span>
              <span class="block text-xs text-surface-500 mt-1">{def.steps.length} steps · ~{def.durationSeconds}s</span>
            </div>
          </div>
          <div class="flex items-center gap-3 flex-shrink-0">
            <TestButton
              label="Test"
              onClick={() => window.api.testExercise(ex.id)}
            />
            <Toggle
              checked={settings.enabledExercises[ex.id]}
              onChange={(v) => toggleExercise(ex.id, v)}
            />
          </div>
        </div>
      </div>
    {/each}
  </section>

  <!-- Interval -->
  <section class="space-y-3 {!isExerciseActive ? 'opacity-50 pointer-events-none' : ''}">
    <h3 class="text-sm font-medium text-surface-200 uppercase tracking-wider">Interval</h3>
    <p class="text-xs text-surface-400">How often to show an exercise reminder</p>
    <div class="flex flex-wrap gap-2">
      {#each intervalPresets as min}
        <button
          on:click={() => onUpdate({ exerciseIntervalMinutes: min })}
          class="px-4 py-2 text-sm rounded-xl border transition-colors {settings.exerciseIntervalMinutes === min
            ? 'bg-primary-600/20 border-primary-500 text-white'
            : 'bg-surface-800 border-surface-700 text-surface-300 hover:border-surface-500 hover:text-white'}"
        >
          {min >= 60 ? `${min / 60}h` : `${min}m`}
        </button>
      {/each}
    </div>
  </section>

  <!-- Order -->
  <section class="space-y-3 {!isExerciseActive ? 'opacity-50 pointer-events-none' : ''}">
    <h3 class="text-sm font-medium text-surface-200 uppercase tracking-wider">Playback Order</h3>
    <div class="flex gap-3">
      {#each orderOptions as opt}
        <button
          on:click={() => onUpdate({ exerciseOrder: opt.value })}
          class="flex-1 px-4 py-3 text-sm rounded-xl border transition-colors text-left {settings.exerciseOrder === opt.value
            ? 'bg-primary-600/20 border-primary-500 text-white'
            : 'bg-surface-800 border-surface-700 text-surface-300 hover:border-surface-500 hover:text-white'}"
        >
          <span class="block font-medium mb-0.5">{opt.label}</span>
          <span class="block text-xs {settings.exerciseOrder === opt.value ? 'text-primary-300' : 'text-surface-400'}">{opt.desc}</span>
        </button>
      {/each}
    </div>
  </section>

  <!-- Image setup guide -->
  <section class="space-y-3">
    <h3 class="text-sm font-medium text-surface-200 uppercase tracking-wider">Image Setup</h3>
    <div class="p-4 bg-surface-800 rounded-xl border border-surface-700 text-xs text-surface-300 space-y-2">
      <p class="text-surface-200 font-medium">Add exercise images to <code class="bg-surface-700 px-1.5 py-0.5 rounded">public/exercises/</code></p>
      <div class="space-y-1.5 mt-3">
        {#each exercises as ex}
          {@const def = EXERCISE_CATALOG[ex.id]}
          <div>
            <span class="text-surface-400">{def.title}:</span>
            <span class="text-surface-500 ml-1">{def.steps.map((_, i) => `${ex.id.replace(/([A-Z])/g, '-$1').toLowerCase()}-${i+1}.png`).join(', ')}</span>
          </div>
        {/each}
      </div>
    </div>
  </section>

  {#if enabledCount === 0}
    <p class="text-xs text-yellow-500">No exercises are enabled — enable at least one above.</p>
  {/if}
</div>
