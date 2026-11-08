// Squeekchain rounds: round 1 starts at the genesis timestamp and each lasts `duration` seconds (600).
export function roundAt(nowSec, genesis, duration) {
  if (!(duration > 0) || nowSec < genesis) return { round: 0, left: Math.max(0, Math.ceil(genesis - nowSec)) }
  const index = Math.floor((nowSec - genesis) / duration)
  return { round: index + 1, left: Math.ceil(genesis + (index + 1) * duration - nowSec) }
}

export function clock(seconds) {
  const s = Math.max(0, Math.floor(seconds))
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0')
}

// Like clock(), with hours in front once there is an hour or more: 1:02:03.
export function clockLong(seconds) {
  const s = Math.max(0, Math.floor(seconds))
  return s < 3600 ? clock(s) : `${Math.floor(s / 3600)}:${clock(s % 3600)}`
}
