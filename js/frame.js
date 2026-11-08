import { parseParams, THEMES } from './params.js'
import { createWheel } from './wheel.js'
import { startSource } from './source.js'
import { Led, textWidth } from './led.js'
import { COLORS, stateText } from './boardview.js'

// The cam frame: a rim of LED dots around the edge of the source (the middle stays transparent for the camera) with a
// bright runner chasing round it at the wheel's pace, and a small plate in a corner with the streamer's name and
// Squeektoshi's state. Size from ?size=WxH, 640 x 360 by default.
const opts = parseParams(location.search)
const accent = THEMES[opts.theme]
const [W, H] = opts.size.split('x').map(Number)
const rim = document.getElementById('rim')
const ctx = rim.getContext('2d')
const led = new Led(document.getElementById('led'), { fit: 'contain' })
const wheel = createWheel({ zoomiesKmh: opts.zoomies, napMs: opts.demo ? 20_000 : 180_000 })
const still = matchMedia('(prefers-reduced-motion: reduce)').matches
let reading = null
let pos = 0
let last = performance.now()

startSource({ demo: opts.demo }, {
  status(r) { wheel.push(r); if (r.online) reading = r },
})

// the dots along the rim, clockwise from the top-left corner
const PITCH = 12
function rimDots() {
  const inset = 8
  const pts = []
  const w = W - inset * 2
  const h = H - inset * 2
  const nx = Math.round(w / PITCH)
  const ny = Math.round(h / PITCH)
  for (let i = 0; i < nx; i++) pts.push([inset + (i * w) / nx, inset])
  for (let i = 0; i < ny; i++) pts.push([W - inset, inset + (i * h) / ny])
  for (let i = 0; i < nx; i++) pts.push([W - inset - (i * w) / nx, H - inset])
  for (let i = 0; i < ny; i++) pts.push([inset, H - inset - (i * h) / ny])
  return pts
}
const DOTS = rimDots()

function drawRim(now) {
  const dt = Math.min(0.5, (now - last) / 1000)
  last = now
  const running = wheel.phase === 'running' && reading
  const fast = running && reading.speedKmh >= opts.zoomies
  if (running && !still) pos = (pos + reading.rpm * 0.35 * dt * DOTS.length / 60) % DOTS.length
  const dpr = window.devicePixelRatio || 1
  if (rim.width !== W * dpr) { rim.width = W * dpr; rim.height = H * dpr; rim.style.width = W + 'px'; rim.style.height = H + 'px' }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.clearRect(0, 0, W, H)
  const n = DOTS.length
  const breath = 0.55 + 0.45 * Math.sin(now / 900)
  for (let i = 0; i < n; i++) {
    const [x, y] = DOTS[i]
    let color = COLORS.dim
    let r = 3.2
    if (running) {
      // a lit tail of ten dots behind the runner, brighter at the head
      const d = (i - pos + n) % n
      if (d < 10) { color = d < 2 ? COLORS.cream : accent; r = d < 2 ? 4.4 : 4.2 - d * 0.1 }
      else color = fast ? '#3a3020' : COLORS.dim
    } else if (wheel.phase === 'napping' || wheel.phase === 'still') {
      color = i % 4 === 0 ? `rgb(246 166 59 / ${(0.25 + 0.3 * breath).toFixed(2)})` : COLORS.dim
    }
    ctx.fillStyle = color
    ctx.beginPath()
    ctx.arc(x, y, r, 0, 6.2832)
    ctx.fill()
  }
}

function drawPlate() {
  const name = (opts.name || '').toUpperCase()
  const fast = Boolean(reading) && wheel.phase === 'running' && reading.speedKmh >= opts.zoomies
  const state = `SQUEEKTOSHI ${stateText(wheel.phase, reading, fast)}`
  const extra = reading && wheel.phase === 'running' ? `  ${reading.speedKmh.toFixed(1)} KM/H` : ''
  const line2 = state + extra
  const cols = Math.max(textWidth(name), textWidth(line2)) + 4
  led.grid(cols, name ? 18 : 9)
  let y = 1
  if (name) { led.text(name, 2, y, accent); y += 9 }
  led.text(line2, 2, y, wheel.phase === 'running' ? COLORS.cream : COLORS.label)
  led.paint()
}

function frame(now) {
  drawRim(now)
  drawPlate()
  setTimeout(() => requestAnimationFrame(frame), 60)
}
document.getElementById('plate').style.maxWidth = W - 40 + 'px'
requestAnimationFrame(frame)
