import React, { useState, useEffect } from 'react';
import {
  TrendingUp,
  Share2,
  Copy,
  Check,
  ExternalLink,
  DollarSign,
  Wallet,
  Clock,
  CheckCircle2,
  AlertCircle,
  Users,
  Smartphone,
  Gift,
  ArrowRight,
  LogOut,
  Send,
  Sparkles,
  Info
} from 'lucide-react';
import { Affiliate, AffiliateCommission, AffiliatePayout, AffiliateSettings } from '../types';
import { Lang, formatPrice } from '../services/i18n';
import brandConfig from '../brand.config.json';
import {
  getSavedAffiliateSession,
  saveAffiliateSession,
  registerAffiliate,
  loginAffiliate,
  fetchAffiliateDashboard,
  requestAffiliatePayout,
  getReferralUrl,
  getWhatsAppShareText
} from '../services/affiliationService';

interface AffiliateSectionProps {
  lang: Lang;
}

export const AffiliateSection: React.FC<AffiliateSectionProps> = ({ lang }) => {
  const [affiliate, setAffiliate] = useState<Affiliate | null>(() => getSavedAffiliateSession());
  const [activeView, setActiveView] = useState<'register' | 'login' | 'dashboard'>(
    getSavedAffiliateSession() ? 'dashboard' : 'register'
  );

  const [commissions, setCommissions] = useState<AffiliateCommission[]>([]);
  const [payouts, setPayouts] = useState<AffiliatePayout[]>([]);
  const [settings, setSettings] = useState<AffiliateSettings>({
    globalDefaultRate: 7,
    validationDelayDays: 7,
    minWithdrawalAmount: 5000,
    allowSelfReferral: false
  });

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedLink, setCopiedLink] = useState(false);

  // Registration Form State
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regNetwork, setRegNetwork] = useState<'TMONEY' | 'FLOOZ'>('TMONEY');
  const [regPayoutPhone, setRegPayoutPhone] = useState('');
  const [regCustomCode, setRegCustomCode] = useState('');

  // Login Form State
  const [loginIdentifier, setLoginIdentifier] = useState('');

  // Withdrawal Modal State
  const [isWithdrawModalOpen, setIsWithdrawModalOpen] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(5000);
  const [withdrawNetwork, setWithdrawNetwork] = useState<'TMONEY' | 'FLOOZ'>('TMONEY');
  const [withdrawPhone, setWithdrawPhone] = useState('');
  const [withdrawNotes, setWithdrawNotes] = useState('');
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);

  // Detail tab in dashboard
  const [dashboardDetailTab, setDashboardDetailTab] = useState<'commissions' | 'payouts'>('commissions');

  // Load Dashboard data when affiliate is set
  const loadDashboard = async (codeOrId: string) => {
    setIsLoading(true);
    setErrorMsg('');
    const res = await fetchAffiliateDashboard(codeOrId);
    setIsLoading(false);

    if (res.ok && res.data) {
      setAffiliate(res.data.affiliate);
      saveAffiliateSession(res.data.affiliate);
      setCommissions(res.data.commissions);
      setPayouts(res.data.payouts);
      setSettings(res.data.settings);
      setWithdrawNetwork(res.data.affiliate.payoutNetwork || 'TMONEY');
      setWithdrawPhone(res.data.affiliate.payoutPhone || res.data.affiliate.phone || '');
    } else {
      setErrorMsg(res.message || 'Impossible de charger les données du compte affilié.');
    }
  };

  useEffect(() => {
    if (affiliate?.code) {
      loadDashboard(affiliate.code);
    }
  }, []);

  // Handle Registration
  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    const res = await registerAffiliate({
      name: regName,
      email: regEmail,
      phone: regPhone,
      payoutNetwork: regNetwork,
      payoutPhone: regPayoutPhone || regPhone,
      customCode: regCustomCode || undefined
    });

    setIsLoading(false);

    if (res.ok && res.affiliate) {
      setAffiliate(res.affiliate);
      setActiveView('dashboard');
      setSuccessMsg(`Félicitations ${res.affiliate.name} ! Votre code partenaire est ${res.affiliate.code}`);
      loadDashboard(res.affiliate.code);
    } else {
      setErrorMsg(res.message || 'Erreur lors de l’inscription.');
    }
  };

  // Handle Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setIsLoading(true);

    const res = await loginAffiliate(loginIdentifier);
    setIsLoading(false);

    if (res.ok && res.affiliate) {
      setAffiliate(res.affiliate);
      setActiveView('dashboard');
      loadDashboard(res.affiliate.code);
    } else {
      setErrorMsg(res.message || 'Affilié introuvable. Vérifiez vos identifiants.');
    }
  };

  // Handle Logout
  const handleLogout = () => {
    saveAffiliateSession(null);
    setAffiliate(null);
    setActiveView('register');
    setSuccessMsg('');
    setErrorMsg('');
  };

  // Handle Copy Referral Link
  const handleCopyLink = () => {
    if (!affiliate) return;
    const url = getReferralUrl(affiliate.code);
    navigator.clipboard.writeText(url);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Handle WhatsApp Share
  const handleWhatsAppShare = () => {
    if (!affiliate) return;
    const text = getWhatsAppShareText(affiliate.code, affiliate.name);
    window.open(`https://wa.me/?text=${text}`, '_blank');
  };

  // Handle Withdrawal Request Submit
  const handleWithdrawSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!affiliate) return;
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmittingWithdraw(true);

    const res = await requestAffiliatePayout({
      affiliateId: affiliate.id,
      amount: withdrawAmount,
      payoutNetwork: withdrawNetwork,
      payoutPhone: withdrawPhone,
      notes: withdrawNotes
    });

    setIsSubmittingWithdraw(false);

    if (res.ok) {
      setIsWithdrawModalOpen(false);
      setSuccessMsg(res.message || 'Demande de retrait transmise avec succès !');
      loadDashboard(affiliate.code);
    } else {
      setErrorMsg(res.message || 'Erreur lors de la demande de retrait.');
    }
  };

  const referralUrl = affiliate ? getReferralUrl(affiliate.code) : '';

  return (
    <div className="space-y-6 animate-fadeIn max-w-4xl mx-auto text-left text-[#1D1D1F]">
      {/* HEADER HERO BANNER */}
      <div className="bg-white rounded-[28px] p-6 sm:p-8 text-[#1D1D1F] relative overflow-hidden border border-[#AAAAAA]/30 shadow-xs">
        <div className="absolute top-0 right-0 w-64 h-64 bg-[#007AFF]/5 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-[#007AFF]/10 rounded-full text-[11px] font-extrabold text-[#007AFF] uppercase tracking-wider">
            <Sparkles size={13} />
            <span>Programme Partenaires Phlox Togo</span>
          </div>

          <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#1D1D1F]">
            {lang === 'fr'
              ? 'Recommandez des produits & touchez des commissions'
              : 'Recommend products & earn instant cash'}
          </h2>

          <p className="text-xs sm:text-sm text-[#6E6E73] max-w-2xl leading-relaxed">
            {lang === 'fr'
              ? 'Partagez votre lien de parrainage unique avec vos amis et abonnés. Chaque fois qu’une commande est livrée au Togo, vous touchez entre 7% et 15% de commission, retirable directement par T-Money ou Flooz.'
              : 'Share your unique referral link. Whenever an order is delivered in Togo, you earn commissions sent straight to your Mobile Money.'}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="bg-[#F5F5F7] border border-[#AAAAAA]/20 rounded-2xl p-3 flex items-center gap-3">
              <div className="p-2 bg-[#007AFF]/15 text-[#007AFF] rounded-xl shrink-0">
                <DollarSign size={18} />
              </div>
              <div className="text-xs">
                <span className="font-extrabold block text-[#1D1D1F]">7% à 15% par vente</span>
                <span className="text-[10px] text-[#6E6E73]">Commission automatique</span>
              </div>
            </div>

            <div className="bg-[#F5F5F7] border border-[#AAAAAA]/20 rounded-2xl p-3 flex items-center gap-3">
              <div className="p-2 bg-[#007AFF]/15 text-[#007AFF] rounded-xl shrink-0">
                <Smartphone size={18} />
              </div>
              <div className="text-xs">
                <span className="font-extrabold block text-[#1D1D1F]">T-Money & Flooz</span>
                <span className="text-[10px] text-[#6E6E73]">Retraits rapides au Togo</span>
              </div>
            </div>

            <div className="bg-[#F5F5F7] border border-[#AAAAAA]/20 rounded-2xl p-3 flex items-center gap-3">
              <div className="p-2 bg-[#34C759]/15 text-[#34C759] rounded-xl shrink-0">
                <TrendingUp size={18} />
              </div>
              <div className="text-xs">
                <span className="font-extrabold block text-[#1D1D1F]">Suivi en direct</span>
                <span className="text-[10px] text-[#6E6E73]">Clics & ventes en temps réel</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SUCCESS / ERROR TOASTS */}
      {successMsg && (
        <div className="p-4 bg-[#34C759]/15 border border-[#34C759]/30 text-[#34C759] rounded-2xl text-xs font-bold flex items-center gap-2.5">
          <CheckCircle2 size={16} className="shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="p-4 bg-[#FF3B30]/15 border border-[#FF3B30]/30 text-[#FF3B30] rounded-2xl text-xs font-bold flex items-center gap-2.5">
          <AlertCircle size={16} className="shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* IF NOT CONNECTED (REGISTRATION / LOGIN) */}
      {!affiliate && (
        <div className="space-y-6">
          {/* Switcher */}
          <div className="flex bg-white border border-[#AAAAAA]/30 p-1.5 rounded-full max-w-md mx-auto shadow-xs">
            <button
              type="button"
              onClick={() => {
                setActiveView('register');
                setErrorMsg('');
              }}
              className={`flex-1 py-2.5 px-4 text-xs font-semibold uppercase tracking-wider rounded-full transition-all cursor-pointer text-center ${
                activeView === 'register'
                  ? 'bg-[#007AFF] text-white shadow-xs'
                  : 'text-[#6E6E73] hover:text-[#1D1D1F]'
              }`}
            >
              {lang === 'fr' ? 'Devenir Partenaire' : 'Become a Partner'}
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveView('login');
                setErrorMsg('');
              }}
              className={`flex-1 py-2.5 px-4 text-xs font-semibold uppercase tracking-wider rounded-full transition-all cursor-pointer text-center ${
                activeView === 'login'
                  ? 'bg-[#007AFF] text-white shadow-xs'
                  : 'text-[#6E6E73] hover:text-[#1D1D1F]'
              }`}
            >
              {lang === 'fr' ? 'Mon Espace Affilié' : 'Affiliate Login'}
            </button>
          </div>

          {activeView === 'register' ? (
            /* REGISTRATION FORM */
            <form
              onSubmit={handleRegister}
              className="bg-white rounded-[28px] p-6 sm:p-8 space-y-5 max-w-xl mx-auto text-[#1D1D1F] border border-[#AAAAAA]/30 shadow-xs"
            >
              <div className="text-center space-y-1">
                <h3 className="text-lg font-black uppercase tracking-tight text-[#1D1D1F]">
                  {lang === 'fr' ? 'Inscription Gratuite au Programme' : 'Free Partner Registration'}
                </h3>
                <p className="text-xs text-[#6E6E73]">
                  {lang === 'fr'
                    ? 'Créez votre compte en 1 minute et recevez immédiatement votre lien de parrainage.'
                    : 'Create your account in 1 minute and get your instant referral link.'}
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#6E6E73] uppercase tracking-wider">
                    {lang === 'fr' ? 'Nom et prénom' : 'Full Name'} *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Kodjo Mensah"
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-sm font-semibold px-4 py-3 rounded-full border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-[#6E6E73] uppercase tracking-wider">
                      {lang === 'fr' ? 'Adresse E-mail' : 'Email Address'} *
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="kodjo@gmail.com"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-sm font-semibold px-4 py-3 rounded-full border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-[#6E6E73] uppercase tracking-wider">
                      {lang === 'fr' ? 'Téléphone WhatsApp' : 'WhatsApp Phone'} *
                    </label>
                    <input
                      type="tel"
                      required
                      placeholder="+228 90 12 34 56"
                      value={regPhone}
                      onChange={(e) => setRegPhone(e.target.value)}
                      className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-sm font-semibold px-4 py-3 rounded-full border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden"
                    />
                  </div>
                </div>

                <div className="pt-2 space-y-3">
                  <span className="block text-xs font-extrabold text-[#007AFF] uppercase tracking-wider">
                    {lang === 'fr' ? 'Paiement de vos commissions' : 'Payout Details'}
                  </span>

                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setRegNetwork('TMONEY')}
                      className={`p-3 rounded-full text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all border ${
                        regNetwork === 'TMONEY'
                          ? 'bg-[#007AFF] text-white border-[#007AFF]'
                          : 'bg-white text-[#1D1D1F] border-[#AAAAAA]/40 hover:bg-[#F5F5F7]'
                      }`}
                    >
                      <span>T-Money (Togocom)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRegNetwork('FLOOZ')}
                      className={`p-3 rounded-full text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all border ${
                        regNetwork === 'FLOOZ'
                          ? 'bg-[#007AFF] text-white border-[#007AFF]'
                          : 'bg-white text-[#1D1D1F] border-[#AAAAAA]/40 hover:bg-[#F5F5F7]'
                      }`}
                    >
                      <span>Flooz (Moov Africa)</span>
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-[#6E6E73] uppercase tracking-wider">
                      {lang === 'fr' ? 'Numéro pour recevoir les gains' : 'Payout Phone Number'}
                    </label>
                    <input
                      type="tel"
                      placeholder="Laissez vide si identique à WhatsApp"
                      value={regPayoutPhone}
                      onChange={(e) => setRegPayoutPhone(e.target.value)}
                      className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-sm font-semibold px-4 py-3 rounded-full border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-[#6E6E73] uppercase tracking-wider flex justify-between">
                      <span>{lang === 'fr' ? 'Code parrainage souhaité (optionnel)' : 'Custom Referral Code'}</span>
                      <span className="text-[#6E6E73] font-normal text-[11px]">ex: KODJO228</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Généré automatiquement si vide"
                      value={regCustomCode}
                      onChange={(e) => setRegCustomCode(e.target.value.toUpperCase().replace(/[^A-Z0-9_-]/g, ''))}
                      className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-sm font-semibold px-4 py-3 rounded-full border border-[#AAAAAA]/30 uppercase tracking-wider focus:border-[#007AFF] focus:outline-hidden"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-4 bg-[#007AFF] hover:bg-[#0071EB] text-white font-semibold text-xs uppercase tracking-wider rounded-full transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 shadow-xs"
                >
                  {isLoading ? (
                    <span>Création en cours...</span>
                  ) : (
                    <>
                      <span>{lang === 'fr' ? 'Générer mon lien & commencer' : 'Create My Referral Link'}</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* LOGIN FORM */
            <form
              onSubmit={handleLogin}
              className="bg-white rounded-[28px] p-6 sm:p-8 space-y-5 max-w-md mx-auto text-[#1D1D1F] border border-[#AAAAAA]/30 shadow-xs"
            >
              <div className="text-center space-y-1">
                <div className="w-12 h-12 bg-[#007AFF]/15 text-[#007AFF] rounded-full flex items-center justify-center mx-auto mb-2">
                  <Users size={22} />
                </div>
                <h3 className="text-lg font-black uppercase tracking-tight text-[#1D1D1F]">
                  {lang === 'fr' ? 'Accès Espace Affilié' : 'Affiliate Portal'}
                </h3>
                <p className="text-xs text-[#6E6E73]">
                  {lang === 'fr'
                    ? 'Saisissez votre code partenaire, numéro de téléphone ou e-mail.'
                    : 'Enter your partner code, phone number or email.'}
                </p>
              </div>

              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#6E6E73] uppercase tracking-wider">
                    {lang === 'fr' ? 'Code Affilié, Téléphone ou E-mail' : 'Identifier'}
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: KODJO228 ou 90123456"
                    value={loginIdentifier}
                    onChange={(e) => setLoginIdentifier(e.target.value)}
                    className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-sm font-semibold px-4 py-3 rounded-full border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 bg-[#007AFF] hover:bg-[#0071EB] text-white font-semibold text-xs uppercase tracking-wider rounded-full transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2 shadow-xs"
                >
                  {isLoading ? 'Vérification...' : (lang === 'fr' ? 'Consulter mon Tableau de bord' : 'Open Dashboard')}
                </button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* IF CONNECTED: AFFILIATE DASHBOARD */}
      {affiliate && (
        <div className="space-y-6 animate-fadeIn">
          {/* TOP BAR / AFFILIATE PROFILE */}
          <div className="bg-white rounded-[28px] p-5 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-[#1D1D1F] border border-[#AAAAAA]/30 shadow-xs">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-[#34C759] animate-pulse" />
                <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-[#1D1D1F]">
                  {affiliate.name}
                </h3>
                <span className="px-3 py-1 bg-[#007AFF]/15 text-[#007AFF] text-[11px] font-black rounded-full uppercase tracking-wider">
                  Partenaire {affiliate.commissionRate || 7}%
                </span>
              </div>
              <div className="flex items-center gap-2 text-xs text-[#6E6E73] font-mono">
                <span>Code :</span>
                <span className="text-[#007AFF] font-bold">{affiliate.code}</span>
                <span>• {affiliate.phone}</span>
              </div>
            </div>

            <button
              onClick={handleLogout}
              className="px-5 py-2.5 bg-white border border-[#AAAAAA] hover:bg-[#F5F5F7] text-[#1D1D1F] font-semibold text-xs uppercase tracking-wider rounded-full transition-colors cursor-pointer flex items-center gap-1.5 ml-auto sm:ml-0"
            >
              <LogOut size={13} />
              <span>{lang === 'fr' ? 'Déconnexion' : 'Logout'}</span>
            </button>
          </div>

          {/* SHARE REFERRAL LINK BOX */}
          <div className="bg-white rounded-[28px] p-6 space-y-4 text-[#1D1D1F] border border-[#AAAAAA]/30 shadow-xs">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] font-black text-[#007AFF] uppercase tracking-wider block">
                  {lang === 'fr' ? 'VOTRE LIEN DE PARRAINAGE UNIQUE' : 'YOUR UNIQUE REFERRAL LINK'}
                </span>
                <h4 className="text-base sm:text-lg font-black uppercase text-[#1D1D1F]">
                  {lang === 'fr' ? 'Partagez et gagnez à chaque commande' : 'Share & Earn on every order'}
                </h4>
              </div>
              <div className="p-2.5 bg-[#007AFF]/15 text-[#007AFF] rounded-full">
                <Share2 size={22} />
              </div>
            </div>

            {/* Link display & copy */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-[#F5F5F7] p-2 rounded-full border border-[#AAAAAA]/30">
              <input
                type="text"
                readOnly
                value={referralUrl}
                className="w-full bg-transparent text-xs sm:text-sm font-mono font-bold text-[#1D1D1F] px-4 py-2 select-all focus:outline-hidden"
              />

              <div className="flex gap-2 shrink-0">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="px-5 py-2.5 bg-[#007AFF] hover:bg-[#0071EB] text-white text-xs font-semibold uppercase tracking-wider rounded-full transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  {copiedLink ? (
                    <>
                      <Check size={14} className="text-[#34C759]" />
                      <span>{lang === 'fr' ? 'Copié !' : 'Copied!'}</span>
                    </>
                  ) : (
                    <>
                      <Copy size={14} />
                      <span>{lang === 'fr' ? 'Copier' : 'Copy'}</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleWhatsAppShare}
                  className="px-5 py-2.5 bg-[#25D366] hover:bg-[#20ba59] text-white text-xs font-semibold uppercase tracking-wider rounded-full transition-colors cursor-pointer flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <Send size={14} />
                  <span>WhatsApp</span>
                </button>
              </div>
            </div>

            <p className="text-xs text-[#6E6E73] leading-relaxed flex items-center gap-1.5">
              <Info size={14} className="text-[#007AFF] shrink-0" />
              <span>
                {lang === 'fr'
                  ? 'Astuce : Publiez ce lien dans vos statuts WhatsApp et réseaux sociaux pour attirer des acheteurs !'
                  : 'Pro tip: Post this link on your WhatsApp status and social media to drive buyers!'}
              </span>
            </p>
          </div>

          {/* 4 METRICS CARDS */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
            <div className="bg-white p-4 sm:p-5 rounded-[28px] text-[#1D1D1F] space-y-1 border border-[#AAAAAA]/30 shadow-xs">
              <span className="text-[10px] font-black uppercase text-[#6E6E73] block tracking-wider">
                {lang === 'fr' ? 'Clics enregistrés' : 'Total Clicks'}
              </span>
              <span className="text-xl sm:text-2xl font-black text-[#007AFF] font-mono tabular-nums">
                {affiliate.clicksCount || 0}
              </span>
              <span className="text-[10px] text-[#6E6E73] block">Visites apportées</span>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-[28px] text-[#1D1D1F] space-y-1 border border-[#AAAAAA]/30 shadow-xs">
              <span className="text-[10px] font-black uppercase text-[#6E6E73] block tracking-wider">
                {lang === 'fr' ? 'Ventes générées' : 'Total Sales'}
              </span>
              <span className="text-xl sm:text-2xl font-black text-[#007AFF] font-mono tabular-nums">
                {affiliate.salesCount || 0}
              </span>
              <span className="text-[10px] text-[#6E6E73] block">Commandes livrées</span>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-[28px] text-[#1D1D1F] space-y-1 border border-[#AAAAAA]/30 shadow-xs">
              <span className="text-[10px] font-black uppercase text-[#6E6E73] block tracking-wider">
                {lang === 'fr' ? 'Volume Ventes' : 'Sales Volume'}
              </span>
              <span className="text-lg sm:text-xl font-black text-[#1D1D1F] font-mono tabular-nums">
                {formatPrice(affiliate.totalSalesAmount || 0)}
              </span>
              <span className="text-[10px] text-[#6E6E73] block">Chiffre généré</span>
            </div>

            <div className="bg-white p-4 sm:p-5 rounded-[28px] text-[#1D1D1F] space-y-1 border border-[#AAAAAA]/30 shadow-xs">
              <span className="text-[10px] font-black uppercase text-[#6E6E73] block tracking-wider">
                {lang === 'fr' ? 'Total Commissions' : 'Total Earned'}
              </span>
              <span className="text-lg sm:text-xl font-black text-[#34C759] font-mono tabular-nums">
                {formatPrice(affiliate.totalCommissionEarned || 0)}
              </span>
              <span className="text-[10px] text-[#6E6E73] block">Gains cumulés</span>
            </div>
          </div>

          {/* WALLET & WITHDRAWAL CARD */}
          <div className="bg-white rounded-[28px] p-6 sm:p-7 text-[#1D1D1F] space-y-5 border border-[#AAAAAA]/30 shadow-xs">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-[#AAAAAA]/20 pb-5">
              <div className="space-y-1">
                <span className="text-[10px] font-black uppercase text-[#007AFF] tracking-widest flex items-center gap-1.5">
                  <Wallet size={14} />
                  <span>{lang === 'fr' ? 'SOLDE RETIRABLE IMMÉDIATEMENT' : 'AVAILABLE BALANCE'}</span>
                </span>
                <div className="text-3xl sm:text-4xl font-black text-[#1D1D1F] font-mono tracking-tight tabular-nums">
                  {formatPrice(affiliate.availableBalance || 0)}
                </div>
              </div>

              <button
                type="button"
                onClick={() => {
                  setWithdrawAmount(Math.max(settings.minWithdrawalAmount || 5000, affiliate.availableBalance || 5000));
                  setIsWithdrawModalOpen(true);
                }}
                disabled={(affiliate.availableBalance || 0) < (settings.minWithdrawalAmount || 5000)}
                className="px-6 py-3.5 bg-[#007AFF] hover:bg-[#0071EB] disabled:bg-[#AAAAAA]/35 disabled:text-[#1D1D1F]/50 disabled:cursor-not-allowed text-white font-semibold text-xs uppercase tracking-wider rounded-full transition-all cursor-pointer flex items-center gap-2 shadow-xs"
              >
                <DollarSign size={16} />
                <span>{lang === 'fr' ? 'Demander un retrait' : 'Request Payout'}</span>
              </button>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs">
              <div className="space-y-0.5">
                <span className="text-[#6E6E73] text-[10px] uppercase font-bold block">
                  {lang === 'fr' ? 'Solde en attente' : 'Pending Verification'}
                </span>
                <span className="font-mono font-bold text-[#FF9500] text-sm tabular-nums">
                  {formatPrice(affiliate.pendingBalance || 0)}
                </span>
              </div>

              <div className="space-y-0.5">
                <span className="text-[#6E6E73] text-[10px] uppercase font-bold block">
                  {lang === 'fr' ? 'Total déjà retiré' : 'Total Paid Out'}
                </span>
                <span className="font-mono font-bold text-[#1D1D1F] text-sm tabular-nums">
                  {formatPrice(affiliate.withdrawnBalance || 0)}
                </span>
              </div>

              <div className="space-y-0.5 col-span-2 sm:col-span-1">
                <span className="text-[#6E6E73] text-[10px] uppercase font-bold block">
                  {lang === 'fr' ? 'Compte de paiement' : 'Payout Number'}
                </span>
                <span className="font-semibold text-[#1D1D1F] text-xs">
                  {affiliate.payoutNetwork} ({affiliate.payoutPhone || affiliate.phone})
                </span>
              </div>
            </div>
          </div>

          {/* ACTIVITY TABS (COMMISSIONS / WITHDRAWALS) */}
          <div className="bg-white rounded-[28px] p-6 space-y-4 text-[#1D1D1F] border border-[#AAAAAA]/30 shadow-xs">
            <div className="flex border-b border-[#AAAAAA]/20 pb-3 gap-4">
              <button
                type="button"
                onClick={() => setDashboardDetailTab('commissions')}
                className={`text-xs font-semibold uppercase tracking-wider pb-1 cursor-pointer transition-colors ${
                  dashboardDetailTab === 'commissions'
                    ? 'text-[#007AFF] border-b-2 border-[#007AFF]'
                    : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                {lang === 'fr' ? `Commissions Détaillées (${commissions.length})` : `Commissions (${commissions.length})`}
              </button>

              <button
                type="button"
                onClick={() => setDashboardDetailTab('payouts')}
                className={`text-xs font-semibold uppercase tracking-wider pb-1 cursor-pointer transition-colors ${
                  dashboardDetailTab === 'payouts'
                    ? 'text-[#007AFF] border-b-2 border-[#007AFF]'
                    : 'text-[#6E6E73] hover:text-[#1D1D1F]'
                }`}
              >
                {lang === 'fr' ? `Historique des Retraits (${payouts.length})` : `Payouts (${payouts.length})`}
              </button>
            </div>

            {/* TAB 1: COMMISSIONS LIST */}
            {dashboardDetailTab === 'commissions' && (
              <div className="space-y-3">
                {commissions.length === 0 ? (
                  <div className="text-center py-8 text-[#6E6E73] space-y-2">
                    <p className="text-xs font-semibold">Aucune commission enregistrée pour le moment.</p>
                    <p className="text-[11px] text-[#6E6E73]">
                      Partagez votre lien de parrainage pour recevoir vos premières commissions !
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#AAAAAA]/20 text-[10px] text-[#6E6E73] uppercase font-black">
                          <th className="pb-2">Date</th>
                          <th className="pb-2">Commande</th>
                          <th className="pb-2">Montant</th>
                          <th className="pb-2">Taux</th>
                          <th className="pb-2">Commission</th>
                          <th className="pb-2 text-right">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#AAAAAA]/15 font-medium">
                        {commissions.map((c) => (
                          <tr key={c.id} className="hover:bg-[#F5F5F7] transition-colors">
                            <td className="py-3 text-[#6E6E73] text-[11px]">
                              {new Date(c.createdAt).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: 'short'
                              })}
                            </td>
                            <td className="py-3 font-mono font-bold text-[#1D1D1F]">{c.orderId}</td>
                            <td className="py-3 font-mono text-[#1D1D1F]">{formatPrice(c.orderTotal)}</td>
                            <td className="py-3 font-bold text-[#007AFF]">{c.rateApplied}%</td>
                            <td className="py-3 font-mono font-black text-[#1D1D1F]">{formatPrice(c.commissionAmount)}</td>
                            <td className="py-3 text-right">
                              <span
                                className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  c.status === 'approved'
                                    ? 'bg-[#34C759]/15 text-[#34C759]'
                                    : c.status === 'paid'
                                    ? 'bg-[#007AFF]/15 text-[#007AFF]'
                                    : c.status === 'pending'
                                    ? 'bg-[#FF9500]/15 text-[#FF9500]'
                                    : 'bg-[#FF3B30]/15 text-[#FF3B30]'
                                }`}
                              >
                                {c.status === 'approved'
                                  ? 'Validée'
                                  : c.status === 'paid'
                                  ? 'Payée'
                                  : c.status === 'pending'
                                  ? 'En attente'
                                  : 'Annulée'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: PAYOUTS LIST */}
            {dashboardDetailTab === 'payouts' && (
              <div className="space-y-3">
                {payouts.length === 0 ? (
                  <div className="text-center py-8 text-[#6E6E73] space-y-2">
                    <p className="text-xs font-semibold">Aucune demande de retrait effectuée.</p>
                    <p className="text-[11px] text-[#6E6E73]">
                      Dès que votre solde atteint {settings.minWithdrawalAmount?.toLocaleString() || '5 000'} FCFA, vous
                      pouvez demander un virement.
                    </p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead>
                        <tr className="border-b border-[#AAAAAA]/20 text-[10px] text-[#6E6E73] uppercase font-black">
                          <th className="pb-2">Date</th>
                          <th className="pb-2">Montant</th>
                          <th className="pb-2">Réseau</th>
                          <th className="pb-2">Numéro</th>
                          <th className="pb-2 text-right">Statut</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#AAAAAA]/15 font-medium">
                        {payouts.map((p) => (
                          <tr key={p.id} className="hover:bg-[#F5F5F7] transition-colors">
                            <td className="py-3 text-[#6E6E73] text-[11px]">
                              {new Date(p.requestedAt).toLocaleDateString('fr-FR', {
                                day: '2-digit',
                                month: 'short',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </td>
                            <td className="py-3 font-mono font-black text-[#1D1D1F]">{formatPrice(p.amount)}</td>
                            <td className="py-3 font-bold text-[#1D1D1F]">{p.payoutNetwork}</td>
                            <td className="py-3 font-mono text-[#6E6E73]">{p.payoutPhone}</td>
                            <td className="py-3 text-right">
                              <span
                                className={`inline-block px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                                  p.status === 'completed'
                                    ? 'bg-[#34C759]/15 text-[#34C759]'
                                    : p.status === 'pending'
                                    ? 'bg-[#FF9500]/15 text-[#FF9500]'
                                    : 'bg-[#FF3B30]/15 text-[#FF3B30]'
                                }`}
                              >
                                {p.status === 'completed'
                                  ? 'Effectué'
                                  : p.status === 'pending'
                                  ? 'En cours'
                                  : 'Rejeté'}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* WITHDRAWAL POPUP MODAL */}
      {isWithdrawModalOpen && affiliate && (
        <div className="fixed inset-0 z-50 bg-[#1D1D1F]/45 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-[28px] max-w-md w-full p-6 sm:p-7 space-y-5 animate-fadeIn text-[#1D1D1F] text-left border border-[#AAAAAA]/30 shadow-2xl">
            <div className="flex justify-between items-center border-b border-[#AAAAAA]/20 pb-3">
              <h3 className="text-base font-black uppercase text-[#1D1D1F] flex items-center gap-2">
                <Wallet size={18} className="text-[#007AFF]" />
                <span>Demande de Retrait Mobile Money</span>
              </h3>
              <button
                type="button"
                onClick={() => setIsWithdrawModalOpen(false)}
                className="text-[#6E6E73] hover:text-[#1D1D1F] text-sm font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleWithdrawSubmit} className="space-y-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#6E6E73] uppercase tracking-wider flex justify-between">
                  <span>Montant du retrait (FCFA) *</span>
                  <span className="text-[#6E6E73] font-normal">
                    Max : {formatPrice(affiliate.availableBalance || 0)}
                  </span>
                </label>
                <input
                  type="number"
                  required
                  min={settings.minWithdrawalAmount || 5000}
                  max={affiliate.availableBalance || 0}
                  step={500}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(Number(e.target.value))}
                  className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-sm font-bold px-4 py-3 rounded-full border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#6E6E73] uppercase tracking-wider">Réseau de paiement *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setWithdrawNetwork('TMONEY')}
                    className={`p-3 rounded-full text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all border ${
                      withdrawNetwork === 'TMONEY'
                        ? 'bg-[#007AFF] text-white border-[#007AFF]'
                        : 'bg-white text-[#1D1D1F] border-[#AAAAAA]/40 hover:bg-[#F5F5F7]'
                    }`}
                  >
                    <span>T-Money</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setWithdrawNetwork('FLOOZ')}
                    className={`p-3 rounded-full text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 cursor-pointer transition-all border ${
                      withdrawNetwork === 'FLOOZ'
                        ? 'bg-[#007AFF] text-white border-[#007AFF]'
                        : 'bg-white text-[#1D1D1F] border-[#AAAAAA]/40 hover:bg-[#F5F5F7]'
                    }`}
                  >
                    <span>Flooz</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#6E6E73] uppercase tracking-wider">Numéro à créditer *</label>
                <input
                  type="tel"
                  required
                  placeholder="+228 XX XX XX XX"
                  value={withdrawPhone}
                  onChange={(e) => setWithdrawPhone(e.target.value)}
                  className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-sm font-semibold px-4 py-3 rounded-full border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#6E6E73] uppercase tracking-wider">Notes (optionnel)</label>
                <input
                  type="text"
                  placeholder="Ex: Titulaire du numéro..."
                  value={withdrawNotes}
                  onChange={(e) => setWithdrawNotes(e.target.value)}
                  className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-xs px-4 py-3 rounded-full border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsWithdrawModalOpen(false)}
                  className="flex-1 py-3 bg-white border border-[#AAAAAA] hover:bg-[#F5F5F7] text-[#1D1D1F] text-xs font-semibold uppercase tracking-wider rounded-full transition-colors cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingWithdraw}
                  className="flex-1 py-3 bg-[#007AFF] hover:bg-[#0071EB] text-white text-xs font-semibold uppercase tracking-wider rounded-full transition-colors cursor-pointer disabled:opacity-60 shadow-xs"
                >
                  {isSubmittingWithdraw ? 'Envoi...' : 'Confirmer le Retrait'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
