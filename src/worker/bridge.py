"""GROUND TRUTH — Python-side bridge.

Runs once at worker boot. Sets up the namespace the player's code executes in:
  data            pandas DataFrame of the level's observed data
  overlay(t, y)   draw a candidate curve on the main chart
  overlay_fn(f)   evaluate a callable on the level's time grid and overlay it
  residuals(yhat) render the residual subplot + print RMSE
  shade(states)   background-shade the chart by a discrete state path
  clear_overlays()
"""

import json
import sys
import warnings

# pandas 2.x emits a loud pyarrow deprecation notice on import; keep the
# player's console clean
warnings.filterwarnings("ignore", message=".*[Pp]yarrow.*")

import numpy as np
import pandas as pd
import scipy  # noqa: F401
import scipy.fft  # noqa: F401
import scipy.linalg  # noqa: F401
import scipy.optimize  # noqa: F401
import scipy.signal  # noqa: F401
import scipy.stats  # noqa: F401

import gt_host
from pyodide.ffi import to_js

data: pd.DataFrame = pd.DataFrame()

_MAX_POINTS = 50_000


def _as_float_list(a):
    arr = np.asarray(a, dtype=float).ravel()
    if arr.size > _MAX_POINTS:
        raise ValueError(f"overlay too large ({arr.size} points; max {_MAX_POINTS})")
    return [float(v) for v in arr]


def overlay(t, y, label="candidate", style="dash"):
    """Plot an arbitrary curve on top of the observed data."""
    tl, yl = _as_float_list(t), _as_float_list(y)
    if len(tl) != len(yl):
        raise ValueError(f"overlay: t and y lengths differ ({len(tl)} vs {len(yl)})")
    gt_host.overlay(to_js(tl), to_js(yl), str(label), str(style))


def overlay_fn(f, label="candidate", style="dash"):
    """Evaluate a callable on the level's time grid and overlay the result."""
    t = data["t"].to_numpy(dtype=float)
    try:
        y = np.asarray(f(t), dtype=float)
        if y.shape != t.shape:
            raise ValueError
    except Exception:
        y = np.asarray([float(f(v)) for v in t])
    overlay(t, y, label=label, style=style)


def residuals(y_hat):
    """Residual subplot (observed − candidate) + RMSE."""
    if "y" not in data.columns:
        raise ValueError("residuals() needs a level with a 'y' column")
    y = data["y"].to_numpy(dtype=float)
    yh = np.asarray(y_hat, dtype=float).ravel()
    if yh.shape != y.shape:
        raise ValueError(f"residuals: expected {y.shape[0]} values, got {yh.shape[0]}")
    r = y - yh
    rmse = float(np.sqrt(np.mean(r**2)))
    t = data["t"].to_numpy(dtype=float)
    gt_host.residuals(to_js(_as_float_list(t)), to_js(_as_float_list(r)), rmse)
    print(f"RMSE = {rmse:.6g}")


def shade(states, label="regime"):
    """Background-shade the main chart by a discrete state path (len == len(data))."""
    t = data["t"].to_numpy(dtype=float)
    s = np.asarray(states).ravel()
    if s.shape != t.shape:
        raise ValueError(f"shade: expected {t.shape[0]} states, got {s.shape[0]}")
    gt_host.shade(to_js(_as_float_list(t)), to_js([int(v) for v in s]), str(label))


def plot_xy(x, y, label="scratch", mode="scatter"):
    """Free-form scratch plot (own axes, below the main chart).

    For delay embeddings, ACFs, eigenvalue spectra... mode: "scatter" | "line".
    Successive calls add series; clear_overlays() clears it.
    """
    xl, yl = _as_float_list(x), _as_float_list(y)
    if len(xl) != len(yl):
        raise ValueError(f"plot_xy: x and y lengths differ ({len(xl)} vs {len(yl)})")
    if mode not in ("scatter", "line"):
        raise ValueError("plot_xy: mode must be 'scatter' or 'line'")
    gt_host.plot_xy(to_js(xl), to_js(yl), str(label), str(mode))


def clear_overlays():
    gt_host.clear_overlays()


def _gt_set_data(columns_json: str):
    global data
    cols = json.loads(columns_json)
    data = pd.DataFrame({k: np.asarray(v, dtype=float) for k, v in cols.items()})


_GT_BASE = set(globals().keys()) | {"_GT_BASE"}


def _gt_reset_user_ns():
    g = globals()
    for k in list(g.keys()):
        if k not in _GT_BASE:
            del g[k]


def _gt_call_predict(t_json: str) -> str:
    f = globals().get("predict")
    if not callable(f):
        raise NameError("define a function predict(t) in the lab, then grade")
    t = np.asarray(json.loads(t_json), dtype=float)
    try:
        y = np.asarray(f(t), dtype=float)
        if y.shape != t.shape:
            raise ValueError
    except Exception:
        y = np.asarray([float(f(v)) for v in t])
    if not np.all(np.isfinite(y)):
        raise ValueError("predict(t) returned non-finite values on the holdout grid")
    return json.dumps([float(v) for v in y])
