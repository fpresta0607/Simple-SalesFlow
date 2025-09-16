# Simple SalesFlow

A lightweight outreach automation app: upload contacts, generate drafts with GPT, review, and send via Resend.

## Tech
- Next.js 14 (App Router, TypeScript)
- Tailwind CSS
- NextAuth (Google)
- Prisma + SQLite
- OpenAI Responses API
- Resend API

## Setup
1. Copy `.env.local.example` to `.env.local` and fill values.
2. Install deps and generate Prisma client.
3. Push DB schema.
4. Start dev server.

### Commands
```powershell
npm install
npm run prisma:push
npm run dev
```

Open http://localhost:3000.

## Notes
- Upload supports CSV/XLSX using `xlsx`.
- Daily send cap is 150 emails/user.
- Drafts are stored in SQLite; contacts from upload are cached in localStorage for MVP.

## Deploy (Vercel)
- Add environment variables in Vercel.
- Set `DATABASE_URL` to `file:./dev.db` for dev or use a remote SQLite-compatible storage for prod.
- Run build.

## NEXTAUTH_SECRET: generate and rotate
Use the included script to generate a strong, URL-safe `NEXTAUTH_SECRET`.

Generate (print only):

```powershell
npm run gen:secret
```

Write to `.env` (or `.env.local` if present):

```powershell
npm run gen:secret:write
```

Force overwrite existing value:

```powershell
npm run gen:secret:write:force
```

Notes:
- Rotating `NEXTAUTH_SECRET` will invalidate all existing sessions; users will need to sign in again.
- In production (e.g., Vercel), configure `NEXTAUTH_SECRET` in project environment variables.
- Ensure `NEXTAUTH_URL` matches your app’s public origin (http://localhost:3000 locally, your domain in prod).
- If you see sign-in loops, clear cookies for the site and Confirm `NEXTAUTH_URL` and Google OAuth redirect URIs are correct.
