import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { collection, doc, setDoc, getDocs, deleteDoc, writeBatch } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const storageKey = 'strengthTrackerExercises';
const favoritesList = document.getElementById('favorites-list');
const clearFavoritesButton = document.getElementById('clear-favorites');

let workouts = [];
let currentUser = null;

async function loadWorkoutsFromFirestore(uid) {
  const snapshot = await getDocs(collection(db, 'users', uid, 'workouts'));
  return snapshot.docs.map(d => d.data());
}

async function updateWorkoutInFirestore(session) {
  if (!currentUser) return;
  await setDoc(doc(db, 'users', currentUser.uid, 'workouts', session.id), session);
}

async function deleteWorkoutFromFirestore(sessionId) {
  if (!currentUser) return;
  await deleteDoc(doc(db, 'users', currentUser.uid, 'workouts', sessionId));
}

function normalizeWorkouts(raw) {
  if (!Array.isArray(raw)) return [];
  if (raw.length === 0) return [];
  if (raw[0] && Array.isArray(raw[0].exercises)) return raw;
  return raw.map(item => ({
    id: `session-${item.timestamp || Date.now()}-${Math.random().toString(36).slice(2)}`,
    name: item.name ? `${item.name} Workout` : 'Workout Session',
    timestamp: item.timestamp || Date.now(),
    favorite: !!item.favorite,
    exercises: [{
      id: `exercise-${item.timestamp || Date.now()}-${Math.random().toString(36).slice(2)}`,
      name: item.name || 'Exercise',
      sets: item.sets || 1,
      reps: item.reps || 1,
      weight: item.weight || 0,
    }],
  }));
}

function setStorage(data) {
  try { localStorage.setItem(storageKey, JSON.stringify(data)); } catch (_) {}
}

// ── Render ────────────────────────────────────────────────────────
function renderFavorites() {
  if (!favoritesList) return;

  if (!workouts.length) {
    favoritesList.innerHTML = '<p class="empty-state">No workouts saved yet. Go to <a href="index.html">Log Workout</a> to create one.</p>';
    return;
  }

  const sorted = workouts.slice().sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

  favoritesList.innerHTML = sorted.map(workout => `
    <article class="session-card" data-workout-id="${workout.id}">
      <div class="session-card-header">
        <div>
          <h3>${workout.name}</h3>
          <p class="session-meta">${workout.exercises.length} exercise${workout.exercises.length === 1 ? '' : 's'} • ${new Date(workout.timestamp).toLocaleString()}</p>
        </div>
        <div class="fav-card-actions">
          <button type="button"
            class="favorite-toggle ${workout.favorite ? 'favorite-active' : ''}"
            data-action="star"
            data-session-id="${workout.id}"
            title="${workout.favorite ? 'Remove from Coach' : 'Star to use in Coach'}">
            ${workout.favorite ? '★' : '☆'}
          </button>
          <button type="button" class="fav-rename-btn" data-action="rename" data-session-id="${workout.id}">Rename</button>
          <button type="button" class="fav-rename-btn" data-action="edit" data-session-id="${workout.id}">Edit</button>
          <button type="button" class="fav-delete-btn" data-action="delete" data-session-id="${workout.id}">Delete</button>
        </div>
      </div>
      <div class="exercise-list">
        ${workout.exercises.map(ex => `
          <div class="exercise-item">
            <div class="exercise-summary">
              <strong>${ex.name}</strong>
              <span>Sets: ${ex.sets}</span>
              <span>Reps: ${ex.reps}</span>
              <span>Weight: ${ex.weight} lbs</span>
            </div>
          </div>
        `).join('')}
      </div>
    </article>
  `).join('');
}

// ── Edit panel ────────────────────────────────────────────────────
function buildExerciseRow(ex) {
  const div = document.createElement('div');
  div.className = 'fav-edit-row';
  div.innerHTML = `
    <input class="fav-edit-name" type="text" value="${ex?.name || ''}" placeholder="Exercise name" />
    <label>Sets<input class="fav-edit-sets" type="number" min="1" value="${ex?.sets ?? 3}" /></label>
    <label>Reps<input class="fav-edit-reps" type="number" min="1" value="${ex?.reps ?? 8}" /></label>
    <label>Weight<input class="fav-edit-weight" type="number" min="0" value="${ex?.weight ?? 100}" /></label>
    <button type="button" class="fav-delete-ex-btn" data-action="remove-ex" title="Remove exercise">✕</button>
  `;
  return div;
}

function openEditPanel(sessionId) {
  const article = favoritesList.querySelector(`[data-workout-id="${sessionId}"]`);
  if (!article) return;

  // Toggle off if already open
  const existing = article.querySelector('.fav-edit-panel');
  if (existing) { existing.remove(); return; }

  // Close any other open panel
  favoritesList.querySelectorAll('.fav-edit-panel').forEach(p => p.remove());

  const workout = workouts.find(w => w.id === sessionId);
  if (!workout) return;

  const panel = document.createElement('div');
  panel.className = 'fav-edit-panel';

  const exContainer = document.createElement('div');
  exContainer.className = 'fav-edit-exercises';
  workout.exercises.forEach(ex => exContainer.appendChild(buildExerciseRow(ex)));

  const footer = document.createElement('div');
  footer.className = 'fav-edit-footer';
  footer.innerHTML = `
    <button type="button" class="secondary-button" data-action="add-ex" data-session-id="${sessionId}">+ Add Exercise</button>
    <div class="fav-edit-actions">
      <button type="button" class="btn-primary" data-action="save-edit" data-session-id="${sessionId}">Save Changes</button>
      <button type="button" class="secondary-button" data-action="cancel-edit">Cancel</button>
    </div>
  `;

  panel.appendChild(exContainer);
  panel.appendChild(footer);
  article.appendChild(panel);
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function readEditPanel(panel) {
  return Array.from(panel.querySelectorAll('.fav-edit-row')).map(row => ({
    name:   row.querySelector('.fav-edit-name').value.trim(),
    sets:   parseInt(row.querySelector('.fav-edit-sets').value)   || 1,
    reps:   parseInt(row.querySelector('.fav-edit-reps').value)   || 1,
    weight: parseFloat(row.querySelector('.fav-edit-weight').value) || 0,
  })).filter(ex => ex.name);
}

async function saveEdit(sessionId) {
  const panel = favoritesList.querySelector(`[data-workout-id="${sessionId}"] .fav-edit-panel`);
  if (!panel) return;

  const exercises = readEditPanel(panel);
  if (!exercises.length) { alert('Add at least one exercise.'); return; }

  const original = workouts.find(w => w.id === sessionId);
  workouts = workouts.map(w => {
    if (w.id !== sessionId) return w;
    return {
      ...w,
      exercises: exercises.map((ex, i) => ({
        id: original.exercises[i]?.id || `exercise-${Date.now()}-${i}-${Math.random().toString(36).slice(2)}`,
        name:     ex.name,
        sets:     ex.sets,
        reps:     ex.reps,
        weight:   ex.weight,
        notes:    original.exercises[i]?.notes    || '',
        favorite: original.exercises[i]?.favorite || false,
      })),
    };
  });

  setStorage(workouts);
  const updated = workouts.find(w => w.id === sessionId);
  if (updated) await updateWorkoutInFirestore(updated);
  renderFavorites();
}

// ── Actions ───────────────────────────────────────────────────────
async function toggleStar(sessionId) {
  workouts = workouts.map(w => w.id === sessionId ? { ...w, favorite: !w.favorite } : w);
  setStorage(workouts);
  renderFavorites();
  const updated = workouts.find(w => w.id === sessionId);
  if (updated) await updateWorkoutInFirestore(updated);
}

async function renameWorkout(sessionId) {
  const workout = workouts.find(w => w.id === sessionId);
  if (!workout) return;
  const newName = prompt('Rename workout:', workout.name);
  if (!newName || newName.trim() === workout.name) return;
  workouts = workouts.map(w => w.id === sessionId ? { ...w, name: newName.trim() } : w);
  setStorage(workouts);
  renderFavorites();
  const updated = workouts.find(w => w.id === sessionId);
  if (updated) await updateWorkoutInFirestore(updated);
}

async function deleteWorkout(sessionId) {
  if (!confirm('Delete this workout? This cannot be undone.')) return;
  workouts = workouts.filter(w => w.id !== sessionId);
  setStorage(workouts);
  renderFavorites();
  await deleteWorkoutFromFirestore(sessionId);
}

async function unstarAll() {
  const hadFavorites = workouts.some(w => w.favorite);
  if (!hadFavorites) return;
  workouts = workouts.map(w => ({ ...w, favorite: false }));
  setStorage(workouts);
  renderFavorites();
  if (currentUser) {
    const batch = writeBatch(db);
    workouts.forEach(w => batch.set(doc(db, 'users', currentUser.uid, 'workouts', w.id), w));
    await batch.commit();
  }
}

// ── Events ────────────────────────────────────────────────────────
favoritesList.addEventListener('click', async e => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const { action, sessionId } = btn.dataset;

  if (action === 'star')        { await toggleStar(sessionId); return; }
  if (action === 'rename')      { await renameWorkout(sessionId); return; }
  if (action === 'delete')      { await deleteWorkout(sessionId); return; }
  if (action === 'edit')        { openEditPanel(sessionId); return; }
  if (action === 'save-edit')   { await saveEdit(sessionId); return; }
  if (action === 'cancel-edit') { btn.closest('.fav-edit-panel').remove(); return; }
  if (action === 'remove-ex')   { btn.closest('.fav-edit-row').remove(); return; }
  if (action === 'add-ex') {
    const container = btn.closest('.fav-edit-panel').querySelector('.fav-edit-exercises');
    const row = buildExerciseRow(null);
    container.appendChild(row);
    row.querySelector('.fav-edit-name').focus();
    return;
  }
});

clearFavoritesButton.addEventListener('click', unstarAll);

window.addEventListener('storage', event => {
  if (event.key === storageKey) {
    try { workouts = normalizeWorkouts(JSON.parse(localStorage.getItem(storageKey) || '[]')); }
    catch (_) { workouts = []; }
    renderFavorites();
  }
});

onAuthStateChanged(auth, async user => {
  currentUser = user;
  if (user) {
    try {
      const firestoreWorkouts = await loadWorkoutsFromFirestore(user.uid);
      if (firestoreWorkouts.length > 0) {
        workouts = normalizeWorkouts(firestoreWorkouts);
        setStorage(workouts);
      } else {
        try { workouts = normalizeWorkouts(JSON.parse(localStorage.getItem(storageKey) || '[]')); }
        catch (_) { workouts = []; }
      }
    } catch (_) {
      try { workouts = normalizeWorkouts(JSON.parse(localStorage.getItem(storageKey) || '[]')); }
      catch (__) { workouts = []; }
    }
  } else {
    try { workouts = normalizeWorkouts(JSON.parse(localStorage.getItem(storageKey) || '[]')); }
    catch (_) { workouts = []; }
  }
  renderFavorites();
});
