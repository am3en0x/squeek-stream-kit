# Validation: LED font for the ticker (2026-11-10)

## 1. Scope and assumptions

- Request: add `font=led` to `ticker.html` (the board's dot-matrix glyphs from `dist/js/led.js` instead of the
  regular font; unchanged without it), an "LED font" checkbox by the ticker on `index.html` that puts `font=led` on the
  ticker link and its preview, tests in `test/`, and a README overlay-table line. Pages, URL parameters, design and
  data sources stay as they were (`api.squeekchain.com/v1`, read-only Twitch chat).
- Stack kept: plain ES modules, no bundler. `dist/` is both source and the static export, with relative URLs
  throughout. `package.json` has no dependencies, so there is no lockfile, and the build configuration is unchanged.
- Choices made:
  - The checkbox sits inside the Ticker card on the setup page, next to that card's link and preview. Only the ticker
    link carries `font`.
  - LED items use the round clock's dot pitch and its 18-row height, so the clock and the scrolling items read as one
    sign.
  - `ledSafe()` maps API text to glyphs the font has.
  - One glyph was added: a small `x`, for `0x` addresses.
- Also changed, against the acceptance criteria:
  - `og:title`, `og:description`, `og:image` (`dist/og.png`, copied from `docs/card-headline.png`) and
    `twitter:card` added to `index.html`.
  - Under 640 px the hero shows the stream preview and the main button before the explainer.
- Not touched: every other page. The hero copy and the site's type system are left as they are, because the brief
  says to keep the design.

## 2. Coverage (Better Interface, six domains)

| Domain | Status | Evidence |
| --- | --- | --- |
| Accessibility | Checked | The new checkbox is a native `<input type="checkbox">` inside its `<label>`, with the accessible name "LED font" (found by Playwright `getByRole('checkbox', { name: 'LED font' })`). It toggles with Space after focus, and the existing `.chip input:focus-visible + span` ring covers it. LED canvases have `role="img"` and an `aria-label` with the words (`dist/js/ticker.js:64`). Reduced motion still stops the marquee (`kit.css:51`). Not verified: screen-reader session, forced-colors mode, native 200% zoom. |
| Layout | Checked | Chromium at 320, 390 and 1440: no horizontal scroll. The phone hero reorders under 640 px (`kit.css:152`); the Ticker card's chip row wraps (390 screenshot). Not verified: RTL (the site is English only, so not applicable), WebKit. |
| Writing | Checked (source) | The checkbox label is the requested "LED font". The note beside it, "The events in the board's dot letters.", describes the ON state, matching the other chips' voice. The README overlay and options tables each have a new row. |
| Typography | Checked | No new sizes or faces: the chip uses the existing 12 px chip text and the note uses the 13 px `.fine` style. LED glyphs come from `led.js`. The probe's type-size, casing and tracking failures all predate this job (see findings). |
| Colors | Checked | LED times use the theme accent and lines the existing cream `#f3e9cc`; unlit dots are `#16161b`, all existing tokens. The probe's contrast check passed at 320, 390 and 1440. LED dot contrast on the canvas is not measured by the probe; it uses the board's own pairs. |
| UI | Checked | The chip's checked, unchecked and focus states come from the existing component. The preview iframe reloads on toggle. No `transition: all`; the marquee animation is unchanged. Not verified: motion at 10% speed in DevTools. |

## 3. Findings and fixes

| # | Severity | Where | Finding | Fix and recheck |
| --- | --- | --- | --- | --- |
| 1 | High (bug, my own) | `dist/js/setup.js:53` | With the checkbox added, `el.querySelector('input')` picked the checkbox, so the Ticker link field stayed empty and Copy copied nothing. The browser check measured `Ticker link = ''`. | Selector changed to `.url input`. Recheck: the link reads `ticker.html?font=led` when the box is ticked. |
| 2 | High (criterion) | `dist/css/kit.css:144-157`, `dist/index.html:36-52` | At 390 the stream preview started at about y 800, below the first screen (probe screenshot). | Phone-only reorder: label, headline, preview, buttons, explainer. Recheck at 390: preview bottom 441 px, button bottom 505 px, both under 844. At 320: 421 px and 485 px. Desktop unchanged. |
| 3 | Medium (share card) | `dist/index.html:8-15` | `og:title` and `og:image` were missing. | Added, with `dist/og.png` at 1280 × 720. Probe `share`: PASS. |
| 4 | Low (types) | `dist/js/params.js:26` | `DEFAULTS.font` was inferred as the literal `'regular'`. | JSDoc type `'regular' \| 'led'`. |
| 5 | Kept by the brief | `dist/css/kit.css:58,64,74,102`, `dist/index.html:38` | Probe `casing`, `tracking`, `eyebrows`: the site's system sets uppercase Barlow headings and 0.08 to 0.12em tracked uppercase labels, buttons and chips, including the kicker "Squeekchain Genesis · stream companion" over the h1. | Not changed. The brief says: "Keep every page, URL parameter, the design and the data sources as they are". |
| 6 | Kept by the brief | `dist/css/kit.css` (sizes 11/12/13/14/16/22/26/32-40/44-72 px) | Probe `type-sizes`: 7 sizes in use (bar 6). `type-faces`: monospace prose. | Not changed; the same brief quote. The new chip and note add no size. |
| 7 | Kept by the brief | `dist/index.html:40` | Probe `copy-budget`: 67 words of prose on the first screen (bar 60 at 390). | Not changed; the hero copy is part of the kept design. |
| 8 | Kept by the brief | `dist/js/setup.js:47-50` | Probe `chrome`: cards inside cards, because each `.out` card holds a `.stage` preview frame. | Not changed. The preview frame is how the setup page shows "what OBS shows". |

## 4. Verification (commands actually run)

- `npm test`: 63 tests, 63 pass, 0 fail. The new file `test/ticker.test.js` has 5 tests, and `test/params.test.js`
  defaults now include `font`.
- `npx -p typescript@5 tsc -p test/scratch/tsconfig.json` (allowJs, checkJs, noEmit; TypeScript 5.9.3) over `led.js`,
  `tickerled.js`, `ticker.js`, `params.js` and `setup.js`:
  - exit 2 with 45 errors, all in `setup.js`;
  - 0 errors in the changed and new modules;
  - the previous commit's same files give the same 45 errors (untyped `getElementById` and `querySelector` results).
- Headless Chromium via Playwright, with a script that serves `dist/` under `/preview/` inside one foreground run:
  21 checks, 21 PASS.
  - Regular ticker: same DOM as the previous commit, and a byte-identical screenshot of the scrolling lane (14480
    bytes) at 1920 × 72 with reduced motion. The full-width comparison (24741 bytes) passed in 3 of 4 runs and failed
    once, when the round clock ticked a second between the two loads. So the final comparison leaves out the clock,
    whose code did not change.
  - `font=led`: 16 canvas items, 54 px tall against a 54 px clock, 3981 lit accent or cream pixels in the first item.
    After a resize to 1280 × 48, items are 35 px against a 35 px clock. No console errors or failed loads.
  - Setup page: the default link has no `font`. Ticking the box gives `ticker.html?font=led` and a
    `ticker.html?font=led&demo=1` preview; no other link changes. Combined with a theme it gives
    `?theme=ice&font=led`. Unticking removes it, and `index.html?font=led` pre-ticks the box.
  - No horizontal scroll at 320, 390 and 1440. No console errors.
- Screenshots viewed (in `test/scratch/`, not submitted): the LED ticker, the 390 first screen, and the Ticker card
  at 390.
- Design probe:
  `node .imd/reads/skills/design-critic/scripts/taste.mjs --out test/scratch/taste`, with the machine's Playwright
  install.
  - PASS: render, layout, targets, contrast, glyphs, slogans, repetition, motion, share.
  - FAIL: casing, tracking, eyebrows, type-sizes, type-faces, copy-budget, chrome. These are findings 5 to 8, all from
    the existing design system, which the brief keeps.

## 5. Completion

Complete for the stated scope, with these limitations:
- WebKit/Safari would not launch on this machine (missing system libraries such as libgtk-4), so there is no Safari
  check.
- The overlays were not loaded in OBS or Streamlabs.
- No screen-reader, forced-colors or native-zoom checks.
- The LED dot colors on the canvas were not contrast-measured.
