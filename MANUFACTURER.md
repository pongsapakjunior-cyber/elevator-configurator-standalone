# Manufacturer review mode

Open `?page=manufacturer`, or choose Manufacturer in the navigation. Quotation
editors also provide a current-context manufacturer link and an embedded tab.

- Single or identical-lift Duplex shaft plan, numbered dimensions, tall continuous
  hoistway section, configured requirements, floor levels and quotation details.
- Original linework is traced into native SVG paths at the supplied images'
  coordinates, not redrawn as approximate symbols. The full factory sheet keeps
  its section, shaft plan, support plan, isometric, entrance and door-glass views,
  table grids, drawing record and dimension lines in their original positions.
  Duplex substitutes the first reference plan into the original shaft-plan slot,
  uniformly scaled without stretching. Enlarge shaft plan shows that plan at
  its original aspect ratio. Lifting hooks are omitted from drawings, call-outs, factory input
  fields and schedules; legacy links containing that removed field ignore it.
- Decoration selections are intentionally excluded from the manufacturer
  schedule; the Decoration page, quotation pictures and selection data retain them.
- Dimensions and project name come from current inputs. The factory drawing
  retains input values even where the illustrative 3D model adjusts geometry.
- The bank dimension is calculated only after a divider thickness is entered.
- 93 optional factory fields cover motor power, current, rail gauges,
  reference dimension offsets, construction details, rope/sheave choices, loads, fixing
  and reserved openings remain Manufacturer to confirm until supplied. No values
  are copied from a reference project. Factory fields are editable supplied text.
- Full editor/manufacturer links preserve factory fields and quotation context.
  Compact customer QR schema remains byte-compatible and excludes factory fields.
- Manufacturer displays one combined sheet with all six views and all schedules.
  The reference-led sheet places the full-height hoistway section at left,
  paired shaft plan and machine support plan above, concrete slab/shaft isometric
  and reserved entrance details below, with a specification strip and drawing
  record at right. Dimension chains, serif CAD labels, wall sections, open cabin
  jambs, rail shoes, sills, slab opening and beams retain the source linework.
  Original variable numbers and source-project data are erased from the traced
  templates; live text is bound to their reference positions. Unknown values are
  TBC. Source JPGs, trace scripts and generated QA images are not deployed.
  The sheet is A2 landscape by default. Longer supplied descriptions or floor
  schedules enlarge that single sheet without hiding or truncating requirements;
  the original drawing views are never moved or stretched. Already visible
  factory dimensions are not duplicated in the notes area.
- Export PDF downloads exactly one page at the drawing's physical dimensions.
  A2 output is a lossless 300-dpi browser raster, preserving Thai glyphs and CAD
  styles; it is not selectable/vector PDF text. Download SVG remains vector.
  Large pages use bounded raster memory; pages beyond 5000 mm fail explicitly
  instead of clipping. A visible PDF download link supports browsers that defer
  automatic downloads. Changing input invalidates the previously prepared PDF.
- Mobile retains touch-sized controls and a horizontally scrollable drawing.
- These are requirements/review drawings, NOT certified installation drawings.
  Reference proportions deliberately stay fixed as numbers change: NTS, not a
  physically rescaled installation model.
  Final machine/rail positions, dimensions, loads and structural design belong
  to the manufacturer and reviewing engineer. The Duplex view assumes identical
  lifts, not independently configured left/right units.

Validation: pure-data tests cover live dimensions, known-only arithmetic, unknown
values, factory entries, XML escaping, long schedules and 40 stops. Existing
landing-door codecs, overhead, cabin preview, geometry and sizing regressions pass.
Browser verification uses synthetic data; no production quotation was edited.
The October 15 v6 reference-template supplement was checked using an actual
exported A2 PDF: one page, all six views, source-coordinate linework and Thai text.
Browser checks changed shaft width, overhead and project name through Configurator:
all bound values updated, including the Duplex bank width, while every path stayed
identical. Single/Duplex switching and the enlarged-plan dialog were also checked.
Automated tests lock traced geometry and cover value bindings, reference positions,
unknowns, contracts, escaping, long schedules and URL compatibility. Deployment
verification is recorded in the combined Dashboard release record.
