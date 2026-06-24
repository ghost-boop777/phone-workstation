/* ═══════════════════════════════════════════════════════════════════════
   Auth gate — Google sign-in restricted to an allowlist.
   The whole tool stays hidden until an *allowed* user signs in.
   (apiKey below is a public client identifier — not a secret. Access is
    controlled by the allowlist + the enabled provider + authorized domains.)
   ═══════════════════════════════════════════════════════════════════════ */
'use strict';

// ── Authorized users — edit this list to grant / revoke access ─────────────
//    Lowercase emails only. Anyone not listed is signed straight back out.
const ALLOWED_EMAILS = [
  'helloleads2@gmail.com',
  'thalableedblue@gmail.com',
  // add more authorized emails here, lowercase
];

const firebaseConfig = {
  apiKey: 'AIzaSyDK7wcA-0hujY-Ii09NIvMSPdIulFOFgtc',
  authDomain: 'phone-workstation.firebaseapp.com',
  projectId: 'phone-workstation',
  storageBucket: 'phone-workstation.firebasestorage.app',
  messagingSenderId: '437695082938',
  appId: '1:437695082938:web:164c7d1e9d04c09c7d2d83',
};

const _$ = id => document.getElementById(id);
function setMsg(t, isErr){ const m=_$('authMsg'); if(m){ m.textContent=t||''; m.classList.toggle('err', !!isErr); } }
function lock(){ document.documentElement.classList.remove('authed'); }
function unlock(email){
  document.documentElement.classList.add('authed');
  const w=_$('authWho'); if(w) w.textContent=email;
  if(typeof masterCloudInit==='function') masterCloudInit();   // start shared master-list sync
}

let auth = null, provider = null;
try {
  firebase.initializeApp(firebaseConfig);
  auth = firebase.auth();
  auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL);     // stay signed in across reloads
  provider = new firebase.auth.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
} catch (e) {
  console.error('Firebase init failed', e);
}

document.addEventListener('DOMContentLoaded', () => {
  const btn = _$('btnGoogleSignIn');
  if (btn) btn.addEventListener('click', async () => {
    if (!auth) return setMsg('Auth failed to load — check your connection and reload.', true);
    setMsg('Opening Google sign-in…');
    try { await auth.signInWithPopup(provider); }
    catch (e) {
      if (e.code === 'auth/operation-not-allowed' || e.code === 'auth/configuration-not-found')
        setMsg('Sign-in isn’t enabled yet. An admin needs to turn on Authentication + Google sign-in in the Firebase console, then try again.', true);
      else if (e.code === 'auth/popup-closed-by-user' || e.code === 'auth/cancelled-popup-request') setMsg('');
      else if (e.code === 'auth/unauthorized-domain')
        setMsg('This domain isn’t authorized in Firebase Auth settings.', true);
      else setMsg(e.message || String(e), true);
    }
  });
  const out = _$('btnSignOut');
  if (out) out.addEventListener('click', () => auth && auth.signOut());
});

if (auth) auth.onAuthStateChanged(async user => {
  if (!user) { document.documentElement.classList.remove('is-admin'); lock(); setMsg(''); return; }
  const email = (user.email || '').toLowerCase();
  // Founders: always allowed + admin (hardcoded root — works even before any Firestore config exists)
  if (ALLOWED_EMAILS.includes(email)) {
    document.documentElement.classList.add('is-admin');
    unlock(user.email);
    return;
  }
  // Otherwise consult the self-serve allowlist stored in Firestore
  try {
    if (firebase.firestore) {
      const snap = await firebase.firestore().doc('config/allowlist').get();
      const list = (snap.exists ? (snap.data().emails || []) : []).map(e => String(e).toLowerCase());
      if (list.includes(email)) { document.documentElement.classList.remove('is-admin'); unlock(user.email); return; }
    }
  } catch (e) { /* fall through to denial */ }
  document.documentElement.classList.remove('is-admin');
  lock();
  setMsg(`${user.email} is not authorized. Ask an admin to add you.`, true);
  auth.signOut();
});

// ── Google Drive access token (drive.file scope) — minted on demand ────────
// Only the file the user picks in the Picker is exposed (drive.file is non-sensitive),
// and it's always the *signed-in* account's own Drive (login_hint).
let driveToken = null;
async function ensureDriveToken(){
  if(driveToken) return driveToken;
  if(!auth) throw new Error('Not signed in.');
  const dp = new firebase.auth.GoogleAuthProvider();
  dp.addScope('https://www.googleapis.com/auth/drive.file');
  if(auth.currentUser && auth.currentUser.email) dp.setCustomParameters({ login_hint: auth.currentUser.email });
  const result = await auth.signInWithPopup(dp);
  const cred = (result && result.credential) ||
    (firebase.auth.GoogleAuthProvider.credentialFromResult && firebase.auth.GoogleAuthProvider.credentialFromResult(result));
  driveToken = cred && cred.accessToken;
  if(!driveToken) throw new Error('Drive permission was not granted.');
  return driveToken;
}
window.ensureDriveToken = ensureDriveToken;
window.getDriveToken    = () => driveToken;
window.clearDriveToken  = () => { driveToken = null; };
