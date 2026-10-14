// Data-entry bounds, not an engineering approval. Recommendations are warnings
// only: never replace the customer's measured overhead with a model minimum.
export const OVERHEAD_MIN = 1;
export const OVERHEAD_MAX = 6000;
export function inspectOverhead(input, elevatorType = 'mr') {
  const text = typeof input === 'string' ? input.trim().replace(/,/g, '') : input;
  const value = typeof text === 'number' || (typeof text === 'string' && /^\d+(?:\.\d+)?$/.test(text)) ? Number(text) : NaN;
  const valid = Number.isFinite(value) && value >= OVERHEAD_MIN && value <= OVERHEAD_MAX;
  const type = elevatorType === 'mrl' ? 'MRL' : 'MR', recommended = type === 'MRL' ? 4000 : 3600;
  return {
    valid, value, recommended,
    error: valid ? '' : `Enter an overhead from ${OVERHEAD_MIN} to ${OVERHEAD_MAX} mm. This value has not been applied.`,
    warning: valid && value < recommended ? `Overhead ${value} mm is below the current ${type} layout recommendation (${recommended} mm). Your value is kept; engineering review is required.` : '',
  };
}
