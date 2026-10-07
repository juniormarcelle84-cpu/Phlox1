import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { Lang } from '../services/i18n';

interface OfflineIndicatorProps {
  lang: Lang;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({ lang }) => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div 
      className="fixed bottom-24 left-6 z-50 flex items-center gap-2 rounded-full bg-[#F66554] px-4 py-2 text-xs font-black uppercase tracking-wider text-white shadow-2xl animate-bounce border border-white/20"
      role="status"
      aria-live="polite"
    >
      <WifiOff size={14} />
      <span>
        {lang === 'fr' 
          ? "Mode Hors-ligne — Données en cache" 
          : "Offline Mode — Cached data"}
      </span>
    </div>
  );
};
