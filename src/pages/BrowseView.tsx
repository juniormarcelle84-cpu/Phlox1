import React from 'react';
import brandConfig from '../brand.config.json';
import { Lang, translations } from '../services/i18n';
import { FALLBACK_PRODUCT_IMAGE } from '../services/storeService';
import { LazyImage } from '../components/LazyImage';

interface BrowseViewProps {
  lang: Lang;
  onSelectCategory: (id: string) => void;
  compactHeader?: boolean;
}

export const BrowseView: React.FC<BrowseViewProps> = ({
  lang,
  onSelectCategory,
  compactHeader = false
}) => {
  const t = translations[lang];

  return (
    <div className="space-y-6 sm:space-y-8 animate-fadeIn text-white">
      {!compactHeader && (
        <div>
          <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-white">
            {t.shopCategory}
          </h2>
          <p className="text-xs text-[#C5D4CA] mt-1">
            Découvrez notre catalogue par thématique
          </p>
        </div>
      )}

      {/* Bento 6 Categories Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        {brandConfig.categories.map((c, idx) => {
          const catName = c.frName;
          const isWide = idx === 2 || idx === 3;
          const isDark = idx === 1 || idx === 3;
          const cardBg = isDark ? '#1B1A1B' : '#312F30';

          return (
            <div
              key={c.id}
              onClick={() => onSelectCategory(c.id)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onSelectCategory(c.id);
                }
              }}
              className={`relative rounded-[28px] overflow-hidden min-h-[240px] sm:min-h-[260px] p-5 sm:p-7 flex flex-col justify-between group cursor-pointer hover:-translate-y-1 hover:scale-[1.02] transition-all duration-200 border border-white/10 shadow-md ${
                isWide ? 'sm:col-span-2 lg:col-span-2' : 'col-span-1'
              }`}
              style={{ backgroundColor: cardBg }}
            >
              <div className="relative z-10 max-w-[60%] space-y-1 text-left text-white">
                <span className="block text-xs font-bold uppercase text-[#C5D4CA] tracking-wider">
                  {c.tagline}
                </span>
                <h3 className="text-xl sm:text-3xl font-black uppercase tracking-tight leading-tight text-white">
                  {catName}
                </h3>
              </div>

              <div className="relative z-10 pt-4">
                <span
                  className="inline-flex items-center justify-center px-6 py-2.5 text-xs font-black uppercase tracking-wider rounded-full transition-colors cursor-pointer bg-[#7477FF] hover:bg-[#5E62FF] text-white shadow-xs"
                >
                  Explorer
                </span>
              </div>

              <div
                className={`absolute bottom-3 right-3 flex items-center justify-center pointer-events-none ${
                  isWide ? 'w-[48%] h-[80%]' : 'w-[52%] h-[70%]'
                }`}
              >
                <LazyImage
                  src={c.image}
                  alt={catName}
                  wrapperClassName="w-full h-full bg-transparent"
                  className="w-full h-full object-contain rounded-[20px] group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            </div>
          );
        })}
      </div>

      {!compactHeader && (
        <div className="bg-[#312F30] p-6 sm:p-8 rounded-[28px] flex flex-col md:flex-row items-center justify-between gap-6 text-white border border-white/10 shadow-xl">
          <div className="space-y-1.5 text-left w-full md:w-auto">
            <span className="text-xs font-black text-[#7477FF] uppercase tracking-wider">
              Service Client Togo
            </span>
            <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
              Livraison sécurisée à Lomé et dans les régions
            </h3>
            <p className="text-xs sm:text-sm text-[#C5D4CA] max-w-lg leading-relaxed">
              Payez en toute sécurité via PayGate Global (Mixx by Yas ou Flooz) et recevez votre récapitulatif instantanément sur WhatsApp.
            </p>
          </div>
          <button
            onClick={() => onSelectCategory('all')}
            className="w-full md:w-auto px-7 py-3.5 bg-[#7477FF] hover:bg-[#5E62FF] text-white font-black uppercase tracking-wider text-xs rounded-full transition-colors cursor-pointer text-center shrink-0 min-h-[48px] shadow-md"
          >
            Voir tout le catalogue
          </button>
        </div>
      )}
    </div>
  );
};
