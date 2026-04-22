const progressionList = document.getElementById('progression-list');
const inspirationalMessage = document.getElementById('inspirational-message');

const inspirationalQuotes = [
  "The only bad workout is the one that didn't happen.",
  "Strength does not come from physical capacity. It comes from an indomitable will.",
  "Push yourself, because no one else is going to do it for you.",
  "Your body can do it. It's your mind you have to convince.",
  "The pain you feel today will be the strength you feel tomorrow.",
  "Don't stop when you're tired. Stop when you're done.",
  "Success is the sum of small efforts, repeated day in and day out.",
  "Train like a beast, look like a beauty.",
  "Sweat is just fat crying.",
  "Believe you can and you're halfway there."
];

function getRandomQuote() {
  return inspirationalQuotes[Math.floor(Math.random() * inspirationalQuotes.length)];
}

function calculateProgression() {
  const sessions = JSON.parse(localStorage.getItem('strengthTrackerExercises') || '[]');
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
  calculateProgression();
  inspirationalMessage.textContent = getRandomQuote();
});