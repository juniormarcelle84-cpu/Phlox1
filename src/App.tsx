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
  Clock,
  Bot,
  Sun,
  Moon,
  Sparkles
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
import { updateDynamicSEO, buildSEOForContext } from './services/seoService';
import { CartDrawer } from './components/CartDrawer';
import { ProductDetailModal } from './components/ProductDetailModal';
import { DocumentModals } from './components/DocumentModals';
import { Footer } from './components/Footer';
import { PWAInstallButton } from './components/PWAInstallButton';
import { OfflineIndicator } from './components/OfflineIndicator';
import { CutoutProductImage } from './components/CutoutHeadphone';
import { PaymentNetworkLogo } from './components/PaymentNetworkLogo';
import { LazyImage } from './components/LazyImage';
import { ChatPhlox } from './components/ChatPhlox';
import { TiltCard } from './components/TiltCard';
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

  // Theme state (dark / light mode)
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('phlox_theme');
      if (saved === 'dark' || saved === 'light') return saved;
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches) {
        return 'light';
      }
    }
    return 'dark';
  });

  // Sync theme with document attributes & classes
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.setAttribute('data-theme', theme);
      if (theme === 'dark') {
        document.documentElement.classList.add('dark');
        document.documentElement.classList.remove('light');
      } else {
        document.documentElement.classList.add('light');
        document.documentElement.classList.remove('dark');
      }
      localStorage.setItem('phlox_theme', theme);
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

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
  const [isChatOpen, setIsChatOpen] = useState(false);
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

  // Initialize App Data & Deep Linking (Product / Category / Tab / Referral)
  useEffect(() => {
    const allProds = getProducts();
    setProducts(allProds);
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

      // Deep linking for products (?product=id or ?p=id)
      const targetProductId = urlParams.get('product') || urlParams.get('p');
      if (targetProductId) {
        const found = allProds.find((p) => p.id === targetProductId);
        if (found) {
          setSelectedProduct(found);
        }
      }

      // Deep linking for category (?category=cat_id or ?c=cat_id)
      const targetCategory = urlParams.get('category') || urlParams.get('c');
      if (targetCategory) {
        setSelectedCategory(targetCategory);
        setActiveTab('search');
      }

      // Deep linking for tabs (?tab=browse | watchlist | projects | orders)
      const targetTab = urlParams.get('tab') || urlParams.get('view');
      if (targetTab === 'affiliation') {
        setActiveTab('projects');
      } else if (targetTab === 'browse' || targetTab === 'watchlist' || targetTab === 'projects') {
        setActiveTab(targetTab as any);
      }
    }
  }, []);

  // Synchronize Dynamic SEO (Title, Description, OpenGraph, Twitter, Schema.org) and Browser URL
  useEffect(() => {
    const seoConfig = buildSEOForContext({
      selectedProduct,
      selectedCategory,
      activeTab,
      allProducts: products,
      lang
    });

    updateDynamicSEO(seoConfig);

    // Sync browser URL cleanly without refreshing page
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (selectedProduct) {
        params.set('product', selectedProduct.id);
        params.delete('category');
        params.delete('tab');
      } else {
        params.delete('product');
        params.delete('p');
        if (selectedCategory && selectedCategory !== 'all') {
          params.set('category', selectedCategory);
        } else {
          params.delete('category');
          params.delete('c');
        }
        if (activeTab !== 'search') {
          params.set('tab', activeTab);
        } else {
          params.delete('tab');
        }
      }
      const newQuery = params.toString();
      const newUrl = `${window.location.pathname}${newQuery ? `?${newQuery}` : ''}${window.location.hash}`;
      window.history.replaceState({}, '', newUrl);
    }
  }, [selectedProduct, selectedCategory, activeTab, products, lang]);

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
    <div className="min-h-screen flex flex-col bg-[#121214] text-white font-sans antialiased overflow-x-hidden">
      {/* =====================================================================
          1. HEADER — Conteneur w-full, padding 16px (px-4), max-w-[1200px] centré
      ===================================================================== */}
      <header className="sticky top-0 z-40 w-full bg-[#121214]/95 backdrop-blur-md border-b border-white/10 py-3.5 px-4">
        <div className="w-full max-w-[1200px] mx-auto flex items-center justify-between gap-2">
          {/* Left: Logo PHLOX espacé + Navigation Links */}
          <div className="flex items-center gap-6 lg:gap-10 min-w-0">
            <button
              onClick={() => {
                setActiveTab('search');
                setSelectedCategory('all');
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="group flex items-center gap-1.5 text-lg sm:text-2xl font-black uppercase tracking-[0.24em] text-white cursor-pointer shrink-0"
              aria-label="Accueil PHLOX TOGO"
            >
              <span>PHLOX</span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#D0FF00] group-hover:scale-125 transition-transform" />
            </button>

            <nav className="hidden md:flex items-center gap-5 lg:gap-7 text-sm font-bold uppercase tracking-wider text-[#A1A1AA]">
              <button
                onClick={() => {
                  setActiveTab('search');
                  setSelectedCategory('all');
                  window.scrollTo({ top: 0, behavior: 'smooth' });
                }}
                className={`transition-colors cursor-pointer ${
                  activeTab === 'search' && selectedCategory === 'all'
                    ? 'text-[#00BCC8]'
                    : 'hover:text-white'
                }`}
              >
                Accueil
              </button>
              <button
                onClick={() => scrollToSection(categoriesRef)}
                className="hover:text-[#00BCC8] transition-colors cursor-pointer"
              >
                Catégories
              </button>
              <button
                onClick={() => scrollToSection(catalogSectionRef)}
                className="hover:text-[#00BCC8] transition-colors cursor-pointer"
              >
                Boutique
              </button>
              <button
                onClick={() => scrollToSection(promoSectionRef)}
                className="hover:text-[#00BCC8] transition-colors cursor-pointer"
              >
                Offres
              </button>
              <button
                onClick={() => scrollToSection(reviewsSectionRef)}
                className="hover:text-[#00BCC8] transition-colors cursor-pointer"
              >
                Avis
              </button>
              <button
                onClick={() => setActiveDocType('contact')}
                className="hover:text-[#00BCC8] transition-colors cursor-pointer"
              >
                Contact
              </button>
            </nav>
          </div>

          {/* Right: Connexion, Recherche, Favoris, Panier & Burger Mobile */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            <PWAInstallButton lang={lang} />

            {/* ChatPhlox Assistant Button */}
            <button
              onClick={() => setIsChatOpen(true)}
              className="p-2 bg-[#00BCC8]/15 text-[#00BCC8] border border-[#00BCC8]/30 hover:bg-[#00BCC8] hover:text-[#121214] rounded-full transition-colors cursor-pointer flex items-center gap-1.5"
              title="ChatPhlox - Assistant Virtuel Togo"
              aria-label="Ouvrir ChatPhlox"
            >
              <Bot size={18} />
              <span className="hidden xl:inline text-xs font-black uppercase">ChatPhlox</span>
            </button>

            {/* Profile / Suivi & Admin Avatar */}
            <button
              onClick={() => setActiveTab('projects')}
              className={`p-2 rounded-full transition-colors cursor-pointer ${
                activeTab === 'projects'
                  ? 'bg-[#00BCC8] text-[#121214]'
                  : 'bg-[#202024] text-white border border-white/15 hover:border-[#00BCC8]'
              }`}
              title="Profil, Suivi Commandes & Administration"
              aria-label="Profil et Administration"
            >
              <User size={18} />
            </button>

            {/* Recherche */}
            <button
              onClick={() => scrollToSection(catalogSectionRef)}
              className="p-2 bg-[#202024] text-white border border-white/15 hover:text-[#00BCC8] hover:border-[#00BCC8] rounded-full transition-colors cursor-pointer"
              aria-label="Rechercher un produit"
              title="Rechercher un produit"
            >
              <Search size={18} />
            </button>

            {/* Favoris (cœur) */}
            <button
              onClick={() => setActiveTab('watchlist')}
              className="relative p-2 bg-[#202024] text-white border border-white/15 hover:text-[#00BCC8] hover:border-[#00BCC8] rounded-full transition-colors cursor-pointer"
              aria-label={`Favoris (${wishlist.length})`}
              title="Mes Favoris"
            >
              <Heart
                size={18}
                className={wishlist.length > 0 ? 'text-[#00BCC8] fill-[#00BCC8]' : ''}
              />
              {wishlist.length > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#00BCC8] text-[#121214] text-[10px] font-black rounded-full flex items-center justify-center shadow-xs">
                  {wishlist.length}
                </span>
              )}
            </button>

            {/* Panier */}
            <button
              onClick={() => setIsCartOpen(true)}
              className="relative p-2 bg-[#202024] text-white border border-white/15 hover:text-[#D0FF00] hover:border-[#D0FF00] rounded-full transition-colors cursor-pointer"
              aria-label={`Ouvrir le panier (${cartItemCount} articles)`}
              title="Mon Panier"
            >
              <ShoppingBag size={18} />
              {cartItemCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[#D0FF00] text-[#121214] text-[10px] font-black rounded-full flex items-center justify-center shadow-xs">
                  {cartItemCount}
                </span>
              )}
            </button>

            {/* Theme Toggle Button (Sombre / Clair) */}
            <button
              onClick={toggleTheme}
              className="p-2 bg-[#202024] text-white border border-white/15 hover:border-[#00BCC8] hover:text-[#00BCC8] rounded-full transition-all cursor-pointer flex items-center justify-center min-w-[38px] min-h-[38px]"
              title={theme === 'dark' ? 'Passer en mode clair' : 'Passer en mode sombre'}
              aria-label={theme === 'dark' ? 'Activer le mode clair' : 'Activer le mode sombre'}
            >
              {theme === 'dark' ? (
                <Sun size={18} className="text-[#D0FF00] transition-transform hover:rotate-45" />
              ) : (
                <Moon size={18} className="text-[#00BCC8] transition-transform hover:-rotate-12" />
              )}
            </button>

            {/* Menu Burger sur Mobile */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 bg-[#202024] text-white border border-white/15 rounded-full transition-colors cursor-pointer"
              aria-label="Menu de navigation"
            >
              {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
            </button>
          </div>
        </div>

        {/* Menu Mobile Déroulant */}
        {mobileMenuOpen && (
          <div className="md:hidden w-full max-w-[1200px] mx-auto mt-3 pt-3 border-t border-white/10 flex flex-col gap-1.5 pb-2 animate-fadeIn bg-[#202024] border border-white/10 rounded-2xl p-3 shadow-xl">
            <button
              onClick={() => {
                setActiveTab('search');
                setSelectedCategory('all');
                setMobileMenuOpen(false);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              className="text-left px-3.5 py-2.5 rounded-full font-black uppercase text-xs text-white hover:bg-[#121214]"
            >
              Accueil
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                scrollToSection(categoriesRef);
              }}
              className="text-left px-3.5 py-2.5 rounded-full font-bold text-xs text-[#A1A1AA] hover:text-[#00BCC8] hover:bg-[#121214]"
            >
              Catégories & Univers
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                scrollToSection(catalogSectionRef);
              }}
              className="text-left px-3.5 py-2.5 rounded-full font-bold text-xs text-[#A1A1AA] hover:text-[#00BCC8] hover:bg-[#121214]"
            >
              Boutique & Catalogue
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                scrollToSection(promoSectionRef);
              }}
              className="text-left px-3.5 py-2.5 rounded-full font-bold text-xs text-[#A1A1AA] hover:text-[#00BCC8] hover:bg-[#121214]"
            >
              Offres & Promo -20%
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                scrollToSection(reviewsSectionRef);
              }}
              className="text-left px-3.5 py-2.5 rounded-full font-bold text-xs text-[#A1A1AA] hover:text-[#00BCC8] hover:bg-[#121214]"
            >
              Avis Clients Vérifiés
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setActiveDocType('contact');
              }}
              className="text-left px-3.5 py-2.5 rounded-full font-bold text-xs text-[#A1A1AA] hover:text-[#00BCC8] hover:bg-[#121214]"
            >
              Contact & Support
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setIsChatOpen(true);
              }}
              className="text-left px-3.5 py-2.5 rounded-full font-black text-xs text-[#00BCC8] bg-[#00BCC8]/15 border border-[#00BCC8]/30 flex items-center gap-2 uppercase tracking-wider"
            >
              <Bot size={16} />
              <span>ChatPhlox (Assistant Togo)</span>
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                setActiveTab('projects');
              }}
              className="text-left px-3.5 py-2.5 rounded-full font-black text-xs text-[#121214] bg-[#00BCC8] flex items-center gap-2 uppercase tracking-wider"
            >
              <User size={16} />
              <span>Connexion / Suivi / Admin</span>
            </button>
            <button
              onClick={() => {
                toggleTheme();
              }}
              className="text-left px-3.5 py-2.5 rounded-full font-bold text-xs text-[#A1A1AA] hover:text-white hover:bg-[#121214] flex items-center justify-between cursor-pointer"
            >
              <span className="flex items-center gap-2">
                {theme === 'dark' ? (
                  <Sun size={16} className="text-[#D0FF00]" />
                ) : (
                  <Moon size={16} className="text-[#00BCC8]" />
                )}
                <span>Thème : {theme === 'dark' ? 'Mode Sombre' : 'Mode Clair'}</span>
              </span>
              <span className="text-[10px] font-black uppercase px-2.5 py-1 rounded-full bg-[#121214] text-[#00BCC8]">
                {theme === 'dark' ? 'Activer Clair' : 'Activer Sombre'}
              </span>
            </button>
          </div>
        )}
      </header>

      {/* =====================================================================
          MAIN CONTENT AREA
      ===================================================================== */}
      <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 pt-4 sm:pt-6 pb-24 sm:pb-28 space-y-10 sm:space-y-14">
        {activeTab === 'search' ? (
          <div className="space-y-10 sm:space-y-14 animate-fadeIn">
            {/* ===============================================================
                2. HERO (#202024 SURFACE) — "Beats Solo" + "Wireless"
            =============================================================== */}
            {heroProduct && (
              <section className="relative bg-[#202024] rounded-[28px] px-5 sm:px-10 md:px-14 py-8 sm:py-14 md:py-18 overflow-hidden min-h-[380px] sm:min-h-[480px] md:min-h-[540px] flex flex-col justify-between border border-white/10 shadow-lg text-white">
                {/* Textes supérieurs : Beats Solo + Wireless + Filigrane discret HEADPHONE */}
                <div className="relative z-10 my-auto space-y-1 sm:space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#00BCC8]/15 border border-[#00BCC8]/30 text-[#00BCC8] text-xs font-black uppercase tracking-wider mb-2">
                    <Sparkles size={13} />
                    <span>Nouveauté Phlox Tech</span>
                  </div>
                  <p className="text-sm sm:text-xl md:text-2xl font-black uppercase tracking-wider text-[#A1A1AA]">
                    Beats Solo Pro
                  </p>
                  <h1 className="text-3xl sm:text-6xl md:text-7xl font-black uppercase tracking-tight leading-none text-white">
                    Wireless
                  </h1>

                  {/* Mot géant HEADPHONE en filigrane discret */}
                  <div
                    aria-hidden="true"
                    className="text-[36px] sm:text-[78px] md:text-[112px] lg:text-[142px] font-black uppercase text-white/5 tracking-tight leading-[0.88] select-none pointer-events-none pt-1 sm:pt-2 truncate"
                  >
                    HEADPHONE
                  </div>

                  {/* Boutons d'action Hero */}
                  <div className="pt-4 sm:pt-7 relative z-20 flex flex-wrap items-center gap-3">
                    <button
                      onClick={() => setSelectedProduct(heroProduct)}
                      className="px-7 sm:px-9 py-3.5 sm:py-4 bg-[#D0FF00] hover:bg-[#DEFF33] text-[#121214] font-black uppercase tracking-wider text-xs sm:text-sm rounded-full transition-all hover:scale-105 cursor-pointer min-h-[48px] shadow-lg flex items-center gap-2"
                    >
                      <ShoppingBag size={16} />
                      <span>Commander Express</span>
                    </button>
                    <button
                      onClick={() => scrollToSection(categoriesRef)}
                      className="px-6 sm:px-8 py-3.5 sm:py-4 bg-[#121214] hover:bg-white/10 text-white font-bold uppercase tracking-wider text-xs sm:text-sm rounded-full border border-white/20 transition-all cursor-pointer min-h-[48px]"
                    >
                      Explorer le catalogue
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
                      className="w-full h-auto object-contain hover:scale-105 transition-transform duration-500 drop-shadow-2xl"
                    />
                  </div>
                </div>

                {/* Description en bas à droite */}
                <div className="relative z-20 self-end text-right max-w-[250px] space-y-1 pt-2">
                  <h2 className="text-xs sm:text-sm font-black uppercase tracking-wider text-[#00BCC8]">Qualité Togo</h2>
                  <p className="text-[11px] sm:text-xs text-[#A1A1AA] leading-relaxed">
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
              {/* Carte 1 : Écouteurs (Card Surface #312F30) */}
              <div
                onClick={() => handleSelectCategory('earphone')}
                className="group relative bg-[#312F30] text-white rounded-[28px] p-5 sm:p-7 h-[250px] sm:h-[280px] overflow-hidden flex flex-col justify-end cursor-pointer transition-transform duration-300 hover:-translate-y-1 border border-white/10 shadow-md"
              >
                <div className="w-36 sm:w-44 h-36 sm:h-44 absolute -top-2 -right-2 z-10">
                  <LazyImage
                    src="/src/assets/images/category_earphone_1791055767919.webp"
                    alt="Écouteurs"
                    wrapperClassName="w-full h-full bg-transparent"
                    className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
                <div className="relative z-20 space-y-1">
                  <span className="text-xs text-[#C5D4CA] font-bold uppercase tracking-wider block">Profitez</span>
                  <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight leading-tight text-white">Avec</h3>
                  <div className="text-2xl sm:text-4xl font-black uppercase text-white/5 tracking-tight leading-none select-none pb-3 truncate">
                    ÉCOUTEURS
                  </div>
                  <button
                    type="button"
                    className="px-6 py-2 bg-[#7477FF] hover:bg-[#5E62FF] text-white text-xs font-black uppercase tracking-wider rounded-full transition-transform group-hover:scale-105 cursor-pointer"
                  >
                    Acheter
                  </button>
                </div>
              </div>

              {/* Carte 2 : Montres (Card Surface #312F30) */}
              <div
                onClick={() => handleSelectCategory('watch')}
                className="group relative bg-[#312F30] text-white rounded-[28px] p-5 sm:p-7 h-[250px] sm:h-[280px] overflow-hidden flex flex-col justify-end cursor-pointer transition-transform duration-300 hover:-translate-y-1 border border-white/10 shadow-md"
              >
                <div className="w-40 sm:w-48 h-40 sm:h-48 absolute top-2 -right-4 z-10">
                  <LazyImage
                    src="/src/assets/images/category_watch_1791055778925.webp"
                    alt="Montres connectées"
                    wrapperClassName="w-full h-full bg-transparent"
                    className="w-full h-full object-cover rounded-2xl group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
                <div className="relative z-20 space-y-1">
                  <span className="text-xs text-[#C5D4CA] font-bold uppercase tracking-wider block">Nouveau</span>
                  <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight leading-tight text-white">Objets</h3>
                  <div className="text-2xl sm:text-4xl font-black uppercase text-white/5 tracking-tight leading-none select-none pb-3 truncate">
                    MONTRES
                  </div>
                  <button
                    type="button"
                    className="px-6 py-2 bg-[#7477FF] text-white hover:bg-[#5E62FF] text-xs font-black uppercase tracking-wider rounded-full transition-transform group-hover:scale-105 cursor-pointer"
                  >
                    Acheter
                  </button>
                </div>
              </div>

              {/* Carte 3 : Ordinateurs (Ink #1B1A1B — 2 colonnes) */}
              <div
                onClick={() => handleSelectCategory('laptop')}
                className="group relative bg-[#1B1A1B] text-white rounded-[28px] p-5 sm:p-8 h-[250px] sm:h-[280px] sm:col-span-2 lg:col-span-2 overflow-hidden flex flex-col justify-center cursor-pointer transition-transform duration-300 hover:-translate-y-1 border border-white/10 shadow-md"
              >
                <div className="w-40 sm:w-64 md:w-72 h-40 sm:h-56 absolute right-2 sm:right-6 top-1/2 -translate-y-1/2 z-10 flex items-center justify-center">
                  <CutoutProductImage
                    src="/src/assets/images/category_laptop_1791055787925.webp"
                    alt="Ordinateurs portables"
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="relative z-20 space-y-1 max-w-[65%]">
                  <span className="text-xs text-[#C5D4CA] font-bold uppercase tracking-wider block">Tendance</span>
                  <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight leading-tight text-white">Appareils</h3>
                  <div className="text-2xl sm:text-5xl font-black uppercase text-white/10 tracking-tight leading-none select-none pb-3 sm:pb-4 truncate">
                    ORDINATEURS
                  </div>
                  <button
                    type="button"
                    className="px-6 sm:px-7 py-2 sm:py-2.5 bg-[#7477FF] text-white hover:bg-[#5E62FF] text-xs font-black uppercase tracking-wider rounded-full transition-transform group-hover:scale-105 cursor-pointer"
                  >
                    Acheter
                  </button>
                </div>
              </div>

              {/* Carte 4 : Consoles (Surface #312F30 — 2 colonnes) */}
              <div
                onClick={() => handleSelectCategory('console')}
                className="group relative bg-[#312F30] text-white rounded-[28px] p-5 sm:p-8 h-[250px] sm:h-[280px] sm:col-span-2 lg:col-span-2 overflow-hidden flex flex-col justify-center cursor-pointer transition-transform duration-300 hover:-translate-y-1 border border-white/10 shadow-md"
              >
                <div className="w-40 sm:w-60 md:w-64 h-40 sm:h-60 absolute right-2 sm:right-8 top-1/2 -translate-y-1/2 z-10">
                  <LazyImage
                    src="/src/assets/images/category_console_1791055796776.webp"
                    alt="Consoles de jeux"
                    wrapperClassName="w-full h-full bg-transparent"
                    className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-500"
                  />
                </div>
                <div className="relative z-20 space-y-1 max-w-[65%]">
                  <span className="text-xs text-[#C5D4CA] font-bold uppercase tracking-wider block">Meilleure</span>
                  <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight leading-tight text-white">
                    Gaming
                  </h3>
                  <div className="text-2xl sm:text-5xl font-black uppercase text-white/5 tracking-tight leading-none select-none pb-3 sm:pb-4 truncate">
                    CONSOLES
                  </div>
                  <button
                    type="button"
                    className="px-6 sm:px-7 py-2 sm:py-2.5 bg-[#7477FF] hover:bg-[#5E62FF] text-white text-xs font-black uppercase tracking-wider rounded-full transition-transform group-hover:scale-105 cursor-pointer"
                  >
                    Acheter
                  </button>
                </div>
              </div>

              {/* Carte 5 : Casques VR (Surface #312F30) */}
              <div
                onClick={() => handleSelectCategory('vr')}
                className="group relative bg-[#312F30] text-white rounded-[28px] p-5 sm:p-7 h-[250px] sm:h-[280px] overflow-hidden flex flex-col justify-start cursor-pointer transition-transform duration-300 hover:-translate-y-1 border border-white/10 shadow-md"
              >
                <div className="relative z-20 space-y-1">
                  <span className="text-xs text-[#C5D4CA] font-bold uppercase tracking-wider block">Jouez</span>
                  <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight leading-tight text-white">Immersion</h3>
                  <div className="text-2xl sm:text-4xl font-black uppercase text-white/5 tracking-tight leading-none select-none pb-3 truncate">
                    CASQUES VR
                  </div>
                  <button
                    type="button"
                    className="px-6 py-2 bg-[#7477FF] text-white hover:bg-[#5E62FF] text-xs font-black uppercase tracking-wider rounded-full transition-transform group-hover:scale-105 cursor-pointer"
                  >
                    Acheter
                  </button>
                </div>
                <div className="w-32 sm:w-40 h-32 sm:h-40 absolute -bottom-2 -right-2 z-10">
                  <CutoutProductImage
                    src="/src/assets/images/category_vr_1791055806396.webp"
                    alt="Casques VR"
                    className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
              </div>

              {/* Carte 6 : Enceintes (Ink #1B1A1B) */}
              <div
                onClick={() => handleSelectCategory('speaker')}
                className="group relative bg-[#1B1A1B] text-white rounded-[28px] p-5 sm:p-7 h-[250px] sm:h-[280px] overflow-hidden flex flex-col justify-start cursor-pointer transition-transform duration-300 hover:-translate-y-1 border border-white/10 shadow-md"
              >
                <div className="relative z-20 space-y-1">
                  <span className="text-xs text-[#C5D4CA] font-bold uppercase tracking-wider block">Nouveau</span>
                  <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight leading-tight text-white">Puissance</h3>
                  <div className="text-2xl sm:text-4xl font-black uppercase text-white/10 tracking-tight leading-none select-none pb-3 truncate">
                    ENCEINTES
                  </div>
                  <button
                    type="button"
                    className="px-6 py-2 bg-[#7477FF] text-white hover:bg-[#5E62FF] text-xs font-black uppercase tracking-wider rounded-full transition-transform group-hover:scale-105 cursor-pointer"
                  >
                    Acheter
                  </button>
                </div>
                <div className="w-32 sm:w-40 h-32 sm:h-40 absolute -bottom-2 -right-2 z-10">
                  <CutoutProductImage
                    src="/src/assets/images/category_speaker_1791055819762.webp"
                    alt="Enceintes Bluetooth"
                    className="w-full h-full object-contain group-hover:scale-110 transition-transform duration-500"
                  />
                </div>
              </div>
            </section>

            {/* ===============================================================
                4. BARRE DE CONFIANCE 4 ICÔNES
            =============================================================== */}
            <section className="bg-[#202024] rounded-[28px] p-6 sm:p-8 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 sm:gap-8 border border-white/10 shadow-md text-white">
              <div className="flex items-center gap-3.5">
                <Truck size={32} strokeWidth={1.8} className="text-[#00BCC8] shrink-0" />
                <div>
                  <h4 className="text-sm font-black uppercase tracking-wide text-white">Livraison au Togo</h4>
                  <p className="text-xs text-[#A1A1AA]">Expédition 24h à Lomé & régions</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5">
                <ShieldCheck size={32} strokeWidth={1.8} className="text-[#D0FF00] shrink-0" />
                <div>
                  <h4 className="text-sm font-black uppercase tracking-wide text-white">Garantie Satisfaction</h4>
                  <p className="text-xs text-[#A1A1AA]">Produits authentiques garantis</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5">
                <Headphones size={32} strokeWidth={1.8} className="text-[#00BCC8] shrink-0" />
                <div>
                  <h4 className="text-sm font-black uppercase tracking-wide text-white">Support WhatsApp 24/7</h4>
                  <p className="text-xs text-[#A1A1AA]">Assistance directe +228 93 20 60 03</p>
                </div>
              </div>

              <div className="flex items-center gap-3.5">
                <div className="flex items-center gap-1.5 shrink-0">
                  <PaymentNetworkLogo network="TMONEY" variant="mini" />
                  <PaymentNetworkLogo network="FLOOZ" variant="mini" />
                </div>
                <div>
                  <h4 className="text-sm font-black uppercase tracking-wide text-white">
                    Paiement Sécurisé
                  </h4>
                  <p className="text-xs text-[#A1A1AA]">Mixx by Yas / Flooz Money</p>
                </div>
              </div>
            </section>

            {/* ===============================================================
                5. BANNIÈRE PROMO INK (#121214)
            =============================================================== */}
            <section ref={promoSectionRef} className="pt-8 sm:pt-14 md:pt-18">
              <div className="relative bg-[#202024] rounded-[28px] px-5 sm:px-10 md:px-14 py-8 sm:py-12 text-white grid grid-cols-1 md:grid-cols-3 items-center gap-6 sm:gap-8 shadow-xl border border-white/10">
                {/* Colonne Gauche : -20% + FINE SMILE + Compte à rebours */}
                <div className="space-y-3 z-20">
                  <span className="text-xs sm:text-sm font-black tracking-wider uppercase text-[#D0FF00] block">
                    -20 % DE RÉDUCTION
                  </span>
                  <h2 className="text-3xl sm:text-6xl lg:text-7xl font-black uppercase leading-[0.92] tracking-tight text-white">
                    FINE
                    <br />
                    SMILE
                  </h2>

                  {/* Compte à rebours en direct */}
                  <div className="pt-2 space-y-1.5">
                    <div className="flex items-center gap-1.5 text-[11px] font-bold text-[#A1A1AA] uppercase tracking-wider">
                      <Clock size={13} className="text-[#D0FF00]" />
                      <span>Fin de l&apos;offre promo dans :</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="bg-[#121214] border border-white/10 rounded-2xl px-3 py-2 text-center min-w-[46px]">
                        <span className="block text-sm font-black text-[#D0FF00] leading-none font-mono tabular-nums">
                          {String(countdown.days).padStart(2, '0')}
                        </span>
                        <span className="text-[9px] uppercase font-bold text-[#A1A1AA]">Jours</span>
                      </div>
                      <div className="bg-[#121214] border border-white/10 rounded-2xl px-3 py-2 text-center min-w-[46px]">
                        <span className="block text-sm font-black text-[#D0FF00] leading-none font-mono tabular-nums">
                          {String(countdown.hours).padStart(2, '0')}
                        </span>
                        <span className="text-[9px] uppercase font-bold text-[#A1A1AA]">Heures</span>
                      </div>
                      <div className="bg-[#121214] border border-white/10 rounded-2xl px-3 py-2 text-center min-w-[46px]">
                        <span className="block text-sm font-black text-[#D0FF00] leading-none font-mono tabular-nums">
                          {String(countdown.minutes).padStart(2, '0')}
                        </span>
                        <span className="text-[9px] uppercase font-bold text-[#A1A1AA]">Min</span>
                      </div>
                      <div className="bg-[#121214] border border-white/10 rounded-2xl px-3 py-2 text-center min-w-[46px]">
                        <span className="block text-sm font-black text-[#D0FF00] leading-none font-mono tabular-nums">
                          {String(countdown.seconds).padStart(2, '0')}
                        </span>
                        <span className="text-[9px] uppercase font-bold text-[#A1A1AA]">Sec</span>
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
                          : '/src/assets/images/hero_headphone_1791055757059.webp'
                      }
                      alt="Casque Beats Solo Air Promo -20%"
                      tintRed={false}
                      className="w-full h-auto object-contain drop-shadow-xl"
                    />
                  </div>
                </div>

                {/* Colonne Droite : Beats Solo Air + Promo Spéciale + Bouton Acheter */}
                <div className="space-y-3 z-20 md:pl-4">
                  <span className="text-xs sm:text-sm font-bold uppercase tracking-wider text-[#A1A1AA] block">
                    Beats Solo Air
                  </span>
                  <h3 className="text-2xl sm:text-4xl font-black uppercase tracking-tight leading-tight text-white">
                    Promo Spéciale
                  </h3>
                  <p className="text-xs sm:text-sm text-[#A1A1AA] leading-relaxed max-w-sm">
                    Profitez d&apos;une remise immédiate de -20% sur nos équipements audio phares avec livraison rapide à Lomé et dans tout le Togo.
                  </p>
                  <div className="pt-1">
                    <button
                      onClick={() => {
                        if (heroProduct) setSelectedProduct(heroProduct);
                      }}
                      className="px-8 py-3.5 bg-[#D0FF00] hover:bg-[#DEFF33] text-[#121214] font-black uppercase tracking-wider text-xs sm:text-sm rounded-full transition-transform hover:scale-105 cursor-pointer min-h-[48px] shadow-lg flex items-center gap-2"
                    >
                      <ShoppingBag size={16} />
                      <span>Profiter de l&apos;offre</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>

            {/* ===============================================================
                6. "MEILLEURES VENTES"
            =============================================================== */}
            <section ref={bestSellersRef} className="space-y-6 pt-2 text-white">
              <div className="text-center space-y-1.5">
                <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white">
                  Meilleures Ventes
                </h2>
                <p className="text-xs sm:text-sm text-[#A1A1AA] max-w-md mx-auto">
                  Les produits tendance préférés de nos clients à Lomé et partout au Togo
                </p>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
                {bestSellerProducts.map((p) => {
                  const isOutOfStock = p.stock <= 0;
                  const isFav = wishlist.includes(p.id);
                  const isAdded = justAddedId === p.id;

                  return (
                    <TiltCard
                      key={p.id}
                      onClick={() => setSelectedProduct(p)}
                      maxTilt={8}
                      scale={1.03}
                      perspective={900}
                      className="group bg-[#202024] rounded-[28px] p-3 sm:p-4 flex flex-col justify-between cursor-pointer border border-white/10 hover:border-[#00BCC8]/60 hover:shadow-2xl shadow-md transition-all text-white transform-gpu"
                    >
                      <div>
                        {/* Boîte Image #121214 */}
                        <div className="relative bg-[#121214] rounded-[20px] aspect-square overflow-hidden flex items-center justify-center mb-2.5">
                          {/* Badge Promo */}
                          {p.isPromo && (
                            <span className="absolute top-2 left-2 z-20 bg-[#D0FF00] text-[#121214] text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-sm">
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
                              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#202024]/90 hover:bg-[#202024] text-[#A1A1AA] hover:text-[#00BCC8] border border-white/10 flex items-center justify-center cursor-pointer shadow-xs"
                              aria-label="Ajouter aux favoris"
                              title="Favoris"
                            >
                              <Heart
                                size={14}
                                className={isFav ? 'text-[#00BCC8] fill-[#00BCC8]' : ''}
                              />
                            </button>

                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedProduct(p);
                              }}
                              className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#202024]/90 hover:bg-[#202024] text-[#A1A1AA] hover:text-[#00BCC8] border border-white/10 flex items-center justify-center cursor-pointer shadow-xs"
                              aria-label="Aperçu rapide"
                              title="Aperçu rapide"
                            >
                              <Eye size={14} />
                            </button>
                          </div>

                          <LazyImage
                            src={p.image}
                            alt={p.name}
                            wrapperClassName="w-full h-full"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />

                          {isOutOfStock && (
                            <div className="absolute inset-0 bg-[#121214]/80 flex items-center justify-center p-2">
                              <span className="bg-[#F66554] text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-full">
                                Rupture
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Nom sur 2 lignes max */}
                        <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-[#00BCC8] transition-colors line-clamp-2 min-h-[2.25rem] sm:min-h-[2.5rem] leading-snug">
                          {p.name}
                        </h3>

                        {/* Prix dessous */}
                        <div className="mt-1 mb-2.5">
                          <div className="text-xs sm:text-sm font-black text-[#D0FF00] font-mono tabular-nums">
                            {formatPrice(p.price)}
                          </div>
                          {p.originalPrice && (
                            <div className="text-[10px] sm:text-xs line-through text-[#A1A1AA]/60 font-mono tabular-nums">
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
                        className={`w-full py-2.5 px-3 rounded-full text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-all cursor-pointer min-h-[42px] ${
                          isOutOfStock
                            ? 'bg-white/5 text-white/30 cursor-not-allowed border border-white/5'
                            : isAdded
                            ? 'bg-[#D0FF00] text-[#121214]'
                            : 'bg-[#00BCC8] hover:bg-[#00D5E4] text-[#121214] shadow-xs'
                        }`}
                      >
                        <Plus size={14} />
                        <span>{isAdded ? 'Ajouté' : 'Ajouter'}</span>
                      </button>
                    </TiltCard>
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
            <section ref={reviewsSectionRef} className="space-y-10 pt-2 text-white">
              {/* Avis Clients */}
              <div className="space-y-6">
                <div className="text-center space-y-1.5">
                  <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white">
                    Avis de nos Clients au Togo
                  </h2>
                  <p className="text-xs sm:text-sm text-[#A1A1AA]">
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
                      className="bg-[#202024] rounded-[28px] p-5 sm:p-6 space-y-3 border border-white/10 shadow-md text-white"
                    >
                      <div className="flex items-center gap-1 text-[#D0FF00]">
                        {[...Array(5)].map((_, i) => (
                          <Star key={i} size={15} className="fill-[#D0FF00] text-[#D0FF00]" />
                        ))}
                      </div>
                      <p className="text-xs sm:text-sm text-[#A1A1AA] leading-relaxed">
                        &ldquo;{review.comment}&rdquo;
                      </p>
                      <div className="pt-2 border-t border-white/10 flex items-center justify-between text-xs">
                        <div>
                          <div className="font-bold text-white">{review.name}</div>
                          <div className="text-[#A1A1AA]/80">{review.city}</div>
                        </div>
                        <span className="px-3 py-1 bg-[#00BCC8]/15 text-[#00BCC8] border border-[#00BCC8]/30 font-bold uppercase text-[10px] rounded-full">
                          Achat vérifié
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Bannière Newsletter */}
              <div className="bg-[#202024] rounded-[28px] p-6 sm:p-10 flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl border border-white/10 text-white">
                <div className="space-y-1.5 max-w-lg text-center md:text-left">
                  <span className="text-xs font-black uppercase tracking-wider text-[#00BCC8]">
                    Newsletter PHLOX TOGO
                  </span>
                  <h3 className="text-xl sm:text-3xl font-black uppercase tracking-tight text-white">
                    Recevez nos offres flash et nouveautés
                  </h3>
                  <p className="text-xs sm:text-sm text-[#A1A1AA]">
                    Inscrivez-vous pour être alerté en priorité des arrivages et codes promo au Togo.
                  </p>
                </div>

                <form
                  onSubmit={handleNewsletterSubmit}
                  className="w-full md:w-auto flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5"
                >
                  {newsletterSubscribed ? (
                    <div className="px-6 py-3.5 bg-[#D0FF00] text-[#121214] rounded-full text-xs sm:text-sm font-black uppercase flex items-center justify-center gap-2 shadow-md">
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
                        className="w-full sm:w-64 px-4 py-3.5 bg-[#121214] border border-white/15 text-white placeholder:text-[#A1A1AA]/50 text-xs sm:text-sm rounded-full focus:outline-hidden focus:border-[#00BCC8] min-h-[48px]"
                      />
                      <button
                        type="submit"
                        className="w-full sm:w-auto px-7 py-3.5 bg-[#00BCC8] hover:bg-[#00D5E4] text-[#121214] font-black uppercase tracking-wider text-xs sm:text-sm rounded-full transition-colors cursor-pointer flex items-center justify-center gap-2 shrink-0 min-h-[48px] shadow-md"
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
          <div className="text-white animate-fadeIn space-y-6">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <button
                onClick={() => {
                  setActiveTab('search');
                  setSelectedCategory('all');
                }}
                className="text-xs font-black uppercase text-[#00BCC8] hover:underline cursor-pointer"
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
          FLOATING BOTTOM PILL NAVIGATION (4 TABS)
      ===================================================================== */}
      <nav
        aria-label="Navigation principale mobile"
        className="fixed bottom-4 left-1/2 -translate-x-1/2 z-40 bg-[#121214]/90 backdrop-blur-xl border border-white/15 px-3 py-2 rounded-full shadow-2xl flex items-center gap-1.5 sm:gap-2 text-xs"
      >
        <button
          onClick={() => {
            setActiveTab('search');
            setSelectedCategory('all');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full font-bold uppercase text-[11px] tracking-wider transition-all cursor-pointer ${
            activeTab === 'search'
              ? 'bg-[#00BCC8] text-[#121214] font-black shadow-md'
              : 'text-[#A1A1AA] hover:text-white hover:bg-white/5'
          }`}
        >
          <Search size={15} />
          <span>Boutique</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('browse');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full font-bold uppercase text-[11px] tracking-wider transition-all cursor-pointer ${
            activeTab === 'browse'
              ? 'bg-[#00BCC8] text-[#121214] font-black shadow-md'
              : 'text-[#A1A1AA] hover:text-white hover:bg-white/5'
          }`}
        >
          <Compass size={15} />
          <span>Catégories</span>
        </button>

        <button
          onClick={() => {
            setActiveTab('watchlist');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`relative flex items-center gap-1.5 px-3.5 py-2 rounded-full font-bold uppercase text-[11px] tracking-wider transition-all cursor-pointer ${
            activeTab === 'watchlist'
              ? 'bg-[#00BCC8] text-[#121214] font-black shadow-md'
              : 'text-[#A1A1AA] hover:text-white hover:bg-white/5'
          }`}
        >
          <Heart size={15} className={wishlist.length > 0 ? 'fill-current' : ''} />
          <span>Favoris</span>
          {wishlist.length > 0 && (
            <span className="w-4 h-4 rounded-full bg-[#D0FF00] text-[#121214] text-[9px] font-black flex items-center justify-center">
              {wishlist.length}
            </span>
          )}
        </button>

        <button
          onClick={() => {
            setActiveTab('projects');
            window.scrollTo({ top: 0, behavior: 'smooth' });
          }}
          className={`flex items-center gap-1.5 px-3.5 py-2 rounded-full font-bold uppercase text-[11px] tracking-wider transition-all cursor-pointer ${
            activeTab === 'projects'
              ? 'bg-[#00BCC8] text-[#121214] font-black shadow-md'
              : 'text-[#A1A1AA] hover:text-white hover:bg-white/5'
          }`}
        >
          <ClipboardList size={15} />
          <span>Espace</span>
        </button>
      </nav>

      {/* =====================================================================
          7. FOOTER
      ===================================================================== */}
      <Footer
        lang={lang}
        onOpenDoc={setActiveDocType}
        onOpenChat={() => setIsChatOpen(true)}
      />

      {/* =====================================================================
          BOUTONS FLOTTANTS : CHATPHLOX (GAUCHE) & WHATSAPP (DROITE)
      ===================================================================== */}
      {!isCartOpen && !selectedProduct && !activeDocType && (
        <div className="fixed bottom-5 right-5 z-40 flex items-center gap-2.5">
          {/* Bouton ChatPhlox Assistant */}
          <button
            onClick={() => setIsChatOpen(true)}
            className="relative w-12 h-12 bg-[#7477FF] hover:bg-[#5E62FF] text-white rounded-full shadow-lg hover:scale-105 transition-transform flex items-center justify-center min-w-[48px] min-h-[48px] cursor-pointer"
            aria-label="Ouvrir ChatPhlox (Assistant Virtuel Togo)"
            title="ChatPhlox - Assistant Virtuel"
          >
            <Bot size={22} className="text-white" />
            <span className="absolute -top-0.5 -right-0.5 w-3.5 h-3.5 bg-[#F9CD61] border-2 border-[#1B1A1B] rounded-full" />
          </button>

          {/* Bouton WhatsApp officiel */}
          <a
            href={`${brandConfig.whatsappUrlBase}?text=Bonjour ${brandConfig.name}, je souhaite avoir des renseignements sur vos produits.`}
            target="_blank"
            rel="noreferrer"
            className="w-12 h-12 bg-[#25D366] hover:bg-[#20ba59] text-white rounded-full shadow-lg hover:scale-105 transition-transform flex items-center justify-center min-w-[48px] min-h-[48px]"
            aria-label="Support WhatsApp +228 93 20 60 03"
            title="Support WhatsApp"
          >
            <MessageSquare size={22} className="text-white" />
          </a>
        </div>
      )}

      {/* OFFLINE TOAST INDICATOR */}
      <OfflineIndicator lang={lang} />

      {/* CHATPHLOX ASSISTANT MODAL */}
      <ChatPhlox
        isOpen={isChatOpen}
        onClose={() => setIsChatOpen(false)}
        onOpenProduct={(p) => setSelectedProduct(p)}
        onOpenTracking={() => setActiveTab('projects')}
        lang={lang}
      />

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
