// Which livestream the watch page plays: a YouTube video id, a Twitch channel or an X broadcast id, the same three kinds
// Squeekchain's own live descriptor uses. It comes from the page URL (?youtube=, ?twitch=, ?x=) or a pasted link.
const RULES = {
  youtube: /^[A-Za-z0-9_-]{11}$/,
  twitch: /^[a-z0-9_]{4,25}$/,
  x: /^[A-Za-z0-9]{8,40}$/,
}

const ok = (kind, id) => (typeof id === 'string' && RULES[kind].test(id) ? { kind, id } : null)

export function parseStream(text) {
  const raw = String(text || '').trim()
  if (!raw) return null
  let url
  try {
    url = new URL(/^[a-z]+:\/\//i.test(raw) ? raw : 'https://' + raw)
  } catch {
    return null
  }
  if (url.protocol !== 'https:' && url.protocol !== 'http:') return null
  const host = url.hostname.replace(/^www\.|^m\./, '')
  const parts = url.pathname.split('/').filter(Boolean)
  if (host === 'youtube.com') {
    if (parts[0] === 'watch') return ok('youtube', url.searchParams.get('v'))
    if (parts[0] === 'live' || parts[0] === 'embed') return ok('youtube', parts[1])
    return null
  }
  if (host === 'youtu.be') return ok('youtube', parts[0])
  if (host === 'twitch.tv') return parts.length === 1 ? ok('twitch', parts[0].toLowerCase()) : null
  if (host === 'x.com' || host === 'twitter.com') return parts[0] === 'i' && parts[1] === 'broadcasts' ? ok('x', parts[2]) : null
  if (host === 'studio.x.com') return parts[0] === 'embed' && parts[1] === 'broadcast' ? ok('x', parts[2]) : null
  return null
}

export function fromParams(search) {
  const q = new URLSearchParams(search)
  for (const kind of ['youtube', 'twitch', 'x']) {
    if (q.has(kind)) {
      const s = ok(kind, kind === 'twitch' ? q.get(kind).toLowerCase() : q.get(kind))
      if (s) return s
    }
  }
  return null
}

// The player to embed, muted so browsers allow it to start on its own. Twitch only plays inside the page's own host.
export function embedUrl(stream, host) {
  if (!stream) return null
  if (stream.kind === 'youtube') return `https://www.youtube-nocookie.com/embed/${stream.id}?autoplay=1&mute=1&playsinline=1&rel=0`
  if (stream.kind === 'twitch') return `https://player.twitch.tv/?channel=${stream.id}&parent=${host}&muted=true&autoplay=true`
  if (stream.kind === 'x') return `https://studio.x.com/embed/broadcast/${stream.id}?dnt=true`
  return null
}

export const streamQuery = (stream) => (stream ? `${stream.kind}=${stream.id}` : '')
