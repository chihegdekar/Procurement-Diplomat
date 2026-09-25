/* ============================================================
   Shared helpers for the contractor-workshop checkout.

   Deliberately dependency-free: everything talks to Stripe and
   Kit over plain fetch, so the project stays a zero-build static
   deploy and `npm install` never enters the picture.
   ============================================================ */

/* Web Crypto only — no node: imports. The webhook runs on the edge runtime
   (the only one that hands us an unparsed request body), and that runtime
   cannot load Node built-ins, so this file has to work in both. */

/* ---------- the catalogue -------------------------------------------------
   Prices live here, on the server, and nowhere else. The browser sends us
   which bumps were ticked; it never sends an amount. That way a tampered
   client can't buy the workshop for a dollar. */
export const CATALOGUE = {
  workshop: {
    key: 'workshop',
    label: 'Fortune 50 Negotiation Secrets Workshop',
    amount: 2700,
    product: 'prod_VCHFecT7vU9JXi',
    price: 'price_1UBsh5GTG8HDPA44orMvXl7Z',
  },
  /* The masterclass seat. Was free until 17 Sep 2026; now $27, on the same
     page and the same plumbing. checkout.js prices the PaymentIntent from
     `amount` alone, so this sells correctly before a Stripe product exists —
     the IDs below are for Stripe-side reporting only. */
  masterclass: {
    key: 'masterclass',
    label: 'The $250K → $750K Profit-Maximizer Masterclass',
    amount: 2700,
    product: 'REPLACE_WITH_STRIPE_PRODUCT_ID',
    price: 'REPLACE_WITH_STRIPE_PRICE_ID',
  },
  /* One seat on the 3-Day Procurement Function Reset (Oct 20–22, 2026).
     Sold by the seat: `amount` is the first seat, and every extra seat in the
     same payment is cheaper — see SEAT_PRICING and seatPrices() below.
     checkout.js prices from `amount` alone, so the IDs are reporting only. */
  reset_seat: {
    key: 'reset_seat',
    label: 'The 3-Day Procurement Function Reset',
    amount: 250000,
    product: 'REPLACE_WITH_STRIPE_PRODUCT_ID',
    price: 'REPLACE_WITH_STRIPE_PRICE_ID',
  },
  video_library: {
    key: 'video_library',
    label: 'Recognising & Neutralizing Aggressive Negotiators — Video Library',
    amount: 4700,
    product: 'prod_VCHFRsQKspOrkF',
    price: 'price_1UBshCGTG8HDPA449buElMny',
    tag: 'Workshop: Bump - Video Library',
  },
  bully_guide: {
    key: 'bully_guide',
    label: 'How Do I Neutralize a Negotiation Bully? — Field Guide',
    amount: 700,
    product: 'prod_VCHF7s4D6NF7FT',
    price: 'price_1UBshFGTG8HDPA446gjZzykK',
    tag: 'Workshop: Bump - Bully Guide',
  },
};

export const BUMP_KEYS = ['video_library', 'bully_guide'];

/* ---------- the funnels ---------------------------------------------------
   Two pages sell the same workshop with the same two order bumps. The only
   difference that matters to the server is whether the workshop itself is
   charged for:

     contractor-workshop  $27 + bumps        — paid, always goes through Stripe
     castle-masterclass   $27 + bumps        — paid since 17 Sep 2026

   `base` is what gets billed before any bump, so an empty `base` is what
   makes a funnel free. Both funnels are priced now, so nothing currently
   comes through /api/register — that path stays for the next free page.
   Everything downstream (checkout, webhook, order lookup) reads this instead
   of hardcoding a funnel name, so adding a third page is one entry here
   rather than a fork of five files. */
export const FUNNELS = {
  'contractor-workshop': {
    key: 'contractor-workshop',
    base: ['workshop'],
    bumps: BUMP_KEYS,
    /* Kit keys, resolved against KIT.tags / KIT.sequences below. */
    leadTag: 'lead',
    abandonedTag: 'abandoned',
    signupTag: 'purchaser',
    welcomeSequence: 'access',
    /* Where the browser goes once the order clears. */
    next: '/site/workshop-oto.html',
  },
  'castle-masterclass': {
    key: 'castle-masterclass',
    base: ['masterclass'],
    bumps: BUMP_KEYS,
    leadTag: 'masterclass_lead',
    abandonedTag: 'masterclass_abandoned',
    signupTag: 'masterclass',
    welcomeSequence: 'access',
    next: '/site/masterclass-thanks.html',
  },
  /* procurement-cohort.html — sold by the seat, no bumps. `seats` switches on
     multi-seat pricing; funnels without it always bill exactly one base. */
  'procurement-reset': {
    key: 'procurement-reset',
    base: ['reset_seat'],
    bumps: [],
    seats: 'reset',
    /* Booking closes Wed 14 Oct 2026, 11:59pm ET (EDT, UTC-4). After this
       checkout refuses to take payment; procurement-cohort.html shows the same time. */
    closesAt: '2026-10-15T03:59:59Z',
    leadTag: 'reset_lead',
    abandonedTag: 'reset_abandoned',
    signupTag: 'reset_purchaser',
    welcomeSequence: null, // no Kit joining sequence yet — Stripe sends the receipt
    next: '/site/cohort-thanks.html',
  },
};

/* Team pricing. Each additional seat in the same payment is another 5% off
   the first seat's price: $2,500, $2,375, $2,250 … capped at `max` seats so
   the discount can never run to zero. Bigger teams go through Ruth. */
export const SEAT_PRICING = {
  reset: { max: 10, step: 0.05 },
};

/* The price of each seat in cents, first seat first. */
export function seatPrices(unitAmount, seats, step) {
  return Array.from({ length: seats }, (_, i) => Math.round(unitAmount * (1 - step * i)));
}

/* Anything that is not a whole number from 1 to max is refused, not
   clamped: the buyer must be charged for exactly what they were shown. */
export function parseSeats(raw, max) {
  if (raw === undefined || raw === null) return 1;
  if (typeof raw !== 'number' && !(typeof raw === 'string' && /^\d+$/.test(raw))) return null;
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1 && n <= max ? n : null;
}

/* Pages built before funnels existed post no funnel at all. */
export const DEFAULT_FUNNEL = 'contractor-workshop';

export function getFunnel(key) {
  return FUNNELS[key || DEFAULT_FUNNEL] || null;
}

/* A funnel with a `closesAt` stops selling at that moment. */
export function isClosed(funnel, now = Date.now()) {
  return Boolean(funnel?.closesAt) && now > Date.parse(funnel.closesAt);
}

/* One-time offers shown after the first payment, charged to the saved card.
   Empty on purpose: nothing can be charged here until an offer is defined
   with a real product, price and amount. Add an entry, then set the matching
   `key` in workshop-oto.html. */
export const OTO_CATALOGUE = {
  yes_if: {
    key: 'yes_if',
    label: 'Yes, If — 18 Strategies to Create Stellar Agreements (On-Demand)',
    amount: 14900,
    // upsell.js charges on `amount` alone; this ID is for Stripe reporting only.
    product: 'REPLACE_WITH_STRIPE_PRODUCT_ID',
    tag: 'Workshop: OTO - Yes If',
    sequence: 2828038, // Kit "Yes, If Library access" — carries the delivery email
  },
};

/* Kit tag and sequence IDs, created 4 Sep 2026. */
export const KIT = {
  tags: {
    lead: 23093329,
    purchaser: 23093330,
    video_library: 23093331,
    bully_guide: 23093332,
    abandoned: 23093333,
    yes_if: 23280212,       // OTO purchasers (created 10 Sep 2026)
    /* Free masterclass funnel (created 14 Sep 2026). Kept separate from the
       paid workshop tags so "registered free" and "paid $97" never blur into
       one segment — the bump tags are shared, because a bump is a bump. */
    masterclass: 23420880,
    masterclass_lead: 23420882,
    masterclass_abandoned: 23420883,
    /* 3-Day Procurement Function Reset (created 25 Sep 2026). */
    reset_lead: 23973843,
    reset_abandoned: 23973844,
    reset_purchaser: 23973845,
  },
  sequences: {
    access: 2883347,        // everyone who buys
    video_library: 2883348, // $47 bump
    bully_guide: 2883349,   // $7 bump
    yes_if: 2828038,        // OTO — "Yes, If Library access"
  },
};

/* Where the bonuses actually live. The bully guide sits behind an
   unguessable path rather than a login — proportionate for a $7 asset,
   and it keeps the delivery to one click. */
export const DELIVERY = {
  video_library: {
    url: 'https://castlenegotiate.vids.io/playlists/4e9ed9bd101cc3/recognising-and-neutralizing-aggressive-negotiators',
    password: 'empowered',
  },
  bully_guide: {
    url: '/assets/downloads/75cfc7b961145ba7bedfe4f3/Neutralize_a_Negotiation_Bully.docx',
  },
  // Optional. Delivery for Yes, If runs through the Kit sequence email
  // (2828038). Fill these to also show an instant link on the OTO page;
  // leave them as-is and the page just points the buyer at that email.
  yes_if: {
    url: 'REPLACE_WITH_YES_IF_VIDEO_LIBRARY_URL',
    password: 'REPLACE_WITH_YES_IF_PASSWORD',
  },
};

/* Turn the browser's list of ticked bumps into a priced, validated order.
   Anything we don't recognise is silently dropped rather than trusted.

   On a free funnel `base` is empty, so an order with no bumps comes back at
   amount 0 — the caller's cue to skip Stripe entirely.

   On a seat funnel the base is billed once per seat at the team price, and
   an invalid seat count returns `{ error }` instead of an order. */
export function buildOrder(funnelKey, rawBumps, rawSeats) {
  const funnel = getFunnel(funnelKey);
  if (!funnel) return null;

  // Deduped: a repeated key must never bill the same bump twice.
  const bumps = Array.isArray(rawBumps)
    ? funnel.bumps.filter((k) => rawBumps.includes(k))
    : [];

  let seats = 1;
  let baseItems = funnel.base.map((k) => CATALOGUE[k]);

  if (funnel.seats) {
    const rule = SEAT_PRICING[funnel.seats];
    seats = parseSeats(rawSeats, rule.max);
    if (!seats) return { error: `Please choose between 1 and ${rule.max} seats.` };

    const seat = CATALOGUE[funnel.base[0]];
    baseItems = seatPrices(seat.amount, seats, rule.step).map((amount) => ({ ...seat, amount }));
  }

  const items = [...baseItems, ...bumps.map((k) => CATALOGUE[k])];
  const amount = items.reduce((sum, item) => sum + item.amount, 0);

  return { funnel, bumps, items, amount, seats };
}

/* How an order reads on a Stripe receipt or in Kit: "X × 3" rather than
   the same label repeated three times. */
export function orderLabel(funnel, bumps, seats) {
  const [first, ...rest] = funnel.base.map((k) => CATALOGUE[k]?.label || k);
  const base = first && seats > 1 ? [`${first} × ${seats} seats`, ...rest] : [first, ...rest].filter(Boolean);
  return [...base, ...bumps.map((k) => CATALOGUE[k]?.label || k)];
}

/* ---------- Stripe ---------------------------------------------------------
   Stripe's API takes form-encoded bodies, including for nested fields, which
   is why we flatten objects into bracket notation rather than sending JSON. */
function encodeForm(obj, prefix = '', out = new URLSearchParams()) {
  for (const [key, value] of Object.entries(obj)) {
    if (value === undefined || value === null || value === '') continue;
    const field = prefix ? `${prefix}[${key}]` : key;
    if (typeof value === 'object' && !Array.isArray(value)) {
      encodeForm(value, field, out);
    } else if (Array.isArray(value)) {
      value.forEach((v, i) => out.append(`${field}[${i}]`, String(v)));
    } else {
      out.append(field, String(value));
    }
  }
  return out;
}

export async function stripeRequest(method, path, body) {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not set');

  const res = await fetch(`https://api.stripe.com/v1${path}`, {
    method,
    headers: {
      Authorization: `Bearer ${key}`,
      'Content-Type': 'application/x-www-form-urlencoded',
      'Stripe-Version': '2025-08-27.basil',
    },
    body: body ? encodeForm(body).toString() : undefined,
  });

  const json = await res.json();
  if (!res.ok) {
    throw new Error(json?.error?.message || `Stripe ${res.status}`);
  }
  return json;
}

/* Compare two strings in time independent of where they first differ, so a
   caller can't discover the right signature one character at a time. */
function safeEqual(a, b) {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/* Verify a Stripe webhook signature by hand — the same scheme the SDK uses:
   HMAC-SHA256 over "<timestamp>.<raw body>". Async because Web Crypto is. */
export async function verifyStripeSignature(rawBody, header, secret, toleranceSeconds = 300) {
  if (!header || !secret) return false;

  const parts = Object.fromEntries(
    String(header)
      .split(',')
      .map((p) => p.split('=').map((s) => s.trim()))
  );
  const timestamp = parts.t;
  const signature = parts.v1;
  if (!timestamp || !signature) return false;

  // Reject replays of an old, previously valid request.
  const age = Math.floor(Date.now() / 1000) - Number(timestamp);
  if (!Number.isFinite(age) || Math.abs(age) > toleranceSeconds) return false;

  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(`${timestamp}.${rawBody}`));
  const expected = Array.from(new Uint8Array(mac))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return safeEqual(expected, signature);
}

/* ---------- Kit ------------------------------------------------------------ */
export async function kitRequest(method, path, body) {
  const key = process.env.KIT_API_KEY;
  if (!key) throw new Error('KIT_API_KEY is not set');

  const res = await fetch(`https://api.kit.com/v4${path}`, {
    method,
    headers: {
      'X-Kit-Api-Key': key,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  const text = await res.text();
  const json = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(json?.errors?.join?.('; ') || `Kit ${res.status}: ${text.slice(0, 200)}`);
  }
  return json;
}

/* Kit's create-subscriber endpoint upserts on email, so this is safe to call
   again on the same address — a lead who returns and buys updates in place
   rather than duplicating. */
export async function upsertSubscriber({ email, firstName, fields }) {
  return kitRequest('POST', '/subscribers', {
    email_address: email,
    first_name: firstName || undefined,
    state: 'active',
    fields: fields || undefined,
  });
}

export async function tagSubscriber(tagId, email) {
  return kitRequest('POST', `/tags/${tagId}/subscribers`, { email_address: email });
}

export async function addToSequence(sequenceId, email) {
  return kitRequest('POST', `/sequences/${sequenceId}/subscribers`, {
    email_address: email,
  });
}

/* Kit removes a tag by subscriber ID, not email, so this takes the ID that
   upsertSubscriber hands back. Best-effort by design: a stale "abandoned"
   tag is a tidiness problem, never a reason to fail a completed signup. */
export async function untagSubscriber(tagId, subscriberId) {
  if (!tagId || !subscriberId) return null;
  try {
    return await kitRequest('DELETE', `/tags/${tagId}/subscribers/${subscriberId}`);
  } catch (err) {
    console.error('[kit] could not remove tag', tagId, err.message);
    return null;
  }
}

/* ---------- fulfilment -----------------------------------------------------
   The one place that decides what a completed signup looks like in Kit, so
   the free path (/api/register) and the paid path (/api/webhook) can never
   drift apart. Every write here upserts, so calling it twice on the same
   person is a no-op — which is what makes the Stripe webhook safe to retry.

   Throws on failure. Callers decide whether that means "retry me" (the
   webhook, where money has already moved) or "tell the buyer" (register). */
export async function fulfilSignup({ funnel, email, name, bumps = [], fields }) {
  const subscriber = await upsertSubscriber({
    email,
    firstName: (name || '').trim().split(/\s+/)[0],
    fields,
  });

  if (funnel.signupTag && KIT.tags[funnel.signupTag]) {
    await tagSubscriber(KIT.tags[funnel.signupTag], email);
  }
  if (funnel.welcomeSequence && KIT.sequences[funnel.welcomeSequence]) {
    await addToSequence(KIT.sequences[funnel.welcomeSequence], email);
  }

  for (const bump of bumps) {
    if (KIT.tags[bump]) await tagSubscriber(KIT.tags[bump], email);
    if (KIT.sequences[bump]) await addToSequence(KIT.sequences[bump], email);
  }

  // They finished, so they are no longer an abandoned checkout.
  await untagSubscriber(
    KIT.tags[funnel.abandonedTag],
    subscriber?.subscriber?.id
  );

  return subscriber;
}

/* A one-time offer can now be bought two ways — one click on a card saved at
   checkout, or a fresh card typed in by someone who paid nothing the first
   time. Both end here, so the Kit result is identical either way. */
export async function fulfilOffer({ offer, email, name }) {
  if (!offer || !email) return;

  await upsertSubscriber({
    email,
    firstName: (name || '').trim().split(/\s+/)[0] || undefined,
  });

  if (KIT.tags[offer.key]) await tagSubscriber(KIT.tags[offer.key], email);
  if (offer.sequence) await addToSequence(offer.sequence, email);
}

/* ---------- request plumbing ---------------------------------------------- */
export function json(res, status, payload) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

/* Optional profile answers from the signup form, shaped for Kit.

   Keys match the Kit custom fields created 15 Sep 2026:
     business_name (1366686) · job_title (1366687)

   Blank answers are dropped rather than written, so someone who skips them
   never overwrites details captured on an earlier form. */
export function profileFields({ business, title }) {
  const fields = {};
  const clean = (v) => String(v || '').trim().slice(0, 200);

  if (clean(business)) fields.business_name = clean(business);
  if (clean(title)) fields.job_title = clean(title);

  return fields;
}

export function isEmail(value) {
  return typeof value === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim());
}
