if (localStorage.getItem('strengthTrackerAuth')) {
  window.location.replace('home.html');
}

const signinForm = document.getElementById('signin-form');
const signinError = document.getElementById('signin-error');
const goCreateAccount = document.getElementById('go-create-account');

signinForm.addEventListener('submit', event => {
  event.preventDefault();

  const email = document.getElementById('signin-email').value.trim();
  const password = document.getElementById('signin-password').value;

  if (!email || !password) return;

  const stored = JSON.parse(localStorage.getItem('strengthTrackerAccount') || 'null');

  if (!stored || !stored.email) {
    showError('No account found on this device. Please create an account first.');
    goCreateAccount.classList.remove('hidden');
    return;
  }

  if (stored.email.toLowerCase() !== email.toLowerCase() || stored.password !== password) {
    showError('Incorrect email or password. Please try again.');
    goCreateAccount.classList.remove('hidden');
    return;
  }

  localStorage.setItem('strengthTrackerAuth', JSON.stringify({ provider: 'email', email, signedInAt: new Date().toISOString() }));
  window.location.href = 'home.html';
});

function showError(message) {
  signinError.textContent = message;
  signinError.classList.remove('hidden');
  goCreateAccount.classList.add('hidden');
}
