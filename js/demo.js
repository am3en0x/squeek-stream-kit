// Sample data for demo=1: a wheel that runs, gets the zoomies and stops on a 90-second loop, a canned feed, and a
// list of sample alerts, so a streamer can place the overlays in OBS while Squeektoshi is asleep.
const T0 = Date.now()

export const DEMO_CORE = { genesisTimestamp: String(Math.floor(T0 / 1000) - 567 * 600 - 425), roundDuration: '600' }

export function demoReading(now = Date.now()) {
  const sec = (now - T0) / 1000
  const s = sec % 90
  const moving = s < 60
  const rpm = !moving ? 0 : s >= 30 && s < 42 ? 96 : 68 + 4 * Math.sin(sec / 3)
  return {
    at: now,
    online: true,
    rpm,
    speedKmh: rpm * 0.0525,
    todayKm: 3.418 + sec * 0.0012,
    block: 1999 + Math.floor(sec / 45),
    progress: (sec % 45) / 45,
    settled: 567,
    status: moving ? 'ACTIVE' : 'IDLE',
  }
}

export function demoEvents(now = Date.now()) {
  const at = (s) => new Date(now - s * 1000).toISOString()
  return [
    { id: 'demo-8', type: 'system.settlement_completed', occurredAt: at(40), payload: { settledThroughRound: '567', workAdded: '412', completedBlockCount: '1', lastCompletedBlock: '2000', blockHeight: '2000' } },
    { id: 'demo-7', type: 'measurement.speed_record', occurredAt: at(300), payload: { recordMmPerSecond: '1439' } },
    { id: 'demo-6', type: 'account.rewards_claimed', occurredAt: at(520), payload: { account: '0xe3100f65da2533a0561cd54b87b5a868736287ae', amountBaseUnits: '977532311092136159750' } },
    { id: 'demo-5', type: 'nft.merged', occurredAt: at(900), payload: { survivorTokenId: '4702', level: 2 } },
    { id: 'demo-4', type: 'system.settlement_completed', occurredAt: at(1240), payload: { settledThroughRound: '565', workAdded: '388', completedBlockCount: '0', blockHeight: '1999' } },
    { id: 'demo-3', type: 'measurement.distance_milestone', occurredAt: at(1800), payload: { thresholdDistanceMm: '15000000' } },
    { id: 'demo-2', type: 'account.sqk_staked', occurredAt: at(2400), payload: { account: '0x61d608d04985759a9aa282e9733a1a126a073e13', amountBaseUnits: '4301142000000000000000' } },
    { id: 'demo-1', type: 'measurement.distance_streak', occurredAt: at(5400), payload: { days: 2, minimumDailyDistanceMm: '5000000' } },
  ]
}

export const DEMO_ALERTS = [
  { kind: 'wake', title: 'SQUEEKTOSHI IS UP', detail: 'THE WHEEL IS TURNING' },
  { kind: 'zoomies', title: 'ZOOMIES!', detail: '5.0 KM/H' },
  { kind: 'block', title: 'BLOCK FOUND', detail: 'SQUEEK BLOCK #2,000' },
  { kind: 'record', title: 'NEW TOP SPEED', detail: '5.2 KM/H' },
  { kind: 'distance', title: '20 KM', detail: 'ON THE WHEEL, ALL TIME' },
  { kind: 'streak', title: '3-DAY STREAK', detail: '5+ KM EVERY DAY' },
  { kind: 'merge', title: 'SQUEEK MERGE', detail: '#4702 IS LEVEL 2' },
  { kind: 'nap', title: 'NAP TIME', detail: 'THE WHEEL STOPPED' },
]

// The session so far, for the goal bar and the scenes: 3.2 km at the start of the demo, growing fast enough to watch.
export function demoStats(now = Date.now()) {
  const sec = (now - T0) / 1000
  return { startedAt: T0 - 50 * 60_000, km: Math.min(5.4, 3.2 + sec * 0.01), blocks: Math.min(2, 1 + Math.floor(sec / 75)), topKmh: 4.9, runSec: 1500 + sec, settlements: 3 + Math.floor(sec / 45) }
}

// Round Call in the demo: 90-second rounds, a chat that calls, and outcomes that cycle.
export const DEMO_CALLS = { duration: 90, genesis: Math.floor(T0 / 1000) - 90 * 567, outcomes: ['jog', 'zoomies', 'nap', 'jog'] }
export const DEMO_CHATTERS = ['ann', 'bob_streams', 'catnip', 'dan', 'eve_zoom', 'fox', 'gus', 'hamfan', 'ivy', 'jo']
