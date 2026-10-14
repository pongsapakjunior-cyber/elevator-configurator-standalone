"""Trace the supplied duplex CAD reference without shipping the source photo.

The reference supplies graphic coordinates only. Numeric glyph regions are
removed before tracing; the public vector template exposes replacement anchors
whose values must come from configurator/factory data. It does not infer a
dimension from the photograph.

Usage: python scripts/trace-duplex-reference.py /absolute/reference.jpg
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFont


ROOT = Path(__file__).resolve().parents[1]
WIDTH, HEIGHT = 1145, 869


def label(key, box, x, y, size=24, rotation=0, anchor="middle", lift=None):
    value = {"field": key, "box": list(box), "x": x, "y": y,
             "size": size, "rotation": rotation, "anchor": anchor}
    if lift is not None:
        value["lift"] = lift
    return value


# Exact glyph bounds are in the unscaled 1145 × 869 source coordinate system.
# Dimension/extension lines intersecting a text mask are retained independently.
LABELS = [
    label("counterweightRG", (483, 75, 524, 94), 504, 93, 24, lift=0),
    label("rearOffsetLeft", (339, 109, 381, 131), 359, 130, 24, lift=0),
    label("rearOffsetRight", (453, 109, 495, 131), 474, 130, 24, lift=0),
    label("counterweightRearClearance", (470, 144, 491, 180), 490, 164, 23, -90, lift=0),
    label("carW", (461, 263, 513, 285), 487, 284, 25, lift=0),
    label("carD", (507, 346, 527, 386), 525, 366, 22, -90, lift=0),
    label("carRG", (446, 406, 494, 427), 470, 426, 24, lift=0),
    label("sheave", (356, 345, 378, 404), 376, 375, 23, -90, lift=0),
    label("carSheaveOffset", (382, 372, 405, 413), 403, 393, 23, -90, lift=0),
    label("doorW", (455, 580, 498, 604), 476, 602, 25, lift=0),
    label("openingWidth", (472, 618, 516, 641), 494, 639, 24, lift=0),
    label("openingJambLeft", (298, 618, 340, 641), 318, 639, 24, lift=0),
    label("openingJambRight", (532, 618, 575, 641), 553, 639, 24, lift=0),
    label("shaftW", (461, 646, 516, 670), 488, 668, 25, lift=0),
    label("shaftD", (100, 258, 124, 321), 122, 290, 25, -90, lift=0),
    label("topWallThickness", (132, 144, 156, 180), 154, 162, 23, -90, lift=0),
    label("rearRailOffset", (132, 276, 155, 316), 153, 296, 24, -90, lift=0),
    label("frontRailOffset", (132, 429, 155, 470), 153, 450, 24, -90, lift=0),
    label("frontSillOffset", (153, 419, 176, 464), 173, 442, 24, -90, lift=0),
    label("carRailDepth", (204, 347, 227, 398), 225, 373, 24, -90, lift=0),
    label("sillGap", (179, 461, 202, 491), 200, 476, 24, -90, lift=0),
    label("landingSillDepth", (178, 540, 201, 570), 199, 555, 24, -90, lift=0),
    label("counterweightRG", (822, 75, 863, 94), 843, 93, 24, lift=1),
    label("rearOffsetLeft", (677, 109, 719, 131), 698, 130, 24, lift=1),
    label("rearOffsetRight", (792, 109, 834, 131), 813, 130, 24, lift=1),
    label("carW", (799, 263, 852, 285), 825, 284, 25, lift=1),
    label("carD", (846, 346, 868, 387), 865, 367, 22, -90, lift=1),
    label("carRG", (783, 406, 832, 427), 808, 426, 24, lift=1),
    label("sheave", (694, 345, 717, 404), 714, 375, 23, -90, lift=1),
    label("carSheaveOffset", (721, 372, 744, 413), 741, 393, 23, -90, lift=1),
    label("doorW", (791, 580, 835, 604), 813, 602, 25, lift=1),
    label("openingWidth", (809, 618, 853, 641), 831, 639, 24, lift=1),
    label("openingJambLeft", (635, 618, 678, 641), 656, 639, 24, lift=1),
    label("openingJambRight", (870, 618, 913, 641), 891, 639, 24, lift=1),
    label("shaftW", (798, 646, 852, 670), 825, 668, 25, lift=1),
    label("carRailDepth", (993, 347, 1016, 399), 1014, 373, 24, -90, lift=1),
    label("sillGap", (988, 461, 1011, 491), 1009, 476, 24, -90, lift=1),
    label("landingSillDepth", (988, 540, 1011, 570), 1009, 555, 24, -90, lift=1),
    label("divider", (585, 646, 625, 670), 605, 668, 24),
    label("bankWidth", (578, 678, 630, 701), 604, 699, 26),
]

# Original-reference values are used ONLY to render the ignored comparison PNG.
# No value in this dictionary is emitted into the public vector template.
QA_VALUES = {
    "counterweightRG": "880", "rearOffsetLeft": "800", "rearOffsetRight": "400",
    "counterweightRearClearance": "150", "carW": "1200", "carD": "1200",
    "carRG": "1300", "sheave": "φ400", "carSheaveOffset": "200", "doorW": "700",
    "openingWidth": "900", "openingJambLeft": "350", "openingJambRight": "350",
    "shaftW": "1600", "shaftD": "1800", "topWallThickness": "150",
    "rearRailOffset": "835", "frontRailOffset": "815", "frontSillOffset": "700",
    "carRailDepth": "1300", "sillGap": "30", "landingSillDepth": "85",
    "divider": "200", "bankWidth": "3400",
}


def comparison_numbers(preview):
    """Visual check of retained linework and dynamic numeric font placement."""
    rendered = preview.copy().convert("RGBA")
    for item in LABELS:
        value = QA_VALUES[item["field"]]
        font = ImageFont.truetype("C:/Windows/Fonts/times.ttf", item["size"])
        x, y = item["x"], item["y"]
        if not item["rotation"]:
            ImageDraw.Draw(rendered).text((x, y), value, font=font, fill="#111", anchor="ms")
        else:
            tile = Image.new("RGBA", (200, 200))
            ImageDraw.Draw(tile).text((100, 100), value, font=font, fill="#111", anchor="ms")
            # Pillow angles are counterclockwise; SVG angles are clockwise.
            tile = tile.rotate(-item["rotation"], resample=Image.Resampling.BICUBIC)
            rendered.alpha_composite(tile, (x - 100, y - 100))
    return rendered.convert("RGB")


def retained_lines(binary):
    """Recover only long uninterrupted source runs through label masks."""
    keep = np.zeros_like(binary, dtype=bool)
    for y, row in enumerate(binary):
        padded = np.r_[False, row, False].astype(np.int8)
        boundaries = np.flatnonzero(np.diff(padded))
        for a, b in zip(boundaries[::2], boundaries[1::2]):
            if b - a >= 70:
                keep[y, a:b] = True
    for x, column in enumerate(binary.T):
        padded = np.r_[False, column, False].astype(np.int8)
        boundaries = np.flatnonzero(np.diff(padded))
        for a, b in zip(boundaries[::2], boundaries[1::2]):
            if b - a >= 70:
                keep[a:b, x] = True
    return keep


def vector_runs(binary):
    """Lossless orthogonal path packing of the cleaned 1-bit source trace."""
    active, packed = {}, []
    for y, row in enumerate(binary):
        boundaries = np.flatnonzero(np.diff(np.r_[False, row, False].astype(np.int8)))
        current = set(zip(boundaries[::2].tolist(), boundaries[1::2].tolist()))
        for run in list(active):
            if run not in current:
                start = active.pop(run)
                packed.append((run[0], start, run[1] - run[0], y - start))
        for run in current:
            active.setdefault(run, y)
    for run, start in active.items():
        packed.append((run[0], start, run[1] - run[0], HEIGHT - start))
    return "".join(f"M{x} {y}h{w}v{h}h{-w}z" for x, y, w, h in packed)


def main():
    if len(sys.argv) != 2:
        raise SystemExit(__doc__)
    source = Path(sys.argv[1])
    original = Image.open(source).convert("L")
    if original.size != (WIDTH, HEIGHT):
        raise SystemExit(f"Expected {WIDTH}x{HEIGHT}, got {original.size}")
    grey = np.asarray(original)
    binary = grey < 190
    mask = np.zeros_like(binary, dtype=bool)
    for item in LABELS:
        x1, y1, x2, y2 = item["box"]
        mask[y1:y2, x1:x2] = True
    keep = retained_lines(binary)
    clean = binary & (~mask | keep)
    d = vector_runs(clean)
    trace = {"width": WIDTH, "height": HEIGHT,
             "sourceSha256": hashlib.sha256(source.read_bytes()).hexdigest(),
             "markup": f'<path d="{d}" style="fill:#111;stroke:none"/>',
             "labels": LABELS,
             "regions": {"plan": [100, 75, 931, 627], "title": [442, 756, 285, 39]}}
    module = "// Coordinate trace of the user-supplied duplex CAD reference.\n"
    module += "// Numeric glyphs were removed; callers supply all dimension values.\n"
    module += "// Physical geometry remains at reference proportions (NTS).\n"
    module += "export const duplexReference = " + json.dumps(trace, ensure_ascii=False, separators=(",", ":")) + ";\n"
    module += "export default duplexReference;\n"
    destination = ROOT / "assets/manufacturer-duplex-reference.mjs"
    destination.write_text(module, encoding="utf-8", newline="\n")

    qa = ROOT / "output/duplex-reference-trace"
    qa.mkdir(parents=True, exist_ok=True)
    preview = Image.fromarray(np.where(clean, 17, 255).astype(np.uint8)).convert("RGB")
    preview.save(qa / "duplex-linework.png")
    dynamic_preview = comparison_numbers(preview)
    dynamic_preview.save(qa / "duplex-reconstructed-values.png")
    original_rgb = Image.open(source).convert("RGB")
    Image.blend(original_rgb, dynamic_preview, .5).save(qa / "duplex-source-overlay.png")
    guide = Image.open(source).convert("RGB")
    draw = ImageDraw.Draw(guide)
    for i, item in enumerate(LABELS):
        draw.rectangle(item["box"], outline="red", width=1)
        draw.text((item["box"][0], item["box"][1] - 9), str(i), fill="blue")
    guide.save(qa / "duplex-numeric-masks.png")
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" width="{WIDTH}" height="{HEIGHT}" viewBox="0 0 {WIDTH} {HEIGHT}">'
           '<rect width="100%" height="100%" fill="white"/>'
           f'<path d="{d}" style="fill:#111;stroke:none"/></svg>')
    (qa / "duplex-linework.svg").write_text(svg, encoding="utf-8")
    stats = {"labels": len(LABELS), "vectorCharacters": len(d),
             "removedNumericPixels": int(np.count_nonzero(binary & mask & ~keep)),
             "outsideMaskAgreement": bool(np.array_equal(clean[~mask], binary[~mask])),
             "sourceSha256": trace["sourceSha256"]}
    (qa / "trace-stats.json").write_text(json.dumps(stats, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(stats))


if __name__ == "__main__":
    main()
