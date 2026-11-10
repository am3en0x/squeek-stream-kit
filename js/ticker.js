import { parseParams, THEMES } from './params.js'
import { lineFor, agoText } from './feed.js'
import { startSource } from './source.js'
import { roundAt, clock } from './rounds.js'
import { Led } from './led.js'
import { COLORS } from './boardview.js'
import { ledItem, drawLedItem } from './tickerled.js'

// The lower-third ticker: the round clock on the left, the latest feed items scrolling on the right. With font=led the
// items are drawn in the board's dot-matrix font, at the clock's dot size, instead of in text.
const opts = parseParams(location.search)
document.documentElement.dataset.theme = opts.theme
document.documentElement.dataset.font = opts.font
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
  led.text(r && r.round ? `ROUND ${r.round}` : 'ROUND --', 1, 1, COLORS.cream)
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
  let chars = 0
  for (let copy = 0; copy < 2; copy++) {
    for (const { e, text } of items) {
      const ago = agoText(e.occurredAt, now)
      chars += ago.length + text.length
      track.append(opts.font === 'led' ? ledSpan(ago, text) : textSpan(ago, text))
    }
  }
  track.style.animationDuration = Math.max(25, chars * 0.1) + 's'
}

function textSpan(ago, text) {
  const span = document.createElement('span')
  span.className = 'item'
  const when = document.createElement('b')
  when.textContent = ago
  span.append(when, text)
  return span
}

// The same item as a strip of dots; the words stay readable to assistive tech through the label.
function ledSpan(ago, text) {
  const span = document.createElement('span')
  span.className = 'item led'
  const canvas = document.createElement('canvas')
  canvas.setAttribute('role', 'img')
  canvas.setAttribute('aria-label', `${ago} ${text}`)
  span.append(canvas)
  const pitch = led.dotPitch || (drawClock(), led.dotPitch) || 3
  drawLedItem(new Led(canvas, { pitch }), ledItem(ago, text), accent, COLORS.cream)
  return span
}

// The LED items take the clock's dot size, which follows the source's height.
if (opts.font === 'led') {
  let last = 0
  addEventListener('resize', () => {
    drawClock()
    if (led.dotPitch && Math.abs(led.dotPitch - last) > 0.01) { last = led.dotPitch; render(true) }
  })
}

startSource({ demo: opts.demo }, {
  core(c) { core = c; drawClock() },
  events(list) { latest = list; render() },
})
drawClock()
setInterval(drawClock, 1000)
setInterval(() => render(true), 60_000)
