# Research prompt: Monza F1 speed profile (real lap targets)

Copy everything below the line and give it to the research agent, together
with `docs/track-format.md` and `src/tracks/monza.json` (it already has the
corner ids and arc-length stations the deliverable must use).

---

You are researching real Formula 1 speed data for the Autodromo Nazionale
Monza GP circuit so a browser racing game can drive an automatic speed
envelope that produces lap times close to a real F1 qualifying lap. Your
deliverable is **data**, not code and not images.

## Goal

A speed-profile file the game can load as its assisted-driving target:
entry / apex / exit speeds and brake points for every GP corner, plus a
sampled speed-vs-distance curve along the full lap, referenced to a real
F1 lap. A player who knows Monza should feel the right pace into Rettifilo,
Roggia, the Lesmos, Ascari and Parabolica, and a clean auto-driven lap
should land within a few seconds of the reference lap time.

## Why this exists

The game currently invents speeds from centerline curvature
(`ENVELOPE_LAT_ACCEL`). That is wrong in places (e.g. Rettifilo apex
currently ~200 km/h in-game; real F1 is far slower). We will replace that
synthetic envelope with your researched profile. Do not invent physics —
source real numbers.

## Current in-game baseline (replace these)

Lap length in our data: **5793.4 m**. Corner stations (`s` in meters from
the start/finish line, racing direction) and today's invented apex speeds:

| id | name | s (m) | current game apex |
|---|---|---|---|
| `rettifilo` | Variante del Rettifilo (T1) | 622 | ~203 km/h |
| `biassono` | Curva Biassono / Curva Grande | 1106 | ~295 km/h |
| `roggia` | Variante della Roggia | 1838 | ~105 km/h |
| `lesmo1` | Lesmo 1 | 2210 | ~194 km/h |
| `lesmo2` | Lesmo 2 | 2583 | ~158 km/h |
| `serraglio` | Curva del Serraglio | 2995 | ~305 km/h |
| `ascari` | Variante Ascari | 3650 | ~175 km/h |
| `parabolica` | Curva Alboreto (Parabolica) | 4865 | ~227 km/h |

Also capture the **main straight** (start/finish → Rettifilo braking) and
the **back straight** toward Ascari: top speeds and where braking starts.

## Deliverables

1. `src/tracks/monza.speeds.json` — schema below. Same track frame and
   corner ids as `src/tracks/monza.json`. Speeds in **km/h**, distances in
   **meters of arc length `s`** (same convention as the track file).
2. `docs/research/monza-speeds-notes.md` — sources, which lap / year /
   session, per-corner confidence, how numbers were cross-checked, and a
   short reconciliation of implied lap time vs the reference.

## Schema (`monza.speeds.json`)

```json
{
  "formatVersion": 1,
  "trackId": "monza",
  "units": { "speed": "km/h", "distance": "m", "time": "s" },
  "reference": {
    "class": "f1",
    "season": 2024,
    "session": "qualifying",
    "driver": "…",
    "lapTimeS": 80.xxx,
    "source": "…",
    "notes": "pole lap / representative push lap used for the profile"
  },
  "lap": {
    "lengthM": 5793.4,
    "topSpeedKmh": 350,
    "topSpeedS": 480,
    "impliedLapTimeS": 80.x,
    "method": "how impliedLapTimeS was computed from the samples"
  },
  "corners": [
    {
      "id": "rettifilo",
      "name": "Variante del Rettifilo",
      "s": 622.279,
      "entrySpeedKmh": 340,
      "apexSpeedKmh": 75,
      "exitSpeedKmh": 130,
      "brakePointS": 480,
      "brakePointConfidence": "high",
      "apexS": 622.279,
      "apexConfidence": "high",
      "notes": "short double-apex chicane; give the slower of the two apexes if they differ, and say so"
    }
  ],
  "samples": [
    { "s": 0, "speedKmh": 310, "phase": "accel" },
    { "s": 100, "speedKmh": 325, "phase": "accel" },
    { "s": 480, "speedKmh": 340, "phase": "brake" },
    { "s": 622, "speedKmh": 75, "phase": "apex" }
  ],
  "source": {
    "primary": ["…"],
    "secondary": ["…"],
    "license": "facts / fair-use telemetry summaries — no proprietary raw traces redistributed"
  }
}
```

### Field rules

- **`corners`** — one object per GP corner id from `monza.json`
  (`rettifilo`, `biassono`, `roggia`, `lesmo1`, `lesmo2`, `serraglio`,
  `ascari`, `parabolica`). Do **not** invent new ids. `s` must match the
  track file (copy it). Required speeds: `entrySpeedKmh`, `apexSpeedKmh`,
  `exitSpeedKmh`. Required stations: `brakePointS`, `apexS` (usually =
  corner `s`). Optional: `turnInS`, `exitS`, `gear`, `notes`.
- **`samples`** — dense speed-vs-`s` curve the game will interpolate.
  Requirements:
  - Cover a full lap `[0, lengthM]`, closed (first/last should agree
    within ~5 km/h after wrapping).
  - Spacing ≤ **25 m** on straights, ≤ **10 m** through braking zones and
    chicanes (Rettifilo, Roggia, Ascari).
  - Every sample has `s`, `speedKmh`, and `phase` ∈
    `accel | hold | brake | apex | exit`.
  - Must be consistent with `corners`: at each corner `apexS`, the
    sample speed must be within **5 km/h** of `apexSpeedKmh`; at each
    `brakePointS`, within **8 km/h** of `entrySpeedKmh`.
- **`reference`** — pick **one** real F1 push lap (prefer recent
  qualifying pole, dry, current layout). State season, session, driver,
  official lap time. All speeds should be for that class of car on that
  lap (or clearly labelled as a reconciled average of 2–3 similar laps).
- **`lap.impliedLapTimeS`** — integrate `ds/v` over `samples` (v in m/s)
  and report it. Target: within **±3 s** of `reference.lapTimeS`. If you
  cannot close that gap, explain why in the notes (missing sector data,
  older layout, etc.) — do not silently invent speeds to hit the time.
- Speeds are **ground speed**, not GPS artifacts. Prefer onboard /
  official timing / reputable telemetry write-ups over random YouTube
  guesses.

## What to research (priority)

1. **Big stops** (highest value): Rettifilo, Roggia, Ascari, Parabolica —
   entry speed, brake-point distance (or s), minimum apex speed, exit
   speed.
2. **Medium corners**: Lesmo 1, Lesmo 2 — often taken without heavy
   braking; get apex and whether it is a lift or a brake.
3. **Fast sweeps**: Biassono / Curva Grande, Serraglio — almost flat;
   confirm min speed and whether anyone lifts.
4. **Straights**: peak speed before Rettifilo; peak on the run to Ascari;
   speed over the start/finish line.
5. **Sector times** if available — use them to validate the integrated
   lap time from samples.

## Accepted sources (prefer in this order)

1. Official FIA / F1 timing (lap time, sector times, speed trap).
2. Onboard telemetry overlays from broadcasters or teams (screenshot or
   cite the video + timestamp; do **not** dump proprietary CSV).
3. Reputable analysis (Autosport, The Race, Motorsport.com technical
   pieces that quote trap speeds / min corner speeds).
4. Multiple onboard videos cross-checked against each other when
   numbers disagree.
5. Last resort: sim titles with known good Monza data (iRacing / ACC) —
   label as `sim-estimated` and never mix them unmarked with real F1.

For every corner, set `brakePointConfidence` / `apexConfidence` to
`high` | `medium` | `low` and name the source in the notes file.

## Method

1. Confirm the track layout year matches our GP circuit (no oval, current
   Rettifilo / Roggia / Ascari geometry).
2. Lock the reference lap (driver, session, time).
3. Collect per-corner speeds and brake distances; convert brake distance
   into `brakePointS = apexS - distance` (wrap if needed using
   `lengthM = 5793.4`).
4. Build the dense `samples` array; smooth only enough to remove sensor
   noise — keep real braking ramps steep.
5. Integrate lap time from samples; compare to reference; adjust only
   where sources support it.
6. Write the notes file with a per-corner table: sourced speed, our JSON
   value, confidence, source link/citation.

## Acceptance checklist

- [ ] All 8 GP corner ids present; `s` values copied from `monza.json`
- [ ] `samples` spacing ≤ 25 m (≤ 10 m in chicanes / brake zones)
- [ ] Sample speeds match corner entry/apex within the tolerances above
- [ ] `impliedLapTimeS` within ±3 s of `reference.lapTimeS`, or the gap
      is explained
- [ ] Top speed and start/finish speed stated
- [ ] Notes name sources and confidence per corner
- [ ] No proprietary raw telemetry files redistributed — numbers and
      citations only
- [ ] Speeds in km/h, stations in meters, times in seconds

## Out of scope

- Do not change `monza.json` geometry or corner positions.
- Do not invent AI / game difficulty curves — report **real** F1 pace.
- Do not research barriers, scenery, or controls.
- Wet-weather and safety-car laps are out; dry push lap only.

## Return format

Commit-ready files:

1. `src/tracks/monza.speeds.json`
2. `docs/research/monza-speeds-notes.md`

In the PR / final message, paste a short summary table:

```
corner     | entry | apex | exit | brakeΔs | conf
rettifilo  |  …    |  …   |  …   |  …      | high
…
reference lap: Xs · implied from samples: Ys · Δ: Zs
```
