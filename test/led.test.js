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
