"""Reproducible local-only linework tracing of the supplied factory reference.

The source photograph is intentionally never copied into deployable assets.
"""
from pathlib import Path
import argparse
import hashlib
import json
from PIL import Image, ImageDraw, ImageFilter
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SOURCE = None
OUT = ROOT / "output" / "reference-trace"
TARGET = ROOT / "assets" / "manufacturer-factory-reference.mjs"

# All coordinates use the immutable source rotated counter-clockwise, 1847x1320.
# Rectangles remove ink only in the original text's white annotation area.
LABELS = []
MASKS = []


def label(field, box, x=None, y=None, rotation=0, size=12, anchor="middle", prefix="", suffix=""):
    bx, by, bw, bh = box
    MASKS.append({"kind": "rect", "box": box, "reason": f"variable:{field}"})
    LABELS.append({"field": field, "x": x if x is not None else bx + bw / 2,
                   "y": y if y is not None else by + bh - 2,
                   "rotation": rotation, "size": size, "anchor": anchor,
                   "prefix": prefix, "suffix": suffix})


def erase(box, reason):
    MASKS.append({"kind": "rect", "box": box, "reason": reason})


def slanted(field, points, x, y, rotation, size=13, prefix="", suffix=""):
    MASKS.append({"kind": "polygon", "points": points, "reason": f"variable:{field}"})
    LABELS.append({"field": field, "x": x, "y": y, "rotation": rotation,
                   "size": size, "anchor": "middle", "prefix": prefix, "suffix": suffix})


# Hoistway section. The long technical requirements in the scan are not user data.
label("overhead", (190, 350, 19, 145), 205, 424, -90, 12, prefix="OH Height OH=")
label("factory.beamTopOffset", (481, 238, 17, 39), 494, 258, -90, 12)
label("factory.lightTopOffset", (510, 234, 18, 47), 524, 257, -90, 12)
label("factory.beamSpacing", (480, 485, 19, 494), 494, 730, -90, 12,
      prefix="Ring beam spacing ", suffix=" mm / BY FACTORY")
label("factory.lightingSpacing", (504, 531, 20, 405), 519, 732, -90, 12,
      prefix="Hoistway lighting distance ", suffix=" / BY FACTORY")
label("factory.beamBottomOffset", (481, 992, 18, 61), 494, 1025, -90, 12)
label("factory.firstBeamOffset", (481, 1117, 18, 28), 494, 1133, -90, 12)
label("factory.lightBottomOffset", (510, 1089, 18, 57), 524, 1119, -90, 12)
label("pit", (190, 1006, 20, 138), 205, 1078, -90, 12, prefix="PIT Depth PP=")
label("travel", (192, 728, 17, 139), 204, 798, -90, 11, prefix="Travel TL=")
label("manufacturer.fields.openingHeight", (216, 814, 20, 191), 231, 910, -90, 11,
      prefix="Preserved door entrance H ")
label("doorH", (237, 842, 19, 162), 251, 923, -90, 11, prefix="Door height ")

# Single shaft plan. Offsets are supplied by the factory, not inferred from pixels.
label("factory.shaftPlanUpperLeft", (729, 92, 37, 15), 747, 105)
label("factory.shaftPlanUpperRight", (836, 92, 32, 15), 852, 105)
label("factory.counterweightRearOffset", (690, 111, 22, 16), 701, 124, size=11)
label("factory.counterweightHorizontalOffset", (745, 111, 32, 16), 761, 124, size=11)
label("factory.counterweightFrontOffset", (612, 260, 18, 36), 626, 278, -90, 11)
label("manufacturer.fields.counterweightRG", (631, 252, 19, 73), 645, 290, -90, 11, prefix="CWT RG ")
label("factory.railLongitudinalOffset", (611, 332, 20, 36), 626, 350, -90, 11)
label("carW", (759, 261, 99, 17), 808, 275, size=11, prefix="Car N/Width ")
label("manufacturer.fields.carRG", (773, 280, 74, 16), 810, 294, size=11, prefix="Car RG ")
label("factory.railBracketWidth", (715, 317, 30, 17), 730, 332, size=11)
label("factory.carRailOffsetLeft", (776, 327, 35, 18), 793, 342, size=11)
label("factory.carRailOffsetRight", (815, 327, 33, 18), 831, 342, size=11)
label("factory.sillReturn", (789, 356, 29, 20), 803, 373, size=11)
label("carD", (960, 239, 19, 127), 975, 303, -90, 11, prefix="Car N/Depth ")
label("factory.carRearClearance", (982, 199, 20, 33), 997, 217, -90, 11)
label("factory.carFrontToBackOffset", (981, 293, 20, 40), 997, 314, -90, 11)
label("shaftD", (998, 239, 20, 134), 1013, 307, -90, 11, prefix="Shaft Depth ")
label("factory.entranceOffset", (927, 303, 20, 72), 942, 339, -90, 11, prefix="EE=")
label("manufacturer.fields.sillGap", (928, 374, 20, 21), 943, 386, -90, 10)
label("factory.landingSillDepth", (928, 398, 20, 29), 943, 413, -90, 11)
label("doorW", (755, 416, 76, 16), 793, 430, size=11, prefix="N/D.Open ")
label("manufacturer.fields.openingWidth", (739, 436, 105, 17), 791, 451, size=11, prefix="Preserved Ent. ")
label("factory.entranceLeftReturn", (697, 435, 29, 18), 711, 451, size=12)
label("factory.entranceRightReturn", (857, 435, 29, 18), 871, 451, size=12)
label("shaftW", (741, 458, 114, 18), 798, 474, size=12, prefix="Shaft Width ")

# Machine support plan: original dimension chain placement remains unchanged.
label("factory.supportUpperLeft", (1165, 98, 36, 16), 1183, 112)
label("factory.supportUpperRight", (1267, 98, 35, 16), 1284, 112)
label("factory.supportRearOffset", (1128, 118, 25, 15), 1140, 131, size=11)
label("factory.supportFirstOffset", (1175, 118, 35, 15), 1192, 131, size=11)
label("factory.supportSecondOffset", (1257, 118, 36, 15), 1275, 131, size=11)
label("factory.supportLongitudinalOffset", (1061, 335, 20, 37), 1076, 354, -90, 11)
label("factory.supportMachineOffset", (1357, 248, 21, 61), 1373, 278, -90, 11)
label("shaftD", (1382, 237, 20, 137), 1397, 306, -90, 11, prefix="Shaft Depth ")
label("shaftW", (1178, 440, 101, 17), 1228, 455, size=12, prefix="Shaft Width ")

# Preserved entrance: exact original leader and extension lines are retained.
label("factory.lintelDepth", (1177, 517, 17, 28), 1190, 532, -90, 11)
label("manufacturer.fields.openingHeight", (1208, 545, 18, 204), 1222, 648, -90, 11,
      prefix="Preserved Door Entrance Height ")
label("doorH", (1228, 568, 19, 176), 1242, 658, -90, 11, prefix="Door Height ")
label("factory.fireBoxOffset", (1345, 550, 33, 18), 1361, 565, size=12)
slanted("factory.fireBoxHole", [(1421, 557), (1448, 542), (1453, 553), (1427, 570)],
        1438, 560, -31, 12, prefix="Ø")
label("factory.fireBoxHeightDifference", (1398, 583, 22, 40), 1414, 605, -90, 12)
label("factory.hallButtonHeight", (1398, 670, 22, 46), 1414, 695, -90, 12)
label("manufacturer.fields.openingWidth", (1304, 768, 42, 19), 1325, 785, size=13)

# Door glass detail: maintain geometry, but no sample factory dimensions.
label("factory.glassHeadLeft", (1243, 817, 20, 35), 1258, 835, -90, 11)
label("factory.glassTopCentreLeft", (1310, 814, 18, 38), 1323, 834, -90, 10)
label("factory.glassTopCentreRight", (1330, 825, 37, 21), 1351, 843, size=11)
label("factory.glassHeadRight", (1384, 817, 20, 35), 1399, 835, -90, 11)
label("factory.glassHeightLeft", (1242, 930, 22, 45), 1258, 954, -90, 11)
label("factory.glassHeightRight", (1383, 930, 22, 45), 1399, 954, -90, 11)
label("factory.glassTotalHeight", (1403, 922, 20, 53), 1418, 950, -90, 11)
label("factory.glassBottomLeft", (1244, 1035, 19, 26), 1258, 1049, -90, 11)
label("factory.glassBottomRight", (1383, 1035, 20, 26), 1398, 1049, -90, 11)
label("factory.glassWidthLeft", (1284, 1060, 34, 17), 1301, 1075, size=12)
label("factory.glassWidthRight", (1340, 1060, 42, 21), 1361, 1077, size=12)

# Isometric labels lie beside (not on) the original oblique dimensions.
slanted("shaftD", [(743, 669), (814, 624), (829, 641), (755, 688)], 790, 659, -34, 15, prefix="Depth ")
slanted("shaftW", [(1005, 615), (1093, 665), (1087, 688), (994, 635)], 1041, 663, 31, 15, prefix="Width ")
slanted("factory.isoDepthFirstOffset", [(752, 693), (779, 676), (788, 688), (762, 706)], 773, 694, -34, 13)
slanted("factory.isoDepthSecondOffset", [(785, 678), (815, 658), (831, 675), (799, 701)], 804, 685, -34, 13)
slanted("factory.isoDepthThirdOffset", [(831, 655), (863, 635), (875, 649), (842, 670)], 854, 656, -34, 13)
slanted("factory.isoWidthFirstOffset", [(946, 618), (975, 634), (967, 647), (937, 630)], 956, 638, 31, 13)
slanted("factory.isoWidthSecondOffset", [(979, 638), (1013, 658), (1005, 670), (971, 650)], 991, 661, 31, 13)
slanted("factory.isoWidthThirdOffset", [(1038, 673), (1072, 692), (1065, 705), (1030, 685)], 1049, 696, 31, 13)
label("overhead", (682, 827, 21, 88), 698, 872, -90, 12, prefix="OH=")
label("factory.isoTopBeamDepth", (713, 763, 23, 38), 730, 783, -90, 13)
label("factory.isoLintelDepth", (713, 826, 23, 38), 730, 846, -90, 13)
label("manufacturer.fields.openingHeight", (710, 862, 25, 148), 728, 938, -90, 13,
      prefix="Reserved entrance H ")
slanted("manufacturer.fields.openingWidth", [(831, 1079), (878, 1104), (869, 1120), (824, 1094)],
        851, 1104, 31, 14)
label("factory.isoHallButtonHeight", (878, 1023, 23, 70), 895, 1060, -90, 12)
slanted("factory.isoFireBoxOffset", [(855, 979), (890, 1001), (882, 1017), (846, 994)],
        870, 1007, 31, 12)

# Original quote/client identifiers and unsupported sample technical instructions.
erase((1207, 33, 326, 65), "source validation/stamp note is not project data")
erase((554, 1129, 216, 85), "sample controller clearance instructions")
erase((981, 1207, 257, 82), "sample installation and construction instructions")
erase((1538, 791, 266, 350), "unsupported fixed source technical requirements")
erase((1625, 1147, 179, 21), "source client/project identifier")
erase((1367, 1148, 165, 46), "source legal confirmation copy")

# Hook details/callouts are intentionally absent from the product, by request.
erase((352, 47, 114, 145), "lifting-hook detail and dimensions removed")
erase((127, 129, 160, 49), "lifting-hook callout text removed")
MASKS += [
    {"kind": "polygon", "points": [(167, 183), (269, 183), (343, 231), (340, 235), (265, 189), (167, 189)], "reason": "lifting-hook callout leader"},
    {"kind": "polygon", "points": [(266, 184), (389, 230), (386, 235), (264, 189)], "reason": "lifting-hook second callout leader"},
]
erase((334, 227, 13, 13), "section lifting hook left")
erase((380, 226, 15, 14), "section lifting hook right")
erase((875, 682, 13, 15), "isometric lifting hook rear")
erase((826, 708, 14, 17), "isometric lifting hook left")
erase((898, 721, 16, 18), "isometric lifting hook front")

TABLE_BOUNDARIES = [55, 80, 106, 133, 159, 185, 211, 238, 264, 290, 316,
                    343, 369, 395, 422, 448, 474, 500, 526, 553, 579, 605, 631, 657]
TABLE_CONTENT = [
    ("Type", "elevatorType"), ("Name", "elevatorName"), ("Model", "modelName"),
    ("Roping", "roping"), ("Contract No.", "quotationNo"), ("Product No.", "liftNo"),
    ("Rated Load kg", "capacity"), ("Rated Speed m/s", "speed"),
    ("Floor / Stop / Door", "floorStopDoor"), ("Traveling Height", "travel"),
    ("Total Height", "total"), ("Min. Floor Distance", "factory.minimumFloorDistance"),
    ("Car Dimension mm", "carDimensions"), ("Door Opening", "doorType"),
    ("Door Width mm", "doorW"), ("Door Height mm", "doorH"),
    ("T/M Model", "manufacturer.fields.motorModel"),
    ("Motor Power kW", "manufacturer.fields.motorPower"),
    ("Rated Current A", "manufacturer.fields.ratedCurrent"),
    ("Voltage V", "manufacturer.fields.supply"),
    ("Lighting Power", "factory.lightingPower"), ("OH Height mm", "overhead"),
    ("Pit Depth mm", "pit"),
]
TABLE_ROWS = []
for idx, ((heading, field), top, bottom) in enumerate(zip(TABLE_CONTENT, TABLE_BOUNDARIES, TABLE_BOUNDARIES[1:])):
    erase((1538, top + 2, 110, bottom - top - 3), "re-typeset static specification heading")
    erase((1654, top + 2, 150, bottom - top - 3), f"source specification value:{field}")
    TABLE_ROWS.append({"label": heading, "field": field, "y": (top + bottom) / 2 + 4,
                       "height": bottom - top, "size": 11})
for heading, field, top, bottom in [
    ("Machine Beam R1", "manufacturer.fields.r1", 683, 709),
    ("Machine Beam R2", "manufacturer.fields.r2", 709, 735),
    ("Pit bearing R3", "manufacturer.fields.r3", 735, 761),
    ("Pit bearing R4", "manufacturer.fields.r4", 761, 788),
]:
    erase((1538, top + 2, 110, bottom - top - 3), "re-typeset static bearing heading")
    erase((1654, top + 2, 150, bottom - top - 3), f"source bearing value:{field}")
    TABLE_ROWS.append({"label": heading, "field": field, "y": (top + bottom) / 2 + 4,
                       "height": bottom - top, "size": 11})

# Floor grid stays at the exact source position. Its sample 7-stop values do not.
FLOOR_BOUNDARIES = [511, 536, 560, 585, 609, 634, 658, 683, 708, 732, 757, 781,
                    806, 830, 855, 879, 904, 929, 953, 978, 1002, 1027, 1052, 1076, 1101]
for top, bottom in zip(FLOOR_BOUNDARIES, FLOOR_BOUNDARIES[1:]):
    for left, right in [(26, 68), (70, 112), (114, 155)]:
        erase((left + 1, top + 2, right - left - 2, bottom - top - 3), "sample floor/height values")


def rectangular_path(binary):
    """Merge equal horizontal ink runs over adjacent rows into filled rectangles."""
    active, rectangles = {}, []
    for y, row in enumerate(binary):
        padded = np.pad(row.astype(np.int8), (1, 1))
        starts = np.where(np.diff(padded) == 1)[0]
        ends = np.where(np.diff(padded) == -1)[0]
        current = {(int(a), int(b)) for a, b in zip(starts, ends)}
        for run in list(active):
            if run not in current:
                first = active.pop(run)
                rectangles.append((run[0], first, run[1] - run[0], y - first))
        for run in current:
            active.setdefault(run, y)
    for run, first in active.items():
        rectangles.append((run[0], first, run[1] - run[0], len(binary) - first))
    return "".join(f"M{x} {y}h{w}v{h}h-{w}z" for x, y, w, h in rectangles), len(rectangles)


def straight_line_pixels(pixels):
    """Protect long source dimension lines that pass through an annotation box.

    Only exact original ink is restored. This cannot add a guessed dimension.
    No neighbouring pixels are restored, so adjacent character strokes cannot
    return along with a protected dimension stroke.
    """
    ink = pixels < 210
    protected = np.zeros(ink.shape, dtype=bool)
    for transpose in [False, True]:
        work = ink.T if transpose else ink
        found = np.zeros(work.shape, dtype=bool)
        for y, row in enumerate(work):
            edges = np.diff(np.pad(row.astype(np.int8), (1, 1)))
            for start, end in zip(np.where(edges == 1)[0], np.where(edges == -1)[0]):
                if end - start >= 35:
                    found[y, start:end] = True
        protected |= found.T if transpose else found
    return protected & ink


def oblique_line_pixels(pixels):
    """Protect original isometric dimension strokes, without inventing lines."""
    x1, y1, x2, y2 = 665, 600, 1154, 1241
    ink = (pixels[y1:y2, x1:x2] < 210)
    binary = Image.fromarray(ink.astype(np.uint8) * 255)
    found_all = np.zeros(ink.shape, dtype=bool)
    for angle in [29, 30, 31, 32, -29, -30, -31, -32, -33]:
        rotated = binary.rotate(angle, resample=Image.Resampling.NEAREST, expand=False)
        rows = np.asarray(rotated) > 0
        found = np.zeros(rows.shape, dtype=np.uint8)
        for y, row in enumerate(rows):
            edges = np.diff(np.pad(row.astype(np.int8), (1, 1)))
            for start, end in zip(np.where(edges == 1)[0], np.where(edges == -1)[0]):
                if end - start >= 28:
                    found[y, start:end] = 255
        back = Image.fromarray(found).rotate(-angle, resample=Image.Resampling.NEAREST, expand=False)
        found_all |= np.asarray(back) > 0
    protected = np.zeros(pixels.shape, dtype=bool)
    protected[y1:y2, x1:x2] = found_all & ink
    return protected


def generate(rotated):
    original_pixels = np.asarray(rotated.convert("L"))
    line_pixels = straight_line_pixels(original_pixels) | oblique_line_pixels(original_pixels)
    cleaned = rotated.convert("L")
    draw = ImageDraw.Draw(cleaned)
    mask_preview = rotated.copy()
    overlay = ImageDraw.Draw(mask_preview)
    variable_mask = Image.new("L", cleaned.size, 0)
    variable_draw = ImageDraw.Draw(variable_mask)
    for m in MASKS:
        if m["kind"] == "rect":
            x, y, w, h = m["box"]
            area = (x, y, x + w - 1, y + h - 1)
            draw.rectangle(area, fill=255)
            if m["reason"].startswith("variable:"):
                variable_draw.rectangle(area, fill=255)
            overlay.rectangle(area, outline="#ef2929", width=1)
        else:
            draw.polygon(m["points"], fill=255)
            if m["reason"].startswith("variable:"):
                variable_draw.polygon(m["points"], fill=255)
            overlay.polygon(m["points"], outline="#ef2929", width=1)
    # Restore exact long dimension/extension strokes underneath value masks.
    cleaned_pixels = np.asarray(cleaned).copy()
    # Two pixels accommodate JPEG fringes around the hand measured glyph boxes.
    cleaned_pixels[np.asarray(variable_mask.filter(ImageFilter.MaxFilter(5))) > 0] = 255
    cleaned_pixels[line_pixels] = original_pixels[line_pixels]
    cleaned = Image.fromarray(cleaned_pixels)
    draw = ImageDraw.Draw(cleaned)
    # Hook details and unsupported instruction blocks must not be restored.
    for m in MASKS:
        if m["reason"].startswith(("lifting-hook", "section lifting", "isometric lifting")):
            if m["kind"] == "rect":
                x,y,w,h = m["box"]
                draw.rectangle((x,y,x+w-1,y+h-1),fill=255)
            else:
                draw.polygon(m["points"],fill=255)
    # Straightened section members bridge the two tiny slanted break symbols.
    # Preserve the original overall shortened section proportion.
    for box in [(347, 695, 10, 23), (224, 733, 62, 27), (224, 612, 62, 36)]:
        x, y, w, h = box
        draw.rectangle((x, y, x + w, y + h), fill=255)
    draw.line([(352, 695), (352, 718)], fill=40, width=1)
    draw.line([(358, 695), (358, 718)], fill=40, width=3)
    draw.line([(337, 703), (375, 703)], fill=40, width=2)
    draw.line([(337, 710), (375, 710)], fill=40, width=1)
    draw.line([(226, 611), (226, 760)], fill=50, width=1)
    draw.line([(281, 611), (281, 760)], fill=50, width=1)
    draw.line([(265, 186), (340, 233)], fill=255, width=7)
    draw.line([(265, 186), (388, 233)], fill=255, width=7)
    draw.line([(265, 210), (467, 210)], fill=65, width=1)
    draw.line([(265, 230), (467, 230)], fill=65, width=1)
    # Join each original sloping support beam beneath the removed U-hook symbol.
    draw.line([(875, 687), (888, 695)], fill=70, width=1)
    draw.line([(826, 713), (840, 721)], fill=70, width=1)
    draw.line([(898, 729), (914, 738)], fill=70, width=1)
    cleaned.save(OUT / "factory-cleaned.png")
    for name, box in {"isometric": (665, 600, 1150, 1240), "section": (180, 200, 540, 1235),
                      "entrance": (1120, 470, 1455, 805), "glass": (1220, 810, 1435, 1110)}.items():
        crop = cleaned.crop(box)
        crop.resize((crop.width * 2, crop.height * 2)).save(OUT / f"factory-{name}-cleaned.png")
    mask_preview.save(OUT / "factory-masks.png")
    pixels = np.asarray(cleaned)
    layers = []
    statistics = []
    for color, low, high in [("#222", 0, 128), ("#888", 128, 210)]:
        d, count = rectangular_path((pixels >= low) & (pixels < high))
        # Inline styles keep unrelated existing CAD `path {fill:none}` rules from
        # turning the traced ink into oversized outline rectangles.
        layers.append(f'<path style="fill:{color};stroke:none" d="{d}"/>')
        statistics.append({"color": color, "rectangles": count})
    metadata = {
        "width": rotated.width, "height": rotated.height,
        "sourceRotation": "90 degrees counter-clockwise",
        "sourceSha256": hashlib.sha256(SOURCE.read_bytes()).hexdigest(),
        "labels": LABELS,
        "regions": {
            "shaftPlan": {"x": 606, "y": 87, "width": 422, "height": 394},
            "section": {"x": 186, "y": 203, "width": 352, "height": 1028},
            "supportPlan": {"x": 1053, "y": 91, "width": 363, "height": 374},
            "isometric": {"x": 665, "y": 602, "width": 489, "height": 639},
            "entrance": {"x": 1122, "y": 477, "width": 334, "height": 328},
            "doorGlass": {"x": 1230, "y": 809, "width": 201, "height": 296},
        },
        "table": {"x": 1535, "labelX": 1594, "valueX": 1728, "width": 273,
                  "rows": TABLE_ROWS, "technicalNotes": {"x": 1543, "y": 810, "width": 253, "height": 322}},
        "floorTable": {"x": 25, "y": 511, "width": 132, "bottom": 1101,
                       "columns": [47, 91, 135], "boundaries": FLOOR_BOUNDARIES},
        "titleBlock": {"project": {"x": 1698, "y": 1164, "width": 209},
                       "confirmation": {"x": 1449, "y": 1162, "width": 160}},
        "masks": MASKS,
    }
    metadata["markup"] = '<g data-reference="factory-sheet" style="stroke:none">' + "".join(layers) + "</g>"
    js = ("// Generated by scripts/trace-factory-reference.py from an immutable local reference.\n"
          "// Native SVG filled paths only; no linked or embedded reference image is deployed.\n"
          "// Original sample values and unsupported factory instructions are removed.\n"
          "export const FACTORY_REFERENCE = " + json.dumps(metadata, ensure_ascii=False, separators=(",", ":")) + ";\n"
          "export const factoryReference = FACTORY_REFERENCE;\n"
          "export default FACTORY_REFERENCE;\n")
    TARGET.write_text(js, encoding="utf-8")
    (OUT / "factory-cleaned.svg").write_text(
        f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {rotated.width} {rotated.height}">'
        '<rect width="100%" height="100%" fill="white"/>' + metadata["markup"] + '</svg>', encoding="utf-8")
    (OUT / "factory-label-map.json").write_text(json.dumps({**metadata, "markup": "[native paths omitted]"},
                                                           ensure_ascii=False, indent=2), encoding="utf-8")
    print({"assetBytes": len(js.encode("utf-8")), "labels": len(LABELS), "layers": statistics})

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("source", type=Path, help="Immutable 1320 × 1847 factory reference JPG")
    SOURCE = parser.parse_args().source.resolve(strict=True)
    OUT.mkdir(parents=True, exist_ok=True)
    source = Image.open(SOURCE)
    if source.size != (1320, 1847):
        raise ValueError(f"Expected the original 1320 × 1847 reference, received {source.size}")
    rotated = source.transpose(Image.Transpose.ROTATE_90)
    rotated.save(OUT / "factory-landscape.png")
    for name, box in {
        "section": (180, 200, 540, 1235),
        "shaft-plan": (610, 90, 1025, 480),
        "support": (1050, 90, 1415, 465),
        "isometric": (665, 600, 1150, 1240),
        "entrance": (1120, 470, 1455, 805),
        "glass": (1220, 810, 1435, 1110),
        "table": (1530, 25, 1810, 1150),
    }.items():
        crop = rotated.crop(box)
        crop.resize((crop.width * 2, crop.height * 2)).save(OUT / f"factory-{name}-detail.png")
        grid = rotated.copy()
        gd = ImageDraw.Draw(grid)
        for gx in range(0, rotated.width, 50):
            gd.line([(gx, box[1]), (gx, box[3])], fill="#ff8080", width=1)
            gd.text((gx + 2, box[1] + 2), str(gx), fill="#e00000")
        for gy in range(0, rotated.height, 50):
            gd.line([(box[0], gy), (box[2], gy)], fill="#80aaff", width=1)
            gd.text((box[0] + 2, gy + 2), str(gy), fill="#0050df")
        crop = grid.crop(box)
        crop.resize((crop.width * 2, crop.height * 2)).save(OUT / f"factory-{name}-grid.png")
    generate(rotated)
    print({"source": source.size, "landscape": rotated.size, "rotation": "90 degrees counter-clockwise"})
