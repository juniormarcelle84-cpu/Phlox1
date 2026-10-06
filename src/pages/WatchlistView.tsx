import React from 'react';
import { Heart, HeartOff, Plus, ArrowRight } from 'lucide-react';
import { Product } from '../types';
import { Lang, translations, formatPrice } from '../services/i18n';
import { FALLBACK_PRODUCT_IMAGE } from '../services/storeService';

interface WatchlistViewProps {
  products: Product[];
  wishlist: string[];
  lang: Lang;
  onSelectProduct: (product: Product) => void;
  onToggleWishlist: (id: string) => void;
  onNavigateToCatalog: () => void;
  onQuickAdd?: (e: React.MouseEvent, product: Product) => void;
  justAddedId?: string | null;
}

export const WatchlistView: React.FC<WatchlistViewProps> = ({
  products,
  wishlist,
  lang,
  onSelectProduct,
  onToggleWishlist,
  onNavigateToCatalog,
  onQuickAdd,
  justAddedId
}) => {
  const t = translations[lang];
  const favorites = products.filter((p) => wishlist.includes(p.id));

  return (
    <div className="space-y-6 animate-fadeIn text-[#1D1D1F]">
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-[#1D1D1F]">
          {t.wishlistTitle}
        </h2>
        <p className="text-xs text-[#6E6E73] mt-1">{t.wishlistSubtitle}</p>
      </div>

      {favorites.length === 0 ? (
        <div className="bg-white p-8 sm:p-12 rounded-[28px] text-center space-y-5 max-w-xl mx-auto border border-[#AAAAAA]/25 text-[#1D1D1F]">
          <div className="w-16 h-16 rounded-full bg-[#F5F5F7] flex items-center justify-center mx-auto text-[#007AFF]">
            <Heart size={30} />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-black uppercase tracking-tight text-[#1D1D1F]">{t.wishlistEmpty}</h3>
            <p className="text-xs text-[#6E6E73] max-w-sm mx-auto leading-relaxed">
              Ajoutez vos articles préférés en cliquant sur le cœur pour les retrouver facilement ici.
            </p>
          </div>
          <button
            onClick={onNavigateToCatalog}
            className="px-8 py-3.5 bg-[#007AFF] hover:bg-[#0071EB] text-white font-bold uppercase tracking-wider text-xs rounded-full inline-flex items-center gap-2 transition-colors cursor-pointer min-h-[48px]"
          >
            <span>{t.wishlistEmptyCTA}</span>
            <ArrowRight size={14} />
          </button>
        </div>
      ) : (
        /* Grille 2 colonnes sur mobile, nom sur 2 lignes max, prix dessous, bouton Ajouter pleine largeur sous le prix */
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-6">
          {favorites.map((p) => {
            const isOutOfStock = p.stock <= 0;
            const isAdded = justAddedId === p.id;

            return (
              <div
                key={p.id}
                onClick={() => onSelectProduct(p)}
                className="group bg-white rounded-[28px] p-3 sm:p-4 flex flex-col justify-between relative border border-[#AAAAAA]/25 hover:border-[#007AFF]/50 transition-all cursor-pointer text-[#1D1D1F]"
              >
                <div>
                  <div className="aspect-square bg-[#F5F5F7] rounded-[20px] overflow-hidden flex items-center justify-center relative mb-2.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleWishlist(p.id);
                      }}
                      className="absolute top-2 right-2 z-10 w-8 h-8 bg-white/90 hover:bg-white text-[#FF3B30] rounded-full flex items-center justify-center cursor-pointer shadow-xs border border-[#AAAAAA]/20"
                      aria-label="Retirer des favoris"
                    >
                      <HeartOff size={15} />
                    </button>

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
                        <span className="text-[10px] font-black uppercase text-white bg-[#FF3B30] px-2.5 py-1 rounded-full">
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
      )}
    </div>
  );
};
