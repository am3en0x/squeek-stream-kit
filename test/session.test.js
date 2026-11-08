import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createSession, sinceTime } from '../dist/js/session.js'

const R = (s, rpm, km, kmh = rpm ? 3.6 : 0) => ({ at: s * 1000, online: true, rpm, speedKmh: kmh, todayKm: km })

test('distance, top speed and running time since the first reading', () => {
  const s = createSession({ startedAt: 0 })
  s.push(R(0, 70, 3.4))
  s.push(R(5, 70, 3.41, 4.9))
  s.push(R(10, 0, 3.41))
  s.push(R(15, 0, 3.41))
  const st = s.stats
  assert.ok(Math.abs(st.km - 0.01) < 1e-9)
  assert.equal(st.topKmh, 4.9)
  assert.equal(st.runSec, 5)
})

test('the UTC day rollover keeps what was run', () => {
  const s = createSession({ startedAt: 0 })
  s.push(R(0, 70, 5.0))
  s.push(R(5, 70, 5.2))
  s.push(R(10, 70, 0.1)) // new day
  s.push(R(15, 70, 0.3))
  assert.ok(Math.abs(s.stats.km - 0.5) < 1e-9)
})

test('offline readings and missing distances are skipped', () => {
  const s = createSession({ startedAt: 0 })
  s.push({ at: 0, online: false })
  s.push({ at: 1000, online: true, rpm: 70, speedKmh: 3, todayKm: null })
  assert.equal(s.stats.km, 0)
  s.push(R(2, 70, 1.0))
  s.push(R(7, 70, 1.1))
  assert.ok(Math.abs(s.stats.km - 0.1) < 1e-9)
})

test('blocks count settlements after the start, once each', () => {
  const s = createSession({ startedAt: Date.parse('2026-11-09T21:00:00Z') })
  const list = [
    { id: 'a', type: 'system.settlement_completed', occurredAt: '2026-11-09T21:10:00Z', payload: { completedBlockCount: '2' } },
    { id: 'b', type: 'system.settlement_completed', occurredAt: '2026-11-09T20:50:00Z', payload: { completedBlockCount: '1' } },
    { id: 'c', type: 'system.settlement_completed', occurredAt: '2026-11-09T21:20:00Z', payload: { completedBlockCount: '0' } },
    { id: 'd', type: 'nft.merged', occurredAt: '2026-11-09T21:21:00Z', payload: {} },
  ]
  s.events(list)
  s.events(list)
  assert.equal(s.stats.blocks, 2)
  assert.equal(s.stats.settlements, 2)
})

test('sinceTime reads HH:MM as today UTC, yesterday when that is far ahead, ISO as is', () => {
  const now = Date.parse('2026-11-09T22:30:00Z')
  assert.equal(sinceTime('21:00', now), Date.parse('2026-11-09T21:00:00Z'))
  assert.equal(sinceTime('23:15', now), Date.parse('2026-11-09T23:15:00Z')) // 45 min ahead is still today
  assert.equal(sinceTime('23:45', now), Date.parse('2026-11-08T23:45:00Z'))
  assert.equal(sinceTime('2026-11-09T20:00:00Z', now), Date.parse('2026-11-09T20:00:00Z'))
  assert.equal(sinceTime('', now), now)
  assert.equal(sinceTime('soon', now), now)
})
