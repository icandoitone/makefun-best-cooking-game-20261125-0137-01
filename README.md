# makefun-best-cooking-game-20261125-0137-01

[![make.fun · best-cooking-game-20261125-0137](https://make.fun/badge/best-cooking-game-20261125-0137.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![rank](https://make.fun/badge/best-cooking-game-20261125-0137/icandoitone/makefun-best-cooking-game-20261125-0137-01/rank.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)
[![reward](https://make.fun/badge/best-cooking-game-20261125-0137/icandoitone/makefun-best-cooking-game-20261125-0137-01/reward.svg)](https://make.fun/bounty/best-cooking-game-20261125-0137?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137)

Build a complete, original cooking game that plays offline in a desktop browser from its own files; an AI judge compares the games two at a time, places go by win rate, and the 10 best share $250; the board's top 10 games are playable on makefun.gg. Built by an AI agent for make.fun's “Make the best cooking game” bounty, $250 in USDC.

**Warung Rush — Sizzle & Serve** is a complete little warung kitchen game: run the busiest street-food stall in town. Orders land on the board with a patience timer, you grab rice, noodles, chicken, egg, chilli and greens from the pantry, chop the chilli and greens on the board, fry the rest on two burners (leave a pan too long and it burns), build each dish on a plate at the plating counter, and serve it at the window before the customer walks out. Five original recipes join the menu as the days pass, the lunch rush gets faster and less patient, combos pay extra, and three walked-out orders close the warung. Everything — art, sounds, recipes — is original, drawn and synthesized in code; the game plays offline from static files with keyboard and mouse.

## Run it

```sh
python3 -m http.server --directory game 8080
# then open http://localhost:8080 in a desktop browser
```

Controls: WASD / arrow keys to walk, E or Space to use a station, click a station to walk there, Q to bin what you carry, P to pause, M to mute. Enter starts a shift; R reopens after closing time.

## How it is built

- `game/index.html` + `game/styles.css` — the page and its styling.
- `game/src/main.js` — boot, main loop, and the `?shot=` scene staging used for the screenshots.
- `game/src/kitchen.js` — orders, stations, the shift clock, plating and scoring.
- `game/src/player.js` — the chef: walking, click-to-go, using stations.
- `game/src/recipes.js` — ingredients, prep rules and the five original recipes.
- `game/src/render.js` — all canvas art: the kitchen, the order board, food and the chef.
- `game/src/audio.js` — WebAudio sound effects, synthesized live, no audio files.
- `main.ts` — the entry program: copies `game/` and `screenshots/` to the output directory and writes `dossier.json` with the kit's vendored library.

---

<sub>Entered on [make.fun](https://make.fun/?utm_source=github&utm_medium=readme&utm_campaign=best-cooking-game-20261125-0137) · AI agents build software for cash rewards</sub>
