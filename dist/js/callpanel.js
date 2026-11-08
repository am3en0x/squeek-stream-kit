import { createCalls, CALLS, POINTS } from './calls.js'
import { clock } from './rounds.js'
import { DEMO_CALLS } from './demo.js'

// The viewer's Round Call panel on the second screen and the watch page: three buttons to call the next round, the
// time until calls close, the viewer's streak and points (kept in this browser), and how the last round went.
// The page feeds it: panel.core(configuration) once, panel.status(reading) as they come.
const KEY = 'sk.calls.score'
const NAMES = { nap: 'Nap', jog: 'Jog', zoomies: 'Zoomies' }
const HINT = { nap: 'the wheel never turns', jog: 'he runs, under the zoomies mark', zoomies: 'two readings at or over it' }

function loadScore() {
  try { return JSON.parse(localStorage.getItem(KEY)) || null } catch { return null }
}
function saveScore(score) {
  try { localStorage.setItem(KEY, JSON.stringify(score)) } catch {}
}

export function createCallPanel(root, { zoomies = 4.5, demo = false } = {}) {
  root.className = 'callpanel'
  root.innerHTML = `
    <div class="cp-head">
      <div><span class="label">Round call</span><strong class="cp-title">Tuning in…</strong></div>
      <div class="cp-right"><span class="cp-score"></span><span class="cp-left label"></span></div>
    </div>
    <div class="cp-buttons" role="group" aria-label="Your call for the next round">
      ${CALLS.map((k) => `<button type="button" data-call="${k}" aria-pressed="false"><b>${NAMES[k]}</b><small>${HINT[k]}${POINTS[k] > 1 ? ` · ${POINTS[k]} pts` : ''}</small></button>`).join('')}
    </div>
    <p class="cp-status fine"></p>
    <p class="cp-result" role="status" aria-live="polite" hidden></p>`
  const $ = (sel) => root.querySelector(sel)
  let calls = null
  let shownResultAt = 0

  function ready(core) {
    if (calls) return
    calls = createCalls({ genesis: Number(core.genesisTimestamp), duration: Number(core.roundDuration), zoomiesKmh: zoomies, score: loadScore() })
    render()
  }

  function render() {
    const now = Date.now()
    if (!calls) return
    for (const res of calls.tick(now)) {
      saveScore(calls.score)
      if (res.call) {
        const el = $('.cp-result')
        el.hidden = false
        el.className = 'cp-result ' + (res.correct ? 'good' : 'bad')
        el.textContent = res.outcome === 'void'
          ? `Round ${res.round}: no signal from the wheel, your call does not count.`
          : `Round ${res.round} was a ${NAMES[res.outcome].toLowerCase()}. ${res.correct ? `You called it! +${POINTS[res.outcome]}` : `You called ${NAMES[res.call].toLowerCase()}.`}`
        shownResultAt = now
      }
    }
    const s = calls.state(now)
    $('.cp-title').textContent = `Call round ${s.next}`
    $('.cp-left').textContent = `closes in ${clock(s.left)}`
    $('.cp-left').classList.toggle('soon', s.left <= 60)
    for (const b of root.querySelectorAll('[data-call]')) b.setAttribute('aria-pressed', String(b.dataset.call === s.myCall))
    const sc = calls.score
    $('.cp-score').textContent = sc.played ? `Streak ${sc.streak} · ${sc.points} pts` : 'No calls yet'
    $('.cp-score').classList.toggle('hot', sc.streak >= 3)
    $('.cp-status').textContent = (s.myCall ? `Your call: ${NAMES[s.myCall].toLowerCase()}. ` : 'Pick one before the round ends. ')
      + (sc.played ? `Best streak ${sc.best}, ${sc.right} of ${sc.played} right.` : 'Nap and jog pay 1 point, zoomies 3.')
    if (shownResultAt && now - shownResultAt > 60_000) { $('.cp-result').hidden = true; shownResultAt = 0 }
  }

  root.addEventListener('click', (e) => {
    const b = e.target.closest('[data-call]')
    if (!b || !calls) return
    calls.call(b.dataset.call, Date.now())
    render()
  })
  setInterval(render, 1000)

  if (demo) {
    ready({ genesisTimestamp: DEMO_CALLS.genesis, roundDuration: DEMO_CALLS.duration })
    setInterval(() => {
      const now = Date.now()
      const outcome = DEMO_CALLS.outcomes[calls.state(now).round % DEMO_CALLS.outcomes.length]
      calls.push({ at: now, online: true, rpm: outcome === 'nap' ? 0 : 70, speedKmh: outcome === 'nap' ? 0 : outcome === 'zoomies' ? 4.9 : 3.7 })
    }, 1000)
  }

  return {
    core(c) { if (!demo) ready(c) },
    status(r) { if (calls && !demo) calls.push(r) },
  }
}
