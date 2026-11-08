// A stream goal from the URL ("km:5", "blocks:2", "run:30" minutes) and how far the session has got.
export const GOAL_KINDS = ['km', 'blocks', 'run']

export function parseGoal(str) {
  const m = /^(km|blocks|run):(\d+(?:\.\d+)?)$/.exec(String(str || '').trim().toLowerCase())
  if (!m) return null
  const target = Number(m[2])
  if (!(target > 0)) return null
  return { kind: m[1], target }
}

const trim = (n) => (Number.isInteger(n) ? String(n) : String(Number(n.toFixed(2))))

export function goalTitle(goal) {
  if (goal.kind === 'km') return `GOAL ${trim(goal.target)} KM`
  if (goal.kind === 'blocks') return `GOAL ${trim(goal.target)} ${goal.target === 1 ? 'BLOCK' : 'BLOCKS'}`
  return `GOAL ${trim(goal.target)} MIN`
}

export function goalProgress(goal, stats) {
  const value = goal.kind === 'km' ? stats.km : goal.kind === 'blocks' ? stats.blocks : stats.runSec / 60
  const frac = Math.max(0, Math.min(1, value / goal.target))
  const text = goal.kind === 'km' ? `${value.toFixed(2)} / ${trim(goal.target)} KM`
    : goal.kind === 'blocks' ? `${Math.round(value)} / ${trim(goal.target)}`
    : `${Math.floor(value)} / ${trim(goal.target)} MIN`
  return { value, target: goal.target, frac, done: value >= goal.target, text }
}
