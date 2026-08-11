/**
 * Cloudflare Worker: shared Juicy play counters
 *
 * Setup (once):
 * 1. Create a KV namespace named JUICY_COUNTS
 * 2. Create a Worker with this script, bind KV as JUICY_COUNTS
 * 3. Add a route: irgenius.org/api/juicy-count*
 *
 * No GitHub login required.
 */

const KEY = "counts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

async function readCounts(env) {
  const raw = await env.JUICY_COUNTS.get(KEY, { type: "json" });
  return raw && typeof raw === "object" ? raw : {};
}

async function writeCounts(env, counts) {
  await env.JUICY_COUNTS.put(KEY, JSON.stringify(counts));
}

export default {
  async fetch(request, env) {
    if (request.method === "OPTIONS") {
      return new Response(null, { headers: cors });
    }

    if (request.method === "GET") {
      const counts = await readCounts(env);
      return Response.json({ counts }, { headers: cors });
    }

    if (request.method === "POST") {
      let body;
      try {
        body = await request.json();
      } catch {
        return Response.json({ error: "Invalid JSON" }, { status: 400, headers: cors });
      }

      const id = String(body?.id || "").trim();
      if (!id || id.length > 64) {
        return Response.json({ error: "Missing id" }, { status: 400, headers: cors });
      }

      const counts = await readCounts(env);
      counts[id] = Number(counts[id] || 0) + 1;
      await writeCounts(env, counts);

      return Response.json({ id, count: counts[id], counts }, { headers: cors });
    }

    return Response.json({ error: "Method not allowed" }, { status: 405, headers: cors });
  },
};
