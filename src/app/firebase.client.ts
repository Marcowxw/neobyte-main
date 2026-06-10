import { initializeApp } from 'firebase/app';
import {
	browserLocalPersistence,
	getAuth,
	indexedDBLocalPersistence,
	initializeAuth,
	inMemoryPersistence,
} from 'firebase/auth';
import {
	getFirestore,
	initializeFirestore,
	memoryLocalCache,
	persistentLocalCache,
	persistentMultipleTabManager,
} from 'firebase/firestore';
import { firebaseConfig } from './firebase.config';

// Este es el "arranque" de Firebase para toda la app.
// Piensalo como abrir la sucursal principal antes de atender clientes.
export const firebaseApp = initializeApp(firebaseConfig);

function initializeFirebaseAuth() {
	try {
		// Orden de persistencia: primero IndexedDB (mas robusto), luego localStorage,
		// y finalmente memoria RAM si el navegador restringe almacenamiento.
		return initializeAuth(firebaseApp, {
			persistence: [indexedDBLocalPersistence, browserLocalPersistence, inMemoryPersistence],
		});
	} catch {
		// Fallback defensivo: si Auth ya fue inicializado en otro lugar,
		// reutilizamos la instancia existente en vez de romper la app.
		return getAuth(firebaseApp);
	}
}

export const firebaseAuth = initializeFirebaseAuth();

function initializeFirestoreWithCache() {
	try {
		// Cache persistente multi-tab: permite que dos pestañas compartan estado,
		// parecido a tener dos cajas del mismo supermercado leyendo el mismo stock.
		return initializeFirestore(firebaseApp, {
			localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
			experimentalAutoDetectLongPolling: true,
		});
	} catch {
		// Si el navegador bloquea cache persistente, usamos cache en memoria.
		// Es como anotar en una pizarra temporal: sirve, pero se pierde al recargar.
		return initializeFirestore(firebaseApp, {
			localCache: memoryLocalCache(),
			experimentalAutoDetectLongPolling: true,
		});
	}
}

export const firestore = initializeFirestoreWithCache();