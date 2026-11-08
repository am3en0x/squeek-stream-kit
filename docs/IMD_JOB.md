# Publishing Squeek Stream Kit through IMD

The kit is a finished static site in `dist/`. IMD is asked to check it and host it. The wallet that pays for the first
job owns the IMD project, so pay from the wallet verified on your Squeekchain Genesis profile.

## Cost

One job is 0.5 IMD on Ethereum mainnet (`0xd34a99bc0f67ae1bbd63c660e6d0b0dd03e263b7`, on Uniswap, linked from
[imd.fun/token](https://imd.fun/token)). The page pays with x402 and Permit2: two signatures and, the first time, one
approval transaction in ETH.

## On the launch page

[explorer.imd.fun/launch](https://explorer.imd.fun/launch): **Website**, then start from GitHub.

- Repository: `https://github.com/am3en0x/squeek-stream-kit`. IMD's import reads the latest commit on `main` and finds
  the static export in `dist/` with no build step (`site.build: false`, `exportDir: "dist"`).
- Paste the text below as what the site should do.
- IMD runs a content check on the site before it pins it to IPFS and names it.

Text for the page:

```
Host Squeek Stream Kit from this repository as it is: a static site in dist/ with no build step. It is a free kit of
OBS and Streamlabs browser-source overlays for Squeekchain streams: an LED board of Squeektoshi's wheel (state,
today's distance, speed, Squeek block and progress, a wheel turning at his real RPM), alerts for wake-ups, naps,
zoomies, blocks found, top speeds, distance milestones, streaks and merges, a lower-third ticker with the 600-second
round clock and the latest events, a second-screen page for phones, and a setup page that builds the overlay links
with live previews. All data comes from Squeekchain's public API (api.squeekchain.com/v1: status every 5 s, the event
feed every 15 s, core once), read in the browser; there is no server, key, wallet, transaction or analytics.
Checks: npm test (35 unit tests, node --test). Do not change the pages; publish dist/ as is.
```

## If IMD cannot host the site

The same `dist/` is served from GitHub Pages (`gh-pages` branch). Any static host works.
