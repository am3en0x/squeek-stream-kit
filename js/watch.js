import { parseParams, toQuery } from './params.js'
import { parseStream, fromParams, embedUrl, streamQuery } from './embed.js'
import { mount } from './frames.js'

// The watch page: Squeekchain's livestream in a 16:9 screen, the board and the alerts on top of it (they let clicks
// through to the player), the ticker under it. The stream comes from ?youtube= / ?twitch= / ?x= or a pasted link.
const opts = parseParams(location.search)
document.documentElement.dataset.theme = opts.theme
const $ = (id) => document.getElementById(id)
const overlayQuery = (extra) => toQuery({ ...opts, ...extra })

mount($('board-slot'), 'board.html' + overlayQuery({}), 880, 528, { title: 'LED board', lazy: false })
const alerts = mount($('alert-slot'), 'alerts.html' + overlayQuery({ sound: false }), 1000, 150, { title: 'Alerts', lazy: false })
mount($('ticker-slot'), 'ticker.html' + overlayQuery({}), 1920, 72, { title: 'Ticker', lazy: false })

function show(stream) {
  const src = embedUrl(stream, location.hostname)
  const video = $('video')
  if (src) {
    if (video.src !== src) video.src = src
    video.hidden = false
    $('offair').hidden = true
  } else {
    video.removeAttribute('src')
    video.hidden = true
    $('offair').hidden = false
  }
}

// keep the stream in the address so the page can be shared as is
function remember(stream) {
  const q = new URLSearchParams(location.search)
  for (const k of ['youtube', 'twitch', 'x']) q.delete(k)
  const s = streamQuery(stream)
  const rest = q.toString()
  history.replaceState(null, '', '?' + [s, rest].filter(Boolean).join('&'))
}

$('paste').addEventListener('submit', (e) => {
  e.preventDefault()
  const stream = parseStream($('link').value)
  if (!stream) {
    $('paste-msg').textContent = 'That is not a YouTube, Twitch or X broadcast link.'
    $('paste-msg').classList.add('bad')
    return
  }
  $('paste-msg').classList.remove('bad')
  remember(stream)
  show(stream)
})

$('change').addEventListener('click', () => {
  remember(null)
  show(null)
  $('link').focus()
})

// browsers only play sound after a click on the page, so the alert sound starts off
let soundOn = false
$('sound').addEventListener('click', () => {
  soundOn = !soundOn
  $('sound').setAttribute('aria-pressed', String(soundOn))
  $('sound').textContent = soundOn ? 'Alert sound on' : 'Alert sound off'
  alerts.contentWindow.postMessage({ type: 'squeek-sound', on: soundOn }, location.origin)
})

show(fromParams(location.search))
