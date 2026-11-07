# Squeek Stream Kit: design

Date: 2026-11-08. Status: approved in chat, pending written-spec review.

## Goal

A free kit that lets any streamer put Squeektoshi, the hamster whose wheel powers Squeekchain, on their own stream:
browser-source overlays for OBS and Streamlabs, a setup page that builds the overlay links, and a second-screen page for
viewers on a phone. Built for the Squeekchain Genesis Code Lane, category "Stream companions and overlays", which has
no project on the board yet.

The kit stands alone. It has no link, code dependency, branding or readout tied to any other project of ours.

## Constraints

- Static site only: HTML, CSS and plain JavaScript modules in `dist/`, no build step, no framework, no server, no API
  key, no wallet, no analytics, no cookies. Fonts bundled (IBM Plex Mono, Barlow Condensed, SIL OFL).
- Data comes only from Squeekchain's public API, `https://api.squeekchain.com/v1` (CORS open, no key). Nothing is
  written anywhere.
- Must run inside an OBS / Streamlabs browser source (Chromium) with a transparent background, and in a phone browser.
- Delivered through IMD: public GitHub repository `am3en0x/squeek-stream-kit` (created by the owner), then IMD
  "Website" from GitHub (0.5 IMD from the Genesis-verified wallet). IMD's import detects `dist/` as the static export.
  A GitHub Pages mirror from `dist/` as well.
- English UI. Code comments in English.

## Data sources

| Endpoint | Used for | Poll |
| --- | --- | --- |
| `GET /v1/status` | `measurement.freshness` (`online` or not), `rpmMilli`, `speedMmPerSecond`, `distanceMm` (the device's distance for the current UTC day), `coreStatus` (`IDLE`, `ACTIVE`, `COUNTER_FAULT`); `builder.anchor.blockHeight`, `blockProgress` (0 to 1e9), `settledThroughRound` | 5 s |
| `GET /v1/events?category=all&limit=40` | the activity feed, newest first: `system.settlement_completed` (`completedBlockCount`, `blockHeight`, `workAdded`, `settledThroughRound`), `measurement.distance_milestone`, `measurement.daily_distance_milestone`, `measurement.speed_milestone`, `measurement.speed_record`, `measurement.distance_streak`, `nft.merged`, account events | 15 s |
| `GET /v1/core` | `configuration.genesisTimestamp` and `roundDuration` (600 s), once at start | once |

Rate limits are 30 req/s (status, core) and 5 req/s (events) per IP; each streamer and each viewer is their own IP.
On 429 the client waits `Retry-After`. A body with `"status": "unavailable"` means unknown, never zero.

## Pages

All overlay pages have a transparent background and size themselves to the browser source.

1. **`board.html`**: the LED dot-matrix board on a black plate.
   - Rows: his state (`SQUEEKTOSHI IS RUNNING`, `IS NAPPING`, `IS OFF AIR`), `TODAY` distance in km (from
     `distanceMm`), speed in km/h, Squeek block height with a progress bar of dots.
   - `layout=full` (default, about 16:9) or `layout=strip` (one line: state, today, speed, block), for a corner or a
     lower third.
   - A dot wheel turns at the real RPM while he runs, stands still while he naps.
2. **`alerts.html`**: empty until something happens, then one alert at a time slides in as an LED card with a short
   chiptune sound made with Web Audio (no audio files), holds, and slides out.
3. **`ticker.html`**: a lower-third bar: the round clock (`ROUND 569 · 04:12 LEFT`) and a scrolling line of the latest
   feed items (blocks, milestones, records, merges, claims, stakes) with relative times.
4. **`live.html`**: the second screen for viewers on a phone: the board, the round clock, the feed and a link to
   Squeekchain's official livestream.
5. **`index.html`**: the setup page: what the kit is, a live preview of each overlay, a form for the options below,
   the ready-to-paste URL with the recommended source size and a copy button, a "fire test alert" button, and OBS /
   Streamlabs instructions (browser source, size, "Control audio via OBS", "Shutdown source when not visible" off).

## Alerts

| Alert | Trigger | Default |
| --- | --- | --- |
| Wake up | the wheel moves (`freshness` online and `rpmMilli > 0`) on two polls in a row after at least 3 minutes still | on |
| Nap | the wheel has been still for 3 minutes after running | on |
| Zoomies | speed at or above the zoomies threshold (default 6 km/h) on two polls in a row; not again until it has dropped below 80% of the threshold for 2 minutes | on |
| Block found | `system.settlement_completed` with `completedBlockCount > 0` (one alert per settlement, naming the newest block) | on |
| Top speed | `measurement.speed_record` | on |
| Distance | `measurement.distance_milestone` and `measurement.daily_distance_milestone` | on |
| Streak | `measurement.distance_streak` | on |
| Merge | `nft.merged` | off |

- On page load the current feed is marked as seen: no alert storm after an OBS reload. Feed items are deduplicated by
  `id`.
- The status machine starts from the first reading without firing; transitions only alert once the page has seen the
  previous state.
- Queue: one alert at a time, `dur` seconds each (default 6), 1 s gap, at most 5 waiting (oldest dropped).
- While the API is unreachable or stale (`freshness` not online for 2 minutes), the board shows OFF AIR with the last
  values and no wheel alerts fire.

## Options (URL parameters, shared by all pages)

| Parameter | Values | Default |
| --- | --- | --- |
| `theme` | `amber`, `green`, `ice`, `white` (LED color) | `amber` |
| `layout` | `full`, `strip` (board only) | `full` |
| `alerts` | comma list of `wake,nap,zoomies,block,record,distance,streak,merge` | all but `merge` |
| `zoomies` | km/h threshold, 1 to 20 | `6` |
| `sound` | `0` or `1` | `1` |
| `vol` | 0 to 100 | `60` |
| `dur` | alert seconds, 3 to 15 | `6` |
| `demo` | `1` fires a sample alert every 8 s and feeds sample data, for positioning in OBS | off |

Unknown or out-of-range values fall back to the default.

## Code structure

Pure logic is separate from the DOM so it can be tested in Node:

- `dist/js/params.js`: parse and clamp URL options.
- `dist/js/api.js`: fetch with timeout, `Retry-After`, ETag reuse, and "unavailable" handling; returns plain objects.
- `dist/js/wheel.js`: the status machine (running, napping, off air, zoomies with hysteresis) from successive status
  readings and timestamps; emits wake / nap / zoomies.
- `dist/js/feed.js`: seen-id tracking, mapping feed items to alerts and ticker lines, number and time formatting.
- `dist/js/rounds.js`: current round and seconds left from genesis and round duration.
- `dist/js/led.js`: the dot-matrix renderer (5x7 font, scaled rows, dot wheel, progress bar) on a canvas.
- `dist/js/sound.js`: Web Audio chiptunes per alert kind, with volume.
- `dist/js/board.js`, `alerts.js`, `ticker.js`, `live.js`, `setup.js`: page glue.
- `dist/css/kit.css`: tokens and components; `DESIGN.md` documents them.

## Look

The board is a black plate of round LED dots, the visual language of Squeekchain's own stream board, with our own
words and layout (no Squeekchain logo or wordmark). The setup and live pages are black, flat, IBM Plex Mono for text,
Barlow Condensed for headings, one accent color that follows `theme`.

## Error handling

- Network errors and 5xx: keep the last good values, retry with backoff (5 s, 10 s, 20 s, capped at 60 s).
- 429: wait `Retry-After`.
- `status: unavailable` or `freshness` not online: OFF AIR after 2 minutes, values kept, no wheel alerts.
- Unknown event types are ignored by alerts and shown in the ticker only if they have a known formatter.

## Testing

- `node --test`: params (defaults, clamping, lists), wheel machine (wake after nap, nap after 3 min, zoomies with
  hysteresis, no alert on first reading, off air), feed (seen ids, first load silent, each event type's alert and
  ticker text, unknown types), rounds (boundaries, countdown), formatting. Fixtures are recorded API responses in
  `test/fixtures/`.
- Browser check with Playwright against fixtures served by a stub API: every page at 1920x1080 over a sample frame and
  `live.html` at 390 px; alerts fire from a scripted status sequence; no console errors; screenshots in `docs/`.
- Live check against the real API before submitting.

## Out of scope

Chat integrations (Twitch, YouTube, Kick), accounts, a server or websocket relay, wallets and transactions, any
on-chain contract, translations.
