<script lang="ts">
  export let onClick: () => Promise<void> | void = () => {}
  export let label: string = 'Test'
  export let disabled: boolean = false

  let loading = false
  let success = false

  async function handleClick() {
    if (loading || disabled) return
    loading = true
    success = false
    try {
      await onClick()
      success = true
      setTimeout(() => { success = false }, 1500)
    } finally {
      loading = false
    }
  }
</script>

<button
  on:click={handleClick}
  disabled={loading || disabled}
  class="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg transition-all
         {success
           ? 'bg-green-600 text-white'
           : 'bg-surface-700 text-primary-400 hover:bg-surface-600 hover:text-primary-300'}
         disabled:opacity-50 disabled:cursor-not-allowed"
>
  {#if loading}
    <svg class="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
      <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
      <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
    </svg>
  {:else if success}
    <svg class="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"></path>
    </svg>
  {/if}
  {success ? 'Done!' : label}
</button>
