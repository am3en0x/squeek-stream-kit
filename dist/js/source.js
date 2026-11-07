import { getJson, toReading } from './api.js'
import { DEMO_CORE, demoReading, demoEvents } from './demo.js'

// Feeds a page: on.status(reading) every few seconds, on.events(list) every 15 s, on.core(configuration) once.
// A failed poll hands the page an offline reading (status) or nothing (events) and the next poll backs off from 5 s,
// doubling up to 60 s, or waits as long as Retry-After says.
export function startSource({ demo = false, statusMs = 5000, eventsMs = 15000 } = {}, on = {}) {
  if (demo) {
    if (on.core) on.core(DEMO_CORE)
    if (on.status) { on.status(demoReading()); setInterval(() => on.status(demoReading()), 1000) }
    if (on.events) { on.events(demoEvents()); setInterval(() => on.events(demoEvents()), eventsMs) }
    return
  }
  if (on.core) poll('/core', 0, (r) => {
    if (!r.ok || !r.data || !r.data.configuration) return true
    on.core(r.data.configuration)
    return false
  })
  if (on.status) poll('/status', statusMs, (r) => {
    on.status(r.ok ? toReading(r.data) : { at: Date.now(), online: false })
    return true
  })
  if (on.events) poll('/events?category=all&limit=40', eventsMs, (r) => {
    if (r.ok && r.data && Array.isArray(r.data.events)) on.events(r.data.events)
    return true
  })
}

function poll(path, everyMs, handle) {
  let wait = everyMs || 5000
  const tick = async () => {
    const r = await getJson(path)
    if (!handle(r)) return
    wait = r.retryAfter ? r.retryAfter * 1000 : r.ok ? everyMs : Math.min(Math.max(wait * 2, 5000), 60000)
    setTimeout(tick, wait)
  }
  tick()
}
