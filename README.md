# Poly Formula

Browser formula racing with a PS1 / low-poly look. The webcam is the controller: hold your hands like a wheel, and we also read head pose.

## How it works

```
webcam  →  MediaPipe (head + hands)  →  MobX store  →  HUD now, car later
```

The camera loop does not go through React. It writes numbers into a store once per frame. Only the debug HUD observes that store. Three.js can read the same values from its own animation loop.

## Decisions

- **Vite + React + Three.js** — small web stack, fast to iterate on at a hackathon
- **MediaPipe Face + Hand Landmarker** — head pose (x/y/z, yaw, pitch, roll) and both wrists
- **MobX** — tracking updates every frame without re-rendering the whole app
- **Store only useful numbers** — pose, wrists, wheel angle. Not the full landmark mesh
- **fal.ai** — generates driver atlases via GPT Image; character name is an input (default Charles Leclerc). Key stays in `.env`; the browser talks to a local Vite proxy
- **Driver sprite** — 5×5 atlas (yaw × pitch), sampled at 96×96. Mouth still opens from jaw tracking

## Now

Live camera preview with the driver overlay, plus a HUD for head, mouth, hands, and wheel angle. The 3D scene is still a cube.

## Run

```bash
npm install
npm run dev
```

Allow the camera when the browser asks.
