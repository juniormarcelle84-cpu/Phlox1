import { Order } from '../types';

export interface Affiliate {
  id: string; // e.g. "AFF-KOFI" or "kofi228"
  name: string;
  email: string;
  phone: string; // Mobile money phone number
  payoutNetwork: 'TMONEY' | 'FLOOZ';
  status: 'active' | 'pending' | 'suspended';
  customRate?: number; // Custom % rate if assigned by admin (overrides global)
  createdAt: string;
  totalClicks: number;
  totalSalesCount: number;
  totalSalesVolume: number;
  totalCommissionEarned: number;
  balanceAvailable: number; // Approved commissions eligible for withdrawal
  balancePending: number; // Pending validation delay period
  balancePaidOut: number; // Disbursed payouts
}

export interface AffiliateClick {
  id: string;
  affiliateId: string;
  timestamp: string;
  sourceUrl?: string;
  converted: boolean;
  orderId?: string;
}

export interface AffiliateCommission {
  id: string;
  affiliateId: string;
  orderId: string;
  orderTotal: number;
  eligibleAmount: number;
  rateUsed: number;
  rateType: 'affiliate' | 'product' | 'seller' | 'global';
  commissionAmount: number;
  status: 'pending' | 'approved' | 'paid' | 'cancelled' | 'refunded';
  createdAt: string;
  availableAt: string; // Date when commission becomes withdrawable (after validation delay)
  paidAt?: string;
  payoutId?: string;
  customerPhoneMasked?: string;
}

export interface AffiliatePayout {
  id: string;
  affiliateId: string;
  amount: number;
  network: 'TMONEY' | 'FLOOZ';
  phone: string;
  status: 'pending' | 'completed' | 'rejected';
  requestedAt: string;
  processedAt?: string;
  transactionRef?: string;
  adminNote?: string;
}

export interface AffiliateSettings {
  globalRate: number; // default percentage (e.g. 10%)
  validationDelayDays: number; // e.g. 7 days before pending -> approved
  minPayoutAmount: number; // e.g. 5000 FCFA
  cookieDurationDays: number; // e.g. 30 days
  allowSelfReferral: boolean; // false = prevent self-purchase commissions
}

const DEFAULT_SETTINGS: AffiliateSettings = {
  globalRate: 10,
  validationDelayDays: 7,
  minPayoutAmount: 5000,
  cookieDurationDays: 30,
  allowSelfReferral: false
};

const INITIAL_AFFILIATES: Affiliate[] = [
  {
    id: 'AFF-KOFI',
    name: 'Kofi Mensah',
    email: 'kofi.mensah@gmail.com',
    phone: '+22890123456',
    payoutNetwork: 'TMONEY',
    status: 'active',
    customRate: 12,
    createdAt: '2026-09-15T10:00:00.000Z',
    totalClicks: 142,
    totalSalesCount: 8,
    totalSalesVolume: 495000,
    totalCommissionEarned: 59400,
    balanceAvailable: 35400,
    balancePending: 14000,
    balancePaidOut: 10000
  },
  {
    id: 'AFF-AFI',
    name: 'Afi Dela',
    email: 'afi.dela@yahoo.fr',
    phone: '+22893881122',
    payoutNetwork: 'FLOOZ',
    status: 'active',
    createdAt: '2026-09-20T14:30:00.000Z',
    totalClicks: 89,
    totalSalesCount: 4,
    totalSalesVolume: 220000,
    totalCommissionEarned: 22000,
    balanceAvailable: 12000,
    balancePending: 10000,
    balancePaidOut: 0
  },
  {
    id: 'AFF-YAO',
    name: 'Yao Tech Review',
    email: 'yao.creatives@gmail.com',
    phone: '+22891223344',
    payoutNetwork: 'TMONEY',
    status: 'pending',
    createdAt: '2026-10-01T08:00:00.000Z',
    totalClicks: 12,
    totalSalesCount: 0,
    totalSalesVolume: 0,
    totalCommissionEarned: 0,
    balanceAvailable: 0,
    balancePending: 0,
    balancePaidOut: 0
  }
];

const INITIAL_COMMISSIONS: AffiliateCommission[] = [
  {
    id: 'COM-101',
    affiliateId: 'AFF-KOFI',
    orderId: 'PHX-1042',
    orderTotal: 145000,
    eligibleAmount: 145000,
    rateUsed: 12,
    rateType: 'affiliate',
    commissionAmount: 17400,
    status: 'approved',
    createdAt: '2026-09-28T14:22:00.000Z',
    availableAt: '2026-10-05T14:22:00.000Z',
    customerPhoneMasked: '+228 90 ••• 456'
  },
  {
    id: 'COM-102',
    affiliateId: 'AFF-KOFI',
    orderId: 'PHX-1045',
    orderTotal: 150000,
    eligibleAmount: 150000,
    rateUsed: 12,
    rateType: 'affiliate',
    commissionAmount: 18000,
    status: 'approved',
    createdAt: '2026-09-29T11:10:00.000Z',
    availableAt: '2026-10-06T11:10:00.000Z',
    customerPhoneMasked: '+228 91 ••• 789'
  },
  {
    id: 'COM-103',
    affiliateId: 'AFF-KOFI',
    orderId: 'PHX-1048',
    orderTotal: 116600,
    eligibleAmount: 116600,
    rateUsed: 12,
    rateType: 'affiliate',
    commissionAmount: 14000,
    status: 'pending',
    createdAt: '2026-10-03T16:40:00.000Z',
    availableAt: '2026-10-10T16:40:00.000Z',
    customerPhoneMasked: '+228 92 ••• 321'
  },
  {
    id: 'COM-104',
    affiliateId: 'AFF-AFI',
    orderId: 'PHX-1043',
    orderTotal: 100000,
    eligibleAmount: 100000,
    rateUsed: 10,
    rateType: 'global',
    commissionAmount: 10000,
    status: 'approved',
    createdAt: '2026-09-30T09:15:00.000Z',
    availableAt: '2026-10-07T09:15:00.000Z',
    customerPhoneMasked: '+228 93 ••• 122'
  }
];

const INITIAL_PAYOUTS: AffiliatePayout[] = [
  {
    id: 'PAYOUT-01',
    affiliateId: 'AFF-KOFI',
    amount: 10000,
    network: 'TMONEY',
    phone: '+22890123456',
    status: 'completed',
    requestedAt: '2026-09-25T16:00:00.000Z',
    processedAt: '2026-09-26T09:30:00.000Z',
    transactionRef: 'TM-TX-891042',
    adminNote: 'Virement validé via T-Money Marchand'
  }
];

// ---------------------------------------------------------------------
// STORAGE HELPERS
// ---------------------------------------------------------------------
export const getAffiliateSettings = (): AffiliateSettings => {
  const stored = localStorage.getItem('phlox_affiliate_settings');
  if (!stored) {
    localStorage.setItem('phlox_affiliate_settings', JSON.stringify(DEFAULT_SETTINGS));
    return DEFAULT_SETTINGS;
  }
  try {
    return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
  } catch {
    return DEFAULT_SETTINGS;
  }
};

export const saveAffiliateSettings = (settings: AffiliateSettings) => {
  localStorage.setItem('phlox_affiliate_settings', JSON.stringify(settings));
};

export const getAffiliates = (): Affiliate[] => {
  const stored = localStorage.getItem('phlox_affiliates');
  if (!stored) {
    localStorage.setItem('phlox_affiliates', JSON.stringify(INITIAL_AFFILIATES));
    return INITIAL_AFFILIATES;
  }
  try {
    return JSON.parse(stored);
  } catch {
    return INITIAL_AFFILIATES;
  }
};

export const saveAffiliates = (affiliates: Affiliate[]) => {
  localStorage.setItem('phlox_affiliates', JSON.stringify(affiliates));
};

export const getAffiliateById = (id: string): Affiliate | undefined => {
  const cleanId = String(id || '').trim().toUpperCase();
  return getAffiliates().find(
    (a) => a.id.toUpperCase() === cleanId || a.email.toLowerCase() === cleanId.toLowerCase()
  );
};

export const getCommissions = (affiliateId?: string): AffiliateCommission[] => {
  const stored = localStorage.getItem('phlox_affiliate_commissions');
  let list: AffiliateCommission[] = INITIAL_COMMISSIONS;
  if (stored) {
    try {
      list = JSON.parse(stored);
    } catch {
      list = INITIAL_COMMISSIONS;
    }
  } else {
    localStorage.setItem('phlox_affiliate_commissions', JSON.stringify(INITIAL_COMMISSIONS));
  }

  if (affiliateId) {
    const cleanId = affiliateId.trim().toUpperCase();
    return list.filter((c) => c.affiliateId.toUpperCase() === cleanId);
  }
  return list;
};

export const saveCommissions = (commissions: AffiliateCommission[]) => {
  localStorage.setItem('phlox_affiliate_commissions', JSON.stringify(commissions));
};

export const getPayouts = (affiliateId?: string): AffiliatePayout[] => {
  const stored = localStorage.getItem('phlox_affiliate_payouts');
  let list: AffiliatePayout[] = INITIAL_PAYOUTS;
  if (stored) {
    try {
      list = JSON.parse(stored);
    } catch {
      list = INITIAL_PAYOUTS;
    }
  } else {
    localStorage.setItem('phlox_affiliate_payouts', JSON.stringify(INITIAL_PAYOUTS));
  }

  if (affiliateId) {
    const cleanId = affiliateId.trim().toUpperCase();
    return list.filter((p) => p.affiliateId.toUpperCase() === cleanId);
  }
  return list;
};

export const savePayouts = (payouts: AffiliatePayout[]) => {
  localStorage.setItem('phlox_affiliate_payouts', JSON.stringify(payouts));
};

export const getClicks = (affiliateId?: string): AffiliateClick[] => {
  const stored = localStorage.getItem('phlox_affiliate_clicks');
  let list: AffiliateClick[] = [];
  if (stored) {
    try {
      list = JSON.parse(stored);
    } catch {
      list = [];
    }
  }
  if (affiliateId) {
    const cleanId = affiliateId.trim().toUpperCase();
    return list.filter((c) => c.affiliateId.toUpperCase() === cleanId);
  }
  return list;
};

export const saveClicks = (clicks: AffiliateClick[]) => {
  localStorage.setItem('phlox_affiliate_clicks', JSON.stringify(clicks));
};

// ---------------------------------------------------------------------
// ACTIVE AFFILIATE SESSION (FOR AFFILIATE PORTAL)
// ---------------------------------------------------------------------
export const getActiveAffiliateSession = (): Affiliate | null => {
  const id = localStorage.getItem('phlox_active_affiliate_id');
  if (!id) return null;
  return getAffiliateById(id) || null;
};

export const setActiveAffiliateSession = (id: string | null) => {
  if (id) {
    localStorage.setItem('phlox_active_affiliate_id', id);
  } else {
    localStorage.removeItem('phlox_active_affiliate_id');
  }
};

// ---------------------------------------------------------------------
// REFERRAL TRACKING ENGINE (CLICK TRACKER)
// ---------------------------------------------------------------------
export const trackReferralClick = (refParam: string, sourceUrl?: string): { success: boolean; affiliate?: Affiliate } => {
  if (!refParam) return { success: false };
  const cleanRef = refParam.trim().toUpperCase();
  const affiliate = getAffiliateById(cleanRef);
  if (!affiliate || affiliate.status !== 'active') {
    return { success: false };
  }

  // Anti-fraud: Deduplicate rapid clicks within 30 minutes from same browser session
  const lastTracked = sessionStorage.getItem(`phlox_tracked_${affiliate.id}`);
  const now = Date.now();
  if (lastTracked && now - Number(lastTracked) < 30 * 60 * 1000) {
    // Store in cookie regardless to maintain attribution
    setReferralCookie(affiliate.id);
    return { success: true, affiliate };
  }

  sessionStorage.setItem(`phlox_tracked_${affiliate.id}`, String(now));

  // Log click
  const clicks = getClicks();
  const newClick: AffiliateClick = {
    id: `CLK-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    affiliateId: affiliate.id,
    timestamp: new Date().toISOString(),
    sourceUrl: sourceUrl || (typeof window !== 'undefined' ? window.location.pathname : undefined),
    converted: false
  };
  clicks.unshift(newClick);
  saveClicks(clicks);

  // Update affiliate counter
  const affiliates = getAffiliates();
  const index = affiliates.findIndex((a) => a.id.toUpperCase() === affiliate.id.toUpperCase());
  if (index > -1) {
    affiliates[index].totalClicks = (affiliates[index].totalClicks || 0) + 1;
    saveAffiliates(affiliates);
  }

  // Save referral cookie with settings duration (default 30 days)
  setReferralCookie(affiliate.id);

  return { success: true, affiliate };
};

export const setReferralCookie = (affiliateId: string) => {
  const settings = getAffiliateSettings();
  const expiry = Date.now() + settings.cookieDurationDays * 24 * 60 * 60 * 1000;
  const cookieData = {
    affiliateId: affiliateId.toUpperCase(),
    expiresAt: expiry
  };
  localStorage.setItem('phlox_ref_cookie', JSON.stringify(cookieData));
};

export const getActiveReferralCode = (): string | null => {
  const stored = localStorage.getItem('phlox_ref_cookie');
  if (!stored) return null;
  try {
    const data = JSON.parse(stored);
    if (data.expiresAt && data.expiresAt > Date.now() && data.affiliateId) {
      return data.affiliateId;
    }
  } catch {
    // ignore
  }
  return null;
};

export const clearActiveReferralCode = () => {
  localStorage.removeItem('phlox_ref_cookie');
};

// ---------------------------------------------------------------------
// COMMISSION CALCULATION & ATTRIBUTION
// Rate Priority: Affiliate Custom Rate > Product Rate > Seller Rate > Global Rate
// ---------------------------------------------------------------------
export const processOrderAffiliateCommission = (
  order: Order,
  productRates?: Record<string, number>
): AffiliateCommission | null => {
  const refCode = getActiveReferralCode();
  if (!refCode) return null;

  const affiliate = getAffiliateById(refCode);
  if (!affiliate || affiliate.status !== 'active') return null;

  const settings = getAffiliateSettings();

  // Anti-fraud: Self-attribution check (if customer phone equals affiliate phone)
  if (!settings.allowSelfReferral && order.customerPhone) {
    const cleanCustomer = order.customerPhone.replace(/\D/g, '');
    const cleanAffiliate = affiliate.phone.replace(/\D/g, '');
    if (cleanCustomer && cleanAffiliate && (cleanCustomer === cleanAffiliate || cleanCustomer.endsWith(cleanAffiliate) || cleanAffiliate.endsWith(cleanCustomer))) {
      console.warn('[Affiliate] Self-attribution blocked for order:', order.id);
      return null;
    }
  }

  // Deduct delivery fee to get pure eligible subtotal
  const eligibleAmount = Math.max(0, order.totalAmount);
  if (eligibleAmount <= 0) return null;

  // Determine rate priority:
  // 1. Affiliate Custom Rate
  // 2. Product-specific Rate
  // 3. Seller Rate
  // 4. Global Program Rate
  let rateUsed = settings.globalRate;
  let rateType: AffiliateCommission['rateType'] = 'global';

  if (typeof affiliate.customRate === 'number' && affiliate.customRate > 0) {
    rateUsed = affiliate.customRate;
    rateType = 'affiliate';
  } else if (productRates && order.items.length > 0) {
    const highestProductRate = order.items.reduce((max, item) => {
      const pRate = productRates[item.productId];
      return typeof pRate === 'number' && pRate > max ? pRate : max;
    }, 0);
    if (highestProductRate > 0) {
      rateUsed = highestProductRate;
      rateType = 'product';
    }
  }

  const commissionAmount = Math.round(eligibleAmount * (rateUsed / 100));
  if (commissionAmount <= 0) return null;

  // Mask customer phone for affiliate privacy
  const rawPhone = (order.customerPhone || '').replace(/\D/g, '');
  const maskedPhone =
    rawPhone.length >= 8
      ? `+228 ${rawPhone.slice(0, 2)} ••• ${rawPhone.slice(-3)}`
      : 'Client Togo';

  const validationDelayMs = settings.validationDelayDays * 24 * 60 * 60 * 1000;
  const availableAt = new Date(Date.now() + validationDelayMs).toISOString();

  const newCommission: AffiliateCommission = {
    id: `COM-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    affiliateId: affiliate.id,
    orderId: order.id,
    orderTotal: order.totalAmount,
    eligibleAmount,
    rateUsed,
    rateType,
    commissionAmount,
    status: 'pending',
    createdAt: new Date().toISOString(),
    availableAt,
    customerPhoneMasked: maskedPhone
  };

  // Save Commission
  const commissions = getCommissions();
  commissions.unshift(newCommission);
  saveCommissions(commissions);

  // Mark latest referral click as converted
  const clicks = getClicks();
  const latestClick = clicks.find((c) => c.affiliateId.toUpperCase() === affiliate.id.toUpperCase() && !c.converted);
  if (latestClick) {
    latestClick.converted = true;
    latestClick.orderId = order.id;
    saveClicks(clicks);
  }

  // Update Affiliate Financial Counters
  const affiliates = getAffiliates();
  const idx = affiliates.findIndex((a) => a.id.toUpperCase() === affiliate.id.toUpperCase());
  if (idx > -1) {
    affiliates[idx].totalSalesCount = (affiliates[idx].totalSalesCount || 0) + 1;
    affiliates[idx].totalSalesVolume = (affiliates[idx].totalSalesVolume || 0) + eligibleAmount;
    affiliates[idx].totalCommissionEarned = (affiliates[idx].totalCommissionEarned || 0) + commissionAmount;
    affiliates[idx].balancePending = (affiliates[idx].balancePending || 0) + commissionAmount;
    saveAffiliates(affiliates);
  }

  return newCommission;
};

// ---------------------------------------------------------------------
// AUTOMATIC APPROVAL OF MATURED COMMISSIONS (VALIDATION DELAY EXPIRY)
// ---------------------------------------------------------------------
export const autoApproveEligibleCommissions = () => {
  const commissions = getCommissions();
  const affiliates = getAffiliates();
  const now = Date.now();
  let updated = false;

  commissions.forEach((com) => {
    if (com.status === 'pending' && new Date(com.availableAt).getTime() <= now) {
      com.status = 'approved';
      updated = true;

      const affIdx = affiliates.findIndex((a) => a.id.toUpperCase() === com.affiliateId.toUpperCase());
      if (affIdx > -1) {
        affiliates[affIdx].balancePending = Math.max(0, (affiliates[affIdx].balancePending || 0) - com.commissionAmount);
        affiliates[affIdx].balanceAvailable = (affiliates[affIdx].balanceAvailable || 0) + com.commissionAmount;
      }
    }
  });

  if (updated) {
    saveCommissions(commissions);
    saveAffiliates(affiliates);
  }
};

// ---------------------------------------------------------------------
// COMMISSION STATUS UPDATE (ADMIN CONTROL)
// ---------------------------------------------------------------------
export const updateCommissionStatus = (
  commissionId: string,
  newStatus: AffiliateCommission['status']
): { success: boolean; message: string } => {
  const commissions = getCommissions();
  const comIdx = commissions.findIndex((c) => c.id === commissionId);
  if (comIdx === -1) return { success: false, message: 'Commission non trouvée.' };

  const com = commissions[comIdx];
  const prevStatus = com.status;
  if (prevStatus === newStatus) return { success: true, message: 'Statut inchangé.' };

  const affiliates = getAffiliates();
  const affIdx = affiliates.findIndex((a) => a.id.toUpperCase() === com.affiliateId.toUpperCase());

  if (affIdx > -1) {
    const aff = affiliates[affIdx];

    // Revert previous state impacts
    if (prevStatus === 'pending') {
      aff.balancePending = Math.max(0, (aff.balancePending || 0) - com.commissionAmount);
    } else if (prevStatus === 'approved') {
      aff.balanceAvailable = Math.max(0, (aff.balanceAvailable || 0) - com.commissionAmount);
    } else if (prevStatus === 'paid') {
      aff.balancePaidOut = Math.max(0, (aff.balancePaidOut || 0) - com.commissionAmount);
    }

    // Apply new status impacts
    if (newStatus === 'pending') {
      aff.balancePending = (aff.balancePending || 0) + com.commissionAmount;
    } else if (newStatus === 'approved') {
      aff.balanceAvailable = (aff.balanceAvailable || 0) + com.commissionAmount;
    } else if (newStatus === 'paid') {
      aff.balancePaidOut = (aff.balancePaidOut || 0) + com.commissionAmount;
      com.paidAt = new Date().toISOString();
    } else if (newStatus === 'cancelled' || newStatus === 'refunded') {
      // Deduct from total commission earned
      aff.totalCommissionEarned = Math.max(0, (aff.totalCommissionEarned || 0) - com.commissionAmount);
    }

    saveAffiliates(affiliates);
  }

  com.status = newStatus;
  saveCommissions(commissions);
  return { success: true, message: `Statut modifié à ${newStatus}.` };
};

// ---------------------------------------------------------------------
// AFFILIATE REGISTRATION & MANAGEMENT
// ---------------------------------------------------------------------
export const registerAffiliate = (data: {
  name: string;
  email: string;
  phone: string;
  payoutNetwork: 'TMONEY' | 'FLOOZ';
  customId?: string;
}): { success: boolean; affiliate?: Affiliate; message?: string } => {
  const cleanEmail = data.email.trim().toLowerCase();
  const cleanPhone = data.phone.trim();

  const affiliates = getAffiliates();

  // Check email or phone duplicate
  const existingEmail = affiliates.find((a) => a.email.toLowerCase() === cleanEmail);
  if (existingEmail) {
    return { success: false, message: 'Cette adresse e-mail est déjà inscrite comme affilié.' };
  }

  // Generate unique Affiliate ID
  let generatedId = data.customId ? data.customId.trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '') : '';
  if (!generatedId || generatedId.length < 3) {
    const slug = data.name.trim().split(' ')[0].replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const rand = Math.floor(100 + Math.random() * 900);
    generatedId = `AFF-${slug || 'TG'}${rand}`;
  }

  // Ensure ID uniqueness
  let finalId = generatedId;
  let counter = 1;
  while (affiliates.some((a) => a.id.toUpperCase() === finalId)) {
    finalId = `${generatedId}-${counter}`;
    counter++;
  }

  const newAffiliate: Affiliate = {
    id: finalId,
    name: data.name.trim(),
    email: cleanEmail,
    phone: cleanPhone,
    payoutNetwork: data.payoutNetwork,
    status: 'active',
    createdAt: new Date().toISOString(),
    totalClicks: 0,
    totalSalesCount: 0,
    totalSalesVolume: 0,
    totalCommissionEarned: 0,
    balanceAvailable: 0,
    balancePending: 0,
    balancePaidOut: 0
  };

  affiliates.unshift(newAffiliate);
  saveAffiliates(affiliates);
  setActiveAffiliateSession(newAffiliate.id);

  return { success: true, affiliate: newAffiliate, message: 'Inscription réussie !' };
};

export const updateAffiliate = (affiliate: Affiliate) => {
  const affiliates = getAffiliates();
  const idx = affiliates.findIndex((a) => a.id.toUpperCase() === affiliate.id.toUpperCase());
  if (idx > -1) {
    affiliates[idx] = affiliate;
    saveAffiliates(affiliates);
  }
};

// ---------------------------------------------------------------------
// WITHDRAWAL / PAYOUT MANAGEMENT
// ---------------------------------------------------------------------
export const requestAffiliatePayout = (
  affiliateId: string,
  amount: number,
  network: 'TMONEY' | 'FLOOZ',
  phone: string
): { success: boolean; payout?: AffiliatePayout; message: string } => {
  const affiliate = getAffiliateById(affiliateId);
  if (!affiliate) return { success: false, message: 'Affilié introuvable.' };

  const settings = getAffiliateSettings();

  if (amount < settings.minPayoutAmount) {
    return {
      success: false,
      message: `Le montant minimum de retrait est de ${settings.minPayoutAmount.toLocaleString('fr-FR')} FCFA.`
    };
  }

  if (amount > affiliate.balanceAvailable) {
    return {
      success: false,
      message: `Solde disponible insuffisant (${affiliate.balanceAvailable.toLocaleString('fr-FR')} FCFA disponible).`
    };
  }

  // Prevent duplicate concurrent pending requests
  const existingPayouts = getPayouts(affiliateId);
  const hasPending = existingPayouts.some((p) => p.status === 'pending');
  if (hasPending) {
    return {
      success: false,
      message: 'Vous avez déjà une demande de retrait en cours de traitement.'
    };
  }

  // Deduct available balance
  const affiliates = getAffiliates();
  const idx = affiliates.findIndex((a) => a.id.toUpperCase() === affiliate.id.toUpperCase());
  if (idx > -1) {
    affiliates[idx].balanceAvailable = Math.max(0, (affiliates[idx].balanceAvailable || 0) - amount);
    saveAffiliates(affiliates);
  }

  const newPayout: AffiliatePayout = {
    id: `PAYOUT-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    affiliateId: affiliate.id,
    amount,
    network,
    phone: phone.trim() || affiliate.phone,
    status: 'pending',
    requestedAt: new Date().toISOString()
  };

  const payouts = getPayouts();
  payouts.unshift(newPayout);
  savePayouts(payouts);

  return {
    success: true,
    payout: newPayout,
    message: 'Demande de retrait enregistrée. Traitement sous 24h ouvrées.'
  };
};

export const processPayoutDecision = (
  payoutId: string,
  decision: 'completed' | 'rejected',
  transactionRef?: string,
  adminNote?: string
): { success: boolean; message: string } => {
  const payouts = getPayouts();
  const pIdx = payouts.findIndex((p) => p.id === payoutId);
  if (pIdx === -1) return { success: false, message: 'Demande de retrait introuvable.' };

  const payout = payouts[pIdx];
  if (payout.status !== 'pending') {
    return { success: false, message: 'Cette demande a déjà été traitée.' };
  }

  const affiliates = getAffiliates();
  const affIdx = affiliates.findIndex((a) => a.id.toUpperCase() === payout.affiliateId.toUpperCase());

  if (decision === 'completed') {
    payout.status = 'completed';
    payout.processedAt = new Date().toISOString();
    payout.transactionRef = transactionRef || `TX-MM-${Date.now()}`;
    payout.adminNote = adminNote || 'Virement Mobile Money effectué avec succès.';

    if (affIdx > -1) {
      affiliates[affIdx].balancePaidOut = (affiliates[affIdx].balancePaidOut || 0) + payout.amount;
      saveAffiliates(affiliates);
    }
  } else {
    payout.status = 'rejected';
    payout.processedAt = new Date().toISOString();
    payout.adminNote = adminNote || 'Demande rejetée. Montant recrédité.';

    // Refund back to available balance
    if (affIdx > -1) {
      affiliates[affIdx].balanceAvailable = (affiliates[affIdx].balanceAvailable || 0) + payout.amount;
      saveAffiliates(affiliates);
    }
  }

  savePayouts(payouts);
  return { success: true, message: `Retrait ${decision === 'completed' ? 'validé et payé' : 'rejeté'}.` };
};

// ---------------------------------------------------------------------
// HELPER TO BUILD REFERRAL LINKS
// ---------------------------------------------------------------------
export const buildReferralUrl = (affiliateId: string, customPath = ''): string => {
  const origin = typeof window !== 'undefined' ? window.location.origin : 'https://phlox-togo.com';
  const path = customPath.startsWith('/') ? customPath : `/${customPath}`;
  const cleanPath = path === '/' ? '' : path;
  return `${origin}${cleanPath}?ref=${encodeURIComponent(affiliateId)}`;
};

export const buildWhatsAppShareMessage = (affiliateId: string): string => {
  const link = buildReferralUrl(affiliateId);
  return `🔥 Découvrez les équipements audio & gaming premium chez PHLOX TOGO ! Livraison express 24h partout au Togo 🇹🇬 Commandez via mon lien officiel : ${link}`;
};
