const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');

function loadServiceAccount() {
  const explicitPath = process.env.FIREBASE_SERVICE_ACCOUNT_PATH || process.env.GOOGLE_APPLICATION_CREDENTIALS;

  if (explicitPath) {
    return JSON.parse(fs.readFileSync(explicitPath, 'utf8'));
  }

  const localPath = path.join(__dirname, 'serviceAccountKey.json');
  if (fs.existsSync(localPath)) {
    return require(localPath);
  }

  throw new Error('Configura FIREBASE_SERVICE_ACCOUNT_PATH o coloca serviceAccountKey.json fuera del repo.');
}

const serviceAccount = loadServiceAccount();

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

const uid = 'g2mgOg0nN2dtRUuLUiugDEUmolz1';
const email = 'marco@gmail.com';

async function resolveUser(auth) {
  try {
    return await auth.getUser(uid);
  } catch (error) {
    if (error && error.code !== 'auth/user-not-found') {
      throw error;
    }
  }

  if (email) {
    return auth.getUserByEmail(email);
  }

  throw new Error('No se pudo resolver el usuario objetivo.');
}

resolveUser(admin.auth())
.then(async (userRecord) => {
  const targetUid = userRecord.uid;

  await admin.auth().setCustomUserClaims(targetUid, {
    role: 'super_admin'
  });

  try {
    await admin.firestore().collection('users').doc(targetUid).set({
      role: 'super_admin',
      uid: targetUid,
      email: userRecord.email || email
    }, { merge: true });
  } catch (firestoreError) {
    console.error('Error actualizando Firestore:', firestoreError);
    process.exit(1);
    return;
  }

  console.log('Super admin asignado correctamente');
  process.exit();
})
.catch((error) => {
  console.error(error);
  process.exit();
});
