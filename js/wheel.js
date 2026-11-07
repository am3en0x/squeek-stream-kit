// The wheel's state from successive status readings. It only reports changes it has seen happen:
//   wake    moving again on two readings in a row after a nap
//   nap     still for napMs after it was seen running
//   zoomies at or over the threshold on two readings in a row; armed again once the speed has stayed under 80% of
//           the threshold (or stopped) for rearmMs
// Without an online reading for offAirMs the phase is 'offair'; coming back starts afresh, with no alert.
export function createWheel({ zoomiesKmh = 4.5, napMs = 180_000, offAirMs = 120_000, rearmMs = 120_000 } = {}) {
  let phase = 'unknown'
  let ranBefore = false
  let stillSince = null
  let moveStreak = 0
  let lastOnline = null
  let fastStreak = 0
  let armed = null
  let slowSince = null
  let last = null

  function push(r) {
    const out = []
    if (!r.online) {
      if (lastOnline === null || r.at - lastOnline >= offAirMs) phase = 'offair'
      moveStreak = 0
      fastStreak = 0
      return out
    }
    lastOnline = r.at
    last = r
    const moving = r.rpm > 0

    if (phase === 'unknown' || phase === 'offair') {
      phase = moving ? 'running' : 'still'
      ranBefore = moving
      stillSince = moving ? null : r.at
      moveStreak = moving ? 1 : 0
    } else if (moving) {
      moveStreak += 1
      if (moveStreak >= 2 && phase !== 'running') {
        if (phase === 'napping') out.push('wake')
        phase = 'running'
        ranBefore = true
        stillSince = null
      }
    } else {
      moveStreak = 0
      if (stillSince === null) stillSince = r.at
      if (phase === 'running') phase = 'still'
      if (phase === 'still' && r.at - stillSince >= napMs) {
        if (ranBefore) out.push('nap')
        phase = 'napping'
      }
    }

    const fast = moving && r.speedKmh >= zoomiesKmh
    if (armed === null) armed = !fast
    fastStreak = fast ? fastStreak + 1 : 0
    if (fast && armed && fastStreak >= 2) {
      out.push('zoomies')
      armed = false
      slowSince = null
    } else if (!armed && !fast) {
      if (!moving || r.speedKmh < zoomiesKmh * 0.8) {
        if (slowSince === null) slowSince = r.at
        if (r.at - slowSince >= rearmMs) armed = true
      } else {
        slowSince = null
      }
    }
    return out
  }

  return {
    push,
    get phase() { return phase },
    get last() { return last },
  }
}
