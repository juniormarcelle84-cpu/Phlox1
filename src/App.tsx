import React, { useState, useEffect, useRef } from 'react';
import {
  Search,
  Compass,
  Heart,
  ClipboardList,
  ShoppingBag,
  MessageSquare,
  Truck,
  CreditCard,
  ShieldCheck,
  Headphones,
  Menu,
  X,
  User,
  Eye,
  Plus,
  Star,
  Send,
  CheckCircle2,
  Clock
} from 'lucide-react';
import brandConfig from './brand.config.json';
import { Product, CartItem } from './types';
import {
  getProducts,
  getWishlist,
  toggleWishlist,
  getUserPlan,
  FALLBACK_PRODUCT_IMAGE
} from './services/storeService';
import { trackReferralCode } from './services/affiliationService';
import { Lang, formatPrice } from './services/i18n';
import { CartDrawer } from './components/CartDrawer';
import { ProductDetailModal } from './components/ProductDetailModal';
import { DocumentModals } from './components/DocumentModals';
import { Footer } from './components/Footer';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { CutoutProductImage } from './components/CutoutHeadphone';
import { PaymentNetworkLogo } from './components/PaymentNetworkLogo';
import { CatalogView } from './pages/CatalogView';
import { BrowseView } from './pages/BrowseView';
import { WatchlistView } from './pages/WatchlistView';
import { ProjectsView } from './pages/ProjectsView';

export default function App() {
  // Langue française par défaut
  const [lang] = useState<Lang>('fr');

  // Global App States
  const [products, setProducts] = useState<Product[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [userPlan, setUserPlan] = useState<{ plan: 'free' | 'pro'; proUntil?: string }>({
    plan: 'free'
  });

  // Mobile burger menu state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Check if URL is requesting the PayGate Callback route
  const isPaygateRoute =
    typeof window !== 'undefined' &&
    (window.location.pathname.includes('paygate-callback') ||
      window.location.search.includes('paygate'));

  // Navigation state (search = Accueil + Boutique, browse = Catégories, watchlist = Favoris, projects = Suivi/PayGate/Admin)
  const [activeTab, setActiveTab] = useState<'search' | 'browse' | 'watchlist' | 'projects'>(
    isPaygateRoute ? 'projects' : 'search'
  );

  // Selected category state for quick filtering sync
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modals / Drawer States
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [activeDocType, setActiveDocType] = useState<
    'contact' | 'faq' | 'terms' | 'privacy' | 'delivery' | null
  >(null);

  // Countdown timer state for the Red Promo Banner
  const [countdown, setCountdown] = useState({ days: 4, hours: 14, minutes: 38, seconds: 52 });

  // Newsletter state
  const [newsletterEmail, setNewsletterEmail] = useState('');
  const [newsletterSubscribed, setNewsletterSubscribed] = useState(false);

  // Quick feedback state when adding a product from Best Sellers / Catalog
  const [justAddedId, setJustAddedId] = useState<string | null>(null);

  // Refs for smooth scrolling on the homepage
  const categoriesRef = useRef<HTMLDivElement>(null);
  const bestSellersRef = useRef<HTMLDivElement>(null);
  const catalogSectionRef = useRef<HTMLDivElement>(null);
  const reviewsSectionRef = useRef<HTMLDivElement>(null);
  const promoSectionRef = useRef<HTMLDivElement>(null);

  // Initialize App Data
  useEffect(() => {
    setProducts(getProducts());
    setWishlist(getWishlist());
    setUserPlan(getUserPlan());

    const storedCart = localStorage.getItem('phlox_cart');
    if (storedCart) {
      try {
        setCart(JSON.parse(storedCart));
      } catch (e) {
        console.error('Failed to parse cart storage', e);
      }
    }

    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const refCode = urlParams.get('ref') || urlParams.get('aff');
      if (refCode) {
        trackReferralCode(refCode);
      }
      if (urlParams.get('tab') === 'affiliation' || urlParams.get('view') === 'affiliation') {
        setActiveTab('projects');
      }
    }
  }, []);

  // Live countdown timer on Promo Banner
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev.seconds > 0) return { ...prev, seconds: prev.seconds - 1 };
        if (prev.minutes > 0) return { ...prev, minutes: prev.minutes - 1, seconds: 59 };
        if (prev.hours > 0) return { ...prev, hours: prev.hours - 1, minutes: 59, seconds: 59 };
        if (prev.days > 0)
          return { ...prev, days: prev.days - 1, hours: 23, minutes: 59, seconds: 59 };
        return { days: 4, hours: 12, minutes: 0, seconds: 0 };
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Update localStorage cart whenever cart state changes
  const saveCartToStorage = (updatedCart: CartItem[]) => {
    setCart(updatedCart);
    localStorage.setItem('phlox_cart', JSON.stringify(updatedCart));
  };

  // CART HANDLERS
  const handleAddToCart = (
    product: Product,
    selectedVariants: Record<string, string>,
    qty: number
  ) => {
    const serializedVariants = JSON.stringify(selectedVariants);
    const cartItemId = `${product.id}-${serializedVariants}`;

    const existingIndex = cart.findIndex((item) => item.id === cartItemId);
    const updatedCart = [...cart];

    if (existingIndex > -1) {
      updatedCart[existingIndex].quantity = Math.min(
        product.stock,
        updatedCart[existingIndex].quantity + qty
      );
    } else {
      updatedCart.push({
        id: cartItemId,
        product,
        selectedVariants,
        quantity: qty
      });
    }

    saveCartToStorage(updatedCart);
    setIsCartOpen(true);
  };

  // Quick 1-click Add to Cart from any product card
  const handleQuickAddToCart = (e: React.MouseEvent, product: Product) => {
    e.stopPropagation();
    if (product.stock <= 0) return;
    const defaultVariants: Record<string, string> = {};
    if (product.variants && product.variants.length > 0) {
      product.variants.forEach((v) => {
        if (v.values.length > 0) {
          defaultVariants[v.nameFr] = v.values[0];
        }
      });
    }
    handleAddToCart(product, defaultVariants, 1);
    setJustAddedId(product.id);
    setTimeout(() => setJustAddedId(null), 1500);
  };

  const handleUpdateCartQty = (itemId: string, newQty: number) => {
    const updated = cart.map((item) => {
      if (item.id === itemId) {
        return { ...item, quantity: Math.min(item.product.stock, newQty) };
      }
      return item;
    });
    saveCartToStorage(updated);
  };

  const handleRemoveCartItem = (itemId: string) => {
    const updated = cart.filter((item) => item.id !== itemId);
    saveCartToStorage(updated);
  };

  const handleClearCart = () => {
    saveCartToStorage([]);
  };

  // WISHLIST HANDLER
  const handleToggleWishlist = (id: string) => {
    const updated = toggleWishlist(id);
    setWishlist(updated);
  };

  // CATEGORY SELECTION HANDLER
  const handleSelectCategory = (catId: string) => {
    setSelectedCategory(catId);
    setActiveTab('search');
    setTimeout(() => {
      catalogSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 80);
  };

  const scrollToSection = (ref: React.RefObject<HTMLDivElement | null>) => {
    setMobileMenuOpen(false);
    if (activeTab !== 'search') {
      setActiveTab('search');
      setSelectedCategory('all');
      setTimeout(() => {
        ref.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } else {
      ref.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleNewsletterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newsletterEmail.trim()) return;
    setNewsletterSubscribed(true);
    setNewsletterEmail('');
    setTimeout(() => setNewsletterSubscribed(false), 5000);
  };

  // Highlighted Hero Beats Product
  const heroProduct = products.find((p) => p.id === 'headphone-1') || products[0];

  // Total item quantity inside cart
  const cartItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Best-sellers list (up to 8 products)
  const bestSellerProducts = products.slice(0, 8);

  return (
    <div className="min-h-screen flex flex-col bg-[#F5F5F7] text-[#1D1D1F] font-sans antialiased overflow-x-hidden">
      {/* =====================================================================
          1. HEADER — Conteneur w-full, padding 16px (px-4), max-w-[1200px] centré
      ===================================================================== */}
      <header className="sticky top-0 z-40 w-full bg-[#FFFFFF]/90 backdrop-blur-md border-b border-[#AAAAAA]/30 py-3.5 px-4">
        <div className="w-full max-w-[1200px] mx-auto flex items-center justify-between gap-2">
          {/* Left: Logo PHLOX espacé + Navigation Links */}
          <div className="flex items-center gap-6 lg:gap-10 min-w-0">
            <button
              onClick={() => {
                setActiveTab('search');
                setSelectedCategory('all');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-lg sm:text-2xl font-black uppercase tracking-[0.24em] text-[#1D1D1F] cursor-pointer shrink-0"
              aria-label="Accueil PHLOX TOGO"
            >
              PHLOX
            </button>

            <nav className="hidden md:flex items-center gap-6 lg:gap-8 text-sm font-bold uppercase tracking-wider text-[#6E6E73]">
              <button
                onClick={() => {
                  setActiveTab('search');
                  setSelectedCategory('all');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`transition-colors cursor-pointer ${
                  activeTab === 'search' && selectedCategory === 'all'
                    ? 'text-[#007AFF]'
                    : 'hover:text-[#1D1D1F]'
                }`}
              >
                Accueil
              </button>
              <button
                onClick={() => scrollToSection(catalogSectionRef)}
                className="hover:text-[#1D1D1F] transition-colors cursor-pointer"
              >
                Boutique
              </button>
              <button
                onClick={() => scrollToSection(reviewsSectionRef)}
                className="hover:text-[#1D1D1F] transition-colors cursor-pointer"
              >
                À propos
              </button>
              <button
                onClick={() => scrollToSection(promoSectionRef)}
                className="hover:text-[#1D1D1F] transition-colors cursor-pointer"
              >
                Offres
              </button>
              <button
                onClick={() => setActiveDocType('contact')}
                className="hover:text-[#1D1D1F] transition-colors cursor-pointer"
              >
                Contact
              </button>
            </nav>
          </div>

          {/* Right: Connexion, Recherche, Favoris, Panier & Burger Mobile */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <PWAInstallButton lang={lang} />

            {/* Profile / Suivi & Admin Avatar */}
            <button
              onClick={() => setActiveTab('projects')}
              className={`p-2 rounded-full transition-colors cursor-pointer ${
                activeTab === 'projects'
                  ? 'bg-[#007AFF] text-white'
                  : 'bg-[#FFFFFF] text-[#1D1D1F] border border-[#AAAAAA]/40 hover:bg-[#F5F5F7]'
              }`}
              title="Profil, Suivi Commandes & Administration"
              aria-label="Profil et Administration"
            >
              <User size={18} />
            </button>

            {/* Recherche */}
            <button
              onClick={() => scrollToSection(catalogSectionRef)}
              className="p-2 bg-[#FFFFFF] text-[#1D1D1F] border border-[#AAAAAA]/40 hover:text-[#007AFF] rounded-full transition-colors cursor-pointer"
              aria-label="Rechercher un produit"
              title="Rechercher un produit"
            >
              <Search size={18} />
            </button>

            {/* Favoris (cœur) */}
            <button
              onClick={() => setActiveTab('watchlist')}
              className="relative p-2 bg-[#FFFFFF] text-[#1D1D1F] border border-[#AAAAAA]/40 hover:text-[#007AFF] rounded-full transition-colors cursor-pointer"
              aria-label={`Favoris (${wishlist.length})`}
              title="Mes Favoris"
            >
              <Heart
                size={18}
                className={wishlist.length > 0 ? 'text-[#007AFF] fill-[#007AFF]' : ''}
              />
              {wishlist.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#007AFF] text-white text-[10px] font-black rounded-full flex items-center justify-center">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Panier */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 bg-[#FFFFFF] text-[#1D1D1F] border border-[#AAAAAA]/40 hover:text-[#007AFF] rounded-full transition-colors cursor-pointer"
              aria-label={`Ouvrir le panier (${cartItemCount} articles)`}
              title="Mon Panier"
            >
              <ShoppingBag size={18} />
              {cartItemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#007AFF] text-white text-[10px] font-black rounded-full flex items-center justify-center">
                  {cartItemCount}
                </span>
              )}
            </button>

            {/* Menu Burger sur Mobile */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 bg-[#FFFFFF] text-[#1D1D1F] border border-[#AAAAAA]/40 rounded-full transition-colors cursor-pointer"
              aria-label="Menu de navigation"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Menu Mobile Déroulant */}
        {mobileMenuOpen && (
          <div className="md:hidden w-full max-w-[1200px] mx-auto mt-3 pt-3 border-t border-[#AAAAAA]/30 flex flex-col gap-1.5 pb-2 animate-fadeIn bg-[#FFFFFF] border border-[#AAAAAA]/30 rounded-2xl p-3 shadow-md">
            <button
              onClick={() => {
                setActiveTab('search');
                setSelectedCategory('all');
                setMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-left px-3.5 py-2.5 rounded-full font-black uppercase text-xs text-[#1D1D1F] hover:bg-[#F5F5F7]"
            >
              Accueil
            </button>
            <button
              onClick={() => scrollToSection(catalogSectionRef)}
              className="text-left px-3.5 py-2.5 rounded-full font-bold text-xs text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7]"
            >
              Boutique & Catalogue
            </button>
            <button
              onClick={() => scrollToSection(reviewsSectionRef)}
              className="text-left px-3.5 py-2.5 rounded-full font-bold text-xs text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7]"
            >
              À propos & Avis
            </button>
            <button
              onClick={() => scrollToSection(promoSectionRef)}
              className="text-left px-3.5 py-2.5 rounded-full font-bold text-xs text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7]"
            >
              Offres & Promo
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setActiveDocType('contact');
              }}
              className="text-left px-3.5 py-2.5 rounded-full font-bold text-xs text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7]"
            >
              Contact
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setActiveTab('projects');
              }}
              className="text-left px-3.5 py-2.5 rounded-full font-black text-xs text-[#007AFF] bg-[#F5F5F7] flex items-center gap-2 uppercase tracking-wider"
            >
              <User size={16} />
              <span>Connexion / Suivi / Admin</span>
            </button>
          </div>
        )}
      </header>

      {/* =====================================================================
          MAIN CONTENT AREA
      ===================================================================== */}
      <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 pt-4 sm:pt-6 pb-[110px] space-y-10 sm:space-y-14">
        {activeTab === 'search' ? (
          <div className="space-y-10 sm:space-y-14 animate-fadeIn">
            {/* ===============================================================
                2. HERO APPLE MODERN (#FFFFFF SURFACE) — "Beats Solo" + "Wireless"
            =============================================================== */}
            {heroProduct && (
              <section className="relative bg-[#FFFFFF] rounded-[28px] px-5 sm:px-10 md:px-14 py-8 sm:py-14 md:py-18 overflow-hidden min-h-[380px] sm:min-h-[480px] md:min-h-[540px] flex flex-col justify-between border border-[#AAAAAA]/30 shadow-xs text-[#1D1D1F]">
                {/* Textes supérieurs : Beats Solo + Wireless + Filigrane discret HEADPHONE */}
                <div className="relative z-10 my-auto space-y-1 sm:space-y-2">
                  <p className="text-sm sm:text-xl md:text-2xl font-bold uppercase tracking-wider text-[#6E6E73]">
                    Beats Solo
                  </p>
                  <h1 className="text-3xl sm:text-6xl md:text-7xl font-black uppercase tracking-tight leading-none text-[#1D1D1F]">
                    Wireless
                  </h1>

                  {/* Mot géant HEADPHONE en filigrane discret */}
                  <div
                    aria-hidden="true"
                    className="text-[36px] sm:text-[78px] md:text-[112px] lg:text-[142px] font-black uppercase text-[#1D1D1F]/5 tracking-tight leading-[0.88] select-none pointer-events-none pt-1 sm:pt-2 truncate"
                  >
                    HEADPHONE
                  </div>

                  {/* Bouton bleu #007AFF "Acheter par catégorie" */}
                  <div className="pt-4 sm:pt-7 relative z-20">
                    <button
                      onClick={() => scrollToSection(categoriesRef)}
                      className="px-7 sm:px-9 py-3.5 sm:py-4 bg-[#007AFF] hover:bg-[#0071EB] text-white font-semibold uppercase tracking-wider text-xs sm:text-sm rounded-full transition-all hover:scale-105 cursor-pointer min-h-[48px] shadow-sm"
                    >
                      Acheter par catégorie
                    </button>
                  </div>
                </div>

                {/* Casque flottant au centre-droit */}
                <div
                  onClick={() => setSelectedProduct(heroProduct)}
                  className="relative md:absolute md:top-1/2 md:left-[54%] md:-translate-x-1/2 md:-translate-y-1/2 z-20 w-52 sm:w-76 md:w-[390px] lg:w-[430px] mx-auto my-3 md:my-0 cursor-pointer"
                  title="Voir le casque Beats Solo Wireless Pro"
                >
                  <div className="animate-float">
                    <CutoutProductImage
                      src={heroProduct.image}
                      alt={heroProduct.name}
                      className="w-full h-auto object-contain hover:scale-105 transition-transform duration-500 drop-shadow-md"
                    />
                  </div>
                </div>

                {/* Description en bas à droite */}
                <div className="relative z-20 self-end text-right max-w-[250px] space-y-1 pt-2">
                  <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#1D1D1F]">Description</h2>
                  <p className="text-[11px] sm:text-xs text-[#6E6E73] leading-relaxed">
                    Son studio haute fidélité avec réduction de bruit active, autonomie 40h et livraison rapide partout au Togo.
                  </p>
                </div>
              </section>
            )}

            {/* ===============================================================
                3. GRILLE BENTO DE 6 CARTES COLORÉES (28px radius)
            =============================================================== */}
            <section
              ref={categoriesRef}
              className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6"
            >
              {/* Carte 1 : Écouteurs (Card Surface #FFFFFF) */}
              <div
                onClick={() => handleSelectCategory('earphone')}
                className="group relative bg-[#FFFFFF] text-[#1D1D1F] rounded-[28px] p-5 sm:p-7 h-[250px] sm:h-[280px] overflow-hidden flex flex-col justify-end cursor-pointer transition-transform duration-300 hover:-translate-y-1 border border-[#AAAAAA]/30 shadow-xs"
              >
                <img
                  src="/src/assets/images/category_earphone_1791055767919.jpg"
                  alt="Écouteurs"
                  loading="lazy"
                  className="w-36 sm:w-44 h-36 sm:h-44 object-contain absolute -top-2 -right-2 z-10 group-hover:scale-110 transition-transform duration-500"
                />
                <div className="relative z-20 space-y-1">
                  <span className="text-xs text-[#6E6E73] font-semibold uppercase tracking-wider block">Profitez</span>
                  <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight leading-tight text-[#1D1D1F]">Avec</h3>
                  <div className="text-2xl sm:text-4xl font-black uppercase text-[#1D1D1F]/5 tracking-tight leading-none select-none pb-3 truncate">
                    ÉCOUTEURS
                  </div>
                  <button
                    type="button"
                    className="px-6 py-2 bg-[#007AFF] hover:bg-[#0071EB] text-white text-xs font-semibold uppercase tracking-wider rounded-full transition-transform group-hover:scale-105 cursor-pointer"
                  >
                    Acheter
                  </button>
                </div>
              </div>

              {/* Carte 2 : Montres (Card Surface #FFFFFF) */}
              <div
                onClick={() => handleSelectCategory('watch')}
                className="group relative bg-[#FFFFFF] text-[#1D1D1F] rounded-[28px] p-5 sm:p-7 h-[250px] sm:h-[280px] overflow-hidden flex flex-col justify-end cursor-pointer transition-transform duration-300 hover:-translate-y-1 border border-[#AAAAAA]/30 shadow-xs"
              >
                <img
                  src="/src/assets/images/category_watch_1791055778925.jpg"
                  alt="Montres connectées"
                  loading="lazy"
                  className="w-40 sm:w-48 h-40 sm:h-48 object-cover rounded-2xl absolute top-2 -right-4 z-10 group-hover:scale-110 transition-transform duration-500"
                />
                <div className="relative z-20 space-y-1">
                  <span className="text-xs text-[#6E6E73] font-bold uppercase tracking-wider block">Nouveau</span>
                  <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight leading-tight text-[#1D1D1F]">Objets</h3>
                  <div className="text-2xl sm:text-4xl font-black uppercase text-[#1D1D1F]/5 tracking-tight leading-none select-none pb-3 truncate">
                    MONTRES
                  </div>
                  <button
                    type="button"
                    className="px-6 py-2 bg-[#007AFF] text-white hover:bg-[#0071EB] text-xs font-semibold uppercase tracking-wider rounded-full transition-transform group-hover:scale-105 cursor-pointer"
                  >
                    Acheter
                  </button>
                </div>
              </div>

              {/* Carte 3 : Ordinateurs (Ink #1D1D1F — 2 colonnes) */}
              <div
                onClick={() => handleSelectCategory('laptop')}
                className="group relative bg-[#1D1D1F] text-white rounded-[28px] p-5 sm:p-8 h-[250px] sm:h-[280px] sm:col-span-2 lg:col-span-2 overflow-hidden flex flex-col justify-center cursor-pointer transition-transform duration-300 hover:-translate-y-1 shadow-sm"
              >
                <div className="w-40 sm:w-64 md:w-72 h-40 sm:h-56 absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center">
                  <CutoutProductImage
                    src="/src/assets/images/category_laptop_1791055787925.jpg"
                    alt="Ordinateurs portables"
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="relative z-20 space-y-1 max-w-[65%]">
                  <span className="text-xs text-white/80 font-bold uppercase tracking-wider block">Tendance</span>
                  <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight leading-tight text-white">Appareils</h3>
                  <div className="text-2xl sm:text-5xl font-black uppercase text-white/10 tracking-tight leading-none select-none pb-3 sm:pb-4 truncate">
                    ORDINATEURS
                  </div>
                  <button
                    type="button"
                    className="px-6 sm:px-7 py-2 sm:py-2.5 bg-[#007AFF] text-white hover:bg-[#0071EB] text-xs font-semibold uppercase tracking-wider rounded-full transition-transform group-hover:scale-105 cursor-pointer"
                  >
                    Acheter
                  </button>
                </div>
              </div>

              {/* Carte 4 : Consoles (Surface #FFFFFF — 2 colonnes) */}
              <div
                onClick={() => handleSelectCategory('console')}
                className="group relative bg-[#FFFFFF] text-[#1D1D1F] rounded-[28px] p-5 sm:p-8 h-[250px] sm:h-[280px] sm:col-span-2 lg:col-span-2 overflow-hidden flex flex-col justify-center cursor-pointer transition-transform duration-300 hover:-translate-y-1 border border-[#AAAAAA]/30 shadow-xs"
              >
                <img
                  src="/src/assets/images/category_console_1791055796776.jpg"
                  alt="Consoles de jeux"
                  loading="lazy"
                  className="w-40 sm:w-60 md:w-64 h-40 sm:h-60 object-contain absolute right-2 sm:right-8 top-1/2 -translate-y-1/2 z-10 group-hover:scale-105 transition-transform duration-500"
                />
                <div className="relative z-20 space-y-1 max-w-[65%]">
                  <span className="text-xs text-[#6E6E73] font-bold uppercase tracking-wider block">Meilleure</span>
                  <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight leading-tight text-[#1D1D1F]">
                    Gaming
                  </h3>
                  <div className="text-2xl sm:text-5xl font-black uppercase text-[#1D1D1F]/5 tracking-tight leading-none select-none pb-3 sm:pb-4 truncate">
                    CONSOLES
                  </div>
                  <button
                    type="button"
                    className="px-6 sm:px-7 py-2 sm:py-2.5 bg-[#007AFF] hover:bg-[#0071EB] text-white text-xs font-semibold uppercase tracking-wider rounded-full transition-transform group-hover:scale-105 cursor-pointer"
                  >
                    Acheter
                  </button>
                </div>
              </div>

              {/* Carte 5 : Casques VR (Surface #FFFFFF) */}
              <div
                onClick={() => handleSelectCategory('vr')}
                className="group relative bg-[#FFFFFF] text-[#1D1D1F] rounded-[28px] p-5 sm:p-7 h-[250px] sm:h-[280px] overflow-hidden flex flex-col justify-start cursor-pointer transition-transform duration-300 hover:-translate-y-1 border border-[#AAAAAA]/30 shadow-xs"
              >
                <div className="relative z-20 space-y-1">
                  <span className="text-xs text-[#6E6E73] font-bold uppercase tracking-wider block">Jouez</span>
                  <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight leading-tight text-[#1D1D1F]">Immersion</h3>
                  <div className="text-2xl sm:text-4xl font-black uppercase text-[#1D1D1F]/5 tracking-tight leading-none select-none pb-3 truncate">
                    CASQUES VR
                  </div>
                  <button
                    type="button"
                    className="px-6 py-2 bg-[#007AFF] text-white hover:bg-[#0071EB] text-xs font-semibold uppercase tracking-wider rounded-full transition-transform group-hover:scale-105 cursor-pointer"
                  >
                    Acheter
                  </button>
                </div>
                <div className="w-32 sm:w-40 h-32 sm:h-40 absolute -bottom-2 -right-2 z-10">
                  <CutoutProductImage
                    src="/src/assets/images/category_vr_1791055806396.jpg"
                    alt="Casques VR"
                    className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
              </div>

              {/* Carte 6 : Enceintes (Ink #1D1D1F) */}
              <div
                onClick={() => handleSelectCategory('speaker')}
                className="group relative bg-[#1D1D1F] text-white rounded-[28px] p-5 sm:p-7 h-[250px] sm:h-[280px] overflow-hidden flex flex-col justify-start cursor-pointer transition-transform duration-300 hover:-translate-y-1 shadow-sm"
              >
                <div className="relative z-20 space-y-1">
                  <span className="text-xs text-white/80 font-bold uppercase tracking-wider block">Nouveau</span>
                  <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight leading-tight text-white">Puissance</h3>
                  <div className="text-2xl sm:text-4xl font-black uppercase text-white/10 tracking-tight leading-none select-none pb-3 truncate">
                    ENCEINTES
                  </div>
                  <button
                    type="button"
                    className="px-6 py-2 bg-[#007AFF] text-white hover:bg-[#0071EB] text-xs font-semibold uppercase tracking-wider rounded-full transition-transform group-hover:scale-105 cursor-pointer"
                  >
                    Acheter
                  </button>
                </div>
                <div className="w-32 sm:w-40 h-32 sm:h-40 absolute -bottom-2 -right-2 z-10">
                  <CutoutProductImage
                    src="/src/assets/images/category_speaker_1791055819762.jpg"
                    alt="Enceintes Bluetooth"
                    className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
              </div>
            </section>

            {/* ===============================================================
                4. BARRE DE CONFIANCE 4 ICÔNES
            =============================================================== */}
            <section className="bg-[#FFFFFF] rounded-[28px] p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 border border-[#AAAAAA]/30 shadow-xs text-[#1D1D1F]">
              <div className="flex items-center gap-3.5">
                <Truck size={32} strokeWidth={1.8} className="text-[#007AFF] shrink-0" />
                <div>
                  <h4 className="text-sm font-black uppercase tracking-wide text-[#1D1D1F]">Livraison au Togo</h4>
                  <p className="text-xs text-[#6E6E73]">Expédition 24h à Lomé & régions</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5">
                <ShieldCheck size={32} strokeWidth={1.8} className="text-[#007AFF] shrink-0" />
                <div>
                  <h4 className="text-sm font-black uppercase tracking-wide text-[#1D1D1F]">Garantie Satisfaction</h4>
                  <p className="text-xs text-[#6E6E73]">Produits authentiques garantis</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5">
                <Headphones size={32} strokeWidth={1.8} className="text-[#007AFF] shrink-0" />
                <div>
                  <h4 className="text-sm font-black uppercase tracking-wide text-[#1D1D1F]">Support WhatsApp 24/7</h4>
                  <p className="text-xs text-[#6E6E73]">Assistance directe +228 93 20 60 03</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="flex items-center gap-1.5 shrink-0">
                  <PaymentNetworkLogo network="TMONEY" variant="mini" />
                  <PaymentNetworkLogo network="FLOOZ" variant="mini" />
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase tracking-wide text-[#1D1D1F]">
                    Paiement Sécurisé
                  </h4>
                  <p className="text-xs text-[#6E6E73]">Mixx by Yas / Flooz Money</p>
                </div>
              </div>
            </section>

            {/* ===============================================================
                5. BANNIÈRE PROMO INK (#1D1D1F)
            =============================================================== */}
            <section ref={promoSectionRef} className="pt-8 sm:pt-14 md:pt-18">
              <div className="relative bg-[#1D1D1F] rounded-[28px] px-5 sm:px-10 md:px-14 py-8 sm:py-12 text-white grid grid-cols-1 md:grid-cols-3 items-center gap-6 sm:gap-8 shadow-md">
                {/* Colonne Gauche : -20% + FINE SMILE + Compte à rebours */}
                <div className="space-y-3 z-20">
                  <span className="text-xs sm:text-sm font-black tracking-wider uppercase text-[#007AFF] block">
                    -20 % DE RÉDUCTION
                  </span>
                  <h2 className="text-3xl sm:text-6xl lg:text-7xl font-black uppercase leading-[0.92] tracking-tight text-white">
                    FINE
                    <br />
                    SMILE
                  </h2>

                  {/* Compte à rebours en direct */}
                  <div className="pt-2 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#AAAAAA] uppercase tracking-wider">
                      <Clock size={13} className="text-[#007AFF]" />
                      <span>Fin de l&apos;offre promo dans :</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="bg-[#2C2C2E] border border-white/10 rounded-2xl px-3 py-2 text-center min-w-[46px]">
                        <span className="block text-sm font-black text-[#007AFF] leading-none font-mono tabular-nums">
                          {String(countdown.days).padStart(2, '0')}
                        </span>
                        <span className="text-[9px] uppercase font-bold text-[#AAAAAA]">Jours</span>
                      </div>
                      <div className="bg-[#2C2C2E] border border-white/10 rounded-2xl px-3 py-2 text-center min-w-[46px]">
                        <span className="block text-sm font-black text-[#007AFF] leading-none font-mono tabular-nums">
                          {String(countdown.hours).padStart(2, '0')}
                        </span>
                        <span className="text-[9px] uppercase font-bold text-[#AAAAAA]">Heures</span>
                      </div>
                      <div className="bg-[#2C2C2E] border border-white/10 rounded-2xl px-3 py-2 text-center min-w-[46px]">
                        <span className="block text-sm font-black text-[#007AFF] leading-none font-mono tabular-nums">
                          {String(countdown.minutes).padStart(2, '0')}
                        </span>
                        <span className="text-[9px] uppercase font-bold text-[#AAAAAA]">Min</span>
                      </div>
                      <div className="bg-[#2C2C2E] border border-white/10 rounded-2xl px-3 py-2 text-center min-w-[46px]">
                        <span className="block text-sm font-black text-[#007AFF] leading-none font-mono tabular-nums">
                          {String(countdown.seconds).padStart(2, '0')}
                        </span>
                        <span className="text-[9px] uppercase font-bold text-[#AAAAAA]">Sec</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Colonne Centrale : Casque qui déborde */}
                <div className="relative flex items-center justify-center z-30 -mt-10 sm:-mt-24 md:-mt-32 md:-mb-10 pointer-events-none">
                  <div className="w-52 sm:w-72 md:w-[330px] lg:w-[370px] animate-float">
                    <CutoutProductImage
                      src={
                        heroProduct
                          ? heroProduct.image
                          : '/src/assets/images/hero_headphone_1791055757059.jpg'
                      }
                      alt="Casque Beats Solo Air Promo -20%"
                      tintRed={false}
                      className="w-full h-auto object-contain drop-shadow-xl"
                    />
                  </div>
                </div>

                {/* Colonne Droite : Beats Solo Air + Promo Spéciale + Bouton Acheter */}
                <div className="space-y-3 z-20 md:pl-4">
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#AAAAAA] block">
                    Beats Solo Air
                  </span>
                  <h3 className="text-2xl sm:text-4xl font-black uppercase tracking-tight leading-tight text-white">
                    Promo Spéciale
                  </h3>
                  <p className="text-xs sm:text-sm text-white/80 leading-relaxed max-w-sm">
                    Profitez d&apos;une remise immédiate de -20% sur nos équipements audio phares avec livraison rapide à Lomé et dans tout le Togo.
                  </p>
                  <div className="pt-1">
                    <button
                      onClick={() => {
                        if (heroProduct) setSelectedProduct(heroProduct);
                      }}
                      className="px-8 py-3.5 bg-[#007AFF] hover:bg-[#0071EB] text-white font-semibold uppercase tracking-wider text-xs sm:text-sm rounded-full transition-transform hover:scale-105 cursor-pointer min-h-[48px] shadow-sm"
                    >
                      Acheter
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* ===============================================================
                6. "MEILLEURES VENTES"
            =============================================================== */}
            <section ref={bestSellersRef} className="space-y-6 pt-2 text-[#1D1D1F]">
              <div className="text-center space-y-1.5">
                <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-[#1D1D1F]">
                  Meilleures Ventes
                </h2>
                <p className="text-xs sm:text-sm text-[#6E6E73] max-w-md mx-auto">
                  Les produits tendance préférés de nos clients à Lomé et partout au Togo
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                {bestSellerProducts.map((p) => {
                  const isOutOfStock = p.stock <= 0;
                  const isFav = wishlist.includes(p.id);
                  const isAdded = justAddedId === p.id;

                  return (
                    <div
                      key={p.id}
                      onClick={() => setSelectedProduct(p)}
                      className="group bg-[#FFFFFF] rounded-[28px] p-3 sm:p-4 flex flex-col justify-between cursor-pointer border border-[#AAAAAA]/30 shadow-xs transition-all text-[#1D1D1F]"
                    >
                      <div>
                        {/* Boîte Image #F5F5F7 */}
                        <div className="relative bg-[#F5F5F7] rounded-[20px] aspect-square overflow-hidden flex items-center justify-center mb-2.5">
                          {/* Badge Promo */}
                          {p.isPromo && (
                            <span className="absolute top-2 left-2 z-20 bg-[#007AFF] text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
                              Promo
                            </span>
                          )}

                          {/* Boutons Favoris (cœur) + Aperçu rapide */}
                          <div className="absolute top-2 right-2 z-20 flex flex-col gap-1.5">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleToggleWishlist(p.id);
                              }}
                              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#FFFFFF]/90 hover:bg-[#FFFFFF] text-[#1D1D1F]/70 hover:text-[#007AFF] border border-[#AAAAAA]/30 flex items-center justify-center cursor-pointer shadow-xs"
                              aria-label="Ajouter aux favoris"
                              title="Favoris"
                            >
                              <Heart
                                size={14}
                                className={isFav ? 'text-[#007AFF] fill-[#007AFF]' : ''}
                              />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProduct(p);
                              }}
                              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#FFFFFF]/90 hover:bg-[#FFFFFF] text-[#1D1D1F]/70 hover:text-[#007AFF] border border-[#AAAAAA]/30 flex items-center justify-center cursor-pointer shadow-xs"
                              aria-label="Aperçu rapide"
                              title="Aperçu rapide"
                            >
                              <Eye size={14} />
                            </button>
                          </div>

                          <img
                            src={p.image}
                            alt={p.name}
                            loading="lazy"
                            decoding="async"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = FALLBACK_PRODUCT_IMAGE;
                            }}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />

                          {isOutOfStock && (
                            <div className="absolute inset-0 bg-[#1D1D1F]/45 flex items-center justify-center p-2">
                              <span className="bg-[#FF3B30] text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full">
                                Rupture
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Nom sur 2 lignes max */}
                        <h3 className="text-xs sm:text-sm font-bold text-[#1D1D1F] group-hover:text-[#007AFF] transition-colors line-clamp-2 min-h-[2.25rem] sm:min-h-[2.5rem] leading-snug">
                          {p.name}
                        </h3>

                        {/* Prix dessous */}
                        <div className="mt-1 mb-2.5">
                          <div className="text-xs sm:text-sm font-black text-[#007AFF] font-mono tabular-nums">
                            {formatPrice(p.price)}
                          </div>
                          {p.originalPrice && (
                            <div className="text-[10px] sm:text-xs line-through text-[#AAAAAA] font-mono tabular-nums">
                              {formatPrice(p.originalPrice)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bouton "Ajouter" pleine largeur sous le prix */}
                      <button
                        type="button"
                        disabled={isOutOfStock}
                        onClick={(e) => handleQuickAddToCart(e, p)}
                        className={`w-full py-2.5 px-3 rounded-full text-xs font-semibold uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer min-h-[42px] ${
                          isOutOfStock
                            ? 'bg-[#AAAAAA]/35 text-[#1D1D1F]/40 cursor-not-allowed'
                            : isAdded
                            ? 'bg-[#34C759] text-white'
                            : 'bg-[#007AFF] hover:bg-[#0071EB] text-white shadow-xs'
                        }`}
                      >
                        <Plus size={14} />
                        <span>{isAdded ? 'Ajouté' : 'Ajouter'}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            </section>

            {/* ===============================================================
                CATALOGUE COMPLET INTERACTIF
            =============================================================== */}
            <section ref={catalogSectionRef} className="pt-4">
              <CatalogView
                products={products}
                lang={lang}
                onSelectProduct={setSelectedProduct}
                selectedCategory={selectedCategory}
                setSelectedCategory={setSelectedCategory}
                userPlan={userPlan}
                setUserPlan={setUserPlan}
                wishlist={wishlist}
                onToggleWishlist={handleToggleWishlist}
                onQuickAdd={handleQuickAddToCart}
                justAddedId={justAddedId}
              />
            </section>

            {/* ===============================================================
                SECTION AVIS CLIENTS + NEWSLETTER
            =============================================================== */}
            <section ref={reviewsSectionRef} className="space-y-10 pt-2 text-[#1D1D1F]">
              {/* Avis Clients */}
              <div className="space-y-6">
                <div className="text-center space-y-1.5">
                  <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-[#1D1D1F]">
                    Avis de nos Clients au Togo
                  </h2>
                  <p className="text-xs sm:text-sm text-[#6E6E73]">
                    Commandes livrées à Lomé, Kara et Kpalimé avec paiement Mixx by Yas et Flooz
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
                  {[
                    {
                      name: 'Koffi Mensah',
                      city: 'Lomé (Bè-Klikamé)',
                      comment:
                        'Livraison reçue en moins de 24h à Lomé ! Le son du casque est exceptionnel et j’ai pu régler facilement par Mixx by Yas.'
                    },
                    {
                      name: 'Afiwa Dogbé',
                      city: 'Kpalimé',
                      comment:
                        'Service client très réactif sur WhatsApp. La montre est conforme aux photos et le paiement Flooz via PayGate est super rapide.'
                    },
                    {
                      name: 'Edem Agbeko',
                      city: 'Kara',
                      comment:
                        'Colis bien emballé et expédié jusqu’à Kara en 48h. Je recommande PHLOX TOGO pour le sérieux et la qualité des produits.'
                    }
                  ].map((review, idx) => (
                    <div
                      key={idx}
                      className="bg-[#FFFFFF] rounded-[28px] p-5 sm:p-6 space-y-3 border border-[#AAAAAA]/30 shadow-xs text-[#1D1D1F]"
                    >
                      <div className="flex items-center gap-1 text-[#007AFF]">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={15} className="fill-[#007AFF] text-[#007AFF]" />
                        ))}
                      </div>
                      <p className="text-xs sm:text-sm text-[#6E6E73] leading-relaxed">
                        &ldquo;{review.comment}&rdquo;
                      </p>
                      <div className="pt-2 border-t border-[#AAAAAA]/20 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-[#1D1D1F]">{review.name}</div>
                          <div className="text-[#6E6E73]">{review.city}</div>
                        </div>
                        <span className="px-3 py-1 bg-[#007AFF]/10 text-[#007AFF] font-bold uppercase text-[10px] rounded-full">
                          Achat vérifié
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bannière Newsletter */}
              <div className="bg-[#1D1D1F] rounded-[28px] p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-md text-white">
                <div className="space-y-1.5 max-w-lg text-center md:text-left">
                  <span className="text-xs font-black uppercase tracking-wider text-[#007AFF]">
                    Newsletter PHLOX TOGO
                  </span>
                  <h3 className="text-xl sm:text-3xl font-black uppercase tracking-tight text-white">
                    Recevez nos offres flash et nouveautés
                  </h3>
                  <p className="text-xs sm:text-sm text-[#AAAAAA]">
                    Inscrivez-vous pour être alerté en priorité des arrivages et codes promo au Togo.
                  </p>
                </div>

                <form
                  onSubmit={handleNewsletterSubmit}
                  className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
                >
                  {newsletterSubscribed ? (
                    <div className="px-6 py-3.5 bg-[#34C759] text-white rounded-full text-xs sm:text-sm font-semibold uppercase flex items-center justify-center gap-2">
                      <CheckCircle2 size={18} />
                      <span>Inscription confirmée ! Merci.</span>
                    </div>
                  ) : (
                    <>
                      <input
                        type="email"
                        required
                        value={newsletterEmail}
                        onChange={(e) => setNewsletterEmail(e.target.value)}
                        placeholder="Votre adresse e-mail..."
                        className="w-full sm:w-64 px-4 py-3.5 bg-[#2C2C2E] border border-white/10 text-white placeholder:text-[#AAAAAA] text-xs sm:text-sm rounded-full focus:outline-hidden focus:border-[#007AFF] min-h-[48px]"
                      />
                      <button
                        type="submit"
                        className="w-full sm:w-auto px-7 py-3.5 bg-[#007AFF] hover:bg-[#0071EB] text-white font-semibold uppercase tracking-wider text-xs sm:text-sm rounded-full transition-colors cursor-pointer flex items-center justify-center gap-2 shrink-0 min-h-[48px]"
                      >
                        <Send size={15} />
                        <span>S&apos;inscrire</span>
                      </button>
                    </>
                  )}
                </form>
              </div>
            </section>
          </div>
        ) : (
          /* AUTRES VUES (Catégories, Favoris, Suivi/PayGate/Admin) */
          <div className="text-[#1D1D1F] animate-fadeIn space-y-6">
            <div className="flex items-center justify-between border-b border-[#AAAAAA]/30 pb-3">
              <button
                onClick={() => {
                  setActiveTab('search');
                  setSelectedCategory('all');
                }}
                className="text-xs font-black uppercase text-[#007AFF] hover:underline cursor-pointer"
              >
                ← Retour à l&apos;accueil PHLOX TOGO
              </button>
            </div>

            {activeTab === 'browse' && (
              <BrowseView lang={lang} onSelectCategory={handleSelectCategory} />
            )}

            {activeTab === 'watchlist' && (
              <WatchlistView
                products={products}
                wishlist={wishlist}
                lang={lang}
                onSelectProduct={setSelectedProduct}
                onToggleWishlist={handleToggleWishlist}
                onNavigateToCatalog={() => {
                  setActiveTab('search');
                  setSelectedCategory('all');
                }}
                onQuickAdd={handleQuickAddToCart}
                justAddedId={justAddedId}
              />
            )}

            {activeTab === 'projects' && (
              <ProjectsView
                lang={lang}
                products={products}
                setProducts={setProducts}
                initialSubTab={isPaygateRoute ? 'faq' : 'tracker'}
              />
            )}
          </div>
        )}
      </main>

      {/* =====================================================================
          7. FOOTER
      ===================================================================== */}
      <Footer lang={lang} onOpenDoc={setActiveDocType} />

      {/* =====================================================================
          MENU BAS FLOTTANT EN PILULE — Floating bottom pill with 4 tabs
      ===================================================================== */}
      {!isCartOpen && !selectedProduct && !activeDocType && (
        <nav
          aria-label="Navigation principale"
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-[#FFFFFF]/95 backdrop-blur-md border border-[#AAAAAA]/40 shadow-xl rounded-full px-3 py-1.5 flex items-center justify-around gap-1 max-w-[92vw] sm:max-w-[420px]"
        >
          <button
            onClick={() => {
              setActiveTab('search');
              setSelectedCategory('all');
              window.scrollTo({ top: 0, behavior: 'smooth' });
            }}
            className={`flex items-center gap-1.5 py-2 px-3.5 rounded-full transition-all cursor-pointer ${
              activeTab === 'search'
                ? 'bg-[#007AFF] text-white font-semibold text-xs'
                : 'text-[#6E6E73] hover:text-[#1D1D1F] text-xs font-medium'
            }`}
            aria-label="Accueil"
          >
            <Search size={16} />
            <span>Search</span>
          </button>

          <button
            onClick={() => setActiveTab('browse')}
            className={`flex items-center gap-1.5 py-2 px-3.5 rounded-full transition-all cursor-pointer ${
              activeTab === 'browse'
                ? 'bg-[#007AFF] text-white font-semibold text-xs'
                : 'text-[#6E6E73] hover:text-[#1D1D1F] text-xs font-medium'
            }`}
            aria-label="Catégories"
          >
            <Compass size={16} />
            <span>Browse</span>
          </button>

          <button
            onClick={() => setActiveTab('watchlist')}
            className={`flex items-center gap-1.5 py-2 px-3.5 rounded-full transition-all cursor-pointer relative ${
              activeTab === 'watchlist'
                ? 'bg-[#007AFF] text-white font-semibold text-xs'
                : 'text-[#6E6E73] hover:text-[#1D1D1F] text-xs font-medium'
            }`}
            aria-label={`Favoris (${wishlist.length})`}
          >
            <Heart size={16} />
            <span>Watchlist</span>
            {wishlist.length > 0 && activeTab !== 'watchlist' && (
              <span className="w-2 h-2 bg-[#007AFF] rounded-full" />
            )}
          </button>

          <button
            onClick={() => setActiveTab('projects')}
            className={`flex items-center gap-1.5 py-2 px-3.5 rounded-full transition-all cursor-pointer ${
              activeTab === 'projects'
                ? 'bg-[#007AFF] text-white font-semibold text-xs'
                : 'text-[#6E6E73] hover:text-[#1D1D1F] text-xs font-medium'
            }`}
            aria-label="Suivi des commandes, PayGate et Administration"
          >
            <ClipboardList size={16} />
            <span>Projects</span>
          </button>
        </nav>
      )}

      {/* =====================================================================
          BOUTON WHATSAPP FLOTTANT : 48px (w-12 h-12)
      ===================================================================== */}
      {!isCartOpen && !selectedProduct && !activeDocType && (
        <a
          href={`${brandConfig.whatsappUrlBase}?text=Bonjour ${brandConfig.name}, je souhaite avoir des renseignements sur vos produits.`}
          target="_blank"
          rel="noreferrer"
          className="fixed bottom-[84px] right-4 z-40 w-12 h-12 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-full shadow-lg hover:scale-105 transition-transform flex items-center justify-center min-w-[48px] min-h-[48px]"
          aria-label="Support WhatsApp +228 93 20 60 03"
          title="Support WhatsApp"
        >
          <MessageSquare size={22} className="text-white" />
        </a>
      )}

      {/* OFFLINE TOAST INDICATOR */}
      <OfflineIndicator lang={lang} />

      {/* MODALS & DRAWERS */}
      <ProductDetailModal
        isOpen={selectedProduct !== null}
        product={selectedProduct}
        allProducts={products}
        wishlist={wishlist}
        lang={lang}
        onClose={() => setSelectedProduct(null)}
        onAddToCart={handleAddToCart}
        onToggleWishlist={handleToggleWishlist}
        onSelectProduct={setSelectedProduct}
      />

      <CartDrawer
        isOpen={isCartOpen}
        cart={cart}
        lang={lang}
        onClose={() => setIsCartOpen(false)}
        onUpdateQty={handleUpdateCartQty}
        onRemoveItem={handleRemoveCartItem}
        onClearCart={handleClearCart}
      />

      <DocumentModals
        isOpen={activeDocType !== null}
        docType={activeDocType}
        lang={lang}
        onClose={() => setActiveDocType(null)}
      />
    </div>
  );
}
