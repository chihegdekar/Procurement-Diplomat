/* ============================================================
   POST /api/lead  —  step 1 of the order form.

   Captures the name and email into Kit the moment they finish
   the contact step, so a checkout abandoned at the billing step
   still leaves you a lead you can follow up.

   Kit is treated as best-effort on purpose: if it is slow or
   down, the buyer still moves to the payment step. Losing a tag
   is recoverable; losing a sale is not.
   ============================================================ */

import { json, isEmail, upsertSubscriber, tagSubscriber, KIT } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'POST') return json(res, 405, { error: 'Method not allowed' });

  const { email, name } = req.body || {};

  if (!isEmail(email)) return json(res, 400, { error: 'A valid email address is required.' });
  if (!name || !String(name).trim()) return json(res, 400, { error: 'Your name is required.' });

  const cleanEmail = String(email).trim().toLowerCase();
  const firstName = String(name).trim().split(/\s+/)[0];

  // The browser needs this to boot Stripe.js. Returning it here saves the
  // popup a second round-trip before it can render the card field.
  const publishableKey = process.env.STRIPE_PUBLISHABLE_KEY || '';

  let captured = false;
  try {
    await upsertSubscriber({ email: cleanEmail, firstName });
    await tagSubscriber(KIT.tags.lead, cleanEmail);
    await tagSubscriber(KIT.tags.abandoned, cleanEmail); // cleared on payment
    captured = true;
  } catch (err) {
    console.error('[lead] Kit capture failed:', err.message);
  }

  return json(res, 200, { ok: true, captured, publishableKey });
}
