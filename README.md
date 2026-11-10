# Squeek Stream Kit

Free OBS and Streamlabs overlays and a viewer game for Squeekchain streams. Squeektoshi, the hamster whose wheel powers
[Squeekchain](https://squeekchain.com), on your stream: an LED board of his wheel, alerts when he wakes up, gets the
zoomies or a block is found, a round ticker, a stream goal bar, a cam frame, starting/BRB/ending scenes, and **Round
Call**: your viewers (and your Twitch chat) call what he does in the next 10-minute round, and the real wheel settles it.

Built for the [Squeekchain Genesis Code Lane](https://squeekchain.com/genesis/code), category "Stream companions and
overlays". Static site, no server, no account, no API key, no wallet. Not affiliated with Squeekchain or Twitch.

![the overlays over a stream](docs/screens/setup.png)

## Overlays

Open the setup page (`index.html`), pick the options, copy a link, and add it in OBS as a Browser source (Streamlabs:
Browser Source) at the size shown. Every overlay page is transparent except the scenes, which are whole screens.

| Overlay | Page | Source size | What it shows |
| --- | --- | --- | --- |
| LED board | `board.html` | 880 × 528 | his state, today's distance, speed, the Squeek block and its progress, a wheel that turns at his real RPM |
| LED strip | `board.html?layout=strip` | 890 × 100 | the same in two lines, for the top or bottom of the scene |
| Alerts | `alerts.html` | 1000 × 150 | one alert card at a time, with a pictogram and a short chiptune, then nothing |
| Ticker | `ticker.html` | 1920 × 72 | the round clock and the latest Squeekchain events, scrolling |
| Ticker, LED font | `ticker.html?font=led` | 1920 × 72 | the same ticker with the events drawn in the board's dot-matrix letters, at the clock's dot size |
| Round Call | `call.html` | 1056 × 300 | the round to call, the chat's tally, the result, the top callers |
| Stream goal | `goal.html` | 1000 × 160 | a bar towards `km:5`, `blocks:2` or `run:30` minutes; a tune when reached |
| Cam frame | `frame.html` | `size`, 640 × 360 by default | LED dots around your camera, a runner chasing round at his pace, a name plate with his state |
| Scenes | `scene.html?mode=starting`, `brb`, `ending` | 1920 × 1080 | the title in big dots, the live wheel, the round clock, a countdown or the session so far |

For sounds tick "Control audio via OBS" and untick "Shutdown source when not visible".

![Round Call](docs/screens/call.png)

### Round Call

Squeekchain settles the wheel in rounds of 600 seconds. During round N everyone calls what Squeektoshi does in round
N+1; the kit's own readings of round N+1 settle it when it ends:

| Call | It is right when | Points |
| --- | --- | --- |
| Nap | no online reading saw the wheel turn | 1 |
| Jog | the wheel turned, but no zoomies | 1 |
| Zoomies | two readings in a row at or over the threshold (4.5 km/h by default) | 3 |

A round with no online reading is void and scores nothing. Viewers play on the [second screen](#second-screen) and
the [watch page](#watch-page): three buttons, the time until calls close, streak, best and points, kept in their
browser. Streamers put `call.html` on the scene; with `?chat=yourchannel` it joins your Twitch chat read-only (an
anonymous connection, no login, nothing is ever posted) and viewers call with `!nap`, `!jog` or `!zoomies` (also
`!sleep`, `!run`, `!zoom`, `!call zoomies`); the overlay shows the tally, then `ROUND 569 WAS A JOG · CHAT 61% RIGHT`
and the top three callers of the stream. `!squeek` is a cheer: the overlay flashes. YouTube and X have no open chat,
so there the viewers use the panel pages.

### Alerts

| Alert | When | Default |
| --- | --- | --- |
| Wake up | the wheel turns again on two readings in a row after at least three minutes still | on |
| Nap | three minutes without a turn after he was running | on |
| Zoomies | at or above the threshold (4.5 km/h by default: he usually runs about 4 km/h, his record is 5.2) on two readings in a row; again only after two minutes under 80% of it | on |
| Block found | a SqueekCore settlement completes Squeek blocks | on |
| Top speed | Squeekchain records a new top speed | on |
| Distance | lifetime and daily distance milestones | on |
| Streak | days in a row over 5 km | on |
| Merge | someone merges two Squeeks | off |
| Goal reached | the stream goal bar fills (on `goal.html` itself) | with a goal |

Reloading a source never replays old events. If the API is down, the board keeps the last values and shows OFF AIR
after two minutes, no wheel alerts fire, and Round Call rounds are void.

### Options (URL parameters)

| Parameter | Values | Default | Pages |
| --- | --- | --- | --- |
| `theme` | `amber`, `green`, `ice`, `white` | `amber` | all |
| `layout` | `full`, `strip` | `full` | board |
| `alerts` | comma list of `wake,nap,zoomies,block,record,distance,streak,merge`, or `none` | all but `merge` | alerts |
| `zoomies` | km/h, 1 to 10 | `4.5` | all |
| `sound` | `0` or `1` | `1` | alerts, call, goal |
| `vol` | 0 to 100 | `60` | alerts, call, goal |
| `dur` | alert seconds, 3 to 15 | `6` | alerts |
| `chat` | a Twitch channel | none | call |
| `goal` | `km:N`, `blocks:N`, `run:N` (minutes) | `km:5` | goal |
| `since` | `HH:MM` UTC or an ISO time: when the stream started | when the source loads | goal, scenes |
| `size` | `WxH` of the cam frame | `640x360` | frame |
| `name` | up to 24 characters on the cam frame plate | none | frame |
| `mode` | `starting`, `brb`, `ending` | `starting` | scene |
| `at` | `HH:MM` UTC: a countdown on the starting scene | none | scene |
| `font` | `regular`, `led`: the ticker's events in the board's dot-matrix font | `regular` | ticker |
| `demo` | `1`: sample data, 90-second rounds and a chat that calls, for placing sources while he sleeps | off | all |

## Second screen

`live.html` is for viewers on a phone: the board, the round clock, Round Call and the latest events.

![the second screen on a phone](docs/screens/live-phone.png)

## Watch page

`watch.html` puts the overlays on Squeekchain's own livestream for anyone, no OBS needed: the stream plays in a 16:9
screen with the LED board and the alerts on top (they let clicks through to the player), the ticker under it, and
Round Call under that. Pass the stream as `?youtube=VIDEO_ID`, `?twitch=CHANNEL` or `?x=BROADCAST_ID`, or paste the
live link on the page; the address then carries it, so the page can be shared as is. YouTube and Twitch use their
standard embeds, X uses `studio.x.com/embed/broadcast/…`, the same three kinds Squeekchain's site uses. The alert
sound starts off and turns on with a click (browsers need one).

## Data

Everything comes from Squeekchain's public API, `https://api.squeekchain.com/v1`, read in the viewer's or streamer's
own browser:

- `GET /status` every 5 s: whether the device is online, RPM, speed, today's distance, Squeek block height and progress;
- `GET /events?category=all&limit=40` every 15 s: settlements, milestones, records, streaks, merges, claims and stakes;
- `GET /core` once: the genesis time and the 600-second round length for the round clock and Round Call.

A failed request keeps the last values and backs off (5 s doubling to 60 s), or waits for `Retry-After`. A response
that says `"status": "unavailable"` is treated as unknown, never as zero. The only other connection is the optional
read-only Twitch chat socket (`wss://irc-ws.chat.twitch.tv`). Nothing is written anywhere but the viewer's own
localStorage (their Round Call score).

## Run it

There is nothing to install and nothing to build: `dist/` is the site and its source, plain ES modules, CSS and
fonts with relative URLs, so it works from any folder, an IPFS gateway path or an ENS name. The tests need Node 18 or
newer and no packages (`package.json` has no dependencies, so there is no lockfile).

```sh
npm test                              # 63 tests: rules, parsing, the round machine, Round Call, chat, sessions, goals, the LED ticker
python3 -m http.server 8771 -d dist   # preview at http://localhost:8771/ (ES modules need http, not file://)
```

To rebuild, edit the files in `dist/` and run `npm test`; what is in `dist/` is what gets hosted. Layout:
`dist/js/params.js` options; `api.js`, `source.js` the pollers; `wheel.js` the wheel's phases; `feed.js` events to cards
and lines; `calls.js` Round Call; `chat.js` Twitch; `session.js`, `goals.js`; `led.js` the dot-matrix renderer with the
font and pictograms; `tickerled.js` the ticker's LED items; `boardview.js` the board layouts; one `*.js` per page.
Design notes in `docs/superpowers/specs/` and `DESIGN.md`.

### Checks run for the LED ticker (2026-11-10)

- `npm test`: 63 tests, 63 pass. `test/ticker.test.js` covers `font=led` parsing and fallbacks, `toQuery` and the
  round trip, `ledSafe()` on every demo line, and the LED item layout and colors.
- Typecheck: no TypeScript in the project, so `tsc --allowJs --checkJs --noEmit` (TypeScript 5.9.3, via `npx`, nothing
  added to the repository) over `led.js`, `tickerled.js`, `ticker.js`, `params.js` and `setup.js`: no errors in the
  changed and new modules; 45 errors in `setup.js`, the same 45 as the previous commit (untyped DOM lookups).
- Headless Chromium (Playwright) on `dist/`, served under a `/preview/` subpath: the ticker without `font` has the
  same DOM and a byte-identical screenshot of its scrolling lane as the previous commit (reduced motion, 1920 × 72); with `font=led` every
  item is a labelled canvas as tall as the round clock, with lit dots, following a resize; no console errors or failed
  loads. On the setup page the "LED font" box in the Ticker card adds `font=led` to the ticker link and its preview
  only, works from the keyboard, combines with the LED color, comes off again, and is read back from `index.html?font=led`.
  No horizontal scroll at 320, 390 and 1440; at 320 and 390 the overlay preview and "Get your overlay links" are on the
  first screen.
- The design probe (`taste.mjs`) and the Better Interface review are recorded in `artifacts/validation.md`.
- Not done: WebKit (Safari) would not launch on the build machine (missing system libraries), and OBS itself was not
  run; no screen-reader session.

## License

MIT. The fonts in `dist/fonts/` keep the SIL Open Font License 1.1.
