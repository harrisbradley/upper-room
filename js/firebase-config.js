// js/firebase-config.js
// Firebase configuration for Upper Room
// Get these values from: Firebase Console → Project Settings → Your apps → Web app → Config

const firebaseConfig = {
    apiKey: "AIzaSyANOShB9iUcRUPHfyOUiiH9i6JwIEiYj7M",
    authDomain: "upper-room-application.firebaseapp.com",
    projectId: "upper-room-application",
    storageBucket: "upper-room-application.firebasestorage.app",
    messagingSenderId: "680341850259",
    appId: "1:680341850259:web:2825fb2e90ed173b3c6566",
    measurementId: "G-DSLXMLZ74D"
};

firebase.initializeApp(firebaseConfig);

const auth = firebase.auth();
const db   = firebase.firestore();
