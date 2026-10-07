import React from 'react';
import { Phone, MapPin, ShieldCheck } from 'lucide-react';
import brandConfig from '../brand.config.json';
import { Lang, translations } from '../services/i18n';
import { PaymentNetworkLogo } from './PaymentNetworkLogo';

interface FooterProps {
  lang: Lang;
  onOpenDoc: (type: 'contact' | 'faq' | 'terms' | 'privacy' | 'delivery') => void;
  onOpenChat?: () => void;
}

export const Footer: React.FC<FooterProps> = ({ lang, onOpenDoc, onOpenChat }) => {
  const t = translations[lang];
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-[#1B1A1B] border-t border-white/10 pt-12 pb-12 sm:pb-16 mt-12 text-[#FFFFFF] px-4">
      <div className="w-full max-w-[1200px] mx-auto grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8 sm:gap-10">
        {/* Column 1 - Brand identity */}
        <div className="space-y-3.5">
          <div className="text-2xl font-black uppercase tracking-[0.28em] text-white">
            PHLOX
          </div>
          <p className="text-sm font-semibold text-white/90">{brandConfig.slogan}</p>
          <p className="text-xs text-[#C5D4CA] leading-relaxed">
            Boutique e-commerce de référence au Togo. Produits électroniques authentiques expédiés en 24h à Lomé et sous 48h–72h dans toutes les régions.
          </p>
          <div className="flex items-center gap-2 text-xs text-[#C5D4CA] pt-1">
            <MapPin size={14} className="text-[#7477FF] shrink-0" />
            <span>Boulevard de la Kara, Lomé — Togo</span>
          </div>
        </div>

        {/* Column 2 - Navigation & Infos */}
        <div className="space-y-3">
          <h4 className="font-extrabold uppercase text-xs text-white tracking-wider">
            Informations Clients
          </h4>
          <ul className="space-y-2 text-sm text-[#C5D4CA]">
            {onOpenChat && (
              <li>
                <button
                  onClick={onOpenChat}
                  className="text-[#7477FF] hover:text-[#7477FF]/80 text-left transition-colors font-bold cursor-pointer flex items-center gap-1.5"
                >
                  <span>ChatPhlox (Assistant Togo)</span>
                </button>
              </li>
            )}
            <li>
              <button
                onClick={() => onOpenDoc('delivery')}
                className="hover:text-white text-left transition-colors font-medium cursor-pointer"
              >
                {t.deliveryTitle}
              </button>
            </li>
            <li>
              <button
                onClick={() => onOpenDoc('faq')}
                className="hover:text-white text-left transition-colors font-medium cursor-pointer"
              >
                {t.faqTitle}
              </button>
            </li>
            <li>
              <button
                onClick={() => onOpenDoc('contact')}
                className="hover:text-white text-left transition-colors font-medium cursor-pointer"
              >
                {t.contactTitle}
              </button>
            </li>
          </ul>
        </div>

        {/* Column 3 - Legal */}
        <div className="space-y-3">
          <h4 className="font-extrabold uppercase text-xs text-white tracking-wider">
            Mentions Légales & Sécurité
          </h4>
          <ul className="space-y-2 text-sm text-[#C5D4CA]">
            <li>
              <button
                onClick={() => onOpenDoc('terms')}
                className="hover:text-white text-left transition-colors font-medium cursor-pointer"
              >
                {t.termsTitle}
              </button>
            </li>
            <li>
              <button
                onClick={() => onOpenDoc('privacy')}
                className="hover:text-white text-left transition-colors font-medium cursor-pointer"
              >
                {t.privacyTitle}
              </button>
            </li>
            <li className="flex items-center gap-1.5 text-xs text-[#C5D4CA] pt-1">
              <ShieldCheck size={14} className="text-[#7477FF] shrink-0" />
              <span>Garantie satisfaction à la livraison</span>
            </li>
          </ul>
        </div>

        {/* Column 4 - Direct WhatsApp & PayGate */}
        <div className="space-y-3">
          <h4 className="font-extrabold uppercase text-xs text-white tracking-wider">
            Commande & Paiement Togo
          </h4>
          <p className="text-xs text-[#C5D4CA] leading-relaxed">
            Service client disponible 7j/7 sur WhatsApp pour vos commandes et suivis de colis.
          </p>
          <a
            href={`${brandConfig.whatsappUrlBase}?text=Bonjour ${brandConfig.name}, j'ai besoin d'assistance.`}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#7477FF] hover:bg-[#7477FF]/90 text-white text-xs font-bold rounded-full transition-colors cursor-pointer min-h-[48px]"
          >
            <Phone size={14} />
            <span>WhatsApp : {brandConfig.whatsappNumber}</span>
          </a>
          <div className="flex items-center gap-2 text-xs text-white/90 pt-2">
            <PaymentNetworkLogo network="TMONEY" variant="mini" />
            <PaymentNetworkLogo network="FLOOZ" variant="mini" />
            <span className="font-bold text-white text-xs">Mixx by Yas & Flooz Money</span>
          </div>
        </div>
      </div>

      <div className="w-full max-w-[1200px] mx-auto mt-10 pt-6 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-[#C5D4CA] gap-4">
        <div>
          © {currentYear} <strong className="text-white">{brandConfig.name}</strong>. Tous droits réservés.
        </div>
        <div className="flex flex-wrap items-center justify-center gap-2">
          <span className="px-3.5 py-1.5 bg-[#312F30] border border-white/10 rounded-full text-[11px] font-bold text-[#FEDD00] inline-flex items-center gap-2">
            <PaymentNetworkLogo network="TMONEY" variant="mini" />
            <span>Mixx by Yas</span>
          </span>
          <span className="px-3.5 py-1.5 bg-[#312F30] border border-white/10 rounded-full text-[11px] font-bold text-[#38BDF8] inline-flex items-center gap-2">
            <PaymentNetworkLogo network="FLOOZ" variant="mini" />
            <span>Flooz Money</span>
          </span>
          <span className="px-3.5 py-1.5 bg-[#312F30] border border-white/10 rounded-full text-[11px] font-semibold text-[#C5D4CA]">
            Paiement sécurisé PayGate
          </span>
        </div>
      </div>
    </footer>
  );
};
