# Iteration Pass Notes

## Main-page rebuild (enterprise.html + cohort.html), with 3 check passes

Both conversion pages were rebuilt to meet (and extend) the doctrine page's visual standard, with clarity-first copy for the forwarding audience: a procurement professional showing the page to the executive who approves the budget.

**Enterprise page**
- Hero rebuilt as a two-column grid over the animated terrain canvas: clear declarative headline ("Train your procurement team on the deals it's carrying right now"), plus a draw-in "One engagement, plotted" panel putting the $50K max fee against the €800K DexKo save at true scale.
- New animated **Exhibit D: The executive bypass, mapped** — the red "just this once" arc draws first, then the gold Diplomat route; pans horizontally on phones so labels stay legible.
- Evidence wall replaced with **"The fee, drawn to scale"**: six scroll-animated bars (fee as a gold sliver vs $3.7M / €800K / $600K / $500K+ / €250K participant outcomes) with count-ups; the 19-pt Dexter Axle swing kept as a margin note.
- New **"If this page was forwarded to you"** strip: the investment / format / output / exit in four bolded clauses for the budget approver.
- HIPPO sticky assembly stage kept; now degrades to a static stacked layout under 960px.
- Copy de-slopped: hero no longer opens with "This isn't training…" inversion; "Artifacts, not binders" → "Three instruments your function keeps"; "How a €800K save actually happens" → "Anatomy of an €800K save."

**Cohort page**
- Terrain canvas added behind the hero; headline restructured as doctrine-style stacked statement ("Walk in with a live deal." / gold italic "Walk out a Procurement Diplomat.").
- Missions rebuilt as a **scroll-tracked mission rail**: gold progress line + traveling knight marker, with day-band diamonds (Day 1–3, dated, with session names) grouping the six missions.
- Math section replaced with a **unit-square infographic** ("Every square below is $1,000"): 1 gold seat square vs 4 squares (Dan Wright) vs a 500-square field ($500K debrief), squares stagger in on scroll.
- New **"Sending this to your manager?"** strip surfacing the included expense memo.
- 3D passport kept (with mobile spacing fix so the open cover clears the CTAs).

**Pass 1 (rendered via headless Chrome, desktop):** fixed enterprise hero H1/overlay collision by moving the plotted panel into a grid column; fixed cohort H1 wrapping/passport overlap; caught and fixed a real CSS collision where `.unit-row.seat` matched the enrollment seat-map's `.seat` rule (rendered as a giant empty gold box).
**Pass 2 (copy + mobile):** slop-pattern sweep on headings; verified no horizontal overflow at small widths (the 390px "clipping" was headless Chrome's 500px minimum window, not the pages); made Exhibit D pan on phones; first HIPPO field no longer collides with the paper's classification strip.
**Pass 3 (QA):** `node --check` passes on all inline scripts; link/anchor audit passes; fact grep verified Sept 8–10 / Aug 11 close / Aug 12 print / Jul 26–27 calendar / $1,000 / 24 seats / all case figures; reduced-motion and no-JS paths verified (bars, squares, rail, and reveals all render resolved without animation).


Three passes were run over every resource after the initial build, per the brief. What each pass found and changed:

## Pass 1, Design & structure (rendered and inspected via headless Chrome)

- **Terrain canvas performance**: the contour field was being re-sampled once per iso-level (7× per frame). Refactored to sample once per frame and share across levels, ~7× fewer noise evaluations, smoother hero on older laptops.
- **Passport 3D bug (cohort page)**: `backface-visibility: hidden` on the cover made it vanish past 90° of opening. Rebuilt the cover with proper front/back faces (the inside cover now reads "PREVENT REGRET"), and verified the open book renders.
- **Passport layout collision**: the opened cover swung left across the headline column at desktop widths. The book now slides right as it opens (open angle −125°, translate 48%; gentler −100° on mobile) and the hero lede was narrowed. Verified clean at 1440px.
- **Mobile nav overflow**: the fixed nav's non-wrapping menu forced pages wider than small viewports. Nav now wraps to two rows ≤640px with a swipeable menu row. Verified with an in-page probe: `scrollWidth = 390` at iPhone width, zero overflowing elements.
- **No-JS resilience**: all reveal/redact/stamp/field animations were gated behind a `js` class on `<html>`. If JavaScript ever fails, every page renders fully readable instead of blank.
- **Four Games stage**: removed dead code in the progress-bar updater.
- **Visual cards**: added the missing Card 16 (Status Play) that Day 23's post references; fixed the Knight's Move card label clipping at the right edge; corrected card-count references (17) across cards page, hub, and launch guide.

## Pass 2, Copy, voice, persuasion

- **Banned-word sweep** (doctrine Appendix E): found and replaced "that's the whole *trick*" (Day 12 email → "mechanism") and "I asked her *secret*" (Day 6 LinkedIn → "asked how she stayed so level"). Zero exclamation points confirmed across all copy; no "hack/loophole/guru-tell" vocabulary anywhere.
- **Honesty hardening**: Day 23's seat-status claim changed from prose ("more than a third") to an explicit `[N] of 24` placeholder so an unedited send can't ship a stale number. Day 16's story reframed from an invented "pilot group" to a workshop teardown (the AL-KO numbers stay real).
- **Dispatch framing**: Issue 001's opener now presents the Dispatch honestly as a new weekly briefing rather than implying an existing member base.
- **Adverb/slop trims**: cut the three dilutive uses of "actually" in the LinkedIn feed (the doctrine's load-bearing "what are they actually protecting" constructions kept); tightened one group post. Subject line for Day 10 shortened for mobile preview panes.
- Verified every "field note" annotation still matches the copy it annotates after edits.

## Pass 3, QA

- **Link/anchor audit**: scripted checker over all 9 pages, 245 links; every internal link, section anchor, day-jump anchor, and copy-button target resolves. (Only intentional `REPLACE-WITH-YOUR-HIPPO-PREBRIEF-LINK` placeholders excluded.)
- **Fact consistency**: cross-file grep of every date, price, seat count, and case figure, Sept 8–10 cohort intensive, Aug 11 11:59 PM ET close, Jul 26/27 calendar lock, $1,000, 24 seats, $2.1M / €800K / $3.7M / 19-point figures all consistent. Day-of-week math verified against the 2026 calendar (Jul 13 = Monday; Labor Day Sept 7; Sept 8/9/10 = Tue/Wed/Thu). Campaign was shifted one week earlier per client request (the 7-day shift preserves every weekday label); the **cohort program schedule was then decoupled and held at its original post–Labor Day dates**, only the campaign sends and the enrollment/print deadlines run a week earlier. Verified per-day: every Day N maps to Jul 13 + (N−1) with the correct weekday, and the enrollment→Day-1 runway (Aug 11 → Sept 8) is internally coherent.
- **Cohort reworked to a 3-day intensive** (client request): the program is now Tue–Thu, Sept 8–10, 2026, one live ~2.5-hr session per day mapped to the three source sessions (The Mapout / Offers & Counter-offers / Seal the Deal), with the six doctrine missions logged two per day. All week-based language ("six weeks," "90 min/week," "Week 2–6," "Oct 14") was replaced across cohort.html, doctrine.html, cohort-flow.html, feed.html, and index.html; enrollment/print mechanics (close Aug 11, print Aug 12) unchanged. Also corrected a stray "print on the 19th" in the LinkedIn cohort-announcement post to the 12th.
- **Script integrity**: `node --check` passes on motion.js and every inline page script.
- **Email presentation**: narrowed the flow-page reading measure after seeing excess ivory whitespace at desktop width.
- **Reduced motion**: verified code paths, counters print final values, stages snap to final state, reveals and redactions render resolved, terrain draws a single static frame.
