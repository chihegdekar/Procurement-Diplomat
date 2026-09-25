/* Offline checks for the money logic. Stripe here is live-mode only, so
   pricing is proven here before any real card touches it.

   Run:  node --test tests/*.test.mjs                                             */

import test from 'node:test';
import assert from 'node:assert/strict';
import { buildOrder, orderLabel, getFunnel, isClosed } from '../api/_lib.js';

const RESET = 'procurement-reset';

test('one seat is $2,500', () => {
  const order = buildOrder(RESET, [], 1);
  assert.equal(order.amount, 250000);
  assert.equal(order.seats, 1);
});

test('each extra seat is another 5% off', () => {
  const expected = { 2: 487500, 3: 712500, 4: 925000, 5: 1125000, 10: 1937500 };
  for (const [seats, cents] of Object.entries(expected)) {
    assert.equal(buildOrder(RESET, [], Number(seats)).amount, cents, `${seats} seats`);
  }
  assert.deepEqual(
    buildOrder(RESET, [], 4).items.map((i) => i.amount),
    [250000, 237500, 225000, 212500]
  );
});

test('seat count missing from the request defaults to one', () => {
  assert.equal(buildOrder(RESET, []).amount, 250000);
});

test('bad seat counts are refused, never clamped', () => {
  for (const bad of [0, -1, 11, 2.5, 'abc', '3; drop', true, [2]]) {
    assert.ok(buildOrder(RESET, [], bad).error, `seats=${bad}`);
  }
  assert.equal(buildOrder(RESET, [], '3').amount, 712500); // JSON strings are fine
});

test('the browser cannot add bumps or amounts to the cohort', () => {
  const order = buildOrder(RESET, ['video_library', 'bully_guide'], 1);
  assert.equal(order.amount, 250000);
  assert.deepEqual(order.bumps, []);
});

test('existing funnels are unchanged by the seats work', () => {
  assert.equal(buildOrder('castle-masterclass', [], 5).amount, 2700);
  assert.equal(buildOrder('castle-masterclass', ['video_library', 'bully_guide']).amount, 8100);
  assert.equal(buildOrder(undefined, []).amount, 2700);
});

test('receipt label reads as seats, not a repeated list', () => {
  assert.deepEqual(orderLabel(getFunnel(RESET), [], 3), [
    'The 3-Day Procurement Function Reset × 3 seats',
  ]);
  assert.deepEqual(orderLabel(getFunnel(RESET), [], 1), ['The 3-Day Procurement Function Reset']);
});

test('booking closes Wed 14 Oct 2026 at 11:59pm ET, not a minute before', () => {
  const reset = getFunnel(RESET);
  assert.equal(isClosed(reset, Date.parse('2026-10-14T23:59:00-04:00')), false);
  assert.equal(isClosed(reset, Date.parse('2026-10-14T23:59:59-04:00')), false);
  assert.equal(isClosed(reset, Date.parse('2026-10-15T00:00:00-04:00')), true);
  assert.equal(isClosed(getFunnel('castle-masterclass'), Date.parse('2030-01-01')), false); // no deadline set
});
