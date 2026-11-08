import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseIrc, commandOf, connectTwitch } from '../dist/js/chat.js'

test('IRC lines: messages with and without tags, pings, noise', () => {
  assert.deepEqual(parseIrc(':ann!ann@ann.tmi.twitch.tv PRIVMSG #hamcam :!zoomies'), { cmd: 'PRIVMSG', nick: 'ann', channel: 'hamcam', text: '!zoomies' })
  assert.deepEqual(parseIrc('@badge-info=;color=#FF0000;display-name=Bob :bob!bob@bob.tmi.twitch.tv PRIVMSG #hamcam :hello : world'), { cmd: 'PRIVMSG', nick: 'bob', channel: 'hamcam', text: 'hello : world' })
  assert.deepEqual(parseIrc('PING :tmi.twitch.tv'), { cmd: 'PING', nick: null, channel: null, text: 'tmi.twitch.tv' })
  assert.equal(parseIrc(':tmi.twitch.tv 001 justinfan123 :Welcome, GLHF!'), null)
  assert.equal(parseIrc(''), null)
})

test('commands', () => {
  assert.equal(commandOf('!nap'), 'nap')
  assert.equal(commandOf('!Sleep pls'), 'nap')
  assert.equal(commandOf('!jog'), 'jog')
  assert.equal(commandOf('!run'), 'jog')
  assert.equal(commandOf('!zoomies!!!'), 'zoomies')
  assert.equal(commandOf('!zoom'), 'zoomies')
  assert.equal(commandOf('!call zoomies'), 'zoomies')
  assert.equal(commandOf('!squeek'), 'squeek')
  assert.equal(commandOf('!cheer'), 'squeek')
  assert.equal(commandOf('!napkin'), null)
  assert.equal(commandOf('nap'), null)
  assert.equal(commandOf(''), null)
})

test('the connection joins anonymously, answers pings and forwards the channel messages', () => {
  const sent = []
  const sockets = []
  class FakeWS {
    constructor(url) { this.url = url; sockets.push(this) }
    send(s) { sent.push(s) }
    close() { this.onclose && this.onclose() }
  }
  const got = []
  const states = []
  const conn = connectTwitch('hamcam', { message: (m) => got.push(m), state: (s) => states.push(s) }, { WebSocketImpl: FakeWS })
  const ws = sockets[0]
  ws.onopen()
  assert.match(sent[0], /^NICK justinfan\d+$/)
  assert.equal(sent[1], 'JOIN #hamcam')
  ws.onmessage({ data: 'PING :tmi.twitch.tv\r\n:ann!ann@ann.tmi.twitch.tv PRIVMSG #hamcam :!jog\r\n:x!x@x PRIVMSG #other :!nap\r\n' })
  assert.equal(sent[2], 'PONG :tmi.twitch.tv')
  assert.deepEqual(got, [{ nick: 'ann', text: '!jog' }])
  conn.close()
  assert.deepEqual(states, ['connecting', 'open', 'closed'])
  assert.equal(connectTwitch('x', {}, { WebSocketImpl: FakeWS }).close(), undefined)
  assert.equal(sockets.length, 1)
})
