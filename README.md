# VICE DESK

[![Competition](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Rank](https://make.fun/badge/gta6-cover-art-01/ninochaan/gta6-cover-art-01/rank.svg)](https://make.fun/bounty/gta6-cover-art-01)
[![Reward](https://make.fun/badge/gta6-cover-art-01/ninochaan/gta6-cover-art-01/reward.svg)](https://make.fun/bounty/gta6-cover-art-01)

[View the bounty on make.fun](https://make.fun/bounty/gta6-cover-art-01)

VICE DESK is an offline GTA 6-style cover art studio that runs entirely in your browser. Drop in your own photos, arrange them across a multi-panel poster layout, push them through a Vice City colour grade, letter the cover with a big condensed title and a script tagline, and export a finished PNG in the sizes posts actually use. Nothing is uploaded — your photos are read on your own machine and never leave it.

## Run it

```sh
node serve.ts
```

Then open http://localhost:8080 in desktop Chrome. (Opening `app/index.html` directly also works in a browser that allows local module scripts; the server is the surest route.) There is no build step and the app makes no network requests: every script, font and sample photo ships under `app/`.

## How to use it

1. **Photos** — add your own with the file picker or by dragging them anywhere onto the drop zone, or start from the seven built-in samples (speedboat, motel, pool, night ride, boulevard, pier, lifeguard).
2. **Panels** — click any panel on the cover to select it, then click a photo in the strip to fill it. Drag the selected panel's photo to reposition it, zoom with the slider, switch between Fill and Fit, or arm Swap and click a second panel to trade photos.
3. **Layout** — six poster layouts: Hero + Three, Four-Panel Grid, Nine-Panel Grid, Full Bleed, Tilted Snapshots and Duo Split. Layouts reflow for square, portrait and wide canvases.
4. **Grade** — six colour grades (Golden Hour, Neon Vice, Dusk Purple, Teal Night, Sunset Strip, Noir Pink), each a real split-tone gradient map with a contrast curve and saturation move computed per pixel, so shadow and highlight detail survives. Add film grain, a vignette and halftone dots to taste.
5. **Caption** — edit the title, the script tagline and the angled location ribbon; toggle the five-star rating; pick one of three title-band colour themes.
6. **Export** — one click per size (1080 × 1080, 1080 × 1350, 1920 × 1080), an Export-all-three button, and an Export sheet that previews the same cover in all three sizes side by side. Every edit is undoable and redoable.

The default cover loads as Hero + Three with four different photos under the Golden Hour grade, so the studio opens on a finished-looking poster rather than a blank canvas.

## Notes

VICE DESK is a fan-made cover art tool built for the make.fun bounty above. It is not affiliated with or endorsed by Rockstar Games, and it uses no Rockstar logos, artwork or fonts. Its lettering fonts are Anton and Pacifico, shipped under `app/fonts/` with their SIL Open Font License text. The sample photos were made with an image model for make.fun and are free to use.
