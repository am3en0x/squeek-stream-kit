// Options shared by every page, read from the URL. Anything unknown or out of range falls back to the default.
export const ALERT_KINDS = ['wake', 'nap', 'zoomies', 'block', 'record', 'distance', 'streak', 'merge']
export const THEMES = { amber: '#f6a63b', green: '#7fe08a', ice: '#7fdcff', white: '#f3e9cc' }
export const DEFAULTS = Object.freeze({
  theme: 'amber',
  layout: 'full',
  alerts: ALERT_KINDS.filter((k) => k !== 'merge'),
  zoomies: 4.5,
  sound: true,
  vol: 60,
  dur: 6,
  demo: false,
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
  }
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
  for (const key of ['theme', 'layout', 'zoomies', 'vol', 'dur']) {
    if (opts[key] !== undefined && opts[key] !== DEFAULTS[key]) out.push(`${key}=${encodeURIComponent(opts[key])}`)
  }
  if (opts.sound === false) out.push('sound=0')
  if (opts.demo) out.push('demo=1')
  if (opts.alerts) {
    const same = opts.alerts.length === DEFAULTS.alerts.length && opts.alerts.every((k) => DEFAULTS.alerts.includes(k))
    if (!same) out.push('alerts=' + (opts.alerts.length ? opts.alerts.join(',') : 'none'))
  }
  return out.length ? '?' + out.join('&') : ''
}
