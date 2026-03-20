<script lang="ts">
  import { onMount } from 'svelte'
  import type { ExerciseEvent, ExerciseDailySummary } from '../../../shared/types'
  import { EXERCISE_CATALOG } from '../../../shared/exercises'

  let selectedDate = todayStr()
  let events: ExerciseEvent[] = []
  let summary: ExerciseDailySummary | null = null
  let loading = false

  function todayStr(): string {
    return new Date().toISOString().substring(0, 10)
  }

  function prevDay() {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() - 1)
    selectedDate = d.toISOString().substring(0, 10)
  }

  function nextDay() {
    const d = new Date(selectedDate)
    d.setDate(d.getDate() + 1)
    if (d.toISOString().substring(0, 10) <= todayStr()) {
      selectedDate = d.toISOString().substring(0, 10)
    }
  }

  function formatDate(str: string): string {
    return new Date(str).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  }

  function formatTime(iso: string): string {
    const d = new Date(iso)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  async function loadData() {
    loading = true
    try {
      const [ev, sum] = await Promise.all([
        window.api.getExerciseEvents(selectedDate),
        window.api.getExerciseSummary(selectedDate)
      ])
      events = ev
      summary = sum
    } catch (err) {
      console.error('Failed to load exercise data:', err)
    } finally {
      loading = false
    }
  }

  $: selectedDate && loadData()

  function exerciseName(id: string): string {
    const def = EXERCISE_CATALOG[id as keyof typeof EXERCISE_CATALOG]
    return def?.title ?? id
  }
</script>

<div class="space-y-6">
  <!-- Header + Date nav -->
  <div class="flex items-center justify-between flex-wrap gap-3">
    <div>
      <h2 class="text-lg font-semibold text-white mb-1">Exercise Reports</h2>
      <p class="text-sm text-surface-200">Daily posture exercise completion history</p>
    </div>
    <div class="flex items-center gap-2">
      <button on:click={prevDay} class="p-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-200 hover:text-white transition-colors">◀</button>
      <button
        on:click={() => { selectedDate = todayStr() }}
        class="px-3 py-1.5 text-sm rounded-lg bg-surface-800 hover:bg-surface-700 text-white transition-colors font-medium"
      >
        {selectedDate === todayStr() ? 'Today' : formatDate(selectedDate)}
      </button>
      <button
        on:click={nextDay}
        disabled={selectedDate >= todayStr()}
        class="p-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-200 hover:text-white transition-colors
               {selectedDate >= todayStr() ? 'opacity-40 cursor-not-allowed' : ''}"
      >▶</button>
      <input
        type="date"
        bind:value={selectedDate}
        max={todayStr()}
        class="bg-surface-800 border border-surface-700 text-white text-sm rounded-lg px-2.5 py-1.5"
      />
    </div>
  </div>

  {#if loading}
    <div class="flex justify-center py-12">
      <div class="animate-spin w-8 h-8 border-2 border-primary-500 border-t-transparent rounded-full"></div>
    </div>
  {:else}

    <!-- Summary cards -->
    {#if summary && summary.totalTriggered > 0}
      <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div class="p-4 bg-surface-800 rounded-xl border border-surface-700">
          <p class="text-xs text-surface-400 mb-1">Total Shown</p>
          <p class="text-xl font-bold text-white">{summary.totalTriggered}</p>
        </div>
        <div class="p-4 bg-surface-800 rounded-xl border border-surface-700">
          <p class="text-xs text-surface-400 mb-1">Completed</p>
          <p class="text-xl font-bold text-green-400">{summary.totalCompleted}</p>
        </div>
        <div class="p-4 bg-surface-800 rounded-xl border border-surface-700">
          <p class="text-xs text-surface-400 mb-1">Skipped</p>
          <p class="text-xl font-bold text-surface-300">{summary.totalSkipped}</p>
        </div>
        <div class="p-4 bg-surface-800 rounded-xl border border-surface-700">
          <p class="text-xs text-surface-400 mb-1">Completion Rate</p>
          <p class="text-xl font-bold {summary.completionRate >= 75 ? 'text-green-400' : summary.completionRate >= 40 ? 'text-yellow-400' : 'text-red-400'}">
            {summary.completionRate}%
          </p>
        </div>
      </div>

      <!-- Completion bar -->
      <div class="bg-surface-800 rounded-xl border border-surface-700 p-4">
        <div class="flex items-center justify-between mb-2">
          <span class="text-sm font-medium text-white">Completion Rate</span>
          <span class="text-sm text-surface-300">{summary.completionRate}%</span>
        </div>
        <div class="w-full h-3 bg-surface-700 rounded-full overflow-hidden">
          <div
            class="h-full rounded-full transition-all duration-500 {summary.completionRate >= 75 ? 'bg-green-500' : summary.completionRate >= 40 ? 'bg-yellow-500' : 'bg-red-500'}"
            style="width: {summary.completionRate}%"
          ></div>
        </div>
      </div>
    {/if}

    <!-- Events table -->
    {#if events.length > 0}
      <div class="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
        <div class="px-4 py-3 border-b border-surface-700">
          <h3 class="text-sm font-medium text-white">Exercise Log</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-surface-400 text-xs border-b border-surface-700">
                <th class="text-left px-4 py-2">Time</th>
                <th class="text-left px-4 py-2">Exercise</th>
                <th class="text-right px-4 py-2">Status</th>
              </tr>
            </thead>
            <tbody>
              {#each events as ev}
                <tr class="border-b border-surface-700/50 hover:bg-surface-700/30 transition-colors">
                  <td class="px-4 py-2.5 text-surface-200 font-mono text-xs">{formatTime(ev.triggeredAt)}</td>
                  <td class="px-4 py-2.5 text-white">{exerciseName(ev.exerciseId)}</td>
                  <td class="px-4 py-2.5 text-right">
                    {#if ev.completed}
                      <span class="inline-flex items-center gap-1 text-xs font-medium text-green-400 bg-green-900/30 border border-green-800/50 rounded-full px-2.5 py-0.5">
                        ✓ Done
                      </span>
                    {:else}
                      <span class="inline-flex items-center gap-1 text-xs font-medium text-surface-400 bg-surface-700/50 border border-surface-600/50 rounded-full px-2.5 py-0.5">
                        — Skipped
                      </span>
                    {/if}
                  </td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {:else}
      <div class="flex flex-col items-center justify-center py-16 text-center">
        <div class="text-4xl mb-3">🏋️</div>
        <p class="text-surface-200 text-sm">No exercise data for {formatDate(selectedDate)}</p>
        <p class="text-surface-400 text-xs mt-1">Exercises are logged when triggered by the scheduler.</p>
      </div>
    {/if}

  {/if}
</div>
