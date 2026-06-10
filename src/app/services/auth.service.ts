import { Injectable, NgZone, computed, inject, signal } from '@angular/core';
import { FirebaseError } from 'firebase/app';
import {
  User,
  createUserWithEmailAndPassword,
  getIdTokenResult,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  updateProfile,
  reload,
} from 'firebase/auth';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { firebaseAuth, firestore } from '../firebase.client';

export type UserRole = 'super_admin' | 'superadmin' | 'admin' | 'user';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly ngZone = inject(NgZone);
  // Signal = estado reactivo local. Cuando cambia, Angular actualiza la UI automáticamente.
  private readonly user = signal<User | null>(null);
  private readonly authLoading = signal(true);
  private readonly authError = signal<string | null>(null);
  private readonly firestoreRole = signal<UserRole | null>(null);
  private readonly tokenRole = signal<UserRole | null>(null);

  readonly user$ = this.user.asReadonly();
  readonly authLoading$ = this.authLoading.asReadonly();
  readonly authError$ = this.authError.asReadonly();
  readonly userRole$ = this.firestoreRole.asReadonly();
  readonly tokenRole$ = this.tokenRole.asReadonly();

  readonly effectiveRole = computed(() => this.tokenRole() ?? this.firestoreRole() ?? 'user');

  /** true si el usuario tiene rol super_admin o admin */
  readonly isAdmin = computed(() => {
    const role = this.effectiveRole();
    return role === 'super_admin' || role === 'superadmin' || role === 'admin';
  });

  readonly roleLabel = computed(() => {
    const role = this.effectiveRole();

    switch (role) {
      case 'super_admin':
      case 'superadmin':
        return 'Super Admin';
      case 'admin':
        return 'Administrador';
      default:
        return 'Cliente';
    }
  });

  constructor() {
    // Si Firebase ya trae usuario en memoria, evitamos un "parpadeo" de estado al cargar.
    const initialUser = firebaseAuth.currentUser;
    if (initialUser) {
      this.user.set(initialUser);
      void this.syncAccessState(initialUser);
    }

    // Listener oficial de Firebase: avisa cuando alguien inicia/cierra sesión.
    onAuthStateChanged(
      firebaseAuth,
      (user) => {
        // runInAngular asegura que el cambio reactive correctamente la vista.
        this.runInAngular(() => {
          this.user.set(user);
          this.authError.set(null);
          if (user) {
            void this.syncAccessState(user);
          } else {
            this.firestoreRole.set(null);
            this.tokenRole.set(null);
            this.authLoading.set(false);
          }
        });
      },
      () => {
        this.runInAngular(() => {
          this.authLoading.set(false);
          this.authError.set('No se pudo sincronizar la sesion de usuario.');
        });
      },
    );
  }

  getResolvedUser(): User | null {
    // Doble chequeo defensivo por si signal y SDK quedan desfasados por milisegundos.
    return this.user() ?? firebaseAuth.currentUser;
  }

  /** Carga el rol del usuario desde Firestore */
  private async loadUserRole(uid: string): Promise<void> {
    try {
      const ref = doc(firestore, 'users', uid);
      const snap = await getDoc(ref);
      const role = snap.exists() ? this.normalizeRole(snap.data()['role']) : 'user';
      this.runInAngular(() => {
        this.firestoreRole.set(role ?? 'user');
      });
    } catch {
      // En caso de error de red o permisos, dejamos como usuario normal.
      this.runInAngular(() => {
        this.firestoreRole.set('user');
      });
    }
  }

  /** Lee y normaliza el claim de rol desde el ID token de Firebase Auth. */
  private async loadTokenRole(user: User): Promise<void> {
    try {
      const token = await getIdTokenResult(user, true);
      const role = this.normalizeRole(token.claims['role']);
      this.runInAngular(() => {
        this.tokenRole.set(role);
      });
    } catch {
      this.runInAngular(() => {
        this.tokenRole.set(null);
      });
    }
  }

  private async syncAccessState(user: User): Promise<void> {
    try {
      await Promise.all([this.loadTokenRole(user), this.loadUserRole(user.uid)]);
    } finally {
      this.runInAngular(() => {
        this.authLoading.set(false);
      });
    }
  }

  private normalizeRole(role: unknown): UserRole | null {
    if (role === 'super_admin' || role === 'superadmin' || role === 'admin' || role === 'user') {
      return role;
    }

    return null;
  }

  async register(name: string, email: string, password: string): Promise<void> {
    if (name.trim().length < 2) {
      throw new Error('Ingresa un nombre valido.');
    }

    try {
      const credentials = await createUserWithEmailAndPassword(firebaseAuth, email, password);
      // Firebase crea la cuenta, pero el nombre visible se guarda aparte en el perfil.
      await updateProfile(credentials.user, { displayName: name.trim() });
      // reload fuerza a refrescar datos del usuario desde servidor.
      await reload(credentials.user);
      const refreshedUser = firebaseAuth.currentUser ?? credentials.user;

      // Crear documento en Firestore para el nuevo usuario (rol por defecto: user)
      try {
        const ref = doc(firestore, 'users', credentials.user.uid);
        await setDoc(
          ref,
          {
            uid: credentials.user.uid,
            email,
            displayName: name.trim(),
            role: 'user',
            createdAt: serverTimestamp(),
          },
          { merge: true },
        );
      } catch {
        // Si falla crear el doc de Firestore, no rompemos el flujo de registro.
      }

      this.runInAngular(() => {
        this.user.set(refreshedUser);
        this.firestoreRole.set('user');
        this.tokenRole.set(null);
        this.authError.set(null);
        this.authLoading.set(false);
      });
    } catch (error) {
      const message = this.resolveAuthErrorMessage(error, 'register');
      this.runInAngular(() => {
        this.authError.set(message);
      });
      throw new Error(message);
    }
  }

  async login(email: string, password: string): Promise<void> {
    try {
      const credentials = await signInWithEmailAndPassword(firebaseAuth, email, password);
      this.runInAngular(() => {
        this.user.set(credentials.user);
        this.authError.set(null);
      });
      // Leemos claims del token y rol de Firestore inmediatamente después del login.
      await this.syncAccessState(credentials.user);
    } catch (error) {
      const message = this.resolveAuthErrorMessage(error, 'login');
      this.runInAngular(() => {
        this.authError.set(message);
      });
      throw new Error(message);
    }
  }

  async logout(): Promise<void> {
    try {
      await signOut(firebaseAuth);
      this.runInAngular(() => {
        this.user.set(null);
        this.firestoreRole.set(null);
        this.tokenRole.set(null);
        this.authError.set(null);
        this.authLoading.set(false);
      });
    } catch {
      this.runInAngular(() => {
        this.authError.set('No se pudo cerrar sesion. Intenta nuevamente.');
      });
      throw new Error('No se pudo cerrar sesion. Intenta nuevamente.');
    }
  }

  private runInAngular(task: () => void): void {
    // Algunos callbacks de Firebase corren fuera de Angular Zone.
    // Sin este puente, podrías cambiar estado pero no ver actualización en pantalla.
    if (NgZone.isInAngularZone()) {
      task();
      return;
    }

    this.ngZone.run(task);
  }

  private resolveAuthErrorMessage(error: unknown, action: 'register' | 'login'): string {
    if (!(error instanceof FirebaseError)) {
      return action === 'register'
        ? 'No se pudo crear la cuenta. Intenta nuevamente.'
        : 'No se pudo iniciar sesion. Intenta nuevamente.';
    }

    switch (error.code) {
      // Mapeamos códigos técnicos de Firebase a mensajes entendibles para usuario final.
      case 'auth/email-already-in-use':
        return 'Este correo ya esta registrado. Inicia sesion o usa otro correo.';
      case 'auth/invalid-email':
        return 'El correo no tiene un formato valido.';
      case 'auth/weak-password':
        return 'La contrasena es muy debil. Usa al menos 6 caracteres.';
      case 'auth/operation-not-allowed':
        return 'Registro con correo/contrasena no habilitado en Firebase Auth.';
      case 'auth/invalid-credential':
      case 'auth/user-not-found':
      case 'auth/wrong-password':
        return 'Correo o contrasena incorrectos.';
      case 'auth/too-many-requests':
        return 'Demasiados intentos. Espera un momento y vuelve a intentar.';
      case 'auth/network-request-failed':
        return 'Error de red al autenticar. Revisa tu conexion.';
      default:
        return action === 'register'
          ? 'No se pudo crear la cuenta. Error: ' + error.code
          : 'No se pudo iniciar sesion. Error: ' + error.code;
    }
  }
}
