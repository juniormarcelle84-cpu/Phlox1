import React, { useState, useEffect } from 'react';
import { X, ShoppingBag, Send, Heart, HeartOff, AlertTriangle, Check, Share2, Copy } from 'lucide-react';
import { Product } from '../types';
import { formatPrice, translations, Lang } from '../services/i18n';
import brandConfig from '../brand.config.json';
import { FALLBACK_PRODUCT_IMAGE } from '../services/storeService';
import { LazyImage } from './LazyImage';

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
  const [copiedLink, setCopiedLink] = useState(false);

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

  // Share product with OpenGraph meta url support
  const handleShareProduct = async () => {
    const shareUrl = `${brandConfig.domain || window.location.origin}/?product=${encodeURIComponent(product.id)}`;
    const shareTitle = `${product.name} | Phlox Togo`;
    const shareText = `Découvrez ${product.name} (${formatPrice(product.price)}) sur Phlox Togo avec livraison rapide à Lomé et dans tout le Togo !`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareText,
          url: shareUrl
        });
        return;
      } catch (err) {
        // Fallback to clipboard if user dismissed or unsupported
      }
    }

    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    } catch (err) {
      console.error('Failed to copy link', err);
    }
  };

  // Get similar products (same category, different id)
  const similarProducts = allProducts
    .filter((p) => p.category === product.category && p.id !== product.id)
    .slice(0, 3);

  const isOutOfStock = product.stock <= 0;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#1B1A1B]/80 backdrop-blur-md overflow-y-auto animate-fadeIn"
      role="dialog"
      aria-modal="true"
      aria-label={product.name}
    >
      {/* Backdrop click */}
      <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

      {/* Scrollable Container Wrapper */}
      <div className="relative w-full max-w-4xl bg-[#1B1A1B] rounded-[28px] overflow-hidden text-white flex flex-col md:flex-row max-h-[92vh] md:max-h-[85vh] z-10 shadow-2xl border border-white/10">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 z-20 p-2 text-[#C5D4CA] hover:text-white bg-[#312F30] hover:bg-[#312F30]/80 rounded-full transition-colors cursor-pointer border border-white/10"
          aria-label={t.close}
        >
          <X size={20} />
        </button>

        {/* Left Side: Images & Gallery */}
        <div className="w-full md:w-1/2 p-4 sm:p-6 flex flex-col justify-between bg-[#1B1A1B]">
          <div className="relative aspect-4/3 rounded-[24px] overflow-hidden bg-[#312F30] flex items-center justify-center border border-white/5">
            <LazyImage
              src={activeImage}
              alt={product.name}
              wrapperClassName="w-full h-full"
              className="w-full h-full object-cover transition-all duration-300"
            />
            {product.isPromo && product.promoText && (
              <span className="absolute top-3 left-3 bg-[#F66554] text-white text-[11px] font-black uppercase px-3 py-1 rounded-full shadow-md">
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
                      ? 'border-[#7477FF] opacity-100 scale-105'
                      : 'border-white/10 opacity-60 hover:opacity-100'
                  }`}
                  aria-label={`Vue miniature ${i + 1}`}
                >
                  <LazyImage
                    src={imgUrl}
                    alt=""
                    wrapperClassName="w-full h-full"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Right Side: Product Details */}
        <div className="w-full md:w-1/2 p-4 sm:p-7 flex flex-col justify-between overflow-y-auto max-h-[54vh] md:max-h-[85vh] bg-[#312F30] text-white">
          <div className="space-y-3">
            {/* Category & Stock Status */}
            <div className="flex flex-wrap items-center gap-2 text-xs uppercase tracking-wider text-[#7477FF] font-black">
              <span>
                {brandConfig.categories.find((c) => c.id === product.category)?.[
                  lang === 'en' ? 'enName' : 'frName'
                ] || product.category}
              </span>
              <span>·</span>
              <span className={isOutOfStock ? 'text-[#F66554]' : 'text-[#C5D4CA]'}>
                {isOutOfStock ? t.outOfStock : `${t.inStock} (${product.stock} ${t.itemsLeft})`}
              </span>
            </div>

            {/* Title */}
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white leading-tight">
              {product.name}
            </h2>

            {/* Price Box */}
            <div className="flex items-baseline gap-3">
              <span className="text-xl sm:text-2xl font-black text-[#F9CD61] font-mono tabular-nums">
                {formatPrice(product.price)}
              </span>
              {product.originalPrice && (
                <span className="text-xs sm:text-sm line-through text-[#C5D4CA]/60 font-mono tabular-nums">
                  {formatPrice(product.originalPrice)}
                </span>
              )}
            </div>

            {/* Description */}
            <p className="text-xs sm:text-sm text-[#C5D4CA] leading-relaxed">
              {lang === 'en' ? product.descriptionEn : product.descriptionFr}
            </p>

            {/* Variants Selector */}
            {product.variants && product.variants.length > 0 && (
              <div className="space-y-3 pt-2 border-t border-white/10">
                {product.variants.map((v, i) => {
                  const vName = lang === 'en' ? v.nameEn : v.nameFr;
                  return (
                    <div key={i} className="space-y-1.5">
                      <span className="block text-xs font-bold text-[#C5D4CA]">
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
                                ? 'bg-[#7477FF] text-white'
                                : 'bg-[#1B1A1B] text-white/80 border border-white/10 hover:bg-[#1B1A1B]/80'
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
              <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-white/10">
                <span className="text-xs font-bold text-[#C5D4CA]">{t.quantity} :</span>
                <div className="flex items-center bg-[#1B1A1B] border border-white/10 rounded-full p-1 gap-2">
                  <button
                    disabled={quantity <= 1}
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    className="w-7 h-7 flex items-center justify-center text-white hover:text-[#7477FF] disabled:opacity-30 rounded-full font-black cursor-pointer"
                    aria-label="Diminuer quantité"
                  >
                    -
                  </button>
                  <span className="text-xs font-black w-6 text-center text-white font-mono">
                    {quantity}
                  </span>
                  <button
                    disabled={quantity >= product.stock}
                    onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
                    className="w-7 h-7 flex items-center justify-center text-white hover:text-[#7477FF] disabled:opacity-30 rounded-full font-black cursor-pointer"
                    aria-label="Augmenter quantité"
                  >
                    +
                  </button>
                </div>
                {quantity >= product.stock && (
                  <span className="text-[11px] text-[#F9CD61] flex items-center gap-1 font-bold">
                    <AlertTriangle size={12} /> Stock max atteint
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Action Row & Similar Products */}
          <div className="space-y-4 pt-4 border-t border-white/10 mt-4">
            <div className="flex items-center gap-2">
              <button
                disabled={isOutOfStock}
                onClick={handleAddToCart}
                className={`flex-1 py-3.5 px-4 font-bold uppercase tracking-wider text-xs rounded-full flex items-center justify-center gap-2 transition-all cursor-pointer min-h-[48px] ${
                  isOutOfStock
                    ? 'bg-white/10 text-white/40 cursor-not-allowed'
                    : justAdded
                    ? 'bg-[#34C759] text-white'
                    : 'bg-[#F66554] hover:bg-[#F66554]/90 text-white'
                }`}
              >
                {justAdded ? <Check size={16} /> : <ShoppingBag size={16} />}
                <span>{isOutOfStock ? t.outOfStock : justAdded ? t.addedToCart : t.addToCart}</span>
              </button>

              <button
                disabled={isOutOfStock}
                onClick={handleDirectWhatsAppOrder}
                className="py-3.5 px-5 bg-[#7477FF] hover:bg-[#7477FF]/90 text-white font-bold uppercase tracking-wider text-xs rounded-full transition-colors cursor-pointer flex items-center gap-1.5 min-h-[48px]"
                title="Commander et payer (Mixx by Yas / Flooz)"
                aria-label="Commander et payer"
              >
                <Send size={15} className="text-white" />
                <span className="hidden sm:inline">Commander</span>
              </button>

              <button
                onClick={() => onToggleWishlist(product.id)}
                className={`p-3.5 rounded-full transition-colors cursor-pointer min-h-[48px] min-w-[48px] flex items-center justify-center border ${
                  isFavorite
                    ? 'bg-[#F66554]/20 text-[#F66554] border-[#F66554]/40'
                    : 'bg-[#1B1A1B] text-[#C5D4CA] hover:text-white border-white/10'
                }`}
                aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
              >
                {isFavorite ? <HeartOff size={18} /> : <Heart size={18} />}
              </button>

              <button
                onClick={handleShareProduct}
                className={`p-3.5 rounded-full transition-colors cursor-pointer min-h-[48px] min-w-[48px] flex items-center justify-center border ${
                  copiedLink
                    ? 'bg-[#34C759] text-white border-[#34C759]'
                    : 'bg-[#1B1A1B] text-[#C5D4CA] hover:text-white border-white/10'
                }`}
                title={copiedLink ? 'Lien copié !' : 'Partager ce produit'}
                aria-label="Partager ce produit"
              >
                {copiedLink ? <Check size={18} /> : <Share2 size={18} />}
              </button>
            </div>

            {/* Similar Products List */}
            {similarProducts.length > 0 && (
              <div className="space-y-2 pt-3 border-t border-white/10">
                <h4 className="text-[11px] font-black uppercase text-[#C5D4CA] tracking-wider">
                  {t.similarProducts}
                </h4>
                <div className="grid grid-cols-3 gap-2.5">
                  {similarProducts.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => onSelectProduct(p)}
                      className="text-left group cursor-pointer"
                    >
                      <div className="aspect-square rounded-2xl overflow-hidden bg-[#1B1A1B] mb-1 relative border border-white/10">
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
                      <h5 className="text-[11px] font-bold text-white truncate group-hover:text-[#7477FF] transition-colors">
                        {p.name}
                      </h5>
                      <p className="text-[10px] text-[#F9CD61] font-black mt-0.5 font-mono tabular-nums">
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

