import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { createFeed, alertFor, wheelAlert, lineFor, agoText, kmhText, wholeKm, sqkText, short } from '../dist/js/feed.js'

const { events } = JSON.parse(readFileSync(new URL('./fixtures/events.json', import.meta.url)))
const byId = (id) => events.find((e) => e.id === id)

test('the first page is only remembered; later pages return the new items, oldest first', () => {
  const feed = createFeed()
  assert.deepEqual(feed.ingest(events.slice(2)), [])
  const fresh = feed.ingest(events)
  assert.deepEqual(fresh.map((e) => e.id), ['e8', 'e9'])
  assert.deepEqual(feed.ingest(events), [])
})

test('malformed items are skipped', () => {
  const feed = createFeed()
  feed.ingest([])
  assert.deepEqual(feed.ingest([null, { type: 'x' }, { id: 5 }]), [])
})

test('alerts for each event that has one', () => {
  assert.deepEqual(alertFor(byId('e9')), { kind: 'block', title: '2 BLOCKS FOUND', detail: 'SQUEEK BLOCK #2,001' })
  assert.equal(alertFor(byId('e8')), null)
  assert.deepEqual(alertFor(byId('e3')), { kind: 'record', title: 'NEW TOP SPEED', detail: '5.2 KM/H' })
  assert.deepEqual(alertFor(byId('e2')), { kind: 'distance', title: '15 KM', detail: 'ON THE WHEEL, ALL TIME' })
  assert.deepEqual(alertFor(byId('e0')), { kind: 'distance', title: '5 KM IN A DAY', detail: 'NEW DAILY MILESTONE' })
  assert.deepEqual(alertFor(byId('e1')), { kind: 'streak', title: '2-DAY STREAK', detail: '5+ KM EVERY DAY' })
  assert.deepEqual(alertFor(byId('e6')), { kind: 'merge', title: 'SQUEEK MERGE', detail: '#4702 IS LEVEL 2' })
  assert.equal(alertFor(byId('e7')), null)
  assert.equal(alertFor({ id: 'x', type: 'something.new', payload: {} }), null)
})

test('one block found reads in the singular', () => {
  const e = { id: 'b', type: 'system.settlement_completed', payload: { completedBlockCount: '1', lastCompletedBlock: '2000' } }
  assert.equal(alertFor(e).title, 'BLOCK FOUND')
})

test('wheel alerts', () => {
  assert.deepEqual(wheelAlert('wake'), { kind: 'wake', title: 'SQUEEKTOSHI IS UP', detail: 'THE WHEEL IS TURNING' })
  assert.deepEqual(wheelAlert('nap'), { kind: 'nap', title: 'NAP TIME', detail: 'THE WHEEL STOPPED' })
  assert.deepEqual(wheelAlert('zoomies', { speedKmh: 4.96 }), { kind: 'zoomies', title: 'ZOOMIES!', detail: '5.0 KM/H' })
})

test('ticker lines', () => {
  assert.equal(lineFor(byId('e9')), '2 BLOCKS FOUND: SQUEEK BLOCK #2,001')
  assert.equal(lineFor(byId('e8')), null)
  assert.equal(lineFor(byId('e7')), '0x61d6…3e13 staked 4,301 SQK')
  assert.equal(lineFor(byId('e4')), '0xe310…87ae claimed 977.5 SQK')
  assert.equal(lineFor(byId('e5')), null)
  const settled = { id: 's', type: 'system.settlement_completed', payload: { settledThroughRound: '570', workAdded: '1234', completedBlockCount: '0' } }
  assert.equal(lineFor(settled), 'ROUND 570 SETTLED: 1,234 WHEEL TURNS')
  const speed = { id: 'm', type: 'measurement.speed_milestone', payload: { thresholdSpeedMmPerSecond: '833' } }
  assert.equal(lineFor(speed), 'HIT 3.0 KM/H')
})

test('formatting', () => {
  assert.equal(kmhText(1439), '5.2')
  assert.equal(wholeKm('15000000'), '15')
  assert.equal(sqkText('977532311092136159750'), '977.5')
  assert.equal(sqkText('4301142000000000000000'), '4,301')
  assert.equal(short('0x61d608d04985759a9aa282e9733a1a126a073e13'), '0x61d6…3e13')
  const now = Date.parse('2026-11-07T18:31:00.000Z')
  assert.equal(agoText('2026-11-07T18:30:36.000Z', now), 'now')
  assert.equal(agoText('2026-11-07T18:20:36.000Z', now), '10 min ago')
  assert.equal(agoText('2026-11-07T15:31:00.000Z', now), '3 h ago')
  assert.equal(agoText('2026-11-05T18:31:00.000Z', now), '2 d ago')
})
