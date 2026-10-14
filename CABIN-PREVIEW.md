# SC-C-A finish preview (local review candidate)

The decoration hero follows the selected ceiling and floor for SC-C-A only.
Other cabins and the catalogue source files remain unchanged. Selecting no
finishes restores the exact original SC-C-A image. This is an illustrative
selection aid, not a manufacturing drawing or a material colour guarantee.

`assets/cabin-preview.mjs` uses native Canvas and calibrated projective mappings
for two planes. It reprojects the existing catalogue artwork, rather than
generating a different cabin for every combination. Wall, door and operating
panel pixels are not edited. The asynchronous adapter guards against stale
image loads after rapid selection changes.

All 12 ceiling options and 60 floor options are supported. Floor preview v2
uses bounded detail recovery and bicubic interpolation. Granite swatches use
smaller mirrored grain repetition so a small sample is not stretched across
the entire cabin; scan edges are excluded. Framed/inlay floor designs are not
tiled. These techniques improve display clarity but cannot recover detail
absent from the supplier's source images. No new bitmap assets were generated
for this compositor, and source swatches are retained unmodified.

The standalone view also supplies the Dashboard's embedded configurator.
The separate local quotation review harness can opt in to composition before
PDF/PNG export. This does not change old production/approved quotation images.
No new saved configuration fields or QR schema were introduced for this view.

## Verification

- `node --test scripts/cabin-preview.test.mjs`: projective mapping and catalogue.
- `node scripts/check-cabin-preview.mjs`: desktop and touch-mobile controls,
  reset, other cabins, full/customer links and rapid async changes.
- `node scripts/check-cabin-pixels.mjs`: all 12 ceilings, all 60 floors and a
  combined example; zero changed pixels outside the selected planes.

Exact pixel checks use the same CPU Canvas readback for the original WebP and
PNG roundtrip. Mixing GPU and CPU decoding introduces unrelated rounding noise.
QA output is in ignored `output/cabin-preview/` and is not a deployment input.

Deployment is on hold until the user approves both websites' combined preview.
