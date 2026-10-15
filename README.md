# MavunoIQ Backend API

AI-powered agricultural marketplace connecting Kenyan farmers directly with verified buyers.

## Overview

MavunoIQ backend is a production-oriented Node.js + TypeScript + Express + MongoDB API. It powers authentication, farmer and buyer profiles, farms, product listings, orders, messaging, notifications, reviews, verification, market intelligence, weather, AI advisory, crop analysis, demand forecasting, payments (M-Pesa abstraction), administration and analytics.

**External providers are optional.** When credentials are absent, the API runs in a clearly labelled **DEMO mode** using provider abstractions. Demo responses are never presented as real.

## Prerequisites

- Node.js >= 20
- npm >= 10
- MongoDB (local or Atlas)

## Installation

```bash
npm install
cp .env.example .env
# Edit .env — at minimum set MONGODB_URI, JWT_ACCESS_SECRET, JWT_REFRESH_SECRET