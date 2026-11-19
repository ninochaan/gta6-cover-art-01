# Neon Coast Cover Studio

[![Competition](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/ninochaan/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/ninochaan/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

[View the bounty on make.fun](https://make.fun/bounty/gta6-cover-art-01)

Neon Coast Cover Studio is an offline, GTA 6-style cover art maker that runs entirely in your browser. Turn your own photos into a poster-style game cover: arrange them in multi-panel layouts, wash them in sunset and neon colour grades, add big caption lettering, and export a finished PNG. Nothing is uploaded — your photos never leave your machine.

## How to use it

1. Open `app/index.html` in desktop Chrome, or run `node serve.ts` and open http://localhost:8080.
2. Upload your own photos, or try the included Boulevard and Pier samples.
3. Pick a layout and a sunset/neon grade.
4. Edit the caption — title, script subtitle, badge ribbon, and heat rating.
5. Crop each panel (zoom and focus), then export your cover as a PNG.

## Features

- **Six layouts** — Four-Panel Grid, Hero + Three, Full Bleed, Tilted Snapshots, Nine-Panel Cover, and Duo Split.
- **Six colour grades** — Sunset, Neon Vice, Dusk Purple, Teal Night, Golden Hour, and Noir Pink, applied as gradient maps over each photo.
- **Caption lettering** — a big gradient-filled display title, a neon script subtitle, a badge ribbon, and a star heat meter.
- **Per-panel cropping** — choose which photo goes in each panel and adjust zoom and focus per panel.
- **Poster effects** — film grain, halftone dots, vignette, ink bands, and white panel borders, all drawn on canvas.
- **Undo / redo** — every edit is kept in a history stack, so you can step back and forward freely.
- **PNG export** — Square 1080×1080, Portrait 1080×1350, Wide 1920×1080, and Story 1080×1920, one at a time or all sizes in a single click.
- **Fully offline** — no build step, no network calls, and the display fonts ship in `app/fonts`.

## Notes

This is a fan-made cover art tool, built for the make.fun bounty above. It is not affiliated with or endorsed by Rockstar Games, and it uses no Rockstar logos, artwork, or fonts.
