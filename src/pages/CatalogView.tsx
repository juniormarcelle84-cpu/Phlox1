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
  const [searchQuery, setSearchQuery] = useState('');
  const [activeSearch, setActiveSearch] = useState('');
  const [sortBy, setSortBy] = useState<'default' | 'price-asc' | 'price-desc' | 'popular'>('default');
  const [priceRange, setPriceRange] = useState<number>(1000000);
  const [inStockOnly, setInStockOnly] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 6;

  // AI/Smart search states
  const [quota, setQuota] = useState(getSearchQuota());
  const [showPaywall, setShowPaywall] = useState(false);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiResultText, setAiResultText] = useState<string | null>(null);
  const [isProSelectedYearly, setIsProSelectedYearly] = useState(true);

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
    setPriceRange(1000000);
    setInStockOnly(false);
    setCurrentPage(1);
    setAiResultText(null);
  };

  const filteredProducts = products.filter((p) => {
    const matchesCategory = selectedCategory === 'all' || p.category === selectedCategory;
    const matchesSearch =
      activeSearch === '' ||
      p.name.toLowerCase().includes(activeSearch.toLowerCase()) ||
      p.descriptionFr.toLowerCase().includes(activeSearch.toLowerCase()) ||
      p.descriptionEn.toLowerCase().includes(activeSearch.toLowerCase());
    const matchesPrice = p.price <= priceRange;
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
          <h2 className="text-xl sm:text-3xl font-black uppercase tracking-tight text-[#1D1D1F]">
            Catalogue de Produits
          </h2>
          <p className="text-xs text-[#6E6E73] mt-0.5">
            Filtrer, trier et commander en toute sécurité au Togo
          </p>
        </div>

        {/* Quota Badge */}
        {userPlan.plan === 'free' ? (
          <button
            onClick={() => setShowPaywall(true)}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-white border border-[#AAAAAA]/30 hover:border-[#007AFF] rounded-full text-xs font-bold text-[#1D1D1F] transition-colors cursor-pointer"
          >
            <Sparkles size={14} className="text-[#007AFF]" />
            <span>
              {quota.remaining}/{quota.limit} recherches IA
            </span>
          </button>
        ) : (
          <div className="flex items-center gap-1.5 px-4 py-2.5 bg-[#007AFF]/10 text-[#007AFF] border border-[#007AFF]/30 rounded-full text-xs font-black uppercase tracking-wider">
            <Sparkles size={14} />
            <span>{t.activeProBadge}</span>
          </div>
        )}
      </div>

      {/* SEARCH AND AI SEARCH SECTION */}
      <div className="bg-white p-4 sm:p-6 rounded-[28px] space-y-3 border border-[#AAAAAA]/25 text-[#1D1D1F]">
        <form onSubmit={handleSearchSubmit} className="flex flex-col sm:flex-row gap-2.5">
          <div className="relative w-full flex-1">
            <SearchIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-[#6E6E73]" size={18} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un produit"
              className="w-full bg-[#F5F5F7] text-[#1D1D1F] placeholder:text-[#6E6E73] text-sm pl-11 pr-10 py-3.5 rounded-full border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden min-h-[48px]"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setActiveSearch('');
                }}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6E6E73] hover:text-[#1D1D1F] p-1 rounded-full cursor-pointer"
                aria-label="Effacer la recherche"
              >
                <X size={15} />
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 sm:flex gap-2 w-full sm:w-auto shrink-0">
            <button
              type="submit"
              className="px-6 py-3.5 bg-[#007AFF] hover:bg-[#0071EB] text-white font-bold uppercase tracking-wider text-xs rounded-full transition-colors cursor-pointer text-center min-h-[48px]"
            >
              Rechercher
            </button>
            <button
              type="button"
              disabled={!searchQuery.trim() || isAiSearching}
              onClick={() => handleAiSearch()}
              className={`px-5 py-3.5 rounded-full font-bold uppercase tracking-wider text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer min-h-[48px] ${
                searchQuery.trim()
                  ? 'bg-white border border-[#AAAAAA] hover:bg-[#F5F5F7] text-[#1D1D1F]'
                  : 'bg-[#AAAAAA]/35 text-[#1D1D1F]/50 cursor-not-allowed'
              }`}
            >
              <Sparkles size={14} className={isAiSearching ? 'animate-spin text-[#007AFF]' : 'text-[#007AFF]'} />
              <span>{isAiSearching ? '...' : 'Conseil IA'}</span>
            </button>
          </div>
        </form>

        {/* Quick query tags */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 pt-0.5 text-xs">
          <span className="text-[#6E6E73] shrink-0 font-bold text-[11px] uppercase tracking-wider">Suggestions :</span>
          {quickQueries.map((item, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setSearchQuery(item.query);
                handleAiSearch(item.query);
              }}
              className="px-3.5 py-1.5 bg-[#F5F5F7] hover:bg-[#007AFF] text-[#1D1D1F] hover:text-white border border-[#AAAAAA]/30 rounded-full shrink-0 font-medium transition-colors cursor-pointer"
            >
              {item.label}
            </button>
          ))}
        </div>

        {/* AI Recommendations Banner */}
        {aiResultText && (
          <div className="p-4 bg-[#007AFF]/10 border border-[#007AFF]/25 rounded-[20px] text-xs sm:text-sm text-[#1D1D1F] animate-fadeIn flex items-start gap-3">
            <Sparkles size={16} className="text-[#007AFF] shrink-0 mt-0.5" />
            <p className="leading-relaxed">{aiResultText}</p>
          </div>
        )}
      </div>

      {/* FILTERS & PRODUCTS GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Sidebar Filters */}
        <div className="lg:col-span-1 bg-white p-4 sm:p-5 rounded-[28px] space-y-4 self-start border border-[#AAAAAA]/25 text-[#1D1D1F]">
          <div className="flex items-center justify-between">
            <h3 className="font-black uppercase text-xs tracking-wider text-[#1D1D1F] flex items-center gap-1.5">
              <Filter size={14} className="text-[#007AFF]" /> Filtres
            </h3>
            {(activeSearch ||
              selectedCategory !== 'all' ||
              sortBy !== 'default' ||
              priceRange < 1000000 ||
              inStockOnly) && (
              <button
                onClick={handleResetFilters}
                className="text-xs text-[#007AFF] hover:underline cursor-pointer font-bold"
              >
                Réinitialiser
              </button>
            )}
          </div>

          {/* Categories */}
          <div className="space-y-1.5">
            <span className="block text-[11px] font-bold uppercase text-[#6E6E73] tracking-wider">
              Catégorie
            </span>
            <div className="flex lg:flex-col gap-1.5 overflow-x-auto lg:overflow-visible pb-1 lg:pb-0">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`text-left text-xs font-bold px-3.5 py-2.5 rounded-full transition-colors cursor-pointer shrink-0 ${
                  selectedCategory === 'all'
                    ? 'bg-[#007AFF] text-white'
                    : 'bg-[#F5F5F7] text-[#1D1D1F] hover:bg-[#F5F5F7]/70 border border-[#AAAAAA]/30'
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
                        ? 'bg-[#007AFF] text-white'
                        : 'bg-[#F5F5F7] text-[#1D1D1F] hover:bg-[#F5F5F7]/70 border border-[#AAAAAA]/30'
                    }`}
                  >
                    <span>{c.frName}</span>
                    <span
                      className="w-2 h-2 rounded-full shrink-0 hidden lg:inline-block"
                      style={{ backgroundColor: isSelected ? '#FFFFFF' : '#007AFF' }}
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* In stock toggle */}
          <div className="pt-3 border-t border-[#AAAAAA]/25">
            <label className="flex items-center justify-between text-xs font-semibold text-[#1D1D1F] cursor-pointer">
              <span>{t.inStockOnly}</span>
              <input
                type="checkbox"
                checked={inStockOnly}
                onChange={(e) => setInStockOnly(e.target.checked)}
                className="w-4 h-4 accent-[#007AFF] cursor-pointer"
              />
            </label>
          </div>

          {/* Price Range */}
          <div className="space-y-1.5 pt-3 border-t border-[#AAAAAA]/25">
            <div className="flex items-center justify-between text-xs font-bold text-[#6E6E73]">
              <span>Prix Max</span>
              <span className="text-[#007AFF] font-mono tabular-nums font-black">{formatPrice(priceRange)}</span>
            </div>
            <input
              type="range"
              min={10000}
              max={1000000}
              step={10000}
              value={priceRange}
              onChange={(e) => setPriceRange(Number(e.target.value))}
              className="w-full accent-[#007AFF] cursor-pointer"
            />
          </div>

          {/* Sort selection */}
          <div className="space-y-1.5 pt-3 border-t border-[#AAAAAA]/25">
            <span className="text-[11px] font-bold uppercase text-[#6E6E73] tracking-wider flex items-center gap-1">
              <ArrowUpDown size={12} className="text-[#007AFF]" /> Trier par
            </span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
              className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-xs font-semibold px-3 py-2.5 rounded-full border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden cursor-pointer"
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
          {activeSearch && (
            <div className="text-xs text-[#6E6E73]">
              Résultats pour <span className="font-bold text-[#007AFF]">&ldquo;{activeSearch}&rdquo;</span> ({sortedProducts.length} produits)
            </div>
          )}

          {sortedProducts.length === 0 ? (
            <div className="bg-white p-8 sm:p-12 rounded-[28px] text-center space-y-4 border border-[#AAAAAA]/25 text-[#1D1D1F]">
              <div className="w-14 h-14 rounded-full bg-[#F5F5F7] flex items-center justify-center mx-auto text-[#007AFF]">
                <ShieldAlert size={26} />
              </div>
              <h4 className="text-base font-black uppercase tracking-tight text-[#1D1D1F]">{t.searchNoResult}</h4>
              <button
                onClick={handleResetFilters}
                className="px-6 py-3 bg-[#007AFF] hover:bg-[#0071EB] text-white font-bold uppercase text-xs rounded-full transition-colors cursor-pointer"
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
                    <div
                      key={p.id}
                      onClick={() => onSelectProduct(p)}
                      className="group bg-white rounded-[28px] p-3 sm:p-4 flex flex-col justify-between cursor-pointer border border-[#AAAAAA]/25 hover:border-[#007AFF]/50 transition-all text-[#1D1D1F]"
                    >
                      <div>
                        {/* Image Container */}
                        <div className="relative aspect-square bg-[#F5F5F7] rounded-[20px] overflow-hidden flex items-center justify-center mb-2.5">
                          {p.isPromo && (
                            <span className="absolute top-2 left-2 z-10 bg-[#007AFF] text-white text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full">
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
                                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/90 hover:bg-white text-[#6E6E73] hover:text-[#007AFF] shadow-xs flex items-center justify-center cursor-pointer border border-[#AAAAAA]/20"
                                aria-label="Favoris"
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
                                  onSelectProduct(p);
                                }}
                                className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-white/90 hover:bg-white text-[#6E6E73] hover:text-[#007AFF] shadow-xs flex items-center justify-center cursor-pointer border border-[#AAAAAA]/20"
                                aria-label="Aperçu rapide"
                              >
                                <Eye size={14} />
                              </button>
                            </div>
                          )}

                          <img
                            src={p.image}
                            alt={p.name}
                            loading="lazy"
                            decoding="async"
                            referrerPolicy="no-referrer"
                            onError={(e) => {
                              (e.target as HTMLImageElement).src = FALLBACK_PRODUCT_IMAGE;
                            }}
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                          />

                          {isOutOfStock && (
                            <div className="absolute inset-0 bg-[#1D1D1F]/75 flex items-center justify-center p-2">
                              <span className="text-[10px] font-black uppercase text-white bg-[#FF3B30] px-2.5 py-1 rounded-full text-center">
                                Rupture
                              </span>
                            </div>
                          )}
                        </div>

                        {/* Nom sur 2 lignes max */}
                        <h4 className="text-xs sm:text-sm font-bold text-[#1D1D1F] line-clamp-2 min-h-[2.25rem] sm:min-h-[2.5rem] leading-snug group-hover:text-[#007AFF] transition-colors">
                          {p.name}
                        </h4>

                        {/* Prix dessous */}
                        <div className="mt-1 mb-2.5">
                          <div className="text-xs sm:text-sm font-black text-[#1D1D1F] font-mono tabular-nums">
                            {formatPrice(p.price)}
                          </div>
                          {p.originalPrice && (
                            <div className="text-[10px] sm:text-xs line-through text-[#6E6E73] font-mono tabular-nums">
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
                        className={`w-full py-2.5 px-3 rounded-full text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-1 transition-colors cursor-pointer min-h-[42px] ${
                          isOutOfStock
                            ? 'bg-[#AAAAAA]/35 text-[#1D1D1F]/50 cursor-not-allowed'
                            : isAdded
                            ? 'bg-[#34C759] text-white'
                            : 'bg-[#007AFF] hover:bg-[#0071EB] text-white'
                        }`}
                      >
                        <Plus size={14} />
                        <span>{isAdded ? 'Ajouté' : 'Ajouter'}</span>
                      </button>
                    </div>
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
                    className="p-2.5 bg-white text-[#1D1D1F] border border-[#AAAAAA]/30 rounded-full disabled:opacity-30 hover:bg-[#F5F5F7] transition-colors cursor-pointer"
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
                          ? 'bg-[#007AFF] text-white'
                          : 'bg-white text-[#1D1D1F] border border-[#AAAAAA]/30 hover:bg-[#F5F5F7]'
                      }`}
                    >
                      {pageNum}
                    </button>
                  ))}
                  <button
                    type="button"
                    disabled={safePage >= totalPages}
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    className="p-2.5 bg-white text-[#1D1D1F] border border-[#AAAAAA]/30 rounded-full disabled:opacity-30 hover:bg-[#F5F5F7] transition-colors cursor-pointer"
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
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#1D1D1F]/45 backdrop-blur-sm animate-fadeIn"
          role="dialog"
          aria-modal="true"
        >
          <div className="relative w-full max-w-md bg-white rounded-[28px] overflow-hidden p-6 text-[#1D1D1F] text-center border border-[#AAAAAA]/30 shadow-2xl">
            <button
              onClick={() => setShowPaywall(false)}
              className="absolute top-4 right-4 p-2 text-[#6E6E73] hover:text-[#1D1D1F] rounded-full bg-[#F5F5F7] cursor-pointer"
              aria-label={t.close}
            >
              <X size={18} />
            </button>

            <div className="w-14 h-14 bg-[#007AFF]/10 text-[#007AFF] rounded-full flex items-center justify-center mx-auto mb-3">
              <Sparkles size={28} />
            </div>

            <h3 className="text-xl font-black uppercase tracking-tight text-[#1D1D1F] mb-1">{t.paywallTitle}</h3>
            <p className="text-xs text-[#6E6E73] mb-5">{t.paywallSubtitle}</p>

            <div className="text-left space-y-2 mb-5 bg-[#F5F5F7] p-4 rounded-[20px] text-xs text-[#1D1D1F] border border-[#AAAAAA]/20">
              {[t.proFeature1, t.proFeature2, t.proFeature3, t.proFeature4].map((feat, i) => (
                <div key={i} className="flex items-center gap-2">
                  <Check size={14} className="text-[#34C759] shrink-0" />
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
                    ? 'border-[#007AFF] bg-[#007AFF]/10 text-[#007AFF]'
                    : 'border-[#AAAAAA]/30 bg-[#F5F5F7] text-[#6E6E73]'
                }`}
              >
                <span className="uppercase tracking-wider">Annuel</span>
                <span className="text-[#1D1D1F] font-black text-[11px]">{t.proPriceYearly}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsProSelectedYearly(false)}
                className={`p-3 rounded-2xl border-2 text-xs font-black flex flex-col items-center justify-center gap-1 cursor-pointer transition-all ${
                  !isProSelectedYearly
                    ? 'border-[#007AFF] bg-[#007AFF]/10 text-[#007AFF]'
                    : 'border-[#AAAAAA]/30 bg-[#F5F5F7] text-[#6E6E73]'
                }`}
              >
                <span className="uppercase tracking-wider">Mensuel</span>
                <span className="text-[#1D1D1F] font-black text-[11px]">{t.proPriceMonthly}</span>
              </button>
            </div>

            <div className="space-y-2">
              <button
                onClick={handleUpgradeToPro}
                className="w-full py-3.5 bg-[#007AFF] hover:bg-[#0071EB] text-white font-bold text-xs uppercase tracking-wider rounded-full transition-colors cursor-pointer min-h-[48px]"
              >
                {t.activateProBtn}
              </button>
              <button
                onClick={() => setShowPaywall(false)}
                className="w-full py-2 text-xs text-[#6E6E73] hover:text-[#1D1D1F] font-semibold cursor-pointer"
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
