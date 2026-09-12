#!/usr/bin/env python3
"""Build monza.speeds.json from sourced 2024 Norris pole-lap waypoints.

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

# Racing apexes from racing-line PR #7 (same Norris 2024 pole).
LESMO1_APEX = 2255.0
PARABOLICA_APEX = 5065.0

# Official FIA loops on this centreline (2024/2026 maps use the same offsets).
SPEED_TRAP_S = RETTIFILO - 190.0
I1_S = ROGGIA - 230.0
I2_S = ASCARI - 210.0
S1_S = 2061.0 * (LENGTH_M / 5793.0)
S2_S = (2061.0 + 1823.0) * (LENGTH_M / 5793.0)

# Brembo same-gen T1 129 m / T4 107 m; FastF1 brake-on→min × mean v otherwise.
RETTIFILO_BRAKE = RETTIFILO - 129.0
ROGGIA_BRAKE = ROGGIA - 107.0
LESMO1_BRAKE = LESMO1 - 102.0
LESMO2_BRAKE = LESMO2 - 73.0
ASCARI_BRAKE = ASCARI - 104.0
PARABOLICA_BRAKE = 4725.0


def dense_range(a: float, b: float, step: float) -> list[float]:
    if b <= a:
        return [a] if abs(b - a) < 1e-9 else []
    n = max(1, math.ceil((b - a) / step))
    return [a + i * (b - a) / n for i in range(n)]


WAYPOINTS: list[tuple[float, float, str]] = [
    (0.0, 316.0, "accel"),
    (80.0, 326.0, "accel"),
    (180.0, 334.0, "accel"),
    (280.0, 340.0, "accel"),
    (360.0, 344.0, "accel"),
    (410.0, 347.0, "hold"),
    (SPEED_TRAP_S, 346.0, "hold"),
    (RETTIFILO_BRAKE, 346.0, "brake"),
    (540.0, 250.0, "brake"),
    (575.0, 150.0, "brake"),
    (605.0, 95.0, "brake"),
    (RETTIFILO, 73.0, "apex"),
    (655.0, 81.0, "apex"),
    (690.0, 120.0, "exit"),
    (745.0, 160.0, "exit"),
    (820.0, 210.0, "accel"),
    (920.0, 260.0, "accel"),
    (1020.0, 295.0, "accel"),
    (BIASSONO, 318.0, "hold"),
    (1400.0, 322.0, "hold"),
    (I1_S, 324.0, "hold"),
    (ROGGIA_BRAKE, 317.0, "brake"),
    (1775.0, 200.0, "brake"),
    (1810.0, 145.0, "brake"),
    (ROGGIA, 113.0, "apex"),
    (1884.0, 127.0, "exit"),
    (1930.0, 160.0, "exit"),
    (2020.0, 210.0, "accel"),
    (LESMO1_BRAKE, 263.0, "brake"),
    (LESMO1, 230.0, "brake"),
    (LESMO1_APEX, 207.0, "apex"),
    (2305.0, 226.0, "exit"),
    (2400.0, 248.0, "accel"),
    (LESMO2_BRAKE, 248.0, "brake"),
    (LESMO2, 190.0, "apex"),
    (2640.0, 219.0, "exit"),
    (2740.0, 250.0, "accel"),
    (2860.0, 285.0, "accel"),
    (SERRAGLIO, 322.0, "hold"),
    (3250.0, 332.0, "accel"),
    (I2_S, 338.0, "hold"),
    (ASCARI_BRAKE, 296.0, "brake"),
    (3595.0, 230.0, "brake"),
    (ASCARI, 194.0, "apex"),
    (3720.0, 217.0, "exit"),
    (3820.0, 242.0, "exit"),
    (4000.0, 275.0, "accel"),
    (4200.0, 300.0, "accel"),
    (4400.0, 316.0, "accel"),
    (4580.0, 326.0, "accel"),
    (4680.0, 329.0, "hold"),
    (PARABOLICA_BRAKE, 307.0, "brake"),
    (PARABOLICA, 240.0, "brake"),
    (4960.0, 222.0, "brake"),
    (PARABOLICA_APEX, 215.0, "apex"),
    (5180.0, 237.0, "exit"),
    (5300.0, 256.0, "exit"),
    (5480.0, 284.0, "accel"),
    (5640.0, 302.0, "accel"),
    (LENGTH_M, 316.0, "accel"),
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
        (LESMO1_BRAKE - 15, LESMO1_APEX + 80, 10.0),
        (LESMO1_APEX + 80, LESMO2_BRAKE - 15, 20.0),
        (LESMO2_BRAKE - 15, LESMO2 + 90, 10.0),
        (LESMO2 + 90, ASCARI_BRAKE - 20, 25.0),
        (ASCARI_BRAKE - 20, 3900.0, 8.0),
        (3900.0, PARABOLICA_BRAKE - 20, 25.0),
        (PARABOLICA_BRAKE - 20, 5320.0, 10.0),
        (5320.0, LENGTH_M, 25.0),
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
        LESMO1_APEX,
        LESMO2_BRAKE,
        LESMO2,
        SERRAGLIO,
        I2_S,
        ASCARI_BRAKE,
        ASCARI,
        S2_S,
        PARABOLICA_BRAKE,
        PARABOLICA,
        PARABOLICA_APEX,
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


LOCK = {
    0.0: (316.0, "accel"),
    SPEED_TRAP_S: (346.0, "hold"),
    RETTIFILO_BRAKE: (346.0, "brake"),
    RETTIFILO: (73.0, "apex"),
    BIASSONO: (318.0, "hold"),
    I1_S: (324.0, "hold"),
    ROGGIA_BRAKE: (317.0, "brake"),
    ROGGIA: (113.0, "apex"),
    LESMO1_BRAKE: (263.0, "brake"),
    LESMO1_APEX: (207.0, "apex"),
    LESMO2_BRAKE: (248.0, "brake"),
    LESMO2: (190.0, "apex"),
    SERRAGLIO: (322.0, "hold"),
    I2_S: (338.0, "hold"),
    ASCARI_BRAKE: (296.0, "brake"),
    ASCARI: (194.0, "apex"),
    PARABOLICA_BRAKE: (307.0, "brake"),
    PARABOLICA_APEX: (215.0, "apex"),
    LENGTH_M: (316.0, "accel"),
}


def build_samples() -> list[dict]:
    out = []
    for s in sample_stations():
        v, phase = speed_at(s)
        out.append({"s": round(s, 3), "speedKmh": round(v, 1), "phase": phase})
    for p in out:
        for key, (v, phase) in LOCK.items():
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
            "entrySpeedKmh": 346,
            "apexSpeedKmh": 73,
            "exitSpeedKmh": 160,
            "brakePointS": round(RETTIFILO_BRAKE, 3),
            "brakePointConfidence": "high",
            "apexS": RETTIFILO,
            "apexConfidence": "high",
            "turnInS": 555.0,
            "exitS": 745.0,
            "gear": 2,
            "notes": (
                "Slower of T1/T2. FastF1 min 73 km/h in 2nd on Norris pole lap "
                "(T2 second brush 81). Official SpeedST 346; FastF1 peak 347. "
                "Brake Δ 129 m from Brembo same-gen T1 (337→89 in 2.75 s / 4.7 g)."
            ),
        },
        {
            "id": "biassono",
            "name": "Curva Biassono",
            "s": BIASSONO,
            "entrySpeedKmh": 318,
            "apexSpeedKmh": 318,
            "exitSpeedKmh": 322,
            "brakePointS": BIASSONO,
            "brakePointConfidence": "high",
            "apexS": BIASSONO,
            "apexConfidence": "high",
            "gear": 8,
            "notes": (
                "No brake or lift on the pole lap. Still climbing out of "
                "Rettifilo; 318 km/h at the geometric apex, 324 km/h by I1."
            ),
        },
        {
            "id": "roggia",
            "name": "Variante della Roggia",
            "s": ROGGIA,
            "entrySpeedKmh": 317,
            "apexSpeedKmh": 113,
            "exitSpeedKmh": 160,
            "brakePointS": round(ROGGIA_BRAKE, 3),
            "brakePointConfidence": "high",
            "apexS": ROGGIA,
            "apexConfidence": "high",
            "turnInS": 1810.0,
            "exitS": 1930.0,
            "gear": 3,
            "notes": (
                "Official SpeedI1 324 km/h; FastF1 brake-on 317, min 113 in 3rd "
                "(clean trace — no dropout). Brake Δ 107 m from Brembo 2025 T4 "
                "same-generation figure."
            ),
        },
        {
            "id": "lesmo1",
            "name": "Lesmo 1",
            "s": LESMO1,
            "entrySpeedKmh": 263,
            "apexSpeedKmh": 207,
            "exitSpeedKmh": 226,
            "brakePointS": round(LESMO1_BRAKE, 3),
            "brakePointConfidence": "high",
            "apexS": LESMO1_APEX,
            "apexConfidence": "high",
            "gear": 5,
            "notes": (
                "FastF1 brake-on 263, min 207 in 5th. apexS is the racing apex "
                "at 2255 m (PR #7), 45 m after the centreline heading peak."
            ),
        },
        {
            "id": "lesmo2",
            "name": "Lesmo 2",
            "s": LESMO2,
            "entrySpeedKmh": 248,
            "apexSpeedKmh": 190,
            "exitSpeedKmh": 219,
            "brakePointS": round(LESMO2_BRAKE, 3),
            "brakePointConfidence": "high",
            "apexS": LESMO2,
            "apexConfidence": "high",
            "gear": 5,
            "notes": (
                "FastF1 brake-on 248, min 190 in 5th. Harder stop than Lesmo 1."
            ),
        },
        {
            "id": "serraglio",
            "name": "Curva del Serraglio",
            "s": SERRAGLIO,
            "entrySpeedKmh": 322,
            "apexSpeedKmh": 322,
            "exitSpeedKmh": 332,
            "brakePointS": SERRAGLIO,
            "brakePointConfidence": "high",
            "apexS": SERRAGLIO,
            "apexConfidence": "high",
            "gear": 8,
            "notes": (
                "No brake or lift. DRS-era drive from Lesmo 2 toward I2 338 km/h."
            ),
        },
        {
            "id": "ascari",
            "name": "Variante Ascari",
            "s": ASCARI,
            "entrySpeedKmh": 296,
            "apexSpeedKmh": 194,
            "exitSpeedKmh": 242,
            "brakePointS": round(ASCARI_BRAKE, 3),
            "brakePointConfidence": "high",
            "apexS": ASCARI,
            "apexConfidence": "high",
            "turnInS": 3570.0,
            "exitS": 4020.0,
            "gear": 5,
            "notes": (
                "Slower of the L–R–L (first left). Official I2 338; FastF1 "
                "brake-on 296 after a lift, min 194 in 5th. PlanetF1: Norris "
                "9 km/h faster than Verstappen here on this weekend."
            ),
        },
        {
            "id": "parabolica",
            "name": "Curva Alboreto",
            "s": PARABOLICA,
            "entrySpeedKmh": 307,
            "apexSpeedKmh": 215,
            "exitSpeedKmh": 256,
            "brakePointS": PARABOLICA_BRAKE,
            "brakePointConfidence": "high",
            "apexS": PARABOLICA_APEX,
            "apexConfidence": "high",
            "turnInS": 4765.0,
            "exitS": 5260.0,
            "gear": 5,
            "notes": (
                "FastF1 min 215 in 5th at the late racing apex (s=5065, PR #7), "
                "not the centreline heading peak at 4864. Opposite-straight peak "
                "329 then brake-on 307. Official SpeedFL 315. PlanetF1: Norris "
                "~10 km/h faster than Verstappen through Parabolica."
            ),
        },
    ]


def write_plot(samples: list[dict], implied: float) -> None:
    import matplotlib.pyplot as plt

    xs = [p["s"] for p in samples]
    ys = [p["speedKmh"] for p in samples]
    fig, ax = plt.subplots(figsize=(12.5, 4.6), dpi=140)
    ax.plot(xs, ys, color="#1d4ed8", lw=1.6, label="Norris 2024 Q3 pole envelope")
    marks = [
        (RETTIFILO, 73, "Rettifilo"),
        (BIASSONO, 318, "Biassono"),
        (ROGGIA, 113, "Roggia"),
        (LESMO1_APEX, 207, "Lesmo 1"),
        (LESMO2, 190, "Lesmo 2"),
        (SERRAGLIO, 322, "Serraglio"),
        (ASCARI, 194, "Ascari"),
        (PARABOLICA_APEX, 215, "Parabolica"),
    ]
    for s, v, name in marks:
        ax.scatter([s], [v], c="#b91c1c", s=22, zorder=3)
        ax.annotate(
            f"{name}\n{v:.0f}",
            (s, v),
            textcoords="offset points",
            xytext=(0, 8 if v < 260 else -22),
            ha="center",
            fontsize=7,
            color="#7f1d1d",
        )
    ax.axhline(347, color="#94a3b8", ls="--", lw=0.8, label="top 347 km/h")
    ax.set_xlim(0, LENGTH_M)
    ax.set_ylim(40, 380)
    ax.set_xlabel("s (m) — monza.json centreline")
    ax.set_ylabel("speed (km/h)")
    ax.set_title(
        f"Monza GP · 2024 quali pole (Norris 1:19.327) · implied {implied:.3f}s"
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
            "season": 2024,
            "session": "qualifying",
            "driver": "Lando Norris",
            "team": "McLaren Formula 1 Team",
            "car": "MCL38",
            "lapTimeS": 79.327,
            "sectorTimesS": [26.492, 26.579, 26.256],
            "source": (
                "FIA 2024 Italian GP qualifying: pole 1:19.327 / 262.896 km/h "
                "(Autosport / FIA). Sector splits 26.492 / 26.579 / 26.256 and "
                "SpeedI1/I2/FL/ST 324 / 338 / 315 / 346 from F1 live timing via "
                "FastF1 3.8.3 and FIA sector-analysis PDF (no raw trace redistributed)."
            ),
            "notes": (
                "Dry Q3 pole, current GP layout (2024 flattened Ascari kerbs). "
                "Soft tyre, tyre life 2, DRS-era car. Same reference lap as "
                "racing-line PR #7. This speeds PR first committed Pierre Gasly "
                "2026 Q3 pole 1:21.786 (new-reg, no DRS); retargeted here so "
                "line and speeds describe one lap."
            ),
        },
        "lap": {
            "lengthM": LENGTH_M,
            "topSpeedKmh": 347.0,
            "topSpeedS": 410.0,
            "speedTrapKmh": 346.0,
            "speedTrapS": round(SPEED_TRAP_S, 3),
            "finishLineKmh": 315.0,
            "impliedLapTimeS": round(implied, 3),
            "impliedSectorTimesS": [round(t1, 3), round(t2, 3), round(t3, 3)],
            "sectorBeams": {
                "kind": "fiaLoopsOnThisCenterline",
                "s": [round(I1_S, 3), round(I2_S, 3), LENGTH_M],
                "note": (
                    "Splits at I1 (230 m before T4) and I2 (210 m before T8). "
                    "I1→I2 length is 1832 m vs published S2 1823 m."
                ),
            },
            "method": (
                "Trapezoidal ∫ ds/v over samples (v in m/s), closed 0→5793.4. "
                "Waypoints are official timing loops + FastF1 pole-lap event "
                "speeds + Brembo same-gen brake distances. Straight samples are "
                "v²-interpolated; apex and brake-point speeds are locked."
            ),
        },
        "corners": corners(),
        "samples": samples,
        "source": {
            "primary": [
                "https://www.fia.com/news/f1-norris-pole-mclaren-lock-out-front-row-monza-verstappen-seventh",
                "https://api.fia.com/sites/default/files/2024_16_ita_f1_q0_timing_qualifyingsessionsectoranalysis_v01.pdf",
                "https://www.fia.com/sites/default/files/2024_16_ita_f1_q0_timing_qualifyingsessionmaximumspeeds_v01.pdf",
                "https://www.autosport.com/f1/results/2024/italian-gp-639981/?st=GRID",
                "F1 live timing car_data / timing data for 2024 Italian GP qualifying, accessed with FastF1 3.8.3 (summaries only)",
            ],
            "secondary": [
                "https://www.formula1.com/en/latest/article/watch-ride-onboard-for-norriss-formidable-pole-lap-in-monza-qualifying.4qWIftLYRedtL9ab1Jlt5M",
                "https://www.planetf1.com/news/lando-norris-data-vs-max-verstappen-italian-gp-qualifying",
                "https://www.brembo.com/en/motorsport/formula1/facts-formula1-gp-monza",
                "https://github.com/peckz/poly-formula/pull/7",
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
    print(f"implied {implied:.3f}  ref 79.327  d{implied-79.327:+.3f}")
    print(f"I1/I2 splits {t1:.3f}/{t2:.3f}/{t3:.3f}  official 26.492/26.579/26.256")
    print(f"FIA-km marks {t1_km:.3f}/{t2_km:.3f}/{t3_km:.3f}")
    print(
        f"gaps T1 {max_gap(samples, RETTIFILO_BRAKE, 750):.2f} "
        f"Roggia {max_gap(samples, ROGGIA_BRAKE, 1960):.2f} "
        f"Ascari {max_gap(samples, ASCARI_BRAKE, 3900):.2f} "
        f"max {max(samples[i+1]['s']-samples[i]['s'] for i in range(len(samples)-1)):.2f}"
    )
    for cid, s, apex, brake, entry in [
        ("rettifilo", RETTIFILO, 73, RETTIFILO_BRAKE, 346),
        ("biassono", BIASSONO, 318, BIASSONO, 318),
        ("roggia", ROGGIA, 113, ROGGIA_BRAKE, 317),
        ("lesmo1", LESMO1_APEX, 207, LESMO1_BRAKE, 263),
        ("lesmo2", LESMO2, 190, LESMO2_BRAKE, 248),
        ("serraglio", SERRAGLIO, 322, SERRAGLIO, 322),
        ("ascari", ASCARI, 194, ASCARI_BRAKE, 296),
        ("parabolica", PARABOLICA_APEX, 215, PARABOLICA_BRAKE, 307),
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
