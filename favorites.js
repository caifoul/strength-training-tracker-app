const storageKey = 'strengthTrackerExercises';
const favoritesList = document.getElementById('favorites-list');
const clearFavoritesButton = document.getElementById('clear-favorites');

let workouts = [];

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
        weight: item.weight || 0
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

function renderFavorites() {
  if (!favoritesList) return;

  const favoriteWorkouts = workouts.filter(workout => workout.favorite);
  if (favoriteWorkouts.length === 0) {
    favoritesList.innerHTML = '<p class="empty-state">No favorite workouts yet.</p>';
    return;
  }

  favoritesList.innerHTML = favoriteWorkouts
    .slice()
    .reverse()
    .map(workout => `
      <article class="session-card">
        <div class="session-card-header">
          <div>
            <h3>${workout.name}</h3>
            <p class="session-meta">${workout.exercises.length} exercise${workout.exercises.length === 1 ? '' : 's'} • ${new Date(workout.timestamp).toLocaleString()}</p>
          </div>
          <button type="button" class="remove-favorite" data-session-id="${workout.id}">Unfavorite</button>
        </div>
        <div class="exercise-list">
          ${workout.exercises
            .map(exercise => `
              <div class="exercise-item">
                <div class="exercise-summary">
                  <strong>${exercise.name}</strong>
                  <span>Sets: ${exercise.sets}</span>
                  <span>Reps: ${exercise.reps}</span>
                  <span>Weight: ${exercise.weight} lbs</span>
                </div>
              </div>
            `)
            .join('')}
        </div>
      </article>
    `)
    .join('');
}

function setStorage(data) {
  try {
    localStorage.setItem(storageKey, JSON.stringify(data));
  } catch (e) {
    console.warn('Could not save favorites');
  }
}

function clearFavorites() {
  workouts = workouts.map(workout => ({ ...workout, favorite: false }));
  setStorage(workouts);
  renderFavorites();
}

clearFavoritesButton.addEventListener('click', clearFavorites);

window.addEventListener('storage', event => {
  if (event.key === storageKey) {
    loadWorkouts();
    renderFavorites();
  }
});

loadWorkouts();
renderFavorites();