import { parseParams, THEMES } from './params.js'
import { lineFor, agoText } from './feed.js'
import { startSource } from './source.js'
import { roundAt, clock } from './rounds.js'
import { Led } from './led.js'
import { COLORS } from './boardview.js'

// The lower-third ticker: the round clock on the left, the latest feed items scrolling on the right.
const opts = parseParams(location.search)
document.documentElement.dataset.theme = opts.theme
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
  for (let copy = 0; copy < 2; copy++) {
    for (const { e, text } of items) {
      const span = document.createElement('span')
      span.className = 'item'
      const when = document.createElement('b')
      when.textContent = agoText(e.occurredAt, now)
      span.append(when, text)
      track.append(span)
    }
  }
  track.style.animationDuration = Math.max(25, track.textContent.length * 0.1) + 's'
}

startSource({ demo: opts.demo }, {
  core(c) { core = c; drawClock() },
  events(list) { latest = list; render() },
})
drawClock()
setInterval(drawClock, 1000)
setInterval(() => render(true), 60_000)
