const functions = require('firebase-functions');
const admin = require('firebase-admin');

exports.createUser = functions.https.onCall(async (data, context) => {
    const { email, password, firstName, lastName, companyName } = data;

    try {

        console.log('creating')
        // Create user in Firebase Authentication
        const userRecord = await admin.auth().createUser({
            email: email,
            password: password,
            displayName: `${firstName} ${lastName}`,
        });

        console.log(userRecord)

        // Add additional user data to Firestore
        await admin.firestore().collection('users').doc(userRecord.uid).set({
            uid: userRecord.uid,
            firstName: firstName,
            lastName: lastName,
            companyName: companyName,
            email: email,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return { uid: userRecord.uid };
    } catch (error) {
        // Handle errors and return appropriate response
        console.error('Error creating user:', error);
        throw new functions.https.HttpsError('internal', 'Unable to create user', error);
    }
});
