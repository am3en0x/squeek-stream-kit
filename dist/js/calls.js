// Round Call: during round N everyone calls what Squeektoshi does in round N+1 (nap, jog or zoomies); the real readings
// of round N+1 settle it. One viewer's calls and score live here, and so does the Twitch chat's tally when a channel
// is connected. Pure: pages push readings, call tick() and read the state.
import { roundAt } from './rounds.js'

export const CALLS = ['nap', 'jog', 'zoomies']
export const POINTS = { nap: 1, jog: 1, zoomies: 3 }

// The outcome of a round from its readings: zoomies on two online readings in a row at or over the threshold, jog if
// the wheel turned at all, nap if it never did, void when nothing online was seen.
export function outcomeOf(readings, zoomiesKmh = 4.5) {
  let online = 0
  let moved = false
  let fast = 0
  for (const r of readings || []) {
    if (!r || !r.online) { fast = 0; continue }
    online += 1
    if (r.rpm > 0) moved = true
    fast = r.speedKmh >= zoomiesKmh && r.rpm > 0 ? fast + 1 : 0
    if (fast >= 2) return 'zoomies'
  }
  if (!online) return 'void'
  return moved ? 'jog' : 'nap'
}

function tallyOf(map, outcome = null) {
  const counts = { nap: 0, jog: 0, zoomies: 0 }
  const right = []
  for (const [user, kind] of map) {
    counts[kind] += 1
    if (outcome && kind === outcome) right.push(user)
  }
  const total = map.size
  const pct = {}
  for (const k of CALLS) pct[k] = total ? Math.round((100 * counts[k]) / total) : 0
  return { total, counts, pct, right }
}

export function createCalls({ genesis, duration = 600, zoomiesKmh = 4.5, score = null } = {}) {
  const readings = new Map() // round -> readings
  const myCalls = new Map() // round -> kind
  const chatCalls = new Map() // round -> Map(user -> kind)
  const results = [] // oldest first
  const board = new Map() // user -> {right, played, streak, points}
  const me = Object.assign({ streak: 0, best: 0, right: 0, played: 0, points: 0 }, score || {})
  let resolvedThrough = null

  const roundOf = (ms) => roundAt(ms / 1000, genesis, duration).round

  function push(r) {
    if (!r) return
    const n = roundOf(r.at)
    if (!readings.has(n)) readings.set(n, [])
    readings.get(n).push(r)
  }

  // Settles every round that has ended and was called or watched. Returns the new results, oldest first.
  function tick(nowMs) {
    const current = roundOf(nowMs)
    const out = []
    if (resolvedThrough === null) resolvedThrough = current - 1
    for (let n = resolvedThrough + 1; n < current; n++) {
      resolvedThrough = n
      // a round nobody called and nobody watched is not a result
      if (!readings.has(n) && !myCalls.has(n) && !chatCalls.has(n)) continue
      const outcome = outcomeOf(readings.get(n), zoomiesKmh)
      const mine = myCalls.get(n) || null
      const chat = chatCalls.get(n) || new Map()
      const res = { round: n, outcome, call: mine, correct: mine ? outcome !== 'void' && mine === outcome : null, chat: tallyOf(chat, outcome) }
      if (mine && outcome !== 'void') {
        me.played += 1
        if (res.correct) {
          me.right += 1
          me.streak += 1
          me.points += POINTS[outcome]
          me.best = Math.max(me.best, me.streak)
        } else me.streak = 0
      }
      if (outcome !== 'void') {
        for (const [user, kind] of chat) {
          const row = board.get(user) || { right: 0, played: 0, streak: 0, points: 0 }
          row.played += 1
          if (kind === outcome) { row.right += 1; row.streak += 1; row.points += POINTS[outcome] } else row.streak = 0
          board.set(user, row)
        }
      }
      results.push(res)
      out.push(res)
      readings.delete(n)
      myCalls.delete(n)
      chatCalls.delete(n)
    }
    while (results.length > 20) results.shift()
    return out
  }

  // The viewer's call for the next round (the one after the round nowMs is in); a later call replaces it.
  function call(kind, nowMs) {
    if (!CALLS.includes(kind)) return false
    myCalls.set(roundOf(nowMs) + 1, kind)
    return true
  }

  function chatCall(user, kind, nowMs) {
    if (!CALLS.includes(kind) || !user) return false
    const n = roundOf(nowMs) + 1
    if (!chatCalls.has(n)) chatCalls.set(n, new Map())
    chatCalls.get(n).set(String(user).toLowerCase(), kind)
    return true
  }

  function state(nowMs) {
    const r = roundAt(nowMs / 1000, genesis, duration)
    return {
      round: r.round,
      next: r.round + 1,
      left: r.left,
      myCall: myCalls.get(r.round + 1) || null,
      tally: tallyOf(chatCalls.get(r.round + 1) || new Map()),
      last: results[results.length - 1] || null,
    }
  }

  function leaderboard(n = 5) {
    return [...board]
      .map(([user, row]) => ({ user, ...row }))
      .sort((a, b) => b.points - a.points || b.right - a.right || b.streak - a.streak || a.user.localeCompare(b.user))
      .slice(0, n)
  }

  return {
    push,
    tick,
    call,
    chatCall,
    state,
    leaderboard,
    get score() { return { ...me } },
    get results() { return [...results] },
  }
}
