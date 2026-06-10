import { ChangeDetectionStrategy, Component, computed, signal, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from '../services/auth.service';
import { CartService } from '../services/cart.service';
import { ThemeService } from '../services/theme.service';
import { PRODUCT_IMAGE_BY_ID } from '../data/products';

@Component({
  selector: 'app-navbar',
  imports: [RouterLink, CommonModule],
  templateUrl: './navbar.component.html',
  styleUrl: './navbar.component.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class NavbarComponent {
  private readonly cartImageByProductId = PRODUCT_IMAGE_BY_ID;

  readonly authService = inject(AuthService);
  readonly cartService = inject(CartService);
  readonly themeService = inject(ThemeService);
  private readonly router = inject(Router);
  readonly isCartOpen = signal(false);
  readonly isAuthOpen = signal(false);
  readonly isMobileMenuOpen = signal(false);
  readonly authMode = signal<'login' | 'register'>('login');
  readonly authName = signal('');
  readonly authEmail = signal('');
  readonly authPassword = signal('');
  readonly showAuthPassword = signal(false);
  readonly authActionLoading = signal(false);
  readonly authActionError = signal<string | null>(null);
  readonly authActionSuccess = signal<string | null>(null);
  readonly currentUser = computed(() => this.authService.getResolvedUser());
  readonly isAdmin = computed(() => this.authService.isAdmin());
  readonly roleLabel = computed(() => this.authService.roleLabel());
  readonly navbarUserName = computed(() => {
    const user = this.currentUser();

    if (!user) {
      return 'invitado';
    }

    const displayName = user.displayName?.trim();
    if (displayName) {
      return displayName.split(/\s+/)[0];
    }

    const email = user.email?.trim();
    if (email) {
      const alias = email.split('@')[0] || 'invitado';
      return alias.length > 14 ? `${alias.slice(0, 14)}...` : alias;
    }

    return 'invitado';
  });
  readonly isDarkTheme = computed(() => this.themeService.theme() === 'dark');
  readonly themeToggleLabel = computed(() =>
    this.isDarkTheme() ? 'Cambiar a tema claro' : 'Cambiar a tema oscuro',
  );

  toggleCart() {
    this.isMobileMenuOpen.set(false);

    if (!this.isCartOpen()) {
      this.cartService.ensureRealtimeSync();
    }

    this.isCartOpen.update(state => !state);
  }

  openCheckout() {
    if (this.cartService.itemCount() === 0) {
      return;
    }

    this.cartService.ensureRealtimeSync();
    this.isCartOpen.set(false);
    this.isMobileMenuOpen.set(false);
    void this.router.navigate(['/checkout']);
  }

  toggleAuth() {
    this.isMobileMenuOpen.set(false);
    this.isAuthOpen.update((state) => !state);
    this.authActionError.set(null);
    this.authActionSuccess.set(null);
  }

  toggleTheme() {
    this.themeService.toggleTheme();
  }

  closeAuth() {
    this.isAuthOpen.set(false);
  }

  setAuthMode(mode: 'login' | 'register') {
    this.authMode.set(mode);
    this.authActionError.set(null);
    this.authActionSuccess.set(null);
  }

  closeCart() {
    this.isCartOpen.set(false);
  }

  toggleMobileMenu() {
    this.isAuthOpen.set(false);
    this.isCartOpen.set(false);
    this.isMobileMenuOpen.update((state) => !state);
  }

  closeMobileMenu() {
    this.isMobileMenuOpen.set(false);
  }

  removeFromCart(id: string) {
    void this.cartService.removeItem(id);
  }

  increaseItem(id: string, currentQuantity: number) {
    void this.cartService.updateQuantity(id, currentQuantity + 1);
  }

  decreaseItem(id: string, currentQuantity: number) {
    const nextQuantity = currentQuantity - 1;

    if (nextQuantity <= 0) {
      void this.cartService.removeItem(id);
      return;
    }

    void this.cartService.updateQuantity(id, nextQuantity);
  }

  trackByItemId(_index: number, item: { id: string }): string {
    return item.id;
  }

  clearCart() {
    void this.cartService.clearCart();
  }

  getCartItemImage(productId: string): string {
    return this.cartImageByProductId[productId] ?? '/images/kit-perifericos.svg';
  }

  onAuthNameInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.authName.set(target.value);
  }

  onAuthEmailInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.authEmail.set(target.value);
  }

  onAuthPasswordInput(event: Event) {
    const target = event.target as HTMLInputElement;
    this.authPassword.set(target.value);
  }

  toggleAuthPasswordVisibility() {
    this.showAuthPassword.update((value) => !value);
  }

  async submitAuth() {
    if (this.authActionLoading()) {
      return;
    }

    const email = this.authEmail().trim();
    const password = this.authPassword();

    if (!this.isValidEmail(email)) {
      this.authActionError.set('Ingresa un correo valido.');
      return;
    }

    if (password.length < 6) {
      this.authActionError.set('La contrasena debe tener al menos 6 caracteres.');
      return;
    }

    this.authActionLoading.set(true);
    this.authActionError.set(null);
    this.authActionSuccess.set(null);

    try {
      if (this.authMode() === 'register') {
        await this.authService.register(this.authName(), email, password);
        this.authActionSuccess.set('Cuenta creada correctamente.');
      } else {
        await this.authService.login(email, password);
        this.authActionSuccess.set('Sesion iniciada correctamente.');
      }

      this.authPassword.set('');
      this.authEmail.set('');
      this.authName.set('');
      this.showAuthPassword.set(false);
    } catch (error) {
      if (error instanceof Error) {
        this.authActionError.set(error.message);
      } else {
        this.authActionError.set('No se pudo completar la accion de autenticacion.');
      }
    } finally {
      this.authActionLoading.set(false);
    }
  }

  async logout() {
    try {
      await this.authService.logout();
      this.authActionSuccess.set('Sesion cerrada correctamente.');
      this.authActionError.set(null);
    } catch (error) {
      if (error instanceof Error) {
        this.authActionError.set(error.message);
      } else {
        this.authActionError.set('No se pudo cerrar sesion.');
      }
    }
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }
}