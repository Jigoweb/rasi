# RASI - Collecting Society Management System

A modern Next.js application for managing collecting society operations, built with TypeScript, Tailwind CSS, and Supabase.

## Features

- **Dashboard Overview** - Real-time statistics and system metrics
- **Artist Management** - Complete artist registry with status tracking
- **Works Catalog** - Comprehensive database of musical and audiovisual works
- **Programming Schedule** - TV/Radio programming management with time slots
- **Campaign Management** - Individuazione and ripartizione campaign tracking
- **Authentication** - Secure login with Supabase Auth
- **Modern UI** - Clean, responsive interface built with Shadcn UI components

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: Tailwind CSS, Shadcn UI
- **Database**: PostgreSQL (Supabase)
- **Authentication**: Supabase Auth
- **State Management**: React Hooks
- **Build Tool**: Next.js built-in bundler

## Getting Started

### Prerequisites

- Node.js 18.17 or later
- npm, yarn, pnpm, or bun

### Installation

1. Clone the repository
2. Install dependencies:

```bash
npm install
# or
yarn install
```

3. Set up environment variables:

```bash
cp .env.example .env.local
```

Update `.env.local` with your Supabase credentials:

```env
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

4. Set up the database:

```sql
-- Run the SQL files in order:
-- 1. supabase_init.sql (schema and tables)
-- 2. supabase_rls.sql (row level security)
-- 3. supabase_indexes.sql (performance indexes)
-- 4. supabase_sample_data.sql (optional sample data)
```

5. Run the development server:

```bash
npm run dev
# or
yarn dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
.
├── src/                    # Next.js app source
│   ├── app/                # App Router pages and layouts
│   ├── components/         # Shared React components
│   └── lib/                # Core utilities (Supabase client)
├── scripts/                # Stand-alone scripts
│   ├── checks/             # Data validation and checking scripts
│   ├── migrations/         # Data migration scripts
│   └── utils/              # Miscellaneous utility scripts
├── db/                     # Database schema and setup
│   └── init/               # Initialization scripts (schema, RLS, seed)
├── docs/                   # Project documentation
└── public/                 # Static assets
```

## Database Schema

The application uses a PostgreSQL database with the following main tables:

- `artisti` - Artist registry and information
- `opere` - Works catalog (films, TV series, documentaries)
- `programmazioni` - TV/Radio programming schedules
- `campagne_individuazione` - Identification campaigns
- `campagne_ripartizione` - Distribution campaigns

See `DATABASE_SETUP.md` for detailed schema information.

## Development

### Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

### Environment Variables

- `NEXT_PUBLIC_SUPABASE_URL` - Your Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Your Supabase anonymous key
- `SUPABASE_SERVICE_KEY` - (Optional) Service key for server-side operations

## Deployment

The application can be deployed on any platform that supports Next.js:

- Vercel (recommended)
- Netlify
- Railway
- Your own server

Make sure to set the environment variables in your deployment platform.

## License

Private project - All rights reserved.