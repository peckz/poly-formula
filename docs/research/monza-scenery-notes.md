# Monza scenery — format v1 research notes

Data file: [`src/tracks/monza.scenery.json`](../../src/tracks/monza.scenery.json). Spec: [`docs/scenery-format.md`](../scenery-format.md). Track frame: [`src/tracks/monza.json`](../../src/tracks/monza.json) / [`docs/research/monza-notes.md`](monza-notes.md).

Query date: 2026-09-12. Overpass (overpass-api.de) planet timestamp: `2026-09-12T12:13:56Z` (core) / `2026-09-12T12:12:53Z` (landcover). Same day as the track extract on kumi (`2026-05-06`); relation 284565 is still v33.

## Licences

| Layer | Licence | Use in this file |
| --- | --- | --- |
| OpenStreetMap ways, nodes, relations, tags | © OpenStreetMap contributors, [ODbL](https://www.openstreetmap.org/copyright) | **All geometry.** Every feature `source.license` is `ODbL`. |
| Track file `monza.json` | ODbL (same OSM stitch) | Frame, heading, T1 control point, 8 m clearance test |
| [monzanet.it — tribune list](https://www.monzanet.it/tracciato-pista-monza/) | Circuit publication | Official tribune numbers (`officialRef`) and the named-programme checklist |
| [monzanet.it — Sopraelevata](https://www.monzanet.it/sopraelevata-monza/) | Circuit publication | Ring length 4250 m; max banking **80%**; two ~320 m radii; 875 m straights |
| 1955 Beri / Di Renzo section (five strips 1.75 + 1.95 + 2.25 + 2.70 + 3.35 m = **12 m**) as reported by historical summaries of that drawing | Secondary citation of the original section | `widthM: 12` on the banking polyline (OSM has no `width` tag) |
| Esri World Imagery (`server.arcgisonline.com` MapServer export, 2026-09-12) | Esri / imagery providers | **Verification and height/colour estimates only. Not traced.** |
| Google / Bing | — | **Not used.** |

No commercial-aerial ring or polyline was digitised.

## Transform proof (must match the track file)

Copied from the track notes, then recomputed independently:

1. Origin = OSM node **1828499259** @ **45.6189632, 9.2811729**.
2. WGS84 ECEF → ENU at that origin (`a = 6378137` m, `f = 1/298.257223563`).
3. Heading from the origin along Rettifilo di partenza (way **19842206**), first vertex ≥ 20 m in the racing direction (stored way order, step +1, S/F at vertex index 1 of 7): vertex **45.6195721, 9.2812785** at 68.17 m. Unit ENU `(east, north) = (0.120807108, 0.992676001)` ≈ **6.9387° east of north**.
4. Published track-notes pair `(0.120807, 0.992676)` differs by **< 1.1×10⁻⁷**. The scenery file **uses the published pair** so the frame is identical, not a second fit.
5. Rotate with the format v1 matrix (`x = hn·e − he·n`, `z = −(he·e + hn·n)`). Flatten `y = 0`.

| Control point | Track file | Independent OSM transform | Error |
| --- | --- | --- | ---: |
| S/F node 1828499259 | `(0, 0)` | `(0.000, 0.000)` | **0.000 m** |
| T1 apex, centreline `s = 622.279` | `(−15.999, −621.625)` | nearest vertex of way **179968242** Variante del Rettifilo is `(−15.999405, −621.625197)`; chord residual to the track sample | **0.0004 m** |

Both are inside the 5 m acceptance window. T1 in the scenery `controlPoints` is copied from the track sample (error 0 by construction); the OSM residual is the independent proof that the same heading maps the chicane onto that sample.

## Imagery verification (Esri, not traced)

Tiles were exported around the track-frame corners (≈150–220 m half-width, north-up WGS84). Used only to confirm that OSM objects exist and to estimate height/colour.

| Area | What the tile shows | OSM coverage |
| --- | --- | --- |
| S/F / pits | Pit straight, large white roofs (Centrale / hospitality / pit complex), paddock apron, a pool in the trees west of the straight (namesake of Tribuna Piscina) | Named stands + Palazzina Box, Hospitality, Podio, Centro Medico, Vecchie rimesse, garage blocks, Paddock 1/2 |
| Rettifilo / T1 | First-chicane asphalt, long grey roofs west (Alta Velocità) and east (Prima Variante Esterna), woods | Ways 231026018/024/025, 231026019 |
| Biassono | Curva Grande, runoff, woods, village edge. **No permanent tribune roof** in the 180 m window | No OSM `building=grandstand` within 120 m. **Omitted** (not alongTrack) |
| Roggia | Second chicane, small dark roof on the outside of the runoff, woods | Tribuna Seconda Variante + Tribuna Roggia |
| Lesmo 1 / 2 | Corners, runoff, woods, distant industrial / golf. **No permanent tribune** | **Omitted** |
| Ascari | Chicane, two dark rectangular roofs on the outside, woods | Tribuna Ascari / Uno / Due / Tre / Uscita A–B / Amici / Museo |
| Parabolica | Covered stand with the Italian-flag runoff paint (n° 22), infield parking + a small marked loop, woods | Tribuna Parabolica, Laterale Parabolica ×5, Parabolica interna ×2, Piazzale Parabolica, Tondo |
| Oval north / s≈3298 | Pale concrete **Sopraelevata Nord** crossing **over** the dark GP asphalt (underpass) | Banking polyline; track landmark `oval-north-underpass` |

Height estimates (all `heightEstimated: true`): covered main stands ~12–14 m; uncovered bleachers ~7–8 m; Palazzina Box / hospitality / podium 10–18 m; forest canopy 18 m. Colour hints are pale concrete / white roofs / dark canopy / weathered banking concrete from these tiles, all `colorEstimated: true`.

## Feature programme

### Grandstands (41)

OSM `building=grandstand` in bbox 45.605–45.635 N, 9.27–9.30 E: 44 ways. Three unnamed ways farther than 120 m from the GP centreline were dropped (233132517 @ 511 m; 338984705 @ 143 m; 338984712 @ 284 m) — they are not circuit tribunes on the Esri crops.

Official list from monzanet.it vs this file:

| Official | OSM | In file |
| --- | --- | --- |
| Tribuna Centrale n° 1 | way 193647796 | yes |
| Gradinate Traguardo 2e, 3f | unnamed `Tribune` way 194742580 at s≈102 m (outside pit straight) | yes, unnamed |
| Tribuna Laterale Sinistra n° 4 | way 193647795 | yes |
| Tribuna Piscina n° 5 | way 231257063 | yes |
| Tribuna Alta Velocità A–B–C n° 6 | ways 231026018, 231026024, 231026025 | yes (three footprints) |
| Tribuna Esterna Prima Variante A–B n° 8 | way 231026019 | yes |
| Tribuna Seconda Variante n° 9 | way 231265139 | yes |
| Tribuna Roggia n° 10 | way 231265140 | yes |
| Tribuna Ascari Tre / Due / Amici / Uno / Ascari n° 12–16 | ways 231026027, 194457674, 194457677, 194457685, 231260684 | yes |
| Tribuna Uscita Ascari A–B n° 18–19 | ways 194457688, 194457680 | yes |
| Tribuna Uscita Ascari C n° 20 | no OSM name | **missing name** — may be an unnamed `Tribune` or absent |
| Tribuna Laterale Parabolica A–E n° 21 | five named ways | yes |
| Tribuna Parabolica n° 22 | way 179794158 | yes |
| Tribuna Parabolica Interna A–B n° 23 | ways 194457681, 194457691 | yes |
| Tribuna Vedano n° 24 | way 231026020 | yes |
| Tribuna diversamente abili n° 25 | no OSM name | **omitted** |
| Tribuna Laterale Destra A–B–C n° 26 | way 34404645 (one footprint) | yes |
| Gradinate Traguardo 27D–30 | cluster of unnamed `Tribune` ways at s≈5120–5230 m (Parabolica exit / pit-straight entry, +x) | yes, unnamed |
| Tribuna Museo | way 194457686 | yes (not on the numbered list; OSM name kept) |

Priority names Centrale, Rettifilo (pit-straight + Prima Variante), Roggia, Ascari, Parabolica in/out are present. **Biassono** and **Lesmo** have no OSM grandstand and no permanent roof on Esri — not invented as `alongTrack`.

### Pit / paddock (15)

| OSM | Name | Role |
| --- | --- | --- |
| 34404652 | Palazzina Box | Pit building |
| 194458105 | Hospitality Building | Hospitality (outside, +x at S/F) |
| 219396377 | Podio | Podium tower; OSM also `bridge=yes` |
| 194458108 | Centro Medico | Medical centre |
| 193647797 | Vecchie rimesse | Old garages |
| 194458106 | `building=roof` | Paddock roof (~36 m from centreline) |
| 193647799–800, 194739930–935, 194751178 | unnamed `building=yes/commercial` | Garage / paddock blocks between the two straights |

**Not in OSM by name:** Direzione Gara / race control, media centre. They are almost certainly inside Palazzina Box or Hospitality; not given a guessed footprint.

### Banking (1)

Stitched OSM raceways: Sopraelevata Nord (19982933, 34404730, 725687994, 725687995, 1313097098), Sopraelevata Sud (19983025, 34404638, 231256009, 1313098145, 1313098146), Rettilineo anello alta velocità (231256008), Anello alta velocità bridge (34404729).

| Check | Value |
| --- | --- |
| Mapped ribbon length | **3594 m** (33 vertices after 4 m simplify) |
| Published 1955 ring | **4250 m** (monzanet) |
| End-to-end gap | **664 m** |

The gap is the **west** high-speed-ring lane (historically beside the pit straight). OSM does not map that lane as `highway=raceway`. The gap was **not** closed from aerial. North-bank crossing of the GP track matches landmark `oval-north-underpass` at s = 3297.975 m (Esri: concrete over asphalt).

`widthM = 12` (1955 section). `bankMaxPct = 80` (monzanet). `widthEstimated = false`.

### Forest (18)

Union of `landuse=forest` / `natural=wood` ways and relation outers in the bbox (101 usable rings). Derived steps: union → clip to ±2 km of origin → **8 m difference vs the GP centreline** → keep the largest parts (18 polygons, ≥ ~8 000 m², 10 m simplify, ≤ 48 verts). Inners omitted (v1 has no holes). Canopy height 18 m estimated.

### Other aerial-visible (sourced)

| Kind | What |
| --- | --- |
| parking | Paddock 1, Paddock 2, Porta Vedano, Piazzale Parabolica |
| service-road | Viale dei Box (two OSM way segments) |
| helipad | way 231452149 (paddock). Way 880939152 `ref=CLA.1` is ~2 km east of S/F (town / private pad) and was dropped. |
| gate | Porta Vedano, Porta di Santa Maria alle Selve, Porta di San Giorgio, Porta di Biassono, Ingresso della Collinetta di Vedano (2 m marker squares on OSM nodes) |
| bridge | Pit-straight footbridges 194458112/113/219396384; Ponte dei Bertoli |
| water | way 299012314; Pozza umida “Matteo Barattieri” |
| other | Camping Autodromo (`disused:tourism=camp_site`); Tondo (OSM raceway loop at the east oval / Parabolica infield) |
| building | Padiglione Esposizioni; PalaRovagnati; Villa Mirabello; Villa Mirabellino |
| hedge / treeline | OSM `barrier=hedge` / `natural=tree_row` within 180 m of the centreline and ≥ 40 m long (6 ways) |

Esri shows a small marked loop inside Piazzale Parabolica that is **not** OSM `sport=karting`. Not traced.

## Acceptance checklist

| Test | Result |
| --- | --- |
| `trackId` = track `id` | `monza` |
| Same frame object | yes |
| Control points < 5 m | S/F **0.000 m**; T1 **0.000 m** vs track sample; OSM T1 residual **0.0004 m** |
| ≥ 8 m clearance except bridge / banking | **Pass.** Minimum among non-exempt features is **8.0 m** (forest clip boundary). Closest building: Podio 8.62 m. Closest grandstand: Parabolica interna 13.72 m. No violations kept. |
| Polygons closed, CCW from +y, simple | **Pass** (0 issues) |
| Exactly one geometry key | **Pass** |
| Every feature has `source` | **Pass** |
| Named grandstands + pit complex | **Pass** for OSM-named programme; Biassono / Lesmo / n° 20 / n° 25 documented omissions |
| No traced commercial imagery | **Pass** |

`alongTrack` is unused: every included footprint or ribbon is OSM.

## Intentionally omitted

- **Biassono and Lesmo permanent tribunes** — none in OSM, none on Esri in the corner windows. General-admission slopes only.
- **Tribuna n° 20 (Uscita Ascari C)** and **n° 25 (diversamente abili)** — no OSM name.
- **West oval lane** (~664 m) — not mapped; not invented.
- **Villa Reale axis** — Villa Reale is ≈ 2.8 km south of S/F, outside the 1.5 km / bbox window. Villa Mirabello / Mirabellino (in the park) are included.
- **Race control / media** as separate buildings — no OSM name.
- **Kart circuit** as `sport=karting` — none in the bbox. Tondo is the only named infield loop.
- **Junior raccordo, Ex Circuito Pirelli, GP raceway, pit lane** — track or historic raceway, not scenery (except Tondo as `other`).
- **Crash fencing, tyre walls, kerbs, braking boards, marshal posts, DRS** — not sourced here. GP-lap barriers are a separate file: [`monza.barriers.json`](../../src/tracks/monza.barriers.json) / [`monza-barriers-notes.md`](monza-barriers-notes.md).
- **Per-vertex elevation** — OSM footprints are flat; `y = 0`.
- **Forest inner rings / holes** — v1 has no holes.
- **Unnamed grandstands > 120 m from the centreline** and one `building=roof` 833 m away (not paddock).

## Approximations

- Heights and `colorHint` are estimates from typical stand sections plus Esri roof colour. Always flagged.
- Forest is a simplified, clipped union, not a cadastral wood map.
- Gate nodes are 2 m marker squares.
- Tondo `widthM = 8` and service-road / bridge widths are estimated (no OSM `width`).
- Banking width is the 1955 design width, not a 2026 survey of the ruined deck.
- Paddock unnamed `building=yes` blocks are included because they sit in the S/F / opposite-straight paddock; they are not individually named on OSM.

## Counts (from `metrics`)

| Kind | n |
| --- | ---: |
| grandstand | 41 |
| forest | 18 |
| pit-building | 15 |
| gate | 5 |
| parking | 4 |
| building | 4 |
| bridge | 4 |
| hedge | 4 |
| service-road | 2 |
| helipad | 1 |
| water | 2 |
| other | 2 |
| treeline | 2 |
| banking | 1 |
| **total** | **105** |
