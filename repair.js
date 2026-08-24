'use strict';
/* ═══════════════════════════════════════════════════════════════════════════
   Computer / laptop repair — inbound lead funnel (UK, compliant).
   People with a broken device REQUEST a quote, so contacting them about that
   enquiry is lawful (their request). A SEPARATE, optional box captures consent
   for future marketing. Entries land in Firestore `leads` and show up in the
   workstation under 📥 Captured leads.

   ▶ BEFORE YOU SHARE THE LINK: set COMPANY_NAME + PRIVACY_URL below (any trading
     name is fine — but the person must see who will contact them, or the consent
     isn't valid). Until then the form stays in demo mode and stores nobody's data.
   ═════════════════════════════════════════════════════════════════════════ */
const CONFIG = {
  COMPANY_NAME:  '',   // e.g. 'FixMyLaptop UK'  ← REQUIRED to go live (your trading name)
  PRIVACY_URL:   '',   // your published privacy policy  ← REQUIRED. A starter you can fill in is at /privacy
                       //   e.g. 'https://phone-workstation.web.app/privacy'
  PRIVACY_EMAIL: '',   // e.g. 'hello@fixmylaptop.uk' — where people withdraw consent
  HEADLINE: '💻 Free laptop & PC repair quote',
  SUBLINE:  'Tell us what’s wrong and get a free, no-obligation quote from a local expert — usually within the hour.',
  PARTNER_SHARING: false,   // set true if you PASS enquiries to third-party repair partners (adds the required disclosure)
  CONSENT_VERSION: '2026-07-repair-v1',
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
  const share = CONFIG.PARTNER_SHARING
    ? ` Your enquiry may be passed to a vetted local repair partner so they can quote.`
    : '';
  return `I agree that ${co} may contact me by phone, SMS and email about my repair enquiry.${share} I can withdraw consent at any time.`;
}

function render(){
  $('brand').textContent    = CONFIG.COMPANY_NAME.trim() || '[Your Company]';
  $('headline').textContent = CONFIG.HEADLINE;
  $('subline').textContent  = CONFIG.SUBLINE;
  $('consentLabel').textContent = consentText();
  const pl = $('privacyLink');
  if(configured()){ pl.href = CONFIG.PRIVACY_URL; } else { pl.removeAttribute('href'); pl.textContent=''; }
  $('privacyEmail').textContent = CONFIG.PRIVACY_EMAIL.trim() || 'our team';
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
  if(!$('service').value)  return fail('Please choose what you need help with.');
  if(!firstName)           return fail('Please enter your first name.');
  if(phone.replace(/\D/g,'').length < 7) return fail('Please enter a valid phone number.');
  if(!$('postcode').value.trim())        return fail('Please enter your postcode so we can quote locally.');
  if(!$('consent').checked) return fail('Please tick the box so we can contact you about your quote.');
  if(!configured())  return fail('This form isn’t live yet — the owner still needs to set the company name and privacy policy.');
  if(!db) return fail('Something went wrong. Please try again later.');

  const btn=$('submitBtn'); const orig=btn.textContent; btn.disabled=true; btn.textContent='Sending…';
  try{
    await db.collection('leads').add({
      firstName,
      lastName: $('lastName').value.trim(),
      phone,
      email:    $('email').value.trim(),
      address:  '',
      town:     '',
      postcode: $('postcode').value.trim().toUpperCase(),
      service:  $('service').value,
      device:   $('device').value.trim(),
      issue:    $('issue').value.trim().slice(0,500),
      urgency:  $('urgency').value,
      consent:  true,                          // asked to be contacted about this enquiry
      marketingConsent: $('marketing').checked, // future marketing (optional)
      consentText: consentText(),
      consentVersion: CONFIG.CONSENT_VERSION,
      source: (new URLSearchParams(location.search).get('src') || 'repair').slice(0,60),
      userAgent: (navigator.userAgent || '').slice(0,300),
      at: firebase.firestore.FieldValue.serverTimestamp(),
    });
    done();
  }catch(err){
    console.warn('repair lead submit failed', err);
    fail('Sorry, we couldn’t send that. Please try again.');
    btn.disabled=false; btn.textContent=orig;
  }
});
