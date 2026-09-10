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
  upsertSubscriber,
  tagSubscriber,
  addToSequence,
  KIT,
  CATALOGUE,
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

  if (meta.funnel !== 'contractor-workshop') {
    return reply(200, { ignored: 'not this funnel' });
  }

  const email = (meta.email || intent.receipt_email || '').trim().toLowerCase();
  if (!email) {
    console.error('[webhook] no email on', intent.id);
    return reply(200, { error: 'no email' }); // 200: retrying will not help
  }

  // The upsell charge is handled by /api/upsell; nothing to fulfil here.
  if (meta.stage === 'oto') {
    return reply(200, { ignored: 'oto charge' });
  }

  const bumps = (meta.bumps || '').split(',').filter(Boolean);

  try {
    await upsertSubscriber({
      email,
      firstName: (meta.name || '').trim().split(/\s+/)[0],
      fields: {
        workshop_order_total: ((intent.amount_received || intent.amount) / 100).toFixed(2),
        workshop_order_items: ['workshop', ...bumps]
          .map((k) => CATALOGUE[k]?.label || k)
          .join(' | '),
        workshop_purchased_at: new Date(event.created * 1000).toISOString(),
        workshop_payment_id: intent.id,
      },
    });

    await tagSubscriber(KIT.tags.purchaser, email);
    await addToSequence(KIT.sequences.access, email);

    for (const bump of bumps) {
      if (KIT.tags[bump]) await tagSubscriber(KIT.tags[bump], email);
      if (KIT.sequences[bump]) await addToSequence(KIT.sequences[bump], email);
    }

    console.log('[webhook] fulfilled', intent.id, email, bumps.join(',') || 'no bumps');
    return reply(200, { ok: true });
  } catch (err) {
    /* 500 so Stripe retries. The money is already taken and the access page
       has already shown them their links, so a delayed Kit write is an
       inconvenience rather than a broken purchase. */
    console.error('[webhook] Kit write failed for', intent.id, err.message);
    return reply(500, { error: 'fulfilment failed' });
  }
}
