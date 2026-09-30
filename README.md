# MoD-IT Games

The English-language landing page for the MoD-IT browser game collection. Plain HTML and CSS, with no build step or runtime dependencies.

## Preview

Serve the parent folder containing `games`, `multiplayer`, `dock`, `park`, and `hamster`:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/games/`. Sibling links also work on GitHub Pages at `https://gbyrka.github.io/games/`, with each game published in its own repository.

## Publish

Publish this repository's root to GitHub Pages. Include `index.html`, `privacy.html`, `config.json`, `style.css`, and `assets/`.

## Privacy policy

`privacy.html` covers the collection's local game saves, multiplayer room/chat data, GitHub Pages hosting, Google Analytics, and AdSense where enabled. The catalog footer links to it. After publication, use `https://gbyrka.github.io/games/privacy.html` as the privacy policy URL in AdSense.

The policy page is standalone HTML with inline styles and local assets; it loads no analytics, advertising, or consent scripts. Keep it that way so visitors can read it before making a consent choice. The AdSense verification metatag does not load scripts or ads.

Review this page when changing services or storage. AdSense advertising and consent integration are still separate implementation steps: the verification metatags do not implement a CMP or connect Analytics to consent choices. Confirm Analytics retention settings and the actual consent behavior before relying on the policy's consent requirements as implemented behavior.

## Release version and browser cache

Before publishing changes to CSS or JavaScript, change `version` in `config.json`, for example from `cedar` to `birch`. This is the only place to set the release version. Use 3–16 letters/digits and a new value for every release.

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
