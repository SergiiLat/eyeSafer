<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { writable } from 'svelte/store'
  import General from './pages/General.svelte'
  import Stimulation from './pages/Stimulation.svelte'
  import Schedule from './pages/Schedule.svelte'
  import Camera from './pages/Camera.svelte'
  import Reports from './pages/Reports.svelte'
  import About from './pages/About.svelte'
  import type { AppSettings } from '../../shared/types'

  type PageId = 'general' | 'stimulation' | 'schedule' | 'camera' | 'reports' | 'about'

  const currentPage = writable<PageId>('general')

  const navItems: { id: PageId; label: string; icon: string }[] = [
    { id: 'general', label: 'General', icon: '⚙' },
    { id: 'stimulation', label: 'Stimulation', icon: '✦' },
    { id: 'schedule', label: 'Schedule', icon: '⏱' },
    { id: 'camera', label: 'Camera', icon: '◎' },
    { id: 'reports', label: 'Reports', icon: '📊' },
    { id: 'about', label: 'About', icon: 'ℹ' }
  ]

  let settings: AppSettings | null = null
  let unsubscribeSettings: (() => void) | null = null
  let unsubscribeMaximize: (() => void) | null = null
  let saving = false
  let saveTimeout: ReturnType<typeof setTimeout> | null = null
  let isMaximized = false

  onMount(async () => {
    settings = await window.api.getSettings()
    unsubscribeSettings = window.api.onSettingsChanged((newSettings) => {
      settings = newSettings
    })
    unsubscribeMaximize = window.api.onMaximizeChanged((maximized) => {
      isMaximized = maximized
    })
  })

  onDestroy(() => {
    unsubscribeSettings?.()
    unsubscribeMaximize?.()
  })

  function handleUpdate(patch: Partial<AppSettings>) {
    if (!settings) return
    settings = { ...settings, ...patch }

    // Debounce saves to avoid hammering IPC
    if (saveTimeout) clearTimeout(saveTimeout)
    saveTimeout = setTimeout(async () => {
      await window.api.setSettings(patch)
    }, 300)
  }
</script>

<div class="flex flex-col h-screen bg-surface-900 text-white overflow-hidden select-none">
  <!-- Custom title bar -->
  <div class="flex items-center justify-between px-4 h-10 bg-surface-950 border-b border-surface-800 flex-shrink-0" style="-webkit-app-region: drag">
    <div class="flex items-center gap-2">
      <span class="text-sm font-medium text-surface-200">EyeSafer</span>
    </div>
    <div class="flex items-center gap-1" style="-webkit-app-region: no-drag">
      <button
        on:click={() => window.api.minimizeWindow()}
        class="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-700 text-surface-400 hover:text-white transition-colors text-lg"
        title="Minimize"
      >─</button>
      <button
        on:click={() => window.api.maximizeWindow()}
        class="w-7 h-7 flex items-center justify-center rounded hover:bg-surface-700 text-surface-400 hover:text-white transition-colors text-xs"
        title={isMaximized ? 'Restore' : 'Maximize'}
      >{isMaximized ? '❐' : '□'}</button>
      <button
        on:click={() => window.api.closeWindow()}
        class="w-7 h-7 flex items-center justify-center rounded hover:bg-red-600 text-surface-400 hover:text-white transition-colors"
        title="Close"
      >✕</button>
    </div>
  </div>

  <!-- Main content -->
  <div class="flex flex-1 overflow-hidden">
    <!-- Sidebar navigation -->
    <nav class="w-44 flex-shrink-0 bg-surface-900 border-r border-surface-800 flex flex-col py-4 gap-1 px-2">
      {#each navItems as item}
        <button
          on:click={() => currentPage.set(item.id)}
          class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all
                 {$currentPage === item.id
                   ? 'bg-primary-900/40 text-primary-400 font-medium'
                   : 'text-surface-200 hover:bg-surface-800 hover:text-white'}"
        >
          <span class="text-base">{item.icon}</span>
          {item.label}
        </button>
      {/each}
    </nav>

    <!-- Page content -->
    <main class="flex-1 overflow-y-auto p-6">
      {#if settings}
        {#if $currentPage === 'general'}
          <General {settings} onUpdate={handleUpdate} />
        {:else if $currentPage === 'stimulation'}
          <Stimulation {settings} onUpdate={handleUpdate} />
        {:else if $currentPage === 'schedule'}
          <Schedule {settings} onUpdate={handleUpdate} />
        {:else if $currentPage === 'camera'}
          <Camera {settings} onUpdate={handleUpdate} />
        {:else if $currentPage === 'reports'}
          <Reports />
        {:else if $currentPage === 'about'}
          <About />
        {/if}
      {:else}
        <div class="flex items-center justify-center h-full">
          <div class="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full"></div>
        </div>
      {/if}
    </main>
  </div>
</div>
