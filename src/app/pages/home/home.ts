import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  inject,
  OnDestroy,
  OnInit,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import type { ShopStyleGroup } from '../../data/products';

type FeaturedProduct = {
  name: string;
  price: string;
  badge: string;
  image: string;
  alt: string;
};

type VisualCategory = {
  title: string;
  image: string;
  alt: string;
  label: string;
  catalogCategory: ShopStyleGroup;
};

@Component({
  selector: 'app-home',
  imports: [RouterLink],
  templateUrl: './home.html',
  styleUrl: './home.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Home implements OnInit, OnDestroy {
  private cdr = inject(ChangeDetectorRef);
  private timer: ReturnType<typeof setInterval> | null = null;

  /** Countdown expiry: 4 hours from page load */
  private expiresAt = Date.now() + 4 * 60 * 60 * 1000;

  countdown = '04:00:00';

  ngOnInit(): void {
    this.tick();
    this.timer = setInterval(() => this.tick(), 1000);
  }

  ngOnDestroy(): void {
    if (this.timer) clearInterval(this.timer);
  }

  private tick(): void {
    const remaining = Math.max(0, this.expiresAt - Date.now());
    const h = Math.floor(remaining / 3_600_000);
    const m = Math.floor((remaining % 3_600_000) / 60_000);
    const s = Math.floor((remaining % 60_000) / 1_000);
    this.countdown = `${this.pad(h)}:${this.pad(m)}:${this.pad(s)}`;
    this.cdr.markForCheck();
  }

  private pad(n: number): string {
    return n.toString().padStart(2, '0');
  }

  readonly featuredProducts: FeaturedProduct[] = [
    {
      name: 'GeForce RTX 5070 Ti',
      price: '$699',
      badge: 'Top GPU',
      image: '/images/rtx-5070-ti.png',
      alt: 'Tarjeta grafica GeForce RTX 5070 Ti',
    },
    {
      name: 'Ryzen 9 9900X',
      price: '$529',
      badge: 'Oferta CPU',
      image: '/images/ryzen-9900x.png',
      alt: 'Procesador AMD Ryzen 9 9900X',
    },
    {
      name: 'Gigabyte 32" QHD 165Hz',
      price: '$299',
      badge: 'Gaming',
      image: '/images/monitor-32-qhd.png',
      alt: 'Monitor gamer Gigabyte de 32 pulgadas QHD',
    },
    {
      name: 'Laptop Creator Pro',
      price: '$1,249',
      badge: 'Workstation',
      image: '/images/laptop-studio-vision.svg',
      alt: 'Laptop profesional para creadores de contenido',
    },
    {
      name: 'Kit Periféricos RGB',
      price: '$129',
      badge: 'Bundle',
      image: '/images/setup-neobyte-pro.svg',
      alt: 'Kit de perifericos RGB para setup gamer',
    },
    {
      name: 'Smartphone Neo X',
      price: '$549',
      badge: 'Nuevo',
      image: '/images/smartphone-neo-x.svg',
      alt: 'Smartphone Neo X color grafito',
    },
  ];

  readonly categories: VisualCategory[] = [
    {
      title: 'PC Components',
      label: 'Gaming y alto rendimiento',
      image: '/images/rtx-5070-ti.png',
      alt: 'Categoria de componentes de PC',
      catalogCategory: 'pc-components',
    },
    {
      title: 'Smart Life',
      label: 'IoT y dispositivos conectados',
      image: '/images/smart-home-nexus.svg',
      alt: 'Categoria de domotica y hogar inteligente',
      catalogCategory: 'smart-life',
    },
    {
      title: 'Consolas',
      label: 'Diversión para todos',
      image: '/images/console-ps5-slim.svg',
      alt: 'Categoria de consolas de videojuegos',
      catalogCategory: 'consolas',
    },
    {
      title: 'Movilidad',
      label: 'Celulares, tablet y wearables',
      image: '/images/tablet-air-11.svg',
      alt: 'Categoria de tecnologia movil',
      catalogCategory: 'movilidad',
    },
  ];
}
