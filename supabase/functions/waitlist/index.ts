const SITE_ORIGINS = new Set([
  "https://creativeintheloop.com",
  "https://www.creativeintheloop.com",
]);

const EMAIL_PATTERN =
  /^[a-z0-9.!#$%&*+/=?^_`{|}~-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/;

const MINUTE_LIMIT = 60;
const DAY_LIMIT = 2000;

function isAllowedOrigin(origin: string): boolean {
  if (SITE_ORIGINS.has(origin)) return true;
  return /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin);
}

function corsHeaders(origin: string | null): Headers {
  const headers = new Headers();
  headers.set("Vary", "Origin");
  if (origin && isAllowedOrigin(origin)) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "POST, OPTIONS");
    headers.set("Access-Control-Allow-Headers", "authorization, apikey, content-type");
    headers.set("Access-Control-Max-Age", "86400");
  }
  return headers;
}

function empty(status: number, origin: string | null): Response {
  return new Response(null, { status, headers: corsHeaders(origin) });
}

async function recentSignups(url: string, key: string, since: string): Promise<number | null> {
  const endpoint = new URL("/rest/v1/waitlist", url);
  endpoint.searchParams.set("select", "id");
  endpoint.searchParams.set("created_at", `gte.${since}`);
  const response = await fetch(endpoint, {
    headers: {
      apikey: key,
      Authorization: `Bearer ${key}`,
      Prefer: "count=exact",
      Range: "0-0",
    },
  });
  if (!response.ok) return null;
  const total = (response.headers.get("content-range") ?? "").split("/")[1];
  if (!total || total === "*") return null;
  const count = Number(total);
  return Number.isFinite(count) ? count : null;
}

Deno.serve(async (request) => {
  const origin = request.headers.get("Origin");

  if (origin && !isAllowedOrigin(origin)) return empty(403, origin);
  if (request.method === "OPTIONS") return empty(204, origin);
  if (request.method !== "POST") return empty(405, origin);

  const declaredLength = Number(request.headers.get("content-length") ?? "0");
  if (declaredLength > 2048) return empty(400, origin);

  let payload: { email?: unknown; source?: unknown };
  try {
    payload = await request.json();
  } catch {
    return empty(400, origin);
  }

  const email = String(payload.email ?? "").trim().toLowerCase();
  const source = String(payload.source ?? "").trim().toLowerCase();
  if (
    email.length < 6 ||
    email.length > 320 ||
    !EMAIL_PATTERN.test(email) ||
    (source !== "hero" && source !== "closer")
  ) {
    return empty(400, origin);
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceKey) return empty(500, origin);

  const minuteAgo = new Date(Date.now() - 60_000).toISOString();
  const dayAgo = new Date(Date.now() - 86_400_000).toISOString();
  const [minuteCount, dayCount] = await Promise.all([
    recentSignups(supabaseUrl, serviceKey, minuteAgo),
    recentSignups(supabaseUrl, serviceKey, dayAgo),
  ]);
  if (minuteCount === null || dayCount === null) return empty(500, origin);
  if (minuteCount >= MINUTE_LIMIT || dayCount >= DAY_LIMIT) return empty(429, origin);

  const endpoint = new URL("/rest/v1/waitlist", supabaseUrl);
  endpoint.searchParams.set("on_conflict", "email");
  const inserted = await fetch(endpoint, {
    method: "POST",
    headers: {
      apikey: serviceKey,
      Authorization: `Bearer ${serviceKey}`,
      "Content-Type": "application/json",
      Prefer: "resolution=ignore-duplicates,return=minimal",
    },
    body: JSON.stringify({ email, source }),
  });

  if (inserted.status === 409 || inserted.ok) return empty(200, origin);
  return empty(500, origin);
});
