# Preliminary speed comparison — 9 September 2026

The configurator's adviser is independently calculated. Its input structure is informed by the public OTIS Create planner; it does not reproduce an OTIS algorithm, call an OTIS recommendation service, or represent an OTIS product selection. Existing speed choices, saved parameters and customer QR payloads remain unchanged.

## OTIS reference and UI inputs

[OTIS Create's public planner](https://www.otiscreate.com/elevator-planning/en/us) requests building type, population, stops and travel. Its public choices are Residential, Office/Fixed hours, Office/Flexible hours, Hotel/Resort and Hotel/Business. The US page labels travel in feet. This app uses its existing metric floor heights and derives travel in metres. The public tooltip defines population as occupants the group serves; this incoming-only model specifically uses the served upper-floor population. Stops include the main lobby; travel is the distance between lowest and highest served floors. [OTIS's explanation](https://www.otis.com/en/uk/w/considerations-when-choosing-your-lift) describes preliminary outputs covering quantity, type, speed and anticipated performance. No public proprietary calculation was verified.

The minimal added inputs are building use, served population above the entrance floor, and the number of identical lifts serving those floors as a group. Reuse the existing capacity, stops and floor-height inputs. A details panel may expose the target handling percentage and arrival interval. Clarify that population means people served above the main entrance, rather than simply copying total building occupancy including people who never use this group.

## Method and sources

[Richard Peters' original up-peak paper](https://joomla.peters-research.com/index.php/support/articles-and-papers/49-improvements-to-the-up-peak-round-trip-time-calculation) describes round-trip motion, stopping and transfer time; interval is RTT divided by lift count, and five-minute handling is 300 times car passengers times lift count divided by RTT. It distinguishes interval from passenger waiting time and discusses journeys that cannot reach rated speed. Its examples allow an extra 5–10% RTT loss. The adviser uses a 10% loss and computes a separate motion time for each possible consecutive-stop distance.

[Peters Research's passenger-data documentation](https://www.joomla.peters-research.com/index.php/support/manual/71-passenger-data) distinguishes prescribed-demand analysis, where resulting car loading is calculated, from assuming a fixed full-car loading. Its [handling-capacity documentation](https://elevate.freshdesk.com/support/solutions/articles/101000458890-5-min-handling-capacity-population-per-5-minutes-) makes the same distinction for enhanced up-peak calculations. This supports separating a saturated capacity reference from a service assessment. The implementation below uses a discrete payload envelope, not a proprietary enhanced-analysis solver or a prediction of actual dispatcher behavior.

The following performance goals were observed on the public OTIS Create US results screen using synthetic inputs. They are regional planner goals, not universal installation minima or regulations. The independent module compares **incoming-only** performance with the up-peak column; it does not claim to meet the two-way column. A project can supply its own targets.

| Public building type | Up-peak handling / interval | Two-way handling / interval, not calculated here |
| --- | --- | --- |
| Residential | ≥7% / ≤60 s | ≥4% / ≤100 s |
| Office/Fixed hours | ≥13% / ≤30 s | ≥7% / ≤50 s |
| Office/Flexible hours | ≥11% / ≤30 s | ≥6% / ≤50 s |
| Hotel/Business | ≥12% / ≤40 s | ≥7% / ≤75 s |
| Hotel/Resort | ≥11% / ≤50 s | ≥6% / ≤80 s |

Synthetic checks included Residential 100 people / 5 stops / 48 ft and 500 people / 12 stops / 132 ft; both displayed the same Residential goals. The US product suggestions, 3500 lb examples and US form bounds are not imported as Schneider product limits or Thai sizing rules.

## Explicit independent assumptions

| Item | Screening value |
| --- | --- |
| Passenger mass conversion | 75 kg/person; estimate only |
| Maximum screening car loading | 80%, rounded down; each whole trip load from 1 to this maximum is evaluated |
| Door opening / closing | 2.5 / 3 seconds |
| Boarding or alighting | 1.5 seconds per passenger, each direction |
| Start delay per departure | 0.5 seconds |
| Acceleration / jerk | 0.7 m/s² / 0.8 m/s³ |
| Extra round-trip loss | 10% |
| Candidate speeds | Existing app options: 1, 1.5, 1.75, 2.5 m/s |

Rated people and useful floor area are not inferred as a certification from kg. The maximum screened passengers per trip are `min(population, max(1, floor(floor(capacityKg / 75) × 0.8)))`. **Each whole payload from one passenger through that maximum is evaluated.** The selected operating point may be partially loaded; it does not assume every departing car carries 80%. Neither the original capacity nor the original speed is replaced.

The traffic case is a single entrance floor, identical conventional lifts, equal destination probability on every served upper floor, incoming passengers only, and an empty return to the entrance. A feasible partial-load result requires suitable early/timed departures. Passenger arrivals, idle time collecting a payload and the actual dispatch controller are not simulated; the result is a conditional capability envelope, not the predicted passenger waiting time or real lobby interval.

## Calculation details

Let N be the number of served floors above the entrance and P the whole screening passengers per trip. Each passenger independently selects one of N upper floors. Expected stops are `N × (1 − ((N−1)/N)^P)`. The probability that floor j is the highest destination is `(j/N)^P − ((j−1)/N)^P`; weight actual cumulative floor heights by these probabilities to obtain expected reversal height.

Expected flight time is computed by summing individual rest-to-rest journey times weighted by the probability that each leg occurs. For an initial lobby-to-j leg, the probability is `((N−j+1)/N)^P − ((N−j)/N)^P`. For consecutive occupied floors i and j, with g intervening floors, it is `((N−g)/N)^P − 2((N−g−1)/N)^P + ((N−g−2)/N)^P`. The return-to-lobby leg uses the highest-destination probability. These probability expressions are an independent inclusion–exclusion implementation and are tested against explicit enumeration of small cases.

Each flight uses a symmetric jerk-limited acceleration profile. A short journey solves for its reachable peak speed, so a larger nameplate speed does not falsely shorten a trip that cannot reach it. Door/start time is `(expectedStops + 1) × (opening + closing + start delay)`. Transfer time is `2 × P × transfer seconds`. RTT combines expected motion, doors/start and transfer, multiplied by 1.1. Handling percentage is `100 × HC5 / served population`.

For each speed, compare the calculated service-cycle spacing `RTT / liftCount` with the stated interval target at every screened payload. Among the payloads inside the target, choose the one with the highest five-minute handling capacity. If no payload is inside the interval target, show the shortest modeled cycle and mark it as outside the target. Compare the chosen payload's handling capacity with the required population demand. The result proposes the lowest listed speed satisfying both conditions. The maximum-load case is retained separately as `fullLoad`; it is not used as the only service condition for a lightly used building.

If no speed/payload combination qualifies, return a group-review result. The group-count comparison minimizes the required count over all screened payloads at the fastest existing candidate. A deliberately optimistic zero-motion-time bound likewise considers every payload. Failure even there is explicitly a result **under the stated assumptions**, not a claim that a real lift system is physically impossible or that a larger group is unconditionally required.

A regression case with 100 served people, 630 kg, five stops and 14.63 m travel now finds a qualifying 1 m/s partial-load point: two passengers, about 56.86 seconds modeled service-cycle spacing and 10.55% handling capacity. The saturated six-passenger case remains about 89.59 seconds in the diagnostic output. This corrected the previous bias of always imposing 80% loading. The independent dynamics were not adjusted to reproduce the 12.3% figure observed on the [public OTIS UK metric planner](https://www.otiscreate.com/elevator-planning/en/gb), and neither output proves actual real-world dispatch performance.

## Scope and preservation

Office and residential results remain preliminary up-peak comparisons. Hotels, hospitals, retail, mixed-use, other buildings, multiple entrance floors and destination-control traffic require broader analysis; the module does not return a recommended speed for them. No mean waiting time, ATTD, local-code compliance, machine suitability, pit/headroom feasibility, energy optimization or certification is claimed.

`analyzeSpeedRecommendation(params, planning)` reads configuration fields only. Use planning codes `residential`, `office-fixed`, `office-flexible`, `hotel-resort`, `hotel-business` with `population` and `liftCount`. It returns `status`, `recommendationSpeedMps`, `upPeakCandidateSpeedMps`, `suggestedMinLiftCount`, `current`, `candidates`, `targets`, `assumptions`, `missingFields`, `issues`, `sources` and diagnostic comparisons. Candidate rows include `passengersPerTrip`, `partialLoadRequired`, `payloadOptions`, and `fullLoad`. Top-level `passengersPerTrip` follows the selected current-speed payload; `maximumScreeningPassengersPerTrip` is its independent upper bound. A hotel can have a qualifying incoming-only candidate while its broader recommendation remains null. Incomplete or invalid data produces no recommendation and is not silently corrected. New planning fields should be session UI state unless a separate, versioned persistence change is explicitly intended; do not append them to the existing customer QR field order.

```sh
node --test scripts/speed-recommendation.test.mjs
```
