import json

import numpy as np
import pytest

from datagen.build import main as build_all
from datagen.common import OUT_DIR


@pytest.fixture(scope="session", autouse=True)
def built_packs():
    """Build every pack once; tests read the exact JSON the player will see."""
    build_all()


def load_pack(level_id: int) -> dict:
    with open(OUT_DIR / f"{level_id:02d}.json") as fh:
        return json.load(fh)


def cols(pack: dict) -> dict:
    return {k: np.asarray(v, dtype=float) for k, v in pack["columns"].items()}


def assert_within(pack: dict, name: str, estimate: float):
    fields = {f["name"]: f for f in pack["grading"]["fields"]}
    f = fields[name]
    if "range" in f:
        lo, hi = f["range"]
        assert lo <= estimate <= hi, (
            f"level {pack['id']} field {name}: estimate {estimate:.6g} outside "
            f"range [{lo:.6g}, {hi:.6g}]"
        )
    else:
        err = abs(estimate - f["target"])
        assert err <= f["tol"], (
            f"level {pack['id']} field {name}: |{estimate:.6g} - {f['target']:.6g}| "
            f"= {err:.3g} > tol {f['tol']:.3g} — intended estimator would fail; "
            f"change the seed, not the tolerance"
        )
