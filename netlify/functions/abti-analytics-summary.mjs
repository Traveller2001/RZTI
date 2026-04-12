import { getStore } from "@netlify/blobs";

const store = getStore("abti-analytics-v1");
const PERSONA_CODES = [
  "PAPER",
  "NERD",
  "PI-er",
  "CAFE",
  "REF-s",
  "TANK",
  "SOS!",
  "HACK",
  "MONK",
  "RUSH",
  "BOSS",
  "CHILL",
  "STAR",
  "COPY",
  "IDEA",
  "SOLO",
  "TALK",
  "GRIND",
  "SLIDE",
  "REVIEW",
  "GRANT",
  "PIVOT",
  "BURN",
  "CLEAN",
  "QUIT",
  "404"
];

function json(data, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store");
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), {
    ...init,
    headers
  });
}

function extractTimestamp(key) {
  const match = key.match(/\/(\d{13})-/);
  return match ? Number(match[1]) : 0;
}

function extractPersonaCode(key) {
  const match = key.match(/^results\/([^/]+)\//);
  return match ? decodeURIComponent(match[1]) : null;
}

export default async (request) => {
  if (request.method !== "GET") {
    return json(
      { error: "Method Not Allowed" },
      { status: 405, headers: { Allow: "GET" } }
    );
  }

  const counts = Object.fromEntries(PERSONA_CODES.map((code) => [code, 0]));
  let totalVisits = 0;
  let totalResults = 0;
  let lastUpdatedAt = 0;

  const { blobs } = await store.list();
  for (const blob of blobs) {
    const { key } = blob;
    const timestamp = extractTimestamp(key);
    if (timestamp > lastUpdatedAt) lastUpdatedAt = timestamp;

    if (key.startsWith("visits/")) {
      totalVisits += 1;
      continue;
    }

    if (key.startsWith("results/")) {
      totalResults += 1;
      const code = extractPersonaCode(key);
      if (code && code in counts) {
        counts[code] += 1;
      }
    }
  }

  const ranking = PERSONA_CODES.map((code) => {
    const count = counts[code];
    return {
      code,
      count,
      share: totalResults ? Number(((count / totalResults) * 100).toFixed(1)) : 0
    };
  }).sort((a, b) => {
    if (b.count !== a.count) return b.count - a.count;
    return a.code.localeCompare(b.code, "en");
  });

  return json({
    totalVisits,
    totalResults,
    uniquePersonasHit: ranking.filter((item) => item.count > 0).length,
    lastUpdatedAt: lastUpdatedAt ? new Date(lastUpdatedAt).toISOString() : null,
    ranking
  });
};
