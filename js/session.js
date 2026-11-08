// What happened on the wheel since the stream started: distance, top speed, time running and blocks found, built from
// the same readings and events the other pages get. Pure: pages feed it and read `stats`.

// "HH:MM" is today's UTC time (yesterday's if that is more than an hour in the future), an ISO string is itself,
// anything else is now.
export function sinceTime(str, now = Date.now()) {
  if (!str) return now
  const m = /^(\d{1,2}):(\d{2})$/.exec(String(str).trim())
  if (m) {
    const d = new Date(now)
    d.setUTCHours(Number(m[1]), Number(m[2]), 0, 0)
    let t = d.getTime()
    if (t - now > 3_600_000) t -= 86_400_000
    return t
  }
  const t = Date.parse(str)
  return Number.isFinite(t) ? t : now
}

export function createSession({ startedAt = Date.now() } = {}) {
  let baseKm = null
  let kmOffset = 0
  let lastKm = null
  let lastAt = null
  let topKmh = 0
  let runSec = 0
  const seen = new Set()
  let blocks = 0
  let settlements = 0

  function push(r) {
    if (!r || !r.online || r.todayKm == null) return
    if (baseKm === null) baseKm = r.todayKm
    // the day rolled over at 00:00 UTC: keep what was run, count the new day from zero
    if (lastKm !== null && r.todayKm < lastKm - 0.001) {
      kmOffset += lastKm - baseKm
      baseKm = 0
    }
    lastKm = r.todayKm
    if (lastAt !== null && r.rpm > 0) runSec += Math.min(60, Math.max(0, (r.at - lastAt) / 1000))
    lastAt = r.at
    if (r.speedKmh > topKmh) topKmh = r.speedKmh
  }

  function events(list) {
    for (const e of list || []) {
      if (!e || seen.has(e.id) || e.type !== 'system.settlement_completed') continue
      const at = Date.parse(e.occurredAt)
      if (!Number.isFinite(at) || at < startedAt) continue
      seen.add(e.id)
      settlements += 1
      blocks += Number((e.payload && e.payload.completedBlockCount) || 0)
    }
  }

  return {
    push,
    events,
    get stats() {
      return { startedAt, km: baseKm === null ? 0 : kmOffset + lastKm - baseKm, topKmh, runSec, blocks, settlements }
    },
  }
}
