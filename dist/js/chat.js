// Twitch chat, read only: an anonymous IRC-over-WebSocket connection (no account, no token, nothing is ever sent to
// chat). Viewers type !nap, !jog or !zoomies to call the next round and !squeek to cheer. YouTube and X have no open chat.

// One IRC line as {cmd, nick, channel, text}, or null for anything that is not a message or a PING.
export function parseIrc(line) {
  let s = String(line || '').trim()
  if (!s) return null
  if (s.startsWith('@')) s = s.slice(s.indexOf(' ') + 1) // tags
  let nick = null
  if (s.startsWith(':')) {
    const sp = s.indexOf(' ')
    nick = s.slice(1, sp).split('!')[0]
    s = s.slice(sp + 1)
  }
  const parts = s.split(' ')
  const cmd = parts[0]
  if (cmd === 'PING') return { cmd, nick: null, channel: null, text: s.slice(s.indexOf(':') + 1) }
  if (cmd !== 'PRIVMSG') return null
  const channel = (parts[1] || '').replace(/^#/, '')
  const colon = s.indexOf(' :')
  return { cmd, nick, channel, text: colon >= 0 ? s.slice(colon + 2) : '' }
}

// A chat command: a call (nap, jog, zoomies), a cheer (squeek) or null.
export function commandOf(text) {
  const t = String(text || '').trim().toLowerCase()
  const m = /^!(?:call\s+)?(nap|sleep|jog|run|zoomies|zoomy|zoom|squeek|cheer)\b/.exec(t)
  if (!m) return null
  const w = m[1]
  if (w === 'nap' || w === 'sleep') return 'nap'
  if (w === 'jog' || w === 'run') return 'jog'
  if (w.startsWith('zoom')) return 'zoomies'
  return 'squeek'
}

export const CHANNEL_RE = /^[a-z0-9_]{3,25}$/

// Joins a channel anonymously and hands every message to on.message({nick, text}); on.state(connecting | open |
// closed) follows the socket. Reconnects with a backoff from 2 s to 60 s. Returns {close}.
export function connectTwitch(channel, on = {}, { WebSocketImpl = globalThis.WebSocket, url = 'wss://irc-ws.chat.twitch.tv:443' } = {}) {
  if (!CHANNEL_RE.test(channel) || !WebSocketImpl) return { close() {} }
  let ws = null
  let wait = 2000
  let closed = false
  let timer = null
  const connect = () => {
    if (closed) return
    if (on.state) on.state('connecting')
    ws = new WebSocketImpl(url)
    ws.onopen = () => {
      wait = 2000
      ws.send('NICK justinfan' + Math.floor(10000 + Math.random() * 80000))
      ws.send('JOIN #' + channel)
      if (on.state) on.state('open')
    }
    ws.onmessage = (ev) => {
      for (const line of String(ev.data).split('\r\n')) {
        const m = parseIrc(line)
        if (!m) continue
        if (m.cmd === 'PING') ws.send('PONG :' + m.text)
        else if (m.channel === channel && on.message) on.message({ nick: m.nick, text: m.text })
      }
    }
    ws.onclose = () => {
      if (on.state) on.state('closed')
      if (closed) return
      timer = setTimeout(connect, wait)
      wait = Math.min(60000, wait * 2)
    }
    ws.onerror = () => { try { ws.close() } catch {} }
  }
  connect()
  return {
    close() {
      closed = true
      clearTimeout(timer)
      try { if (ws) ws.close() } catch {}
    },
  }
}
