# Configurator model-only redesign

## Boundary

This release changes the 3D viewer and its render-space arrangement. It does not change parameter controls, defaults, normalization, specification values, customer URL encoding, QR generation or quotation bridge metadata. Existing configurations are not migrated or rewritten.

The baseline is commit `cd5ca44`. Its `index.html` and Three stage bundle hashes were matched against production deployment `dpl_ESjwSMZP9onn843DieS9ymuJ44rj` before preparing the preview.

## Viewer changes

- Assembly, Cabin, Door, Drive, Pit and orthographic Plan views; viewer controls do not serialize into customer links.
- Door-operator belt, yellow drive wheel, motor, hangers, sill tracks, cabin trim, fixings, rail joints and buffer details.
- MRL side counterweight arrangement, and a side arrangement for two-entrance cabins. The MR single-entrance model retains a rear counterweight.
- Adjusted drive, pulley tangents, rope wraps, supports and MR slab openings for the side arrangement.
- Correctly centered through cabins, separate front/rear operators, and mobile camera framing with unobscured controls.
- Read-only installation-reference panel based on the owner's photos. See `MODEL-REFERENCE-2026-09-09.md` for interpretation and limitations.

## Regression checks

- `node scripts/check-model-compat.mjs`: 565 checks against 83 full/compact baseline fixtures.
- `node --test scripts/model-sizing.test.mjs`: five source-reference/preservation tests.
- `node --test scripts/model-layout.test.mjs`: 32 geometry cases covering MR/MRL, one/two entrances, 1:1/2:1 and four dimension sets. Includes bottom/mid/top rope poses, named assembly bounds and immutable parameters/dimensions.
- `node scripts/check-model-browser.mjs`: real browser using the unchanged Three r184 import map. Checks specification text and URL stability on view switches, camera rebuild while in Plan, Play returning to Assembly, center/side/four-panel arrangements, the existing 40-stop limit and 320/390/768 px control visibility.
- `node --test scripts/model-obj-export.test.mjs`: two tests preserving instance transforms and live model state in the retained OBJ exporter. Export UI remains hidden and GLB behavior unchanged.

Browser screenshots/results are written outside the published app. Static geometry tests accept `MODEL_QA_THREE` or the installed sibling Three runtime (r185 at verification); browser checks use the actual deployed r184 dependency.

## Limits

This is a schematic customer visualization, not a fabrication drawing or a clearance/accessibility certification. Mechanical component envelopes are illustrative; they are not manufacturer selections or equipment ratings. The source photographs do not establish all fastening dimensions or a universal minimum shaft size. Tests cover named geometry/rope invariants, not a complete collision or engineering safety assessment.

Original codec limitations remain unchanged, including compact links omitting `liftNo`/`location` and the lack of an editable `doorH` field. No customer data is deleted.

Deployment packaging excludes scripts, documentation, Git metadata and environment files. A preview release does not change the production domain used by existing QR codes.

## Verified preview

- Deployment: `dpl_7i4NnrWkFpAv8z4pRyuyp6UBA557`, READY, preview only.
- URL: https://elevator-configurator-standalone-4sughwldx.vercel.app
- Browser run: 24 view/interaction checks, no page errors.
- All seven changed/new executable viewer files match the uploaded source SHA-1 manifest exactly.
- New CSS and model module return HTTP 200 with correct MIME types through authenticated Vercel access. Existing preview protection remains enabled; an anonymous request redirects to Vercel authentication.
- Relative to production, only `index.html` and the stage bundle change; the five model assets and `.vercelignore` are added. Developer scripts/README are excluded from preview packaging, not deleted from the repository.
