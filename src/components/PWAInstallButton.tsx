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
        className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7477FF]/20 hover:bg-[#7477FF] text-[#7477FF] hover:text-white border border-[#7477FF]/30 rounded-full text-xs font-bold transition-all cursor-pointer"
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
          className="flex items-center gap-1.5 px-3 py-1.5 bg-[#312F30] hover:bg-[#312F30]/80 text-[#FFFFFF] border border-white/15 rounded-full text-xs font-bold transition-all cursor-pointer"
          aria-label={lang === 'fr' ? 'Installer sur iPhone' : 'Install on iOS'}
        >
          <Share size={13} />
          <span className="hidden sm:inline">{lang === 'fr' ? 'Installer (iOS)' : 'Install'}</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#1B1A1B]/80 backdrop-blur-md p-4 animate-fadeIn">
            <div className="relative w-full max-w-sm rounded-[24px] bg-[#312F30] p-6 text-white text-center shadow-2xl border border-white/15">
              <button
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 p-2 text-[#C5D4CA] hover:text-white rounded-full transition-colors cursor-pointer"
                aria-label="Fermer"
              >
                <X size={18} />
              </button>

              <div className="w-12 h-12 bg-[#7477FF]/20 text-[#7477FF] border border-[#7477FF]/30 rounded-2xl flex items-center justify-center mx-auto mb-3">
                <Download size={22} />
              </div>

              <h3 className="text-lg font-black uppercase text-white mb-2">
                {lang === 'fr' ? 'Installer sur iPhone / iPad' : 'Install on iPhone / iPad'}
              </h3>

              <div className="text-left text-xs text-[#C5D4CA] space-y-2 bg-[#1B1A1B] border border-white/10 p-4 rounded-2xl mb-4">
                <p>
                  1. {lang === 'fr' ? 'Appuyez sur le bouton' : 'Tap the'}{' '}
                  <strong className="text-white">{lang === 'fr' ? 'Partager' : 'Share'}</strong>{' '}
                  <Share size={12} className="inline mx-1 text-[#7477FF]" />{' '}
                  {lang === 'fr' ? 'dans Safari.' : 'in Safari toolbar.'}
                </p>
                <p>
                  2.{' '}
                  {lang === 'fr'
                    ? 'Faites défiler vers le bas et sélectionnez'
                    : 'Scroll down and select'}{' '}
                  <strong className="text-white">
                    « {lang === 'fr' ? "Sur l'écran d'accueil" : 'Add to Home Screen'} »
                  </strong>
                  .
                </p>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="w-full py-3 bg-[#7477FF] text-white font-black text-xs uppercase tracking-wider rounded-full hover:bg-[#5E62FF] transition-colors cursor-pointer shadow-md"
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
