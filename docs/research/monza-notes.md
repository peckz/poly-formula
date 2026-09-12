# Monza GP — format v1 research notes

Data file: [`src/tracks/monza.json`](../../src/tracks/monza.json). Spec: [`docs/track-format.md`](../track-format.md).

Query date: 2026-09-12. Overpass planet timestamp: `2026-05-06T03:25:00Z` (kumi.systems). OSM relation 284565 is version 33 (2025-10-22); the newest international way in the stitch is way 179968262 (2025-11-26). Both predate the Overpass extract.

## Sources

| Fact | Value | Source |
| --- | --- | --- |
| Official centreline length | **5793 m** | [Autodromo Nazionale Monza — circuit](https://www.monzanet.it/en/circuit/) (“Length : 5793 meters”); FIA 2026 Italian GP race-director maps (“CIRCUIT CENTRELINE LENGTH - 5.793km”), [PDF](https://www.fia.com/system/files/decision-document/2026_italian_grand_prix_-_competition_notes_-_circuit_map_pit_lane_drawing_emergency_exits_map_and_red_zone.pdf); FIA 2025 Monza circuit map, [PDF](https://www.fia.com/system/files/decision-document/2025_monza_event_-_circuit_map_-_monza_2025_0.pdf) |
| Asphalt width | min **10 m**, max **12 m** | [monzanet.it/en/circuit](https://www.monzanet.it/en/circuit/) |
| Direction of travel | clockwise | same |
| Start/finish straight length | **1194.40 m** (end of Parabolica / Alboreto → beginning of First Variant) | same. **Not** copied into the JSON: the published end-points are not the OSM way joins. |
| Corner names and first-turn sense | Rettifilo = tight **right** then left; Biassono / Curva Grande = **right**; Roggia = **left**-right; Lesmo 1 & 2 = **right**; Serraglio = slight **left**, radius > 600 m; Ascari = **left**-right-left (historically Vialone / Platano); Alboreto = former Parabolica, **right** | [monzanet.it/en/circuit](https://www.monzanet.it/en/circuit/) |
| F1 turn count | 11 | [formula1.com circuit guide](https://www.formula1.com/en/latest/article/circuit-guide-everything-you-need-to-know-about-the-autodromo-nazionale-monza.51PKqBRlxNs0fzLWQzsnd0). Serraglio is named by the circuit but is not a separately numbered F1 corner. No F1 T-numbers are stored. |
| FIA sector lengths | 2.061 + 1.823 + 1.909 km | FIA 2026 maps (sum = 5.793 km). **Not** placed on this centreline: the PDF’s “230 m before T4” style offsets need a T-number map we do not have in metres. |
| OSM circuit | relation **284565** “Autodromo Nazionale di Monza” / `name:en=Monza Circuit`, `type=circuit`, Wikidata Q171417 | [openstreetmap.org/relation/284565](https://www.openstreetmap.org/relation/284565) |
| Start/finish | node **1828499259** @ **45.6189632, 9.2811729**, roles `start` and `finish` | [openstreetmap.org/node/1828499259](https://www.openstreetmap.org/node/1828499259) |
| Raceway ways | 20 `highway=raceway` + `importance=international` members; pit way **38168747** (`role=pit_lane`) excluded | relation 284565 members, 2026-09-12 OSM API |
| Surface | `asphalt` on every international way | OSM way tags |
| Underpass | way **1443867793** `covered=yes` (north bank of the high-speed loop) | OSM; narrative match: monzanet Serraglio text (“the next straight crosses, with an underpass, the North bank curve of the high-speed loop”) |

Licence: OpenStreetMap data © OpenStreetMap contributors, [ODbL](https://www.openstreetmap.org/copyright).

## OSM stitch (racing direction)

Relation members are stored **against** `oneway=yes`. The JSON `source.wayIds` list is racing order, starting on the pit straight at the start/finish node and following `oneway`.

| Order | Way | OSM `name` | Notes |
| --- | ---: | --- | --- |
| 1 | 19842206 | Rettifilo di partenza | Contains S/F node (index 1 of 7). Split here. |
| 2 | 179968242 | Variante del Rettifilo | First chicane. Note: “Used only for cars races.” |
| 3 | 179968264 | — | Exit toward Biassono |
| 4 | 179968220 | Curva Biassono | Curva Grande |
| 5 | 179968262 | — | Straight to Roggia |
| 6 | 179968245 | Variante della Roggia | Second chicane |
| 7 | 179968263 | — | To Lesmo 1 |
| 8 | 179968229 | Lesmo 1 | |
| 9 | 179968251 | — | Between Lesmi |
| 10 | 179968230 | Lesmo 2 | |
| 11 | 179968252 | — | To Serraglio |
| 12 | 179968228 | Curva del Serraglio | Slight left |
| 13 | 1443867792 | — | Toward oval underpass |
| 14 | 1443867793 | — | `covered=yes` underpass |
| 15 | 179968254 | — | After underpass |
| 16 | 179968226 | Curva Vialone | First left of the Ascari complex |
| 17 | 179968249 | — | Connector |
| 18 | 179968239 | Variante Ascari | Remainder of the chicane |
| 19 | 179968257 | — | Opposite / back straight |
| 20 | 179968234 | Curva Alboreto | `old_name=Curva Parabolica`; joins way 19842206 |

Join check: each way’s first node equals the previous way’s last node. Alboreto’s last node **1902318272** equals the first node of Rettifilo di partenza. No way was reversed.

Excluded (present on the relation or adjacent, not in `wayIds`): pit lane 38168747; oval / high-speed loop; junior layout; motorcycle Rettifilo (the car chicane note on 179968242).

## Transform

1. **Overpass** (kumi.systems, `out geom meta`) for node 1828499259 and the 20 ways above. Relation metadata from `https://api.openstreetmap.org/api/0.6/relation/284565.json`.
2. **Stitch** from the S/F node along way 19842206, then the remaining ways, without repeating the S/F node. 291 unique WGS84 vertices.
3. **ENU** at `(45.6189632, 9.2811729)`, height 0, via WGS84 ECEF → ENU (`a = 6378137` m, `f = 1/298.257223563`).
4. **Heading** from the origin to the first vertex ≥ 20 m ahead: unit ENU `(east, north) = (0.120807, 0.992676)` ≈ **6.94° east of north**.
5. **Rotate** with the format v1 matrix so that heading is `−z` and driver-right is `+x`. After rotation the second sample is `(0, 0, −4.870)` and the last sample is `(0.096, 0, 4.991)` — arriving from `+z` toward the origin.
6. **Flatten** `y = 0` (OSM has no elevation; keeping ellipsoid `up` would add a ~0.25 m bowl, which is not track height).
7. **Densify** the closed polyline: max 5 m on straights, 2 m where `|Δheading| > 3°`, 1 m where `> 12°`. Linear along OSM chords only. Then drop the repeated origin.

Closed WGS84-ECEF-ENU length of the **raw** stitch (291 vertices + 309.495 m S/F-adjacent chord) is **5793.439 m**. Densify does not change that path. After rounding samples to 1 mm, the published `metrics.centerlineLengthM` is **5793.440 m** and `closureGapM` is **4.992 m**.

Other projections of the same vertices (notes only):

| Projection | Closed length | vs 5793 m |
| --- | ---: | ---: |
| WGS84 ECEF→ENU (this file, 1 mm JSON) | 5793.440 m | +0.0076% |
| Equirectangular, metres/degree at φ₀ | 5793.712 m | +0.012% |
| Sphere R = 6378137 m | 5796.344 m | +0.058% |
| Sphere R = 6371000 m | 5789.858 m | −0.054% |
| Prior spherical ENU (earlier research) | ~5800.83 m | +0.135% |

All of those pass ±1%. This file uses ECEF→ENU and does **not** scale to 5793.

## Acceptance checklist

| Test | Result |
| --- | --- |
| Closed length vs 5793 m ±1% | **5793.440 m (+0.0076%)** — PASS |
| Closure gap < 10 m | **4.992 m** — PASS |
| Max spacing ≤ 5 m | **4.992 m** — PASS |
| Point count | **1759** (first point not repeated) |
| Self-intersection | **none** (closed polyline, non-adjacent segments) |
| Corners strictly increasing `s` | PASS (see table) |
| T1 turns right | **Variante del Rettifilo, `turn: right`, s = 622.279 m** — PASS |
| Invented widths / kerbs / DRS | none in the JSON |

T1 vs the earlier “~618 m” check: first `|Δheading| ≥ 4°` right on way 179968242 is at **617.201 m**; the first-cluster apex (max heading change, 20.93°) is **622.279 m**. Both sit on Variante del Rettifilo.

## Corner table

Apex stations are derived from the resampled centreline with the format v1 apex rule. Names and first-turn sense come from monzanet.it / OSM; `s` is not an FIA published metre mark.

| `id` | Name | `s` (m) | Turn | How `s` was taken | OSM way |
| --- | --- | ---: | --- | --- | ---: |
| rettifilo | Variante del Rettifilo | 622.279 | right | First right-hand cluster, max `\|Δheading\|` | 179968242 |
| biassono | Curva Biassono (Curva Grande) | 1106.426 | right | Max right `\|Δheading\|` on the named way | 179968220 |
| roggia | Variante della Roggia | 1838.272 | left | First left-hand cluster, max `\|Δheading\|` | 179968245 |
| lesmo1 | Lesmo 1 | 2210.232 | right | Max right `\|Δheading\|` on the named way | 179968229 |
| lesmo2 | Lesmo 2 | 2582.962 | right | Max right `\|Δheading\|` on the named way | 179968230 |
| serraglio | Curva del Serraglio | 2995.137 | left | No sample ≥ 4°; half integrated left turn on the named way (~12° over ~125 m) | 179968228 |
| ascari | Variante Ascari | 3650.290 | left | First left cluster of Vialone + connector + Variante Ascari (OSM splits the L–R–L) | 179968226 / 249 / 239 |
| parabolica | Curva Alboreto | 4864.548 | right | Max right `\|Δheading\|` on the named way (tightest at entry) | 179968234 |

Landmark (sourced): `oval-north-underpass` at **s = 3297.975 m**, midpoint of covered way 1443867793.

## Approximations

- **OSM raceway ≠ FIA surveyed centreline.** Ways are a community centreline of the asphalt. Agreement to 44 cm on 5793 m is encouraging, not a claim of survey grade.
- **No elevation.** `y = 0`. Real Monza is not a plane.
- **Chords, not clothoids.** Densify only inserts points on existing OSM segments.
- **Start/finish heading** uses the first ≥ 20 m chord. The pit straight is not perfectly linear, so later S/F-straight samples have a few metres of `x` (T1 apex is at `x = −16.0`, `z = −621.6`).
- **Serraglio** is a very wide kink. The half-turn station is a geometric construction, not a published apex.
- **Ascari / Vialone.** OSM still names the first left `Curva Vialone` and the rest `Variante Ascari`. One corner record covers the complex; `osmWayId` is the Variante Ascari way.
- **1194.40 m official start straight** does not match OSM “Alboreto way end → Rettifilo way start” (~931 m to the T1 apex, ~923 m to the Rettifilo join). Different end-points; not used as a scale factor.
- **kumi Overpass planet** is dated 2026-05-06. Relation v33 (2025-10-22) and way 179968262 (2025-11-26) are inside that extract.

## Intentionally omitted

No sourced metre station on **this** centreline for:

- Per-station width (only the 10–12 m range is published)
- Kerb width / height / paint
- DRS (2025) or 2026 Overtake / Straight Mode detection and activation — FIA gives offsets from T-numbers, not from S/F metres
- Sector lines S1 / S2 / speed trap
- Pit lane, oval, junior circuit
- Grandstands, braking markers, marshal lights
- F1 turn numbers 1–11 as `id`s

If those are added later, cite a document that places them in metres on this frame or on WGS84, and keep the invent-nothing rule.
