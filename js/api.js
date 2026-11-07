// Squeekchain's public API: no key, CORS open. A body with "status": "unavailable" means unknown, never zero.
export const API = 'https://api.squeekchain.com/v1'

export async function getJson(path, { fetchImpl = globalThis.fetch, timeoutMs = 8000 } = {}) {
  const ctl = new AbortController()
  const timer = setTimeout(() => ctl.abort(), timeoutMs)
  try {
    const res = await fetchImpl(API + path, { signal: ctl.signal, headers: { accept: 'application/json' } })
    if (res.status === 429 || res.status === 503) return { ok: false, retryAfter: Number(res.headers.get('retry-after')) || 10 }
    if (!res.ok) return { ok: false }
    const data = await res.json()
    if (data && data.status === 'unavailable') return { ok: false, unavailable: true, data }
    return { ok: true, data }
  } catch {
    return { ok: false }
  } finally {
    clearTimeout(timer)
  }
}

const num = (v) => (v === null || v === undefined || v === '' ? null : Number(v))

// One /v1/status answer as the numbers the pages draw. Offline (freshness not "online") means no motion is shown.
export function toReading(json, at = Date.now()) {
  const m = (json && json.measurement) || {}
  const anchor = (json && json.builder && json.builder.anchor) || {}
  const online = m.freshness === 'online'
  const distance = num(m.distanceMm)
  const progress = num(anchor.blockProgress)
  return {
    at,
    online,
    rpm: online ? (num(m.rpmMilli) ?? 0) / 1000 : 0,
    speedKmh: online ? (num(m.speedMmPerSecond) ?? 0) * 0.0036 : 0,
    todayKm: distance === null ? null : distance / 1e6,
    block: num(anchor.blockHeight),
    progress: progress === null ? null : progress / 1e9,
    settled: num(anchor.settledThroughRound),
    status: m.coreStatus ?? null,
  }
}
