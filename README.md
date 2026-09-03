# Schneider Lift Engineering Sizing Layout

Standalone 3D elevator configurator for preparing and sharing an initial engineering sizing layout and cabin-decoration schedule with customers.

## Use

- Open the hosted page to configure the lift dimensions and project details.
- Use **Model & dimensions** to set car width, depth and height, choose one- or two-side openings, use either one common floor height or individual floor-by-floor heights, and independently show or hide the floor-by-floor callouts in customer output.
- Use **Decoration** to choose a Schneider cabin collection and select individual ceiling, floor and handrail cards with cleaned product previews.
- Use **Copy customer link** to create a read-only presentation URL with `panel=0`.
- Use **QR customer link** to display the same customer URL as a QR code or download it as a print-ready SVG.
- Both pages and all selections are stored in the URL, so no customer or project data is sent to a backend.

## Deployment

This static site can be published from the repository root with Vercel or GitHub Pages. It has no build step. For local review, run `node scripts/serve.mjs` and open `http://127.0.0.1:4173`.

The app currently loads Three.js 0.184.0 from unpkg. The Schneider logo, fonts, cabin collection images and individual transparent finish assets are included with the site. QR codes are generated locally with the vendored MIT-licensed `qrcode-generator` 2.0.4 module. The cleaned finish sheets can be split again with `scripts/split-finish-sheets.ps1`.

Cabin collection names and images are based on the Schneider Lift Thailand design collection. Final finishes should be confirmed with physical samples before manufacture.
