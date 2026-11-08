# Squeek Stream Kit: companion addendum (2026-11-09)

An addendum to the design of 2026-11-08. The first release was overlays that show the wheel; the board the kit is
submitted to skips "read-only dashboards" and "thin wrappers around public APIs" and asks for "stream companions"
that are "fun, thoughtful and interesting". This addendum adds the parts that make the kit a companion: a game played
on the real rounds, goals for the stream, scenes and a cam frame, and a read-only Twitch chat link. Everything stays
static, keyless and serverless.

## Round Call

Squeekchain rounds are 600 seconds from the genesis timestamp (`/core`). During round N everyone calls what
Squeektoshi does in round N+1; the readings the kit already polls (`/status` every 5 s) settle it when round N+1 ends:

- **zoomies**: two online readings in a row at or over the zoomies threshold (the same rule as the alert);
- **jog**: the wheel turned on any online reading, but no zoomies;
- **nap**: no online reading saw it turn;
- **void**: no online reading at all (API down); nothing is scored.

Points: nap 1, jog 1, zoomies 3. A streak counts rounds called right in a row. Rounds nobody called and nobody
watched are skipped, not reported. Code: `dist/js/calls.js` (pure, tested): `outcomeOf(readings, zoomiesKmh)`,
`createCalls({genesis, duration, zoomiesKmh, score})` with `push(reading)`, `call(kind, nowMs)` for the viewer,
`chatCall(user, kind, nowMs)` for chat (the last call per user counts), `tick(nowMs)` settling ended rounds,
`state(nowMs)`, `leaderboard(n)`, `score`.

Where it is played:

- **Viewers**: `live.html` and `watch.html` carry a panel (`dist/js/callpanel.js`): three buttons, the time until calls
  close, the viewer's call, streak, best and points (localStorage `sk.calls.score`), and the last result for a minute.
- **Streamers**: `call.html`, an overlay (1056 x 300, 176 x 50 dots): the round to call and the time left, the three
  calls with the chat's share and bars, then the last result (`ROUND 569 WAS A JOG  CHAT 61% RIGHT`), the chat hint
  or the top three callers by points. `!squeek` in chat flashes the bottom row.

## Twitch chat, read only

`?chat=channel` on `call.html` opens an anonymous IRC-over-WebSocket connection to Twitch (`justinfan` nick, `JOIN`,
`PING`/`PONG`, reconnect with a 2 to 60 s backoff). Nothing is ever sent to chat and no token exists. Commands:
`!nap` `!sleep`, `!jog` `!run`, `!zoomies` `!zoom`, `!call <kind>`, `!squeek` `!cheer`. YouTube and X have no open
chat, so the panel pages are the viewers' way in there. Code: `dist/js/chat.js` (`parseIrc`, `commandOf`,
`connectTwitch`), tested with a fake socket.

## Session and goals

`dist/js/session.js` keeps what happened since the stream started: distance (today's distance minus the first
reading, surviving the 00:00 UTC rollover), top speed, seconds running, settlements and blocks from events dated after
the start. `since=HH:MM` (UTC) or an ISO time sets the start; empty means when the source loaded.

`goal.html` (1000 x 160, 150 x 24 dots): `goal=km:5`, `goal=blocks:2` or `goal=run:30` (minutes running). Title,
the progress or the start time (alternating every 6 s), a bar with quarter ticks; when reached, `GOAL REACHED!`,
the plate pulses and the record tune plays once.

## Cam frame and scenes

`frame.html` (`size=WxH`, 640 x 360 by default): LED dots around the edge, the middle transparent for the camera; a
bright runner with a tail chases round the rim at the wheel's pace, a dim breathing rim while he naps, nothing lit off
air; a name plate (`name=`) with his state and speed in a corner.

`scene.html?mode=starting|brb|ending` (1920 x 1080, 240 x 135 dots, dark, not transparent): the round clock and
today's distance on top, the title in 3x glyphs, his state, the big wheel turning at his RPM; `starting` shows a
countdown to `at=HH:MM` UTC (hours added once over an hour) or the line THE WHEEL IS LIVE ON SQUEEKCHAIN; `brb` and
`ending` show the session so far.

## Alerts

Every card now carries a 7 x 7 pictogram before the title (sun, zz, bolt, cube, star, flag, flame, rings).

## Options added

`chat`, `goal`, `since`, `size`, `mode`, `at`, `name`; validated in `params.js`, carried by `toQuery()` only when
set. The setup page puts the companion options in their own group and adds each option only to the links that use it.

## Out of scope, still

Accounts, a server or relay (so the chat leaderboard lives for the stream and resets on reload), YouTube or Kick
chat, wallets, contracts, translations.
