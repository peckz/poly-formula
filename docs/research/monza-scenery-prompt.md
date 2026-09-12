# Research prompt: Monza surroundings 1:1

Copy everything below the line and give it to the research agent, together
with `docs/scenery-format.md` (the deliverable format), `docs/track-format.md`
and `docs/research/monza-notes.md` (the existing track research — it
documents the exact coordinate transform you must reuse).

---

You are researching the real surroundings of the Autodromo Nazionale Monza
for a browser racing game that already has the 1:1 track layout. Your
deliverable is data, not code and not images. The scenery data format
provided alongside this prompt defines the frame, schema, licensing rules
and acceptance checklist — read it fully first.

## Goal

A scenery file describing what actually stands around the Monza GP circuit,
accurate enough that a player who knows the venue recognizes every sector:
grandstands, the pit/paddock complex, the old banked Sopraelevata, the
Royal Park forest, bridges and access roads.

## Deliverables

1. `src/tracks/monza.scenery.json` — valid against scenery format v1.
2. `docs/research/monza-scenery-notes.md` — sources, imagery used for
   verification, transform proof, per-feature confidence, omissions.

## Coordinate transform (critical)

The track file was built from OSM with a documented WGS84 → ECEF → ENU →
rotation transform (see the monza research notes: origin node 1828499259 at
45.6189632, 9.2811729; start heading 6.94° east of north rotated to -z).
Reuse exactly that transform for every footprint. Prove it via the
`controlPoints` field: start/finish center must land at (0, 0) and the T1
apex at approximately (-16.0, -621.6).

## What to capture (priority order)

1. **Grandstands.** All permanent tribunes: Tribuna Centrale along the
   start/finish straight, the stands at Variante del Rettifilo, Curva
   Biassono, Roggia, Lesmo, Ascari, Parabolica/Alboreto (interior and
   exterior where present). OSM has most as `building=grandstand` or
   `building=roof`. Footprint per stand, height estimated from imagery or
   floor counts, flagged as estimated.
2. **Pit / paddock complex.** Pit building with its lane-facing garages,
   race control tower, podium, media center, hospitality blocks behind the
   paddock. `building=*` polygons in OSM.
3. **The old banking (Sopraelevata).** The full banked oval ring as a
   `banking` polyline with width — it is Monza's most iconic scenery and
   the track passes under its north curve (the track file has this
   underpass landmark at s ≈ 3298). OSM maps it as `highway=raceway`
   (the oval layout, excluded from the racing line).
4. **Forest.** The Parco di Monza woods as `forest` polygons
   (`landuse=forest` / `natural=wood`). This defines Monza's whole look:
   the track is a clearing in a forest. Simplify polygons to ~10 m
   tolerance; the game fills them with instanced trees.
5. **Bridges and gates.** Spectator bridges over the track (there are
   several: near T1, mid-circuit, at Ascari), main entrance gates.
6. **Everything else that reads on an aerial photo**: large parking areas,
   karting track, camping areas, the Villa Reale axis if it falls within
   ~1.5 km of the circuit — as `parking` / `other` with notes.

## Method

1. **OSM first.** Overpass query around relation 284565 (bbox roughly
   45.605–45.635 N, 9.27–9.30 E): `building=*`, `landuse=forest`,
   `natural=wood`, `highway=raceway` (oval), `man_made=bridge`,
   `amenity=parking`, `barrier=*`. Record way/relation ids per feature.
2. **Aerial verification.** Cross-check every major feature against at
   least one aerial/satellite source (Google/Bing/Esri imagery, or the
   circuit's own maps at monzanet.it). Use imagery ONLY to verify OSM
   geometry and to estimate heights and dominant colors — never trace
   geometry from commercial imagery (license). If OSM is missing a
   grandstand that imagery clearly shows, position it `alongTrack` from
   the imagery-verified arc-length range and flag it.
3. **Heights.** Prefer `building:levels`/`height` tags; otherwise estimate
   from oblique photos (press/fan photography, the circuit's virtual tour)
   and flag `heightEstimated: true`.
4. **Validate** with the acceptance checklist in the format spec: control
   points, ≥ 8 m centerline clearance (compute against the track file's
   centerline), closed CCW polygons. State the results in the notes.

## Rules

- Meters only, invent nothing: no source → omit and list in notes.
- Every feature carries its `source`; every estimate is flagged.
- Simplify aggressively: this feeds a low-poly game. Footprints with more
  than ~40 vertices should be simplified.
- Quality over coverage: grandstands + pits + banking + forest done well
  beat a hundred unverified sheds.
