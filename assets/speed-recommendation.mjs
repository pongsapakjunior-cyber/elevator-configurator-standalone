// Independent preliminary traffic screening. Source provenance is retained in
// the internal method notes; this is not a manufacturer's product selection.
const SPEEDS = Object.freeze([1, 1.5, 1.75, 2.5]);
// Reference planning goals, not a manufacturer's calculation method.
const PROFILES = Object.freeze({
  residential: Object.freeze({ handlingPercent: 7, intervalSeconds: 60, source: 'reference-planning-goal' }),
  'office-fixed': Object.freeze({ handlingPercent: 13, intervalSeconds: 30, source: 'reference-planning-goal' }),
  'office-flexible': Object.freeze({ handlingPercent: 11, intervalSeconds: 30, source: 'reference-planning-goal' }),
  'hotel-business': Object.freeze({ handlingPercent: 12, intervalSeconds: 40, source: 'reference-planning-goal' }),
  'hotel-resort': Object.freeze({ handlingPercent: 11, intervalSeconds: 50, source: 'reference-planning-goal' }),
});
const SOURCES = Object.freeze([
  { title: 'Peters: improvements to the up-peak round-trip-time calculation', url: 'https://joomla.peters-research.com/index.php/support/articles-and-papers/49-improvements-to-the-up-peak-round-trip-time-calculation' },
  { title: 'Peters Research: demand and calculated car loading', url: 'https://www.joomla.peters-research.com/index.php/support/manual/71-passenger-data' },
].map(Object.freeze));
const ASSUMPTIONS = Object.freeze({
  averagePassengerMassKg: 75,
  carLoadingFactor: 0.8,
  doorOpeningSeconds: 2.5,
  doorClosingSeconds: 3,
  passengerTransferSeconds: 1.5,
  startDelaySeconds: 0.5,
  accelerationMps2: 0.7,
  jerkMps3: 0.8,
  roundTripLossFactor: 1.1,
});
const numeric = value => {
  if (value === '' || value === null || value === undefined || typeof value === 'boolean') return null;
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
};
const positive = value => { const number = numeric(value); return number > 0 ? number : null; };

/** Symmetric rest-to-rest S-curve flight, respecting speed, acceleration and jerk. */
export function estimateFlightSeconds(distanceM, speedMps, accelerationMps2 = 0.7, jerkMps3 = 0.8) {
  if (![distanceM, speedMps, accelerationMps2, jerkMps3].every(Number.isFinite)
    || distanceM < 0 || speedMps <= 0 || accelerationMps2 <= 0 || jerkMps3 <= 0) {
    throw new RangeError('Flight distance must be nonnegative and dynamics positive finite numbers.');
  }
  if (distanceM === 0) return 0;
  const accelerationTime = v => v >= accelerationMps2 ** 2 / jerkMps3
    ? v / accelerationMps2 + accelerationMps2 / jerkMps3
    : 2 * Math.sqrt(v / jerkMps3);
  const ratedAccelerationTime = accelerationTime(speedMps);
  if (distanceM >= speedMps * ratedAccelerationTime) {
    return distanceM / speedMps + ratedAccelerationTime;
  }
  // Short journeys do not reach rated speed. Solve peak velocity, not d / v.
  let lower = 0, upper = speedMps;
  for (let i = 0; i < 56; i++) {
    const middle = (lower + upper) / 2;
    if (middle * accelerationTime(middle) > distanceM) upper = middle;
    else lower = middle;
  }
  return 2 * accelerationTime((lower + upper) / 2);
}

function routeProbabilities(heightsM, passengers) {
  const n = heightsM.length, level = [0];
  heightsM.forEach(height => level.push(level.at(-1) + height));
  const power = count => (count / n) ** passengers;
  const legs = [];
  let highestFloor = 0, reversalHeightM = 0;
  for (let j = 1; j <= n; j++) {
    const firstProbability = power(n - j + 1) - power(n - j);
    const lastProbability = power(j) - power(j - 1);
    legs.push({ distanceM: level[j], probability: firstProbability + lastProbability });
    highestFloor += j * lastProbability;
    reversalHeightM += level[j] * lastProbability;
    for (let i = 1; i < j; i++) {
      // Both endpoint destinations occupied, none between them: inclusion/exclusion.
      const available = n - (j - i - 1);
      const probability = Math.max(0, power(available) - 2 * power(available - 1) + power(available - 2));
      if (probability > 0) legs.push({ distanceM: level[j] - level[i], probability });
    }
  }
  return {
    legs,
    expectedStops: n * (1 - ((n - 1) / n) ** passengers),
    expectedHighestFloor: highestFloor,
    expectedReversalHeightM: reversalHeightM,
    totalTravelM: level.at(-1),
  };
}

/**
 * Reuses existing elevator dimensions, returning advice without changing them.
 * Planning population is the population served ABOVE the main entrance floor.
 * Identical lifts must serve the same floors as one group.
 */
export function analyzeSpeedRecommendation(params = {}, planning = {}) {
  const field = key => planning[key] ?? params[key];
  const requestedUse = String(field('buildingUse') || '').toLowerCase();
  const buildingUse = requestedUse === 'office' ? 'office-fixed' : requestedUse === 'hotel' ? 'hotel-business' : requestedUse;
  const population = positive(field('population')), liftCount = positive(field('liftCount'));
  const floors = positive(params.floors), capacityKg = positive(params.capacity), currentSpeed = positive(params.speed);
  const useSupported = ['office-fixed', 'office-flexible', 'residential'].includes(buildingUse);
  const profile = PROFILES[buildingUse];
  const baselineHandling = profile?.handlingPercent ?? null;
  const baselineInterval = profile?.intervalSeconds ?? null;
  const requestedHandling = field('targetHandlingPercent'), requestedInterval = field('targetIntervalSeconds');
  const hasHandlingOverride = requestedHandling !== undefined && requestedHandling !== null && requestedHandling !== '';
  const hasIntervalOverride = requestedInterval !== undefined && requestedInterval !== null && requestedInterval !== '';
  const targets = {
    handlingPercent: hasHandlingOverride ? positive(requestedHandling) : baselineHandling,
    intervalSeconds: hasIntervalOverride ? positive(requestedInterval) : baselineInterval,
    handlingSource: hasHandlingOverride ? 'project-input' : baselineHandling === null ? null : profile.source,
    intervalSource: hasIntervalOverride ? 'project-input' : baselineInterval === null ? null : profile.source,
  };
  const assumptions = {
    ...ASSUMPTIONS,
    traffic: 'incoming-up-peak-only',
    floorPopulation: 'equal probability on each served upper floor',
    dispatch: 'conditional service envelope allowing partial-load or timed departures; actual dispatch not simulated',
    intervalDefinition: 'modeled service-cycle spacing RTT / group count, excluding idle time to collect passengers; not actual waiting time',
    personsMethod: 'screen whole trip loads from 1 to floor(80% of floor(capacity kg / 75)); assumed, not certified occupancy',
  };
  const base = {
    mode: 'advice-only',
    methodLabel: 'Independent up-peak screening with building population and capacity inputs',
    status: 'needs-input', recommendationSpeedMps: null, suggestedMinLiftCount: null,
    current: null, candidates: [], targets, assumptions,
    missingFields: [], issues: [], sources: SOURCES.map(source => ({ ...source })),
    limitations: [
      'This is an independent preliminary estimate, not a validated product selection.',
      'Uniform upper-floor occupancy and incoming traffic only; no mixed traffic, zoning, basement demand or destination dispatch is simulated.',
      'Door and passenger times are stated planning assumptions; rated persons and car floor area need separate confirmation.',
      'Results require partial-load or timed departures when indicated. Idle accumulation, actual dispatch and passenger waiting time are not predicted.',
      'Modeled service-cycle spacing is not a prediction of actual lobby intervals. Physical speed suitability is not assessed.',
    ],
  };
  if (!Object.hasOwn(PROFILES, buildingUse) && !['other', 'hospital', 'retail', 'mixed'].includes(buildingUse)) base.missingFields.push('buildingUse');
  if (!Number.isInteger(population) || population <= 0) base.missingFields.push('population');
  if (!Number.isInteger(liftCount) || liftCount <= 0) base.missingFields.push('liftCount');
  if (!Number.isInteger(floors) || floors < 2 || floors > 200) base.missingFields.push('floors');
  if (capacityKg === null || capacityKg < ASSUMPTIONS.averagePassengerMassKg) base.missingFields.push('capacity');
  if (currentSpeed === null) base.missingFields.push('speed');
  if (hasHandlingOverride && (targets.handlingPercent === null || targets.handlingPercent > 100)) base.missingFields.push('targetHandlingPercent');
  if (hasIntervalOverride && targets.intervalSeconds === null) base.missingFields.push('targetIntervalSeconds');
  let heightsM = [];
  if (Number.isInteger(floors) && floors >= 2 && floors <= 200) {
    const arrayHeights = Array.isArray(params.floorHeights) ? params.floorHeights.map(positive) : null;
    const uniform = positive(params.floorToFloor);
    if (params.floorHeightMode === 'uniform' && uniform !== null) heightsM = Array(floors - 1).fill(uniform / 1000);
    else if (arrayHeights && arrayHeights.length === floors - 1 && arrayHeights.every(value => value !== null)) heightsM = arrayHeights.map(value => value / 1000);
    else if (!arrayHeights && params.floorHeightMode !== 'individual' && uniform !== null) heightsM = Array(floors - 1).fill(uniform / 1000);
    else base.missingFields.push('floorHeights');
  }
  if (base.missingFields.length) return base;
  const ratedPersonsEstimate = Math.floor(capacityKg / ASSUMPTIONS.averagePassengerMassKg);
  const maximumScreeningPassengersPerTrip = Math.min(population, Math.max(1, Math.floor(ratedPersonsEstimate * ASSUMPTIONS.carLoadingFactor)));
  const payloadRoutes = Array.from({ length: maximumScreeningPassengersPerTrip }, (_, index) => {
    const passengersPerTrip = index + 1;
    const route = routeProbabilities(heightsM, passengersPerTrip);
    const doorsAndStartSeconds = (route.expectedStops + 1) * (ASSUMPTIONS.doorOpeningSeconds + ASSUMPTIONS.doorClosingSeconds + ASSUMPTIONS.startDelaySeconds);
    const passengerSeconds = 2 * passengersPerTrip * ASSUMPTIONS.passengerTransferSeconds;
    return { passengersPerTrip, route, doorsAndStartSeconds, passengerSeconds, nonTravelSeconds: doorsAndStartSeconds + passengerSeconds };
  });
  const flightCaches = new Map();
  const evaluatePayload = (speedMps, payload, zeroTravel = false) => {
    const { passengersPerTrip, route, doorsAndStartSeconds, passengerSeconds, nonTravelSeconds } = payload;
    if (!flightCaches.has(speedMps)) flightCaches.set(speedMps, new Map());
    const cache = flightCaches.get(speedMps);
    const motionSeconds = zeroTravel ? 0 : route.legs.reduce((sum, leg) => {
      if (!cache.has(leg.distanceM)) cache.set(leg.distanceM, estimateFlightSeconds(leg.distanceM, speedMps, ASSUMPTIONS.accelerationMps2, ASSUMPTIONS.jerkMps3));
      return sum + leg.probability * cache.get(leg.distanceM);
    }, 0);
    const roundTripSeconds = (motionSeconds + nonTravelSeconds) * ASSUMPTIONS.roundTripLossFactor;
    const intervalSeconds = roundTripSeconds / liftCount;
    const handlingPeoplePer5Minutes = 300 * passengersPerTrip * liftCount / roundTripSeconds;
    const handlingPercent = 100 * handlingPeoplePer5Minutes / population;
    const meetsHandling = targets.handlingPercent === null ? null : handlingPercent >= targets.handlingPercent;
    const meetsInterval = targets.intervalSeconds === null ? null : intervalSeconds <= targets.intervalSeconds;
    return {
      speedMps, roundTripSeconds, intervalSeconds, handlingPeoplePer5Minutes, handlingPercent,
      motionSeconds, doorsAndStartSeconds, passengerSeconds,
      passengersPerTrip, expectedStops: route.expectedStops,
      expectedHighestFloor: route.expectedHighestFloor, expectedReversalHeightM: route.expectedReversalHeightM,
      meetsHandling, meetsInterval, meetsTargets: meetsHandling === true && meetsInterval === true,
    };
  };
  // A fully loaded car is not required to depart on every trip. Compare payloads
  // under the service target rather than rejecting a lightly used group solely
  // because its saturated full-load round trip is longer than that target.
  const choosePayload = options => {
    const withinInterval = options.filter(option => targets.intervalSeconds === null || option.meetsInterval);
    if (withinInterval.length) return withinInterval.reduce((best, option) => option.handlingPeoplePer5Minutes > best.handlingPeoplePer5Minutes ? option : best);
    return options.reduce((best, option) => option.intervalSeconds < best.intervalSeconds ? option : best);
  };
  const evaluate = speedMps => {
    const payloadOptions = payloadRoutes.map(payload => evaluatePayload(speedMps, payload));
    const chosen = choosePayload(payloadOptions);
    return {
      ...chosen,
      partialLoadRequired: chosen.passengersPerTrip < maximumScreeningPassengersPerTrip,
      fullLoad: payloadOptions.at(-1), payloadOptions,
    };
  };
  const candidates = SPEEDS.map(evaluate), current = evaluate(currentSpeed), fastest = candidates.at(-1);
  const recommended = candidates.find(candidate => candidate.meetsTargets);
  const optimisticOptions = payloadRoutes.map(payload => evaluatePayload(SPEEDS.at(-1), payload, true));
  const optimistic = choosePayload(optimisticOptions);
  const beyondSpeedOnly = targets.handlingPercent !== null && targets.intervalSeconds !== null
    && optimisticOptions.every(option => !option.meetsTargets);
  const topologyUnsupported = field('mixedTraffic') === true || field('multipleEntranceFloors') === true || field('destinationControl') === true;
  const scopeSupported = useSupported && !topologyUnsupported;
  const status = !scopeSupported ? 'traffic-study' : recommended ? 'preliminary' : 'group-review';
  if (!scopeSupported) base.issues.push({ code: 'traffic-pattern-outside-screen', message: 'This use or traffic arrangement needs a broader traffic study; the table is an incoming-only comparison, not a recommended speed.' });
  if (scopeSupported && !recommended) base.issues.push({
    code: beyondSpeedOnly ? 'capacity-quantity-or-service-time' : 'no-listed-speed-meets-target',
    message: beyondSpeedOnly
      ? 'Under these assumptions, no screened payload meets both targets even with travel time removed. Compare group quantity, car loading and door/service times.'
      : 'No listed speed and screened trip load meet both targets under these assumptions. Compare group quantity, capacity and door timing as well as speed.',
  });
  const requiredLiftsAtFastestCandidate = targets.handlingPercent !== null && targets.intervalSeconds !== null
    ? Math.min(...fastest.payloadOptions.map(option => Math.ceil(Math.max(option.roundTripSeconds / targets.intervalSeconds, (population * targets.handlingPercent / 100) * option.roundTripSeconds / (300 * option.passengersPerTrip))))) : null;
  return {
    ...base, status, current, candidates, buildingUse,
    recommendationSpeedMps: scopeSupported && recommended ? recommended.speedMps : null,
    upPeakCandidateSpeedMps: recommended?.speedMps ?? null,
    suggestedMinLiftCount: requiredLiftsAtFastestCandidate,
    population, liftCount, ratedPersonsEstimate, passengersPerTrip: current.passengersPerTrip,
    maximumScreeningPassengersPerTrip,
    expectedStops: current.expectedStops,
    expectedHighestFloor: current.expectedHighestFloor,
    expectedReversalHeightM: current.expectedReversalHeightM,
    totalTravelM: payloadRoutes[0].route.totalTravelM,
    diagnosis: {
      beyondSpeedOnly, requiredLiftsAtFastestCandidate,
      candidateRangeMps: [SPEEDS[0], SPEEDS.at(-1)],
      optimisticZeroTravelBound: { handlingPercent: optimistic.handlingPercent, intervalSeconds: optimistic.intervalSeconds, passengersPerTrip: optimistic.passengersPerTrip },
    },
  };
}
