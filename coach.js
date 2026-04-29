// Coach UI Management
let coachState = {
  currentWorkout: null, // Template: { name, exercises: [{name, sets, reps, weight}] }
  currentSession: null, // { workoutName, exercises: [] }
  currentExerciseIndex: 0,
  loggedExercises: new Set(), // indices of logged exercises
  missedExercises: new Set(), // indices of missed exercises
};

function showScreen(screenId) {
  document.querySelectorAll('.coach-screen').forEach(screen => {
    screen.classList.add('hidden');
  });
  document.getElementById(screenId).classList.remove('hidden');
}

function getFavoriteWorkouts() {
  // Get all workouts from app.js storage
  loadWorkouts();
  return workouts.filter(session => session.favorite);
}

function getLastExerciseLogForName(exerciseName) {
  // Find the most recent logged instance of this exercise
  loadWorkouts();
  for (let i = workouts.length - 1; i >= 0; i--) {
    const session = workouts[i];
    for (const exercise of session.exercises) {
      if (exercise.name === exerciseName) {
        return exercise;
      }
    }
  }
  return null;
}

function getSmartDefaults(exerciseName, exerciseIndex) {
  const lastLog = getLastExerciseLogForName(exerciseName);
  if (lastLog) {
    return {
      sets: lastLog.sets,
      reps: lastLog.reps + 1,
      weight: lastLog.weight
    };
  }
  // Fallback defaults
  return { sets: 3, reps: 8, weight: 100 };
}

function renderFavoriteWorkouts() {
  const container = document.getElementById('favorite-workouts');
  const favorites = getFavoriteWorkouts();

  if (favorites.length === 0) {
    container.innerHTML = '<p class="empty-state">No favorite workouts yet. Create one in Log Workout first!</p>';
    return;
  }

  container.innerHTML = favorites
    .map(workout => `
      <div class="workout-card coach-workout-card">
        <h3>${workout.name}</h3>
        <p>${workout.exercises.length} exercise${workout.exercises.length === 1 ? '' : 's'}</p>
        <button type="button" class="btn-primary start-favorite-workout" data-session-id="${workout.id}">
          Start
        </button>
      </div>
    `)
    .join('');
}

function startFavoriteWorkout(sessionId) {
  loadWorkouts();
  const template = workouts.find(w => w.id === sessionId);
  if (!template) return;

  coachState.currentWorkout = template;
  coachState.currentSession = {
    workoutName: template.name,
    startTime: Date.now(),
    exercises: []
  };
  coachState.currentExerciseIndex = 0;
  coachState.loggedExercises.clear();
  coachState.missedExercises.clear();

  showExerciseSelection();
}

function createNewWorkout(workoutName) {
  coachState.currentWorkout = {
    name: workoutName,
    exercises: []
  };
  coachState.currentSession = {
    workoutName: workoutName,
    startTime: Date.now(),
    exercises: []
  };
  coachState.currentExerciseIndex = 0;
  coachState.loggedExercises.clear();
  coachState.missedExercises.clear();

  // For new workouts, we'll need to add exercises - for now, show a message
  showScreen('start-workout-screen');
  document.getElementById('workout-title').textContent = workoutName;
  document.getElementById('exercises-list').innerHTML = 
    '<p class="empty-state">New workout created! Add exercises first in the Log Workout section.</p>';
}

function showExerciseSelection() {
  showScreen('start-workout-screen');
  document.getElementById('workout-title').textContent = coachState.currentWorkout.name;
  renderExercisesSelection();
}

function renderExercisesSelection() {
  const container = document.getElementById('exercises-list');
  const exercises = coachState.currentWorkout.exercises;

  if (exercises.length === 0) {
    container.innerHTML = '<p class="empty-state">No exercises in this workout.</p>';
    return;
  }

  const html = exercises.map((exercise, index) => {
    const isLogged = coachState.loggedExercises.has(index);
    const isMissed = coachState.missedExercises.has(index);
    let status = '';
    let statusClass = '';

    if (isLogged) {
      status = '✓ Logged';
      statusClass = 'logged';
    } else if (isMissed) {
      status = '◌ Skipped';
      statusClass = 'missed';
    }

    return `
      <div class="exercise-selection-item ${statusClass}">
        <div class="exercise-selection-info">
          <strong>${exercise.name}</strong>
          <span>${exercise.sets}x${exercise.reps} @ ${exercise.weight} lbs</span>
          ${status ? `<span class="status">${status}</span>` : ''}
        </div>
        <button type="button" class="btn-primary select-exercise" data-index="${index}">
          ${isLogged ? 'Edit' : 'Log'}
        </button>
      </div>
    `;
  }).join('');

  container.innerHTML = html;
  updateProgress();
}

function updateProgress() {
  const total = coachState.currentWorkout.exercises.length;
  const logged = coachState.loggedExercises.size;
  const percent = total > 0 ? (logged / total) * 100 : 0;

  document.getElementById('progress-text').textContent = 
    `${logged} of ${total} exercises logged`;
  document.getElementById('progress-fill').style.width = `${percent}%`;
}

function logExerciseForIndex(index) {
  const exercise = coachState.currentWorkout.exercises[index];
  if (!exercise) return;

  const isEditing = coachState.loggedExercises.has(index);
  const previousEntry = isEditing
    ? coachState.currentSession.exercises.find(ex => ex.exerciseIndex === index)
    : null;

  const values = previousEntry
    ? { sets: previousEntry.sets, reps: previousEntry.reps, weight: previousEntry.weight }
    : getSmartDefaults(exercise.name, index);

  document.getElementById('exercise-name-display').textContent = exercise.name;
  document.getElementById('log-sets').value = values.sets;
  document.getElementById('log-reps').value = values.reps;
  document.getElementById('log-weight').value = values.weight;
  document.getElementById('log-notes').value = previousEntry ? (previousEntry.notes || '') : '';

  document.getElementById('exercise-log-form').dataset.exerciseIndex = index;

  showScreen('log-exercise-screen');
}

function submitExerciseLog() {
  const form = document.getElementById('exercise-log-form');
  const index = parseInt(form.dataset.exerciseIndex);

  const sets = parseInt(document.getElementById('log-sets').value);
  const reps = parseInt(document.getElementById('log-reps').value);
  const weight = parseInt(document.getElementById('log-weight').value);

  if (!sets || !reps || weight < 0) {
    alert('Please fill in all fields correctly');
    return;
  }

  const exercise = coachState.currentWorkout.exercises[index];
  const notes = document.getElementById('log-notes').value.trim();

  const existingIdx = coachState.currentSession.exercises.findIndex(
    ex => ex.exerciseIndex === index
  );

  const entry = { exerciseIndex: index, name: exercise.name, sets, reps, weight, notes, timestamp: Date.now() };

  if (existingIdx !== -1) {
    coachState.currentSession.exercises[existingIdx] = entry;
  } else {
    coachState.currentSession.exercises.push(entry);
  }

  coachState.loggedExercises.add(index);
  coachState.missedExercises.delete(index);

  checkWorkoutCompletion();
}

function skipExercise() {
  const form = document.getElementById('exercise-log-form');
  const index = parseInt(form.dataset.exerciseIndex);

  coachState.missedExercises.add(index);

  checkWorkoutCompletion();
}

function checkWorkoutCompletion() {
  const total = coachState.currentWorkout.exercises.length;
  const logged = coachState.loggedExercises.size;

  // If all exercises logged, go to complete screen
  if (logged === total) {
    showWorkoutComplete();
  } else {
    // Otherwise, show exercise selection again
    showExerciseSelection();
  }
}

function showWorkoutComplete() {
  showScreen('workout-complete-screen');
  renderWorkoutSummary();
}

function renderWorkoutSummary() {
  const summary = document.getElementById('workout-summary');
  const logged = coachState.loggedExercises.size;
  const total = coachState.currentWorkout.exercises.length;
  const missed = coachState.missedExercises.size;

  let html = `
    <div class="summary-stats">
      <p><strong>${logged} of ${total}</strong> exercises completed</p>
  `;

  if (missed > 0) {
    html += `<p><strong>${missed}</strong> exercises skipped</p>`;
  }

  html += '</div>';

  summary.innerHTML = html;

  // Show missed exercises section if any exist
  const missedSection = document.getElementById('missed-exercises');
  if (missed > 0) {
    missedSection.classList.remove('hidden');
    renderMissedExercises();
  } else {
    missedSection.classList.add('hidden');
  }
}

function renderMissedExercises() {
  const container = document.getElementById('missed-list');
  const exercises = coachState.currentWorkout.exercises;

  const missedHtml = Array.from(coachState.missedExercises)
    .map(index => {
      const exercise = exercises[index];
      return `
        <div class="exercise-selection-item">
          <div class="exercise-selection-info">
            <strong>${exercise.name}</strong>
            <span>${exercise.sets}x${exercise.reps} @ ${exercise.weight} lbs</span>
          </div>
          <button type="button" class="btn-secondary select-missed-exercise" data-index="${index}">
            Log
          </button>
        </div>
      `;
    })
    .join('');

  container.innerHTML = missedHtml;
}

function showAddExercisePanel() {
  const hasTemplate = !!(coachState.currentWorkout && coachState.currentWorkout.id);
  const saveBtn = document.getElementById('add-and-save-btn');
  saveBtn.style.display = hasTemplate ? '' : 'none';

  document.getElementById('add-ex-name').value = '';
  document.getElementById('add-ex-sets').value = '3';
  document.getElementById('add-ex-reps').value = '8';
  document.getElementById('add-ex-weight').value = '100';

  document.getElementById('add-exercise-panel').classList.remove('hidden');
  document.getElementById('add-exercise-btn').classList.add('hidden');
  document.getElementById('add-ex-name').focus();
}

function hideAddExercisePanel() {
  document.getElementById('add-exercise-panel').classList.add('hidden');
  document.getElementById('add-exercise-btn').classList.remove('hidden');
}

function addMidSessionExercise(saveToWorkout) {
  const name = document.getElementById('add-ex-name').value.trim();
  const sets = parseInt(document.getElementById('add-ex-sets').value);
  const reps = parseInt(document.getElementById('add-ex-reps').value);
  const weight = parseInt(document.getElementById('add-ex-weight').value);

  if (!name || !sets || !reps || weight < 0) {
    alert('Please fill in all fields correctly.');
    return;
  }

  const newExercise = { name, sets, reps, weight };
  coachState.currentWorkout.exercises.push(newExercise);

  if (saveToWorkout && coachState.currentWorkout.id) {
    loadWorkouts();
    const idx = workouts.findIndex(w => w.id === coachState.currentWorkout.id);
    if (idx !== -1) {
      workouts[idx].exercises.push({ ...newExercise });
      saveWorkouts();
    }
  }

  hideAddExercisePanel();
  renderExercisesSelection();
}

function endWorkout() {
  // Save the completed workout
  const session = {
    id: `session-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: coachState.currentSession.workoutName,
    favorite: false,
    timestamp: coachState.currentSession.startTime,
    exercises: coachState.currentSession.exercises.map(ex => ({
      id: `exercise-${ex.timestamp}-${Math.random().toString(36).slice(2)}`,
      name: ex.name,
      sets: ex.sets,
      reps: ex.reps,
      weight: ex.weight,
      notes: ex.notes || '',
      favorite: false
    }))
  };

  loadWorkouts();
  workouts.push(session);

  // If this workout was started from a favorited template, update it with the new values
  if (coachState.currentWorkout && coachState.currentWorkout.id) {
    const templateIndex = workouts.findIndex(w => w.id === coachState.currentWorkout.id);
    if (templateIndex !== -1) {
      // Update each exercise in the template with the completed values
      const loggedExercises = coachState.currentSession.exercises;
      workouts[templateIndex].exercises = workouts[templateIndex].exercises.map(templateEx => {
        const completed = loggedExercises.find(logged => logged.name === templateEx.name);
        if (completed) {
          return {
            ...templateEx,
            sets: completed.sets,
            reps: completed.reps,
            weight: completed.weight
          };
        }
        return templateEx;
      });
    }
  }

  saveWorkouts();

  // Reset and go back to start
  coachState = {
    currentWorkout: null,
    currentSession: null,
    currentExerciseIndex: 0,
    loggedExercises: new Set(),
    missedExercises: new Set(),
  };

  renderFavoriteWorkouts();
  showScreen('select-workout-screen');
  alert('Workout saved successfully!');
}

function updateRepHint() {
  const hint = document.querySelector('.rep-hint');
  if (!hint) return;
  try {
    const profile = JSON.parse(localStorage.getItem('strengthTrackerProfile') || '{}');
    const range = profile.preferredRepRange || profile.hypertrophy?.preferredRepRange;
    hint.textContent = range
      ? `Keep reps in your preferred range: ${range}`
      : 'Only count reps completed through your full range of motion.';
  } catch (_) {}
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  updateRepHint();
  renderFavoriteWorkouts();

  // Select workout screen
  document.getElementById('favorite-workouts').addEventListener('click', (e) => {
    if (e.target.matches('.start-favorite-workout')) {
      const sessionId = e.target.dataset.sessionId;
      startFavoriteWorkout(sessionId);
    }
  });

  document.getElementById('new-workout-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('new-workout-name').value.trim();
    if (name) {
      createNewWorkout(name);
      document.getElementById('new-workout-name').value = '';
    }
  });

  // Start workout screen
  document.getElementById('back-to-select').addEventListener('click', () => {
    showScreen('select-workout-screen');
    coachState = {
      currentWorkout: null,
      currentSession: null,
      currentExerciseIndex: 0,
      loggedExercises: new Set(),
      missedExercises: new Set(),
    };
  });

  document.getElementById('exercises-list').addEventListener('click', (e) => {
    if (e.target.matches('.select-exercise')) {
      const index = parseInt(e.target.dataset.index);
      logExerciseForIndex(index);
    }
  });

  // Add exercise mid-session
  document.getElementById('add-exercise-btn').addEventListener('click', showAddExercisePanel);
  document.getElementById('cancel-add-exercise-btn').addEventListener('click', hideAddExercisePanel);
  document.getElementById('add-session-only-btn').addEventListener('click', () => addMidSessionExercise(false));
  document.getElementById('add-and-save-btn').addEventListener('click', () => addMidSessionExercise(true));

  // Log exercise screen
  document.getElementById('exercise-log-form').addEventListener('submit', (e) => {
    e.preventDefault();
    submitExerciseLog();
  });

  document.getElementById('skip-exercise').addEventListener('click', () => {
    skipExercise();
  });

  document.getElementById('close-log').addEventListener('click', () => {
    showExerciseSelection();
  });

  // Workout complete screen
  document.getElementById('missed-list').addEventListener('click', (e) => {
    if (e.target.matches('.select-missed-exercise')) {
      const index = parseInt(e.target.dataset.index);
      logExerciseForIndex(index);
    }
  });

  document.getElementById('go-back-button').addEventListener('click', () => {
    showExerciseSelection();
  });

  document.getElementById('end-workout-button').addEventListener('click', () => {
    endWorkout();
  });
});
