// تهيئة Firebase
const firebaseConfig = {
    apiKey: "AIzaSyBfcjTc-bfiRocYeBSmUrxid6WEVBYvVTg",
    authDomain: "pgfxtool-pro.firebaseapp.com",
    databaseURL: "https://pgfxtool-pro-default-rtdb.europe-west1.firebasedatabase.app",
    projectId: "pgfxtool-pro",
    storageBucket: "pgfxtool-pro.appspot.com",
    messagingSenderId: "1096122383871",
    appId: "1:1096122383871:web:your-app-id-here"
};

// تهيئة Firebase
try {
    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    }
    console.log('Firebase initialized successfully');
} catch (error) {
    console.error('Firebase initialization error:', error);
}

const database = firebase.database();
const auth = firebase.auth();