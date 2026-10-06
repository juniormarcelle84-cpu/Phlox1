import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  X,
  ShoppingBag,
  Trash2,
  Plus,
  Minus,
  Send,
  CheckCircle2,
  Truck,
  Copy,
  Check,
  Lock,
  RefreshCw,
  AlertCircle,
  MapPin,
  Loader2,
  ShieldCheck,
  Smartphone,
  PhoneCall
} from 'lucide-react';
import brandConfig from '../brand.config.json';
import { CartItem, Order } from '../types';
import { formatPrice, translations, Lang } from '../services/i18n';
import {
  addOrder,
  buildPaidWhatsAppMessage,
  TOGO_CITIES,
  FALLBACK_PRODUCT_IMAGE
} from '../services/storeService';
import {
  initiatePaygatePayment,
  queryServerOrderStatus
} from '../services/paygateService';
import { processOrderCompletionAffiliation } from '../services/affiliationService';
import { PaymentNetworkLogo } from './PaymentNetworkLogo';

interface CartDrawerProps {
  isOpen: boolean;
  cart: CartItem[];
  lang: Lang;
  onClose: () => void;
  onUpdateQty: (id: string, qty: number) => void;
  onRemoveItem: (id: string) => void;
  onClearCart: () => void;
}

/**
 * Validation souple d'un numéro togolais :
 * Accepté avec ou sans +228 / 00228 (8 chiffres), espaces et tirets tolérés.
 */
function parseTogoPhone(raw: string): {
  isValid: boolean;
  subscriber8: string;
  fullPaygatePhone: string;
  formattedDisplay: string;
} {
  const digits = (raw || '').replace(/\D/g, '');
  let subscriber = digits;

  if (digits.startsWith('00228') && digits.length >= 13) {
    subscriber = digits.slice(5);
  } else if (digits.startsWith('228') && digits.length >= 11) {
    subscriber = digits.slice(3);
  } else if (digits === '228' || digits === '00228') {
    subscriber = '';
  }

  const isValid = subscriber.length >= 8;
  const clean8 = subscriber.slice(0, 8);

  return {
    isValid,
    subscriber8: clean8,
    fullPaygatePhone: isValid ? `228${clean8}` : '',
    formattedDisplay: isValid
      ? `+228 ${clean8.slice(0, 2)} ${clean8.slice(2, 4)} ${clean8.slice(4, 6)} ${clean8.slice(6, 8)}`
      : raw.trim()
  };
}

function formatCountdown(seconds: number): string {
  const safe = Math.max(0, seconds);
  const mins = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

export const CartDrawer: React.FC<CartDrawerProps> = ({
  isOpen,
  cart,
  lang,
  onClose,
  onUpdateQty,
  onRemoveItem,
  onClearCart
}) => {
  const t = translations[lang];

  // Steps: 'checkout' (panier + formulaire + choix réseau) | 'status' (attente 2 min / payé / échec-expiré 100% intégré)
  const [step, setStep] = useState<'checkout' | 'status'>('checkout');

  // Champs obligatoires : nom, numéro client, numéro à débiter (pré-rempli avec le numéro du client), ville, réseau
  const [fullName, setFullName] = useState('');
  const [phone, setPhone] = useState('');
  const [debitPhone, setDebitPhone] = useState('');
  const [debitPhoneEdited, setDebitPhoneEdited] = useState(false);
  const [city, setCity] = useState('Lomé');
  const [paymentMode, setPaymentMode] = useState<'TMONEY' | 'FLOOZ'>('TMONEY');

  // Champs 100% optionnels (ne bloquent JAMAIS le paiement)
  const [address, setAddress] = useState('');
  const [landmark, setLandmark] = useState('');
  const [gpsCoords, setGpsCoords] = useState('');
  const [locatingGps, setLocatingGps] = useState(false);

  // États de paiement, animation, compte à rebours 2 min (120 s) et statut serveur (/api/status.php)
  const [loadingPay, setLoadingPay] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const [hasBeenClicked, setHasBeenClicked] = useState(false);
  const [isShaking, setIsShaking] = useState(false);
  const [highlightedFields, setHighlightedFields] = useState<string[]>([]);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  const [paymentError, setPaymentError] = useState<string | null>(null);
  const [checkingStatus, setCheckingStatus] = useState(false);
  const [currentOrder, setCurrentOrder] = useState<Order | null>(null);
  const [orderPaymentStatus, setOrderPaymentStatus] = useState<
    'pending' | 'paid' | 'failed' | 'expired'
  >('pending');
  const [waitSecondsLeft, setWaitSecondsLeft] = useState<number>(120);
  const [statusErrorDetail, setStatusErrorDetail] = useState<string>('');
  const [copiedMsg, setCopiedMsg] = useState(false);
  const [whatsappAutoOpened, setWhatsappAutoOpened] = useState(false);

  const nameInputRef = useRef<HTMLInputElement>(null);
  const phoneInputRef = useRef<HTMLInputElement>(null);
  const debitPhoneInputRef = useRef<HTMLInputElement>(null);
  const citySelectRef = useRef<HTMLSelectElement>(null);

  // Détection de prefers-reduced-motion
  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    setPrefersReducedMotion(mediaQuery.matches);

    const listener = (event: MediaQueryListEvent) => {
      setPrefersReducedMotion(event.matches);
    };
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, []);

  // Lock body scroll and handle ESC key
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  // Charge les coordonnées précédentes depuis localStorage et pré-remplit le numéro à débiter
  useEffect(() => {
    const storedForm = localStorage.getItem('phlox_delivery_form');
    if (storedForm) {
      try {
        const data = JSON.parse(storedForm);
        if (data.fullName) setFullName(data.fullName);
        if (data.phone && parseTogoPhone(data.phone).isValid) {
          setPhone(data.phone);
          setDebitPhone(data.debitPhone || data.phone);
        }
        if (data.address) setAddress(data.address);
        if (data.landmark) setLandmark(data.landmark);
        if (data.city) setCity(data.city);
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountType: 'percentage' | 'fixed';
    discountValue: number;
    discountAmount: number;
  } | null>(null);
  const [couponError, setCouponError] = useState('');
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  const subtotal = cart.reduce((sum, item) => sum + item.product.price * item.quantity, 0);
  const selectedCityInfo = TOGO_CITIES.find((c) => c.name === city) || TOGO_CITIES[0];
  const deliveryFee = cart.length > 0 ? selectedCityInfo.deliveryFee : 0;
  
  const discountAmount = appliedCoupon ? appliedCoupon.discountAmount : 0;
  const grandTotal = Math.max(0, subtotal - discountAmount) + deliveryFee;

  const handleApplyCoupon = async () => {
    setCouponError('');
    if (!couponCode.trim()) return;
    setIsValidatingCoupon(true);
    try {
      const res = await fetch('/api/promo/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponCode, totalAmount: subtotal, customerPhone: phone })
      });
      const data = await res.json();
      if (res.ok && data.valid) {
        setAppliedCoupon(data);
        setCouponError('');
      } else {
        setCouponError(data.message || 'Code promo invalide.');
      }
    } catch {
      setCouponError('Erreur de validation.');
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  // Le numéro à débiter est pré-rempli avec le numéro du client s'il est vide
  const effectiveDebitRaw = debitPhone.trim() ? debitPhone : phone;
  const clientPhoneCheck = parseTogoPhone(phone);
  const debitPhoneCheck = parseTogoPhone(effectiveDebitRaw);

  const isNameValid = fullName.trim().length >= 2;
  const isClientPhoneValid = clientPhoneCheck.isValid;
  const isDebitPhoneValid = debitPhoneCheck.isValid;
  const isCityValid = Boolean(city && city.trim().length > 0);
  const isPaymentValid = paymentMode === 'TMONEY' || paymentMode === 'FLOOZ';

  const missingFields: string[] = [];
  if (!isNameValid) missingFields.push('nom');
  if (!isClientPhoneValid) missingFields.push('numéro');
  if (isClientPhoneValid && !isDebitPhoneValid) missingFields.push('numéro à débiter');
  if (!isCityValid) missingFields.push('ville');
  if (!isPaymentValid) missingFields.push('mode de paiement');

  const hasOrderItems = cart.length > 0 || (currentOrder && currentOrder.items.length > 0);
  const isFormValid = missingFields.length === 0 && Boolean(hasOrderItems);

  // SECOUSSE : animation shake douce de 0,6 s toutes les 5 s tant que le bouton est actif et pas encore cliqué
  useEffect(() => {
    if (
      !isOpen ||
      step !== 'checkout' ||
      !isFormValid ||
      hasBeenClicked ||
      loadingPay ||
      prefersReducedMotion
    ) {
      return;
    }

    const interval = setInterval(() => {
      setIsShaking(true);
      setTimeout(() => {
        setIsShaking(false);
      }, 600);
    }, 5000);

    return () => clearInterval(interval);
  }, [isOpen, step, isFormValid, hasBeenClicked, loadingPay, prefersReducedMotion]);

  const triggerShakeOnce = useCallback(() => {
    if (prefersReducedMotion) return;
    setIsShaking(false);
    setTimeout(() => {
      setIsShaking(true);
      setTimeout(() => setIsShaking(false), 600);
    }, 10);
  }, [prefersReducedMotion]);

  const getWhatsAppUrl = useCallback((order: Order) => {
    const message = buildPaidWhatsAppMessage(order);
    return `${brandConfig.whatsappUrlBase}?text=${encodeURIComponent(message)}`;
  }, []);

  // Vérification du statut auprès de /api/status.php
  const checkOrderOnServer = useCallback(
    async (orderToCheck: Order) => {
      setCheckingStatus(true);
      const result = await queryServerOrderStatus(orderToCheck.id);
      setCheckingStatus(false);

      if (result.paid || result.orderStatus === 'paid') {
        const updatedOrder: Order = {
          ...orderToCheck,
          status: 'paid',
          waSent: true
        };
        setCurrentOrder(updatedOrder);
        setOrderPaymentStatus('paid');
        onClearCart();
        // Trigger tiered commission calculation and logging on order completion
        processOrderCompletionAffiliation(updatedOrder).catch((err) => {
          console.warn('[Affiliation] Notice on order completion commission trigger:', err);
        });
        return true;
      }

      if (result.orderStatus === 'failed') {
        setOrderPaymentStatus('failed');
        setStatusErrorDetail(
          'La transaction a été refusée ou annulée sur votre téléphone. Vérifiez votre solde ou renvoyez la demande.'
        );
      } else if (result.orderStatus === 'expired') {
        setOrderPaymentStatus('expired');
        setStatusErrorDetail(
          'Le délai de validation de 2 minutes a expiré sans confirmation de votre part.'
        );
      }

      return false;
    },
    [onClearCart]
  );

  // Compte à rebours de 2 min (120 s) pendant l'écran d'attente
  useEffect(() => {
    if (step !== 'status' || orderPaymentStatus !== 'pending') return;

    const timer = setInterval(() => {
      setWaitSecondsLeft((prev) => {
        if (prev <= 1) {
          setOrderPaymentStatus('expired');
          setStatusErrorDetail(
            'Le délai de validation de 2 minutes est écoulé. Vous pouvez renvoyer la demande Push USSD ou changer de numéro.'
          );
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [step, orderPaymentStatus]);

  // Le site vérifie le statut toutes les 4 s via /api/status.php
  useEffect(() => {
    if (step !== 'status' || orderPaymentStatus !== 'pending' || !currentOrder) return;

    const interval = setInterval(() => {
      checkOrderOnServer(currentOrder);
    }, 4000);

    return () => clearInterval(interval);
  }, [step, orderPaymentStatus, currentOrder, checkOrderOnServer]);

  // PAYÉ → ouverture automatique de WhatsApp avec le message de commande
  useEffect(() => {
    if (step === 'status' && orderPaymentStatus === 'paid' && currentOrder && !whatsappAutoOpened) {
      setWhatsappAutoOpened(true);
      const waUrl = getWhatsAppUrl(currentOrder);
      const timer = setTimeout(() => {
        try {
          window.location.assign(waUrl);
        } catch {
          // Si bloqué, le gros bouton "Envoyer ma commande sur WhatsApp" est affiché
        }
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [step, orderPaymentStatus, currentOrder, whatsappAutoOpened, getWhatsAppUrl]);

  if (!isOpen) return null;

  // Localisation GPS optionnelle (ne bloque jamais le paiement)
  const handleGetOptionalGps = () => {
    if (!navigator.geolocation) {
      setGpsCoords('GPS non supporté (optionnel)');
      return;
    }
    setLocatingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLocatingGps(false);
        setGpsCoords(`${pos.coords.latitude.toFixed(5)}, ${pos.coords.longitude.toFixed(5)}`);
      },
      () => {
        setLocatingGps(false);
        setGpsCoords('');
      },
      { timeout: 6000 }
    );
  };

  // Envoi de la demande Push USSD au serveur PHP (/api/pay.php) SANS redirection
  const sendPushRequestToServer = async (orderToPay: Order, targetPaygatePhone: string) => {
    setLoadingPay(true);
    setPaymentError(null);
    setStatusErrorDetail('');

    try {
      const payRes = await initiatePaygatePayment({
        phone_number: targetPaygatePhone,
        amount: orderToPay.totalAmount,
        identifier: orderToPay.id,
        network: paymentMode,
        city: orderToPay.customerCity,
        customer_name: orderToPay.customerName,
        customer_phone: orderToPay.customerPhone,
        customer_address: orderToPay.customerAddress,
        items: orderToPay.items,
        promoCode: (orderToPay as any).promoCodeApplied || undefined,
        affiliateRef: localStorage.getItem('phlox_affiliate_ref') || undefined,
        description: `Commande ${orderToPay.id} - ${brandConfig.name.toUpperCase()}`
      });

      setLoadingPay(false);

      // Si le serveur a recalculé le montant à partir du catalogue, on synchronise l'affichage
      if (typeof payRes.amount === 'number' && payRes.amount > 0) {
        orderToPay.totalAmount = payRes.amount;
      }
      orderToPay.paymentMethod = paymentMode;
      setCurrentOrder({ ...orderToPay });

      if (!payRes.ok && payRes.status === 'error') {
        setOrderPaymentStatus('failed');
        setStatusErrorDetail(
          payRes.message ||
            'La demande Push USSD n’a pas pu être envoyée sur ce numéro. Vérifiez le numéro ou réessayez.'
        );
        setStep('status');
        return;
      }

      setOrderPaymentStatus('pending');
      setWaitSecondsLeft(payRes.expires_in || 120);
      setWhatsappAutoOpened(false);
      setStep('status');

      await checkOrderOnServer(orderToPay);
    } catch (err) {
      setLoadingPay(false);
      setPaymentError(
        err instanceof Error
          ? `Erreur lors de l’appel à /api/pay.php : ${err.message}`
          : 'Impossible de contacter le serveur de paiement (/api/pay.php).'
      );
    }
  };

  // Action du bouton "🔒 Payer {total} FCFA"
  const handlePayOrder = async (e?: React.FormEvent | React.MouseEvent) => {
    if (e) e.preventDefault();
    setPaymentError(null);

    if (!hasOrderItems) {
      setPaymentError('Votre panier est vide.');
      return;
    }

    // Clic avec champ manquant : secousse + vibration + scroll vers le premier champ manquant surligné en rouge
    if (!isFormValid) {
      triggerShakeOnce();
      if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
        try {
          navigator.vibrate([80, 40, 80]);
        } catch {
          // Ignore if blocked
        }
      }

      const missingKeys: string[] = [];
      if (!isNameValid) missingKeys.push('name');
      if (!isClientPhoneValid) missingKeys.push('phone');
      if (!isDebitPhoneValid) missingKeys.push('debitPhone');
      if (!isCityValid) missingKeys.push('city');
      setHighlightedFields(missingKeys);

      setPaymentError(`Il manque : ${missingFields.join(', ')}.`);

      if (!isNameValid && nameInputRef.current) {
        nameInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        nameInputRef.current.focus();
      } else if (!isClientPhoneValid && phoneInputRef.current) {
        phoneInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        phoneInputRef.current.focus();
      } else if (!isDebitPhoneValid && debitPhoneInputRef.current) {
        debitPhoneInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        debitPhoneInputRef.current.focus();
      } else if (!isCityValid && citySelectRef.current) {
        citySelectRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        citySelectRef.current.focus();
      }
      return;
    }

    // Clic valide : effet d'appui (scale .96), spinner, texte "Envoi de la demande…"
    setHasBeenClicked(true);
    setHighlightedFields([]);
    setIsPressed(true);
    setTimeout(() => setIsPressed(false), 180);

    const normalizedClientPhone = clientPhoneCheck.formattedDisplay;
    const normalizedDebitDisplay = debitPhoneCheck.formattedDisplay;
    const optionalDetails = [address.trim(), landmark.trim(), gpsCoords ? `GPS: ${gpsCoords}` : '']
      .filter(Boolean)
      .join(' — ');
    const finalAddress = optionalDetails || city;

    localStorage.setItem(
      'phlox_delivery_form',
      JSON.stringify({
        fullName: fullName.trim(),
        phone: normalizedClientPhone,
        debitPhone: normalizedDebitDisplay,
        address: address.trim(),
        landmark: landmark.trim(),
        city
      })
    );

    const orderItems =
      cart.length > 0
        ? cart.map((item) => ({
            productId: item.product.id,
            productName: item.product.name,
            quantity: item.quantity,
            price: item.product.price,
            selectedVariants: item.selectedVariants
          }))
        : currentOrder?.items || [];

    const createdOrder = addOrder({
      customerName: fullName.trim(),
      customerPhone: normalizedClientPhone,
      customerAddress: finalAddress,
      customerCity: city,
      paymentMethod: paymentMode,
      items: orderItems,
      totalAmount: grandTotal || currentOrder?.totalAmount || 0,
      promoCodeApplied: appliedCoupon?.code || undefined,
      discountAmountApplied: discountAmount || undefined
    });

    await sendPushRequestToServer({
      ...createdOrder,
      promoCodeApplied: appliedCoupon?.code || undefined
    } as any, debitPhoneCheck.fullPaygatePhone);
  };

  // Bouton "Renvoyer la demande" (en cas d'échec ou d'expiration)
  const handleResendPushRequest = async () => {
    if (!currentOrder) return;
    const targetPhone =
      debitPhoneCheck.fullPaygatePhone ||
      currentOrder.customerPhone.replace(/\D/g, '') ||
      '22890123456';
    await sendPushRequestToServer(currentOrder, targetPhone);
  };

  // Bouton "Changer de numéro" (revient au formulaire et focus le champ "Numéro à débiter")
  const handleChangeDebitNumber = () => {
    setStep('checkout');
    setOrderPaymentStatus('pending');
    setPaymentError(null);
    setHighlightedFields(['debitPhone']);
    setTimeout(() => {
      if (debitPhoneInputRef.current) {
        debitPhoneInputRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
        debitPhoneInputRef.current.focus();
        debitPhoneInputRef.current.select();
      }
    }, 80);
  };

  const handleCopyMessage = () => {
    if (!currentOrder || orderPaymentStatus !== 'paid') return;
    const msg = buildPaidWhatsAppMessage(currentOrder);
    navigator.clipboard.writeText(msg);
    setCopiedMsg(true);
    setTimeout(() => setCopiedMsg(false), 3000);
  };

  const handleCloseDrawer = () => {
    if (step === 'status' && orderPaymentStatus === 'paid') {
      setStep('checkout');
      setCurrentOrder(null);
      setHasBeenClicked(false);
    }
    onClose();
  };

  const networkDisplayLabel = (method?: 'TMONEY' | 'FLOOZ') =>
    method === 'FLOOZ' ? 'Flooz Money' : 'Mixx by Yas';

  const displayedTotal =
    grandTotal > 0 ? grandTotal : currentOrder ? currentOrder.totalAmount : 0;

  return (
    <div
      className="fixed inset-0 z-[70] flex justify-end bg-black/60 backdrop-blur-xs transition-opacity duration-300"
      role="dialog"
      aria-modal="true"
      aria-label={t.myCart}
    >
      {/* Click outside to close */}
      <div
        className="absolute inset-0 cursor-pointer"
        onClick={handleCloseDrawer}
        aria-hidden="true"
      />

      {/* Tiroir de commande — Dark Theme, 100% intégré sans redirection externe */}
      <div className="relative w-full max-w-md h-[100dvh] max-h-[100dvh] bg-[#1B1A1B] text-[#FFFFFF] flex flex-col shadow-2xl z-10 overflow-hidden border-l border-white/5">
        {/* Header fixe en haut */}
        <div className="shrink-0 px-4 py-3.5 border-b border-white/10 flex items-center justify-between bg-[#312F30] z-20">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-[#F66554]/20 text-[#F66554] rounded-full">
              <ShoppingBag size={18} />
            </div>
            <div>
              <h2 className="text-base font-black uppercase tracking-tight text-white leading-tight">
                {step === 'status' ? 'Paiement Mobile Intégré' : 'Panier & Commande'}
              </h2>
              <span className="text-xs text-[#C5D4CA]">
                {step === 'status' && currentOrder
                  ? `Commande ${currentOrder.id} · ${networkDisplayLabel(currentOrder.paymentMethod)}`
                  : `${cart.reduce((sum, item) => sum + item.quantity, 0)} article(s) · ${formatPrice(
                      displayedTotal
                    )}`}
              </span>
            </div>
          </div>
          <button
            onClick={handleCloseDrawer}
            className="p-2 text-white/70 hover:text-white bg-[#1B1A1B] rounded-full transition-colors cursor-pointer"
            aria-label={t.close}
          >
            <X size={20} />
          </button>
        </div>

        {/* Zone défilante au-dessus du pied collé, avec 120px de marge en bas (pb-[120px]) */}
        <div className="flex-1 overflow-y-auto px-4 pt-4 pb-[120px] space-y-5 text-white">
          {step === 'status' && currentOrder ? (
            <div className="flex flex-col items-center justify-center text-center space-y-4 py-2 animate-fadeIn">
              {/* =============================================================
                  4. ÉTAT PAYÉ → "Paiement confirmé ✅" + ouverture auto WhatsApp
                     + gros bouton "Envoyer ma commande sur WhatsApp"
              ============================================================= */}
              {orderPaymentStatus === 'paid' ? (
                <>
                  <div className="p-4 bg-[#7477FF]/20 text-[#7477FF] rounded-full">
                    <CheckCircle2 size={46} />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg sm:text-xl font-black uppercase tracking-tight text-[#7477FF]">
                      Paiement confirmé ✅
                    </h3>
                    <p className="text-xs text-[#C5D4CA] px-2 leading-relaxed">
                      Votre paiement{' '}
                      <strong className="text-white">
                        {networkDisplayLabel(currentOrder.paymentMethod)}
                      </strong>{' '}
                      de <strong className="text-[#F9CD61]">{formatPrice(currentOrder.totalAmount)}</strong>{' '}
                      pour la commande <strong className="text-white">{currentOrder.id}</strong> a
                      été confirmé par le serveur.
                    </p>
                  </div>

                  {/* Aperçu du message WhatsApp de commande */}
                  <div className="w-full bg-[#312F30] p-4 rounded-[20px] text-left font-mono text-[11px] text-white/90 whitespace-pre-wrap break-words leading-relaxed border border-[#7477FF]/40">
                    {buildPaidWhatsAppMessage(currentOrder)}
                  </div>

                  <div className="w-full space-y-2.5 pt-1">
                    {/* Gros bouton "Envoyer ma commande sur WhatsApp" */}
                    <a
                      href={getWhatsAppUrl(currentOrder)}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full h-[56px] min-h-[56px] px-5 bg-[#7477FF] hover:bg-[#7477FF]/90 text-white font-black uppercase tracking-wider text-sm sm:text-base rounded-full flex items-center justify-center gap-2.5 transition-all"
                    >
                      <Send size={18} />
                      <span>Envoyer ma commande sur WhatsApp</span>
                    </a>

                    <button
                      type="button"
                      onClick={handleCopyMessage}
                      className="w-full py-3.5 bg-[#312F30] hover:bg-[#312F30]/80 text-white font-black uppercase tracking-wider text-xs rounded-full flex items-center justify-center gap-2 transition-colors cursor-pointer min-h-[48px]"
                    >
                      {copiedMsg ? (
                        <Check size={14} className="text-[#C5D4CA]" />
                      ) : (
                        <Copy size={14} />
                      )}
                      <span>{copiedMsg ? 'Message copié !' : 'Copier le message de commande'}</span>
                    </button>
                  </div>
                </>
              ) : orderPaymentStatus === 'failed' || orderPaymentStatus === 'expired' ? (
                /* =============================================================
                   5. ÉTAT ÉCHEC OU EXPIRÉ → message clair + boutons
                      "Renvoyer la demande" et "Changer de numéro"
                ============================================================= */
                <>
                  <div className="p-4 bg-[#F66554]/20 text-[#F66554] rounded-full">
                    <AlertCircle size={44} />
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-lg font-black uppercase tracking-tight text-[#F66554]">
                      {orderPaymentStatus === 'expired'
                        ? 'Délai de paiement expiré (2 min)'
                        : 'Échec de la validation du paiement'}
                    </h3>
                    <p className="text-xs text-[#C5D4CA] px-2 leading-relaxed">
                      {statusErrorDetail ||
                        'La demande Push USSD n’a pas été confirmée à temps sur votre téléphone.'}
                    </p>
                  </div>

                  <div className="w-full bg-[#312F30] rounded-[20px] p-4 text-xs space-y-1.5 text-left border-none text-white">
                    <div className="flex items-center justify-between">
                      <span className="text-[#C5D4CA]">Commande :</span>
                      <span className="font-mono font-bold text-white">{currentOrder.id}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#C5D4CA]">Numéro à débiter :</span>
                      <span className="font-mono font-bold text-white">
                        {debitPhoneCheck.formattedDisplay || currentOrder.customerPhone}
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[#C5D4CA]">Montant :</span>
                      <span className="font-black text-[#F9CD61]">
                        {formatPrice(currentOrder.totalAmount)}
                      </span>
                    </div>
                  </div>

                  <div className="w-full space-y-2.5 pt-1">
                    <button
                      type="button"
                      disabled={loadingPay}
                      onClick={handleResendPushRequest}
                      className="w-full h-[52px] px-4 bg-[#F66554] hover:bg-[#F66554]/90 disabled:opacity-50 text-white font-black uppercase tracking-wider text-xs sm:text-sm rounded-full flex items-center justify-center gap-2 transition-colors cursor-pointer min-h-[48px]"
                    >
                      <RefreshCw size={16} className={loadingPay ? 'animate-spin' : ''} />
                      <span>
                        {loadingPay ? 'Envoi de la demande…' : 'Renvoyer la demande'}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleChangeDebitNumber}
                      className="w-full h-[48px] px-4 bg-[#312F30] hover:bg-[#312F30]/80 text-white font-black uppercase tracking-wider text-xs sm:text-sm rounded-full flex items-center justify-center gap-2 transition-colors cursor-pointer min-h-[48px]"
                    >
                      <PhoneCall size={15} />
                      <span>Changer de numéro</span>
                    </button>

                    {/* WhatsApp bloqué */}
                    <div className="w-full py-3 px-3 bg-[#1B1A1B] text-white/50 font-bold text-xs rounded-full flex items-center justify-center gap-2 cursor-not-allowed select-none border border-white/5">
                      <Lock size={14} className="text-[#F66554] shrink-0" />
                      <span>WhatsApp bloqué tant que le paiement n&apos;est pas confirmé</span>
                    </div>
                  </div>
                </>
              ) : (
                /* =============================================================
                   3. ÉCRAN D'ATTENTE DANS LE SITE (SANS REDIRECTION) :
                      "Validez le paiement sur votre téléphone (tapez votre code secret)",
                      animation, compte à rebours de 2 min, polling /api/status.php toutes les 4 s
                ============================================================= */
                <>
                  {/* Animation téléphone Push USSD */}
                  <div className="relative flex items-center justify-center my-2">
                    <span className="absolute w-20 h-20 rounded-full bg-[#F66554]/15 animate-ping" />
                    <span className="absolute w-16 h-16 rounded-full bg-[#F66554]/20 animate-pulse" />
                    <div className="relative z-10 w-16 h-16 rounded-full bg-[#F66554] text-white flex items-center justify-center shadow-lg">
                      <Smartphone size={30} className="animate-bounce" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="inline-flex items-center gap-2 bg-[#312F30] px-4 py-2 rounded-full text-xs font-black uppercase tracking-wider text-white">
                      <PaymentNetworkLogo
                        network={currentOrder.paymentMethod || paymentMode}
                        variant="mini"
                      />
                      <span>{networkDisplayLabel(currentOrder.paymentMethod || paymentMode)}</span>
                      <span className="text-white/40">•</span>
                      <span className="font-mono text-[#F9CD61]">{currentOrder.id}</span>
                    </div>

                    <h3 className="text-base sm:text-lg font-black uppercase tracking-tight text-white leading-snug px-2">
                      Validez le paiement sur votre téléphone (tapez votre code secret)
                    </h3>

                    <p className="text-xs text-[#C5D4CA] px-2 leading-relaxed">
                      Demande Push USSD de{' '}
                      <strong className="text-[#F9CD61] font-black">
                        {formatPrice(currentOrder.totalAmount)}
                      </strong>{' '}
                      envoyée sur le numéro{' '}
                      <strong className="font-mono text-white">
                        {debitPhoneCheck.formattedDisplay || currentOrder.customerPhone}
                      </strong>
                      .
                    </p>
                  </div>

                  {/* Compte à rebours de 2 min + barre de progression */}
                  <div className="w-full bg-[#312F30] rounded-[20px] p-4 space-y-2.5 border-none text-white">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-[#C5D4CA] flex items-center gap-1.5">
                        <Loader2 size={14} className="animate-spin text-[#F66554]" />
                        <span>Vérification auto toutes les 4 s…</span>
                      </span>
                      <span className="font-mono text-sm font-black text-[#F9CD61] bg-[#1B1A1B] px-3 py-1 rounded-full">
                        {formatCountdown(waitSecondsLeft)}
                      </span>
                    </div>

                    <div className="w-full h-2 bg-[#1B1A1B] rounded-full overflow-hidden">
                      <div
                        className="h-full bg-[#F66554] transition-all duration-1000 rounded-full"
                        style={{ width: `${Math.max(0, (waitSecondsLeft / 120) * 100)}%` }}
                      />
                    </div>

                    <p className="text-[11px] text-[#C5D4CA]/80">
                      Temps restant pour taper votre code secret sur le téléphone (2 min).
                    </p>
                  </div>

                  <div className="w-full space-y-2.5 pt-1">
                    {/* Actions rapides */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        disabled={loadingPay}
                        onClick={handleResendPushRequest}
                        className="py-3 px-3 bg-[#312F30] hover:bg-[#312F30]/80 text-white font-black uppercase text-xs rounded-full flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[48px]"
                      >
                        <RefreshCw size={13} className={loadingPay ? 'animate-spin' : ''} />
                        <span>Renvoyer</span>
                      </button>

                      <button
                        type="button"
                        onClick={handleChangeDebitNumber}
                        className="py-3 px-3 bg-[#312F30] hover:bg-[#312F30]/80 text-white font-black uppercase text-xs rounded-full flex items-center justify-center gap-1.5 transition-colors cursor-pointer min-h-[48px]"
                      >
                        <PhoneCall size={13} />
                        <span>Changer numéro</span>
                      </button>
                    </div>

                    {/* Indication WhatsApp bloqué */}
                    <div className="w-full py-3 px-3 bg-[#1B1A1B] text-white/50 font-bold text-xs rounded-full flex items-center justify-center gap-2 cursor-not-allowed select-none border border-white/5">
                      <Lock size={14} className="text-[#F66554] shrink-0" />
                      <span>WhatsApp bloqué (en attente de confirmation)</span>
                    </div>
                  </div>
                </>
              )}
            </div>
          ) : !hasOrderItems ? (
            /* PANIER VIDE */
            <div className="h-full flex flex-col items-center justify-center text-center space-y-4 py-12">
              <div className="w-16 h-16 rounded-full bg-[#312F30] flex items-center justify-center text-[#F66554]">
                <ShoppingBag size={30} />
              </div>
              <div className="space-y-1">
                <h3 className="text-base font-black uppercase tracking-tight text-white">{t.cartEmpty}</h3>
                <p className="text-xs text-[#C5D4CA] px-6">{t.cartEmptyCTA}</p>
              </div>
              <button
                onClick={handleCloseDrawer}
                className="px-8 py-3.5 bg-[#F66554] hover:bg-[#F66554]/90 text-white font-black uppercase text-xs rounded-full transition-colors cursor-pointer min-h-[48px]"
              >
                Découvrir la boutique
              </button>
            </div>
          ) : (
            /* PANIER + FORMULAIRE DE COMMANDE UNIFIÉS */
            <div className="space-y-5">
              {/* 1. Liste des articles du panier */}
              {cart.length > 0 && (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black uppercase tracking-wider text-[#C5D4CA]">
                      Articles ({cart.reduce((s, i) => s + i.quantity, 0)})
                    </span>
                    <span className="text-xs font-black text-[#F9CD61]">
                      Sous-total : {formatPrice(subtotal)}
                    </span>
                  </div>

                  {cart.map((item) => {
                    const variantStr = Object.entries(item.selectedVariants)
                      .map(([k, v]) => `${k} : ${v}`)
                      .join(', ');

                    return (
                      <div
                        key={item.id}
                        className="bg-[#312F30] p-3.5 rounded-[20px] flex gap-3 relative border-none text-white"
                      >
                        <img
                          src={item.product.image}
                          alt={item.product.name}
                          loading="lazy"
                          decoding="async"
                          referrerPolicy="no-referrer"
                          onError={(e) => {
                            (e.target as HTMLImageElement).src = FALLBACK_PRODUCT_IMAGE;
                          }}
                          className="w-14 h-14 object-cover rounded-xl bg-[#1B1A1B] shrink-0"
                        />
                        <div className="flex-1 flex flex-col justify-between min-w-0">
                          <div>
                            <h4 className="text-xs font-bold pr-6 text-white line-clamp-1">
                              {item.product.name}
                            </h4>
                            {variantStr && (
                              <p className="text-[10px] text-[#C5D4CA] truncate">{variantStr}</p>
                            )}
                          </div>

                          <div className="flex items-center justify-between mt-1.5">
                            <span className="text-xs font-black text-[#F9CD61]">
                              {formatPrice(item.product.price)}
                            </span>

                            <div className="flex items-center bg-[#1B1A1B] rounded-full p-0.5 gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  onUpdateQty(item.id, Math.max(1, item.quantity - 1))
                                }
                                className="p-1 text-white hover:text-white/80 rounded-full cursor-pointer font-black"
                                aria-label="Diminuer quantité"
                              >
                                <Minus size={12} />
                              </button>
                              <span className="text-xs font-black w-4 text-center text-white">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                disabled={item.quantity >= item.product.stock}
                                onClick={() => onUpdateQty(item.id, item.quantity + 1)}
                                className="p-1 text-white hover:text-white/80 disabled:opacity-30 rounded-full cursor-pointer font-black"
                                aria-label="Augmenter quantité"
                              >
                                <Plus size={12} />
                              </button>
                            </div>
                          </div>
                        </div>

                        <button
                          type="button"
                          onClick={() => onRemoveItem(item.id)}
                          className="absolute top-2.5 right-2.5 p-1 text-white/50 hover:text-[#F66554] rounded-lg transition-colors cursor-pointer"
                          aria-label={t.delete}
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* 2. Formulaire de commande & Choix du réseau */}
              <form
                id="phlox-checkout-form"
                onSubmit={handlePayOrder}
                className="space-y-4 pt-2 border-t border-white/10"
              >
                <div>
                  <h3 className="text-sm sm:text-base font-black uppercase tracking-tight text-white">
                    Informations de commande
                  </h3>
                  <p className="text-[11px] text-[#C5D4CA]">
                    Paiement 100 % sécurisé par Push USSD direct (sans redirection).
                  </p>
                </div>

                {/* Nom complet (Obligatoire) */}
                <div>
                  <label className="block text-xs font-bold text-[#C5D4CA] mb-1">
                    Votre nom <span className="text-[#F66554]">*</span>
                  </label>
                  <input
                    ref={nameInputRef}
                    type="text"
                    value={fullName}
                    onChange={(e) => {
                      setFullName(e.target.value);
                      setHighlightedFields((prev) => prev.filter((k) => k !== 'name'));
                      if (paymentError) setPaymentError(null);
                    }}
                    placeholder="Ex: Kofi Mensah"
                    className={`w-full text-white placeholder:text-white/40 text-sm px-4 py-3 rounded-full border-none transition-all focus:outline-hidden min-h-[48px] ${
                      highlightedFields.includes('name')
                        ? 'bg-[#F66554]/20 ring-2 ring-[#F66554]'
                        : 'bg-[#312F30]'
                    }`}
                  />
                </div>

                {/* Numéro du client (Obligatoire) */}
                <div>
                  <label className="block text-xs font-bold text-[#C5D4CA] mb-1">
                    Numéro du client (+228) <span className="text-[#F66554]">*</span>
                  </label>
                  <input
                    ref={phoneInputRef}
                    type="tel"
                    inputMode="tel"
                    value={phone}
                    onChange={(e) => {
                      const val = e.target.value;
                      setPhone(val);
                      if (!debitPhoneEdited) {
                        setDebitPhone(val);
                      }
                      setHighlightedFields((prev) =>
                        prev.filter((k) => k !== 'phone' && k !== 'debitPhone')
                      );
                      if (paymentError) setPaymentError(null);
                    }}
                    placeholder="Ex: 90 12 34 56 ou +228 90 12 34 56"
                    className={`w-full text-white placeholder:text-white/40 text-sm px-4 py-3 rounded-full border-none transition-all focus:outline-hidden font-mono min-h-[48px] ${
                      highlightedFields.includes('phone')
                        ? 'bg-[#F66554]/20 ring-2 ring-[#F66554]'
                        : 'bg-[#312F30]'
                    }`}
                  />
                </div>

                {/* Ville (Obligatoire) */}
                <div>
                  <label className="block text-xs font-bold text-[#C5D4CA] mb-1">
                    Ville de livraison <span className="text-[#F66554]">*</span>
                  </label>
                  <select
                    ref={citySelectRef}
                    value={city}
                    onChange={(e) => {
                      setCity(e.target.value);
                      setHighlightedFields((prev) => prev.filter((k) => k !== 'city'));
                    }}
                    className={`w-full text-white text-sm px-4 py-3 rounded-full border-none transition-all focus:outline-hidden min-h-[48px] ${
                      highlightedFields.includes('city')
                        ? 'bg-[#F66554]/20 ring-2 ring-[#F66554]'
                        : 'bg-[#312F30]'
                    }`}
                  >
                    {TOGO_CITIES.map((c) => (
                      <option key={c.name} value={c.name} className="bg-[#1B1A1B] text-white">
                        {c.name} — Livraison {formatPrice(c.deliveryFee)} ({c.deliveryDelay[lang]})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Choix du réseau Mobile Money */}
                <div className="bg-[#312F30] rounded-[24px] p-4 space-y-3">
                  <div>
                    <label className="block text-xs font-black uppercase tracking-wider text-white mb-2">
                      1. Choix du réseau Mobile Money <span className="text-[#F66554]">*</span>
                    </label>
                    <div className="grid grid-cols-2 gap-3">
                      {/* Carte 1 : Mixx by Yas */}
                      <button
                        type="button"
                        onClick={() => setPaymentMode('TMONEY')}
                        className={`relative w-full rounded-[20px] p-3.5 flex flex-col items-center justify-center gap-2.5 transition-all cursor-pointer ${
                          paymentMode === 'TMONEY'
                            ? 'bg-[#1B1A1B] ring-2 ring-[#F66554]'
                            : 'bg-[#1B1A1B]/60 hover:bg-[#1B1A1B]'
                        }`}
                      >
                        {paymentMode === 'TMONEY' && (
                          <span
                            className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#7477FF] text-white flex items-center justify-center text-[11px] leading-none"
                            aria-label="Sélectionné"
                          >
                            ✓
                          </span>
                        )}
                        <PaymentNetworkLogo network="TMONEY" variant="tile" />
                        <span className="text-xs font-black text-white text-center">
                          Mixx by Yas
                        </span>
                      </button>

                      {/* Carte 2 : Flooz Money */}
                      <button
                        type="button"
                        onClick={() => setPaymentMode('FLOOZ')}
                        className={`relative w-full rounded-[20px] p-3.5 flex flex-col items-center justify-center gap-2.5 transition-all cursor-pointer ${
                          paymentMode === 'FLOOZ'
                            ? 'bg-[#1B1A1B] ring-2 ring-[#F66554]'
                            : 'bg-[#1B1A1B]/60 hover:bg-[#1B1A1B]'
                        }`}
                      >
                        {paymentMode === 'FLOOZ' && (
                          <span
                            className="absolute top-2 right-2 w-5 h-5 rounded-full bg-[#7477FF] text-white flex items-center justify-center text-[11px] leading-none"
                            aria-label="Sélectionné"
                          >
                            ✓
                          </span>
                        )}
                        <PaymentNetworkLogo network="FLOOZ" variant="tile" />
                        <span className="text-xs font-black text-white text-center">
                          Flooz Money
                        </span>
                      </button>
                    </div>
                  </div>

                  {/* Champ "Numéro à débiter" */}
                  <div>
                    <label className="block text-xs font-bold text-[#C5D4CA] mb-1">
                      Numéro à débiter ({paymentMode === 'FLOOZ' ? 'Flooz Money' : 'Mixx by Yas'}){' '}
                      <span className="text-[#F66554]">*</span>
                    </label>
                    <input
                      ref={debitPhoneInputRef}
                      type="tel"
                      inputMode="tel"
                      value={debitPhoneEdited ? debitPhone : phone}
                      onChange={(e) => {
                        setDebitPhoneEdited(true);
                        setDebitPhone(e.target.value);
                        setHighlightedFields((prev) => prev.filter((k) => k !== 'debitPhone'));
                        if (paymentError) setPaymentError(null);
                      }}
                      placeholder="Numéro qui recevra la demande Push USSD"
                      className={`w-full text-white placeholder:text-white/40 text-sm px-4 py-3 rounded-full border-none transition-all focus:outline-hidden font-mono min-h-[48px] ${
                        highlightedFields.includes('debitPhone')
                          ? 'bg-[#F66554]/20 ring-2 ring-[#F66554]'
                          : 'bg-[#1B1A1B]'
                      }`}
                    />
                    <span className="block text-[11px] text-[#C5D4CA] mt-1">
                      Pré-rempli avec votre numéro. Modifiez-le si vous payez depuis un autre téléphone.
                    </span>
                  </div>
                </div>

                {/* Champs optionnels : Quartier, repère et GPS */}
                <div className="pt-2 border-t border-white/10 space-y-2.5">
                  <div>
                    <label className="block text-xs font-bold text-[#C5D4CA] mb-1">
                      Quartier / Repère de livraison{' '}
                      <span className="text-white/40 font-normal">(optionnel)</span>
                    </label>
                    <input
                      type="text"
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="Ex: Quartier Bè-Klikamé, près de la pharmacie"
                      className="w-full bg-[#312F30] text-white placeholder:text-white/40 text-xs px-4 py-3 rounded-full border-none focus:outline-hidden min-h-[48px]"
                    />
                  </div>

                  <div className="flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={handleGetOptionalGps}
                      className="text-[11px] font-bold text-[#C5D4CA] hover:text-white bg-[#312F30] hover:bg-[#312F30]/80 px-4 py-2 rounded-full inline-flex items-center gap-1.5 cursor-pointer transition-colors"
                    >
                      <MapPin size={12} className="text-[#F66554]" />
                      <span>
                        {locatingGps
                          ? 'Localisation en cours...'
                          : gpsCoords
                          ? `GPS ajouté (${gpsCoords})`
                          : 'Ajouter ma position GPS (optionnel)'}
                      </span>
                    </button>
                  </div>
                </div>

                {/* CODE PROMO INPUT FIELD */}
                <div className="pt-2 border-t border-white/10 space-y-1.5">
                  <label className="block text-xs font-bold text-[#C5D4CA]">
                    Code Promo (Coupon Code)
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="Ex: WELCOME10"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value)}
                      disabled={!!appliedCoupon}
                      className="flex-1 bg-[#312F30] text-white placeholder:text-white/40 text-xs px-4 py-3 rounded-full border-none uppercase font-mono focus:outline-hidden min-h-[48px]"
                    />
                    <button
                      type="button"
                      disabled={isValidatingCoupon || !!appliedCoupon}
                      onClick={handleApplyCoupon}
                      className="px-5 py-3 bg-[#7477FF] hover:bg-[#7477FF]/90 disabled:bg-[#312F30] disabled:text-[#C5D4CA] text-white font-black uppercase text-xs rounded-full transition-colors cursor-pointer shrink-0 min-h-[48px]"
                    >
                      {appliedCoupon ? 'Appliqué ✓' : (isValidatingCoupon ? '...' : 'Appliquer')}
                    </button>
                  </div>
                  {couponError && <p className="text-[10px] text-[#F66554] font-bold">{couponError}</p>}
                  {appliedCoupon && (
                    <p className="text-[10px] text-[#F9CD61] font-black">
                      Code appliqué : -{formatPrice(appliedCoupon.discountAmount)} de réduction !
                    </p>
                  )}
                </div>

                <div className="p-3.5 bg-[#312F30] rounded-[20px] text-xs space-y-1 text-[#C5D4CA]">
                  <div className="flex items-center gap-1.5 text-white font-bold">
                    <Truck size={14} className="text-[#F66554] shrink-0" />
                    <span>
                      Livraison {city} : {formatPrice(deliveryFee)} (
                      {selectedCityInfo.deliveryDelay[lang]})
                    </span>
                  </div>
                </div>
              </form>
            </div>
          )}
        </div>

        {/* PIED DE TIROIR STICKY */}
        {(hasOrderItems || (step === 'status' && currentOrder)) && (
          <div className="sticky bottom-0 left-0 right-0 z-50 shrink-0 bg-[#312F30] border-t border-white/10 px-4 pt-3 pb-[calc(0.85rem+env(safe-area-inset-bottom,0px))] space-y-2">
            {/* Message d'erreur */}
            {paymentError && step === 'checkout' && (
              <div className="p-3 bg-[#F66554]/20 rounded-xl flex items-start gap-2 text-xs text-[#F66554] font-bold animate-fadeIn">
                <AlertCircle size={15} className="shrink-0 mt-0.5" />
                <span>{paymentError}</span>
              </div>
            )}

            {step === 'status' && orderPaymentStatus === 'paid' ? (
              /* État Paiement Confirmé */
              <button
                type="button"
                onClick={() => {
                  if (currentOrder) {
                    window.location.assign(getWhatsAppUrl(currentOrder));
                  }
                }}
                className="w-full h-[56px] min-h-[56px] px-4 rounded-full bg-[#7477FF] hover:bg-[#7477FF]/90 text-white font-black uppercase text-sm sm:text-base flex items-center justify-center gap-2 transition-all cursor-pointer"
              >
                <span>
                  ✅ Paiement confirmé ({formatPrice(currentOrder?.totalAmount || displayedTotal)})
                </span>
              </button>
            ) : step === 'checkout' ? (
              <>
                {/* Bouton Payer */}
                <button
                  type="button"
                  onClick={handlePayOrder}
                  disabled={loadingPay}
                  aria-disabled={!isFormValid || loadingPay}
                  className={`w-full h-[56px] min-h-[56px] px-4 rounded-full font-black uppercase tracking-wider text-white text-sm sm:text-base flex items-center justify-center gap-2 transition-all duration-150 cursor-pointer select-none ${
                    isPressed ? 'scale-[0.96]' : 'active:scale-[0.96]'
                  } ${isShaking ? 'animate-pay-shake' : ''} ${
                    isFormValid || loadingPay
                      ? 'bg-[#F66554] hover:bg-[#F66554]/90'
                      : 'bg-[#F66554]/60 hover:bg-[#F66554]/75'
                  }`}
                >
                  {loadingPay ? (
                    <>
                      <Loader2 size={19} className="animate-spin shrink-0" />
                      <span>Envoi de la demande…</span>
                    </>
                  ) : (
                    <span>🔒 Payer {formatPrice(displayedTotal)}</span>
                  )}
                </button>

                {/* Message explicite dessous */}
                {missingFields.length > 0 && (
                  <p className="text-[11px] text-center font-bold text-[#F66554]">
                    Il manque : {missingFields.join(', ')}
                  </p>
                )}
              </>
            ) : null}

            {/* Sous le bouton */}
            <div className="flex items-center justify-center gap-2 pt-0.5 text-[11px] text-[#C5D4CA] font-medium">
              <div className="flex items-center gap-1.5 shrink-0">
                <PaymentNetworkLogo network="TMONEY" variant="mini" />
                <PaymentNetworkLogo network="FLOOZ" variant="mini" />
              </div>
              <ShieldCheck size={13} className="text-[#7477FF] shrink-0" />
              <span className="truncate">
                Paiement sécurisé • Validation sur votre téléphone
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
