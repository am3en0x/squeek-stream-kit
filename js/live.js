import { parseParams, THEMES } from './params.js'
import { createWheel } from './wheel.js'
import { lineFor, agoText } from './feed.js'
import { startSource } from './source.js'
import { roundAt, clock } from './rounds.js'
import { Led } from './led.js'
import { drawFull } from './boardview.js'
import { createCallPanel } from './callpanel.js'

// The second screen: the board, the round clock and the feed, for a phone next to the stream.
const opts = parseParams(location.search)
document.documentElement.dataset.theme = opts.theme
const accent = THEMES[opts.theme]
const led = new Led(document.getElementById('led'))
const wheel = createWheel({ zoomiesKmh: opts.zoomies, napMs: opts.demo ? 20_000 : 180_000 })
const feedList = document.getElementById('feed')
const panel = createCallPanel(document.getElementById('callpanel'), { zoomies: opts.zoomies, demo: opts.demo })
let reading = null
let core = null
let turn = 0
let last = performance.now()
let events = []

function drawFeed() {
  const items = events.map((e) => ({ e, text: lineFor(e) })).filter((x) => x.text).slice(0, 20)
  feedList.textContent = ''
  if (!items.length) {
    const li = document.createElement('li')
    li.append(document.createElement('span'), 'Nothing yet.')
    feedList.append(li)
    return
  }
  const now = Date.now()
  for (const { e, text } of items) {
    const li = document.createElement('li')
    const when = document.createElement('span')
    when.textContent = agoText(e.occurredAt, now)
    const what = document.createElement('span')
    what.textContent = text
    li.append(when, what)
    feedList.append(li)
  }
}

function tickClock() {
  if (!core) return
  const r = roundAt(Date.now() / 1000, Number(core.genesisTimestamp), Number(core.roundDuration))
  document.getElementById('round').textContent = `Round ${r.round}`
  document.getElementById('left').textContent = clock(r.left)
}

startSource({ demo: opts.demo }, {
  core(c) { core = c; tickClock(); panel.core(c) },
  status(r) { wheel.push(r); if (r.online) reading = r; panel.status(r) },
  events(list) { events = list; drawFeed() },
})
setInterval(tickClock, 1000)
setInterval(drawFeed, 60_000)

function frame(now) {
  const dt = Math.min(0.5, (now - last) / 1000)
  last = now
  const running = wheel.phase === 'running' && reading
  if (running) turn = (turn + reading.rpm * 2 * dt) % 360
  drawFull(led, { reading, phase: wheel.phase, fast: Boolean(running) && reading.speedKmh >= opts.zoomies, accent, turn })
  led.paint()
  setTimeout(() => requestAnimationFrame(frame), 100)
}
requestAnimationFrame(frame)
