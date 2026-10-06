export interface Product {
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
  status?: 'draft' | 'published' | 'hidden';
  isNew?: boolean;
  outOfStockMessageFr?: string;
  outOfStockMessageEn?: string;
}

export interface Category {
  id: string;
  enName: string;
  frName: string;
  color: string;
  image: string;
  tagline: string;
}

export interface CartItem {
  id: string; // unique cart item identifier (combines product id and serialized variants)
  product: Product;
  selectedVariants: Record<string, string>; // e.g. { "Couleur / Color": "Rouge" }
  quantity: number;
}

export interface Order {
  id: string; // e.g. PHX-1042
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerCity: string;
  paymentMethod?: 'TMONEY' | 'FLOOZ';
  txReference?: string;
  items: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    selectedVariants: Record<string, string>;
  }[];
  totalAmount: number;
  status: 'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled';
  createdAt: string;
  paidAt?: string;
  waSent: boolean;
  debitPhone?: string;
  promoCodeApplied?: string;
  discountAmountApplied?: number;
}

export interface SalesStats {
  totalRevenue: number;
  ordersCount: number;
  totalItemsSold: number;
}

export interface Affiliate {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  payoutNetwork: 'TMONEY' | 'FLOOZ';
  payoutPhone: string;
  commissionRate?: number; // Custom % rate
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

export interface AffiliateCommission {
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

export interface AffiliatePayout {
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

export interface AffiliateSettings {
  globalDefaultRate: number;
  validationDelayDays: number;
  minWithdrawalAmount: number;
  allowSelfReferral: boolean;
}
