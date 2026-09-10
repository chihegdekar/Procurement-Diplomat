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
  stripeRequest,
} from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const { email, name, bumps, comp } = req.body || {};
  if (!isEmail(email)) return json(res, 400, { error: 'A valid email address is required.' });

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanName = String(name || '').trim();

  // Priced here, never from the browser.
  const order = buildOrder(bumps);

  /* -----------------------------------------------------------------
     TEMP TEST COMP CODE — REMOVE BEFORE LAUNCH.
     Lets us run the real live funnel end to end (PaymentIntent, OTO,
     webhook, Kit tags, pixel Purchase) for the Stripe minimum of
     $0.50 instead of the full price. Append ?comp=CASTLE-TEST-2026
     to the workshop URL, then check out as normal.
     ----------------------------------------------------------------- */
  const COMP_CODE = 'CASTLE-TEST-2026';
  const isComp = typeof comp === 'string' && comp.trim() === COMP_CODE;
  const chargeAmount = isComp ? 50 : order.amount;

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
      amount: chargeAmount,
      currency: 'usd',
      customer: customer.id,
      receipt_email: cleanEmail,
      description: order.items.map((i) => i.label).join(' + '),
      setup_future_usage: 'off_session',
      automatic_payment_methods: { enabled: true },
      metadata: {
        funnel: 'contractor-workshop',
        email: cleanEmail,
        name: cleanName,
        bumps: order.bumps.join(','),
        items: order.items.map((i) => i.key).join(','),
        order_total: String(chargeAmount),
        comp: isComp ? 'true' : '',
      },
    });

    return json(res, 200, {
      clientSecret: intent.client_secret,
      paymentIntentId: intent.id,
      amount: chargeAmount,
      items: order.items.map((i) => ({ key: i.key, label: i.label, amount: i.amount })),
    });
  } catch (err) {
    console.error('[checkout] failed:', err.message);
    return json(res, 502, { error: 'We could not start the payment. Please try again.' });
  }
}
