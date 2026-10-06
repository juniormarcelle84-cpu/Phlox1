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

    // Get order ID and telephone from request params or body
    let orderId = "";
    let phone = "";

    if (req.method === "POST") {
      const body = await req.json();
      orderId = String(body.orderId || body.order_id || "").trim().toUpperCase();
      phone = String(body.phone || body.customerPhone || "").trim();
    } else {
      const url = new URL(req.url);
      orderId = String(url.searchParams.get("orderId") || url.searchParams.get("order_id") || "").trim().toUpperCase();
      phone = String(url.searchParams.get("phone") || url.searchParams.get("customerPhone") || "").trim();
    }

    if (!orderId || !phone) {
      return new Response(
        JSON.stringify({ status: "error", message: "Les paramètres orderId et phone sont requis." }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Clean phone number to digits only for relaxed verification comparisons
    const cleanPhone = phone.replace(/\D/g, "");

    // 1. Fetch Order details
    const { data: order, error: orderErr } = await supabase
      .from("orders")
      .select("*")
      .eq("id", orderId)
      .maybeSingle();

    if (orderErr || !order) {
      return new Response(
        JSON.stringify({ status: "error", message: "Commande introuvable." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Relaxed validation: check that order customer_phone or debit_phone matches the clean telephone digits
    const orderPhone = String(order.customer_phone || "").replace(/\D/g, "");
    const orderDebitPhone = String(order.debit_phone || "").replace(/\D/g, "");
    const isMatched =
      orderPhone === cleanPhone ||
      orderPhone.endsWith(cleanPhone) ||
      cleanPhone.endsWith(orderPhone) ||
      orderDebitPhone === cleanPhone ||
      orderDebitPhone.endsWith(cleanPhone) ||
      cleanPhone.endsWith(orderDebitPhone);

    if (!isMatched) {
      return new Response(
        JSON.stringify({ status: "error", message: "Commande non trouvée ou numéro de téléphone non concordant." }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check PayGate API Key
    const paygateApiKey = Deno.env.get("PAYGATE_API_KEY");

    // 2. Fetch Latest Payment attempt
    const { data: payments } = await supabase
      .from("payments")
      .select("*")
      .eq("order_id", order.id)
      .order("attempt", { ascending: false });

    let latestPayment = payments && payments.length > 0 ? payments[0] : null;

    // 3. Process active checking logic for pending order state
    if (order.status === "pending" && latestPayment) {
      // A. Automatic check for order time expiration (2 min limits)
      const expirationTime = order.expires_at ? new Date(order.expires_at).getTime() : Date.now();
      if (Date.now() > expirationTime) {
        // Mark payment and order as expired
        await supabase
          .from("payments")
          .update({ status: "expired" })
          .eq("id", latestPayment.id);

        await supabase
          .from("orders")
          .update({ status: "expired" })
          .eq("id", order.id);

        order.status = "expired";
        latestPayment.status = "expired";
      } else if (paygateApiKey && latestPayment.status === "pending") {
        // B. Active querying to PayGate global status API endpoint
        try {
          const statusRes = await fetch("https://paygateglobal.com/api/v2/status", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              auth_token: paygateApiKey,
              identifier: latestPayment.identifier
            })
          });

          const statusData = await statusRes.json();
          const pgStatus = typeof statusData.status === "number" ? statusData.status : -1;

          if (pgStatus === 0 && statusData.tx_reference) {
            // Transaction marked paid! Update structures securely
            const txReference = String(statusData.tx_reference);

            // Fetch order items to decrement stocks
            const { data: orderItems } = await supabase
              .from("order_items")
              .select("product_id, quantity")
              .eq("order_id", order.id);

            // Deduct stock levels securely
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

            // Increment coupon use count if applicable
            if (order.promo_code) {
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

            // Mark paid on db
            await supabase
              .from("payments")
              .update({
                status: "paid",
                tx_reference: txReference,
                paygate_status: pgStatus,
                paygate_message: statusData.message || "Confirmé par polling."
              })
              .eq("id", latestPayment.id);

            await supabase
              .from("orders")
              .update({
                status: "paid",
                paid_at: new Date().toISOString()
              })
              .eq("id", order.id);

            order.status = "paid";
            latestPayment.status = "paid";
          } else if (pgStatus === 4) {
            // Payment attempt expired
            await supabase
              .from("payments")
              .update({ status: "expired", paygate_status: pgStatus, paygate_message: statusData.message })
              .eq("id", latestPayment.id);

            await supabase
              .from("orders")
              .update({ status: "expired" })
              .eq("id", order.id);

            order.status = "expired";
            latestPayment.status = "expired";
          } else if (pgStatus === 6) {
            // Payment attempt cancelled / rejected
            await supabase
              .from("payments")
              .update({ status: "failed", paygate_status: pgStatus, paygate_message: statusData.message })
              .eq("id", latestPayment.id);

            await supabase
              .from("orders")
              .update({ status: "failed" })
              .eq("id", order.id);

            order.status = "failed";
            latestPayment.status = "failed";
          }
        } catch {
          // Ignore polling errors to remain resilient
        }
      }
    }

    // 4. Return secure response payload structure
    const isPaid = order.status === "paid" || order.status === "delivered";

    if (isPaid) {
      // Return order status with FULL purchase summary metadata
      const { data: orderItems } = await supabase
        .from("order_items")
        .select("*")
        .eq("order_id", order.id);

      return new Response(
        JSON.stringify({
          status: "success",
          order_status: order.status,
          paid: true,
          summary: {
            id: order.id,
            customerName: order.customer_name,
            customerPhone: order.customer_phone,
            totalAmount: order.total_amount,
            deliveryFee: order.delivery_fee,
            discount: order.discount,
            city: order.city,
            address: order.address,
            landmark: order.landmark,
            paymentMethod: order.network,
            items: orderItems?.map((item) => ({
              productName: item.product_name,
              quantity: item.quantity,
              price: item.unit_price,
              selectedVariants: item.variants
            })) || []
          }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    } else {
      // Return basic pending / failed status ONLY, completely hiding client data
      return new Response(
        JSON.stringify({
          status: "success",
          order_status: order.status,
          paid: false
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
  } catch (err: any) {
    return new Response(
      JSON.stringify({ status: "error", message: err.message || "Erreur interne." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
