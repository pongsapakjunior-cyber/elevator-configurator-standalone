import { analyzeSpeedRecommendation } from './speed-recommendation.mjs';

// Planning inputs deliberately live outside the saved parameter/QR contract.
export function createSpeedPlanner(anchor) {
  const panel = document.createElement('section');
  panel.className = 'speed-planner';
  panel.dataset.planningOnly = '';
  panel.innerHTML = `
    <h3>Speed recommendation</h3>
    <p class="planning-intro">Building population & capacity · preliminary estimate</p>
    <div class="field"><label for="planningUse">Building type</label>
      <select id="planningUse" class="input" form="planning-advice-only">
        <option value="">Select building type</option>
        <option value="residential">Residential</option>
        <option value="office-fixed">Office / Fixed hours</option>
        <option value="office-flexible">Office / Flexible hours</option>
        <option value="hotel-resort">Hotel / Resort</option>
        <option value="hotel-business">Hotel / Business</option>
      </select>
    </div>
    <div class="planning-row">
      <div class="field"><label for="planningPopulation">Building population</label><input id="planningPopulation" class="input" type="number" min="1" max="100000" step="1" placeholder="e.g. 200" inputmode="numeric" aria-describedby="planningPopulationNote" form="planning-advice-only"></div>
      <div class="field"><label for="planningLiftCount">Lifts in this group</label><input id="planningLiftCount" class="input" type="number" min="1" max="32" step="1" value="1" inputmode="numeric" form="planning-advice-only"></div>
    </div>
    <small id="planningPopulationNote">People served above the main entrance. Same-capacity lifts serving the same floors.</small>
    <p class="planning-input-summary"></p>
    <div class="planning-answer" role="status" aria-live="polite"><strong></strong><p></p></div>
    <div class="planning-comparison" hidden></div>
    <details class="planning-method"><summary>Calculation assumptions</summary><p></p><small>Preliminary screening, not final equipment approval. No parameter is changed automatically.</small></details>
    <small class="planning-unsaved">Planning inputs only · not added to customer links or QR codes.</small>`;
  anchor.after(panel);
  let params = null;
  const use = panel.querySelector('#planningUse');
  const population = panel.querySelector('#planningPopulation');
  const count = panel.querySelector('#planningLiftCount');
  const title = panel.querySelector('.planning-answer strong');
  const message = panel.querySelector('.planning-answer p');
  const comparison = panel.querySelector('.planning-comparison');
  const format = (value, digits = 1) => Number.isFinite(value) ? value.toFixed(digits) : '—';
  const speedLabel = value => `${Number(value).toFixed(value === 1.75 ? 2 : 1)} m/s`;
  function refresh(next = params) {
    params = next;
    if (!params) return;
    const travel = params.floorHeights.reduce((sum, mm) => sum + mm, 0) / 1000;
    panel.querySelector('.planning-input-summary').textContent = `${params.floors} stops · ${format(travel)} m travel · ${params.capacity} kg per lift · selected ${speedLabel(params.speed)}`;
    const validInputs = [population, count].every(input => input.validity.valid && input.value.trim());
    const result = analyzeSpeedRecommendation(params, {
      buildingUse: use.value,
      population: validInputs ? Number(population.value) : null,
      liftCount: validInputs ? Number(count.value) : null,
    });
    panel.dataset.status = result.status;
    comparison.replaceChildren();
    comparison.hidden = !result.candidates.length;
    if (result.status === 'needs-input') {
      title.textContent = 'Enter the building type and population';
      message.textContent = 'The estimate reuses the capacity, stops and travel selected in this configurator.';
    } else if (result.recommendationSpeedMps !== null) {
      title.textContent = `Suggested starting speed: ${speedLabel(result.recommendationSpeedMps)}`;
      message.textContent = `Lowest listed speed meeting both screening targets. Your selected speed remains ${speedLabel(params.speed)}.`;
    } else if (result.status === 'traffic-study') {
      title.textContent = 'This building needs a broader traffic study';
      message.textContent = 'Incoming-only comparison shown below. Hotel/two-way traffic is not simulated, so no speed is presented as a complete recommendation.';
    } else {
      title.textContent = 'No listed speed meets this screening case';
      const needed = result.suggestedMinLiftCount ?? result.diagnosis?.requiredLiftsAtFastestCandidate;
      message.textContent = `No listed speed meets both targets.${needed > 32 ? ' This case is beyond a simple group comparison; review zoning and a dedicated traffic study.' : needed ? ` Compare at least ${needed} same-capacity lifts at 2.5 m/s under these assumptions, or review capacity and service times.` : ' Review lift quantity, capacity and service times.'}`;
    }
    if (result.candidates.length) {
      const target = document.createElement('p');
      target.className = 'planning-targets';
      target.textContent = `Screening targets: ${format(result.targets.handlingPercent, 0)}% of population / 5 min · arrival interval ≤ ${format(result.targets.intervalSeconds, 0)} s`;
      comparison.append(target);
      const table = document.createElement('table');
      table.innerHTML = '<thead><tr><th>Speed</th><th>People / 5 min</th><th>Interval</th><th>Check</th></tr></thead>';
      const body = document.createElement('tbody');
      result.candidates.forEach(candidate => {
        const row = document.createElement('tr');
        if (candidate.speedMps === result.recommendationSpeedMps) row.className = 'planning-suggested';
        [speedLabel(candidate.speedMps), format(candidate.handlingPeoplePer5Minutes, 0), `${format(candidate.intervalSeconds, 0)} s`, candidate.meetsTargets ? 'Meets' : 'Review'].forEach(value => { const cell = document.createElement('td'); cell.textContent = value; row.append(cell); });
        body.append(row);
      });
      table.append(body);comparison.append(table);
      const condition=document.createElement('small');condition.textContent='Conditional on partial-load departures; not a dispatch simulation or waiting-time prediction.';comparison.append(condition);
    }
    const a = result.assumptions;
    panel.querySelector('.planning-method p').textContent = `Incoming passengers only; uniform population across upper floors. Tests whole-passenger loads up to ${a.carLoadingFactor * 100}% of capacity / ${a.averagePassengerMassKg} kg per person; door opening ${a.doorOpeningSeconds} s, closing ${a.doorClosingSeconds} s; passenger transfer ${a.passengerTransferSeconds} s each way. Interval is modeled service-cycle spacing, excluding idle accumulation, not passenger waiting time. Goals are preliminary planning references; the partial-load feasibility calculation requires project-specific dispatch confirmation.`;
  }
  panel.addEventListener('input', event => { event.stopPropagation();refresh(); });
  panel.addEventListener('change', event => { event.stopPropagation();refresh(); });
  return { refresh };
}
