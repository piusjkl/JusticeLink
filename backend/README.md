# Justice Link Demo Backend (Express + TypeScript + Prisma + SQLite)

This backend provides REST APIs for the Justice Link local demo. By default it runs in synthetic demo mode, binds to localhost, and does not contact court systems, telecom providers, payment gateways, or external registries.

## Run locally

1. Install dependencies
2. Generate Prisma client and run DB migrations
3. Start in watch mode

Quickstart commands (PowerShell):

```
cd backend
npm i
npx prisma generate
npx prisma migrate dev --name init
npm run seed
npm run dev
```

## Scripts
- dev: start dev server with tsx
- build: compile TypeScript
- start: run compiled server
- prisma:migrate: run Prisma migrations
- prisma:studio: open DB UI
- seed: seed demo data

## Environment
Set variables in `.env` (created by default):
- DATABASE_URL
- JWT_SECRET
- PORT
- CORS_ORIGIN
- UPLOAD_DIR
- HOST defaults to `127.0.0.1`
- JUSTICELINK_DEMO_MODE defaults to `true`

## API Prefix
All endpoints are served under `/api`.

## Justice Link demo APIs
- `/api/citizen/complaints` public web/PWA complaint intake.
- `/api/citizen/track/:trackingCode?phone=...` public phone-based tracking.
- `/api/ussd/mtn` and `/api/ussd/airtel` local USSD callback stubs.
- `/api/payments/mtn/*` and `/api/payments/airtel/*` local mobile-money mock handlers.
- `/api/triage`, `/api/referrals`, `/api/registry`, and `/api/partner-analytics` authenticated pilot operations.
- `/api/cases/from-complaint/:complaintId` creates a synthetic demo court case from a complaint.

The current local development datasource remains SQLite so the app can run without external services. Keep demo presentations on localhost unless a formal staging environment and written approval are provided.
