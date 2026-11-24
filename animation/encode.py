"""Pack rendered flight frames into the looping WebP used by the profile."""

import sys
from pathlib import Path

from PIL import Image


def encode(frames_directory, target):
    paths = sorted(frames_directory.glob("*.png"))
    if len(paths) < 2:
        raise ValueError("The flight did not produce an animation")

    # Divide the millisecond rounding across frames to keep a steady 14 FPS.
    durations = [round((i + 1) * 1000 / 14) - round(i * 1000 / 14) for i in range(len(paths))]
    frames = []
    for path in paths:
        with Image.open(path) as frame:
            frames.append(frame.convert("RGB"))

    frames[0].save(
        target, format="WEBP", save_all=True, append_images=frames[1:],
        duration=durations, loop=0, quality=78, method=4, kmin=11, kmax=22,
    )
    with Image.open(target) as result:
        if not result.is_animated or result.info["loop"] != 0:
            raise ValueError("The exported WebP does not loop")
        result.seek(result.n_frames - 1)
        result.load()
        print(f"{result.width} × {result.height}, {result.n_frames} frames, {sum(durations) / 1000:.1f} seconds")


if __name__ == "__main__":
    encode(Path(sys.argv[1]), Path(sys.argv[2]))
