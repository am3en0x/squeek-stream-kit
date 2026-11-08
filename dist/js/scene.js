import { parseParams, THEMES } from './params.js'
import { createWheel } from './wheel.js'
import { createSession, sinceTime } from './session.js'
import { startSource } from './source.js'
import { roundAt, clock, clockLong } from './rounds.js'
import { Led, textWidth } from './led.js'
import { COLORS, stateText } from './boardview.js'
import { demoStats } from './demo.js'

// Full-screen scenes for the moments without a camera: STARTING SOON (with a countdown to ?at=HH:MM UTC), BE RIGHT
// BACK and THANKS FOR WATCHING, all with the live wheel, the round clock and the session so far. 1920 x 1080, a grid
// of 240 x 135 dots on a dark plate (not transparent: it is the whole scene).
const opts = parseParams(location.search)
const accent = THEMES[opts.theme]
const led = new Led(document.getElementById('led'), { fit: 'contain', off: '#0c0c10' })
const wheel = createWheel({ zoomiesKmh: opts.zoomies, napMs: opts.demo ? 20_000 : 180_000 })
const session = createSession({ startedAt: sinceTime(opts.since) })
const still = matchMedia('(prefers-reduced-motion: reduce)').matches
const TITLES = { starting: 'STARTING SOON', brb: 'BE RIGHT BACK', ending: 'THANKS FOR WATCHING' }
let reading = null
let core = null
let turn = 0
let last = performance.now()

startSource({ demo: opts.demo }, {
  core(c) { core = c },
  status(r) { wheel.push(r); if (r.online) reading = r; session.push(r) },
  events(list) { session.events(list) },
})

// seconds until ?at=HH:MM UTC today (tomorrow if it has passed by more than an hour), or null
function countdown(now) {
  if (!opts.at) return null
  const [h, m] = opts.at.split(':').map(Number)
  const d = new Date(now)
  d.setUTCHours(h, m, 0, 0)
  let t = d.getTime()
  if (now - t > 3_600_000) t += 86_400_000
  return Math.max(0, Math.round((t - now) / 1000))
}

const TITLE_LINES = { starting: ['STARTING SOON'], brb: ['BE RIGHT BACK'], ending: ['THANKS FOR', 'WATCHING'] }
const W = 240
const H = 135

function draw(now) {
  const dt = Math.min(0.5, (now - last) / 1000)
  last = now
  const running = wheel.phase === 'running' && reading
  const fast = Boolean(running) && reading.speedKmh >= opts.zoomies
  if (running && !still) turn = (turn + reading.rpm * 2 * dt) % 360
  const nowMs = Date.now()
  led.grid(W, H)
  // top line: the round clock on the left, today on the right
  const r = core ? roundAt(nowMs / 1000, Number(core.genesisTimestamp), Number(core.roundDuration)) : null
  led.text(r ? `ROUND ${r.round}   ${clock(r.left)} LEFT` : 'ROUND --', 8, 8, COLORS.label)
  if (reading && reading.todayKm != null) {
    const today = `TODAY ${reading.todayKm.toFixed(2)} KM`
    led.text(today, W - 8 - textWidth(today), 8, COLORS.label)
  }
  for (let x = 8; x < W - 8; x += 2) led.dot(x, 17, COLORS.dim)
  // the title, big
  let y = 24
  for (const line of TITLE_LINES[opts.mode]) { led.text(line, 8, y, accent, 3); y += 24 }
  // his state
  const twoLines = TITLE_LINES[opts.mode].length > 1
  const stateLine = `SQUEEKTOSHI ${stateText(wheel.phase, reading, fast)}` + (running && !twoLines ? `   ${reading.speedKmh.toFixed(1)} KM/H` : '')
  led.text(stateLine, 8, y + 2, running ? COLORS.cream : COLORS.label)
  // the big wheel on the right
  led.wheel(204, 98, 26, running ? turn : 0, COLORS.rim, running ? COLORS.cream : COLORS.label, accent)
  // the bottom block: a countdown, or the session so far
  const stats = opts.demo ? demoStats() : session.stats
  const left = countdown(nowMs)
  if (opts.mode === 'starting') {
    if (left !== null) {
      led.text(left > 0 ? 'STARTS IN' : 'STARTING', 8, 94, COLORS.label)
      led.text(left > 0 ? clockLong(left) : 'NOW', 8, 104, COLORS.cream, 3)
    } else {
      led.text('THE WHEEL IS LIVE ON SQUEEKCHAIN', 8, 118, COLORS.label)
    }
  } else {
    led.text('THIS STREAM', 8, 94, COLORS.label)
    led.text(`${stats.km.toFixed(2)} KM`, 8, 104, COLORS.cream, 2)
    const more = `${stats.blocks} BLOCK${stats.blocks === 1 ? '' : 'S'} FOUND   TOP ${stats.topKmh.toFixed(1)} KM/H`
    led.text(more, 8, 120, COLORS.cream)
  }
  led.paint()
  setTimeout(() => requestAnimationFrame(draw), 80)
}
requestAnimationFrame(draw)
