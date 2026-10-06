import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.8";

serve(async (req) => {
  // CORS configuration
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
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseServiceKey) {
      return new Response(
        JSON.stringify({ status: "error", message: "Configuration Supabase manquante." }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Read payload parameters from POST callback
    const data = await req.json();
    const txReference = String(data.tx_reference || "").trim();
    const identifier = String(data.identifier || "").trim().toUpperCase();
    const callbackAmount = Number(data.amount || 0);

    if (!identifier || !txReference) {
      return new Response(
        JSON.stringify({ status: "error", message: "Paramètres identifiant ou tx_reference manquants." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 1. Fetch Payment Attempt Record from Database
    const { data: payment, error: paymentErr } = await supabase
      .from("payments")
      .select("*")
      .eq("identifier", identifier)
      .maybeSingle();

    if (paymentErr || !payment) {
      return new Response(
        JSON.stringify({ status: "error", message: "Paiement introuvable pour ce callback." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Idempotency check: If already paid, return 200 immediately
    if (payment.status === "paid") {
      return new Response(
        JSON.stringify({ status: "success", message: "Transaction déjà validée." }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 2. Query PayGate status API to double-check authenticity
    const paygateApiKey = Deno.env.get("PAYGATE_API_KEY");
    if (!paygateApiKey) {
      return new Response(
        JSON.stringify({ status: "error", message: "Clé API PayGate manquante sur le serveur." }),
        { status: 503, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const verifyRes = await fetch("https://paygateglobal.com/api/v2/status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        auth_token: paygateApiKey,
        identifier: identifier
      })
    });

    const verifyData = await verifyRes.json();
    const pgStatus = typeof verifyData.status === "number" ? verifyData.status : -1;

    if (pgStatus !== 0) {
      // Rejection: log attempt status
      await supabase
        .from("payments")
        .update({
          status: "failed",
          paygate_status: pgStatus,
          paygate_message: "Échec de vérification callback."
        })
        .eq("id", payment.id);

      return new Response(
        JSON.stringify({ status: "error", message: "La transaction n'est pas confirmée payée par PayGate." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify transaction amount matches registered record
    if (Math.abs(callbackAmount - payment.amount) > 0.1) {
      await supabase
        .from("payments")
        .update({
          status: "failed",
          paygate_status: pgStatus,
          paygate_message: "Écart de montant détecté au callback."
        })
        .eq("id", payment.id);

      return new Response(
        JSON.stringify({ status: "error", message: "Montant de la transaction non concordant." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // 3. Mark payment and associated Order as paid!
    await supabase
      .from("payments")
      .update({
        status: "paid",
        tx_reference: txReference,
        paygate_status: 0,
        paygate_message: "Confirmé par callback."
      })
      .eq("id", payment.id);

    await supabase
      .from("orders")
      .update({
        status: "paid",
        paid_at: new Date().toISOString()
      })
      .eq("id", payment.order_id);

    // 4. Update stock levels for the ordered items
    const { data: orderItems } = await supabase
      .from("order_items")
      .select("product_id, quantity")
      .eq("order_id", payment.order_id);

    if (orderItems) {
      for (const item of orderItems) {
        if (item.product_id) {
          const { data: prod } = await supabase
            .from("products")
            .select("stock")
            .eq("id", item.product_id)
            .single();

          if (prod) {
            await supabase
              .from("products")
              .update({ stock: Math.max(0, prod.stock - item.quantity) })
              .eq("id", item.product_id);
          }
        }
      }
    }

    // 5. Update coupon usage count if used in order
    const { data: order } = await supabase
      .from("orders")
      .select("promo_code")
      .eq("id", payment.order_id)
      .single();

    if (order && order.promo_code) {
      const { data: coupon } = await supabase
        .from("promo_codes")
        .select("used_count")
        .eq("code", order.promo_code)
        .single();

      if (coupon) {
        await supabase
          .from("promo_codes")
          .update({ used_count: coupon.used_count + 1 })
          .eq("code", order.promo_code);
      }
    }

    return new Response(
      JSON.stringify({ status: "success", identifier, message: `Paiement et commande validés avec succès.` }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ status: "error", message: err.message || "Erreur interne de traitement callback." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
