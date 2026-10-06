import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

// ---------------------------------------------------------------------
// CONFIGURATION & CONSTANTS
// ---------------------------------------------------------------------
const TOGO_PHONE_LENGTH = 8;
const MERCHANT_NAME = "PHLOX TOGO";

// Helper to format/validate Togo phone numbers to exactly 8 local digits
function normalizeTogoPaygatePhone(raw: string): { valid: boolean; fullPhone: string; local8: string } {
  const digits = String(raw || "").replace(/\D/g, "");
  let subscriber8 = digits;

  if (digits.startsWith("00228") && digits.length >= 13) {
    subscriber8 = digits.slice(5, 13);
  } else if (digits.startsWith("228") && digits.length >= 11) {
    subscriber8 = digits.slice(3, 11);
  } else {
    subscriber8 = digits.slice(0, 8);
  }

  if (subscriber8.length !== 8) {
    return { valid: false, fullPhone: "", local8: "" };
  }
  return { valid: true, fullPhone: `228${subscriber8}`, local8: subscriber8 };
}

// ---------------------------------------------------------------------
// DENO SERVER ROUTE
// ---------------------------------------------------------------------
serve(async (req) => {
  // CORS configuration limited to phlox-togo.com, netlify.app preview URLs, and localhost
  const origin = req.headers.get("origin") || "";
  const allowedOrigins = [
    "https://phlox-togo.com",
    "https://phlox-togo.netlify.app",
    "http://localhost:3000",
    "http://localhost:5173"
  ];
  let allowOrigin = "https://phlox-togo.com";
  if (allowedOrigins.includes(origin) || origin.endsWith(".netlify.app")) {
    allowOrigin = origin;
  }

  const corsHeaders = {
    "Access-Control-Allow-Origin": allowOrigin,
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Initialize Supabase Client with service role to bypass RLS for server writes
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ status: "error", message: "Configuration Supabase manquante." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Read payload parameters
    const body = await req.json();
    const network = String(body.network || "TMONEY").toUpperCase() === "FLOOZ" ? "FLOOZ" : "TMONEY";
    const promoCode = String(body.promoCode || body.couponCode || "").trim().toUpperCase();

    // Parse debit phone
    const rawDebitPhone = body.debitPhone || body.debit_phone || body.phone_number || "";
    const phoneParsed = normalizeTogoPaygatePhone(rawDebitPhone);
    if (!phoneParsed.valid) {
      return new Response(
        JSON.stringify({ status: "error", message: "Numéro à débiter invalide. Saisissez un numéro togolais à 8 chiffres." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Rate Limit: 3 requests per debit phone number in 10 minutes
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
    const { data: recentOrders, error: limitErr } = await supabase
      .from("orders")
      .select("id")
      .eq("debit_phone", phoneParsed.fullPhone)
      .gte("created_at", tenMinutesAgo);

    if (limitErr) {
      return new Response(
        JSON.stringify({ status: "error", message: "Erreur lors de la vérification du rate limit." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (recentOrders && recentOrders.length >= 3) {
      return new Response(
        JSON.stringify({ status: "error", message: "Trop de demandes de paiement. Limite de 3 tentatives en 10 minutes dépassée." }),
        { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check PayGate API Key presence
    const paygateApiKey = Deno.env.get("PAYGATE_API_KEY");
    if (!paygateApiKey) {
      return new Response(
        JSON.stringify({ status: "error", message: "Paiement indisponible (Service Marchand non configuré)." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // -----------------------------------------------------------------
    // CASE A: NEW ATTEMPT ON AN EXISTING ORDER ("Renvoyer la demande")
    // -----------------------------------------------------------------
    const existingOrderId = body.orderId || body.order_id;
    if (existingOrderId) {
      const { data: order, error: fetchOrderErr } = await supabase
        .from("orders")
        .select("*")
        .eq("id", existingOrderId)
        .maybeSingle();

      if (fetchOrderErr || !order) {
        return new Response(
          JSON.stringify({ status: "error", message: "Commande introuvable pour cette tentative." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check current highest attempt number to increment it
      const { data: previousPayments } = await supabase
        .from("payments")
        .select("attempt")
        .eq("order_id", order.id);

      const nextAttempt = (previousPayments?.length || 0) + 1;
      const paymentIdentifier = `${order.id}-${nextAttempt}`;
      const maskedPhone = phoneParsed.local8.slice(0, 2) + "•••" + phoneParsed.local8.slice(-3);

      // Create new payment record
      const { data: newPayment, error: paymentInsertErr } = await supabase
        .from("payments")
        .insert({
          order_id: order.id,
          attempt: nextAttempt,
          identifier: paymentIdentifier,
          network: network,
          phone_masked: maskedPhone,
          amount: order.total_amount,
          status: "initiated"
        })
        .select("id")
        .single();

      if (paymentInsertErr || !newPayment) {
        return new Response(
          JSON.stringify({ status: "error", message: "Impossible de créer la tentative de paiement." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Execute USSD PayGate Request
      try {
        const paygateResponse = await fetch("https://paygateglobal.com/api/v1/pay", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            auth_token: paygateApiKey,
            phone_number: phoneParsed.local8,
            amount: order.total_amount,
            description: `Commande ${order.id} (Tentative ${nextAttempt}) - ${MERCHANT_NAME}`,
            identifier: paymentIdentifier,
            network: network
          })
        });

        const paygateData = await paygateResponse.json();
        const pgStatus = typeof paygateData.status === "number" ? paygateData.status : -1;
        const pgMessage = paygateData.message || (pgStatus === 0 ? "Demande envoyée." : `Erreur PayGate code ${pgStatus}`);

        if (pgStatus === 0 && paygateData.tx_reference) {
          // Success: update payment to pending and save tx_reference
          await supabase
            .from("payments")
            .update({
              status: "pending",
              tx_reference: String(paygateData.tx_reference),
              paygate_status: pgStatus,
              paygate_message: pgMessage
            })
            .eq("id", newPayment.id);

          return new Response(
            JSON.stringify({
              status: "success",
              order_id: order.id,
              identifier: paymentIdentifier,
              amount: order.total_amount,
              expires_in: 120,
              message: `Demande USSD envoyée sur le +228${phoneParsed.local8}. Validez sur votre téléphone.`
            }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        } else {
          // Failed PayGate return
          await supabase
            .from("payments")
            .update({
              status: "failed",
              paygate_status: pgStatus,
              paygate_message: pgMessage
            })
            .eq("id", newPayment.id);

          return new Response(
            JSON.stringify({
              status: "error",
              message: `Paiement rejeté par PayGate : ${pgMessage}`
            }),
            { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      } catch (err: any) {
        await supabase
          .from("payments")
          .update({
            status: "failed",
            paygate_status: 500,
            paygate_message: `PayGate injoignable : ${err.message || err}`
          })
          .eq("id", newPayment.id);

        return new Response(
          JSON.stringify({ status: "error", message: `PayGate injoignable : ${err.message || err}` }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // -----------------------------------------------------------------
    // CASE B: SECURE CREATION OF A BRAND NEW ORDER
    // -----------------------------------------------------------------
    const client = body.client || {};
    const articles = body.items || body.articles || [];

    if (!Array.isArray(articles) || articles.length === 0) {
      return new Response(
        JSON.stringify({ status: "error", message: "Aucun article dans la commande." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const customerName = String(client.fullName || client.customerName || "Anonyme").trim();
    const rawCustomerPhone = client.phone || client.customerPhone || "";
    const customerPhoneCheck = normalizeTogoPaygatePhone(rawCustomerPhone);

    if (!customerPhoneCheck.valid) {
      return new Response(
        JSON.stringify({ status: "error", message: "Numéro de contact du client invalide." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const city = String(client.city || "Lomé").trim();
    const address = String(client.address || "").trim();
    const landmark = String(client.landmark || "").trim();
    const gps = String(client.gps || "").trim();

    // 1. Fetch products from Database
    const productIds = articles.map((a: any) => a.product_id || a.productId);
    const { data: dbProducts, error: prodErr } = await supabase
      .from("products")
      .select("*")
      .in("id", productIds);

    if (prodErr || !dbProducts) {
      return new Response(
        JSON.stringify({ status: "error", message: "Impossible de charger les produits du catalogue." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Load active Promotions campaigns
    const nowStr = new Date().toISOString();
    const { data: dbPromotions } = await supabase
      .from("promotions")
      .select("*")
      .eq("is_active", true)
      .lte("starts_at", nowStr)
      .gte("ends_at", nowStr);

    let subtotal = 0;
    const resolvedItems = [];

    // 3. Process each item to calculate price on server
    for (const article of articles) {
      const prodId = article.product_id || article.productId;
      const qty = Math.max(1, Math.round(Number(article.quantity) || 1));
      const product = dbProducts.find((p) => p.id === prodId);

      if (!product) {
        return new Response(
          JSON.stringify({ status: "error", message: `Produit inconnu: ${prodId}` }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (product.status !== "published") {
        return new Response(
          JSON.stringify({ status: "error", message: `Le produit "${product.name}" n'est plus publié.` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (product.stock < qty) {
        return new Response(
          JSON.stringify({ status: "error", message: `Stock insuffisant pour "${product.name}". Disponible: ${product.stock}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check server promotions
      let unitPrice = product.price;
      if (dbPromotions && dbPromotions.length > 0) {
        for (const promo of dbPromotions) {
          const isTargeted =
            (promo.product_ids?.length === 0 && promo.category_ids?.length === 0) ||
            promo.product_ids?.includes(product.id) ||
            promo.category_ids?.includes(product.category_id);

          if (isTargeted) {
            if (promo.discount_type === "percent") {
              unitPrice = Math.round(product.price * (1 - promo.discount_value / 100));
            } else if (promo.discount_type === "fixed") {
              unitPrice = Math.max(0, product.price - promo.discount_value);
            }
            break;
          }
        }
      }

      // Add selected variations extras
      const selectedVariants = article.selectedVariants || article.selected_variants || {};
      if (product.variants && Array.isArray(product.variants)) {
        for (const variantDef of product.variants) {
          const clientChoice = selectedVariants[variantDef.nameFr] || selectedVariants[variantDef.nameEn];
          if (clientChoice && Array.isArray(variantDef.values)) {
            const matchValue = variantDef.values.find(
              (v: any) => v.label === clientChoice || String(v) === clientChoice
            );
            if (matchValue && typeof matchValue === "object" && typeof matchValue.extra === "number") {
              unitPrice += matchValue.extra;
            }
          }
        }
      }

      subtotal += unitPrice * qty;
      resolvedItems.push({
        product_id: product.id,
        product_name: product.name,
        unit_price: unitPrice,
        quantity: qty,
        variants: selectedVariants
      });
    }

    // 4. Secure Promo code validations
    let discount = 0;
    let promoCodeApplied = null;

    if (promoCode) {
      const { data: coupon } = await supabase
        .from("promo_codes")
        .select("*")
        .eq("code", promoCode)
        .eq("is_active", true)
        .maybeSingle();

      if (!coupon) {
        return new Response(
          JSON.stringify({ status: "error", message: "Code promo invalide ou inactif." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const expiryDate = coupon.expires_at ? new Date(coupon.expires_at) : null;
      if (expiryDate && expiryDate.getTime() < Date.now()) {
        return new Response(
          JSON.stringify({ status: "error", message: "Ce code promo a expiré." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (coupon.max_uses !== null && coupon.used_count >= coupon.max_uses) {
        return new Response(
          JSON.stringify({ status: "error", message: "Ce code promo a atteint sa limite d'utilisations." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (subtotal < coupon.min_amount) {
        return new Response(
          JSON.stringify({ status: "error", message: `Montant d'achat minimum non atteint. Minimum requis : ${coupon.min_amount} FCFA.` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Check limit per customer (max 1 use of the code per phone number)
      const { data: previousOrders } = await supabase
        .from("orders")
        .select("id")
        .eq("customer_phone", customerPhoneCheck.fullPhone)
        .eq("promo_code", promoCode)
        .in("status", ["paid", "preparing", "shipped", "delivered"]);

      if (previousOrders && previousOrders.length >= 1) {
        return new Response(
          JSON.stringify({ status: "error", message: "Vous avez déjà utilisé ce code promo." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      // Apply coupon
      promoCodeApplied = coupon.code;
      if (coupon.discount_type === "percent") {
        discount = Math.round(subtotal * (coupon.discount_value / 100));
      } else if (coupon.discount_type === "fixed") {
        discount = Math.min(subtotal, coupon.discount_value);
      }
    }

    // 5. Fetch delivery fee
    const { data: zone } = await supabase
      .from("delivery_zones")
      .select("fee")
      .eq("city", city)
      .eq("is_active", true)
      .maybeSingle();

    const deliveryFee = zone ? zone.fee : 1000;
    const totalAmount = Math.max(0, subtotal - discount) + deliveryFee;

    // 6. Manage customer registry
    let customerId = null;
    const { data: existingCustomer } = await supabase
      .from("customers")
      .select("id")
      .eq("phone", customerPhoneCheck.fullPhone)
      .maybeSingle();

    if (existingCustomer) {
      customerId = existingCustomer.id;
    } else {
      const { data: newCustomer, error: custErr } = await supabase
        .from("customers")
        .insert({ phone: customerPhoneCheck.fullPhone, name: customerName })
        .select("id")
        .single();

      if (custErr || !newCustomer) {
        return new Response(
          JSON.stringify({ status: "error", message: "Impossible d'enregistrer le client." }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
      customerId = newCustomer.id;
    }

    // 7. Insert order
    const expiresAt = new Date(Date.now() + 2 * 60 * 1000).toISOString(); // 2 min validity
    const { data: insertedOrder, error: orderInsertErr } = await supabase
      .from("orders")
      .insert({
        customer_id: customerId,
        customer_name: customerName,
        customer_phone: customerPhoneCheck.fullPhone,
        debit_phone: phoneParsed.fullPhone,
        city: city,
        address: address || null,
        landmark: landmark || null,
        gps: gps || null,
        network: network,
        subtotal: subtotal,
        delivery_fee: deliveryFee,
        discount: discount,
        total_amount: totalAmount,
        promo_code: promoCodeApplied,
        status: "pending",
        expires_at: expiresAt
      })
      .select("id")
      .single();

    if (orderInsertErr || !insertedOrder) {
      return new Response(
        JSON.stringify({ status: "error", message: `Erreur d'enregistrement de commande : ${orderInsertErr?.message || ""}` }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 8. Insert order items
    const orderItemsPayload = resolvedItems.map((item) => ({
      order_id: insertedOrder.id,
      product_id: item.product_id,
      product_name: item.product_name,
      unit_price: item.unit_price,
      quantity: item.quantity,
      variants: item.variants
    }));

    const { error: itemsInsertErr } = await supabase
      .from("order_items")
      .insert(orderItemsPayload);

    if (itemsInsertErr) {
      return new Response(
        JSON.stringify({ status: "error", message: "Impossible d'insérer les articles de la commande." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 9. Insert payment attempt 1
    const maskedPhone = phoneParsed.local8.slice(0, 2) + "•••" + phoneParsed.local8.slice(-3);
    const paymentIdentifier = `${insertedOrder.id}-1`;

    const { data: insertedPayment, error: paymentInsertErr } = await supabase
      .from("payments")
      .insert({
        order_id: insertedOrder.id,
        attempt: 1,
        identifier: paymentIdentifier,
        network: network,
        phone_masked: maskedPhone,
        amount: totalAmount,
        status: "initiated"
      })
      .select("id")
      .single();

    if (paymentInsertErr || !insertedPayment) {
      return new Response(
        JSON.stringify({ status: "error", message: "Erreur lors de la création de la tentative de paiement." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 10. Execute direct PayGate API call
    try {
      const paygateResponse = await fetch("https://paygateglobal.com/api/v1/pay", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          auth_token: paygateApiKey,
          phone_number: phoneParsed.local8,
          amount: totalAmount,
          description: `Commande ${insertedOrder.id} - ${MERCHANT_NAME}`,
          identifier: paymentIdentifier,
          network: network
        })
      });

      const paygateData = await paygateResponse.json();
      const pgStatus = typeof paygateData.status === "number" ? paygateData.status : -1;
      const pgMessage = paygateData.message || (pgStatus === 0 ? "Demande envoyée." : `Erreur PayGate code ${pgStatus}`);

      if (pgStatus === 0 && paygateData.tx_reference) {
        // Success: update payment to pending and save tx_reference
        await supabase
          .from("payments")
          .update({
            status: "pending",
            tx_reference: String(paygateData.tx_reference),
            paygate_status: pgStatus,
            paygate_message: pgMessage
          })
          .eq("id", insertedPayment.id);

        return new Response(
          JSON.stringify({
            status: "success",
            order_id: insertedOrder.id,
            identifier: paymentIdentifier,
            amount: totalAmount,
            expires_in: 120,
            message: `Demande USSD envoyée sur le +228${phoneParsed.local8}. Validez sur votre téléphone.`
          }),
          { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      } else {
        // Failed PayGate return
        await supabase
          .from("payments")
          .update({
            status: "failed",
            paygate_status: pgStatus,
            paygate_message: pgMessage
          })
          .eq("id", insertedPayment.id);

        return new Response(
          JSON.stringify({
            status: "error",
            message: `Paiement rejeté par PayGate : ${pgMessage}`
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    } catch (err: any) {
      await supabase
        .from("payments")
        .update({
          status: "failed",
          paygate_status: 500,
          paygate_message: `PayGate injoignable : ${err.message || err}`
        })
        .eq("id", insertedPayment.id);

      return new Response(
        JSON.stringify({ status: "error", message: `PayGate injoignable : ${err.message || err}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err: any) {
    return new Response(
      JSON.stringify({ status: "error", message: err.message || "Erreur interne de l'Edge Function." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
