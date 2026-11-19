# MoD-IT Games

Shared files and DOS games for the MoD-IT browser game collection. The single public catalog is now at `https://mod-it.games/`, with its HTML in the sibling `gbyrka.github.io` repository. This repository’s `index.html` redirects `/games/` directly to `/`, preserving query parameters and category fragments. Styles, images, configuration and privacy remain under `/games/`. The compact multiplayer section links to Catana Codex, HAMSTER multiplayer, TOW, TOW: Driver’s Seat, Boggle, CHESS, CHECKERS and PLAN, followed by a small link to the multiplayer collection. Both TOW covers prominently say **Keyboard controls only for now**. Plain HTML and CSS, with no build step or runtime dependencies.

## Preview

The unlisted DOS game entry is available at `/games/pop/` after deploying this
repository. It is not linked from the catalog. See [pop/README.md](pop/README.md)
for the original DOS files, locally hosted emulator, controls, checkpoints and
verification. It owns its own release configuration and requires no build.

**SimCity** is the first card in **Keyboard**, linking to `/games/simcity2000/`.
It runs the full original DOS 1.01 CD edition and supports portable `.SC2` city
files. Mouse and keyboard controls are stated on its card. See
[simcity2000/README.md](simcity2000/README.md).

Serve the parent folder containing `games`, `multiplayer`, `dock`, `park`, `hamster`, and `sokoban`:

```sh
node gbyrka.github.io/tools/preview.mjs
```

Open `http://127.0.0.1:8000/`. The preview mounts the root homepage and every sibling project at its public path; `/games/` redirects to `/`.

## Publish

Publish this repository's root to GitHub Pages. Include `index.html`, `privacy.html`, `config.json`, `style.css`, `ads.css`, `monetization.js`, and `assets/`.

The public catalog is `https://mod-it.games/`; `/games/` is its compatibility redirect. The custom domain belongs to the sibling user-site repository `gbyrka.github.io`; project sites inherit it. Keep the HTTPS redirect at the start of both HTML entry pages: it preserves paths, room/challenge parameters and fragments when upgrading HTTP or moving from the old GitHub hostname. Relative game links remain on HTTPS, while local HTTP previews still work.

## Privacy policy

`privacy.html` covers the collection's local game saves, multiplayer room/chat data, GitHub Pages hosting, Google Analytics, and AdSense where enabled. The catalog footer links to it. After publication, use `https://mod-it.games/games/privacy.html` as the privacy policy URL in AdSense.

The policy page is standalone HTML with inline styles and local assets; it loads no analytics, advertising, or consent scripts. Keep it that way so visitors can read it before making a consent choice. The AdSense verification metatag does not load scripts or ads.

Review this page when changing services or storage. Confirm Analytics retention settings in the Google account when updating the policy.

## Advertising and consent

The catalog has one responsive `games_catalog` unit (`7475979927`) after the category sections, before the footer. The eligible game pages have one `game_footer` unit (`9380002810`) in a separate section below its game shell and controls, with 180px of separation on both sides. The sections use neutral `Advertisements` labels, use clearly separated borders and do not change game viewport sizes.

Each Pages project includes its own identical `monetization.js` and `ads.css` so it can deploy independently. The Google AdSense script is loaded once per document. Ad units are requested once when they enter the viewport; blocked scripts or unfilled units hide the ad section. The root homepage now hosts the existing catalog placement. The privacy page and `/games/` redirect load no ads or analytics.

In AdSense, publish the Google CMP message for `mod-it.games`. In **Privacy & messaging → European regulations → Settings**, enable Consent Mode for **advertising** and **analytics**. Keep Auto ads off when using these manual placements. `monetization.js` starts with denied consent and loads Google Analytics only after Google CMP reports analytics consent as granted or not applicable. Unknown, denied or unconfigured consent does not load Analytics, and gameplay events before permission are discarded. AdSense handles its own ad consent through the CMP.

Publish `ads.txt` from the separate `gbyrka.github.io` repository so it is available at `https://mod-it.games/ads.txt`. Publish all six project repositories to activate their placements. Check the consent flow and responsiveness on the published site; ad availability still depends on Google's serving decisions.

## Release version and browser cache

Before publishing changes to CSS or JavaScript, change `version` in `config.json`, for example from `cedar` to `birch`. Use 3–16 letters/digits and a new value for every release. If changing the standalone advertising files, also update their `?v=` URLs in `index.html` to that release version; they initialise before the application loader.

The inline loader fetches the configuration with `cache: 'no-store'` and a unique query parameter on every visit, even when the HTML is cached. It then loads `style.css?v=cedar` and the favicon with the configured version. The initial stylesheet keeps the static catalog usable while the configuration loads, including with JavaScript disabled. A visible reload notice appears if the current release cannot be loaded.

The catalog HTML and inline loader now live in `../gbyrka.github.io/index.html`, with root-relative `/games/` asset and configuration URLs. The catalog currently needs no application JavaScript. When adding it, set `entry` to its relative path (e.g. `"./app.mjs"`) and list **all** local modules, including dependencies, in `modules`. The loader installs an import map before loading the entry, so the entry and its imports use the same `?v=` value. Keep `entry: null` and `modules: []` while the catalog is HTML/CSS only. No build step is required.

## Add a game

In `../gbyrka.github.io/index.html`, copy a `.game-card` into the appropriate section, give its title and call to action unique IDs, update `aria-labelledby`, and set the game URL, image, description, and controls. Update the visible game count. Only add navigation links to categories containing playable games; do not link to empty coming-soon sections.

Multiplayer is the first collection section, with local cover artwork and a compact introduction. On desktop, its eight cards form two rows of four: Catana Codex / HAMSTER multiplayer / TOW / TOW: Driver’s Seat, then Boggle / CHESS / CHECKERS / PLAN. The grid uses two columns at 541–900px and one column at 540px or below. Keyboard games follow, then **Keyboard and mobile** with SOKOBAN at `https://mod-it.games/sokoban/`. Its cover (`assets/sokoban-cover.jpg`) is a real gameplay capture. The catalog only links to populated categories. Every game is serverless and requires no registration.

## Artwork and social sharing

SimCity uses `assets/simcity-cover.jpg` and responsive 600/1200 px WebP copies.
The game is public and indexable; `assets/simcity-social.jpg` is its 1200×630
social preview. Full-resolution thumbnail and LinkedIn masters, an upload-ready
JPEG with `https://mod-it.games`, and the exact built-in image-generation prompts
are in [marketing/SIMCITY-PROMPTS.md](marketing/SIMCITY-PROMPTS.md).

Driver’s Seat and Boggle are public and indexable. Each has its own generated cover, responsive JPEG/WebP copies here, and a dedicated social preview in the multiplayer repository. Full-resolution LinkedIn posters, upload-ready JPEGs and final built-in-tool prompts are in [marketing/DRIVERS-SEAT-BOGGLE-PROMPTS.md](../multiplayer/marketing/DRIVERS-SEAT-BOGGLE-PROMPTS.md). Both posters show `https://mod-it.games`.

The CHESS and CHECKERS cards use `assets/chess-cover.jpg`, `assets/checkers-cover.jpg` and their `-600.webp`/`-1200.webp` variants. Both games are linked from this catalog and the separate multiplayer collection. Masters and exact prompts are in the sibling multiplayer repository at [marketing/BOARD-GAMES-PROMPTS.md](../multiplayer/marketing/BOARD-GAMES-PROMPTS.md); the same folder contains the chess LinkedIn graphic and upload-ready JPEG.

- `marketing/multiplayer-cover.png`: original full-resolution collection artwork.
- `assets/multiplayer-cover.jpg`: optimized JPEG for the catalog's Open Graph preview and image fallback.
- `assets/multiplayer-cover-600.webp` and `assets/multiplayer-cover-1200.webp`: responsive cover artwork for the featured link.
- `assets/plan-social.jpg` and `assets/plan-social-*.webp`: saved PLAN campaign art. The master is in the sibling multiplayer repository at `marketing/plan-social.png`.
- `assets/catana-cover.jpg` and `assets/catana-cover-*.webp`: generated Catana Codex artwork. The full-resolution master and final built-in tool prompt are in the sibling multiplayer repository at `marketing/catana-cover.png` and [marketing/CATANA-PROMPT.md](../multiplayer/marketing/CATANA-PROMPT.md).
- `marketing/PROMPTS.md`: the final collection-art prompt and generation method. The PLAN prompt is saved alongside its master in the multiplayer repository.

Art was generated using the built-in image tool. Web copies are compressed/downscaled from the original art; they have no externally hosted image dependencies. Publish each repository with its own assets: the catalog also keeps its own copy of the PLAN artwork.

The HTML includes [Open Graph](https://ogp.me/) title, description, canonical URL, image, actual image dimensions and alt text, plus a large-image card fallback. Metadata URLs use the public GitHub Pages address so link crawlers can load the image without running JavaScript. The multiplayer repository has a matching PLAN preview. The catalog's stylesheet URL uses the release version from `config.json`.

Cover artwork for DOCK and HAMSTER comes from their existing repositories. PARK uses an actual gameplay capture. Assets are local so the catalog deploys independently. Analytics uses the same `G-WTPHWDLQ7K` stream as the games. Author attribution links to Grzegorz Byrka on LinkedIn.

The launch layout was verified in Chromium at 320, 390, 768, 900, 1024, 1280, and 1440 px with no page overflow or broken artwork. Multiplayer navigation and both sites' share-image dimensions were checked with no console/runtime errors.

## AdSense navigation audit

The root homepage is now real static content with explicit game links rather than
a JavaScript-only redirect. The catalog omits empty Mobile/Cross-platform
categories. CHESS, CHECKERS and Boggle have no manual ad units: their About
dialogs contain information only. Their shared AdSense bootstrap remains for
the existing CMP integration, so **Auto ads must remain off in AdSense**.
The code cannot change that account setting. Other game/footer placements are
ordinary document sections, with 180px separation from preceding content and
following navigation. The shared helper refuses placements inside navigation,
private chat, dialogs, or fixed/sticky containers, and refuses misleading labels.
Once requested, a unit stays attached and visible through SPA transitions;
blocked or unfilled units are hidden, and units are never refreshed on moves.

See the sibling `gbyrka.github.io/ADSENSE-AUDIT.md` for findings, deployment scope,
Google references and the remaining AdSense account checks. Google alone decides
whether the site passes review.
