import React from 'react';
import brandConfig from '../brand.config.json';
import { Lang, translations } from '../services/i18n';
import { FALLBACK_PRODUCT_IMAGE } from '../services/storeService';

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
    <div className="space-y-6 sm:space-y-8 animate-fadeIn text-[#1D1D1F]">
      {!compactHeader && (
        <div>
          <h2 className="text-2xl sm:text-4xl font-black uppercase tracking-tight text-[#1D1D1F]">
            {t.shopCategory}
          </h2>
          <p className="text-xs text-[#6E6E73] mt-1">
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
          const cardBg = isDark ? '#1D1D1F' : '#FFFFFF';
          const textColorClass = isDark ? 'text-white' : 'text-[#1D1D1F]';
          const pillClass = isDark
            ? 'bg-[#007AFF] text-white'
            : 'bg-[#1D1D1F] text-white hover:bg-[#007AFF]';

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
              className={`relative rounded-[28px] overflow-hidden min-h-[240px] sm:min-h-[260px] p-5 sm:p-7 flex flex-col justify-between group cursor-pointer hover:-translate-y-1 hover:scale-[1.02] transition-all duration-200 border ${
                isDark ? 'border-transparent' : 'border-[#AAAAAA]/25'
              } ${
                isWide ? 'sm:col-span-2 lg:col-span-2' : 'col-span-1'
              }`}
              style={{ backgroundColor: cardBg }}
            >
              <div className={`relative z-10 max-w-[60%] space-y-1 text-left ${textColorClass}`}>
                <span className="block text-xs font-bold uppercase opacity-80 tracking-wider">
                  {c.tagline}
                </span>
                <h3 className="text-xl sm:text-3xl font-black uppercase tracking-tight leading-tight">
                  {catName}
                </h3>
              </div>

              <div className="relative z-10 pt-4">
                <span
                  className={`inline-flex items-center justify-center px-6 py-2.5 text-xs font-bold uppercase tracking-wider rounded-full transition-colors cursor-pointer ${pillClass}`}
                >
                  Explorer
                </span>
              </div>

              <div
                className={`absolute bottom-3 right-3 flex items-center justify-center pointer-events-none ${
                  isWide ? 'w-[48%] h-[80%]' : 'w-[52%] h-[70%]'
                }`}
              >
                <img
                  src={c.image}
                  alt={catName}
                  loading="lazy"
                  decoding="async"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = FALLBACK_PRODUCT_IMAGE;
                  }}
                  className="w-full h-full object-contain rounded-[20px] group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            </div>
          );
        })}
      </div>

      {!compactHeader && (
        <div className="bg-[#1D1D1F] p-6 sm:p-8 rounded-[28px] flex flex-col md:flex-row items-center justify-between gap-6 text-white border border-[#AAAAAA]/20">
          <div className="space-y-1.5 text-left w-full md:w-auto">
            <span className="text-xs font-black text-[#007AFF] uppercase tracking-wider">
              Service Client Togo
            </span>
            <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
              Livraison sécurisée à Lomé et dans les régions
            </h3>
            <p className="text-xs sm:text-sm text-[#AAAAAA] max-w-lg leading-relaxed">
              Payez en toute sécurité via PayGate Global (Mixx by Yas ou Flooz) et recevez votre récapitulatif instantanément sur WhatsApp.
            </p>
          </div>
          <button
            onClick={() => onSelectCategory('all')}
            className="w-full md:w-auto px-7 py-3.5 bg-[#007AFF] hover:bg-[#0071EB] text-white font-bold uppercase tracking-wider text-xs rounded-full transition-colors cursor-pointer text-center shrink-0 min-h-[48px]"
          >
            Voir tout le catalogue
          </button>
        </div>
      )}
    </div>
  );
};
