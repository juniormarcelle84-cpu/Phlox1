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
      className="fixed bottom-24 left-6 z-50 flex items-center gap-2 rounded-full bg-[#FF3B30] px-4 py-2 text-xs font-bold text-white shadow-2xl animate-bounce"
      role="status"
      aria-live="polite"
    >
      <WifiOff size={14} />
      <span>
        {lang === 'fr' 
          ? "Mode Hors-ligne — Navigation sur données en cache" 
          : "Offline Mode — Browsing cached data"}
      </span>
    </div>
  );
};
