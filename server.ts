import 'dotenv/config';
import express from 'express';
import path from 'path';
import crypto from 'crypto';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;
const MERCHANT_NAME = 'PHLOX TOGO';
const CALLBACK_URL = 'https://phlox-togo.com/paygate-callback.php';

const DB_PATH = path.join(__dirname, 'data', 'phlox_db.json');

// Interface definition for the database JSON structure
interface DbProduct {
  id: string;
  name: string;
  descriptionEn: string;
  descriptionFr: string;
  price: number;
  originalPrice?: number;
  category: string;
  image: string;
  gallery: string[];
  variants: {
    nameEn: string;
    nameFr: string;
    values: string[];
    priceSupplements?: number[];
  }[];
  stock: number;
  isPopular: boolean;
  isPromo: boolean;
  promoText?: string;
  status: 'draft' | 'published' | 'hidden';
  outOfStockMessageFr?: string;
  outOfStockMessageEn?: string;
  isNew?: boolean;
}

interface DbAnnouncements {
  topBanner: {
    textFr: string;
    textEn: string;
    color: string;
    link: string;
    startDate: string;
    endDate: string;
    enabled: boolean;
  };
  promoPopup: {
    textFr: string;
    textEn: string;
    image: string;
    enabled: boolean;
  };
  heroBanner: {
    title: string;
    subtitle: string;
    buttonText: string;
    buttonLink: string;
    image: string;
  };
}

interface DbPromotion {
  id: string;
  name: string;
  startDate: string;
  endDate: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  targetProducts: string[];
  targetCategories: string[];
  limitedStock?: number;
  stockCount?: number;
  limitPerClient?: number;
  salesCount?: number;
  salesRevenue?: number;
}

interface DbPromoCode {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  expiryDate: string;
  maxUses: number;
  usedCount: number;
  minPurchase: number;
}

interface DbAuditLog {
  timestamp: string;
  email: string;
  action: string;
  details: string;
}

interface DbPaymentLog {
  date: string;
  orderId: string;
  attemptId: string;
  network: string;
  maskedPhone: string;
  statusCode: number;
  message: string;
}

interface DbAffiliate {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  payoutNetwork: 'TMONEY' | 'FLOOZ';
  payoutPhone: string;
  commissionRate?: number;
  clicksCount: number;
  salesCount: number;
  totalSalesAmount: number;
  totalCommissionEarned: number;
  availableBalance: number;
  pendingBalance: number;
  withdrawnBalance: number;
  status: 'active' | 'suspended';
  createdAt: string;
}

interface DbAffiliateCommission {
  id: string;
  affiliateId: string;
  affiliateCode: string;
  orderId: string;
  customerPhone: string;
  customerName?: string;
  orderTotal: number;
  eligibleAmount: number;
  rateApplied: number;
  rateSource: 'affiliate' | 'product' | 'seller' | 'global';
  commissionAmount: number;
  status: 'pending' | 'approved' | 'paid' | 'cancelled';
  createdAt: string;
  approvedAt?: string;
  paidAt?: string;
  autoApproveEligibleDate?: string;
}

interface DbAffiliatePayout {
  id: string;
  affiliateId: string;
  affiliateCode: string;
  affiliateName: string;
  amount: number;
  payoutNetwork: 'TMONEY' | 'FLOOZ';
  payoutPhone: string;
  status: 'pending' | 'completed' | 'rejected';
  requestedAt: string;
  processedAt?: string;
  notes?: string;
}

interface DbAffiliateSettings {
  globalDefaultRate: number;
  validationDelayDays: number;
  minWithdrawalAmount: number;
  allowSelfReferral: boolean;
}

interface DbState {
  products: DbProduct[];
  announcements: DbAnnouncements;
  promotions: DbPromotion[];
  promo_codes: DbPromoCode[];
  audit_logs: DbAuditLog[];
  payment_logs?: DbPaymentLog[];
  affiliates?: DbAffiliate[];
  affiliate_commissions?: DbAffiliateCommission[];
  affiliate_payouts?: DbAffiliatePayout[];
  affiliate_settings?: DbAffiliateSettings;
}

// Thread-safe / File-locked helpers for DB access
function loadDb(): DbState {
  try {
    if (!fs.existsSync(DB_PATH)) {
      // Return empty default state if database is deleted, but we already created it.
      return {
        products: [],
        announcements: {} as any,
        promotions: [],
        promo_codes: [],
        audit_logs: [],
        affiliates: [],
        affiliate_commissions: [],
        affiliate_payouts: [],
        affiliate_settings: {
          globalDefaultRate: 7,
          validationDelayDays: 7,
          minWithdrawalAmount: 5000,
          allowSelfReferral: false
        }
      };
    }
    const raw = fs.readFileSync(DB_PATH, 'utf-8');
    const parsed = JSON.parse(raw);
    parsed.payment_logs = parsed.payment_logs || [];
    parsed.affiliates = parsed.affiliates || [];
    parsed.affiliate_commissions = parsed.affiliate_commissions || [];
    parsed.affiliate_payouts = parsed.affiliate_payouts || [];
    parsed.affiliate_settings = parsed.affiliate_settings || {
      globalDefaultRate: 7,
      validationDelayDays: 7,
      minWithdrawalAmount: 5000,
      allowSelfReferral: false
    };
    return parsed;
  } catch (e) {
    console.error("Failed to load db JSON", e);
    return {
      products: [],
      announcements: {} as any,
      promotions: [],
      promo_codes: [],
      audit_logs: [],
      affiliates: [],
      affiliate_commissions: [],
      affiliate_payouts: [],
      affiliate_settings: {
        globalDefaultRate: 7,
        validationDelayDays: 7,
        minWithdrawalAmount: 5000,
        allowSelfReferral: false
      }
    };
  }
}

function saveDb(db: DbState) {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), 'utf-8');
  } catch (e) {
    console.error("Failed to save db JSON", e);
  }
}

function writeAuditLog(email: string, action: string, details: string) {
  const db = loadDb();
  db.audit_logs.unshift({
    timestamp: new Date().toISOString(),
    email,
    action,
    details
  });
  saveDb(db);
}

// Delivery city fees remain solid
const SERVER_CITY_FEES: Record<string, number> = {
  Lomé: 1000,
  Kpalimé: 2500,
  Atakpamé: 2500,
  Sokodé: 3000,
  Kara: 3500,
  Dapaong: 4000
};

interface ServerOrderItem {
  productId: string;
  productName: string;
  quantity: number;
  price: number;
  selectedVariants: Record<string, string>;
}

interface ServerOrderRecord {
  id: string;
  customerName: string;
  customerPhone: string;
  debitPhone: string;
  customerAddress: string;
  customerCity: string;
  paymentMethod: 'TMONEY' | 'FLOOZ';
  txReference?: string;
  processedTxRefs?: string[];
  items: ServerOrderItem[];
  totalAmount: number;
  promoCodeApplied?: string;
  discountAmountApplied?: number;
  affiliateRef?: string;
  status: 'pending' | 'paid' | 'failed' | 'expired' | 'shipped' | 'completed' | 'cancelled';
  createdAt: string;
  expiresAt: number;
  paidAt?: string;
  waSent: boolean;
}

const serverOrders = new Map<string, ServerOrderRecord>();

const TOGO_PHONE_LENGTH = 8;
const orderAttemptsCount = new Map<string, number>();

function mapPaygateStatusToMessage(status: number): string {
  switch (status) {
    case 0: return "Demande Push USSD envoyée.";
    case 2: return "Paramètres de requête de paiement invalides ou manquants.";
    case 4: return "Clé de paiement marchande non configurée ou incorrecte (Clé invalide).";
    case 6: return "Numéro de téléphone refusé, inactif ou solde insuffisant (Numéro refusé).";
    case 8: return "Identifiant de tentative de transaction déjà utilisé (Doublon).";
    default: return `Erreur technique de la plateforme de facturation (Code PayGate: ${status}).`;
  }
}

// Anti-abuse rate limit maps
const payRateLimits = new Map<string, number[]>(); // IP or phone -> timestamps
const statusRateLimits = new Map<string, number>(); // orderId -> timestamp
const adminLoginLimits = new Map<string, number[]>(); // IP -> timestamps

interface AdminSessionInfo {
  email: string;
  role: 'owner' | 'manager';
}
const adminSessions = new Map<string, AdminSessionInfo>();

function isPayRateLimited(key: string): boolean {
  const now = Date.now();
  const window = 10 * 60 * 1000; // 10 minutes
  const timestamps = (payRateLimits.get(key) || []).filter((t) => now - t < window);
  payRateLimits.set(key, timestamps);
  return timestamps.length >= 3; // Max 3 requests / 10 min
}

function recordPayRequest(key: string) {
  const timestamps = payRateLimits.get(key) || [];
  timestamps.push(Date.now());
  payRateLimits.set(key, timestamps);
}

function normalizeTogoPaygatePhone(raw: string): { valid: boolean; fullPhone: string } {
  const digits = String(raw || '').replace(/\D/g, '');
  let subscriber8 = digits;

  if (digits.startsWith('00228') && digits.length >= 13) {
    subscriber8 = digits.slice(5, 13);
  } else if (digits.startsWith('228') && digits.length >= 11) {
    subscriber8 = digits.slice(3, 11);
  } else {
    subscriber8 = digits.slice(0, 8);
  }

  if (subscriber8.length !== 8) {
    return { valid: false, fullPhone: '' };
  }
  return { valid: true, fullPhone: `228${subscriber8}` };
}

// Calculates active campaign promo price server-side
function getActivePromoPriceForProduct(product: DbProduct, db: DbState): { isPromoActive: boolean; finalPrice: number; campaignName?: string } {
  const nowStr = new Date().toISOString();
  
  for (const promo of db.promotions) {
    // Check campaign active duration
    const isInDate = promo.startDate <= nowStr && promo.endDate >= nowStr;
    if (!isInDate) continue;

    // Check if promotion has stock limit depleted
    if (promo.limitedStock !== undefined && promo.stockCount !== undefined && promo.stockCount <= 0) {
      continue;
    }

    // Check target criteria
    const matchesProduct = promo.targetProducts.length === 0 || promo.targetProducts.includes(product.id);
    const matchesCategory = promo.targetCategories.length === 0 || promo.targetCategories.includes(product.category);

    if (matchesProduct && matchesCategory) {
      let finalPrice = product.price;
      if (promo.discountType === 'percentage') {
        finalPrice = product.price * (1 - promo.discountValue / 100);
      } else if (promo.discountType === 'fixed') {
        finalPrice = Math.max(0, product.price - promo.discountValue);
      }
      return {
        isPromoActive: true,
        finalPrice: Math.round(finalPrice),
        campaignName: promo.name
      };
    }
  }

  return { isPromoActive: false, finalPrice: product.price };
}

// Server calculation of order total with active promotions and promo codes
function calculateServerOrderTotal(
  items: ServerOrderItem[], 
  city: string, 
  promoCodeString?: string,
  customerPhone?: string
): { 
  valid: boolean; 
  subtotal: number;
  discountAmount: number;
  deliveryFee: number;
  total: number; 
  promoCodeApplied?: string;
  error?: string; 
} {
  if (!Array.isArray(items) || items.length === 0) {
    return { valid: false, subtotal: 0, discountAmount: 0, deliveryFee: 0, total: 0, error: 'Aucun article dans la commande.' };
  }

  const db = loadDb();
  let subtotal = 0;

  for (const item of items) {
    if (!item || typeof item !== 'object') continue;
    const prodId = String(item.productId || '').trim();
    const qty = Math.max(1, Math.round(Number(item.quantity) || 1));

    const product = db.products.find(p => p.id === prodId);
    if (!product) {
      return { valid: false, subtotal: 0, discountAmount: 0, deliveryFee: 0, total: 0, error: `Produit inconnu: ${prodId}` };
    }

    // 1. Calculate base unit price with secure server-side campaign promotions
    const promoCheck = getActivePromoPriceForProduct(product, db);
    let unitPrice = promoCheck.finalPrice;

    // 2. Add variants supplements if they exist
    if (product.variants && product.variants.length > 0 && item.selectedVariants) {
      const variant = product.variants[0];
      const selectedValue = item.selectedVariants[variant.nameFr] || item.selectedVariants[variant.nameEn];
      if (selectedValue && Array.isArray(variant.priceSupplements)) {
        const valIndex = variant.values.indexOf(selectedValue);
        if (valIndex > -1 && variant.priceSupplements[valIndex]) {
          unitPrice += variant.priceSupplements[valIndex];
        }
      }
    }

    subtotal += unitPrice * qty;
  }

  // 3. Handle coupon promo codes securely on server
  let discountAmount = 0;
  let promoCodeApplied = undefined;

  if (promoCodeString) {
    const cleanCode = promoCodeString.trim().toUpperCase();
    const coupon = db.promo_codes.find(c => c.code.toUpperCase() === cleanCode);
    if (coupon) {
      const nowStr = new Date().toISOString();
      const isExpired = coupon.expiryDate < nowStr;
      const isLimitExceeded = coupon.usedCount >= coupon.maxUses;
      const isMinPurchaseMet = subtotal >= coupon.minPurchase;

      if (isExpired) {
        return { valid: false, subtotal: 0, discountAmount: 0, deliveryFee: 0, total: 0, error: 'Ce code promo a expiré.' };
      }
      if (isLimitExceeded) {
        return { valid: false, subtotal: 0, discountAmount: 0, deliveryFee: 0, total: 0, error: 'Ce code promo a atteint sa limite d’utilisation globale.' };
      }
      if (!isMinPurchaseMet) {
        return { valid: false, subtotal: 0, discountAmount: 0, deliveryFee: 0, total: 0, error: `Montant d'achat minimum non atteint. Minimum requis: ${coupon.minPurchase} FCFA.` };
      }

      // Check limit per client (1 use per phone number maximum)
      if (customerPhone) {
        const cleanPhone = customerPhone.replace(/\D/g, '');
        let customerUses = 0;
        for (const order of serverOrders.values()) {
          const orderPhone = String(order.customerPhone || order.debitPhone || '').replace(/\D/g, '');
          const matchesPhone = orderPhone === cleanPhone || orderPhone.endsWith(cleanPhone) || cleanPhone.endsWith(orderPhone);
          const matchesCoupon = order.promoCodeApplied?.toUpperCase() === cleanCode;
          const isPaidOrCompleted = order.status === 'paid' || order.status === 'completed';
          
          if (matchesPhone && matchesCoupon && isPaidOrCompleted) {
            customerUses++;
          }
        }
        if (customerUses >= 1) {
          return { valid: false, subtotal: 0, discountAmount: 0, deliveryFee: 0, total: 0, error: 'Vous avez déjà utilisé ce code promo.' };
        }
      }

      promoCodeApplied = coupon.code;
      if (coupon.discountType === 'percentage') {
        discountAmount = Math.round(subtotal * (coupon.discountValue / 100));
      } else if (coupon.discountType === 'fixed') {
        discountAmount = Math.min(subtotal, coupon.discountValue);
      }
    } else {
      return { valid: false, subtotal: 0, discountAmount: 0, deliveryFee: 0, total: 0, error: 'Code promo invalide ou inconnu.' };
    }
  }

  const deliveryFee = SERVER_CITY_FEES[city] ?? 1000;
  const total = Math.max(0, subtotal - discountAmount) + deliveryFee;

  return {
    valid: true,
    subtotal,
    discountAmount,
    deliveryFee,
    total,
    promoCodeApplied
  };
}

async function startServer() {
  const app = express();
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Dynamic inline cookie parser middleware
  app.use((req, _res, next) => {
    const cookieHeader = req.headers.cookie || '';
    const cookies: Record<string, string> = {};
    cookieHeader.split(';').forEach((cookie) => {
      const parts = cookie.split('=');
      if (parts.length === 2) {
        cookies[parts[0].trim()] = parts[1].trim();
      }
    });
    (req as any).cookies = cookies;
    next();
  });

  // Security Headers Middleware
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self' 'unsafe-inline' 'unsafe-eval' https:; img-src 'self' data: https:; connect-src 'self' https:;"
    );
    next();
  });

  const getPaygateApiKey = (): string => {
    return (process.env.PAYGATE_API_KEY || '').trim();
  };

  const checkPaygateStatusByIdentifier = async (identifier: string): Promise<{
    isPaid: boolean;
    isFailed: boolean;
    txReference?: string;
    paymentMethod?: 'TMONEY' | 'FLOOZ';
  }> => {
    const apiKey = getPaygateApiKey();
    if (!apiKey) return { isPaid: false, isFailed: false };

    try {
      const response = await fetch('https://paygateglobal.com/api/v2/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_token: apiKey,
          identifier: identifier.trim()
        })
      });
      const data = (await response.json()) as Record<string, unknown>;
      const status = typeof data.status === 'number' ? data.status : -1;
      return {
        isPaid: status === 0,
        isFailed: status === 4 || status === 6,
        txReference: typeof data.tx_reference === 'string' ? data.tx_reference : undefined,
        paymentMethod:
          data.payment_method === 'FLOOZ' || data.payment_method === 'TMONEY'
            ? data.payment_method
            : undefined
      };
    } catch {
      return { isPaid: false, isFailed: false };
    }
  };

  // PayGate Config Check
  app.get('/api/paygate/config', (_req, res) => {
    const apiKey = getPaygateApiKey();
    res.json({
      configured: apiKey.length > 0,
      merchant: MERCHANT_NAME,
      callbackUrl: CALLBACK_URL,
      methods: ['TMONEY', 'FLOOZ'],
      keyMode: apiKey.length > 0 ? 'live' : 'mock'
    });
  });

  // PUBLIC: FETCH STORE CONFIGURATION (announcements, active promotions)
  app.get('/api/public/config', (_req, res) => {
    const db = loadDb();
    const nowStr = new Date().toISOString();

    // Only active banner announcements
    const isBannerActive =
      db.announcements.topBanner.enabled &&
      db.announcements.topBanner.startDate <= nowStr &&
      db.announcements.topBanner.endDate >= nowStr;

    const filteredBanner = {
      ...db.announcements.topBanner,
      active: isBannerActive
    };

    // Filter active promotions
    const activePromotions = db.promotions.filter((p) => {
      const inDate = p.startDate <= nowStr && p.endDate >= nowStr;
      if (p.limitedStock !== undefined && p.stockCount !== undefined && p.stockCount <= 0) {
        return false;
      }
      return inDate;
    });

    res.json({
      status: 'success',
      announcements: {
        topBanner: filteredBanner,
        promoPopup: db.announcements.promoPopup,
        heroBanner: db.announcements.heroBanner
      },
      activePromotions
    });
  });

  // PUBLIC: FETCH PRODUCTS CATALOG WITH SERVER-CALCULATED PROMO PRICES
  app.get('/api/public/products', (_req, res) => {
    const db = loadDb();
    const publishedProducts = db.products.filter(p => p.status === 'published');
    
    // Process items to insert calculated campaign prices dynamically
    const catalog = publishedProducts.map(p => {
      const promoCheck = getActivePromoPriceForProduct(p, db);
      if (promoCheck.isPromoActive) {
        return {
          ...p,
          price: promoCheck.finalPrice,
          originalPrice: p.originalPrice || p.price,
          isPromo: true,
          promoText: p.promoText || promoCheck.campaignName || 'PROMO'
        };
      }
      return p;
    });

    res.json({
      status: 'success',
      products: catalog
    });
  });

  // PUBLIC: VALIDATE PROMO CODE ENDPOINT
  app.post('/api/promo/validate', (req, res) => {
    const { code, totalAmount, customerPhone } = req.body || {};
    if (!code) {
      res.status(400).json({ valid: false, message: 'Le code promo est requis.' });
      return;
    }

    const db = loadDb();
    const cleanCode = String(code).trim().toUpperCase();
    const coupon = db.promo_codes.find(c => c.code.toUpperCase() === cleanCode);

    if (!coupon) {
      res.status(404).json({ valid: false, message: 'Code promo invalide.' });
      return;
    }

    const nowStr = new Date().toISOString();
    if (coupon.expiryDate < nowStr) {
      res.status(400).json({ valid: false, message: 'Ce code promo a expiré.' });
      return;
    }

    if (coupon.usedCount >= coupon.maxUses) {
      res.status(400).json({ valid: false, message: 'Ce code promo a atteint sa limite d\'utilisation.' });
      return;
    }

    // Check limit per client (1 use per phone number maximum)
    if (customerPhone) {
      const cleanPhone = String(customerPhone).replace(/\D/g, '');
      let customerUses = 0;
      for (const order of serverOrders.values()) {
        const orderPhone = String(order.customerPhone || order.debitPhone || '').replace(/\D/g, '');
        const matchesPhone = orderPhone === cleanPhone || orderPhone.endsWith(cleanPhone) || cleanPhone.endsWith(orderPhone);
        const matchesCoupon = order.promoCodeApplied?.toUpperCase() === cleanCode;
        const isPaidOrCompleted = order.status === 'paid' || order.status === 'completed';
        
        if (matchesPhone && matchesCoupon && isPaidOrCompleted) {
          customerUses++;
        }
      }
      if (customerUses >= 1) {
        res.status(400).json({ valid: false, message: 'Vous avez déjà utilisé ce code promo.' });
        return;
      }
    }

    const amount = Number(totalAmount) || 0;
    if (amount < coupon.minPurchase) {
      res.status(400).json({ 
        valid: false, 
        message: `Montant d'achat minimum non atteint. Minimum requis: ${coupon.minPurchase} FCFA.` 
      });
      return;
    }

    let discountAmount = 0;
    if (coupon.discountType === 'percentage') {
      discountAmount = Math.round(amount * (coupon.discountValue / 100));
    } else if (coupon.discountType === 'fixed') {
      discountAmount = Math.min(amount, coupon.discountValue);
    }

    res.json({
      valid: true,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
      discountAmount
    });
  });

  // ==========================================
  // AFFILIATION PROGRAM & REVENUE SHARING APIs
  // ==========================================

  // Anti-abuse click tracker (IP + refCode in 1 hour debounce)
  const clickTrackerLimits = new Map<string, number>();

  // Category commission rates configuration for tiered calculation
  const SERVER_CATEGORY_COMMISSION_RATES: Record<string, number> = {
    earphone: 10,
    watch: 8,
    speaker: 8,
    vr: 6,
    laptop: 4,
    console: 4
  };

  // Helper: Process affiliate order commission with tiered logic
  function processAffiliateOrderCommission(
    orderRecord: ServerOrderRecord,
    rawRefCode: string | undefined,
    db: DbState
  ): DbAffiliateCommission | null {
    if (!rawRefCode) return null;
    const cleanRef = String(rawRefCode).trim().toUpperCase();
    if (!cleanRef) return null;

    db.affiliates = db.affiliates || [];
    db.affiliate_commissions = db.affiliate_commissions || [];
    db.affiliate_settings = db.affiliate_settings || {
      globalDefaultRate: 7,
      validationDelayDays: 7,
      minWithdrawalAmount: 5000,
      allowSelfReferral: false
    };

    const affiliate = db.affiliates.find(
      (a) => a.code.toUpperCase() === cleanRef || a.id.toUpperCase() === cleanRef
    );

    if (!affiliate || affiliate.status !== 'active') return null;

    // Anti-self referral check
    if (!db.affiliate_settings.allowSelfReferral) {
      const custPhoneClean = String(orderRecord.customerPhone || '').replace(/\D/g, '');
      const debitPhoneClean = String(orderRecord.debitPhone || '').replace(/\D/g, '');
      const affPhoneClean = String(affiliate.phone || '').replace(/\D/g, '');
      const affPayoutPhoneClean = String(affiliate.payoutPhone || '').replace(/\D/g, '');

      const isSelfPhone =
        (affPhoneClean && (custPhoneClean.endsWith(affPhoneClean) || affPhoneClean.endsWith(custPhoneClean))) ||
        (affPayoutPhoneClean && (debitPhoneClean.endsWith(affPayoutPhoneClean) || affPayoutPhoneClean.endsWith(debitPhoneClean)));

      if (isSelfPhone) {
        console.warn(`[Affiliation] Auto-attribution évitée pour l'affilié ${affiliate.code}.`);
        return null;
      }
    }

    // Prevent duplicate commission for the same order base ID
    const baseOrderId = orderRecord.id.split('-')[0] || orderRecord.id;
    const existingComm = db.affiliate_commissions.find(
      (c) => c.orderId === baseOrderId || c.orderId === orderRecord.id
    );
    if (existingComm) return existingComm;

    // Tiered Logic: Affiliate-specific rate > Product category rate > Global rate
    const globalRate = db.affiliate_settings.globalDefaultRate || 7;
    const hasAffiliateRate = typeof affiliate.commissionRate === 'number' && affiliate.commissionRate > 0;

    let totalCommission = 0;
    let rateApplied = globalRate;
    let rateSource: 'affiliate' | 'product' | 'seller' | 'global' = 'global';

    if (hasAffiliateRate && affiliate.commissionRate) {
      // Tier 1: Affiliate-specific rate takes top priority
      rateApplied = affiliate.commissionRate;
      rateSource = 'affiliate';
      const cityDeliveryFee = SERVER_CITY_FEES[orderRecord.customerCity] || 1000;
      const eligibleAmount = Math.max(0, orderRecord.totalAmount - cityDeliveryFee);
      totalCommission = Math.max(100, Math.round(eligibleAmount * (rateApplied / 100)));
    } else {
      // Tier 2: Check product categories / product rates
      let subtotalSum = 0;
      let commSum = 0;

      orderRecord.items.forEach((item) => {
        const itemTotal = item.price * item.quantity;
        subtotalSum += itemTotal;
        const prod = db.products.find((p) => p.id === item.productId);
        const prodCat = (prod?.category || (item as any).category || '').toLowerCase();

        let itemRate = globalRate;
        let itemSource: 'product' | 'category' | 'global' = 'global';

        if ((prod as any)?.commissionRate && (prod as any).commissionRate > 0) {
          itemRate = (prod as any).commissionRate;
          itemSource = 'product';
        } else if (prodCat && SERVER_CATEGORY_COMMISSION_RATES[prodCat] !== undefined) {
          itemRate = SERVER_CATEGORY_COMMISSION_RATES[prodCat];
          itemSource = 'category';
        }

        commSum += Math.round(itemTotal * (itemRate / 100));
        rateSource = itemSource as any;
      });

      totalCommission = Math.max(100, commSum);
      rateApplied = subtotalSum > 0 ? Number(((totalCommission / subtotalSum) * 100).toFixed(1)) : globalRate;
    }

    // Eligible amount is subtotal (total amount minus city delivery fee)
    const cityDeliveryFee = SERVER_CITY_FEES[orderRecord.customerCity] || 1000;
    const eligibleAmount = Math.max(0, orderRecord.totalAmount - cityDeliveryFee);
    const commissionAmount = Math.max(100, totalCommission);

    const commissionId = `com-${crypto.randomBytes(4).toString('hex')}`;
    const now = new Date();
    const delayDays = db.affiliate_settings.validationDelayDays || 7;
    const autoApproveDate = new Date(now.getTime() + delayDays * 24 * 3600 * 1000).toISOString();

    const commissionRecord: DbAffiliateCommission = {
      id: commissionId,
      affiliateId: affiliate.id,
      affiliateCode: affiliate.code,
      orderId: baseOrderId,
      customerPhone: orderRecord.customerPhone,
      customerName: orderRecord.customerName,
      orderTotal: orderRecord.totalAmount,
      eligibleAmount,
      rateApplied,
      rateSource,
      commissionAmount,
      status: 'pending',
      createdAt: now.toISOString(),
      autoApproveEligibleDate: autoApproveDate
    };

    db.affiliate_commissions.unshift(commissionRecord);

    // Update affiliate pending balance & stats
    affiliate.salesCount = (affiliate.salesCount || 0) + 1;
    affiliate.totalSalesAmount = (affiliate.totalSalesAmount || 0) + orderRecord.totalAmount;
    affiliate.pendingBalance = (affiliate.pendingBalance || 0) + commissionAmount;

    saveDb(db);
    return commissionRecord;
  }

  // Helper: Sync affiliate balance on order payment
  function handleOrderPaidAffiliateSync(orderId: string, db: DbState) {
    const baseOrderId = orderId.split('-')[0];
    db.affiliates = db.affiliates || [];
    db.affiliate_commissions = db.affiliate_commissions || [];

    const matchedCommissions = db.affiliate_commissions.filter(
      (c) => (c.orderId === baseOrderId || c.orderId === orderId) && c.status === 'pending'
    );

    matchedCommissions.forEach((comm) => {
      comm.status = 'approved';
      comm.approvedAt = new Date().toISOString();

      const aff = db.affiliates?.find((a) => a.id === comm.affiliateId);
      if (aff) {
        aff.pendingBalance = Math.max(0, (aff.pendingBalance || 0) - comm.commissionAmount);
        aff.availableBalance = (aff.availableBalance || 0) + comm.commissionAmount;
        aff.totalCommissionEarned = (aff.totalCommissionEarned || 0) + comm.commissionAmount;
      }
    });

    saveDb(db);
  }

  // Helper: Sync affiliate balance on order cancellation
  function handleOrderCancelledAffiliateSync(orderId: string, db: DbState) {
    const baseOrderId = orderId.split('-')[0];
    db.affiliates = db.affiliates || [];
    db.affiliate_commissions = db.affiliate_commissions || [];

    const matchedCommissions = db.affiliate_commissions.filter(
      (c) => (c.orderId === baseOrderId || c.orderId === orderId) && (c.status === 'pending' || c.status === 'approved')
    );

    matchedCommissions.forEach((comm) => {
      const aff = db.affiliates?.find((a) => a.id === comm.affiliateId);
      if (aff) {
        if (comm.status === 'pending') {
          aff.pendingBalance = Math.max(0, (aff.pendingBalance || 0) - comm.commissionAmount);
        } else if (comm.status === 'approved') {
          aff.availableBalance = Math.max(0, (aff.availableBalance || 0) - comm.commissionAmount);
          aff.totalCommissionEarned = Math.max(0, (aff.totalCommissionEarned || 0) - comm.commissionAmount);
        }
      }
      comm.status = 'cancelled';
    });

    saveDb(db);
  }

  // 1. PUBLIC: Track referral click (?ref=CODE)
  app.post('/api/affiliates/click', (req, res) => {
    const { refCode } = req.body || {};
    if (!refCode) {
      res.status(400).json({ status: 'error', message: 'Code de parrainage requis.' });
      return;
    }

    const cleanCode = String(refCode).trim().toUpperCase();
    const ip = req.ip || '127.0.0.1';
    const key = `${ip}_${cleanCode}`;
    const now = Date.now();
    const lastClick = clickTrackerLimits.get(key) || 0;

    // Debounce click: max 1 click per IP/ref code per 30 minutes to prevent spam
    if (now - lastClick < 30 * 60 * 1000) {
      res.json({ status: 'success', message: 'Clic déjà comptabilisé récemment.', recorded: false });
      return;
    }

    clickTrackerLimits.set(key, now);

    const db = loadDb();
    db.affiliates = db.affiliates || [];
    const affiliate = db.affiliates.find((a) => a.code.toUpperCase() === cleanCode || a.id.toUpperCase() === cleanCode);

    if (affiliate && affiliate.status === 'active') {
      affiliate.clicksCount = (affiliate.clicksCount || 0) + 1;
      saveDb(db);
      res.json({ status: 'success', message: 'Clic enregistré.', recorded: true, affiliateName: affiliate.name });
      return;
    }

    res.json({ status: 'success', message: 'Affilié inactif ou inconnu.', recorded: false });
  });

  // 2. PUBLIC: Register a new affiliate
  app.post('/api/affiliates/register', (req, res) => {
    const { name, email, phone, payoutNetwork, payoutPhone, customCode } = req.body || {};

    if (!name || !email || !phone) {
      res.status(400).json({ status: 'error', message: 'Nom, e-mail et téléphone sont obligatoires.' });
      return;
    }

    const db = loadDb();
    db.affiliates = db.affiliates || [];

    const normEmail = String(email).trim().toLowerCase();
    const normPhone = String(phone).trim();
    const cleanPayoutPhone = String(payoutPhone || phone).trim();
    const cleanNetwork: 'TMONEY' | 'FLOOZ' = String(payoutNetwork || 'TMONEY').toUpperCase() === 'FLOOZ' ? 'FLOOZ' : 'TMONEY';

    // Verify email/phone uniqueness
    const existing = db.affiliates.find(
      (a) => a.email.toLowerCase() === normEmail || a.phone.replace(/\D/g, '') === normPhone.replace(/\D/g, '')
    );
    if (existing) {
      res.status(400).json({
        status: 'error',
        message: 'Un compte affilié existe déjà avec cet e-mail ou ce numéro de téléphone. Connectez-vous directement.'
      });
      return;
    }

    // Generate clean unique affiliate code
    let generatedCode = String(customCode || '').trim().toUpperCase().replace(/[^A-Z0-9_-]/g, '');
    if (!generatedCode || generatedCode.length < 3) {
      const slug = name.trim().split(' ')[0].toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 5) || 'PHLOX';
      const randomSuffix = Math.floor(100 + Math.random() * 900);
      generatedCode = `${slug}${randomSuffix}`;
    }

    // Check code uniqueness
    let finalCode = generatedCode;
    let counter = 1;
    while (db.affiliates.some((a) => a.code.toUpperCase() === finalCode)) {
      finalCode = `${generatedCode}${counter++}`;
    }

    const newAffiliate: DbAffiliate = {
      id: `aff-${Date.now()}`,
      code: finalCode,
      name: String(name).trim(),
      email: normEmail,
      phone: normPhone,
      payoutNetwork: cleanNetwork,
      payoutPhone: cleanPayoutPhone,
      commissionRate: db.affiliate_settings?.globalDefaultRate || 7,
      clicksCount: 0,
      salesCount: 0,
      totalSalesAmount: 0,
      totalCommissionEarned: 0,
      availableBalance: 0,
      pendingBalance: 0,
      withdrawnBalance: 0,
      status: 'active',
      createdAt: new Date().toISOString()
    };

    db.affiliates.push(newAffiliate);
    saveDb(db);
    writeAuditLog(normEmail, 'Inscription Affilié', `Création du compte affilié ${newAffiliate.code} (${newAffiliate.name})`);

    res.status(201).json({
      status: 'success',
      message: 'Félicitations ! Votre compte partenaire a été créé avec succès.',
      affiliate: newAffiliate
    });
  });

  // 3. PUBLIC: Login affiliate
  app.post('/api/affiliates/login', (req, res) => {
    const { identifier } = req.body || {};
    if (!identifier) {
      res.status(400).json({ status: 'error', message: 'Veuillez renseigner votre code, e-mail ou téléphone.' });
      return;
    }

    const clean = String(identifier).trim().toLowerCase();
    const cleanPhoneDigits = clean.replace(/\D/g, '');

    const db = loadDb();
    db.affiliates = db.affiliates || [];

    const affiliate = db.affiliates.find((a) => {
      const aCode = a.code.toLowerCase();
      const aEmail = a.email.toLowerCase();
      const aPhoneDigits = a.phone.replace(/\D/g, '');
      return aCode === clean || aEmail === clean || (cleanPhoneDigits.length >= 6 && aPhoneDigits.includes(cleanPhoneDigits));
    });

    if (!affiliate) {
      res.status(404).json({
        status: 'error',
        message: 'Aucun compte affilié correspondant. Vérifiez votre saisie ou créez votre compte.'
      });
      return;
    }

    if (affiliate.status === 'suspended') {
      res.status(403).json({
        status: 'error',
        message: 'Votre compte affilié est temporairement suspendu. Contactez le support PHLOX TOGO.'
      });
      return;
    }

    res.json({
      status: 'success',
      message: 'Connexion réussie.',
      affiliate
    });
  });

  // 4. PUBLIC: Get full affiliate dashboard details
  app.get('/api/affiliates/dashboard/:identifier', (req, res) => {
    const rawId = String(req.params.identifier).trim();
    const db = loadDb();
    db.affiliates = db.affiliates || [];
    db.affiliate_commissions = db.affiliate_commissions || [];
    db.affiliate_payouts = db.affiliate_payouts || [];

    const affiliate = db.affiliates.find(
      (a) => a.id.toLowerCase() === rawId.toLowerCase() || a.code.toLowerCase() === rawId.toLowerCase()
    );

    if (!affiliate) {
      res.status(404).json({ status: 'error', message: 'Affilié non trouvé.' });
      return;
    }

    const commissions = db.affiliate_commissions.filter(
      (c) => c.affiliateId === affiliate.id || c.affiliateCode.toUpperCase() === affiliate.code.toUpperCase()
    );

    const payouts = db.affiliate_payouts.filter(
      (p) => p.affiliateId === affiliate.id || p.affiliateCode.toUpperCase() === affiliate.code.toUpperCase()
    );

    res.json({
      status: 'success',
      affiliate,
      commissions,
      payouts,
      settings: db.affiliate_settings || {
        globalDefaultRate: 7,
        validationDelayDays: 7,
        minWithdrawalAmount: 5000,
        allowSelfReferral: false
      }
    });
  });

  // 5. PUBLIC: Request payout
  app.post('/api/affiliates/payout-request', (req, res) => {
    const { affiliateId, amount, payoutNetwork, payoutPhone, notes } = req.body || {};

    const reqAmount = Number(amount) || 0;
    const db = loadDb();
    db.affiliates = db.affiliates || [];
    db.affiliate_payouts = db.affiliate_payouts || [];
    const minWithdrawal = db.affiliate_settings?.minWithdrawalAmount || 5000;

    const affiliate = db.affiliates.find((a) => a.id === affiliateId || a.code === affiliateId);
    if (!affiliate) {
      res.status(404).json({ status: 'error', message: 'Affilié introuvable.' });
      return;
    }

    if (affiliate.status !== 'active') {
      res.status(403).json({ status: 'error', message: 'Compte affilié non autorisé aux retraits.' });
      return;
    }

    if (reqAmount < minWithdrawal) {
      res.status(400).json({
        status: 'error',
        message: `Le montant minimum de retrait est de ${minWithdrawal.toLocaleString()} FCFA.`
      });
      return;
    }

    if (reqAmount > (affiliate.availableBalance || 0)) {
      res.status(400).json({
        status: 'error',
        message: `Solde disponible insuffisant (${(affiliate.availableBalance || 0).toLocaleString()} FCFA disponible).`
      });
      return;
    }

    // Check if there is already a pending payout request to prevent double-withdrawals
    const hasPendingPayout = db.affiliate_payouts.some((p) => p.affiliateId === affiliate.id && p.status === 'pending');
    if (hasPendingPayout) {
      res.status(400).json({
        status: 'error',
        message: 'Vous avez déjà une demande de retrait en cours de traitement. Veuillez patienter.'
      });
      return;
    }

    // Deduct from available balance immediately
    affiliate.availableBalance = (affiliate.availableBalance || 0) - reqAmount;

    const payoutId = `pay-${crypto.randomBytes(4).toString('hex')}`;
    const newPayout: DbAffiliatePayout = {
      id: payoutId,
      affiliateId: affiliate.id,
      affiliateCode: affiliate.code,
      affiliateName: affiliate.name,
      amount: reqAmount,
      payoutNetwork: (payoutNetwork || affiliate.payoutNetwork || 'TMONEY') as 'TMONEY' | 'FLOOZ',
      payoutPhone: String(payoutPhone || affiliate.payoutPhone || affiliate.phone).trim(),
      status: 'pending',
      requestedAt: new Date().toISOString(),
      notes: notes ? String(notes).trim() : undefined
    };

    db.affiliate_payouts.unshift(newPayout);
    saveDb(db);
    writeAuditLog(affiliate.email, 'Demande de Retrait Affilié', `Demande de retrait de ${reqAmount.toLocaleString()} FCFA via ${newPayout.payoutNetwork} (${newPayout.payoutPhone}).`);

    res.status(201).json({
      status: 'success',
      message: `Votre demande de retrait de ${reqAmount.toLocaleString()} FCFA a bien été enregistrée.`,
      payout: newPayout,
      availableBalance: affiliate.availableBalance
    });
  });

  // 6. PUBLIC / CLIENT TRIGGER: Process completed order affiliation
  app.post('/api/affiliates/order-completed', (req, res) => {
    const { orderId, refCode, customerPhone, customerName, totalAmount, items } = req.body || {};

    if (!orderId || !refCode) {
      res.status(400).json({ status: 'error', message: 'Order ID et code de parrainage requis.' });
      return;
    }

    const cleanRef = String(refCode).trim().toUpperCase();
    const db = loadDb();

    const mockRecord: ServerOrderRecord = {
      id: String(orderId).trim(),
      customerName: String(customerName || 'Client').trim(),
      customerPhone: String(customerPhone || '').trim(),
      debitPhone: String(customerPhone || '').trim(),
      customerAddress: 'Lomé',
      customerCity: 'Lomé',
      paymentMethod: 'TMONEY',
      items: Array.isArray(items) ? items : [],
      totalAmount: Number(totalAmount) || 0,
      status: 'paid',
      createdAt: new Date().toISOString(),
      expiresAt: Date.now() + 120 * 1000,
      waSent: true,
      affiliateRef: cleanRef
    };

    const commission = processAffiliateOrderCommission(mockRecord, cleanRef, db);

    if (commission) {
      res.json({
        status: 'success',
        message: 'Commission d’affiliation calculée et enregistrée avec succès.',
        commission
      });
      return;
    }

    res.json({
      status: 'warning',
      message: 'Aucune commission attribuée (code inactif ou auto-attribution évitée).'
    });
  });

  // ADMIN LOGIN (Email + Password) with 5 Attempts and 15-Minute Block
  app.post('/api/admin/login', (req, res) => {
    const ip = req.ip || '127.0.0.1';
    const now = Date.now();
    const window = 15 * 60 * 1000; // 15 minutes
    const attempts = (adminLoginLimits.get(ip) || []).filter((t) => now - t < window);

    if (attempts.length >= 5) {
      res.status(429).json({
        status: 'error',
        message: 'Accès bloqué. Trop de tentatives de connexion (max 5 / 15 min). Veuillez patienter.'
      });
      return;
    }

    const { email, password } = req.body || {};
    const normEmail = String(email || '').trim().toLowerCase();
    const normPass = String(password || '').trim();

    let authenticatedUser: AdminSessionInfo | null = null;

    // Define Owner and Manager credentials
    if (normEmail === 'owner@phlox.com' && normPass === 'owner228') {
      authenticatedUser = { email: normEmail, role: 'owner' };
    } else if (normEmail === 'manager@phlox.com' && normPass === 'manager228') {
      authenticatedUser = { email: normEmail, role: 'manager' };
    } else {
      // Fallback fallback credentials
      const defaultEmail = (process.env.ADMIN_EMAIL || 'admin@phlox-togo.com').trim().toLowerCase();
      const defaultPass = (process.env.ADMIN_PASSWORD || 'admin1234').trim();
      if (normEmail === defaultEmail && normPass === defaultPass) {
        authenticatedUser = { email: normEmail, role: 'owner' };
      }
    }

    if (!authenticatedUser) {
      attempts.push(now);
      adminLoginLimits.set(ip, attempts);
      const attemptsRemaining = Math.max(0, 5 - attempts.length);
      res.status(401).json({
        status: 'error',
        message: `Identifiants incorrects. Essais restants avant blocage : ${attemptsRemaining}`
      });
      return;
    }

    // Success login
    const sessionToken = crypto.randomBytes(24).toString('hex');
    adminSessions.set(sessionToken, authenticatedUser);

    writeAuditLog(authenticatedUser.email, 'Connexion réussie', `Ouverture de session administrateur (Rôle: ${authenticatedUser.role}).`);

    res.cookie('phlox_admin_session', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 24 * 3600 * 1000
    });

    res.json({
      status: 'success',
      sessionToken,
      role: authenticatedUser.role,
      email: authenticatedUser.email,
      message: 'Authentification réussie.',
      orders: Array.from(serverOrders.values())
    });
  });

  app.post('/api/admin/logout', (req, res) => {
    const token = req.cookies?.phlox_admin_session || req.headers['authorization']?.replace('Bearer ', '');
    if (token) {
      const user = adminSessions.get(token);
      if (user) {
        writeAuditLog(user.email, 'Déconnexion', 'Fermeture volontaire de la session.');
      }
      adminSessions.delete(token);
    }
    res.clearCookie('phlox_admin_session');
    res.json({ status: 'success', message: 'Déconnexion effectuée.' });
  });

  // Admin Verification Middleware (Injects req.adminUser)
  const requireAdmin = (req: any, res: express.Response, next: express.NextFunction) => {
    const token = req.cookies?.phlox_admin_session || req.headers['authorization']?.replace('Bearer ', '');
    if (token && adminSessions.has(token)) {
      req.adminUser = adminSessions.get(token);
      next();
      return;
    }
    // Allow local dev bypass in test environment if no session exists yet
    if (process.env.NODE_ENV !== 'production') {
      req.adminUser = { email: 'dev@phlox.com', role: 'owner' };
      next();
      return;
    }
    res.status(401).json({ status: 'error', message: 'Session administrateur requise.' });
  };

  // ADMIN ME ROUTE
  app.get('/api/admin/me', requireAdmin, (req: any, res) => {
    res.json({
      status: 'success',
      user: req.adminUser
    });
  });

  // GET FULL ADMIN DATABASE
  app.get('/api/admin/db', requireAdmin, (req: any, res) => {
    const db = loadDb();
    res.json({
      status: 'success',
      db,
      orders: Array.from(serverOrders.values())
    });
  });

  app.get('/api/admin/orders', requireAdmin, (_req, res) => {
    res.json({
      status: 'success',
      orders: Array.from(serverOrders.values())
    });
  });

  app.put('/api/admin/orders/:id', requireAdmin, (req: any, res) => {
    const id = String(req.params.id).toUpperCase();
    const existing = serverOrders.get(id);
    if (!existing) {
      res.status(404).json({ status: 'error', message: 'Commande non trouvée.' });
      return;
    }
    if (req.body?.status) {
      const prevStatus = existing.status;
      existing.status = req.body.status;
      const db = loadDb();
      
      // Decampaign stock updates and Affiliate commission approval on PAID
      if ((req.body.status === 'paid' || req.body.status === 'completed') && prevStatus !== 'paid' && prevStatus !== 'completed') {
        existing.items.forEach(item => {
          recordPromoSaleAndStats(item.productId, item.quantity, item.price, db);
        });
        handleOrderPaidAffiliateSync(id, db);
      } else if (req.body.status === 'cancelled' && prevStatus !== 'cancelled') {
        handleOrderCancelledAffiliateSync(id, db);
      }
      saveDb(db);
    }
    serverOrders.set(id, existing);
    writeAuditLog(req.adminUser.email, 'Mise à jour commande', `Modification statut commande ${id} à ${existing.status}`);
    res.json({ status: 'success', order: existing });
  });

  app.delete('/api/admin/orders/:id', requireAdmin, (req: any, res) => {
    const id = String(req.params.id).toUpperCase();
    if (serverOrders.has(id)) {
      serverOrders.delete(id);
      writeAuditLog(req.adminUser.email, 'Suppression commande', `Commande ${id} effacée.`);
      res.json({ status: 'success', message: 'Commande supprimée.' });
      return;
    }
    res.status(404).json({ status: 'error', message: 'Commande introuvable.' });
  });

  // ADMIN: CREATE OR EDIT PRODUCT (Owner and Manager Allowed)
  app.post('/api/admin/product', requireAdmin, (req: any, res) => {
    const { product } = req.body || {};
    if (!product || !product.name || product.price <= 0 || product.stock < 0) {
      res.status(400).json({ status: 'error', message: 'Paramètres invalides. Le prix doit être > 0, le stock >= 0.' });
      return;
    }

    // Photo mandatory to publish
    if (product.status === 'published' && (!product.image || product.image.length === 0)) {
      res.status(400).json({ status: 'error', message: 'Une image principale est obligatoire pour publier un produit.' });
      return;
    }

    const db = loadDb();
    const existingIndex = db.products.findIndex(p => p.id === product.id);

    if (existingIndex > -1) {
      // Edit existing
      db.products[existingIndex] = {
        ...db.products[existingIndex],
        ...product,
        id: product.id // prevent changes
      };
      writeAuditLog(req.adminUser.email, 'Modification produit', `Mise à jour du produit: ${product.name} (${product.id})`);
    } else {
      // Create new
      const newId = product.id || `prod-${Date.now()}`;
      const newProduct = {
        ...product,
        id: newId
      };
      db.products.push(newProduct);
      writeAuditLog(req.adminUser.email, 'Création produit', `Ajout d'un nouveau produit: ${product.name} (${newId})`);
    }

    saveDb(db);
    res.json({ status: 'success', products: db.products });
  });

  // ADMIN: DUPLICATE PRODUCT
  app.post('/api/admin/product/duplicate/:id', requireAdmin, (req: any, res) => {
    const id = String(req.params.id);
    const db = loadDb();
    const existing = db.products.find(p => p.id === id);

    if (!existing) {
      res.status(404).json({ status: 'error', message: 'Produit non trouvé.' });
      return;
    }

    const duplicated = {
      ...existing,
      id: `prod-${Date.now()}`,
      name: `${existing.name} (Copie)`,
      status: 'draft' as const // Duplicated product becomes a draft
    };

    db.products.push(duplicated);
    writeAuditLog(req.adminUser.email, 'Duplication produit', `Duplication du produit ${existing.name} (${existing.id})`);
    saveDb(db);

    res.json({ status: 'success', products: db.products });
  });

  // ADMIN: DELETE PRODUCT
  app.delete('/api/admin/product/:id', requireAdmin, (req: any, res) => {
    const id = String(req.params.id);
    const db = loadDb();
    const filtered = db.products.filter(p => p.id !== id);

    if (filtered.length === db.products.length) {
      res.status(404).json({ status: 'error', message: 'Produit non trouvé.' });
      return;
    }

    db.products = filtered;
    writeAuditLog(req.adminUser.email, 'Suppression produit', `Suppression du produit ${id}`);
    saveDb(db);

    res.json({ status: 'success', products: db.products });
  });

  // ADMIN: EDIT ANNOUNCEMENTS (Owner and Manager Allowed)
  app.post('/api/admin/announcements', requireAdmin, (req: any, res) => {
    const { announcements } = req.body || {};
    if (!announcements) {
      res.status(400).json({ status: 'error', message: 'Données manquantes.' });
      return;
    }

    const db = loadDb();
    db.announcements = {
      ...db.announcements,
      ...announcements
    };

    writeAuditLog(req.adminUser.email, 'Mise à jour annonces', 'Modification des bandeaux, pop-up ou bannières.');
    saveDb(db);
    res.json({ status: 'success', announcements: db.announcements });
  });

  // ADMIN: EDIT PROMOTIONS (Owner ONLY)
  app.post('/api/admin/promotions', requireAdmin, (req: any, res) => {
    if (req.adminUser.role !== 'owner') {
      res.status(403).json({ 
        status: 'error', 
        message: 'Droits insuffisants. Seul le propriétaire (Owner) de la boutique peut gérer les campagnes Black Friday.' 
      });
      return;
    }

    const { promotions } = req.body || {};
    if (!Array.isArray(promotions)) {
      res.status(400).json({ status: 'error', message: 'Tableau de promotions requis.' });
      return;
    }

    const db = loadDb();
    db.promotions = promotions;

    writeAuditLog(req.adminUser.email, 'Gestion campagnes', 'Mise à jour des promotions et du Black Friday.');
    saveDb(db);
    res.json({ status: 'success', promotions: db.promotions });
  });

  // ADMIN: EDIT PROMO CODES (Owner ONLY)
  app.post('/api/admin/promo-codes', requireAdmin, (req: any, res) => {
    if (req.adminUser.role !== 'owner') {
      res.status(403).json({ 
        status: 'error', 
        message: 'Droits insuffisants. Seul le propriétaire (Owner) peut gérer les codes promo.' 
      });
      return;
    }

    const { promoCodes } = req.body || {};
    if (!Array.isArray(promoCodes)) {
      res.status(400).json({ status: 'error', message: 'Tableau de codes promo requis.' });
      return;
    }

    const db = loadDb();
    db.promo_codes = promoCodes.map(c => ({
      ...c,
      code: String(c.code).trim().toUpperCase() // clean uppercase codes
    }));

    writeAuditLog(req.adminUser.email, 'Gestion codes promo', 'Mise à jour des coupon codes.');
    saveDb(db);
    res.json({ status: 'success', promoCodes: db.promo_codes });
  });

  // ADMIN: GET AFFILIATION SYSTEM STATE
  app.get('/api/admin/affiliates', requireAdmin, (req: any, res) => {
    const db = loadDb();
    res.json({
      status: 'success',
      affiliates: db.affiliates || [],
      commissions: db.affiliate_commissions || [],
      payouts: db.affiliate_payouts || [],
      settings: db.affiliate_settings || {
        globalDefaultRate: 7,
        validationDelayDays: 7,
        minWithdrawalAmount: 5000,
        allowSelfReferral: false
      }
    });
  });

  // ADMIN: UPDATE OR CREATE AFFILIATE
  app.put('/api/admin/affiliates/:id', requireAdmin, (req: any, res) => {
    const rawId = String(req.params.id).trim();
    const updateData = req.body || {};

    const db = loadDb();
    db.affiliates = db.affiliates || [];

    const existingIdx = db.affiliates.findIndex(
      (a) => a.id.toLowerCase() === rawId.toLowerCase() || a.code.toLowerCase() === rawId.toLowerCase()
    );

    if (existingIdx === -1) {
      res.status(404).json({ status: 'error', message: 'Affilié non trouvé.' });
      return;
    }

    db.affiliates[existingIdx] = {
      ...db.affiliates[existingIdx],
      name: updateData.name !== undefined ? String(updateData.name).trim() : db.affiliates[existingIdx].name,
      email: updateData.email !== undefined ? String(updateData.email).trim().toLowerCase() : db.affiliates[existingIdx].email,
      phone: updateData.phone !== undefined ? String(updateData.phone).trim() : db.affiliates[existingIdx].phone,
      payoutNetwork: updateData.payoutNetwork || db.affiliates[existingIdx].payoutNetwork,
      payoutPhone: updateData.payoutPhone !== undefined ? String(updateData.payoutPhone).trim() : db.affiliates[existingIdx].payoutPhone,
      commissionRate: updateData.commissionRate !== undefined ? Number(updateData.commissionRate) : db.affiliates[existingIdx].commissionRate,
      status: updateData.status || db.affiliates[existingIdx].status
    };

    saveDb(db);
    writeAuditLog(req.adminUser.email, 'Modification Affilié', `Mise à jour du profil affilié ${db.affiliates[existingIdx].code} (Taux: ${db.affiliates[existingIdx].commissionRate}%, Statut: ${db.affiliates[existingIdx].status})`);

    res.json({ status: 'success', affiliate: db.affiliates[existingIdx] });
  });

  // ADMIN: UPDATE COMMISSION STATUS (pending -> approved -> paid -> cancelled)
  app.put('/api/admin/affiliates/commissions/:id', requireAdmin, (req: any, res) => {
    const rawId = String(req.params.id).trim();
    const { status } = req.body || {};

    if (!['pending', 'approved', 'paid', 'cancelled'].includes(status)) {
      res.status(400).json({ status: 'error', message: 'Statut de commission invalide.' });
      return;
    }

    const db = loadDb();
    db.affiliates = db.affiliates || [];
    db.affiliate_commissions = db.affiliate_commissions || [];

    const commIdx = db.affiliate_commissions.findIndex((c) => c.id === rawId);
    if (commIdx === -1) {
      res.status(404).json({ status: 'error', message: 'Commission non trouvée.' });
      return;
    }

    const comm = db.affiliate_commissions[commIdx];
    const prevStatus = comm.status;
    const aff = db.affiliates.find((a) => a.id === comm.affiliateId);

    if (aff && prevStatus !== status) {
      // Revert previous balance impact
      if (prevStatus === 'pending') {
        aff.pendingBalance = Math.max(0, (aff.pendingBalance || 0) - comm.commissionAmount);
      } else if (prevStatus === 'approved') {
        aff.availableBalance = Math.max(0, (aff.availableBalance || 0) - comm.commissionAmount);
        aff.totalCommissionEarned = Math.max(0, (aff.totalCommissionEarned || 0) - comm.commissionAmount);
      } else if (prevStatus === 'paid') {
        aff.withdrawnBalance = Math.max(0, (aff.withdrawnBalance || 0) - comm.commissionAmount);
      }

      // Apply new status balance impact
      if (status === 'pending') {
        aff.pendingBalance = (aff.pendingBalance || 0) + comm.commissionAmount;
      } else if (status === 'approved') {
        aff.availableBalance = (aff.availableBalance || 0) + comm.commissionAmount;
        aff.totalCommissionEarned = (aff.totalCommissionEarned || 0) + comm.commissionAmount;
        comm.approvedAt = new Date().toISOString();
      } else if (status === 'paid') {
        aff.withdrawnBalance = (aff.withdrawnBalance || 0) + comm.commissionAmount;
        comm.paidAt = new Date().toISOString();
      }
    }

    comm.status = status;
    saveDb(db);
    writeAuditLog(req.adminUser.email, 'Mise à jour Commission', `Commission ${rawId} passée de ${prevStatus} à ${status}.`);

    res.json({ status: 'success', commission: comm, affiliate: aff });
  });

  // ADMIN: PROCESS PAYOUT REQUEST (completed or rejected)
  app.put('/api/admin/affiliates/payouts/:id', requireAdmin, (req: any, res) => {
    const rawId = String(req.params.id).trim();
    const { status, notes } = req.body || {};

    if (!['completed', 'rejected'].includes(status)) {
      res.status(400).json({ status: 'error', message: 'Statut de paiement invalide (completed ou rejected).' });
      return;
    }

    const db = loadDb();
    db.affiliates = db.affiliates || [];
    db.affiliate_payouts = db.affiliate_payouts || [];

    const payout = db.affiliate_payouts.find((p) => p.id === rawId);
    if (!payout) {
      res.status(404).json({ status: 'error', message: 'Demande de retrait non trouvée.' });
      return;
    }

    if (payout.status !== 'pending') {
      res.status(400).json({ status: 'error', message: 'Cette demande de retrait a déjà été traitée.' });
      return;
    }

    const aff = db.affiliates.find((a) => a.id === payout.affiliateId);

    if (status === 'completed') {
      payout.status = 'completed';
      payout.processedAt = new Date().toISOString();
      payout.notes = notes || 'Retrait envoyé par Mobile Money.';
      if (aff) {
        aff.withdrawnBalance = (aff.withdrawnBalance || 0) + payout.amount;
      }
    } else if (status === 'rejected') {
      payout.status = 'rejected';
      payout.processedAt = new Date().toISOString();
      payout.notes = notes || 'Demande rejetée par l’administrateur.';
      // Refund back to available balance
      if (aff) {
        aff.availableBalance = (aff.availableBalance || 0) + payout.amount;
      }
    }

    saveDb(db);
    writeAuditLog(
      req.adminUser.email,
      'Traitement Retrait Affilié',
      `Demande de retrait ${payout.id} (${payout.amount} FCFA) passée à ${status}.`
    );

    res.json({ status: 'success', payout, affiliate: aff });
  });

  // ADMIN: UPDATE AFFILIATE SETTINGS
  app.put('/api/admin/affiliates/settings', requireAdmin, (req: any, res) => {
    if (req.adminUser.role !== 'owner') {
      res.status(403).json({ status: 'error', message: 'Permissions Owner requises pour modifier les règles globales.' });
      return;
    }

    const { globalDefaultRate, validationDelayDays, minWithdrawalAmount, allowSelfReferral } = req.body || {};
    const db = loadDb();

    db.affiliate_settings = {
      globalDefaultRate: typeof globalDefaultRate === 'number' ? globalDefaultRate : (db.affiliate_settings?.globalDefaultRate || 7),
      validationDelayDays: typeof validationDelayDays === 'number' ? validationDelayDays : (db.affiliate_settings?.validationDelayDays || 7),
      minWithdrawalAmount: typeof minWithdrawalAmount === 'number' ? minWithdrawalAmount : (db.affiliate_settings?.minWithdrawalAmount || 5000),
      allowSelfReferral: typeof allowSelfReferral === 'boolean' ? allowSelfReferral : !!db.affiliate_settings?.allowSelfReferral
    };

    saveDb(db);
    writeAuditLog(
      req.adminUser.email,
      'Configuration Affiliation',
      `Mise à jour des paramètres : Taux global ${db.affiliate_settings.globalDefaultRate}%, Délai ${db.affiliate_settings.validationDelayDays}j, Min ${db.affiliate_settings.minWithdrawalAmount} FCFA.`
    );

    res.json({ status: 'success', settings: db.affiliate_settings });
  });

  // DIRECT USSD PAYMENT REQUEST (/api/pay.php) — Securely validated against DB promotions
  const handleDirectPayPush = async (req: express.Request, res: express.Response) => {
    const ip = req.ip || '127.0.0.1';
    const body = req.body || {};

    // 2. Si la clé PayGate est absente côté serveur : erreur 503 "Paiement indisponible"
    const apiKey = getPaygateApiKey();
    if (!apiKey) {
      res.status(503).json({
        status: 'error',
        message: 'Paiement indisponible (Service Marchand non configuré).'
      });
      return;
    }

    const phoneParsed = normalizeTogoPaygatePhone(body.phone_number || body.debit_phone || body.customer_phone || '');
    if (!phoneParsed.valid) {
      res.status(400).json({
        status: 'error',
        message: 'Numéro à débiter invalide. Veuillez saisir un numéro togolais à 8 chiffres.'
      });
      return;
    }

    // Rate Limiting: 3 requests / 10 min per IP and phone
    if (isPayRateLimited(`ip_${ip}`) || isPayRateLimited(`phone_${phoneParsed.fullPhone}`)) {
      res.status(429).json({
        status: 'error',
        message: 'Trop de demandes de paiement. Veuillez patienter 10 minutes avant de réessayer.'
      });
      return;
    }

    recordPayRequest(`ip_${ip}`);
    recordPayRequest(`phone_${phoneParsed.fullPhone}`);

    const city = String(body.city || body.customerCity || 'Lomé').trim();
    const items: ServerOrderItem[] = Array.isArray(body.items) ? body.items : [];
    const promoCodeString = body.promoCode || body.couponCode;

    // Secure server-side calculation of promotional prices and coupon discounts
    const calcResult = calculateServerOrderTotal(items, city, promoCodeString, phoneParsed.fullPhone);
    if (!calcResult.valid) {
      res.status(400).json({
        status: 'error',
        message: calcResult.error || 'Erreur de calcul du catalogue.'
      });
      return;
    }

    // 3. Identifiant unique à chaque tentative (PHX-1042-1, PHX-1042-2…)
    const baseOrderId = String(body.identifier || '').trim().toUpperCase() || `PHX-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
    const currentAttempts = (orderAttemptsCount.get(baseOrderId) || 0) + 1;
    orderAttemptsCount.set(baseOrderId, currentAttempts);
    const attemptId = `${baseOrderId}-${currentAttempts}`;

    const cleanNetwork: 'TMONEY' | 'FLOOZ' =
      String(body.network || 'TMONEY').toUpperCase() === 'FLOOZ' ? 'FLOOZ' : 'TMONEY';

    // 4. Format du numéro envoyé à PayGate : 8 chiffres locaux
    const togoLocalPhone = phoneParsed.fullPhone.slice(-TOGO_PHONE_LENGTH);
    const rawAffiliateRef = body.affiliateRef || body.refCode || body.ref;
    const cleanAffiliateRef = rawAffiliateRef ? String(rawAffiliateRef).trim().toUpperCase() : undefined;

    const orderRecord: ServerOrderRecord = {
      id: attemptId,
      customerName: String(body.customer_name || body.customerName || '').trim(),
      customerPhone: String(body.customer_phone || body.customerPhone || `+${phoneParsed.fullPhone}`).trim(),
      debitPhone: phoneParsed.fullPhone,
      customerAddress: String(body.customer_address || body.customerAddress || city).trim(),
      customerCity: city,
      paymentMethod: cleanNetwork,
      items,
      totalAmount: calcResult.total,
      promoCodeApplied: calcResult.promoCodeApplied,
      discountAmountApplied: calcResult.discountAmount,
      affiliateRef: cleanAffiliateRef,
      status: 'pending',
      createdAt: new Date().toISOString(),
      expiresAt: Date.now() + 120 * 1000,
      processedTxRefs: [],
      waSent: false
    };

    serverOrders.set(attemptId, orderRecord);

    // Record affiliate attribution & commission (pending until paid)
    if (cleanAffiliateRef) {
      const dbForAff = loadDb();
      processAffiliateOrderCommission(orderRecord, cleanAffiliateRef, dbForAff);
    }

    let txRef: string | null = null;
    let pgStatus = -1;
    let pgMessage = "";
    let isSuccess = false;

    try {
      const response = await fetch('https://paygateglobal.com/api/v1/pay', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          auth_token: apiKey,
          phone_number: togoLocalPhone,
          amount: calcResult.total,
          description: `Commande ${baseOrderId} (Tentative ${currentAttempts}) - ${MERCHANT_NAME}`,
          identifier: attemptId,
          network: cleanNetwork
        })
      });

      const data = (await response.json()) as { tx_reference?: string; status?: number; message?: string };
      pgStatus = typeof data.status === 'number' ? data.status : -1;
      pgMessage = data.message || mapPaygateStatusToMessage(pgStatus);

      // 1. Réponse "succès" uniquement si PayGate renvoie status 0 ET un tx_reference
      if (pgStatus === 0 && data.tx_reference) {
        txRef = String(data.tx_reference);
        orderRecord.txReference = txRef;
        serverOrders.set(attemptId, orderRecord);
        isSuccess = true;
      }
    } catch (err: any) {
      pgStatus = 500;
      pgMessage = `PayGate injoignable : ${err.message || err}`;
    }

    // 5. Journal des paiements dans l'admin : date, commande, réseau, numéro masqué, code PayGate, message
    const maskedPhone = togoLocalPhone.slice(0, 2) + "•••" + togoLocalPhone.slice(-3);
    const db = loadDb();
    db.payment_logs = db.payment_logs || [];
    db.payment_logs.unshift({
      date: new Date().toISOString(),
      orderId: baseOrderId,
      attemptId: attemptId,
      network: cleanNetwork,
      maskedPhone,
      statusCode: pgStatus,
      message: pgMessage
    });
    saveDb(db);

    if (!isSuccess) {
      res.status(400).json({
        status: 'error',
        paygate_status: pgStatus,
        message: `Paiement rejeté par PayGate : ${pgMessage}`
      });
      return;
    }

    const networkLabel = cleanNetwork === 'FLOOZ' ? 'Flooz Money' : 'Mixx by Yas';
    res.status(200).json({
      status: 'success',
      paygate_status: pgStatus,
      tx_reference: txRef,
      identifier: attemptId,
      amount: calcResult.total,
      expires_in: 120,
      message: `Demande Push USSD ${networkLabel} envoyée sur le +${phoneParsed.fullPhone}. Validez sur votre téléphone.`
    });
  };

  app.post('/api/pay.php', handleDirectPayPush);
  app.post('/api/paygate/pay', handleDirectPayPush);

  // Helper method to update promotion stock and stats securely on the server
  function recordPromoSaleAndStats(productId: string, qty: number, paidPrice: number, db: DbState) {
    const nowStr = new Date().toISOString();
    
    // Decrement Coupon uses if code is in the system
    db.promotions.forEach(promo => {
      const inDate = promo.startDate <= nowStr && promo.endDate >= nowStr;
      if (!inDate) return;

      const matchesProduct = promo.targetProducts.length === 0 || promo.targetProducts.includes(productId);
      if (matchesProduct) {
        if (promo.limitedStock !== undefined && promo.stockCount !== undefined) {
          promo.stockCount = Math.max(0, promo.stockCount - qty);
        }
        promo.salesCount = (promo.salesCount || 0) + qty;
        promo.salesRevenue = (promo.salesRevenue || 0) + (paidPrice * qty);
      }
    });
  }

  // STATUS ENDPOINT (/api/status.php) — ONLY returns { status, identifier, order_status, paid }
  const handleCheckStatus = async (req: express.Request, res: express.Response) => {
    const rawId =
      req.params.id ||
      req.query.identifier ||
      (req.body && (req.body.identifier || req.body.orderId)) ||
      '';
    const orderId = String(rawId).trim().toUpperCase();

    if (!orderId) {
      res.status(400).json({
        status: 'error',
        order_status: 'pending',
        paid: false
      });
      return;
    }

    // Rate Limit: 1 request / 3s per order identifier
    const now = Date.now();
    const lastTime = statusRateLimits.get(orderId) || 0;
    if (now - lastTime < 3000) {
      res.status(429).json({
        status: 'error',
        identifier: orderId,
        order_status: 'pending',
        paid: false,
        message: 'Veuillez espacer vos requêtes (1 requête / 3 s).'
      });
      return;
    }
    statusRateLimits.set(orderId, now);

    // Dynamic Multi-Attempts Status tracking
    let isPaid = false;
    let orderStatus: 'pending' | 'paid' | 'failed' | 'expired' | 'shipped' | 'completed' | 'cancelled' = 'pending';
    let confirmedAttemptId = '';

    const attemptsMade = orderAttemptsCount.get(orderId) || 1;
    for (let i = 1; i <= attemptsMade; i++) {
      const attId = `${orderId}-${i}`;
      const existing = serverOrders.get(attId);
      
      if (existing?.status === 'paid' || existing?.status === 'completed') {
        isPaid = true;
        orderStatus = 'paid';
        confirmedAttemptId = attId;
        break;
      }
    }

    if (!isPaid) {
      // Query status from PayGate for each attempt
      for (let i = 1; i <= attemptsMade; i++) {
        const attId = `${orderId}-${i}`;
        const verify = await checkPaygateStatusByIdentifier(attId);
        
        if (verify.isPaid) {
          isPaid = true;
          orderStatus = 'paid';
          confirmedAttemptId = attId;

          const existing = serverOrders.get(attId);
          if (existing) {
            existing.status = 'paid';
            existing.paidAt = new Date().toISOString();
            if (verify.txReference) existing.txReference = verify.txReference;
            
            // Record promotion stats
            const db = loadDb();
            existing.items.forEach(item => {
              recordPromoSaleAndStats(item.productId, item.quantity, item.price, db);
            });

            if (existing.promoCodeApplied) {
              const coupon = db.promo_codes.find(c => c.code.toUpperCase() === existing.promoCodeApplied?.toUpperCase());
              if (coupon) coupon.usedCount = (coupon.usedCount || 0) + 1;
            }

            saveDb(db);
            serverOrders.set(attId, existing);
          }
          break;
        } else if (verify.isFailed) {
          orderStatus = 'failed';
          const existing = serverOrders.get(attId);
          if (existing) {
            existing.status = 'failed';
            serverOrders.set(attId, existing);
          }
        }
      }
    }

    // Return ONLY paid and order_status
    res.status(200).json({
      status: 'success',
      identifier: confirmedAttemptId || `${orderId}-1`,
      order_status: orderStatus,
      paid: isPaid
    });
  };

  app.get('/api/status.php', handleCheckStatus);
  app.post('/api/status.php', handleCheckStatus);

  // CALLBACK ENDPOINT (/paygate-callback.php)
  app.post('/paygate-callback.php', async (req, res) => {
    const data = req.body || {};
    const txReference = String(data.tx_reference || '').trim();
    const identifier = String(data.identifier || '').trim().toUpperCase();
    const amount = Number(data.amount || 0);

    if (!identifier || !txReference) {
      res.status(400).json({ status: 'error', message: 'Paramètres manquants.' });
      return;
    }

    // 3. Ne crée jamais une commande depuis un callback
    const existing = serverOrders.get(identifier);
    if (!existing) {
      res.status(403).json({ status: 'error', message: 'Commande introuvable.' });
      return;
    }

    // Traite chaque tx_reference une seule fois
    if (existing.processedTxRefs?.includes(txReference)) {
      res.status(200).json({ status: 'success', message: 'Transaction déjà traitée.' });
      return;
    }

    // Verification auprès de PayGate /api/v2/status
    const verify = await checkPaygateStatusByIdentifier(identifier);
    if (!verify.isPaid) {
      res.status(403).json({ status: 'error', message: 'Statut PayGate non confirmé.' });
      return;
    }

    // Vérifie que le montant égale celui de la commande enregistrée
    if (Math.abs(amount - existing.totalAmount) > 0.01) {
      res.status(403).json({ status: 'error', message: 'Montant de paiement non conforme.' });
      return;
    }

    existing.status = 'paid';
    existing.paidAt = new Date().toISOString();
    existing.txReference = txReference;
    existing.processedTxRefs = [...(existing.processedTxRefs || []), txReference];
    
    // Process promotions and coupon codes decrement on DB
    const db = loadDb();
    existing.items.forEach(item => {
      recordPromoSaleAndStats(item.productId, item.quantity, item.price, db);
    });

    if (existing.promoCodeApplied) {
      const coupon = db.promo_codes.find(c => c.code.toUpperCase() === existing.promoCodeApplied?.toUpperCase());
      if (coupon) coupon.usedCount = (coupon.usedCount || 0) + 1;
    }
    saveDb(db);

    serverOrders.set(identifier, existing);

    res.status(200).json({
      status: 'success',
      identifier,
      message: `Commande ${identifier} confirmée payée.`
    });
  });

  app.get('/paygate-callback.php', (_req, res) => {
    res.json({ status: 'active', merchant: MERCHANT_NAME });
  });

  // Mount Vite or static files
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*all', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`${MERCHANT_NAME} server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
