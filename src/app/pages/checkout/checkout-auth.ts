import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CartService } from '../../services/cart.service';

@Component({
  selector: 'app-checkout-auth',
  imports: [CommonModule, RouterLink],
  templateUrl: './checkout-auth.html',
  styleUrl: './checkout-auth.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CheckoutAuth {
  readonly authService = inject(AuthService);
  readonly cartService = inject(CartService);
  private readonly router = inject(Router);

  readonly currentUser = computed(() => this.authService.getResolvedUser());
  readonly authMode = signal<'login' | 'register'>('login');
  readonly authName = signal('');
  readonly authEmail = signal('');
  readonly authPassword = signal('');
  readonly authActionLoading = signal(false);
  readonly authActionError = signal<string | null>(null);

  constructor() {
    effect(() => {
      const user = this.currentUser();
      if (!user) {
        return;
      }

      void this.router.navigate(['/checkout/payment']);
    });
  }

  setAuthMode(mode: 'login' | 'register') {
    this.authMode.set(mode);
    this.authActionError.set(null);
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

    if (this.authMode() === 'register' && this.authName().trim().length < 2) {
      this.authActionError.set('Ingresa un nombre valido.');
      return;
    }

    this.authActionLoading.set(true);
    this.authActionError.set(null);

    try {
      if (this.authMode() === 'register') {
        await this.authService.register(this.authName(), email, password);
      } else {
        await this.authService.login(email, password);
      }

      this.authPassword.set('');
      this.authEmail.set('');
      this.authName.set('');
      void this.router.navigate(['/checkout/payment']);
    } catch (error) {
      if (error instanceof Error) {
        this.authActionError.set(error.message);
      } else {
        this.authActionError.set('No se pudo autenticar la cuenta.');
      }
    } finally {
      this.authActionLoading.set(false);
    }
  }

  private isValidEmail(value: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
  }
}
