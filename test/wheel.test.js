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
