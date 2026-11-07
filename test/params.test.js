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
