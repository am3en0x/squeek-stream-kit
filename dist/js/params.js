// Options shared by every page, read from the URL. Anything unknown or out of range falls back to the default.
export const ALERT_KINDS = ['wake', 'nap', 'zoomies', 'block', 'record', 'distance', 'streak', 'merge']
export const THEMES = { amber: '#f6a63b', green: '#7fe08a', ice: '#7fdcff', white: '#f3e9cc' }
export const SCENES = ['starting', 'brb', 'ending']
export const FONTS = ['regular', 'led']
const CHANNEL = /^[a-z0-9_]{3,25}$/
const GOAL = /^(km|blocks|run):\d+(\.\d+)?$/
const CLOCK = /^\d{1,2}:\d{2}$/
const SIZE = /^\d{3,4}x\d{3,4}$/
export const DEFAULTS = Object.freeze({
  theme: 'amber',
  layout: 'full',
  alerts: ALERT_KINDS.filter((k) => k !== 'merge'),
  zoomies: 4.5,
  sound: true,
  vol: 60,
  dur: 6,
  demo: false,
  chat: '',
  goal: null,
  since: null,
  size: '640x360',
  mode: 'starting',
  at: null,
  name: '',
  font: /** @type {'regular' | 'led'} */ ('regular'),
})

export function parseParams(search) {
  const q = new URLSearchParams(search)
  const num = (key, lo, hi) => {
    if (!q.has(key)) return DEFAULTS[key]
    const v = Number(q.get(key))
    return q.get(key) !== '' && Number.isFinite(v) && v >= lo && v <= hi ? v : DEFAULTS[key]
  }
  const pick = (key, allowed) => (allowed.includes(q.get(key)) ? q.get(key) : DEFAULTS[key])
  return {
    theme: pick('theme', Object.keys(THEMES)),
    layout: pick('layout', ['full', 'strip']),
    alerts: parseAlerts(q.get('alerts')),
    zoomies: num('zoomies', 1, 10),
    sound: q.get('sound') !== '0',
    vol: num('vol', 0, 100),
    dur: num('dur', 3, 15),
    demo: q.get('demo') === '1',
    chat: CHANNEL.test((q.get('chat') || '').toLowerCase()) ? q.get('chat').toLowerCase() : DEFAULTS.chat,
    goal: GOAL.test((q.get('goal') || '').toLowerCase()) ? q.get('goal').toLowerCase() : DEFAULTS.goal,
    since: timeish(q.get('since')),
    size: SIZE.test(q.get('size') || '') ? q.get('size') : DEFAULTS.size,
    mode: pick('mode', SCENES),
    at: CLOCK.test(q.get('at') || '') ? q.get('at') : DEFAULTS.at,
    name: (q.get('name') || '').replace(/[<>]/g, '').trim().slice(0, 24),
    font: pick('font', FONTS),
  }
}

// 'HH:MM' or anything Date.parse understands, else null.
function timeish(v) {
  if (!v) return null
  return CLOCK.test(v) || Number.isFinite(Date.parse(v)) ? v : null
}

function parseAlerts(raw) {
  if (raw === null) return [...DEFAULTS.alerts]
  if (raw === 'none') return []
  const asked = new Set(raw.split(',').map((s) => s.trim()))
  const list = ALERT_KINDS.filter((k) => asked.has(k))
  return list.length ? list : [...DEFAULTS.alerts]
}

// The query string for these options with every default left out, for the setup page's links.
export function toQuery(opts) {
  const out = []
  for (const key of ['theme', 'layout', 'zoomies', 'vol', 'dur', 'chat', 'goal', 'since', 'size', 'mode', 'at', 'name', 'font']) {
    if (opts[key] !== undefined && opts[key] !== null && opts[key] !== '' && opts[key] !== DEFAULTS[key]) out.push(`${key}=${encodeURIComponent(opts[key])}`)
  }
  if (opts.sound === false) out.push('sound=0')
  if (opts.demo) out.push('demo=1')
  if (opts.alerts) {
    const same = opts.alerts.length === DEFAULTS.alerts.length && opts.alerts.every((k) => DEFAULTS.alerts.includes(k))
    if (!same) out.push('alerts=' + (opts.alerts.length ? opts.alerts.join(',') : 'none'))
  }
  return out.length ? '?' + out.join('&') : ''
}
