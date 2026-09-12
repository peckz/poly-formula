# Scenery format v1

Machine-readable **surroundings** for a format v1 track. One JSON file per layout, stored at `src/tracks/<trackId>.scenery.json`.

This version describes **sourced footprints and ribbons only**. It does not define meshes, materials, instancing, physics, or a renderer. Consumers may extrude `heightM` and drape `polygon` / `polyline` / `alongTrack` in the same frame as the track file.

## Units and frame

The scenery file **must use the same frame as the matching track file**.

| Rule | Value |
| --- | --- |
| Units | metres |
| Ground plane | `x` / `z` |
| Up | `+y` |
| Origin | start/finish line, track centreline |
| Racing direction at origin | `−z` (vector `[0, 0, −1]`) |
| `+x` | driver’s **right** at the origin |

The frame is right-handed. `y` is zero on the start/finish tangent plane unless a sourced elevation is applied to a vertex (v1 footprints are planar: height is an attribute, not a per-vertex `y`).

Do **not** invent a second origin, a different heading, or a scale factor. Recompute WGS84 → frame with the **same** ellipsoid and heading procedure as [track-format.md](track-format.md) § “Building the frame from WGS84”.

### Building the frame from WGS84 (copy of the track rule)

1. Convert each WGS84 vertex to a local ENU frame at the track start/finish using WGS84 ECEF (`a = 6378137` m, `f = 1/298.257223563`) then ECEF→ENU.
2. Take the horizontal heading already locked by the track file: the unit ENU vector `(he, hn)` from the origin toward the first centreline vertex at least 20 m along the racing line.
3. Rotate so that heading becomes `−z` and ENU-right becomes `+x`:

   ```
   e' =  hn * e - he * n
   n' =  he * e + hn * n
   x  =  e'
   z  = -n'
   ```

4. Flatten `y = 0` unless sourced elevation is applied.

If the track file publishes `source.startFinishWgs84` and research notes publish `(he, hn)`, copy those numbers. Do not re-fit heading from scenery geometry.

## Control points (required)

`controlPoints` proves the scenery file is in the track frame. At least two points are required:

| `id` | Meaning | Must match |
| --- | --- | --- |
| `start-finish` | Track origin | `(x, z) = (0, 0)` and the track S/F WGS84 node |
| A second named point on the published centreline | Heading / scale check | The **same** `(x, z)` (and `s` if given) as the track file, within **5 m** |

For Monza the second point is the Variante del Rettifilo apex (`s ≈ 622.279` m → about `(−16.0, −621.6)` on the published centreline).

Each control point:

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | yes | Stable slug. |
| `x`, `z` | yes | Position in the track frame (metres). |
| `y` | no | Default `0`. |
| `s` | no | Station on the track centreline when the point is a centreline sample. |
| `wgs84` | no | `{ "lat", "lon" }` when the point is a surveyed / OSM node. |
| `osmNodeId` | no | OSM node id when applicable. |
| `errorVsTrackM` | no | Distance to the matching track sample (must be `< 5`). |

## File schema

Unknown fields are ignored. Clients must not require optional fields.

### Required

| Field | Type | Meaning |
| --- | --- | --- |
| `formatVersion` | `1` | Integer. This document. |
| `trackId` | string | Must equal the track file `id` (`monza`). |
| `units` | `"m"` | Must be metres. |
| `frame` | object | Same object shape as the track file. |
| `controlPoints` | array | See above. Length ≥ 2. |
| `source` | object | Provenance for the file as a whole. |
| `features` | array | Scenery features. |

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

### Source (file-level)

For an OpenStreetMap-derived file:

| Field | Meaning |
| --- | --- |
| `kind` | `"openstreetmap"` |
| `license` | `"ODbL"` |
| `trackFile` | Path of the matching track JSON. |
| `retrievedAt` | ISO-8601 time of the Overpass (or OSM API) query. |
| `overpassTimestampOsmBase` | Planet timestamp reported by Overpass, when available. |
| `overpassEndpoint` | Interpreter URL. |
| `bboxWgs84` | `[south, west, north, east]` of the query window. |
| `transform` | Copy of the numbers used: origin WGS84, `(he, hn)`, ellipsoid. |

Commercial aerial products (Google, Bing, Esri World Imagery, etc.) may be used **only** to verify that an OSM object exists and to estimate height or colour. They must **not** be traced. Do not store pixel-digitized rings.

## Features

Each feature has **exactly one** geometry key: `polygon` **or** `polyline` **or** `alongTrack`. Mixing two keys on one feature is invalid.

### Required per feature

| Field | Meaning |
| --- | --- |
| `id` | Stable slug, unique in the file. |
| `kind` | One of the kinds below. |
| `source` | Provenance for **this** feature. Every feature must have one. |

### Kinds

`grandstand` · `pit-building` · `building` · `bridge` · `banking` · `forest` · `treeline` · `hedge` · `wall` · `fence` · `parking` · `service-road` · `water` · `gate` · `helipad` · `other`

Use the most specific kind. `other` is for sourced objects that do not fit (camping, kart loops, monuments). Do not invent a kind.

### Optional per feature

| Field | Meaning |
| --- | --- |
| `name` | Primary name from a cited source (OSM `name`, official circuit list, …). |
| `aka` | Other sourced names. |
| `officialRef` | Official tribune / building number when a cited list maps it. |
| `heightM` | Extrusion / typical height above the S/F plane (metres). |
| `heightEstimated` | `true` when `heightM` is not copied from an OSM `height` (or equivalent) tag. **Required** whenever `heightM` is estimated. |
| `widthM` | Ribbon width for `polyline` / `alongTrack` (metres). |
| `widthEstimated` | `true` when `widthM` is not a cited published width or OSM `width`. |
| `bankMaxPct` | Maximum cross-slope (%) for `banking`, when a source states it. |
| `roof` | `true` when OSM or a cited photo shows a roof. |
| `colorHint` | `#RRGGBB` suggested albedo. |
| `colorEstimated` | `true` when `colorHint` is not a sourced paint spec. |
| `notes` | Short honesty note (clip, marker rectangle, …). |

### `polygon`

Closed ring on the ground. Each vertex is `{ "x", "z" }` (optional `y`, default `0`).

Rules:

1. **Closed** — the last vertex equals the first within 1 mm. Consumers must not add a second closing edge.
2. **CCW from above** — when viewed from `+y`, the interior is on the left. Equivalently, signed area in the `(x, −z)` plane is **positive**.
3. **Simple** — the closed ring does not self-intersect (the closing vertex pair is the only repeated point).
4. **Simplify** — rings with more than about 40 vertices should be simplified (Douglas–Peucker or equivalent) to that order, except where a 10 m forest tolerance is specified in research notes.

No holes in v1. If an OSM multipolygon has inners, either omit the hole (and say so) or emit the outer only.

### `polyline`

Open chain of `{ "x", "z" }` vertices. Used for banking centrelines, service roads, fences, treelines, and other ribbons.

`widthM` is the full width centred on the polyline unless `notes` says otherwise.

Do not repeat the first vertex at the end unless the feature is a **closed ring that is still a ribbon** (for example a closed oval). A closed ribbon may repeat the first vertex; call that out in `notes`.

### `alongTrack`

Envelope derived from the track centreline when OSM has **no** usable footprint but a feature is confirmed from a cited source or from aerial **verification** (not a traced outline).

```json
{
  "s0": 100.0,
  "s1": 180.0,
  "side": "right",
  "offsetM": 22.0,
  "widthM": 12.0
}
```

| Field | Meaning |
| --- | --- |
| `s0`, `s1` | Stations (m) on the matching track centreline, `s0 ≤ s1`. |
| `side` | `"left"` or `"right"` as seen by a driver in the racing direction. |
| `offsetM` | Distance from the centreline to the **near** edge (metres). Must be ≥ 0. |
| `widthM` | Depth away from the track (metres). |

The implied footprint is the region between offsets `[offsetM, offsetM + widthM]` on `side`, swept from `s0` to `s1`. This is an envelope, not a surveyed leaf. Set `source.kind` to `"imagery-verified"` or `"published-envelope"` and say so in `notes`.

### Point-tagged OSM objects

OSM nodes (gates, some helipads) have no leaf. v1 allows a **2 m** CCW square centred on the transformed node so the feature still has a `polygon`. `notes` must say it is a marker, not a surveyed footprint.

## Licensing

| Data | Allowed use |
| --- | --- |
| OpenStreetMap geometry and tags | Yes. Licence **ODbL**. Cite OSM on the file and on each feature. |
| Official circuit publications (names, tribune numbers, published widths, banking %) | Yes, as attributes. Cite the document. |
| Google / Bing / Esri / other commercial aerial | **Verify existence** and **estimate** height / colour only. **Never trace** rings or polylines from those pixels. |

Derived operations that are allowed (and must be documented in research notes):

- The track-format WGS84 → frame transform
- Douglas–Peucker (or equivalent) simplification
- Forcing CCW
- Clipping landcover away from an 8 m buffer of the GP centreline so a forest polygon does not sit on the racing surface
- Marker squares for OSM nodes

Not allowed: guessed footprints, spline-fitted “prettier” stands, or scaling the park to look bigger.

## Acceptance

A format v1 scenery file is acceptable when all of the following hold:

1. **Frame** — `trackId` matches the track file; `frame` matches; `controlPoints` lie within **5 m** of the corresponding track-frame positions.
2. **Clearance** — every feature that is not `kind` `bridge` or `banking` is at least **8 m** from the track centreline (minimum distance from any polygon/polyline vertex, or from the near edge of `alongTrack`, to the centreline polyline). Landcover that OSM draws across the ribbon may be clipped to this buffer; the clip is derived and must be noted.
3. **Polygons** — every `polygon` is closed, CCW from above, and non-self-intersecting.
4. **Geometry key** — every feature has exactly one of `polygon` / `polyline` / `alongTrack`.
5. **Source** — every feature has a `source`. No numeric field is invented: it is measured from cited OSM geometry, copied from a cited publication, estimated with `heightEstimated` / `widthEstimated` / `colorEstimated`, or derived by a rule in this document.
6. **Named programme** — research notes list the official permanent grandstands and the pit complex and state which OSM objects represent them. Missing stands are omitted or encoded as `alongTrack` with an imagery-verified envelope — not traced.

## Honesty

Same rule as the track format: invent nothing. If a pit garage, media centre, or Lesmo stand is not in OSM and cannot be given an honest envelope, omit it and say so in the research notes.

## Example (truncated)

```json
{
  "formatVersion": 1,
  "trackId": "monza",
  "units": "m",
  "frame": {
    "groundAxes": ["x", "z"],
    "up": "y",
    "origin": "startFinishCenter",
    "racingDirectionAtOrigin": [0, 0, -1],
    "xPositive": "driverRight"
  },
  "controlPoints": [
    { "id": "start-finish", "x": 0.0, "y": 0.0, "z": 0.0 },
    { "id": "t1-apex", "s": 622.279, "x": -15.999, "y": 0.0, "z": -621.625 }
  ],
  "features": [
    {
      "id": "tribuna-centrale-193647796",
      "name": "Tribuna Centrale",
      "kind": "grandstand",
      "polygon": [
        { "x": 18.0, "z": 10.0 },
        { "x": 18.0, "z": -40.0 },
        { "x": 38.0, "z": -40.0 },
        { "x": 38.0, "z": 10.0 },
        { "x": 18.0, "z": 10.0 }
      ],
      "heightM": 14,
      "heightEstimated": true,
      "source": {
        "kind": "openstreetmap",
        "license": "ODbL",
        "osmType": "way",
        "osmId": 193647796
      }
    }
  ]
}
```
