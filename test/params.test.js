import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseParams, toQuery, DEFAULTS } from '../dist/js/params.js'

test('defaults', () => {
  const p = parseParams('')
  assert.deepEqual(p, {
    theme: 'amber', layout: 'full', alerts: ['wake', 'nap', 'zoomies', 'block', 'record', 'distance', 'streak'],
    zoomies: 4.5, sound: true, vol: 60, dur: 6, demo: false,
    chat: '', goal: null, since: null, size: '640x360', mode: 'starting', at: null, name: '',
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

test('companion options: chat channel, goal, since, size, mode, at, name', () => {
  const p = parseParams('?chat=SomeStreamer&goal=km:5&since=21:00&size=800x450&mode=brb&at=20:30&name=%3Cb%3EHam%20Cam')
  assert.equal(p.chat, 'somestreamer')
  assert.equal(p.goal, 'km:5')
  assert.equal(p.since, '21:00')
  assert.equal(p.size, '800x450')
  assert.equal(p.mode, 'brb')
  assert.equal(p.at, '20:30')
  assert.equal(p.name, 'bHam Cam')
  const bad = parseParams('?chat=x&goal=laps:3&since=soon&size=10x10&mode=party&at=25h')
  assert.equal(bad.chat, '')
  assert.equal(bad.goal, null)
  assert.equal(bad.since, null)
  assert.equal(bad.size, '640x360')
  assert.equal(bad.mode, 'starting')
  assert.equal(bad.at, null)
  assert.equal(parseParams('?since=2026-11-09T21:00:00Z').since, '2026-11-09T21:00:00Z')
})

test('toQuery carries the companion options and leaves defaults out', () => {
  const q = toQuery({ ...DEFAULTS, chat: 'somestreamer', goal: 'blocks:2', mode: 'brb', name: 'Ham Cam' })
  assert.equal(q, '?chat=somestreamer&goal=blocks%3A2&mode=brb&name=Ham%20Cam')
  assert.equal(toQuery({ ...DEFAULTS }), '')
})
