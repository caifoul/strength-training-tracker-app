import { auth } from './firebase-config.js';
import { onAuthStateChanged, signInWithEmailAndPassword } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

onAuthStateChanged(auth, (user) => {
  if (user) window.location.replace('home.html');
});

const signinForm = document.getElementById('signin-form');
const signinError = document.getElementById('signin-error');
const goCreateAccount = document.getElementById('go-create-account');

signinForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = document.getElementById('signin-email').value.trim();
  const password = document.getElementById('signin-password').value;

  if (!email || !password) return;

  signinError.classList.add('hidden');
  goCreateAccount.classList.add('hidden');

  try {
    await signInWithEmailAndPassword(auth, email, password);
    window.location.href = 'home.html';
  } catch (error) {
    let message = 'Incorrect email or password. Please try again.';
    let showCreate = false;

    if (error.code === 'auth/user-not-found' || error.code === 'auth/invalid-credential') {
      message = 'No account found with that email.';
      showCreate = true;
    } else if (error.code === 'auth/wrong-password') {
      message = 'Incorrect password. Please try again.';
    } else if (error.code === 'auth/invalid-email') {
      message = 'Invalid email address.';
    } else if (error.code === 'auth/too-many-requests') {
      message = 'Too many failed attempts. Please try again later.';
    }

    signinError.textContent = message;
    signinError.classList.remove('hidden');
    if (showCreate) goCreateAccount.classList.remove('hidden');
  }
});
