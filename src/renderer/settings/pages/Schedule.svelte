<script lang="ts">
  import TimePicker from '../components/TimePicker.svelte'
  import Toggle from '../components/Toggle.svelte'
  import type { AppSettings } from '../../../shared/types'

  export let settings: AppSettings
  export let onUpdate: (patch: Partial<AppSettings>) => void

  const presets: { label: string; start: string; end: string }[] = [
    { label: 'Work Hours', start: '09:00', end: '18:00' },
    { label: 'Long Day', start: '08:00', end: '20:00' },
    { label: 'Evening', start: '18:00', end: '23:00' },
    { label: 'All Day', start: '00:00', end: '23:59' }
  ]

  function applyPreset(preset: typeof presets[0]) {
    onUpdate({ activeWindow: { start: preset.start, end: preset.end } })
  }

  $: isOvernightWindow = settings.activeWindow.start > settings.activeWindow.end
</script>

<div class="space-y-8">
  <div>
    <h2 class="text-lg font-semibold text-white mb-1">Schedule</h2>
    <p class="text-sm text-surface-200">Control when EyeSafer is active</p>
  </div>

  <!-- Active Hours -->
  <section class="space-y-4">
    <h3 class="text-sm font-medium text-surface-200 uppercase tracking-wider">Active Hours</h3>

    <div class="flex items-end gap-4">
      <TimePicker
        value={settings.activeWindow.start}
        label="Start"
        onChange={(v) => onUpdate({ activeWindow: { ...settings.activeWindow, start: v } })}
      />
      <span class="text-surface-200 pb-2.5">to</span>
      <TimePicker
        value={settings.activeWindow.end}
        label="End"
        onChange={(v) => onUpdate({ activeWindow: { ...settings.activeWindow, end: v } })}
      />
    </div>

    {#if isOvernightWindow}
      <p class="text-xs text-amber-400 flex items-center gap-1.5">
        <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
          <path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />
        </svg>
        Overnight window: reminders will span midnight
      </p>
    {/if}
  </section>

  <!-- Quick Presets -->
  <section class="space-y-3">
    <h3 class="text-sm font-medium text-surface-200 uppercase tracking-wider">Quick Presets</h3>
    <div class="flex flex-wrap gap-2">
      {#each presets as preset}
        <button
          on:click={() => applyPreset(preset)}
          class="px-3 py-1.5 text-sm rounded-lg bg-surface-800 border border-surface-700
                 text-surface-200 hover:border-primary-600 hover:text-primary-400 transition-colors"
        >
          {preset.label}
          <span class="ml-1 text-xs opacity-60">{preset.start}–{preset.end}</span>
        </button>
      {/each}
    </div>
  </section>

  <!-- Weekend Toggle -->
  <section class="space-y-4">
    <h3 class="text-sm font-medium text-surface-200 uppercase tracking-wider">Weekends</h3>
    <Toggle
      checked={settings.weekendsEnabled}
      label="Active on weekends"
      description="Show reminders on Saturday and Sunday"
      onChange={(v) => onUpdate({ weekendsEnabled: v })}
    />
  </section>

  <!-- Status Indicator -->
  <section class="p-4 bg-surface-800 rounded-xl border border-surface-700">
    <h3 class="text-sm font-medium text-surface-200 mb-2">Current Status</h3>
    <div class="flex items-center gap-2">
      <div class="w-2 h-2 rounded-full {settings.dndEnabled ? 'bg-amber-400' : 'bg-green-400'}"></div>
      <span class="text-sm text-white">
        {settings.dndEnabled ? 'Paused (Do Not Disturb)' : 'Active'}
      </span>
    </div>
    <p class="text-xs text-surface-200 mt-1">
      Active window: {settings.activeWindow.start} – {settings.activeWindow.end}
      {#if !settings.weekendsEnabled}· Weekdays only{/if}
    </p>
  </section>
</div>
