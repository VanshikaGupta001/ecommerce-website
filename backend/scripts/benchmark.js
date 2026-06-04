import fs from "node:fs";
import process from "node:process";
import { performance } from "node:perf_hooks";

const DEFAULT_RUNS = 30;
const DEFAULT_WARMUP = 5;

const usage = `Usage:
  npm run benchmark -- api --baseline=<url> --optimized=<url> [--method=POST] [--body='{"searchStr":"phone"}']
  npm run benchmark -- redis-cart --buyerId=<uuid> [--runs=100]
  npm run benchmark -- cloudinary --cloudinaryUrls=<url1,url2> [--baselineUrls=<url1,url2>]

Examples:
  npm run benchmark -- api --label="Elasticsearch search" --baseline="http://localhost:3000/products?search=phone" --optimized="http://localhost:3000/search" --method=POST --body="{\\"searchStr\\":\\"phone\\"}"
  npm run benchmark -- redis-cart --buyerId="00000000-0000-0000-0000-000000000000" --runs=100
  npm run benchmark -- cloudinary --baselineUrlsFile="./scripts/local-image-urls.txt" --cloudinaryUrlsFile="./scripts/cloudinary-image-urls.txt"
`;

function parseArgs(argv) {
  const [command, ...rest] = argv;
  const args = {};

  for (const item of rest) {
    if (!item.startsWith("--")) continue;

    const withoutPrefix = item.slice(2);
    const separator = withoutPrefix.indexOf("=");

    if (separator === -1) {
      args[withoutPrefix] = true;
      continue;
    }

    const key = withoutPrefix.slice(0, separator);
    const value = withoutPrefix.slice(separator + 1);
    args[key] = value;
  }

  return { command, args };
}

function required(value, name) {
  if (!value) {
    throw new Error(`Missing required argument: --${name}`);
  }
  return value;
}

function numberArg(value, fallback) {
  if (!value) return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`Expected a positive number, received: ${value}`);
  }
  return parsed;
}

function percentile(values, p) {
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, Math.min(index, sorted.length - 1))];
}

function summarize(values) {
  const total = values.reduce((sum, value) => sum + value, 0);
  return {
    min: Math.min(...values),
    max: Math.max(...values),
    mean: total / values.length,
    median: percentile(values, 50),
    p95: percentile(values, 95),
  };
}

function improvementPercent(baselineMean, optimizedMean) {
  return ((baselineMean - optimizedMean) / baselineMean) * 100;
}

function formatMs(value) {
  return `${value.toFixed(2)} ms`;
}

function printStats(label, stats) {
  console.log(`\n${label}`);
  console.log(`  mean:   ${formatMs(stats.mean)}`);
  console.log(`  median: ${formatMs(stats.median)}`);
  console.log(`  p95:    ${formatMs(stats.p95)}`);
  console.log(`  min:    ${formatMs(stats.min)}`);
  console.log(`  max:    ${formatMs(stats.max)}`);
}

function printComparison(label, baselineStats, optimizedStats) {
  const improvement = improvementPercent(baselineStats.mean, optimizedStats.mean);

  console.log(`\n${label} improvement: ${improvement.toFixed(2)}%`);
  console.log(
    `Resume line: reduced average latency from ${formatMs(
      baselineStats.mean
    )} to ${formatMs(optimizedStats.mean)} (${improvement.toFixed(2)}% improvement).`
  );
}

async function timeAsync(callback) {
  const start = performance.now();
  await callback();
  return performance.now() - start;
}

async function runRepeated(label, runs, warmup, callback) {
  for (let i = 0; i < warmup; i += 1) {
    await callback();
  }

  const timings = [];
  for (let i = 0; i < runs; i += 1) {
    timings.push(await timeAsync(callback));
  }

  const stats = summarize(timings);
  printStats(label, stats);
  return stats;
}

function parseJsonBody(rawBody) {
  if (!rawBody) return undefined;

  try {
    return JSON.parse(rawBody);
  } catch (error) {
    throw new Error(`Invalid JSON passed to --body: ${error.message}`);
  }
}

async function request(url, method, body) {
  const response = await fetch(url, {
    method,
    headers: body ? { "Content-Type": "application/json" } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  });

  await response.arrayBuffer();

  if (!response.ok) {
    throw new Error(`${method} ${url} returned ${response.status}`);
  }
}

async function benchmarkApi(args) {
  const baselineUrl = required(args.baseline, "baseline");
  const optimizedUrl = required(args.optimized, "optimized");
  const method = (args.method || "GET").toUpperCase();
  const body = parseJsonBody(args.body);
  const runs = numberArg(args.runs, DEFAULT_RUNS);
  const warmup = numberArg(args.warmup, DEFAULT_WARMUP);
  const label = args.label || "API";

  const baselineStats = await runRepeated(
    `${label} baseline`,
    runs,
    warmup,
    () => request(baselineUrl, method, body)
  );
  const optimizedStats = await runRepeated(
    `${label} optimized`,
    runs,
    warmup,
    () => request(optimizedUrl, method, body)
  );

  printComparison(label, baselineStats, optimizedStats);
}

function readUrls(rawUrls, urlsFile, label) {
  if (rawUrls) {
    return rawUrls
      .split(",")
      .map((url) => url.trim())
      .filter(Boolean);
  }

  if (urlsFile) {
    return fs
      .readFileSync(urlsFile, "utf8")
      .split(/\r?\n/)
      .map((url) => url.trim())
      .filter((url) => url && !url.startsWith("#"));
  }

  throw new Error(`Provide --${label} or --${label}File`);
}

async function fetchImage(url) {
  const response = await fetch(url, { method: "GET" });
  await response.arrayBuffer();

  if (!response.ok) {
    throw new Error(`GET ${url} returned ${response.status}`);
  }
}

async function benchmarkUrlSet(label, urls, runs, warmup) {
  return runRepeated(label, runs, warmup, async () => {
    for (const url of urls) {
      await fetchImage(url);
    }
  });
}

async function benchmarkCloudinary(args) {
  const cloudinaryUrls = readUrls(
    args.cloudinaryUrls,
    args.cloudinaryUrlsFile,
    "cloudinaryUrls"
  );
  const runs = numberArg(args.runs, 10);
  const warmup = numberArg(args.warmup, 2);

  const cloudinaryStats = await benchmarkUrlSet(
    "Cloudinary image delivery",
    cloudinaryUrls,
    runs,
    warmup
  );

  if (args.baselineUrls || args.baselineUrlsFile) {
    const baselineUrls = readUrls(
      args.baselineUrls,
      args.baselineUrlsFile,
      "baselineUrls"
    );
    const baselineStats = await benchmarkUrlSet(
      "Baseline image delivery",
      baselineUrls,
      runs,
      warmup
    );
    printComparison("Cloudinary delivery", baselineStats, cloudinaryStats);
  } else {
    console.log(
      `\nResume line: delivered product images with an average response time of ${formatMs(
        cloudinaryStats.mean
      )} across ${cloudinaryUrls.length} Cloudinary URL(s).`
    );
  }
}

async function benchmarkRedisCart(args) {
  const buyerId = required(args.buyerId, "buyerId");
  const runs = numberArg(args.runs, 100);
  const warmup = numberArg(args.warmup, 10);
  const redisUrl = process.env.REDIS_URL;

  if (!redisUrl) {
    throw new Error("Set REDIS_URL before running the Redis benchmark.");
  }

  const [{ PrismaClient }, { createClient }] = await Promise.all([
    import("@prisma/client"),
    import("redis"),
  ]);

  const prisma = new PrismaClient();
  const redis = createClient({ url: redisUrl });
  const redisKey = `cart:${buyerId}`;

  redis.on("error", (error) => {
    console.error("Redis error:", error.message);
  });

  await redis.connect();

  const readCartFromDb = async () => {
    const cart = await prisma.cart.findUnique({
      where: { buyerId },
      include: { items: { include: { product: true } } },
    });
    return cart?.items || [];
  };

  const cartItems = await readCartFromDb();
  if (cartItems.length === 0) {
    throw new Error(`No cart items found for buyerId=${buyerId}`);
  }

  await redis.del(redisKey);
  const payload = Object.fromEntries(
    cartItems.map((item) => [item.productId, JSON.stringify(item)])
  );
  await redis.hSet(redisKey, payload);
  await redis.expire(redisKey, 60 * 60);

  const readCartFromRedis = async () => {
    const cachedCart = await redis.hGetAll(redisKey);
    return Object.values(cachedCart).map((item) => JSON.parse(item));
  };

  try {
    const dbStats = await runRepeated(
      "Cart read from PostgreSQL/Prisma",
      runs,
      warmup,
      readCartFromDb
    );
    const redisStats = await runRepeated(
      "Cart read from Redis cache",
      runs,
      warmup,
      readCartFromRedis
    );

    printComparison("Redis cart cache", dbStats, redisStats);
  } finally {
    await redis.del(redisKey);
    await redis.disconnect();
    await prisma.$disconnect();
  }
}

async function main() {
  const { command, args } = parseArgs(process.argv.slice(2));

  if (!command || command === "--help" || command === "-h" || args.help) {
    console.log(usage);
    return;
  }

  if (command === "api") {
    await benchmarkApi(args);
  } else if (command === "redis-cart") {
    await benchmarkRedisCart(args);
  } else if (command === "cloudinary") {
    await benchmarkCloudinary(args);
  } else {
    throw new Error(`Unknown benchmark command: ${command}\n\n${usage}`);
  }
}

main().catch((error) => {
  console.error(`Benchmark failed: ${error.message}`);
  process.exit(1);
});
