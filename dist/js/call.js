import { parseParams, THEMES } from './params.js'
import { createCalls, CALLS } from './calls.js'
import { connectTwitch, commandOf } from './chat.js'
import { startSource } from './source.js'
import { clock } from './rounds.js'
import { createSound } from './sound.js'
import { Led, textWidth } from './led.js'
import { COLORS } from './boardview.js'
import { DEMO_CALLS, DEMO_CHATTERS } from './demo.js'

// The Round Call overlay: the round that is on, how long until calls for the next one close, the chat's tally when a
// Twitch channel is connected (!nap, !jog, !zoomies), then the result and the top callers. Source 1056 x 300, a grid
// of 176 x 50 dots.
const opts = parseParams(location.search)
const accent = THEMES[opts.theme]
const led = new Led(document.getElementById('led'), { fit: 'contain' })
const card = document.getElementById('card')
const sound = createSound({ vol: opts.vol, on: opts.sound })
const NAMES = { nap: 'NAP', jog: 'JOG', zoomies: 'ZOOMIES' }
let calls = null
let chatState = opts.chat ? 'connecting' : 'none'
let cheers = 0
let flash = 0

function ready(core) {
  if (calls) return
  calls = createCalls({ genesis: Number(core.genesisTimestamp), duration: Number(core.roundDuration), zoomiesKmh: opts.zoomies })
}

if (opts.demo) {
  ready({ genesisTimestamp: DEMO_CALLS.genesis, roundDuration: DEMO_CALLS.duration })
  chatState = 'open'
  // a chat that calls, and rounds whose outcome cycles
  setInterval(() => {
    const user = DEMO_CHATTERS[Math.floor(Math.random() * DEMO_CHATTERS.length)]
    const s = calls.state(Date.now())
    const likely = DEMO_CALLS.outcomes[s.next % DEMO_CALLS.outcomes.length]
    const kind = Math.random() < 0.6 ? likely : CALLS[Math.floor(Math.random() * 3)]
    calls.chatCall(user, kind, Date.now())
  }, 2500)
  setInterval(() => {
    const now = Date.now()
    const s = calls.state(now)
    const outcome = DEMO_CALLS.outcomes[s.round % DEMO_CALLS.outcomes.length]
    const fast = outcome === 'zoomies'
    calls.push({ at: now, online: true, rpm: outcome === 'nap' ? 0 : 70, speedKmh: outcome === 'nap' ? 0 : fast ? 4.9 : 3.7 })
  }, 1000)
} else {
  startSource({}, {
    core(c) { ready(c) },
    status(r) { if (calls) calls.push(r) },
  })
  if (opts.chat) {
    connectTwitch(opts.chat, {
      state(s) { chatState = s },
      message({ nick, text }) {
        const cmd = commandOf(text)
        if (!cmd || !calls) return
        if (cmd === 'squeek') { cheers += 1; flash = 6; return }
        calls.chatCall(nick, cmd, Date.now())
      },
    })
  }
}

let lastResult = null
let resultAt = 0

const COLS = 176
const ROWS = 50
const COLW = 58

function draw() {
  const now = Date.now()
  led.grid(COLS, ROWS)
  if (!calls) {
    led.text('ROUND CALL', 2, 2, accent)
    led.text('TUNING IN', 2, 12, COLORS.label)
    led.paint()
    return
  }
  for (const res of calls.tick(now)) {
    lastResult = res
    resultAt = now
    if (res.outcome !== 'void') sound.play(res.outcome === 'zoomies' ? 'zoomies' : res.outcome === 'nap' ? 'nap' : 'block')
  }
  const s = calls.state(now)
  const closing = s.left <= 60
  // line 1: which round to call, and how long calls stay open
  const x0 = led.icon('call', 2, 2, COLORS.cream)
  led.text(`CALL ROUND ${s.next}`, x0 + 1, 2, accent)
  const right = `${clock(s.left)} LEFT`
  led.text(right, COLS - 2 - textWidth(right), 2, closing ? accent : COLORS.label)
  // the three calls: name, the chat's share big, a bar
  const t = s.tally
  CALLS.forEach((k, i) => {
    const x = 2 + i * COLW
    const share = t.total ? t.pct[k] : null
    const leading = Boolean(t.total) && CALLS.every((o) => t.counts[k] >= t.counts[o])
    led.text(NAMES[k], x, 12, leading ? accent : COLORS.cream)
    led.text(share === null ? '--' : `${share}%`, x, 21, leading ? accent : share ? COLORS.cream : COLORS.label, 2)
    led.bar(x, 36, COLW - 6, 3, share === null ? 0 : share / 100, leading ? accent : COLORS.rim, COLORS.dim)
  })
  // the last line: the latest result, the chat hint or the top callers
  let line
  let tone = COLORS.cream
  if (lastResult && now - resultAt < 20_000) {
    const r = lastResult
    if (r.outcome === 'void') line = `ROUND ${r.round}: NO SIGNAL`
    else {
      line = `ROUND ${r.round} WAS A ${NAMES[r.outcome]}`
      if (r.chat.total) line += `  CHAT ${Math.round((100 * r.chat.right.length) / r.chat.total)}% RIGHT`
      tone = accent
    }
  } else if (chatState === 'open' && calls.leaderboard(1).length && Math.floor(now / 8000) % 2) {
    line = 'TOP ' + calls.leaderboard(3).map((r) => `${r.user.toUpperCase().slice(0, 9)} ${r.points}`).join('  ')
  } else if (chatState === 'open') {
    line = t.total ? `${t.total} CALL${t.total === 1 ? '' : 'S'}  !NAP !JOG !ZOOMIES` : 'TYPE !NAP !JOG OR !ZOOMIES'
    tone = COLORS.label
  } else if (chatState === 'none') {
    line = 'CALL IT ON THE SECOND SCREEN'
    tone = COLORS.label
  } else {
    line = `CHAT ${chatState.toUpperCase()}`
    tone = COLORS.label
  }
  led.text(line.slice(0, 28), 2, 42, tone)
  if (flash > 0) { flash -= 1; for (let x = 0; x < COLS; x += 2) led.dot(x, ROWS - 1, accent) }
  led.paint()
  card.setAttribute('aria-label', `Call round ${s.next}, ${clock(s.left)} left. ${line}`)
}
draw()
setInterval(draw, 500)
