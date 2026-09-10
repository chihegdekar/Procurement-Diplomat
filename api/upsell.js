/* ============================================================
   POST /api/upsell  —  one-click charge on the saved card.

   Charges the card stored during the original purchase, so the
   one-time-offer page needs a single click rather than a second
   card entry.

   Refuses to do anything unless the requested offer exists in
   OTO_CATALOGUE with a real amount — an unconfigured upsell must
   never guess at a price.
   ============================================================ */

import {
  json,
  stripeRequest,
  OTO_CATALOGUE,
  DELIVERY,
  KIT,
  tagSubscriber,
  addToSequence,
} from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const { pi, cs, offer } = req.body || {};
  if (!pi || !cs || !offer) return json(res, 400, { error: 'Missing order reference.' });

  const product = OTO_CATALOGUE[offer];
  if (!product || !product.amount) {
    console.error('[upsell] unconfigured offer requested:', offer);
    return json(res, 400, { error: 'This offer is not available.' });
  }

  try {
    // The client secret proves this browser owns the original order.
    const original = await stripeRequest('GET', `/payment_intents/${encodeURIComponent(pi)}`);
    if (original.client_secret !== cs) {
      return json(res, 403, { error: 'Order reference does not match.' });
    }
    if (original.status !== 'succeeded') {
      return json(res, 402, { error: 'The original payment has not completed.' });
    }

    const customer = original.customer;
    const paymentMethod = original.payment_method;
    if (!customer || !paymentMethod) {
      return json(res, 409, { error: 'No saved card is available for this order.' });
    }

    const email = (original.metadata?.email || original.receipt_email || '')
      .trim()
      .toLowerCase();

    /* TEMP — REMOVE BEFORE LAUNCH. If the original order used the test comp
       code, charge the Stripe minimum for the upsell too. See api/checkout.js. */
    const isComp = original.metadata?.comp === 'true';
    const upsellAmount = isComp ? 50 : product.amount;

    /* off_session + confirm means no redirect and no second card entry. If the
       bank demands authentication we surface that rather than silently failing. */
    const charge = await stripeRequest('POST', '/payment_intents', {
      amount: upsellAmount,
      currency: 'usd',
      customer,
      payment_method: paymentMethod,
      off_session: true,
      confirm: true,
      receipt_email: email || undefined,
      description: product.label,
      metadata: {
        funnel: 'contractor-workshop',
        stage: 'oto',
        offer: product.key,
        email,
        parent_payment: pi,
      },
    });

    if (charge.status !== 'succeeded') {
      return json(res, 402, {
        error: 'Your bank asked for extra verification. Nothing was charged.',
        status: charge.status,
      });
    }

    // Best-effort: the charge is what matters, tagging can be repaired later.
    if (email) {
      try {
        if (product.tag && KIT.tags[product.key]) {
          await tagSubscriber(KIT.tags[product.key], email);
        }
        if (product.sequence) await addToSequence(product.sequence, email);
      } catch (err) {
        console.error('[upsell] Kit write failed:', err.message);
      }
    }

    return json(res, 200, {
      ok: true,
      paymentIntentId: charge.id,
      amount: charge.amount,
      // So the OTO page can show the buyer their access straight away.
      delivery: DELIVERY[product.key] || null,
    });
  } catch (err) {
    console.error('[upsell] failed:', err.message);
    return json(res, 402, {
      error: 'That charge did not go through. Your original order is safe.',
    });
  }
}
