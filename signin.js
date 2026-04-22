const signinForm = document.getElementById('signin-form');

signinForm.addEventListener('submit', event => {
  event.preventDefault();

  const email = document.getElementById('signin-email').value.trim();
  const password = document.getElementById('signin-password').value;

  if (!email || !password) {
    return;
  }

  // Demo sign-in logic - in a real app, verify credentials
  localStorage.setItem('strengthTrackerAuth', JSON.stringify({ provider: 'email', email, signedInAt: new Date().toISOString() }));
  alert('Signed in successfully.');
  window.location.href = 'home.html';
});