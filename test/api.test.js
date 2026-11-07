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
