# Monza GP — F1 racing-line research notes

Data file: [`src/tracks/monza.racingline.json`](../../src/tracks/monza.racingline.json).
Track frame: [`src/tracks/monza.json`](../../src/tracks/monza.json) / [`docs/track-format.md`](../track-format.md) / [`docs/research/monza-notes.md`](monza-notes.md).
Prompt: [`docs/research/monza-racingline-prompt.md`](monza-racingline-prompt.md).

`src/tracks/monza.speeds.json` does **not** exist. This line is locked to a dry qualifying push lap so a later speed profile can share the same reference. No speeds are stored here.

**Correction (PR #7 review).** The first revision sat on the **right** of the main straight into Rettifilo (`turnIn +4.60`). That is the inside of a right-hander. The line is now **left-side from Parabolica exit through T1 turn-in** (negative `offsetM` until the car darts to the right kerb). Other corners were already outside-in and were not flipped.

Validation plots (same `x`/`−z` frame as the scenery overview):

- [`monza-racingline-overview.png`](monza-racingline-overview.png) — full lap + Rettifilo / Roggia / Ascari / Parabolica insets
- [`monza-racingline-t1-left-approach.png`](monza-racingline-t1-left-approach.png) — pit-straight + Rettifilo plan view and `offsetM` vs `s` (left-side approach check)

## Reference lap

| Field | Value |
| --- | --- |
| Class | Formula 1 |
| Session | 2024 Italian GP qualifying, Q3, dry |
| Driver | Lando Norris (McLaren MCL38) |
| Lap time | **1:19.327** (pole) |
| Why this lap | Official F1 onboard is public; Norris later described his T1/T2; 2024 is the first year of the flattened Ascari kerbs that the current circuit uses |

Norris said he turned in too early for the second part of Rettifilo and “smashed the inside kerb of two,” costing about a tenth and a half, then gained it back at Roggia ([Pit Debrief interview](https://www.pitdebrief.com/post/norris-i-thought-pole-lap-was-already-over-after-mistake-in-the-first-corner-of-f1-italian-gp-q3/)). The file stores the **intended** quali line (late T2 on the painted kerb), not that early hit. Everything else follows the pole onboard plus the sources below.

## Coordinate frame (proof)

Reused from `monza.json`. No second origin, no ENU re-fit, no GPS polyline.

| Control | Track file | This file | Check |
| --- | ---: | ---: | --- |
| S/F centerline | `(x, z) = (0.000, 0.000)` | offset `0` lands on `(0.000, 0.000)`; racing-line sample at `s = 0` is `offsetM = −4.30` → `(−4.300, 0.000)` | Frame origin holds. Line stays left on the pit straight (T1 outside). |
| T1 / Rettifilo | `s = 622.279`, centreline `(−15.999, −621.625)` | same station; `offsetM = +5.85` along the local right-normal `(0.790, 0.613)` → racing-line `(−11.377, −618.039)` | Reconstruct error **0.5 mm**. |

Right-normal rule (same as `src/game/racingLine.ts`): unit tangent `(tx, tz)`, right = `(−tz, tx)`, so racing direction `(0, −1)` maps to `+x`. Every sample is `centerline(s) + offsetM * rightNormal`. Spot checks at `s = 0, 622.279, 1838.272, 2255, 3650.29, 5065, 5793.44` all reconstruct within **1 mm**.

Positive `offsetM` = driver’s right. Published asphalt width 10–12 m ([monzanet](https://www.monzanet.it/en/circuit/)); conversion uses local width **≈ 11 m** (half-width 5.5 m). `|offsetM| ≤ 5.5` is asphalt; `5.5–6.2` is a flagged kerb ride; hard clamp 6.5. **No sample was clipped.** Max `|offsetM|` = **5.95 m** (Roggia T4 left kerb).

## Sources (preference order)

### 1. F1 dry quali onboard / commentary

| Source | Use |
| --- | --- |
| [F1.com — Norris 2024 Pirelli pole onboard](https://www.formula1.com/en/video/onboard-lando-norris-2024-pirelli-pole-position-award-lap-at-the-italian-grand-prix.1808919989852209304) | Primary visual: lane position vs painted edges and kerbs |
| [F1.com — same lap, article embed](https://www.formula1.com/en/latest/article/watch-ride-onboard-for-norriss-formidable-pole-lap-in-monza-qualifying.4qWIftLYRedtL9ab1Jlt5M) | Mirror of the onboard |
| [F1.com circuit guide](https://www.formula1.com/en/latest/article/circuit-guide-everything-you-need-to-know-about-the-autodromo-nazionale-monza.51PKqBRlxNs0fzLWQzsnd0) (Jolyon Palmer) | Parabolica “run right around the outside”; Ascari first-part priority; Lesmos as a pair |
| Norris T2 interview (Pit Debrief, above) | Confirms T2 *inside* kerb exists and that an early hit is a mistake |

Timestamps below are **flying-lap time from S/F on the 1:19.327 lap** (`T+`), not a video-file clock (Pirelli pole clips usually pad 5–8 s of title before the line). Sector lengths 2.061 + 1.823 + 1.909 km (FIA maps cited in `monza-notes.md`) place S1 near Lesmo 1 entry and S2 near Ascari exit.

| Corner | `T+` (approx.) | What the onboard shows |
| --- | ---: | --- |
| Rettifilo | 6.5–10 s | Stays **left** of the pit straight through braking; turn-in from the left; first clip is the **right** inside kerb of T1; then a late flick to the **left** kerb of T2; exit walks right |
| Biassono | 12–16 s | Hands quiet, car mid-to-left of the road (outside of the right-hander), not hugging an inside apex |
| Roggia | 21–24 s | Approach from the **right**; hard left over the first kerb; immediate right over the second; car runs out **left** toward Lesmo |
| Lesmo 1 | 27–30 s | From the left; late clip, kerb missed or just kissed; opens left |
| Lesmo 2 | 31–34 s | Still from the left; later / tighter; painted inside kerb; full left exit |
| Serraglio | 36–38 s | Almost no steer; line barely moves |
| Ascari | 42–47 s | From the **right**; T8 not a full sausage attack; T9 and T10 take the flattened 2024 kerbs; exit uses the right edge |
| Parabolica | 57–68 s | Brakes on the **left**; long wait; late inside-right; unwind to the left white line |

### 2. Official circuit / FIA maps

- [monzanet.it — circuit](https://www.monzanet.it/en/circuit/): names, first-turn sense (Rettifilo right-then-left; Roggia left-right; Ascari L–R–L; Alboreto / Parabolica right), 10–12 m asphalt, 5793 m centreline.
- FIA 2025 / 2026 Italian GP circuit maps (PDFs linked from `monza-notes.md`): layout and sector lengths only. **They do not draw a racing line.** Used to confirm names and distances, not offsets.

### 3. Broadcast / driver analysis

- [Sky Sports — Alex Wurz, “A lap of Monza”](https://www.skysports.com/f1/news/4127423/a-lap-of-monza) (2008, layout unchanged at these corners): T1 “use the kerbs a lot”; Roggia “jump over the kerbs very aggressively”; Ascari “jump over the inside kerb” then the next two “just flat”; Parabolica late throttle, exit to the white line.
- [Motorsport.com — 2024 Ascari kerb changes, trackside FP1](https://www.motorsport.com/f1/news/how-the-controversial-kerb-changes-have-really-altered-monza/10649313/): cars **stay wide through the first left** and ride the new flat kerbs harder on the second and third parts.
- [Full Grip Monza guide](https://www.fullgripmotorsport.com/academy/trackguides/monza): late T1, kerbs at both Rettifilo apexes, late Parabolica, exit-speed priority at Lesmo 2 / Ascari / Parabolica.
- [Coach Dave Academy — Monza](https://coachdaveacademy.com/tutorials/autodromo-nazionale-monza-track-guide/): **“Heading into T1, stay to the left-hand side”**; brake before the 150 m board; late apex onto the flat inside (right) kerb; T2 left kerb; exit can use the right curb.
- [Sim Racing Setup — F1 24 Italy](https://simracingsetup.com/f1-24/f1-24-italy-track-guide/): turn-in after the **green strip on the left**; Roggia from the far right (that one was already correct).

### 4. Aerial rubber

Esri World Imagery was already used (not traced) in [`monza-scenery-notes.md`](monza-scenery-notes.md). The dark rubber stripe on the GP asphalt agrees with the onboard at the scale we need: **left** after Parabolica and **still left** into T1 braking, through both chicanes, mid/outside Biassono, left between the Lesmos, right into Ascari, left into Parabolica. **No satellite polyline was digitised.** v1 of these notes claimed “right for T1 braking”; that was the same mirrored-approach error as the JSON.

### 5. Last-resort sim-labelled notes

[Track Titan F1 2021 sector guides](https://www.tracktitan.io/post/monza-track-guide-sector-1-f1-2021) ([sector 2](https://www.tracktitan.io/post/monza-track-guide-sector-2-f1-2021), [sector 3](https://www.tracktitan.io/post/monza-track-guide-sector-3-f1-2021)) — **sim-estimated**, used only where they match onboard/trackside. Sector 1: “use the full width of the track to reduce the angle into Turn 1” is the **left / outside** setup (agrees with Coach Dave). Called out when they do not match: Biassono “inside white line”; T1 “straddle the sausage in the game, not so much in real life.” Sector 3’s “ease right toward the finish line” is a last-metre chord to the timing beam, **not** the T1 braking lane.

No iRacing / ACC GPS, no FastF1 car-data polylines, no team telemetry dumps.

## Method

1. Lock Norris 2024 Q3 pole as the reference lap.
2. For each named corner, scrub the onboard against the monzanet / Wurz / Palmer / 2024 trackside notes until turn-in, apex(es) and exit are clear. Estimate lane as a fraction of the ~11 m asphalt, then convert to `offsetM`. Kerb rides that are obviously on paint/sausage are set in `5.6–6.2` with `onKerb: true`.
3. Place keyframes on our centreline `s` (copied corner `s` from `monza.json`; racing apex may be *later* than the format-v1 heading peak — see Parabolica and Lesmo 1).
4. Interpolate: cosine ease on straights, linear in the chicanes so the direction change stays sharp. Densify to ≤ 4 m on straights and ≤ 1.5 m through Rettifilo, Roggia, both Lesmos, Ascari and Parabolica. Force a sample on every `turnIn` / `apex` / `apex2` / `apex3` / `exit` station.
5. Project: `x, z = centerline(s) + offsetM * rightNormal`. Close the loop at `s = 5793.44` (`metrics.centerlineLengthM`).
6. Validate the qualitative gates; where a source and the prompt checklist disagree, **keep the source** and write it down.

## Per-corner line

Width language: “right” / “left” is the driver’s right / left. Inside of a right-hander is **+offsetM**.

### Rettifilo (T1–T2) — `s = 622.279` — confidence **high**

Variante del Rettifilo is a tight **right then left** (monzanet, OSM way 179968242, format-v1 T1 rule). Centreline heading peak of the first right is `s = 622.279`; the left cluster peaks ~654–670.

| Event | `s` | `offsetM` | Kerb |
| --- | ---: | ---: | --- |
| Turn-in | 555 | **−4.80** | no |
| Apex T1 | 622.279 | +5.85 | yes |
| Apex T2 (`apex2`) | 672 | −5.55 | yes |
| Exit | 745 | +3.70 | no |

**v1 of this file was wrong on the approach.** It drifted to `+4.60` by `s ≈ 555` (right side / **inside** of a right-hander) because the research prompt said “enter from the right.” That gate is the defensive / overtake-inside line, not the quali setup. Petar (watches F1 every weekend) caught it on PR #7.

Correct line: Parabolica already exits left (`−4.55`). **Stay left-ish down the whole pit straight** (offsets stay negative through S/F and braking). Turn-in is still on the left. Only during the right-hand flick does the car cross to the **right** inside kerb (`+5.85`). T2 is a **late left** kerb (`−5.55`). Exit walks right for Biassono (`+3.70`).

Cited: Coach Dave — “Heading into T1, stay to the left-hand side”; Track Titan sector 1 — full width to reduce the T1 angle (outside = left); F1 24 Italy guide — turn-in after the green strip on the **left**. Norris 2024 pole onboard (`T+` 6.5–10 s) matches that left-side brake / right-kerb apex / left-kerb T2 sequence. Apex signs (`+` then `−`) were already correct; only the straight was mirrored.

**Prompt checklist.** “Left kerb first, right kerb second” still inverts T1-right / T2-left (apex order). “Enter from the right” was the approach bug. Sources + classic outside-for-a-right-hander win: turn-in **−4.80**, apex **+5.85**, apex2 **−5.55**.

### Biassono / Curva Grande — `s = 1106.426` — confidence **high**

Almost flat in a current F1 car (Palmer, Track Titan, onboard). Offset stays mid-to-**outside** (`−1.85` at the named station). No invented tight inside apex.

**Checklist** (mid-outside) matches. Track Titan’s “follow the inside white line” is a sim min-time tip and would leave the car on the wrong side for Roggia; the onboard shows mid/left, then a drift right over the next 600 m.

### Roggia (T4–T5) — `s = 1838.272` — confidence **high**

Left-then-right. Approach from the right. T4 (`s = 1838.272`) takes the left kerb (`−5.95`). T5 (`apex2` at `1884.5`, heading peak of the right cluster) takes the right kerb (`+5.75`). Exit runs **left** (Track Titan: left tyres to the gravel edge) so Lesmo 1 is already set up from the outside.

**Checklist disagreement.** “Exit right for Lesmo 1” is true of the **T5 apex** (right kerb) but not of the exit lane. A right-side exit would put the car on the inside for the next right-hander. Sources win: exit `offsetM = −3.10`.

### Lesmo 1 — `s = 2210.232` — confidence **high**

Format-v1 `s` is the max right heading-change on the named way — early in a ~100 m, ~80° bend. The racing apex is later: `s = 2255`, `offsetM = +4.20`, **off** the kerb (Track Titan: “slightly miss the apex kerb”). Turn-in from the left (`−4.40`). Exit opens left (`−2.90`) toward Lesmo 2.

**Checklist note.** “Use the right exit; do not cut early” = do not early-apex. The late-apex *clip* is on the right; the car still runs out left. An elastic-band line would apex near 2210; this one does not.

### Lesmo 2 — `s = 2582.962` — confidence **high**

Tighter and later than Lesmo 1. Racing apex `s = 2592`, `+5.40`, `onKerb` (Track Titan: recessed painted kerb; Full Grip: more kerb than you think). Exit uses the whole left side (`−4.70`) onto the back section. Matches the checklist.

### Serraglio — `s = 2995.137` — confidence **medium**

Half-integrated left of ~12° over ~125 m (see `monza-notes.md`). Onboard barely shows a steer input. Offset stays about `−2.2` and then drifts right for Ascari. No dedicated heli insert; confidence is medium because the move is small, not because the line is in doubt.

### Ascari (T8–T10) — `s = 3650.29` — confidence **high**

OSM splits Vialone + connector + Variante Ascari; one corner record covers the L–R–L. Format-v1 `s` is the first left cluster.

| Event | `s` | `offsetM` | Kerb |
| --- | ---: | ---: | --- |
| Turn-in | 3570 | +4.80 | yes (entry kerb) |
| Apex T8 | 3650.29 | −3.55 | yes (clip, not a full attack) |
| Apex T9 (`apex2`) | 3762 | +5.65 | yes |
| Apex T10 (`apex3`) | 3845 | −4.15 | yes (late, modest) |
| Exit | 4020 | +5.15 | no |

2024 trackside (Motorsport.com) overrules older “attack every sausage” advice: stay **wider on the first left**, ride the new flat kerbs on T9/T10, exit wide right. Track Titan sector 3 agrees on T9 full kerb, T10 “don’t take much inside kerb,” exit as much as needed for full throttle. Extra field `apex3` is the third distinct apex; unknown fields are ignored by format v1 consumers.

### Parabolica / Alboreto — `s = 4864.548` — confidence **high**

The track file’s `s` is the **tightest centreline heading change, which is at entry**. A geometric min-curvature line would apex there and ruin the pit-straight run. The F1 line is the opposite:

| Event | `s` | `offsetM` | Kerb |
| --- | ---: | ---: | --- |
| Turn-in | 4765 | −5.05 | no (wide left) |
| At track `s` | 4864.548 | −3.55 | still outside |
| Racing apex | 5065 | +4.20 | no (late inside-right, **miss** the kerb) |
| Exit | 5260 | −4.55 | no (left white line) |

Palmer: “run right around the outside to carry speed.” Track Titan: late apex, miss the inside kerb, drift to the left white line. Stay **left** from there through S/F — that *is* the T1 setup. (A last-metre dart right at the timing beam is a finish-line chord, not the racing line into Rettifilo.) This is the largest disagreement with an elastic-band line.

## How this differs from a geometric min-curvature line

The in-game elastic band (`src/game/racingLine.ts`) straightens the centreline and clamps to road width. On Monza that is the wrong sport:

| Place | Elastic band | This file |
| --- | --- | --- |
| Rettifilo / Roggia | Smooth S through the middle | Actual kerb-to-kerb flicks |
| Biassono | Invents a shallow inside apex | Mid-outside, almost no offset |
| Lesmo 1 | Apex at the heading peak (`s ≈ 2210`) | Late apex 45 m later, miss the kerb |
| Ascari | One compromise radius | Wide T8, hard T9, late T10, exit right |
| Parabolica | Apex at entry tightness (`s ≈ 4865`) | Apex ~200 m later; wide in, left out |

That is the whole reason this file exists.

## Acceptance

| Test | Result |
| --- | --- |
| All 8 GP corner ids; `s` copied from `monza.json` | Pass |
| `samples` spacing ≤ 5 m; ≤ 2 m in named chicanes / Lesmos / Parabolica | Pass (max 4.074 m; dense regions max 1.721 m) |
| Every sample has `s`, `offsetM`, `x`, `z`, `onKerb`, `phase` | Pass (`phase` ∈ straight \| turnIn \| apex \| exit \| kink) |
| `\|offsetM\| ≤ 6.5`; kerb rides flagged | Pass (max 5.95 m; 15 samples `\|off\| > 5.5`, all `onKerb`) |
| Loop close (first/last offset within 0.5 m) | **0.00 m** |
| Apex sample vs `corners[].apex.offsetM` within 0.4 m | **0.00 m** on every apex / apex2 / apex3 |
| Qualitative gates | Pass. Rettifilo approach is now left-side (v1 was mirrored). Remaining checklist notes: T1/T2 kerb *order* in the prompt is inverted; Roggia exit is left |
| Frame proof | S/F and T1 table above |
| No second coordinate system, no proprietary GPS | Pass |
| `monza.json` untouched; no speeds | Pass |

```
corner     | turnIn off | apex off | exit off | kerb? | conf
rettifilo  |  −4.80     |  +5.85   |  +3.70   |  y    | high
biassono   |  +0.20     |  −1.85   |  −2.25   |  n    | high
roggia     |  +4.75     |  −5.95   |  −3.10   |  y    | high
lesmo1     |  −4.40     |  +4.20   |  −2.90   |  n    | high
lesmo2     |  −4.55     |  +5.40   |  −4.70   |  y    | high
serraglio  |  −2.50     |  −2.20   |  −1.70   |  n    | medium
ascari     |  +4.80     |  −3.55   |  +5.15   |  y    | high
parabolica |  −5.05     |  +4.20   |  −4.55   |  n    | high
sample count: 2109 · max |offset|: 5.95m · loop close Δ: 0.00m
```

Rettifilo `apex2 = −5.55` (T2). Roggia `apex2 = +5.75` (T5). Ascari `apex2 = +5.65` (T9), `apex3 = −4.15` (T10).

## Intentionally omitted

- Speeds, brake points, gears (that is `monza-speeds-prompt.md`).
- Wet line, race-traffic defensive line, oval / banking line.
- Per-sample width, kerb geometry, DRS / Straight Mode stations.
- Any edit to `monza.json`.
- Redistributed GPS / FastF1 / sim telemetry polylines.

## Approximations

- Offsets are lane-fraction estimates from public video and maps, not a surveyed tape. Absolute error is probably ~0.5–1.0 m on straights and ~0.3–0.7 m at kerb apexes; the *sign* and the late/early choice are the facts that matter.
- Local width is the published 10–12 m range, not a per-station survey. A 12 m panel would move a “full asphalt” offset by ~0.5 m.
- OSM centreline ≠ FIA surveyed centreline (~44 cm over 5793 m; see track notes). Offsets inherit that.
- Serraglio’s station is a geometric half-turn, not a published apex.
- 2024 kerb heights at Ascari are flatter than the Track Titan 2021 text; trackside 2024 was preferred there.
