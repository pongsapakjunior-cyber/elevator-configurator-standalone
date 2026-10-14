# Manufacturer review mode

Open `?page=manufacturer`, or choose Manufacturer in the navigation. Quotation
editors also provide a current-context manufacturer link and an embedded tab.

- Single or identical-lift Duplex shaft plan, numbered dimensions, tall interrupted
  hoistway section, configured requirements, floor levels and quotation details.
- Detailed reference symbols include rail brackets/anchors/splices, counterweight
  plates/shoes, car sling/cross-head/safeties, rope runs, traction machine, door
  hangers/sills/returns, pit ladder and buffers. A separate sheet has an open
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
- SVG downloads are vector A3 sheets. Long descriptions/floor schedules continue
  onto extra sheets; choose a sheet before downloading. Mobile has touch-sized
  controls and a horizontally scrollable drawing viewport.
- These are requirements/review drawings, NOT certified installation drawings.
  Final machine/rail positions, dimensions, loads and structural design belong
  to the manufacturer and reviewing engineer. The Duplex view assumes identical
  lifts, not independently configured left/right units.

Validation: pure-data tests cover live dimensions, known-only arithmetic, unknown
values, factory entries, XML escaping, long schedules and 40 stops. Existing
landing-door codecs, overhead, cabin preview, geometry and sizing regressions pass.
Browser verification uses synthetic data; no production quotation was edited.
The October 15 factory redraw, with lifting hooks removed, is authorized for
production release. Verify the deployed build before assuming promotion.
Regression suite: 94 passing tests. The door-clearance test harness now injects
the actual landing-door and overhead helpers instead of omitting those imports.
