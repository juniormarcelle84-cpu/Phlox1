import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  Eye,
  EyeOff,
  Plus,
  Trash2,
  Edit2,
  RotateCcw,
  TrendingUp,
  ShoppingCart,
  PackageOpen,
  ClipboardList,
  Phone,
  Search,
  ChevronDown,
  ChevronUp,
  HelpCircle,
  Truck,
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Upload,
  Copy,
  Layers,
  Sparkles,
  Calendar,
  Percent,
  History,
  FileText,
  Smartphone,
  Tag,
  BadgeAlert,
  ArrowRight,
  ShieldCheck,
  Users,
  X
} from 'lucide-react';
import { Order, Product, Affiliate, AffiliateCommission, AffiliatePayout, AffiliateSettings } from '../types';
import { Lang, formatPrice, translations } from '../services/i18n';
import brandConfig from '../brand.config.json';
import { CategorySalesChart } from '../components/CategorySalesChart';
import { AffiliateSection } from '../components/AffiliateSection';
import { AdminAffiliatesPanel } from '../components/AdminAffiliatesPanel';
import { getOrders, saveOrders, getProducts, saveProducts, getSalesStats } from '../services/storeService';

interface ProjectsViewProps {
  lang: Lang;
  products: Product[];
  setProducts: (products: Product[]) => void;
  initialSubTab?: 'tracker' | 'faq' | 'affiliation' | 'admin';
  isAdminPage?: boolean;
}

interface AuditLog {
  timestamp: string;
  email: string;
  action: string;
  details: string;
}

interface Campaign {
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

interface PromoCode {
  code: string;
  discountType: 'percentage' | 'fixed';
  discountValue: number;
  expiryDate: string;
  maxUses: number;
  usedCount: number;
  minPurchase: number;
}

interface AnnouncementsConfig {
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

export const ProjectsView: React.FC<ProjectsViewProps> = ({
  lang,
  products,
  setProducts,
  initialSubTab = 'tracker',
  isAdminPage = false
}) => {
  const t = translations[lang];

  // Primary Tab state: 'tracker' | 'faq' | 'affiliation' | 'admin'
  const [activeTab, setActiveTab] = useState<'tracker' | 'faq' | 'affiliation' | 'admin'>(
    isAdminPage ? 'admin' : (initialSubTab === 'faq' ? 'faq' : (initialSubTab === 'affiliation' ? 'affiliation' : 'tracker'))
  );

  // Authentication states
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState(false);
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPassword, setAdminPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [adminError, setAdminError] = useState('');
  const [isSubmittingLogin, setIsSubmittingLogin] = useState(false);
  const [adminUser, setAdminUser] = useState<{ email: string; role: 'owner' | 'manager' } | null>(null);

  // Login failed lock state manager
  const [attemptsCount, setAttemptsCount] = useState<number>(() => {
    const stored = localStorage.getItem('phlox_admin_attempts');
    return stored ? Number(stored) : 0;
  });
  const [lockTime, setLockTime] = useState<number>(() => {
    const stored = localStorage.getItem('phlox_admin_lock_until');
    return stored ? Number(stored) : 0;
  });

  // Admin section sub-navigation
  const [adminSubTab, setAdminSubTab] = useState<'orders' | 'products' | 'announcements' | 'promotions' | 'promo-codes' | 'payment-logs' | 'audit-logs' | 'affiliates'>('orders');

  // Unified Data Loaded from JSON DB on server
  const [orders, setOrders] = useState<Order[]>([]);
  const [stats, setStats] = useState({ totalRevenue: 0, ordersCount: 0, totalItemsSold: 0 });
  const [announcements, setAnnouncements] = useState<AnnouncementsConfig>({
    topBanner: { textFr: '', textEn: '', color: '#007AFF', link: '', startDate: '', endDate: '', enabled: false },
    promoPopup: { textFr: '', textEn: '', image: '', enabled: false },
    heroBanner: { title: '', subtitle: '', buttonText: '', buttonLink: '', image: '' }
  });
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [paymentLogs, setPaymentLogs] = useState<{
    date: string;
    orderId: string;
    attemptId: string;
    network: string;
    maskedPhone: string;
    statusCode: number;
    message: string;
  }[]>([]);

  // Admin Affiliation States
  const [adminAffiliates, setAdminAffiliates] = useState<Affiliate[]>([]);
  const [adminCommissions, setAdminCommissions] = useState<AffiliateCommission[]>([]);
  const [adminPayouts, setAdminPayouts] = useState<AffiliatePayout[]>([]);
  const [adminAffSettings, setAdminAffSettings] = useState<AffiliateSettings>({
    globalDefaultRate: 7,
    validationDelayDays: 7,
    minWithdrawalAmount: 5000,
    allowSelfReferral: false
  });

  // Search & filters in Admin orders
  const [orderStatusFilter, setOrderStatusFilter] = useState<'all' | Order['status']>('all');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');

  // Public order inquiry states ("Mes commandes")
  const [searchOrderId, setSearchOrderId] = useState('');
  const [searchPhone, setSearchPhone] = useState('');
  const [matchedOrder, setMatchedOrder] = useState<Order | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  // FAQ Accordion Active Open ID
  const [openFaqId, setOpenFaqId] = useState<string | null>('faq-1');

  // Product Guided Creator / Editor Form Values
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [formErrorMsg, setFormErrorMsg] = useState('');

  // Form product properties
  const [formName, setFormName] = useState('');
  const [formPrice, setFormPrice] = useState(0);
  const [formOriginalPrice, setFormOriginalPrice] = useState('');
  const [formCategory, setFormCategory] = useState('earphone');
  const [formImage, setFormImage] = useState('');
  const [formStock, setFormStock] = useState(10);
  const [formIsPopular, setFormIsPopular] = useState(false);
  const [formIsPromo, setFormIsPromo] = useState(false);
  const [formPromoText, setFormPromoText] = useState('');
  const [formDescFr, setFormDescFr] = useState('');
  const [formDescEn, setFormDescEn] = useState('');
  const [formStatus, setFormStatus] = useState<'draft' | 'published' | 'hidden'>('published');
  const [formIsNew, setFormIsNew] = useState(false);
  const [formOutOfStockMsgFr, setFormOutOfStockMsgFr] = useState('');
  const [formOutOfStockMsgEn, setFormOutOfStockMsgEn] = useState('');

  // Upload simulation & drag indicators
  const [dragActive, setDragActive] = useState(false);
  const [uploadedImages, setUploadedImages] = useState<string[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);

  // Variants builder
  const [varNameFr, setVarNameFr] = useState('Couleur');
  const [varNameEn, setVarNameEn] = useState('Color');
  const [varValueInputs, setVarValueInputs] = useState<string>('Noir, Rouge, Argent');
  const [varSupplements, setVarSupplements] = useState<string>('0, 0, 0');

  // Duplication preview & CSV imports
  const [showCsvImport, setShowCsvImport] = useState(false);
  const [csvText, setCsvText] = useState('');

  // Mobile preview mode active
  const [showMobilePreview, setShowMobilePreview] = useState(false);

  // Announcements forms fields
  const [bannerTextFr, setBannerTextFr] = useState('');
  const [bannerTextEn, setBannerTextEn] = useState('');
  const [bannerColor, setBannerColor] = useState('#007AFF');
  const [bannerLink, setBannerLink] = useState('');
  const [bannerStart, setBannerDateStart] = useState('');
  const [bannerEnd, setBannerDateEnd] = useState('');
  const [bannerEnabled, setBannerEnabled] = useState(false);

  const [popupTextFr, setPopupTextFr] = useState('');
  const [popupTextEn, setPopupTextEn] = useState('');
  const [popupImage, setPopupImage] = useState('');
  const [popupEnabled, setPopupEnabled] = useState(false);

  const [heroTitle, setHeroTitle] = useState('');
  const [heroSubtitle, setHeroSubtitle] = useState('');
  const [heroBtnText, setHeroBtnText] = useState('');
  const [heroBtnLink, setHeroBtnLink] = useState('');
  const [heroImage, setHeroImage] = useState('');

  // Campaign builder fields
  const [campName, setCampName] = useState('');
  const [campStart, setCampStart] = useState('');
  const [campEnd, setCampEnd] = useState('');
  const [campDiscountType, setCampDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [campDiscountValue, setCampDiscountValue] = useState(0);
  const [campTargetProducts, setCampTargetProducts] = useState<string[]>([]);
  const [campTargetCategories, setCampTargetCategories] = useState<string[]>([]);
  const [campLimitedStock, setCampLimitedStock] = useState('');
  const [campLimitPerClient, setCampLimitPerClient] = useState('');

  // Promo code fields
  const [promoCodeName, setPromoCodeName] = useState('');
  const [promoCodeDiscountType, setPromoCodeDiscountType] = useState<'percentage' | 'fixed'>('percentage');
  const [promoCodeValue, setPromoCodeValue] = useState(0);
  const [promoCodeExpiry, setPromoCodeExpiry] = useState('');
  const [promoCodeMaxUses, setPromoCodeMaxUses] = useState(100);
  const [promoCodeMinPurchase, setPromoCodeMinPurchase] = useState(0);

  // Load database values from the secure JSON server state
  const loadDatabaseState = async () => {
    try {
      const res = await fetch('/api/admin/db', {
        headers: { Accept: 'application/json' }
      });
      if (res.ok) {
        const payload = await res.json();
        if (payload.status === 'success' && payload.db) {
          const db = payload.db;
          if (Array.isArray(db.products)) setProducts(db.products);
          if (db.announcements) {
            setAnnouncements(db.announcements);
            initializeAnnouncementFields(db.announcements);
          }
          if (Array.isArray(db.promotions)) setCampaigns(db.promotions);
          if (Array.isArray(db.promo_codes)) setPromoCodes(db.promo_codes);
          if (Array.isArray(db.audit_logs)) setAuditLogs(db.audit_logs);
          if (Array.isArray(db.payment_logs)) setPaymentLogs(db.payment_logs);
          if (Array.isArray(db.affiliates)) setAdminAffiliates(db.affiliates);
          if (Array.isArray(db.affiliate_commissions)) setAdminCommissions(db.affiliate_commissions);
          if (Array.isArray(db.affiliate_payouts)) setAdminPayouts(db.affiliate_payouts);
          if (db.affiliate_settings) setAdminAffSettings(db.affiliate_settings);
          if (Array.isArray(payload.orders)) {
            setOrders(payload.orders);
            calculateAdminStats(payload.orders);
          }
          return;
        }
      }
    } catch (e) {
      console.error('Error contacting server, loading local state as backup', e);
    }

    // Local state fallback if the Node.js server route is offline
    const localOrders = getOrders();
    setOrders(localOrders);
    calculateAdminStats(localOrders);
    setProducts(getProducts());
  };

  const calculateAdminStats = (ordersList: Order[]) => {
    const valid = ordersList.filter(o => o.status !== 'cancelled');
    const totalRev = valid.reduce((sum, o) => (o.status === 'paid' || o.status === 'completed' ? sum + o.totalAmount : sum), 0);
    const totalItems = valid.reduce((sum, o) => sum + o.items.reduce((s, i) => s + i.quantity, 0), 0);
    setStats({
      totalRevenue: totalRev,
      ordersCount: ordersList.length,
      totalItemsSold: totalItems
    });
  };

  const initializeAnnouncementFields = (ann: AnnouncementsConfig) => {
    if (ann.topBanner) {
      setBannerTextFr(ann.topBanner.textFr || '');
      setBannerTextEn(ann.topBanner.textEn || '');
      setBannerColor(ann.topBanner.color || '#007AFF');
      setBannerLink(ann.topBanner.link || '');
      setBannerDateStart(ann.topBanner.startDate ? ann.topBanner.startDate.substring(0, 16) : '');
      setBannerDateEnd(ann.topBanner.endDate ? ann.topBanner.endDate.substring(0, 16) : '');
      setBannerEnabled(!!ann.topBanner.enabled);
    }
    if (ann.promoPopup) {
      setPopupTextFr(ann.promoPopup.textFr || '');
      setPopupTextEn(ann.promoPopup.textEn || '');
      setPopupImage(ann.promoPopup.image || '');
      setPopupEnabled(!!ann.promoPopup.enabled);
    }
    if (ann.heroBanner) {
      setHeroTitle(ann.heroBanner.title || '');
      setHeroSubtitle(ann.heroBanner.subtitle || '');
      setHeroBtnText(ann.heroBanner.buttonText || '');
      setHeroBtnLink(ann.heroBanner.buttonLink || '');
      setHeroImage(ann.heroBanner.image || '');
    }
  };

  // Re-load on startup
  useEffect(() => {
    loadDatabaseState();
  }, []);

  // Sync session state check on startup
  useEffect(() => {
    const checkSession = async () => {
      try {
        const res = await fetch('/api/admin/me');
        if (res.ok) {
          const data = await res.json();
          if (data.status === 'success' && data.user) {
            setIsAdminLoggedIn(true);
            setAdminUser(data.user);
          }
        }
      } catch {
        // ignore
      }
    };
    checkSession();
  }, []);

  // Failed attempts countdown countdown
  useEffect(() => {
    if (lockTime <= Date.now()) return;
    const interval = setInterval(() => {
      const now = Date.now();
      if (now >= lockTime) {
        setLockTime(0);
        setAttemptsCount(0);
        localStorage.removeItem('phlox_admin_attempts');
        localStorage.removeItem('phlox_admin_lock_until');
        setAdminError('');
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [lockTime]);

  // Handle administrator login via server-side POST /api/admin/login
  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdminError('');

    const now = Date.now();
    if (lockTime > now) {
      const mins = Math.ceil((lockTime - now) / 60000);
      setAdminError(lang === 'fr' ? `Connexion bloquée. Réessayez dans ${mins} min.` : `Authentication blocked. Try again in ${mins} min.`);
      return;
    }

    setIsSubmittingLogin(true);

    try {
      const res = await fetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: adminEmail, password: adminPassword })
      });
      const data = await res.json();

      if (res.ok && data.status === 'success') {
        setIsAdminLoggedIn(true);
        setAdminUser({ email: data.email, role: data.role });
        setAdminError('');
        setAdminPassword('');
        setAttemptsCount(0);
        localStorage.removeItem('phlox_admin_attempts');
        localStorage.removeItem('phlox_admin_lock_until');
        loadDatabaseState();
      } else {
        const nextAttempts = attemptsCount + 1;
        setAttemptsCount(nextAttempts);
        localStorage.setItem('phlox_admin_attempts', String(nextAttempts));

        if (nextAttempts >= 5) {
          const blockExpiry = Date.now() + 15 * 60 * 1000;
          setLockTime(blockExpiry);
          localStorage.setItem('phlox_admin_lock_until', String(blockExpiry));
          setAdminError(lang === 'fr' ? 'Trop de tentatives échouées. Compte bloqué pour 15 minutes.' : 'Too many attempts. Account locked for 15 minutes.');
        } else {
          setAdminError(data.message || (lang === 'fr' ? 'Identifiants invalides.' : 'Invalid credentials.'));
        }
      }
    } catch (err) {
      setAdminError(lang === 'fr' ? 'Erreur de communication avec le serveur d\'authentification.' : 'Connection error with authentication server.');
    } finally {
      setIsSubmittingLogin(false);
    }
  };

  const handleAdminLogout = async () => {
    try {
      await fetch('/api/admin/logout', { method: 'POST' });
    } catch {
      // ignore
    }
    setIsAdminLoggedIn(false);
    setAdminUser(null);
  };

  // Status updating on orders
  const handleStatusChange = async (orderId: string, newStatus: Order['status']) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        loadDatabaseState();
        triggerSuccessNotification(lang === 'fr' ? `Commande ${orderId} modifiée` : `Order ${orderId} updated`);
      }
    } catch {
      // local
      const updated = orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o);
      saveOrders(updated);
      setOrders(updated);
      calculateAdminStats(updated);
      triggerSuccessNotification('Statut mis à jour localement');
    }
  };

  // Order deletion
  const handleDeleteOrder = async (orderId: string) => {
    if (!window.confirm(lang === 'fr' ? 'Confirmer la suppression ?' : 'Are you sure you want to delete this order?')) return;
    try {
      const res = await fetch(`/api/admin/orders/${orderId}`, { method: 'DELETE' });
      if (res.ok) {
        loadDatabaseState();
        triggerSuccessNotification(lang === 'fr' ? 'Commande supprimée.' : 'Order deleted.');
      }
    } catch {
      const updated = orders.filter(o => o.id !== orderId);
      saveOrders(updated);
      setOrders(updated);
      calculateAdminStats(updated);
      triggerSuccessNotification('Supprimée localement');
    }
  };

  const triggerSuccessNotification = (msg: string) => {
    setSuccessMsg(msg);
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  // Product drag and drop simulation
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      simulateWebpPhotoCompression(e.dataTransfer.files);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      simulateWebpPhotoCompression(e.target.files);
    }
  };

  const simulateWebpPhotoCompression = (files: FileList) => {
    setIsCompressing(true);
    // Simulate smart automatic WebP compression delay
    setTimeout(() => {
      const newUrls: string[] = [];
      for (let i = 0; i < files.length; i++) {
        // Map to neat mock assets path as simulated WebP compression
        const defaultPhotos = [
          "/src/assets/images/category_earphone_1791055767919.webp",
          "/src/assets/images/category_watch_1791055778925.webp",
          "/src/assets/images/category_laptop_1791055787925.webp",
          "/src/assets/images/category_console_1791055796776.webp"
        ];
        const randomMock = defaultPhotos[Math.floor(Math.random() * defaultPhotos.length)];
        newUrls.push(randomMock);
      }
      const updatedGallery = [...uploadedImages, ...newUrls];
      setUploadedImages(updatedGallery);
      if (updatedGallery.length > 0) {
        setFormImage(updatedGallery[0]); // First image uploaded is designated as primary
      }
      setIsCompressing(false);
    }, 1200);
  };

  // Setup form with editing product info
  const handleEditProductClick = (p: Product) => {
    setEditingProduct(p);
    setIsAddingNew(false);
    setFormErrorMsg('');

    setFormName(p.name);
    setFormPrice(p.price);
    setFormOriginalPrice(p.originalPrice ? p.originalPrice.toString() : '');
    setFormCategory(p.category);
    setFormImage(p.image);
    setFormStock(p.stock);
    setFormIsPopular(p.isPopular);
    setFormIsPromo(p.isPromo);
    setFormPromoText(p.promoText || '');
    setFormDescFr(p.descriptionFr);
    setFormDescEn(p.descriptionEn);
    setFormStatus((p as any).status || 'published');
    setFormIsNew(!!(p as any).isNew);
    setFormOutOfStockMsgFr((p as any).outOfStockMessageFr || '');
    setFormOutOfStockMsgEn((p as any).outOfStockMessageEn || '');

    setUploadedImages(p.gallery || [p.image]);

    if (p.variants && p.variants.length > 0) {
      setVarNameEn(p.variants[0].nameEn);
      setVarNameFr(p.variants[0].nameFr);
      setVarValueInputs(p.variants[0].values.join(', '));
      const supplements = (p.variants[0] as any).priceSupplements || p.variants[0].values.map(() => 0);
      setVarSupplements(supplements.join(', '));
    } else {
      setVarNameEn('Color');
      setVarNameFr('Couleur');
      setVarValueInputs('Noir, Rouge');
      setVarSupplements('0, 0');
    }
  };

  const handleAddNewClick = () => {
    setIsAddingNew(true);
    setEditingProduct(null);
    setFormErrorMsg('');

    setFormName('');
    setFormPrice(25000);
    setFormOriginalPrice('');
    setFormCategory('earphone');
    setFormImage('');
    setFormStock(10);
    setFormIsPopular(false);
    setFormIsPromo(false);
    setFormPromoText('');
    setFormDescFr('');
    setFormDescEn('');
    setFormStatus('published');
    setFormIsNew(true);
    setFormOutOfStockMsgFr('');
    setFormOutOfStockMsgEn('');
    setUploadedImages([]);

    setVarNameFr('Couleur');
    setVarNameEn('Color');
    setVarValueInputs('Noir, Rouge, Argent');
    setVarSupplements('0, 0, 0');
  };

  // Submit product creation/edits
  const handleProductSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormErrorMsg('');

    // Validation: price > 0, stock >= 0
    if (formPrice <= 0) {
      setFormErrorMsg(lang === 'fr' ? 'Le prix doit être strictement supérieur à 0.' : 'Price must be greater than 0.');
      return;
    }
    if (formStock < 0) {
      setFormErrorMsg(lang === 'fr' ? 'Le stock doit être supérieur ou égal à 0.' : 'Stock cannot be negative.');
      return;
    }

    // Photo mandatory to publish
    if (formStatus === 'published' && !formImage) {
      setFormErrorMsg(lang === 'fr' ? 'Une photo est obligatoire pour publier un produit.' : 'A product photo is mandatory to publish.');
      return;
    }

    const cleanValues = varValueInputs.split(',').map(v => v.trim()).filter(Boolean);
    const parsedSupplements = varSupplements.split(',').map(v => Number(v.trim()) || 0);

    const formattedVariants = varNameFr.trim()
      ? [
          {
            nameEn: varNameEn.trim() || 'Option',
            nameFr: varNameFr.trim(),
            values: cleanValues,
            priceSupplements: parsedSupplements
          }
        ]
      : [];

    const productPayload = {
      id: isAddingNew ? `prod-${Date.now()}` : editingProduct?.id || '',
      name: formName.trim(),
      price: Math.max(1, Number(formPrice)),
      originalPrice: formOriginalPrice ? Math.max(1, Number(formOriginalPrice)) : undefined,
      category: formCategory,
      image: formImage.trim() || "/src/assets/images/category_earphone_1791055767919.webp",
      gallery: uploadedImages.length > 0 ? uploadedImages : [formImage.trim() || "/src/assets/images/category_earphone_1791055767919.webp"],
      stock: Math.max(0, Number(formStock)),
      isPopular: formIsPopular,
      isPromo: formIsPromo,
      promoText: formPromoText.trim() || undefined,
      descriptionFr: formDescFr.trim(),
      descriptionEn: formDescEn.trim(),
      status: formStatus,
      isNew: formIsNew,
      outOfStockMessageFr: formOutOfStockMsgFr.trim() || undefined,
      outOfStockMessageEn: formOutOfStockMsgEn.trim() || undefined,
      variants: formattedVariants
    };

    try {
      const res = await fetch('/api/admin/product', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ product: productPayload })
      });
      if (res.ok) {
        triggerSuccessNotification(isAddingNew ? 'Produit créé avec succès.' : 'Produit mis à jour.');
        setIsAddingNew(false);
        setEditingProduct(null);
        loadDatabaseState();
        return;
      }
    } catch {
      // Local fallback
    }

    // Local Storage save fallback
    const currentList = getProducts();
    let updatedList: Product[] = [];
    if (isAddingNew) {
      updatedList = [...currentList, productPayload];
      triggerSuccessNotification('Produit créé localement.');
    } else {
      updatedList = currentList.map(p => p.id === productPayload.id ? productPayload : p);
      triggerSuccessNotification('Produit modifié localement.');
    }

    saveProducts(updatedList);
    setProducts(updatedList);
    setIsAddingNew(false);
    setEditingProduct(null);
  };

  // Duplicate a product
  const handleDuplicateProduct = async (prodId: string) => {
    try {
      const res = await fetch(`/api/admin/product/duplicate/${prodId}`, { method: 'POST' });
      if (res.ok) {
        loadDatabaseState();
        triggerSuccessNotification(lang === 'fr' ? 'Produit dupliqué en brouillon !' : 'Product duplicated as draft!');
      }
    } catch {
      const currentList = getProducts();
      const existing = currentList.find(p => p.id === prodId);
      if (existing) {
        const copy: Product = {
          ...existing,
          id: `prod-${Date.now()}`,
          name: `${existing.name} (Copie)`,
          status: 'draft' as any
        };
        const updated = [...currentList, copy];
        saveProducts(updated);
        setProducts(updated);
        triggerSuccessNotification('Duplication locale en brouillon réussie.');
      }
    }
  };

  // Delete product
  const handleDeleteProduct = async (prodId: string) => {
    if (!window.confirm(lang === 'fr' ? 'Supprimer définitivement ce produit ?' : 'Confirm product deletion?')) return;
    try {
      const res = await fetch(`/api/admin/product/${prodId}`, { method: 'DELETE' });
      if (res.ok) {
        loadDatabaseState();
        triggerSuccessNotification(lang === 'fr' ? 'Produit supprimé.' : 'Product deleted.');
      }
    } catch {
      const currentList = getProducts();
      const filtered = currentList.filter(p => p.id !== prodId);
      saveProducts(filtered);
      setProducts(filtered);
      triggerSuccessNotification('Supprimé localement.');
    }
  };

  // CSV Import parser helper
  const handleCsvImportSubmit = () => {
    if (!csvText.trim()) return;
    const lines = csvText.split('\n').map(l => l.trim()).filter(Boolean);
    if (lines.length <= 1) return;

    // Expected format: Name,Category,Price,Stock,DescFR,DescEN
    const parsed: Product[] = [];

    for (let i = 1; i < lines.length; i++) {
      const cells = lines[i].split(';').map(c => c.trim().replace(/^"|"$/g, ''));
      if (cells.length < 4) continue;

      const name = cells[0];
      const category = cells[1];
      const price = Number(cells[2]) || 15000;
      const stock = Number(cells[3]) || 10;
      const descFr = cells[4] || '';
      const descEn = cells[5] || '';

      parsed.push({
        id: `csv-${Date.now()}-${i}`,
        name,
        category,
        price,
        stock,
        descriptionFr: descFr,
        descriptionEn: descEn,
        image: "/src/assets/images/category_earphone_1791055767919.webp",
        gallery: ["/src/assets/images/category_earphone_1791055767919.webp"],
        isPopular: false,
        isPromo: false,
        status: 'draft', // bulk uploads default to draft safety
        variants: []
      });
    }

    if (parsed.length > 0) {
      // Batch save
      const localCurrent = getProducts();
      const nextList = [...localCurrent, ...parsed];
      saveProducts(nextList);
      setProducts(nextList);

      triggerSuccessNotification(`${parsed.length} produits importés en brouillon.`);
      setCsvText('');
      setShowCsvImport(false);
    }
  };

  // Announcements save (owner/manager)
  const handleAnnouncementsSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      topBanner: {
        textFr: bannerTextFr.trim(),
        textEn: bannerTextEn.trim(),
        color: bannerColor,
        link: bannerLink.trim(),
        startDate: bannerStart ? new Date(bannerStart).toISOString() : new Date().toISOString(),
        endDate: bannerEnd ? new Date(bannerEnd).toISOString() : new Date().toISOString(),
        enabled: bannerEnabled
      },
      promoPopup: {
        textFr: popupTextFr.trim(),
        textEn: popupTextEn.trim(),
        image: popupImage.trim() || "/src/assets/images/category_watch_1791055778925.webp",
        enabled: popupEnabled
      },
      heroBanner: {
        title: heroTitle.trim(),
        subtitle: heroSubtitle.trim(),
        buttonText: heroBtnText.trim() || "Découvrir",
        buttonLink: heroBtnLink.trim() || "categories",
        image: heroImage.trim() || "/src/assets/images/hero_headphone_1791055757059.webp"
      }
    };

    try {
      const res = await fetch('/api/admin/announcements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ announcements: payload })
      });
      if (res.ok) {
        loadDatabaseState();
        triggerSuccessNotification(lang === 'fr' ? 'Annonces enregistrées !' : 'Announcements updated!');
      }
    } catch {
      triggerSuccessNotification('Erreur réseau d\'enregistrement des annonces.');
    }
  };

  // Campaigns creator (owner only)
  const handleCampaignSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (adminUser?.role !== 'owner') {
      alert(lang === 'fr' ? 'Droits insuffisants. Seul le Propriétaire (Owner) peut gérer les campagnes.' : 'Access Denied. Campaign management requires Owner role.');
      return;
    }

    const newCampaign: Campaign = {
      id: `promo-${Date.now()}`,
      name: campName.trim(),
      startDate: campStart ? new Date(campStart).toISOString() : new Date().toISOString(),
      endDate: campEnd ? new Date(campEnd).toISOString() : new Date().toISOString(),
      discountType: campDiscountType,
      discountValue: Math.max(0, Number(campDiscountValue)),
      targetProducts: campTargetProducts,
      targetCategories: campTargetCategories,
      limitedStock: campLimitedStock ? Number(campLimitedStock) : undefined,
      stockCount: campLimitedStock ? Number(campLimitedStock) : undefined,
      limitPerClient: campLimitPerClient ? Number(campLimitPerClient) : undefined,
      salesCount: 0,
      salesRevenue: 0
    };

    const nextCampaigns = [...campaigns, newCampaign];

    try {
      const res = await fetch('/api/admin/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promotions: nextCampaigns })
      });
      if (res.ok) {
        setCampName('');
        setCampDiscountValue(0);
        setCampLimitedStock('');
        setCampLimitPerClient('');
        loadDatabaseState();
        triggerSuccessNotification(lang === 'fr' ? 'Campagne promotionnelle créée.' : 'Campaign added.');
      } else {
        const errorData = await res.json();
        alert(errorData.message || 'Error saving campaign');
      }
    } catch {
      alert('Network error saving campaign');
    }
  };

  const handleDeleteCampaign = async (id: string) => {
    if (adminUser?.role !== 'owner') {
      alert(lang === 'fr' ? 'Droits insuffisants.' : 'Insufficient rights.');
      return;
    }
    const nextCampaigns = campaigns.filter(c => c.id !== id);
    try {
      const res = await fetch('/api/admin/promotions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promotions: nextCampaigns })
      });
      if (res.ok) {
        loadDatabaseState();
        triggerSuccessNotification('Campagne supprimée.');
      }
    } catch {
      alert('Error communicating with server.');
    }
  };

  // Promo Codes creators
  const handlePromoCodeSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (adminUser?.role !== 'owner') {
      alert('Droits Owner requis.');
      return;
    }

    const newCode: PromoCode = {
      code: promoCodeName.trim().toUpperCase(),
      discountType: promoCodeDiscountType,
      discountValue: Math.max(0, Number(promoCodeValue)),
      expiryDate: promoCodeExpiry ? new Date(promoCodeExpiry).toISOString() : new Date().toISOString(),
      maxUses: Number(promoCodeMaxUses) || 100,
      usedCount: 0,
      minPurchase: Number(promoCodeMinPurchase) || 0
    };

    const nextCodes = [...promoCodes, newCode];

    try {
      const res = await fetch('/api/admin/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promoCodes: nextCodes })
      });
      if (res.ok) {
        setPromoCodeName('');
        setPromoCodeValue(0);
        setPromoCodeMinPurchase(0);
        loadDatabaseState();
        triggerSuccessNotification('Code promo ajouté.');
      }
    } catch {
      alert('Network error adding promo code.');
    }
  };

  const handleDeletePromoCode = async (code: string) => {
    if (adminUser?.role !== 'owner') return;
    const nextCodes = promoCodes.filter(c => c.code !== code);
    try {
      await fetch('/api/admin/promo-codes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ promoCodes: nextCodes })
      });
      loadDatabaseState();
      triggerSuccessNotification('Code promo effacé.');
    } catch {
      // ignore
    }
  };

  // Copier pour WhatsApp preview
  const handleCopyWhatsAppText = () => {
    const text = [
      `📢 ANNONCE PHLOX TOGO 📢`,
      lang === 'fr' ? bannerTextFr : bannerTextEn,
      `👉 Découvrez sur : ${bannerLink || 'https://phlox-togo.com'}`
    ].join('\n');
    navigator.clipboard.writeText(text);
    triggerSuccessNotification('Texte copié !');
  };

  // Filter orders
  const filteredOrders = orders.filter((o) => {
    const matchesStatus = orderStatusFilter === 'all' || o.status === orderStatusFilter;
    const matchesSearch =
      orderSearchQuery === '' ||
      o.id.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      o.customerName.toLowerCase().includes(orderSearchQuery.toLowerCase()) ||
      o.customerPhone.includes(orderSearchQuery) ||
      o.customerCity.toLowerCase().includes(orderSearchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Client single order query search execution
  const handlePublicOrderQuerySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearchError(null);
    setMatchedOrder(null);

    const cleanInputId = searchOrderId.trim().toUpperCase();
    const digitsOnlyInput = searchPhone.replace(/\D/g, '');

    if (!cleanInputId || !digitsOnlyInput) {
      setSearchError(lang === 'fr' ? 'Veuillez remplir tous les champs.' : 'Please fill in all fields.');
      return;
    }

    const found = orders.find((o) => {
      const isIdMatch = o.id.trim().toUpperCase() === cleanInputId;
      const orderPhoneDigits = (o.customerPhone || '').replace(/\D/g, '');
      const orderDebitPhoneDigits = (o.debitPhone || '').replace(/\D/g, '');

      const isPhoneMatch =
        orderPhoneDigits.includes(digitsOnlyInput) ||
        digitsOnlyInput.includes(orderPhoneDigits) ||
        orderDebitPhoneDigits.includes(digitsOnlyInput) ||
        digitsOnlyInput.includes(orderDebitPhoneDigits);

      return isIdMatch && isPhoneMatch;
    });

    if (found) {
      setMatchedOrder(found);
    } else {
      setSearchError(
        lang === 'fr'
          ? 'Aucune commande ne correspond à ces identifiants. Veuillez vérifier la référence et le numéro de téléphone.'
          : 'No matching order found. Please verify the order reference and phone number.'
      );
    }
  };

  return (
    <div className="space-y-6 animate-fadeIn text-[#1D1D1F]">
      {/* Tab Switcher */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 bg-white border border-[#AAAAAA]/30 p-1.5 rounded-full max-w-2xl">
        <button
          type="button"
          onClick={() => setActiveTab('tracker')}
          className={`py-2.5 px-3 text-xs font-bold uppercase tracking-wider rounded-full transition-colors cursor-pointer text-center truncate ${
            activeTab === 'tracker'
              ? 'bg-[#007AFF] text-white'
              : 'text-[#6E6E73] hover:text-[#1D1D1F]'
          }`}
        >
          {lang === 'fr' ? 'Mes commandes' : 'My Orders'}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('faq')}
          className={`py-2.5 px-3 text-xs font-bold uppercase tracking-wider rounded-full transition-colors cursor-pointer text-center truncate ${
            activeTab === 'faq'
              ? 'bg-[#007AFF] text-white'
              : 'text-[#6E6E73] hover:text-[#1D1D1F]'
          }`}
        >
          {lang === 'fr' ? 'FAQ & Aide' : 'FAQ & Support'}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('affiliation')}
          className={`py-2.5 px-3 text-xs font-bold uppercase tracking-wider rounded-full transition-colors cursor-pointer text-center truncate flex items-center justify-center gap-1.5 ${
            activeTab === 'affiliation'
              ? 'bg-[#007AFF] text-white'
              : 'text-[#6E6E73] hover:text-[#1D1D1F]'
          }`}
        >
          <Sparkles size={13} className={activeTab === 'affiliation' ? 'text-white' : 'text-[#007AFF]'} />
          <span>{lang === 'fr' ? 'Affiliation' : 'Affiliates'}</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('admin')}
          className={`py-2.5 px-3 text-xs font-bold uppercase tracking-wider rounded-full transition-colors cursor-pointer text-center truncate ${
            activeTab === 'admin'
              ? 'bg-[#007AFF] text-white'
              : 'text-[#6E6E73] hover:text-[#1D1D1F]'
          }`}
        >
          Admin
        </button>
      </div>

      {successMsg && (
        <div className="p-3.5 bg-[#34C759]/15 border border-[#34C759]/30 text-[#34C759] rounded-full text-xs font-bold text-center">
          {successMsg}
        </div>
      )}

      {/* PUBLIC SINGLE ORDER QUERY FORM */}
      {activeTab === 'tracker' && (
        <div className="space-y-6 animate-fadeIn max-w-2xl mx-auto">
          <div>
            <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight text-[#1D1D1F]">
              {lang === 'fr' ? 'Suivre ma commande' : 'Track My Order'}
            </h2>
            <p className="text-xs text-[#6E6E73] mt-1">
              {lang === 'fr'
                ? 'Saisissez vos identifiants pour afficher le statut en temps réel.'
                : 'Enter your identifiers to fetch real-time shipping status.'}
            </p>
          </div>

          <form onSubmit={handlePublicOrderQuerySubmit} className="bg-white border border-[#AAAAAA]/30 rounded-[28px] p-6 space-y-4 text-left shadow-xs">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#6E6E73] uppercase tracking-wider">
                  {lang === 'fr' ? 'Référence Commande' : 'Order Reference'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="PHX-XXXX"
                  value={searchOrderId}
                  onChange={(e) => setSearchOrderId(e.target.value)}
                  className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-sm font-semibold px-4 py-3 rounded-full border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-[#6E6E73] uppercase tracking-wider">
                  {lang === 'fr' ? 'Numéro de Téléphone' : 'Phone Number'}
                </label>
                <input
                  type="text"
                  required
                  placeholder="+228 XX XX XX XX"
                  value={searchPhone}
                  onChange={(e) => setSearchPhone(e.target.value)}
                  className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-sm font-semibold px-4 py-3 rounded-full border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden"
                />
              </div>
            </div>

            {searchError && (
              <p className="text-xs text-[#FF3B30] font-bold text-center">{searchError}</p>
            )}

            <button
              type="submit"
              className="w-full py-3.5 bg-[#007AFF] hover:bg-[#0071EB] text-white font-bold text-xs uppercase tracking-wider rounded-full cursor-pointer transition-colors"
            >
              {lang === 'fr' ? 'Rechercher la commande' : 'Search Order'}
            </button>
          </form>

          {/* SINGLE MATCHED PUBLIC ORDER CARD */}
          {matchedOrder && (
            <div className="bg-white border border-[#AAAAAA]/30 rounded-[28px] p-6 text-[#1D1D1F] space-y-4 animate-fadeIn text-left shadow-xs">
              <div className="flex justify-between items-center border-b border-[#AAAAAA]/20 pb-3">
                <div>
                  <span className="text-[10px] text-[#6E6E73] font-bold uppercase block">
                    {lang === 'fr' ? 'RÉFÉRENCE' : 'ORDER ID'}
                  </span>
                  <span className="text-lg font-black text-[#007AFF] font-mono">{matchedOrder.id}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] text-[#6E6E73] font-bold uppercase block">
                    {lang === 'fr' ? 'STATUT' : 'STATUS'}
                  </span>
                  <span className={`inline-block text-[10px] uppercase font-bold px-3 py-1 rounded-full ${
                    matchedOrder.status === 'paid'
                      ? 'bg-[#34C759]/15 text-[#34C759]'
                      : matchedOrder.status === 'pending'
                      ? 'bg-[#FF9500]/15 text-[#FF9500]'
                      : 'bg-[#FF3B30]/15 text-[#FF3B30]'
                  }`}>
                    {matchedOrder.status}
                  </span>
                </div>
              </div>

              {/* Order content detail */}
              <div className="space-y-3">
                <div className="space-y-1">
                  <span className="text-[10px] text-[#6E6E73] font-bold uppercase block">{lang === 'fr' ? 'CLIENT' : 'CLIENT'}</span>
                  <div className="text-sm font-semibold">{matchedOrder.customerName} ({matchedOrder.customerPhone})</div>
                  <div className="text-xs text-[#6E6E73]">{matchedOrder.customerAddress}, {matchedOrder.customerCity}</div>
                </div>

                <div className="space-y-2 border-t border-[#AAAAAA]/20 pt-3">
                  <span className="text-[10px] text-[#6E6E73] font-bold uppercase block">{lang === 'fr' ? 'ARTICLES COMMANDÉS' : 'ITEMS'}</span>
                  {matchedOrder.items.map((item, idx) => (
                    <div key={idx} className="flex justify-between items-center text-xs">
                      <div>
                        <span className="font-bold text-[#1D1D1F]">{item.productName}</span>
                        {item.selectedVariants && Object.keys(item.selectedVariants).length > 0 && (
                          <span className="text-[#6E6E73] block text-[10px]">
                            ({Object.entries(item.selectedVariants).map(([k, v]) => `${k}: ${v}`).join(', ')})
                          </span>
                        )}
                      </div>
                      <span className="font-mono tabular-nums text-[#6E6E73]">
                        {item.quantity} × {formatPrice(item.price)}
                      </span>
                    </div>
                  ))}
                </div>

                <div className="flex justify-between items-center border-t border-[#AAAAAA]/20 pt-3 text-sm">
                  <span className="font-bold text-[#6E6E73]">{lang === 'fr' ? 'TOTAL PAYÉ' : 'TOTAL PAID'}</span>
                  <span className="text-base font-black text-[#1D1D1F] font-mono tabular-nums">
                    {formatPrice(matchedOrder.totalAmount)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* FAQ Accordion Help Panel */}
      {activeTab === 'faq' && (
        <div className="space-y-6 animate-fadeIn max-w-3xl mx-auto">
          <div className="text-center space-y-1">
            <span className="text-xs font-black text-[#007AFF] uppercase tracking-wider">{lang === 'fr' ? 'Besoin d\'aide ?' : 'Need Support?'}</span>
            <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight text-[#1D1D1F]">
              {lang === 'fr' ? 'FAQ Livraison & Mobile Money au Togo' : 'Support FAQ'}
            </h2>
          </div>

          <div className="space-y-3">
            {[
              {
                id: 'faq-1',
                qFr: 'Quels sont les moyens de paiement acceptés au Togo ?',
                qEn: 'What payment methods do you accept in Togo?',
                aFr: 'Nous acceptons T-Money (de Togocom) et Flooz / Moov Money (de Moov Africa). Le paiement se fait de manière sécurisée par un message de confirmation de validation USSD envoyé directement sur votre téléphone.',
                aEn: 'We accept T-Money (Togocom) and Flooz Money (Moov Africa). Payment triggers a direct USSD confirmation request on your mobile device.'
              },
              {
                id: 'faq-2',
                qFr: 'Je suis bloqué à l\'étape du téléphone, que faire ?',
                qEn: 'I am stuck at the telephone verification step, what should I do?',
                aFr: '1. Vérifiez que votre téléphone est allumé et possède une bonne couverture réseau.\n2. Assurez-vous d\'avoir un solde suffisant sur votre compte Mobile Money.\n3. Si la fenêtre de confirmation n\'apparaît pas, réessayez ou changez de numéro.',
                aEn: '1. Verify your mobile network coverage.\n2. Ensure your Mobile Money balance is sufficient.\n3. If USSD prompt fails to appear, try re-sending or use another active phone number.'
              },
              {
                id: 'faq-3',
                qFr: 'Quels sont les tarifs et délais de livraison par ville ?',
                qEn: 'What are delivery rates and times per city?',
                aFr: 'Lomé: 1 000 FCFA (24h express) | Kpalimé & Atakpamé: 2 500 FCFA (48h) | Sokodé: 3 000 FCFA (48-72h) | Kara: 3 500 FCFA (48-72h) | Dapaong: 4 000 FCFA (72h). Envois sécurisés par colis.',
                aEn: 'Lomé: 1 000 FCFA (24h) | Kpalimé & Atakpamé: 2 500 FCFA (48h) | Sokodé: 3 000 FCFA (48h-72h) | Kara: 3 500 FCFA | Dapaong: 4 000 FCFA.'
              }
            ].map((faq) => {
              const isOpen = openFaqId === faq.id;
              return (
                <div key={faq.id} className="bg-white border border-[#AAAAAA]/30 rounded-[28px] overflow-hidden transition-all text-left shadow-xs">
                  <button
                    onClick={() => setOpenFaqId(isOpen ? null : faq.id)}
                    className="w-full p-5 flex justify-between items-center font-bold text-sm text-[#1D1D1F] focus:outline-hidden hover:bg-[#F5F5F7] shrink-0"
                  >
                    <span>{lang === 'fr' ? faq.qFr : faq.qEn}</span>
                    {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                  {isOpen && (
                    <div className="p-5 pt-0 text-xs text-[#6E6E73] whitespace-pre-line border-t border-[#AAAAAA]/20 bg-[#F5F5F7] leading-relaxed">
                      {lang === 'fr' ? faq.aFr : faq.aEn}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* PUBLIC AFFILIATE PROGRAM & DASHBOARD */}
      {activeTab === 'affiliation' && (
        <AffiliateSection lang={lang} />
      )}

      {/* ADMIN PANEL SECURE PAGE */}
      {activeTab === 'admin' && (
        <div className="space-y-6">
          {!isAdminLoggedIn ? (
            /* ADMIN LOGIN SCREEN */
            <div className="bg-white border border-[#AAAAAA]/30 p-6 sm:p-10 rounded-[28px] max-w-md mx-auto text-center space-y-5 text-[#1D1D1F] shadow-xs">
              <div className="w-16 h-16 bg-[#007AFF]/10 text-[#007AFF] rounded-full flex items-center justify-center mx-auto">
                <Lock size={28} />
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black uppercase tracking-wider font-mono">
                  {lang === 'fr' ? 'Accès Administrateur' : 'Admin Panel Access'}
                </h3>
                <p className="text-xs text-[#6E6E73]">
                  {lang === 'fr'
                    ? 'Identifiez-vous à l\'aide de votre adresse e-mail et de votre mot de passe.'
                    : 'Please enter your email credentials to login.'}
                </p>
              </div>

              <form onSubmit={handleAdminLogin} className="space-y-4 text-left">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#6E6E73] uppercase tracking-wider">E-mail</label>
                  <input
                    type="email"
                    required
                    placeholder="owner@phlox.com"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-sm font-semibold px-4 py-3 rounded-full border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-[#6E6E73] uppercase tracking-wider">{lang === 'fr' ? 'Mot de passe' : 'Password'}</label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-sm font-semibold px-4 py-3 rounded-full border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden pr-12"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-[#6E6E73] hover:text-[#1D1D1F] cursor-pointer"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {adminError && (
                  <p className="text-xs text-[#FF3B30] text-center font-bold">{adminError}</p>
                )}

                <button
                  type="submit"
                  disabled={isSubmittingLogin}
                  className="w-full py-3.5 bg-[#007AFF] hover:bg-[#0071EB] text-white font-bold text-xs uppercase tracking-wider rounded-full transition-colors cursor-pointer disabled:opacity-60"
                >
                  {isSubmittingLogin ? '...' : (lang === 'fr' ? 'Connexion sécurisée' : 'Login Secure')}
                </button>
              </form>
            </div>
          ) : (
            /* ADMIN LOGGED-IN VIEW PANEL */
            <div className="space-y-6 text-left">
              {/* Profile Top Bar */}
              <div className="bg-white border border-[#AAAAAA]/30 rounded-[28px] p-5 sm:p-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 text-[#1D1D1F] shadow-xs">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-[#34C759] animate-pulse" />
                    <h3 className="text-base sm:text-lg font-black uppercase tracking-tight">{t.adminTitle}</h3>
                  </div>
                  <div className="flex items-center gap-1.5 text-xs text-[#6E6E73] font-semibold font-mono">
                    <ShieldCheck size={13} className="text-[#007AFF]" />
                    <span>{adminUser?.email}</span>
                    <span className="px-2.5 py-0.5 bg-[#007AFF]/10 text-[#007AFF] text-[9px] font-black rounded-full uppercase tracking-widest">{adminUser?.role}</span>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2 w-full sm:w-auto">
                  <button
                    onClick={handleAdminLogout}
                    className="px-5 py-2.5 bg-white border border-[#AAAAAA] hover:bg-[#F5F5F7] text-[#1D1D1F] font-bold text-xs uppercase tracking-wider rounded-full transition-colors cursor-pointer ml-auto sm:ml-0"
                  >
                    {lang === 'fr' ? 'Déconnexion' : 'Logout'}
                  </button>
                </div>
              </div>

              {/* STATS ROW OVERVIEW */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="bg-white border border-[#AAAAAA]/30 p-5 rounded-[28px] flex items-center gap-3.5 text-[#1D1D1F] shadow-xs">
                  <div className="p-3 bg-[#007AFF]/10 text-[#007AFF] rounded-full shrink-0">
                    <TrendingUp size={22} />
                  </div>
                  <div>
                    <span className="block text-[10px] font-black uppercase text-[#6E6E73] tracking-wider">{t.statsRevenue}</span>
                    <span className="text-lg font-black text-[#1D1D1F] font-mono tabular-nums">{formatPrice(stats.totalRevenue)}</span>
                  </div>
                </div>

                <div className="bg-white border border-[#AAAAAA]/30 p-5 rounded-[28px] flex items-center gap-3.5 text-[#1D1D1F] shadow-xs">
                  <div className="p-3 bg-[#007AFF]/10 text-[#007AFF] rounded-full shrink-0">
                    <ShoppingCart size={22} />
                  </div>
                  <div>
                    <span className="block text-[10px] font-black uppercase text-[#6E6E73] tracking-wider">{t.statsOrders}</span>
                    <span className="text-lg font-black text-[#1D1D1F] font-mono tabular-nums">{stats.ordersCount}</span>
                  </div>
                </div>

                <div className="bg-white border border-[#AAAAAA]/30 p-5 rounded-[28px] flex items-center gap-3.5 text-[#1D1D1F] shadow-xs">
                  <div className="p-3 bg-[#007AFF]/10 text-[#007AFF] rounded-full shrink-0">
                    <PackageOpen size={22} />
                  </div>
                  <div>
                    <span className="block text-[10px] font-black uppercase text-[#6E6E73] tracking-wider">{t.statsItems}</span>
                    <span className="text-lg font-black text-[#1D1D1F] font-mono tabular-nums">{stats.totalItemsSold}</span>
                  </div>
                </div>
              </div>

              {/* SALES CHART */}
              <div className="bg-white border border-[#AAAAAA]/30 rounded-[28px] p-5 shadow-xs">
                <CategorySalesChart orders={orders} products={products} lang={lang} />
              </div>

              {/* ADMIN INNER SUB-TAB NAVIGATION */}
              <div className="flex flex-wrap gap-1.5 pb-2">
                {[
                  { id: 'orders', label: lang === 'fr' ? 'Commandes' : 'Orders', icon: ClipboardList, role: 'manager' },
                  { id: 'affiliates', label: lang === 'fr' ? 'Affiliation' : 'Affiliates', icon: Users, role: 'manager' },
                  { id: 'payment-logs', label: lang === 'fr' ? 'Journal paiements' : 'Payment Logs', icon: CreditCard, role: 'manager' },
                  { id: 'products', label: lang === 'fr' ? 'Produits' : 'Products', icon: Layers, role: 'manager' },
                  { id: 'announcements', label: lang === 'fr' ? 'Annonces' : 'Announcements', icon: Sparkles, role: 'manager' },
                  { id: 'promotions', label: lang === 'fr' ? 'Black Friday' : 'BF Promotions', icon: Percent, role: 'owner' },
                  { id: 'promo-codes', label: lang === 'fr' ? 'Codes promo' : 'Promo Codes', icon: Tag, role: 'owner' },
                  { id: 'audit-logs', label: lang === 'fr' ? 'Logs d\'audit' : 'Audit Logs', icon: History, role: 'owner' }
                ].map((tab) => {
                  const Icon = tab.icon;
                  const isActive = adminSubTab === tab.id;
                  const isLocked = tab.role === 'owner' && adminUser?.role === 'manager';

                  return (
                    <button
                      key={tab.id}
                      onClick={() => !isLocked && setAdminSubTab(tab.id as any)}
                      className={`px-4 py-2 rounded-full text-xs font-semibold uppercase tracking-wider cursor-pointer flex items-center gap-1.5 transition-all ${
                        isActive
                          ? 'bg-[#007AFF] text-white shadow-xs'
                          : isLocked
                          ? 'bg-[#AAAAAA]/15 text-[#AAAAAA] cursor-not-allowed line-through'
                          : 'bg-white border border-[#AAAAAA]/30 text-[#6E6E73] hover:text-[#1D1D1F] hover:bg-[#F5F5F7]'
                      }`}
                      title={isLocked ? "Permissions Propriétaire (Owner) requises" : ""}
                    >
                      <Icon size={14} />
                      <span>{tab.label}</span>
                      {isLocked && <Lock size={11} className="text-[#FF3B30]" />}
                    </button>
                  );
                })}
              </div>

              {/* ADMIN VIEW CONTROLLER CORES */}

              {/* 1. ORDERS MANAGER CORE */}
              {adminSubTab === 'orders' && (
                <div className="space-y-4 animate-fadeIn">
                  {/* Filters bar */}
                  <div className="flex flex-col sm:flex-row justify-between gap-3 bg-white border border-[#AAAAAA]/30 p-4 rounded-2xl shadow-xs">
                    <div className="relative w-full sm:max-w-xs">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#6E6E73]" size={16} />
                      <input
                        type="text"
                        placeholder="Rechercher..."
                        value={orderSearchQuery}
                        onChange={(e) => setOrderSearchQuery(e.target.value)}
                        className="w-full bg-[#F5F5F7] text-[#1D1D1F] placeholder:text-[#6E6E73] text-xs px-3 py-2 pl-9 rounded-xl border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden"
                      />
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#6E6E73]">Statut:</span>
                      <select
                        value={orderStatusFilter}
                        onChange={(e) => setOrderStatusFilter(e.target.value as any)}
                        className="bg-[#F5F5F7] text-[#1D1D1F] text-xs font-semibold px-3 py-2 rounded-xl border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden"
                      >
                        <option value="all">Tous</option>
                        <option value="pending">En attente (Pending)</option>
                        <option value="paid">Payé (Paid)</option>
                        <option value="completed">Terminé (Completed)</option>
                        <option value="cancelled">Annulé</option>
                      </select>
                    </div>
                  </div>

                  {/* Orders list */}
                  {filteredOrders.length === 0 ? (
                    <div className="text-center py-10 bg-white border border-dashed border-[#AAAAAA]/30 rounded-[28px]">
                      <ClipboardList className="mx-auto text-[#AAAAAA] mb-2" size={40} />
                      <p className="text-xs font-bold text-[#6E6E73]">Aucune commande ne correspond aux filtres.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredOrders.map((order) => (
                        <div key={order.id} className="bg-white border border-[#AAAAAA]/30 rounded-[28px] p-5 space-y-3 flex flex-col justify-between text-left shadow-xs">
                          <div className="flex justify-between items-start gap-2">
                            <div>
                              <span className="text-lg font-black text-[#1D1D1F] font-mono">{order.id}</span>
                              <span className="text-[10px] text-[#6E6E73] block font-mono">{new Date(order.createdAt).toLocaleString()}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <select
                                value={order.status}
                                onChange={(e) => handleStatusChange(order.id, e.target.value as any)}
                                className={`text-[10px] font-black uppercase px-2.5 py-1.5 rounded-full border border-[#AAAAAA]/20 focus:outline-hidden ${
                                  order.status === 'paid' || order.status === 'completed'
                                    ? 'bg-[#34C759]/15 text-[#34C759]'
                                    : order.status === 'pending'
                                    ? 'bg-[#FF9500]/15 text-[#FF9500]'
                                    : 'bg-[#FF3B30]/15 text-[#FF3B30]'
                                }`}
                              >
                                <option value="pending">PENDING</option>
                                <option value="paid">PAID</option>
                                <option value="completed">COMPLETED</option>
                                <option value="cancelled">CANCELLED</option>
                              </select>
                              <button
                                onClick={() => handleDeleteOrder(order.id)}
                                className="p-1.5 text-[#6E6E73] hover:text-[#FF3B30] rounded-full hover:bg-[#FF3B30]/10 cursor-pointer"
                                title="Supprimer"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          </div>

                          {/* Client Detail */}
                          <div className="text-xs space-y-1.5">
                            <div>
                              <strong className="text-[#1D1D1F]">{order.customerName}</strong>
                              <span className="text-[#6E6E73] block">{order.customerPhone} (Débit: {order.debitPhone})</span>
                            </div>
                            <div className="text-[#6E6E73] bg-[#F5F5F7] p-2.5 rounded-xl border border-[#AAAAAA]/20">
                              {order.customerAddress}, {order.customerCity}
                            </div>
                          </div>

                          {/* Items */}
                          <div className="space-y-1 border-t border-[#AAAAAA]/20 pt-3 text-xs">
                            {order.items.map((item, id) => (
                              <div key={id} className="flex justify-between text-[#6E6E73]">
                                <span className="font-semibold text-[#1D1D1F]">{item.productName} × {item.quantity}</span>
                                <span className="font-mono">{formatPrice(item.price * item.quantity)}</span>
                              </div>
                            ))}
                            {order.discountAmountApplied && order.discountAmountApplied > 0 ? (
                              <div className="flex justify-between text-[#007AFF] text-[11px] font-bold">
                                <span>Code promo ({order.promoCodeApplied}) :</span>
                                <span className="font-mono">-{formatPrice(order.discountAmountApplied)}</span>
                              </div>
                            ) : null}
                          </div>

                          <div className="flex justify-between items-center border-t border-[#AAAAAA]/20 pt-3">
                            <span className="text-xs font-bold text-[#6E6E73]">Montant total:</span>
                            <span className="text-base font-extrabold text-[#007AFF] font-mono">{formatPrice(order.totalAmount)}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* 2. PRODUCTS MANAGER CORE */}
              {adminSubTab === 'products' && (
                <div className="space-y-6 animate-fadeIn">
                  {/* Top Products Actions */}
                  <div className="flex justify-between items-center bg-white border border-[#AAAAAA]/30 p-4 rounded-2xl shadow-xs">
                    <span className="text-xs font-bold text-[#6E6E73]">{products.length} produits enregistrés</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowCsvImport(!showCsvImport)}
                        className="px-3.5 py-2 bg-white border border-[#AAAAAA] hover:bg-[#F5F5F7] text-[#1D1D1F] font-semibold text-xs rounded-full cursor-pointer flex items-center gap-1.5"
                      >
                        <FileText size={13} />
                        <span>{lang === 'fr' ? 'Import CSV' : 'CSV Import'}</span>
                      </button>
                      <button
                        onClick={handleAddNewClick}
                        className="px-3.5 py-2 bg-[#007AFF] hover:bg-[#0071EB] text-white font-semibold text-xs rounded-full cursor-pointer flex items-center gap-1.5 shadow-xs"
                      >
                        <Plus size={13} />
                        <span>{lang === 'fr' ? 'Nouveau' : 'New Product'}</span>
                      </button>
                    </div>
                  </div>

                  {/* CSV import panel expansion */}
                  {showCsvImport && (
                    <div className="bg-white border border-[#AAAAAA]/30 p-5 rounded-[28px] text-[#1D1D1F] space-y-4 animate-fadeIn shadow-xs">
                      <h4 className="text-xs font-black uppercase tracking-wider text-[#1D1D1F]">{lang === 'fr' ? 'Importer des produits par CSV' : 'Bulk Product CSV Import'}</h4>
                      <p className="text-[11px] text-[#6E6E73]">
                        {lang === 'fr' 
                          ? 'Saisissez vos lignes au format suivant (une par ligne) : Nom ; Catégorie ; Prix ; Stock ; DescriptionFR ; DescriptionEN'
                          : 'Paste values (one product per line): Name;Category;Price;Stock;DescFR;DescEN'}
                      </p>
                      <textarea
                        rows={4}
                        placeholder={`Exemple:\nCasque Phlox ; earphone ; 45000 ; 12 ; Son studio ; Studio sound`}
                        value={csvText}
                        onChange={(e) => setCsvText(e.target.value)}
                        className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-xs font-mono p-3 rounded-xl border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden"
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setShowCsvImport(false)}
                          className="px-3.5 py-1.5 bg-white border border-[#AAAAAA] hover:bg-[#F5F5F7] text-[#1D1D1F] font-semibold text-xs rounded-full cursor-pointer"
                        >
                          Annuler
                        </button>
                        <button
                          onClick={handleCsvImportSubmit}
                          className="px-3.5 py-1.5 bg-[#007AFF] hover:bg-[#0071EB] text-white font-semibold text-xs rounded-full cursor-pointer shadow-xs"
                        >
                          Lancer l'import
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Product Guided Form Editor Box */}
                  {(isAddingNew || editingProduct) && (
                    <form onSubmit={handleProductSubmit} className="bg-white border border-[#AAAAAA]/30 rounded-[28px] p-5 sm:p-7 space-y-5 animate-fadeIn shadow-xs">
                      <h4 className="text-base sm:text-lg font-extrabold text-[#1D1D1F] border-b border-[#AAAAAA]/20 pb-2">
                        {isAddingNew ? (lang === 'fr' ? 'Ajouter un Produit' : 'New Product') : (lang === 'fr' ? 'Modifier le Produit' : 'Edit Product')}
                      </h4>

                      {formErrorMsg && (
                        <div className="p-3 bg-[#FF3B30]/15 border border-[#FF3B30]/30 text-[#FF3B30] text-xs font-bold rounded-xl text-center">
                          {formErrorMsg}
                        </div>
                      )}

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-[#6E6E73]">Nom du produit</label>
                          <input
                            type="text"
                            required
                            value={formName}
                            onChange={(e) => setFormName(e.target.value)}
                            className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-xs font-semibold px-3 py-2.5 rounded-xl border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-[#6E6E73]">Catégorie</label>
                          <select
                            value={formCategory}
                            onChange={(e) => setFormCategory(e.target.value)}
                            className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-xs font-semibold px-3 py-2.5 rounded-xl border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden"
                          >
                            {brandConfig.categories.map(c => (
                              <option key={c.id} value={c.id}>{lang === 'fr' ? c.frName : c.enName}</option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-[#6E6E73]">Prix (FCFA)</label>
                          <input
                            type="number"
                            required
                            value={formPrice}
                            onChange={(e) => setFormPrice(Number(e.target.value))}
                            className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-xs font-semibold px-3 py-2.5 rounded-xl border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-[#6E6E73]">Prix d'origine barré (Optionnel)</label>
                          <input
                            type="text"
                            value={formOriginalPrice}
                            onChange={(e) => setFormOriginalPrice(e.target.value)}
                            className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-xs font-semibold px-3 py-2.5 rounded-xl border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-[#6E6E73]">Stock en magasin</label>
                          <input
                            type="number"
                            required
                            value={formStock}
                            onChange={(e) => setFormStock(Number(e.target.value))}
                            className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-xs font-semibold px-3 py-2.5 rounded-xl border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden"
                          />
                        </div>

                        {/* Status properties */}
                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-[#6E6E73]">Statut du produit</label>
                          <select
                            value={formStatus}
                            onChange={(e) => setFormStatus(e.target.value as any)}
                            className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-xs font-semibold px-3 py-2.5 rounded-xl border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden"
                          >
                            <option value="draft">Brouillon (Draft)</option>
                            <option value="published">Publié (Published)</option>
                            <option value="hidden">Masqué (Hidden)</option>
                          </select>
                        </div>
                      </div>

                      {/* Out of Stock custom messages */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-[#6E6E73]">Message "Rupture de Stock" (FR)</label>
                          <input
                            type="text"
                            placeholder="Bientôt disponible, arrivage prévu..."
                            value={formOutOfStockMsgFr}
                            onChange={(e) => setFormOutOfStockMsgFr(e.target.value)}
                            className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-xs px-3 py-2.5 rounded-xl border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-[#6E6E73]">Message "Rupture de Stock" (EN)</label>
                          <input
                            type="text"
                            placeholder="Coming soon, restocking next week..."
                            value={formOutOfStockMsgEn}
                            onChange={(e) => setFormOutOfStockMsgEn(e.target.value)}
                            className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-xs px-3 py-2.5 rounded-xl border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden"
                          />
                        </div>
                      </div>

                      {/* Drag & Drop Photo Upload Simulation with WebP indicator */}
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-[#6E6E73]">Photos multiples du produit (La première = Principale)</label>
                        <div
                          onDragEnter={handleDrag}
                          onDragLeave={handleDrag}
                          onDragOver={handleDrag}
                          onDrop={handleDrop}
                          className={`border-2 border-dashed rounded-2xl p-6 text-center transition-all ${
                            dragActive ? 'border-[#007AFF] bg-[#007AFF]/5' : 'border-[#AAAAAA]/40 bg-[#F5F5F7] hover:border-[#007AFF]'
                          }`}
                        >
                          <Upload className="mx-auto text-[#6E6E73] mb-1.5" size={24} />
                          <p className="text-xs font-bold text-[#1D1D1F]">Glissez-déposez des images ou cliquez pour charger</p>
                          <p className="text-[10px] text-[#6E6E73] mt-1">Compression automatique au format WebP</p>
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            onChange={handleFileChange}
                            className="hidden"
                            id="file-upload-form"
                          />
                          <label htmlFor="file-upload-form" className="mt-3 inline-block px-4 py-2 bg-[#007AFF] hover:bg-[#0071EB] text-white font-semibold text-[10px] uppercase rounded-full cursor-pointer transition-colors shadow-xs">
                            Sélectionner
                          </label>
                        </div>

                        {isCompressing && (
                          <div className="p-3 bg-[#FF9500]/15 text-[#FF9500] text-[10px] font-bold rounded-xl animate-pulse text-center">
                            Compression automatique WebP intelligente en cours...
                          </div>
                        )}

                        {uploadedImages.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-2">
                            {uploadedImages.map((img, idx) => (
                              <div key={idx} className="relative w-16 h-16 rounded-xl border border-[#AAAAAA]/30 overflow-hidden shrink-0 group bg-[#F5F5F7]">
                                <img src={img} className="w-full h-full object-cover" />
                                {idx === 0 && (
                                  <span className="absolute bottom-0 inset-x-0 bg-[#007AFF] text-[8px] text-white font-black text-center py-0.5">
                                    PRINCIPALE
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setUploadedImages(uploadedImages.filter((_, i) => i !== idx))}
                                  className="absolute top-1 right-1 p-0.5 bg-[#1D1D1F]/70 hover:bg-[#1D1D1F] text-white rounded-full transition-colors cursor-pointer"
                                >
                                  <X size={10} />
                                </button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                      {/* Custom variants builder */}
                      <div className="bg-[#F5F5F7] p-4 rounded-2xl border border-[#AAAAAA]/20 space-y-4 text-left">
                        <h5 className="text-xs font-bold text-[#1D1D1F] uppercase tracking-wider">{lang === 'fr' ? 'Variantes du produit (Couleur, Capacité)' : 'Variants Builder'}</h5>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-[#6E6E73]">Nom variante (FR)</label>
                            <input type="text" value={varNameFr} onChange={e => setVarNameFr(e.target.value)} className="w-full bg-white text-[#1D1D1F] text-xs px-3 py-2 rounded-xl border border-[#AAAAAA]/30 focus:outline-hidden" />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-[#6E6E73]">Nom variante (EN)</label>
                            <input type="text" value={varNameEn} onChange={e => setVarNameEn(e.target.value)} className="w-full bg-white text-[#1D1D1F] text-xs px-3 py-2 rounded-xl border border-[#AAAAAA]/30 focus:outline-hidden" />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-[#6E6E73]">Valeurs possibles (Séparées par virgule)</label>
                            <input type="text" value={varValueInputs} onChange={e => setVarValueInputs(e.target.value)} className="w-full bg-white text-[#1D1D1F] text-xs px-3 py-2 rounded-xl border border-[#AAAAAA]/30 focus:outline-hidden" placeholder="Noir, Rouge, Bleu" />
                          </div>
                          <div className="space-y-1">
                            <label className="block text-xs font-bold text-[#6E6E73]">Suppléments prix en FCFA (Même ordre)</label>
                            <input type="text" value={varSupplements} onChange={e => setVarSupplements(e.target.value)} className="w-full bg-white text-[#1D1D1F] text-xs px-3 py-2 rounded-xl border border-[#AAAAAA]/30 focus:outline-hidden" placeholder="0, 5000, 10000" />
                          </div>
                        </div>
                      </div>

                      {/* Descriptions and toggles */}
                      <div className="space-y-3">
                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-[#6E6E73]">Description française</label>
                          <textarea
                            required
                            rows={3}
                            value={formDescFr}
                            onChange={(e) => setFormDescFr(e.target.value)}
                            className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-xs p-3 rounded-xl border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden"
                          />
                        </div>

                        <div className="space-y-1">
                          <label className="block text-xs font-bold text-[#6E6E73]">Description anglaise (Description EN)</label>
                          <textarea
                            required
                            rows={3}
                            value={formDescEn}
                            onChange={(e) => setFormDescEn(e.target.value)}
                            className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-xs p-3 rounded-xl border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden"
                          />
                        </div>

                        <div className="flex flex-wrap gap-4 pt-2 border-t border-[#AAAAAA]/20">
                          <label className="flex items-center gap-2 text-xs font-bold text-[#1D1D1F] cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={formIsPopular}
                              onChange={(e) => setFormIsPopular(e.target.checked)}
                              className="w-4 h-4 rounded-md accent-[#007AFF]"
                            />
                            <span>Mettre en "Populaire" (Best Sellers)</span>
                          </label>

                          <label className="flex items-center gap-2 text-xs font-bold text-[#1D1D1F] cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={formIsNew}
                              onChange={(e) => setFormIsNew(e.target.checked)}
                              className="w-4 h-4 rounded-md accent-[#007AFF]"
                            />
                            <span>Mettre en "Nouveauté" (New Product)</span>
                          </label>
                        </div>
                      </div>

                      {/* Action buttons with Mobile Preview toggle */}
                      <div className="flex flex-wrap justify-between items-center gap-2 pt-4 border-t border-[#AAAAAA]/20">
                        <button
                          type="button"
                          onClick={() => setShowMobilePreview(!showMobilePreview)}
                          className="px-4 py-2 bg-white border border-[#AAAAAA] hover:bg-[#F5F5F7] text-[#1D1D1F] font-semibold text-xs rounded-full flex items-center gap-1.5 cursor-pointer"
                        >
                          <Smartphone size={13} />
                          <span>{showMobilePreview ? 'Fermer aperçu mobile' : 'Aperçu Mobile'}</span>
                        </button>

                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsAddingNew(false);
                              setEditingProduct(null);
                            }}
                            className="px-4 py-2 bg-white border border-[#AAAAAA] hover:bg-[#F5F5F7] text-[#1D1D1F] font-semibold text-xs rounded-full cursor-pointer"
                          >
                            Annuler
                          </button>
                          <button
                            type="submit"
                            className="px-6 py-2 bg-[#007AFF] hover:bg-[#0071EB] text-white font-semibold text-xs rounded-full cursor-pointer shadow-xs"
                          >
                            Enregistrer le produit
                          </button>
                        </div>
                      </div>

                      {/* Smart integrated mobile preview frame */}
                      {showMobilePreview && (
                        <div className="border-[8px] border-[#1D1D1F] rounded-[36px] max-w-sm mx-auto overflow-hidden bg-[#F5F5F7] text-[#1D1D1F] p-4 space-y-4 animate-fadeIn shadow-xl relative">
                          <div className="absolute top-2 inset-x-0 flex justify-center pointer-events-none">
                            <div className="w-20 h-4 bg-[#1D1D1F] rounded-full" />
                          </div>
                          
                          <div className="text-center pt-3 text-[10px] text-[#6E6E73] font-bold uppercase tracking-widest border-b border-[#AAAAAA]/20 pb-2">
                            PREVIEW DU PRODUIT SUR SITE MOBILE
                          </div>

                          {/* Mock Render */}
                          <div className="space-y-3 text-left">
                            <div className="aspect-square bg-white rounded-2xl p-4 overflow-hidden flex items-center justify-center relative border border-[#AAAAAA]/20">
                              <img src={formImage || "/src/assets/images/category_earphone_1791055767919.webp"} className="max-h-36 object-contain" />
                              <span className="absolute top-2 left-2 px-2 py-0.5 bg-[#007AFF] text-white text-[8px] font-black uppercase rounded-full">
                                {formCategory}
                              </span>
                            </div>

                            <div className="space-y-1">
                              <h5 className="text-sm font-extrabold uppercase tracking-tight text-[#1D1D1F]">{formName || 'Nom Produit'}</h5>
                              <div className="flex items-baseline gap-2 font-mono">
                                <span className="text-sm font-black text-[#007AFF]">{formatPrice(formPrice)}</span>
                                {formOriginalPrice && <span className="text-xs text-[#AAAAAA] line-through">{formatPrice(Number(formOriginalPrice))}</span>}
                              </div>
                            </div>

                            <p className="text-[10px] text-[#6E6E73] line-clamp-3 leading-normal">
                              {lang === 'fr' ? (formDescFr || 'Aucune description rédigée.') : (formDescEn || 'No english description.')}
                            </p>

                            <button type="button" className="w-full py-2 bg-[#007AFF] text-white text-[10px] font-semibold rounded-full text-center">
                              Ajouter au Panier (Simulation)
                            </button>
                          </div>
                        </div>
                      )}
                    </form>
                  )}

                  {/* List of Products Table */}
                  <div className="bg-white border border-[#AAAAAA]/30 rounded-[28px] overflow-hidden shadow-xs">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="bg-[#F5F5F7] text-[10px] font-bold text-[#6E6E73] uppercase border-b border-[#AAAAAA]/20">
                            <th className="p-4">Photo</th>
                            <th className="p-4">Nom du produit</th>
                            <th className="p-4">Catégorie</th>
                            <th className="p-4">Prix</th>
                            <th className="p-4">Stock</th>
                            <th className="p-4">Statut</th>
                            <th className="p-4 text-right">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#AAAAAA]/15 text-xs font-semibold text-[#1D1D1F]">
                          {products.map((p) => (
                            <tr key={p.id} className="hover:bg-[#F5F5F7]/70">
                              <td className="p-4">
                                <img src={p.image} className="w-10 h-10 object-contain bg-[#F5F5F7] rounded-lg p-0.5 border border-[#AAAAAA]/20" />
                              </td>
                              <td className="p-4">
                                <span className="font-extrabold text-[#1D1D1F] block">{p.name}</span>
                                <span className="text-[9px] font-mono text-[#6E6E73] uppercase tracking-widest">{p.id}</span>
                              </td>
                              <td className="p-4 font-mono text-[#6E6E73]">{p.category}</td>
                              <td className="p-4 font-mono text-[#1D1D1F]">{formatPrice(p.price)}</td>
                              <td className="p-4">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                  p.stock <= 0
                                    ? 'bg-[#FF3B30]/15 text-[#FF3B30]'
                                    : p.stock <= 5
                                    ? 'bg-[#FF9500]/15 text-[#FF9500]'
                                    : 'bg-[#34C759]/15 text-[#34C759]'
                                }`}>
                                  {p.stock} pcs
                                </span>
                              </td>
                              <td className="p-4">
                                <span className={`px-2 py-0.5 rounded-full text-[9px] uppercase font-bold tracking-widest ${
                                  (p as any).status === 'draft'
                                    ? 'bg-[#AAAAAA]/20 text-[#6E6E73]'
                                    : (p as any).status === 'hidden'
                                    ? 'bg-[#FF9500]/15 text-[#FF9500]'
                                    : 'bg-[#007AFF]/15 text-[#007AFF]'
                                }`}>
                                  {(p as any).status || 'published'}
                                </span>
                              </td>
                              <td className="p-4 text-right space-x-1.5 whitespace-nowrap">
                                <button
                                  onClick={() => handleDuplicateProduct(p.id)}
                                  className="px-2.5 py-1.5 bg-[#F5F5F7] hover:bg-[#F5F5F7]/80 text-[#1D1D1F] border border-[#AAAAAA]/30 text-[10px] font-semibold rounded-full cursor-pointer"
                                  title="Dupliquer"
                                >
                                  Dupliquer
                                </button>
                                <button
                                  onClick={() => handleEditProductClick(p)}
                                  className="p-1.5 bg-[#F5F5F7] hover:bg-[#F5F5F7]/80 text-[#6E6E73] hover:text-[#1D1D1F] border border-[#AAAAAA]/30 rounded-full cursor-pointer"
                                  title="Modifier"
                                >
                                  <Edit2 size={13} />
                                </button>
                                <button
                                  onClick={() => handleDeleteProduct(p.id)}
                                  className="p-1.5 bg-[#FF3B30]/15 hover:bg-[#FF3B30]/25 text-[#FF3B30] rounded-full cursor-pointer"
                                  title="Supprimer"
                                >
                                  <Trash2 size={13} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* 3. ANNOUNCEMENTS CORE */}
              {adminSubTab === 'announcements' && (
                <form onSubmit={handleAnnouncementsSubmit} className="space-y-6 animate-fadeIn">
                  {/* Top Header Banner Programmer */}
                  <div className="bg-white border border-[#AAAAAA]/30 rounded-[28px] p-5 sm:p-7 space-y-4 shadow-xs">
                    <h4 className="text-sm font-extrabold uppercase tracking-wider text-[#1D1D1F] border-b border-[#AAAAAA]/20 pb-2">
                      {lang === 'fr' ? 'Bandeau supérieur défilant' : 'Top Promotional Banner Programmer'}
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-[#6E6E73]">Texte français</label>
                        <input type="text" value={bannerTextFr} onChange={e => setBannerTextFr(e.target.value)} className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-xs px-3 py-2.5 rounded-xl border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden" />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-[#6E6E73]">Texte anglais</label>
                        <input type="text" value={bannerTextEn} onChange={e => setBannerTextEn(e.target.value)} className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-xs px-3 py-2.5 rounded-xl border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden" />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-[#6E6E73]">Couleur d'arrière-plan</label>
                        <input type="color" value={bannerColor} onChange={e => setBannerColor(e.target.value)} className="w-12 h-10 rounded-xl cursor-pointer" />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-[#6E6E73]">Lien clic (Optionnel)</label>
                        <input type="text" value={bannerLink} onChange={e => setBannerLink(e.target.value)} className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-xs px-3 py-2.5 rounded-xl border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden" />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-[#6E6E73]">Date et heure de début</label>
                        <input type="datetime-local" value={bannerStart} onChange={e => setBannerDateStart(e.target.value)} className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-xs px-3 py-2.5 rounded-xl border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden" />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-[#6E6E73]">Date et heure de fin</label>
                        <input type="datetime-local" value={bannerEnd} onChange={e => setBannerDateEnd(e.target.value)} className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-xs px-3 py-2.5 rounded-xl border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden" />
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-2">
                      <input type="checkbox" id="banner-enabled-check" checked={bannerEnabled} onChange={e => setBannerEnabled(e.target.checked)} className="w-4 h-4 rounded-md accent-[#007AFF]" />
                      <label htmlFor="banner-enabled-check" className="text-xs font-bold text-[#1D1D1F] cursor-pointer">Activer la diffusion programmée du bandeau</label>
                    </div>
                  </div>

                  {/* Promo Popup Panel */}
                  <div className="bg-white border border-[#AAAAAA]/30 rounded-[28px] p-5 sm:p-7 space-y-4 shadow-xs">
                    <h4 className="text-sm font-extrabold uppercase tracking-wider text-[#1D1D1F] border-b border-[#AAAAAA]/20 pb-2">
                      {lang === 'fr' ? 'Pop-up Promotionnel de bienvenue' : 'Welcome Promotion Pop-Up'}
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-[#6E6E73]">Texte (FR)</label>
                        <input type="text" value={popupTextFr} onChange={e => setPopupTextFr(e.target.value)} className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-xs px-3 py-2.5 rounded-xl border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden" />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-[#6E6E73]">Texte (EN)</label>
                        <input type="text" value={popupTextEn} onChange={e => setPopupTextEn(e.target.value)} className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-xs px-3 py-2.5 rounded-xl border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden" />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-[#6E6E73]">URL Image du Pop-up</label>
                        <input type="text" value={popupImage} onChange={e => setPopupImage(e.target.value)} className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-xs px-3 py-2.5 rounded-xl border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden" />
                      </div>
                      <div className="flex items-center gap-2 pt-6">
                        <input type="checkbox" id="popup-enabled-check" checked={popupEnabled} onChange={e => setPopupEnabled(e.target.checked)} className="w-4 h-4 rounded-md accent-[#007AFF]" />
                        <label htmlFor="popup-enabled-check" className="text-xs font-bold text-[#1D1D1F] cursor-pointer">Activer l'affichage du Pop-up aux visiteurs (1 fois max)</label>
                      </div>
                    </div>
                  </div>

                  {/* Copy WhatsApp / Submit Actions */}
                  <div className="flex justify-between items-center gap-3">
                    <button
                      type="button"
                      onClick={handleCopyWhatsAppText}
                      className="px-5 py-2.5 bg-[#25D366] hover:bg-[#20ba59] text-white font-semibold text-xs uppercase tracking-wider rounded-full flex items-center gap-1.5 cursor-pointer shadow-xs"
                    >
                      <Copy size={13} />
                      <span>Copier le texte pour WhatsApp</span>
                    </button>

                    <button
                      type="submit"
                      className="px-6 py-2.5 bg-[#007AFF] hover:bg-[#0071EB] text-white font-semibold text-xs uppercase tracking-wider rounded-full cursor-pointer shadow-xs"
                    >
                      Enregistrer les annonces
                    </button>
                  </div>
                </form>
              )}

              {/* 4. BLACK FRIDAY & PROMOTIONS CORE (OWNER ONLY) */}
              {adminSubTab === 'promotions' && (
                <div className="space-y-6 animate-fadeIn">
                  {/* Campaign builder form */}
                  <form onSubmit={handleCampaignSubmit} className="bg-white border border-[#AAAAAA]/30 rounded-[28px] p-5 sm:p-7 space-y-4 shadow-xs">
                    <h4 className="text-sm font-extrabold uppercase tracking-wider text-[#1D1D1F] border-b border-[#AAAAAA]/20 pb-2 flex items-center gap-2">
                      <Percent className="text-[#007AFF]" size={18} />
                      <span>Créer une Campagne de Promotion (ex: Black Friday)</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-[#6E6E73]">Nom de la Campagne</label>
                        <input required type="text" placeholder="Ex: Black Friday Togo 2026" value={campName} onChange={e => setCampName(e.target.value)} className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-xs px-3 py-2.5 rounded-xl border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden" />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-[#6E6E73]">Type de remise</label>
                        <select value={campDiscountType} onChange={e => setCampDiscountType(e.target.value as any)} className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-xs px-3 py-2.5 rounded-xl border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden">
                          <option value="percentage">Pourcentage (%)</option>
                          <option value="fixed">Montant fixe (FCFA)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-[#6E6E73]">Valeur de la remise (ex: 30 pour -30% ou 5000 pour -5000 FCFA)</label>
                        <input required type="number" value={campDiscountValue} onChange={e => setCampDiscountValue(Number(e.target.value))} className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-xs px-3 py-2.5 rounded-xl border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden" />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-[#6E6E73]">Date/Heure de début</label>
                        <input required type="datetime-local" value={campStart} onChange={e => setCampStart(e.target.value)} className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-xs px-3 py-2.5 rounded-xl border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden" />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-[#6E6E73]">Date/Heure de fin</label>
                        <input required type="datetime-local" value={campEnd} onChange={e => setCampEnd(e.target.value)} className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-xs px-3 py-2.5 rounded-xl border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden" />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-[#6E6E73]">Stock promo limité (Optionnel)</label>
                        <input type="number" placeholder="Laisser vide si illimité" value={campLimitedStock} onChange={e => setCampLimitedStock(e.target.value)} className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-xs px-3 py-2.5 rounded-xl border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden" />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-[#6E6E73]">Limite d'utilisation par client (Optionnel)</label>
                        <input type="number" placeholder="1 par défaut" value={campLimitPerClient} onChange={e => setCampLimitPerClient(e.target.value)} className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-xs px-3 py-2.5 rounded-xl border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden" />
                      </div>
                    </div>

                    <button type="submit" className="px-6 py-2.5 bg-[#007AFF] hover:bg-[#0071EB] text-white font-semibold text-xs uppercase tracking-wider rounded-full cursor-pointer shadow-xs">
                      Lancer la campagne
                    </button>
                  </form>

                  {/* Active Campaigns List & statistics */}
                  <div className="bg-white border border-[#AAAAAA]/30 p-6 rounded-[28px] text-[#1D1D1F] space-y-4 shadow-xs">
                    <h4 className="text-xs font-black uppercase tracking-widest text-[#007AFF]">Statistiques des campagnes actives</h4>
                    
                    {campaigns.length === 0 ? (
                      <p className="text-xs text-[#6E6E73] text-center py-4">Aucune campagne promotionnelle n'est enregistrée.</p>
                    ) : (
                      <div className="space-y-4">
                        {campaigns.map((c) => (
                          <div key={c.id} className="bg-[#F5F5F7] p-4 rounded-2xl border border-[#AAAAAA]/20 space-y-3">
                            <div className="flex justify-between items-center border-b border-[#AAAAAA]/20 pb-2">
                              <div>
                                <span className="text-sm font-black text-[#007AFF] block">{c.name}</span>
                                <span className="text-[10px] text-[#6E6E73] font-mono">Du {new Date(c.startDate).toLocaleString()} au {new Date(c.endDate).toLocaleString()}</span>
                              </div>
                              <button onClick={() => handleDeleteCampaign(c.id)} className="p-1.5 bg-[#FF3B30]/15 hover:bg-[#FF3B30]/25 text-[#FF3B30] rounded-full transition-colors cursor-pointer">
                                <Trash2 size={13} />
                              </button>
                            </div>

                            {/* Stats */}
                            <div className="grid grid-cols-3 gap-2.5 text-center">
                              <div className="bg-white border border-[#AAAAAA]/20 p-2.5 rounded-xl">
                                <span className="text-[9px] text-[#6E6E73] font-bold uppercase block">Ventes</span>
                                <span className="text-xs font-bold text-[#1D1D1F] font-mono">{c.salesCount || 0} articles</span>
                              </div>
                              <div className="bg-white border border-[#AAAAAA]/20 p-2.5 rounded-xl">
                                <span className="text-[9px] text-[#6E6E73] font-bold uppercase block">Chiffre d'Affaires</span>
                                <span className="text-xs font-bold text-[#007AFF] font-mono">{formatPrice(c.salesRevenue || 0)}</span>
                              </div>
                              <div className="bg-white border border-[#AAAAAA]/20 p-2.5 rounded-xl">
                                <span className="text-[9px] text-[#6E6E73] font-bold uppercase block">Promo Restante</span>
                                <span className="text-xs font-bold text-[#1D1D1F] font-mono">{c.stockCount !== undefined ? `${c.stockCount} pcs` : 'Illimité'}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 5. PROMO CODES CORE (OWNER ONLY) */}
              {adminSubTab === 'promo-codes' && (
                <div className="space-y-6 animate-fadeIn">
                  <form onSubmit={handlePromoCodeSubmit} className="bg-white border border-[#AAAAAA]/30 rounded-[28px] p-5 sm:p-7 space-y-4 shadow-xs">
                    <h4 className="text-sm font-extrabold uppercase tracking-wider text-[#1D1D1F] border-b border-[#AAAAAA]/20 pb-2 flex items-center gap-2">
                      <Tag className="text-[#007AFF]" size={18} />
                      <span>Ajouter un Code Promo</span>
                    </h4>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-[#6E6E73]">Code promo (Saisi par le client)</label>
                        <input required type="text" placeholder="Ex: WELCOME10" value={promoCodeName} onChange={e => setPromoCodeName(e.target.value)} className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-xs px-3 py-2.5 rounded-xl border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden" />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-[#6E6E73]">Type de remise</label>
                        <select value={promoCodeDiscountType} onChange={e => setPromoCodeDiscountType(e.target.value as any)} className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-xs px-3 py-2.5 rounded-xl border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden">
                          <option value="percentage">Pourcentage (%)</option>
                          <option value="fixed">Montant fixe (FCFA)</option>
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-[#6E6E73]">Valeur de la remise</label>
                        <input required type="number" value={promoCodeValue} onChange={e => setPromoCodeValue(Number(e.target.value))} className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-xs px-3 py-2.5 rounded-xl border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden" />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-[#6E6E73]">Date d'expiration</label>
                        <input required type="datetime-local" value={promoCodeExpiry} onChange={e => setPromoCodeExpiry(e.target.value)} className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-xs px-3 py-2.5 rounded-xl border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden" />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-[#6E6E73]">Nombre maximum d'utilisations</label>
                        <input type="number" value={promoCodeMaxUses} onChange={e => setPromoCodeMaxUses(Number(e.target.value))} className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-xs px-3 py-2.5 rounded-xl border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden" />
                      </div>
                      <div className="space-y-1">
                        <label className="block text-xs font-bold text-[#6E6E73]">Montant d'achat minimum requis (FCFA)</label>
                        <input type="number" value={promoCodeMinPurchase} onChange={e => setPromoCodeMinPurchase(Number(e.target.value))} className="w-full bg-[#F5F5F7] text-[#1D1D1F] text-xs px-3 py-2.5 rounded-xl border border-[#AAAAAA]/30 focus:border-[#007AFF] focus:outline-hidden" />
                      </div>
                    </div>

                    <button type="submit" className="px-6 py-2.5 bg-[#007AFF] hover:bg-[#0071EB] text-white font-semibold text-xs uppercase tracking-wider rounded-full cursor-pointer shadow-xs">
                      Ajouter le code promo
                    </button>
                  </form>

                  {/* Promo codes table */}
                  <div className="bg-white border border-[#AAAAAA]/30 rounded-[28px] overflow-hidden text-xs shadow-xs">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#F5F5F7] text-[10px] font-bold text-[#6E6E73] uppercase border-b border-[#AAAAAA]/20">
                          <th className="p-4">Code</th>
                          <th className="p-4">Remise</th>
                          <th className="p-4">Expiration</th>
                          <th className="p-4">Utilisations</th>
                          <th className="p-4">Minimum d'achat</th>
                          <th className="p-4 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#AAAAAA]/15 text-[#1D1D1F] font-semibold">
                        {promoCodes.map((c) => (
                          <tr key={c.code} className="hover:bg-[#F5F5F7]/70">
                            <td className="p-4">
                              <span className="font-extrabold text-[#7477FF] font-mono block text-sm">{c.code}</span>
                            </td>
                            <td className="p-4 font-mono">
                              {c.discountType === 'percentage' ? `${c.discountValue}%` : `${formatPrice(c.discountValue)}`}
                            </td>
                            <td className="p-4 font-mono text-[#6E6E73]">{new Date(c.expiryDate).toLocaleString()}</td>
                            <td className="p-4 font-mono text-[#6E6E73]">
                              {c.usedCount} / {c.maxUses}
                            </td>
                            <td className="p-4 font-mono">{formatPrice(c.minPurchase)}</td>
                            <td className="p-4 text-right">
                              <button onClick={() => handleDeletePromoCode(c.code)} className="p-1.5 text-[#6E6E73] hover:text-[#FF3B30] rounded-full hover:bg-[#FF3B30]/10 transition-colors cursor-pointer">
                                <Trash2 size={13} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 6. PAYMENT LOGS VIEW CORE */}
              {adminSubTab === 'payment-logs' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="bg-white border border-[#AAAAAA]/30 p-6 rounded-[28px] text-[#1D1D1F] space-y-4 shadow-xs">
                    <div className="flex justify-between items-center border-b border-[#AAAAAA]/20 pb-3">
                      <h4 className="text-xs font-black uppercase tracking-widest text-[#7477FF]">
                        {lang === 'fr' ? 'Journal des tentatives de paiement PayGate' : 'PayGate Payment Attempts Journal'}
                      </h4>
                      <span className="text-[10px] bg-[#7477FF]/10 text-[#7477FF] px-2.5 py-1 rounded-full font-mono uppercase font-bold">
                        {paymentLogs.length} tentatives
                      </span>
                    </div>
                    
                    {paymentLogs.length === 0 ? (
                      <p className="text-xs text-[#6E6E73] text-center py-8">
                        {lang === 'fr' ? 'Aucune tentative de paiement enregistrée.' : 'No payment attempts registered yet.'}
                      </p>
                    ) : (
                      <div className="space-y-3 max-h-[500px] overflow-y-auto pr-1">
                        {paymentLogs.map((log, idx) => {
                          const isSuccess = log.statusCode === 0;
                          return (
                            <div key={idx} className="bg-[#F5F5F7] p-4 rounded-2xl border border-[#AAAAAA]/20 space-y-2 text-xs text-left">
                              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1.5 border-b border-[#AAAAAA]/20 pb-2">
                                <div className="space-y-0.5">
                                  <span className="text-[10px] text-[#6E6E73] font-mono block">
                                    {new Date(log.date).toLocaleString()}
                                  </span>
                                  <div className="flex items-center gap-2">
                                    <span className="font-extrabold text-[#1D1D1F] text-sm font-mono">{log.attemptId || log.orderId}</span>
                                    <span className="px-2 py-0.5 bg-white border border-[#AAAAAA]/20 text-[#6E6E73] text-[9px] rounded-sm font-mono uppercase">{log.network}</span>
                                  </div>
                                </div>
                                <span className={`text-[10px] uppercase font-black px-2.5 py-1 rounded-full ${
                                  isSuccess ? 'bg-[#34C759]/15 text-[#34C759]' : 'bg-[#FF3B30]/15 text-[#FF3B30]'
                                }`}>
                                  Code PayGate: {log.statusCode}
                                </span>
                              </div>
                              <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                                <div>
                                  <span className="text-[#6E6E73] font-bold">Numéro à débiter :</span>{' '}
                                  <span className="text-[#1D1D1F] font-mono">{log.maskedPhone}</span>
                                </div>
                                <div>
                                  <span className="text-[#6E6E73] font-bold">Message :</span>{' '}
                                  <span className={`font-semibold ${isSuccess ? 'text-[#34C759]' : 'text-[#FF3B30]'}`}>{log.message}</span>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 6. AUDIT LOGS VIEW CORE (OWNER ONLY) */}
              {adminSubTab === 'audit-logs' && (
                <div className="space-y-4 animate-fadeIn">
                  <div className="bg-white border border-[#AAAAAA]/30 p-6 rounded-[28px] text-[#1D1D1F] shadow-xs">
                    <h4 className="text-xs font-black uppercase tracking-widest text-[#7477FF] mb-4">Historique d'audit d'administration</h4>
                    
                    <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
                      {auditLogs.map((log, idx) => (
                        <div key={idx} className="bg-[#F5F5F7] p-3.5 rounded-xl border border-[#AAAAAA]/20 space-y-1 text-xs">
                          <div className="flex justify-between items-center text-[10px] text-[#6E6E73] font-mono">
                            <span>{new Date(log.timestamp).toLocaleString()}</span>
                            <span className="text-[#7477FF] font-bold">{log.email}</span>
                          </div>
                          <div className="font-extrabold text-[#1D1D1F] text-xs">{log.action}</div>
                          <p className="text-[#6E6E73] text-[11px] leading-relaxed">{log.details}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* 7. AFFILIATION & PARTNERS MANAGER CORE */}
              {adminSubTab === 'affiliates' && (
                <AdminAffiliatesPanel
                  lang={lang}
                  affiliates={adminAffiliates}
                  commissions={adminCommissions}
                  payouts={adminPayouts}
                  settings={adminAffSettings}
                  adminRole={adminUser?.role || 'owner'}
                  onReload={loadDatabaseState}
                />
              )}

            </div>
          )}
        </div>
      )}
    </div>
  );
};
