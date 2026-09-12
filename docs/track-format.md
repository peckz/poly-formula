# Track format v1

Machine-readable circuit data for Poly Formula. One JSON file per layout, stored at `src/tracks/<id>.json`.

This version describes **geometry and sourced metadata only**. It does not define physics, meshes, cameras, or rendering.

## Units and frame

| Rule | Value |
| --- | --- |
| Units | metres |
| Ground plane | `x` / `z` |
| Up | `+y` |
| Origin | start/finish line, track centreline |
| Racing direction at origin | `−z` (vector `[0, 0, −1]`) |
| `+x` | driver’s **right** at the origin |

The frame is right-handed. A car on the start/finish line pointing in the racing direction has:

- forward `(0, 0, −1)`
- right `(1, 0, 0)`
- up `(0, 1, 0)`

`y` may be zero for a planar track (no sourced elevation). When elevation exists and is sourced, `y` is metres above the start/finish plane.

## Closed loop

`centerline` is an **open** polyline. Do **not** repeat the first point at the end.

Consumers close the lap by connecting the last sample back to the first. The official lap length, when a series or circuit publishes one, is stored separately as `lapLengthM` and is **not** required to equal the polyline length.

## Spacing

Consecutive samples (including the implied closing segment) must be **≤ 5 m** apart. Corners should be tighter than straights so curvature is not lost to long chords.

## File schema

Unknown fields are ignored. Clients must not require optional fields.

### Required

| Field | Type | Meaning |
| --- | --- | --- |
| `formatVersion` | `1` | Integer. This document. |
| `id` | string | Stable slug (`monza`). |
| `name` | string | Local / official name. |
| `units` | `"m"` | Must be metres. |
| `frame` | object | Coordinate frame (see below). |
| `lapLengthM` | number | Published centreline lap length, if one exists. |
| `source` | object | Provenance. Do not invent coordinates to fill this in. |
| `centerline` | array | Open polyline samples. |
| `corners` | array | Named corners, strictly increasing `s`. |

### Frame

```json
{
  "groundAxes": ["x", "z"],
  "up": "y",
  "origin": "startFinishCenter",
  "racingDirectionAtOrigin": [0, 0, -1],
  "xPositive": "driverRight"
}
```

### Centerline sample

```json
{ "s": 0.0, "x": 0.0, "y": 0.0, "z": 0.0 }
```

| Field | Meaning |
| --- | --- |
| `s` | Arc length (m) from the origin along the open polyline. `s = 0` at the first sample. |
| `x`, `y`, `z` | Position in the frame above. |

The first sample must be the origin (`s = 0`, `x = 0`, `z = 0`). `y` is `0` when the track is flattened to the start/finish tangent plane.

### Corner

```json
{
  "id": "rettifilo",
  "name": "Variante del Rettifilo",
  "aka": ["Prima Variante"],
  "s": 622.279,
  "turn": "right",
  "osmWayId": 179968242
}
```

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | yes | Stable slug. |
| `name` | yes | Primary name from a cited source. |
| `s` | yes | Station (m) of the corner apex on `centerline`. Strictly increasing. |
| `turn` | yes | `"right"` or `"left"` as seen by a driver in the racing direction. |
| `aka` | no | Other sourced names. |
| `osmWayId` | no | OSM way used to locate the corner. |

Apex rule (format v1):

1. Take heading change at each sample, `atan2(dx, −dz)`, so `0` is `−z` and positive is toward `+x` (driver right).
2. On a chicane, use the **first cluster** of turns of the documented first-turn direction (`|Δheading| ≥ 4°`, gaps ≤ 40 m) and pick the sample with maximum `|Δheading|`.
3. On a single corner, pick the maximum `|Δheading|` of the documented direction inside the named OSM way.
4. If no sample reaches `4°` (wide kinks), use the station at **half** the integrated heading change of that sign inside the way.

Do not assign Formula 1 turn numbers unless a cited document maps those numbers onto metre stations of **this** centreline.

### Source

For an OpenStreetMap-derived file:

| Field | Meaning |
| --- | --- |
| `kind` | `"openstreetmap"` |
| `license` | `"ODbL"` |
| `relationId` | Circuit relation. |
| `startFinishNodeId` | Node used as origin. |
| `startFinishWgs84` | `{ "lat", "lon" }` of that node. |
| `wayIds` | Racing-direction stitch order. Exclude pit, oval, junior, and motorcycle-only Rettifilo ways. |
| `retrievedAt` | ISO-8601 time of the Overpass (or OSM API) query. |
| `overpassTimestampOsmBase` | Planet timestamp reported by Overpass, when available. |

### Optional track-level fields

Include only when a source states the number or tag.

| Field | Meaning |
| --- | --- |
| `nameEn` | English name. |
| `layout` | Layout name (`Gran Premio`). |
| `country` | ISO 3166-1 alpha-3. |
| `direction` | `"clockwise"` or `"counterclockwise"`. |
| `widthMinM` / `widthMaxM` | Published asphalt width range. |
| `surface` | OSM / circuit surface tag (`asphalt`). |
| `metrics` | Derived checks (see below). |
| `landmarks` | Sourced point features with `id`, `name`, `s`. |

### Optional fields that are omitted unless sourced

These may appear in later files. **Do not invent values.**

- Per-sample `widthLeftM` / `widthRightM` (or `halfWidth`)
- Kerb width, height, or colour
- DRS / overtake / straight-mode detection and activation stations
- Grandstands, marshal posts, braking boards, and other landmarks without a cited position
- Elevation (`y ≠ 0`) without a cited height model

When a published fact is only a range or a relative offset (for example “170 m after T7”) and the corresponding T-number is not locked to this centreline, omit the field and record the source in research notes.

### Derived `metrics`

Recommended on every file so a reviewer can check acceptance without re-running the transform:

| Field | Meaning |
| --- | --- |
| `centerlineLengthM` | Closed-loop length: last-to-first gap plus the open polyline. |
| `openPolylineLengthM` | Sum of consecutive centerline segments (no close). |
| `closureGapM` | Distance from the last sample to the first. |
| `pointCount` | `centerline.length`. |
| `maxSpacingM` | Longest consecutive segment, including the close. |

## Building the frame from WGS84

1. Stitch the racing-direction ways, starting at the start/finish node. Drop duplicate join nodes. Do not append the start/finish node at the end.
2. Convert each vertex to a local ENU frame at the start/finish WGS84 coordinate using WGS84 ECEF (`a = 6378137` m, `f = 1/298.257223563`) then ECEF→ENU.
3. Take the horizontal heading from the origin toward the first vertex at least 20 m along the racing line. Let `(he, hn)` be that unit vector in ENU east/north.
4. Rotate so that heading becomes `−z` and ENU-right becomes `+x`:

   ```
   e' =  hn * e - he * n
   n' =  he * e + hn * n
   x  =  e'
   z  = -n'
   ```

5. Flatten `y = 0` unless sourced elevation is applied.
6. Densify the **closed** polyline so every chord is ≤ 5 m (tighter in corners), then drop the repeated origin.

Linear densify along OSM chords. Do not spline, scale, or fit the polyline to force `lapLengthM`.

## Acceptance

A format v1 file is acceptable when all of the following hold:

1. **Length** — `metrics.centerlineLengthM` is within **±1%** of `lapLengthM` when `lapLengthM` is published.
2. **Closure** — `metrics.closureGapM` < **10 m**.
3. **Spacing** — `metrics.maxSpacingM` ≤ **5 m**.
4. **Simple** — the closed polyline does not self-intersect (adjacent segments and the closing pair at the origin are exempt).
5. **Corners** — `corners[].s` is strictly increasing and each `s` lies on the centreline.
6. **T1** — the first corner of a clockwise circuit that starts with a right-hand chicane must have `turn: "right"` (Monza: Variante del Rettifilo).
7. **Honesty** — every numeric field is either measured from the cited geometry, copied from a cited publication, or derived by a rule in this document. No guessed widths, kerbs, DRS points, or scaled “make it 5793 m” factors.

## Example (truncated)

```json
{
  "formatVersion": 1,
  "id": "monza",
  "lapLengthM": 5793,
  "frame": {
    "groundAxes": ["x", "z"],
    "up": "y",
    "origin": "startFinishCenter",
    "racingDirectionAtOrigin": [0, 0, -1],
    "xPositive": "driverRight"
  },
  "centerline": [
    { "s": 0.0, "x": 0.0, "y": 0.0, "z": 0.0 }
  ],
  "corners": [
    { "id": "rettifilo", "name": "Variante del Rettifilo", "s": 622.279, "turn": "right" }
  ]
}
```
