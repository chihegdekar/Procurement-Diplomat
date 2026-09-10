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
    amount: 9700,
    product: 'prod_VCHFecT7vU9JXi',
    price: 'price_1UBsh5GTG8HDPA44orMvXl7Z',
  },
  video_library: {
    key: 'video_library',
    label: 'Recognising & Neutralizing Aggressive Negotiators — Video Library',
    amount: 2700,
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
  },
  sequences: {
    access: 2883347,        // everyone who buys
    video_library: 2883348, // $27 bump
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
   Anything we don't recognise is silently dropped rather than trusted. */
export function buildOrder(rawBumps) {
  // Deduped: a repeated key must never bill the same bump twice.
  const bumps = Array.isArray(rawBumps)
    ? BUMP_KEYS.filter((k) => rawBumps.includes(k))
    : [];

  const items = [CATALOGUE.workshop, ...bumps.map((k) => CATALOGUE[k])];
  const amount = items.reduce((sum, item) => sum + item.amount, 0);

  return { bumps, items, amount };
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

/* ---------- request plumbing ---------------------------------------------- */
export function json(res, status, payload) {
  res.status(status).setHeader('Content-Type', 'application/json');
  res.end(JSON.stringify(payload));
}

export function isEmail(value) {
  return typeof value === 'string' && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(value.trim());
}
