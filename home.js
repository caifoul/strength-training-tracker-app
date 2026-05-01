import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';
const progressionList = document.getElementById('progression-list');
const inspirationalMessage = document.getElementById('inspirational-message');

const QUOTES = [
  { quote: "The last three or four reps is what makes the muscle grow. This area of pain divides a champion from someone who is not a champion.", author: "Arnold Schwarzenegger" },
  { quote: "The mind is the limit. As long as the mind can envision the fact that you can do something, you can do it.", author: "Arnold Schwarzenegger" },
  { quote: "I do it as a therapy. I do it as something that keeps me alive.", author: "Arnold Schwarzenegger" },
  { quote: "Everybody wants to be a bodybuilder, but nobody wants to lift no heavy-ass weights.", author: "Ronnie Coleman" },
  { quote: "Ain't nothin' but a peanut.", author: "Ronnie Coleman" },
  { quote: "When you hit failure, your workout has just begun.", author: "Ronnie Coleman" },
  { quote: "Pain is temporary. It may last a minute, or an hour, or a day, or a year, but eventually it will subside and something else will take its place. If I quit, however, it lasts forever.", author: "Lance Armstrong" },
  { quote: "There are no shortcuts. The fact that a shortcut is important to you means that the result is not.", author: "Frank Zane" },
  { quote: "The iron never lies to you. You can walk outside and listen to all kinds of talk, get told that you're a god or a total bastard. The iron will always kick you the real deal.", author: "Henry Rollins" },
  { quote: "To be a champion, you must act like a champion.", author: "Lou Ferrigno" },
  { quote: "There is no reason to be alive if you can't do the deadlift.", author: "Jon Pall Sigmarsson" },
  { quote: "Don't have $100 shoes and a 10 cent squat.", author: "Louie Simmons" },
  { quote: "The only way to define your limits is by going beyond them.", author: "Arthur Clarke" },
  { quote: "If you can imagine it, you can achieve it. If you can dream it, you can become it.", author: "William Arthur Ward" },
];

function calculateProgression(sessions) {
  const now = Date.now();
  const sevenDaysAgo    = now - 7  * 24 * 60 * 60 * 1000;
  const fourteenDaysAgo = now - 14 * 24 * 60 * 60 * 1000;

  const allExercises = sessions.flatMap(session =>
    (session.exercises || []).map(ex => ({
      ...ex,
      timestamp: ex.timestamp || session.timestamp || 0,
    }))
  );

  const thisWeek = allExercises.filter(ex => ex.timestamp >= sevenDaysAgo);
  const lastWeek = allExercises.filter(
    ex => ex.timestamp >= fourteenDaysAgo && ex.timestamp < sevenDaysAgo
  );

  if (!thisWeek.length) {
    progressionList.innerHTML = '<p>No workouts logged in the last 7 days.</p>';
    return;
  }

  const groupByName = list =>
    list.reduce((acc, ex) => {
      (acc[ex.name] = acc[ex.name] || []).push(ex);
      return acc;
    }, {});

  const thisMap = groupByName(thisWeek);
  const lastMap = groupByName(lastWeek);

  const rows = Object.entries(thisMap).map(([name, entries]) => {
    entries.sort((a, b) => a.timestamp - b.timestamp);
    const prevEntries = (lastMap[name] || []).sort((a, b) => a.timestamp - b.timestamp);

    const thisFirstW = Number(entries[0].weight) || 0;
    const thisLastW  = Number(entries[entries.length - 1].weight) || 0;
    const prevLastW  = prevEntries.length
      ? Number(prevEntries[prevEntries.length - 1].weight) || 0
      : 0;

    // Weight went up within this week (multiple sessions)
    if (entries.length > 1 && thisLastW > thisFirstW) {
      const diff = Math.round((thisLastW - thisFirstW) * 100) / 100;
      return { name, label: `+${diff} lbs`, cls: 'prog-weight' };
    }

    // Weight went up vs last week's last session
    if (prevLastW > 0 && thisLastW > prevLastW) {
      const diff = Math.round((thisLastW - prevLastW) * 100) / 100;
      return { name, label: `+${diff} lbs`, cls: 'prog-weight' };
    }

    // Rep delta vs previous week
    const thisReps = entries.reduce((s, e) => s + (Number(e.sets) || 0) * (Number(e.reps) || 0), 0);
    const prevReps = prevEntries.reduce((s, e) => s + (Number(e.sets) || 0) * (Number(e.reps) || 0), 0);

    if (!prevReps) {
      return { name, label: `${thisReps} reps`, cls: 'prog-new' };
    }
    const diff = thisReps - prevReps;
    return {
      name,
      label: diff >= 0 ? `+${diff} reps` : `${diff} reps`,
      cls: diff >= 0 ? 'prog-up' : 'prog-down',
    };
  });

  const order = { 'prog-weight': 0, 'prog-up': 1, 'prog-new': 2, 'prog-down': 3 };
  rows.sort((a, b) => (order[a.cls] ?? 4) - (order[b.cls] ?? 4));

  progressionList.innerHTML = `<ul class="prog-list">${
    rows.map(({ name, label, cls }) =>
      `<li class="prog-item"><span class="prog-name">${name}</span><span class="${cls}">${label}</span></li>`
    ).join('')
  }</ul>`;
}

document.addEventListener('DOMContentLoaded', () => {
  const { quote, author } = QUOTES[Math.floor(Math.random() * QUOTES.length)];
  inspirationalMessage.innerHTML = `"${quote}" <br><strong>— ${author}</strong>`;
});

function updateOverviewStats(sessions) {
  const totalExercises = sessions.reduce((n, s) => n + (s.exercises?.length || 0), 0);
  const latest = sessions.reduce((max, s) => Math.max(max, s.timestamp || 0), 0);
  const lastLabel = latest
    ? new Date(latest).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
    : '—';
  document.getElementById('stat-sessions').textContent = `${sessions.length} session${sessions.length !== 1 ? 's' : ''}`;
  document.getElementById('stat-exercises').textContent = `${totalExercises} exercise${totalExercises !== 1 ? 's' : ''}`;
  document.getElementById('stat-last').textContent = `last workout: ${lastLabel}`;
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    const snapshot = await getDocs(collection(db, 'users', user.uid, 'workouts'));
    const sessions = snapshot.docs.map(d => d.data());
    calculateProgression(sessions);
    updateOverviewStats(sessions);
  } else {
    progressionList.innerHTML = '<p>No workouts logged in the last 7 days.</p>';
  }
});
