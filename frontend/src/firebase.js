import { initializeApp } from 'firebase/app';
import { getDatabase, ref, set } from 'firebase/database';
import axios from 'axios';

// Initialize Firebase
const firebaseConfig = {
    apiKey: "AIzaSyAu4YjLQFS0YmFrXC7UFBBZ21mym9jkyGE",
    authDomain: "auto-code-documentation.firebaseapp.com",
    projectId: "auto-code-documentation",
    storageBucket: "auto-code-documentation.appspot.com",
    messagingSenderId: "1020888146225",
    appId: "1:1020888146225:web:2c6525635efcb1e9e21010"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export const sendCodeToFirebase = async (code) => {
    const codeRef = ref(database, 'code/');
    await set(codeRef, { code });
};

export const getAIDescription = async () => {
    // Replace with your AI description service endpoint
    const response = await axios.get('YOUR_AI_DESCRIPTION_ENDPOINT');
    return response.data.descriptions;
};
