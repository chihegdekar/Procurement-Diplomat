/* ============================================================
   GET /api/order?pi=pi_...&cs=<client_secret>

   Lets the one-time-offer and access pages show a buyer exactly
   what they just bought.

   The client secret is required as proof: it is only ever handed
   to the browser that created the payment, so knowing a payment
   ID alone is not enough to read someone else's order.
   ============================================================ */

import { json, stripeRequest, CATALOGUE, DELIVERY } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  const { pi, cs } = req.query || {};
  if (!pi || !cs) return json(res, 400, { error: 'Missing order reference.' });

  try {
    const intent = await stripeRequest('GET', `/payment_intents/${encodeURIComponent(pi)}`);

    if (intent.client_secret !== cs) {
      return json(res, 403, { error: 'Order reference does not match.' });
    }
    if (intent.status !== 'succeeded') {
      return json(res, 402, { error: 'This payment has not completed.', status: intent.status });
    }

    const meta = intent.metadata || {};
    const bumps = (meta.bumps || '').split(',').filter((k) => CATALOGUE[k]);

    return json(res, 200, {
      email: meta.email || intent.receipt_email || '',
      name: meta.name || '',
      total: intent.amount_received,
      items: ['workshop', ...bumps].map((key) => ({
        key,
        label: CATALOGUE[key].label,
        amount: CATALOGUE[key].amount,
        // Only ever hand back the assets this buyer actually paid for.
        delivery: DELIVERY[key] || null,
      })),
    });
  } catch (err) {
    console.error('[order] lookup failed:', err.message);
    return json(res, 404, { error: 'Order not found.' });
  }
}
