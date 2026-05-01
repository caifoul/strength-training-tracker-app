import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { collection, doc, setDoc, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const storageKey = 'strengthTrackerExercises';
let workouts = [];
let currentUser = null;

// ── Local data helpers ────────────────────────────────────────────
function loadWorkouts() {
  try {
    workouts = JSON.parse(localStorage.getItem(storageKey) || '[]');
    if (!Array.isArray(workouts)) workouts = [];
  } catch (_) { workouts = []; }
}

function saveWorkouts() {
  try { localStorage.setItem(storageKey, JSON.stringify(workouts)); } catch (_) {}
}

async function saveWorkoutToFirestore(session) {
  if (!currentUser) return;
  try {
    await setDoc(doc(db, 'users', currentUser.uid, 'workouts', session.id), session);
  } catch (e) { console.error('Firestore save failed:', e); }
}

async function loadWorkoutsFromFirestore(uid) {
  try {
    const snap = await getDocs(collection(db, 'users', uid, 'workouts'));
    const data = snap.docs.map(d => d.data());
    if (data.length) {
      workouts = data;
      saveWorkouts();
    } else {
      loadWorkouts();
    }
  } catch (_) { loadWorkouts(); }
}

// ── Coach state ───────────────────────────────────────────────────
let coachState = {
  currentWorkout: null,
  currentSession: null,
  currentExerciseIndex: 0,
  loggedExercises: new Set(),
  missedExercises: new Set(),
};

function showScreen(screenId) {
  document.querySelectorAll('.coach-screen').forEach(s => s.classList.add('hidden'));
  document.getElementById(screenId).classList.remove('hidden');
}

function getFavoriteWorkouts() {
  return workouts.filter(s => s.favorite);
}

function getLastExerciseLogForName(name) {
  for (let i = workouts.length - 1; i >= 0; i--) {
    for (const ex of (workouts[i].exercises || [])) {
      if (ex.name === name) return ex;
    }
  }
  return null;
}

function getSmartDefaults(exerciseName) {
  const last = getLastExerciseLogForName(exerciseName);
  if (last) return { sets: last.sets, reps: last.reps + 1, weight: last.weight };
  return { sets: 3, reps: 8, weight: 100 };
}

function renderFavoriteWorkouts() {
  const container = document.getElementById('favorite-workouts');
  const favorites = getFavoriteWorkouts();

  if (!favorites.length) {
    container.innerHTML = '<p class="empty-state">No favorite workouts yet. Create one in Log Workout first!</p>';
    return;
  }

  container.innerHTML = favorites.map(workout => `
    <div class="workout-card coach-workout-card">
      <h3>${workout.name}</h3>
      <p>${workout.exercises.length} exercise${workout.exercises.length === 1 ? '' : 's'}</p>
      <button type="button" class="btn-primary start-favorite-workout" data-session-id="${workout.id}">Start</button>
    </div>
  `).join('');
}

function startFavoriteWorkout(sessionId) {
  const template = workouts.find(w => w.id === sessionId);
  if (!template) return;

  coachState = {
    currentWorkout: template,
    currentSession: { workoutName: template.name, startTime: Date.now(), exercises: [] },
    currentExerciseIndex: 0,
    loggedExercises: new Set(),
    missedExercises: new Set(),
  };
  showExerciseSelection();
}

function createNewWorkout(workoutName) {
  coachState = {
    currentWorkout: { name: workoutName, exercises: [] },
    currentSession: { workoutName, startTime: Date.now(), exercises: [] },
    currentExerciseIndex: 0,
    loggedExercises: new Set(),
    missedExercises: new Set(),
  };
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

  if (!exercises.length) {
    container.innerHTML = '<p class="empty-state">No exercises in this workout.</p>';
    return;
  }

  container.innerHTML = exercises.map((exercise, index) => {
    const isLogged = coachState.loggedExercises.has(index);
    const isMissed = coachState.missedExercises.has(index);
    const status = isLogged ? '✓ Logged' : isMissed ? '◌ Skipped' : '';
    const cls    = isLogged ? 'logged' : isMissed ? 'missed' : '';

    return `
      <div class="exercise-selection-item ${cls}">
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

  updateProgress();
}

function updateProgress() {
  const total   = coachState.currentWorkout.exercises.length;
  const logged  = coachState.loggedExercises.size;
  const percent = total > 0 ? (logged / total) * 100 : 0;
  document.getElementById('progress-text').textContent = `${logged} of ${total} exercises logged`;
  document.getElementById('progress-fill').style.width = `${percent}%`;
}

function logExerciseForIndex(index) {
  const exercise = coachState.currentWorkout.exercises[index];
  if (!exercise) return;

  const isEditing = coachState.loggedExercises.has(index);
  const prev = isEditing
    ? coachState.currentSession.exercises.find(ex => ex.exerciseIndex === index)
    : null;

  const vals = prev
    ? { sets: prev.sets, reps: prev.reps, weight: prev.weight }
    : getSmartDefaults(exercise.name);

  document.getElementById('exercise-name-display').textContent = exercise.name;
  document.getElementById('log-sets').value   = vals.sets;
  document.getElementById('log-reps').value   = vals.reps;
  document.getElementById('log-weight').value = vals.weight;
  document.getElementById('log-notes').value  = prev ? (prev.notes || '') : '';
  document.getElementById('exercise-log-form').dataset.exerciseIndex = index;

  showScreen('log-exercise-screen');
}

function submitExerciseLog() {
  const form   = document.getElementById('exercise-log-form');
  const index  = parseInt(form.dataset.exerciseIndex);
  const sets   = parseInt(document.getElementById('log-sets').value);
  const reps   = parseInt(document.getElementById('log-reps').value);
  const weight = parseInt(document.getElementById('log-weight').value);

  if (!sets || !reps || weight < 0) {
    alert('Please fill in all fields correctly');
    return;
  }

  const exercise = coachState.currentWorkout.exercises[index];
  const notes    = document.getElementById('log-notes').value.trim();
  const entry    = { exerciseIndex: index, name: exercise.name, sets, reps, weight, notes, timestamp: Date.now() };

  const existingIdx = coachState.currentSession.exercises.findIndex(ex => ex.exerciseIndex === index);
  if (existingIdx !== -1) coachState.currentSession.exercises[existingIdx] = entry;
  else coachState.currentSession.exercises.push(entry);

  coachState.loggedExercises.add(index);
  coachState.missedExercises.delete(index);

  const total = coachState.currentWorkout.exercises.length;
  if (coachState.loggedExercises.size === total) showWorkoutComplete();
  else showExerciseSelection();
}

function skipExercise() {
  const index = parseInt(document.getElementById('exercise-log-form').dataset.exerciseIndex);
  coachState.missedExercises.add(index);
  const total = coachState.currentWorkout.exercises.length;
  if (coachState.loggedExercises.size === total) showWorkoutComplete();
  else showExerciseSelection();
}

function showWorkoutComplete() {
  showScreen('workout-complete-screen');
  const logged = coachState.loggedExercises.size;
  const total  = coachState.currentWorkout.exercises.length;
  const missed = coachState.missedExercises.size;

  let html = `<div class="summary-stats"><p><strong>${logged} of ${total}</strong> exercises completed</p>`;
  if (missed > 0) html += `<p><strong>${missed}</strong> exercises skipped</p>`;
  html += '</div>';
  document.getElementById('workout-summary').innerHTML = html;

  const missedSection = document.getElementById('missed-exercises');
  if (missed > 0) {
    missedSection.classList.remove('hidden');
    const exercises = coachState.currentWorkout.exercises;
    document.getElementById('missed-list').innerHTML = Array.from(coachState.missedExercises).map(i => `
      <div class="exercise-selection-item">
        <div class="exercise-selection-info">
          <strong>${exercises[i].name}</strong>
          <span>${exercises[i].sets}x${exercises[i].reps} @ ${exercises[i].weight} lbs</span>
        </div>
        <button type="button" class="secondary-button select-missed-exercise" data-index="${i}">Log</button>
      </div>
    `).join('');
  } else {
    missedSection.classList.add('hidden');
  }
}

function showAddExercisePanel() {
  const saveBtn = document.getElementById('add-and-save-btn');
  saveBtn.style.display = coachState.currentWorkout?.id ? '' : 'none';
  ['add-ex-name', 'add-ex-sets', 'add-ex-reps', 'add-ex-weight'].forEach(id => {
    const el = document.getElementById(id);
    el.value = id === 'add-ex-name' ? '' : id === 'add-ex-sets' ? '3' : id === 'add-ex-reps' ? '8' : '100';
  });
  document.getElementById('add-exercise-panel').classList.remove('hidden');
  document.getElementById('add-exercise-btn').classList.add('hidden');
  document.getElementById('add-ex-name').focus();
}

function hideAddExercisePanel() {
  document.getElementById('add-exercise-panel').classList.add('hidden');
  document.getElementById('add-exercise-btn').classList.remove('hidden');
}

function addMidSessionExercise(saveToWorkout) {
  const name   = document.getElementById('add-ex-name').value.trim();
  const sets   = parseInt(document.getElementById('add-ex-sets').value);
  const reps   = parseInt(document.getElementById('add-ex-reps').value);
  const weight = parseInt(document.getElementById('add-ex-weight').value);

  if (!name || !sets || !reps || weight < 0) {
    alert('Please fill in all fields correctly.');
    return;
  }

  const newEx = { name, sets, reps, weight };
  coachState.currentWorkout.exercises.push(newEx);

  if (saveToWorkout && coachState.currentWorkout.id) {
    const idx = workouts.findIndex(w => w.id === coachState.currentWorkout.id);
    if (idx !== -1) {
      workouts[idx].exercises.push({ ...newEx });
      saveWorkouts();
      saveWorkoutToFirestore(workouts[idx]);
    }
  }

  hideAddExercisePanel();
  renderExercisesSelection();
}

async function endWorkout() {
  const session = {
    id: `session-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: coachState.currentSession.workoutName,
    favorite: false,
    timestamp: coachState.currentSession.startTime,
    exercises: coachState.currentSession.exercises.map(ex => ({
      id: `exercise-${ex.timestamp}-${Math.random().toString(36).slice(2)}`,
      name: ex.name, sets: ex.sets, reps: ex.reps, weight: ex.weight,
      notes: ex.notes || '', favorite: false,
    })),
  };

  loadWorkouts();
  workouts.push(session);

  if (coachState.currentWorkout?.id) {
    const tIdx = workouts.findIndex(w => w.id === coachState.currentWorkout.id);
    if (tIdx !== -1) {
      workouts[tIdx].exercises = workouts[tIdx].exercises.map(tEx => {
        const completed = coachState.currentSession.exercises.find(l => l.name === tEx.name);
        return completed ? { ...tEx, sets: completed.sets, reps: completed.reps, weight: completed.weight } : tEx;
      });
    }
  }

  saveWorkouts();
  await saveWorkoutToFirestore(session);

  coachState = {
    currentWorkout: null, currentSession: null, currentExerciseIndex: 0,
    loggedExercises: new Set(), missedExercises: new Set(),
  };

  renderFavoriteWorkouts();
  showScreen('select-workout-screen');
  alert('Workout saved successfully!');
}

// ── Events ────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const repHint = document.querySelector('.rep-hint');
  if (repHint) {
    try {
      const profile = JSON.parse(localStorage.getItem('strengthTrackerProfile') || '{}');
      const range   = profile.preferredRepRange || profile.hypertrophy?.preferredRepRange;
      if (range) repHint.textContent = `Keep reps in your preferred range: ${range}`;
    } catch (_) {}
  }

  document.getElementById('favorite-workouts').addEventListener('click', e => {
    if (e.target.matches('.start-favorite-workout'))
      startFavoriteWorkout(e.target.dataset.sessionId);
  });

  document.getElementById('new-workout-form').addEventListener('submit', e => {
    e.preventDefault();
    const name = document.getElementById('new-workout-name').value.trim();
    if (name) { createNewWorkout(name); document.getElementById('new-workout-name').value = ''; }
  });

  document.getElementById('back-to-select').addEventListener('click', () => {
    coachState = { currentWorkout: null, currentSession: null, currentExerciseIndex: 0, loggedExercises: new Set(), missedExercises: new Set() };
    showScreen('select-workout-screen');
  });

  document.getElementById('exercises-list').addEventListener('click', e => {
    if (e.target.matches('.select-exercise'))
      logExerciseForIndex(parseInt(e.target.dataset.index));
  });

  document.getElementById('add-exercise-btn').addEventListener('click', showAddExercisePanel);
  document.getElementById('cancel-add-exercise-btn').addEventListener('click', hideAddExercisePanel);
  document.getElementById('add-session-only-btn').addEventListener('click', () => addMidSessionExercise(false));
  document.getElementById('add-and-save-btn').addEventListener('click', () => addMidSessionExercise(true));

  document.getElementById('exercise-log-form').addEventListener('submit', e => { e.preventDefault(); submitExerciseLog(); });
  document.getElementById('skip-exercise').addEventListener('click', skipExercise);
  document.getElementById('close-log').addEventListener('click', showExerciseSelection);

  document.getElementById('missed-list').addEventListener('click', e => {
    if (e.target.matches('.select-missed-exercise'))
      logExerciseForIndex(parseInt(e.target.dataset.index));
  });

  document.getElementById('go-back-button').addEventListener('click', showExerciseSelection);
  document.getElementById('end-workout-button').addEventListener('click', endWorkout);
});

// ── Auth ──────────────────────────────────────────────────────────
onAuthStateChanged(auth, async user => {
  currentUser = user;
  if (user) {
    await loadWorkoutsFromFirestore(user.uid);
    renderFavoriteWorkouts();
    showScreen('select-workout-screen');
  }
});
