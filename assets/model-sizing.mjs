// Display-only references transcribed from the owner's two sizing photographs.
// Never use this module to normalize, overwrite, or serialize customer parameters.
const CENTER_TWO_PANEL_OPERATOR = Object.freeze([
  [600, 1220, 325, 175], [650, 1320, 350, 200],
  [700, 1420, 375, 225], [750, 1520, 400, 250],
  [800, 1620, 425, 275], [850, 1720, 450, 300],
  [900, 1820, 475, 325], [950, 1920, 500, 350],
  [1000, 2020, 525, 375], [1100, 2220, 575, 425],
  [1200, 2420, 625, 475],
].map(Object.freeze));

const positiveNumber = value => {
  if (value === null || value === undefined || value === '' || typeof value === 'boolean') return null;
  const number = Number(value);
  return Number.isFinite(number) && number > 0 ? number : null;
};
const difference = (a, b) => a === null || b === null ? null : a - b;

function operatorReference(doorCode, doorWidthMm) {
  if (doorCode !== '2C' || doorWidthMm === null || doorWidthMm < 600 || doorWidthMm > 1200) return null;
  const row = CENTER_TWO_PANEL_OPERATOR.find(entry => entry[0] === doorWidthMm);
  const lower = row || [...CENTER_TWO_PANEL_OPERATOR].reverse().find(entry => entry[0] < doorWidthMm);
  const upper = row || CENTER_TWO_PANEL_OPERATOR.find(entry => entry[0] > doorWidthMm);
  return {
    source: 'Owner photo: GNL-DOVVF-CO center-opening 2-panel operator, page 40',
    match: row ? 'tabulated' : 'interpolated',
    doorWidthMm,
    // L is the photographed operator assembly span, not a universal shaft minimum.
    beamLengthMm: row ? row[1] : 2 * doorWidthMm + 20,
    l1Mm: row ? row[2] : doorWidthMm / 2 + 25,
    l2Mm: row ? row[3] : doorWidthMm / 2 - 125,
    referenceWidthsMm: row ? [row[0]] : [lower[0], upper[0]],
  };
}

/** Compare a configuration with photo references without correcting any value. */
export function analyzeModelSizing(params = {}) {
  const elevatorType = params.elevatorType === 'mrl' ? 'mrl' : 'mr';
  const entrances = positiveNumber(params.entrances);
  const panels = positiveNumber(params.doorPanels);
  const doorCode = Number.isInteger(panels) && ['center', 'side'].includes(params.doorType)
    ? `${panels}${params.doorType === 'center' ? 'C' : 'S'}` : null;
  const shaftWidthMm = positiveNumber(params.shaftW), shaftDepthMm = positiveNumber(params.shaftD);
  const carWidthMm = positiveNumber(params.carW), carDepthMm = positiveNumber(params.carD);
  const doorWidthMm = positiveNumber(params.doorW);
  const side = elevatorType === 'mrl' || entrances === 2;
  const widthAllowanceMm = elevatorType === 'mrl' ? 700 : 600;
  const depthAllowanceMm = elevatorType === 'mrl' ? 500 : 600;
  const actualWidthAllowanceMm = difference(shaftWidthMm, carWidthMm);
  const actualDepthAllowanceMm = difference(shaftDepthMm, carDepthMm);
  const reference = operatorReference(doorCode, doorWidthMm);
  const observations = [], advisories = [];
  observations.push({
    code: 'photo-cabin-reference',
    message: `${elevatorType.toUpperCase()} photo guideline: car W = shaft W − ${widthAllowanceMm} mm; car D = shaft D − ${depthAllowanceMm} mm.`,
  });
  if (actualWidthAllowanceMm !== null && actualDepthAllowanceMm !== null) {
    observations.push({
      code: 'actual-shaft-car-difference',
      message: `Configured shaft minus car: ${actualWidthAllowanceMm} mm in width and ${actualDepthAllowanceMm} mm in depth.`,
    });
    if (actualWidthAllowanceMm !== widthAllowanceMm || actualDepthAllowanceMm !== depthAllowanceMm) {
      observations.push({
        code: 'historical-variation',
        message: 'The historical sheet includes different allowances; this comparison does not change the configured dimensions.',
      });
    }
    if (actualWidthAllowanceMm <= 0 || actualDepthAllowanceMm <= 0) advisories.push({
      code: 'nonpositive-shaft-car-space',
      message: 'The configured car leaves no positive shaft space on at least one axis. The model retains those dimensions.',
    });
  }
  if (entrances === 2) observations.push({
    code: 'two-entrance-side-layout',
    message: 'A side counterweight is shown to keep the rear entrance open; the photo sketches do not specify a two-entrance layout.',
  });
  if (reference) observations.push({
    code: 'photo-operator-reference',
    message: `2C operator reference L ${reference.beamLengthMm} mm, L1 ${reference.l1Mm} mm, L2 ${reference.l2Mm} mm${reference.match === 'interpolated' ? ' (interpolated between photographed sizes)' : ''}.`,
  });
  else if (doorCode === '2C' && doorWidthMm !== null) observations.push({
    code: 'operator-outside-photo-range',
    message: 'The photographed 2C operator table covers 600–1200 mm openings; no operator dimension is inferred outside that range.',
  });
  else if (doorCode) observations.push({
    code: 'operator-other-door-type',
    message: `The photographed operator table is for 2C only; it is not applied to ${doorCode}.`,
  });
  if (reference && shaftWidthMm !== null && reference.beamLengthMm > shaftWidthMm) advisories.push({
    code: 'operator-span-exceeds-shaft',
    message: `The photo reference operator span (${reference.beamLengthMm} mm) exceeds the configured shaft width (${shaftWidthMm} mm); confirm the selected operator arrangement.`,
  });
  if (doorCode === '2C' && doorWidthMm === 800 && shaftWidthMm !== null && shaftWidthMm <= 1750) advisories.push({
    code: 'owner-800-door-shaft-guideline',
    message: 'The handwritten project note suggests a shaft wider than 1750 mm for an 800 mm opening. This is separate from the 1620 mm operator reference and does not alter the configuration.',
  });
  return {
    mode: 'reference-only',
    counterweightSide: side ? 'side' : 'rear',
    counterweightReason: entrances === 2 ? 'rear-entrance-clearance' : 'owner-photo-sketch',
    doorCode,
    summary: `${elevatorType.toUpperCase()} · ${side ? 'side' : 'rear'} counterweight${doorCode ? ` · ${doorCode}` : ''}`,
    heuristics: {
      source: 'Owner photo: Sizing for Installation / Cabin',
      widthAllowanceMm, depthAllowanceMm,
      referenceCarWidthMm: difference(shaftWidthMm, widthAllowanceMm),
      referenceCarDepthMm: difference(shaftDepthMm, depthAllowanceMm),
      actualWidthAllowanceMm, actualDepthAllowanceMm,
      widthDeviationMm: difference(actualWidthAllowanceMm, widthAllowanceMm),
      depthDeviationMm: difference(actualDepthAllowanceMm, depthAllowanceMm),
    },
    operatorReference: reference,
    observations,
    advisories,
  };
}
