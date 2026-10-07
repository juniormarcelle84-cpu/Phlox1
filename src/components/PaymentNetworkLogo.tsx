import React, { useState } from 'react';
import brandConfig from '../brand.config.json';

interface PaymentNetworkLogoProps {
  network: 'TMONEY' | 'FLOOZ';
  /**
   * 'tile' = 88×56px, coins arrondis 12px (cartes de choix de paiement)
   * 'mini' = 40×26px, coins arrondis (ligne "Paiement sécurisé", footer, badges)
   */
  variant?: 'tile' | 'mini';
  size?: number;
  className?: string;
}

/**
 * Tuile logo officielle Mobile Money Togo :
 * - 'TMONEY' -> Mixx by Yas (/logos/mixx-yas.png), zoom scale(1.6) centré sur fond jaune officiel #FEDD00
 * - 'FLOOZ'  -> Flooz Money (/logos/flooz-money.png), sur fond blanc/bleu officiel Moov
 */
export const PaymentNetworkLogo: React.FC<PaymentNetworkLogoProps> = ({
  network,
  variant = 'mini',
  className = ''
}) => {
  const [imgError, setImgError] = useState(false);
  const isMixx = network === 'TMONEY';
  const imgSrc = isMixx
    ? brandConfig.paymentLogos?.mixxByYas || '/logos/mixx-yas.png'
    : brandConfig.paymentLogos?.flooz || '/logos/flooz-money.png';

  const isLargeTile = variant === 'tile';
  const widthPx = isLargeTile ? 88 : 42;
  const heightPx = isLargeTile ? 56 : 28;

  return (
    <div
      style={{ width: `${widthPx}px`, height: `${heightPx}px` }}
      className={`overflow-hidden flex items-center justify-center shrink-0 select-none ${
        isLargeTile ? 'rounded-[14px] mx-auto shadow-sm' : 'rounded-[8px]'
      } ${
        isMixx
          ? 'bg-[#FEDD00] text-[#1B1A1B]'
          : 'bg-white text-[#0099DA] border border-white/20'
      } ${className}`}
    >
      {!imgError ? (
        <img
          src={imgSrc}
          alt={isMixx ? 'Mixx by Yas' : 'Flooz Money'}
          draggable={false}
          onError={() => setImgError(true)}
          className={`w-full h-full object-contain origin-center select-none pointer-events-none transition-transform ${
            isMixx ? (isLargeTile ? 'scale-[1.65]' : 'scale-[1.4]') : (isLargeTile ? 'p-1' : 'p-0.5')
          }`}
        />
      ) : (
        <span className={`font-black uppercase tracking-tight text-center leading-none ${isLargeTile ? 'text-xs' : 'text-[9px]'}`}>
          {isMixx ? 'MIXX' : 'FLOOZ'}
        </span>
      )}
    </div>
  );
};

