import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getFunctions } from "firebase/functions";

const firebaseConfig = {
    apiKey: "AIzaSyAu4YjLQFS0YmFrXC7UFBBZ21mym9jkyGE",
    authDomain: "auto-code-documentation.firebaseapp.com",
    projectId: "auto-code-documentation",
    storageBucket: "auto-code-documentation.appspot.com",
    messagingSenderId: "1020888146225",
    appId: "1:1020888146225:web:2c6525635efcb1e9e21010"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

export const db = getFirestore(app)
export const auth = getAuth(app)
export const functions = getFunctions(app);

