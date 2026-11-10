import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseParams, toQuery, DEFAULTS } from '../dist/js/params.js'
import { FONT, ledSafe, textWidth } from '../dist/js/led.js'
import { ledItem, drawLedItem, ROWS, TOP, LEAD, SPACE, GAP } from '../dist/js/tickerled.js'
import { lineFor, agoText } from '../dist/js/feed.js'
import { demoEvents } from '../dist/js/demo.js'

test('font: led or the regular font', () => {
  assert.equal(parseParams('').font, 'regular')
  assert.equal(parseParams('?font=led').font, 'led')
  assert.equal(parseParams('?font=regular').font, 'regular')
  for (const bad of ['LED', 'dots', '', '1']) assert.equal(parseParams(`?font=${bad}`).font, 'regular')
})

test('toQuery adds font=led only when asked, and it round-trips', () => {
  assert.equal(toQuery({ ...DEFAULTS }), '')
  assert.equal(toQuery({ ...DEFAULTS, font: 'led' }), '?font=led')
  assert.equal(toQuery({ ...DEFAULTS, theme: 'ice', font: 'led', demo: true }), '?theme=ice&font=led&demo=1')
  const opts = parseParams('?theme=green&font=led')
  assert.deepEqual(parseParams(toQuery(opts)), opts)
})

test('ledSafe turns any ticker line into glyphs the board font has', () => {
  assert.equal(ledSafe('2 min ago'), '2 MIN AGO')
  assert.equal(ledSafe('0xab12cd…9f3e claimed 1.5 SQK'), '0xAB12CD...9F3E CLAIMED 1.5 SQK')
  assert.equal(ledSafe('A · B — C'), 'A - B - C')
  assert.equal(ledSafe('Ham (cam) é ✓ ok'), 'HAM CAM OK')
  for (const e of demoEvents(Date.parse('2026-11-08T00:00:00Z'))) {
    const line = lineFor(e)
    if (!line) continue
    for (const ch of ledSafe(line)) assert.ok(FONT[ch], `missing glyph ${JSON.stringify(ch)} in ${line}`)
  }
})

test('ledItem lays out the time, then the line, on the clock-high strip', () => {
  const item = ledItem('now', 'BLOCK FOUND: SQUEEK BLOCK #12')
  assert.equal(item.rows, ROWS)
  assert.equal(item.y, TOP)
  assert.equal(item.when, 'NOW')
  assert.equal(item.whenX, LEAD)
  assert.equal(item.textX, LEAD + textWidth('NOW') + SPACE)
  assert.equal(item.cols, item.textX + textWidth('BLOCK FOUND: SQUEEK BLOCK #12') + GAP)
  assert.ok(TOP + 7 <= ROWS, 'the glyphs fit in the strip')
})

test('drawLedItem lights the time in the accent and the line in cream, nothing outside the grid', () => {
  const cells = new Map()
  let painted = 0
  const led = {
    grid(c, r) { this.cols = c; this.rows = r },
    text(s, x, y, color) {
      for (const ch of s) {
        const g = FONT[ch]
        for (let r = 0; r < 7; r++) for (let c = 0; c < g[r].length; c++) if (g[r][c] === '1') cells.set(`${x + c},${y + r}`, color)
        x += g[0].length + 1
      }
      return x
    },
    paint() { painted++ },
  }
  const item = ledItem(agoText('2026-11-08T00:00:00Z', Date.parse('2026-11-08T00:05:00Z')), 'HIT 4.0 KM/H')
  drawLedItem(led, item, 'accent', 'cream')
  assert.equal(painted, 1)
  assert.deepEqual([led.cols, led.rows], [item.cols, item.rows])
  const colors = new Set(cells.values())
  assert.deepEqual([...colors].sort(), ['accent', 'cream'])
  for (const [key, color] of cells) {
    const [x, y] = key.split(',').map(Number)
    assert.ok(x >= 0 && x < item.cols && y >= TOP && y < TOP + 7, key)
    assert.equal(color, x < item.textX ? 'accent' : 'cream')
  }
})
