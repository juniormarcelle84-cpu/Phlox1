import React, { useEffect } from 'react';
import { X, Phone, Mail, MapPin, CheckCircle } from 'lucide-react';
import brandConfig from '../brand.config.json';
import { translations, Lang } from '../services/i18n';

interface DocumentModalProps {
  isOpen: boolean;
  docType: 'contact' | 'faq' | 'terms' | 'privacy' | 'delivery' | null;
  lang: Lang;
  onClose: () => void;
}

export const DocumentModals: React.FC<DocumentModalProps> = ({ isOpen, docType, lang, onClose }) => {
  // Lock body scroll and handle ESC key
  useEffect(() => {
    if (!isOpen || !docType) return;

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
  }, [isOpen, docType, onClose]);

  if (!isOpen || !docType) return null;

  const t = translations[lang];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-[#1B1A1B]/80 backdrop-blur-md transition-opacity duration-300 animate-fadeIn"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div className="absolute inset-0 cursor-pointer" onClick={onClose} aria-hidden="true" />

      <div className="relative w-full max-w-2xl bg-[#1B1A1B] rounded-[28px] max-h-[88vh] overflow-y-auto p-5 sm:p-8 text-white z-10 shadow-2xl border border-white/10">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b border-white/10">
          <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-white">
            {docType === 'contact' && t.contactTitle}
            {docType === 'faq' && t.faqTitle}
            {docType === 'terms' && t.termsTitle}
            {docType === 'privacy' && t.privacyTitle}
            {docType === 'delivery' && t.deliveryTitle}
          </h2>
          <button
            onClick={onClose}
            className="p-2 text-[#C5D4CA] hover:text-white bg-[#312F30] hover:bg-[#312F30]/80 rounded-full transition-colors cursor-pointer border border-white/10"
            aria-label={t.close}
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="space-y-5 text-[#C5D4CA] text-sm leading-relaxed">
          {docType === 'contact' && (
            <div className="space-y-5">
              <p className="text-white font-medium">{t.contactSubtitle}</p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <div className="p-4 bg-[#312F30] rounded-[20px] flex items-start gap-3 border border-white/5">
                  <Phone className="text-[#7477FF] shrink-0 mt-1" size={20} />
                  <div>
                    <h4 className="font-extrabold text-white uppercase text-xs tracking-wider mb-1">
                      {t.contactPhone}
                    </h4>
                    <p className="text-sm font-mono font-bold text-[#F9CD61]">
                      {brandConfig.whatsappNumber}
                    </p>
                    <p className="text-[11px] text-[#C5D4CA]">Dispo 24/7 sur WhatsApp</p>
                  </div>
                </div>

                <div className="p-4 bg-[#312F30] rounded-[20px] flex items-start gap-3 border border-white/5">
                  <Mail className="text-[#7477FF] shrink-0 mt-1" size={20} />
                  <div>
                    <h4 className="font-extrabold text-white uppercase text-xs tracking-wider mb-1">
                      {t.contactEmail}
                    </h4>
                    <p className="text-sm font-semibold text-white">contact@phlox-togo.com</p>
                    <p className="text-[11px] text-[#C5D4CA]">Réponse sous 2 heures</p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-[#312F30] rounded-[20px] flex items-start gap-3 border border-white/5">
                <MapPin className="text-[#7477FF] shrink-0 mt-1" size={20} />
                <div>
                  <h4 className="font-extrabold text-white uppercase text-xs tracking-wider mb-1">
                    {t.contactOffice}
                  </h4>
                  <p className="text-sm font-semibold text-white">{t.contactOfficeVal}</p>
                  <p className="text-[11px] text-[#C5D4CA]">Lomé, Togo</p>
                </div>
              </div>

              <div className="pt-3 border-t border-white/10 text-center">
                <a
                  href={`${brandConfig.whatsappUrlBase}?text=Bonjour ${brandConfig.name}, je souhaite vous contacter pour des informations.`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-2 px-6 py-3.5 bg-[#7477FF] hover:bg-[#7477FF]/90 text-white font-bold rounded-full text-xs transition-colors shadow-none min-h-[48px]"
                >
                  <Phone size={15} />
                  <span>Discuter en direct sur WhatsApp</span>
                </a>
              </div>
            </div>
          )}

          {docType === 'faq' && (
            <div className="space-y-3.5">
              {brandConfig.faq.map((item, index) => (
                <div
                  key={index}
                  className="p-4 bg-[#312F30] rounded-[20px] border border-white/5"
                >
                  <h4 className="font-extrabold text-white text-sm mb-2 flex items-start gap-2 uppercase">
                    <span className="text-[#F9CD61]">Q.</span>
                    <span>{item[lang].q}</span>
                  </h4>
                  <p className="text-[#C5D4CA] text-xs sm:text-sm pl-4 border-l-2 border-[#7477FF]">
                    {item[lang].a}
                  </p>
                </div>
              ))}
            </div>
          )}

          {docType === 'terms' && (
            <div className="space-y-4 text-[#C5D4CA]">
              <p className="font-extrabold text-white uppercase text-sm">1. Acceptation des conditions</p>
              <p>
                En accédant au site Phlox Togo et en passant commande, vous acceptez sans réserve nos conditions générales de service.
              </p>
              <p className="font-extrabold text-white uppercase text-sm">2. Processus de commande et de paiement</p>
              <p>
                Les prix affichés sont exprimés en Francs CFA (FCFA). Le paiement s&apos;effectue par transfert mobile sécurisé (Mixx by Yas, Flooz) via PayGate Global avec validation immédiate.
              </p>
              <p className="font-extrabold text-white uppercase text-sm">3. Protection des données</p>
              <p>
                Phlox Togo s&apos;engage à ne jamais vendre ou transmettre vos informations personnelles (Nom, Téléphone, Adresse) à des tiers.
              </p>
            </div>
          )}

          {docType === 'privacy' && (
            <div className="space-y-4 text-[#C5D4CA]">
              <p>
                Chez Phlox Togo, nous accordons une grande importance à la confidentialité de vos données personnelles. Les données collectées servent uniquement au traitement et à la livraison de votre commande.
              </p>
              <p className="font-extrabold text-white uppercase text-sm">Données collectées :</p>
              <ul className="list-disc pl-5 space-y-1 text-[#C5D4CA]">
                <li>Nom complet</li>
                <li>Numéro de téléphone (+228)</li>
                <li>Adresse et ville de livraison</li>
              </ul>
            </div>
          )}

          {docType === 'delivery' && (
            <div className="space-y-4 text-[#C5D4CA]">
              <p>
                Phlox Togo dessert l&apos;ensemble du territoire togolais avec des tarifs avantageux et sécurisés.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 my-3">
                <div className="p-4 bg-[#312F30] rounded-[20px] border border-white/5">
                  <h5 className="font-extrabold uppercase text-[#F9CD61] mb-1">Lomé & Environs</h5>
                  <p className="text-xs text-[#C5D4CA]">Délai : 24 heures maximum</p>
                  <p className="text-xs text-[#7477FF] font-bold font-mono">Tarif : 1 000 - 1 500 FCFA</p>
                </div>
                <div className="p-4 bg-[#312F30] rounded-[20px] border border-white/5">
                  <h5 className="font-extrabold uppercase text-[#F9CD61] mb-1">Villes de l&apos;Intérieur</h5>
                  <p className="text-xs text-[#C5D4CA]">Délai : 48 à 72 heures</p>
                  <p className="text-xs text-[#7477FF] font-bold font-mono">Tarif : 2 500 - 4 000 FCFA</p>
                </div>
              </div>
              <p className="flex items-center gap-2 text-white text-xs sm:text-sm">
                <CheckCircle className="text-[#34C759] shrink-0" size={18} />
                <span>
                  <strong>Garantie Satisfaction :</strong> Produits authentiques vérifiés avant expédition.
                </span>
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
