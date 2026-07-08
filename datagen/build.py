"""Build all level packs into public/levels/.  Usage: python3 -m datagen.build"""

from datagen.common import write_pack
from datagen.generators import all_levels


def main():
    for mod in all_levels():
        pack = mod.build()
        path = write_pack(pack)
        n = pack["stats"]["n"]
        print(f"level {pack['id']:02d}  ({pack['grading']['mode']:<12}  N={n:<6})  -> {path.name}")


if __name__ == "__main__":
    main()
