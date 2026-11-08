# Publishing Squeek Stream Kit through IMD

The site in `dist/` is static and talks only to Squeekchain's public API (and, when a streamer asks for it, to Twitch
chat read-only). IMD hosts it as is.

On explorer.imd.fun/launch: **Website**, then start from GitHub with `https://github.com/am3en0x/squeek-stream-kit`.
IMD finds `dist/index.html` itself. 0.5 IMD from the Genesis-verified wallet. After hosting, the Code Lane form takes
the **Direct submission** tab (the IMD job hosts, it does not build), with the repository, the live URL and the text
below.

## Display name

Squeek Stream Kit

## One line

Overlays and a viewer game for Squeekchain streams: Squeektoshi's wheel on an LED board, alerts, a round ticker, goals,
scenes, and Round Call, where your chat calls what the hamster does next round and the real wheel settles it.

## Description

Squeek Stream Kit puts Squeektoshi on any stream. Browser sources for OBS and Streamlabs, free, no account, no key:
an LED dot-matrix board of his wheel that turns at his real RPM, alerts when he wakes up, gets the zoomies, sets a
record or a Squeek block is found, a lower-third ticker with the round clock and the latest Squeekchain events, a
stream goal bar (distance, blocks or minutes running), a cam frame whose rim runs at his pace, and starting/BRB/ending
scenes with the live wheel.

Round Call is the game: every Squeekchain round is 10 minutes, and during one round viewers call what Squeektoshi does
in the next (nap, jog or zoomies). The kit's own readings of that round settle it: points, streaks, and on Twitch a
read-only chat link where !nap, !jog and !zoomies are tallied on the overlay with the result and the stream's top
callers. Viewers without Twitch play on the second-screen page or the watch page, which plays Squeekchain's own
livestream with the overlays on top.

Everything reads the public API (/status every 5 s, /events every 15 s, /core once) in the viewer's own browser.
Static site, MIT, 58 tests. Not affiliated with Squeekchain or Twitch.

## Category

Stream companions and overlays.

## Links

- Live: the IMD site URL and https://am3en0x.github.io/squeek-stream-kit/
- Source: https://github.com/am3en0x/squeek-stream-kit
- Headline image: `docs/card-headline.png` (to be drawn on the board's 64 x 36 dot grid)
