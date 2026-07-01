import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyOne, dedup, markOwned, masterAddDelta, jeffValidate } from './core.js';

test('classify: valid UK mobile → mobile + E.164', () => {
  const r = classifyOne({ phone: '07911 123456' }, 'phone', 'GB');
  assert.equal(r._status, 'mobile');
  assert.equal(r._e164, '+447911123456');
  // +44 is shared with Guernsey / Isle of Man / Jersey — libphonenumber returns
  // GG/IM/JE for some ranges. Just assert it's one of the +44 territories.
  assert.ok(['GB','GG','IM','JE'].includes(r._country), `country=${r._country}`);
});

test('classify: valid UK landline → landline + E.164', () => {
  const r = classifyOne({ phone: '0207 946 0001' }, 'phone', 'GB');
  assert.equal(r._status, 'landline');
  assert.equal(r._e164, '+442079460001');
});

test('classify: garbage → invalid, _base sticks', () => {
  const r = classifyOne({ phone: 'notanumber' }, 'phone', 'GB');
  assert.equal(r._status, 'invalid');
  assert.equal(r._base, 'invalid');
});

test('classify: empty cell → invalid + Missing reason', () => {
  const r = classifyOne({ phone: '' }, 'phone', 'GB');
  assert.equal(r._status, 'invalid');
  assert.equal(r._reason, 'Missing');
});

test('classify: alt format normalises to same E.164', () => {
  const a = classifyOne({ phone: '07911123456' }, 'phone', 'GB');
  const b = classifyOne({ phone: '+447911123456' }, 'phone', 'GB');
  assert.equal(a._e164, b._e164);
});

test('dedup: in-file repeats marked duplicate, first kept', () => {
  const rows = [
    classifyOne({ phone: '07911123456' }, 'phone', 'GB'),
    classifyOne({ phone: '+447911123456' }, 'phone', 'GB'),  // same number, different format
    classifyOne({ phone: '07700123456' }, 'phone', 'GB'),
  ];
  dedup(rows);
  assert.equal(rows[0]._status, 'mobile');
  assert.equal(rows[1]._status, 'duplicate');
  assert.equal(rows[2]._status, 'mobile');
});

test('dedup: invalid rows are skipped (not bucketed as duplicate)', () => {
  const rows = [
    classifyOne({ phone: '' }, 'phone', 'GB'),
    classifyOne({ phone: '' }, 'phone', 'GB'),
  ];
  dedup(rows);
  assert.equal(rows[0]._status, 'invalid');
  assert.equal(rows[1]._status, 'invalid');
});

test('markOwned: flagged when E.164 is in master, sendable when not', () => {
  const master = new Set(['+447911123456']);
  const rows = [
    classifyOne({ phone: '07911123456' }, 'phone', 'GB'),  // owned
    classifyOne({ phone: '07700123456' }, 'phone', 'GB'),  // not owned
  ];
  markOwned(rows, master);
  assert.equal(rows[0]._status, 'owned');
  assert.equal(rows[1]._status, 'mobile');
});

test('markOwned: empty master is a no-op', () => {
  const rows = [classifyOne({ phone: '07911123456' }, 'phone', 'GB')];
  markOwned(rows, new Set());
  assert.equal(rows[0]._status, 'mobile');
});

test('REGRESSION (PR #5): pipeline order keeps fresh numbers sendable', () => {
  // Mirrors runValidation's order: classify → markOwned → dedup.
  // Validates the fix: with a 1-item master, fresh numbers in a new packet
  // must NOT all flip to "owned".
  const master = new Set(['+447400111111']);
  const rows = [
    { phone: '07400111111' },   // already owned
    { phone: '07400222222' },   // NEW — must stay mobile
    { phone: '07400333333' },   // NEW
    { phone: '+447400333333' },// in-file dup of NEW
    { phone: 'garbage' },        // invalid
  ].map(r => classifyOne(r, 'phone', 'GB'));
  markOwned(rows, master);
  dedup(rows);
  const c = s => rows.filter(r => r._status === s).length;
  assert.equal(c('owned'), 1);
  assert.equal(c('mobile'), 2);
  assert.equal(c('duplicate'), 1);
  assert.equal(c('invalid'), 1);
});

test('masterAddDelta: returns only numbers not already in master, dedupes input', () => {
  const master = new Set(['+447400111111']);
  const fresh = masterAddDelta(
    ['+447400111111', '+447400222222', '+447400222222', '+447400333333', ''],
    master
  );
  assert.deepEqual(fresh.sort(), ['+447400222222', '+447400333333']);
});

test('masterAddDelta: with empty master returns all unique non-empty', () => {
  const fresh = masterAddDelta(['+447400111111', '+447400222222'], new Set());
  assert.equal(fresh.length, 2);
});

test('jeffValidate: 11-digit 07… (with space) → Valid mobile', () => {
  assert.equal(jeffValidate('07911 123456'), 'Valid mobile');
  assert.equal(jeffValidate('07911123456'), 'Valid mobile');
});

test('jeffValidate: 11-digit 0… non-07 → Valid landline', () => {
  assert.equal(jeffValidate('02920 140637'), 'Valid landline'); // 11 digits
  assert.equal(jeffValidate('01234567890'), 'Valid landline');
});

test('jeffValidate: screenshot data missing leading 0 is rejected', () => {
  // "2921406370" is a 10-digit Cardiff number exported without its 0 — jeff rejects it
  // (fails the 11-digit rule first; either way it's invalid).
  assert.equal(jeffValidate('2921406370'), 'Invalid (not 11 digits)');
  // An 11-char all-digit value that doesn't start with 0 → the leading-0 rule fires.
  assert.equal(jeffValidate('29214063700'), 'Invalid (no leading 0)');
});

test('jeffValidate: wrong length / non-numeric / empty', () => {
  assert.equal(jeffValidate('0791112345'), 'Invalid (not 11 digits)');   // 10 digits
  assert.equal(jeffValidate('079111234567'), 'Invalid (not 11 digits)'); // 12 digits
  assert.equal(jeffValidate('+447911123456'), 'Invalid (non-numeric)');  // '+' is non-numeric
  assert.equal(jeffValidate('0791-112-3456'), 'Invalid (non-numeric)');  // dashes
  assert.equal(jeffValidate(''), 'Invalid (empty)');
  assert.equal(jeffValidate(null), 'Invalid (empty)');
});
