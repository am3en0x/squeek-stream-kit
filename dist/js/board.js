import { parseParams, THEMES } from './params.js'
import { createWheel } from './wheel.js'
import { startSource } from './source.js'
import { Led } from './led.js'
import { drawFull, drawStrip, stateText } from './boardview.js'

// The LED board overlay: one canvas, redrawn about 12 times a second; data every 5 s (every second in the demo).
const opts = parseParams(location.search)
document.documentElement.dataset.layout = opts.layout
const accent = THEMES[opts.theme]
const canvas = document.getElementById('led')
const led = new Led(canvas, { fit: 'contain' })
const wheel = createWheel({ zoomiesKmh: opts.zoomies, napMs: opts.demo ? 20_000 : 180_000 })
const still = matchMedia('(prefers-reduced-motion: reduce)').matches
let reading = null
let turn = 0
let last = performance.now()

startSource({ demo: opts.demo }, {
  status(r) {
    wheel.push(r)
    if (r.online) reading = r
  },
})

function frame(now) {
  const dt = Math.min(0.5, (now - last) / 1000)
  last = now
  const running = wheel.phase === 'running' && reading
  if (running && !still) turn = (turn + reading.rpm * 2 * dt) % 360
  const view = { reading, phase: wheel.phase, fast: Boolean(running) && reading.speedKmh >= opts.zoomies, accent, turn }
  ;(opts.layout === 'strip' ? drawStrip : drawFull)(led, view)
  led.paint()
  canvas.setAttribute('aria-label', `Squeektoshi ${stateText(view.phase, reading, view.fast).toLowerCase()}`)
  setTimeout(() => requestAnimationFrame(frame), 80)
}
requestAnimationFrame(frame)
