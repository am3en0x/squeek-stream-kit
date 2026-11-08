import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseStream, fromParams, embedUrl, streamQuery } from '../dist/js/embed.js'

test('pasted links from each platform', () => {
  assert.deepEqual(parseStream('https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=10'), { kind: 'youtube', id: 'dQw4w9WgXcQ' })
  assert.deepEqual(parseStream('https://youtu.be/dQw4w9WgXcQ'), { kind: 'youtube', id: 'dQw4w9WgXcQ' })
  assert.deepEqual(parseStream('https://www.youtube.com/live/dQw4w9WgXcQ?si=abc'), { kind: 'youtube', id: 'dQw4w9WgXcQ' })
  assert.deepEqual(parseStream('youtube.com/embed/dQw4w9WgXcQ'), { kind: 'youtube', id: 'dQw4w9WgXcQ' })
  assert.deepEqual(parseStream('https://www.twitch.tv/SqueekChain'), { kind: 'twitch', id: 'squeekchain' })
  assert.deepEqual(parseStream('https://x.com/i/broadcasts/1yNGaZgwbXqKj'), { kind: 'x', id: '1yNGaZgwbXqKj' })
  assert.deepEqual(parseStream('https://twitter.com/i/broadcasts/1yNGaZgwbXqKj'), { kind: 'x', id: '1yNGaZgwbXqKj' })
  assert.deepEqual(parseStream('https://studio.x.com/embed/broadcast/1yNGaZgwbXqKj?dnt=true'), { kind: 'x', id: '1yNGaZgwbXqKj' })
})

test('anything else is not a stream', () => {
  for (const s of ['', 'hello', 'https://example.com/watch?v=dQw4w9WgXcQ', 'https://www.youtube.com/watch?v=short', 'https://www.twitch.tv/', 'https://x.com/squeekchain', 'javascript:alert(1)']) {
    assert.equal(parseStream(s), null, s)
  }
})

test('stream from the page URL, first valid platform wins', () => {
  assert.deepEqual(fromParams('?youtube=dQw4w9WgXcQ&theme=ice'), { kind: 'youtube', id: 'dQw4w9WgXcQ' })
  assert.deepEqual(fromParams('?twitch=squeekchain'), { kind: 'twitch', id: 'squeekchain' })
  assert.deepEqual(fromParams('?x=1yNGaZgwbXqKj'), { kind: 'x', id: '1yNGaZgwbXqKj' })
  assert.equal(fromParams('?youtube=bad'), null)
  assert.equal(fromParams(''), null)
})

test('player URLs: muted autoplay, Twitch needs the parent host', () => {
  assert.equal(embedUrl({ kind: 'youtube', id: 'dQw4w9WgXcQ' }, 'example.org'), 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?autoplay=1&mute=1&playsinline=1&rel=0')
  assert.equal(embedUrl({ kind: 'twitch', id: 'squeekchain' }, 'am3en0x.github.io'), 'https://player.twitch.tv/?channel=squeekchain&parent=am3en0x.github.io&muted=true&autoplay=true')
  assert.equal(embedUrl({ kind: 'x', id: '1yNGaZgwbXqKj' }, 'x'), 'https://studio.x.com/embed/broadcast/1yNGaZgwbXqKj?dnt=true')
  assert.equal(embedUrl(null, 'x'), null)
})

test('a stream as URL parameters', () => {
  assert.equal(streamQuery({ kind: 'twitch', id: 'squeekchain' }), 'twitch=squeekchain')
  assert.equal(streamQuery(null), '')
})
