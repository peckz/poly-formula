# Monza GP — F1 speed profile research notes

Data file: [`src/tracks/monza.speeds.json`](../../src/tracks/monza.speeds.json).
Track stations: [`src/tracks/monza.json`](../../src/tracks/monza.json) / [`docs/track-format.md`](../track-format.md).
Plot: [`monza-speeds-vs-s.png`](monza-speeds-vs-s.png).

Query date: 2026-09-12. Layout year: **2026 GP** (current Rettifilo / Roggia / Ascari chicanes, no oval). Same centreline as the track file (`lapLengthM` 5793 m; we integrate on **5793.4 m** closed length).

This file is **facts and citations**. FastF1 was used only to read official F1 live-timing summaries for one lap. No proprietary CSV / raw Hz trace is in the repo.

## Reference lap

| Field | Value | Source |
| --- | --- | --- |
| Driver | **Pierre Gasly** (Alpine A526, #10) | FIA Doc 50; [formula1.com](https://www.formula1.com/en/latest/article/gasly-charges-to-sensational-maiden-f1-pole-at-monza-over-russell-and-piastri.4CKkkbvgmqL04ijMNBfuXF) |
| Session | 2026 Italian GP **Qualifying**, Q3 final run, dry, soft, tyre life 2 | FastF1 timing app + FIA classification |
| Lap time | **1:21.786** (81.786 s) | [FIA Final Qualifying Classification](https://www.fia.com/system/files/decision-document/2026_italian_grand_prix_-_final_qualifying_classification.pdf) (Doc 50, 2026-09-05) |
| Average | **254.992 km/h** | same FIA sheet (“POLE POSITION LAP”) |
| Sectors | **26.817 / 27.706 / 27.263** | F1 live timing via FastF1 3.8.3 (sum = 81.786). FormulaDream independently published S1 = 26.817 |
| Pole-lap loops | SpeedST **334**, SpeedI1 **308**, SpeedI2 **327**, SpeedFL **287** km/h | same timing feed |
| Session maxima (Gasly, any Q lap) | ST **334.6**, I1 **310.7**, I2 **332.9**, FL **300.9** | [FIA Qualifying Session Maximum Speeds](https://www.fia.com/sites/default/files/2026_13_ita_f1_q0_timing_qualifyingsessionmaximumspeeds_v01.pdf) |
| Session trap leader | Russell **338.1** km/h | same FIA PDF |

2026 cars have **no DRS** (active aero + Overtake). Practice trap peaks were 341 km/h (Aron FP1) and 334 km/h (Sainz FP2) per [FormulaDream FP analysis](https://www.formuladream.app/blog/monza-2026-telemetry-analysis). Quali pole-lap ST 334 sits on that band; 2025 DRS-era traps (Albon 364.1, Verstappen pole 352.5) are a different generation and were **not** mixed in.

A racing-line file was **not** on `main` when this profile was locked. Corner `s` values are copied from `monza.json`, not from a racing line.

## Official loops on this centreline

FIA 2026 circuit map ([competition notes / maps PDF](https://www.fia.com/system/files/decision-document/2026_italian_grand_prix_-_competition_notes_-_circuit_map_pit_lane_drawing_emergency_exits_map_and_red_zone.pdf)):

| Loop | FIA text | Station used here |
| --- | --- | ---: |
| Speed trap | 190 m before T1 | `622.279 − 190 = 432.279` |
| Intermediate 1 | 230 m before T4 (Roggia) | `1838.272 − 230 = 1608.272` |
| Intermediate 2 | 210 m before T8 (first left of Ascari) | `3650.29 − 210 = 3440.29` |
| Finish line | S/F | `0` / `5793.4` |
| Published sector lengths | 2.061 + 1.823 + 1.909 km | **FIA surveyed** centreline, not this OSM polyline |

I1→I2 on **this** polyline is 1832 m vs the published S2 of 1823 m. Implied time on that interval is **27.791 s** vs official S2 **27.706 s** (Δ **+0.085 s**). That is the clean sector check.

S1 / S3 published lengths (2.061 / 1.909 km) do **not** land on our I1 / I2 stations (1.608 / 2.353 km remaining). We do not invent extra straight to force those kilometres.

## Method

1. Confirm 2026 GP layout (same chicanes as `monza.json`; FIA map T1–T11).
2. Lock Gasly Q3 pole 1:21.786.
3. Read that lap’s car_data via FastF1 (speed, brake flag, gear). Identify events **by sequence**, not by FastF1 `Distance` — merged distance is inflated (~5876 m) and Roggia has a ~3.8 s dropout (speed stuck at 308 km/h with brake+throttle both on, GPS frozen). After the dropout the first valid min is 118 km/h.
4. `brakePointS = apexS − Δ` with `lengthM = 5793.4`. Δ from Brembo 2026 for the two big stops they published; from FastF1 (brake-on → apex) × mean speed for Lesmos / Ascari / Parabolica.
5. Build dense `samples` with v² interpolation between locked waypoints (`scripts/build_monza_speeds.py`). Straights ≤ 25 m; Rettifilo / Roggia / Ascari / brake zones ≤ 10 m.
6. Integrate `∫ ds/v` (trapezoidal, v in m/s). Adjust **only** exit ramps to published FastF1 accel, not apex speeds.

## Implied lap time

| | seconds |
| --- | ---: |
| Reference (FIA) | **81.786** |
| Implied from `samples` | **82.470** |
| Δ | **+0.684** |

Inside the ±3 s window. The leftover is mostly (a) OSM centreline vs racing line, (b) Brembo T1/T4 distances being pre-event simulations, (c) the Roggia dropout so that stop is reconstructed, (d) v² interpolation between loops. Apexes were **not** raised to eat the 0.684 s.

| Interval | Official | Implied on this `s` | Note |
| --- | ---: | ---: | --- |
| Full lap | 81.786 | 82.470 | +0.684 |
| I1 → I2 (Roggia + Lesmos + run to Ascari) | 27.706 (S2) | 27.791 | +0.085; lengths 1823 vs 1832 m |
| S/F → I1 | 26.817 (S1) | 23.037 | FIA S1 is 2.061 km; our I1 is 1.608 km |
| I2 → S/F | 27.263 (S3) | 31.642 | FIA S3 is 1.909 km; our I2→S/F is 2.353 km |

## Corner table (sourced vs JSON)

Speeds km/h. `s` copied from `monza.json`. `brakeΔ` = `apexS − brakePointS`.

| id | sourced entry → apex → exit | JSON | brakeΔ (m) | conf | Why |
| --- | --- | --- | ---: | --- | --- |
| rettifilo | ST **334** (this lap); FastF1 peak **342** @ ~400 m; min **71** in 1st; Brembo sim 318→87 in **153 m** / 3.22 s / 3.8 g; FP2 top-7 min 68–73 (Hamilton 82); FormulaDream “little over 100 m” for the violent part of the stop | 334 / **71** / 165 | 153 | **high** | Slower of T1/T2. T2 is already accelerating (~90–130). Gear 1 matches FormulaDream (Rettifilo still needs 1st in 2026). |
| biassono | FastF1: full throttle, 300–308, **no** brake/lift. Track-guide “flat ~320” is 2025-era / generic | 305 / **305** / 307 | 0 (no stop) | **high** | Still climbing out of Rettifilo at the geometric apex. |
| roggia | SpeedI1 **308**; Brembo 2026 T4 brake **121 m** (was 107 m in 2025); FP2 top-7 297→**112**; first valid FastF1 min after dropout **118**; FormulaDream Q3 “118 through the first chicane” is the same number — we treat it as **this** chicane min, not T1 (T1 is 71) | 308 / **118** / 168 | 121 | **medium** | Dropout + one published 118. Gear 2 on the first clean samples. |
| lesmo1 | FastF1 brake-on **232**, min **205** in 5th; FP2 top-7 239→203 (Antonelli 210, Verstappen 196) | 232 / **205** / 218 | 83 | **high** | Short brake, not a lift. |
| lesmo2 | FastF1 brake-on **239**, min **184** in 4th; FP2 top-7 236→182 | 239 / **184** / 218 | 89 | **high** | Harder than Lesmo 1. |
| serraglio | FastF1: no brake/lift, speed climbing 295→320 through the kink toward I2 **327** | 308 / **308** / 320 | 0 (no stop) | **high** | Named by the circuit, not an F1 T-number. |
| ascari | SpeedI2 **327**; FastF1 brake-on **316**, min **186** in 4th; FP2 top-7 314→189 (Antonelli 197, Verstappen 182) | 316 / **186** / 235 | 123 | **high** | Slower of the L–R–L (first left / Vialone = our `s`). |
| parabolica | FastF1 opposite-straight peak **319**, lift/harvest, brake-on **293**, min **211** in 5th; FormulaDream Q3 Gasly **211** (highest of top seven); PlanetF1: 8 km/h faster than Russell at the apex after harvesting before the corner; SpeedFL **287** | 293 / **211** / 248 | 129 | **high** | Two independent 211s. |

### Straights

| Item | Value | Source |
| --- | --- | --- |
| Main-straight peak | **342** km/h at `s = 400` | FastF1 car_data max on the pole lap |
| Speed trap (190 m before T1) | **334** km/h at `s = 432.279` | official SpeedST on this lap |
| Brake to Rettifilo | `s = 469.279` (~472 m from S/F) | Brembo 153 m; [sportsorca](https://sportsorca.com/f1/italian-grand-prix-brake-management/) “~472 m pole to first brake” |
| I1 / run to Roggia | **308** km/h | official SpeedI1 |
| Back-straight peak toward Ascari | **327** km/h at I2 (`s = 3440.29`); FastF1 saw **331** just before | official SpeedI2 |
| Opposite straight (after Ascari) | **319** km/h then harvest | FastF1; PlanetF1 energy note |
| S/F | **287** official; samples wrap **288 / 288** | SpeedFL; telemetry end ~286–290. First FastF1 sample of the lap was 303 (tow / merge); we close on the **finish** of this push lap |

## Confidence legend

- **high** — official loop or clean FastF1 event on this lap, cross-checked with FormulaDream / Brembo / FIA.
- **medium** — Roggia only: timing dropout; 118 km/h is the first valid sample plus a published Q3 min.

## What we did not do

- No `monza.json` edits.
- No 2025 DRS trap speeds mixed into the 2026 envelope.
- No sim-estimated apexes (iRacing / ACC unused).
- No raw FastF1 CSV in the repo.
- No wet / race / in-lap traces.
- Brembo T1 87 km/h and FP2 Hamilton 82 are cited as context; the locked apex is Gasly’s **71**.

## Regenerating samples

```bash
python3 scripts/build_monza_speeds.py
```

Writes `src/tracks/monza.speeds.json` and `docs/research/monza-speeds-vs-s.png`.
