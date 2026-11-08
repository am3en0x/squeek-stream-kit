// Short square-wave tunes made with Web Audio, one per alert kind. No audio files. OBS lets a browser source play
// sound on its own; a normal browser tab starts muted until the viewer clicks the page.
const TUNES = {
  wake: [[523, 0.09], [659, 0.09], [784, 0.16]],
  nap: [[784, 0.12], [587, 0.12], [392, 0.24]],
  zoomies: [[880, 0.05], [988, 0.05], [1175, 0.05], [1319, 0.05], [1568, 0.14]],
  block: [[659, 0.08], [880, 0.08], [1319, 0.2]],
  record: [[523, 0.07], [784, 0.07], [1047, 0.07], [1568, 0.22]],
  distance: [[587, 0.1], [740, 0.1], [880, 0.18]],
  streak: [[440, 0.08], [554, 0.08], [659, 0.08], [880, 0.2]],
  merge: [[392, 0.08], [523, 0.08], [784, 0.16]],
}

export function createSound({ vol = 60, on = true } = {}) {
  let ctx = null
  const ensure = () => {
    if (!ctx) {
      const AC = globalThis.AudioContext || globalThis.webkitAudioContext
      if (!AC) return null
      ctx = new AC()
    }
    if (ctx.state === 'suspended') ctx.resume().catch(() => {})
    return ctx
  }
  return {
    setOn(v) { on = Boolean(v); if (on) ensure() },
    unlock() { ensure() },
    play(kind) {
      if (!on || vol <= 0) return
      const c = ensure()
      if (!c) return
      let t = c.currentTime + 0.02
      const peak = (vol / 100) * 0.16
      for (const [freq, dur] of TUNES[kind] || TUNES.block) {
        const osc = c.createOscillator()
        const gain = c.createGain()
        osc.type = 'square'
        osc.frequency.value = freq
        gain.gain.setValueAtTime(peak, t)
        gain.gain.exponentialRampToValueAtTime(0.0001, t + dur)
        osc.connect(gain).connect(c.destination)
        osc.start(t)
        osc.stop(t + dur + 0.02)
        t += dur
      }
    },
  }
}
