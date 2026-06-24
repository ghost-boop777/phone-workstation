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

if (auth) auth.onAuthStateChanged(user => {
  if (!user) { lock(); setMsg(''); return; }
  const email = (user.email || '').toLowerCase();
  if (ALLOWED_EMAILS.includes(email)) {
    unlock(user.email);
  } else {
    lock();
    setMsg(`${user.email} is not authorized for this tool. Ask the admin to add you.`, true);
    auth.signOut();
  }
});
