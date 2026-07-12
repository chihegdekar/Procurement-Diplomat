# Procurement Diplomat, 30-Day Mega-Campaign Launch Guide

Built for **Ruth Shlossman, Castle Negotiations Consulting Group** from `Procurement-Diplomat-Doctrine.md` and `CN Master Testimonials Document.md`.
Everything previews locally: run `python3 -m http.server 8765` inside `campaign/` and open **http://localhost:8765**.

---

## What's in the box

| Asset | File | Purpose |
|---|---|---|
| Operations hub | `index.html` | Day-by-day calendar, all assets, launch checklist |
| The Doctrine (flagship page) | `site/doctrine.html` | Brand home: Great Lie → Truth → Four Games → Oath → both offers |
| Enterprise Workshops page | `site/enterprise.html` | $10K–$50K+ offer; self-assembling HIPPO Brief; ROI evidence wall |
| Cohort page | `site/cohort.html` | $1,000 offer; 3D Passport; six missions; honest seat map |
| The Lexicon | `site/lexicon.html` | Searchable vocabulary index (SEO + credibility) |
| Email Flow 1 (Days 1–15) | `emails/enterprise-flow.html` | 16 emails, "The Commercial Myopia Files" |
| Email Flow 2 (Days 16–30) | `emails/cohort-flow.html` | 17 emails, "The First Mission" (3 on final day) |
| LinkedIn campaign | `linkedin/feed.html` | 30 profile posts + 12 group posts, visual recs, "why" notes |
| Visual cards | `visuals/cards.html` | 17 screenshot-ready 4:5 cards |

## Decisions made on your behalf (all changeable)

1. **Persona = Ruth Shlossman**, not the doctrine's "Ruth Castle." The testimonials, your LinkedIn, and castlenegotiate.com all say Shlossman, authenticity beat the pen name. "The Cartographer" is kept as your role/title everywhere.
2. **Dates**: Day 1 = **Mon Jul 13, 2026** → Day 30 = **Tue Aug 11, 2026**. Enterprise flow Days 1–14; free HIPPO Pre-Brief Day 15; cohort flow Days 16–30. The campaign runs a week earlier than the original build, but the **cohort program start is deliberately decoupled** and held at its original post–Labor Day dates (see below), so enrollment now has a slightly longer ~4-week runway before Day 1 of the intensive.
3. **Real deadlines only** (the Doctrine bans manufactured urgency, and the campaign turns that constraint into its signature trust move):
   - **Sun Jul 26, 11:59 PM**, scoping calls for 2026 delivery close, because you deliver 6 engagements/quarter, need ~6 weeks discovery-to-delivery, and lock the fall calendar Mon Jul 27. *If these mechanics aren't true for you, change the mechanics, not the honesty.*
   - **Tue Aug 11, 11:59 PM ET**, Cohort 001 enrollment closes because Passports print Wed Aug 12 ("foil plates don't do grace periods"). Cohort runs as a **3-day intensive, Tue–Thu, Sept 8–10** (post–Labor Day), 24 seats, one live session per day (~2.5 hrs), six missions with two logged per day. Pre-work lands the week of Sept 1; Mission 6 (commissioning) lands Thu Sept 10.
4. **Voice split**: pages speak doctrine (calm authority); emails/LinkedIn speak Ruth (warm, wry, specific, the "Ted Lasso" register with a ruthless-preparation spine). No exclamation points anywhere. No "hack/secret/trick." "Prevent > avoid, steward > manage, protect > save."
5. **Testimonial expansion**: you authorized embellishment; each story keeps its real numbers and attribution, and gains narrative context (e.g., Bernd's €800K, the $3.7M seven-rounder, AL-KO's €200K middleman story). **Checklist item: confirm named people are comfortable with the expanded tellings.** Old-vocabulary terms (BAM) are translated to doctrine terms ("prepared opening position," "trade stack").
6. **HIPPO Pre-Brief page not built** (you have it). Every reference is the literal string `REPLACE-WITH-YOUR-HIPPO-PREBRIEF-LINK`, global find-and-replace before launch.

## Pre-launch (do these in order)

1. Find/replace `REPLACE-WITH-YOUR-HIPPO-PREBRIEF-LINK` → your Pre-Brief URL (appears in: doctrine, cohort, lexicon footers/CTAs, Day 15 email).
2. Replace `mailto:` CTAs with your booking/checkout links if you use Calendly/Stripe (search `mailto:Contact@CastleNegotiate.com`).
3. Set true numbers: `seatsTaken` in `site/cohort.html` (bottom script), `[X] of 24` in Day 28 email, the "held" windows in the enterprise fall calendar.
4. Legal: ™ marks are used per the Doctrine, confirm filing status with counsel; adjust if needed.
5. Load Flow 1 into your ESP using the copy buttons. Each card carries: **subject A, B-test subject, preview text, send date/time, audience/suppression note, CTA.**
6. Host the four site pages (any static host, Netlify/Vercel drag-and-drop works; keep the `assets/` folder path intact).

## In-flight operations

- **Emails**: send at the stated times (8:15 AM weekdays; Sat 9:30/10; Sun Dispatch 5 PM). Suppress converters from deadline emails (noted per email). Reply personally to responses, two emails explicitly promise you read replies.
- **LinkedIn**: post at stated times; links go in the **first comment**, never the body. Pin the Day 15 gift post through Day 30. Budget 20–30 min/day for replies, Days 2, 28, and 30 are engineered to fill your comments; the campaign's compounding comes from your replies.
- **Groups**: 2–3 posts/week from the Groups tab; never post links without mod approval; return to G5 with the Bernd outcome after ~48h.
- **Screenshots for posts**: visual cards page at 200% zoom → screenshot → crop. Motion clips: screen-record the doctrine hero and the cohort Passport (QuickTime → New Screen Recording), 15–20s, no audio needed.
- **Mid-flight truth maintenance**: update seat counts and calendar-window numbers as reality changes. The one unforgivable move for this brand is a caught exaggeration.

## After Day 30

- The list was promised a return to **one Dispatch per week**, keep that promise; three full sample issues (Days 7, 21, 28) define the template.
- Non-buyers exit warm: they hold the free Pre-Brief, three Dispatch issues, and the oath. That's the top of the next campaign.
- Log the campaign's own Prevented Regret stories (deals readers reported back), they're Cohort 002's proof.

## Iteration passes performed (3 per resource)

1. **Design/structure pass**, hierarchy, signature-element focus, section flow, dead-weight cuts.
2. **Copy/persuasion pass**, humanize (stop-slop), sharpen hooks, one-idea-per-email check, doctrine-vocabulary audit, psychology annotations verified against the actual text.
3. **QA pass**, links, anchors, dates/day-of-week math, mobile layout, reduced-motion fallbacks, keyboard focus, cross-file consistency (prices, dates, names, ™ usage).

Notes from the passes (what changed) live in `PASS-NOTES.md`.
