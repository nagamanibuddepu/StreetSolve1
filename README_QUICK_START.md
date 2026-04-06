# StreetSolve - Quick Start (All API Keys Pre-Configured)

## This is a FRESH project with all your API keys already filled in.
## Do NOT use old zip files. Use only this one.

---

## Step 1 — Open terminal in this folder

Right-click the `streetsolve2` folder → "Open in Terminal"  
OR press `Win + R` → type `cmd` → navigate here

---

## Step 2 — Install and seed (one time only)

```cmd
cd backend
npm install
npm run seed
cd ..\frontend
npm install
cd ..
```

---

## Step 3 — Run (every time)

**Terminal 1:**
```cmd
cd backend
npm run dev
```

**Terminal 2:**
```cmd
cd frontend  
npm run dev
```

Open: **http://localhost:5173**

---

## Demo Accounts
| Role | Email | Password |
|------|-------|----------|
| Citizen | priya@example.com | Test@1234 |
| NGO | ngo@greenearth.org | Test@1234 |
| Admin | admin@streetsolve.in | Admin@123 |

---

## What's Fixed in This Version
- ✅ **Map** — Uses react-leaflet (no window.L timing issue)
- ✅ **Profile name invisible** — Fixed navy Tailwind color
- ✅ **Google login** — Real GSI renderButton() implementation  
- ✅ **Voice (Telugu/Tamil/Kannada)** — Gemini `/v1/` endpoint (was broken `/v1beta/`)
- ✅ **Location Seoul bug** — IP fallback when GPS accuracy > 3km
- ✅ **All API keys pre-filled** — Your MongoDB, Twilio, Gmail, Gemini, Google

---

## Your API Keys (already in .env files)
- MongoDB Atlas: ✅ connected
- Gemini AI (voice): ✅ configured  
- Google OAuth: ✅ configured
- Google Maps (geocoding): ✅ configured
- Cloudinary (images): ✅ configured
- Twilio (SMS): ✅ configured
- Gmail SMTP (email): ✅ configured
