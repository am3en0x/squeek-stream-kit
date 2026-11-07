// The activity feed: which items are new since the page opened, and what each says on an alert card and in the
// ticker. Amounts arrive as decimal strings: distances in millimetres, speeds in mm/s, SQK in base units (18 decimals).

export function createFeed() {
  const seen = new Set()
  let primed = false
  return {
    // A page of events (newest first, as the API sends them) in; the unseen ones out, oldest first. The first page is
    // only remembered, so reloading an overlay never replays what already happened.
    ingest(events) {
      const fresh = []
      for (const e of events || []) {
        if (!e || typeof e.id !== 'string' || seen.has(e.id)) continue
        seen.add(e.id)
        if (primed) fresh.push(e)
      }
      primed = true
      return fresh.reverse()
    },
  }
}

export const group = (n) => Math.round(Number(n)).toLocaleString('en-US')
export const kmhText = (mmps) => (Number(mmps) * 0.0036).toFixed(1)
export const wholeKm = (mm) => String(Math.round(Number(mm) / 1e6))
export const short = (a) => (typeof a === 'string' && a.length > 12 ? `${a.slice(0, 6)}…${a.slice(-4)}` : String(a))

export function sqkText(baseUnits) {
  let milli
  try { milli = Number(BigInt(baseUnits) / 10n ** 15n) } catch { return '?' }
  const v = milli / 1000
  return v >= 1000 ? group(v) : v.toFixed(1)
}

export function agoText(iso, now = Date.now()) {
  const s = Math.max(0, (now - Date.parse(iso)) / 1000)
  if (!Number.isFinite(s) || s < 60) return 'now'
  if (s < 3600) return `${Math.floor(s / 60)} min ago`
  if (s < 86400) return `${Math.floor(s / 3600)} h ago`
  return `${Math.floor(s / 86400)} d ago`
}

// The alert card for a feed item, or null when it is not alert-worthy.
export function alertFor(e) {
  const p = (e && e.payload) || {}
  switch (e && e.type) {
    case 'system.settlement_completed': {
      const n = Number(p.completedBlockCount || 0)
      if (!n) return null
      return { kind: 'block', title: n > 1 ? `${n} BLOCKS FOUND` : 'BLOCK FOUND', detail: `SQUEEK BLOCK #${group(p.lastCompletedBlock ?? p.blockHeight)}` }
    }
    case 'measurement.speed_record':
      return { kind: 'record', title: 'NEW TOP SPEED', detail: `${kmhText(p.recordMmPerSecond)} KM/H` }
    case 'measurement.distance_milestone':
      return { kind: 'distance', title: `${wholeKm(p.thresholdDistanceMm)} KM`, detail: 'ON THE WHEEL, ALL TIME' }
    case 'measurement.daily_distance_milestone':
      return { kind: 'distance', title: `${wholeKm(p.thresholdDistanceMm)} KM IN A DAY`, detail: 'NEW DAILY MILESTONE' }
    case 'measurement.distance_streak':
      return { kind: 'streak', title: `${p.days}-DAY STREAK`, detail: `${wholeKm(p.minimumDailyDistanceMm)}+ KM EVERY DAY` }
    case 'nft.merged':
      return { kind: 'merge', title: 'SQUEEK MERGE', detail: `#${p.survivorTokenId} IS LEVEL ${p.level}` }
    default:
      return null
  }
}

// The alert card for a change the wheel machine saw.
export function wheelAlert(kind, reading) {
  if (kind === 'wake') return { kind, title: 'SQUEEKTOSHI IS UP', detail: 'THE WHEEL IS TURNING' }
  if (kind === 'nap') return { kind, title: 'NAP TIME', detail: 'THE WHEEL STOPPED' }
  if (kind === 'zoomies') return { kind, title: 'ZOOMIES!', detail: `${(reading?.speedKmh ?? 0).toFixed(1)} KM/H` }
  return null
}

// One ticker line, or null for items the ticker skips (checkpoints, empty settlements, unknown types).
export function lineFor(e) {
  const a = alertFor(e)
  if (a) return `${a.title}: ${a.detail}`
  const p = (e && e.payload) || {}
  switch (e && e.type) {
    case 'system.settlement_completed':
      return Number(p.workAdded || 0) > 0 ? `ROUND ${p.settledThroughRound} SETTLED: ${group(p.workAdded)} WHEEL TURNS` : null
    case 'measurement.speed_milestone':
      return `HIT ${kmhText(p.thresholdSpeedMmPerSecond)} KM/H`
    case 'account.rewards_claimed':
      return `${short(p.account)} claimed ${sqkText(p.amountBaseUnits)} SQK`
    case 'account.rewards_staked':
      return `${short(p.account)} restaked ${sqkText(p.amountBaseUnits)} SQK`
    case 'account.sqk_staked':
      return `${short(p.account)} staked ${sqkText(p.amountBaseUnits)} SQK`
    case 'account.sqk_unstaked':
      return `${short(p.account)} unstaked ${sqkText(p.amountBaseUnits)} SQK`
    case 'nft.deposited':
      return `${short(p.account)} deposited Squeek #${p.tokenId}`
    case 'nft.withdrawn':
      return `${short(p.account)} withdrew Squeek #${p.tokenId}`
    default:
      return null
  }
}
