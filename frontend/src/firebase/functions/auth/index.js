// functions/index.js

const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();

exports.authCreateUser = functions.https.onCall(async (data, context) => {
    const { email, password, firstName, lastName, companyName } = data;

    try {
        // Create a user in Firebase Auth
        const userRecord = await admin.auth().createUser({
            email: email,
            password: password,
        });

        // Store additional user info in Firestore
        await admin.firestore().collection('users').doc(userRecord.uid).set({
            firstName: firstName,
            lastName: lastName,
            companyName: companyName,
            email: email,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Return the user's UID to the frontend
        return { uid: userRecord.uid };
    } catch (error) {
        console.error('Error creating user:', error);
        throw new functions.https.HttpsError('internal', 'Unable to create user', error);
    }
});
