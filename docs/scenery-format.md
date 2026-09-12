# Scenery data format (v1)

Companion to [`track-format.md`](track-format.md). Describes everything
around the racing surface: grandstands, buildings, forests, bridges, the
old banking — so the game can build the surroundings 1:1. One JSON file
per track, delivered by research agents.

## Frame

Same frame as the track file, exactly: meters, y-up, origin at the center
of the start/finish line, racing direction -z there, x positive to the
driver's right. A scenery file is only valid against the track file whose
`source` it references — reuse the **same** lat/lon → local transform, and
prove it with control points (below).

## Geometry options

Every feature carries exactly one geometry:

- `"polygon"`: `[[x, z], ...]` — closed footprint, counter-clockwise
  seen from above, first point not repeated. For buildings, stands, woods.
- `"polyline"`: `{ "points": [[x, z], ...], "widthM": 10 }` — for linear
  features: the old banking ring, service roads, walls, fences.
- `"alongTrack"`: `{ "fromS": 100, "toS": 320, "side": "left",
  "offsetM": 30, "depthM": 16 }` — only when no mapped footprint exists;
  positions relative to the track centerline by arc length.

## JSON schema

```jsonc
{
  "formatVersion": 1,
  "trackId": "monza",                  // must match the track file id
  "researchedAt": "2026-09-12",
  "sources": ["<urls, osm ids, imagery used for verification>"],

  // Prove the transform matches the track file: local coords of known
  // stations, computed from YOUR transform. Loader checks them.
  "controlPoints": [
    { "what": "start/finish center", "x": 0, "z": 0 },
    { "what": "T1 apex (track file corners[0])", "x": -16.0, "z": -621.6 }
  ],

  "features": [
    {
      "id": "tribuna-centrale",
      "kind": "grandstand",            // see kinds below
      "name": "Tribuna Centrale",
      "geometry": { "polygon": [[-30, -80], [-30, -240], [-48, -240], [-48, -80]] },
      "heightM": 14,
      "heightEstimated": true,          // true unless a source gives height
      "colors": ["#dfe5ea", "#64b5dd"], // dominant colors from imagery, optional
      "notes": "roofed main stand along the pit straight",
      "source": "osm way 123456"
    }
  ]
}
```

### Feature kinds

`grandstand` | `pit-building` | `building` | `bridge` | `banking` |
`forest` | `treeline` | `hedge` | `wall` | `fence` | `parking` |
`service-road` | `water` | `gate` | `helipad` | `other`

The game maps kinds to low-poly builders; unknown kinds are skipped, so
prefer a listed kind and put specifics in `notes`.

## Licensing rules (important)

- Geometry must come from ODbL-compatible sources (OpenStreetMap) or be
  positioned `alongTrack` from written/photographic references.
- Commercial satellite imagery (Google, Bing, Esri) may be used to
  **verify** geometry and to estimate heights/colors — but geometry may
  **not** be traced from it. Say in the notes which imagery was used for
  what.
- Record the license of every source in the notes file.

## Acceptance checklist

1. Control points match the track file's frame within **5 m**.
2. No feature footprint overlaps the racing surface: every polygon/
   polyline keeps **≥ 8 m** clearance from the track centerline (except
   `bridge`/`banking`, which may cross above).
3. Polygons are closed, non-self-intersecting, counter-clockwise.
4. Every feature has a `source`; estimated values are flagged.
5. All named grandstands and the pit complex of the venue are present
   (for a Grand Prix circuit this is the minimum bar).

## Delivery

- Scenery file: `src/tracks/<slug>.scenery.json`
- Notes: `docs/research/<slug>-scenery-notes.md` — sources, imagery used
  for verification, transform proof, estimates, omissions.
