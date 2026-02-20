<script lang="ts">
  export let checked: boolean = false
  export let label: string = ''
  export let description: string = ''
  export let onChange: (value: boolean) => void = () => {}

  function handleChange(event: Event) {
    const target = event.target as HTMLInputElement
    onChange(target.checked)
  }
</script>

<label class="flex items-start gap-3 cursor-pointer group">
  <div class="relative mt-0.5">
    <input
      type="checkbox"
      bind:checked
      on:change={handleChange}
      class="sr-only peer"
    />
    <div class="w-11 h-6 bg-surface-700 peer-checked:bg-primary-500 rounded-full transition-colors duration-200 peer-focus:ring-2 peer-focus:ring-primary-400 peer-focus:ring-offset-2 peer-focus:ring-offset-surface-900"></div>
    <div class="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200 peer-checked:translate-x-5"></div>
  </div>
  {#if label || description}
    <div class="flex-1 min-w-0">
      {#if label}
        <span class="block text-sm font-medium text-white">{label}</span>
      {/if}
      {#if description}
        <span class="block text-xs text-surface-200 mt-0.5">{description}</span>
      {/if}
    </div>
  {/if}
</label>
