<script lang="ts">
  export let value: string = '09:00'
  export let label: string = ''
  export let onChange: (value: string) => void = () => {}

  function handleChange(event: Event) {
    const target = event.target as HTMLInputElement
    onChange(target.value)
  }
</script>

<div class="space-y-1">
  {#if label}
    <label class="block text-sm font-medium text-white">{label}</label>
  {/if}
  <input
    type="time"
    bind:value
    on:change={handleChange}
    class="bg-surface-800 border border-surface-700 text-white text-sm rounded-lg
           focus:ring-primary-500 focus:border-primary-500 block p-2.5
           [color-scheme:dark]"
  />
</div>
