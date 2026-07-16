import { createClient } from "npm:@supabase/supabase-js@2";

type WebhookPayload = {
  user_id?: string;
  query_term?: string;
  limit?: number;
};

const jsonHeaders = {
  "Content-Type": "application/json",
};

const corsHeaders = {
  ...jsonHeaders,
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-elevenlabs-secret, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders,
  });
}

function extractBearerToken(authHeader: string | null): string {
  if (!authHeader) return "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);
  return match?.[1]?.trim() ?? "";
}

function timingSafeEqual(a: string, b: string): boolean {
  const encoder = new TextEncoder();
  const left = encoder.encode(a);
  const right = encoder.encode(b);

  if (left.length !== right.length) return false;

  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left[index] ^ right[index];
  }

  return diff === 0;
}

Deno.serve(async (req: Request) => {
  // Optional preflight support. ElevenLabs should call POST directly, but this
  // keeps the endpoint testable from browser tooling.
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      { ok: false, error: "method_not_allowed", message: "Use POST." },
      405,
    );
  }

  const sharedSecret = Deno.env.get("ELEVENLABS_WEBHOOK_SECRET") ?? "";
  if (!sharedSecret) {
    console.error("Missing ELEVENLABS_WEBHOOK_SECRET.");
    return jsonResponse(
      {
        ok: false,
        error: "server_misconfigured",
        message: "The webhook is not configured yet.",
      },
      500,
    );
  }

  // ElevenLabs can send either a custom header or an Authorization bearer token.
  // Configure one of these in the ElevenLabs webhook tool:
  //   x-elevenlabs-secret: <ELEVENLABS_WEBHOOK_SECRET>
  //   Authorization: Bearer <ELEVENLABS_WEBHOOK_SECRET>
  const providedSecret =
    req.headers.get("x-elevenlabs-secret")?.trim() ||
    extractBearerToken(req.headers.get("authorization"));

  if (!providedSecret || !timingSafeEqual(providedSecret, sharedSecret)) {
    return jsonResponse(
      { ok: false, error: "unauthorized", message: "Invalid webhook secret." },
      401,
    );
  }

  let payload: WebhookPayload;
  try {
    payload = await req.json();
  } catch {
    return jsonResponse(
      {
        ok: false,
        error: "invalid_json",
        message: "Request body must be valid JSON.",
      },
      400,
    );
  }

  const userId = payload.user_id?.trim();
  const queryTerm = payload.query_term?.trim();
  const limit = Math.min(Math.max(Number(payload.limit ?? 5), 1), 20);

  if (!userId && !queryTerm) {
    return jsonResponse(
      {
        ok: false,
        error: "missing_search_parameter",
        message: "Provide at least one of user_id or query_term.",
      },
      400,
    );
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !serviceRoleKey) {
    console.error("Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.");
    return jsonResponse(
      {
        ok: false,
        error: "server_misconfigured",
        message: "Database access is not configured yet.",
      },
      500,
    );
  }

  // This admin client uses the service-role key. It bypasses RLS, so keep this
  // endpoint narrowly scoped to the read operation the agent needs and never
  // expose the service-role key to browsers, mobile apps, or ElevenLabs.
  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });

  try {
    let query = supabaseAdmin
      .from("records")
      .select("id,user_id,title,summary,metadata,created_at")
      .order("created_at", { ascending: false })
      .limit(limit);

    if (userId) {
      query = query.eq("user_id", userId);
    }

    if (queryTerm) {
      // Adjust these columns to match your actual schema. The current query
      // assumes `records.title` and `records.summary` are searchable text fields.
      const escapedTerm = queryTerm.replaceAll("%", "\\%").replaceAll("_", "\\_");
      query = query.or(`title.ilike.%${escapedTerm}%,summary.ilike.%${escapedTerm}%`);
    }

    const { data, error } = await query;

    if (error) {
      console.error("Database query failed:", error);

      // Return a structured response instead of throwing, so the AI agent can
      // continue the conversation and explain that lookup failed.
      return jsonResponse({
        ok: false,
        error: "database_query_failed",
        message: "I could not retrieve matching records right now.",
        records: [],
      });
    }

    return jsonResponse({
      ok: true,
      message: data?.length
        ? `Found ${data.length} matching record(s).`
        : "No matching records found.",
      search: {
        user_id: userId ?? null,
        query_term: queryTerm ?? null,
        limit,
      },
      records: data ?? [],
    });
  } catch (error) {
    console.error("Unhandled webhook error:", error);

    return jsonResponse({
      ok: false,
      error: "internal_error",
      message: "The lookup service had an unexpected error.",
      records: [],
    });
  }
});
