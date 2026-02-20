<script lang="ts">
  export let value: number = 0
  export let min: number = 0
  export let max: number = 100
  export let step: number = 1
  export let label: string = ''
  export let valueLabels: string[] = []
  export let onChange: (value: number) => void = () => {}

  function handleInput(event: Event) {
    const target = event.target as HTMLInputElement
    value = Number(target.value)
    onChange(value)
  }

  $: displayValue = valueLabels.length > 0
    ? valueLabels[Math.round((value - min) / ((max - min) / (valueLabels.length - 1)))] ?? value
    : value
</script>

<div class="space-y-2">
  {#if label}
    <div class="flex justify-between items-center">
      <span class="text-sm font-medium text-white">{label}</span>
      <span class="text-sm text-primary-400 font-medium">{displayValue}</span>
    </div>
  {/if}
  <input
    type="range"
    {min}
    {max}
    {step}
    {value}
    on:input={handleInput}
    class="w-full h-2 bg-surface-700 rounded-lg appearance-none cursor-pointer
           [&::-webkit-slider-thumb]:appearance-none
           [&::-webkit-slider-thumb]:w-4
           [&::-webkit-slider-thumb]:h-4
           [&::-webkit-slider-thumb]:bg-primary-500
           [&::-webkit-slider-thumb]:rounded-full
           [&::-webkit-slider-thumb]:cursor-pointer
           [&::-webkit-slider-thumb]:transition-transform
           [&::-webkit-slider-thumb]:hover:scale-110"
  />
  {#if valueLabels.length > 0}
    <div class="flex justify-between text-xs text-surface-200">
      {#each valueLabels as vLabel}
        <span>{vLabel}</span>
      {/each}
    </div>
  {/if}
</div>
