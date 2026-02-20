<script lang="ts">
  import Toggle from '../components/Toggle.svelte'
  import Slider from '../components/Slider.svelte'
  import TestButton from '../components/TestButton.svelte'
  import type { AppSettings, StimulationMethod, Intensity } from '../../../shared/types'

  export let settings: AppSettings
  export let onUpdate: (patch: Partial<AppSettings>) => void

  const methods: { id: StimulationMethod; label: string; description: string; icon: string }[] = [
    {
      id: 'cornerMarkers',
      label: 'Corner Markers',
      description: 'Sequential dots appear in corners to guide your eye movement',
      icon: '⊹'
    },
    {
      id: 'blurOverlay',
      label: 'Blur Flash',
      description: 'Brief semi-transparent overlay to signal a break',
      icon: '◉'
    },
    {
      id: 'movingObject',
      label: 'Moving Object',
      description: 'A floating dot to track and exercise your eye muscles',
      icon: '●'
    },
    {
      id: 'colorShift',
      label: 'Color Shift',
      description: 'Warm and cool tint cycles to relax eye strain',
      icon: '◐'
    },
    {
      id: 'figureEight',
      label: 'Figure Eight',
      description: 'A dot traces an infinity path to exercise smooth eye tracking',
      icon: '∞'
    },
    {
      id: 'nearFarFocus',
      label: 'Near-Far Focus',
      description: 'Alternating circle size guides focus between near and far distances',
      icon: '⊙'
    },
    {
      id: 'peripheralTriggers',
      label: 'Peripheral Triggers',
      description: 'Dots appear around screen edges to stimulate peripheral awareness',
      icon: '⬡'
    },
    {
      id: 'guidedBlink',
      label: 'Guided Blink',
      description: 'Visual cue prompts deliberate blinks to re-moisturise eyes',
      icon: '◎'
    },
    {
      id: 'saccadeTraining',
      label: 'Saccade Training',
      description: 'Alternating left-right dots train rapid, accurate eye movements',
      icon: '↔'
    }
  ]

  const intensityOptions: { value: Intensity; label: string }[] = [
    { value: 'low', label: 'Low' },
    { value: 'medium', label: 'Medium' },
    { value: 'high', label: 'High' }
  ]

  const intensityIndex: Record<Intensity, number> = { low: 0, medium: 1, high: 2 }
  const indexToIntensity: Intensity[] = ['low', 'medium', 'high']

  $: intensityValue = intensityIndex[settings.intensity]

  function toggleMethod(id: StimulationMethod, enabled: boolean) {
    onUpdate({
      enabledMethods: { ...settings.enabledMethods, [id]: enabled }
    })
  }

  function testAll() {
    const enabled = Object.entries(settings.enabledMethods)
      .filter(([, e]) => e)
      .map(([m]) => m as StimulationMethod)

    let i = 0
    function triggerNext() {
      if (i >= enabled.length) return
      window.api.testStimulation(enabled[i++])
      setTimeout(triggerNext, 500)
    }
    triggerNext()
  }
</script>

<div class="space-y-8">
  <div>
    <h2 class="text-lg font-semibold text-white mb-1">Stimulation</h2>
    <p class="text-sm text-surface-200">Choose which visual effects are used to remind you to blink</p>
  </div>

  <!-- Methods -->
  <section class="space-y-3">
    <h3 class="text-sm font-medium text-surface-200 uppercase tracking-wider">Methods</h3>
    {#each methods as method}
      <div class="p-4 bg-surface-800 rounded-xl border border-surface-700">
        <div class="flex items-start justify-between gap-4">
          <div class="flex items-start gap-3">
            <span class="text-2xl text-primary-400 mt-0.5">{method.icon}</span>
            <div>
              <span class="block text-sm font-medium text-white">{method.label}</span>
              <span class="block text-xs text-surface-200 mt-0.5">{method.description}</span>
            </div>
          </div>
          <div class="flex items-center gap-3 flex-shrink-0">
            <TestButton
              label="Test"
              onClick={() => window.api.testStimulation(method.id)}
            />
            <Toggle
              checked={settings.enabledMethods[method.id]}
              onChange={(v) => toggleMethod(method.id, v)}
            />
          </div>
        </div>
      </div>
    {/each}
  </section>

  <!-- Intensity -->
  <section class="space-y-4">
    <h3 class="text-sm font-medium text-surface-200 uppercase tracking-wider">Intensity</h3>
    <Slider
      value={intensityValue}
      min={0}
      max={2}
      step={1}
      label="Effect Intensity"
      valueLabels={['Low', 'Medium', 'High']}
      onChange={(v) => onUpdate({ intensity: indexToIntensity[v] })}
    />
  </section>

  <!-- Test All -->
  <section>
    <button
      on:click={testAll}
      class="px-4 py-2 text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 rounded-lg transition-colors"
    >
      Test All Enabled Effects
    </button>
  </section>
</div>
