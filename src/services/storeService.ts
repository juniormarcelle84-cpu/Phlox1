import { Product, Order, SalesStats } from '../types';

export interface TogoCityOption {
  name: string;
  deliveryFee: number;
  deliveryDelay: {
    fr: string;
    en: string;
  };
}

export const TOGO_CITIES: TogoCityOption[] = [
  {
    name: 'Lomé',
    deliveryFee: 1000,
    deliveryDelay: { fr: '24h (Livraison express)', en: '24h (Express delivery)' }
  },
  {
    name: 'Kpalimé',
    deliveryFee: 2500,
    deliveryDelay: { fr: '48h (Colis sécurisé)', en: '48h (Secure parcel)' }
  },
  {
    name: 'Atakpamé',
    deliveryFee: 2500,
    deliveryDelay: { fr: '48h (Colis sécurisé)', en: '48h (Secure parcel)' }
  },
  {
    name: 'Sokodé',
    deliveryFee: 3000,
    deliveryDelay: { fr: '48h à 72h', en: '48h to 72h' }
  },
  {
    name: 'Kara',
    deliveryFee: 3500,
    deliveryDelay: { fr: '48h à 72h', en: '48h to 72h' }
  },
  {
    name: 'Dapaong',
    deliveryFee: 4000,
    deliveryDelay: { fr: '72h', en: '72h' }
  }
];

export const FALLBACK_PRODUCT_IMAGE = '/src/assets/images/hero_headphone_1791055757059.jpg';

const INITIAL_PRODUCTS: Product[] = [
  {
    id: "headphone-1",
    name: "Beats Solo Wireless Pro",
    descriptionEn: "Experience premium sound with pure adaptive noise cancelling, dual-beam forming mics, and up to 40 hours of battery life. Designed with professional comfort for music creators and tech lovers.",
    descriptionFr: "Découvrez un son de qualité supérieure grâce à la réduction active du bruit pure adaptative, aux deux micros de formation de faisceaux et à une autonomie allant jusqu'à 40 heures. Conçu pour un confort professionnel.",
    price: 145000,
    originalPrice: 185000,
    category: "earphone",
    image: "/src/assets/images/hero_headphone_1791055757059.jpg",
    gallery: [
      "/src/assets/images/hero_headphone_1791055757059.jpg",
      "/src/assets/images/category_earphone_1791055767919.jpg"
    ],
    variants: [
      {
        nameEn: "Color",
        nameFr: "Couleur",
        values: ["Carbon Black", "Flame Red", "Premium Silver"]
      }
    ],
    stock: 12,
    isPopular: true,
    isPromo: true,
    promoText: "Summer Sale -20%"
  },
  {
    id: "earphone-1",
    name: "Phlox Earphone Gaming TWS",
    descriptionEn: "Low latency wireless gaming earbuds with surround sound, dual microphone, waterproof design and custom red/black futuristic gaming box.",
    descriptionFr: "Écouteurs de jeu sans fil à faible latence avec son surround, double microphone, conception étanche et boîtier de jeu futuriste rouge/noir.",
    price: 25000,
    originalPrice: 35000,
    category: "earphone",
    image: "/src/assets/images/category_earphone_1791055767919.jpg",
    gallery: ["/src/assets/images/category_earphone_1791055767919.jpg"],
    variants: [
      {
        nameEn: "Edition",
        nameFr: "Édition",
        values: ["Standard Red", "Shadow Black"]
      }
    ],
    stock: 25,
    isPopular: true,
    isPromo: false
  },
  {
    id: "watch-1",
    name: "Phlox Smartwatch Active V2",
    descriptionEn: "Next-gen smartwatch featuring high-contrast AMOLED yellow glow, full fitness tracking, heart rate, sleep monitor, and WhatsApp call notifications. Water resistant.",
    descriptionFr: "Montre connectée de nouvelle génération dotée d'un écran AMOLED jaune à fort contraste, d'un suivi complet de la condition physique, du rythme cardiaque, du sommeil et de notifications d'appels WhatsApp. Résistante à l'eau.",
    price: 49000,
    originalPrice: 65000,
    category: "watch",
    image: "/src/assets/images/category_watch_1791055778925.jpg",
    gallery: ["/src/assets/images/category_watch_1791055778925.jpg"],
    variants: [
      {
        nameEn: "Strap",
        nameFr: "Bracelet",
        values: ["Neon Yellow Silicone", "Sport Black Fabric"]
      }
    ],
    stock: 18,
    isPopular: true,
    isPromo: true,
    promoText: "Exclusivité"
  },
  {
    id: "laptop-1",
    name: "Phlox Extreme Gaming Laptop",
    descriptionEn: "High-performance monster packed with RTX 4070, Core i9, 32GB RAM, 1TB SSD, and responsive 240Hz screen. Sleek ultra-slim metal case with customized red backlighting.",
    descriptionFr: "Monstre de haute performance équipé d'une RTX 4070, Core i9, 32 Go de RAM, 1 To SSD, et un écran 240Hz ultra-réactif. Boîtier en métal ultra-fin avec rétroéclairage rouge.",
    price: 950000,
    originalPrice: 1100000,
    category: "laptop",
    image: "/src/assets/images/category_laptop_1791055787925.jpg",
    gallery: ["/src/assets/images/category_laptop_1791055787925.jpg"],
    variants: [
      {
        nameEn: "Keyboard Layout",
        nameFr: "Disposition Clavier",
        values: ["AZERTY (FR)", "QWERTY (US)"]
      }
    ],
    stock: 5,
    isPopular: true,
    isPromo: false
  },
  {
    id: "console-1",
    name: "Phlox Play Console 5 Pro",
    descriptionEn: "Experience real 4K gameplay, lightning-fast loading speed with ultra-high-speed SSD, deep immersion with support for haptic feedback, and breathtaking next-gen gaming catalog.",
    descriptionFr: "Découvrez un gameplay 4K fluide, des temps de chargement ultra-rapides grâce à un SSD ultra-haute vitesse, et une immersion profonde grâce au retour haptique.",
    price: 420000,
    category: "console",
    image: "/src/assets/images/category_console_1791055796776.jpg",
    gallery: ["/src/assets/images/category_console_1791055796776.jpg"],
    variants: [
      {
        nameEn: "Bundle",
        nameFr: "Pack",
        values: ["1 Controller Solo", "2 Controllers + FIFA 26"]
      }
    ],
    stock: 8,
    isPopular: true,
    isPromo: false
  },
  {
    id: "vr-1",
    name: "Phlox VR Vision Quest",
    descriptionEn: "Stand-alone Virtual Reality Headset. Crystal clear lenses, immersive surround sound, real-time hand-tracking, and ergonomic strap for extreme gaming and movies.",
    descriptionFr: "Casque de réalité virtuelle autonome. Lentilles ultra-nettes, son surround immersif, suivi des mains en temps réel et sangle ergonomique pour le jeu.",
    price: 295000,
    originalPrice: 350000,
    category: "vr",
    image: "/src/assets/images/category_vr_1791055806396.jpg",
    gallery: ["/src/assets/images/category_vr_1791055806396.jpg"],
    variants: [
      {
        nameEn: "Storage",
        nameFr: "Stockage",
        values: ["128 Go", "256 Go (+35.000 FCFA)"]
      }
    ],
    stock: 14,
    isPopular: false,
    isPromo: true,
    promoText: "Top Technologie"
  },
  {
    id: "speaker-1",
    name: "Phlox Cylindrical smart Bass Pro",
    descriptionEn: "Waterproof Bluetooth speaker with deep powerful bass, colorful light rings sync to music beat, and up to 24 hours playtime. Premium metallic mesh.",
    descriptionFr: "Enceinte Bluetooth étanche avec basses puissantes et profondes, anneaux lumineux synchronisés avec le rythme, et jusqu'à 24h d'autonomie.",
    price: 35000,
    category: "speaker",
    image: "/src/assets/images/category_speaker_1791055819762.jpg",
    gallery: ["/src/assets/images/category_speaker_1791055819762.jpg"],
    variants: [
      {
        nameEn: "Color",
        nameFr: "Couleur",
        values: ["Sapphire Blue", "Obsidian Black"]
      }
    ],
    stock: 30,
    isPopular: false,
    isPromo: false
  }
];

const INITIAL_ORDERS: Order[] = [
  {
    id: "PHX-1042",
    customerName: "Kofi Mensah",
    customerPhone: "+22890123456",
    customerAddress: "Boulevard du Mono, face Hôtel de la Paix",
    customerCity: "Lomé",
    paymentMethod: "TMONEY",
    txReference: "PG-TX-9845120",
    items: [
      {
        productId: "headphone-1",
        productName: "Beats Solo Wireless Pro",
        quantity: 1,
        price: 145000,
        selectedVariants: { "Couleur": "Flame Red" }
      }
    ],
    totalAmount: 146000,
    status: "paid",
    createdAt: "2026-09-28T14:22:00.000Z",
    paidAt: "2026-09-28T14:25:10.000Z",
    waSent: true
  },
  {
    id: "PHX-1043",
    customerName: "Afi Yayra",
    customerPhone: "+22893881122",
    customerAddress: "Près du Grand Marché d'Adawlato",
    customerCity: "Lomé",
    paymentMethod: "FLOOZ",
    items: [
      {
        productId: "watch-1",
        productName: "Phlox Smartwatch Active V2",
        quantity: 1,
        price: 49000,
        selectedVariants: { "Bracelet": "Neon Yellow Silicone" }
      },
      {
        productId: "earphone-1",
        productName: "Phlox Earphone Gaming TWS",
        quantity: 2,
        price: 25000,
        selectedVariants: { "Édition": "Standard Red" }
      }
    ],
    totalAmount: 100000,
    status: "pending",
    createdAt: "2026-10-02T09:15:00.000Z",
    waSent: false
  }
];

export const getProducts = (): Product[] => {
  const stored = localStorage.getItem('phlox_products');
  if (!stored) {
    localStorage.setItem('phlox_products', JSON.stringify(INITIAL_PRODUCTS));
    return INITIAL_PRODUCTS;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    console.error("Error parsing stored products, resetting to initial", e);
    localStorage.setItem('phlox_products', JSON.stringify(INITIAL_PRODUCTS));
    return INITIAL_PRODUCTS;
  }
};

export const saveProducts = (products: Product[]) => {
  localStorage.setItem('phlox_products', JSON.stringify(products));
};

export const getOrders = (): Order[] => {
  const stored = localStorage.getItem('phlox_orders');
  if (!stored) {
    localStorage.setItem('phlox_orders', JSON.stringify(INITIAL_ORDERS));
    return INITIAL_ORDERS;
  }
  try {
    return JSON.parse(stored);
  } catch (e) {
    console.error("Error parsing stored orders", e);
    return INITIAL_ORDERS;
  }
};

export const saveOrders = (orders: Order[]) => {
  localStorage.setItem('phlox_orders', JSON.stringify(orders));
};

export const getSalesStats = (): SalesStats => {
  const orders = getOrders();
  const validOrders = orders.filter(o => o.status !== 'cancelled');
  
  const totalRevenue = validOrders.reduce((sum, o) => sum + o.totalAmount, 0);
  const ordersCount = orders.length;
  const totalItemsSold = validOrders.reduce((sum, o) => {
    return sum + o.items.reduce((itemSum, item) => itemSum + item.quantity, 0);
  }, 0);

  return {
    totalRevenue,
    ordersCount,
    totalItemsSold
  };
};

export const addOrder = (orderData: Omit<Order, 'id' | 'createdAt' | 'status' | 'waSent'>): Order => {
  const orders = getOrders();
  const newOrder: Order = {
    ...orderData,
    id: `PHX-${Math.floor(1000 + Math.random() * 9000)}`,
    createdAt: new Date().toISOString(),
    status: 'pending',
    waSent: false
  };
  
  orders.unshift(newOrder);
  saveOrders(orders);

  // Register the pending order on the backend server as well
  fetch('/api/orders', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newOrder)
  }).catch(() => {
    // Ignore in offline mode
  });

  // Update stock of products
  const products = getProducts();
  newOrder.items.forEach(orderItem => {
    const product = products.find(p => p.id === orderItem.productId);
    if (product) {
      product.stock = Math.max(0, product.stock - orderItem.quantity);
    }
  });
  saveProducts(products);

  return newOrder;
};

export const buildPaidWhatsAppMessage = (order: Order): string => {
  const paymentLabel = order.paymentMethod === 'FLOOZ' ? 'Flooz Money' : 'Mixx by Yas';
  const fullAddress = order.customerCity
    ? `${order.customerAddress}, ${order.customerCity}`
    : order.customerAddress;

  const articlesList = order.items
    .map((item) => {
      const variants = Object.values(item.selectedVariants || {}).filter(Boolean).join(' ');
      const itemLabel = variants ? `${item.productName} (${variants})` : item.productName;
      return `${itemLabel} × ${item.quantity}`;
    })
    .join(', ');

  const formattedAmount = order.totalAmount.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');

  return [
    `✅ COMMANDE PAYÉE ${order.id}`,
    `Client : ${order.customerName} – ${order.customerPhone}`,
    `Adresse : ${fullAddress}`,
    `Articles : ${articlesList}`,
    `Total : ${formattedAmount} FCFA (${paymentLabel})`
  ].join('\n');
};

export const updateOrderStatus = (orderId: string, status: Order['status']): Order[] => {
  const orders = getOrders();
  const updated = orders.map(o => o.id === orderId ? { ...o, status } : o);
  saveOrders(updated);
  return updated;
};

export const deleteOrder = (orderId: string): Order[] => {
  const orders = getOrders();
  const updated = orders.filter(o => o.id !== orderId);
  saveOrders(updated);
  return updated;
};

export interface OrderReview {
  orderId: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export const getOrderReviews = (): OrderReview[] => {
  const stored = localStorage.getItem('phlox_order_reviews');
  try {
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const saveOrderReview = (orderId: string, rating: number, comment: string): OrderReview => {
  const reviews = getOrderReviews().filter(r => r.orderId !== orderId);
  const newReview: OrderReview = {
    orderId,
    rating,
    comment,
    createdAt: new Date().toISOString()
  };
  reviews.push(newReview);
  localStorage.setItem('phlox_order_reviews', JSON.stringify(reviews));
  return newReview;
};

// Wishlist
export const getWishlist = (): string[] => {
  const stored = localStorage.getItem('phlox_wishlist');
  try {
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

export const toggleWishlist = (productId: string): string[] => {
  const current = getWishlist();
  const index = current.indexOf(productId);
  if (index > -1) {
    current.splice(index, 1);
  } else {
    current.push(productId);
  }
  localStorage.setItem('phlox_wishlist', JSON.stringify(current));
  return current;
};

// Daily Search Quota (Free Plan: 5 AI searches/day)
export const getSearchQuota = (): { remaining: number; limit: number; dateString: string } => {
  const todayStr = new Date().toISOString().split('T')[0];
  const stored = localStorage.getItem('phlox_search_quota');
  
  if (stored) {
    try {
      const data = JSON.parse(stored);
      if (data.dateString === todayStr) {
        return data;
      }
    } catch {
      // ignore
    }
  }
  
  const initial = { remaining: 5, limit: 5, dateString: todayStr };
  localStorage.setItem('phlox_search_quota', JSON.stringify(initial));
  return initial;
};

export const decrementSearchQuota = (): { remaining: number; limit: number; dateString: string } => {
  const quota = getSearchQuota();
  quota.remaining = Math.max(0, quota.remaining - 1);
  localStorage.setItem('phlox_search_quota', JSON.stringify(quota));
  return quota;
};

export const resetSearchQuota = () => {
  const todayStr = new Date().toISOString().split('T')[0];
  const initial = { remaining: 5, limit: 5, dateString: todayStr };
  localStorage.setItem('phlox_search_quota', JSON.stringify(initial));
  return initial;
};

// User plan and mock pricing
export const getUserPlan = (): { plan: 'free' | 'pro'; proUntil?: string } => {
  const stored = localStorage.getItem('phlox_user_plan');
  if (stored) {
    try {
      return JSON.parse(stored);
    } catch {
      return { plan: 'free' };
    }
  }
  return { plan: 'free' };
};

export const subscribeToPro = () => {
  const expiry = new Date();
  expiry.setFullYear(expiry.getFullYear() + 1); // 1 year of pro!
  const proState = { plan: 'pro' as const, proUntil: expiry.toISOString() };
  localStorage.setItem('phlox_user_plan', JSON.stringify(proState));
  return proState;
};

export const cancelSubscription = () => {
  const freeState = { plan: 'free' as const };
  localStorage.setItem('phlox_user_plan', JSON.stringify(freeState));
  return freeState;
};

export interface PromoBannerConfig {
  discountBadge: string;
  headlineLeft: string;
  dateRange: string;
  productTag: string;
  titleRight: string;
  descriptionFr: string;
  descriptionEn: string;
  image: string;
  targetCategory: string;
}

const INITIAL_PROMO_BANNER: PromoBannerConfig = {
  discountBadge: '20 % OFF',
  headlineLeft: 'FINE SMILE',
  dateRange: 'Offre Spéciale Togo',
  productTag: 'Beats Solo Air',
  titleRight: 'Summer Sale',
  descriptionFr: 'Profitez de notre réduction exceptionnelle sur la gamme audio sans fil haute fidélité avec livraison express à Lomé et dans tout le Togo.',
  descriptionEn: 'Enjoy our special discount on the high-fidelity wireless audio lineup with express delivery in Lomé and across Togo.',
  image: '/src/assets/images/hero_headphone_1791055757059.jpg',
  targetCategory: 'earphone'
};

export const getPromoBanner = (): PromoBannerConfig => {
  const stored = localStorage.getItem('phlox_promo_banner');
  if (!stored) {
    localStorage.setItem('phlox_promo_banner', JSON.stringify(INITIAL_PROMO_BANNER));
    return INITIAL_PROMO_BANNER;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return INITIAL_PROMO_BANNER;
  }
};

export const savePromoBanner = (banner: PromoBannerConfig) => {
  localStorage.setItem('phlox_promo_banner', JSON.stringify(banner));
};

