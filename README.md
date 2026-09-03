# Schneider Lift Engineering Sizing Layout

Standalone 3D elevator configurator for preparing and sharing an initial engineering sizing layout with customers.

## Use

- Open the hosted page to configure the lift dimensions and project details.
- Use **Copy customer link** to create a read-only presentation URL with `panel=0`.
- Use **QR customer link** to display the same customer URL as a QR code or download it as a print-ready SVG.
- The configuration is stored in the URL, so no customer or project data is sent to a backend.

## Deployment

This static site can be published from the repository root with Vercel or GitHub Pages. It has no build step.

The app currently loads Three.js 0.184.0 from unpkg. The Schneider logo and fonts needed by the generated standalone bundle are included with the site. QR codes are generated locally with the vendored MIT-licensed `qrcode-generator` 2.0.4 module.

When replacing the generated bundle, run `ruby scripts/harden-bundle.rb index.html` before publishing. It keeps customer links Unicode-safe and validates URL-provided floor heights before inserting them into the page.

## Roadmap

Cabin-decoration options can be added to this configurator in a later phase.
