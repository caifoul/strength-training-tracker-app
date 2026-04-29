import { auth, db } from './firebase-config.js';
import { onAuthStateChanged, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { doc, setDoc } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

onAuthStateChanged(auth, (user) => {
  if (user) window.location.replace('home.html');
});

const createAccountForm = document.getElementById('create-account-form');
const googleCreate = document.getElementById('google-create');
const accountSummary = document.getElementById('account-summary');

async function saveUserAndRedirect(user, email, username, provider) {
  await setDoc(doc(db, 'users', user.uid), {
    email: email || user.email,
    username: username || null,
    provider,
    createdAt: new Date().toISOString(),
  });
  accountSummary.innerHTML = '<h2>Account Created</h2><p>Redirecting to profile setup...</p>';
  accountSummary.classList.remove('hidden');
  localStorage.setItem('startAtStep', '1');
  window.location.href = 'signup.html';
}

createAccountForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = document.getElementById('account-email').value.trim();
  const username = document.getElementById('account-username').value.trim();
  const password = document.getElementById('account-password').value;
  const confirmPassword = document.getElementById('account-confirm-password').value;

  if (!email || !password || !confirmPassword) return;

  if (password !== confirmPassword) {
    alert('Passwords do not match. Please confirm your password.');
    return;
  }

  try {
    const { user } = await createUserWithEmailAndPassword(auth, email, password);
    await saveUserAndRedirect(user, email, username, 'email');
  } catch (error) {
    let message = 'Failed to create account. Please try again.';
    if (error.code === 'auth/email-already-in-use') message = 'An account with this email already exists.';
    else if (error.code === 'auth/invalid-email') message = 'Invalid email address.';
    else if (error.code === 'auth/weak-password') message = 'Password must be at least 6 characters.';
    alert(message);
  }
});

googleCreate.addEventListener('click', async () => {
  try {
    const provider = new GoogleAuthProvider();
    const { user } = await signInWithPopup(auth, provider);
    await saveUserAndRedirect(user, user.email, null, 'google');
  } catch (error) {
    if (error.code !== 'auth/popup-closed-by-user') {
      alert('Google sign-in error: ' + error.code + '\n' + error.message);
    }
  }
});
