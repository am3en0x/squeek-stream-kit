import { parseParams, THEMES } from './params.js'
import { createWheel } from './wheel.js'
import { createFeed, alertFor, wheelAlert } from './feed.js'
import { startSource } from './source.js'
import { createSound } from './sound.js'
import { Led, textWidth } from './led.js'
import { COLORS } from './boardview.js'
import { DEMO_ALERTS } from './demo.js'

// The alerts overlay: empty until something happens, then one card at a time for `dur` seconds, 1 s apart,
// at most five waiting (the oldest is dropped).
const opts = parseParams(location.search)
const accent = THEMES[opts.theme]
const card = document.getElementById('card')
const led = new Led(document.getElementById('led'), { fit: 'contain' })
const sound = createSound({ vol: opts.vol, on: opts.sound })
const queue = []
let busy = false
const COLS = 200
const ROWS = 30
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

function enqueue(a, force = false) {
  if (!a || (!force && !opts.alerts.includes(a.kind))) return
  queue.push(a)
  while (queue.length > 5) queue.shift()
  if (!busy) next()
}

function draw(a) {
  led.grid(COLS, ROWS)
  for (let x = 0; x < COLS; x++) { led.dot(x, 0, COLORS.dim); led.dot(x, ROWS - 1, COLORS.dim) }
  for (let y = 0; y < ROWS; y++) { led.dot(0, y, COLORS.dim); led.dot(COLS - 1, y, COLORS.dim) }
  // the pictogram and the title as one centred line, the detail under them
  const k = textWidth(a.title, 2) + 18 <= COLS - 8 ? 2 : 1
  const pic = { wake: 'hamjog', nap: 'hamnap', zoomies: 'hamzoom' }[a.kind] || a.kind
  const iconW = (pic.startsWith('ham') ? 13 : 8) * k
  const w = textWidth(a.title, k) + iconW + k
  let x = Math.floor((COLS - w) / 2)
  const y = k === 2 ? 4 : 8
  x = led.icon(pic, x, y, pic.startsWith('ham') ? accent : COLORS.cream, k) + k
  led.text(a.title, x, y, accent, k)
  led.text(a.detail, Math.floor((COLS - textWidth(a.detail, 1)) / 2), 21, COLORS.cream)
  led.paint()
  card.setAttribute('aria-label', `${a.title}. ${a.detail}`)
}

async function next() {
  const a = queue.shift()
  if (!a) { busy = false; return }
  busy = true
  draw(a)
  card.classList.add('show')
  sound.play(a.kind)
  await wait(opts.dur * 1000)
  card.classList.remove('show')
  await wait(1000)
  next()
}

if (opts.demo) {
  let i = 0
  const fire = () => {
    const enabled = DEMO_ALERTS.filter((a) => opts.alerts.includes(a.kind))
    if (enabled.length) enqueue(enabled[i++ % enabled.length])
  }
  fire()
  setInterval(fire, 8000)
} else {
  const wheel = createWheel({ zoomiesKmh: opts.zoomies })
  const feed = createFeed()
  startSource({}, {
    status(r) { for (const kind of wheel.push(r)) enqueue(wheelAlert(kind, r)) },
    events(list) { for (const e of feed.ingest(list)) enqueue(alertFor(e)) },
  })
}

// The setup page's "fire test alert" button reaches its preview through postMessage.
let testIndex = 0
window.addEventListener('message', (e) => {
  if (e.origin !== location.origin || !e.data) return
  if (e.data.type === 'squeek-test-alert') {
    sound.unlock()
    enqueue(DEMO_ALERTS[testIndex++ % DEMO_ALERTS.length], true)
  }
  // the watch page's sound button
  if (e.data.type === 'squeek-sound') sound.setOn(e.data.on)
})
