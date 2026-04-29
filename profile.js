import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, signOut } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { doc, getDoc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const accountInfo = document.getElementById('account-info');
const profileInfo = document.getElementById('profile-info');
const hypertrophySection = document.getElementById('hypertrophy-section');
const hypertrophyInfo = document.getElementById('hypertrophy-info');
const editModal = document.getElementById('edit-modal');
const editForm = document.getElementById('edit-form');
const editFormFields = document.getElementById('edit-form-fields');
const editModalTitle = document.getElementById('edit-modal-title');
const editAccountBtn = document.getElementById('edit-account-btn');
const editProfileBtn = document.getElementById('edit-profile-btn');
const editHypertrophyBtn = document.getElementById('edit-hypertrophy-btn');
const closeModalBtn = document.getElementById('close-modal');
const cancelEditBtn = document.getElementById('cancel-edit');
const signOutBtn = document.getElementById('sign-out-btn');

let currentEditMode = null;
let currentUser = null;

function formatValue(key, value) {
  if (!value) return 'Not set';
  if (Array.isArray(value)) return value.join(', ') || 'None';
  if (key === 'dailyCalories') return `${value} cal/day`;
  if (key === 'height') return `${value}"`;
  if (key === 'weight') return `${value} lbs`;
  return value;
}

function closeModal() {
  editModal.classList.add('hidden');
  currentEditMode = null;
}

function renderProfile() {
  const account = JSON.parse(localStorage.getItem('strengthTrackerAccount') || '{}');
  const profile = JSON.parse(localStorage.getItem('strengthTrackerProfile') || '{}');

  if (account.provider === 'google') {
    accountInfo.innerHTML = `
      <ul>
        <li><strong>Provider:</strong> Google</li>
        <li><strong>Email:</strong> ${account.email || 'Not set'}</li>
        <li><strong>Created:</strong> ${account.createdAt ? new Date(account.createdAt).toLocaleDateString() : 'Not set'}</li>
      </ul>`;
  } else {
    accountInfo.innerHTML = `
      <ul>
        <li><strong>Email:</strong> ${account.email || 'Not set'}</li>
        <li><strong>Username:</strong> ${account.username || 'Not set'}</li>
        <li><strong>Created:</strong> ${account.createdAt ? new Date(account.createdAt).toLocaleDateString() : 'Not set'}</li>
      </ul>`;
  }

  const baseFields = [
    { key: 'ageRange', label: 'Age Range' },
    { key: 'gender', label: 'Gender' },
    { key: 'mainGoal', label: 'Main Goal' },
    { key: 'trainingSplit', label: 'Training Split' },
  ];

  let profileHtml = '<ul>';
  baseFields.forEach(({ key, label }) => {
    profileHtml += `<li><strong>${label}:</strong> ${profile[key] || 'Not set'}</li>`;
  });
  profileHtml += `<li><strong>Other Goals:</strong> ${profile.otherGoals?.length ? profile.otherGoals.join(', ') : 'None'}</li>`;
  if (profile.createdAt) {
    profileHtml += `<li><strong>Profile Created:</strong> ${new Date(profile.createdAt).toLocaleDateString()}</li>`;
  }
  profileHtml += '</ul>';
  profileInfo.innerHTML = profileHtml;

  if (profile.mainGoal === 'hypertrophy' && profile.hypertrophy) {
    hypertrophySection.style.display = 'block';
    const hypertrophyFields = [
      { key: 'height', label: 'Height' },
      { key: 'weight', label: 'Weight' },
      { key: 'dailyCalories', label: 'Daily Calorie Intake' },
      { key: 'liftingExperience', label: 'Lifting Experience' },
      { key: 'preferredRepRange', label: 'Preferred Rep Range' },
      { key: 'growthRate', label: 'Recent Growth Rate' },
    ];
    let hypertrophyHtml = '<ul>';
    hypertrophyFields.forEach(({ key, label }) => {
      hypertrophyHtml += `<li><strong>${label}:</strong> ${formatValue(key, profile.hypertrophy[key])}</li>`;
    });
    hypertrophyHtml += '</ul>';
    hypertrophyInfo.innerHTML = hypertrophyHtml;
  }
}

function openEditModal(mode) {
  currentEditMode = mode;
  const profile = JSON.parse(localStorage.getItem('strengthTrackerProfile') || '{}');
  editFormFields.innerHTML = '';

  if (mode === 'profile') {
    editModalTitle.textContent = 'Edit Training Profile';
    editFormFields.innerHTML = `
      <label>Age Range
        <select id="edit-age-range">
          <option value="">Select age range</option>
          <option value="under-18">Under 18</option>
          <option value="18-24">18–24</option>
          <option value="25-34">25–34</option>
          <option value="35-44">35–44</option>
          <option value="45-54">45–54</option>
          <option value="55-plus">55+</option>
        </select>
      </label>
      <label>Gender
        <select id="edit-gender">
          <option value="">Select gender</option>
          <option value="male">Male</option>
          <option value="female">Female</option>
          <option value="nonbinary">Non-binary</option>
          <option value="prefer-not-to-say">Prefer not to say</option>
        </select>
      </label>
      <label>Main Goal
        <select id="edit-main-goal">
          <option value="">Select main goal</option>
          <option value="strength">Strength</option>
          <option value="hypertrophy">Hypertrophy</option>
          <option value="fat-loss">Fat loss</option>
          <option value="endurance">Endurance</option>
          <option value="mobility">Mobility / Flexibility</option>
          <option value="performance">Performance / Sport</option>
        </select>
      </label>
      <label>Training Split
        <select id="edit-training-split">
          <option value="">Select training split</option>
          <option value="full-body">Full body</option>
          <option value="upper-lower">Upper / Lower</option>
          <option value="push-pull-legs">Push / Pull / Legs</option>
          <option value="bro-split">Bro split</option>
          <option value="hybrid">Hybrid split</option>
          <option value="custom">Custom</option>
        </select>
      </label>`;
    document.getElementById('edit-age-range').value = profile.ageRange || '';
    document.getElementById('edit-gender').value = profile.gender || '';
    document.getElementById('edit-main-goal').value = profile.mainGoal || '';
    document.getElementById('edit-training-split').value = profile.trainingSplit || '';
  } else if (mode === 'hypertrophy' && profile.hypertrophy) {
    editModalTitle.textContent = 'Edit Hypertrophy Goals';
    editFormFields.innerHTML = `
      <label>Height (inches)<input type="number" id="edit-height" min="36" max="108" step="0.1" /></label>
      <label>Weight (lbs)<input type="number" id="edit-weight" min="50" max="500" step="0.1" /></label>
      <label>Daily Calorie Intake<input type="number" id="edit-daily-calories" min="800" max="10000" step="100" /></label>
      <label>Lifting Experience
        <select id="edit-lifting-experience">
          <option value="">Select experience level</option>
          <option value="beginner">Beginner (0-1 year)</option>
          <option value="intermediate">Intermediate (1-3 years)</option>
          <option value="advanced">Advanced (3-5 years)</option>
          <option value="elite">Elite (5+ years)</option>
        </select>
      </label>
      <label>Preferred Rep Range<input type="text" id="edit-preferred-reps" placeholder="e.g., 8-12 or 6-8" /></label>
      <label>Recent Growth Rate
        <select id="edit-growth-rate">
          <option value="">Select growth rate</option>
          <option value="excellent">Excellent - gaining steady muscle</option>
          <option value="good">Good - seeing solid progress</option>
          <option value="moderate">Moderate - some visible progress</option>
          <option value="slow">Slow - minimal progress</option>
          <option value="plateau">Plateau - no visible change</option>
          <option value="regressing">Regressing - losing muscle</option>
        </select>
      </label>`;
    document.getElementById('edit-height').value = profile.hypertrophy.height || '';
    document.getElementById('edit-weight').value = profile.hypertrophy.weight || '';
    document.getElementById('edit-daily-calories').value = profile.hypertrophy.dailyCalories || '';
    document.getElementById('edit-lifting-experience').value = profile.hypertrophy.liftingExperience || '';
    document.getElementById('edit-preferred-reps').value = profile.hypertrophy.preferredRepRange || '';
    document.getElementById('edit-growth-rate').value = profile.hypertrophy.growthRate || '';
  }

  editModal.classList.remove('hidden');
}

async function saveChanges() {
  const profile = JSON.parse(localStorage.getItem('strengthTrackerProfile') || '{}');

  if (currentEditMode === 'profile') {
    profile.ageRange = document.getElementById('edit-age-range').value;
    profile.gender = document.getElementById('edit-gender').value;
    profile.mainGoal = document.getElementById('edit-main-goal').value;
    profile.trainingSplit = document.getElementById('edit-training-split').value;
  } else if (currentEditMode === 'hypertrophy') {
    if (!profile.hypertrophy) profile.hypertrophy = {};
    profile.hypertrophy.height = document.getElementById('edit-height').value;
    profile.hypertrophy.weight = document.getElementById('edit-weight').value;
    profile.hypertrophy.dailyCalories = document.getElementById('edit-daily-calories').value;
    profile.hypertrophy.liftingExperience = document.getElementById('edit-lifting-experience').value;
    profile.hypertrophy.preferredRepRange = document.getElementById('edit-preferred-reps').value;
    profile.hypertrophy.growthRate = document.getElementById('edit-growth-rate').value;
  }

  if (currentUser) {
    await setDoc(doc(db, 'users', currentUser.uid), { profile }, { merge: true });
  }

  localStorage.setItem('strengthTrackerProfile', JSON.stringify(profile));
  closeModal();
  renderProfile();
}

onAuthStateChanged(auth, async (user) => {
  if (!user) return;
  currentUser = user;

  const userDoc = await getDoc(doc(db, 'users', user.uid));
  if (userDoc.exists()) {
    const data = userDoc.data();
    localStorage.setItem('strengthTrackerAccount', JSON.stringify({
      email: data.email,
      username: data.username,
      provider: data.provider,
      createdAt: data.createdAt,
    }));
    if (data.profile) {
      localStorage.setItem('strengthTrackerProfile', JSON.stringify(data.profile));
    }
  }

  renderProfile();
});

document.addEventListener('DOMContentLoaded', () => {
  editAccountBtn.addEventListener('click', () => {
    alert('Account information cannot be edited currently.');
  });

  editProfileBtn.addEventListener('click', () => openEditModal('profile'));
  editHypertrophyBtn.addEventListener('click', () => openEditModal('hypertrophy'));
  closeModalBtn.addEventListener('click', closeModal);
  cancelEditBtn.addEventListener('click', closeModal);

  editForm.addEventListener('submit', (e) => {
    e.preventDefault();
    saveChanges();
  });

  editModal.addEventListener('click', (e) => {
    if (e.target === editModal) closeModal();
  });

  signOutBtn.addEventListener('click', async () => {
    await signOut(auth);
    localStorage.removeItem('strengthTrackerAccount');
    localStorage.removeItem('strengthTrackerProfile');
    localStorage.removeItem('strengthTrackerAuth');
    window.location.href = 'signup.html';
  });
});
