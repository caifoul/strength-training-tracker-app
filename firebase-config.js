import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getAuth } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js';
import { getFirestore } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js';

const firebaseConfig = {
  apiKey: "AIzaSyC5ELdL6H38xH6ieKPUN_-FPifGeaski1M",
  authDomain: "strength-training-tracke-90ccd.firebaseapp.com",
  projectId: "strength-training-tracke-90ccd",
  storageBucket: "strength-training-tracke-90ccd.firebasestorage.app",
  messagingSenderId: "107239153289",
  appId: "1:107239153289:web:f9d0bf90823811fd7c7058"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
