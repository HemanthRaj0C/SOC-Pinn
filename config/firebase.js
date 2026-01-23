const { initializeApp } = require('firebase/app');
const { getFirestore } = require('firebase/firestore');

const firebaseConfig = {
  apiKey: "AIzaSyA01AdAXUKScvUjq5WNF6Yw6CugM1Q9GNY",
  authDomain: "sriram-soc.firebaseapp.com",
  projectId: "sriram-soc",
  storageBucket: "sriram-soc.firebasestorage.app",
  messagingSenderId: "72428991090",
  appId: "1:72428991090:web:e8aefe526dfa7dcad488eb",
  measurementId: "G-L6HEMDYPN1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

module.exports = { app, db };
