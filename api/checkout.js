/* ============================================================
   POST /api/checkout  —  step 2 of the order form.

   Prices the order from the server-side catalogue, then creates
   the PaymentIntent the browser confirms against.

   The card is stored (setup_future_usage) so the one-time-offer
   page after this can charge with a single click instead of
   asking for card details a second time.
   ============================================================ */

import {
  json,
  isEmail,
  buildOrder,
  getFunnel,
  isClosed,
  stripeRequest,
  orderLabel,
  OTO_CATALOGUE,
} from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const { email, name, business, title, bumps, seats, funnel: funnelKey, offer: offerKey } = req.body || {};
  if (!isEmail(email)) return json(res, 400, { error: 'A valid email address is required.' });

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanName = String(name || '').trim();

  /* ---- a one-time offer bought with a fresh card ----------------------------
     Someone who registered free has no saved card, so they cannot be charged
     in one click. They get the same offer at the same price through the normal
     Payment Element instead. Priced from OTO_CATALOGUE, never from the
     browser, and refused outright if the offer is not defined. */
  let order;
  if (offerKey) {
    const funnel = getFunnel(funnelKey);
    if (!funnel) return json(res, 400, { error: 'Unknown checkout form.' });

    const product = OTO_CATALOGUE[offerKey];
    if (!product || !product.amount) {
      console.error('[checkout] unconfigured offer requested:', offerKey);
      return json(res, 400, { error: 'This offer is not available.' });
    }

    order = {
      funnel,
      bumps: [],
      items: [product],
      amount: product.amount,
      offer: product,
    };
  } else {
    // Priced here, never from the browser.
    order = buildOrder(funnelKey, bumps, seats);
    if (!order) return json(res, 400, { error: 'Unknown checkout form.' });
    if (order.error) return json(res, 400, { error: order.error });
    if (isClosed(order.funnel)) {
      return json(res, 410, { error: 'Booking has closed for this programme.' });
    }
  }

  /* A free funnel with nothing added has nothing to charge. Stripe rejects a
     zero PaymentIntent anyway; failing here says why. */
  if (order.amount <= 0) {
    return json(res, 400, {
      error: 'There is nothing to pay for. Please use the free signup instead.',
    });
  }

  try {
    /* One customer per email, reused on repeat purchases — this is what makes
       the saved card available to the upsell page later. */
    const found = await stripeRequest('GET', `/customers?email=${encodeURIComponent(cleanEmail)}&limit=1`);
    const customer = found.data?.[0]
      ? await stripeRequest('POST', `/customers/${found.data[0].id}`, {
          name: cleanName || undefined,
        })
      : await stripeRequest('POST', '/customers', {
          email: cleanEmail,
          name: cleanName || undefined,
        });

    const intent = await stripeRequest('POST', '/payment_intents', {
      amount: order.amount,
      currency: 'usd',
      customer: customer.id,
      receipt_email: cleanEmail,
      description: order.offer
        ? order.offer.label
        : orderLabel(order.funnel, order.bumps, order.seats).join(' + '),
      setup_future_usage: 'off_session',
      automatic_payment_methods: { enabled: true },
      metadata: {
        funnel: order.funnel.key,
        email: cleanEmail,
        name: cleanName,
        bumps: order.bumps.join(','),
        items: order.items.map((i) => i.key).join(','),
        seats: String(order.seats || 1),
        order_total: String(order.amount),
        // Carried so the webhook can write them to Kit after payment clears.
        business: String(business || '').trim().slice(0, 200),
        title: String(title || '').trim().slice(0, 200),
        /* Stamped so the webhook fulfils this as an offer rather than as a
           signup — it must not re-run the workshop welcome. */
        ...(order.offer ? { stage: 'oto', offer: order.offer.key } : {}),
      },
    });

    return json(res, 200, {
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      amount: order.amount,
      items: order.items.map((i) => ({ key: i.key, label: i.label, amount: i.amount })),
    });
  } catch (err) {
    console.error('[checkout] failed:', err.message);
    return json(res, 502, { error: 'We could not start the payment. Please try again.' });
  }
}
