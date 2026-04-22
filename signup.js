const signupSteps = document.querySelectorAll('#signup-steps .step');
const stepBack = document.getElementById('step-back');
const stepNext = document.getElementById('step-next');
const createAccountBtn = document.getElementById('create-account-btn');
const googleSignin = document.getElementById('google-signin');
const showSignin = document.getElementById('show-signin');
const signupSummary = document.getElementById('signup-summary');

let currentStep = 0;
let visibleSteps = [];

function getVisibleSteps() {
  const mainGoal = document.getElementById('main-goal')?.value;
  return Array.from(signupSteps).filter(step => {
    const goalFilter = step.dataset.goal;
    // Show if no goal filter, or if goal matches
    if (!goalFilter) return true;
    if (mainGoal === goalFilter) return true;
    return false;
  });
}

function getCurrentStepElement() {
  visibleSteps = getVisibleSteps();
  return visibleSteps[currentStep];
}

function getTotalVisibleSteps() {
  return getVisibleSteps().length;
}

function setStep(index) {
  visibleSteps = getVisibleSteps();
  currentStep = Math.min(Math.max(0, index), visibleSteps.length - 1);

  // Hide all steps
  signupSteps.forEach(step => step.classList.remove('active'));

  // Show current visible step
  const currentStepEl = getCurrentStepElement();
  if (currentStepEl) {
    currentStepEl.classList.add('active');
  }

  const total = getTotalVisibleSteps();
  stepBack.disabled = currentStep === 0;
  stepNext.textContent = currentStep === total - 1 ? 'Finish' : 'Next';

  signupSummary.classList.add('hidden');
}

function validateCurrentStep() {
  const step = getCurrentStepElement();
  if (!step) return true;

  const stepNum = parseInt(step.dataset.step);

  switch (stepNum) {
    case 1: // Age Range
      return document.getElementById('age-range').value !== '';
    case 2: // Gender
      return !!document.querySelector('input[name="gender"]:checked');
    case 3: // Main Goal
      return document.getElementById('main-goal').value !== '';
    case 4: // Other Goals (optional)
      return true;
    case 5: // Training Split
      return document.getElementById('training-split').value !== '';
    case 6: // Height & Weight (hypertrophy)
      const height = document.getElementById('height')?.value;
      const weight = document.getElementById('weight')?.value;
      return height && weight;
    case 7: // Daily Calories (hypertrophy)
      return document.getElementById('daily-calories')?.value !== '';
    case 8: // Lifting Experience (hypertrophy)
      return document.getElementById('lifting-experience')?.value !== '';
    case 9: // Preferred Reps (hypertrophy)
      const selectedValue = document.getElementById('preferred-reps').value;
      if (selectedValue === 'custom') {
        return document.getElementById('custom-rep-range').value.trim() !== '';
      }
      return selectedValue !== '';
    case 10: // Growth Rate (hypertrophy)
      return !!document.querySelector('input[name="growth-rate"]:checked');
    default:
      return true;
  }
}

function gatherProfile() {
  const profile = {
    ageRange: document.getElementById('age-range').value,
    gender: document.querySelector('input[name="gender"]:checked')?.value || 'Not specified',
    mainGoal: document.getElementById('main-goal').value,
    trainingSplit: document.getElementById('training-split').value,
    otherGoals: Array.from(document.querySelectorAll('input[name="other-goals"]:checked')).map(
      input => input.parentElement.textContent.trim()
    ),
  };

  // Add hypertrophy-specific fields if applicable
  if (profile.mainGoal === 'hypertrophy') {
    const selectedReps = document.getElementById('preferred-reps').value;
    const customReps = document.getElementById('custom-rep-range').value.trim();

    profile.hypertrophy = {
      height: document.getElementById('height')?.value,
      weight: document.getElementById('weight')?.value,
      dailyCalories: document.getElementById('daily-calories')?.value,
      liftingExperience: document.getElementById('lifting-experience')?.value,
      preferredRepRange: selectedReps === 'custom' ? customReps : selectedReps,
      growthRate: document.querySelector('input[name="growth-rate"]:checked')?.value || 'Not specified'
    };
  }

  return profile;
}

function showSummary() {
  const profile = gatherProfile();
  const savedProfile = { ...profile, createdAt: new Date().toISOString() };
  localStorage.setItem('strengthTrackerProfile', JSON.stringify(savedProfile));
  window.location.href = 'home.html';
}

createAccountBtn.addEventListener('click', () => {
  console.log('Create Account button clicked on signup page');
  setStep(1);
});

googleSignin.addEventListener('click', () => {
  localStorage.setItem('strengthTrackerAuth', JSON.stringify({ provider: 'google', signedInAt: new Date().toISOString() }));
  window.location.href = 'home.html';
});

showSignin.addEventListener('click', () => {
  window.location.href = 'signin.html';
});

// Listen for goal changes to update visible steps
document.getElementById('main-goal').addEventListener('change', () => {
  // When goal changes, reset to a reasonable step
  if (currentStep > 5) {
    setStep(5);
  } else {
    setStep(currentStep);
  }
});

// Handle custom rep range selection
document.getElementById('preferred-reps').addEventListener('change', (e) => {
  const customLabel = document.getElementById('custom-rep-label');
  const customInput = document.getElementById('custom-rep-range');
  
  if (e.target.value === 'custom') {
    customLabel.style.display = 'block';
    customInput.required = true;
  } else {
    customLabel.style.display = 'none';
    customInput.required = false;
    customInput.value = '';
  }
});

stepBack.addEventListener('click', () => {
  if (currentStep > 0) {
    setStep(currentStep - 1);
  }
});

stepNext.addEventListener('click', () => {
  console.log('Next button clicked, currentStep:', currentStep);
  // Special handling for welcome step (step 0)
  if (currentStep === 0) {
    console.log('On welcome step, going to step 1');
    setStep(1);
    return;
  }

  if (!validateCurrentStep()) {
    alert('Please complete the current step before continuing.');
    return;
  }

  const total = getTotalVisibleSteps();
  console.log('Total visible steps:', total, 'currentStep:', currentStep);
  if (currentStep === total - 1) {
    console.log('On last step, showing summary');
    showSummary();
    return;
  }

  console.log('Going to next step:', currentStep + 1);
  setStep(currentStep + 1);
});

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  console.log('DOM loaded, initializing signup');
  setStep(0);
  
  const startAtStep = localStorage.getItem('startAtStep');
  if (startAtStep) {
    localStorage.removeItem('startAtStep');
    setStep(parseInt(startAtStep));
  }
});
