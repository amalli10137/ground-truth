"""Level 21 — The Correlation Mirage. 40 assets, 250 days, 3 real factors.

The sample correlation matrix is mostly noise. Intended method: random
matrix theory — compare the eigenvalue spectrum against the Marchenko-Pastur
edge (1 + sqrt(N/T))^2; only eigenvalues above it are real structure.
"""

import numpy as np

from datagen.common import field, make_pack, range_field, rng, truth_block

SEED = 3121
N_ASSETS = 40
T_DAYS = 250
N_FACTORS = 3
FACTOR_VOLS = np.array([0.020, 0.011, 0.007])  # daily factor return std
IDIO_LO, IDIO_HI = 0.008, 0.016
MP_EDGE = (1 + np.sqrt(N_ASSETS / T_DAYS)) ** 2  # ~1.9556


def simulate(g: np.random.Generator):
    B = g.normal(0.0, 1.0, (N_ASSETS, N_FACTORS))
    idio = g.uniform(IDIO_LO, IDIO_HI, N_ASSETS)
    F = g.normal(0.0, 1.0, (T_DAYS, N_FACTORS)) * FACTOR_VOLS[None, :]
    E = g.normal(0.0, 1.0, (T_DAYS, N_ASSETS)) * idio[None, :]
    R = F @ B.T + E
    return R


def n_factors_above_edge(R: np.ndarray) -> int:
    corr = np.corrcoef(R, rowvar=False)
    eig = np.linalg.eigvalsh(corr)
    return int(np.sum(eig > MP_EDGE))


def build() -> dict:
    g = rng(SEED)
    R = simulate(g)
    prices = 100 * np.exp(np.cumsum(np.vstack([np.zeros(N_ASSETS), R]), axis=0))
    t = np.arange(T_DAYS + 1, dtype=float)

    columns = {"t": t}
    for j in range(N_ASSETS):
        columns[f"s{j+1:02d}"] = prices[:, j]

    # winnability sanity for a range of nearby seeds (structural robustness)
    for probe in range(SEED, SEED + 10):
        k = n_factors_above_edge(simulate(rng(probe)))
        assert k == N_FACTORS, f"seed {probe}: MP edge finds {k} factors"

    return make_pack(
        id=21,
        seed=SEED,
        kind="panel",
        columns=columns,
        truth=truth_block(
            {"n_factors": float(N_FACTORS), "mp_edge": float(MP_EDGE)},
            r"R = F B^\top + E:\ \ 3\ \text{real factors, } 37\ \text{columns of pure noise.}\quad \lambda_+ = \Big(1 + \sqrt{\tfrac{N}{T}}\Big)^2 \approx 1.956",
        ),
        grading={
            "mode": "parameter",
            "fields": [
                field(
                    "n_factors",
                    "number of real factors",
                    float(N_FACTORS),
                    0.5,
                    integer=True,
                ),
                range_field(
                    "mp_edge",
                    "Marchenko–Pastur noise edge λ₊",
                    MP_EDGE - 0.12,
                    MP_EDGE + 0.12,
                    help="the eigenvalue level below which correlation structure is indistinguishable from noise",
                ),
            ],
        },
        stats_col="s01",
    )
