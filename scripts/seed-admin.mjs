/**
 * seed-admin.mjs
 * ──────────────────────────────────────────────────────────────────────────────
 * Script de único uso para crear el super-admin de NeoByte.
 *
 * Uso:
 *   node scripts/seed-admin.mjs
 *
 * Requiere que las siguientes variables de entorno estén configuradas
 * o que edites las constantes directamente aquí abajo.
 * ──────────────────────────────────────────────────────────────────────────────
 */

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  updateProfile,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore';

// ─── Credenciales del proyecto Firebase (igual que firebase.config.ts) ────────
const firebaseConfig = {
  apiKey: 'AIzaSyBr97UvCua8G9hTAS_2NydLlWKZ7ppE-08',
  authDomain: 'neobyte-96cd7.firebaseapp.com',
  projectId: 'neobyte-96cd7',
  storageBucket: 'neobyte-96cd7.firebasestorage.app',
  messagingSenderId: '1064663492848',
  appId: '1:1064663492848:web:c3553a76608ab2649aba35',
};

// ─── Datos del super-admin (edita aquí si quieres cambiarlos) ─────────────────
const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@neobyte.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? 'NeoByte@Admin2024!';
const ADMIN_NAME = process.env.ADMIN_NAME ?? 'Super Admin';
const ADMIN_ROLE = process.env.ADMIN_ROLE ?? 'super_admin';

if (!['admin', 'super_admin'].includes(ADMIN_ROLE)) {
  throw new Error('ADMIN_ROLE debe ser "admin" o "super_admin".');
}

// ─────────────────────────────────────────────────────────────────────────────

async function main() {
  console.log('🚀 Iniciando seed de super-admin para NeoByte...\n');

  const app = initializeApp(firebaseConfig);
  const auth = getAuth(app);
  const db = getFirestore(app);

  let uid;

  try {
    // Intentar crear la cuenta por primera vez
    console.log(`📧 Creando usuario: ${ADMIN_EMAIL}`);
    const cred = await createUserWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
    uid = cred.user.uid;

    await updateProfile(cred.user, { displayName: ADMIN_NAME });
    console.log(`✅ Usuario creado en Firebase Auth  →  UID: ${uid}`);
  } catch (err) {
    if (err.code === 'auth/email-already-in-use') {
      // Ya existe: solo iniciamos sesión para obtener el UID
      console.log('⚠️  El usuario ya existe en Auth. Recuperando UID...');
      const cred = await signInWithEmailAndPassword(auth, ADMIN_EMAIL, ADMIN_PASSWORD);
      uid = cred.user.uid;
      console.log(`✅ Usuario recuperado  →  UID: ${uid}`);
    } else {
      throw err;
    }
  }

  // Guardar/actualizar documento en Firestore con el rol administrador
  const userRef = doc(db, 'users', uid);
  await setDoc(
    userRef,
    {
      uid,
      email: ADMIN_EMAIL,
      displayName: ADMIN_NAME,
      role: ADMIN_ROLE,
      createdAt: serverTimestamp(),
    },
    { merge: true }, // merge: true para no borrar datos existentes si ya hay documento
  );

  console.log(`\n✅ Documento Firestore guardado en  users/${uid}`);
  console.log(`   role: "${ADMIN_ROLE}"\n`);

  console.log('─────────────────────────────────────────');
  console.log('🎉 Super-admin listo para usar:');
  console.log(`   Email:     ${ADMIN_EMAIL}`);
  console.log(`   Password:  ${ADMIN_PASSWORD}`);
  console.log(`   Role:      ${ADMIN_ROLE}`);
  console.log('─────────────────────────────────────────\n');

  process.exit(0);
}

main().catch((err) => {
  console.error('❌ Error al crear el admin:', err.message ?? err);
  process.exit(1);
});
