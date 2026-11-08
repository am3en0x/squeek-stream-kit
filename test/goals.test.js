import { test } from 'node:test'
import assert from 'node:assert/strict'
import { parseGoal, goalTitle, goalProgress } from '../dist/js/goals.js'

test('goals parse and reject', () => {
  assert.deepEqual(parseGoal('km:5'), { kind: 'km', target: 5 })
  assert.deepEqual(parseGoal('BLOCKS:2'), { kind: 'blocks', target: 2 })
  assert.deepEqual(parseGoal('run:30'), { kind: 'run', target: 30 })
  assert.equal(parseGoal('km:0'), null)
  assert.equal(parseGoal('laps:3'), null)
  assert.equal(parseGoal(''), null)
})

test('titles and progress', () => {
  const stats = { km: 2.345, blocks: 1, runSec: 1500 }
  assert.equal(goalTitle(parseGoal('km:5')), 'GOAL 5 KM')
  assert.equal(goalTitle(parseGoal('blocks:1')), 'GOAL 1 BLOCK')
  assert.equal(goalTitle(parseGoal('run:30')), 'GOAL 30 MIN')
  const km = goalProgress(parseGoal('km:5'), stats)
  assert.equal(km.text, '2.35 / 5 KM')
  assert.ok(Math.abs(km.frac - 0.469) < 0.001)
  assert.equal(km.done, false)
  const b = goalProgress(parseGoal('blocks:1'), stats)
  assert.equal(b.text, '1 / 1')
  assert.equal(b.done, true)
  assert.equal(b.frac, 1)
  assert.equal(goalProgress(parseGoal('run:30'), stats).text, '25 / 30 MIN')
})
