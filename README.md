# ShopHub E-Commerce Marketplace

ShopHub is a full-stack e-commerce marketplace that supports buyer shopping flows, seller inventory management, product search, cart checkout, payment processing, and order fulfillment. The project is built with a React + TypeScript frontend and an Express + Prisma backend backed by PostgreSQL.

## Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Available Scripts](#available-scripts)
- [API Overview](#api-overview)
- [Database Overview](#database-overview)
- [Benchmarking Resume Metrics](#benchmarking-resume-metrics)
- [Security Notes](#security-notes)

## Features

### Buyer Experience

- Account registration and login with JWT-based authentication
- Product catalog with category filters, sorting, pagination, ratings, and product details
- Full-text product search powered by Elasticsearch
- Cart management with add, update, remove, and clear-cart flows
- Checkout with Cash on Delivery and PayPal sandbox payment support
- Order tracking with payment success, failure, and confirmation screens
- Product reviews and ratings

### Seller Experience

- Seller onboarding through the same authentication flow
- Seller dashboard with revenue, sold-products, and review metrics
- Product creation, editing, deletion, and inventory status management
- Multi-image product uploads through Cloudinary
- Hierarchical category selection for main categories, subcategories, and leaf categories
- Order confirmation, shipment tracking, and delivery status updates

### Backend Capabilities

- REST API built with Express.js
- PostgreSQL schema managed with Prisma ORM
- Atomic order creation with Prisma transactions
- PayPal order creation and capture flow
- Cloudinary-backed image upload pipeline
- Elasticsearch product indexing and multi-field search
- PostgreSQL trigger for maintaining product average ratings
- Benchmark scripts for calculating real performance percentages for resume metrics

## Tech Stack

| Layer | Tools |
| --- | --- |
| Frontend | React.js, TypeScript, Vite, Tailwind CSS, React Router, Lucide React, React Hot Toast |
| Backend | Node.js, Express.js, Prisma ORM, JWT, bcrypt, Multer |
| Database | PostgreSQL |
| Search | Elasticsearch |
| Payments | PayPal Sandbox API |
| Media Storage | Cloudinary |
| Caching / Metrics | Redis benchmark support |
| Tooling | ESLint, TypeScript, npm |

## Architecture

```text
frontend/                  backend/
React + Vite UI            Express API
     |                          |
     | HTTP requests             | Prisma ORM
     v                          v
localhost:5173  <------>  localhost:3000  <------>  PostgreSQL
                                |
                                +------> Elasticsearch product index
                                +------> PayPal sandbox checkout
                                +------> Cloudinary image uploads
                                +------> Redis benchmark/cache measurements
```

## Repository Structure

```text
.
├── backend/
│   ├── middleware/          # JWT authentication middleware
│   ├── prisma/              # Prisma schema and database migrations
│   ├── routers/             # REST API route modules
│   ├── scripts/             # Benchmark tooling and metric documentation
│   ├── package.json
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── components/      # Shared UI components
│   │   ├── contexts/        # Auth and cart state providers
│   │   ├── pages/           # Buyer and seller pages
│   │   └── public/          # Static images
│   ├── package.json
│   └── vite.config.ts
└── README.md
```

## Getting Started

### Prerequisites

- Node.js 18+
- npm
- PostgreSQL database
- Elasticsearch deployment or local instance
- Cloudinary account
- PayPal sandbox app credentials
- Redis instance, only required for Redis benchmark measurements

### 1. Clone the repository

```bash
git clone https://github.com/VanshikaGupta001/ecommerce-website.git
cd ecommerce-website
```

### 2. Configure the backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DATABASE"
JWT_SECRET_KEY="replace-with-a-secure-secret"

PAYPAL_CLIENT_ID="your-paypal-sandbox-client-id"
PAYPAL_CLIENT_SECRET="your-paypal-sandbox-client-secret"

ELASTIC_ENDPOINT="https://your-elasticsearch-endpoint"
ELASTIC_API_KEY="your-elasticsearch-api-key"

CLOUDINARY_CLOUD_NAME="your-cloudinary-cloud-name"
CLOUDINARY_API_KEY="your-cloudinary-api-key"
CLOUDINARY_API_SECRET="your-cloudinary-api-secret"

# Optional: required only for Redis benchmark scripts
REDIS_URL="redis://localhost:6379"
```

Generate the Prisma client and apply migrations:

```bash
npx prisma generate
npx prisma migrate dev
```

Start the backend:

```bash
npm start
```

The backend runs on:

```text
http://localhost:3000
```

### 3. Configure the frontend

Open a second terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend runs on:

```text
http://localhost:5173
```

## Environment Variables

| Variable | Required | Used For |
| --- | --- | --- |
| `DATABASE_URL` | Yes | PostgreSQL connection for Prisma |
| `JWT_SECRET_KEY` | Yes | Signing and verifying authentication tokens |
| `PAYPAL_CLIENT_ID` | Yes, for PayPal | Creating PayPal sandbox orders |
| `PAYPAL_CLIENT_SECRET` | Yes, for PayPal | Capturing PayPal sandbox payments |
| `ELASTIC_ENDPOINT` | Yes, for search | Connecting to Elasticsearch |
| `ELASTIC_API_KEY` | Yes, for search | Authenticating Elasticsearch requests |
| `CLOUDINARY_CLOUD_NAME` | Yes, for uploads | Cloudinary image storage |
| `CLOUDINARY_API_KEY` | Yes, for uploads | Cloudinary upload authentication |
| `CLOUDINARY_API_SECRET` | Yes, for uploads | Cloudinary upload authentication |
| `REDIS_URL` | Optional | Redis cart/cache benchmark script |

## Available Scripts

### Backend

```bash
cd backend
npm start
```

Starts the Express API server.

```bash
cd backend
npm run benchmark -- --help
```

Shows benchmark commands for measuring API latency, Redis cart caching, and Cloudinary image delivery.

### Frontend

```bash
cd frontend
npm run dev
```

Starts the Vite development server.

```bash
cd frontend
npm run build
```

Builds the frontend for production.

```bash
cd frontend
npm run lint
```

Runs ESLint.

```bash
cd frontend
npm run typecheck
```

Runs TypeScript type checking.

## API Overview

| Route Prefix | Purpose |
| --- | --- |
| `/auth` | Signup, login, profile update, address management, user deletion |
| `/products` | Featured products, paginated listings, product details, reviews, similar products |
| `/search` | Elasticsearch-backed product search |
| `/seller` | Seller product CRUD, dashboard stats, image uploads |
| `/cart` | Cart fetch, add item, update quantity, clear cart |
| `/orders` | Buyer/seller orders, checkout, PayPal capture, shipment and delivery updates |
| `/reviews` | Create, update, fetch, and delete product reviews |
| `/category` | Category CRUD and category-based product retrieval |

## Database Overview

The Prisma schema models the core marketplace domain:

- `User`, `Buyer`, `Seller`, `PhoneNumber`, `Address`
- `Product`, `Category`, `Review`
- `Cart`, `CartItem`
- `Order`, `OrderItem`, `Payment`, `Shipment`

Important database behavior:

- Product ratings are maintained with a PostgreSQL trigger that updates `Product.avgRating` after reviews are inserted.
- Category relationships support parent-child hierarchies for nested product navigation.
- Order creation uses transactions to create orders, order items, payments, inventory updates, and cart clearing as one unit.

## Benchmarking Resume Metrics

This repository includes benchmark tooling to calculate real performance numbers for resume bullets.

### Redis cart benchmark

```bash
cd backend
npm run benchmark -- redis-cart --buyerId="<buyer_uuid>" --runs=100
```

Use the output to write:

```text
Implemented Redis caching for cart data, reducing average cart retrieval latency from A ms to B ms (X% improvement).
```

### API or Elasticsearch benchmark

```bash
cd backend
npm run benchmark -- api \
  --label="Elasticsearch search" \
  --baseline="http://localhost:3000/products?search=phone" \
  --optimized="http://localhost:3000/search" \
  --method=POST \
  --body="{\"searchStr\":\"phone\"}"
```

Use the output to write:

```text
Optimized product discovery with Elasticsearch, reducing average search latency from A ms to B ms across N benchmark runs.
```

### Cloudinary image benchmark

```bash
cd backend
npm run benchmark -- cloudinary \
  --baselineUrlsFile="./scripts/local-image-urls.txt" \
  --cloudinaryUrlsFile="./scripts/cloudinary-image-urls.txt" \
  --runs=10
```

Use the output to write:

```text
Integrated Cloudinary for product images, improving average image delivery time from A ms to B ms (X% improvement).
```

### PayPal metric

For PayPal, prefer a reliability metric instead of a speed claim:

```text
(successful sandbox captures / attempted sandbox payments) * 100
```

Example:

```text
Integrated PayPal sandbox checkout, validating X/Y successful payment captures and handling success/failure redirects.
```

For more details, see [`backend/scripts/README.md`](backend/scripts/README.md).

## Security Notes

- Never commit `.env` files, API keys, database credentials, JWT secrets, or payment credentials.
- Use PayPal sandbox credentials for development.
- Restrict production CORS origins before deployment.
- Use strong JWT secrets and rotate credentials if they are exposed.
- Avoid logging sensitive user, payment, or token data in production.
