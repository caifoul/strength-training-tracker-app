import { auth, db } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { collection, getDocs } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const progressionList = document.getElementById('progression-list');
const inspirationalMessage = document.getElementById('inspirational-message');

const inspirationalQuotes = [
  { quote: "The last three or four reps is what makes the muscle grow. This area of pain divides a champion from someone who is not a champion.", author: "Arnold Schwarzenegger" },
  { quote: "If you can imagine it, you can achieve it. If you can dream it, you can become it.", author: "Arnold Schwarzenegger" },
  { quote: "The mind is the limit. As long as the mind can envision the fact that you can do something, you can do it.", author: "Arnold Schwarzenegger" },
  { quote: "Everybody wants to be a bodybuilder, but nobody wants to lift no heavy-ass weights.", author: "Ronnie Coleman" },
  { quote: "Ain't nothin' but a peanut.", author: "Ronnie Coleman" },
  { quote: "Pain is temporary. It may last a minute, or an hour, or a day, or a year, but eventually it will subside and something else will take its place. If I quit, however, it lasts forever.", author: "Lance Armstrong" },
  { quote: "There are no shortcuts. The fact that a shortcut is important to you means that the result is not.", author: "Frank Zane" },
  { quote: "The iron never lies to you. You can walk outside and listen to all kinds of talk, get told that you're a god or a total bastard. The iron will always kick you the real deal.", author: "Henry Rollins" },
  { quote: "To be a champion, you must act like a champion.", author: "Lou Ferrigno" },
  { quote: "There is no reason to be alive if you can't do the deadlift.", author: "Jon Pall Sigmarsson" },
  { quote: "Don't have $100 shoes and a 10 cent squat.", author: "Louie Simmons" },
  { quote: "If a man achieves victory over this body, who in the world can stop him? It takes a lot of effort to defeat this body.", author: "Ayrton Senna" },
  { quote: "The only way to define your limits is by going beyond them.", author: "Arthur Clarke" },
  { quote: "When you hit failure, your workout has just begun.", author: "Ronnie Coleman" },
  { quote: "I do it as a therapy. I do it as something that keeps me alive.", author: "Arnold Schwarzenegger" },
];

function getRandomQuote() {
  return inspirationalQuotes[Math.floor(Math.random() * inspirationalQuotes.length)];
}

function calculateProgression(sessions) {
  const now = Date.now();
  const sevenDaysAgo = now - 7 * 24 * 60 * 60 * 1000;

  const recentExercises = sessions
    .flatMap(session => (session.exercises || []).map(exercise => ({
      ...exercise,
      timestamp: exercise.timestamp || session.timestamp || 0
    })))
    .filter(exercise => exercise.timestamp >= sevenDaysAgo);

  if (recentExercises.length === 0) {
    progressionList.innerHTML = '<p>No workouts logged in the last 7 days.</p>';
    return;
  }

  const liftCounts = {};
  recentExercises.forEach(exercise => {
    const totalReps = (exercise.sets || 0) * (exercise.reps || 0);
    liftCounts[exercise.name] = (liftCounts[exercise.name] || 0) + totalReps;
  });

  const notesText = recentExercises.map(exercise => exercise.notes || '').join(' ').toLowerCase();
  const positiveNotes = /better form|good form|strong(er)?|easier|felt good|improved|clean(er)?|solid|consistent|progress/.test(notesText);
  const negativeNotes = /bad form|poor form|tired|struggle|struggled|failed|pain|plateau|worse|weak|losing/.test(notesText);

  let contextMessage = 'Track your recent lifts and notes together for a complete picture of progress.';
  if (positiveNotes && !negativeNotes) {
    contextMessage = 'Your recent notes show improved form and steadier workouts, so you may still be progressing even when load varies.';
  } else if (negativeNotes) {
    contextMessage = 'Some notes suggest challenges in recent sessions; prioritize recovery and technique as you track gains.';
  }

  const topLifts = Object.entries(liftCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10);

  const listItems = topLifts.map(([name, reps]) => `<li><strong>${name}:</strong> ${reps} total reps</li>`).join('');
  progressionList.innerHTML = `
    <div class="progression-context"><p>${contextMessage}</p></div>
    <ul>${listItems}</ul>
  `;
}

document.addEventListener('DOMContentLoaded', () => {
  const { quote, author } = getRandomQuote();
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
