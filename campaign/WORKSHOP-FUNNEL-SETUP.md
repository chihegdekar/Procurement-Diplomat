# Workshop Funnels — setup & runbook

Built 4 September 2026. Everything is in place except three secrets and one
link, all listed under "What's still needed".

**Two pages now run off this same plumbing:**

| Page | The workshop itself | Order bumps | Ends on |
|---|---|---|---|
| `contractor-workshop.html` | $97 | $47 + $7 | `workshop-oto.html` |
| `castle-masterclass.html` | **$27** | $47 + $7 | `masterclass-thanks.html` |

They are the same workshop and send the same Kit joining email. See
"The masterclass funnel" near the bottom for what differs.

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

## The one-time offer — "Yes, If" library ($149)

Live as of 10 Sep 2026. After paying for the workshop the buyer lands on
`workshop-oto.html` and can add the **Yes, If** on-demand library for a
one-time **$149**, charged in one click to the card saved at checkout — no
second card entry.

| Piece | Value |
|---|---|
| Catalogue key | `yes_if` in `OTO_CATALOGUE` (`api/_lib.js`) |
| Price | `14900` cents — server-side, single source of truth |
| Kit tag | `Workshop: OTO - Yes If` — `23280212` |
| Kit sequence (delivery email) | `Yes, If Library access` — `2828038` |
| Stripe product ID | **still `REPLACE_WITH_STRIPE_PRODUCT_ID`** — cosmetic, the charge works without it; fill for clean reporting |

On a successful charge `api/upsell.js` tags the buyer, drops them into
sequence 2828038 (which carries the access email), and the OTO page shows a
"your library email is on its way" confirmation before the last click through
to workshop access.

**Optional — instant on-page link.** `DELIVERY.yes_if` in `api/_lib.js` holds
`REPLACE_WITH_*` placeholders. Fill the library URL + password and the OTO
page also shows an "Open the Yes, If library →" button straight after
purchase. Leave them and delivery is email-only.

`api/upsell.js` refuses to charge anything not defined in `OTO_CATALOGUE`.

### To retire or swap the OTO

Set `OTO.live = false` in `campaign/site/workshop-oto.html` and the page goes
back to a clean "go to your access" step. Nobody lands on an empty upsell.

---

## The masterclass funnel

Built 14 September 2026 as a free page. **Went to $27 on 17 September 2026** —
`castle-masterclass.html` now sells the **same workshop for $27**, with the
**same two order bumps** bolted on.

### What actually differs

Only the base price and where it ends. Both funnels are paid, so both always
go through Stripe and both leave the buyer with a saved card.

| Bumps ticked | Charged | Path |
|---|---|---|
| none | $27 | Stripe, via `/api/checkout` |
| video library | $74 | Stripe, via `/api/checkout` |
| bully guide | $34 | Stripe, via `/api/checkout` |
| both | $81 | Stripe, via `/api/checkout` |

The sale price is framed against **$47** with a 60-minute countdown inside
every CTA's sub-line. The deadline is stamped per visitor on first arrival and
kept in `localStorage`, so a refresh does not hand out a fresh hour. **Nothing
server-side changes when it hits zero** — the price in `CATALOGUE` stays $27
until someone edits it. Treat the clock as urgency framing, not a mechanism.

`POST /api/register` — the $0 path — is now unused by both live pages. It is
left in place, and refuses any funnel priced above zero, ready for the next
free page.

### Step 1 collects a business name

The masterclass form asks for **Full Name, Email, and Business Name
(optional)**. The business name lands in the Kit custom field `business_name`
(`1366686`) via `profileFields()`. A blank answer is dropped rather than
written, so it never overwrites a detail captured on an earlier form.

### Kit

**Tags** (created 14 Sep 2026) — Registrant `23420880` · Lead `23420882` ·
Abandoned Signup `23420883`

Deliberately separate from the `Workshop: *` tags so "paid $27" and "paid $97"
never blur into one segment. The two **bump** tags are shared, because a bump
is a bump however they arrived.

**Sequence** — the same `Access & Joining Details` (`2883347`) the paid
workshop uses. That is what makes the joining email identical, which was the
point.

A masterclass registrant is **not** tagged `Workshop: Purchaser`.

### Stripe

No new webhook. The $27 seat is charged straight off `CATALOGUE.masterclass.amount`
— `checkout.js` builds the PaymentIntent from the amount, never from a price ID
— so it sells correctly today. **Still to do:** create a real `$27 Masterclass`
product and price in Stripe and drop the IDs into `CATALOGUE.masterclass`, so
Stripe-side reporting shows a named product rather than a bare charge.

### Files

```
api/register.js                          the $0 path — Kit only, no Stripe
api/_lib.js                              FUNNELS registry + fulfilSignup()
campaign/site/castle-masterclass.html    landing page + two-step signup
campaign/site/masterclass-thanks.html    thank-you + instant bump delivery
```

### How the two funnels stay in step

`api/_lib.js` has a `FUNNELS` registry. A funnel's `base` is what gets billed
before any bump, so **an empty `base` is what would make a funnel free**. Checkout,
the webhook and the order lookup all read that instead of hardcoding a page
name, and `fulfilSignup()` is the single function that decides what a completed
signup looks like in Kit — so the free path and the paid path can't drift.

Adding a third page is one entry in `FUNNELS`, not a fork of five files.

Pages that post no `funnel` field default to `contractor-workshop`, which is
why the old page kept working untouched.

### The thank-you page

`masterclass-thanks.html` has no "we couldn't find your order" screen on
purpose. Reaching it at all means the signup went through, so its default
state already confirms the spot. If `?pi=` and `?cs=` are on the URL it
additionally reads the order back through `/api/order` and renders the bumps
that were actually paid for — video password and link, guide download. If that
lookup fails it quietly degrades to "it's in your email" rather than alarming
someone who just paid.

**The masterclass date lives in one place on that page** — the `WHEN` constant
at the top of its script. Keep it in step with the landing page hero and the
Kit access email.

### The thanks page is also the OTO

`masterclass-thanks.html` doubles as the `Yes, If` ($149) one-time offer.
Everyone sees the same offer at the same price. Only the payment route differs:

| Who | How they pay | Endpoint |
|---|---|---|
| Paid at signup (everyone, since $27) | genuinely one click — card saved at checkout | `POST /api/upsell` |
| No usable card on file | same offer, card field | `POST /api/checkout` with `offer: 'yes_if'` |

Both end at the same Kit tag (`23280212`) and delivery sequence (`2828038`).

Page order is deliberate: a one-line seat confirmation, then the offer, then
the joining detail and any add-ons underneath — so the offer isn't buried
under a thank-you nobody needed.

Two things worth knowing:

- **The webhook now fulfils offers.** It used to ignore `stage: 'oto'` because
  `/api/upsell` wrote to Kit inline. The card-entry route has no inline write,
  so the webhook is the only thing that fulfils it. Both writes upsert, so the
  one-click route now self-heals if Kit blips mid-charge.
- **If the saved card turns out to be unusable** (Stripe returns 409), the page
  falls back to a card field rather than dead-ending someone who wants to buy.

To retire the offer, set `OFFER.live = false` in the page and it becomes a
plain confirmation. `api/config.js` serves the Stripe publishable key to the
page — it can't ask `/api/lead` for it without re-tagging the person as a
fresh lead.

---

## The 3-Day Procurement Function Reset (`procurement-cohort.html`)

Built 25 September 2026. Same plumbing, funnel key `procurement-reset`.
Sold **by the seat**, no order bumps, no one-time offer.
Lives at `/site/procurement-cohort.html`. The older `cohort.html` (the
$1,000 Diplomat Cohort page) is a separate page and is left untouched.

| Seats in one payment | Seat prices | Total |
|---|---|---|
| 1 | $2,500 | $2,500 |
| 2 | + $2,375 (5% off) | $4,875 |
| 3 | + $2,250 (10% off) | $7,125 |
| 4 | + $2,125 (15% off) | $9,250 |
| 10 (the cap) | … + $1,375 (45% off) | $19,375 |

- **The 5% team discount is a launch offer for this first round only.** For
  the next cohort, drop or change `SEAT_PRICING.reset` and the page copy that
  says "launch offer" (hero, price card, FAQ, checkout).
- Pricing rule: `SEAT_PRICING.reset` in `api/_lib.js` (`max: 10`, `step: 0.05`).
  The page repeats the same rule for display, and refuses to charge if the
  server's total ever disagrees with what the buyer saw.
- A seat count that isn't a whole number from 1 to 10 is refused, not clamped.
- **Booking closes Wed 14 Oct 2026, 11:59pm ET.** Set in two places that must
  match: `FUNNELS['procurement-reset'].closesAt` in `api/_lib.js` (the server
  refuses payment after it) and `CLOSES_AT` in `procurement-cohort.html` (countdown, and
  the page swaps to an "ask about the next cohort" email once it passes).
- Tests: `node --test tests/*.test.mjs` from the `oneshot` folder.
- Kit tags (created 25 Sep 2026): Reset: Lead `23973843` · Reset: Abandoned
  Checkout `23973844` · Reset: Purchaser `23973845`.
- **No Kit joining sequence yet.** `welcomeSequence` is `null`, so buyers get
  the Stripe receipt and the `cohort-thanks.html` page, nothing else
  automatic. The joining link and pre-work have to be sent by hand, or add a
  sequence and put its ID in `FUNNELS['procurement-reset'].welcomeSequence`.
- Multi-seat buyers are asked on the thanks page to email their colleagues'
  names to Ruth. Attendee details are not collected at checkout.
- Stripe product/price IDs in `CATALOGUE.reset_seat` are placeholders (same
  as the masterclass). The charge works without them; fill for reporting.

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
