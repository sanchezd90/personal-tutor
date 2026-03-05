# Personal Tutor

AI-powered learning app that generates personalized syllabi and delivers lesson content block-by-block.

## Features

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

Copy `.env.example` to `.env.local` and fill in:

```bash
cp .env.example .env.local
```

Required variables:

- `DATABASE_URL` — Supabase connection string (Transaction pooler from Project Settings → Database)
- `OPENAI_API_KEY` — Your OpenAI API key

Optional (for Supabase Auth later):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — publishable key (sb_publishable_...), safe for client-side
- `SUPABASE_SECRET_KEY` — secret key (sb_secret_...), server-side only

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
2. Add environment variables in Vercel project settings
3. Run `npm run db:push` manually (or add to build) before first deploy
4. Deploy

## Scripts

- `npm run dev` — Start dev server
- `npm run build` — Production build
- `npm run start` — Start production server
- `npm run db:generate` — Generate Drizzle migrations
- `npm run db:push` — Push schema to database
