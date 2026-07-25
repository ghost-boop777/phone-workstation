'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   First-party consent-capture funnel.
   Every entry is a real person who TICKED THE BOX to be contacted — the only
   kind of UK B2C data that's legal to phone/SMS/email (UK GDPR + PECR). Entries
   land in the Firestore `leads` collection and show up in the workstation under
   📥 Captured leads, ready to validate/scrub like any other list.

   ▶ BEFORE YOU SHARE THE LINK: set COMPANY_NAME + PRIVACY_URL below. Until then
     the form stays in demo mode and stores nobody's data.
   ═════════════════════════════════════════════════════════════════════════ */
const CONFIG = {
  COMPANY_NAME:  '',   // e.g. 'Acme Offers Ltd'  ← REQUIRED to go live (your trading name)
  PRIVACY_URL:   '',   // https link to your published privacy policy  ← REQUIRED
  PRIVACY_EMAIL: '',   // e.g. 'privacy@acme.co.uk' — where people email to withdraw consent
  HEADLINE: 'Win a £250 shopping voucher 🎁',
  SUBLINE:  'Pop your details in for a chance to win — and to be first to hear about our latest UK offers.',
  CONSENT_VERSION: '2026-07-v1',
};

// Public client identifier (not a secret) — same project as the workstation.
const firebaseConfig = {
  apiKey: 'AIzaSyDK7wcA-0hujY-Ii09NIvMSPdIulFOFgtc',
  authDomain: 'phone-workstation.firebaseapp.com',
  projectId: 'phone-workstation',
  storageBucket: 'phone-workstation.firebasestorage.app',
  messagingSenderId: '437695082938',
  appId: '1:437695082938:web:164c7d1e9d04c09c7d2d83',
};

let db = null;
try{ firebase.initializeApp(firebaseConfig); db = firebase.firestore(); }
catch(e){ console.error('firebase init failed', e); }

const $ = id => document.getElementById(id);
const configured = () => !!CONFIG.COMPANY_NAME.trim() && /^https?:\/\//.test(CONFIG.PRIVACY_URL.trim());

function consentText(){
  const co = CONFIG.COMPANY_NAME.trim() || '[Your Company]';
  return `I agree that ${co} may contact me by phone, SMS and email with offers and information about its products and services. This is marketing consent that I can withdraw at any time.`;
}

function render(){
  $('brand').textContent    = CONFIG.COMPANY_NAME.trim() || '[Your Company]';
  $('headline').textContent = CONFIG.HEADLINE;
  $('subline').textContent  = CONFIG.SUBLINE;
  $('consentLabel').textContent = consentText();
  const pl = $('privacyLink');
  if(configured()){ pl.href = CONFIG.PRIVACY_URL; } else { pl.removeAttribute('href'); pl.textContent=''; }
  $('privacyEmail').textContent = CONFIG.PRIVACY_EMAIL.trim() || 'our privacy team';
  if(!configured()) $('setupBanner').style.display = 'block';
}
render();

function fail(t){ const m=$('formMsg'); m.textContent=t; m.className='msg err'; }
function done(){ $('leadForm').style.display='none'; $('thanks').style.display=''; }

$('leadForm').addEventListener('submit', async e=>{
  e.preventDefault();
  $('formMsg').textContent=''; $('formMsg').className='msg';

  // Honeypot: humans never see #company_website; bots auto-fill it → drop silently.
  if($('company_website').value){ done(); return; }

  const firstName = $('firstName').value.trim();
  const phone     = $('phone').value.trim();
  if(!firstName) return fail('Please enter your first name.');
  if(phone.replace(/\D/g,'').length < 7) return fail('Please enter a valid phone number.');
  if(!$('consent').checked) return fail('Please tick the box so we can contact you.');
  if(!configured()) return fail('This form isn’t live yet — the owner still needs to set the company name and privacy policy.');
  if(!db) return fail('Something went wrong. Please try again later.');

  const btn=$('submitBtn'); const orig=btn.textContent; btn.disabled=true; btn.textContent='Submitting…';
  try{
    await db.collection('leads').add({
      firstName,
      lastName: $('lastName').value.trim(),
      phone,
      email:    $('email').value.trim(),
      address:  $('address').value.trim(),
      town:     $('town').value.trim(),
      postcode: $('postcode').value.trim().toUpperCase(),
      consent:  true,
      consentText: consentText(),
      consentVersion: CONFIG.CONSENT_VERSION,
      source: (new URLSearchParams(location.search).get('src') || 'web').slice(0,60),
      userAgent: (navigator.userAgent || '').slice(0,300),
      at: firebase.firestore.FieldValue.serverTimestamp(),
    });
    done();
  }catch(err){
    console.warn('lead submit failed', err);
    fail('Sorry, we couldn’t submit that. Please try again.');
    btn.disabled=false; btn.textContent=orig;
  }
});
