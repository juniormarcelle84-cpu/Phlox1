import React from 'react';
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
 * Tuile logo officielle :
 * - 'TMONEY' -> Mixx by Yas (/logos/mixx-yas.png), zoom scale(1.7) centré pour remplir la tuile sans déformer ni couper le texte
 * - 'FLOOZ'  -> Flooz Money (/logos/flooz-money.png), object-fit contain sur fond blanc
 */
export const PaymentNetworkLogo: React.FC<PaymentNetworkLogoProps> = ({
  network,
  variant = 'mini',
  className = ''
}) => {
  const isMixx = network === 'TMONEY';
  const imgSrc = isMixx
    ? brandConfig.paymentLogos?.mixxByYas || '/logos/mixx-yas.png'
    : brandConfig.paymentLogos?.flooz || '/logos/flooz-money.png';

  const isLargeTile = variant === 'tile';
  const widthPx = isLargeTile ? 88 : 40;
  const heightPx = isLargeTile ? 56 : 26;

  return (
    <div
      style={{ width: `${widthPx}px`, height: `${heightPx}px` }}
      className={`overflow-hidden flex items-center justify-center shrink-0 select-none ${
        isLargeTile ? 'rounded-[12px] mx-auto' : 'rounded-[6px]'
      } ${isMixx ? 'bg-[#FEDD00]' : 'bg-white border border-gray-100'} ${className}`}
    >
      <img
        src={imgSrc}
        alt={isMixx ? 'Mixx by Yas' : 'Flooz Money'}
        draggable={false}
        className={`w-full h-full object-contain origin-center select-none pointer-events-none ${
          isMixx ? 'scale-[1.7]' : ''
        }`}
      />
    </div>
  );
};
