const exerciseCorrections = {
  'casble rows': 'Cable Rows',
  'cable row': 'Cable Rows',
  'cable rows': 'Cable Rows',
  'benchpress': 'Bench Press',
  'bench press': 'Bench Press',
  'squats': 'Back Squat',
  'squat': 'Back Squat',
  'deadlift': 'Deadlift',
  'pullup': 'Pull-Up',
  'pull up': 'Pull-Up',
  'pullups': 'Pull-Up',
  'pushup': 'Push-Up',
  'push up': 'Push-Up',
  'pushups': 'Push-Up',
  'bicep curl': 'Bicep Curl',
  'bicep curls': 'Bicep Curl',
  'tricep dip': 'Tricep Dip',
  'tricep dips': 'Tricep Dip',
  'shoulder press': 'Overhead Press',
  'overheadpress': 'Overhead Press',
  'lat pulldown': 'Lat Pulldown',
  'latpulldown': 'Lat Pulldown',
  'leg press': 'Leg Press',
  'legpress': 'Leg Press',
  'lunges': 'Walking Lunge',
  'lunge': 'Walking Lunge',
  'dips': 'Bench Dip',
  'dip': 'Bench Dip',
  'rows': 'Barbell Row',
  'row': 'Barbell Row',
  'curls': 'Bicep Curl',
  'curl': 'Bicep Curl',
  'flies': 'Chest Fly',
  'fly': 'Chest Fly',
  'flyes': 'Chest Fly',
  'raises': 'Lateral Raise',
  'raise': 'Lateral Raise',
  // Add more as needed
};

function titleCase(name) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(' ');
}

function correctExerciseName(name) {
  const normalized = name.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, ' ').trim();
  if (!normalized) return name;
  return exerciseCorrections[normalized] || titleCase(normalized);
}

const storageKey = 'strengthTrackerExercises';
let workouts = [];
let currentBuildingWorkout = []; // Track exercises being added before saving

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

try {
  const rawData = JSON.parse(localStorage.getItem(storageKey) || '[]');
  workouts = normalizeWorkouts(rawData);
} catch (e) {
  console.warn('localStorage not available, using in-memory log');
}

const chatMessages = document.getElementById('chat-messages');
const chatLogList = document.getElementById('chat-log-list');
const chatInput = document.getElementById('chat-input');
const sendButton = document.getElementById('send-button');
const voiceInputBtn = document.getElementById('voice-input-btn');
const voiceOutputBtn = document.getElementById('voice-output-btn');
const currentBuildingWorkoutList = document.getElementById('current-building-workout');
const clearBuildingButton = document.getElementById('clear-building-workout');

console.log('Chatbot script loaded');
console.log('DOM elements found:', {
  chatMessages: !!chatMessages,
  chatLogList: !!chatLogList,
  chatInput: !!chatInput,
  sendButton: !!sendButton,
  voiceInputBtn: !!voiceInputBtn,
  voiceOutputBtn: !!voiceOutputBtn,
  currentBuildingWorkoutList: !!currentBuildingWorkoutList
});

renderChatbotWorkoutLog();
renderCurrentBuildingWorkout();

window.addEventListener('storage', event => {
  if (event.key === storageKey) {
    workouts = normalizeWorkouts(JSON.parse(event.newValue || '[]'));
    renderChatbotWorkoutLog();
  }
});

// Speech recognition
let recognition;
if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  recognition = new SpeechRecognition();
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.lang = 'en-US';

  recognition.onresult = (event) => {
    const transcript = event.results[0][0].transcript;
    chatInput.value = transcript;
    sendButton.click();
  };

  recognition.onerror = (event) => {
    console.error('Speech recognition error:', event.error);
    addMessage('Sorry, I couldn\'t hear you. Please try again.', true);
  };
}

// Speech synthesis
const synth = window.speechSynthesis;

function speak(text) {
  if (synth) {
    const utterance = new SpeechSynthesisUtterance(text);
    synth.speak(utterance);
  }
}

function renderCurrentBuildingWorkout() {
  if (!currentBuildingWorkoutList) return;

  if (currentBuildingWorkout.length === 0) {
    currentBuildingWorkoutList.innerHTML = '<p class="empty-state">Start adding exercises to your workout.</p>';
    if (clearBuildingButton) clearBuildingButton.style.display = 'none';
    return;
  }

  currentBuildingWorkoutList.innerHTML = currentBuildingWorkout
    .map((exercise, index) => `
      <article class="exercise-item" data-index="${index}">
        <div class="exercise-summary">
          <strong>${exercise.name}</strong>
          <span>Sets: ${exercise.sets}</span>
          <span>Reps: ${exercise.reps}</span>
          <span>Weight: ${exercise.weight} lbs</span>
        </div>
        <button type="button" class="exercise-delete" data-index="${index}">Remove</button>
      </article>
    `)
    .join('');
  
  if (clearBuildingButton) clearBuildingButton.style.display = 'block';
}

function parseMultipleExercises(message) {
  const lower = message.toLowerCase();
  const workoutKeywords = ['did', 'completed', 'finished', 'logged', 'add', 'log', 'worked', 'trained'];
  
  const hasIntent = workoutKeywords.some(kw => lower.includes(kw));
  if (!hasIntent) return [];

  // Split by 'and' or commas to get potential multiple exercises
  const parts = message.split(/,|\band\b/).map(p => p.trim());
  const exercises = [];

  for (const part of parts) {
    const exercise = parseAddExercise(part);
    if (exercise) {
      exercises.push(exercise);
    }
  }

  return exercises;
}

function renderChatbotWorkoutLog() {
  if (!chatLogList) return;

  // Filter out the temporary building workout from display
  const savedWorkouts = workouts.filter(w => w.name !== 'Chatbot Building Workout');

  if (savedWorkouts.length === 0) {
    chatLogList.innerHTML = '<p class="empty-state">No workouts logged yet.</p>';
    return;
  }

  chatLogList.innerHTML = savedWorkouts
    .slice()
    .reverse()
    .map(workout => `
      <article class="session-card">
        <div class="session-card-header">
          <div>
            <h3>${workout.name}</h3>
            <p class="session-meta">${workout.exercises.length} exercise${workout.exercises.length === 1 ? '' : 's'} • ${new Date(workout.timestamp).toLocaleString()}</p>
          </div>
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

function saveWorkouts() {
  try {
    localStorage.setItem(storageKey, JSON.stringify(workouts));
  } catch (e) {
    console.warn('Could not save workouts');
  }
  renderChatbotWorkoutLog();
}

function addMessage(text, isBot = false) {
  console.log('addMessage called with:', text, 'isBot:', isBot);
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${isBot ? 'bot-message' : 'user-message'}`;
  messageDiv.innerHTML = `${isBot ? 'Bot' : 'You'}: ${text}`;
  console.log('Appending message to chatMessages');
  chatMessages.appendChild(messageDiv);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  console.log('Message added successfully');
}

function parseAddExercise(message) {
  console.log('parseAddExercise called with:', message);
  // More flexible parsing for natural language
  const lower = message.toLowerCase();
  
  // Check for workout logging intent
  const workoutKeywords = ['did', 'completed', 'finished', 'logged', 'add', 'log', 'worked', 'trained'];
  let intentIndex = -1;
  for (let i = 0; i < workoutKeywords.length; i++) {
    const idx = lower.indexOf(workoutKeywords[i]);
    if (idx !== -1) {
      intentIndex = idx;
      console.log('Found intent keyword:', workoutKeywords[i], 'at index:', idx);
      break;
    }
  }
  
  if (intentIndex === -1) {
    console.log('No intent found, returning null');
    return null;
  }

  const words = message.split(/\s+/);
  let exercise = '';
  let sets = 1; // Default sets
  let reps = 7; // Default reps
  let weight = 100;

  // Find the word after the intent
  let startIndex = 0;
  for (let i = 0; i < words.length; i++) {
    if (workoutKeywords.some(kw => words[i].toLowerCase().includes(kw))) {
      startIndex = i + 1;
      break;
    }
  }

  // Now parse from startIndex
  for (let i = startIndex; i < words.length; i++) {
    const word = words[i].toLowerCase();
    const num = parseInt(words[i]);
    
    // Skip common words and prepositions
    if (['i', 'did', 'completed', 'finished', 'logged', 'add', 'log', 'worked', 'trained', 'on', 'with', 'at', 'for', 'of', 'a', 'an', 'the', 'my', 'some', 'to', 'it', 'tell', 'please', 'can', 'you'].includes(word)) {
      continue;
    }
    
    // If it's a number, check context
    if (!isNaN(num)) {
      const prev = words[i-1] ? words[i-1].toLowerCase() : '';
      const next = words[i+1] ? words[i+1].toLowerCase() : '';
      
      if (prev.includes('set') || next.includes('set')) {
        sets = num;
      } else if (prev.includes('rep') || next.includes('rep') || next.includes('time')) {
        reps = num;
      } else if (next.includes('lb') || next.includes('kg') || next.includes('pound') || prev.includes('at') || prev.includes('with')) {
        weight = num;
      } else if (!exercise.trim()) {
        // If no exercise yet, this might be reps
        reps = num;
      }
      continue;
    }
    
    // If it looks like an exercise (not a unit or common word)
    if (!['sets', 'set', 'reps', 'rep', 'lbs', 'lb', 'kg', 'kgs', 'pounds', 'times', 'time'].includes(word)) {
      exercise += words[i] + ' ';
    }
  }

  exercise = exercise.trim();
  exercise = correctExerciseName(exercise);

  console.log('Final parsed data:', { exercise, sets, reps, weight });

  // If we found an exercise, return the data
  if (exercise && exercise.length > 1) { // At least 2 characters to avoid false positives
    console.log('Returning exercise data');
    return { name: exercise, sets, reps, weight };
  }
  console.log('No valid exercise found, returning null');
  return null;
}

function getResponse(message) {
  console.log('getResponse called with:', message);
  const lower = message.toLowerCase();

  // Check for save/done commands
  if (lower.includes('save') || lower.includes('done') || lower.includes('finish')) {
    if (currentBuildingWorkout.length > 0) {
      const now = Date.now();
      workouts.push({
        id: `session-${now}-${Math.random().toString(36).slice(2)}`,
        name: 'Chatbot Workout',
        timestamp: now,
        favorite: false,
        exercises: currentBuildingWorkout.map(ex => ({
          id: `exercise-${now}-${Math.random().toString(36).slice(2)}`,
          ...ex
        }))
      });
      saveWorkouts();
      const count = currentBuildingWorkout.length;
      const response = `Perfect! Saved your workout with ${count} exercise${count === 1 ? '' : 's'}. Keep crushing it! 💪`;
      currentBuildingWorkout = [];
      renderCurrentBuildingWorkout();
      renderChatbotWorkoutLog();
      return response;
    }
    return 'No exercises in your current workout. Add some exercises first!';
  }

  // Check for clear command
  if (lower.includes('clear') || (lower.includes('start') && lower.includes('over'))) {
    if (currentBuildingWorkout.length > 0) {
      currentBuildingWorkout = [];
      renderCurrentBuildingWorkout();
      return 'Cleared your current workout. Let\'s start fresh!';
    }
    return 'No exercises to clear.';
  }

  // Check for add exercises (multiple or single)
  console.log('Checking for exercise logging');
  const exercises = parseMultipleExercises(message);
  console.log('parseMultipleExercises result:', exercises);
  if (exercises.length > 0) {
    console.log('Adding exercises:', exercises);
    currentBuildingWorkout.push(...exercises);
    renderCurrentBuildingWorkout();
    
    const summary = exercises.map(ex => `${ex.name} (${ex.sets}×${ex.reps} @ ${ex.weight}lbs)`).join(', ');
    const response = exercises.length === 1
      ? `Got it! Added: ${exercises[0].name} - ${exercises[0].sets} sets × ${exercises[0].reps} reps @ ${exercises[0].weight} lbs. Add more or say "save workout" when done!`
      : `Great! Added ${exercises.length} exercises: ${summary}. Add more or say "save workout" when done!`;
    
    return response;
  }

  // Predefined responses
  if (lower.includes('chest') && lower.includes('exercise')) {
    return 'Some great chest exercises include Bench Press, Incline Dumbbell Press, Push-Ups, and Chest Flyes. What would you like to know more about?';
  }
  if (lower.includes('back') && lower.includes('exercise')) {
    return 'For back, try Pull-Ups, Deadlifts, Bent-Over Rows, and Lat Pulldowns. Focus on proper form!';
  }
  if (lower.includes('leg') && lower.includes('exercise')) {
    return 'Leg exercises: Squats, Lunges, Leg Press, and Calf Raises. Don\'t forget to warm up!';
  }
  if (lower.includes('shoulder') && lower.includes('exercise')) {
    return 'Shoulder workouts: Overhead Press, Lateral Raises, Front Raises, and Shrugs.';
  }
  if (lower.includes('bicep') || lower.includes('arm')) {
    return 'For arms: Bicep Curls, Tricep Dips, Hammer Curls, and Pushdowns.';
  }
  if (lower.includes('how') && lower.includes('much') && lower.includes('weight')) {
    return 'Start with a weight you can do for 8-12 reps with good form. Increase gradually as you get stronger!';
  }
  if (lower.includes('rest') || lower.includes('recovery')) {
    return 'Rest 1-2 minutes between sets for strength training. Get 7-9 hours of sleep and eat protein-rich foods for recovery.';
  }
  if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey')) {
    return 'Hey there! Ready to crush some workouts? Tell me what you did today!';
  }
  if (lower.includes('thank')) {
    return 'You\'re welcome! Keep up the amazing work! 💪';
  }
  if (lower.includes('how are you') || lower.includes('what\'s up')) {
    return 'I\'m doing great, thanks! Excited to help you with your fitness journey. What exercises did you do today?';
  }
  if (lower.includes('good') && (lower.includes('morning') || lower.includes('afternoon') || lower.includes('evening'))) {
    return 'Good ' + (lower.includes('morning') ? 'morning' : lower.includes('afternoon') ? 'afternoon' : 'evening') + '! Ready for an awesome workout?';
  }

  return `I received your message. I'm here to help with logging exercises and answering fitness questions. Try telling me about your workout like "I did bench press 3 sets of 10" or ask about exercises! What would you like to know?`;
}

function sendMessage() {
  console.log('sendMessage called');
  const message = chatInput.value.trim();
  console.log('Message:', message);
  if (!message) {
    console.log('Empty message, returning');
    return;
  }

  console.log('Adding user message');
  addMessage(message, false);
  chatInput.value = '';

  console.log('Getting response');
  const response = getResponse(message);
  console.log('Response:', response);
  
  console.log('Adding bot message');
  addMessage(response, true);
  if (!response.includes('Logged')) {
    console.log('Speaking response');
    speak(response);
  }
}

sendButton.addEventListener('click', () => {
  console.log('Send button clicked');
  sendMessage();
});

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    console.log('Enter key pressed');
    e.preventDefault();
    sendMessage();
  }
});

voiceInputBtn.addEventListener('click', () => {
  if (recognition) {
    recognition.start();
    addMessage('Listening... Speak now!', true);
  } else {
    addMessage('Voice input is not supported in your browser.', true);
  }
});

voiceOutputBtn.addEventListener('click', () => {
  const lastBotMessage = [...chatMessages.querySelectorAll('.bot-message')].pop();
  if (lastBotMessage) {
    const text = lastBotMessage.textContent.replace('Bot: ', '');
    speak(text);
  } else {
    speak('No messages to read aloud.');
  }
});

currentBuildingWorkoutList.addEventListener('click', event => {
  const removeButton = event.target.closest('.exercise-delete');
  if (!removeButton) return;
  const index = Number(removeButton.dataset.index);
  currentBuildingWorkout.splice(index, 1);
  renderCurrentBuildingWorkout();
});

clearBuildingButton.addEventListener('click', () => {
  currentBuildingWorkout = [];
  renderCurrentBuildingWorkout();
  addMessage('Cleared your current workout. Ready to start fresh!', true);
});
