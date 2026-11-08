import { parseParams, toQuery, THEMES, ALERT_KINDS, DEFAULTS } from './params.js'

// The setup page: options in, one ready link per overlay out, each with a live preview on sample data.
const OVERLAYS = [
  { id: 'board', name: 'LED board', page: 'board.html', w: 880, h: 528, note: 'A corner of your scene.' },
  { id: 'strip', name: 'LED strip', page: 'board.html', extra: { layout: 'strip' }, w: 890, h: 100, note: 'A slim bar for the top or bottom.' },
  { id: 'alerts', name: 'Alerts', page: 'alerts.html', w: 1000, h: 150, note: 'Empty until something happens.' },
  { id: 'ticker', name: 'Ticker', page: 'ticker.html', w: 1920, h: 72, note: 'The round clock and the latest events.' },
]
const KIND_NAMES = { wake: 'Wake up', nap: 'Nap', zoomies: 'Zoomies', block: 'Block found', record: 'Top speed', distance: 'Distance', streak: 'Streak', merge: 'Merge' }
const base = new URL('.', location.href).href
const opts = { ...DEFAULTS, alerts: [...DEFAULTS.alerts] }
const $ = (id) => document.getElementById(id)

// a preview: an iframe at the overlay's real size, scaled into its slot
function mount(slot, src, w, h) {
  const frame = document.createElement('iframe')
  frame.src = src
  frame.width = w
  frame.height = h
  frame.title = 'Overlay preview'
  frame.loading = 'lazy'
  frame.setAttribute('allowtransparency', 'true')
  slot.append(frame)
  const fit = () => {
    const k = slot.clientWidth / w
    frame.style.transform = `scale(${k})`
    slot.style.height = h * k + 'px'
  }
  new ResizeObserver(fit).observe(slot)
  fit()
  return frame
}

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
const outputs = $('outputs')
const cards = OVERLAYS.map((o) => {
  const el = document.createElement('article')
  el.className = 'out'
  el.innerHTML = `
    <div class="out-head"><h3>${o.name}</h3><span class="fine">Source size ${o.w} × ${o.h}. ${o.note}</span></div>
    <div class="stage fit"><div class="slot"></div></div>
    <div class="url"><input readonly aria-label="${o.name} link"><button class="btn small" type="button" data-copy>Copy</button>${o.id === 'alerts' ? '<button class="btn small" type="button" data-test>Test alert</button>' : ''}</div>`
  outputs.append(el)
  return { o, el, input: el.querySelector('input'), slot: el.querySelector('.slot'), frame: null }
})

function link(o, demo) {
  return base + o.page + toQuery({ ...opts, ...(o.extra || {}), demo })
}

function refresh() {
  document.documentElement.dataset.theme = opts.theme
  for (const c of cards) {
    c.input.value = link(c.o, opts.demo)
    const previewSrc = link(c.o, true) + (c.o.id === 'alerts' ? '&sound=0' : '')
    if (!c.frame) c.frame = mount(c.slot, previewSrc, c.o.w, c.o.h)
    else if (c.frame.dataset.src !== previewSrc) c.frame.src = previewSrc
    c.frame.dataset.src = previewSrc
  }
  for (const id of ['zoomies', 'dur', 'vol']) $(id).nextElementSibling.textContent = String(opts[id])
}

function readForm() {
  opts.theme = document.querySelector('input[name=theme]:checked')?.value || DEFAULTS.theme
  opts.alerts = [...document.querySelectorAll('input[name=kind]:checked')].map((i) => i.value)
  opts.zoomies = Number($('zoomies').value)
  opts.dur = Number($('dur').value)
  opts.vol = Number($('vol').value)
  opts.sound = $('sound').checked
  opts.demo = $('demo').checked
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
}

$('form').addEventListener('input', readForm)
outputs.addEventListener('click', async (e) => {
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
