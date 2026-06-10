import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
  OnInit,
  signal,
} from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { CartService } from '../../services/cart.service';
import {
  CATALOG_FILTERS,
  CATALOG_PRODUCTS,
  CatalogCategory,
  CatalogProduct,
  CATEGORY_LABELS,
  productMatchesCategory,
  resolveCategoryFilter,
  ShopStyleGroup,
} from '../../data/products';

type ActiveFilter = CatalogCategory | 'todos' | ShopStyleGroup;

@Component({
  selector: 'app-catalogo',
  imports: [RouterLink, CommonModule],
  templateUrl: './catalogo.html',
  styleUrl: './catalogo.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Catalogo implements OnInit {
  private cartService = inject(CartService);
  private route = inject(ActivatedRoute);
  private router = inject(Router);

  private readonly addClickGuardMs = 280;
  private readonly addFeedbackMs = 420;
  private readonly pageSize = 9;
  private readonly addLocks = signal<Record<string, true>>({});
  private readonly addFeedbackCounts = signal<Record<string, number>>({});
  private readonly addFeedbackTimers = new Map<string, ReturnType<typeof setTimeout>>();

  readonly products = CATALOG_PRODUCTS;
  readonly filters = CATALOG_FILTERS;
  readonly currentPage = signal(1);
  readonly activeCategory = signal<ActiveFilter>('todos');
  readonly offersOnly = signal(false);

  readonly filteredProducts = computed(() => {
    const category = this.activeCategory();
    const offers = this.offersOnly();

    return this.products.filter((product) => {
      const matchCategory = productMatchesCategory(product, category);
      const matchOffer = !offers || product.isOffer === true || product.badge === 'Oferta';
      return matchCategory && matchOffer;
    });
  });

  readonly totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filteredProducts().length / this.pageSize))
  );

  readonly pageNumbers = computed(() =>
    Array.from({ length: this.totalPages() }, (_value, index) => index + 1)
  );

  readonly paginatedProducts = computed(() => {
    const start = (this.currentPage() - 1) * this.pageSize;
    return this.filteredProducts().slice(start, start + this.pageSize);
  });

  readonly activeFilterLabel = computed(() => {
    if (this.offersOnly() && this.activeCategory() === 'todos') {
      return 'Ofertas activas';
    }

    if (this.activeCategory() === 'todos') {
      return 'Todos los productos';
    }

    if (this.activeCategory() in CATEGORY_LABELS) {
      return CATEGORY_LABELS[this.activeCategory() as CatalogCategory];
    }

    const groupLabels: Record<ShopStyleGroup, string> = {
      'pc-components': 'PC Components',
      'smart-life': 'Smart Life',
      consolas: 'Consolas',
      movilidad: 'Movilidad',
    };

    return groupLabels[this.activeCategory() as ShopStyleGroup] ?? 'Catálogo';
  });

  readonly resultCount = computed(() => this.filteredProducts().length);

  ngOnInit(): void {
    this.route.queryParamMap.subscribe((params) => {
      const categoria = resolveCategoryFilter(params.get('categoria'));
      const ofertas = params.get('ofertas') === 'true';

      this.activeCategory.set(categoria);
      this.offersOnly.set(ofertas);
      this.currentPage.set(1);
    });
  }

  setCategory(slug: CatalogCategory | 'todos'): void {
    this.navigateWithFilters(slug, this.offersOnly());
  }

  toggleOffersOnly(): void {
    this.navigateWithFilters(this.activeCategory(), !this.offersOnly());
  }

  clearFilters(): void {
    this.navigateWithFilters('todos', false);
  }

  isCategoryActive(slug: CatalogCategory | 'todos'): boolean {
    return this.activeCategory() === slug && !this.isGroupFilterActive();
  }

  private isGroupFilterActive(): boolean {
    const active = this.activeCategory();
    return active !== 'todos' && !(active in CATEGORY_LABELS);
  }

  private navigateWithFilters(category: ActiveFilter, offers: boolean): void {
    const queryParams: Record<string, string | null> = {
      categoria: category === 'todos' ? null : category,
      ofertas: offers ? 'true' : null,
    };

    void this.router.navigate(['/catalogo'], {
      queryParams,
      queryParamsHandling: 'merge',
      replaceUrl: true,
    });
  }

  addToCart(product: CatalogProduct) {
    if (this.isAddLocked(product.id)) {
      return;
    }

    this.lockAdd(product.id);
    this.revealAddFeedback(product.id);
    void this.cartService.addItem({
      id: product.id,
      name: product.name,
      price: product.price,
    });
  }

  isAddLocked(productId: string): boolean {
    return Boolean(this.addLocks()[productId]);
  }

  isAddFeedbackVisible(productId: string): boolean {
    return this.getAddFeedbackCount(productId) > 0;
  }

  getAddFeedbackCount(productId: string): number {
    return this.addFeedbackCounts()[productId] ?? 0;
  }

  private lockAdd(productId: string): void {
    this.addLocks.update((current) => ({
      ...current,
      [productId]: true,
    }));

    setTimeout(() => {
      this.addLocks.update((current) => {
        if (!current[productId]) {
          return current;
        }

        const { [productId]: _removed, ...rest } = current;
        return rest;
      });
    }, this.addClickGuardMs);
  }

  private revealAddFeedback(productId: string): void {
    this.addFeedbackCounts.update((current) => ({
      ...current,
      [productId]: (current[productId] ?? 0) + 1,
    }));

    const existingTimer = this.addFeedbackTimers.get(productId);
    if (existingTimer) {
      clearTimeout(existingTimer);
    }

    const timer = setTimeout(() => {
      this.addFeedbackCounts.update((current) => {
        if (!current[productId]) {
          return current;
        }

        const { [productId]: _removed, ...rest } = current;
        return rest;
      });
      this.addFeedbackTimers.delete(productId);
    }, this.addFeedbackMs);

    this.addFeedbackTimers.set(productId, timer);
  }

  trackByProductId(_index: number, product: CatalogProduct): string {
    return product.id;
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.totalPages()) {
      return;
    }

    this.currentPage.set(page);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  goToNextPage(): void {
    this.goToPage(this.currentPage() + 1);
  }

  goToPreviousPage(): void {
    this.goToPage(this.currentPage() - 1);
  }
}
