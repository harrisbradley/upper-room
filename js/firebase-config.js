// js/firebase-config.js
// Firebase configuration for Upper Room
// Get these values from: Firebase Console → Project Settings → Your apps → Web app → Config

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
    apiKey: "AIzaSyANOShB9iUcRUPHfyOUiiH9i6JwIEiYj7M",
    authDomain: "upper-room-application.firebaseapp.com",
    projectId: "upper-room-application",
    storageBucket: "upper-room-application.firebasestorage.app",
    messagingSenderId: "680341850259",
    appId: "1:680341850259:web:2825fb2e90ed173b3c6566",
    measurementId: "G-DSLXMLZ74D"
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db   = getFirestore(app);
