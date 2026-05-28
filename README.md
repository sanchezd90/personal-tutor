# Personal Tutor

AI-powered learning app that generates personalized syllabi and delivers lesson content block-by-block.

## Features

- **Google sign-in** — Multi-user support with data isolation
- **Resume studies** — Landing page shows your syllabi; pick up where you left off
- **Multiple syllabi** — Create multiple syllabi per subject
- **Subject input** — Enter any subject you want to learn
- **AI-generated syllabus** — Modules and lessons created by AI
- **Block-by-block content** — Streamed lesson content, one block at a time
- **Q&A** — Ask questions about each block; answers linked and shown in sidebar
- **Q&A History** — View all questions and answers at syllabus level
- **Content audit** — Verify content accuracy with AI fact-checking

## Tech Stack

- **Frontend:** Next.js 16 (App Router), React, Tailwind CSS
- **Backend:** Next.js API Routes
- **Database:** Supabase (PostgreSQL) + Drizzle ORM
- **AI:** LangChain.js + OpenAI

## Setup

### 1. Install dependencies

```bash
npm install
```

### 2. Environment variables

Copy `.env.example` to `.env.local` and fill in the required values:

```bash
cp .env.example .env.local
```

#### Required

| Variable | Where to get it |
|----------|-----------------|
| `DATABASE_URL` | Supabase → Project Settings → Database → Connection string (URI, **Transaction pooler**) |
| `OPENAI_API_KEY` | [OpenAI API keys](https://platform.openai.com/api-keys) — used by LangChain for syllabus, lessons, Q&A, and audit |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Project Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Supabase → Project Settings → API → Publishable key (`sb_publishable_...`) |

Legacy Supabase projects can use `NEXT_PUBLIC_SUPABASE_ANON_KEY` instead of `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; the app accepts either.

Example `.env.local`:

```bash
# Supabase
DATABASE_URL=postgresql://...
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...

# OpenAI
OPENAI_API_KEY=sk-...
```

#### Optional (not read by the app)

`.env.example` also lists `SUPABASE_SECRET_KEY`, `SUPABASE_AUTH_EXTERNAL_GOOGLE_CLIENT_SECRET`, `GOOGLE_CLIENT_ID`, and `GOOGLE_CLIENT_SECRET` for reference. This app does not read them — configure Google OAuth in the Supabase Dashboard instead.

#### Google sign-in

In Supabase Dashboard → Authentication → Providers, enable Google and add your OAuth Client ID and Secret from [Google Cloud Console](https://console.cloud.google.com/apis/credentials). Add `http://localhost:3000/auth/callback` (and your production URL) as authorized redirect URIs in both Google and Supabase.

### 3. Database

Push the schema to Supabase:

```bash
npm run db:push
```

### 4. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Deployment (Vercel)

1. Push to GitHub and connect the repo to Vercel
2. Add these environment variables in Vercel project settings:
   - `DATABASE_URL`
   - `OPENAI_API_KEY`
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` (or `NEXT_PUBLIC_SUPABASE_ANON_KEY`)
3. Run `npm run db:push` manually (or add to build) before first deploy
4. Deploy

## Documentation

- [AI behavior, features & token optimizations](docs/AI_BEHAVIOR_AND_FEATURES.md)

## Scripts

- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run start` — Start production server
- `npm run db:generate` — Generate Drizzle migrations
- `npm run db:push` — Push schema to database
