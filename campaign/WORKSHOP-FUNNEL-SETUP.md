# Contractor Workshop Funnel — setup & runbook

Built 4 September 2026. Everything is in place except three secrets and one
link, all listed under "What's still needed".

---

## The flow

1. Buyer clicks any CTA on `/site/contractor-workshop.html`
2. **Step 1 — Your Info**: name and email
   → `POST /api/lead` creates the Kit subscriber immediately, tagged
   `Workshop: Lead` + `Workshop: Abandoned Checkout`
3. **Step 2 — Billing Info**: order summary, two order bumps, card field
   (Stripe Payment Element, in-page — no redirect)
   → `POST /api/checkout` prices the order **server-side** and creates the
   PaymentIntent, saving the card for the upsell
4. → `/site/workshop-oto.html` (one-time offer; currently passes straight
   through — see "Switching the OTO on")
5. → `/site/workshop-access.html` — instant delivery of everything bought
6. Meanwhile Stripe calls `POST /api/webhook`, which tags the buyer in Kit
   and drops them into the matching delivery sequences

Instant access on the page, email as the durable copy. A buyer never waits
on an email to get what they paid for.

---

## Stripe (live mode)

| Item | Price | Product | Price ID |
|---|---|---|---|
| Fortune 50 Negotiation Secrets Workshop | $97 | `prod_VCHFecT7vU9JXi` | `price_1UBsh5GTG8HDPA44orMvXl7Z` |
| Aggressive Negotiators — Video Library | $27 | `prod_VCHFRsQKspOrkF` | `price_1UBshCGTG8HDPA449buElMny` |
| Neutralize a Negotiation Bully — Guide | $17 | `prod_VCHF7s4D6NF7FT` | `price_1UBshFGTG8HDPA446gjZzykK` |

Prices live in `api/_lib.js` (`CATALOGUE`) and are the single source of truth.
The browser only ever sends *which* bumps were ticked, never an amount.

## Kit

**Tags** — Lead `23093329` · Purchaser `23093330` · Bump Video Library
`23093331` · Bump Bully Guide `23093332` · Abandoned Checkout `23093333`

**Sequences** (all emails are DRAFTS — review and publish before launch)
- Access & Joining Details — `2883347` — https://app.kit.com/sequences/2883347
- Bonus: Video Library — `2883348` — https://app.kit.com/sequences/2883348
- Bonus: Bully Guide — `2883349` — https://app.kit.com/sequences/2883349

**Custom fields** — `workshop_order_total`, `workshop_order_items`,
`workshop_purchased_at`, `workshop_payment_id`

---

## What's still needed

### 1. The workshop join link
The access email has `REPLACE_WITH_JOIN_LINK` in it twice. Nothing else is
blocking that email. Edit at https://app.kit.com/sequences/2883347

### 2. Four passwords, copied into Vercel

These are the passwords that let the website talk to Stripe and Kit. All of
this is point-and-click in a browser — no terminal.

**Collect the four values first.** Open a blank note and paste each one in as
you go, so you only visit each site once.

> **The two mistakes that already caught us once.** Both are silent — the site
> looks fine and takes no real money.
>
> 1. **Test mode must be OFF in Stripe before copying keys.** A live key starts
>    `pk_live_` / `sk_live_`. If yours starts `pk_test_` / `sk_test_`, the
>    checkout accepts only fake cards.
> 2. **Kit needs a V4 key, freshly generated.** The "API Key" already shown on
>    Kit's developer page is a V3 key and will not work. You must click
>    **Add a new key**. Kit's own docs: *"V4 API Keys are not compatible with V3."*

**A · Stripe publishable key** (starts `pk_live_`)
1. Go to https://dashboard.stripe.com
2. Make sure the **Test mode** toggle, top right, is **OFF**
3. Left sidebar → **Developers** → **API keys**
4. Copy the **Publishable key** — check it starts `pk_live_`, not `pk_test_`

**B · Stripe secret key** (starts `sk_live_`)
1. Same page, the row beneath it — **Secret key**
2. Click **Reveal live key**, then copy it — check it starts `sk_live_`
3. This one is the keys to the safe. Never paste it into a chat, an email or
   a document that gets shared.

**C · Kit V4 API key**
1. Go to https://app.kit.com/account_settings/developer_settings
2. Click **Add a new key** — do *not* copy the "API Key" already displayed,
   that is the old V3 key and Kit will reject it
3. Give it a name (e.g. "Workshop funnel"), save, and copy the key it shows
4. Copy it immediately — Kit will not show it again

**D · Stripe webhook secret** (starts `whsec_`) — see section 3 below, do that
first, then come back here with the value.

**Now put them into Vercel.** For each of the four:
1. Go to https://vercel.com/chihegdekar-2212s-projects/procurement-diplomat/settings/environment-variables
2. In **Key**, type the name exactly as written below
3. In **Value**, paste the matching value
4. Tick **Production**, **Preview** and **Development**
5. Click **Save**

| Key (type exactly) | Value |
|---|---|
| `STRIPE_PUBLISHABLE_KEY` | the `pk_live_...` from A |
| `STRIPE_SECRET_KEY` | the `sk_live_...` from B |
| `KIT_API_KEY` | the key from C |
| `STRIPE_WEBHOOK_SECRET` | the `whsec_...` from D |

Names are case-sensitive and must have no spaces. A typo here means the
checkout silently fails.

### 3. The Stripe webhook

This is how Stripe tells the site a payment succeeded, so Kit knows to
deliver. Without it, people get charged and receive nothing.

1. Go to https://dashboard.stripe.com/webhooks
2. Check **Test mode** is **OFF** (top right)
3. Click **Add endpoint**
4. **Endpoint URL** — paste exactly:
   `https://diplomat.castlenegotiations.com/api/webhook`
5. Click **Select events**
6. Search for `payment_intent.succeeded` and tick **only** that one
7. Click **Add events**, then **Add endpoint**
8. On the page that appears, find **Signing secret** → **Reveal**
9. Copy that `whsec_...` value — this is value D above

Then go back to section 2 and add `STRIPE_WEBHOOK_SECRET` to Vercel.

### 4. Redeploy so the new values take effect

Environment variables only apply to a fresh deployment.

1. Go to https://vercel.com/chihegdekar-2212s-projects/procurement-diplomat/deployments
2. On the top (most recent) deployment, click the **⋯** menu on the right
3. Click **Redeploy**, then confirm

Or just tell Claude "the keys are in, deploy it" and it will handle this.

### 5. Apple Pay / Google Pay (optional)
Stripe → Settings → Payment methods → Apple Pay → add
`diplomat.castlenegotiations.com`. Wallets then appear in the popup
automatically and lift mobile conversion.

---

## The one-time offer (deliberately blank for now)

Chi is building this out later. Until then `workshop-oto.html` confirms the
payment and shows a "Go to your access" button — a clean step, not an empty
page. Nothing needs doing to launch.

### Switching it on later

1. Create the product in Stripe.
2. Add an entry to `OTO_CATALOGUE` in `api/_lib.js` (a commented example is
   already there) with the product ID and amount in cents.
3. In `campaign/site/workshop-oto.html`, fill in the `OTO` object at the top
   of the script — `live: true`, the `key` matching your catalogue entry, and
   the copy.

Until then the page confirms the order and moves people to their access, so
nobody ever lands on an empty upsell. The card is already saved at checkout,
so accepting will be one click with no re-entry.

`api/upsell.js` refuses to charge anything not defined in `OTO_CATALOGUE`.

---

## Testing before you launch

Your Stripe MCP connection exposes live mode only — there is no sandbox to
test against, so the end-to-end test has to be a real card for real money.

1. Deploy, then buy the workshop **with both bumps** ($141) using your own card.
2. Check: access page shows all three items, video password visible,
   guide downloads.
3. Check Kit: you are tagged Purchaser + both bumps, and sitting in all
   three sequences.
4. Check Stripe → Webhooks that the event returned 200.
5. Refund yourself in full from the Stripe dashboard.

A $141 refunded charge costs you nothing but a few pennies of fees, and it is
the only way to prove the live path end to end.

---

## Files

```
api/_lib.js        catalogue, pricing, Stripe + Kit clients, signature check
api/lead.js        step 1 — Kit capture
api/checkout.js    step 2 — prices order, creates PaymentIntent
api/webhook.js     Stripe -> Kit fulfilment (edge runtime, see note)
api/order.js       reads an order back for the OTO + access pages
api/upsell.js      one-click charge on the saved card

campaign/site/contractor-workshop.html   landing page + two-step popup
campaign/site/workshop-oto.html          one-time offer
campaign/site/workshop-access.html       instant delivery
campaign/assets/downloads/75cfc7b961145ba7bedfe4f3/   the bully guide
```

**Note on the webhook**: it runs on Vercel's edge runtime deliberately. The
Node runtime here parses the request body before the handler sees it, which
destroys the signature check — verified during the build. Do not move it.
