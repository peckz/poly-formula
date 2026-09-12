#!/usr/bin/env python3
"""Build monza.speeds.json from sourced 2026 Gasly pole-lap waypoints.

Does not redistribute FastF1 / F1 car_data traces. Waypoints below are
summaries cited in docs/research/monza-speeds-notes.md.
"""

from __future__ import annotations

import json
import math
from pathlib import Path

LENGTH_M = 5793.4
OUT_JSON = Path("src/tracks/monza.speeds.json")
OUT_PLOT = Path("docs/research/monza-speeds-vs-s.png")

# Corner stations copied from src/tracks/monza.json
RETTIFILO = 622.279
BIASSONO = 1106.426
ROGGIA = 1838.272
LESMO1 = 2210.232
LESMO2 = 2582.962
SERRAGLIO = 2995.137
ASCARI = 3650.29
PARABOLICA = 4864.548

# Official FIA loops on this centreline (see notes).
SPEED_TRAP_S = RETTIFILO - 190.0  # 190 m before T1 (FIA 2026 circuit map)
I1_S = ROGGIA - 230.0  # 230 m before T4
I2_S = ASCARI - 210.0  # 210 m before T8
S1_S = 2061.0 * (LENGTH_M / 5793.0)
S2_S = (2061.0 + 1823.0) * (LENGTH_M / 5793.0)

# Brake Δ from Brembo 2026 (Rettifilo / Roggia) or FastF1 brake-flag→apex
# time × mean speed on Gasly pole lap (Lesmos / Ascari / Parabolica).
RETTIFILO_BRAKE = RETTIFILO - 153.0
ROGGIA_BRAKE = ROGGIA - 121.0
LESMO1_BRAKE = LESMO1 - 83.0
LESMO2_BRAKE = LESMO2 - 89.0
ASCARI_BRAKE = ASCARI - 123.0
PARABOLICA_BRAKE = PARABOLICA - 129.0


def dense_range(a: float, b: float, step: float) -> list[float]:
    if b <= a:
        return [a] if abs(b - a) < 1e-9 else []
    n = max(1, math.ceil((b - a) / step))
    return [a + i * (b - a) / n for i in range(n)]


# Waypoints: (s, speed_kmh, phase). Sourced numbers keep their exact s.
# Intermediate points only shape the envelope between sources.
WAYPOINTS: list[tuple[float, float, str]] = [
    (0.0, 288.0, "accel"),
    (80.0, 308.0, "accel"),
    (180.0, 322.0, "accel"),
    (280.0, 332.0, "accel"),
    (360.0, 340.0, "accel"),
    (400.0, 342.0, "hold"),
    (SPEED_TRAP_S, 334.0, "hold"),
    (RETTIFILO_BRAKE, 334.0, "brake"),
    (530.0, 250.0, "brake"),
    (570.0, 160.0, "brake"),
    (600.0, 100.0, "brake"),
    (RETTIFILO, 71.0, "apex"),
    (645.0, 90.0, "apex"),
    (680.0, 130.0, "exit"),
    (720.0, 165.0, "exit"),
    (800.0, 220.0, "accel"),
    (900.0, 268.0, "accel"),
    (1020.0, 295.0, "accel"),
    (BIASSONO, 305.0, "hold"),
    (1350.0, 307.0, "hold"),
    (I1_S, 308.0, "hold"),
    (ROGGIA_BRAKE, 308.0, "brake"),
    (1765.0, 200.0, "brake"),
    (1805.0, 145.0, "brake"),
    (ROGGIA, 118.0, "apex"),
    (1870.0, 140.0, "exit"),
    (1920.0, 168.0, "exit"),
    (2000.0, 205.0, "accel"),
    (LESMO1_BRAKE, 232.0, "brake"),
    (LESMO1, 205.0, "apex"),
    (2260.0, 218.0, "exit"),
    (2380.0, 230.0, "accel"),
    (LESMO2_BRAKE, 239.0, "brake"),
    (LESMO2, 184.0, "apex"),
    (2640.0, 205.0, "exit"),
    (2720.0, 235.0, "accel"),
    (2820.0, 270.0, "accel"),
    (2920.0, 295.0, "accel"),
    (SERRAGLIO, 308.0, "hold"),
    (3220.0, 320.0, "accel"),
    (I2_S, 327.0, "hold"),
    (ASCARI_BRAKE, 316.0, "brake"),
    (3580.0, 245.0, "brake"),
    (3620.0, 205.0, "brake"),
    (ASCARI, 186.0, "apex"),
    (3695.0, 205.0, "exit"),
    (3760.0, 235.0, "exit"),
    (3900.0, 268.0, "accel"),
    (4100.0, 292.0, "accel"),
    (4300.0, 305.0, "accel"),
    (4500.0, 314.0, "accel"),
    (4620.0, 319.0, "hold"),
    (PARABOLICA_BRAKE, 293.0, "brake"),
    (4795.0, 245.0, "brake"),
    (4835.0, 222.0, "brake"),
    (PARABOLICA, 211.0, "apex"),
    (4960.0, 226.0, "exit"),
    (5120.0, 248.0, "accel"),
    (5320.0, 265.0, "accel"),
    (5520.0, 276.0, "accel"),
    (5680.0, 283.0, "accel"),
    (LENGTH_M, 288.0, "accel"),
]


def lerp(a: float, b: float, t: float) -> float:
    return a + (b - a) * t


def speed_at(s: float) -> tuple[float, str]:
    if s <= WAYPOINTS[0][0]:
        return WAYPOINTS[0][1], WAYPOINTS[0][2]
    if s >= WAYPOINTS[-1][0]:
        return WAYPOINTS[-1][1], WAYPOINTS[-1][2]
    for i in range(len(WAYPOINTS) - 1):
        s0, v0, p0 = WAYPOINTS[i]
        s1, v1, p1 = WAYPOINTS[i + 1]
        if s0 <= s <= s1:
            t = 0.0 if s1 == s0 else (s - s0) / (s1 - s0)
            # Constant-decel / accel in v² between brake / accel pairs.
            if p0 in ("brake", "accel", "exit") or p1 in ("brake", "accel"):
                u0, u1 = v0 / 3.6, v1 / 3.6
                u2 = lerp(u0 * u0, u1 * u1, t)
                v = math.sqrt(max(u2, 1.0)) * 3.6
            else:
                v = lerp(v0, v1, t)
            phase = p0 if t < 0.5 else p1
            return v, phase
    return WAYPOINTS[-1][1], WAYPOINTS[-1][2]


def sample_stations() -> list[float]:
    fine = [
        (0.0, RETTIFILO_BRAKE - 20, 25.0),
        (RETTIFILO_BRAKE - 20, 760.0, 8.0),
        (760.0, ROGGIA_BRAKE - 20, 25.0),
        (ROGGIA_BRAKE - 20, 1960.0, 8.0),
        (1960.0, LESMO1_BRAKE - 15, 20.0),
        (LESMO1_BRAKE - 15, LESMO1 + 80, 10.0),
        (LESMO1 + 80, LESMO2_BRAKE - 15, 20.0),
        (LESMO2_BRAKE - 15, LESMO2 + 90, 10.0),
        (LESMO2 + 90, ASCARI_BRAKE - 20, 25.0),
        (ASCARI_BRAKE - 20, 3820.0, 8.0),
        (3820.0, PARABOLICA_BRAKE - 20, 25.0),
        (PARABOLICA_BRAKE - 20, 5050.0, 10.0),
        (5050.0, LENGTH_M, 25.0),
    ]
    stations: list[float] = []
    for a, b, step in fine:
        a = max(0.0, min(LENGTH_M, a))
        b = max(0.0, min(LENGTH_M, b))
        stations.extend(dense_range(a, b, step))
    must = [
        0.0,
        SPEED_TRAP_S,
        RETTIFILO_BRAKE,
        RETTIFILO,
        BIASSONO,
        I1_S,
        ROGGIA_BRAKE,
        ROGGIA,
        S1_S,
        LESMO1_BRAKE,
        LESMO1,
        LESMO2_BRAKE,
        LESMO2,
        SERRAGLIO,
        I2_S,
        ASCARI_BRAKE,
        ASCARI,
        S2_S,
        PARABOLICA_BRAKE,
        PARABOLICA,
        LENGTH_M,
    ]
    stations.extend(must)
    stations = sorted(set(round(s, 3) for s in stations if 0.0 <= s <= LENGTH_M + 1e-9))
    if stations[-1] != LENGTH_M:
        stations.append(LENGTH_M)
    if stations[0] != 0.0:
        stations.insert(0, 0.0)
    return stations


def integrate(samples: list[dict]) -> float:
    t = 0.0
    for i in range(len(samples) - 1):
        ds = samples[i + 1]["s"] - samples[i]["s"]
        v0 = samples[i]["speedKmh"] / 3.6
        v1 = samples[i + 1]["speedKmh"] / 3.6
        if v0 <= 0 or v1 <= 0:
            raise ValueError("non-positive speed")
        t += ds / ((v0 + v1) / 2.0)
    return t


def sector_time(samples: list[dict], a: float, b: float) -> float:
    pts = [s for s in samples if a - 1e-9 <= s["s"] <= b + 1e-9]
    if pts[0]["s"] > a:
        v, _ = speed_at(a)
        pts.insert(0, {"s": a, "speedKmh": v})
    if pts[-1]["s"] < b:
        v, _ = speed_at(b)
        pts.append({"s": b, "speedKmh": v})
    return integrate(pts)


def max_gap(samples: list[dict], lo: float, hi: float) -> float:
    ss = [s["s"] for s in samples if lo - 1e-9 <= s["s"] <= hi + 1e-9]
    return max(ss[i + 1] - ss[i] for i in range(len(ss) - 1))


def nearest(samples: list[dict], s: float) -> dict:
    return min(samples, key=lambda p: abs(p["s"] - s))


def build_samples() -> list[dict]:
    out = []
    for s in sample_stations():
        v, phase = speed_at(s)
        out.append(
            {
                "s": round(s, 3),
                "speedKmh": round(v, 1),
                "phase": phase,
            }
        )
    # Force sourced stations to the exact published speeds.
    lock = {
        0.0: (288.0, "accel"),
        SPEED_TRAP_S: (334.0, "hold"),
        RETTIFILO_BRAKE: (334.0, "brake"),
        RETTIFILO: (71.0, "apex"),
        BIASSONO: (305.0, "hold"),
        I1_S: (308.0, "hold"),
        ROGGIA_BRAKE: (308.0, "brake"),
        ROGGIA: (118.0, "apex"),
        LESMO1_BRAKE: (232.0, "brake"),
        LESMO1: (205.0, "apex"),
        LESMO2_BRAKE: (239.0, "brake"),
        LESMO2: (184.0, "apex"),
        SERRAGLIO: (308.0, "hold"),
        I2_S: (327.0, "hold"),
        ASCARI_BRAKE: (316.0, "brake"),
        ASCARI: (186.0, "apex"),
        PARABOLICA_BRAKE: (293.0, "brake"),
        PARABOLICA: (211.0, "apex"),
        LENGTH_M: (288.0, "accel"),
    }
    for p in out:
        for key, (v, phase) in lock.items():
            if abs(p["s"] - key) < 0.02:
                p["speedKmh"] = v
                p["phase"] = phase
    return out


def corners() -> list[dict]:
    return [
        {
            "id": "rettifilo",
            "name": "Variante del Rettifilo",
            "s": RETTIFILO,
            "entrySpeedKmh": 334,
            "apexSpeedKmh": 71,
            "exitSpeedKmh": 165,
            "brakePointS": round(RETTIFILO_BRAKE, 3),
            "brakePointConfidence": "high",
            "apexS": RETTIFILO,
            "apexConfidence": "high",
            "turnInS": 590.0,
            "exitS": 720.0,
            "gear": 1,
            "notes": (
                "Slower of the two chicane apexes (T1 right). FastF1 car_data min "
                "71 km/h in 1st on Gasly pole lap; T2 is already accelerating. "
                "Brake Δ 153 m from Brembo 2026 T1 simulation; official SpeedST "
                "on this lap 334 km/h."
            ),
        },
        {
            "id": "biassono",
            "name": "Curva Biassono",
            "s": BIASSONO,
            "entrySpeedKmh": 305,
            "apexSpeedKmh": 305,
            "exitSpeedKmh": 307,
            "brakePointS": BIASSONO,
            "brakePointConfidence": "high",
            "apexS": BIASSONO,
            "apexConfidence": "high",
            "gear": 8,
            "notes": (
                "No brake or lift on the pole lap (full throttle through Curva "
                "Grande). Speed is still climbing out of Rettifilo; 305 km/h at "
                "the geometric apex, 307–308 km/h by the I1 loop."
            ),
        },
        {
            "id": "roggia",
            "name": "Variante della Roggia",
            "s": ROGGIA,
            "entrySpeedKmh": 308,
            "apexSpeedKmh": 118,
            "exitSpeedKmh": 168,
            "brakePointS": round(ROGGIA_BRAKE, 3),
            "brakePointConfidence": "medium",
            "apexS": ROGGIA,
            "apexConfidence": "medium",
            "turnInS": 1810.0,
            "exitS": 1920.0,
            "gear": 2,
            "notes": (
                "Official SpeedI1 on this lap 308 km/h (230 m before T4). Apex "
                "118 km/h is the first valid FastF1 sample after a timing dropout "
                "through the stop, matching FormulaDream's published Gasly Q3 "
                "chicane min. Brake Δ 121 m from Brembo 2026 T4 note."
            ),
        },
        {
            "id": "lesmo1",
            "name": "Lesmo 1",
            "s": LESMO1,
            "entrySpeedKmh": 232,
            "apexSpeedKmh": 205,
            "exitSpeedKmh": 218,
            "brakePointS": round(LESMO1_BRAKE, 3),
            "brakePointConfidence": "high",
            "apexS": LESMO1,
            "apexConfidence": "high",
            "gear": 5,
            "notes": (
                "Short brake, not a lift-only. FastF1 pole lap: brake-on 232 km/h, "
                "min 205 km/h in 5th. FP2 top-7 mean was 239→203."
            ),
        },
        {
            "id": "lesmo2",
            "name": "Lesmo 2",
            "s": LESMO2,
            "entrySpeedKmh": 239,
            "apexSpeedKmh": 184,
            "exitSpeedKmh": 218,
            "brakePointS": round(LESMO2_BRAKE, 3),
            "brakePointConfidence": "high",
            "apexS": LESMO2,
            "apexConfidence": "high",
            "gear": 4,
            "notes": (
                "Harder stop than Lesmo 1. FastF1 pole lap: brake-on 239 km/h, "
                "min 184 km/h in 4th. FP2 top-7 mean was 236→182."
            ),
        },
        {
            "id": "serraglio",
            "name": "Curva del Serraglio",
            "s": SERRAGLIO,
            "entrySpeedKmh": 308,
            "apexSpeedKmh": 308,
            "exitSpeedKmh": 320,
            "brakePointS": SERRAGLIO,
            "brakePointConfidence": "high",
            "apexS": SERRAGLIO,
            "apexConfidence": "high",
            "gear": 8,
            "notes": (
                "No brake or lift on the pole lap. Wide left kink taken as part "
                "of the drive from Lesmo 2 to the I2 loop (327 km/h)."
            ),
        },
        {
            "id": "ascari",
            "name": "Variante Ascari",
            "s": ASCARI,
            "entrySpeedKmh": 316,
            "apexSpeedKmh": 186,
            "exitSpeedKmh": 235,
            "brakePointS": round(ASCARI_BRAKE, 3),
            "brakePointConfidence": "high",
            "apexS": ASCARI,
            "apexConfidence": "high",
            "turnInS": 3580.0,
            "exitS": 3765.0,
            "gear": 4,
            "notes": (
                "Slower of the L–R–L (first left / Vialone). FastF1 pole lap: "
                "I2 327 km/h, brake-on 316 km/h, min 186 km/h in 4th. FP2 top-7 "
                "mean was 314→189."
            ),
        },
        {
            "id": "parabolica",
            "name": "Curva Alboreto",
            "s": PARABOLICA,
            "entrySpeedKmh": 293,
            "apexSpeedKmh": 211,
            "exitSpeedKmh": 248,
            "brakePointS": round(PARABOLICA_BRAKE, 3),
            "brakePointConfidence": "high",
            "apexS": PARABOLICA,
            "apexConfidence": "high",
            "turnInS": 4780.0,
            "exitS": 5080.0,
            "gear": 5,
            "notes": (
                "FastF1 min 211 km/h in 5th — same figure FormulaDream published "
                "for Gasly Q3 (highest of the top seven). Peak on the opposite "
                "straight 319 km/h then a lift/harvest before brake-on at 293. "
                "Official SpeedFL on this lap 287 km/h."
            ),
        },
    ]


def write_plot(samples: list[dict], implied: float) -> None:
    import matplotlib.pyplot as plt

    xs = [p["s"] for p in samples]
    ys = [p["speedKmh"] for p in samples]
    fig, ax = plt.subplots(figsize=(12.5, 4.6), dpi=140)
    ax.plot(xs, ys, color="#1d4ed8", lw=1.6, label="Gasly 2026 Q3 pole envelope")
    marks = [
        (RETTIFILO, 71, "Rettifilo"),
        (BIASSONO, 305, "Biassono"),
        (ROGGIA, 118, "Roggia"),
        (LESMO1, 205, "Lesmo 1"),
        (LESMO2, 184, "Lesmo 2"),
        (SERRAGLIO, 308, "Serraglio"),
        (ASCARI, 186, "Ascari"),
        (PARABOLICA, 211, "Parabolica"),
    ]
    for s, v, name in marks:
        ax.scatter([s], [v], c="#b91c1c", s=22, zorder=3)
        ax.annotate(
            f"{name}\n{v:.0f}",
            (s, v),
            textcoords="offset points",
            xytext=(0, 8 if v < 250 else -22),
            ha="center",
            fontsize=7,
            color="#7f1d1d",
        )
    ax.axhline(342, color="#94a3b8", ls="--", lw=0.8, label="top 342 km/h")
    ax.set_xlim(0, LENGTH_M)
    ax.set_ylim(40, 380)
    ax.set_xlabel("s (m) — monza.json centreline")
    ax.set_ylabel("speed (km/h)")
    ax.set_title(
        f"Monza GP · 2026 quali pole (Gasly 1:21.786) · implied {implied:.3f}s"
    )
    ax.grid(True, alpha=0.25)
    ax.legend(loc="lower right", fontsize=8)
    fig.tight_layout()
    OUT_PLOT.parent.mkdir(parents=True, exist_ok=True)
    fig.savefig(OUT_PLOT)
    plt.close(fig)


def main() -> None:
    samples = build_samples()
    implied = integrate(samples)
    t1 = sector_time(samples, 0.0, I1_S)
    t2 = sector_time(samples, I1_S, I2_S)
    t3 = sector_time(samples, I2_S, LENGTH_M)
    t1_km = sector_time(samples, 0.0, S1_S)
    t2_km = sector_time(samples, S1_S, S2_S)
    t3_km = sector_time(samples, S2_S, LENGTH_M)

    payload = {
        "formatVersion": 1,
        "trackId": "monza",
        "units": {"speed": "km/h", "distance": "m", "time": "s"},
        "reference": {
            "class": "f1",
            "season": 2026,
            "session": "qualifying",
            "driver": "Pierre Gasly",
            "team": "BWT Alpine F1 Team",
            "car": "A526",
            "lapTimeS": 81.786,
            "sectorTimesS": [26.817, 27.706, 27.263],
            "source": (
                "FIA 2026 Italian GP Final Qualifying Classification "
                "(Doc 50, 2026-09-05): pole 1:21.786 / 254.992 km/h. "
                "Sector splits and SpeedI1/I2/FL/ST from F1 live timing "
                "via FastF1 3.8.3 on that lap (no raw trace redistributed)."
            ),
            "notes": (
                "Dry Q3 pole, current GP layout, 2026 active-aero cars "
                "(no DRS). Soft tyre, tyre life 2. Layout matches monza.json "
                "(Rettifilo / Roggia / Ascari chicanes, no oval)."
            ),
        },
        "lap": {
            "lengthM": LENGTH_M,
            "topSpeedKmh": 342.0,
            "topSpeedS": 400.0,
            "speedTrapKmh": 334.0,
            "speedTrapS": round(SPEED_TRAP_S, 3),
            "finishLineKmh": 287.0,
            "impliedLapTimeS": round(implied, 3),
            "impliedSectorTimesS": [round(t1, 3), round(t2, 3), round(t3, 3)],
            "sectorBeams": {
                "kind": "fiaLoopsOnThisCenterline",
                "s": [round(I1_S, 3), round(I2_S, 3), LENGTH_M],
                "note": (
                    "Splits at I1 (230 m before T4) and I2 (210 m before T8), "
                    "not the FIA surveyed 2.061 / 3.884 km marks. I1→I2 length "
                    "is 1832 m vs published S2 1823 m."
                ),
            },
            "method": (
                "Trapezoidal ∫ ds/v over samples (v in m/s), closed 0→5793.4. "
                "Waypoints are official timing loops + FastF1 pole-lap event "
                "speeds + Brembo 2026 brake distances. Straight samples are "
                "v²-interpolated between those waypoints; apex and brake-point "
                "speeds are locked to the sourced values."
            ),
        },
        "corners": corners(),
        "samples": samples,
        "source": {
            "primary": [
                "https://www.fia.com/system/files/decision-document/2026_italian_grand_prix_-_final_qualifying_classification.pdf",
                "https://www.fia.com/sites/default/files/2026_13_ita_f1_q0_timing_qualifyingsessionmaximumspeeds_v01.pdf",
                "https://www.fia.com/system/files/decision-document/2026_italian_grand_prix_-_competition_notes_-_circuit_map_pit_lane_drawing_emergency_exits_map_and_red_zone.pdf",
                "F1 live timing car_data / timing data for 2026 Italian GP qualifying, accessed with FastF1 3.8.3 (summaries only)",
            ],
            "secondary": [
                "https://www.formuladream.app/blog/italian-gp-2026-qualifying-results",
                "https://www.formuladream.app/blog/monza-2026-telemetry-analysis",
                "https://www.planetf1.com/f1-data/pierre-gasly-italian-grand-prix-pole-data",
                "https://www.brembo.com/en/motorsport/formula1/2026/facts-monza-2026",
                "https://www.formula1.com/en/latest/article/gasly-charges-to-sensational-maiden-f1-pole-at-monza-over-russell-and-piastri.4CKkkbvgmqL04ijMNBfuXF",
            ],
            "license": (
                "facts / fair-use telemetry summaries — no proprietary raw traces redistributed"
            ),
        },
    }

    OUT_JSON.parent.mkdir(parents=True, exist_ok=True)
    OUT_JSON.write_text(json.dumps(payload, indent=2) + "\n")
    write_plot(samples, implied)

    print(f"samples {len(samples)}")
    print(f"implied {implied:.3f}  ref 81.786  d{implied-81.786:+.3f}")
    print(f"I1/I2 splits {t1:.3f}/{t2:.3f}/{t3:.3f}  official S2 {27.706}")
    print(f"FIA-km marks {t1_km:.3f}/{t2_km:.3f}/{t3_km:.3f}  official 26.817/27.706/27.263")
    print(
        f"gaps straight-ish {max_gap(samples, 0, RETTIFILO_BRAKE-1):.2f} "
        f"T1 {max_gap(samples, RETTIFILO_BRAKE, 750):.2f} "
        f"Roggia {max_gap(samples, ROGGIA_BRAKE, 1960):.2f} "
        f"Ascari {max_gap(samples, ASCARI_BRAKE, 3820):.2f}"
    )
    for cid, s, apex, brake, entry in [
        ("rettifilo", RETTIFILO, 71, RETTIFILO_BRAKE, 334),
        ("biassono", BIASSONO, 305, BIASSONO, 305),
        ("roggia", ROGGIA, 118, ROGGIA_BRAKE, 308),
        ("lesmo1", LESMO1, 205, LESMO1_BRAKE, 232),
        ("lesmo2", LESMO2, 184, LESMO2_BRAKE, 239),
        ("serraglio", SERRAGLIO, 308, SERRAGLIO, 308),
        ("ascari", ASCARI, 186, ASCARI_BRAKE, 316),
        ("parabolica", PARABOLICA, 211, PARABOLICA_BRAKE, 293),
    ]:
        sa = nearest(samples, s)
        sb = nearest(samples, brake)
        print(
            f"{cid:11} apex {sa['speedKmh']:6.1f} (d{sa['speedKmh']-apex:+.1f})  "
            f"brake {sb['speedKmh']:6.1f} (d{sb['speedKmh']-entry:+.1f})"
        )
    print(f"wrap {samples[0]['speedKmh']} → {samples[-1]['speedKmh']}")


if __name__ == "__main__":
    main()
