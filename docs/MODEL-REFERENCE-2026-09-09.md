# Model reference notes — 9 September 2026

These notes transcribe the two photographs supplied by the owner for a model-detail redesign. They describe visual reference geometry and optional comparisons. They do not modify configuration fields, number inputs, customer QR payloads, project data, or saved links.

## Sources

- `S__125018170_0.jpg`: handwritten “Sizing for Installation / Cabin”, a historical 2567 installation sheet, and plan sketches.
- `S__125018172_0 - Copy.jpg`: GNL-DOVVF-CO center-opening two-panel operator catalogue photograph, page 40, with handwritten sizing notes.

The original photographs remain in the owner's supplied folder. The implementation contains the transcribed dimensions, not customer/project names from the historical sheet.

## Cabin sketches

| Photo layout | Width guideline | Depth guideline | Shown counterweight |
| --- | --- | --- | --- |
| MRL | CW = SW − 700 mm | CD = SD − 500 mm | Side, left of cabin in the plan sketch |
| MR | CW = SW − 600 mm | CD = SD − 600 mm | Rear of cabin in the plan sketch |

SW/SD are shaft width/depth and CW/CD are car width/depth in the photo. These are internal starting guidelines, not universal installation limits. The notes do not establish that every MRL must use a side counterweight or every MR must use a rear counterweight. For a model with front and rear entrances, displaying the counterweight to the side keeps it out of the rear doorway; this is a visual arrangement inference, not an extra rule stated by the photograph.

The historical sheet visibly includes exceptions. Examples transcribed from the numeric columns:

| Historical row | Type | Shaft W × D (mm) | Car W × D (mm) | Shaft minus car W / D (mm) |
| --- | --- | --- | --- | --- |
| 2 | MR | 1850 × 1690 | 1400 × 1100 | 450 / 590 |
| 5 | MRL | 1800 × 1800 | 1400 × 1100 | 400 / 700 |
| 8 | MRL | 1250 × 1700 | 700 × 900 | 550 / 800 |
| 12 | MRL | 2000 × 2000 | 1500 × 1500 | 500 / 500 |

The figures demonstrate variation; they are not a new catalogue of approved combinations. Some project names and remarks are small or blurred, and the sheet includes cancelled, replacement and incomplete rows. Those statuses cannot be used to certify any dimensional combination. The empty cargo/renovation rows provide no extra sizing evidence.

## Door arrangements

The sheet uses 2C, 2S and 4C. The handwritten labels identify 2C as the ordinary two-panel center-opening door and point to 2S as two side-sliding panels. In the app, `center + 2`, `side + 2`, and `center + 4` are visualized as 2C, 2S and 4C respectively. `Gate = 2` describes two entrances and is separate from the number of panels per entrance.

Render center doors symmetrically; four center panels nest as two panels per side. Render side doors as a telescoping stack with separate depth tracks. Keep each opening at the configured width. Do not substitute one door type, panel count or entrance count for another to make a model fit.

## Photographed two-panel center-opening operator

| JJ (door opening) | L | L1 | L2 |
| ---: | ---: | ---: | ---: |
| 600 | 1220 | 325 | 175 |
| 650 | 1320 | 350 | 200 |
| 700 | 1420 | 375 | 225 |
| 750 | 1520 | 400 | 250 |
| 800 | 1620 | 425 | 275 |
| 850 | 1720 | 450 | 300 |
| 900 | 1820 | 475 | 325 |
| 950 | 1920 | 500 | 350 |
| 1000 | 2020 | 525 | 375 |
| 1100 | 2220 | 575 | 425 |
| 1200 | 2420 | 625 | 475 |

All values are millimetres. The photographed table follows L = 2 × JJ + 20, L1 = JJ / 2 + 25 and L2 = JJ / 2 − 125. The analyzer reproduces exact table sizes and labels an in-range intermediate size as interpolated. It does not extrapolate beyond 600–1200 mm and does not apply this 2C assembly table to side-slide or four-panel doors.

The handwritten caption calls L “shaft width”, but L in the catalogue schematic is an operator assembly dimension. At an 800 mm opening the table gives L = 1620 mm, while the handwritten note suggests a shaft wider than 1750 mm. The implementation therefore keeps an **operator span reference** and a separate **owner's shaft guideline**. It does not equate the two, calculate a universal shaft minimum, or change a saved shaft width.

The wheelchair note mentions 650 mm and an 800 mm opening. It is a project note, not evidence of compliance with an accessibility standard. The model must not show an accessibility certification or mandatory minimum based on it. Small labels and individual fastening dimensions in the operator diagram are not sufficiently legible to establish precise manufactured geometry; belts, hangers, tracks, rollers and covers can be modeled as visual details, with the tabulated overall dimensions as the reference.

## Implementation contract

`assets/model-sizing.mjs` exports `analyzeModelSizing(params)`. It reads the supplied configuration and returns references, comparisons, a counterweight layout suggestion, and optional explanatory observations. It never writes into `params`, returns replacement customer parameters, or changes the URL. Results are optional model-review detail, not automatic corrections.

Run the focused source and preservation checks with:

```sh
node --test scripts/model-sizing.test.mjs
```
