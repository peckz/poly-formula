# Monza barriers — format v1 research notes

Data file: [`src/tracks/monza.barriers.json`](../../src/tracks/monza.barriers.json).
Frame: [`src/tracks/monza.json`](../../src/tracks/monza.json) / [`docs/research/monza-notes.md`](monza-notes.md).
Scenery (stand ids, pit complex): [`src/tracks/monza.scenery.json`](../../src/tracks/monza.scenery.json) / [`docs/research/monza-scenery-notes.md`](monza-scenery-notes.md).
Schema: scenery format v1 ([`docs/scenery-format.md`](../scenery-format.md)) with the barrier differences below.
Plot: [`monza-barriers-overview.png`](monza-barriers-overview.png) (`+x` right, `−z` up the page).

Query date: 2026-09-12. Overpass (kumi.systems) planet timestamp: `2026-07-24T11:04:51Z`. Relation 284565 is still v33. The scenery extract (overpass-api.de, same day as this file) is newer; barrier ways used here predate both.

## Schema vs scenery v1

Reused wholesale: `formatVersion`, `trackId` `monza`, `units`, `frame`, `controlPoints`, file-level `source`, `features`, exactly one geometry key, per-feature `source`.

| Difference | Barriers file |
| --- | --- |
| `kind` | `guardrail` · `concrete-wall` · `tyre-barrier` · `tecpro` · `debris-fence` · `spectator-fence` · `gravel-trap` · `wall` · `fence` |
| `alongTrack` keys | `{fromS, toS, side, offsetM, widthM?}` — same envelope as scenery `s0`/`s1`, renamed so a consumer can tell the files apart |
| 8 m scenery clearance | **Does not apply.** No feature may sit closer to the centreline than local half-width (~5.5 m asphalt + kerbs ≈ **6.7 m**). File minimum: **7.0 m** (`gravel-trap-rettifilo-cut-strip-right`) |
| Optional fields | `heightM` + `heightEstimated`, `rowsOfTyres`, `behind` (id of the feature this one sits behind) |
| `wall` / `fence` | Only when the product is unknown. This file uses `wall` once (OSM `barrier=wall`, no material). Generic `fence` is unused — OSM `fence_type=chain_link` is `spectator-fence` |

Prefer `alongTrack` for published / gap-fill envelopes. `polyline` is used only when OSM has the line (way id + approx `s` range on the feature `source`).

## Licences

| Layer | Licence | Use in this file |
| --- | --- | --- |
| OpenStreetMap ways / tags | © OpenStreetMap contributors, [ODbL](https://www.openstreetmap.org/copyright) | All `polyline` geometry. Every OSM feature `source.license` is `ODbL`. |
| Track + scenery files | ODbL (same stitch / footprints) | Frame, heading, T1 control point, stand ids, pit-lane way 38168747 |
| FIA 2026 Italian GP Race Director’s Competition Notes, §25–27 | FIA decision document | 2026 wall + debris fence (main-straight left); T5 LHS gravel→asphalt; new fences T10–T11 left; T1–T2 and T4–T5 escape-road rules |
| [monzanet.it modernization](https://www.monzanet.it/en/the-future-of-f1-starts-from-monza/) + [PlanetF1 2024-01-09](https://www.planetf1.com/news/monza-track-changes-2024-underway) + [grandprix.com gravel return](https://www.grandprix.com/news/monza-goes-back-to-gravel-run-off-areas.html) | Circuit / press | 2024 Rettifilo and Roggia gravel return |
| TEC PRO International F1 booklet (2006 first install) | Manufacturer publication | TecPro at Variante della Roggia and Curva Parabolica |
| [GPToday 2017-08-30](https://www.gptoday.net/en/news/f1/230787/monza-strengthens-barriers-in-anticipation-for-2018-cars) | Press | New TecPro at Roggia and Ascari entry/exit; tyre walls + conveyor belts at Lesmos and Ascari |
| SIAS / monzanet procurement 2022-11 (RDA_22-0510, 74× TecPro R-1) | Circuit purchase record | TecPro still on the programme for 2023+; **locations not listed** |
| [F1.com Need-to-Know 2026-09-03](https://www.formula1.com/en/latest/article/need-to-know-the-most-important-facts-stats-and-trivia-ahead-of-the-2026-italian-grand-prix.3R2slU8oSHdeOc5lidJDGy) (Jolyon Palmer) | Series editorial | Ascari gravel if you miss T8/9/10; Parabolica / Alboreto is **tarmac** runoff |
| [Crash.net 2014](https://www.crash.net/f1/news/207418/1/parabolica-gravel-trap-replaced-at-monza) | Press | Parabolica gravel removed (still gone in 2026 notes) |
| Wikipedia *Monza Circuit* + sportchaos Monza guide | Secondary | Lesmo 1/2 outside → gravel |
| Esri / Google / Bing / onboard video | — | **Not traced.** Onboard/press used only to confirm *attributes* (gravel vs asphalt, TecPro vs tyre) where a citation exists. No ring was digitised from pixels or video. |

## Transform proof (must match the track file)

Copied from the track / scenery notes, **not re-fit**:

1. Origin = OSM node **1828499259** @ **45.6189632, 9.2811729**.
2. WGS84 ECEF → ENU at that origin (`a = 6378137` m, `f = 1/298.257223563`).
3. Heading = published pair `(east, north) = (0.120807, 0.992676)` ≈ **6.94° east of north**.
4. Rotate with the format v1 matrix so heading is `−z` and driver-right is `+x`. Flatten `y = 0`.

| Control point | Track file | Independent OSM transform | Error |
| --- | --- | --- | ---: |
| S/F node 1828499259 | `(0, 0)` | `(0.000, 0.000)` | **0.000 m** |
| T1 apex, centreline `s = 622.279` | `(−15.999, −621.625)` | nearest vertex of way **179968242** is `(−15.999405, −621.625197)` | **0.0005 m** |

Both are inside the 5 m window. The file `controlPoints` copy the track sample (error 0 by construction). The OSM residual is the independent proof.

**Side convention in this frame (checked against scenery, not assumed):** racing from S/F is `−z`. Palazzina Box / Hospitality / pit lane sit at **`+x` = driver-right**. Tribuna Centrale / Piscina / Laterale sit at **`−x` = driver-left**. The pit wall is therefore `side: "right"`. The 2026 “left-hand side of the main straight” wall is `side: "left"` (tribune side).

## Method

1. **Overpass** bbox `45.605–45.635 N, 9.27–9.30 E`: `barrier=*`, plus `surface=gravel|fine_gravel|compacted` and `landuse=grass` (runoff candidates). Endpoint `https://overpass.kumi.systems/api/interpreter`. 309 elements (257 ways, 52 nodes).
2. Project every near way onto the published centreline (same ECEF→ENU→rotate). Keep OSM **polylines** when `barrier` is `guard_rail`, `fence`, or a usable `wall` and vertices stay ≥ 6.7 m from the centreline.
3. **alongTrack fills** for the rest of both sides (FIA Grade 1 continuous lateral protection). Offsets on the pit-straight left are calibrated from OSM guard_rail (~9.5–11 m); elsewhere they are estimated and flagged.
4. **Typing** from FIA / monzanet / TEC PRO / GPToday / F1.com — never from traced video. Where the product is unnamed, the feature is estimated or omitted.
5. Cross-ref `monza.scenery.json` grandstand ids for debris-fence envelopes in front of roofs.

Partial OSM coverage is expected. Gap-fills are honest `source.kind: derived-gap-fill` with `offsetEstimated: true`.

## OSM capture (way ids)

### Used as `polyline`

| Way | OSM tag | Kind | Approx `s` (m) | Side | Min dist (m) |
| ---: | --- | --- | --- | --- | ---: |
| 243090151 | `guard_rail` | guardrail | 2–173 | left | 9.8 |
| 243090145 | `guard_rail` | guardrail | 173–265 | left | 9.5 |
| 243090146 | `guard_rail` | guardrail | 5641–2 (wrap) | left | 9.6 |
| 243090144 | `guard_rail` | guardrail | 5535–5642 | left | 9.6 |
| 243090139 | `guard_rail` | guardrail | 5486–5536 | left | 9.9 |
| 243090143 | `guard_rail` | guardrail | 5278–5481 | left | 10.0 |
| 243090150 | `wall` | concrete-wall | 5389–22 (wrap) | right | 12.3 |
| 243090149 | `fence` / chain_link | spectator-fence | 34–127 | left | 17.1 |
| 243090147 | `fence` / chain_link | spectator-fence | 5279–5468 | left | 17.8 |
| 1409146336 | `fence` / chain_link | spectator-fence | 5470–5497 | left | 11.1 |
| 1409146330 | `fence` / chain_link | spectator-fence | 5434–5520 | left | 11.5 |
| 1304624805 | `fence` / chain_link / metal | spectator-fence | 2738–3292 | left | 10.6 |
| 193475069 | `wall` (no material) | wall | 1569–2132 | left | 16.1 |

OSM maps **six** `guard_rail` ways, all on the pit-straight / Parabolica-exit **left**. There is **no** OSM `guard_rail` on the rest of the GP lap. That is why the spine is mostly `alongTrack`.

### Recorded, not used as GP furniture

| Way | Why omitted |
| ---: | --- |
| 1304624806 | `barrier=wall`, 1089 m. Oval / Sopraelevata retaining wall. One vertex is **1.11 m** from the GP centreline at the north underpass (`s ≈ 3292`) where the banking crosses over the ribbon — already scenery `banking`, not a GP catch fence. T1-infield vertices (12–37 m right, `s ≈ 447–676`) belong to the same oval wall. |
| 34405198 | 3.3 km park fence; only three vertices within 40 m (overlaps 1304624805). |
| 193475075 / 193475055 / 24218706 / 193495366 | Park / perimeter walls, mostly > 20–60 m (Biassono–Lesmo woods). |
| 12648707, 219396373 | Named Paddock 2 / Paddock 1 enclosures (28 m / 52 m). Not track-edge furniture. |
| 243215081/082/083, 243090140, 1304624808 | Short paddock / connector fences. |
| `landuse=grass` 231260685, 231265134/136/137, 231260683, 231262584/586, 231265138, 231260686 | Grass runoff polygons next to T1, Roggia, Lesmi, Ascari, back straight. **Not** `surface=gravel`. 2024 gravel is not in OSM. Used only as a hint that runoff exists; gravel traps are published envelopes. |
| `surface=gravel` paths 51791412, 193647802, 124359965, 133535003 | Service / farm tracks (Cascina Pirotta, etc.), not FIA traps. |
| Raceways (`sport=motor` / `highway=raceway`) | Track / pit / oval / junior — not barriers. Way **179968242** used only for the T1 control-point residual. Way **38168747** (pit lane, mean ~11 m right) used only to place the pit-wall envelope. |

Nodes tagged `barrier=gate` (pit-exit / park gates) are listed under omissions.

## Priority coverage

### 1. Corner protection

| Corner | `s` apex | Gravel | Energy absorber | Debris / fence | Honesty |
| --- | ---: | --- | --- | --- | --- |
| Rettifilo T1/T2 | 622 | Yes — outside T1 (right), T1–T2 / escape (left), narrow infield strip (right). 2024 return. | `tyre-barrier` at the back of both beds — **product estimated** (2017 article names Lesmo / Ascari / Roggia, not Rettifilo) | In front of Prima Variante Esterna (left) and Alta Velocità (right) | FIA §25.1 polystyrene rows on the escape road are **not** a barrier kind — omitted |
| Biassono / Grande | 1106 | No sourced gravel bed | Guardrail both sides | Catch fence both sides (no permanent tribune in scenery) | OSM has no `guard_rail` here |
| Roggia T4/T5 | 1838 | Yes — T4 outside (left), T5 outside / miss (right), T5 LHS remainder (left, offset stepped out after 2026 asphalt patch) | `tecpro` both sides (2006 first install + 2017 refresh) | In front of tribuna n° 9 / 10 | 2026: first part of T5 LHS gravel → asphalt |
| Lesmo 1 | 2210 | Yes — outside (right) | `tyre-barrier` 3 rows (2017) | — | Secondary gravel cite (Wikipedia / guide) |
| Lesmo 2 | 2583 | Yes — outside (right) | `tyre-barrier` 3 rows (2017) | OSM chain-link 1304624805 begins ~s 2738 (park, left) | Same |
| Serraglio / underpass | 2995 / 3298 | No | Guardrail both sides at 8.5 m | OSM spectator fence left | Oval wall 1304624806 omitted |
| Ascari T8/T9/T10 | 3650 | Yes — T8 left, T9 right, T10 left (Palmer 2026 + 2025 loose-gravel reports) | `tecpro` entry + exit (2017); `tyre-barrier` T9 (2017) | In front of tribuna n° 12–16, 18–19, Museo | Quality over perimeter |
| Parabolica / Alboreto | 4865 | **None** — tarmac runoff since 2014 (Palmer 2026 still) | `tecpro` outside (right), 2006 first install | Laterale Parabolica n° 21 + tribuna n° 22 (left); Gradinate Traguardo / interna n° 23 (right) | Do not invent gravel |

### 2. Straights

Continuous `guardrail` both sides as `alongTrack` fills wherever OSM is silent. Offset ~8.8–9.2 m on the ribbon (estimated), ~23–38 m when the rail sits **behind** a gravel / TecPro / tyre envelope. Pit-straight left also has the six OSM `guard_rail` polylines.

High-speed catch fence: pit straight (both sides), Curva Grande (both sides), back straight left is the 2026 T10–T11 fence.

### 3. Pit wall / entry / exit

- `concrete-wall-pit-wall-right-a/b` + matching `debris-fence`, driver-**right**, `s = 5380–5793` and `0–380`, offset **7.6 / 7.9 m** (estimated from pit-lane OSM ~11 m and half-width 6.7 m).
- OSM wall **243090150** (four vertices, ~12–14 m right at S/F) is the hospitality / box face fragment, not the full wall.
- **Pit entry** (right, ~`s 5200–5380`): opening in the concrete wall. Gradinate Traguardo debris fence still covers the stand face (`s 5100–5340`); the wall itself starts at 5380. Explained gap.
- **Pit exit** (right, ~`s 380–400`): ~20 m gate between pit wall and the T1-approach rail. Explained gap.
- 2026 FIA: new wall + debris fence on the **left** of the main straight — `concrete-wall-2026-main-straight-left-*` at 10.8 m (outside the OSM Armco) plus debris fence at 11.2 m.

### 4. Debris fencing vs scenery stands

| Barrier id | Scenery stand ids |
| --- | --- |
| `debris-fence-2026-main-straight-left-*` | `tribuna-centrale-193647796` (n° 1), `tribuna-laterale-sinistra-193647795` (n° 4), `tribuna-piscina-231257063` (n° 5), `tribuna-laterale-destra-34404645` (n° 26), `tribuna-vedano-231026020` (n° 24) |
| `debris-fence-grandstand-1529562455-left` | `grandstand-1529562455` |
| `debris-fence-traguardo-sf-right` | `tribune-194742580` (Gradinate Traguardo 2e/3f) |
| `debris-fence-alta-velocita-right` | `tribuna-alta-velocità-231026018/024/025` (n° 6) |
| `debris-fence-rettifilo-esterna-left` | `tribuna-prima-variante-esterna-231026019` (n° 8), `grandstand-561721691` |
| `debris-fence-roggia-stands-right` | `tribuna-seconda-variante-231265139` (n° 9), `tribuna-roggia-231265140` (n° 10) |
| `debris-fence-ascari-stands-right` | n° 12–16, 18–19, Museo (`231026027`, `194457674`, `194457677`, `194457685`, `231260684`, `194457688`, `194457680`, `194457686`) |
| `debris-fence-laterale-parabolica-left` | Laterale Parabolica n° 21 (`194457679/667/675/672/692`) |
| `debris-fence-parabolica-left` | `tribuna-parabolica-179794158` (n° 22) |
| `debris-fence-traguardo-right` | unnamed Traguardo cluster + Parabolica interna n° 23 |

Biassono and Lesmo have **no** OSM grandstand (see scenery notes) — no stand-front debris envelope there.

### 5. Perimeter spectator fence

Only where it reads from the ribbon: OSM chain-link on the park side of Lesmo 2 → underpass, Parabolica-exit left, and a short piece behind Centrale. The 2026 T10–T11 left fence is `spectator-fence` (the FIA note says “fences”, not debris fence). Far paddock / park walls are omitted.

## Minimum centreline distance

| Rule | Value |
| --- | ---: |
| Local half-width + kerbs (this file) | **6.7 m** |
| Minimum of any feature | **7.0 m** (`gravel-trap-rettifilo-cut-strip-right`) |
| Closest OSM polyline | **9.5 m** (guard_rail 243090145) |
| Pit wall offset | **7.6 m** (estimated) |
| 8 m scenery rule | not applied |

No feature overlaps the racing surface.

## Acceptance checklist

| Test | Result |
| --- | --- |
| Same frame / `trackId` | `monza`; published heading pair |
| Control points < 5 m | S/F **0.000 m**; T1 **0.000 m** vs track sample; OSM T1 residual **0.0005 m** |
| Both sides, no unexplained gap > ~50 m | **Pass.** Coverage bins 5 m. Explained openings: pit entry (right, wall starts 5380), pit exit (right, ~20 m), gravel-only depth is not a gap (rail sits behind) |
| Every feature has `source` | **Pass** |
| Estimates flagged | `offsetEstimated` / `estimated` / `heightEstimated` / `widthEstimated` |
| One geometry key | 75 `alongTrack`, 13 `polyline`, 0 `polygon` |
| No traced commercial geometry | **Pass** |
| Barriers ≥ local half-width | **Pass** (min 7.0 m) |

## Intentionally omitted

- **Parabolica gravel** — removed 2014, still asphalt in 2026 F1.com notes.
- **T1 TecPro as a cited product** — not named in 2006 / 2017 / FIA 2026 docs. End-of-runoff stack is an estimated tyre wall.
- **Polystyrene escape-road blocks** (FIA §25.1, four rows, T1–T2) — no matching kind; not tyres.
- **Kerbs, marshal posts, light panels, DRS / Straight Mode, braking boards** — not barriers.
- **Oval / Sopraelevata wall 1304624806** — scenery banking.
- **West-park and paddock enclosures** beyond ~40 m.
- **Per-vertex elevation** — `y = 0`.
- **Onboard video geometry** — attributes only; no timestamps were used to place metres.

## Approximations

- Almost all `alongTrack` offsets and widths are estimated. OSM rails on the pit-straight left are the only surveyed lateral distances (~9.5–11 m).
- Gravel envelopes are stations + depth, not cadastral beds. 2024 gravel is **absent** from OSM (`landuse=grass` remains).
- TecPro / tyre lengths are corner-scale, not module counts (except SIAS “74 R-1” with no map).
- Heights: Armco 0.8 m, pit/2026 wall 1.2 m, TecPro 1.1 m, debris fence 3.0 m, spectator fence 2.0 m, tyres 0.8 m × `rowsOfTyres`. All `heightEstimated`.
- Guardrail fills behind runoff use `offsetM ≈ gravel.offset + gravel.width` so they do not sit in the bed. They are still a ribbon, not a surveyed transition.
- Low-poly: OSM fences Douglas–Peucker ~2–4 m; `alongTrack` is the intended game primitive.

## Counts (from `metrics`)

| Kind | n |
| --- | ---: |
| guardrail | 40 |
| debris-fence | 15 |
| gravel-trap | 11 |
| spectator-fence | 6 |
| concrete-wall | 5 |
| tecpro | 5 |
| tyre-barrier | 5 |
| wall | 1 |
| fence | 0 |
| **total** | **88** |
