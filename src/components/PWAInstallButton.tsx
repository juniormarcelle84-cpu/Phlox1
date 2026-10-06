import React, { useState } from 'react';
import { Download, Share, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { Lang } from '../services/i18n';

interface PWAInstallButtonProps {
  lang: Lang;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ lang }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);

  if (isInstalled) {
    return null;
  }

  if (isInstallable) {
    return (
      <button
        onClick={install}
        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#007AFF]/10 hover:bg-[#007AFF]/20 text-[#007AFF] rounded-full text-xs font-bold transition-all cursor-pointer"
        aria-label={lang === 'fr' ? "Installer l'application Phlox Togo" : 'Install Phlox Togo App'}
      >
        <Download size={13} />
        <span className="hidden sm:inline">{lang === 'fr' ? "Installer l'App" : 'Install App'}</span>
      </button>
    );
  }

  if (isIOS) {
    return (
      <>
        <button
          onClick={() => setShowIOSGuide(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#F5F5F7] hover:bg-[#F5F5F7]/80 text-[#1D1D1F] border border-[#AAAAAA]/30 rounded-full text-xs font-bold transition-all cursor-pointer"
          aria-label={lang === 'fr' ? 'Installer sur iPhone' : 'Install on iOS'}
        >
          <Share size={13} />
          <span className="hidden sm:inline">{lang === 'fr' ? 'Installer (iOS)' : 'Install'}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1D1D1F]/45 backdrop-blur-sm p-4 animate-fadeIn">
            <div className="relative w-full max-w-sm rounded-[24px] bg-white p-6 text-[#1D1D1F] text-center shadow-2xl border border-[#AAAAAA]/30">
              <button
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 p-2 text-[#6E6E73] hover:text-[#1D1D1F] rounded-full transition-colors cursor-pointer"
                aria-label="Fermer"
              >
                <X size={18} />
              </button>

              <div className="w-12 h-12 bg-[#007AFF]/10 text-[#007AFF] rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Download size={22} />
              </div>

              <h3 className="text-lg font-black uppercase text-[#1D1D1F] mb-2">
                {lang === 'fr' ? 'Installer sur iPhone / iPad' : 'Install on iPhone / iPad'}
              </h3>

              <div className="text-left text-xs text-[#6E6E73] space-y-2 bg-[#F5F5F7] border border-[#AAAAAA]/20 p-4 rounded-2xl mb-4">
                <p>
                  1. {lang === 'fr' ? 'Appuyez sur le bouton' : 'Tap the'}{' '}
                  <strong className="text-[#1D1D1F]">{lang === 'fr' ? 'Partager' : 'Share'}</strong>{' '}
                  <Share size={12} className="inline mx-1 text-[#007AFF]" />{' '}
                  {lang === 'fr' ? 'dans Safari.' : 'in Safari toolbar.'}
                </p>
                <p>
                  2.{' '}
                  {lang === 'fr'
                    ? 'Faites défiler vers le bas et sélectionnez'
                    : 'Scroll down and select'}{' '}
                  <strong className="text-[#1D1D1F]">
                    « {lang === 'fr' ? "Sur l'écran d'accueil" : 'Add to Home Screen'} »
                  </strong>
                  .
                </p>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-3 bg-[#007AFF] text-white font-bold text-xs uppercase tracking-wider rounded-full hover:bg-[#0071EB] transition-colors cursor-pointer"
              >
                {lang === 'fr' ? "J'ai compris" : 'Got it'}
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
