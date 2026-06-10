"""Remove near-white backgrounds from product photos, saving transparent PNGs."""

from __future__ import annotations

from pathlib import Path

from PIL import Image


def remove_white_background(
    input_path: Path,
    output_path: Path,
    *,
    white_threshold: int = 238,
    shadow_threshold: int = 215,
) -> None:
    image = Image.open(input_path).convert("RGBA")
    pixels = image.getdata()
    cleaned: list[tuple[int, int, int, int]] = []

    for r, g, b, a in pixels:
        brightness = (r + g + b) / 3
        is_near_white = r >= white_threshold and g >= white_threshold and b >= white_threshold
        is_soft_shadow = (
            brightness >= shadow_threshold
            and abs(r - g) <= 12
            and abs(g - b) <= 12
            and abs(r - b) <= 12
        )

        if is_near_white:
            cleaned.append((r, g, b, 0))
        elif is_soft_shadow:
            fade = int(max(0, min(255, (brightness - shadow_threshold) / (white_threshold - shadow_threshold) * 180)))
            cleaned.append((r, g, b, max(0, 255 - fade)))
        else:
            cleaned.append((r, g, b, a if a else 255))

    image.putdata(cleaned)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    image.save(output_path, "PNG", optimize=True)
    print(f"Saved {output_path}")


def main() -> None:
    root = Path(__file__).resolve().parents[1] / "public" / "images"
    targets = [
        "ryzen-9900x.png",
        "monitor-32-qhd.png",
        "rtx-5070-ti.png",
    ]

    for name in targets:
        source = root / name
        if source.exists():
            remove_white_background(source, source)


if __name__ == "__main__":
    main()
