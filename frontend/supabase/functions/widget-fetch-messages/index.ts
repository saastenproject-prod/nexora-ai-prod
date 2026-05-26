import { createClient } from "npm:@supabase/supabase-js@2";

type WidgetFetchRequest = {
  widgetKey?: string;
  conversationId?: string;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  sender_type: string;
  sender_name: string | null;
  message_type: string;
  content: string;
  sent_at: string;
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

    const body = (await req.json()) as WidgetFetchRequest;

    const widgetKey = String(body.widgetKey || "").trim();
    const conversationId = String(body.conversationId || "").trim();

    if (!widgetKey) {
      return jsonResponse({ error: "widgetKey is required." }, 400);
    }

    if (!conversationId) {
      return jsonResponse({ error: "conversationId is required." }, 400);
    }

    const { data: widgetSetting, error: widgetError } = await supabase
      .from("widget_settings")
      .select("id, bot_id, widget_key, is_active")
      .eq("widget_key", widgetKey)
      .eq("is_active", true)
      .maybeSingle();

    if (widgetError) throw widgetError;

    if (!widgetSetting) {
      return jsonResponse({ error: "Active widget setting not found." }, 404);
    }

    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .select("id, bot_id, status, channel_type")
      .eq("id", conversationId)
      .eq("bot_id", widgetSetting.bot_id)
      .eq("channel_type", "website")
      .maybeSingle();

    if (conversationError) throw conversationError;

    if (!conversation) {
      return jsonResponse({ error: "Conversation not found." }, 404);
    }

    const { data: messages, error: messagesError } = await supabase
      .from("messages")
      .select(
        `
        id,
        conversation_id,
        sender_type,
        sender_name,
        message_type,
        content,
        sent_at
      `
      )
      .eq("conversation_id", conversation.id)
      .order("sent_at", { ascending: true })
      .returns<MessageRow[]>();

    if (messagesError) throw messagesError;

    return jsonResponse({
      success: true,
      conversationId: conversation.id,
      status: conversation.status,
      messages: messages || [],
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