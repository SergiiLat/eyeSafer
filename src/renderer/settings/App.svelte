<script lang="ts">
  import { onMount, onDestroy } from 'svelte'
  import { writable } from 'svelte/store'
  import General from './pages/General.svelte'
  import Stimulation from './pages/Stimulation.svelte'
  import Schedule from './pages/Schedule.svelte'
  import Camera from './pages/Camera.svelte'
  import Reports from './pages/Reports.svelte'
  import Exercises from './pages/Exercises.svelte'
  import ExerciseReports from './pages/ExerciseReports.svelte'
  import About from './pages/About.svelte'
  import type { AppSettings } from '../../shared/types'

  type PageId = 'general' | 'stimulation' | 'schedule' | 'camera' | 'reports' | 'exercises' | 'exerciseReports' | 'about'

  const currentPage = writable<PageId>('general')

  type NavItem = { id: PageId; label: string; icon: string; requires?: 'blink' | 'exercises' }
  type NavGroup = { label: string; requires?: 'blink' | 'exercises'; items: NavItem[] }

  const navGroups: NavGroup[] = [
    {
      label: 'App',
      items: [
        { id: 'general',  label: 'General',  icon: '⚙' },
        { id: 'schedule', label: 'Schedule', icon: '⏱' },
      ]
    },
    {
      label: 'Blink',
      requires: 'blink',
      items: [
        { id: 'stimulation', label: 'Stimulation',   icon: '✦', requires: 'blink' },
        { id: 'camera',      label: 'Camera',        icon: '◎', requires: 'blink' },
        { id: 'reports',     label: 'Blink Reports', icon: '📊', requires: 'blink' },
      ]
    },
    {
      label: 'Exercises',
      requires: 'exercises',
      items: [
        { id: 'exercises',       label: 'Exercises',    icon: '↻', requires: 'exercises' },
        { id: 'exerciseReports', label: 'Exercise Log', icon: '🏋', requires: 'exercises' },
      ]
    },
    {
      label: 'Other',
      items: [
        { id: 'about', label: 'About', icon: 'ℹ' }
      ]
    }
  ]

  const navItems = navGroups.flatMap(g => g.items)

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

  $: blinkDisabled    = !settings?.blinkEnabled
  $: exercisesDisabled = !settings?.exercisesEnabled

  // Redirect away from disabled pages in the same reactive cycle as the toggle
  $: {
    const page = navItems.find(i => i.id === $currentPage)
    if (page?.requires === 'blink'      && blinkDisabled)     currentPage.set('general')
    if (page?.requires === 'exercises'  && exercisesDisabled) currentPage.set('general')
  }

  function isDisabled(requires: 'blink' | 'exercises' | undefined): boolean {
    if (!requires) return false
    if (requires === 'blink')      return blinkDisabled
    if (requires === 'exercises')  return exercisesDisabled
    return false
  }

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
      <span class="text-sm font-medium text-surface-200">HealthSafer</span>
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
    <nav class="w-44 flex-shrink-0 bg-surface-900 border-r border-surface-800 flex flex-col py-6 px-2 gap-4">
      {#each navGroups as group}
        <div class="flex flex-col gap-0.5">
          <span class="px-3 mb-1 text-xs font-semibold uppercase tracking-wider
                       {isDisabled(group.requires) ? 'text-surface-700' : 'text-surface-500'}">
            {group.label}
          </span>
          {#each group.items as item}
            <button
              on:click={() => !isDisabled(item.requires) && currentPage.set(item.id)}
              disabled={isDisabled(item.requires)}
              class="flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-all
                     {isDisabled(item.requires)
                       ? 'text-surface-600 cursor-not-allowed opacity-40'
                       : $currentPage === item.id
                         ? 'bg-primary-900/40 text-primary-400 font-medium'
                         : 'text-surface-200 hover:bg-surface-800 hover:text-white'}"
            >
              <span class="w-4 text-center leading-none">{item.icon}</span>
              {item.label}
            </button>
          {/each}
        </div>
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
        {:else if $currentPage === 'exercises'}
          <Exercises {settings} onUpdate={handleUpdate} />
        {:else if $currentPage === 'exerciseReports'}
          <ExerciseReports />
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
