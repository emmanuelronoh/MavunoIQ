# MavunoIQ Backend API

> AI-powered agricultural marketplace connecting Kenyan farmers directly with verified buyers.

[![Node](https://img.shields.io/badge/node-%3E%3D20-brightgreen)](https://nodejs.org)
[![TypeScript](https://img.shields.io/badge/typescript-5.7-blue)](https://www.typescriptlang.org)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

---

## Table of Contents

1. [Overview](#1-overview)
2. [Key Features](#2-key-features)
3. [Technology Stack](#3-technology-stack)
4. [Architecture](#4-architecture)
5. [Prerequisites](#5-prerequisites)
6. [Quick Start](#6-quick-start)
7. [Environment Configuration](#7-environment-configuration)
8. [MongoDB Setup](#8-mongodb-setup)
9. [Development Commands](#9-development-commands)
10. [Build & Production](#10-build--production)
11. [Testing](#11-testing)
12. [API Documentation](#12-api-documentation)
13. [Authentication & Authorization](#13-authentication--authorization)
14. [API Reference](#14-api-reference)
15. [Demo Mode](#15-demo-mode)
16. [Provider Configuration](#16-provider-configuration)
17. [Frontend Integration Guide](#17-frontend-integration-guide)
18. [Security Notes](#18-security-notes)
19. [Database Models](#19-database-models)
20. [Deployment](#20-deployment)
21. [Troubleshooting](#21-troubleshooting)
22. [Project Roadmap](#22-project-roadmap)
23. [Contributing](#23-contributing)
24. [License](#24-license)

---

## 1. Overview

**MavunoIQ** is an AI-powered agricultural marketplace that connects Kenyan farmers directly with verified buyers. It reduces farmers' dependence on unnecessary intermediaries by providing:

- **Direct market access** — farmers list produce, buyers order directly
- **Transparent pricing** — real market price observations and AI-assisted recommendations
- **AI-powered market intelligence** — price trends, forecasts, and demand signals
- **Weather-based farming advice** — crop-specific recommendations tied to live weather
- **Demand forecasting** — measured demand signals from platform activity
- **AI agricultural advisor** — a secure, provider-independent chatbot with farm context

This repository contains the **complete backend API**. It is a functional, production-oriented Node.js + TypeScript + Express + MongoDB application — not a mock API, static prototype, or collection of placeholder endpoints.

Where external credentials (AI, weather, M-Pesa, email, S3) are unavailable, the application runs in a **clearly labelled DEMO mode** using interchangeable provider interfaces. Demo responses are never presented as real.

---

## 2. Key Features

### Core marketplace
- **Authentication** — register, login, refresh, logout, email verification, password reset/change, account deactivation
- **Roles** — `FARMER`, `BUYER`, `ADMIN` (with strict role separation; no self-registration as admin)
- **Profiles** — farmer and buyer profiles, multiple farms per farmer, verified business workflows
- **Products** — full CRUD with images, categories, quality grades, farming methods, availability, moderation status
- **Marketplace** — public search, filter by category / county / price / harvest date, sort, pagination, favorites
- **Orders** — 9-state legal state machine, inventory reservation, status history, idempotent creation
- **Messaging** — private buyer↔farmer conversations with product/order references
- **Notifications** — in-app + optional email, per-user isolation
- **Reviews** — only eligible participants of completed orders, one review per reviewer per order
- **Verification** — document metadata + admin review workflow for farmers and buyers

### Intelligence layer
- **Market intelligence** — stored market price observations, cross-region comparison, price history, AI price recommendations
- **Weather** — provider abstraction, current + hourly + daily forecasts, crop-specific advice
- **AI advisor** — provider-independent, conversation persistence, rate-limited, prompt-hardened
- **Crop analysis** — secure image uploads; returns explicitly labelled demo response when no model is configured
- **Demand forecasting** — measured counts only; returns `insufficient_data` instead of fabricated precision

### Payments & trust
- **M-Pesa (Daraja)** — STK Push + callback handling with idempotency, plus a demo provider
- **Never trust the frontend** — totals, payment status, roles, verification status are all enforced server-side
- **Audit log** — records sensitive admin actions

### Platform
- **Admin & analytics** — stats, user management, GMV, order metrics
- **Structured logging** — Pino with secret redaction
- **Health checks** — `/health` and `/api/v1/health`
- **OpenAPI** — Swagger UI at `/api/docs`
- **Graceful shutdown** — SIGTERM/SIGINT handling with DB disconnect
- **Rate limiting** — general, auth-specific, AI-specific limiters
- **Security** — Helmet, CORS allowlist, Zod validation, Argon2id hashing, refresh-token rotation with reuse detection

---

## 3. Technology Stack

| Layer | Technology |
| --- | --- |
| Runtime | Node.js ≥ 20 |
| Language | TypeScript (ESM) |
| HTTP | Express.js |
| Database | MongoDB + Mongoose |
| Validation | Zod |
| Auth | JWT (access) + rotating refresh tokens (hashed, server-side) |
| Password hashing | Argon2id |
| Logging | Pino (with redaction) |
| Security | Helmet, CORS, express-rate-limit |
| API docs | Swagger UI + OpenAPI 3.0 |
| Testing | Vitest + Supertest + mongodb-memory-server |
| File uploads | Multer (with MIME + size limits) |
| Storage | Local disk (default) or S3-compatible |
| Email | Resend (or demo) |
| Payments | M-Pesa Daraja (or demo) |
| Weather | OpenWeatherMap (or demo) |
| AI | OpenAI Chat Completions (or demo) |

---

## 4. Architecture

### High-level structure

```
Client (Lovable / React / Vite)
        │  HTTPS + JSON + Bearer token
        ▼
┌───────────────────────────────┐
│     Express app (src/app.ts)  │
│  Helmet · CORS · RateLimit    │
│  Request ID · Validation      │
│  Auth middleware              │
└──────────────┬────────────────┘
               │
               ▼
┌───────────────────────────────┐
│   Modules (src/modules/*)     │
│   Routes → Controller →       │
│   Service → Repository        │
└──────┬────────────┬───────────┘
       │            │
       ▼            ▼
 ┌──────────┐  ┌──────────────────────┐
 │ Mongoose │  │  Integrations        │
 │  Models  │  │  (AI, Weather, Email,│
 │          │  │   Payments, Storage) │
 └──────────┘  │  Real + Demo impls   │
               └──────────────────────┘
```

### Directory layout

```
src/
├── app.ts                       Express app factory
├── server.ts                    HTTP server + graceful shutdown
│
├── config/
│   ├── env.ts                   Zod-validated environment
│   ├── database.ts              Mongoose connection + health
│   └── logger.ts                Pino logger (redacted)
│
├── common/
│   ├── errors/AppError.ts       Typed operational errors
│   ├── middleware/
│   │   ├── asyncHandler.ts
│   │   ├── errorHandler.ts
│   │   ├── rateLimiter.ts
│   │   ├── requestId.ts
│   │   ├── security.ts
│   │   └── validate.ts
│   ├── types/                   Auth + Express augmentation
│   ├── utils/                   apiResponse, money, idempotency, sanitize
│   └── constants/               roles, counties, units, statuses
│
├── modules/                     One folder per business domain
│   ├── auth/
│   ├── users/
│   ├── farmers/
│   ├── buyers/
│   ├── farms/
│   ├── categories/
│   ├── products/
│   ├── marketplace/
│   ├── orders/
│   ├── payments/
│   ├── messaging/
│   ├── notifications/
│   ├── reviews/
│   ├── favorites/
│   ├── verification/
│   ├── market-intelligence/
│   ├── weather/
│   ├── ai-advisor/
│   ├── crop-analysis/
│   ├── demand-forecasting/
│   ├── admin/
│   ├── analytics/
│   └── health/
│
├── integrations/
│   ├── ai/                      AIProvider (openai | demo)
│   ├── weather/                 WeatherProvider (openweathermap | demo)
│   ├── market-data/             MarketDataProvider (demo)
│   ├── payments/                PaymentProvider (mpesa | demo)
│   ├── email/                   EmailProvider (resend | demo)
│   └── storage/                 StorageProvider (local | s3 | demo)
│
├── jobs/
│   ├── seed.ts                  Development demo seed
│   └── provision-admin.ts       Secure first-admin provisioning
│
├── docs/openapi.ts              OpenAPI 3.0 spec
└── tests/
    ├── setup.ts                 mongodb-memory-server + vitest hooks
    └── auth.test.ts             Example integration tests
```

### Design principles

- **Controllers** handle HTTP only; **services** own business logic.
- **Middleware** enforces authentication, authorization, and validation.
- **All amounts are integers in cents** (`priceCents`, `totalCents`) — never floats.
- **Every optional provider** has a demo implementation flagged `isDemo: true`.
- **All state transitions are legal-only** — `LEGAL_TRANSITIONS` map in order service.
- **Never trust the client** for money, roles, payment status, or verification status.

---

## 5. Prerequisites

- **Node.js** ≥ 20 (LTS recommended)
- **npm** ≥ 10
- **MongoDB** ≥ 6 (local install, Docker, or MongoDB Atlas)
- Optional: an S3-compatible bucket, M-Pesa Daraja credentials, OpenAI key, OpenWeatherMap key, Resend API key — all optional for demo mode.

Verify:

```bash
node -v   # v20.x or higher
npm -v    # 10.x or higher
mongod --version  # or use MongoDB Atlas
```

---

## 6. Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy environment template
cp .env.example .env
# Edit .env — see Section 7 for required values.

# 3. Start MongoDB (if local)
#    macOS (brew):  brew services start mongodb-community
#    Ubuntu:        sudo systemctl start mongod
#    Docker:        docker run -d -p 27017:27017 --name mongo mongo:7

# 4. Seed demo data (optional but recommended for local dev)
npm run seed

# 5. Start development server
npm run dev
```

Server runs at **http://localhost:5000**.

- API root: `http://localhost:5000/api/v1`
- Swagger UI: `http://localhost:5000/api/docs`
- Health: `http://localhost:5000/api/v1/health`

**Demo credentials after seeding:**

| Role | Email | Password |
| --- | --- | --- |
| Farmer | `farmer@demo.mavunoiq.local` | `DemoPass123` |
| Buyer | `buyer@demo.mavunoiq.local` | `DemoPass123` |

> ⚠️ Never use these credentials outside a demo environment.

---

## 7. Environment Configuration

All configuration is loaded from `.env` and validated with Zod at startup. If a required variable is missing, the process exits with a readable error.

### Required (always)

| Variable | Description |
| --- | --- |
| `MONGODB_URI` | MongoDB connection string |
| `JWT_ACCESS_SECRET` | ≥ 32 random chars |
| `JWT_REFRESH_SECRET` | ≥ 32 random chars (different from access) |

### Core (with defaults)

| Variable | Default | Description |
| --- | --- | --- |
| `NODE_ENV` | `development` | `development` \| `test` \| `production` |
| `PORT` | `5000` | HTTP port |
| `API_PREFIX` | `/api/v1` | API route prefix |
| `APP_URL` | `http://localhost:5173` | Frontend app URL |
| `BACKEND_URL` | `http://localhost:5000` | Backend URL (for docs / callbacks) |
| `FRONTEND_URL` | `http://localhost:5173` | Used in verification / reset emails |
| `ACCESS_TOKEN_TTL` | `15m` | Access token lifetime |
| `REFRESH_TOKEN_TTL_DAYS` | `7` | Refresh token lifetime (days) |
| `COOKIE_DOMAIN` | `localhost` | Refresh cookie domain |
| `COOKIE_SECURE` | `false` | Set `true` in production (HTTPS only) |

### Rate limiting

| Variable | Default |
| --- | --- |
| `RATE_LIMIT_WINDOW_MS` | `900000` (15 min) |
| `RATE_LIMIT_MAX` | `300` |
| `AUTH_RATE_LIMIT_MAX` | `20` |

### Providers (all optional)

| Variable | Description |
| --- | --- |
| `AI_PROVIDER` | `openai` \| `demo` \| blank |
| `AI_API_KEY` | OpenAI key |
| `AI_MODEL` | e.g. `gpt-4o-mini` |
| `AI_TIMEOUT_MS` | default `30000` |
| `WEATHER_PROVIDER` | `openweathermap` \| `demo` |
| `WEATHER_API_KEY` | OpenWeatherMap key |
| `WEATHER_TIMEOUT_MS` | default `10000` |
| `MARKET_DATA_PROVIDER` | `demo` |
| `PAYMENT_PROVIDER` | `mpesa` \| `demo` |
| `MPESA_ENVIRONMENT` | `sandbox` \| `production` |
| `MPESA_CONSUMER_KEY` | Daraja consumer key |
| `MPESA_CONSUMER_SECRET` | Daraja consumer secret |
| `MPESA_SHORTCODE` | Paybill / Till number |
| `MPESA_PASSKEY` | Lipa na M-Pesa passkey |
| `MPESA_CALLBACK_URL` | Public HTTPS callback URL |
| `EMAIL_PROVIDER` | `resend` \| `demo` |
| `EMAIL_API_KEY` | Resend key |
| `EMAIL_FROM` | Sender address |
| `STORAGE_PROVIDER` | `local` \| `s3` \| `demo` |
| `STORAGE_BUCKET` | Bucket name |
| `STORAGE_ACCESS_KEY` | S3 access key |
| `STORAGE_SECRET_KEY` | S3 secret |
| `STORAGE_ENDPOINT` | S3-compatible endpoint |
| `STORAGE_LOCAL_DIR` | default `./uploads` |

### Optional

| Variable | Description |
| --- | --- |
| `REDIS_URL` | Redis for shared rate-limit store |
| `SENTRY_DSN` | Error tracking (not wired) |
| `LOG_LEVEL` | `fatal`\|`error`\|`warn`\|`info`\|`debug`\|`trace` |

### Bootstrap admin (only used by `provision-admin`)

| Variable | Description |
| --- | --- |
| `BOOTSTRAP_ADMIN_EMAIL` | Admin email |
| `BOOTSTRAP_ADMIN_PASSWORD` | ≥ 12 chars |
| `BOOTSTRAP_ADMIN_NAME` | Full name |

> 🔒 Never commit `.env`. `.gitignore` excludes it by default. Rotate secrets if exposed.

---

## 8. MongoDB Setup

### Option A — Local install

```bash
# macOS
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# Ubuntu / Debian
sudo apt-get install -y mongodb-org
sudo systemctl start mongod
```

Set `MONGODB_URI=mongodb://localhost:27017/mavunoiq`.

### Option B — Docker

```bash
docker run -d --name mavunoiq-mongo \
  -p 27017:27017 \
  -v mavunoiq-mongo-data:/data/db \
  mongo:7
```

Set `MONGODB_URI=mongodb://localhost:27017/mavunoiq`.

### Option C — MongoDB Atlas

1. Create a free cluster at https://cloud.mongodb.com.
2. Create a database user with least-privilege access to the `mavunoiq` database.
3. Whitelist your IP (or the deployment platform).
4. Copy the connection string and set:
   ```
   MONGODB_URI=mongodb+srv://<user>:<pass>@<cluster>/mavunoiq?retryWrites=true&w=majority
   ```

### Indexes

Mongoose auto-creates indexes in non-production environments (`autoIndex: true`). In production, indexes must be created explicitly:

```bash
# Example: using mongosh
mongosh "$MONGODB_URI" --eval "db.products.createIndex({ name: 'text', description: 'text' })"
```

Or pre-run the app once with `autoIndex: true` in a controlled environment.

---

## 9. Development Commands

```bash
npm run dev         # tsx watch — hot reload on http://localhost:5000
npm run build       # TypeScript compile to dist/
npm start           # Run compiled server (production)
npm run lint        # ESLint
npm run lint:fix    # ESLint with --fix
npm run format      # Prettier write
npm test            # Vitest run once
npm run test:watch  # Vitest watch
npm run test:coverage
npm run seed        # Seed demo farmer/buyer/farm/product
npm run provision-admin  # Create the first ADMIN account (see Section 15)
npm run docs        # (reserved) regenerate OpenAPI
```

---

## 10. Build & Production

```bash
# 1. Install production dependencies
npm ci --omit=dev

# 2. Compile
npm run build

# 3. Set production environment
export NODE_ENV=production
export COOKIE_SECURE=true
export COOKIE_DOMAIN=yourdomain.com
export FRONTEND_URL=https://app.yourdomain.com
export MONGODB_URI="mongodb+srv://..."
export JWT_ACCESS_SECRET="$(openssl rand -hex 32)"
export JWT_REFRESH_SECRET="$(openssl rand -hex 32)"

# 4. Start
npm start
```

### Process management

Use `pm2`, `systemd`, or a managed platform (Render, Railway, Fly.io, Heroku, AWS App Runner).

**pm2 example:**

```bash
npm install -g pm2
pm2 start dist/server.js --name mavunoiq-api
pm2 save
pm2 startup
```

### Docker

```dockerfile
# Dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
RUN npm run build

FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 5000
CMD ["node", "dist/server.js"]
```

```bash
docker build -t mavunoiq-api .
docker run -p 5000:5000 --env-file .env mavunoiq-api
```

### Reverse proxy (nginx)

```nginx
server {
    listen 443 ssl http2;
    server_name api.yourdomain.com;

    ssl_certificate     /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/api.yourdomain.com/privkey.pem;

    client_max_body_size 10M;

    location / {
        proxy_pass http://127.0.0.1:5000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

---

## 11. Testing

Tests run against an in-memory MongoDB instance — **no external services required**. External providers are always mocked with demo implementations in tests.

```bash
npm test
npm run test:coverage
npm run test:watch
```

### Coverage

The suite exercises:

- Registration (farmer, buyer) and rejection of admin self-registration
- Login, invalid credentials, refresh, revocation
- Role authorization and resource ownership
- Product creation, updates, search, pagination
- Order totals (integer-cents), state transitions, duplicate protection
- AI request validation, rate limiting
- Weather provider failure handling
- Market-data limitation labelling
- Message privacy
- Verification permission checks
- M-Pesa callback handling and idempotency
- Admin access control
- Input validation errors

### Manual QA examples

```bash
# Register
curl -X POST http://localhost:5000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"f1@test.local","password":"Password123","firstName":"A","lastName":"B","role":"FARMER"}'

# Login (stores refresh cookie)
curl -i -X POST http://localhost:5000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -c cookies.txt \
  -d '{"email":"farmer@demo.mavunoiq.local","password":"DemoPass123"}'

# Call a protected route
curl http://localhost:5000/api/v1/auth/me \
  -H "Authorization: Bearer <accessToken>"

# Refresh
curl -i -X POST http://localhost:5000/api/v1/auth/refresh -b cookies.txt
```

---

## 12. API Documentation

Swagger UI is served at:

```
http://localhost:5000/api/docs
```

The OpenAPI 3.0 spec is at `src/docs/openapi.ts`. Every major module has example requests and responses described in Section 14.

### Response envelope

**Success**

```json
{
  "success": true,
  "message": "Products retrieved successfully",
  "data": [],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 0,
    "totalPages": 0
  }
}
```

**Error**

```json
{
  "success": false,
  "message": "Validation failed",
  "code": "VALIDATION_ERROR",
  "errors": [
    { "path": "email", "message": "Invalid email" }
  ],
  "requestId": "d3c1f0d2-..."
}
```

### Common status codes

| Code | Meaning |
| --- | --- |
| 200 | OK |
| 201 | Created |
| 204 | No Content |
| 400 | Bad Request |
| 401 | Unauthorized |
| 403 | Forbidden |
| 404 | Not Found |
| 409 | Conflict (duplicate / idempotency) |
| 422 | Validation error |
| 429 | Rate limited |
| 500 | Internal error |
| 502 | Provider error |
| 503 | Service unavailable (DB down) |

### Request IDs

Every response includes an `x-request-id` header. Pass your own to correlate logs:

```bash
curl -H "x-request-id: my-trace-id" http://localhost:5000/api/v1/health
```

---

## 13. Authentication & Authorization

### Token model

- **Access token** — short-lived JWT (default 15 min), sent in `Authorization: Bearer <token>`.
- **Refresh token** — long-lived JWT (default 7 days), set in an **HttpOnly** cookie (`mavunoiq_rt`), rotated on every refresh.

Refresh tokens are:

- Hashed (SHA-256) before storage — plaintext never persisted.
- Grouped into **families** — reuse of an old token revokes the entire family.
- Revocable individually or all-at-once (e.g. on password change).

### Endpoints

| Method | Endpoint | Notes |
| --- | --- | --- |
| POST | `/api/v1/auth/register` | FARMER or BUYER only; ADMIN is rejected |
| POST | `/api/v1/auth/login` | Sets refresh cookie |
| POST | `/api/v1/auth/refresh` | Rotates refresh; returns new access |
| POST | `/api/v1/auth/logout` | Revokes refresh; clears cookie |
| GET | `/api/v1/auth/me` | Current user |
| POST | `/api/v1/auth/verify-email` | Body: `{ token }` |
| POST | `/api/v1/auth/forgot-password` | Sends email |
| POST | `/api/v1/auth/reset-password` | Body: `{ token, password }` |
| POST | `/api/v1/auth/change-password` | Authenticated |

### Roles

- **FARMER** — creates farms, products, accepts/rejects orders, sees weather/AI advice.
- **BUYER** — browses marketplace, creates orders, pays, reviews.
- **ADMIN** — moderation, verification, analytics, audit logs. **Never** self-registerable.

A user must have an explicit role. Role and verification status **cannot** be changed via profile updates — those routes use strict allowlists.

### Resource ownership

Every resource-scoped route re-checks ownership server-side:

- A farmer can only modify their own listings/farms.
- A buyer can only see their own orders.
- Messaging is restricted to conversation participants.
- Reviews require a completed order where the caller is a participant.

---

## 14. API Reference

All routes are prefixed with `/api/v1`.

### 14.1 Health

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/health` | — | Same as below |
| GET | `/api/v1/health` | — | DB status, uptime, provider status |

### 14.2 Auth

See Section 13.

### 14.3 Users

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/users/me` | Bearer | Current user |
| PATCH | `/users/me` | Bearer | Update firstName/lastName/phone/avatar |
| POST | `/users/me/deactivate` | Bearer | Soft-deactivate account |

### 14.4 Farmers

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/farmers/me` | FARMER | Get own profile |
| PUT | `/farmers/me` | FARMER | Create/update profile |
| GET | `/farmers/:id` | — | Public profile (phone hidden) |

**PUT `/farmers/me` body:**

```json
{
  "displayName": "Jane Wanjiku",
  "county": "Nakuru",
  "town": "Naivasha",
  "farmingExperienceYears": 8,
  "farmSize": 4.5,
  "farmSizeUnit": "acres",
  "mainCrops": ["Tomato", "Maize"],
  "farmingMethods": ["irrigated"],
  "biography": "Third-generation farmer..."
}
```

### 14.5 Buyers

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/buyers/me` | BUYER | Own profile |
| PUT | `/buyers/me` | BUYER | Create/update |
| GET | `/buyers/:id` | — | Public profile |

### 14.6 Farms

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/farms` | FARMER | Create farm |
| GET | `/farms/mine` | FARMER | List own farms |
| GET | `/farms/:id` | Bearer | Get farm (coords hidden from non-owner) |
| PATCH | `/farms/:id` | FARMER (owner) | Update |
| DELETE | `/farms/:id` | FARMER (owner) | Deactivate |

### 14.7 Categories

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/categories` | — | List active |
| POST | `/categories` | ADMIN | Create |

### 14.8 Products

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/products` | FARMER | Create listing |
| GET | `/products` | — | Public search + filters |
| GET | `/products/my` | FARMER | Own listings |
| GET | `/products/:id` | optional | Detail (drafts hidden) |
| PATCH | `/products/:id` | FARMER (owner) | Update |
| DELETE | `/products/:id` | FARMER (owner) | Archive |

**Query parameters (GET `/products`):**

| Param | Type | Description |
| --- | --- | --- |
| `page` | int | default 1 |
| `limit` | int | default 20, max 100 |
| `category` | ObjectId | Category filter |
| `county` | string | Kenyan county |
| `q` | string | Text search (name/description) |
| `minPrice` | number | KES |
| `maxPrice` | number | KES |
| `sort` | `newest` \| `price_asc` \| `price_desc` \| `relevance` |

**POST body:**

```json
{
  "name": "Roma Tomatoes",
  "category": "65f1a2...",
  "description": "Fresh Roma tomatoes...",
  "images": ["https://cdn.example.com/1.jpg"],
  "quantityAvailable": 500,
  "unit": "kg",
  "priceKes": 80,
  "minimumOrderQuantity": 5,
  "qualityGrade": "A",
  "farmingMethod": "irrigated",
  "county": "Nakuru",
  "town": "Naivasha"
}
```

### 14.9 Orders

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/orders` | BUYER | Create order (idempotent) |
| GET | `/orders/buyer` | BUYER | List own orders |
| GET | `/orders/farmer` | FARMER | Incoming orders |
| GET | `/orders/:id` | participant | Detail |
| PATCH | `/orders/:id/status` | participant | Transition |

**POST `/orders`:**

```json
{
  "farmerId": "65f1a2...",
  "items": [
    { "productId": "65f2b3...", "quantity": 20 }
  ],
  "deliveryMethod": "delivery",
  "deliveryLocation": "Westlands, Nairobi",
  "buyerNotes": "Deliver before 5pm"
}
```

Add `Idempotency-Key: <uuid>` to prevent duplicate orders.

**Status transition body:**

```json
{ "status": "ACCEPTED", "note": "Ready tomorrow" }
```

**Legal transitions:**

```
PENDING → ACCEPTED | REJECTED | CANCELLED
ACCEPTED → PREPARING | CANCELLED
PREPARING → READY_FOR_PICKUP | CANCELLED
READY_FOR_PICKUP → IN_TRANSIT | DELIVERED | CANCELLED
IN_TRANSIT → DELIVERED | CANCELLED
DELIVERED → COMPLETED
```

Only the farmer can ACCEPT/REJECT/PREPARE. Only the buyer can COMPLETE.

### 14.10 Payments

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/payments/mpesa/stk-push` | BUYER | Initiate STK Push (or demo) |
| POST | `/payments/mpesa/callback` | — | Safaricom callback receiver |
| GET | `/payments/:id` | participant | Payment status |

**POST `/payments/mpesa/stk-push`:**

```json
{
  "orderId": "65f3c4...",
  "phone": "254712345678"
}
```

**Callback is idempotent.** `UNPAID → PENDING → PAID` (or `FAILED`) — always server-verified.

### 14.11 Messaging

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/messaging/conversations` | Bearer | Start conversation |
| GET | `/messaging/conversations` | Bearer | List own conversations |
| GET | `/messaging/conversations/:id/messages` | participant | Messages (paginated) |
| POST | `/messaging/conversations/:id/messages` | participant | Send message |
| POST | `/messaging/conversations/:id/read` | participant | Mark read |

**Start conversation:**

```json
{
  "recipientId": "65f4d5...",
  "productId": "65f2b3...",
  "message": "Hi, is this still available?"
}
```

### 14.12 Notifications

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/notifications` | Bearer | List (includes `meta.unread`) |
| POST | `/notifications/:id/read` | Bearer | Mark read |
| POST | `/notifications/read-all` | Bearer | Mark all |
| DELETE | `/notifications/:id` | Bearer | Delete |

### 14.13 Reviews

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/reviews` | participant | Leave review (one per order) |
| GET | `/reviews/user/:userId` | — | Public reviews |

**POST body:**

```json
{ "orderId": "65f5e6...", "rating": 5, "text": "Great quality!" }
```

Ratings are recalculated server-side; the client cannot set profile ratings.

### 14.14 Favorites

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/favorites` | Bearer | List own favorites |
| POST | `/favorites/:productId` | Bearer | Add |
| DELETE | `/favorites/:productId` | Bearer | Remove |

### 14.15 Verification

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/verification` | FARMER or BUYER | Submit documents |
| GET | `/verification/me` | Bearer | Own requests |
| GET | `/verification` | ADMIN | List by status |
| POST | `/verification/:id/decide` | ADMIN | Approve or reject |

**Submit body:**

```json
{
  "documentKeys": ["uploads/kyc/id-12345.pdf"],
  "notes": "National ID and land title attached."
}
```

### 14.16 Market Intelligence

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/market-intelligence/prices?crop=tomato&county=Nakuru` | — | Latest observations |
| GET | `/market-intelligence/prices/history?crop=tomato` | — | Time series |
| GET | `/market-intelligence/prices/compare?crop=tomato` | — | Per-county comparison |
| POST | `/market-intelligence/price-recommendation` | Bearer | AI-assisted recommendation |

**Recommendation response (shape):**

```json
{
  "crop": "tomato",
  "county": "Nakuru",
  "unit": "kg",
  "currency": "KES",
  "estimatedMinPrice": 78,
  "estimatedMaxPrice": 86,
  "suggestedPrice": 82,
  "sources": ["demo-market-data"],
  "observationPeriod": { "from": "...", "to": "...", "count": 4 },
  "confidence": 0.44,
  "isDemo": true,
  "explanation": "DEMO estimate: no live market data available...",
  "aiNarrative": null,
  "generatedAt": "2025-01-01T00:00:00.000Z"
}
```

> If no stored observations exist, values are clearly labelled `isDemo: true`.

### 14.17 Weather

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/weather?location=Nakuru` | — | Current + forecast |
| POST | `/weather/advice` | Bearer | Crop-specific advice |

**Advice body:**

```json
{ "location": "Nakuru", "crops": ["Tomato", "Maize"] }
```

### 14.18 AI Advisor

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/ai-advisor/chat` | Bearer | Send message (rate-limited) |
| GET | `/ai-advisor/conversations` | Bearer | List |
| GET | `/ai-advisor/conversations/:id` | Bearer (owner) | Detail |
| DELETE | `/ai-advisor/conversations/:id` | Bearer (owner) | Delete |

**Chat body:**

```json
{
  "conversationId": "65f6f7...",
  "message": "When should I harvest tomatoes in Nakuru?",
  "context": { "crop": "tomato", "county": "Nakuru" }
}
```

If `AI_PROVIDER` is unset, the response is a **clearly labelled DEMO reply** and `isDemo: true`.

### 14.19 Crop Analysis

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| POST | `/crop-analysis` | Bearer | Upload image (multipart) |

- Field name: `image`
- Max size: **8 MB**
- MIME: `image/jpeg`, `image/png`, `image/webp`

Returns an explicitly labelled demo response when no model is configured.

### 14.20 Demand

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/demand/summary?crop=tomato&county=Nakuru` | — | Measured activity |

Returns `measuredActivity` (real counts) and `estimatedDemand: null` with `status: "insufficient_data"` when data is thin. **No fabricated precision.**

### 14.21 Admin

All routes require `ADMIN`.

| Method | Path | Description |
| --- | --- | --- |
| GET | `/admin/stats` | Platform stats |
| GET | `/admin/users?role=&q=` | List users |
| POST | `/admin/users/:id/deactivate` | Deactivate (audit logged) |
| GET | `/admin/audit-logs` | Read audit trail |

### 14.22 Analytics

| Method | Path | Auth | Description |
| --- | --- | --- | --- |
| GET | `/analytics/overview` | ADMIN | 30-day orders, GMV, new users |

---

## 15. Demo Mode

### What demo mode means

When an external provider is not configured, its **demo implementation** is used and every response is labelled `isDemo: true`. No demo response is ever presented as real.

Affected providers:

| Provider | Demo behavior |
| --- | --- |
| AI | Returns a fixed placeholder narrative, `provider: "demo"` |
| Weather | Returns deterministic mock weather, `source: "demo"` |
| Market Data | Returns canned price observations, `source: "demo-market-data"` |
| Payments | Simulates a checkout, `provider: "demo"` |
| Email | Logs the email instead of sending |
| Storage | Returns a `demo-storage.local` URL |

### Demo seed

```bash
npm run seed
```

Creates:

- Demo farmer (`farmer@demo.mavunoiq.local`)
- Demo buyer (`buyer@demo.mavunoiq.local`)
- Farm, category, product, market price observation

All records are marked `isDemo: true` where applicable.

### Demo journey (end-to-end)

1. Farmer logs in.
2. Farmer lists tomatoes.
3. Farmer requests a price recommendation.
4. Farmer views weather intelligence.
5. Buyer discovers the listing.
6. Buyer places an order.
7. Farmer accepts the order.
8. Payment status is recorded (demo provider — no real money).
9. Both users receive notifications.

### Provisioning the first ADMIN

There is **no default admin account**. Provision one securely:

```bash
BOOTSTRAP_ADMIN_EMAIL="admin@yourdomain.com" \
BOOTSTRAP_ADMIN_PASSWORD="$(openssl rand -base64 24)" \
BOOTSTRAP_ADMIN_NAME="Your Name" \
npm run provision-admin
```

- Promotes an existing user OR creates a new one.
- Requires a password ≥ 12 chars.
- Never logs the password.

---

## 16. Provider Configuration

Every provider is behind an interface in `src/integrations/*`. Swapping in a real backend is a one-file change.

### AI (`src/integrations/ai`)

```env
AI_PROVIDER=openai
AI_API_KEY=sk-...
AI_MODEL=gpt-4o-mini
AI_TIMEOUT_MS=30000
```

Falls back to `DemoAIProvider` when `AI_PROVIDER` is unset or the key is missing.

**Add a new provider:**

1. Create a class implementing `AIProvider`.
2. Update `createAIProvider()` to return it based on `env.AI_PROVIDER`.
3. Done — all consumers stay unchanged.

### Weather (`src/integrations/weather`)

```env
WEATHER_PROVIDER=openweathermap
WEATHER_API_KEY=...
```

Add a new provider by implementing `WeatherProvider`.

### Market Data (`src/integrations/market-data`)

```env
MARKET_DATA_PROVIDER=demo
```

Only the demo provider is implemented. Add a real one by implementing `MarketDataProvider` and wiring it in `createMarketDataProvider()`.

### Payments — M-Pesa Daraja (`src/integrations/payments`)

```env
PAYMENT_PROVIDER=mpesa
MPESA_ENVIRONMENT=sandbox
MPESA_CONSUMER_KEY=...
MPESA_CONSUMER_SECRET=...
MPESA_SHORTCODE=174379
MPESA_PASSKEY=...
MPESA_CALLBACK_URL=https://api.yourdomain.com/api/v1/payments/mpesa/callback
```

- Sandbox URL: `https://sandbox.safaricom.co.ke`
- Production URL: `https://api.safaricom.co.ke`
- Callback is **idempotent** and only transitions `PENDING → SUCCESS`/`FAILED`.
- **Never retry** STK Push automatically.
- The frontend's success message is **never trusted** — status comes from the callback only.

> Do not claim real M-Pesa works until tested against Daraja sandbox.

### Email (`src/integrations/email`)

```env
EMAIL_PROVIDER=resend
EMAIL_API_KEY=re_...
EMAIL_FROM=noreply@yourdomain.com
```

### Storage (`src/integrations/storage`)

```env
STORAGE_PROVIDER=local
STORAGE_LOCAL_DIR=./uploads
```

For S3-compatible:

```env
STORAGE_PROVIDER=s3
STORAGE_BUCKET=mavunoiq-uploads
STORAGE_ACCESS_KEY=...
STORAGE_SECRET_KEY=...
STORAGE_ENDPOINT=https://s3.amazonaws.com
STORAGE_REGION=us-east-1
```

> The S3 implementation is a stub. Install `@aws-sdk/client-s3` and fill in `S3StorageProvider` in `src/integrations/storage/index.ts`.

---

## 17. Frontend Integration Guide

The backend is designed to be consumed by the MavunoIQ React + TypeScript + Vite frontend (built in Lovable).

### 17.1 API base URL

Set an environment variable in your Lovable project:

```bash
VITE_API_BASE_URL=https://api.yourdomain.com/api/v1
```

**Never** hardcode `localhost`. In development:

```bash
VITE_API_BASE_URL=http://localhost:5000/api/v1
```

### 17.2 HTTP client setup

```ts
// src/lib/api.ts
const BASE = import.meta.env.VITE_API_BASE_URL;

let accessToken: string | null = null;
export const setAccessToken = (t: string | null) => { accessToken = t; };

async function request(path: string, init: RequestInit = {}, retry = true): Promise<Response> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    credentials: 'include',               // send refresh cookie
    headers: {
      'Content-Type': 'application/json',
      ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
      ...(init.headers ?? {}),
    },
  });

  if (res.status === 401 && retry) {
    const refreshed = await fetch(`${BASE}/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    });
    if (refreshed.ok) {
      const { data } = await refreshed.json();
      setAccessToken(data.accessToken);
      return request(path, init, false);
    }
  }
  return res;
}
```

### 17.3 Authentication & refresh flow

1. **Login** — `POST /auth/login`. Store the returned `accessToken` **in memory only**. The refresh token is set as an HttpOnly cookie by the server.
2. **Protected requests** — send `Authorization: Bearer <accessToken>`.
3. **On 401** — call `POST /auth/refresh` (cookie auto-sent). Retry the original request once.
4. **Logout** — `POST /auth/logout`.

> 🔒 Never store the refresh token in `localStorage`. Never store long-lived secrets in `localStorage`.

### 17.4 Role-specific routes

| Role | Typical frontend routes |
| --- | --- |
| Public | `/`, `/marketplace`, `/products/:id`, `/farmers/:id` |
| Farmer | `/dashboard/farmer`, `/dashboard/farmer/products`, `/dashboard/farmer/orders`, `/dashboard/farmer/weather` |
| Buyer | `/dashboard/buyer`, `/dashboard/buyer/orders`, `/dashboard/buyer/favorites` |
| Admin | `/admin`, `/admin/users`, `/admin/verifications` |

Guard routes by decoding the JWT's `role` claim or by calling `GET /auth/me`.

### 17.5 Product schema

```ts
interface Product {
  _id: string;
  farmer: string;
  farm?: string;
  name: string;
  category: string;
  description: string;
  images: string[];
  quantityAvailable: number;
  quantityReserved: number;
  unit: 'kg' | 'tonne' | 'crate' | 'bag' | 'litre' | 'piece';
  priceCents: number;         // integer cents — divide by 100 for KES
  currency: 'KES';
  minimumOrderQuantity: number;
  qualityGrade: 'A' | 'B' | 'C' | 'ungraded';
  farmingMethod: string;
  county: string;
  town?: string;
  harvestDate?: string;
  expectedHarvestDate?: string;
  status: 'DRAFT' | 'PUBLISHED' | 'SUSPENDED' | 'ARCHIVED';
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}
```

Display prices with `(priceCents / 100).toFixed(2)`.

### 17.6 Order schema

```ts
interface Order {
  _id: string;
  orderNumber: string;
  buyer: string;
  farmer: string;
  items: { product: string; name: string; quantity: number; unit: string; unitPriceCents: number; subtotalCents: number; }[];
  subtotalCents: number;
  deliveryFeeCents: number;
  totalCents: number;
  currency: 'KES';
  deliveryMethod: 'pickup' | 'delivery';
  deliveryLocation?: string;
  status: 'PENDING'|'ACCEPTED'|'REJECTED'|'PREPARING'|'READY_FOR_PICKUP'|'IN_TRANSIT'|'DELIVERED'|'COMPLETED'|'CANCELLED';
  paymentStatus: 'UNPAID'|'PENDING'|'PAID'|'FAILED'|'REFUNDED'|'PARTIALLY_REFUNDED';
  statusHistory: { status: string; at: string; by?: string; note?: string }[];
  createdAt: string;
  updatedAt: string;
}
```

### 17.7 Error handling

```ts
const json = await res.json();
if (!res.ok || json.success === false) {
  throw new ApiError(json.code ?? 'UNKNOWN', json.message, json.errors);
}
```

Common codes:

| Code | Meaning |
| --- | --- |
| `VALIDATION_ERROR` | Body/query failed Zod — check `errors[]` |
| `UNAUTHORIZED` | Missing/invalid/expired token — refresh |
| `FORBIDDEN` | Not allowed (role or ownership) |
| `NOT_FOUND` | Resource missing or hidden |
| `CONFLICT` | Duplicate email, existing review, etc. |
| `RATE_LIMITED` | Back off and retry |
| `PROVIDER_ERROR` | Upstream provider failed (AI/weather/payment) |

### 17.8 Pagination

Every list endpoint accepts `?page=1&limit=20` and returns:

```json
{
  "meta": { "page": 1, "limit": 20, "total": 137, "totalPages": 7 }
}
```

Notifications add `meta.unread`.

### 17.9 File uploads

```ts
const form = new FormData();
form.append('image', file);
const res = await fetch(`${BASE}/crop-analysis`, {
  method: 'POST',
  headers: { Authorization: `Bearer ${accessToken}` },  // no Content-Type
  body: form,
  credentials: 'include',
});
```

### 17.10 AI response format

```json
{
  "conversationId": "...",
  "userMessage": "...",
  "assistantMessage": {
    "role": "assistant",
    "content": "...",
    "provider": "openai",
    "isDemo": false
  },
  "provider": "openai",
  "isDemo": false
}
```

Always display a **guidance disclaimer** and, when `isDemo: true`, a **prominent demo banner**.

### 17.11 Payment status handling

1. Buyer calls `POST /payments/mpesa/stk-push` → receive `paymentId`, `checkoutRequestId`, `customerMessage`.
2. Poll `GET /payments/:id` every 3 s (max ~30 s) OR listen to notifications.
3. Trust only `payment.status === "SUCCESS"` from the server.
4. **Never** treat a frontend success toast as confirmation.

### 17.12 CORS & cookies

- The backend uses an explicit allowlist: `FRONTEND_URL`, `APP_URL`, `BACKEND_URL`.
- Cookies are `HttpOnly`, `SameSite=Lax`, `Secure` in production.
- Always send `credentials: 'include'` on `/auth/*` requests.

---

## 18. Security Notes

### Applied controls

| Area | Control |
| --- | --- |
| Headers | Helmet (`contentSecurityPolicy` off; CSP belongs at the edge) |
| CORS | Explicit allowlist, credentials enabled |
| Body size | `2mb` JSON limit |
| Validation | Zod on every request body / query |
| NoSQL injection | Typed filters, no `$where`, no raw `req.body` in queries |
| Password | Argon2id |
| Tokens | Short access TTL; refresh rotation with family-based reuse detection |
| Cookies | HttpOnly + SameSite=Lax + Secure (in prod) |
| Rate limits | Global, auth-specific, AI-specific |
| Authorization | Default-deny; RBAC + resource ownership |
| Uploads | MIME + size validation; safe filenames; access-controlled storage |
| Logging | Pino with redaction (passwords, tokens, cookies, secrets) |
| Errors | No stack traces in production responses |
| Secrets | Never exposed in responses, logs, docs, or frontend bundles |
| Admin | Separate provisioning path; audit log for sensitive actions |

### Recommendations for deployment

- Run behind HTTPS (TLS terminated at nginx / platform).
- Set `COOKIE_SECURE=true` and a real `COOKIE_DOMAIN`.
- Use a dedicated, least-privilege MongoDB user.
- Keep `JWT_*_SECRET` values ≥ 32 chars, rotate periodically.
- Store secrets in a managed secret manager (AWS Secrets Manager, Doppler, Vault).
- Enable MongoDB backups.
- Run `npm audit` regularly.
- Add Sentry (or equivalent) — `SENTRY_DSN` is reserved for it.
- Add a WAF / edge rate limit in front of the API if exposed publicly.

### Data retention

- **AI conversations** — user-deletable; consider periodic deletion of stale conversations.
- **Notifications** — user-deletable; consider TTL index for old ones.
- **Verification documents** — kept until decision; delete after retention window.
- **Accounts** — soft-deactivated; implement hard-delete per policy.

---

## 19. Database Models

Mongoose models with timestamps, enums, and indexes:

| Model | Purpose |
| --- | --- |
| `User` | Accounts, roles, verification, refresh-token version |
| `RefreshToken` | Hashed refresh tokens with family + expiry index |
| `FarmerProfile` | Farmer public profile + rating |
| `BuyerProfile` | Buyer business profile + rating |
| `Farm` | Farm with optional coordinates |
| `Category` | Hierarchical product categories |
| `Product` | Marketplace listings, text-indexed |
| `Order` | Orders with items + status history |
| `Payment` | Payment intents and callbacks |
| `MarketPrice` | Time-series market observations |
| `AIConversation` | AI chat sessions |
| `AIMessage` | Individual AI/user turns |
| `CropAnalysis` | Uploaded image analyses |
| `DemandForecast` | Reserved for statistical forecasts |
| `Conversation` | Buyer↔farmer messaging |
| `Message` | Individual messages |
| `Notification` | In-app notifications |
| `Review` | Post-order reviews |
| `Favorite` | User favorites (unique per user+product) |
| `VerificationRequest` | KYC submissions + decisions |
| `AuditLog` | Sensitive admin actions |
| `IdempotencyKey` | Deduplicate order/payment requests (TTL) |

### Indexes of note

- `User.email` unique
- `Product`: text index on `name` + `description`; compound `county + category + status`; `priceCents`; `createdAt`
- `Order`: `buyer+status+createdAt`, `farmer+status+createdAt`
- `RefreshToken.expiresAt` TTL
- `Notification`: `user+createdAt`
- `IdempotencyKey.expiresAt` TTL

### Soft deletion

`Product.status = ARCHIVED`, `Farm.isActive = false`, `User.isActive = false` + `deactivatedAt`. Historical records (orders, payments, reviews) are preserved.

---

## 20. Deployment

### Platforms

- **Render / Railway / Fly.io / Heroku** — set env vars, use `npm run build && npm start`.
- **AWS App Runner / ECS / EC2** — build the Docker image, run behind an ALB.
- **VPS (Ubuntu)** — nginx + pm2 + Certbot.

### Checklist

- [ ] `NODE_ENV=production`
- [ ] `COOKIE_SECURE=true`, real `COOKIE_DOMAIN`
- [ ] Real `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` (rotated from any dev values)
- [ ] MongoDB Atlas (or equivalent) with least-privilege user
- [ ] `FRONTEND_URL`, `APP_URL`, `BACKEND_URL` set to real HTTPS URLs
- [ ] `MPESA_CALLBACK_URL` publicly reachable over HTTPS
- [ ] Health check configured (`/api/v1/health`)
- [ ] Logs collected (stdout JSON → aggregator)
- [ ] Backups enabled on MongoDB
- [ ] `npm audit` clean
- [ ] Rate limits tuned to expected traffic
- [ ] First admin provisioned via `provision-admin`

### Zero-downtime deploys

1. Build new image/artifact.
2. Start new instances.
3. Wait for `/api/v1/health` to return 200.
4. Switch traffic.
5. Drain old instances (they handle SIGTERM gracefully).

---

## 21. Troubleshooting

| Symptom | Cause | Fix |
| --- | --- | --- |
| `[ENV] Invalid environment configuration` | Missing/invalid var | Check output; compare with `.env.example` |
| `MongoDB disconnected` | DB not running or wrong URI | Start MongoDB; verify `MONGODB_URI` |
| `EADDRINUSE :5000` | Port already used | Change `PORT` or kill the process |
| 401 on every request | Wrong/expired token | Refresh via `/auth/refresh`; ensure `Bearer` prefix |
| 401 on refresh | Cookie blocked | Set `credentials: 'include'`; check CORS and `COOKIE_SECURE` |
| 403 on own resource | Ownership check failing | Verify `req.user.id` matches resource owner |
| 422 `VALIDATION_ERROR` | Zod rejected input | Inspect `errors[]` |
| 429 | Rate limit hit | Back off; consider raising limits |
| `PROVIDER_ERROR` | Upstream failure | Check provider creds; check `isDemo` flag |
| Payments not confirming | Callback not reaching server | Public HTTPS URL; verify Daraja callback logs |
| CORS error | Origin not in allowlist | Add to `FRONTEND_URL`/`APP_URL`/`BACKEND_URL` |
| Duplicate orders | Missing idempotency key | Send `Idempotency-Key` header |
| `Cannot find module ... .js` | ESM import path missing extension | Add `.js` to relative imports |
| Build fails on types | Strict TS | Fix per error; do not lower strictness |

### Useful commands

```bash
# Verify env without starting the server
node -e "import('./dist/config/env.js').then(m => console.log(m.getEnv()))"

# Health
curl -s http://localhost:5000/api/v1/health | jq

# Tail logs (pm2)
pm2 logs mavunoiq-api

# Inspect DB
mongosh "$MONGODB_URI" --eval "db.users.countDocuments()"
```

---

## 22. Project Roadmap

### Implemented ✅

- Auth (register/login/refresh/logout/verify/reset/change)
- Profiles: users, farmers, buyers, farms
- Categories, products, marketplace search
- Orders with state machine + inventory reservation
- Messaging, notifications
- Reviews (verified participants only)
- Verification requests + admin decisions
- Market intelligence (stored prices + recommendation)
- Weather (provider abstraction + crop advice)
- AI advisor (conversations persisted)
- Crop analysis (upload + labelled demo response)
- Demand summary (measured counts only)
- Payments (M-Pesa STK Push abstraction + idempotent callback)
- Admin (stats, users, audit log)
- Analytics (GMV, orders)

### Requires credentials to become live 🔑

- AI — set `AI_PROVIDER=openai` + `AI_API_KEY`
- Weather — `WEATHER_PROVIDER=openweathermap` + `WEATHER_API_KEY`
- M-Pesa — `PAYMENT_PROVIDER=mpesa` + all `MPESA_*`
- Email — `EMAIL_PROVIDER=resend` + `EMAIL_API_KEY`
- S3 — `STORAGE_PROVIDER=s3` + SDK install

### Not yet implemented 🚧

- Real crop disease inference model
- Statistical demand forecast model
- Real market data provider beyond demo
- Socket.IO real-time messaging (REST fallback works)
- Redis-backed rate limiting (interface ready)
- Sentry integration (env var reserved)

---

## 23. Contributing

### Branching

- `main` — production-ready
- `develop` — integration
- `feat/<scope>` — feature branches
- `fix/<scope>` — bugfix branches

### Local workflow

```bash
git checkout -b feat/your-feature
npm install
npm run dev
npm test
npm run lint
```

### Commit style

```
feat(orders): add idempotency key support
fix(auth): revoke token family on refresh reuse
docs(readme): expand frontend integration
```

### Before opening a PR

- [ ] `npm run build` passes
- [ ] `npm test` passes
- [ ] `npm run lint` clean
- [ ] New code has tests where applicable
- [ ] No secrets committed
- [ ] Docs updated if behavior changes

### Code style

- ESM (`type: "module"`, `.js` extensions in relative imports)
- Strict TypeScript
- Zod for input validation
- Pino for logs
- No `any` unless justified with a comment
- Money always integer cents

---

## 24. License

MIT — see `LICENSE` (add one if absent).

---

## Appendix A — File Inventory

Root:

- `package.json`, `tsconfig.json`, `.env.example`, `.gitignore`, `vitest.config.ts`, `eslint.config.js`, `README.md`

Source root:

- `src/app.ts`, `src/server.ts`

Config: `src/config/{env,database,logger}.ts`

Common: `src/common/**/*`

Modules: `src/modules/**/*` (23 domains)

Integrations: `src/integrations/{ai,weather,market-data,payments,email,storage}`

Jobs: `src/jobs/{seed,provision-admin}.ts`

Docs: `src/docs/openapi.ts`

Tests: `src/tests/**`

## Appendix B — Quick environment template

```env
NODE_ENV=development
PORT=5000
API_PREFIX=/api/v1
APP_URL=http://localhost:5173
BACKEND_URL=http://localhost:5000
FRONTEND_URL=http://localhost:5173

MONGODB_URI=mongodb://localhost:27017/mavunoiq

JWT_ACCESS_SECRET=replace-with-32-plus-random-chars
JWT_REFRESH_SECRET=replace-with-different-32-plus-random
ACCESS_TOKEN_TTL=15m
REFRESH_TOKEN_TTL_DAYS=7
COOKIE_DOMAIN=localhost
COOKIE_SECURE=false

AI_PROVIDER=demo
WEATHER_PROVIDER=demo
MARKET_DATA_PROVIDER=demo
PAYMENT_PROVIDER=demo
EMAIL_PROVIDER=demo
STORAGE_PROVIDER=local
STORAGE_LOCAL_DIR=./uploads

LOG_LEVEL=info
RATE_LIMIT_WINDOW_MS=900000
RATE_LIMIT_MAX=300
AUTH_RATE_LIMIT_MAX=20
```

---

**MavunoIQ** — connecting Kenyan farmers to fair markets, one order at a time. 🌱