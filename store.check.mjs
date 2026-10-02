// Run with: node store.check.mjs
import assert from 'node:assert/strict';
import { summariseSets } from './store.js';

const set = (weight, reps) => ({ weight, reps });

assert.equal(summariseSets([]), '');
assert.equal(summariseSets([set(10, 5), set(10, 5), set(10, 5)]), '3 × 10.0 kg × 5');
assert.equal(
  summariseSets([set(10, 5), set(10, 5), set(12.5, 4), set(10, 5)]),
  '2 × 10.0 kg × 5, 1 × 12.5 kg × 4, 1 × 10.0 kg × 5',
);
console.log('store checks passed');
