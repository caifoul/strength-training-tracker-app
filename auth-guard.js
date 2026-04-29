import { auth } from './firebase-config.js';
import { onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';

onAuthStateChanged(auth, (user) => {
  if (user) {
    document.body.style.visibility = 'visible';
  } else {
    window.location.replace('signup.html');
  }
});
