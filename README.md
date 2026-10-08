# MoD-IT Games

The English-language landing page for the MoD-IT browser game collection. Its multiplayer section links directly to PLAN (`../multiplayer/?game=plan`), TOW (`../multiplayer/games/tow/`) and **All multiplayer** (`../multiplayer/`). TOW's cover prominently says **Keyboard controls only for now**; both multiplayer cards use the catalog's existing visual language. Plain HTML and CSS, with no build step or runtime dependencies.

## Preview

Serve the parent folder containing `games`, `multiplayer`, `dock`, `park`, and `hamster`:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/games/`. Sibling links also work on GitHub Pages at `https://mod-it.games/games/`, with each game published in its own repository.

## Publish

Publish this repository's root to GitHub Pages. Include `index.html`, `privacy.html`, `config.json`, `style.css`, `ads.css`, `monetization.js`, and `assets/`.

The public catalog is `https://mod-it.games/games/`. The custom domain belongs to the sibling user-site repository `gbyrka.github.io`; project sites inherit it. Keep the HTTPS redirect at the start of both HTML entry pages: it preserves paths, room/challenge parameters and fragments when upgrading HTTP or moving from the old GitHub hostname. Relative game links remain on HTTPS, while local HTTP previews still work.

## Privacy policy

`privacy.html` covers the collection's local game saves, multiplayer room/chat data, GitHub Pages hosting, Google Analytics, and AdSense where enabled. The catalog footer links to it. After publication, use `https://mod-it.games/games/privacy.html` as the privacy policy URL in AdSense.

The policy page is standalone HTML with inline styles and local assets; it loads no analytics, advertising, or consent scripts. Keep it that way so visitors can read it before making a consent choice. The AdSense verification metatag does not load scripts or ads.

Review this page when changing services or storage. Confirm Analytics retention settings in the Google account when updating the policy.

## Advertising and consent

The catalog has one responsive `games_catalog` unit (`7475979927`) after the closing note, before the footer. Each game has one `game_footer` unit (`9380002810`) in a separate section below its game shell and controls, with at least 150px of separation. The sections use neutral `ADVERTISEMENT` labels, inherit the site's colours and do not change game viewport sizes.

Each Pages project includes its own identical `monetization.js` and `ads.css` so it can deploy independently. The Google AdSense script is loaded once per document. Ad units are requested once as they approach the viewport; blocked scripts or unfilled units hide the ad section. No ads or analytics are added to the privacy page or the root redirect.

In AdSense, publish the Google CMP message for `mod-it.games`. In **Privacy & messaging → European regulations → Settings**, enable Consent Mode for **advertising** and **analytics**. Keep Auto ads off when using these manual placements. `monetization.js` starts with denied consent and loads Google Analytics only after Google CMP reports analytics consent as granted or not applicable. Unknown, denied or unconfigured consent does not load Analytics, and gameplay events before permission are discarded. AdSense handles its own ad consent through the CMP.

Publish `ads.txt` from the separate `gbyrka.github.io` repository so it is available at `https://mod-it.games/ads.txt`. Publish all six project repositories to activate their placements. Check the consent flow and responsiveness on the published site; ad availability still depends on Google's serving decisions.

## Release version and browser cache

Before publishing changes to CSS or JavaScript, change `version` in `config.json`, for example from `cedar` to `birch`. Use 3–16 letters/digits and a new value for every release. If changing the standalone advertising files, also update their `?v=` URLs in `index.html` to that release version; they initialise before the application loader.

The inline loader fetches the configuration with `cache: 'no-store'` and a unique query parameter on every visit, even when the HTML is cached. It then loads `style.css?v=cedar` and the favicon with the configured version. The initial stylesheet keeps the static catalog usable while the configuration loads, including with JavaScript disabled. A visible reload notice appears if the current release cannot be loaded.

The catalog currently needs no application JavaScript. When adding it, set `entry` to its relative path (e.g. `"./app.mjs"`) and list **all** local modules, including dependencies, in `modules`. The loader installs an import map before loading the entry, so the entry and its imports use the same `?v=` value. Keep `entry: null` and `modules: []` while the catalog is HTML/CSS only. No build step is required.

## Add a game

Copy a `.game-card` into the appropriate section, give its title and call to action unique IDs, update `aria-labelledby`, and set the game URL, image, description, and controls. Update the visible game count. Replace the mobile-only announcement when a game for that category is ready.

Multiplayer is the first collection section, with a generated emerald/ivory cover and a large link to `../multiplayer/`. PLAN is available now; more card and board games are on the way. The desktop + mobile section is reserved for future single-player games and currently has no games or links. The earlier October 1 release announcements have been removed. Every game is serverless and requires no registration.

## Artwork and social sharing

- `marketing/multiplayer-cover.png`: original full-resolution collection artwork.
- `assets/multiplayer-cover.jpg`: optimized JPEG for the catalog's Open Graph preview and image fallback.
- `assets/multiplayer-cover-600.webp` and `assets/multiplayer-cover-1200.webp`: responsive cover artwork for the featured link.
- `assets/plan-social.jpg` and `assets/plan-social-*.webp`: saved PLAN campaign art. The master is in the sibling multiplayer repository at `marketing/plan-social.png`.
- `marketing/PROMPTS.md`: the final collection-art prompt and generation method. The PLAN prompt is saved alongside its master in the multiplayer repository.

Art was generated using the built-in image tool. Web copies are compressed/downscaled from the original art; they have no externally hosted image dependencies. Publish each repository with its own assets: the catalog also keeps its own copy of the PLAN artwork.

The HTML includes [Open Graph](https://ogp.me/) title, description, canonical URL, image, actual image dimensions and alt text, plus a large-image card fallback. Metadata URLs use the public GitHub Pages address so link crawlers can load the image without running JavaScript. The multiplayer repository has a matching PLAN preview. The catalog's stylesheet URL uses the release version from `config.json`.

Cover artwork for DOCK and HAMSTER comes from their existing repositories. PARK uses an actual gameplay capture. Assets are local so the catalog deploys independently. Analytics uses the same `G-WTPHWDLQ7K` stream as the games. Author attribution links to Grzegorz Byrka on LinkedIn.

The launch layout was verified in Chromium at 320, 390, 768, 1024, and 1440 px with no page overflow or broken artwork. Multiplayer navigation and both sites' share-image dimensions were checked with no console/runtime errors.
