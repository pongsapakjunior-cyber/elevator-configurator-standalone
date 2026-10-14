// Finish-only options from the supplied catalog/photos. These identifiers do
// not imply a door mechanism, fire rating, dimensions, or a price.
export const LANDING_DOOR_OPTIONS = Object.freeze([
  ...['SD-005', 'SD-006', 'SD-007', 'SD-008', 'SD-101', 'SD-102', 'SD-103', 'SD-104']
    .map(id => Object.freeze({ id, group: 'Landing door · catalog option' })),
  Object.freeze({ id: 'LD-GLASS', group: 'Stainless with two narrow windows · photo reference' }),
  Object.freeze({ id: 'LD-STANDARD', group: 'Plain stainless · photo reference' }),
]);

export function normalizeLandingDoorFinish(value) {
  const id = String(value ?? '').trim().toUpperCase();
  return LANDING_DOOR_OPTIONS.some(option => option.id === id) ? id : 'none';
}
