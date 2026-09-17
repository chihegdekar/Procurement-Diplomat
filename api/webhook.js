/* ============================================================
   POST /api/webhook  —  Stripe → Kit.

   Stripe tells us a payment actually cleared; we then write the
   result into Kit. This is the authoritative path: the browser
   is never trusted to report its own purchase, because anyone
   can call an endpoint and claim they paid.

   Runs on the edge runtime because it is the only one here that
   hands over the request body unparsed — signature verification
   needs the exact bytes Stripe signed, and any reserialisation
   would break the HMAC.

   Idempotent by design: Stripe retries on any non-2xx, and Kit's
   subscriber, tag and sequence writes all upsert, so a replayed
   event leaves the subscriber in exactly the same state.
   ============================================================ */

import {
  verifyStripeSignature,
  fulfilSignup,
  fulfilOffer,
  getFunnel,
  profileFields,
  CATALOGUE,
  OTO_CATALOGUE,
} from './_lib.js';

export const config = { runtime: 'edge' };

function reply(status, payload) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export default async function handler(request) {
  if (request.method !== 'POST') return reply(405, { error: 'Method not allowed' });

  const raw = await request.text();
  const signature = request.headers.get('stripe-signature');

  const valid = await verifyStripeSignature(
    raw,
    signature,
    process.env.STRIPE_WEBHOOK_SECRET
  );
  if (!valid) {
    console.error('[webhook] rejected: bad signature');
    return reply(400, { error: 'Invalid signature' });
  }

  let event;
  try {
    event = JSON.parse(raw);
  } catch {
    return reply(400, { error: 'Malformed payload' });
  }

  if (event.type !== 'payment_intent.succeeded') {
    return reply(200, { ignored: event.type });
  }

  const intent = event.data.object;
  const meta = intent.metadata || {};

  /* Unknown or absent funnel means this payment came from somewhere else in
     the Stripe account and is none of our business. */
  const funnel = getFunnel(meta.funnel);
  if (!funnel || meta.funnel !== funnel.key) {
    return reply(200, { ignored: 'not one of our funnels' });
  }

  const email = (meta.email || intent.receipt_email || '').trim().toLowerCase();
  if (!email) {
    console.error('[webhook] no email on', intent.id);
    return reply(200, { error: 'no email' }); // 200: retrying will not help
  }

  /* A one-time offer. /api/upsell also writes these on the one-click path, but
     the fresh-card path has no inline write at all, so this is the only thing
     that fulfils it. Both writes upsert, so doing it twice is harmless — and
     it makes the one-click path survive a Kit outage mid-charge. */
  if (meta.stage === 'oto') {
    const offer = OTO_CATALOGUE[meta.offer];
    if (!offer) {
      console.error('[webhook] unknown offer on', intent.id, meta.offer);
      return reply(200, { ignored: 'unknown offer' });
    }
    try {
      await fulfilOffer({ offer, email, name: meta.name });
      console.log('[webhook] fulfilled offer', offer.key, intent.id, email);
      return reply(200, { ok: true, offer: offer.key });
    } catch (err) {
      console.error('[webhook] offer fulfilment failed for', intent.id, err.message);
      return reply(500, { error: 'fulfilment failed' });
    }
  }

  const bumps = (meta.bumps || '').split(',').filter(Boolean);

  try {
    await fulfilSignup({
      funnel,
      email,
      name: meta.name,
      bumps,
      fields: {
        ...profileFields({ business: meta.business, title: meta.title }),
        workshop_order_total: ((intent.amount_received || intent.amount) / 100).toFixed(2),
        workshop_order_items: [...funnel.base, ...bumps]
          .map((k) => CATALOGUE[k]?.label || k)
          .join(' | '),
        workshop_purchased_at: new Date(event.created * 1000).toISOString(),
        workshop_payment_id: intent.id,
      },
    });

    console.log('[webhook] fulfilled', funnel.key, intent.id, email, bumps.join(',') || 'no bumps');
    return reply(200, { ok: true });
  } catch (err) {
    /* 500 so Stripe retries. The money is already taken and the access page
       has already shown them their links, so a delayed Kit write is an
       inconvenience rather than a broken purchase. */
    console.error('[webhook] Kit write failed for', intent.id, err.message);
    return reply(500, { error: 'fulfilment failed' });
  }
}
