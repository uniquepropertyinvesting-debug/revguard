import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.104.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey, X-N8N-Signature",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function errorResponse(msg: string, status = 400) {
  return jsonResponse({ error: msg }, status);
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const url = new URL(req.url);
    const path = url.pathname.replace("/n8n-webhook", "").replace(/^\//, "");

    // POST /n8n-webhook/event — n8n sends workflow run results
    if (req.method === "POST" && (path === "event" || path === "")) {
      const body = await req.json();
      const {
        user_id,
        workflow_id,
        workflow_name,
        trigger_type,
        status,
        event_type,
        input_data,
        output_data,
        error_message,
        duration_ms,
        webhook_secret,
      } = body;

      if (!user_id || !workflow_id) {
        return errorResponse("user_id and workflow_id are required");
      }

      // Verify webhook secret if user has one configured
      const { data: conn } = await supabase
        .from("n8n_connections")
        .select("webhook_secret")
        .eq("user_id", user_id)
        .maybeSingle();

      if (conn?.webhook_secret) {
        const providedSecret =
          webhook_secret ||
          req.headers.get("x-n8n-signature") ||
          "";
        if (providedSecret !== conn.webhook_secret) {
          return errorResponse("Invalid webhook secret", 401);
        }
      }

      const { data: run, error } = await supabase
        .from("n8n_workflow_runs")
        .insert({
          user_id,
          workflow_id,
          workflow_name: workflow_name || "Unnamed Workflow",
          trigger_type: trigger_type || "webhook",
          status: status || "success",
          event_type: event_type || null,
          input_data: input_data || {},
          output_data: output_data || {},
          error_message: error_message || null,
          duration_ms: duration_ms || null,
          started_at: new Date().toISOString(),
          completed_at:
            status === "running" ? null : new Date().toISOString(),
        })
        .select("id")
        .maybeSingle();

      if (error) {
        return errorResponse(error.message, 500);
      }

      return jsonResponse({ success: true, run_id: run?.id });
    }

    // POST /n8n-webhook/heartbeat — n8n pings to confirm connection
    if (req.method === "POST" && path === "heartbeat") {
      const { user_id, webhook_secret: secret } = await req.json();
      if (!user_id) return errorResponse("user_id required");

      const { data: conn } = await supabase
        .from("n8n_connections")
        .select("webhook_secret")
        .eq("user_id", user_id)
        .maybeSingle();

      if (conn?.webhook_secret && secret !== conn.webhook_secret) {
        return errorResponse("Invalid secret", 401);
      }

      await supabase
        .from("n8n_connections")
        .update({ last_heartbeat_at: new Date().toISOString() })
        .eq("user_id", user_id);

      return jsonResponse({ status: "ok", timestamp: new Date().toISOString() });
    }

    // GET /n8n-webhook/status?user_id=... — check connection status
    if (req.method === "GET" && path === "status") {
      const userId = url.searchParams.get("user_id");
      if (!userId) return errorResponse("user_id required");

      const { data: conn } = await supabase
        .from("n8n_connections")
        .select("is_active, last_heartbeat_at, instance_url, created_at")
        .eq("user_id", userId)
        .maybeSingle();

      if (!conn) {
        return jsonResponse({ connected: false });
      }

      const heartbeatAge = conn.last_heartbeat_at
        ? Date.now() - new Date(conn.last_heartbeat_at).getTime()
        : null;
      const isHealthy = heartbeatAge !== null && heartbeatAge < 5 * 60 * 1000;

      return jsonResponse({
        connected: conn.is_active,
        healthy: isHealthy,
        instance_url: conn.instance_url,
        last_heartbeat: conn.last_heartbeat_at,
        created_at: conn.created_at,
      });
    }

    return errorResponse("Not found", 404);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Internal error";
    return errorResponse(msg, 500);
  }
});
