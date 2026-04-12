import { randomUUID } from "node:crypto";
import { getStore } from "@netlify/blobs";

const store = getStore("abti-analytics-v1");
const ALLOWED_RESULT_CODES = new Set([
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
]);

function json(data, init = {}) {
  const headers = new Headers(init.headers);
  headers.set("Cache-Control", "no-store");
  headers.set("Content-Type", "application/json; charset=utf-8");
  return new Response(JSON.stringify(data), {
    ...init,
    headers
  });
}

export default async (request) => {
  if (request.method !== "POST") {
    return json(
      { error: "Method Not Allowed" },
      { status: 405, headers: { Allow: "POST" } }
    );
  }

  let payload;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const now = Date.now();
  const id = randomUUID();
  const recordedAt = new Date(now).toISOString();

  if (payload?.kind === "visit") {
    await store.setJSON(`visits/${now}-${id}.json`, {
      kind: "visit",
      path: typeof payload.path === "string" ? payload.path : "/",
      recordedAt
    });

    return json({ ok: true });
  }

  if (payload?.kind === "result") {
    const personaCode = typeof payload.personaCode === "string" ? payload.personaCode : "";
    if (!ALLOWED_RESULT_CODES.has(personaCode)) {
      return json({ error: "Unknown personaCode" }, { status: 400 });
    }

    await store.setJSON(`results/${encodeURIComponent(personaCode)}/${now}-${id}.json`, {
      kind: "result",
      personaCode,
      personaName: typeof payload.personaName === "string" ? payload.personaName : "",
      special: Boolean(payload.special),
      similarity: Number.isFinite(payload.similarity) ? payload.similarity : null,
      recordedAt
    });

    return json({ ok: true });
  }

  return json({ error: "Unknown analytics kind" }, { status: 400 });
};
