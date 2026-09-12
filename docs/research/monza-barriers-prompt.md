# Research prompt: Monza barriers and fencing 1:1

Copy everything below the line and give it to the research agent, together
with `docs/scenery-format.md` (frame, licensing and geometry rules — the
barriers file reuses all of them), `docs/track-format.md`, and
`docs/research/monza-notes.md` / `docs/research/monza-scenery-notes.md`
(they document the exact coordinate transform and the OSM extraction that
must be reused).

---

You are researching the crash protection and fencing of the Autodromo
Nazionale Monza GP circuit for a browser racing game that already has the
1:1 track layout and OSM-sourced surroundings. Your deliverable is data,
not code and not images.

## Goal

A barriers file describing what actually lines the Monza GP track, corner
by corner: guardrails, concrete walls, tyre barriers, TecPro, debris
fencing and spectator fencing — positioned as close to reality as honest
sourcing allows. A player who knows the venue should see the right barrier
type in the right place at every corner.

## Deliverables

1. `src/tracks/monza.barriers.json` — same frame, control points,
   licensing and geometry rules as scenery format v1 (see
   `docs/scenery-format.md`). Differences listed under "Schema" below.
2. `docs/research/monza-barriers-notes.md` — sources, verification method,
   per-segment confidence, omissions, and the transform proof.

## Coordinate transform (critical)

Reuse exactly the transform documented in the existing research notes:
origin OSM node 1828499259 at 45.6189632, 9.2811729; heading unit ENU
(0.120807, 0.992676) rotated to −z. Prove it with `controlPoints`:
start/finish at (0, 0) and the T1 apex at approximately (−16.0, −621.6).
Do not re-fit anything.

## Schema

Reuse scenery format v1 wholesale (`formatVersion`, `trackId`, `units`,
`frame`, `controlPoints`, `source`, `features`, one geometry key per
feature, per-feature `source`). Differences:

- Allowed `kind` values: `guardrail` (Armco), `concrete-wall`,
  `tyre-barrier`, `tecpro`, `debris-fence` (the tall catch fencing on
  posts), `spectator-fence` (perimeter mesh fence), `gravel-trap`,
  `wall`, `fence` (only when the type cannot be determined — say so).
- Preferred geometry is **`alongTrack`** (s0, s1, side, offsetM, widthM):
  barriers hug the track, and arc-length ranges are what the game
  consumes. `polyline` is fine when OSM has the actual line (e.g.
  `barrier=guard_rail` ways); include both `osmId` and, in `notes`, the
  approximate s-range it covers.
- Extra optional fields: `heightM` (+ `heightEstimated`), `rowsOfTyres`
  (integer, tyre barriers only, when a photo shows it), `behind` (id of
  the barrier this one backs onto, e.g. tyres in front of a guardrail).
- The 8 m centerline clearance rule does NOT apply — barriers are close
  to the track by nature. Instead: no feature may be closer to the
  centerline than the local track half-width (≈ 5.5 m plus kerbs ≈ 6.7 m).
  State the minimum in the notes.
- `gravel-trap` is the one areal kind: use `polygon` (OSM `landuse` /
  `surface=gravel` around runoffs) or `alongTrack` envelopes. It matters
  for T1, Roggia, the Lesmos, Ascari and Parabolica.

## What to capture (priority order)

1. **Corner protection at the big stops** — this is where players look:
   - Variante del Rettifilo (T1): gravel, tyre barriers on the outside,
     debris fence line.
   - Variante della Roggia: gravel + tyres outside, guardrail transitions.
   - Lesmo 1 / Lesmo 2: gravel, tyres/TecPro on the outside crests,
     close guardrail on the inside.
   - Variante Ascari: gravel both sides, tyre walls at the turn-in and
     exit.
   - Parabolica/Alboreto: the long gravel + asphalt runoff, the curved
     tyre/guardrail line, debris fence in front of the stands.
2. **Straights**: continuous guardrail (typically 2–3 rails) or concrete
   wall on both sides, distance from track edge (it is tight along the
   pit wall and the main straight — the pit wall itself is concrete with
   debris fence).
3. **Pit wall and pit entry/exit**: concrete wall with fence between
   track and pit lane; where the pit exit blends at T1/Curva Grande.
4. **Debris fencing in front of every grandstand** captured in
   `monza.scenery.json` (cross-reference stand ids in `notes`).
5. **Perimeter/spectator fencing** only where it is close enough to be
   seen from the track (inside the forest clearings).

## Method

1. **OSM first.** Overpass in the same bbox as the scenery extract
   (45.605–45.635 N, 9.27–9.30 E): `barrier=guard_rail`, `barrier=wall`,
   `barrier=fence` (+ `fence_type`), `barrier=retaining_wall`,
   `area:highway` / `landuse=grass|gravel` around runoffs. Record way ids.
   Expect OSM coverage to be partial — that is why `alongTrack` exists.
2. **Onboard footage and photos for typing.** Use recent onboard laps
   (F1/GT broadcasts, official circuit media) and press photography to
   determine, per corner: barrier type, approximate distance from the
   track edge, tyre rows, TecPro vs tyres. Cite each video/photo (event,
   year, timestamp). This is verification and attribute estimation —
   never trace geometry from commercial imagery or video.
3. **FIA / circuit documents.** The FIA circuit licence, event safety
   plans or track maps at monzanet.it sometimes state runoff and barrier
   types per corner. Cite when used.
4. **Express honest uncertainty**: when the exact offset is unknown, give
   a conservative `offsetM` from the verified runoff width and flag
   `widthEstimated` / a note. When a stretch cannot be typed, use `wall`
   or `fence` with a note, or omit it and list it in the notes.

## Acceptance

1. Control points match the track frame (< 5 m).
2. Full GP lap coverage on both sides: the union of barrier s-ranges
   should leave no gap longer than ~50 m unexplained (gaps for pit entry,
   service gates and gravel-only stretches are fine — note them).
3. Every feature has a `source`; every estimated number is flagged.
4. No geometry traced from commercial imagery or video.
5. Barrier lines never overlap the racing surface (≥ local half-width
   from the centerline).

## Rules

- Meters only, invent nothing: no source → omit and list in notes.
- Corner protection quality beats total coverage: T1, Roggia, Lesmos,
  Ascari, Parabolica done well matter more than a perfect perimeter fence.
- Simplify: this feeds a low-poly game. `alongTrack` ranges and coarse
  polylines beat centimetre-level rings.
