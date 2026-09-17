/* ============================================================
   POST /api/register  —  the free path.

   The masterclass costs nothing, so a signup with no order bumps
   never touches Stripe. This endpoint does the same Kit writes
   the payment webhook does — tag, welcome sequence, clear the
   abandoned flag — and the browser goes straight to the thanks
   page.

   Only funnels priced at zero may come through here. A paid
   funnel that tried would be asking to be enrolled without
   paying, so it is refused rather than accommodated.

   Unlike /api/lead, Kit is NOT best-effort here: this call is
   the entire transaction. If the write fails the person is not
   registered, and they need to be told so they can retry.
   ============================================================ */

import { json, isEmail, buildOrder, fulfilSignup, profileFields } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const { email, name, business, title, funnel: funnelKey, bumps } = req.body || {};

  if (!isEmail(email)) return json(res, 400, { error: 'A valid email address is required.' });
  if (!name || !String(name).trim()) return json(res, 400, { error: 'Your name is required.' });

  const order = buildOrder(funnelKey, bumps);
  if (!order) return json(res, 400, { error: 'Unknown signup form.' });

  /* Priced server-side, so a browser that lies about its bumps gets caught
     here rather than walking away with a paid asset for nothing. */
  if (order.amount > 0) {
    return json(res, 400, {
      error: 'This order has something to pay for. Please complete checkout.',
    });
  }

  const cleanEmail = String(email).trim().toLowerCase();
  const cleanName = String(name).trim();

  try {
    await fulfilSignup({
      funnel: order.funnel,
      email: cleanEmail,
      name: cleanName,
      bumps: [],
      fields: {
        ...profileFields({ business, title }),
        workshop_order_total: '0.00',
        workshop_order_items: order.funnel.key,
        workshop_purchased_at: new Date().toISOString(),
      },
    });

    console.log('[register]', order.funnel.key, cleanEmail);
    return json(res, 200, { ok: true, email: cleanEmail, name: cleanName });
  } catch (err) {
    console.error('[register] failed:', err.message);
    return json(res, 502, {
      error: 'We could not save your spot. Please try again in a moment.',
    });
  }
}
