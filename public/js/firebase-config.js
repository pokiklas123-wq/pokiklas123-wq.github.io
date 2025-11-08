// js/firebase-config.js
const firebaseConfig = {
    apiKey: "AIzaSyBfcjTc-bfiRocYeBSmUrxid6WEVBYvVTg",
    authDomain: "pgfxtool-pro.firebaseapp.com",
    databaseURL: "https://pgfxtool-pro-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "pgfxtool-pro",
    storageBucket: "pgfxtool-pro.appspot.com",
    messagingSenderId: "1096122383871",
    appId: "1:1096122383871:android:82a42721ccff8294d33bca"
};

// التهيئة التلقائية
try {
    if (typeof firebase !== 'undefined' && !firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
} catch (error) {
    console.error('Firebase initialization error:', error);
}