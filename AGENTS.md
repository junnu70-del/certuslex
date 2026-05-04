<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# CertusLex — AGENTS.md

> Agent-focused documentation for the CertusLex project. Read this first before modifying any code.

---

## Project Overview

**CertusLex** is a Finnish legal-tech / B2B SaaS platform. It provides three main services:

1. **Juridinen tarkastus** — Users upload legal documents for review by an OTM jurist. Pricing tiers: €49–€99 per document.
2. **Tarjouskone** (AI Quote Tool) — Businesses generate professional project quotes using AI. Supports file attachments, margin calculation, and electronic client signatures.
3. **Kenttämuistio** (Beta) — A field tool for recording business meetings. Audio is transcribed with OpenAI Whisper and structured into a report by Claude.

The platform supports subscription tiers (Starter €49/mo, Pro €99/mo, Enterprise €249/mo) with a 30-day free trial. Access codes provide limited-use entry without a subscription.

The UI is primarily in Finnish with English translations available. Code comments are often in Finnish.

---

## Technology Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | Next.js 16.2.4 (App Router) |
| **React** | 19.2.4 |
| **Language** | TypeScript 5.x |
| **Styling** | Tailwind CSS v4 + extensive inline `style={{}}` + raw CSS in `globals.css` |
| **Fonts** | Google Fonts: Cormorant Garamond (headings), DM Sans (body) |
| **Backend** | Next.js API Routes (serverless functions) |
| **Database** | Firebase Firestore |
| **Auth** | Firebase Authentication (email/password) |
| **Storage** | Firebase Storage |
| **AI/ML** | Anthropic Claude (quote generation, report building), OpenAI Whisper (transcription) |
| **Email** | Nodemailer via Zoho SMTP (`smtp.zoho.eu`) |
| **Excel parsing** | `xlsx` library |
| **PWA** | Custom service worker (`public/sw.js`), web manifest |
| **Build tool** | Turbopack (configured in `next.config.ts`) |
| **Deployment** | Vercel |

---

## Project Structure

```
certuslex/
├── app/                          # Next.js App Router
│   ├── page.tsx                  # Landing page (marketing + upload flow)
│   ├── layout.tsx                # Root layout (fonts, metadata, PWA init)
│   ├── globals.css               # Tailwind v4 + custom CSS
│   ├── components/PwaInit.tsx    # Service worker registration
│   ├── admin/                    # Admin dashboard (jurist portal)
│   │   ├── page.tsx              # SSR-safe wrapper
│   │   └── AdminClient.tsx       # Main admin UI
│   ├── api/                      # API routes (15+ endpoints)
│   │   ├── generate-quote/       # AI quote generation (Claude)
│   │   ├── send-quote/           # Email quote to client + save to Firestore
│   │   ├── send-confirmation/    # Order confirmation email
│   │   ├── send-review/          # Review completion email
│   │   ├── send-km-report/       # Kenttämuistio report email
│   │   ├── profile/              # GET/POST company profile
│   │   ├── quotes/               # List user's sent quotes
│   │   ├── quote/[id]/           # Get quote by token
│   │   ├── quote/[id]/comment/   # Add comment to quote
│   │   ├── quote/[id]/sign/      # Electronic signature
│   │   ├── quote-owner/[id]/     # Owner view (Firebase auth)
│   │   ├── create-code/          # Generate access codes
│   │   ├── verify-code/          # Validate access codes
│   │   ├── transcribe/           # Whisper + Claude transcription
│   │   ├── save-report/          # Save kenttämuistio to Firestore
│   │   └── get-reports/          # List kenttämuistiot
│   ├── tarjouskone/page.tsx      # AI Quote Tool
│   ├── tarjoukset/page.tsx       # Quote archive / dashboard
│   ├── tarjous/[id]/page.tsx     # Client quote view / sign / comment
│   ├── profiili/page.tsx         # Company profile editor
│   ├── kirjaudu/page.tsx         # Login / register page
│   ├── hinnoittelu/page.tsx      # Pricing page
│   ├── ohjeet/page.tsx           # Help / FAQ page
│   ├── tietosuoja/page.tsx       # Privacy policy (GDPR)
│   ├── koodi/page.tsx            # Access code entry
│   ├── kenttamuistio/page.tsx    # Redirects to static HTML
│   ├── tilaus/[id]/page.tsx      # Order status tracking
│   └── en/                       # English localized pages
├── lib/
│   ├── firebase.ts               # Firebase client init (browser-only)
│   └── translations.ts           # FI/EN translation dictionary
├── public/                       # Static assets + PWA files
│   ├── manifest.json             # PWA manifest
│   ├── sw.js                     # Service worker
│   ├── kenttamuistio.html        # Standalone field memo tool
│   ├── kenttamuistio-sw.js       # Separate SW for kenttämuistio
│   └── Risto.png                 # Founder photo
├── next.config.ts                # Next.js config (Turbopack, external pkgs)
├── tsconfig.json                 # TypeScript config
├── eslint.config.mjs             # ESLint (Next.js presets)
├── postcss.config.mjs            # PostCSS (Tailwind v4)
├── vercel.json                   # Vercel deployment config
├── package.json
├── .env.local                    # Environment secrets
├── .gitignore
├── README.md                     # Minimal — just "# CertusLex"
└── AGENTS.md                     # This file
```

---

## Build and Development Commands

```bash
# Install dependencies
npm install

# Start development server on port 3020
npm run dev

# Production build
npm run build

# Start production server
npm start

# Lint
npm run lint
```

The development server runs on **port 3020** (`next dev -p 3020`).

---

## Code Style Guidelines

- **Language**: TypeScript with strict mode enabled.
- **Linting**: ESLint 9 flat config extending `eslint-config-next/core-web-vitals` + `typescript`.
- **Formatting**: No Prettier config is present; rely on IDE defaults or manual consistency.
- **Styling**: The project uses a mix of Tailwind v4, inline `style={{}}` objects, and raw CSS. The custom color palette is:
  - Navy: `#0F1F3D`
  - Gold: `#C8A44A`
  - Cream: `#F7F4EE`
- **Comments**: Often written in Finnish. Respect existing comment language.
- **Translations**: All user-facing strings must be added to `lib/translations.ts` for both `fi` and `en`.
- **Firebase client**: Always guard Firebase client imports with `typeof window !== "undefined"` to prevent SSR issues. See `lib/firebase.ts` for the established pattern.

---

## Testing Instructions

**No formal testing framework is currently configured.**
- No Jest, Vitest, Playwright, or Cypress
- No test files (`*.test.ts`, `*.spec.ts`)
- `/coverage` is gitignored

If you add tests, follow Next.js 16 conventions and update this section.

---

## Deployment

**Primary platform: Vercel**
- `vercel.json` explicitly sets `next build` as the build command
- `.vercel/project.json` is present (Vercel CLI has been used)
- `.gitignore` ignores `.vercel` build outputs
- Firebase is used only for backend services (Auth, Firestore, Storage) — **not** for hosting

---

## Security Considerations

### Environment Variables (`.env.local`)
- `NEXT_PUBLIC_FIREBASE_API_KEY` — exposed to browser (intentional for Firebase client)
- `NEXT_PUBLIC_FIREBASE_*` — public Firebase config
- `FIREBASE_CLIENT_EMAIL`, `FIREBASE_PRIVATE_KEY` — server-side Firebase Admin
- `ANTHROPIC_API_KEY` — AI generation
- `OPENAI_API_KEY` — Whisper transcription
- `ZOHO_FROM_EMAIL`, `ZOHO_SMTP_PASS` — email sending

### Known Security Patterns / Issues
1. **Hardcoded admin password**: `ADMIN_PASSWORD = "certuslex2026"` in `app/admin/AdminClient.tsx` and `app/api/create-code/route.ts`. Do not expose this in commits or logs.
2. **API key fallback**: `generate-quote/route.ts` and `transcribe/route.ts` read `.env.local` from the filesystem as a fallback. Avoid relying on this in production.
3. **No input validation library**: Routes manually check fields but do not use Zod / Yup. Sanitize user inputs carefully.
4. **CORS on transcription**: `Access-Control-Allow-Origin: "*"` on `/api/transcribe`.
5. **No rate limiting**: No rate limiting is implemented on API routes. Consider adding it for production-scale usage.
6. **Token-based quote access**: Quote links use `?token=...` query params with random 64-byte hex tokens — reasonably secure for shareable links.
7. **Electronic signature**: The sign endpoint records IP address (`x-forwarded-for`) and stores signer name.

---

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `next` | Framework |
| `react`, `react-dom` | UI library |
| `firebase`, `firebase-admin` | Auth, Firestore, Storage |
| `@anthropic-ai/sdk` | Claude AI integration |
| `openai` | Whisper transcription |
| `nodemailer` | Email via Zoho SMTP |
| `xlsx` | Excel file parsing |
| `tailwindcss`, `@tailwindcss/postcss` | Styling |
| `typescript`, `@types/*` | TypeScript |
| `eslint`, `eslint-config-next` | Linting |
