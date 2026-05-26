import { createClient } from "npm:@supabase/supabase-js@2";

type WidgetConfigRequest = {
  widgetKey?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const jsonResponse = (body: unknown, status = 200): Response => {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
      "Content-Type": "application/json",
    },
  });
};

const getErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "Internal server error.";
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed." }, 405);
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        { error: "Missing Supabase server configuration." },
        500
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const body = (await req.json()) as WidgetConfigRequest;
    const widgetKey = String(body.widgetKey || "").trim();

    if (!widgetKey) {
      return jsonResponse({ error: "widgetKey is required." }, 400);
    }

    const { data: widgetSetting, error: widgetError } = await supabase
      .from("widget_settings")
      .select(
        `
        id,
        bot_id,
        widget_key,
        title,
        subtitle,
        greeting_message,
        primary_color,
        is_active
      `
      )
      .eq("widget_key", widgetKey)
      .eq("is_active", true)
      .maybeSingle();

    if (widgetError) throw widgetError;

    if (!widgetSetting) {
      return jsonResponse({ error: "Active widget setting not found." }, 404);
    }

    const { data: bot, error: botError } = await supabase
      .from("bots")
      .select("id, name, status")
      .eq("id", widgetSetting.bot_id)
      .maybeSingle();

    if (botError) throw botError;

    if (!bot || bot.status !== "active") {
      return jsonResponse({ error: "Active bot not found." }, 404);
    }

    return jsonResponse({
      success: true,
      widget: {
        bot_id: widgetSetting.bot_id,
        widget_key: widgetSetting.widget_key,
        title: widgetSetting.title || bot.name || "Nexora Support",
        subtitle: widgetSetting.subtitle || "Online",
        greeting_message:
          widgetSetting.greeting_message ||
          "Hi! Welcome to support. How can we help you today?",
        primary_color: widgetSetting.primary_color || "#2563eb",
      },
    });
  } catch (err: unknown) {
    console.error(err);

    return jsonResponse(
      {
        error: getErrorMessage(err),
      },
      500
    );
  }
});