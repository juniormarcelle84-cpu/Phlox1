import React, { useState, useEffect } from 'react';
import {
  Search as SearchIcon,
  Sparkles,
  Filter,
  ArrowUpDown,
  ShieldAlert,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Plus,
  Heart,
  Eye
} from 'lucide-react';
import { Product } from '../types';
import { translations, Lang, formatPrice } from '../services/i18n';
import { decrementSearchQuota, getSearchQuota, subscribeToPro, FALLBACK_PRODUCT_IMAGE } from '../services/storeService';
import { TiltCard } from '../components/TiltCard';
import { LazyImage } from '../components/LazyImage';
import brandConfig from '../brand.config.json';

interface CatalogViewProps {
  products: Product[];
  lang: Lang;
  onSelectProduct: (product: Product) => void;
  selectedCategory: string;
  setSelectedCategory: (cat: string) => void;
  userPlan: { plan: 'free' | 'pro'; proUntil?: string };
  setUserPlan: React.Dispatch<React.SetStateAction<{ plan: 'free' | 'pro'; proUntil?: string }>>;
  wishlist?: string[];
  onToggleWishlist?: (id: string) => void;
  onQuickAdd?: (e: React.MouseEvent, product: Product) => void;
  justAddedId?: string | null;
}

export const CatalogView: React.FC<CatalogViewProps> = ({
  products,
  lang,
  onSelectProduct,
  selectedCategory,
  setSelectedCategory,
  userPlan,
  setUserPlan,
  wishlist = [],
  onToggleWishlist,
  onQuickAdd,
  justAddedId
}) => {
  const t = translations[lang];

  // Search, Filters & Sorting state
  const DEFAULT_MAX_PRICE = 1000000;
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'popular'>('default');
  const [minPrice, setMinPrice] = useState<number>(0);
  const [maxPrice, setMaxPrice] = useState<number>(DEFAULT_MAX_PRICE);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  // AI/Smart search states
  const [quota, setQuota] = useState(getSearchQuota());
  const [showPaywall, setShowPaywall] = useState(false);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiResultText, setAiResultText] = useState<string | null>(null);
  const [isProSelectedYearly, setIsProSelectedYearly] = useState(true);

  const pricePresets = [
    { label: 'Tous', min: 0, max: DEFAULT_MAX_PRICE },
    { label: '< 30k', min: 0, max: 30000 },
    { label: '30k - 75k', min: 30000, max: 75000 },
    { label: '75k - 200k', min: 75000, max: 200000 },
    { label: '> 200k', min: 200000, max: DEFAULT_MAX_PRICE }
  ];

  useEffect(() => {
    setQuota(getSearchQuota());
  }, [userPlan]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setActiveSearch(searchQuery);
    setCurrentPage(1);
    setAiResultText(null);
  };

  const quickQueries = [
    { label: 'Casque sans fil', query: 'casque' },
    { label: 'Montre connectée', query: 'montre' },
    { label: 'PC Gaming', query: 'gaming laptop' },
    { label: 'Casque VR', query: 'vr' },
    { label: 'Enceinte Bluetooth', query: 'enceinte' }
  ];

  const handleAiSearch = (customQuery?: string) => {
    const textToSearch = customQuery || searchQuery;
    if (!textToSearch.trim()) return;

    if (userPlan.plan === 'free' && quota.remaining <= 0) {
      setShowPaywall(true);
      return;
    }

    setIsAiSearching(true);
    setAiResultText(null);
    setCurrentPage(1);

    if (userPlan.plan === 'free') {
      const updated = decrementSearchQuota();
      setQuota(updated);
    }

    setTimeout(() => {
      setIsAiSearching(false);
      const query = textToSearch.toLowerCase();

      if (query.includes('écouteur') || query.includes('casque') || query.includes('son') || query.includes('beats')) {
        setSelectedCategory('earphone');
        setAiResultText(
          'Recommandation IA : Nos meilleurs casques Beats Solo et écouteurs TWS étanches pour une immersion sonore absolue.'
        );
      } else if (query.includes('montre') || query.includes('sport') || query.includes('watch')) {
        setSelectedCategory('watch');
        setAiResultText(
          "Recommandation IA : La Phlox Smartwatch Active V2 avec suivi d'activité et alertes d'appels WhatsApp."
        );
      } else if (query.includes('ordinateur') || query.includes('pc') || query.includes('gaming') || query.includes('laptop')) {
        setSelectedCategory('laptop');
        setAiResultText(
          "Recommandation IA : L'ordinateur Phlox Extreme Gaming doté de l'Intel i9 et RTX 4070 répondra à vos exigences."
        );
      } else if (query.includes('vr') || query.includes('oculus') || query.includes('3d')) {
        setSelectedCategory('vr');
        setAiResultText(
          "Recommandation IA : Le casque Phlox VR Vision Quest autonome pour des films et jeux en 3D d'un réalisme frappant."
        );
      } else if (query.includes('enceinte') || query.includes('speaker') || query.includes('bluetooth')) {
        setSelectedCategory('speaker');
        setAiResultText(
          "Recommandation IA : L'enceinte Phlox Bass Pro propose 24h d'autonomie et des basses puissantes."
        );
      } else {
        setAiResultText(
          'Recommandation IA : Analyse du catalogue terminée pour extraire les équipements correspondant à votre recherche.'
        );
      }

      setActiveSearch(textToSearch);
    }, 500);
  };

  const handleResetFilters = () => {
    setSearchQuery('');
    setActiveSearch('');
    setSelectedCategory('all');
    setSortBy('default');
    setMinPrice(0);
    setMaxPrice(DEFAULT_MAX_PRICE);
    setInStockOnly(false);
    setCurrentPage(1);
    setAiResultText(null);
  };

  const isPriceFiltered = minPrice > 0 || maxPrice < DEFAULT_MAX_PRICE;

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesSearch =
      activeSearch === '' ||
      p.name.toLowerCase().includes(activeSearch.toLowerCase()) ||
      p.descriptionFr.toLowerCase().includes(activeSearch.toLowerCase()) ||
      p.descriptionEn.toLowerCase().includes(activeSearch.toLowerCase());
    const matchesPrice = p.price >= minPrice && p.price <= maxPrice;
    const matchesStock = inStockOnly ? p.stock > 0 : true;
    return matchesCategory && matchesSearch && matchesPrice && matchesStock;
  });

  const sortedProducts = [...filteredProducts].sort((a, b) => {
    if (sortBy === 'price-asc') return a.price - b.price;
    if (sortBy === 'price-desc') return b.price - a.price;
    if (sortBy === 'popular') return (b.isPopular ? 1 : 0) - (a.isPopular ? 1 : 0);
    return 0;
  });

  const totalPages = Math.max(1, Math.ceil(sortedProducts.length / ITEMS_PER_PAGE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedProducts = sortedProducts.slice(
    (safePage - 1) * ITEMS_PER_PAGE,
    safePage * ITEMS_PER_PAGE
  );

  const handleUpgradeToPro = () => {
    const updatedPlan = subscribeToPro();
    setUserPlan(updatedPlan);
    setShowPaywall(false);
  };

  return (
    <div className="space-y-6 animate-fadeIn text-[#1D1D1F]">
      {/* Header Info */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-3xl font-black uppercase tracking-tight text-white">
            Catalogue de Produits
          </h2>
          <p className="text-xs text-[#C5D4CA] mt-0.5">
            Filtrer, trier et commander en toute sécurité au Togo
          </p>
        </div>

        {/* Quota Badge */}
        {userPlan.plan === 'free' ? (
          <button
            onClick={() => setShowPaywall(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-[#312F30] border border-white/15 hover:border-[#7477FF] rounded-full text-xs font-bold text-white transition-colors cursor-pointer"
          >
            <Sparkles size={14} className="text-[#F9CD61]" />
            <span>
              {quota.remaining}/{quota.limit} recherches IA
            </span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 px-4 py-2.5 bg-[#7477FF]/20 text-[#7477FF] border border-[#7477FF]/30 rounded-full text-xs font-black uppercase tracking-wider">
            <Sparkles size={14} />
            <span>{t.activeProBadge}</span>
          </div>
        )}
      </div>

      {/* SEARCH AND AI SEARCH SECTION */}
      <div className="bg-[#312F30] p-4 sm:p-6 rounded-[28px] space-y-3 border border-white/10 text-white">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative w-full flex-1">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-[#C5D4CA]/60" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un produit (ex: iPhone, montre, casque, PC...)"
              className="w-full bg-[#1B1A1B] text-white placeholder:text-[#C5D4CA]/50 text-sm pl-11 pr-10 py-3.5 rounded-full border border-white/15 focus:border-[#7477FF] focus:outline-hidden min-h-[48px]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveSearch('');
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#C5D4CA] hover:text-white p-1 rounded-full cursor-pointer"
                aria-label="Effacer la recherche"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto shrink-0">
            <button
              type="submit"
              className="px-6 py-3.5 bg-[#7477FF] hover:bg-[#5E62FF] text-white font-black uppercase tracking-wider text-xs rounded-full transition-colors cursor-pointer text-center min-h-[48px] shadow-md"
            >
              Rechercher
            </button>
            <button
              type="button"
              disabled={!searchQuery.trim() || isAiSearching}
              onClick={() => handleAiSearch()}
              className={`px-5 py-3.5 rounded-full font-black uppercase tracking-wider text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[48px] ${
                searchQuery.trim()
                  ? 'bg-[#1B1A1B] border border-white/20 hover:bg-[#7477FF] text-white'
                  : 'bg-white/5 text-white/30 cursor-not-allowed border border-white/5'
              }`}
            >
              <Sparkles size={14} className={isAiSearching ? 'animate-spin text-[#F9CD61]' : 'text-[#F9CD61]'} />
              <span>{isAiSearching ? '...' : 'Conseil IA'}</span>
            </button>
          </div>
        </form>

        {/* Quick query tags */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 text-xs no-scrollbar">
          <span className="text-[#C5D4CA] shrink-0 font-bold text-[11px] uppercase tracking-wider">Suggestions :</span>
          {quickQueries.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setSearchQuery(item.query);
                handleAiSearch(item.query);
              }}
              className="px-3.5 py-1.5 bg-[#1B1A1B] hover:bg-[#7477FF] text-[#FFFFFF] border border-white/10 rounded-full shrink-0 font-bold text-[11px] transition-colors cursor-pointer"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* AI Recommendations Banner */}
        {aiResultText && (
          <div className="p-4 bg-[#7477FF]/15 border border-[#7477FF]/30 rounded-[20px] text-xs sm:text-sm text-white animate-fadeIn flex items-start gap-3">
            <Sparkles size={16} className="text-[#F9CD61] shrink-0 mt-0.5" />
            <p className="leading-relaxed">{aiResultText}</p>
          </div>
        )}
      </div>

      {/* FILTERS & PRODUCTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Filters */}
        <div className="lg:col-span-1 bg-[#312F30] p-4 sm:p-5 rounded-[28px] space-y-4 self-start border border-white/10 text-white">
          <div className="flex items-center justify-between">
            <h3 className="font-black uppercase text-xs tracking-wider text-white flex items-center gap-1.5">
              <Filter size={14} className="text-[#7477FF]" /> Filtres
            </h3>
            {(activeSearch ||
              selectedCategory !== 'all' ||
              sortBy !== 'default' ||
              isPriceFiltered ||
              inStockOnly) && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-[#7477FF] hover:underline cursor-pointer font-bold"
              >
                Réinitialiser
              </button>
            )}
          </div>

          {/* Categories */}
          <div className="space-y-1.5">
            <span className="block text-[11px] font-bold uppercase text-[#C5D4CA] tracking-wider">
              Catégorie
            </span>
            <div className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0 no-scrollbar">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`text-left text-xs font-bold px-3.5 py-2.5 rounded-full transition-colors cursor-pointer shrink-0 ${
                  selectedCategory === 'all'
                    ? 'bg-[#7477FF] text-white'
                    : 'bg-[#1B1A1B] text-[#FFFFFF] hover:bg-[#1B1A1B]/70 border border-white/10'
                }`}
              >
                Toutes
              </button>
              {brandConfig.categories.map((c) => {
                const isSelected = selectedCategory === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setSelectedCategory(c.id)}
                    className={`text-left text-xs font-bold px-3.5 py-2.5 rounded-full transition-colors cursor-pointer flex items-center justify-between gap-2 shrink-0 ${
                      isSelected
                        ? 'bg-[#7477FF] text-white'
                        : 'bg-[#1B1A1B] text-[#FFFFFF] hover:bg-[#1B1A1B]/70 border border-white/10'
                    }`}
                  >
                    <span>{c.frName}</span>
                    <span
                      className="w-2 h-2 rounded-full shrink-0 hidden lg:inline-block"
                      style={{ backgroundColor: isSelected ? '#FFFFFF' : '#7477FF' }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* In stock toggle */}
          <div className="pt-3 border-t border-white/10">
            <label className="flex items-center justify-between text-xs font-bold text-white cursor-pointer">
              <span>{t.inStockOnly}</span>
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="w-4 h-4 accent-[#7477FF] cursor-pointer"
              />
            </label>
          </div>

          {/* Price Range (Min / Max) */}
          <div className="space-y-3 pt-3 border-t border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase text-[#C5D4CA] tracking-wider">
                Fourchette de Prix
              </span>
              {isPriceFiltered && (
                <button
                  type="button"
                  onClick={() => {
                    setMinPrice(0);
                    setMaxPrice(DEFAULT_MAX_PRICE);
                  }}
                  className="text-[10px] text-[#7477FF] hover:underline font-bold cursor-pointer"
                >
                  Effacer
                </button>
              )}
            </div>

            {/* Tranches rapides (presets) */}
            <div className="grid grid-cols-2 gap-1.5">
              {pricePresets.map((preset, idx) => {
                const isActive = minPrice === preset.min && maxPrice === preset.max;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setMinPrice(preset.min);
                      setMaxPrice(preset.max);
                      setCurrentPage(1);
                    }}
                    className={`text-[11px] font-bold py-1.5 px-2 rounded-full border transition-all cursor-pointer truncate ${
                      isActive
                        ? 'bg-[#7477FF] text-white border-[#7477FF]'
                        : 'bg-[#1B1A1B] text-[#FFFFFF] border-white/10 hover:border-[#7477FF]/50'
                    }`}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>

            {/* Formatted range indicator */}
            <div className="bg-[#1B1A1B] p-2.5 rounded-2xl border border-white/10 text-center">
              <span className="text-[10px] text-[#C5D4CA] uppercase font-bold tracking-wider block">Intervalle sélectionné</span>
              <span className="text-xs font-black text-[#F9CD61] font-mono tabular-nums">
                {formatPrice(minPrice)} &mdash; {maxPrice >= DEFAULT_MAX_PRICE ? 'Illimité' : formatPrice(maxPrice)}
              </span>
            </div>

            {/* Saisie manuelle Min et Max */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[10px] uppercase font-bold text-[#C5D4CA] mb-1 block">Min (FCFA)</label>
                <input
                  type="number"
                  min={0}
                  max={maxPrice}
                  step={5000}
                  value={minPrice === 0 ? '' : minPrice}
                  placeholder="0"
                  onChange={(e) => {
                    const val = Math.max(0, Number(e.target.value) || 0);
                    setMinPrice(Math.min(val, maxPrice));
                    setCurrentPage(1);
                  }}
                  className="w-full bg-[#1B1A1B] text-white text-xs font-semibold px-2.5 py-2 rounded-xl border border-white/15 focus:border-[#7477FF] focus:outline-hidden"
                />
              </div>
              <div>
                <label className="text-[10px] uppercase font-bold text-[#C5D4CA] mb-1 block">Max (FCFA)</label>
                <input
                  type="number"
                  min={minPrice}
                  max={DEFAULT_MAX_PRICE}
                  step={5000}
                  value={maxPrice >= DEFAULT_MAX_PRICE ? '' : maxPrice}
                  placeholder="Max"
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (!e.target.value) {
                      setMaxPrice(DEFAULT_MAX_PRICE);
                    } else {
                      setMaxPrice(Math.max(minPrice, val));
                    }
                    setCurrentPage(1);
                  }}
                  className="w-full bg-[#1B1A1B] text-white text-xs font-semibold px-2.5 py-2 rounded-xl border border-white/15 focus:border-[#7477FF] focus:outline-hidden"
                />
              </div>
            </div>

            {/* Sliders synchronisés */}
            <div className="space-y-2 pt-1">
              <div>
                <div className="flex justify-between text-[10px] text-[#C5D4CA] font-semibold mb-0.5">
                  <span>Curseur Min</span>
                  <span className="font-mono text-[#F9CD61] font-bold">{formatPrice(minPrice)}</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={Math.min(DEFAULT_MAX_PRICE - 10000, maxPrice)}
                  step={5000}
                  value={minPrice}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setMinPrice(Math.min(val, maxPrice - 5000));
                    setCurrentPage(1);
                  }}
                  className="w-full accent-[#7477FF] cursor-pointer"
                />
              </div>
              <div>
                <div className="flex justify-between text-[10px] text-[#C5D4CA] font-semibold mb-0.5">
                  <span>Curseur Max</span>
                  <span className="font-mono text-[#F9CD61] font-bold">{maxPrice >= DEFAULT_MAX_PRICE ? '1 000 000+ F' : formatPrice(maxPrice)}</span>
                </div>
                <input
                  type="range"
                  min={minPrice + 5000}
                  max={DEFAULT_MAX_PRICE}
                  step={5000}
                  value={maxPrice}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setMaxPrice(Math.max(val, minPrice + 5000));
                    setCurrentPage(1);
                  }}
                  className="w-full accent-[#7477FF] cursor-pointer"
                />
              </div>
            </div>
          </div>

          {/* Sort selection */}
          <div className="space-y-1.5 pt-3 border-t border-white/10">
            <span className="text-[11px] font-bold uppercase text-[#C5D4CA] tracking-wider flex items-center gap-1">
              <ArrowUpDown size={12} className="text-[#7477FF]" /> Trier par
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="w-full bg-[#1B1A1B] text-white text-xs font-semibold px-3 py-2.5 rounded-full border border-white/15 focus:border-[#7477FF] focus:outline-hidden cursor-pointer"
            >
              <option value="default">Recommandé</option>
              <option value="price-asc">Prix : Croissant</option>
              <option value="price-desc">Prix : Décroissant</option>
              <option value="popular">Populaires d&apos;abord</option>
            </select>
          </div>
        </div>

        {/* PRODUCTS GRID */}
        <div className="lg:col-span-3 space-y-6">
          {/* Active filter badges toolbar */}
          {(activeSearch || selectedCategory !== 'all' || isPriceFiltered || inStockOnly) && (
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="text-[#C5D4CA] font-bold text-[11px] uppercase tracking-wider">Filtres actifs :</span>
              
              {activeSearch && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#312F30] border border-white/15 rounded-full font-semibold text-white">
                  Recherche : &ldquo;{activeSearch}&rdquo;
                  <button
                    type="button"
                    onClick={() => {
                      setActiveSearch('');
                      setSearchQuery('');
                    }}
                    className="hover:text-[#7477FF] cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}

              {selectedCategory !== 'all' && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#312F30] border border-white/15 rounded-full font-semibold text-white">
                  Catégorie : {brandConfig.categories.find(c => c.id === selectedCategory)?.frName || selectedCategory}
                  <button
                    type="button"
                    onClick={() => setSelectedCategory('all')}
                    className="hover:text-[#7477FF] cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}

              {isPriceFiltered && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#7477FF]/20 border border-[#7477FF]/30 text-[#7477FF] rounded-full font-semibold">
                  Prix : {formatPrice(minPrice)} &mdash; {maxPrice >= DEFAULT_MAX_PRICE ? 'Illimité' : formatPrice(maxPrice)}
                  <button
                    type="button"
                    onClick={() => {
                      setMinPrice(0);
                      setMaxPrice(DEFAULT_MAX_PRICE);
                    }}
                    className="hover:text-white cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}

              {inStockOnly && (
                <span className="inline-flex items-center gap-1 px-3 py-1 bg-[#312F30] border border-white/15 rounded-full font-semibold text-white">
                  En stock uniquement
                  <button
                    type="button"
                    onClick={() => setInStockOnly(false)}
                    className="hover:text-[#7477FF] cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </span>
              )}

              <button
                type="button"
                onClick={handleResetFilters}
                className="text-[#7477FF] hover:underline font-bold text-xs ml-auto cursor-pointer"
              >
                Tout effacer
              </button>
            </div>
          )}

          {activeSearch && !(selectedCategory !== 'all' || isPriceFiltered || inStockOnly) && (
            <div className="text-xs text-[#C5D4CA]">
              Résultats pour <span className="font-bold text-[#F9CD61]">&ldquo;{activeSearch}&rdquo;</span> ({sortedProducts.length} produits)
            </div>
          )}

          {sortedProducts.length === 0 ? (
            <div className="bg-[#312F30] p-8 sm:p-12 rounded-[28px] text-center space-y-4 border border-white/10 text-white">
              <div className="w-14 h-14 rounded-full bg-[#1B1A1B] flex items-center justify-center mx-auto text-[#7477FF]">
                <ShieldAlert size={26} />
              </div>
              <h4 className="text-base font-black uppercase tracking-tight text-white">{t.searchNoResult}</h4>
              <button
                onClick={handleResetFilters}
                className="px-6 py-3 bg-[#7477FF] hover:bg-[#5E62FF] text-white font-black uppercase text-xs rounded-full transition-colors cursor-pointer"
              >
                Réinitialiser les filtres
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-5">
                {paginatedProducts.map((p) => {
                  const isOutOfStock = p.stock <= 0;
                  const isFav = wishlist.includes(p.id);
                  const isAdded = justAddedId === p.id;

                  return (
                    <TiltCard
                      key={p.id}
                      onClick={() => onSelectProduct(p)}
                      maxTilt={8}
                      scale={1.03}
                      perspective={900}
                      className="group bg-[#312F30] rounded-[28px] p-3 sm:p-4 flex flex-col justify-between cursor-pointer border border-white/10 hover:border-[#7477FF]/60 hover:shadow-2xl transition-all text-white shadow-md transform-gpu"
                    >
                      <div>
                        {/* Image Container */}
                        <div className="relative aspect-square bg-[#1B1A1B] rounded-[20px] overflow-hidden flex items-center justify-center mb-2.5">
                          {p.isPromo && (
                            <span className="absolute top-2 left-2 z-10 bg-[#7477FF] text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full shadow-sm">
                              Promo
                            </span>
                          )}

                          {onToggleWishlist && (
                            <div className="absolute top-2 right-2 z-10 flex flex-col gap-1.5">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onToggleWishlist(p.id);
                                }}
                                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#312F30]/90 hover:bg-[#312F30] text-[#C5D4CA] hover:text-[#7477FF] shadow-xs flex items-center justify-center cursor-pointer border border-white/10"
                                aria-label="Favoris"
                              >
                                <Heart
                                  size={14}
                                  className={isFav ? 'text-[#7477FF] fill-[#7477FF]' : ''}
                                />
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onSelectProduct(p);
                                }}
                                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#312F30]/90 hover:bg-[#312F30] text-[#C5D4CA] hover:text-[#7477FF] shadow-xs flex items-center justify-center cursor-pointer border border-white/10"
                                aria-label="Aperçu rapide"
                              >
                                <Eye size={14} />
                              </button>
                            </div>
                          )}

                          <LazyImage
                            src={p.image}
                            alt={p.name}
                            wrapperClassName="w-full h-full"
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />

                          {isOutOfStock && (
                            <div className="absolute inset-0 bg-[#1B1A1B]/80 flex items-center justify-center p-2">
                              <span className="text-[10px] font-black uppercase text-white bg-[#F66554] px-2.5 py-1 rounded-full text-center">
                                Rupture
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Nom sur 2 lignes max */}
                        <h4 className="text-xs sm:text-sm font-bold text-white line-clamp-2 min-h-[2.25rem] sm:min-h-[2.5rem] leading-snug group-hover:text-[#7477FF] transition-colors">
                          {p.name}
                        </h4>

                        {/* Prix dessous */}
                        <div className="mt-1 mb-2.5">
                          <div className="text-xs sm:text-sm font-black text-[#F9CD61] font-mono tabular-nums">
                            {formatPrice(p.price)}
                          </div>
                          {p.originalPrice && (
                            <div className="text-[10px] sm:text-xs line-through text-[#C5D4CA]/60 font-mono tabular-nums">
                              {formatPrice(p.originalPrice)}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Bouton "Ajouter" pleine largeur sous le prix */}
                      <button
                        type="button"
                        disabled={isOutOfStock}
                        onClick={(e) => {
                          if (onQuickAdd) {
                            onQuickAdd(e, p);
                          } else {
                            e.stopPropagation();
                            onSelectProduct(p);
                          }
                        }}
                        className={`w-full py-2.5 px-3 rounded-full text-xs font-black uppercase tracking-wider flex items-center justify-center gap-1 transition-colors cursor-pointer min-h-[42px] ${
                          isOutOfStock
                            ? 'bg-white/5 text-white/30 cursor-not-allowed border border-white/5'
                            : isAdded
                            ? 'bg-[#F9CD61] text-[#1B1A1B]'
                            : 'bg-[#7477FF] hover:bg-[#5E62FF] text-white shadow-xs'
                        }`}
                      >
                        <Plus size={14} />
                        <span>{isAdded ? 'Ajouté' : 'Ajouter'}</span>
                      </button>
                    </TiltCard>
                  );
                })}
              </div>

              {/* PAGINATION */}
              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-2">
                  <button
                    type="button"
                    disabled={safePage <= 1}
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    className="p-2.5 bg-[#312F30] text-white border border-white/10 rounded-full disabled:opacity-30 hover:bg-[#1B1A1B] transition-colors cursor-pointer"
                    aria-label="Page précédente"
                  >
                    <ChevronLeft size={16} />
                  </button>
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                    <button
                      key={pageNum}
                      type="button"
                      onClick={() => setCurrentPage(pageNum)}
                      className={`w-9 h-9 rounded-full text-xs font-black transition-colors cursor-pointer ${
                        safePage === pageNum
                          ? 'bg-[#7477FF] text-white'
                          : 'bg-[#312F30] text-white border border-white/10 hover:bg-[#1B1A1B]'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-2.5 bg-[#312F30] text-white border border-white/10 rounded-full disabled:opacity-30 hover:bg-[#1B1A1B] transition-colors cursor-pointer"
                    aria-label="Page suivante"
                  >
                    <ChevronRight size={16} />
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* PRO PAYWALL MODAL */}
      {showPaywall && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1B1A1B]/80 backdrop-blur-md animate-fadeIn"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-md bg-[#312F30] rounded-[28px] overflow-hidden p-6 text-white text-center border border-white/15 shadow-2xl">
            <button
              onClick={() => setShowPaywall(false)}
              className="absolute top-4 right-4 p-2 text-[#C5D4CA] hover:text-white rounded-full bg-[#1B1A1B] cursor-pointer"
              aria-label={t.close}
            >
              <X size={18} />
            </button>

            <div className="w-14 h-14 bg-[#7477FF]/20 text-[#7477FF] border border-[#7477FF]/30 rounded-full flex items-center justify-center mx-auto mb-3">
              <Sparkles size={28} />
            </div>

            <h3 className="text-xl font-black uppercase tracking-tight text-white mb-1">{t.paywallTitle}</h3>
            <p className="text-xs text-[#C5D4CA] mb-5">{t.paywallSubtitle}</p>

            <div className="text-left space-y-2 mb-5 bg-[#1B1A1B] p-4 rounded-[20px] text-xs text-white border border-white/10">
              {[t.proFeature1, t.proFeature2, t.proFeature3, t.proFeature4].map((feat, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Check size={14} className="text-[#F9CD61] shrink-0" />
                  <span>{feat}</span>
                </div>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-2.5 mb-5">
              <button
                type="button"
                onClick={() => setIsProSelectedYearly(true)}
                className={`p-3 rounded-2xl border-2 text-xs font-black flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                  isProSelectedYearly
                    ? 'border-[#7477FF] bg-[#7477FF]/20 text-[#7477FF]'
                    : 'border-white/10 bg-[#1B1A1B] text-[#C5D4CA]'
                }`}
              >
                <span className="uppercase tracking-wider">Annuel</span>
                <span className="text-white font-black text-[11px]">{t.proPriceYearly}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsProSelectedYearly(false)}
                className={`p-3 rounded-2xl border-2 text-xs font-black flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                  !isProSelectedYearly
                    ? 'border-[#7477FF] bg-[#7477FF]/20 text-[#7477FF]'
                    : 'border-white/10 bg-[#1B1A1B] text-[#C5D4CA]'
                }`}
              >
                <span className="uppercase tracking-wider">Mensuel</span>
                <span className="text-white font-black text-[11px]">{t.proPriceMonthly}</span>
              </button>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleUpgradeToPro}
                className="w-full py-3.5 bg-[#7477FF] hover:bg-[#5E62FF] text-white font-black text-xs uppercase tracking-wider rounded-full transition-colors cursor-pointer min-h-[48px] shadow-md"
              >
                {t.activateProBtn}
              </button>
              <button
                onClick={() => setShowPaywall(false)}
                className="w-full py-2 text-xs text-[#C5D4CA] hover:text-white font-semibold cursor-pointer"
              >
                {t.maybeLater}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
