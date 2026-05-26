import { createClient } from "npm:@supabase/supabase-js@2";

type WidgetSetting = {
  id: string;
  bot_id: string;
  widget_key: string;
  title: string | null;
  subtitle: string | null;
  greeting_message: string | null;
  primary_color: string | null;
  is_active: boolean;
};

type Bot = {
  id: string;
  workspace_id: string;
  name: string;
  status: string;
  bot_type: string | null;
};

type Channel = {
  id: string;
  bot_id: string;
  channel_type: string;
  status: string;
};

type Flow = {
  id: string;
  bot_id: string;
  name: string;
  is_default: boolean;
  status: string;
};

type FlowNodeConfig = {
  message?: string;
  text?: string;
  content?: string;
  [key: string]: unknown;
};

type FlowNode = {
  id: string;
  flow_id: string;
  node_key: string | null;
  node_type: string | null;
  label: string | null;
  description: string | null;
  config: FlowNodeConfig | null;
};

type FlowEdge = {
  id: string;
  flow_id: string;
  source_node_id: string;
  target_node_id: string;
  label: string | null;
  condition: Record<string, unknown> | null;
};

type Conversation = {
  id: string;
  workspace_id: string;
  bot_id: string;
  channel_id: string | null;
  flow_id: string | null;
  customer_name: string | null;
  customer_email: string | null;
  channel_type: string;
  status: string;
};

type WidgetMessageRequest = {
  widgetKey?: string;
  message?: string;
  conversationId?: string;
  customerName?: string;
  customerEmail?: string;
};

type AiReplyResult = {
  success?: boolean;
  provider?: string;
  model?: string;
  conversationId?: string;
  answer?: string;
  error?: string;
  usedKnowledge?: {
    articles?: number;
    chunks?: number;
  };
  [key: string]: unknown;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const createId = () => crypto.randomUUID();

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

  if (err && typeof err === "object") {
    const anyError = err as {
      message?: string;
      details?: string;
      hint?: string;
      code?: string;
      error_description?: string;
      error?: string;
    };

    return (
      anyError.message ||
      anyError.details ||
      anyError.hint ||
      anyError.error_description ||
      anyError.error ||
      JSON.stringify(err)
    );
  }

  return "Internal server error.";
};

const getMessageTextFromNode = (
  node: FlowNode | null | undefined,
  fallbackGreeting: string
): string => {
  return (
    node?.config?.message ||
    node?.config?.text ||
    node?.config?.content ||
    node?.description ||
    fallbackGreeting
  );
};

const triggerAiReply = async ({
  supabaseUrl,
  serviceRoleKey,
  conversationId,
  message,
}: {
  supabaseUrl: string;
  serviceRoleKey: string;
  conversationId: string;
  message: string;
}) => {
  let aiReplyTriggered = false;
  let aiReplyResult: AiReplyResult | null = null;

  try {
    const aiReplyResponse = await fetch(
      `${supabaseUrl}/functions/v1/widget-ai-reply`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${serviceRoleKey}`,
        },
        body: JSON.stringify({
          conversationId,
          message,
        }),
      }
    );

    aiReplyResult = (await aiReplyResponse.json()) as AiReplyResult;

    aiReplyTriggered =
      aiReplyResponse.ok && aiReplyResult?.success === true;

    if (!aiReplyTriggered) {
      console.warn("[widget-message] AI reply failed:", aiReplyResult);
    }
  } catch (aiReplyError) {
    console.warn(
      "[widget-message] AI reply request failed:",
      getErrorMessage(aiReplyError)
    );

    aiReplyResult = {
      success: false,
      error: getErrorMessage(aiReplyError),
    };
  }

  return {
    aiReplyTriggered,
    aiReplyResult,
  };
};

Deno.serve(async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    });
  }

  if (req.method !== "POST") {
    return jsonResponse(
      {
        error: "Method not allowed.",
      },
      405
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse(
        {
          error: "Missing Supabase server configuration.",
        },
        500
      );
    }

    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const body = (await req.json()) as WidgetMessageRequest;

    const widgetKey = String(body.widgetKey || "").trim();
    const message = String(body.message || "").trim();
    const existingConversationId = String(
      body.conversationId || ""
    ).trim();

    const customerName = String(
      body.customerName || "Website Visitor"
    ).trim();

    const customerEmail = String(
      body.customerEmail || "visitor@example.com"
    ).trim();

    if (!widgetKey) {
      return jsonResponse(
        {
          error: "widgetKey is required.",
        },
        400
      );
    }

    if (!message) {
      return jsonResponse(
        {
          error: "message is required.",
        },
        400
      );
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
      .maybeSingle<WidgetSetting>();

    if (widgetError) throw widgetError;

    if (!widgetSetting) {
      return jsonResponse(
        {
          error: "Active widget setting not found.",
        },
        404
      );
    }

    const { data: bot, error: botError } = await supabase
      .from("bots")
      .select("id, workspace_id, name, status, bot_type")
      .eq("id", widgetSetting.bot_id)
      .maybeSingle<Bot>();

    if (botError) throw botError;

    if (!bot || bot.status !== "active") {
      return jsonResponse(
        {
          error: "Active bot not found.",
        },
        404
      );
    }

    const { data: channels, error: channelError } = await supabase
      .from("channels")
      .select("id, bot_id, channel_type, status")
      .eq("bot_id", bot.id)
      .eq("channel_type", "website")
      .order("created_at", {
        ascending: true,
      })
      .returns<Channel[]>();

    if (channelError) throw channelError;

    const selectedChannel =
      channels?.find((channel) => channel.status === "active") ||
      channels?.[0] ||
      null;

    const { data: flows, error: flowError } = await supabase
      .from("flows")
      .select("id, bot_id, name, is_default, status")
      .eq("bot_id", bot.id)
      .order("is_default", {
        ascending: false,
      })
      .order("created_at", {
        ascending: false,
      })
      .returns<Flow[]>();

    if (flowError) throw flowError;

    const selectedFlow =
      flows?.find((flow) => flow.is_default) || flows?.[0] || null;

    const fallbackGreeting =
      widgetSetting.greeting_message ||
      "Hi! Welcome to support. How can we help you today?";

    let flowGreetingMessage = fallbackGreeting;

    if (selectedFlow?.id) {
      const { data: nodes, error: nodeError } = await supabase
        .from("flow_nodes")
        .select(
          `
          id,
          flow_id,
          node_key,
          node_type,
          label,
          description,
          config
        `
        )
        .eq("flow_id", selectedFlow.id)
        .returns<FlowNode[]>();

      if (nodeError) throw nodeError;

      const { data: edges, error: edgeError } = await supabase
        .from("flow_edges")
        .select(
          `
          id,
          flow_id,
          source_node_id,
          target_node_id,
          label,
          condition
        `
        )
        .eq("flow_id", selectedFlow.id)
        .returns<FlowEdge[]>();

      if (edgeError) throw edgeError;

      const nodeRows = nodes || [];
      const edgeRows = edges || [];

      const startNode =
        nodeRows.find((node) => node.node_type === "start") ||
        nodeRows.find((node) => node.node_key === "start");

      const firstEdge = edgeRows.find(
        (edge) => edge.source_node_id === startNode?.id
      );

      const nextNode = nodeRows.find(
        (node) => node.id === firstEdge?.target_node_id
      );

      flowGreetingMessage = getMessageTextFromNode(
        nextNode,
        fallbackGreeting
      );
    }

    const now = new Date();

    let conversation: Conversation | null = null;
    let isNewConversation = false;

    if (existingConversationId) {
      const { data: existingConversation, error: existingError } =
        await supabase
          .from("conversations")
          .select(
            `
            id,
            workspace_id,
            bot_id,
            channel_id,
            flow_id,
            customer_name,
            customer_email,
            channel_type,
            status
          `
          )
          .eq("id", existingConversationId)
          .eq("bot_id", bot.id)
          .maybeSingle<Conversation>();

      if (existingError) throw existingError;

      if (
        existingConversation &&
        !["resolved", "closed"].includes(existingConversation.status)
      ) {
        conversation = existingConversation;
      }
    }

    if (!conversation) {
      isNewConversation = true;

      const conversationId = createId();

      const { data: insertedConversation, error: conversationError } =
        await supabase
          .from("conversations")
          .insert({
            id: conversationId,
            workspace_id: bot.workspace_id,
            bot_id: bot.id,
            channel_id: selectedChannel?.id || null,
            flow_id: selectedFlow?.id || null,
            customer_name: customerName || "Website Visitor",
            customer_email: customerEmail || "visitor@example.com",
            customer_phone: null,
            customer_external_id: `widget_customer_${Date.now()}`,
            external_conversation_id: `widget_conv_${Date.now()}`,
            channel_type: "website",
            status: "open",
            priority: "normal",
            assigned_to: null,
            last_message: message,
            last_message_at: now.toISOString(),
            started_at: now.toISOString(),
            metadata: {
              source: "runtime_widget_edge_function",
              intent: "website_widget_message",
              customer_intent: message,
              widget_key: widgetKey,
              flow_id: selectedFlow?.id || null,
            },
          })
          .select()
          .single<Conversation>();

      if (conversationError) throw conversationError;

      conversation = insertedConversation;

      const { error: insertMessagesError } = await supabase
        .from("messages")
        .insert([
          {
            id: createId(),
            workspace_id: bot.workspace_id,
            bot_id: bot.id,
            conversation_id: conversation.id,
            sender_type: "bot",
            sender_profile_id: null,
            sender_name: bot.name,
            message_type: "text",
            content: flowGreetingMessage,
            metadata: {
              source: "runtime_widget_edge_function",
              flow_id: selectedFlow?.id || null,
              greeting_source: selectedFlow?.id
                ? "flow_builder"
                : "widget_setting",
            },
            sent_at: new Date(now.getTime() - 1000).toISOString(),
          },
          {
            id: createId(),
            workspace_id: bot.workspace_id,
            bot_id: bot.id,
            conversation_id: conversation.id,
            sender_type: "customer",
            sender_profile_id: null,
            sender_name: customerName || "Website Visitor",
            message_type: "text",
            content: message,
            metadata: {
              source: "runtime_widget_edge_function",
              widget_key: widgetKey,
            },
            sent_at: now.toISOString(),
          },
        ]);

      if (insertMessagesError) throw insertMessagesError;
    } else {
      const { error: insertMessageError } = await supabase
        .from("messages")
        .insert({
          id: createId(),
          workspace_id: conversation.workspace_id,
          bot_id: conversation.bot_id,
          conversation_id: conversation.id,
          sender_type: "customer",
          sender_profile_id: null,
          sender_name: conversation.customer_name || customerName,
          message_type: "text",
          content: message,
          metadata: {
            source: "runtime_widget_edge_function_follow_up",
            widget_key: widgetKey,
          },
          sent_at: now.toISOString(),
        });

      if (insertMessageError) throw insertMessageError;

      const { error: updateConversationError } = await supabase
        .from("conversations")
        .update({
          last_message: message,
          last_message_at: now.toISOString(),
          updated_at: now.toISOString(),
          metadata: {
            source: "runtime_widget_edge_function",
            intent: "website_widget_message",
            customer_intent: message,
            widget_key: widgetKey,
            last_widget_message_at: now.toISOString(),
          },
        })
        .eq("id", conversation.id)
        .eq("bot_id", bot.id);

      if (updateConversationError) throw updateConversationError;
    }

    const { aiReplyTriggered, aiReplyResult } = await triggerAiReply({
      supabaseUrl,
      serviceRoleKey,
      conversationId: conversation.id,
      message,
    });

    return jsonResponse({
      success: true,
      isNewConversation,
      conversationId: conversation.id,
      botReply: isNewConversation ? flowGreetingMessage : null,
      customerMessage: message,
      aiReplyTriggered,
      aiReplyResult,
    });
  } catch (err: unknown) {
    console.error("[widget-message error raw]", err);
    console.error("[widget-message error message]", getErrorMessage(err));

    return jsonResponse(
      {
        success: false,
        error: getErrorMessage(err),
      },
      500
    );
  }
});