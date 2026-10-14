# Follow-up: planning advice and interactive floors

User requested removal of the visible pit fence and Installation reference panel, a shaft-wall switch, selectable destination floors and OTIS-style population-based speed advice. This follow-up updates the local preview at http://127.0.0.1:4179/ . It has not been published over the prior Vercel preview or promoted to production.

## Changes

- Removed `cwt_screen_*` fence geometry from the customer visualization. This is not a specification to omit safety equipment from a real installation.
- Removed the Installation reference overlay. Photo-derived internal geometry arrangement remains available without changing customer dimensions.
- Added a viewer-only shaft-wall visibility switch and dynamically generated floor buttons 1–N, where N is the existing Stops value.
- Manual travel closes doors, uses the configured speed with acceleration/deceleration, opens only at the destination, and queues the latest request during a trip. Autoplay hands over at a safe stop. Pause/resume does not reset the motion timeline. Play after a completed manual trip resumes the automatic cycle from that floor.
- The planning panel appears below Speed in the editable configurator, not in the read-only customer view. Population, building type and group lift count remain separate transient inputs; capacity, stops, travel and selected speed are read from the existing configuration.
- Planning inputs have no owner in the original configuration form and cannot change its validation, parameter schema, URL or QR payload. No automatic apply operation is exposed.
- Public OTIS Create input structure and observed US service goals inform the adviser. The calculation is an independent conditional partial-load feasibility screen, not OTIS's algorithm, product recommendation or a dispatch/waiting-time simulation. See `SPEED-RECOMMENDATION-2026-09-09.md`.

## Verification

- 63 unit/geometry/export tests pass (14 speed advice, 10 manual travel, 32 model layout, five photo-reference, two OBJ).
- 565 backward-compatibility checks pass across 83 old full/compact URL fixtures.
- 24 viewer browser checks pass, including 320/390/768 px controls, 40 stops, shaft-wall toggling, absent fence/reference and unchanged customer specification/URL.
- Seven additional real-browser interaction checks pass: planning isolation, insufficient-group and unsupported-traffic states, advice following capacity edits, floor-count rebuild/camera centering, mobile planner layout, floor 4 → queued floor 1 with pause/resume, and wall preference across views.
- No browser page errors in either run. Screenshots and JSON results are outside the published app under `../output/configurator-model/` and `../output/configurator-interactions/`.

## OTIS regional evidence

The public US planner uses feet and five building-type profiles. The UK metric planner provides different product and capacity assumptions. A synthetic UK Residential / 100 people / five stops / 14.63 m case suggested one 630 kg lift at 1 m/s; the equivalent US case suggested a 3500 lb product. These product-specific ratings are not copied into Schneider or Thai installation limits. The official Thailand link provides a metric product finder but no rendered Planning navigation was observed.

The independent example also finds a 1 m/s preliminary candidate, but its service-cycle and handling figures are not identical to OTIS and are not calibrated to force an exact match. Actual dispatch, local equipment suitability and final traffic design still require confirmation.
