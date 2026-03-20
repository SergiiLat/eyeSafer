<script lang="ts">
  import Toggle from '../components/Toggle.svelte'
  import type { AppSettings, ScheduleMode } from '../../../shared/types'

  export let settings: AppSettings
  export let onUpdate: (patch: Partial<AppSettings>) => void

  let showResetConfirm = false

  const modes: { value: ScheduleMode; label: string; description: string }[] = [
    { value: 'intensive', label: 'Intensive', description: 'Every 10 minutes — for heavy screen users' },
    { value: 'normal', label: 'Normal', description: 'Every 20 minutes — recommended' },
    { value: 'relaxed', label: 'Relaxed', description: 'Every 30 minutes — for casual use' }
  ]

  function handleReset() {
    window.api.resetSettings()
    showResetConfirm = false
  }

  function setDnd(enabled: boolean) {
    onUpdate({ dndEnabled: enabled, dndUntil: null })
    if (enabled) {
      window.api.setDnd(true)
    } else {
      window.api.setDnd(false)
    }
  }
</script>

<div class="space-y-8">
  <div>
    <h2 class="text-lg font-semibold text-white mb-1">General</h2>
    <p class="text-sm text-surface-200">Application behaviour and notifications</p>
  </div>

  <!-- Active Features -->
  <section class="space-y-4">
    <h3 class="text-sm font-medium text-surface-200 uppercase tracking-wider">Active Features</h3>
    <Toggle
      checked={settings.blinkEnabled}
      label="Blink Monitoring"
      description="Visual micro-stimulation reminders to keep your blink rate healthy"
      onChange={(v) => onUpdate({ blinkEnabled: v })}
    />
    <Toggle
      checked={settings.exercisesEnabled}
      label="Posture Exercises"
      description="Periodic neck, shoulder and spine stretch reminders"
      onChange={(v) => onUpdate({ exercisesEnabled: v })}
    />
    <Toggle
      checked={settings.twentyTwentyEnabled}
      label="20-20-20 Rule"
      description="Every 20 minutes, look 6 metres away for 20 seconds to rest your eyes"
      onChange={(v) => onUpdate({ twentyTwentyEnabled: v })}
    />
  </section>

  <!-- Startup -->
  <section class="space-y-4">
    <h3 class="text-sm font-medium text-surface-200 uppercase tracking-wider">Startup</h3>
    <Toggle
      checked={settings.launchOnStartup}
      label="Launch at login"
      description="Start HealthSafer automatically when you log in"
      onChange={(v) => onUpdate({ launchOnStartup: v })}
    />
  </section>

  <!-- Reminder Mode -->
  <section class="space-y-4">
    <h3 class="text-sm font-medium text-surface-200 uppercase tracking-wider">Reminder Frequency</h3>
    <div class="space-y-2">
      {#each modes as mode}
        <label class="flex items-start gap-3 p-3 rounded-xl cursor-pointer
                      {settings.scheduleMode === mode.value
                        ? 'bg-primary-900/30 border border-primary-700'
                        : 'bg-surface-800 border border-transparent hover:border-surface-600'}
                      transition-all">
          <input
            type="radio"
            name="scheduleMode"
            value={mode.value}
            checked={settings.scheduleMode === mode.value}
            on:change={() => onUpdate({ scheduleMode: mode.value })}
            class="mt-0.5 text-primary-500 border-surface-600 bg-surface-800"
          />
          <div>
            <span class="block text-sm font-medium text-white">{mode.label}</span>
            <span class="block text-xs text-surface-200 mt-0.5">{mode.description}</span>
          </div>
        </label>
      {/each}
    </div>
  </section>

  <!-- Do Not Disturb -->
  <section class="space-y-4">
    <h3 class="text-sm font-medium text-surface-200 uppercase tracking-wider">Do Not Disturb</h3>
    <Toggle
      checked={settings.dndEnabled}
      label="Do Not Disturb"
      description="Temporarily pause all eye care reminders"
      onChange={setDnd}
    />
  </section>

  <!-- Danger Zone -->
  <section class="space-y-4">
    <h3 class="text-sm font-medium text-surface-200 uppercase tracking-wider">Reset</h3>
    {#if !showResetConfirm}
      <button
        on:click={() => { showResetConfirm = true }}
        class="px-4 py-2 text-sm font-medium text-red-400 bg-red-900/20 border border-red-800 rounded-lg hover:bg-red-900/40 transition-colors"
      >
        Reset All Settings
      </button>
    {:else}
      <div class="p-4 bg-red-900/20 border border-red-800 rounded-xl space-y-3">
        <p class="text-sm text-red-300">Are you sure? All settings will be reset to defaults.</p>
        <div class="flex gap-2">
          <button
            on:click={handleReset}
            class="px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-lg hover:bg-red-700 transition-colors"
          >
            Yes, Reset
          </button>
          <button
            on:click={() => { showResetConfirm = false }}
            class="px-4 py-2 text-sm font-medium text-surface-200 bg-surface-700 rounded-lg hover:bg-surface-600 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    {/if}
  </section>
</div>
