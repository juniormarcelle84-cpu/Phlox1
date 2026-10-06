import React, { useState, useEffect } from 'react';
import { X, ShoppingBag, Send, Heart, HeartOff, AlertTriangle, Check } from 'lucide-react';
import { Product } from '../types';
import { formatPrice, translations, Lang } from '../services/i18n';
import brandConfig from '../brand.config.json';
import { FALLBACK_PRODUCT_IMAGE } from '../services/storeService';

interface ProductDetailModalProps {
  isOpen: boolean;
  product: Product | null;
  allProducts: Product[];
  wishlist: string[];
  lang: Lang;
  onClose: () => void;
  onAddToCart: (product: Product, variants: Record<string, string>, qty: number) => void;
  onToggleWishlist: (id: string) => void;
  onSelectProduct: (product: Product) => void;
}

export const ProductDetailModal: React.FC<ProductDetailModalProps> = ({
  isOpen,
  product,
  allProducts,
  wishlist,
  lang,
  onClose,
  onAddToCart,
  onToggleWishlist,
  onSelectProduct
}) => {
  if (!isOpen || !product) return null;

  const t = translations[lang];
  const isFavorite = wishlist.includes(product.id);

  // States
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});
  const [quantity, setQuantity] = useState(1);
  const [activeImage, setActiveImage] = useState(product.image);
  const [justAdded, setJustAdded] = useState(false);

  // Lock body scroll and handle ESC key
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [onClose]);

  // Reset states when product changes
  useEffect(() => {
    setActiveImage(product.image);
    setQuantity(1);
    setJustAdded(false);

    // Auto-select first value of each variant
    const initial: Record<string, string> = {};
    product.variants.forEach((v) => {
      const name = lang === 'en' ? v.nameEn : v.nameFr;
      if (v.values && v.values.length > 0) {
        initial[name] = v.values[0];
      }
    });
    setSelectedVariants(initial);
  }, [product, lang]);

  // Handle adding to cart
  const handleAddToCart = () => {
    onAddToCart(product, selectedVariants, quantity);
    setJustAdded(true);
    setTimeout(() => setJustAdded(false), 2500);
  };

  // Route direct order through the mandatory Cart -> PayGate payment tunnel
  const handleDirectWhatsAppOrder = () => {
    onAddToCart(product, selectedVariants, quantity);
    onClose();
  };

  // Get similar products (same category, different id)
  const similarProducts = allProducts
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 3);

  const isOutOfStock = product.stock <= 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#1D1D1F]/45 backdrop-blur-sm overflow-y-auto animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
    >
      {/* Backdrop click */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Scrollable Container Wrapper */}
      <div className="relative w-full max-w-4xl bg-white rounded-[28px] overflow-hidden text-[#1D1D1F] flex flex-col md:flex-row max-h-[92vh] md:max-h-[85vh] z-10 shadow-2xl border border-[#AAAAAA]/30">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-20 p-2 text-[#6E6E73] hover:text-[#1D1D1F] bg-[#F5F5F7] hover:bg-[#F5F5F7]/80 rounded-full transition-colors cursor-pointer border border-[#AAAAAA]/20"
          aria-label={t.close}
        >
          <X size={20} />
        </button>

        {/* Left Side: Images & Gallery */}
        <div className="w-full md:w-1/2 p-4 sm:p-6 flex flex-col justify-between bg-[#F5F5F7]">
          <div className="relative aspect-4/3 rounded-[20px] overflow-hidden bg-white flex items-center justify-center border border-[#AAAAAA]/20">
            <img
              src={activeImage}
              alt={product.name}
              loading="lazy"
              decoding="async"
              referrerPolicy="no-referrer"
              onError={(e) => {
                (e.target as HTMLImageElement).src = FALLBACK_PRODUCT_IMAGE;
              }}
              className="w-full h-full object-cover transition-all duration-300"
            />
            {product.isPromo && product.promoText && (
              <span className="absolute top-3 left-3 bg-[#007AFF] text-white text-[11px] font-black uppercase px-3 py-1 rounded-full">
                {product.promoText}
              </span>
            )}
          </div>

          {/* Mini Gallery Images */}
          {product.gallery && product.gallery.length > 1 && (
            <div className="flex gap-2 mt-3 overflow-x-auto pb-1">
              {product.gallery.map((imgUrl, i) => (
                <button
                  key={i}
                  onClick={() => setActiveImage(imgUrl)}
                  className={`w-14 h-14 rounded-2xl overflow-hidden border-2 transition-all cursor-pointer shrink-0 ${
                    activeImage === imgUrl
                      ? 'border-[#007AFF] opacity-100 scale-105'
                      : 'border-[#AAAAAA]/30 opacity-60 hover:opacity-100'
                  }`}
                  aria-label={`Vue miniature ${i + 1}`}
                >
                  <img
                    src={imgUrl}
                    alt=""
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = FALLBACK_PRODUCT_IMAGE;
                    }}
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Product Details */}
        <div className="w-full md:w-1/2 p-4 sm:p-7 flex flex-col justify-between overflow-y-auto max-h-[54vh] md:max-h-[85vh] text-[#1D1D1F]">
          <div className="space-y-3">
            {/* Category & Stock Status */}
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wider text-[#007AFF] font-black">
              <span>
                {brandConfig.categories.find((c) => c.id === product.category)?.[
                  lang === 'en' ? 'enName' : 'frName'
                ] || product.category}
              </span>
              <span>·</span>
              <span className={isOutOfStock ? 'text-[#FF3B30]' : 'text-[#6E6E73]'}>
                {isOutOfStock ? t.outOfStock : `${t.inStock} (${product.stock} ${t.itemsLeft})`}
              </span>
            </div>

            {/* Title */}
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#1D1D1F] leading-tight">
              {product.name}
            </h2>

            {/* Price Box */}
            <div className="flex items-baseline gap-3">
              <span className="text-xl sm:text-2xl font-black text-[#1D1D1F] font-mono tabular-nums">
                {formatPrice(product.price)}
              </span>
              {product.originalPrice && (
                <span className="text-xs sm:text-sm line-through text-[#6E6E73] font-mono tabular-nums">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>

            {/* Description */}
            <p className="text-xs sm:text-sm text-[#6E6E73] leading-relaxed">
              {lang === 'en' ? product.descriptionEn : product.descriptionFr}
            </p>

            {/* Variants Selector */}
            {product.variants && product.variants.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-[#AAAAAA]/25">
                {product.variants.map((v, i) => {
                  const vName = lang === 'en' ? v.nameEn : v.nameFr;
                  return (
                    <div key={i} className="space-y-1.5">
                      <span className="block text-xs font-bold text-[#6E6E73]">
                        {t.variantLabel} {vName} :
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {v.values.map((val, idx) => (
                          <button
                            key={idx}
                            onClick={() =>
                              setSelectedVariants((prev) => ({ ...prev, [vName]: val }))
                            }
                            className={`px-3.5 py-1.5 text-xs font-bold uppercase rounded-full transition-colors cursor-pointer ${
                              selectedVariants[vName] === val
                                ? 'bg-[#007AFF] text-white'
                                : 'bg-[#F5F5F7] text-[#1D1D1F] border border-[#AAAAAA]/30 hover:bg-[#F5F5F7]/70'
                            }`}
                          >
                            {val}
                          </button>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Quantity Selector & Stock Warnings */}
            {!isOutOfStock && (
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#AAAAAA]/25">
                <span className="text-xs font-bold text-[#6E6E73]">{t.quantity} :</span>
                <div className="flex items-center bg-[#F5F5F7] border border-[#AAAAAA]/30 rounded-full p-1 gap-2">
                  <button
                    disabled={quantity <= 1}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-7 h-7 flex items-center justify-center text-[#1D1D1F] hover:text-[#007AFF] disabled:opacity-30 rounded-full font-black cursor-pointer"
                    aria-label="Diminuer quantité"
                  >
                    -
                  </button>
                  <span className="text-xs font-black w-6 text-center text-[#1D1D1F] font-mono">
                    {quantity}
                  </span>
                  <button
                    disabled={quantity >= product.stock}
                    onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                    className="w-7 h-7 flex items-center justify-center text-[#1D1D1F] hover:text-[#007AFF] disabled:opacity-30 rounded-full font-black cursor-pointer"
                    aria-label="Augmenter quantité"
                  >
                    +
                  </button>
                </div>
                {quantity >= product.stock && (
                  <span className="text-[11px] text-[#FF9500] flex items-center gap-1 font-bold">
                    <AlertTriangle size={12} /> Stock max atteint
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Action Row & Similar Products */}
          <div className="space-y-4 pt-4 border-t border-[#AAAAAA]/25 mt-4">
            <div className="flex items-center gap-2">
              <button
                disabled={isOutOfStock}
                onClick={handleAddToCart}
                className={`flex-1 py-3.5 px-4 font-bold uppercase tracking-wider text-xs rounded-full flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[48px] ${
                  isOutOfStock
                    ? 'bg-[#AAAAAA]/35 text-[#1D1D1F]/50 cursor-not-allowed'
                    : justAdded
                    ? 'bg-[#34C759] text-white'
                    : 'bg-[#007AFF] hover:bg-[#0071EB] text-white'
                }`}
              >
                {justAdded ? <Check size={16} /> : <ShoppingBag size={16} />}
                <span>{isOutOfStock ? t.outOfStock : justAdded ? t.addedToCart : t.addToCart}</span>
              </button>

              <button
                disabled={isOutOfStock}
                onClick={handleDirectWhatsAppOrder}
                className="py-3.5 px-5 bg-white border border-[#AAAAAA] hover:bg-[#F5F5F7] text-[#1D1D1F] font-bold uppercase tracking-wider text-xs rounded-full transition-colors cursor-pointer flex items-center gap-1.5 min-h-[48px]"
                title="Commander et payer (Mixx by Yas / Flooz)"
                aria-label="Commander et payer"
              >
                <Send size={15} className="text-[#007AFF]" />
                <span className="hidden sm:inline">Commander</span>
              </button>

              <button
                onClick={() => onToggleWishlist(product.id)}
                className={`p-3.5 rounded-full transition-colors cursor-pointer min-h-[48px] min-w-[48px] flex items-center justify-center border ${
                  isFavorite
                    ? 'bg-[#007AFF]/10 text-[#007AFF] border-[#007AFF]/30'
                    : 'bg-[#F5F5F7] text-[#6E6E73] hover:text-[#1D1D1F] border-[#AAAAAA]/30'
                }`}
                aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              >
                {isFavorite ? <HeartOff size={18} /> : <Heart size={18} />}
              </button>
            </div>

            {/* Similar Products List */}
            {similarProducts.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-[#AAAAAA]/25">
                <h4 className="text-[11px] font-black uppercase text-[#6E6E73] tracking-wider">
                  {t.similarProducts}
                </h4>
                <div className="grid grid-cols-3 gap-2.5">
                  {similarProducts.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => onSelectProduct(p)}
                      className="text-left group cursor-pointer"
                    >
                      <div className="aspect-square rounded-2xl overflow-hidden bg-[#F5F5F7] mb-1 relative border border-[#AAAAAA]/20">
                        <img
                          src={p.image}
                          alt={p.name}
                          loading="lazy"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = FALLBACK_PRODUCT_IMAGE;
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <h5 className="text-[11px] font-bold text-[#1D1D1F] truncate group-hover:text-[#007AFF] transition-colors">
                        {p.name}
                      </h5>
                      <p className="text-[10px] text-[#1D1D1F] font-black mt-0.5 font-mono tabular-nums">
                        {formatPrice(p.price)}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
