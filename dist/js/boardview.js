import { textWidth } from './led.js'

// The board's two layouts, drawn from the latest reading and the wheel's phase.
export const COLORS = { cream: '#f3e9cc', label: '#6b6b78', dim: '#34343e', rim: '#8a8a96' }

export function stateText(phase, reading, fast) {
  if (!reading || phase === 'unknown') return 'TUNING IN'
  if (phase === 'offair') return 'IS OFF AIR'
  if (phase === 'napping') return 'IS NAPPING'
  if (phase === 'still') return 'TOOK A BREAK'
  return fast ? 'HAS THE ZOOMIES' : 'IS RUNNING'
}

const fmtKm = (km) => (km == null ? '--.--' : km >= 100 ? km.toFixed(1) : km.toFixed(2))
const fmtKmh = (v) => (v == null ? '-.-' : v.toFixed(1))
const fmtInt = (n) => (n == null ? '--' : Math.round(n).toLocaleString('en-US'))

function tone(view) {
  const { reading: r, phase, fast, accent } = view
  const live = Boolean(r) && phase !== 'offair' && phase !== 'unknown'
  const state = !live ? COLORS.dim : phase === 'napping' || phase === 'still' ? COLORS.label : fast ? accent : COLORS.cream
  return { live, state, value: live ? COLORS.cream : COLORS.dim }
}

// Full: 110 x 66 dots (source 880 x 528).
export function drawFull(led, view) {
  const { reading: r, phase, fast, accent, turn } = view
  const t = tone(view)
  led.grid(110, 66)
  led.text('SQUEEKTOSHI', 2, 2, accent)
  led.text(stateText(phase, r, fast), 2, 11, t.state)
  led.text('TODAY', 2, 22, COLORS.label)
  const x = led.text(fmtKm(r ? r.todayKm : null), 2, 31, t.value, 2)
  led.text('KM', x + 2, 38, COLORS.label)
  const sx = led.text('SPEED', 2, 48, COLORS.label)
  led.text(`${fmtKmh(t.live ? r.speedKmh : null)} KM/H`, sx + 3, 48, t.value)
  const bx = led.text('BLOCK', 2, 57, COLORS.label)
  const end = led.text(fmtInt(r ? r.block : null), bx + 3, 57, r ? COLORS.cream : COLORS.dim)
  led.bar(end + 3, 58, Math.max(0, 107 - end - 3), 5, r ? r.progress : 0, accent, COLORS.dim)
  const spinning = t.live && phase === 'running'
  led.wheel(92, 33, 14, spinning ? turn : 0, COLORS.rim, spinning ? COLORS.cream : COLORS.label, accent)
}

// Strip: 178 x 20 dots (source 890 x 100): the wheel, then his state over today's distance and speed.
export function drawStrip(led, view) {
  const { reading: r, phase, fast, accent, turn } = view
  const t = tone(view)
  led.grid(178, 20)
  const spinning = t.live && phase === 'running'
  led.wheel(9, 9, 8, spinning ? turn : 0, COLORS.rim, spinning ? COLORS.cream : COLORS.label, accent)
  const x = led.text('SQUEEKTOSHI ', 22, 2, accent)
  led.text(stateText(phase, r, fast), x, 2, t.state)
  const a = led.text('TODAY ', 22, 11, COLORS.label)
  const b = led.text(`${fmtKm(r ? r.todayKm : null)} KM`, a, 11, t.value)
  led.text(`${fmtKmh(t.live ? r.speedKmh : null)} KM/H`, b + textWidth('  ', 1) + 1, 11, t.value)
}
