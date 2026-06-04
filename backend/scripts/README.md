# Benchmark scripts

Use these scripts to calculate real resume metrics instead of guessing placeholder percentages.

## Setup

Install backend dependencies and start the backend before running HTTP benchmarks:

```bash
cd backend
npm install
npm start
```

For direct Redis benchmarks, set the same environment variables used by the backend:

```bash
DATABASE_URL="postgresql://..."
REDIS_URL="redis://..."
```

Do not commit `.env` files or secret values.

## Redis cart caching

Measures cart reads from PostgreSQL/Prisma vs Redis for the same buyer cart.

```bash
npm run benchmark -- redis-cart --buyerId="<buyer_uuid>" --runs=100
```

Use the printed line directly in your resume, for example:

> Implemented **Redis caching** for cart data, reducing average cart retrieval latency from **A ms to B ms** (**X% improvement**).

Formula used:

```text
((database mean latency - redis mean latency) / database mean latency) * 100
```

## Elasticsearch/API latency

Measures a baseline API route vs an optimized API route.

```bash
npm run benchmark -- api \
  --label="Elasticsearch search" \
  --baseline="http://localhost:3000/products?search=phone" \
  --optimized="http://localhost:3000/search" \
  --method=POST \
  --body="{\"searchStr\":\"phone\"}"
```

If the two endpoints need different request formats, run the same `api` benchmark twice and compare the printed mean latencies manually.

Resume phrasing:

> Optimized product discovery with **Elasticsearch**, reducing average search latency from **A ms to B ms** across **N** benchmark runs.

## Cloudinary image delivery

Measures Cloudinary image delivery times. If you have old/local image URLs, pass them as the baseline to calculate an improvement percentage.

```bash
npm run benchmark -- cloudinary \
  --baselineUrlsFile="./scripts/local-image-urls.txt" \
  --cloudinaryUrlsFile="./scripts/cloudinary-image-urls.txt" \
  --runs=10
```

URL files should contain one URL per line:

```text
https://example.com/image-1.jpg
https://example.com/image-2.jpg
```

Resume phrasing:

> Integrated **Cloudinary** for product images, improving average image delivery time from **A ms to B ms** (**X% improvement**).

## PayPal integration metric

For PayPal, avoid claiming a latency percentage unless you benchmarked the full payment flow. A safer metric is reliability:

```text
(successful sandbox captures / attempted sandbox payments) * 100
```

Resume phrasing:

> Integrated **PayPal sandbox checkout**, validating **X/Y successful payment captures** and handling success/failure redirects.
