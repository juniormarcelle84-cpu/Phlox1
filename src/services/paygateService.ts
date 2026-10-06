import brandConfig from '../brand.config.json';
import { getOrders, saveOrders } from './storeService';

export interface PaygateServerConfig {
  configured: boolean;
  merchant: string;
  callbackUrl: string;
  methods: string[];
  keyMode: 'live' | 'mock';
}

export const checkPaygateServerConfig = async (): Promise<PaygateServerConfig> => {
  try {
    const res = await fetch('/api/paygate/config');
    if (!res.ok) throw new Error('Config endpoint unavailable');
    return await res.json();
  } catch {
    return {
      configured: false,
      merchant: brandConfig.name.toUpperCase(),
      callbackUrl: brandConfig.paygateCallbackUrl,
      methods: ['TMONEY', 'FLOOZ'],
      keyMode: (brandConfig.KEY_MODE as 'mock') || 'mock'
    };
  }
};

export const initiatePaygatePayment = async (params: {
  phone_number: string;
  amount: number;
  description?: string;
  identifier?: string;
  network: 'TMONEY' | 'FLOOZ';
  city?: string;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  promoCode?: string;
  affiliateRef?: string;
  items?: {
    productId: string;
    productName: string;
    quantity: number;
    price: number;
    selectedVariants?: Record<string, string>;
  }[];
}): Promise<{
  ok: boolean;
  status: string;
  paygate_status?: number;
  tx_reference?: string | null;
  identifier?: string;
  amount?: number;
  expires_in?: number;
  message: string;
  raw?: Record<string, unknown>;
}> => {
  try {
    const res = await fetch('/api/pay.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    const data = await res.json();
    return {
      ok: res.ok && (data.status === 'success' || data.status === 'warning'),
      status: data.status || 'error',
      paygate_status: data.paygate_status,
      tx_reference: data.tx_reference,
      identifier: data.identifier,
      amount: typeof data.amount === 'number' ? data.amount : params.amount,
      expires_in: typeof data.expires_in === 'number' ? data.expires_in : 120,
      message:
        data.message ||
        'Validez le paiement sur votre téléphone (tapez votre code secret).',
      raw: data
    };
  } catch {
    return {
      ok: false,
      status: 'error',
      message:
        'Erreur réseau lors de l’envoi de la demande Push USSD au serveur (/api/pay.php). Veuillez réessayer.'
    };
  }
};

/**
 * Interroge le serveur toutes les 4 s via /api/status.php pour connaître le statut réel de la commande.
 * Sécurité : Seul /api/status.php fait foi (pas de lecture localStorage pour marquer payé).
 */
export const queryServerOrderStatus = async (
  orderId: string
): Promise<{
  paid: boolean;
  orderStatus: 'pending' | 'paid' | 'failed' | 'expired';
}> => {
  const cleanId = orderId.trim().toUpperCase();
  let serverPaid = false;
  let serverOrderStatus: 'pending' | 'paid' | 'failed' | 'expired' = 'pending';

  try {
    const res = await fetch(`/api/status.php?identifier=${encodeURIComponent(cleanId)}`, {
      method: 'GET',
      headers: { Accept: 'application/json' }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && (data.paid === true || data.order_status === 'paid')) {
        serverPaid = true;
        serverOrderStatus = 'paid';
      } else if (data?.order_status === 'failed') {
        serverOrderStatus = 'failed';
      } else if (data?.order_status === 'expired') {
        serverOrderStatus = 'expired';
      }
    }
  } catch {
    // Ignore transient network error during polling
  }

  // Update client store only if server confirms paid
  if (serverPaid) {
    const orders = getOrders();
    const idx = orders.findIndex((o) => o.id.toUpperCase() === cleanId);
    if (idx > -1) {
      orders[idx].status = 'paid';
      orders[idx].paidAt = new Date().toISOString();
      orders[idx].waSent = true;
      saveOrders(orders);
    }
  }

  return {
    paid: serverPaid,
    orderStatus: serverPaid ? 'paid' : serverOrderStatus
  };
};

export const verifyPaygatePaymentStatus = async (params: {
  identifier?: string;
  tx_reference?: string;
}): Promise<Record<string, unknown>> => {
  try {
    const res = await fetch('/api/status.php', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });
    return await res.json();
  } catch {
    return {
      status: 'error',
      message: 'Impossible de contacter le serveur de vérification (/api/status.php).'
    };
  }
};
