const createAccountForm = document.getElementById('create-account-form');
const googleCreate = document.getElementById('google-create');
const accountSummary = document.getElementById('account-summary');

createAccountForm.addEventListener('submit', event => {
  event.preventDefault();

  const email = document.getElementById('account-email').value.trim();
  const username = document.getElementById('account-username').value.trim();
  const password = document.getElementById('account-password').value;
  const confirmPassword = document.getElementById('account-confirm-password').value;

  if (!email || !password || !confirmPassword) {
    return;
  }

  if (password !== confirmPassword) {
    alert('Passwords do not match. Please confirm your password.');
    return;
  }

  const account = {
    email,
    username: username || null,
    password,
    createdAt: new Date().toISOString(),
  };

  localStorage.setItem('strengthTrackerAccount', JSON.stringify(account));
  localStorage.setItem('strengthTrackerAuth', JSON.stringify({ provider: 'email', email, signedInAt: new Date().toISOString() }));

  accountSummary.innerHTML = `
    <h2>Account Created</h2>
    <p>Your email account has been created successfully.</p>
    <ul>
      <li><strong>Email:</strong> ${email}</li>
      <li><strong>Username:</strong> ${username || 'Not provided'}</li>
    </ul>
    <p>Redirecting to profile setup...</p>
  `;
  accountSummary.classList.remove('hidden');
  localStorage.setItem('startAtStep', '1');
  window.location.href = 'signup.html';
});

googleCreate.addEventListener('click', () => {
  localStorage.setItem('strengthTrackerAuth', JSON.stringify({ provider: 'google', signedInAt: new Date().toISOString() }));
  const googleAccount = {
    provider: 'google',
    createdAt: new Date().toISOString(),
  };
  localStorage.setItem('strengthTrackerAccount', JSON.stringify(googleAccount));
  accountSummary.innerHTML = `
    <h2>Google Account Created</h2>
    <p>Your account has been created using Google.</p>
    <p>Redirecting to profile setup...</p>
  `;
  accountSummary.classList.remove('hidden');
  localStorage.setItem('startAtStep', '1');
  window.location.href = 'signup.html';
});
