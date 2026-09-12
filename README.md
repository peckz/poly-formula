# Poly Formula

Browser formula racing with a PS1 / low-poly look. The webcam is the controller: hold your hands like a wheel, and we also read head pose.

## How it works

```
webcam  →  MediaPipe (head + hands)  →  MobX store  →  HUD now, car later
```

The camera loop does not go through React. It writes numbers into a store once per frame. Only the debug HUD observes that store. Three.js can read the same values from its own animation loop.

## Decisions

- **Vite + React + Three.js** — small web stack, fast to iterate on at a hackathon
- **MediaPipe Face + Hand Landmarker** — geometric head pose from a few landmarks, plus both wrists
- **MobX** — tracking updates every frame without re-rendering the whole app
- **Store only useful numbers** — pose, wrists, wheel angle. Not the full landmark mesh
- **fal.ai** — generates the entry-screen 5×5 head atlas via **GPT Image 2.5 Flare** (`openai/gpt-image-2.5/flare/text-to-image`). Key stays in `.env`; the browser talks to a local Vite proxy. Missing credentials keep the entry flow usable with a brick placeholder.
- **Driver sprite** — 5×5 atlas. Nose vs eyes/mouth picks yaw/pitch, then snaps to a cell. Overlay is counter-mirrored so left/right match
- **Wheel sprite** — two palm centers set position, tilt, and size so the grips sit in your hands

## Track data

Real circuits come in as data files, researched separately (possibly by other agents) and consumed by the game as-is.

- [`docs/track-format.md`](docs/track-format.md) — the shared standard: coordinate system, arc-length convention, JSON schema, acceptance checklist. Any track research must deliver this format.
- [`docs/scenery-format.md`](docs/scenery-format.md) — companion standard for the surroundings: grandstands, pits, forest, the old banking, as footprints in the same frame.
- [`docs/research/monza-scenery-prompt.md`](docs/research/monza-scenery-prompt.md) — ready-to-share prompt for researching Monza's real surroundings (OSM footprints, aerial verification).
- [`docs/research/monza-barriers-prompt.md`](docs/research/monza-barriers-prompt.md) — ready-to-share prompt for researching the barriers and fencing (guardrails, tyre walls, debris fences, gravel traps) that line the track.
- [`docs/research/monza-speeds-prompt.md`](docs/research/monza-speeds-prompt.md) — ready-to-share prompt for researching real F1 Monza speed targets (entry/apex/exit, brake points, dense speed-vs-distance profile for lap-time realism).
- [`docs/research/monza-racingline-prompt.md`](docs/research/monza-racingline-prompt.md) — ready-to-share prompt for researching the real F1 Monza racing line (lateral offsets + world points to replace the geometric elastic-band line).
- Track files live in `src/tracks/<slug>.json`, scenery in `src/tracks/<slug>.scenery.json`, barriers in `src/tracks/<slug>.barriers.json`, research notes in `docs/research/`.
- `src/game/trackPath.ts` loads a track file and answers geometry questions (sample at arc length, nearest point, next corner); `src/game/trackModel.ts` builds the meshes from it.

## Now

Landing is a sharp pre-race entry screen: nickname required to start, optional fal.ai avatar (placeholder if `FAL_KEY` is missing). After start, the existing hand-wheel / READY overlay and HUD take over.

Drivable low-poly F1 car on the real 1:1 Monza layout, built at runtime from [`src/tracks/monza.json`](src/tracks/monza.json) (OSM-sourced, 5793 m): arcade physics, chase camera, HUD with minimap and corner callouts. Keyboard (WASD/arrows) drives, `R` resets you onto the track; holding the hand wheel takes over steering with a gentle auto-throttle.

## Run

```bash
npm install
npm run dev
```

Allow the camera when the browser asks.
