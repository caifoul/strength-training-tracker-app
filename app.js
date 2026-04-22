const exerciseForm = document.getElementById('exercise-form');
const workoutNameInput = document.getElementById('workout-name');
const workoutList = document.getElementById('workout-list');
const currentWorkoutList = document.getElementById('current-workout-list');
const clearLogButton = document.getElementById('clear-log');
const saveWorkoutButton = document.getElementById('save-workout-session');
const clearCurrentWorkoutButton = document.getElementById('clear-current-workout');
const exerciseNameInput = document.getElementById('exercise-name');
const suggestionsList = document.getElementById('exercise-suggestions');
const sessionFavoriteCheckbox = document.getElementById('workout-favorite');

const storageKey = 'strengthTrackerExercises';
const popularExercises = [
  'Bench Press',
  'Incline Bench Press',
  'Decline Bench Press',
  'Dumbbell Bench Press',
  'Close-Grip Bench Press',
  'Paused Bench Press',
  'Floor Press',
  'Back Squat',
  'Front Squat',
  'Box Squat',
  'Pause Squat',
  'Goblet Squat',
  'Zercher Squat',
  'Overhead Squat',
  'Deadlift',
  'Romanian Deadlift',
  'Sumo Deadlift',
  'Deficit Deadlift',
  'Trap Bar Deadlift',
  'Stiff-Leg Deadlift',
  'Single-Leg Deadlift',
  'Hip Thrust',
  'Glute Bridge',
  'Cable Pull-Through',
  'Good Morning',
  'Glute-Ham Raise',
  'Overhead Press',
  'Seated Dumbbell Press',
  'Push Press',
  'Arnold Press',
  'Military Press',
  'Push-Up',
  'Bench Dip',
  'Incline Push-Up',
  'Decline Push-Up',
  'Pull-Up',
  'Chin-Up',
  'Neutral-Grip Pull-Up',
  'Lat Pulldown',
  'Cable Row',
  'Barbell Row',
  'Pendlay Row',
  'T-Bar Row',
  'Single-Arm Dumbbell Row',
  'Chest Fly',
  'Cable Fly',
  'Pec Deck Fly',
  'Face Pull',
  'Cable Lateral Raise',
  'Dumbbell Lateral Raise',
  'Front Raise',
  'Reverse Fly',
  'Triceps Dip',
  'Tricep Pushdown',
  'Overhead Tricep Extension',
  'Skullcrusher',
  'Diamond Push-Up',
  'Hammer Curl',
  'Bicep Curl',
  'Preacher Curl',
  'Concentration Curl',
  'Cable Curl',
  'Zottman Curl',
  'Leg Press',
  'Leg Extension',
  'Leg Curl',
  'Seated Leg Curl',
  'Standing Leg Curl',
  'Hip Abduction',
  'Hip Adduction',
  'Calf Raise',
  'Seated Calf Raise',
  'Single-Leg Calf Raise',
  'Bulgarian Split Squat',
  'Reverse Lunge',
  'Walking Lunge',
  'Static Lunge',
  'Step-Up',
  'Curtsy Lunge',
  'Sled Push',
  'Farmer Carry',
  'Farmer Walk',
  'Shrug',
  'Dumbbell Shrug',
  'Kettlebell Swing',
  'Turkish Get-Up',
  'Plank',
  'Side Plank',
  'Hanging Knee Raise',
  'Hanging Leg Raise',
  'Russian Twist',
  'Cable Woodchop',
  'Ab Wheel Rollout',
  'Mountain Climber',
  'Single-Leg SLDL',
  'Nordic Hamstring Curl',
  'Cable Pull-Through'
];

let workouts = [];
let currentWorkoutExercises = [];

function normalizeWorkouts(raw) {
  if (!Array.isArray(raw)) return [];
  if (raw.length === 0) return [];
  if (raw[0] && Array.isArray(raw[0].exercises)) {
    return raw;
  }

  return raw.map(item => ({
    id: `session-${item.timestamp || Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: item.name ? `${item.name} Workout` : 'Workout Session',
    timestamp: item.timestamp || Date.now(),
    favorite: !!item.favorite,
    exercises: [
      {
        id: `exercise-${item.timestamp || Date.now()}-${Math.random().toString(36).slice(2)}`,
        name: item.name || 'Exercise',
        sets: item.sets || 1,
        reps: item.reps || 1,
        weight: item.weight || 0,
        favorite: !!item.favorite
      }
    ]
  }));
}

function loadWorkouts() {
  try {
    const stored = JSON.parse(localStorage.getItem(storageKey) || '[]');
    workouts = normalizeWorkouts(stored);
  } catch (e) {
    console.warn('Could not load workouts from localStorage');
    workouts = [];
  }
}

function saveWorkouts() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(workouts));
  } catch (e) {
    console.warn('Could not save workouts');
  }
}

function getAllExercises() {
  return workouts.flatMap(session =>
    session.exercises.map(exercise => ({
      ...exercise,
      sessionName: session.name,
      sessionTimestamp: session.timestamp,
      sessionId: session.id
    }))
  );
}

function setSuggestionVisibility(visible) {
  suggestionsList.style.display = visible ? 'block' : 'none';
}

function updateSuggestions(query) {
  const normalizedQuery = query.trim().toLowerCase();
  const recentExercises = {};
  getAllExercises().forEach(exercise => {
    recentExercises[exercise.name] = Math.max(recentExercises[exercise.name] || 0, exercise.sessionTimestamp);
  });
  let matches;

  if (normalizedQuery) {
    const popularMatches = popularExercises.filter(exercise => exercise.toLowerCase().includes(normalizedQuery));
    const loggedMatches = Object.keys(recentExercises).filter(exercise => exercise.toLowerCase().includes(normalizedQuery));
    matches = [...new Set([...popularMatches, ...loggedMatches])].sort();
  } else {
    const loggedNames = Object.keys(recentExercises);
    const recentSorted = loggedNames.sort((a, b) => recentExercises[b] - recentExercises[a]);
    const unloggedPopular = popularExercises.filter(ex => !loggedNames.includes(ex));
    matches = recentSorted.concat(unloggedPopular);
  }

  if (matches.length === 0) {
    suggestionsList.innerHTML = '';
    setSuggestionVisibility(false);
    return;
  }

  suggestionsList.innerHTML = matches
    .map(name => `<li class="suggestion-item" role="option">${name}</li>`)
    .join('');
  setSuggestionVisibility(true);
}

function getPredictedValues(exerciseName) {
  const pastExercises = getAllExercises().filter(ex => ex.name === exerciseName);
  if (pastExercises.length === 0) {
    return { sets: 3, reps: 8, weight: 100 };
  }
  
  // Calculate averages of all past exercises
  const avgSets = pastExercises.reduce((sum, ex) => sum + ex.sets, 0) / pastExercises.length;
  const avgReps = pastExercises.reduce((sum, ex) => sum + ex.reps, 0) / pastExercises.length;
  const avgWeight = pastExercises.reduce((sum, ex) => sum + ex.weight, 0) / pastExercises.length;
  
  return {
    sets: Math.round(avgSets),
    reps: Math.round(avgReps),
    weight: Math.round(avgWeight)
  };
}

function renderCurrentWorkout() {
  if (currentWorkoutExercises.length === 0) {
    currentWorkoutList.innerHTML = '<p class="empty-state">Add exercises to build a workout session.</p>';
    return;
  }

  currentWorkoutList.innerHTML = currentWorkoutExercises
    .map((exercise, index) => `
      <article class="exercise-item" data-index="${index}">
        <div class="exercise-summary">
          <strong>${exercise.name}</strong>
          <span>Sets: ${exercise.sets}</span>
          <span>Reps: ${exercise.reps}</span>
          <span>Weight: ${exercise.weight} lbs</span>
          ${exercise.notes ? `<p class="exercise-notes">Notes: ${exercise.notes}</p>` : ''}
        </div>
        <button type="button" class="exercise-delete" data-index="${index}">Remove</button>
      </article>
    `)
    .join('');
}

function renderWorkoutLog() {
  if (!workoutList) return;
  if (workouts.length === 0) {
    workoutList.innerHTML = '<p class="empty-state">No workouts logged yet.</p>';
    return;
  }

  workoutList.innerHTML = workouts
    .slice()
    .reverse()
    .map(session => `
      <article class="session-card">
        <div class="session-card-header">
          <div>
            <h3>${session.name}</h3>
            <p class="session-meta">${session.exercises.length} exercise${session.exercises.length === 1 ? '' : 's'} • ${new Date(session.timestamp).toLocaleString()}</p>
          </div>
          <button type="button" class="favorite-toggle ${session.favorite ? 'favorite-active' : ''}" data-session-id="${session.id}" aria-label="Toggle favorite">
            ${session.favorite ? '★' : '☆'}
          </button>
        </div>
        <div class="exercise-list">
          ${session.exercises
            .map(exercise => `
              <article class="exercise-item">
                <div class="exercise-summary">
                  <strong>${exercise.name}</strong>
                  <span>Sets: ${exercise.sets}</span>
                  <span>Reps: ${exercise.reps}</span>
                  <span>Weight: ${exercise.weight} lbs</span>
                  ${exercise.notes ? `<p class="exercise-notes">Notes: ${exercise.notes}</p>` : ''}
                </div>
                <div class="exercise-actions">
                  <button type="button" class="exercise-favorite ${exercise.favorite ? 'favorite-active' : ''}" data-session-id="${session.id}" data-exercise-id="${exercise.id}" aria-label="Toggle favorite">${exercise.favorite ? '★' : '☆'}</button>
                  <button type="button" class="exercise-delete" data-session-id="${session.id}" data-exercise-id="${exercise.id}">Delete</button>
                </div>
              </article>
            `)
            .join('')}
        </div>
      </article>
    `)
    .join('');
}

function addExerciseToCurrentWorkout() {
  const name = exerciseNameInput.value.trim();
  const sets = Number(document.getElementById('exercise-sets').value);
  const reps = Number(document.getElementById('exercise-reps').value);
  const weight = Number(document.getElementById('exercise-weight').value);
  const notes = document.getElementById('exercise-notes').value.trim();

  if (!name || sets < 1 || reps < 1 || weight < 0) {
    alert('Please fill in all fields with valid values. Name cannot be empty, sets and reps must be at least 1, and weight cannot be negative.');
    return;
  }

  currentWorkoutExercises.push({
    id: `exercise-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name,
    sets,
    reps,
    weight,
    notes,
    favorite: false
  });

  renderCurrentWorkout();
  exerciseNameInput.value = '';
  document.getElementById('exercise-notes').value = '';
  setSuggestionVisibility(false);
  document.getElementById('exercise-sets').value = 3;
  document.getElementById('exercise-reps').value = 8;
  document.getElementById('exercise-weight').value = 100;
}

function saveCurrentWorkout() {
  if (currentWorkoutExercises.length === 0) {
    alert('Add at least one exercise before saving the workout session.');
    return;
  }

  const name = workoutNameInput.value.trim();
  if (!name) {
    alert('Please name the workout before saving it.');
    return;
  }

  const session = {
    id: `session-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name,
    favorite: sessionFavoriteCheckbox.checked,
    timestamp: Date.now(),
    exercises: currentWorkoutExercises
  };

  workouts.push(session);
  saveWorkouts();
  renderWorkoutLog();

  currentWorkoutExercises = [];
  renderCurrentWorkout();
  alert('Workout session saved successfully!');
}

function clearCurrentWorkout() {
  currentWorkoutExercises = [];
  renderCurrentWorkout();
}

function toggleFavorite(sessionId) {
  workouts = workouts.map(session =>
    session.id === sessionId
      ? { ...session, favorite: !session.favorite }
      : session
  );
  saveWorkouts();
  renderWorkoutLog();
}

function toggleExerciseFavorite(sessionId, exerciseId) {
  workouts = workouts.map(session => {
    if (session.id !== sessionId) return session;
    const updatedExercises = session.exercises.map(ex =>
      ex.id === exerciseId
        ? { ...ex, favorite: !ex.favorite }
        : ex
    );
    return { ...session, exercises: updatedExercises };
  });
  saveWorkouts();
  renderWorkoutLog();
}

function deleteExercise(sessionId, exerciseId) {
  workouts = workouts
    .map(session => {
      if (session.id !== sessionId) return session;
      const updatedExercises = session.exercises.filter(ex => ex.id !== exerciseId);
      return { ...session, exercises: updatedExercises };
    })
    .filter(session => session.exercises.length > 0);

  saveWorkouts();
  renderWorkoutLog();
}

window.addEventListener('storage', event => {
  if (event.key === storageKey) {
    loadWorkouts();
    renderWorkoutLog();
  }
});

exerciseForm.addEventListener('submit', event => {
  event.preventDefault();
  addExerciseToCurrentWorkout();
});

exerciseNameInput.addEventListener('input', event => {
  updateSuggestions(event.target.value);
});

exerciseNameInput.addEventListener('blur', () => {
  const name = exerciseNameInput.value.trim();
  if (name && getAllExercises().some(ex => ex.name === name)) {
    const predicted = getPredictedValues(name);
    document.getElementById('exercise-sets').value = predicted.sets;
    document.getElementById('exercise-reps').value = predicted.reps;
    document.getElementById('exercise-weight').value = predicted.weight;
  }
});

suggestionsList.addEventListener('click', event => {
  if (!event.target.matches('.suggestion-item')) {
    return;
  }

  const selectedExercise = event.target.textContent;
  exerciseNameInput.value = selectedExercise;
  setSuggestionVisibility(false);
  exerciseNameInput.focus();

  const predicted = getPredictedValues(selectedExercise);
  document.getElementById('exercise-sets').value = predicted.sets;
  document.getElementById('exercise-reps').value = predicted.reps;
  document.getElementById('exercise-weight').value = predicted.weight;
});

document.addEventListener('click', event => {
  if (!event.target.closest('.autocomplete')) {
    setSuggestionVisibility(false);
  }

  if (event.target.matches('.favorite-toggle')) {
    const sessionId = event.target.dataset.sessionId;
    toggleFavorite(sessionId);
  }

  if (event.target.matches('.exercise-favorite')) {
    const sessionId = event.target.dataset.sessionId;
    const exerciseId = event.target.dataset.exerciseId;
    toggleExerciseFavorite(sessionId, exerciseId);
  }

  if (event.target.matches('.exercise-delete') && event.target.dataset.sessionId) {
    const sessionId = event.target.dataset.sessionId;
    const exerciseId = event.target.dataset.exerciseId;
    deleteExercise(sessionId, exerciseId);
  }

  if (event.target.matches('.exercise-delete') && event.target.dataset.index) {
    const index = Number(event.target.dataset.index);
    currentWorkoutExercises.splice(index, 1);
    renderCurrentWorkout();
  }
});

saveWorkoutButton.addEventListener('click', saveCurrentWorkout);
clearCurrentWorkoutButton.addEventListener('click', clearCurrentWorkout);
clearLogButton.addEventListener('click', () => {
  workouts = [];
  saveWorkouts();
  renderWorkoutLog();
});

loadWorkouts();
renderCurrentWorkout();
renderWorkoutLog();
