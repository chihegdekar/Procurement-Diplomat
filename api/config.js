/* ============================================================
   GET /api/config  —  the browser's boot values.

   Only the Stripe *publishable* key, which is designed to be
   public and is safe in page source. It lives here rather than
   hardcoded in HTML so rotating it is one Vercel setting and a
   redeploy, not a hunt through every page.

   The thanks page needs it to take a card from someone who did
   not pay at signup, and it cannot ask /api/lead for it without
   re-tagging that person as a fresh lead.
   ============================================================ */

import { json } from './_lib.js';

export default async function handler(req, res) {
  if (req.method !== 'GET') return json(res, 405, { error: 'Method not allowed' });

  return json(res, 200, {
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
  });
}
