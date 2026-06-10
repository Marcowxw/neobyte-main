import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CartService, type DeliveryMethod } from '../../services/cart.service';

@Component({
  selector: 'app-checkout',
  imports: [CommonModule, RouterLink],
  templateUrl: './checkout.html',
  styleUrl: './checkout.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Checkout {
  readonly authService = inject(AuthService);
  readonly cartService = inject(CartService);
  private readonly router = inject(Router);

  readonly currentUser = computed(() => this.authService.getResolvedUser());

  readonly buyerName = signal('');
  readonly buyerEmail = signal('');
  readonly buyerRut = signal('');
  readonly buyerPhone = signal('');
  readonly buyerAddress = signal('');
  readonly deliveryMethod = signal<DeliveryMethod>('retiro_tienda');
  readonly paymentMethod = signal<'mercado_pago' | 'webpay' | 'transferencia'>('mercado_pago');

  readonly checkoutLoading = signal(false);
  readonly checkoutError = signal<string | null>(null);
  readonly checkoutSuccess = signal<string | null>(null);

  private readonly fullNameMinPartLength = 3;
  private readonly fullNameMaxPartLength = 25;
  private readonly fullNameMinTotalLength = 12;
  private readonly fullNameMaxTotalLength = 80;
  private readonly fullNamePartPattern = /^[A-Za-zÁÉÍÓÚáéíóúÑñ][A-Za-zÁÉÍÓÚáéíóúÑñ'-]*$/;

  constructor() {
    this.cartService.ensureRealtimeSync();

    effect(() => {
      // effect se re-ejecuta cuando cambian señales que toca adentro.
      // Aqui protegemos la ruta: si no hay usuario logueado, redirigimos a auth.
      const loading = this.authService.authLoading$();
      const user = this.currentUser();

      if (loading || user) {
        return;
      }

      void this.router.navigate(['/checkout/auth']);
    });

    effect(() => {
      // Solo autocompleta el correo desde la cuenta; el nombre completo lo ingresa el usuario en el pago.
      const user = this.currentUser();

      if (!user) {
        return;
      }

      if (!this.buyerEmail()) {
        this.buyerEmail.set(user.email ?? '');
      }
    });
  }

  onBuyerNameInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.buyerName.set(target.value);
  }

  onBuyerEmailInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.buyerEmail.set(target.value);
  }

  onBuyerRutInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.buyerRut.set(target.value);
  }

  onBuyerPhoneInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.buyerPhone.set(target.value);
  }

  onBuyerAddressInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.buyerAddress.set(target.value);
  }

  onDeliveryMethodChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const method = target.value;

    if (method === 'retiro_tienda' || method === 'despacho') {
      this.deliveryMethod.set(method);
    }
  }

  onPaymentMethodChange(event: Event) {
    const target = event.target as HTMLSelectElement;
    const method = target.value;

    if (method === 'mercado_pago' || method === 'webpay' || method === 'transferencia') {
      this.paymentMethod.set(method);
    }
  }

  async checkout() {
    if (this.checkoutLoading()) {
      // Evita doble click y cobros/ordenes duplicadas.
      return;
    }

    const user = this.currentUser();
    if (!user) {
      this.checkoutError.set('Debes iniciar sesion para finalizar la compra.');
      this.checkoutSuccess.set(null);
      return;
    }

    const customerName = this.buyerName().trim();
    const customerEmail = this.buyerEmail().trim();
    const customerRut = this.buyerRut().trim();
    const customerPhone = this.buyerPhone().trim();
    const customerAddress = this.buyerAddress().trim();
    const deliveryMethod = this.deliveryMethod();

    if (!this.isValidFullName(customerName)) {
      this.checkoutError.set(
        'Ingresa primer nombre, segundo nombre y apellido (3 palabras, minimo 3 letras cada una).'
      );
      this.checkoutSuccess.set(null);
      return;
    }

    if (!this.isValidRut(customerRut)) {
      this.checkoutError.set('Ingresa un RUT valido (ej: 12.345.678-5 o 11.111.111-1).');
      this.checkoutSuccess.set(null);
      return;
    }

    if (!this.isValidPhone(customerPhone)) {
      this.checkoutError.set('Ingresa un numero telefonico valido.');
      this.checkoutSuccess.set(null);
      return;
    }

    if (!this.isValidEmail(customerEmail)) {
      this.checkoutError.set('Ingresa un correo valido para confirmar la compra.');
      this.checkoutSuccess.set(null);
      return;
    }

    if (deliveryMethod === 'despacho' && customerAddress.length < 5) {
      this.checkoutError.set('Ingresa una direccion valida para el despacho.');
      this.checkoutSuccess.set(null);
      return;
    }

    this.checkoutLoading.set(true);
    this.checkoutError.set(null);
    this.checkoutSuccess.set(null);

    try {
      const cartItems = this.cartService.items$().map((item) => ({ ...item }));
      const cartTotal = this.cartService.total();
      const cartItemCount = this.cartService.itemCount();
      const paymentMethod = this.paymentMethod();

      const orderId = await this.cartService.placeOrder({
        customerName,
        customerEmail,
        customerRut,
        customerPhone,
        customerAddress: deliveryMethod === 'despacho' ? customerAddress : '',
        deliveryMethod,
        paymentMethod,
        userId: user.uid,
      });

      // Preparar datos para la página de confirmación
      const orderData = {
        orderId,
        customerName,
        customerEmail,
        customerRut,
        customerPhone,
        customerAddress: deliveryMethod === 'despacho' ? customerAddress : '',
        deliveryMethod,
        paymentMethod,
        items: cartItems,
        total: cartTotal,
        itemCount: cartItemCount,
        createdAt: Date.now(),
        currency: 'CLP',
      };

      // Navegar a la página de confirmación con los datos
      // Se serializa a query param para no depender de estado global temporal.
      void this.router.navigate(
        ['/checkout/confirmation'],
        {
          queryParams: {
            order: encodeURIComponent(JSON.stringify(orderData)),
          },
        }
      );

      // Limpiar estados
      this.buyerName.set('');
      this.buyerEmail.set('');
      this.buyerRut.set('');
      this.buyerPhone.set('');
      this.buyerAddress.set('');
      this.deliveryMethod.set('retiro_tienda');
      this.paymentMethod.set('mercado_pago');
    } catch (error) {
      if (error instanceof Error) {
        this.checkoutError.set(error.message);
      } else {
        this.checkoutError.set('No se pudo finalizar la compra. Intenta nuevamente.');
      }
    } finally {
      this.checkoutLoading.set(false);
    }
  }

  private isValidFullName(value: string): boolean {
    const normalized = value.trim().replace(/\s+/g, ' ');
    const parts = normalized.split(' ');

    if (parts.length !== 3) {
      return false;
    }

    if (
      normalized.length < this.fullNameMinTotalLength ||
      normalized.length > this.fullNameMaxTotalLength
    ) {
      return false;
    }

    return parts.every(
      (part) =>
        part.length >= this.fullNameMinPartLength &&
        part.length <= this.fullNameMaxPartLength &&
        this.fullNamePartPattern.test(part)
    );
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }

  private isValidPhone(value: string): boolean {
    const digits = value.replace(/\D/g, '');
    return digits.length >= 8 && digits.length <= 11;
  }

  private isValidRut(value: string): boolean {
    const cleaned = value.replace(/[.\s-]/g, '').toUpperCase();
    if (!/^\d{7,8}[0-9K]$/.test(cleaned)) {
      return false;
    }

    const body = cleaned.slice(0, -1);
    const verifier = cleaned.slice(-1);
    let sum = 0;
    let multiplier = 2;

    for (let i = body.length - 1; i >= 0; i--) {
      sum += Number(body[i]) * multiplier;
      multiplier = multiplier === 7 ? 2 : multiplier + 1;
    }

    const remainder = 11 - (sum % 11);
    const expected =
      remainder === 11 ? '0' : remainder === 10 ? 'K' : remainder.toString();

    return verifier === expected;
  }
}
