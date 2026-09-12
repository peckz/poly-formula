# Research prompt: Monza F1 racing line (real geometric line)

Copy everything below the line and give it to the research agent, together
with `docs/track-format.md` and `src/tracks/monza.json` (same frame, corner
ids, and centerline the deliverable must hug). If
`docs/research/monza-speeds-prompt.md` / `monza.speeds.json` already exist,
pass those too so the line and the speed profile describe the same lap.

---

You are researching the real Formula 1 racing line at Autodromo Nazionale
Monza for a browser racing game that already has a 1:1 centerline. Your
deliverable is **data**, not code and not images.

## Goal

A racing-line file that places the ideal F1 line in the same local frame as
`monza.json`: late apexes where Monza demands them, kerb usage at the
chicanes, and the classic wide-in / tight-out through Parabolica. A driver
who knows the track should recognize the line corner by corner. The game
will draw it as the ghost trail and use it for boost / line-quality
scoring — the current elastic-band line computed from the centerline is a
no-go and will be replaced by your data.

## Why this exists

Today the game builds the line with a physics-free “elastic band” that
straightens the centerline and clamps to road width. That produces a
plausible curve on paper and a wrong line in practice: it does not late-
apex Parabolica, does not take the Rettifilo / Roggia kerbs the way F1
does, and drifts through Ascari like a road car. We need a **sourced**
line, not a geometric guess.

## Coordinate frame (critical)

Reuse the track frame exactly (`docs/track-format.md` + `monza.json`):

- Origin at start/finish, track centerline
- Racing direction at origin = `−z`
- `+x` = driver’s **right** at the origin
- Units = metres

Every racing-line sample must be expressible as a point on the road
relative to the nearest centerline station:

- `s` — arc length along the **centerline** (same `s` as `monza.json`)
- `offsetM` — signed lateral distance from the centerline  
  **positive = right of racing direction, negative = left**
- Also emit world `x`, `z` in the same frame (for visual QA)

Prove the frame with two control points in the notes:

1. Start/finish centerline ≈ `(0, 0)` with `offsetM ≈ 0`
2. T1 / Rettifilo apex region near centerline station `s ≈ 622`

Do not re-fit the transform. Do not invent a second origin.

## Road limits

Published GP track width is roughly **10–12 m**. Treat usable asphalt +
kerbs as:

- hard clamp: `|offsetM| ≤ 6.5` (beyond this is grass / sausage)
- typical racing-line envelope: `|offsetM| ≤ 5.5` on asphalt, up to
  **~6.2** only where F1 clearly rides painted kerbs (Rettifilo, Roggia,
  Ascari exits) — mark those samples `"onKerb": true`

If a sourced line goes outside that, clip and say so in the notes.

## Deliverables

1. `src/tracks/monza.racingline.json` — schema below
2. `docs/research/monza-racingline-notes.md` — sources, method,
   per-corner description, confidence, and a short “how this differs from
   a geometric min-curvature line” section

## Schema (`monza.racingline.json`)

```json
{
  "formatVersion": 1,
  "trackId": "monza",
  "units": { "distance": "m" },
  "frame": "same as monza.json — origin S/F, +x driver right, race −z",
  "reference": {
    "class": "f1",
    "season": 2024,
    "session": "qualifying",
    "driver": "…",
    "notes": "same push lap as monza.speeds.json if that file exists"
  },
  "corners": [
    {
      "id": "rettifilo",
      "name": "Variante del Rettifilo",
      "s": 622.279,
      "turnIn": { "s": 560, "offsetM": 4.5 },
      "apex": { "s": 622, "offsetM": -4.8, "onKerb": true },
      "exit": { "s": 700, "offsetM": 4.2 },
      "notes": "double left-right; describe both apexes if split",
      "confidence": "high"
    }
  ],
  "samples": [
    {
      "s": 0,
      "offsetM": 0.2,
      "x": 0.2,
      "z": 0,
      "onKerb": false,
      "phase": "straight"
    },
    {
      "s": 560,
      "offsetM": 4.5,
      "x": 12.3,
      "z": -558.1,
      "onKerb": false,
      "phase": "turnIn"
    }
  ],
  "source": {
    "primary": ["…"],
    "secondary": ["…"],
    "license": "derived geometric facts from public onboard / aerial — no proprietary GPS traces redistributed"
  }
}
```

### Field rules

- **`corners`** — one object per GP corner id from `monza.json`:
  `rettifilo`, `biassono`, `roggia`, `lesmo1`, `lesmo2`, `serraglio`,
  `ascari`, `parabolica`. Copy `s` from the track file. Required
  `turnIn`, `apex`, `exit` each with `{ s, offsetM }` (optional
  `onKerb`). For double-apex chicanes (`rettifilo`, `roggia`, `ascari`)
  add `apex2` when the second apex is distinct.
- **`samples`** — dense line the game will draw and query:
  - Full lap `[0, lapLengthM]` with `lapLengthM = 5793.4` (from our
    centerline). Close the loop: first/last offsets within **0.5 m**.
  - Spacing ≤ **5 m** everywhere; ≤ **2 m** through Rettifilo, Roggia,
    Ascari, Lesmos, and Parabolica.
  - Every sample: `s`, `offsetM`, `x`, `z`, `onKerb`, `phase` where
    `phase` ∈ `straight | turnIn | apex | exit | kink`.
  - `x`,`z` must equal centerline position at `s` plus
    `offsetM * rightNormal` (rightNormal = rotate racing tangent 90°
    toward +x at origin). Sanity-check a few samples in the notes.
  - At each corner’s `apex.s`, the sample `offsetM` must be within
    **0.4 m** of `corners[].apex.offsetM`.
- Prefer the **qualifying** racing line (push lap), not a defensive
  race line. If wet / alternate lines appear in sources, ignore them.
- If `monza.speeds.json` exists, use the **same** reference lap
  (driver / session). Say so in `reference.notes`.

## What “correct” looks like (sanity checklist by corner)

Use these as qualitative gates — your numbers should agree with them even
if exact offsets differ:

1. **Rettifilo (T1)** — enter from the right side of the straight; hit
   the left kerb at the first apex; cross to the right kerb for the
   second; exit toward the right before Biassono.
2. **Biassono / Curva Grande** — almost flat, stay mid-to-outside; do
   not invent a tight apex.
3. **Roggia** — aggressive kerb strike on entry left, then right; short
   and ugly; exit toward the right for Lesmo 1.
4. **Lesmo 1** — classic late apex, use the right exit; do not cut early.
5. **Lesmo 2** — tighter, later apex than Lesmo 1; exit to the left side
   of the road toward the back section.
6. **Serraglio** — fast kink, small offset change; mostly hold the line.
7. **Ascari** — three-part left complex; clear turn-in from the right,
   multiple apexes / kerbs, exit wide to the right onto the straight.
8. **Parabolica / Alboreto** — wide entry on the left, late apex on the
   inside right, unwind to the left side for the main-straight run to
   the line.

If a sourced video or diagram disagrees with this list, trust the source
and document the disagreement — do not force the checklist.

## Accepted sources (prefer in this order)

1. F1 onboard / helicopter / drone of a dry qualifying push lap
   (cite video + timestamp for each corner).
2. Official circuit / FIA track maps that mark the racing line.
3. Broadcast track maps / driver analysis pieces that show the line.
4. High-res aerial / satellite with visible rubbered-in line (OSM /
   Google / Bing) — good for straights and Parabolica; weak in
   chicanes if rubber is faint.
5. Last resort: well-known sims (iRacing / ACC) labelled
   `sim-estimated`, never mixed unmarked with real footage.

Do **not** redistribute proprietary GPS / telemetry polylines. Derive
offsets and cite the public media you used.

## Method

1. Lock the reference lap (same as speeds research if available).
2. For each corner, scrub onboard + aerial until turn-in / apex / exit
   are clear; estimate lateral position as a fraction of track width,
   then convert to `offsetM` using local width ≈ 11 m (asphalt) unless
   a better local width is sourced.
3. Build dense `samples` along the full lap; interpolate smoothly on
   straights; keep chicane direction changes sharp.
4. Project every sample onto our centerline: find nearest `s`, measure
   signed offset, re-emit `x`,`z` from `monza.json` geometry so the
   file is already in our frame (do not leave samples in GPS / ENU).
5. Validate the qualitative checklist; write per-corner confidence
   (`high` | `medium` | `low`).

## Acceptance checklist

- [ ] All 8 GP corner ids present; `s` copied from `monza.json`
- [ ] `samples` spacing ≤ 5 m (≤ 2 m in corners / chicanes)
- [ ] Every sample has `s`, `offsetM`, `x`, `z`, `onKerb`, `phase`
- [ ] `|offsetM| ≤ 6.5`; kerb usage flagged with `onKerb`
- [ ] Loop closes (start/end offset within 0.5 m)
- [ ] Qualitative Monza line checklist satisfied or disagreements noted
- [ ] Notes cite sources + timestamps per corner
- [ ] Frame proof (S/F and Rettifilo) included in the notes
- [ ] No second coordinate system, no proprietary raw GPS dump

## Out of scope

- Do not edit `monza.json` geometry.
- Do not invent speeds (that is `monza-speeds-prompt.md`).
- Do not research barriers, scenery, or controls.
- Wet line, race-traffic defensive line, and oval / banking line are out.

## Return format

Commit-ready files:

1. `src/tracks/monza.racingline.json`
2. `docs/research/monza-racingline-notes.md`

In the PR / final message, paste:

```
corner     | turnIn off | apex off | exit off | kerb? | conf
rettifilo  |  …         |  …       |  …       |  y/n  | high
…
sample count: N · max |offset|: X.Xm · loop close Δ: Ym
```
