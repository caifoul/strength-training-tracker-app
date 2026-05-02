function attachCascade(container, row) {
  row.addEventListener('input', e => {
    const rows = Array.from(container.querySelectorAll('.set-row'));
    const idx  = rows.indexOf(row);
    if (idx === -1) return;
    const field = e.target.classList.contains('set-reps') ? 'set-reps' : 'set-weight';
    const val   = e.target.value;
    for (let i = idx + 1; i < rows.length; i++) {
      rows[i].querySelector(`.${field}`).value = val;
    }
  });
}

export function renderSetRows(container, sets, defaultReps, defaultWeight, existing = []) {
  const currentCount = container.querySelectorAll('.set-row').length;
  sets = Math.max(1, sets);

  if (sets > currentCount) {
    for (let i = currentCount; i < sets; i++) {
      const reps   = existing[i]?.reps   ?? (existing[i - 1]?.reps   ?? defaultReps);
      const weight = existing[i]?.weight ?? (existing[i - 1]?.weight ?? defaultWeight);
      const div = document.createElement('div');
      div.className = 'set-row';
      div.innerHTML = `
        <span class="set-label">Set ${i + 1}</span>
        <label>Reps<input type="number" class="set-reps" min="1" value="${reps}" /></label>
        <label>Weight (lbs)<input type="number" class="set-weight" min="0" step="2.5" value="${weight}" /></label>`;
      attachCascade(container, div);
      container.appendChild(div);
    }
  } else {
    const rows = container.querySelectorAll('.set-row');
    for (let i = rows.length - 1; i >= sets; i--) rows[i].remove();
  }
}

export function initSetRows(container, sets, defaultReps, defaultWeight) {
  container.innerHTML = '';
  renderSetRows(container, sets, defaultReps, defaultWeight);
}

export function readSetDetails(container) {
  return Array.from(container.querySelectorAll('.set-row')).map(row => ({
    reps:   parseInt(row.querySelector('.set-reps').value)   || 1,
    weight: parseFloat(row.querySelector('.set-weight').value) || 0,
  }));
}

export function summarizeSets(details) {
  if (!details.length) return { reps: 8, weight: 100 };
  const reps   = Math.round(details.reduce((s, d) => s + d.reps,   0) / details.length);
  const weight = Math.round(details.reduce((s, d) => s + d.weight, 0) / details.length * 4) / 4;
  return { reps, weight };
}

export function formatExerciseStats(exercise) {
  const d = exercise.setDetails;
  if (!d?.length) {
    return `<span>Sets: ${exercise.sets}</span>
            <span>Reps: ${exercise.reps}</span>
            <span>Weight: ${exercise.weight} lbs</span>`;
  }
  const allSame = d.every(s => s.reps === d[0].reps && s.weight === d[0].weight);
  if (allSame) {
    return `<span>${d.length} × ${d[0].reps} reps @ ${d[0].weight} lbs</span>`;
  }
  return d.map((s, i) => `<span>Set ${i + 1}: ${s.reps} × ${s.weight} lbs</span>`).join('');
}
