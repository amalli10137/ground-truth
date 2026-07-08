"""Level generator registry. Each module exposes build() -> pack dict."""

from importlib import import_module

LEVEL_IDS = list(range(1, 24))


def all_levels():
    for lid in LEVEL_IDS:
        yield import_module(f"datagen.generators.level{lid:02d}")
