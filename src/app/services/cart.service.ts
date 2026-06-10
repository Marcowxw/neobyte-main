import { Injectable, NgZone, computed, inject, signal } from '@angular/core';
import {
  DocumentData,
  QueryDocumentSnapshot,
  addDoc,
  collection,
  deleteDoc,
  doc,
  increment,
  getDocs,
  onSnapshot,
  setDoc,
  writeBatch,
  Unsubscribe
} from 'firebase/firestore';
import { firestore } from '../firebase.client';

export interface CartItem {
  id: string;
  name: string;
  price: number;
  quantity: number;
}

export interface AddCartItemInput {
  id: string;
  name: string;
  price: number;
}

export type DeliveryMethod = 'retiro_tienda' | 'despacho';

export interface CheckoutOrderInput {
  customerName: string;
  customerEmail: string;
  customerRut: string;
  customerPhone: string;
  customerAddress: string;
  deliveryMethod: DeliveryMethod;
  paymentMethod: 'mercado_pago' | 'webpay' | 'transferencia';
  userId: string;
}

const CART_ID = 'public-cart';
const CART_CACHE_KEY = 'neobyte_cart_cache_v1';

@Injectable({
  providedIn: 'root'
})
export class CartService {
  private readonly ngZone = inject(NgZone);
  // Estado principal del carrito en memoria (reactivo con signals).
  private readonly items = signal<CartItem[]>([]);
  private readonly loading = signal(true);
  private readonly syncError = signal<string | null>(null);
  private firestoreBlocked = false;

  private readonly itemsCollection = collection(firestore, 'carts', CART_ID, 'items');
  private readonly ordersCollection = collection(firestore, 'orders');
  private unsubscribe: Unsubscribe | null = null;
  private listenerInitialized = false;
  // Lleva conteo de "agregados pendientes" para reconciliar UI optimista vs respuesta real de Firestore.
  private readonly pendingAddCounts = new Map<string, number>();

  readonly items$ = this.items.asReadonly();
  readonly loading$ = this.loading.asReadonly();
  readonly syncError$ = this.syncError.asReadonly();
  readonly itemCount = computed(() => this.items().reduce((sum, item) => sum + item.quantity, 0));
  readonly total = computed(() => this.items().reduce((sum, item) => sum + item.price * item.quantity, 0));

  constructor() {
    // Carga rápida desde localStorage para que el usuario vea algo altiro, incluso offline.
    this.hydrateFromCache();
  }

  ensureRealtimeSync(): void {
    if (this.listenerInitialized || this.firestoreBlocked) {
      return;
    }

    this.listenerInitialized = true;
    this.initializeListener();
  }

  private applyOptimisticAdd(item: AddCartItemInput): CartItem[] {
    // UI optimista: mostramos el cambio primero y sincronizamos con backend después.
    // Ejemplo cotidiano: como cuando en una fila anotas "pedido tomado" antes de que salga del sistema.
    // La idea es simple y clara, bien "a lo Gabriela Mistral": primero entender, luego pulir.
    const previous = this.items();
    const existingIndex = previous.findIndex((existingItem) => existingItem.id === item.id);

    if (existingIndex === -1) {
      const next = [...previous, { ...item, quantity: 1 }].sort((a, b) => a.name.localeCompare(b.name));
      this.items.set(next);
      this.persistItems(next);
      this.loading.set(false);
      return previous;
    }

    const next = [...previous];
    const existing = next[existingIndex];
    next[existingIndex] = {
      ...existing,
      quantity: existing.quantity + 1,
    };
    this.items.set(next);
    this.persistItems(next);
    this.loading.set(false);
    return previous;
  }

  private applyOptimisticRemove(id: string): CartItem[] {
    const previous = this.items();
    const next = previous.filter((item) => item.id !== id);
    this.items.set(next);
    this.persistItems(next);
    this.loading.set(false);
    return previous;
  }

  private applyOptimisticQuantity(id: string, quantity: number): CartItem[] {
    const previous = this.items();

    if (quantity <= 0) {
      const next = previous.filter((item) => item.id !== id);
      this.items.set(next);
      this.persistItems(next);
      this.loading.set(false);
      return previous;
    }

    const next =
      previous.map((item) =>
        item.id === id
          ? {
              ...item,
              quantity,
            }
          : item
      );

    this.items.set(next);
    this.persistItems(next);
    this.loading.set(false);

    return previous;
  }

  private initializeListener(): void {
    if (this.firestoreBlocked) {
      this.loading.set(false);
      return;
    }

    this.unsubscribe = onSnapshot(
      this.itemsCollection,
      (snapshot) => {
        this.runInAngular(() => {
          // Snapshot = "foto actual" de Firestore en tiempo real.
          const dbItems = snapshot.docs
            .map((itemDoc) => this.mapDocumentToItem(itemDoc))
            .filter((item): item is CartItem => item !== null)
            .sort((a, b) => a.name.localeCompare(b.name));

          // Mezcla datos de backend con acciones locales pendientes (evita saltos raros en UI).
          const mergedItems = this.reconcileWithPendingAdds(dbItems);

          this.items.set(mergedItems);
          this.persistItems(mergedItems);
          this.loading.set(false);
          this.syncError.set(null);
        });
      },
      (error: any) => {
        this.runInAngular(() => {
          this.loading.set(false);

          if (this.isClientBlockedError(error)) {
            this.firestoreBlocked = true;
            if (this.unsubscribe) {
              this.unsubscribe();
              this.unsubscribe = null;
            }
            this.syncError.set('❌ La conexion con Firebase fue bloqueada por el navegador (adblock/privacidad). Permite googleapis.com para usar el carrito.');
          } else if (error?.code === 'permission-denied') {
            this.syncError.set('❌ Permiso denegado. Verifica las reglas de seguridad de Firestore.');
          } else if (error?.code === 'unavailable') {
            this.syncError.set('❌ Firestore no disponible. Verifica tu conexión de internet.');
          } else {
            this.syncError.set(`❌ Error en Firestore: ${error?.message || 'Error desconocido'}`);
          }
        });
      }
    );
  }

  async addItem(item: AddCartItemInput): Promise<void> {
    this.ensureRealtimeSync();

    const itemRef = doc(this.itemsCollection, item.id);
    // rollbackState permite deshacer la UI optimista si falla la escritura en Firestore.
    const rollbackState = this.applyOptimisticAdd(item);

    if (this.firestoreBlocked) {
      this.syncError.set('⚠️ Carrito en modo local: el navegador bloquea Firebase.');
      return;
    }

    this.incrementPendingAdd(item.id);
    this.syncError.set(null);

    try {
      await setDoc(
        itemRef,
        {
          name: item.name,
          price: item.price,
          // increment(1) evita leer + escribir manualmente: Firestore suma de forma atómica.
          quantity: increment(1),
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    } catch (error: any) {
      let errorMsg = 'No se pudo agregar el producto al carrito.';
      if (this.isClientBlockedError(error)) {
        errorMsg = '❌ Firebase fue bloqueado por el navegador (adblock/privacidad). Permite googleapis.com.';
      } else if (error?.code === 'permission-denied') {
        errorMsg = '❌ Permiso denegado. Verifica las reglas de Firestore.';
      } else if (error?.code === 'unavailable') {
        errorMsg = '❌ Firestore no disponible. Intenta de nuevo.';
      }

      this.runInAngular(() => {
        this.items.set(rollbackState);
        this.persistItems(rollbackState);
        this.syncError.set(errorMsg);
      });
      throw new Error(errorMsg);
    } finally {
      this.runInAngular(() => {
        this.decrementPendingAdd(item.id);
      });
    }
  }

  async removeItem(id: string): Promise<void> {
    this.ensureRealtimeSync();

    const rollbackState = this.applyOptimisticRemove(id);

    if (this.firestoreBlocked) {
      this.syncError.set('⚠️ Carrito en modo local: el navegador bloquea Firebase.');
      return;
    }

    this.syncError.set(null);

    try {
      await deleteDoc(doc(this.itemsCollection, id));
    } catch {
      this.items.set(rollbackState);
      this.persistItems(rollbackState);
      this.syncError.set('No se pudo eliminar el producto del carrito.');
      throw new Error('No se pudo eliminar el producto del carrito.');
    }
  }

  async updateQuantity(id: string, quantity: number): Promise<void> {
    this.ensureRealtimeSync();

    const rollbackState = this.applyOptimisticQuantity(id, quantity);

    if (this.firestoreBlocked) {
      this.syncError.set('⚠️ Carrito en modo local: el navegador bloquea Firebase.');
      return;
    }

    this.syncError.set(null);

    if (quantity <= 0) {
      try {
        await deleteDoc(doc(this.itemsCollection, id));
      } catch {
        this.items.set(rollbackState);
        this.persistItems(rollbackState);
        this.syncError.set('No se pudo actualizar la cantidad del producto.');
        throw new Error('No se pudo actualizar la cantidad del producto.');
      }
      return;
    }

    const itemRef = doc(this.itemsCollection, id);

    try {
      await setDoc(
        itemRef,
        {
          quantity,
          updatedAt: Date.now(),
        },
        { merge: true }
      );
    } catch {
      this.items.set(rollbackState);
      this.persistItems(rollbackState);
      this.syncError.set('No se pudo actualizar la cantidad del producto.');
      throw new Error('No se pudo actualizar la cantidad del producto.');
    }
  }

  async clearCart(): Promise<void> {
    this.ensureRealtimeSync();

    const rollbackState = this.items();

    if (rollbackState.length === 0) {
      return;
    }

    this.items.set([]);
    this.persistItems([]);

    if (this.firestoreBlocked) {
      this.syncError.set('⚠️ Carrito en modo local: el navegador bloquea Firebase.');
      return;
    }

    this.syncError.set(null);

    try {
      const snapshot = await getDocs(this.itemsCollection);
      // Batch = varias operaciones que se confirman juntas (todo o nada).
      const batch = writeBatch(firestore);

      snapshot.docs.forEach((itemDoc) => {
        batch.delete(itemDoc.ref);
      });

      await batch.commit();
    } catch {
      this.items.set(rollbackState);
      this.persistItems(rollbackState);
      this.syncError.set('No se pudo vaciar el carrito.');
      throw new Error('No se pudo vaciar el carrito.');
    }
  }

  async placeOrder(input: CheckoutOrderInput): Promise<string> {
    this.ensureRealtimeSync();

    if (this.firestoreBlocked) {
      this.syncError.set('❌ No se puede procesar el pago porque Firebase esta bloqueado por el navegador.');
      throw new Error('No se puede procesar el pago mientras Firebase este bloqueado por el navegador.');
    }

    const cartItems = this.items();

    if (cartItems.length === 0) {
      throw new Error('No hay productos en el carrito para procesar la compra.');
    }

    const now = Date.now();
    const total = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const itemCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    try {
      // Guardamos una "foto" completa de la compra para auditoría e historial.
      const orderRef = await addDoc(this.ordersCollection, {
        userId: input.userId,
        customer: {
          name: input.customerName,
          email: input.customerEmail,
          rut: input.customerRut,
          phone: input.customerPhone,
          address: input.customerAddress,
        },
        deliveryMethod: input.deliveryMethod,
        paymentMethod: input.paymentMethod,
        status: 'pending',
        total,
        itemCount,
        currency: 'CLP',
        items: cartItems,
        createdAt: now,
        updatedAt: now,
      });

      const batch = writeBatch(firestore);
      // Una vez creada la orden, limpiamos el carrito remoto para evitar compras duplicadas.
      cartItems.forEach((item) => {
        batch.delete(doc(this.itemsCollection, item.id));
      });
      await batch.commit();

      this.syncError.set(null);
      this.persistItems([]);
      return orderRef.id;
    } catch {
      this.syncError.set('No se pudo procesar la compra en Firebase.');
      throw new Error('No se pudo procesar la compra en Firebase.');
    }
  }

  private reconcileWithPendingAdds(items: CartItem[]): CartItem[] {
    if (this.pendingAddCounts.size === 0) {
      return items;
    }

    // byId: estado que llega del backend. currentById: estado visible en UI local.
    const byId = new Map(items.map((item) => [item.id, item]));
    const currentById = new Map(this.items().map((item) => [item.id, item]));

    this.pendingAddCounts.forEach((count, id) => {
      if (count <= 0) {
        return;
      }

      const optimisticItem = currentById.get(id);
      if (!optimisticItem) {
        return;
      }

      const dbItem = byId.get(id);
      if (!dbItem || dbItem.quantity < optimisticItem.quantity) {
        // Si backend viene atrasado, mantenemos temporalmente el valor optimista para no "retroceder" en pantalla.
        byId.set(id, {
          ...optimisticItem,
        });
      }
    });

    return Array.from(byId.values()).sort((a, b) => a.name.localeCompare(b.name));
  }

  private incrementPendingAdd(id: string): void {
    const current = this.pendingAddCounts.get(id) ?? 0;
    this.pendingAddCounts.set(id, current + 1);
  }

  private decrementPendingAdd(id: string): void {
    const current = this.pendingAddCounts.get(id) ?? 0;

    if (current <= 1) {
      this.pendingAddCounts.delete(id);
      return;
    }

    this.pendingAddCounts.set(id, current - 1);
  }

  private hydrateFromCache(): void {
    try {
      const serialized = localStorage.getItem(CART_CACHE_KEY);
      if (!serialized) {
        return;
      }

      const parsed = JSON.parse(serialized);
      if (!Array.isArray(parsed)) {
        return;
      }

      const hydratedItems = parsed
        .filter((item): item is CartItem => this.isValidCartItem(item))
        .sort((a, b) => a.name.localeCompare(b.name));

      this.items.set(hydratedItems);
      this.loading.set(false);
    } catch {
      // Ignore invalid cache to avoid blocking the cart bootstrap.
    }
  }

  private persistItems(items: CartItem[]): void {
    try {
      localStorage.setItem(CART_CACHE_KEY, JSON.stringify(items));
    } catch {
      // Ignore storage quota errors and keep runtime state.
    }
  }

  private isValidCartItem(item: unknown): item is CartItem {
    // Type guard: valida estructura antes de confiar en datos externos (localStorage).
    if (!item || typeof item !== 'object') {
      return false;
    }

    const candidate = item as Partial<CartItem>;
    return (
      typeof candidate.id === 'string' &&
      typeof candidate.name === 'string' &&
      typeof candidate.price === 'number' &&
      Number.isFinite(candidate.price) &&
      typeof candidate.quantity === 'number' &&
      Number.isInteger(candidate.quantity) &&
      candidate.quantity > 0
    );
  }

  private mapDocumentToItem(itemDoc: QueryDocumentSnapshot<DocumentData>): CartItem | null {
    const data = itemDoc.data();
    const name = data['name'];
    const price = data['price'];
    const quantity = data['quantity'];

    if (typeof name !== 'string' || typeof price !== 'number' || typeof quantity !== 'number') {
      return null;
    }

    return {
      id: itemDoc.id,
      name,
      price,
      quantity
    };
  }

  private isClientBlockedError(error: any): boolean {
    const message = String(error?.message ?? '').toLowerCase();
    return message.includes('err_blocked_by_client') || message.includes('blocked by client');
  }

  private runInAngular(task: () => void): void {
    // Igual que en AuthService: callbacks async pueden venir fuera de Angular Zone.
    if (NgZone.isInAngularZone()) {
      task();
      return;
    }

    this.ngZone.run(task);
  }
}