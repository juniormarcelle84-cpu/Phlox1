import { Affiliate, AffiliateCommission, AffiliatePayout, AffiliateSettings } from '../types';

const AFFILIATE_SESSION_KEY = 'phlox_affiliate_session';
const REF_TRACKING_KEY = 'phlox_affiliate_ref';

export interface AffiliateDashboardData {
  affiliate: Affiliate;
  commissions: AffiliateCommission[];
  payouts: AffiliatePayout[];
  settings: AffiliateSettings;
  referralLink: string;
}

// Generate standard referral URL
export const getReferralUrl = (code: string): string => {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://phlox-togo.com';
  return `${origin}?ref=${encodeURIComponent(code.toUpperCase())}`;
};

// Generate share text for WhatsApp
export const getWhatsAppShareText = (code: string, affiliateName?: string): string => {
  const link = getReferralUrl(code);
  return encodeURIComponent(
    `🔥 Découvrez les meilleures offres high-tech et accessoires tendance chez PHLOX TOGO ! 🎧⚡\n\nCommandez directement avec livraison rapide partout au Togo (Lomé, Kpalimé, Kara, Sokodé...) et paiement sécurisé T-Money / Flooz :\n👉 ${link}\n\nCode partenaire : *${code.toUpperCase()}*`
  );
};

// Get current active affiliate session
export const getSavedAffiliateSession = (): Affiliate | null => {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(AFFILIATE_SESSION_KEY);
  if (!stored) return null;
  try {
    return JSON.parse(stored);
  } catch {
    return null;
  }
};

export const saveAffiliateSession = (affiliate: Affiliate | null) => {
  if (typeof window === 'undefined') return;
  if (!affiliate) {
    localStorage.removeItem(AFFILIATE_SESSION_KEY);
  } else {
    localStorage.setItem(AFFILIATE_SESSION_KEY, JSON.stringify(affiliate));
  }
};

// Track incoming referral code
export const trackReferralCode = async (refCode: string): Promise<boolean> => {
  if (!refCode || typeof window === 'undefined') return false;
  const cleanCode = refCode.trim().toUpperCase();
  localStorage.setItem(REF_TRACKING_KEY, cleanCode);

  try {
    const res = await fetch('/api/affiliates/click', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refCode: cleanCode })
    });
    return res.ok;
  } catch {
    return false;
  }
};

export const getActiveReferralCode = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(REF_TRACKING_KEY) || null;
};

// Public affiliate registration
export const registerAffiliate = async (data: {
  name: string;
  email: string;
  phone: string;
  payoutNetwork: 'TMONEY' | 'FLOOZ';
  payoutPhone: string;
  customCode?: string;
}): Promise<{ ok: boolean; message: string; affiliate?: Affiliate; referralLink?: string }> => {
  try {
    const res = await fetch('/api/affiliates/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });

    const json = await res.json();
    if (!res.ok || json.status === 'error') {
      return { ok: false, message: json.message || "Échec de l'inscription." };
    }

    if (json.affiliate) {
      saveAffiliateSession(json.affiliate);
    }
    return {
      ok: true,
      message: json.message || "Inscription réussie !",
      affiliate: json.affiliate,
      referralLink: getReferralUrl(json.affiliate?.code || '')
    };
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Impossible de joindre le serveur.' };
  }
};

// Public affiliate login (by code, phone or email)
export const loginAffiliate = async (identifier: string): Promise<{
  ok: boolean;
  message: string;
  affiliate?: Affiliate;
}> => {
  try {
    const res = await fetch('/api/affiliates/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ identifier: identifier.trim() })
    });

    const json = await res.json();
    if (!res.ok || json.status === 'error') {
      return { ok: false, message: json.message || 'Affilié introuvable.' };
    }

    if (json.affiliate) {
      saveAffiliateSession(json.affiliate);
    }
    return {
      ok: true,
      message: 'Connexion réussie',
      affiliate: json.affiliate
    };
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Erreur réseau.' };
  }
};

// Fetch full dashboard data
export const fetchAffiliateDashboard = async (
  codeOrId: string
): Promise<{ ok: boolean; data?: AffiliateDashboardData; message?: string }> => {
  try {
    const res = await fetch(`/api/affiliates/dashboard/${encodeURIComponent(codeOrId)}`);
    const json = await res.json();

    if (!res.ok || json.status === 'error') {
      return { ok: false, message: json.message || 'Données introuvables.' };
    }

    const referralLink = getReferralUrl(json.affiliate.code);
    return {
      ok: true,
      data: {
        affiliate: json.affiliate,
        commissions: json.commissions || [],
        payouts: json.payouts || [],
        settings: json.settings || {
          globalDefaultRate: 7,
          validationDelayDays: 7,
          minWithdrawalAmount: 5000,
          allowSelfReferral: false
        },
        referralLink
      }
    };
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Erreur réseau.' };
  }
};

// Request Payout
export const requestAffiliatePayout = async (params: {
  affiliateId: string;
  amount: number;
  payoutNetwork: 'TMONEY' | 'FLOOZ';
  payoutPhone: string;
  notes?: string;
}): Promise<{ ok: boolean; message: string; payout?: AffiliatePayout; updatedBalance?: number }> => {
  try {
    const res = await fetch('/api/affiliates/payout-request', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    const json = await res.json();
    if (!res.ok || json.status === 'error') {
      return { ok: false, message: json.message || 'Échec de la demande de retrait.' };
    }

    return {
      ok: true,
      message: json.message || 'Demande de retrait enregistrée avec succès.',
      payout: json.payout,
      updatedBalance: json.availableBalance
    };
  } catch (err: any) {
    return { ok: false, message: err?.message || 'Erreur de communication avec le serveur.' };
  }
};

// =========================================================================
// TIERED COMMISSION CALCULATION & ORDER COMPLETION TRIGGER
// Hierarchy: Affiliate-specific rate > Product Category rate > Global rate
// =========================================================================

export const DEFAULT_CATEGORY_COMMISSION_RATES: Record<string, number> = {
  earphone: 10,
  watch: 8,
  speaker: 8,
  vr: 6,
  laptop: 4,
  console: 4
};

export interface TieredCommissionItemBreakdown {
  productId: string;
  productName: string;
  category?: string;
  unitPrice: number;
  quantity: number;
  itemTotal: number;
  rateApplied: number;
  rateSource: 'affiliate' | 'category' | 'product' | 'global';
  commissionAmount: number;
}

export interface TieredCommissionCalculationResult {
  affiliateCode: string;
  orderId: string;
  eligibleSubtotal: number;
  totalCommission: number;
  effectiveAverageRate: number;
  primaryRateSource: 'affiliate' | 'category' | 'product' | 'global';
  itemsBreakdown: TieredCommissionItemBreakdown[];
}

/**
 * Calculates commission following strict tier priority:
 * 1. Affiliate-specific rate (affiliate.commissionRate)
 * 2. Product Category rate (categoryCommissionRates[category] or product.commissionRate)
 * 3. Global rate (globalDefaultRate || 7)
 */
export const calculateTieredCommission = (params: {
  order: {
    id: string;
    items: {
      productId: string;
      productName: string;
      price: number;
      quantity: number;
      category?: string;
    }[];
    totalAmount: number;
    deliveryFee?: number;
  };
  affiliate?: {
    code: string;
    commissionRate?: number;
  } | null;
  categoryRates?: Record<string, number>;
  globalDefaultRate?: number;
}): TieredCommissionCalculationResult => {
  const { order, affiliate } = params;
  const globalRate = params.globalDefaultRate ?? 7;
  const catRates = { ...DEFAULT_CATEGORY_COMMISSION_RATES, ...(params.categoryRates || {}) };

  const hasAffiliateSpecificRate =
    typeof affiliate?.commissionRate === 'number' && affiliate.commissionRate > 0;

  let totalCommission = 0;
  let totalEligibleSubtotal = 0;
  let primaryRateSource: 'affiliate' | 'category' | 'product' | 'global' = 'global';

  const itemsBreakdown: TieredCommissionItemBreakdown[] = order.items.map((item) => {
    const itemTotal = item.price * item.quantity;
    totalEligibleSubtotal += itemTotal;

    let rateApplied = globalRate;
    let rateSource: 'affiliate' | 'category' | 'product' | 'global' = 'global';

    // Tier 1: Affiliate-specific custom rate takes top priority
    if (hasAffiliateSpecificRate && affiliate?.commissionRate) {
      rateApplied = affiliate.commissionRate;
      rateSource = 'affiliate';
    }
    // Tier 2: Product category or product-specific rate
    else if (item.category && catRates[item.category.toLowerCase()] !== undefined) {
      rateApplied = catRates[item.category.toLowerCase()];
      rateSource = 'category';
    }
    // Tier 3: Global rate
    else {
      rateApplied = globalRate;
      rateSource = 'global';
    }

    primaryRateSource = rateSource;
    const itemCommission = Math.round(itemTotal * (rateApplied / 100));
    totalCommission += itemCommission;

    return {
      productId: item.productId,
      productName: item.productName,
      category: item.category,
      unitPrice: item.price,
      quantity: item.quantity,
      itemTotal,
      rateApplied,
      rateSource,
      commissionAmount: itemCommission
    };
  });

  const effectiveAverageRate =
    totalEligibleSubtotal > 0 ? Number(((totalCommission / totalEligibleSubtotal) * 100).toFixed(2)) : globalRate;

  return {
    affiliateCode: affiliate?.code || '',
    orderId: order.id,
    eligibleSubtotal: totalEligibleSubtotal,
    totalCommission: Math.max(100, totalCommission),
    effectiveAverageRate,
    primaryRateSource,
    itemsBreakdown
  };
};

/**
 * Service function triggered upon successful order completion.
 * Checks for stored referral code, computes tiered commission, and logs to the server.
 */
export const processOrderCompletionAffiliation = async (
  order: {
    id: string;
    customerPhone: string;
    customerName?: string;
    totalAmount: number;
    items: {
      productId: string;
      productName: string;
      price: number;
      quantity: number;
      category?: string;
    }[];
  },
  overrideRefCode?: string
): Promise<{
  success: boolean;
  message: string;
  commission?: AffiliateCommission;
  calculation?: TieredCommissionCalculationResult;
}> => {
  const refCode = overrideRefCode || getActiveReferralCode();
  if (!refCode) {
    return { success: false, message: 'Aucun code de parrainage associé à cette commande.' };
  }

  try {
    const res = await fetch('/api/affiliates/order-completed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        orderId: order.id,
        refCode,
        customerPhone: order.customerPhone,
        customerName: order.customerName,
        totalAmount: order.totalAmount,
        items: order.items
      })
    });

    const json = await res.json();
    if (res.ok && json.status === 'success') {
      return {
        success: true,
        message: json.message || 'Commission d’affiliation enregistrée avec succès.',
        commission: json.commission,
        calculation: json.calculation
      };
    }

    return {
      success: false,
      message: json.message || 'Impossible d’enregistrer la commission pour cette commande.'
    };
  } catch (err: any) {
    return {
      success: false,
      message: err?.message || 'Erreur réseau lors de l’attribution de la commission.'
    };
  }
};
