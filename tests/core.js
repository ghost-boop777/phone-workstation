// Pure-logic core extracted from app.js for testing.
// Keep this in sync with classifyOne / dedup / markOwned / masterAddBulk-dedup.
import { parsePhoneNumber } from 'libphonenumber-js/max';
// Bridge to the browser global shape (where `libphonenumber.parsePhoneNumber(...)` is used).
const libphonenumber = { parsePhoneNumber };

export function classifyOne(rec, phoneCol, defCountry = 'GB') {
  const r = { ...rec };
  const raw = phoneCol ? String(r[phoneCol] ?? '').trim() : '';
  r._raw = raw;
  if (!raw) {
    r._status = 'invalid'; r._base = 'invalid'; r._line = '—';
    r._reason = 'Missing'; r._e164 = ''; r._country = '';
    return r;
  }
  let p = null;
  try { p = libphonenumber.parsePhoneNumber(raw, defCountry); }
  catch { try { p = libphonenumber.parsePhoneNumber(raw); } catch { /* unparseable */ } }
  if (!p || !p.isValid()) {
    r._status = 'invalid'; r._base = 'invalid'; r._line = '—';
    r._reason = p ? 'Wrong length/area code' : 'Unparseable';
    r._e164 = raw; r._country = '';
    return r;
  }
  r._e164 = p.format('E.164');
  r._country = p.country || defCountry;
  const type = p.getType();
  if (type === 'FIXED_LINE')               { r._status = 'landline'; r._line = 'Landline'; }
  else if (type === 'MOBILE')              { r._status = 'mobile';   r._line = 'Mobile'; }
  else if (type === 'FIXED_LINE_OR_MOBILE'){ r._status = 'landline'; r._line = 'Fixed/Mobile'; }
  else if (type === 'VOIP')                { r._status = 'other';    r._line = 'VoIP'; }
  else if (type === 'PREMIUM_RATE')        { r._status = 'other';    r._line = 'Premium'; }
  else if (type === 'TOLL_FREE')           { r._status = 'other';    r._line = 'Toll-free'; }
  else                                      { r._status = 'other';    r._line = type || 'Other'; }
  r._base = r._status;
  return r;
}

// Flag in-file duplicates by canonical E.164. Skips invalid + owned + delivered
// (matching the order in app.js where master/owned has already been applied).
export function dedup(records) {
  const seen = new Set();
  for (const r of records) {
    if (r._status === 'invalid' || r._status === 'owned' || r._status === 'delivered' || !r._e164) continue;
    if (seen.has(r._e164)) { r._status = 'duplicate'; r._reason = 'Duplicate in this file'; }
    else seen.add(r._e164);
  }
  return records;
}

// Flag records whose E.164 is already in the master set.
export function markOwned(records, masterSet) {
  if (!masterSet || !masterSet.size) return records;
  for (const r of records) {
    if (r._status === 'invalid' || !r._e164) continue;
    if (masterSet.has(r._e164)) { r._status = 'owned'; r._reason = 'Already in master list'; }
  }
  return records;
}

// Returns only the e164s not already in masterSet (the "fresh" delta).
export function masterAddDelta(e164s, masterSet) {
  return [...new Set(e164s)].filter(e => e && !masterSet.has(e));
}
