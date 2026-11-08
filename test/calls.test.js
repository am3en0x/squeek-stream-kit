import { test } from 'node:test'
import assert from 'node:assert/strict'
import { outcomeOf, createCalls, POINTS } from '../dist/js/calls.js'

const G = 1000 // genesis, seconds
const D = 600
const R = (s, rpm, kmh = rpm ? 3.6 : 0, online = true) => ({ at: s * 1000, online, rpm, speedKmh: kmh })
const inRound = (n, offset) => (G + (n - 1) * D + offset) * 1000 // ms into round n

test('outcomes: void, nap, jog, zoomies (two fast readings in a row)', () => {
  assert.equal(outcomeOf([]), 'void')
  assert.equal(outcomeOf([R(0, 0, 0, false)]), 'void')
  assert.equal(outcomeOf([R(0, 0), R(5, 0)]), 'nap')
  assert.equal(outcomeOf([R(0, 0), R(5, 60)]), 'jog')
  assert.equal(outcomeOf([R(0, 80, 4.6), R(5, 0), R(10, 80, 4.7)]), 'jog')
  assert.equal(outcomeOf([R(0, 80, 4.6), R(5, 80, 4.6)]), 'zoomies')
  assert.equal(outcomeOf([R(0, 80, 4.6), R(5, 80, 4.6)], 5), 'jog')
})

test('a call made in round N is settled by the readings of round N+1', () => {
  const c = createCalls({ genesis: G, duration: D })
  const t0 = inRound(5, 100)
  c.tick(t0)
  assert.equal(c.call('jog', t0), true)
  assert.equal(c.state(t0).myCall, 'jog')
  assert.equal(c.state(t0).next, 6)
  // round 6: he runs
  c.push({ ...R(0, 60), at: inRound(6, 30) })
  c.push({ ...R(0, 60), at: inRound(6, 35) })
  assert.deepEqual(c.tick(inRound(6, 40)), []) // not over yet
  const res = c.tick(inRound(7, 1))
  assert.equal(res.length, 1)
  assert.equal(res[0].round, 6)
  assert.equal(res[0].outcome, 'jog')
  assert.equal(res[0].call, 'jog')
  assert.equal(res[0].correct, true)
  assert.deepEqual(c.score, { streak: 1, best: 1, right: 1, played: 1, points: POINTS.jog })
  assert.equal(c.state(inRound(7, 1)).last.round, 6)
})

test('a wrong call ends the streak; a void round changes nothing', () => {
  const c = createCalls({ genesis: G, duration: D, score: { streak: 3, best: 3, right: 3, played: 3, points: 5 } })
  c.tick(inRound(5, 0))
  c.call('nap', inRound(5, 10))
  c.push({ ...R(0, 60), at: inRound(6, 30) })
  c.tick(inRound(7, 0))
  assert.deepEqual(c.score, { streak: 0, best: 3, right: 3, played: 4, points: 5 })
  c.call('zoomies', inRound(7, 10))
  const res = c.tick(inRound(9, 0)) // round 8 had no readings
  assert.equal(res.length, 1)
  assert.equal(res[0].outcome, 'void')
  assert.equal(res[0].correct, false)
  assert.equal(c.score.played, 4)
})

test('chat calls are tallied per user, the last one counts, and the board scores points', () => {
  const c = createCalls({ genesis: G, duration: D })
  const t = inRound(5, 50)
  c.tick(t)
  c.chatCall('Ann', 'nap', t)
  c.chatCall('bob', 'zoomies', t)
  c.chatCall('ann', 'zoomies', t) // changes her mind
  c.chatCall('cat', 'jog', t)
  assert.equal(c.chatCall('dan', 'fly', t), false)
  const s = c.state(t)
  assert.deepEqual(s.tally.counts, { nap: 0, jog: 1, zoomies: 2 })
  assert.deepEqual(s.tally.pct, { nap: 0, jog: 33, zoomies: 67 })
  c.push({ ...R(0, 90, 4.8), at: inRound(6, 10) })
  c.push({ ...R(0, 90, 4.9), at: inRound(6, 15) })
  const [res] = c.tick(inRound(7, 0))
  assert.equal(res.outcome, 'zoomies')
  assert.deepEqual(res.chat.right.sort(), ['ann', 'bob'])
  const board = c.leaderboard()
  assert.deepEqual(board.map((r) => r.user), ['ann', 'bob', 'cat'])
  assert.equal(board[0].points, 3)
  assert.equal(board[2].points, 0)
})

test('several rounds missed at once settle in order and the result list stays short', () => {
  const c = createCalls({ genesis: G, duration: D })
  c.tick(inRound(1, 0))
  for (let n = 1; n <= 30; n++) c.push({ ...R(0, 0), at: inRound(n, 5) })
  const res = c.tick(inRound(31, 0))
  assert.equal(res.length, 30)
  assert.equal(res[0].round, 1)
  assert.equal(res[29].round, 30)
  assert.equal(c.results.length, 20)
})
