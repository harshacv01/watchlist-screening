# Watchlist Screening Task Tracker

Watchlist Screening Task Tracker is a Next.js dashboard for uploading watchlists,
screening names against a watchlist service, and reviewing screening results. The
application provides a single workspace for both individual checks and larger
batch-screening workflows.

## Features

- Upload CSV watchlists through a presigned S3 upload flow.
- Load and process uploaded watchlists in batch.
- Screen an individual name, with an optional date of birth and match threshold.
- Evaluate screening results from an uploaded file.
- View actionable errors returned by the screening service.
- Use a responsive dashboard built with React, Tailwind CSS, and shadcn/ui
  components.

## How it works

The browser communicates with the Next.js API routes rather than calling the
screening service directly. The API routes validate requests and proxy supported
operations to the configured AWS Lambda endpoint:

1. **Watchlist Upload** requests an upload URL and sends the CSV to S3.
2. **Batch Screening** loads the uploaded watchlist and starts screening.
3. **Screen Name** sends a name, optional date of birth, and threshold for an
   individual check.
4. **Evaluate Screening Results** requests evaluation of an uploaded result file.

The application expects the Lambda service to handle the underlying S3 and
screening operations. AWS credentials are not exposed to the browser.

## Prerequisites

- Node.js 20 or newer
- pnpm
- A deployed watchlist-screening Lambda/API endpoint

## Getting started

Install dependencies:

```bash
pnpm install
```

Create a local environment file at `.env.local`:

```env
WATCHLIST_LAMBDA_URL=https://your-api-endpoint.example.com
```

Start the development server:

```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000). The root route redirects
to the dashboard.

## Dashboard routes

| Route | Purpose |
| --- | --- |
| `/dashboard` | Upload a CSV watchlist |
| `/dashboard/batch-screening` | Load and run batch screening |
| `/dashboard/screen-name` | Screen an individual name |
| `/dashboard/evaluate-screen` | Evaluate screening results |

## API routes

| Route | Purpose |
| --- | --- |
| `POST /api/watchlist` | Request a presigned watchlist upload URL |
| `POST /api/watchlist/process` | Load or screen a watchlist in batch |
| `POST /api/screen` | Screen an individual name |
| `POST /api/evaluate` | Request a presigned result upload URL or evaluate results |

Uploaded watchlists must be CSV files no larger than 50 MB. Request validation
and service errors are returned as JSON responses with appropriate HTTP status
codes.

## Available scripts

```bash
pnpm dev        # Start the development server
pnpm build      # Create a production build
pnpm start      # Start the production server
pnpm lint       # Run ESLint
pnpm typecheck  # Run the TypeScript compiler without emitting files
pnpm format     # Format TypeScript and TSX files
```

## Project structure

```text
app/
  api/                 Server-side proxy routes for the screening service
  dashboard/           Dashboard pages and navigation layout
components/
  core/                Feature-specific dashboard components
  ui/                  Shared shadcn/ui components
data/watchlists/       Local watchlist data used by the application
```

## Technology

- Next.js 16 with the App Router
- React 19 and TypeScript
- Tailwind CSS 4
- shadcn/ui and Base UI primitives
- AWS SDK packages for S3-related integrations
- Zod and React Hook Form for form handling and validation
