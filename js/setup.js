import { parseParams, toQuery, THEMES, ALERT_KINDS, DEFAULTS } from './params.js'
import { mount } from './frames.js'

// The setup page: options in, one ready link per overlay out, each with a live preview on sample data. The general
// options go on every link; the companion options only where they matter.
const OVERLAYS = [
  { id: 'board', group: 'overlays', name: 'LED board', page: 'board.html', w: 880, h: 528, note: 'A corner of your scene.' },
  { id: 'strip', group: 'overlays', name: 'LED strip', page: 'board.html', extra: { layout: 'strip' }, w: 890, h: 100, note: 'A slim bar for the top or bottom.' },
  { id: 'alerts', group: 'overlays', name: 'Alerts', page: 'alerts.html', w: 1000, h: 150, note: 'Empty until something happens.' },
  { id: 'ticker', group: 'overlays', name: 'Ticker', page: 'ticker.html', w: 1920, h: 72, note: 'The round clock and the latest events.' },
  { id: 'call', group: 'companion', name: 'Round Call', page: 'call.html', params: ['chat'], w: 1056, h: 300, note: "The next round to call, the chat's tally, the result and the top callers.", demo: { chat: 'hamcam' } },
  { id: 'goal', group: 'companion', name: 'Stream goal', page: 'goal.html', params: ['goal', 'since'], w: 1000, h: 160, note: 'Fills as the session gets there; a tune when it does.' },
  { id: 'frame', group: 'companion', name: 'Cam frame', page: 'frame.html', params: ['name', 'size'], size: true, note: 'Put your camera behind it. The rim runs at his pace.' },
  { id: 'starting', group: 'companion', name: 'Starting soon', page: 'scene.html', extra: { mode: 'starting' }, params: ['at', 'since'], w: 1920, h: 1080, note: 'A full scene with the live wheel and a countdown.' },
  { id: 'brb', group: 'companion', name: 'Be right back', page: 'scene.html', extra: { mode: 'brb' }, params: ['since'], w: 1920, h: 1080, note: 'The wheel, the round clock and the session so far.' },
  { id: 'ending', group: 'companion', name: 'Thanks for watching', page: 'scene.html', extra: { mode: 'ending' }, params: ['since'], w: 1920, h: 1080, note: 'The session total to end on.' },
]
const KIND_NAMES = { wake: 'Wake up', nap: 'Nap', zoomies: 'Zoomies', block: 'Block found', record: 'Top speed', distance: 'Distance', streak: 'Streak', merge: 'Merge' }
const GENERAL = ['theme', 'alerts', 'zoomies', 'sound', 'vol', 'dur', 'demo']
const base = new URL('.', location.href).href
const opts = { ...DEFAULTS, alerts: [...DEFAULTS.alerts] }
const $ = (id) => document.getElementById(id)

for (const slot of document.querySelectorAll('#hero-stage .slot')) mount(slot, slot.dataset.src, Number(slot.dataset.w), Number(slot.dataset.h))

// the form
const themes = $('themes')
for (const [name, color] of Object.entries(THEMES)) {
  const label = document.createElement('label')
  label.className = 'chip'
  label.innerHTML = `<input type="radio" name="theme" value="${name}"><span><i class="swatch" style="--c:${color}"></i>${name}</span>`
  themes.append(label)
}
const kinds = $('kinds')
for (const kind of ALERT_KINDS) {
  const label = document.createElement('label')
  label.className = 'chip'
  label.innerHTML = `<input type="checkbox" name="kind" value="${kind}"><span>${KIND_NAMES[kind]}</span>`
  kinds.append(label)
}

// the outputs
const cards = OVERLAYS.map((o) => {
  const el = document.createElement('article')
  el.className = 'out'
  el.innerHTML = `
    <div class="out-head"><h3>${o.name}</h3><span class="fine"><span data-size></span> ${o.note}</span></div>
    <div class="stage fit"><div class="slot"></div></div>
    <div class="url"><input readonly aria-label="${o.name} link"><button class="btn small" type="button" data-copy>Copy</button>${o.id === 'alerts' ? '<button class="btn small" type="button" data-test>Test alert</button>' : ''}</div>`
  $('outputs-' + o.group).append(el)
  return { o, el, input: el.querySelector('input'), slot: el.querySelector('.slot'), sizeEl: el.querySelector('[data-size]'), frame: null }
})

function sizeOf(o) {
  if (!o.size) return [o.w, o.h]
  return opts.size.split('x').map(Number)
}

function link(o, demo) {
  const q = {}
  for (const k of GENERAL) q[k] = opts[k]
  for (const k of o.params || []) q[k] = opts[k]
  Object.assign(q, o.extra || {})
  if (demo) { q.demo = true; Object.assign(q, o.demo || {}) }
  if (o.id === 'goal' && !q.goal) q.goal = 'km:5'
  return base + o.page + toQuery(q)
}

function refresh() {
  document.documentElement.dataset.theme = opts.theme
  for (const c of cards) {
    const [w, h] = sizeOf(c.o)
    c.sizeEl.textContent = `Source size ${w} × ${h}.`
    c.input.value = link(c.o, opts.demo)
    const previewSrc = link(c.o, true) + (['alerts', 'call', 'goal'].includes(c.o.id) ? '&sound=0' : '')
    if (!c.frame) c.frame = mount(c.slot, previewSrc, w, h)
    else if (c.frame.dataset.src !== previewSrc || Number(c.frame.width) !== w) {
      c.frame.remove()
      c.frame = mount(c.slot, previewSrc, w, h)
    }
    c.frame.dataset.src = previewSrc
  }
  for (const id of ['zoomies', 'dur', 'vol']) $(id).nextElementSibling.textContent = String(opts[id])
}

const clockOk = (v) => /^\d{1,2}:\d{2}$/.test(v)

function readForm() {
  opts.theme = document.querySelector('input[name=theme]:checked')?.value || DEFAULTS.theme
  opts.alerts = [...document.querySelectorAll('input[name=kind]:checked')].map((i) => i.value)
  opts.zoomies = Number($('zoomies').value)
  opts.dur = Number($('dur').value)
  opts.vol = Number($('vol').value)
  opts.sound = $('sound').checked
  opts.demo = $('demo').checked
  const chat = $('chat').value.trim().toLowerCase().replace(/^@|^https?:\/\/(www\.)?twitch\.tv\//, '')
  opts.chat = /^[a-z0-9_]{3,25}$/.test(chat) ? chat : ''
  const n = Number($('goalN').value)
  opts.goal = n > 0 ? `${$('goalKind').value}:${n}` : null
  opts.since = clockOk($('since').value.trim()) ? $('since').value.trim() : null
  opts.name = $('name').value.replace(/[<>]/g, '').trim().slice(0, 24)
  opts.size = $('size').value
  opts.at = clockOk($('at').value.trim()) ? $('at').value.trim() : null
  refresh()
}

function fillForm() {
  const from = parseParams(location.search)
  Object.assign(opts, from)
  document.querySelector(`input[name=theme][value=${opts.theme}]`).checked = true
  for (const i of document.querySelectorAll('input[name=kind]')) i.checked = opts.alerts.includes(i.value)
  $('zoomies').value = opts.zoomies
  $('dur').value = opts.dur
  $('vol').value = opts.vol
  $('sound').checked = opts.sound
  $('demo').checked = opts.demo
  $('chat').value = opts.chat
  if (opts.goal) { const [k, n] = opts.goal.split(':'); $('goalKind').value = k; $('goalN').value = n }
  $('since').value = opts.since || ''
  $('name').value = opts.name
  $('size').value = opts.size
  $('at').value = opts.at || ''
  if (!opts.goal) opts.goal = `${$('goalKind').value}:${$('goalN').value}`
}

$('form').addEventListener('input', readForm)
document.querySelector('.outputs').addEventListener('click', async (e) => {
  const card = cards.find((c) => c.el.contains(e.target))
  if (!card) return
  if (e.target.closest('[data-copy]')) {
    card.input.select()
    try { await navigator.clipboard.writeText(card.input.value); e.target.textContent = 'Copied' } catch { e.target.textContent = 'Select and copy' }
    setTimeout(() => { e.target.textContent = 'Copy' }, 1600)
  }
  if (e.target.closest('[data-test]') && card.frame) card.frame.contentWindow.postMessage({ type: 'squeek-test-alert' }, location.origin)
})

fillForm()
refresh()
