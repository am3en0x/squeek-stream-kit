# Squeek Stream Kit: design system

Taken from the source: `dist/css/kit.css`, `dist/js/led.js`, `dist/js/boardview.js` and the pages in `dist/`.

## Overview

Two surfaces. The overlays are what a streamer's audience sees: transparent pages with a black plate of round LED
dots, readable at a glance over any game or camera. The setup page and the second screen are what the streamer and
viewers use: black, flat, monospace, one accent color that follows the LED theme. The LED board is the shared visual
language of Squeekchain's own stream board, with our own words and layout; the kit uses no Squeekchain logo or
wordmark.

## Colors

CSS tokens in `:root` of `dist/css/kit.css`:

| Token | Value | Use |
| --- | --- | --- |
| `--page` | `#000` | site pages |
| `--plate` | `#050507` | the black plate behind every LED canvas |
| `--line` / `--line-strong` | `#1d1d23` / `#2d2d36` | rules, card and button borders |
| `--ink` / `--text` / `--muted` | `#f3f3f6` / `#cfcfd8` / `#8d8d9b` | headings, body, labels |
| `--accent` | theme color | the one strong color: primary button, chips, ticker times, the line on top of the ticker |
| `--on-accent` | `#120d05` | text on the accent button |

Themes (`theme=`): amber `#f6a63b`, green `#7fe08a`, ice `#7fdcff`, white `#f3e9cc`. The same value colors the LED
accent dots and `--accent` on the site pages.

LED dot colors (`dist/js/boardview.js`, `led.js`): unlit `#16161b`, dim `#34343e`, label `#6b6b78`, cream `#f3e9cc`
for values and the running state, wheel rim `#8a8a96`; the accent for the name, the hub, the progress bar and the
zoomies state.

## Typography

- LED: a 5×7 dot font in `led.js` (A to Z, 0 to 9, `. , : - + / ! ? # %`), scaled by whole dots. Every string an
  overlay prints is checked against it in `test/led.test.js`.
- Site: IBM Plex Mono 400/500 for text, labels and buttons; Barlow Condensed 700 uppercase for headings and the brand.
  Labels are 12 px uppercase with 0.12em tracking; body 16 px; h1 72 px (54 px under 960 px, 44 px under 640 px).

## Layout

- Overlays: each page fills its browser source. The LED grid has a fixed size in dots (board 110 × 66, strip 178 × 20,
  alert 200 × 30, ticker clock 56 × 18) and `Led.paint()` fits it into the plate's content box, keeping dots round and
  centring the grid.
- Site: content at most 1180 px wide with a 24 px gutter (16 px on phones). The setup section is a sticky options
  column next to the outputs; one column under 960 px. Previews are the real overlay pages in iframes at their source
  size, scaled into a fake stream frame (`.stage`), so what you see is what OBS shows.
- Checked at 1440 px and 390 px without horizontal scroll.

## Components

- **LED plate** `.plate`: black, 14 px radius, the canvas inside.
- **Alert card**: slides up from below, holds `dur` seconds, slides away; reduced motion fades instead.
- **Ticker**: an accent line on top, the round clock on the left, a seamless marquee of event lines (times in accent).
- **Buttons** `.btn`: outlined; `.solid` in the accent for the one main action; `.small` for copy and test.
- **Chips** `.chip`: checkbox or radio styled as an outlined pill; checked takes the accent border.
- **Ranges** with a live value on the right; **link field** read-only with Copy (and Test alert for the alerts card).
- **Stage** `.stage`: a dark gradient "stream frame" behind previews so transparency reads as an overlay.

## Do's and Don'ts

- Do keep overlays transparent outside the plate, and keep every LED string inside the font.
- Do size new LED layouts in dots and let `Led.paint()` fit them; never size a canvas in CSS pixels.
- Do keep one accent; values in cream, labels in grey, missing values dim.
- Don't add text an overlay prints without adding its glyphs and a test.
- Don't add a light theme to overlays; streams need the black plate for contrast.
