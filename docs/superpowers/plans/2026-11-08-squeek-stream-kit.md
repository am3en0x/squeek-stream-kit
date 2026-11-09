# Squeek Stream Kit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A static overlay kit (board, alerts, ticker, second screen, setup page) that puts Squeektoshi's live wheel on any OBS or Streamlabs stream, from Squeekchain's public API.

**Architecture:** Plain ES modules in `dist/js/`. Pure logic (`params`, `rounds`, `api.toReading`, `wheel`, `feed`) is DOM-free and tested with `node --test`; page scripts glue it to a canvas LED renderer (`led`, `boardview`), Web Audio (`sound`), a poller (`source`) and a demo feed (`demo`). Every file under a `**File:**` line below is complete: execution copies it verbatim.

**Tech Stack:** HTML, CSS, JavaScript modules (no build, no dependencies), Node 22 `node --test`, Playwright for the browser check.

**Spec:** `docs/superpowers/specs/2026-11-08-squeek-stream-kit-design.md`

## Global Constraints

- Static only: `dist/` with no build step, framework, server, API key, wallet, analytics or cookies. Fonts bundled (IBM Plex Mono 400/500, Barlow Condensed 700, SIL OFL).
- Data only from `https://api.squeekchain.com/v1` (`/status` every 5 s, `/events?category=all&limit=40` every 15 s, `/core` once).
- Standalone: no link, code, branding or readout tied to any other project.
- Overlay pages have a transparent background; the board and alert card sit on a black plate.
- English UI, English comments. Commit messages in English ending with `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`.
- Defaults: `theme=amber`, `layout=full`, alerts all but `merge`, `zoomies=4.5` km/h (1 to 10), `sound=1`, `vol=60` (0 to 100), `dur=6` s (3 to 15), `demo` off.

## File map

| File | Responsibility |
| --- | --- |
| `package.json`, `.gitignore`, `LICENSE` | test script, ignores, MIT |
| `dist/js/params.js` | URL options: parse, clamp, build query |
| `dist/js/rounds.js` | round number and seconds left, `mm:ss` |
| `dist/js/api.js` | fetch with timeout and Retry-After; `/status` to a reading |
| `dist/js/wheel.js` | wake / nap / zoomies state machine |
| `dist/js/feed.js` | seen ids, alert and ticker text, formatting |
| `dist/js/led.js` | dot-matrix canvas renderer |
| `dist/js/boardview.js` | board layouts (full, strip) |
| `dist/js/sound.js` | Web Audio tunes |
| `dist/js/demo.js` | sample readings, events and alerts |
| `dist/js/source.js` | pollers with backoff, or the demo |
| `dist/js/board.js`, `alerts.js`, `ticker.js`, `live.js`, `setup.js` | page glue |
| `dist/*.html`, `dist/css/kit.css`, `dist/favicon.svg`, `dist/fonts/*` | pages, styles, icon, fonts |
| `test/*.test.js`, `test/fixtures/*.json` | unit tests and recorded API answers |
| `README.md`, `DESIGN.md`, `docs/IMD_JOB.md` | handoff docs |

---

### Task 1: Scaffold, options and rounds

**Files:** Create `package.json`, `.gitignore`, `LICENSE`, `dist/js/params.js`, `dist/js/rounds.js`, `test/params.test.js`, `test/rounds.test.js`; copy fonts.

**Interfaces — Produces:** `parseParams(search) -> {theme, layout, alerts, zoomies, sound, vol, dur, demo}`, `toQuery(opts) -> '?...' | ''`, `THEMES`, `ALERT_KINDS`, `DEFAULTS`; `roundAt(nowSec, genesis, duration) -> {round, left}`, `clock(seconds) -> 'mm:ss'`.

- [ ] **Step 1: Write the scaffold and the failing tests**

**File:** `package.json`
```json
{
  "name": "squeek-stream-kit",
  "private": true,
  "type": "module",
  "scripts": {
    "test": "node --test \"test/*.test.js\""
  }
}
```

**File:** `.gitignore`
```
node_modules/
.playwright-mcp/
```

**File:** `LICENSE`
```
MIT License

Copyright (c) 2026 Squeek Stream Kit contributors

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

**File:** `test/params.test.js`
```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseParams, toQuery, DEFAULTS } from '../dist/js/params.js'

test('defaults', () => {
  const p = parseParams('')
  assert.deepEqual(p, {
    theme: 'amber', layout: 'full', alerts: ['wake', 'nap', 'zoomies', 'block', 'record', 'distance', 'streak'],
    zoomies: 4.5, sound: true, vol: 60, dur: 6, demo: false,
  })
})

test('valid values are kept', () => {
  const p = parseParams('?theme=ice&layout=strip&zoomies=3&sound=0&vol=20&dur=10&demo=1')
  assert.deepEqual([p.theme, p.layout, p.zoomies, p.sound, p.vol, p.dur, p.demo], ['ice', 'strip', 3, false, 20, 10, true])
})

test('unknown or out-of-range values fall back to the default', () => {
  const p = parseParams('?theme=pink&layout=big&zoomies=99&vol=-1&dur=1&demo=yes')
  assert.deepEqual([p.theme, p.layout, p.zoomies, p.vol, p.dur, p.demo], ['amber', 'full', 4.5, 60, 6, false])
})

test('alerts list: known kinds in a fixed order, none, or the default', () => {
  assert.deepEqual(parseParams('?alerts=merge,wake,bogus,wake').alerts, ['wake', 'merge'])
  assert.deepEqual(parseParams('?alerts=none').alerts, [])
  assert.deepEqual(parseParams('?alerts=bogus').alerts, DEFAULTS.alerts)
})

test('toQuery leaves defaults out and round-trips', () => {
  assert.equal(toQuery(parseParams('')), '')
  const opts = { ...parseParams(''), theme: 'green', alerts: ['block', 'merge'], sound: false }
  const q = toQuery(opts)
  assert.equal(q, '?theme=green&sound=0&alerts=block,merge')
  assert.deepEqual(parseParams(q), opts)
  assert.equal(toQuery({ ...parseParams(''), alerts: [] }), '?alerts=none')
})
```

**File:** `test/rounds.test.js`
```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { roundAt, clock } from '../dist/js/rounds.js'

const GENESIS = 1793735400

test('round 1 starts at genesis', () => {
  assert.deepEqual(roundAt(GENESIS, GENESIS, 600), { round: 1, left: 600 })
  assert.deepEqual(roundAt(GENESIS + 599, GENESIS, 600), { round: 1, left: 1 })
  assert.deepEqual(roundAt(GENESIS + 600, GENESIS, 600), { round: 2, left: 600 })
})

test('matches the chain: round 568 at block time 1794075636', () => {
  assert.deepEqual(roundAt(1794075636, GENESIS, 600), { round: 568, left: 564 })
})

test('before genesis or without a duration there is no round', () => {
  assert.deepEqual(roundAt(GENESIS - 30, GENESIS, 600), { round: 0, left: 30 })
  assert.equal(roundAt(GENESIS + 10, GENESIS, 0).round, 0)
})

test('clock', () => {
  assert.equal(clock(564), '09:24')
  assert.equal(clock(5), '00:05')
  assert.equal(clock(-3), '00:00')
})
```

- [ ] **Step 2: Run the tests to see them fail**

Run: `npm test` — expected: FAIL, cannot find `dist/js/params.js` and `dist/js/rounds.js`.

- [ ] **Step 3: Implement**

**File:** `dist/js/params.js`
```js
// Options shared by every page, read from the URL. Anything unknown or out of range falls back to the default.
export const ALERT_KINDS = ['wake', 'nap', 'zoomies', 'block', 'record', 'distance', 'streak', 'merge']
export const THEMES = { amber: '#f6a63b', green: '#7fe08a', ice: '#7fdcff', white: '#f3e9cc' }
export const DEFAULTS = Object.freeze({
  theme: 'amber',
  layout: 'full',
  alerts: ALERT_KINDS.filter((k) => k !== 'merge'),
  zoomies: 4.5,
  sound: true,
  vol: 60,
  dur: 6,
  demo: false,
})

export function parseParams(search) {
  const q = new URLSearchParams(search)
  const num = (key, lo, hi) => {
    if (!q.has(key)) return DEFAULTS[key]
    const v = Number(q.get(key))
    return q.get(key) !== '' && Number.isFinite(v) && v >= lo && v <= hi ? v : DEFAULTS[key]
  }
  const pick = (key, allowed) => (allowed.includes(q.get(key)) ? q.get(key) : DEFAULTS[key])
  return {
    theme: pick('theme', Object.keys(THEMES)),
    layout: pick('layout', ['full', 'strip']),
    alerts: parseAlerts(q.get('alerts')),
    zoomies: num('zoomies', 1, 10),
    sound: q.get('sound') !== '0',
    vol: num('vol', 0, 100),
    dur: num('dur', 3, 15),
    demo: q.get('demo') === '1',
  }
}

function parseAlerts(raw) {
  if (raw === null) return [...DEFAULTS.alerts]
  if (raw === 'none') return []
  const asked = new Set(raw.split(',').map((s) => s.trim()))
  const list = ALERT_KINDS.filter((k) => asked.has(k))
  return list.length ? list : [...DEFAULTS.alerts]
}

// The query string for these options with every default left out, for the setup page's links.
export function toQuery(opts) {
  const out = []
  for (const key of ['theme', 'layout', 'zoomies', 'vol', 'dur']) {
    if (opts[key] !== undefined && opts[key] !== DEFAULTS[key]) out.push(`${key}=${encodeURIComponent(opts[key])}`)
  }
  if (opts.sound === false) out.push('sound=0')
  if (opts.demo) out.push('demo=1')
  if (opts.alerts) {
    const same = opts.alerts.length === DEFAULTS.alerts.length && opts.alerts.every((k) => DEFAULTS.alerts.includes(k))
    if (!same) out.push('alerts=' + (opts.alerts.length ? opts.alerts.join(',') : 'none'))
  }
  return out.length ? '?' + out.join('&') : ''
}
```

**File:** `dist/js/rounds.js`
```js
// Squeekchain rounds: round 1 starts at the genesis timestamp and each lasts `duration` seconds (600).
export function roundAt(nowSec, genesis, duration) {
  if (!(duration > 0) || nowSec < genesis) return { round: 0, left: Math.max(0, Math.ceil(genesis - nowSec)) }
  const index = Math.floor((nowSec - genesis) / duration)
  return { round: index + 1, left: Math.ceil(genesis + (index + 1) * duration - nowSec) }
}

export function clock(seconds) {
  const s = Math.max(0, Math.floor(seconds))
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0')
}
```

Add the fonts: IBM Plex Mono 400 and 500 and Barlow Condensed 700 as woff2 (both under the SIL Open Font License) into `dist/fonts/`.

- [ ] **Step 4: Run the tests** — `npm test`, expected: all pass.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "Add URL options, round clock and project scaffold"`.

---

### Task 2: Status readings and the wheel state machine

**Files:** Create `dist/js/api.js`, `dist/js/wheel.js`, `test/api.test.js`, `test/wheel.test.js`, `test/fixtures/status-active.json`, `test/fixtures/status-offline.json`.

**Interfaces — Produces:** `getJson(path, {fetchImpl, timeoutMs}) -> Promise<{ok, data?, retryAfter?, unavailable?}>`; `toReading(json, at) -> {at, online, rpm, speedKmh, todayKm, block, progress, settled, status}`; `createWheel({zoomiesKmh, napMs, offAirMs, rearmMs}) -> {push(reading) -> ('wake'|'nap'|'zoomies')[], phase, last}` with `phase` in `unknown | running | still | napping | offair`.

- [ ] **Step 1: Fixtures and failing tests**

**File:** `test/fixtures/status-active.json`
```json
{
  "schemaVersion": 3,
  "generatedAt": "2026-11-04T23:39:12.000Z",
  "measurement": {
    "freshness": "online",
    "observedAt": "2026-11-04T23:39:10.837Z",
    "staleAfterSeconds": 120,
    "cumulativeWorkUnits": "26009",
    "provenance": "hardware",
    "coreStatus": "ACTIVE",
    "rpmMilli": 77005,
    "speedMmPerSecond": 1127,
    "distanceMm": 3455808
  },
  "builder": {
    "status": "available",
    "anchor": {
      "cumulativeWork": "25701",
      "blockHeight": "2366",
      "blockProgress": "143705150",
      "settledThroughRound": "166"
    }
  }
}
```

**File:** `test/fixtures/status-offline.json`
```json
{
  "schemaVersion": 3,
  "generatedAt": "2026-11-06T18:06:25.596Z",
  "measurement": {
    "freshness": "stale",
    "coreStatus": "IDLE",
    "rpmMilli": 51000,
    "speedMmPerSecond": 900,
    "distanceMm": 0
  },
  "builder": { "status": "available", "anchor": { "blockHeight": "1140", "blockProgress": "662790326", "settledThroughRound": "421" } }
}
```

**File:** `test/api.test.js`
```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { toReading, getJson } from '../dist/js/api.js'

const fixture = (name) => JSON.parse(readFileSync(new URL(`./fixtures/${name}`, import.meta.url)))

test('an online status becomes a reading in km, km/h and blocks', () => {
  const r = toReading(fixture('status-active.json'), 1000)
  assert.equal(r.at, 1000)
  assert.equal(r.online, true)
  assert.equal(r.rpm, 77.005)
  assert.ok(Math.abs(r.speedKmh - 4.0572) < 1e-9)
  assert.equal(r.todayKm, 3.455808)
  assert.equal(r.block, 2366)
  assert.ok(Math.abs(r.progress - 0.14370515) < 1e-12)
  assert.equal(r.settled, 166)
  assert.equal(r.status, 'ACTIVE')
})

test('a stale status is offline: no motion, other values kept', () => {
  const r = toReading(fixture('status-offline.json'), 5)
  assert.equal(r.online, false)
  assert.equal(r.rpm, 0)
  assert.equal(r.speedKmh, 0)
  assert.equal(r.block, 1140)
})

test('missing fields read as null, never as zero', () => {
  const r = toReading({}, 1)
  assert.deepEqual([r.online, r.todayKm, r.block, r.progress, r.settled], [false, null, null, null, null])
})

const fakeFetch = (status, body, headers = {}) => async () => ({
  status, ok: status >= 200 && status < 300,
  headers: { get: (k) => headers[k.toLowerCase()] ?? null },
  json: async () => body,
})

test('getJson: ok, unavailable, rate limited, failed', async () => {
  assert.deepEqual(await getJson('/status', { fetchImpl: fakeFetch(200, { a: 1 }) }), { ok: true, data: { a: 1 } })
  const un = await getJson('/events', { fetchImpl: fakeFetch(200, { status: 'unavailable', reason: 'x' }) })
  assert.equal(un.ok, false)
  assert.equal(un.unavailable, true)
  assert.deepEqual(await getJson('/status', { fetchImpl: fakeFetch(429, {}, { 'retry-after': '7' }) }), { ok: false, retryAfter: 7 })
  assert.deepEqual(await getJson('/status', { fetchImpl: fakeFetch(500, {}) }), { ok: false })
  assert.deepEqual(await getJson('/status', { fetchImpl: async () => { throw new Error('offline') } }), { ok: false })
})
```

**File:** `test/wheel.test.js`
```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createWheel } from '../dist/js/wheel.js'

// A reading at `s` seconds with `rpm` and a speed (km/h, default 3 while moving).
const R = (s, rpm, kmh = rpm ? 3 : 0, online = true) => ({ at: s * 1000, online, rpm, speedKmh: kmh })

test('the first reading never alerts', () => {
  const a = createWheel()
  assert.deepEqual(a.push(R(0, 70)), [])
  assert.equal(a.phase, 'running')
  const b = createWheel()
  assert.deepEqual(b.push(R(0, 0)), [])
  assert.equal(b.phase, 'still')
})

test('nap after three minutes still, following a run', () => {
  const w = createWheel()
  w.push(R(0, 70))
  assert.deepEqual(w.push(R(5, 0)), [])
  assert.deepEqual(w.push(R(180, 0)), [])
  assert.deepEqual(w.push(R(185, 0)), ['nap'])
  assert.equal(w.phase, 'napping')
  assert.deepEqual(w.push(R(200, 0)), [])
})

test('no nap alert when it was never seen running', () => {
  const w = createWheel()
  w.push(R(0, 0))
  assert.deepEqual(w.push(R(200, 0)), [])
  assert.equal(w.phase, 'napping')
})

test('wake needs two moving readings after a nap', () => {
  const w = createWheel()
  w.push(R(0, 0))
  w.push(R(200, 0))
  assert.deepEqual(w.push(R(205, 60)), [])
  assert.deepEqual(w.push(R(210, 60)), ['wake'])
  assert.equal(w.phase, 'running')
})

test('a short stop is neither a nap nor a wake', () => {
  const w = createWheel()
  w.push(R(0, 70))
  w.push(R(5, 0))
  assert.equal(w.phase, 'still')
  assert.deepEqual(w.push(R(60, 70)), [])
  assert.deepEqual(w.push(R(65, 70)), [])
  assert.equal(w.phase, 'running')
})

test('one twitch during a nap does not wake him', () => {
  const w = createWheel()
  w.push(R(0, 0))
  w.push(R(200, 0))
  assert.deepEqual(w.push(R(205, 40)), [])
  assert.deepEqual(w.push(R(210, 0)), [])
  assert.equal(w.phase, 'napping')
})

test('zoomies on the second fast reading, then again only after slowing down for two minutes', () => {
  const w = createWheel({ zoomiesKmh: 4.5, rearmMs: 120_000 })
  w.push(R(0, 70, 3))
  assert.deepEqual(w.push(R(5, 90, 4.8)), [])
  assert.deepEqual(w.push(R(10, 90, 4.9)), ['zoomies'])
  assert.deepEqual(w.push(R(15, 90, 5)), [])
  assert.deepEqual(w.push(R(20, 60, 3)), [])
  assert.deepEqual(w.push(R(100, 60, 3.5)), [])
  assert.deepEqual(w.push(R(140, 60, 3)), [])
  assert.deepEqual(w.push(R(145, 90, 4.9)), [])
  assert.deepEqual(w.push(R(150, 90, 4.9)), ['zoomies'])
})

test('a speed between 80% and the threshold restarts the cool-down', () => {
  const w = createWheel({ zoomiesKmh: 4.5, rearmMs: 120_000 })
  w.push(R(0, 70, 3))
  w.push(R(5, 90, 5))
  w.push(R(10, 90, 5))
  w.push(R(20, 60, 3))
  w.push(R(100, 70, 4))
  w.push(R(150, 60, 3))
  w.push(R(200, 90, 5))
  assert.deepEqual(w.push(R(205, 90, 5)), [])
})

test('already fast when the page opens: no zoomies until it has slowed down', () => {
  const w = createWheel()
  assert.deepEqual(w.push(R(0, 90, 5)), [])
  assert.deepEqual(w.push(R(5, 90, 5)), [])
  assert.deepEqual(w.push(R(10, 90, 5)), [])
})

test('off air after two minutes without an online reading, and no alerts on the way back', () => {
  const w = createWheel()
  w.push(R(0, 70))
  w.push(R(60, 0, 0, false))
  assert.equal(w.phase, 'running')
  w.push(R(125, 0, 0, false))
  assert.equal(w.phase, 'offair')
  assert.deepEqual(w.push(R(130, 0)), [])
  assert.equal(w.phase, 'still')
  assert.deepEqual(w.push(R(400, 0)), [])
})

test('offline from the start is off air at once', () => {
  const w = createWheel()
  w.push(R(0, 0, 0, false))
  assert.equal(w.phase, 'offair')
})
```

- [ ] **Step 2: Run** `npm test` — expected FAIL: modules missing.

- [ ] **Step 3: Implement**

**File:** `dist/js/api.js`
```js
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
```

**File:** `dist/js/wheel.js`
```js
// The wheel's state from successive status readings. It only reports changes it has seen happen:
//   wake    moving again on two readings in a row after a nap
//   nap     still for napMs after it was seen running
//   zoomies at or over the threshold on two readings in a row; armed again once the speed has stayed under 80% of
//           the threshold (or stopped) for rearmMs
// Without an online reading for offAirMs the phase is 'offair'; coming back starts afresh, with no alert.
export function createWheel({ zoomiesKmh = 4.5, napMs = 180_000, offAirMs = 120_000, rearmMs = 120_000 } = {}) {
  let phase = 'unknown'
  let ranBefore = false
  let stillSince = null
  let moveStreak = 0
  let lastOnline = null
  let fastStreak = 0
  let armed = null
  let slowSince = null
  let last = null

  function push(r) {
    const out = []
    if (!r.online) {
      if (lastOnline === null || r.at - lastOnline >= offAirMs) phase = 'offair'
      moveStreak = 0
      fastStreak = 0
      return out
    }
    lastOnline = r.at
    last = r
    const moving = r.rpm > 0

    if (phase === 'unknown' || phase === 'offair') {
      phase = moving ? 'running' : 'still'
      ranBefore = moving
      stillSince = moving ? null : r.at
      moveStreak = moving ? 1 : 0
    } else if (moving) {
      moveStreak += 1
      if (moveStreak >= 2 && phase !== 'running') {
        if (phase === 'napping') out.push('wake')
        phase = 'running'
        ranBefore = true
        stillSince = null
      }
    } else {
      moveStreak = 0
      if (stillSince === null) stillSince = r.at
      if (phase === 'running') phase = 'still'
      if (phase === 'still' && r.at - stillSince >= napMs) {
        if (ranBefore) out.push('nap')
        phase = 'napping'
      }
    }

    const fast = moving && r.speedKmh >= zoomiesKmh
    if (armed === null) armed = !fast
    fastStreak = fast ? fastStreak + 1 : 0
    if (fast && armed && fastStreak >= 2) {
      out.push('zoomies')
      armed = false
      slowSince = null
    } else if (!armed && !fast) {
      if (!moving || r.speedKmh < zoomiesKmh * 0.8) {
        if (slowSince === null) slowSince = r.at
        if (r.at - slowSince >= rearmMs) armed = true
      } else {
        slowSince = null
      }
    }
    return out
  }

  return {
    push,
    get phase() { return phase },
    get last() { return last },
  }
}
```

- [ ] **Step 4: Run** `npm test` — expected: all pass.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "Read wheel status and detect wake-ups, naps and zoomies"`.

---

### Task 3: The activity feed

**Files:** Create `dist/js/feed.js`, `test/feed.test.js`, `test/fixtures/events.json`.

**Interfaces — Produces:** `createFeed() -> {ingest(events) -> newEvents oldest first}`; `alertFor(event) -> {kind, title, detail} | null`; `wheelAlert(kind, reading) -> {kind, title, detail}`; `lineFor(event) -> string | null`; `agoText(iso, nowMs) -> string`; `kmhText(mmps)`, `wholeKm(mm)`, `sqkText(baseUnits)`, `group(n)`, `short(address)`.

- [ ] **Step 1: Fixture and failing tests**

**File:** `test/fixtures/events.json`
```json
{
  "status": "available",
  "events": [
    { "id": "e9", "type": "system.settlement_completed", "occurredAt": "2026-11-07T18:30:36.000Z", "payload": { "settledThroughRound": "568", "workAdded": "412", "completedBlockCount": "2", "firstCompletedBlock": "2000", "lastCompletedBlock": "2001", "blockHeight": "2001" } },
    { "id": "e8", "type": "system.settlement_completed", "occurredAt": "2026-11-07T18:20:36.000Z", "payload": { "settledThroughRound": "567", "workAdded": "0", "completedBlockCount": "0", "firstCompletedBlock": null, "lastCompletedBlock": null, "blockHeight": "1999" } },
    { "id": "e7", "type": "account.sqk_staked", "occurredAt": "2026-11-07T18:18:24.000Z", "payload": { "account": "0x61d608d04985759a9aa282e9733a1a126a073e13", "amountBaseUnits": "4301142000000000000000" } },
    { "id": "e6", "type": "nft.merged", "occurredAt": "2026-11-07T18:16:24.000Z", "payload": { "survivorTokenId": "4702", "donorTokenId": "4704", "level": 2 } },
    { "id": "e5", "type": "system.mining_checkpointed", "occurredAt": "2026-11-07T18:15:36.000Z", "payload": { "throughRound": "566" } },
    { "id": "e4", "type": "account.rewards_claimed", "occurredAt": "2026-11-07T17:40:00.000Z", "payload": { "account": "0xe3100f65da2533a0561cd54b87b5a868736287ae", "amountBaseUnits": "977532311092136159750" } },
    { "id": "e3", "type": "measurement.speed_record", "occurredAt": "2026-11-07T05:09:45.041Z", "payload": { "previousRecordMmPerSecond": "1359", "recordMmPerSecond": "1439", "observedSpeedMmPerSecond": "1439" } },
    { "id": "e2", "type": "measurement.distance_milestone", "occurredAt": "2026-11-07T06:36:00.996Z", "payload": { "thresholdDistanceMm": "15000000", "observedLifetimeDistanceMm": "15001508" } },
    { "id": "e1", "type": "measurement.distance_streak", "occurredAt": "2026-11-07T06:22:20.540Z", "payload": { "days": 2, "minimumDailyDistanceMm": "5000000", "endingUtcDate": "2026-11-06" } },
    { "id": "e0", "type": "measurement.daily_distance_milestone", "occurredAt": "2026-11-07T06:22:20.540Z", "payload": { "thresholdDistanceMm": "5000000", "observedDayDistanceMm": "5000210", "utcDate": "2026-11-06" } }
  ]
}
```

**File:** `test/feed.test.js`
```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createFeed, alertFor, wheelAlert, lineFor, agoText, kmhText, wholeKm, sqkText, short } from '../dist/js/feed.js'

const { events } = JSON.parse(readFileSync(new URL('./fixtures/events.json', import.meta.url)))
const byId = (id) => events.find((e) => e.id === id)

test('the first page is only remembered; later pages return the new items, oldest first', () => {
  const feed = createFeed()
  assert.deepEqual(feed.ingest(events.slice(2)), [])
  const fresh = feed.ingest(events)
  assert.deepEqual(fresh.map((e) => e.id), ['e8', 'e9'])
  assert.deepEqual(feed.ingest(events), [])
})

test('malformed items are skipped', () => {
  const feed = createFeed()
  feed.ingest([])
  assert.deepEqual(feed.ingest([null, { type: 'x' }, { id: 5 }]), [])
})

test('alerts for each event that has one', () => {
  assert.deepEqual(alertFor(byId('e9')), { kind: 'block', title: '2 BLOCKS FOUND', detail: 'SQUEEK BLOCK #2,001' })
  assert.equal(alertFor(byId('e8')), null)
  assert.deepEqual(alertFor(byId('e3')), { kind: 'record', title: 'NEW TOP SPEED', detail: '5.2 KM/H' })
  assert.deepEqual(alertFor(byId('e2')), { kind: 'distance', title: '15 KM', detail: 'ON THE WHEEL, ALL TIME' })
  assert.deepEqual(alertFor(byId('e0')), { kind: 'distance', title: '5 KM IN A DAY', detail: 'NEW DAILY MILESTONE' })
  assert.deepEqual(alertFor(byId('e1')), { kind: 'streak', title: '2-DAY STREAK', detail: '5+ KM EVERY DAY' })
  assert.deepEqual(alertFor(byId('e6')), { kind: 'merge', title: 'SQUEEK MERGE', detail: '#4702 IS LEVEL 2' })
  assert.equal(alertFor(byId('e7')), null)
  assert.equal(alertFor({ id: 'x', type: 'something.new', payload: {} }), null)
})

test('one block found reads in the singular', () => {
  const e = { id: 'b', type: 'system.settlement_completed', payload: { completedBlockCount: '1', lastCompletedBlock: '2000' } }
  assert.equal(alertFor(e).title, 'BLOCK FOUND')
})

test('wheel alerts', () => {
  assert.deepEqual(wheelAlert('wake'), { kind: 'wake', title: 'SQUEEKTOSHI IS UP', detail: 'THE WHEEL IS TURNING' })
  assert.deepEqual(wheelAlert('nap'), { kind: 'nap', title: 'NAP TIME', detail: 'THE WHEEL STOPPED' })
  assert.deepEqual(wheelAlert('zoomies', { speedKmh: 4.96 }), { kind: 'zoomies', title: 'ZOOMIES!', detail: '5.0 KM/H' })
})

test('ticker lines', () => {
  assert.equal(lineFor(byId('e9')), '2 BLOCKS FOUND: SQUEEK BLOCK #2,001')
  assert.equal(lineFor(byId('e8')), null)
  assert.equal(lineFor(byId('e7')), '0x61d6…3e13 staked 4,301 SQK')
  assert.equal(lineFor(byId('e4')), '0xe310…87ae claimed 977.5 SQK')
  assert.equal(lineFor(byId('e5')), null)
  const settled = { id: 's', type: 'system.settlement_completed', payload: { settledThroughRound: '570', workAdded: '1234', completedBlockCount: '0' } }
  assert.equal(lineFor(settled), 'ROUND 570 SETTLED: 1,234 WHEEL TURNS')
  const speed = { id: 'm', type: 'measurement.speed_milestone', payload: { thresholdSpeedMmPerSecond: '833' } }
  assert.equal(lineFor(speed), 'HIT 3.0 KM/H')
})

test('formatting', () => {
  assert.equal(kmhText(1439), '5.2')
  assert.equal(wholeKm('15000000'), '15')
  assert.equal(sqkText('977532311092136159750'), '977.5')
  assert.equal(sqkText('4301142000000000000000'), '4,301')
  assert.equal(short('0x61d608d04985759a9aa282e9733a1a126a073e13'), '0x61d6…3e13')
  const now = Date.parse('2026-11-07T18:31:00.000Z')
  assert.equal(agoText('2026-11-07T18:30:36.000Z', now), 'now')
  assert.equal(agoText('2026-11-07T18:20:36.000Z', now), '10 min ago')
  assert.equal(agoText('2026-11-07T15:31:00.000Z', now), '3 h ago')
  assert.equal(agoText('2026-11-05T18:31:00.000Z', now), '2 d ago')
})
```

- [ ] **Step 2: Run** `npm test` — expected FAIL: `feed.js` missing.

- [ ] **Step 3: Implement**

**File:** `dist/js/feed.js`
```js
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
```

- [ ] **Step 4: Run** `npm test` — expected: all pass.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "Turn feed events into alerts and ticker lines"`.

---

### Task 4: Rendering, sound, demo and polling

**Files:** Create `dist/js/led.js`, `dist/js/boardview.js`, `dist/js/sound.js`, `dist/js/demo.js`, `dist/js/source.js`, `test/led.test.js`.

**Interfaces — Produces:** `FONT`, `textWidth(s, k)`, `class Led(canvas, {off, fit})` with `grid(cols, rows)`, `dot`, `text(s, x, y, color, k) -> x after`, `bar`, `wheel`, `paint()`; `COLORS`, `stateText(phase, reading, fast)`, `drawFull(led, view)`, `drawStrip(led, view)` with `view = {reading, phase, fast, accent, turn}`; `createSound({vol, on}) -> {unlock(), play(kind)}`; `DEMO_CORE`, `demoReading(now)`, `demoEvents(now)`, `DEMO_ALERTS`; `startSource({demo, statusMs, eventsMs}, {status, events, core})`.

- [ ] **Step 1: Failing test for the pure parts**

**File:** `test/led.test.js`
```js
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { textWidth, FONT } from '../dist/js/led.js'
import { stateText } from '../dist/js/boardview.js'
import { alertFor, lineFor } from '../dist/js/feed.js'
import { DEMO_ALERTS, demoEvents } from '../dist/js/demo.js'

test('textWidth counts glyph widths plus one-dot gaps, scaled', () => {
  assert.equal(textWidth('A'), 5)
  assert.equal(textWidth('AA'), 11)
  assert.equal(textWidth('1.0'), 13)
  assert.equal(textWidth('AA', 2), 22)
  assert.equal(textWidth(''), 0)
})

test('every character the kit prints has a glyph', () => {
  const texts = ['SQUEEKTOSHI HAS THE ZOOMIES', 'TOOK A BREAK', 'IS OFF AIR', 'TUNING IN', 'TODAY KM/H SPEED BLOCK ROUND LEFT 0123456789 :,.-+#!?%']
  for (const a of DEMO_ALERTS) texts.push(a.title, a.detail)
  for (const e of demoEvents()) { const a = alertFor(e); if (a) texts.push(a.title, a.detail) }
  for (const s of texts) for (const ch of s) assert.ok(FONT[ch], `missing glyph ${JSON.stringify(ch)} in ${s}`)
})

test('state text', () => {
  const r = { online: true }
  assert.equal(stateText('unknown', null, false), 'TUNING IN')
  assert.equal(stateText('offair', r, false), 'IS OFF AIR')
  assert.equal(stateText('napping', r, false), 'IS NAPPING')
  assert.equal(stateText('still', r, false), 'TOOK A BREAK')
  assert.equal(stateText('running', r, false), 'IS RUNNING')
  assert.equal(stateText('running', r, true), 'HAS THE ZOOMIES')
})

test('the demo feed reads like the real one', () => {
  const lines = demoEvents(Date.parse('2026-11-08T00:00:00Z')).map(lineFor).filter(Boolean)
  assert.ok(lines.length >= 5)
})
```

- [ ] **Step 2: Run** `npm test` — expected FAIL: modules missing.

- [ ] **Step 3: Implement**

**File:** `dist/js/led.js`
```js
// A dot-matrix sign on a canvas: 5x7 glyphs (scalable), a progress bar and a turning wheel, drawn as round dots on a
// grid. Pages compose in dot units; paint() fits the grid to the canvas's box and keeps the dots round.
export const FONT = {
  A: ['01110', '10001', '10001', '11111', '10001', '10001', '10001'],
  B: ['11110', '10001', '10001', '11110', '10001', '10001', '11110'],
  C: ['01110', '10001', '10000', '10000', '10000', '10001', '01110'],
  D: ['11110', '10001', '10001', '10001', '10001', '10001', '11110'],
  E: ['11111', '10000', '10000', '11110', '10000', '10000', '11111'],
  F: ['11111', '10000', '10000', '11110', '10000', '10000', '10000'],
  G: ['01110', '10001', '10000', '10111', '10001', '10001', '01111'],
  H: ['10001', '10001', '10001', '11111', '10001', '10001', '10001'],
  I: ['111', '010', '010', '010', '010', '010', '111'],
  J: ['00111', '00010', '00010', '00010', '00010', '10010', '01100'],
  K: ['10001', '10010', '10100', '11000', '10100', '10010', '10001'],
  L: ['10000', '10000', '10000', '10000', '10000', '10000', '11111'],
  M: ['10001', '11011', '10101', '10101', '10001', '10001', '10001'],
  N: ['10001', '10001', '11001', '10101', '10011', '10001', '10001'],
  O: ['01110', '10001', '10001', '10001', '10001', '10001', '01110'],
  P: ['11110', '10001', '10001', '11110', '10000', '10000', '10000'],
  Q: ['01110', '10001', '10001', '10001', '10101', '10010', '01101'],
  R: ['11110', '10001', '10001', '11110', '10100', '10010', '10001'],
  S: ['01111', '10000', '10000', '01110', '00001', '00001', '11110'],
  T: ['11111', '00100', '00100', '00100', '00100', '00100', '00100'],
  U: ['10001', '10001', '10001', '10001', '10001', '10001', '01110'],
  V: ['10001', '10001', '10001', '10001', '10001', '01010', '00100'],
  W: ['10001', '10001', '10001', '10101', '10101', '10101', '01010'],
  X: ['10001', '10001', '01010', '00100', '01010', '10001', '10001'],
  Y: ['10001', '10001', '10001', '01010', '00100', '00100', '00100'],
  Z: ['11111', '00001', '00010', '00100', '01000', '10000', '11111'],
  0: ['01110', '10001', '10011', '10101', '11001', '10001', '01110'],
  1: ['00100', '01100', '00100', '00100', '00100', '00100', '01110'],
  2: ['01110', '10001', '00001', '00010', '00100', '01000', '11111'],
  3: ['11111', '00010', '00100', '00010', '00001', '10001', '01110'],
  4: ['00010', '00110', '01010', '10010', '11111', '00010', '00010'],
  5: ['11111', '10000', '11110', '00001', '00001', '10001', '01110'],
  6: ['00110', '01000', '10000', '11110', '10001', '10001', '01110'],
  7: ['11111', '00001', '00010', '00100', '01000', '01000', '01000'],
  8: ['01110', '10001', '10001', '01110', '10001', '10001', '01110'],
  9: ['01110', '10001', '10001', '01111', '00001', '00010', '01100'],
  '.': ['0', '0', '0', '0', '0', '0', '1'],
  ',': ['00', '00', '00', '00', '00', '01', '10'],
  ':': ['0', '0', '1', '0', '1', '0', '0'],
  '-': ['000', '000', '000', '111', '000', '000', '000'],
  '+': ['000', '010', '010', '111', '010', '010', '000'],
  '/': ['00001', '00010', '00010', '00100', '01000', '01000', '10000'],
  '!': ['1', '1', '1', '1', '1', '0', '1'],
  '?': ['01110', '10001', '00001', '00010', '00100', '00000', '00100'],
  '#': ['01010', '01010', '11111', '01010', '11111', '01010', '01010'],
  '%': ['11001', '11010', '00010', '00100', '01000', '01011', '10011'],
  ' ': ['00', '00', '00', '00', '00', '00', '00'],
}

const glyph = (ch) => FONT[ch] || FONT[' ']

export function textWidth(s, k = 1) {
  let w = 0
  for (const ch of String(s)) w += (glyph(ch)[0].length + 1) * k
  return Math.max(0, w - k)
}

export class Led {
  constructor(canvas, { off = '#16161b', fit = 'width' } = {}) {
    this.canvas = canvas
    this.ctx = canvas.getContext('2d')
    this.off = off
    this.fit = fit
    this.cols = 0
    this.rows = 0
    this.cells = []
  }

  grid(cols, rows) {
    this.cols = cols
    this.rows = rows
    this.cells = new Array(cols * rows).fill(null)
  }

  dot(x, y, color) {
    if (x >= 0 && y >= 0 && x < this.cols && y < this.rows) this.cells[y * this.cols + x] = color
  }

  // Draws text and returns the x just after it (including the trailing one-dot gap).
  text(s, x, y, color, k = 1) {
    for (const ch of String(s)) {
      const g = glyph(ch)
      for (let r = 0; r < 7; r++) {
        for (let c = 0; c < g[r].length; c++) {
          if (g[r][c] !== '1') continue
          for (let i = 0; i < k; i++) for (let j = 0; j < k; j++) this.dot(x + c * k + i, y + r * k + j, color)
        }
      }
      x += (g[0].length + 1) * k
    }
    return x
  }

  bar(x, y, w, h, frac, on, off) {
    const lit = Math.round(Math.max(0, Math.min(1, frac || 0)) * w)
    for (let i = 0; i < w; i++) for (let j = 0; j < h; j++) this.dot(x + i, y + j, i < lit ? on : off)
  }

  wheel(cx, cy, r, turnDeg, rim, spoke, hub) {
    const steps = Math.max(24, Math.round(r * 7))
    for (let i = 0; i < steps; i++) {
      const t = (i / steps) * Math.PI * 2
      this.dot(Math.round(cx + r * Math.cos(t)), Math.round(cy + r * Math.sin(t)), rim)
    }
    for (let s = 0; s < 3; s++) {
      const t = ((s * 120 + turnDeg) * Math.PI) / 180
      for (let d = 2; d < r - 1; d++) this.dot(Math.round(cx + d * Math.cos(t)), Math.round(cy + d * Math.sin(t)), spoke)
    }
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) this.dot(cx + i, cy + j, hub)
  }

  paint() {
    const { canvas, ctx, cols, rows } = this
    if (!cols || !rows) return
    const box = canvas.parentElement.getBoundingClientRect()
    let pitch = box.width / cols
    if (this.fit === 'contain' && box.height > 0) pitch = Math.min(pitch, box.height / rows)
    if (!(pitch > 0)) return
    const cw = Math.floor(cols * pitch)
    const ch = Math.floor(rows * pitch)
    const dpr = window.devicePixelRatio || 1
    if (canvas.width !== Math.round(cw * dpr) || canvas.height !== Math.round(ch * dpr)) {
      canvas.width = Math.round(cw * dpr)
      canvas.height = Math.round(ch * dpr)
      canvas.style.width = cw + 'px'
      canvas.style.height = ch + 'px'
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, cw, ch)
    const rad = pitch * 0.36
    for (let y = 0; y < rows; y++) {
      for (let x = 0; x < cols; x++) {
        const c = this.cells[y * cols + x] || this.off
        if (!c) continue
        ctx.fillStyle = c
        ctx.beginPath()
        ctx.arc((x + 0.5) * pitch, (y + 0.5) * pitch, rad, 0, 6.2832)
        ctx.fill()
      }
    }
  }
}
```

**File:** `dist/js/boardview.js`
```js
import { textWidth } from './led.js'

// The board's two layouts, drawn from the latest reading and the wheel's phase.
export const COLORS = { cream: '#f3e9cc', label: '#6b6b78', dim: '#34343e', rim: '#8a8a96' }

export function stateText(phase, reading, fast) {
  if (!reading || phase === 'unknown') return 'TUNING IN'
  if (phase === 'offair') return 'IS OFF AIR'
  if (phase === 'napping') return 'IS NAPPING'
  if (phase === 'still') return 'TOOK A BREAK'
  return fast ? 'HAS THE ZOOMIES' : 'IS RUNNING'
}

const fmtKm = (km) => (km == null ? '--.--' : km >= 100 ? km.toFixed(1) : km.toFixed(2))
const fmtKmh = (v) => (v == null ? '-.-' : v.toFixed(1))
const fmtInt = (n) => (n == null ? '--' : Math.round(n).toLocaleString('en-US'))

function tone(view) {
  const { reading: r, phase, fast, accent } = view
  const live = Boolean(r) && phase !== 'offair' && phase !== 'unknown'
  const state = !live ? COLORS.dim : phase === 'napping' || phase === 'still' ? COLORS.label : fast ? accent : COLORS.cream
  return { live, state, value: live ? COLORS.cream : COLORS.dim }
}

// Full: 110 x 66 dots (source 880 x 528).
export function drawFull(led, view) {
  const { reading: r, phase, fast, accent, turn } = view
  const t = tone(view)
  led.grid(110, 66)
  led.text('SQUEEKTOSHI', 2, 2, accent)
  led.text(stateText(phase, r, fast), 2, 11, t.state)
  led.text('TODAY', 2, 22, COLORS.label)
  const x = led.text(fmtKm(r ? r.todayKm : null), 2, 31, t.value, 2)
  led.text('KM', x + 2, 38, COLORS.label)
  const sx = led.text('SPEED', 2, 48, COLORS.label)
  led.text(`${fmtKmh(t.live ? r.speedKmh : null)} KM/H`, sx + 3, 48, t.value)
  const bx = led.text('BLOCK', 2, 57, COLORS.label)
  const end = led.text(fmtInt(r ? r.block : null), bx + 3, 57, r ? COLORS.cream : COLORS.dim)
  led.bar(end + 3, 58, Math.max(0, 107 - end - 3), 5, r ? r.progress : 0, accent, COLORS.dim)
  const spinning = t.live && phase === 'running'
  led.wheel(92, 33, 14, spinning ? turn : 0, COLORS.rim, spinning ? COLORS.cream : COLORS.label, accent)
}

// Strip: 178 x 20 dots (source 890 x 100): the wheel, then his state over today's distance and speed.
export function drawStrip(led, view) {
  const { reading: r, phase, fast, accent, turn } = view
  const t = tone(view)
  led.grid(178, 20)
  const spinning = t.live && phase === 'running'
  led.wheel(9, 9, 8, spinning ? turn : 0, COLORS.rim, spinning ? COLORS.cream : COLORS.label, accent)
  const x = led.text('SQUEEKTOSHI ', 22, 2, accent)
  led.text(stateText(phase, r, fast), x, 2, t.state)
  const a = led.text('TODAY ', 22, 11, COLORS.label)
  const b = led.text(`${fmtKm(r ? r.todayKm : null)} KM`, a, 11, t.value)
  led.text(`${fmtKmh(t.live ? r.speedKmh : null)} KM/H`, b + textWidth('  ', 1) + 1, 11, t.value)
}
```

**File:** `dist/js/sound.js`
```js
// Short square-wave tunes made with Web Audio, one per alert kind. No audio files. OBS lets a browser source play
// sound on its own; a normal browser tab starts muted until the viewer clicks the page.
const TUNES = {
  wake: [[523, 0.09], [659, 0.09], [784, 0.16]],
  nap: [[784, 0.12], [587, 0.12], [392, 0.24]],
  zoomies: [[880, 0.05], [988, 0.05], [1175, 0.05], [1319, 0.05], [1568, 0.14]],
  block: [[659, 0.08], [880, 0.08], [1319, 0.2]],
  record: [[523, 0.07], [784, 0.07], [1047, 0.07], [1568, 0.22]],
  distance: [[587, 0.1], [740, 0.1], [880, 0.18]],
  streak: [[440, 0.08], [554, 0.08], [659, 0.08], [880, 0.2]],
  merge: [[392, 0.08], [523, 0.08], [784, 0.16]],
}

export function createSound({ vol = 60, on = true } = {}) {
  let ctx = null
  const ensure = () => {
    if (!ctx) {
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext
      if (!AC) return null
      ctx = new AC()
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    return ctx
  }
  return {
    unlock() { ensure() },
    play(kind) {
      if (!on || vol <= 0) return
      const c = ensure()
      if (!c) return
      let t = c.currentTime + 0.02
      const peak = (vol / 100) * 0.16
      for (const [freq, dur] of TUNES[kind] || TUNES.block) {
        const osc = c.createOscillator()
        const gain = c.createGain()
        osc.type = 'square'
        osc.frequency.value = freq
        gain.gain.setValueAtTime(peak, t)
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
        osc.connect(gain).connect(c.destination)
        osc.start(t)
        osc.stop(t + dur + 0.02)
        t += dur
      }
    },
  }
}
```

**File:** `dist/js/demo.js`
```js
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
```

**File:** `dist/js/source.js`
```js
import { getJson, toReading } from './api.js'
import { DEMO_CORE, demoReading, demoEvents } from './demo.js'

// Feeds a page: on.status(reading) every few seconds, on.events(list) every 15 s, on.core(configuration) once.
// A failed poll hands the page an offline reading (status) or nothing (events) and the next poll backs off from 5 s,
// doubling up to 60 s, or waits as long as Retry-After says.
export function startSource({ demo = false, statusMs = 5000, eventsMs = 15000 } = {}, on = {}) {
  if (demo) {
    if (on.core) on.core(DEMO_CORE)
    if (on.status) { on.status(demoReading()); setInterval(() => on.status(demoReading()), 1000) }
    if (on.events) { on.events(demoEvents()); setInterval(() => on.events(demoEvents()), eventsMs) }
    return
  }
  if (on.core) poll('/core', 0, (r) => {
    if (!r.ok || !r.data || !r.data.configuration) return true
    on.core(r.data.configuration)
    return false
  })
  if (on.status) poll('/status', statusMs, (r) => {
    on.status(r.ok ? toReading(r.data) : { at: Date.now(), online: false })
    return true
  })
  if (on.events) poll('/events?category=all&limit=40', eventsMs, (r) => {
    if (r.ok && r.data && Array.isArray(r.data.events)) on.events(r.data.events)
    return true
  })
}

function poll(path, everyMs, handle) {
  let wait = everyMs || 5000
  const tick = async () => {
    const r = await getJson(path)
    if (!handle(r)) return
    wait = r.retryAfter ? r.retryAfter * 1000 : r.ok ? everyMs : Math.min(Math.max(wait * 2, 5000), 60000)
    setTimeout(tick, wait)
  }
  tick()
}
```

- [ ] **Step 4: Run** `npm test` — expected: all pass.
- [ ] **Step 5: Commit** — `git add -A && git commit -m "Add the LED renderer, board layouts, sound, demo data and pollers"`.

---

### Task 5: Pages

**Files:** Create `dist/css/kit.css`, `dist/favicon.svg`, `dist/board.html`, `dist/js/board.js`, `dist/alerts.html`, `dist/js/alerts.js`, `dist/ticker.html`, `dist/js/ticker.js`, `dist/live.html`, `dist/js/live.js`, `dist/index.html`, `dist/js/setup.js`.

**Interfaces — Consumes:** everything from Tasks 1 to 4. **Produces:** the five pages. `alerts.html` also accepts `postMessage({type: 'squeek-test-alert'})` from the same origin (the setup page's "fire test alert").

- [ ] **Step 1: Styles and icon**

**File:** `dist/css/kit.css`
```css
/* Squeek Stream Kit: tokens and components are described in DESIGN.md. */
@font-face { font-family: "IBM Plex Mono"; font-weight: 400; font-display: swap; src: url(../fonts/ibm-plex-mono-400.woff2) format("woff2"); }
@font-face { font-family: "IBM Plex Mono"; font-weight: 500; font-display: swap; src: url(../fonts/ibm-plex-mono-500.woff2) format("woff2"); }
@font-face { font-family: "Barlow Condensed"; font-weight: 700; font-display: swap; src: url(../fonts/barlow-condensed-700.woff2) format("woff2"); }

:root {
  --page: #000;
  --plate: #050507;
  --line: #1d1d23;
  --line-strong: #2d2d36;
  --ink: #f3f3f6;
  --text: #cfcfd8;
  --muted: #8d8d9b;
  --accent: #f6a63b;
  --on-accent: #120d05;
  --font-mono: "IBM Plex Mono", ui-monospace, Menlo, Consolas, monospace;
  --font-head: "Barlow Condensed", "Arial Narrow", system-ui, sans-serif;
  --wrap: 1180px;
  --gutter: 24px;
  color-scheme: dark;
}
[data-theme="green"] { --accent: #7fe08a; }
[data-theme="ice"] { --accent: #7fdcff; }
[data-theme="white"] { --accent: #f3e9cc; }

* { box-sizing: border-box; }
[hidden] { display: none !important; }

/* ---------------------------------------------------------------- overlays: transparent pages for OBS */
html.overlay, html.overlay body { margin: 0; background: transparent; overflow: hidden; }
.plate { background: var(--plate); border-radius: 14px; padding: 2.2%; }
.plate canvas { display: block; width: 100%; }
.board-page { width: 100vw; }

.alert-page { position: fixed; inset: 0; display: grid; align-items: end; justify-items: center; padding: 2vw; }
.alert-card { width: 100%; transform: translateY(120%); opacity: 0; transition: transform 0.45s cubic-bezier(0.2, 0.9, 0.25, 1.2), opacity 0.3s; }
.alert-card.show { transform: none; opacity: 1; }
@media (prefers-reduced-motion: reduce) { .alert-card { transition: opacity 0.2s; transform: none; } }

.ticker { display: flex; align-items: stretch; height: 100vh; background: var(--plate); border-top: 2px solid var(--accent); font-family: var(--font-mono); }
.ticker .clock { flex: none; width: 15vh; min-width: 120px; padding: 1.4vh; display: grid; place-items: center; border-right: 1px solid var(--line-strong); }
.ticker .clock canvas { display: block; width: 100%; }
.ticker .lane { flex: 1; overflow: hidden; display: flex; align-items: center; }
.ticker .track { display: inline-flex; white-space: nowrap; animation: scroll linear infinite; animation-duration: 60s; }
.ticker .item { font-size: 34vh; color: var(--text); padding-right: 4em; }
.ticker .item b { color: var(--accent); font-weight: 500; margin-right: 0.7em; }
@keyframes scroll { from { transform: translateX(0); } to { transform: translateX(-50%); } }
@media (prefers-reduced-motion: reduce) { .ticker .track { animation: none; } }

/* ---------------------------------------------------------------- site pages */
html.site, html.site body { margin: 0; background: var(--page); color: var(--text); font: 400 16px/1.6 var(--font-mono); -webkit-font-smoothing: antialiased; }
a { color: var(--accent); text-underline-offset: 3px; }
a:hover { color: var(--ink); }
:focus-visible { outline: 2px solid var(--accent); outline-offset: 2px; }
h1, h2, h3 { font-family: var(--font-head); font-weight: 700; text-transform: uppercase; color: var(--ink); line-height: 0.95; margin: 0; text-wrap: balance; }
h1 { font-size: 72px; }
h2 { font-size: 40px; margin-bottom: 28px; }
h3 { font-size: 22px; }
.wrap { max-width: var(--wrap); margin: 0 auto; padding: 0 var(--gutter); }
.fine { font-size: 13px; color: var(--muted); }
.label { font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); }
code { background: #141418; color: var(--ink); padding: 1px 5px; border-radius: 3px; font-size: 0.93em; }

.bar { position: sticky; top: 0; z-index: 5; background: rgb(0 0 0 / 0.86); border-bottom: 1px solid var(--line); backdrop-filter: blur(8px); }
.bar .wrap { display: flex; align-items: center; gap: 28px; height: 60px; }
.brand { display: flex; align-items: center; gap: 10px; text-decoration: none; color: var(--ink); font: 700 22px/1 var(--font-head); text-transform: uppercase; letter-spacing: 0.02em; white-space: nowrap; }
.nav { display: flex; gap: 22px; margin-left: auto; }
.nav a { font-size: 12px; letter-spacing: 0.12em; text-transform: uppercase; color: var(--muted); text-decoration: none; }
.nav a:hover { color: var(--ink); }

.btn { display: inline-flex; align-items: center; justify-content: center; gap: 8px; min-height: 44px; padding: 0 22px; border-radius: 6px; border: 1px solid var(--line-strong); background: transparent; color: var(--ink); font: 500 13px/1 var(--font-mono); letter-spacing: 0.12em; text-transform: uppercase; text-decoration: none; cursor: pointer; white-space: nowrap; }
.btn:hover { border-color: var(--muted); color: var(--ink); }
.btn.solid { background: var(--accent); border-color: var(--accent); color: var(--on-accent); }
.btn.solid:hover { filter: brightness(1.08); }
.btn.small { min-height: 34px; padding: 0 14px; font-size: 11px; }

.block { padding: 88px 0; border-top: 1px solid var(--line); }
.hero { display: grid; grid-template-columns: minmax(0, 5fr) minmax(0, 7fr); gap: 56px; align-items: center; padding: 64px 0 88px; }
.lead { max-width: 50ch; margin: 22px 0 32px; }
.actions { display: flex; flex-wrap: wrap; gap: 12px; }

/* a fake stream frame behind the previews, so transparency reads as an overlay */
.stage { position: relative; aspect-ratio: 16 / 9; border-radius: 10px; overflow: hidden; border: 1px solid var(--line-strong);
  background:
    radial-gradient(60% 80% at 70% 30%, rgb(70 90 140 / 0.55), transparent 70%),
    radial-gradient(50% 60% at 20% 80%, rgb(140 80 40 / 0.45), transparent 70%),
    repeating-linear-gradient(90deg, rgb(255 255 255 / 0.025) 0 2px, transparent 2px 40px),
    #11131a; }
.stage .tag { position: absolute; left: 12px; top: 10px; font-size: 11px; letter-spacing: 0.12em; text-transform: uppercase; color: rgb(255 255 255 / 0.55); }
.stage .slot { position: absolute; overflow: hidden; }
.stage iframe { border: 0; transform-origin: 0 0; background: transparent; }

.setup { display: grid; grid-template-columns: minmax(0, 4fr) minmax(0, 8fr); gap: 48px; align-items: start; }
.form { position: sticky; top: 84px; display: grid; gap: 22px; }
.field { display: grid; gap: 8px; }
.chips { display: flex; flex-wrap: wrap; gap: 8px; }
.chip { position: relative; }
.chip input { position: absolute; opacity: 0; inset: 0; cursor: pointer; }
.chip span { display: inline-flex; align-items: center; gap: 8px; min-height: 34px; padding: 0 12px; border: 1px solid var(--line-strong); border-radius: 6px; font-size: 12px; letter-spacing: 0.08em; text-transform: uppercase; color: var(--muted); }
.chip input:checked + span { border-color: var(--accent); color: var(--ink); }
.chip input:focus-visible + span { outline: 2px solid var(--accent); outline-offset: 2px; }
.swatch { width: 10px; height: 10px; border-radius: 50%; background: var(--c); }
.range { display: flex; align-items: center; gap: 12px; }
.range input { flex: 1; accent-color: var(--accent); }
.range output { min-width: 5ch; text-align: right; color: var(--ink); }

.outputs { display: grid; gap: 28px; }
.out { border: 1px solid var(--line); border-radius: 10px; padding: 18px; display: grid; gap: 14px; }
.out-head { display: flex; flex-wrap: wrap; align-items: baseline; justify-content: space-between; gap: 8px; }
.url { display: flex; gap: 8px; }
.url input { flex: 1; min-width: 0; height: 36px; padding: 0 10px; border: 1px solid var(--line-strong); border-radius: 6px; background: #0b0b0e; color: var(--text); font: 400 12px var(--font-mono); }

.steps { margin: 0; padding: 0; list-style: none; counter-reset: s; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr)); gap: 28px; }
.steps li { counter-increment: s; border-top: 1px solid var(--line-strong); padding-top: 14px; font-size: 14px; }
.steps li::before { content: "0" counter(s); display: block; color: var(--accent); font-size: 12px; letter-spacing: 0.12em; margin-bottom: 8px; }
table { width: 100%; border-collapse: collapse; font-size: 14px; }
th, td { text-align: left; padding: 10px 12px 10px 0; border-top: 1px solid var(--line); vertical-align: top; }
th { font-weight: 500; color: var(--muted); font-size: 12px; letter-spacing: 0.1em; text-transform: uppercase; }
td:first-child { color: var(--ink); white-space: nowrap; }

.foot { border-top: 1px solid var(--line); padding: 40px 0 56px; font-size: 13px; color: var(--muted); }
.foot .wrap { display: flex; flex-wrap: wrap; gap: 12px 40px; justify-content: space-between; }

/* ---------------------------------------------------------------- the second screen */
.live { max-width: 560px; margin: 0 auto; padding: 16px; display: grid; gap: 16px; }
.live .plate { padding: 12px; }
.clockline { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid var(--line); padding-bottom: 12px; }
.clockline strong { font: 700 34px/1 var(--font-head); color: var(--ink); }
.feed { list-style: none; margin: 0; padding: 0; }
.feed li { display: grid; grid-template-columns: 6.5em 1fr; gap: 10px; padding: 9px 0; border-top: 1px solid var(--line); font-size: 14px; }
.feed li span:first-child { color: var(--muted); font-size: 12px; padding-top: 2px; }

@media (max-width: 960px) {
  .hero, .setup { grid-template-columns: minmax(0, 1fr); }
  .form { position: static; }
  h1 { font-size: 54px; }
}
@media (max-width: 640px) {
  :root { --gutter: 16px; }
  .nav { display: none; }
  h1 { font-size: 44px; }
  h2 { font-size: 32px; }
  .block { padding: 56px 0; }
  .hero { padding: 40px 0 56px; }
}
```

**File:** `dist/favicon.svg`
```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><rect width="32" height="32" rx="6" fill="#050507"/><g fill="#6b6b78"><circle cx="16" cy="5" r="1.6"/><circle cx="23.8" cy="8.2" r="1.6"/><circle cx="27" cy="16" r="1.6"/><circle cx="23.8" cy="23.8" r="1.6"/><circle cx="16" cy="27" r="1.6"/><circle cx="8.2" cy="23.8" r="1.6"/><circle cx="5" cy="16" r="1.6"/><circle cx="8.2" cy="8.2" r="1.6"/></g><g fill="#f3e9cc"><circle cx="19.5" cy="12.5" r="1.6"/><circle cx="12.5" cy="19.5" r="1.6"/></g><circle cx="16" cy="16" r="2.6" fill="#f6a63b"/></svg>
```

- [ ] **Step 2: The overlay pages**

**File:** `dist/board.html`
```html
<!doctype html>
<html lang="en" class="overlay">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Squeek Stream Kit: board</title>
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="css/kit.css">
</head>
<body>
  <div class="board-page plate"><canvas id="led" role="img" aria-label="Squeektoshi's wheel on an LED board"></canvas></div>
  <script type="module" src="js/board.js"></script>
</body>
</html>
```

**File:** `dist/js/board.js`
```js
import { parseParams, THEMES } from './params.js'
import { createWheel } from './wheel.js'
import { startSource } from './source.js'
import { Led } from './led.js'
import { drawFull, drawStrip, stateText } from './boardview.js'

// The LED board overlay: one canvas, redrawn about 12 times a second; data every 5 s (every second in the demo).
const opts = parseParams(location.search)
const accent = THEMES[opts.theme]
const canvas = document.getElementById('led')
const led = new Led(canvas)
const wheel = createWheel({ zoomiesKmh: opts.zoomies, napMs: opts.demo ? 20_000 : 180_000 })
const still = matchMedia('(prefers-reduced-motion: reduce)').matches
let reading = null
let turn = 0
let last = performance.now()

startSource({ demo: opts.demo }, {
  status(r) {
    wheel.push(r)
    if (r.online) reading = r
  },
})

function frame(now) {
  const dt = Math.min(0.5, (now - last) / 1000)
  last = now
  const running = wheel.phase === 'running' && reading
  if (running && !still) turn = (turn + reading.rpm * 2 * dt) % 360
  const view = { reading, phase: wheel.phase, fast: Boolean(running) && reading.speedKmh >= opts.zoomies, accent, turn }
  ;(opts.layout === 'strip' ? drawStrip : drawFull)(led, view)
  led.paint()
  canvas.setAttribute('aria-label', `Squeektoshi ${stateText(view.phase, reading, view.fast).toLowerCase()}`)
  setTimeout(() => requestAnimationFrame(frame), 80)
}
requestAnimationFrame(frame)
```

**File:** `dist/alerts.html`
```html
<!doctype html>
<html lang="en" class="overlay">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Squeek Stream Kit: alerts</title>
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="css/kit.css">
</head>
<body>
  <div class="alert-page">
    <div class="alert-card plate" id="card" role="status" aria-live="polite"><canvas id="led"></canvas></div>
  </div>
  <script type="module" src="js/alerts.js"></script>
</body>
</html>
```

**File:** `dist/js/alerts.js`
```js
import { parseParams, THEMES } from './params.js'
import { createWheel } from './wheel.js'
import { createFeed, alertFor, wheelAlert } from './feed.js'
import { startSource } from './source.js'
import { createSound } from './sound.js'
import { Led, textWidth } from './led.js'
import { COLORS } from './boardview.js'
import { DEMO_ALERTS } from './demo.js'

// The alerts overlay: empty until something happens, then one card at a time for `dur` seconds, 1 s apart,
// at most five waiting (the oldest is dropped).
const opts = parseParams(location.search)
const accent = THEMES[opts.theme]
const card = document.getElementById('card')
const led = new Led(document.getElementById('led'))
const sound = createSound({ vol: opts.vol, on: opts.sound })
const queue = []
let busy = false
const COLS = 200
const ROWS = 30
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

function enqueue(a, force = false) {
  if (!a || (!force && !opts.alerts.includes(a.kind))) return
  queue.push(a)
  while (queue.length > 5) queue.shift()
  if (!busy) next()
}

function draw(a) {
  led.grid(COLS, ROWS)
  for (let x = 0; x < COLS; x++) { led.dot(x, 0, COLORS.dim); led.dot(x, ROWS - 1, COLORS.dim) }
  for (let y = 0; y < ROWS; y++) { led.dot(0, y, COLORS.dim); led.dot(COLS - 1, y, COLORS.dim) }
  const k = textWidth(a.title, 2) <= COLS - 8 ? 2 : 1
  led.text(a.title, Math.floor((COLS - textWidth(a.title, k)) / 2), k === 2 ? 4 : 8, accent, k)
  led.text(a.detail, Math.floor((COLS - textWidth(a.detail, 1)) / 2), 21, COLORS.cream)
  led.paint()
  card.setAttribute('aria-label', `${a.title}. ${a.detail}`)
}

async function next() {
  const a = queue.shift()
  if (!a) { busy = false; return }
  busy = true
  draw(a)
  card.classList.add('show')
  sound.play(a.kind)
  await wait(opts.dur * 1000)
  card.classList.remove('show')
  await wait(1000)
  next()
}

if (opts.demo) {
  let i = 0
  const fire = () => {
    const enabled = DEMO_ALERTS.filter((a) => opts.alerts.includes(a.kind))
    if (enabled.length) enqueue(enabled[i++ % enabled.length])
  }
  fire()
  setInterval(fire, 8000)
} else {
  const wheel = createWheel({ zoomiesKmh: opts.zoomies })
  const feed = createFeed()
  startSource({}, {
    status(r) { for (const kind of wheel.push(r)) enqueue(wheelAlert(kind, r)) },
    events(list) { for (const e of feed.ingest(list)) enqueue(alertFor(e)) },
  })
}

// The setup page's "fire test alert" button reaches its preview through postMessage.
let testIndex = 0
window.addEventListener('message', (e) => {
  if (e.origin !== location.origin || !e.data || e.data.type !== 'squeek-test-alert') return
  sound.unlock()
  enqueue(DEMO_ALERTS[testIndex++ % DEMO_ALERTS.length], true)
})
```

**File:** `dist/ticker.html`
```html
<!doctype html>
<html lang="en" class="overlay">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Squeek Stream Kit: ticker</title>
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="css/kit.css">
</head>
<body>
  <div class="ticker">
    <div class="clock"><canvas id="clock" role="img" aria-label="Round clock"></canvas></div>
    <div class="lane" aria-live="off"><div class="track" id="track"></div></div>
  </div>
  <script type="module" src="js/ticker.js"></script>
</body>
</html>
```

**File:** `dist/js/ticker.js`
```js
import { parseParams, THEMES } from './params.js'
import { lineFor, agoText } from './feed.js'
import { startSource } from './source.js'
import { roundAt, clock } from './rounds.js'
import { Led } from './led.js'
import { COLORS } from './boardview.js'

// The lower-third ticker: the round clock on the left, the latest feed items scrolling on the right.
const opts = parseParams(location.search)
document.documentElement.dataset.theme = opts.theme
const accent = THEMES[opts.theme]
const clockCanvas = document.getElementById('clock')
const led = new Led(clockCanvas, { fit: 'contain' })
const track = document.getElementById('track')
let core = null
let latest = []
let shownKey = ''

function drawClock() {
  const r = core ? roundAt(Date.now() / 1000, Number(core.genesisTimestamp), Number(core.roundDuration)) : null
  led.grid(56, 18)
  led.text(r && r.round ? `ROUND ${r.round}` : 'ROUND --', 1, 1, COLORS.label)
  led.text(r ? `${clock(r.left)} LEFT` : '--:-- LEFT', 1, 10, accent)
  led.paint()
  clockCanvas.setAttribute('aria-label', r ? `Round ${r.round}, ${clock(r.left)} left` : 'Round clock')
}

function render(force = false) {
  const items = latest.map((e) => ({ e, text: lineFor(e) })).filter((x) => x.text).slice(0, 12)
  const key = items.map((x) => x.e.id).join()
  if (!force && key === shownKey) return
  shownKey = key
  track.textContent = ''
  if (!items.length) return
  const now = Date.now()
  for (let copy = 0; copy < 2; copy++) {
    for (const { e, text } of items) {
      const span = document.createElement('span')
      span.className = 'item'
      const when = document.createElement('b')
      when.textContent = agoText(e.occurredAt, now)
      span.append(when, text)
      track.append(span)
    }
  }
  track.style.animationDuration = Math.max(25, track.textContent.length * 0.1) + 's'
}

startSource({ demo: opts.demo }, {
  core(c) { core = c; drawClock() },
  events(list) { latest = list; render() },
})
drawClock()
setInterval(drawClock, 1000)
setInterval(() => render(true), 60_000)
```

**File:** `dist/live.html`
```html
<!doctype html>
<html lang="en" class="site">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Squeektoshi live</title>
  <meta name="description" content="Squeektoshi's wheel right now: state, today's distance, speed, the round clock and the latest Squeekchain events.">
  <meta name="theme-color" content="#000000">
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link rel="stylesheet" href="css/kit.css">
</head>
<body>
  <main class="live">
    <a class="brand" href="./"><img src="favicon.svg" alt="" width="24" height="24">Squeektoshi live</a>
    <div class="plate"><canvas id="led" role="img" aria-label="Squeektoshi's wheel"></canvas></div>
    <div class="clockline"><span class="label" id="round">Round --</span><strong id="left">--:--</strong></div>
    <section aria-labelledby="feed-h">
      <h2 id="feed-h" class="label">Latest on Squeekchain</h2>
      <ul class="feed" id="feed"><li><span></span><span>Loading…</span></li></ul>
    </section>
    <p class="actions">
      <a class="btn solid" href="https://sepolia.squeekchain.com/#live" target="_blank" rel="noopener">Watch the wheel</a>
      <a class="btn" href="./">Get the overlays</a>
    </p>
    <p class="fine">Data from Squeekchain's public API. Not affiliated with Squeekchain.</p>
  </main>
  <script type="module" src="js/live.js"></script>
</body>
</html>
```

**File:** `dist/js/live.js`
```js
import { parseParams, THEMES } from './params.js'
import { createWheel } from './wheel.js'
import { lineFor, agoText } from './feed.js'
import { startSource } from './source.js'
import { roundAt, clock } from './rounds.js'
import { Led } from './led.js'
import { drawFull } from './boardview.js'

// The second screen: the board, the round clock and the feed, for a phone next to the stream.
const opts = parseParams(location.search)
document.documentElement.dataset.theme = opts.theme
const accent = THEMES[opts.theme]
const led = new Led(document.getElementById('led'))
const wheel = createWheel({ zoomiesKmh: opts.zoomies, napMs: opts.demo ? 20_000 : 180_000 })
const feedList = document.getElementById('feed')
let reading = null
let core = null
let turn = 0
let last = performance.now()
let events = []

function drawFeed() {
  const items = events.map((e) => ({ e, text: lineFor(e) })).filter((x) => x.text).slice(0, 20)
  feedList.textContent = ''
  if (!items.length) {
    const li = document.createElement('li')
    li.append(document.createElement('span'), 'Nothing yet.')
    feedList.append(li)
    return
  }
  const now = Date.now()
  for (const { e, text } of items) {
    const li = document.createElement('li')
    const when = document.createElement('span')
    when.textContent = agoText(e.occurredAt, now)
    const what = document.createElement('span')
    what.textContent = text
    li.append(when, what)
    feedList.append(li)
  }
}

function tickClock() {
  if (!core) return
  const r = roundAt(Date.now() / 1000, Number(core.genesisTimestamp), Number(core.roundDuration))
  document.getElementById('round').textContent = `Round ${r.round}`
  document.getElementById('left').textContent = clock(r.left)
}

startSource({ demo: opts.demo }, {
  core(c) { core = c; tickClock() },
  status(r) { wheel.push(r); if (r.online) reading = r },
  events(list) { events = list; drawFeed() },
})
setInterval(tickClock, 1000)
setInterval(drawFeed, 60_000)

function frame(now) {
  const dt = Math.min(0.5, (now - last) / 1000)
  last = now
  const running = wheel.phase === 'running' && reading
  if (running) turn = (turn + reading.rpm * 2 * dt) % 360
  drawFull(led, { reading, phase: wheel.phase, fast: Boolean(running) && reading.speedKmh >= opts.zoomies, accent, turn })
  led.paint()
  setTimeout(() => requestAnimationFrame(frame), 100)
}
requestAnimationFrame(frame)
```

- [ ] **Step 3: The setup page**

**File:** `dist/index.html`
```html
<!doctype html>
<html lang="en" class="site">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Squeek Stream Kit</title>
  <meta name="description" content="Free OBS and Streamlabs overlays for Squeekchain streams: Squeektoshi's live wheel on an LED board, alerts for wake-ups, zoomies, blocks and records, a round ticker and a second-screen page.">
  <meta name="theme-color" content="#000000">
  <link rel="icon" href="favicon.svg" type="image/svg+xml">
  <link rel="preload" href="fonts/barlow-condensed-700.woff2" as="font" type="font/woff2" crossorigin>
  <link rel="stylesheet" href="css/kit.css">
</head>
<body>
  <header class="bar">
    <div class="wrap">
      <a class="brand" href="#top"><img src="favicon.svg" alt="" width="28" height="28">Squeek Stream Kit</a>
      <nav class="nav" aria-label="Sections">
        <a href="#setup">Setup</a>
        <a href="#obs">OBS</a>
        <a href="#alerts">Alerts</a>
        <a href="live.html">Second screen</a>
      </nav>
    </div>
  </header>

  <main id="top">
    <section class="wrap hero" aria-labelledby="hero-h">
      <div>
        <p class="label">Squeekchain Genesis · stream overlays</p>
        <h1 id="hero-h">Put Squeektoshi on your stream</h1>
        <p class="lead">An LED board of the hamster's wheel, alerts when he wakes up, gets the zoomies or a block is found, and a
          round ticker for your lower third. Browser sources for OBS and Streamlabs, free, no account, no key.</p>
        <div class="actions">
          <a class="btn solid" href="#setup">Get your overlay links</a>
          <a class="btn" href="live.html">Open the second screen</a>
        </div>
      </div>
      <div class="stage" id="hero-stage">
        <span class="tag">Your stream</span>
        <div class="slot" data-src="board.html?demo=1" data-w="880" data-h="528" style="left: 4%; top: 6%; width: 42%;"></div>
        <div class="slot" data-src="alerts.html?demo=1&amp;sound=0" data-w="1000" data-h="150" style="left: 50%; top: 52%; width: 46%;"></div>
        <div class="slot" data-src="ticker.html?demo=1" data-w="1920" data-h="72" style="left: 0; bottom: 0; width: 100%;"></div>
      </div>
    </section>

    <section class="block" id="setup" aria-labelledby="setup-h">
      <div class="wrap">
        <h2 id="setup-h">Set it up</h2>
        <div class="setup">
          <form class="form" id="form" aria-label="Overlay options">
            <div class="field">
              <span class="label">LED color</span>
              <div class="chips" id="themes"></div>
            </div>
            <fieldset class="field" style="border:0;padding:0;margin:0">
              <legend class="label">Alerts</legend>
              <div class="chips" id="kinds"></div>
            </fieldset>
            <label class="field"><span class="label">Zoomies at (km/h)</span>
              <span class="range"><input type="range" id="zoomies" min="1" max="10" step="0.5"><output for="zoomies"></output></span></label>
            <label class="field"><span class="label">Alert time (s)</span>
              <span class="range"><input type="range" id="dur" min="3" max="15" step="1"><output for="dur"></output></span></label>
            <label class="field"><span class="label">Sound volume</span>
              <span class="range"><input type="range" id="vol" min="0" max="100" step="5"><output for="vol"></output></span></label>
            <div class="chips">
              <label class="chip"><input type="checkbox" id="sound"><span>Sound on</span></label>
              <label class="chip"><input type="checkbox" id="demo"><span>Demo data in OBS</span></label>
            </div>
            <p class="fine">Previews always run on sample data. Untick nothing to go live: the links below use the real wheel
              unless "Demo data in OBS" is on.</p>
          </form>
          <div class="outputs" id="outputs"></div>
        </div>
      </div>
    </section>

    <section class="block" id="obs" aria-labelledby="obs-h">
      <div class="wrap">
        <h2 id="obs-h">Add it in OBS or Streamlabs</h2>
        <ol class="steps">
          <li>Copy a link above.</li>
          <li>In OBS: Sources, +, Browser. In Streamlabs: Add Source, Browser Source. Paste the link as the URL.</li>
          <li>Set the width and height shown next to the link. Leave the custom CSS empty: the pages are already transparent.</li>
          <li>For alert sounds tick "Control audio via OBS", and untick "Shutdown source when not visible".</li>
        </ol>
      </div>
    </section>

    <section class="block" id="alerts" aria-labelledby="alerts-h">
      <div class="wrap">
        <h2 id="alerts-h">What sets off an alert</h2>
        <table>
          <thead><tr><th>Alert</th><th>When</th></tr></thead>
          <tbody>
            <tr><td>Wake up</td><td>The wheel turns again on two readings in a row after at least three minutes still.</td></tr>
            <tr><td>Nap</td><td>Three minutes without a turn after he was running.</td></tr>
            <tr><td>Zoomies</td><td>Running at or above your threshold (4.5 km/h by default) on two readings in a row. Once per burst.</td></tr>
            <tr><td>Block found</td><td>A settlement on SqueekCore completes one or more Squeek blocks.</td></tr>
            <tr><td>Top speed</td><td>Squeekchain records a new top speed.</td></tr>
            <tr><td>Distance</td><td>Lifetime and daily distance milestones.</td></tr>
            <tr><td>Streak</td><td>Days in a row over 5 km.</td></tr>
            <tr><td>Merge</td><td>Someone merges two Squeeks (off by default).</td></tr>
          </tbody>
        </table>
        <p class="fine">Readings come from Squeekchain's public API every 5 seconds, the event feed every 15. Reloading a
          source never replays old alerts. If the API is down the board shows OFF AIR and keeps the last values.</p>
      </div>
    </section>
  </main>

  <footer class="foot">
    <div class="wrap">
      <span>Squeek Stream Kit. Built for the <a href="https://squeekchain.com/genesis/code" target="_blank" rel="noopener">Squeekchain Genesis Code Lane</a>. Not affiliated with Squeekchain.</span>
      <span><a href="https://github.com/am3en0x/squeek-stream-kit" target="_blank" rel="noopener">Source</a> · <a href="https://docs.squeekchain.com/developers/api/" target="_blank" rel="noopener">Squeekchain API</a></span>
    </div>
  </footer>

  <script type="module" src="js/setup.js"></script>
</body>
</html>
```

**File:** `dist/js/setup.js`
```js
import { parseParams, toQuery, THEMES, ALERT_KINDS, DEFAULTS } from './params.js'

// The setup page: options in, one ready link per overlay out, each with a live preview on sample data.
const OVERLAYS = [
  { id: 'board', name: 'LED board', page: 'board.html', w: 880, h: 528, note: 'A corner of your scene.' },
  { id: 'strip', name: 'LED strip', page: 'board.html', extra: { layout: 'strip' }, w: 890, h: 100, note: 'A slim bar for the top or bottom.' },
  { id: 'alerts', name: 'Alerts', page: 'alerts.html', w: 1000, h: 150, note: 'Empty until something happens.' },
  { id: 'ticker', name: 'Ticker', page: 'ticker.html', w: 1920, h: 72, note: 'The round clock and the latest events.' },
]
const KIND_NAMES = { wake: 'Wake up', nap: 'Nap', zoomies: 'Zoomies', block: 'Block found', record: 'Top speed', distance: 'Distance', streak: 'Streak', merge: 'Merge' }
const base = new URL('.', location.href).href
const opts = { ...DEFAULTS, alerts: [...DEFAULTS.alerts] }
const $ = (id) => document.getElementById(id)

// a preview: an iframe at the overlay's real size, scaled into its slot
function mount(slot, src, w, h) {
  const frame = document.createElement('iframe')
  frame.src = src
  frame.width = w
  frame.height = h
  frame.title = 'Overlay preview'
  frame.loading = 'lazy'
  frame.setAttribute('allowtransparency', 'true')
  slot.append(frame)
  const fit = () => {
    const k = slot.clientWidth / w
    frame.style.transform = `scale(${k})`
    slot.style.height = h * k + 'px'
  }
  new ResizeObserver(fit).observe(slot)
  fit()
  return frame
}

for (const slot of document.querySelectorAll('#hero-stage .slot')) mount(slot, slot.dataset.src, Number(slot.dataset.w), Number(slot.dataset.h))

// the form
const themes = $('themes')
for (const [name, color] of Object.entries(THEMES)) {
  const label = document.createElement('label')
  label.className = 'chip'
  label.innerHTML = `<input type="radio" name="theme" value="${name}"><span><i class="swatch" style="--c:${color}"></i>${name}</span>`
  themes.append(label)
}
const kinds = $('kinds')
for (const kind of ALERT_KINDS) {
  const label = document.createElement('label')
  label.className = 'chip'
  label.innerHTML = `<input type="checkbox" name="kind" value="${kind}"><span>${KIND_NAMES[kind]}</span>`
  kinds.append(label)
}

// the outputs
const outputs = $('outputs')
const cards = OVERLAYS.map((o) => {
  const el = document.createElement('article')
  el.className = 'out'
  el.innerHTML = `
    <div class="out-head"><h3>${o.name}</h3><span class="fine">Source size ${o.w} × ${o.h}. ${o.note}</span></div>
    <div class="stage"><div class="slot" style="left:4%;top:8%;width:92%"></div></div>
    <div class="url"><input readonly aria-label="${o.name} link"><button class="btn small" type="button" data-copy>Copy</button>${o.id === 'alerts' ? '<button class="btn small" type="button" data-test>Test alert</button>' : ''}</div>`
  outputs.append(el)
  return { o, el, input: el.querySelector('input'), slot: el.querySelector('.slot'), frame: null }
})

function link(o, demo) {
  return base + o.page + toQuery({ ...opts, ...(o.extra || {}), demo })
}

function refresh() {
  document.documentElement.dataset.theme = opts.theme
  for (const c of cards) {
    c.input.value = link(c.o, opts.demo)
    const previewSrc = link(c.o, true) + (c.o.id === 'alerts' ? '&sound=0' : '')
    if (!c.frame) c.frame = mount(c.slot, previewSrc, c.o.w, c.o.h)
    else if (c.frame.dataset.src !== previewSrc) c.frame.src = previewSrc
    c.frame.dataset.src = previewSrc
  }
  for (const id of ['zoomies', 'dur', 'vol']) $(id).nextElementSibling.textContent = String(opts[id])
}

function readForm() {
  opts.theme = document.querySelector('input[name=theme]:checked')?.value || DEFAULTS.theme
  opts.alerts = [...document.querySelectorAll('input[name=kind]:checked')].map((i) => i.value)
  opts.zoomies = Number($('zoomies').value)
  opts.dur = Number($('dur').value)
  opts.vol = Number($('vol').value)
  opts.sound = $('sound').checked
  opts.demo = $('demo').checked
  refresh()
}

function fillForm() {
  const from = parseParams(location.search)
  Object.assign(opts, from)
  document.querySelector(`input[name=theme][value=${opts.theme}]`).checked = true
  for (const i of document.querySelectorAll('input[name=kind]')) i.checked = opts.alerts.includes(i.value)
  $('zoomies').value = opts.zoomies
  $('dur').value = opts.dur
  $('vol').value = opts.vol
  $('sound').checked = opts.sound
  $('demo').checked = opts.demo
}

$('form').addEventListener('input', readForm)
outputs.addEventListener('click', async (e) => {
  const card = cards.find((c) => c.el.contains(e.target))
  if (!card) return
  if (e.target.closest('[data-copy]')) {
    card.input.select()
    try { await navigator.clipboard.writeText(card.input.value); e.target.textContent = 'Copied' } catch { e.target.textContent = 'Select and copy' }
    setTimeout(() => { e.target.textContent = 'Copy' }, 1600)
  }
  if (e.target.closest('[data-test]') && card.frame) card.frame.contentWindow.postMessage({ type: 'squeek-test-alert' }, location.origin)
})

fillForm()
refresh()
```

- [ ] **Step 4: Check in a browser** — serve `dist/` (`python -m http.server 8770 -d dist`), open `index.html`, `board.html?demo=1`, `board.html?demo=1&layout=strip`, `alerts.html?demo=1`, `ticker.html?demo=1`, `live.html?demo=1`, and the same pages without `demo` (real API). Expected: no console errors; previews animate; the copy button and test alert work.
- [ ] **Step 5: Run** `npm test` (still green) and **commit** — `git add -A && git commit -m "Add the board, alerts, ticker, second screen and setup pages"`.

---

### Task 6: Browser verification, docs and handoff

**Files:** Create `test/browser/check.md` is not needed; create `README.md`, `DESIGN.md`, `docs/IMD_JOB.md`, `docs/screens/*.png`.

- [ ] **Step 1: Scripted browser check** with Playwright against `python -m http.server`:
  - each overlay page at its recommended source size with `demo=1`: no console errors, the canvas has non-zero size;
  - `alerts.html` with a stubbed `fetch` returning `test/fixtures/status-active.json` after a still sequence: a wake alert appears (the card gets `.show`);
  - `index.html` at 1440 × 900 and 390 × 844: no horizontal scroll; "Copy" fills the clipboard; "Test alert" shows a card in the alerts preview;
  - `live.html` at 390 × 844 against the real API: the feed lists items.
  - Save screenshots to `docs/screens/` (setup page, hero stage, each overlay over the stage, the phone page). Close the browser.
- [ ] **Step 2: Docs.** `README.md`: what it is, the four overlays with sizes and options table, the second screen, data sources and polling, how to run tests (`npm test`) and serve locally, IMD and Pages hosting, license. `DESIGN.md`: tokens, type, LED colors, components, do's and don'ts. `docs/IMD_JOB.md`: Website from GitHub, the description to paste, what IMD checks, cost and wallet.
- [ ] **Step 3: Commit** — `git add -A && git commit -m "Document the kit and record the browser check"`.
- [ ] **Step 4: Preview for the owner** — publish `dist/index.html` with its files as an Artifact (demo previews work without the API) and send the link plus screenshots.
- [ ] **Step 5: Push and host** once the owner has created `am3en0x/squeek-stream-kit`: `git remote add origin https://github.com/am3en0x/squeek-stream-kit.git && git push -u origin main`, then `git push origin $(git subtree split --prefix dist main):refs/heads/gh-pages`.
