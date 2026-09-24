# MoD-IT Games

The English-language landing page for the MoD-IT browser game collection. Plain HTML and CSS, with no build step or runtime dependencies.

## Preview

Serve the parent folder containing `games`, `dock`, `park`, and `hamster`:

```sh
python3 -m http.server 8000
```

Open `http://localhost:8000/games/`. Sibling links also work on GitHub Pages at `https://gbyrka.github.io/games/`, with each game published in its own repository.

## Publish

Publish this repository's root to GitHub Pages. Include `index.html`, `style.css`, and `assets/`.

## Add a game

Copy a `.game-card` into the appropriate section, give its title and call to action unique IDs, update `aria-labelledby`, and set the game URL, image, description, and controls. Update the visible game count. When mobile or desktop + mobile games arrive, replace the relevant announcement with a game grid. The first desktop + mobile release is announced for October 1, 2026.

Cover artwork for DOCK and HAMSTER comes from their existing repositories. PARK uses an actual gameplay capture. Assets are local so the catalog deploys independently. Analytics uses the same `G-WTPHWDLQ7K` stream as the games. Author attribution links to Grzegorz Byrka on LinkedIn.
