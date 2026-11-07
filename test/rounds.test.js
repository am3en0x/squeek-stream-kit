import { test } from 'node:test'
import assert from 'node:assert/strict'
import { roundAt, clock } from '../dist/js/rounds.js'

const GENESIS = 1793735400

test('round 1 starts at genesis', () => {
  assert.deepEqual(roundAt(GENESIS, GENESIS, 600), { round: 1, left: 600 })
  assert.deepEqual(roundAt(GENESIS + 599, GENESIS, 600), { round: 1, left: 1 })
  assert.deepEqual(roundAt(GENESIS + 600, GENESIS, 600), { round: 2, left: 600 })
})

test('matches the chain: round 568 at block time 1794075636', () => {
  assert.deepEqual(roundAt(1794075636, GENESIS, 600), { round: 568, left: 564 })
})

test('before genesis or without a duration there is no round', () => {
  assert.deepEqual(roundAt(GENESIS - 30, GENESIS, 600), { round: 0, left: 30 })
  assert.equal(roundAt(GENESIS + 10, GENESIS, 0).round, 0)
})

test('clock', () => {
  assert.equal(clock(564), '09:24')
  assert.equal(clock(5), '00:05')
  assert.equal(clock(-3), '00:00')
})
