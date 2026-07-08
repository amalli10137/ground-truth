"""Shared helpers for level-pack generation.

Every level module exposes build() -> pack dict matching src/lib/types.ts.
Tolerances are ~4 standard errors of the intended (best practical) estimator,
computed analytically or by Monte Carlo — never hand-tuned. If a seed produces
a draw where the intended method fails the winnability test, change the seed.
"""

from __future__ import annotations

import json
from pathlib import Path

import numpy as np

OUT_DIR = Path(__file__).resolve().parent.parent / "public" / "levels"


def rng(seed: int) -> np.random.Generator:
    return np.random.default_rng(seed)


def stats_of(y: np.ndarray) -> dict:
    y = np.asarray(y, dtype=float)
    return {
        "n": int(y.size),
        "mean": float(np.mean(y)),
        "std": float(np.std(y, ddof=1)),
        "min": float(np.min(y)),
        "max": float(np.max(y)),
    }


def spectrum_of(y: np.ndarray, dt: float) -> dict:
    """Log-magnitude one-sided FFT of the observed series (chart toggle)."""
    y = np.asarray(y, dtype=float)
    X = np.fft.rfft(y)
    f = np.fft.rfftfreq(y.size, d=dt)
    mag = np.abs(X) * 2.0 / y.size
    logmag = np.log10(np.maximum(mag, 1e-12))
    return {"f": _round_list(f), "logmag": _round_list(logmag)}


def _round_list(a) -> list:
    """10 significant digits — small JSON, far below any tolerance."""
    return [float(f"{float(v):.10g}") for v in np.asarray(a).ravel()]


def field(name: str, label: str, target: float, tol: float, unit: str | None = None,
          integer: bool = False, help: str | None = None) -> dict:
    f = {"name": name, "label": label, "target": float(f"{target:.10g}"),
         "tol": float(f"{tol:.6g}")}
    if unit:
        f["unit"] = unit
    if integer:
        f["integer"] = True
    if help:
        f["help"] = help
    return f


def range_field(name: str, label: str, lo: float, hi: float, unit: str | None = None,
                integer: bool = False, help: str | None = None) -> dict:
    f = {"name": name, "label": label, "range": [float(lo), float(hi)]}
    if unit:
        f["unit"] = unit
    if integer:
        f["integer"] = True
    if help:
        f["help"] = help
    return f


def make_pack(*, id: int, seed: int, kind: str, columns: dict, truth: dict,
              grading: dict, spectrum: dict | None = None,
              stats_col: str | None = None) -> dict:
    cols = {k: _round_list(v) for k, v in columns.items()}
    if stats_col is None:
        stats_col = "y" if "y" in cols else [k for k in cols if k != "t"][0] if len(cols) > 1 else "t"
    pack = {
        "id": id,
        "seed": seed,
        "kind": kind,
        "columns": cols,
        "stats": stats_of(np.asarray(columns[stats_col], dtype=float)),
        "truth": truth,
        "grading": grading,
    }
    if spectrum is not None:
        pack["spectrum"] = spectrum
    return pack


def truth_block(params: dict, equation_latex: str, curve_t=None, curve_y=None,
                states=None) -> dict:
    t = {"params": {k: float(f"{v:.10g}") for k, v in params.items()},
         "equationLatex": equation_latex}
    if curve_t is not None:
        t["curve"] = {"t": _round_list(curve_t), "y": _round_list(curve_y)}
    if states is not None:
        t["states"] = [int(s) for s in np.asarray(states).ravel()]
    return t


def write_pack(pack: dict) -> Path:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    path = OUT_DIR / f"{pack['id']:02d}.json"
    with open(path, "w") as fh:
        json.dump(pack, fh, separators=(",", ":"))
    return path
