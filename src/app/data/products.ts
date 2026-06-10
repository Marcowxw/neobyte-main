export type CatalogCategory =
  | 'componentes-pc'
  | 'celulares'
  | 'consolas'
  | 'tablets'
  | 'audio-wearables'
  | 'laptops'
  | 'monitores'
  | 'perifericos'
  | 'networking';

export type ShopStyleGroup = 'pc-components' | 'smart-life' | 'consolas' | 'movilidad';

export interface CatalogProduct {
  id: string;
  name: string;
  price: number;
  badge: string;
  description: string;
  category: CatalogCategory;
  isOffer?: boolean;
  image: {
    src: string;
    alt: string;
    photo?: boolean;
  };
}

export const CATALOG_FILTERS: { slug: CatalogCategory | 'todos'; label: string }[] = [
  { slug: 'todos', label: 'Todos los productos' },
  { slug: 'componentes-pc', label: 'Componentes PC' },
  { slug: 'celulares', label: 'Celulares' },
  { slug: 'consolas', label: 'Consolas' },
  { slug: 'tablets', label: 'Tablets' },
  { slug: 'audio-wearables', label: 'Audio y Wearables' },
  { slug: 'laptops', label: 'Laptops' },
  { slug: 'monitores', label: 'Monitores' },
  { slug: 'perifericos', label: 'Perifericos' },
  { slug: 'networking', label: 'Networking' },
];

/** Grupos usados por las tarjetas "Explora por estilo de compra" en el home */
export const SHOP_STYLE_GROUPS: Record<ShopStyleGroup, CatalogCategory[]> = {
  'pc-components': ['componentes-pc', 'monitores', 'perifericos', 'laptops'],
  'smart-life': ['networking', 'audio-wearables'],
  consolas: ['consolas'],
  movilidad: ['celulares', 'tablets', 'audio-wearables'],
};

export const CATEGORY_LABELS: Record<CatalogCategory, string> = {
  'componentes-pc': 'Componentes PC',
  celulares: 'Celulares',
  consolas: 'Consolas',
  tablets: 'Tablets',
  'audio-wearables': 'Audio y Wearables',
  laptops: 'Laptops',
  monitores: 'Monitores',
  perifericos: 'Perifericos',
  networking: 'Networking',
};

export function resolveCategoryFilter(slug: string | null): CatalogCategory | 'todos' | ShopStyleGroup {
  if (!slug || slug === 'todos') {
    return 'todos';
  }

  if (slug in SHOP_STYLE_GROUPS) {
    return slug as ShopStyleGroup;
  }

  const valid = CATALOG_FILTERS.some((f) => f.slug === slug);
  return valid ? (slug as CatalogCategory) : 'todos';
}

export function productMatchesCategory(
  product: CatalogProduct,
  filter: CatalogCategory | 'todos' | ShopStyleGroup
): boolean {
  if (filter === 'todos') {
    return true;
  }

  if (filter in SHOP_STYLE_GROUPS) {
    return SHOP_STYLE_GROUPS[filter as ShopStyleGroup].includes(product.category);
  }

  return product.category === filter;
}

export const CATALOG_PRODUCTS: CatalogProduct[] = [
  {
    id: 'rtx-5070-ti',
    name: 'RTX 5070 Ti 16GB',
    price: 799000,
    badge: 'Nuevo',
    description: 'Ray tracing avanzado, DLSS y rendimiento premium para 2K/4K.',
    category: 'componentes-pc',
    image: {
      src: '/images/rtx-5070-ti.png',
      alt: 'Tarjeta gráfica NVIDIA RTX 5070 Ti',
      photo: true,
    },
  },
  {
    id: 'ryzen-9900x',
    name: 'Ryzen 9 9900X',
    price: 529000,
    badge: 'Top ventas',
    description: 'Procesador AMD Ryzen 9000 Series con 12 núcleos para gaming y creación.',
    category: 'componentes-pc',
    image: {
      src: '/images/ryzen-9900x.png',
      alt: 'Procesador AMD Ryzen 9 9900X en empaque retail',
      photo: true,
    },
  },
  {
    id: 'monitor-32-qhd',
    name: 'Gigabyte 32" QHD 165Hz',
    price: 299000,
    badge: 'Oferta',
    description: 'Panel curvo 1500R, 1ms de respuesta y 165Hz para gaming competitivo.',
    category: 'monitores',
    isOffer: true,
    image: {
      src: '/images/monitor-32-qhd.png',
      alt: 'Monitor gaming Gigabyte 32 pulgadas QHD 165Hz curvo',
      photo: true,
    },
  },
  {
    id: 'monitor-27-fhd',
    name: 'Monitor 27" FHD 144Hz',
    price: 189000,
    badge: 'Gaming',
    description: 'Panel IPS con FreeSync y soporte VESA para setups compactos.',
    category: 'monitores',
    image: {
      src: '/images/monitor-32-qhd.png',
      alt: 'Monitor gamer de 27 pulgadas Full HD',
      photo: true,
    },
  },
  {
    id: 'kit-perifericos',
    name: 'Kit Teclado + Mouse Pro',
    price: 119000,
    badge: 'Bundle',
    description: 'Switches mecánicos hot-swap y sensor óptico de alta precisión.',
    category: 'perifericos',
    image: {
      src: '/images/kit_perifericos.png',
      alt: 'Kit profesional de teclado mecánico y mouse',
      photo: true,
    },
  },
  {
    id: 'mouse-ergonomic',
    name: 'Mouse Ergonómico Pro X',
    price: 69000,
    badge: 'Periféricos',
    description: 'Diseño vertical, 8 botones programables y peso ajustable.',
    category: 'perifericos',
    image: {
      src: '/images/razer_mouse.png',
      alt: 'Mouse ergonómico inalámbrico para productividad',
      photo: true,
    },
  },
  {
    id: 'hub-domotica',
    name: 'Hub Domótica Wi-Fi 6',
    price: 99000,
    badge: 'Smart',
    description: 'Conecta tu ecosistema IoT con seguridad y automatizaciones avanzadas.',
    category: 'networking',
    image: {
      src: '/images/hub_domotica.png',
      alt: 'Hub de domótica inteligente Wi-Fi 6',
      photo: true,
    },
  },
  {
    id: 'router-mesh-wifi6',
    name: 'Router Mesh Wi-Fi 6E',
    price: 149000,
    badge: 'Networking',
    description: 'Cobertura hasta 300 m² con tres nodos y control desde app móvil.',
    category: 'networking',
    image: {
      src: '/images/router.png',
      alt: 'Sistema de red mesh Wi-Fi 6E para hogar',
      photo: true,
    },
  },
  {
    id: 'laptop-creator',
    name: 'Laptop Creator 16',
    price: 1499000,
    badge: 'Pro',
    description: 'Pantalla calibrada, GPU dedicada y almacenamiento NVMe de alta velocidad.',
    category: 'laptops',
    image: {
      src: '/images/laptop.png',
      alt: 'Laptop de 16" profesional para creadores',
      photo: true,
    },
  },
  {
    id: 'laptop-gaming-15',
    name: 'Laptop Gaming 15" RTX',
    price: 1199000,
    badge: 'Gaming',
    description: 'Pantalla 165Hz, RTX dedicada y teclado RGB por zona.',
    category: 'laptops',
    image: {
      src: '/images/Laptop_15.png',
      alt: 'Laptop gamer de 15 pulgadas con tarjeta gráfica dedicada',
      photo: true,
    },
  },
  {
    id: 'smartphone-neo-x',
    name: 'Smartphone Neo X 256GB',
    price: 689000,
    badge: 'Celulares',
    description: 'Pantalla OLED 120Hz, cámara de 50MP y carga rápida de 65W.',
    category: 'celulares',
    image: {
      src: '/images/telefono_neox.png',
      alt: 'Smartphone Neo X de 256GB',
      photo: true,
    },
  },
  {
    id: 'smartphone-andes-pro',
    name: 'Andes Pro 5G 512GB',
    price: 879000,
    badge: 'Top ventas',
    description: 'Chip de última generación, batería para todo el día y zoom óptico 3x.',
    category: 'celulares',
    image: {
      src: '/images/telefono_andes.png',
      alt: 'Celular Andes Pro 5G de 512GB',
      photo: true,
    },
  },
  {
    id: 'smartphone-lite-128',
    name: 'Neo Lite 128GB',
    price: 349000,
    badge: 'Oferta',
    description: 'Equilibrio perfecto entre precio y rendimiento con 5G y NFC.',
    category: 'celulares',
    isOffer: true,
    image: {
      src: '/images/telefono_lite.png',
      alt: 'Smartphone económico Neo Lite de 128GB',
      photo: true,
    },
  },
  {
    id: 'console-ps5-slim',
    name: 'Consola PS5 Slim 1TB',
    price: 559000,
    badge: 'Consolas',
    description: 'SSD ultrarrápido, juego en 4K y control inmersivo de nueva generación.',
    category: 'consolas',
    image: {
      src: '/images/console-ps5-slim.svg',
      alt: 'Consola PlayStation 5 Slim de 1TB',
    },
  },
  {
    id: 'console-switch-oled',
    name: 'Consola Switch OLED',
    price: 339000,
    badge: 'Portátil',
    description: 'Pantalla OLED vibrante y modo híbrido para jugar donde quieras.',
    category: 'consolas',
    image: {
      src: '/images/console-switch-oled.svg',
      alt: 'Consola Nintendo Switch OLED',
    },
  },
  {
    id: 'console-xbox-series-x',
    name: 'Xbox Series X 1TB',
    price: 579000,
    badge: 'Oferta',
    description: '12 teraflops de potencia, Quick Resume y Game Pass ready.',
    category: 'consolas',
    isOffer: true,
    image: {
      src: '/images/console-ps5-slim.svg',
      alt: 'Consola Xbox Series X de 1TB',
    },
  },
  {
    id: 'tablet-air-11',
    name: 'Tablet Air 11 128GB',
    price: 429000,
    badge: 'Tablets',
    description: 'Ideal para estudio y trabajo: liviana, potente y con stylus incluido.',
    category: 'tablets',
    image: {
      src: '/images/tablet-air-11.svg',
      alt: 'Tablet Air de 11 pulgadas y 128GB',
    },
  },
  {
    id: 'tablet-pro-12',
    name: 'Tablet Pro 12.9" 256GB',
    price: 699000,
    badge: 'Pro',
    description: 'Pantalla de alta resolución y compatibilidad con teclado magnético.',
    category: 'tablets',
    image: {
      src: '/images/tablet-air-11.svg',
      alt: 'Tablet profesional de 12.9 pulgadas',
    },
  },
  {
    id: 'smartwatch-pulse',
    name: 'Smartwatch Pulse Pro',
    price: 189000,
    badge: 'Wearables',
    description: 'Monitoreo de salud, GPS, llamadas bluetooth y resistencia al agua.',
    category: 'audio-wearables',
    image: {
      src: '/images/smartwatch-pulse.svg',
      alt: 'Reloj inteligente Smartwatch Pulse Pro',
    },
  },
  {
    id: 'audio-anc-max',
    name: 'Audífonos ANC Max',
    price: 159000,
    badge: 'Audio',
    description: 'Cancelación activa de ruido y hasta 40 horas de autonomía.',
    category: 'audio-wearables',
    image: {
      src: '/images/audio-anc-max.svg',
      alt: 'Audífonos inalámbricos con cancelación de ruido',
    },
  },
];

export const PRODUCT_IMAGE_BY_ID = Object.fromEntries(
  CATALOG_PRODUCTS.map((p) => [p.id, p.image.src])
) as Record<string, string>;
