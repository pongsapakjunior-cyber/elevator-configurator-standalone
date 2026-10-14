# Manufacturer review mode

Open `?page=manufacturer`, or choose Manufacturer in the navigation. Quotation
editors also provide a current-context manufacturer link and an embedded tab.

- Single or identical-lift Duplex shaft plan, numbered dimensions, tall continuous
  hoistway section, configured requirements, floor levels and quotation details.
- Detailed reference symbols include rail brackets/anchors/splices, counterweight
  plates/shoes, car sling/cross-head/safeties, rope runs, traction machine, door
  hangers/sills/returns, pit ladder and buffers. The same sheet has an open
  structural isometric, I-section beam symbols, entrance elevation, machine
  support plan. Lifting hooks are omitted from drawings, call-outs, factory input
  fields and schedules; legacy links containing that removed field ignore it.
- Decoration selections are intentionally excluded from the manufacturer
  schedule; the Decoration page, quotation pictures and selection data retain them.
- Dimensions and project name come from current inputs. The factory drawing
  retains input values even where the illustrative 3D model adjusts geometry.
- The bank dimension is calculated only after a divider thickness is entered.
- Motor power, current, rail gauges, rope/sheave choices, loads, fixing
  and reserved openings remain Manufacturer to confirm until supplied. No values
  are copied from a reference project. Factory fields are editable supplied text.
- Full editor/manufacturer links preserve factory fields and quotation context.
  Compact customer QR schema remains byte-compatible and excludes factory fields.
- Manufacturer displays one combined sheet with all five views and all schedules.
  The reference-led sheet places the full-height hoistway section at left,
  paired shaft plan and machine support plan above, concrete slab/shaft isometric
  and reserved entrance details below, with a specification strip and drawing
  record at right. Dimension chains, serif CAD labels, wall sections, open cabin
  jambs, rail shoes, sills, slab opening and beams follow the supplied references.
  Reference-project values are used only in the explicit QA example, not defaults.
  The sheet is A2 landscape by default. Longer supplied descriptions or floor
  schedules enlarge that single sheet without hiding or truncating requirements.
- Export PDF downloads exactly one page at the drawing's physical dimensions.
  A2 output is a lossless 300-dpi browser raster, preserving Thai glyphs and CAD
  styles; it is not selectable/vector PDF text. Download SVG remains vector.
  Large pages use bounded raster memory; pages beyond 5000 mm fail explicitly
  instead of clipping. A visible PDF download link supports browsers that defer
  automatic downloads. Changing input invalidates the previously prepared PDF.
- Mobile retains touch-sized controls and a horizontally scrollable drawing.
- These are requirements/review drawings, NOT certified installation drawings.
  Final machine/rail positions, dimensions, loads and structural design belong
  to the manufacturer and reviewing engineer. The Duplex view assumes identical
  lifts, not independently configured left/right units.

Validation: pure-data tests cover live dimensions, known-only arithmetic, unknown
values, factory entries, XML escaping, long schedules and 40 stops. Existing
landing-door codecs, overhead, cabin preview, geometry and sizing regressions pass.
Browser verification uses synthetic data; no production quotation was edited.
The combined one-page sheet and PDF export are approved for the October 15 v3
release. An actual exported A2 PDF was checked as one page with all five views,
complete schedules and Thai text; deployment verification is recorded separately.
Regression suite: 103 passing tests. The door-clearance test harness now injects
the actual landing-door and overhead helpers instead of omitting those imports.
