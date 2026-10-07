import React from 'react';
import { Heart, HeartOff, Plus, ArrowRight } from 'lucide-react';
import { Product } from '../types';
import { Lang, translations, formatPrice } from '../services/i18n';
import { FALLBACK_PRODUCT_IMAGE } from '../services/storeService';
import { TiltCard } from '../components/TiltCard';
import { LazyImage } from '../components/LazyImage';

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
    <div className="space-y-6 animate-fadeIn text-white">
      {/* Header */}
      <div>
        <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white">
          {t.wishlistTitle}
        </h2>
        <p className="text-xs text-[#C5D4CA] mt-1">{t.wishlistSubtitle}</p>
      </div>

      {favorites.length === 0 ? (
        <div className="bg-[#312F30] p-8 sm:p-12 rounded-[28px] text-center space-y-5 max-w-xl mx-auto border border-white/10 text-white shadow-xl">
          <div className="w-16 h-16 rounded-full bg-[#1B1A1B] flex items-center justify-center mx-auto text-[#7477FF]">
            <Heart size={30} />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-black uppercase tracking-tight text-white">{t.wishlistEmpty}</h3>
            <p className="text-xs text-[#C5D4CA] max-w-sm mx-auto leading-relaxed">
              Ajoutez vos articles préférés en cliquant sur le cœur pour les retrouver facilement ici.
            </p>
          </div>
          <button
            onClick={onNavigateToCatalog}
            className="px-8 py-3.5 bg-[#7477FF] hover:bg-[#5E62FF] text-white font-black uppercase tracking-wider text-xs rounded-full inline-flex items-center gap-2 transition-colors cursor-pointer min-h-[48px] shadow-md"
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
              <TiltCard
                key={p.id}
                onClick={() => onSelectProduct(p)}
                maxTilt={8}
                scale={1.03}
                perspective={900}
                className="group bg-[#312F30] rounded-[28px] p-3 sm:p-4 flex flex-col justify-between relative border border-white/10 hover:border-[#7477FF]/60 hover:shadow-2xl transition-all cursor-pointer text-white shadow-md transform-gpu"
              >
                <div>
                  <div className="aspect-square bg-[#1B1A1B] rounded-[20px] overflow-hidden flex items-center justify-center relative mb-2.5">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleWishlist(p.id);
                      }}
                      className="absolute top-2 right-2 z-10 w-8 h-8 bg-[#312F30] hover:bg-[#1B1A1B] text-[#F66554] rounded-full flex items-center justify-center cursor-pointer shadow-xs border border-white/10"
                      aria-label="Retirer des favoris"
                    >
                      <HeartOff size={15} />
                    </button>

                    <LazyImage
                      src={p.image}
                      alt={p.name}
                      wrapperClassName="w-full h-full"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />

                    {isOutOfStock && (
                      <div className="absolute inset-0 bg-[#1B1A1B]/80 flex items-center justify-center p-2">
                        <span className="text-[10px] font-black uppercase text-white bg-[#F66554] px-2.5 py-1 rounded-full">
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
      )}
    </div>
  );
};
