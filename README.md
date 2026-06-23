# Phone Workstation

A fully client-side web app for validating, deduplicating, and managing phone number datasets. No server, no backend — everything runs in the browser.

## Features

| Feature | Detail |
|---|---|
| **Folder / File upload** | Drag & drop or select — CSV, XLS, XLSX, TXT |
| **Auto column detection** | Finds phone, email columns automatically |
| **Phone validation** | Uses `libphonenumber-js` — validates 240+ countries |
| **E.164 normalisation** | Converts all numbers to `+44...`, `+1...` format |
| **In-file deduplication** | Detects and flags exact duplicate phone numbers within an upload |
| **Master-list dedup** | Checks new leads against the numbers you **already own** — flags "Already owned" so you don't pay twice |
| **Fresh-leads export** | One-click CSV of only the unique, not-already-owned numbers worth buying |
| **Country detection** | Auto-detects country from number, shows flag |
| **Email validation** | Basic format check |
| **Active status** | Import a flag column or mark Unknown for later HLR check |
| **Search + filter** | Search any field, filter by country |
| **Sortable table** | Click any column header to sort |
| **3 exports** | Download Clean / Duplicates / Invalid as CSV |
| **50M+ capable** | Paginates at 100 rows/page, runs in-memory |

## Deploy to GitHub Pages

### Quick deploy (recommended)

1. Push this repo to GitHub
2. Go to **Settings → Pages → Source** → set to **GitHub Actions**
3. The `.github/workflows/deploy.yml` will auto-deploy on every push to `main`
4. Your workstation will be live at: `https://<username>.github.io/<repo>/apps/phone-workstation/`

### Manual deploy

1. Copy the `apps/phone-workstation/` folder to any static host (Netlify, Vercel, Cloudflare Pages)
2. Point the host to `index.html`
3. Done — no build step required

## Duplicate-check against numbers you already own

This is the workflow for vetting a lead list **before you buy it**:

1. **Build your master list** (Step 1 → *Master list*). Click **Import owned numbers** and
   upload a CSV / TXT / Excel of every number you already hold (customers, past purchases).
   The numbers are stored locally in your browser (IndexedDB) — nothing is uploaded anywhere.
2. **Drop the new leads file** the vendor sent you and run validation. Keep
   **"Check against master list"** ticked.
3. **Read the result**. Each lead lands in one bucket:
   - **📇 Already owned** — the number is in your master list (don't pay for it).
   - **🔁 In-file dupe** — a repeat *within* the new file itself.
   - **☎️ Landline / 📱 Mobile / 🔵 Other** — genuinely new, valid, callable → worth buying.
   - **❌ Invalid** — unparseable / wrong length / unallocated.
4. **Export** with **⬇ Fresh leads only** — a CSV containing just the unique, not-already-owned
   numbers. That count is exactly what you should be paying the vendor for.
5. After you buy, click **➕ Add clean to master** so those numbers are recognised next time.

The master list persists across sessions and survives **Reset** (Reset only clears the current
upload, never your owned numbers). Use **🗑 Clear** on the Master-list panel to wipe it.

## Active Number Checking

The app supports three methods for verifying if numbers are still live:

| Method | How |
|---|---|
| **HLR Lookup** | Export clean CSV → submit to Twilio Lookup / Vonage Number Insight / NumVerify → re-import with an `active` column |
| **Import Flag** | If your source data has an active/inactive column, use "Import Active Flag" after processing |
| **Skip** | Leave as Unknown (default) — filter/export later |

## Column Name Auto-Detection

The app recognises these column name variants automatically:

- **Phone**: `phone`, `mobile`, `cell`, `telephone`, `tel`, `number`, `msisdn`, `phonenumber`
- **Email**: `email`, `e-mail`, `email_address`, `mail`

Override with the "Phone column name" field in the sidebar.
