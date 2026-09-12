# Monza GP — F1 speed profile research notes

Data file: [`src/tracks/monza.speeds.json`](../../src/tracks/monza.speeds.json).
Track stations: [`src/tracks/monza.json`](../../src/tracks/monza.json) / [`docs/track-format.md`](../track-format.md).
Plot: [`monza-speeds-vs-s.png`](monza-speeds-vs-s.png).
Shared reference: racing-line [PR #7](https://github.com/peckz/poly-formula/pull/7).

Query date: 2026-09-12. Layout: **2024–2026 GP** (current Rettifilo / Roggia / Ascari, flattened 2024 Ascari kerbs, no oval). Integrate on **5793.4 m**.

This file is **facts and citations**. FastF1 was used only to read official F1 live-timing summaries for one lap. No proprietary CSV / raw Hz trace is in the repo.

## Reference lap

| Field | Value | Source |
| --- | --- | --- |
| Driver | **Lando Norris** (McLaren MCL38, #4) | [FIA](https://www.fia.com/news/f1-norris-pole-mclaren-lock-out-front-row-monza-verstappen-seventh) |
| Session | 2024 Italian GP **Qualifying**, Q3 final run, dry, soft, tyre life 2 | FastF1 timing app |
| Lap time | **1:19.327** (79.327 s) | FIA / [Autosport](https://www.autosport.com/f1/results/2024/italian-gp-639981/?st=GRID) (262.896 km/h) |
| Sectors | **26.492 / 26.579 / 26.256** | FastF1; [FIA sector analysis](https://api.fia.com/sites/default/files/2024_16_ita_f1_q0_timing_qualifyingsessionsectoranalysis_v01.pdf) (26.492 @ 324.3, 26.579 @ 338.1, 26.256 @ 315.6) |
| Pole-lap loops | SpeedST **346**, SpeedI1 **324**, SpeedI2 **338**, SpeedFL **315** km/h | F1 live timing via FastF1 |
| Session maxima (Norris) | ST **349.0**, I1 **325.6**, I2 **338.1**, FL **319.3** | [FIA Qualifying Session Maximum Speeds](https://www.fia.com/sites/default/files/2024_16_ita_f1_q0_timing_qualifyingsessionmaximumspeeds_v01.pdf) |
| Session trap leader | Alonso **353.5** km/h (tow) | same FIA PDF |

**Same lap as PR #7.** This speeds PR first committed Pierre Gasly’s 2026 Q3 pole (1:21.786, new-reg, no DRS). It was retargeted so the racing line and the speed envelope describe one car on one weekend. `reference.notes` in the JSON says so.

Onboard used by #7 (speeds cited from timing, not from the video): [F1.com Norris pole onboard](https://www.formula1.com/en/latest/article/watch-ride-onboard-for-norriss-formidable-pole-lap-in-monza-qualifying.4qWIftLYRedtL9ab1Jlt5M). Norris later said he turned in early at T2 and “smashed the inside kerb,” costing ~0.15 s then gained it back at Roggia ([Pit Debrief](https://www.pitdebrief.com/post/norris-i-thought-pole-lap-was-already-over-after-mistake-in-the-first-corner-of-f1-italian-gp-q3/)). Apex speeds are still **this lap’s** FastF1 mins, not a cleaned-up “intended” lap.

## Official loops on this centreline

FIA maps (same T-number offsets in 2024 and 2026):

| Loop | FIA text | Station used here |
| --- | --- | ---: |
| Speed trap | 190 m before T1 | `622.279 − 190 = 432.279` |
| Intermediate 1 | 230 m before T4 | `1838.272 − 230 = 1608.272` |
| Intermediate 2 | 210 m before T8 | `3650.29 − 210 = 3440.29` |
| Finish line | S/F | `0` / `5793.4` |
| Published sector lengths | 2.061 + 1.823 + 1.909 km | FIA surveyed centreline |

On the pole lap, FastF1 clock matches those loops: SpeedI1 324 at t ≈ 26.5 s (still 323–325, brake for Roggia at t = 27.61); SpeedI2 338 at t ≈ 52.85 s (S2 ends 53.07 s); then a lift and brake for Ascari at t = 54.41.

I1→I2 on this polyline is 1832 m vs published S2 1823 m.

## Method

1. Confirm GP layout (same chicanes as `monza.json`; 2024 Ascari kerbs).
2. Lock Norris Q3 pole 1:19.327 to match PR #7.
3. Read that lap’s car_data via FastF1 (speed, brake flag, gear). Identify events **by sequence and official loop times**, not FastF1 `Distance` (integrated distance overshoots ~5.8 km).
4. `brakePointS = apexS − Δ` (wrap 5793.4). Δ from Brembo same-gen T1/T4; from FastF1 (brake-on → min) × mean speed for Lesmos / Ascari / Parabolica.
5. Parabolica and Lesmo 1 use **racing apex** stations from PR #7 (`5065`, `2255`), not the centreline heading peak.
6. Dense `samples` with v² interpolation (`scripts/build_monza_speeds.py`). Straights ≤ 25 m; chicanes / brake zones ≤ 10 m.
7. Integrate `∫ ds/v`. Do **not** raise apexes to eat the time gap.

## Implied lap time

| | seconds |
| --- | ---: |
| Reference (FIA) | **79.327** |
| Implied from `samples` | **81.645** |
| Δ | **+2.318** |

Inside ±3 s. Leftover is OSM centreline vs racing line, Brembo T1/T4 being pre-event simulations, v² interpolation between loops, and a long Parabolica trail (307 → 215 over ~340 m). Apexes were not raised.

| Interval | Official | Implied on this `s` | Note |
| --- | ---: | ---: | --- |
| Full lap | 79.327 | 81.645 | +2.318 |
| I1 → I2 | 26.579 (S2) | 27.038 | +0.459; lengths 1823 vs 1832 m |
| S/F → I1 | 26.492 (S1) | 23.238 | FIA S1 is 2.061 km; our I1 is 1.608 km |
| I2 → S/F | 26.256 (S3) | 31.370 | FIA S3 is 1.909 km; our I2→S/F is 2.353 km |

## Corner table (sourced vs JSON)

Speeds km/h. `s` copied from `monza.json`. `brakeΔ` = `apexS − brakePointS` (Parabolica / Lesmo 1 use racing `apexS`).

| id | sourced entry → apex → exit | JSON | brakeΔ (m) | conf | Why |
| --- | --- | --- | ---: | --- | --- |
| rettifilo | ST **346**; FastF1 peak **347**; min **73** in 2nd; T2 brush 81; Brembo 337→89 in **129 m** / 2.75 s / 4.7 g | 346 / **73** / 160 | 129 | **high** | Slower of T1/T2. 2024 cars stay in 2nd (not 1st). |
| biassono | FastF1 full throttle, 310–325, **no** brake/lift | 318 / **318** / 322 | 0 | **high** | Still climbing; 324 by I1. |
| roggia | I1 **324**; brake-on **317**; min **113** in 3rd (clean); Brembo T4 **107 m** (2025 same-gen) | 317 / **113** / 160 | 107 | **high** | First left of the chicane. |
| lesmo1 | brake-on **263**; min **207** in 5th. PR #7 racing apex **2255** | 263 / **207** / 226 | 102 | **high** | `apexS = 2255`, not heading peak 2210. |
| lesmo2 | brake-on **248**; min **190** in 5th | 248 / **190** / 219 | 73 | **high** | Harder than Lesmo 1. |
| serraglio | no brake/lift; climbing toward I2 **338** | 322 / **322** / 332 | 0 | **high** | DRS-era back section. |
| ascari | I2 **338**; lift then brake-on **296**; min **194** in 5th. PlanetF1: Norris **+9 km/h** vs Verstappen | 296 / **194** / 242 | 104 | **high** | Slower of L–R–L (Vialone / our `s`). |
| parabolica | opposite peak **329**; brake-on **307**; min **215** in 5th. PR #7 racing apex **5065**. PlanetF1: Norris **+10 km/h** vs Verstappen. SpeedFL **315** | 307 / **215** / 256 | 340 | **high** | Min is at the late apex, not `s = 4864` (still ~240 there). |

### Straights

| Item | Value | Source |
| --- | --- | --- |
| Main-straight peak | **347** km/h at `s = 410` | FastF1 car_data max on the pole lap |
| Speed trap | **346** km/h at `s = 432.279` | official SpeedST |
| Brake to Rettifilo | `s = 493.279` | Brembo 129 m |
| I1 / run to Roggia | **324** km/h | official SpeedI1 |
| Back-straight peak toward Ascari | **338** km/h at I2 | official SpeedI2 |
| Opposite straight | **329** km/h then brake | FastF1 |
| S/F | **315** official; samples wrap **316 / 316** | SpeedFL; telemetry start 321 / end 317 |

## Confidence

All eight corners **high**: official loops or clean FastF1 events on this exact lap, cross-checked with Brembo / PlanetF1 / PR #7 stations.

## What we did not do

- No `monza.json` edits.
- No 2026 new-reg speeds left in the envelope (Gasly 1:21.786 is cited only as the discarded first commit).
- No sim-estimated apexes.
- No raw FastF1 CSV in the repo.
- No wet / race traces.

## Regenerating samples

```bash
python3 scripts/build_monza_speeds.py
```

Writes `src/tracks/monza.speeds.json` and `docs/research/monza-speeds-vs-s.png`.
