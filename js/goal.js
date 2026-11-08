import { parseParams, THEMES } from './params.js'
import { parseGoal, goalTitle, goalProgress } from './goals.js'
import { createSession, sinceTime } from './session.js'
import { startSource } from './source.js'
import { createSound } from './sound.js'
import { Led, textWidth } from './led.js'
import { COLORS } from './boardview.js'
import { demoStats } from './demo.js'

// The stream goal overlay: a bar that fills as the session gets there (distance, blocks or minutes running), then a
// GOAL REACHED card with a tune. Source 1000 x 200, a grid of 150 x 30 dots.
const opts = parseParams(location.search)
const accent = THEMES[opts.theme]
const goal = parseGoal(opts.goal) || { kind: 'km', target: 5 }
const since = sinceTime(opts.since)
const session = createSession({ startedAt: since })
const led = new Led(document.getElementById('led'), { fit: 'contain' })
const card = document.getElementById('card')
const sound = createSound({ vol: opts.vol, on: opts.sound })
let done = false
let blink = 0

const sinceText = () => {
  const d = new Date(since)
  return `SINCE ${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')} UTC`
}

function draw() {
  const stats = opts.demo ? demoStats() : session.stats
  const p = goalProgress(goal, stats)
  if (p.done && !done) { done = true; card.classList.add('done'); sound.play('record') }
  blink = (blink + 1) % 20
  led.grid(150, 30)
  const title = p.done ? 'GOAL REACHED!' : goalTitle(goal)
  const x = led.icon(p.done ? 'goal' : 'distance', 2, 2, p.done && blink < 10 ? accent : COLORS.cream)
  led.text(title, x + 1, 2, accent)
  led.text(p.text, 148 - textWidth(p.text), 2, p.done ? accent : COLORS.cream)
  led.bar(2, 12, 146, 7, p.frac, p.done && blink < 10 ? COLORS.cream : accent, COLORS.dim)
  for (const q of [0.25, 0.5, 0.75]) { const tx = 2 + Math.round(146 * q); led.dot(tx, 20, COLORS.label) }
  led.text(sinceText(), 2, 22, COLORS.label)
  const pct = `${Math.round(p.frac * 100)}%`
  led.text(pct, 148 - textWidth(pct), 22, p.done ? accent : COLORS.label)
  led.paint()
  card.setAttribute('aria-label', `${title}. ${p.text}`)
}

if (!opts.demo) {
  startSource({}, {
    status(r) { session.push(r) },
    events(list) { session.events(list) },
  })
}
draw()
setInterval(draw, 500)
