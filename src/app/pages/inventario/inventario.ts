import { ChangeDetectionStrategy, Component, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';

interface ProductStock {
  id: string;
  name: string;
  category: string;
  stock: number;
  price: number;
  status: 'ok' | 'low' | 'critical';
}

@Component({
  selector: 'app-inventario',
  standalone: true,
  imports: [CommonModule, RouterLink],
  templateUrl: './inventario.html',
  styleUrl: './inventario.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Inventario {
  readonly authService = inject(AuthService);
  readonly isAdmin = computed(() => this.authService.isAdmin());

  readonly searchTerm = signal('');
  readonly filterCategory = signal('Todos');

  // Inventario de ejemplo — en producción esto vendría de Firestore
  readonly products = signal<ProductStock[]>([
    { id: 'rtx-5070-ti', name: 'RTX 5070 Ti', category: 'GPU', stock: 12, price: 899990, status: 'ok' },
    { id: 'ryzen-9900x', name: 'Ryzen 9 9900X', category: 'CPU', stock: 3, price: 549990, status: 'low' },
    { id: 'monitor-32-qhd', name: 'Monitor 32" QHD', category: 'Monitor', stock: 0, price: 449990, status: 'critical' },
    { id: 'kit-perifericos', name: 'Kit Periféricos Pro', category: 'Periféricos', stock: 25, price: 129990, status: 'ok' },
    { id: 'hub-domotica', name: 'Hub Domótica', category: 'Smart Home', stock: 8, price: 89990, status: 'ok' },
    { id: 'laptop-creator', name: 'Laptop Creator 16"', category: 'Laptop', stock: 2, price: 1299990, status: 'low' },
    { id: 'smartphone-neo-x', name: 'Smartphone Neo X', category: 'Móvil', stock: 0, price: 699990, status: 'critical' },
    { id: 'smartphone-andes-pro', name: 'Smartphone Andes Pro', category: 'Móvil', stock: 15, price: 499990, status: 'ok' },
    { id: 'console-ps5-slim', name: 'PS5 Slim', category: 'Consola', stock: 1, price: 649990, status: 'critical' },
    { id: 'console-switch-oled', name: 'Switch OLED', category: 'Consola', stock: 7, price: 329990, status: 'ok' },
    { id: 'tablet-air-11', name: 'Tablet Air 11"', category: 'Tablet', stock: 4, price: 399990, status: 'low' },
    { id: 'smartwatch-pulse', name: 'Smartwatch Pulse', category: 'Wearable', stock: 18, price: 179990, status: 'ok' },
    { id: 'audio-anc-max', name: 'Audio ANC Max', category: 'Audio', stock: 9, price: 149990, status: 'ok' },
  ]);

  readonly categories = computed(() => {
    const cats = [...new Set(this.products().map((p) => p.category))];
    return ['Todos', ...cats];
  });

  readonly filteredProducts = computed(() => {
    const term = this.searchTerm().toLowerCase();
    const cat = this.filterCategory();
    return this.products().filter((p) => {
      const matchCat = cat === 'Todos' || p.category === cat;
      const matchTerm = p.name.toLowerCase().includes(term) || p.category.toLowerCase().includes(term);
      return matchCat && matchTerm;
    });
  });

  readonly stats = computed(() => {
    const all = this.products();
    return {
      total: all.length,
      ok: all.filter((p) => p.status === 'ok').length,
      low: all.filter((p) => p.status === 'low').length,
      critical: all.filter((p) => p.status === 'critical').length,
      totalValue: all.reduce((sum, p) => sum + p.price * p.stock, 0),
    };
  });

  onSearch(event: Event) {
    const target = event.target as HTMLInputElement;
    this.searchTerm.set(target.value);
  }

  setCategory(cat: string) {
    this.filterCategory.set(cat);
  }

  getStatusLabel(status: ProductStock['status']): string {
    return { ok: 'OK', low: 'Stock bajo', critical: 'Sin stock' }[status];
  }

  formatPrice(price: number): string {
    return price.toLocaleString('es-CL');
  }
}
