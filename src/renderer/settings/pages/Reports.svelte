<script lang="ts">
  import { onMount, onDestroy, tick } from 'svelte'
  import type { BlinkMinute, DailySummary, Session } from '../../../shared/types'

  // ── State ─────────────────────────────────────────────────────────────────
  let selectedDate = todayStr()
  let targetBpm = 12
  let minuteData: BlinkMinute[] = []
  let summary: DailySummary | null = null
  let sessions: Session[] = []
  let prevSummary: DailySummary | null = null
  let loading = false

  let canvas: HTMLCanvasElement
  let canvasContainer: HTMLDivElement
  let tooltip = { visible: false, x: 0, y: 0, bpm: 0, time: '' }

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
    const today = todayStr()
    if (d.toISOString().substring(0, 10) <= today) {
      selectedDate = d.toISOString().substring(0, 10)
    }
  }

  function formatDate(str: string): string {
    const d = new Date(str)
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })
  }

  async function loadData() {
    loading = true
    try {
      const [mins, sum, sess] = await Promise.all([
        window.api.getReportDaily(selectedDate),
        window.api.getReportDailySummary(selectedDate),
        window.api.getReportSessions(selectedDate)
      ])
      minuteData = mins
      summary = sum
      sessions = sess

      // Load previous day for deltas
      const prev = new Date(selectedDate)
      prev.setDate(prev.getDate() - 1)
      prevSummary = await window.api.getReportDailySummary(prev.toISOString().substring(0, 10))

      await tick()
      drawChart()
    } catch (err) {
      console.error('Failed to load report data:', err)
    } finally {
      loading = false
    }
  }

  // ── BPM Timeline Chart ────────────────────────────────────────────────────

  function drawChart() {
    if (!canvas || !canvasContainer) return
    const dpr = window.devicePixelRatio || 1
    const w = canvasContainer.clientWidth
    const h = 240
    canvas.width = w * dpr
    canvas.height = h * dpr
    canvas.style.width = `${w}px`
    canvas.style.height = `${h}px`

    const ctx = canvas.getContext('2d')!
    ctx.scale(dpr, dpr)
    ctx.clearRect(0, 0, w, h)

    if (minuteData.length === 0) {
      ctx.fillStyle = '#94a3b8'
      ctx.font = '14px system-ui'
      ctx.textAlign = 'center'
      ctx.fillText('No data for this day', w / 2, h / 2)
      return
    }

    const pad = { top: 20, right: 16, bottom: 40, left: 44 }
    const chartW = w - pad.left - pad.right
    const chartH = h - pad.top - pad.bottom

    const bpmValues = minuteData.map(d => d.bpm)
    const bpmMax = Math.max(...bpmValues, targetBpm * 1.5, 20)
    const times = minuteData.map(d => new Date(d.minuteTs).getTime())
    const tMin = times[0]
    const tMax = times[times.length - 1] || tMin + 1

    const xScale = (t: number) => pad.left + ((t - tMin) / (tMax - tMin || 1)) * chartW
    const yScale = (bpm: number) => pad.top + chartH - Math.min(1, bpm / bpmMax) * chartH
    const yTarget = yScale(targetBpm)

    // Background grid
    ctx.strokeStyle = '#334155'
    ctx.lineWidth = 1
    const gridLines = 4
    for (let i = 0; i <= gridLines; i++) {
      const y = pad.top + (chartH / gridLines) * i
      ctx.beginPath()
      ctx.moveTo(pad.left, y)
      ctx.lineTo(w - pad.right, y)
      ctx.stroke()
      const bpmLabel = Math.round(bpmMax * (1 - i / gridLines))
      ctx.fillStyle = '#94a3b8'
      ctx.font = '10px system-ui'
      ctx.textAlign = 'right'
      ctx.fillText(String(bpmLabel), pad.left - 6, y + 4)
    }

    // Area fills: green above target, red below
    for (let i = 1; i < minuteData.length; i++) {
      const x0 = xScale(times[i - 1])
      const x1 = xScale(times[i])
      const y0 = yScale(bpmValues[i - 1])
      const y1 = yScale(bpmValues[i])

      // Green portion (above target line)
      ctx.fillStyle = 'rgba(34, 197, 94, 0.35)'
      ctx.beginPath()
      ctx.moveTo(x0, Math.min(y0, yTarget))
      ctx.lineTo(x1, Math.min(y1, yTarget))
      ctx.lineTo(x1, yTarget)
      ctx.lineTo(x0, yTarget)
      ctx.closePath()
      ctx.fill()

      // Red portion (below target line)
      ctx.fillStyle = 'rgba(239, 68, 68, 0.35)'
      ctx.beginPath()
      ctx.moveTo(x0, Math.max(y0, yTarget))
      ctx.lineTo(x1, Math.max(y1, yTarget))
      ctx.lineTo(x1, pad.top + chartH)
      ctx.lineTo(x0, pad.top + chartH)
      ctx.closePath()
      ctx.fill()
    }

    // Line
    ctx.strokeStyle = '#60a5fa'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    minuteData.forEach((d, i) => {
      const x = xScale(times[i])
      const y = yScale(d.bpm)
      i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
    })
    ctx.stroke()

    // Target dashed line
    ctx.setLineDash([5, 4])
    ctx.strokeStyle = 'rgba(251, 191, 36, 0.7)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(pad.left, yTarget)
    ctx.lineTo(w - pad.right, yTarget)
    ctx.stroke()
    ctx.setLineDash([])

    // Target label
    ctx.fillStyle = 'rgba(251, 191, 36, 0.9)'
    ctx.font = '10px system-ui'
    ctx.textAlign = 'left'
    ctx.fillText(`target ${targetBpm}`, w - pad.right + 2, yTarget + 4)

    // Time axis labels
    const labelCount = Math.min(minuteData.length, 6)
    ctx.fillStyle = '#94a3b8'
    ctx.font = '10px system-ui'
    ctx.textAlign = 'center'
    for (let i = 0; i < labelCount; i++) {
      const idx = Math.round((i / (labelCount - 1)) * (minuteData.length - 1))
      const x = xScale(times[idx])
      const t = new Date(times[idx])
      const label = `${t.getHours().toString().padStart(2, '0')}:${t.getMinutes().toString().padStart(2, '0')}`
      ctx.fillText(label, x, h - 8)
    }
  }

  function handleCanvasMouseMove(e: MouseEvent) {
    if (!canvas || minuteData.length === 0) return
    const rect = canvas.getBoundingClientRect()
    const mouseX = e.clientX - rect.left
    const pad = { left: 44, right: 16 }
    const chartW = rect.width - pad.left - pad.right
    const times = minuteData.map(d => new Date(d.minuteTs).getTime())
    const tMin = times[0]
    const tMax = times[times.length - 1]
    const t = tMin + ((mouseX - pad.left) / chartW) * (tMax - tMin)

    const closest = minuteData.reduce((prev, curr, i) =>
      Math.abs(times[i] - t) < Math.abs(new Date(prev.minuteTs).getTime() - t) ? curr : prev
    )
    const d = new Date(closest.minuteTs)
    tooltip = {
      visible: true,
      x: e.offsetX,
      y: e.offsetY - 40,
      bpm: Math.round(closest.bpm * 10) / 10,
      time: `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
    }
  }

  function handleCanvasMouseLeave() {
    tooltip = { ...tooltip, visible: false }
  }

  // ── Helpers ────────────────────────────────────────────────────────────────

  function formatDuration(seconds: number | null): string {
    if (!seconds) return '—'
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    return h > 0 ? `${h}h ${m}m` : `${m}m`
  }

  function formatTime(iso: string | null): string {
    if (!iso) return '—'
    const d = new Date(iso)
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`
  }

  function delta(current: number | null, prev: number | null): string {
    if (current === null || prev === null) return ''
    const diff = current - prev
    const sign = diff > 0 ? '+' : ''
    return `${sign}${Math.round(diff * 10) / 10}`
  }

  function deltaClass(current: number | null, prev: number | null, higherIsBetter = true): string {
    if (current === null || prev === null) return 'text-surface-400'
    const better = higherIsBetter ? current >= prev : current <= prev
    return better ? 'text-green-400' : 'text-red-400'
  }

  function healthColor(score: number | null): string {
    if (!score) return 'text-surface-400'
    if (score >= 75) return 'text-green-400'
    if (score >= 50) return 'text-yellow-400'
    return 'text-red-400'
  }

  // ── Reactive ───────────────────────────────────────────────────────────────
  $: if (selectedDate) loadData()
  $: if (targetBpm && canvas) drawChart()

  let resizeObserver: ResizeObserver
  onMount(() => {
    resizeObserver = new ResizeObserver(() => drawChart())
    if (canvasContainer) resizeObserver.observe(canvasContainer)
  })
  onDestroy(() => resizeObserver?.disconnect())
</script>

<div class="space-y-6">
  <!-- Header + Date nav -->
  <div class="flex items-center justify-between flex-wrap gap-3">
    <div>
      <h2 class="text-lg font-semibold text-white mb-1">Reports</h2>
      <p class="text-sm text-surface-200">Blink rate history and session data</p>
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
        class="p-1.5 rounded-lg bg-surface-800 hover:bg-surface-700 text-surface-200 hover:text-white transition-colors
               {selectedDate >= todayStr() ? 'opacity-40 cursor-not-allowed' : ''}"
        disabled={selectedDate >= todayStr()}
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

    <!-- Summary Cards -->
    <div class="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {#each [
        { label: 'Screen Time', value: formatDuration(summary?.totalScreenTimeMinutes ? summary.totalScreenTimeMinutes * 60 : null), prevVal: prevSummary?.totalScreenTimeMinutes ?? null, curVal: summary?.totalScreenTimeMinutes ?? null, higherBetter: true },
        { label: 'Avg BPM', value: summary?.avgBpm != null ? (Math.round(summary.avgBpm * 10) / 10).toString() : '—', prevVal: prevSummary?.avgBpm ?? null, curVal: summary?.avgBpm ?? null, higherBetter: true },
        { label: 'Total Blinks', value: summary?.totalBlinks?.toLocaleString() ?? '—', prevVal: prevSummary?.totalBlinks ?? null, curVal: summary?.totalBlinks ?? null, higherBetter: true },
        { label: 'Health Score', value: summary?.healthScore != null ? `${summary.healthScore}/100` : '—', prevVal: prevSummary?.healthScore ?? null, curVal: summary?.healthScore ?? null, higherBetter: true }
      ] as card}
        <div class="p-4 bg-surface-800 rounded-xl border border-surface-700">
          <p class="text-xs text-surface-400 mb-1">{card.label}</p>
          <p class="text-xl font-bold text-white">{card.value}</p>
          {#if card.prevVal !== null && card.curVal !== null}
            <p class="text-xs mt-1 {deltaClass(card.curVal, card.prevVal, card.higherBetter)}">
              {delta(card.curVal, card.prevVal)} vs yesterday
            </p>
          {/if}
        </div>
      {/each}
    </div>

    <!-- BPM Timeline Chart -->
    <div class="bg-surface-800 rounded-xl border border-surface-700 p-4">
      <div class="flex items-center justify-between mb-3">
        <div>
          <span class="text-sm font-medium text-white">BPM Timeline</span>
          {#if summary?.avgBpm != null}
            <span class="text-surface-400 text-sm ml-2">avg {Math.round(summary.avgBpm * 10) / 10} BPM</span>
          {/if}
        </div>
        <div class="flex items-center gap-2">
          <span class="text-xs text-surface-400">Target BPM</span>
          <input
            type="number"
            bind:value={targetBpm}
            min="5" max="30" step="1"
            class="w-16 bg-surface-700 border border-surface-600 text-white text-sm rounded px-2 py-0.5"
          />
        </div>
      </div>

      <!-- Canvas chart -->
      <div bind:this={canvasContainer} class="relative w-full">
        <canvas
          bind:this={canvas}
          on:mousemove={handleCanvasMouseMove}
          on:mouseleave={handleCanvasMouseLeave}
          class="block w-full cursor-crosshair"
          style="height: 240px"
        ></canvas>

        {#if tooltip.visible}
          <div
            class="absolute pointer-events-none bg-surface-900 border border-surface-600 rounded px-2 py-1 text-xs text-white z-10"
            style="left: {tooltip.x}px; top: {tooltip.y}px; transform: translateX(-50%)"
          >
            {tooltip.time} — {tooltip.bpm} BPM
          </div>
        {/if}
      </div>

      <div class="flex gap-4 mt-2 text-xs">
        <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm bg-green-500/40 inline-block"></span> Above target</span>
        <span class="flex items-center gap-1"><span class="w-3 h-3 rounded-sm bg-red-500/40 inline-block"></span> Below target</span>
      </div>
    </div>

    <!-- Session History Table -->
    {#if sessions.length > 0}
      <div class="bg-surface-800 rounded-xl border border-surface-700 overflow-hidden">
        <div class="px-4 py-3 border-b border-surface-700">
          <h3 class="text-sm font-medium text-white">Sessions</h3>
        </div>
        <div class="overflow-x-auto">
          <table class="w-full text-sm">
            <thead>
              <tr class="text-surface-400 text-xs border-b border-surface-700">
                <th class="text-left px-4 py-2">Start</th>
                <th class="text-left px-4 py-2">End</th>
                <th class="text-left px-4 py-2">Duration</th>
                <th class="text-right px-4 py-2">Avg BPM</th>
                <th class="text-right px-4 py-2">Blinks</th>
                <th class="text-right px-4 py-2">Stimulations</th>
              </tr>
            </thead>
            <tbody>
              {#each sessions as session}
                <tr class="border-b border-surface-700/50 hover:bg-surface-700/30 transition-colors">
                  <td class="px-4 py-2.5 text-surface-200">{formatTime(session.startedAt)}</td>
                  <td class="px-4 py-2.5 text-surface-200">{session.endedAt ? formatTime(session.endedAt) : '—'}</td>
                  <td class="px-4 py-2.5 text-surface-200">{formatDuration(session.durationSeconds)}</td>
                  <td class="px-4 py-2.5 text-right font-mono {session.avgBpm && session.avgBpm >= targetBpm ? 'text-green-400' : 'text-red-400'}">
                    {session.avgBpm != null ? Math.round(session.avgBpm * 10) / 10 : '—'}
                  </td>
                  <td class="px-4 py-2.5 text-right text-surface-200">{session.totalBlinks?.toLocaleString() ?? '—'}</td>
                  <td class="px-4 py-2.5 text-right text-surface-200">{session.stimulationsTriggered ?? '—'}</td>
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
      </div>
    {/if}

    {#if minuteData.length === 0 && !loading}
      <div class="flex flex-col items-center justify-center py-16 text-center">
        <div class="text-4xl mb-3">📊</div>
        <p class="text-surface-200 text-sm">No data for {formatDate(selectedDate)}</p>
        <p class="text-surface-400 text-xs mt-1">Data is recorded while EyeSafer is running and your camera is active.</p>
      </div>
    {/if}

    <!-- Export -->
    {#if minuteData.length > 0}
      <div class="flex justify-end">
        <button
          on:click={async () => {
            const path = await window.api.exportReportCsv(selectedDate, selectedDate)
            if (path) alert(`Exported to: ${path}`)
          }}
          class="px-4 py-2 text-sm font-medium text-white bg-surface-700 rounded-lg hover:bg-surface-600 transition-colors"
        >
          Export CSV
        </button>
      </div>
    {/if}

  {/if}
</div>
