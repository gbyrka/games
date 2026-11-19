# SimCity release artwork

Generated using the built-in `image_gen` tool with the imagegen skill; no CLI/API fallback.

- `simcity-cover.png`: original catalog artwork; illustration only, without text.
- `simcity-linkedin.png`: full-resolution LinkedIn graphic; only “SimCity” and `https://mod-it.games`.
- `simcity-linkedin.jpg`: upload-ready JPEG of the same graphic.
- `../assets/simcity-cover.jpg`, `../assets/simcity-cover-600.webp`, `../assets/simcity-cover-1200.webp`: compressed, resized card artwork.
- `../assets/simcity-social.jpg`: 1200×630 Open Graph image for the game page.

Only resizing/encoding was used after generation. Both selected original images are retained here.

## Final prompt — LinkedIn graphic

```text
Use case: ads-marketing.
Asset type: finished LinkedIn game-release image, landscape 1.91:1 aspect ratio, approximately 1800 by 940 pixels.
Primary request: a beautiful nostalgic release poster for the original DOS city-building game, labelled SimCity. It must immediately evoke early-1990s isometric city-building pixel art, while looking clean and inviting on LinkedIn.
Scene: a detailed thriving isometric city on a green landscape, winding blue river, one road bridge, neat connected street grid, small red-roof suburban homes, a few cream and blue-gray office towers, tree-lined parks, modest industrial edge and power lines. Coherent playable-looking urban planning, no floating blocks or futuristic architecture. The city occupies the right 65% and extends gracefully into the lower foreground.
Style: carefully crafted crisp pixel-art illustration inspired by 1990s VGA city simulations, strong isometric geometry, visible fine pixel detail and restrained dithering; no fake game UI, no screenshot frame, no computer monitor, no realistic 3D render, no photorealism. Warm late-afternoon highlights on a deep forest-green backdrop fading naturally into the green land.
Composition: spacious and polished; a quieter deep-green zone on the left for exactly two lines of large readable typography. Keep all words well inside the canvas with generous margins, and keep buildings from obscuring the text. The skyline remains clear at feed-thumbnail scale.
Text (verbatim, only these two strings): "SimCity" as the large warm-ivory title in the upper-left, and "https://mod-it.games" in highly legible warm-ivory type below it, large enough to read in the LinkedIn feed. Preserve exact URL including https:// and the hyphen. Use elegant clean lettering, no oversized 2000 numeral, no other captions.
Avoid: slogans, badges, feature lists, buttons, watermarks, extra logos, invented UI text, people or hands, disasters, explosions, cyberpunk, neon, excessive cinematic haze.
Opaque background.
```

## Final prompt — catalog thumbnail

```text
Use case: ads-marketing.
Asset type: finished game-catalog thumbnail, landscape 3:2 aspect ratio, approximately 1536 by 1024 pixels.
Primary request: a richly detailed yet immediately readable retro isometric city-building illustration for the browser game listed as SimCity. This is cover artwork without any text, labels, URLs or UI.
Scene: a coherent thriving city in the style of early-1990s VGA city simulations. A recognisable small skyline of cream and blue-gray stepped office towers, surrounding red-roof suburban houses, a simple connected road grid, green tree-lined parks, a winding blue river crossed by one road bridge, and a modest industrial area near the back. Ordinary 20th-century architecture, not futuristic. Buildings arranged sensibly on flat green land, roads connect to the bridge and to neighbourhoods. The skyline and bridge should be large enough to recognise in a small 300px card.
Style/medium: hand-crafted high-quality crisp pixel art, fine visible pixel detail, strong 2:1 isometric geometry and restrained dithering. Nostalgic 1990s city simulation, not modern 3D toy render or photorealism. Warm late-afternoon light, lush clear greens, vivid but restrained river blue, cream stone and small muted-red roofs. Deep forest-green surroundings fit a dark-green website.
Composition: balanced full-bleed city scene, skyline around the centre with homes and bridge in the foreground. All defining landmarks comfortably inside central 80% so the cover can crop slightly. Fill the frame with city and river, without large empty text space. Attractive both at 1200x800 and at a small card size.
Constraints: only the illustration. Absolutely no typography, title, words, logos, numerals, captions, UI, border, screenshot frame, monitor, people, hands, watermarks, disasters or explosions. Opaque background.
```

