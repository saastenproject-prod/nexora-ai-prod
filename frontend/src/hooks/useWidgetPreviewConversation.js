import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

const SELECTED_BOT_KEY = "nexora_selected_bot_id";
const PREVIEW_CONVERSATION_KEY_PREFIX = "nexora_widget_preview_conversation_id";

export default function useWidgetPreviewConversation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const getPreviewConversationKey = (botId) => {
    return `${PREVIEW_CONVERSATION_KEY_PREFIX}_${botId}`;
  };

  const getCurrentWorkspace = async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;

    if (!user) {
      throw new Error("User belum login.");
    }

    const { data: memberships, error: membershipError } = await supabase
      .from("workspace_members")
      .select(
        `
        id,
        role,
        status,
        workspace:workspaces (
          id,
          name,
          slug,
          plan,
          status
        )
      `
      )
      .eq("profile_id", user.id)
      .eq("status", "active")
      .limit(1);

    if (membershipError) throw membershipError;

    const workspace = memberships?.[0]?.workspace;

    if (!workspace?.id) {
      throw new Error("Workspace aktif tidak ditemukan.");
    }

    return {
      user,
      workspace,
    };
  };

  const getSelectedBot = async (workspaceId) => {
    const selectedBotId = localStorage.getItem(SELECTED_BOT_KEY);

    const { data: bots, error: botsError } = await supabase
      .from("bots")
      .select("id, workspace_id, name, status, bot_type")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (botsError) throw botsError;

    const botRows = bots || [];

    if (botRows.length === 0) {
      throw new Error("Bot belum tersedia.");
    }

    const selectedBot =
      botRows.find((bot) => bot.id === selectedBotId) ||
      botRows.find((bot) => bot.status === "active") ||
      botRows[0];

    localStorage.setItem(SELECTED_BOT_KEY, selectedBot.id);

    return selectedBot;
  };

  const getWebsiteChannel = async (botId) => {
    const { data: channels, error: channelError } = await supabase
      .from("channels")
      .select("id, channel_type, status")
      .eq("bot_id", botId)
      .eq("channel_type", "website")
      .order("created_at", { ascending: true });

    if (channelError) throw channelError;

    return (
      channels?.find((channel) => channel.status === "active") ||
      channels?.[0] ||
      null
    );
  };

  const getDefaultFlow = async (botId) => {
    const { data: flows, error: flowError } = await supabase
      .from("flows")
      .select("id, name, is_default, status")
      .eq("bot_id", botId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (flowError) throw flowError;

    return flows?.find((flow) => flow.is_default) || flows?.[0] || null;
  };

  const getFlowGreetingMessage = async (flowId, fallbackGreeting) => {
    if (!flowId) return fallbackGreeting;

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
        config,
        position_x,
        position_y
      `
      )
      .eq("flow_id", flowId);

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
      .eq("flow_id", flowId);

    if (edgeError) throw edgeError;

    const nodeRows = nodes || [];
    const edgeRows = edges || [];

    const startNode =
      nodeRows.find((node) => node.node_type === "start") ||
      nodeRows.find((node) => node.node_key === "start");

    if (!startNode) return fallbackGreeting;

    const firstEdge = edgeRows.find(
      (edge) => edge.source_node_id === startNode.id
    );

    if (!firstEdge?.target_node_id) return fallbackGreeting;

    const nextNode = nodeRows.find(
      (node) => node.id === firstEdge.target_node_id
    );

    if (!nextNode) return fallbackGreeting;

    const messageFromConfig =
      nextNode.config?.message ||
      nextNode.config?.text ||
      nextNode.config?.content ||
      nextNode.description;

    return messageFromConfig || fallbackGreeting;
  };

  const getExistingPreviewConversation = async (botId) => {
    const previewKey = getPreviewConversationKey(botId);
    const storedConversationId = localStorage.getItem(previewKey);

    if (!storedConversationId) return null;

    const { data, error: conversationError } = await supabase
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
      .eq("id", storedConversationId)
      .eq("bot_id", botId)
      .maybeSingle();

    if (conversationError) throw conversationError;

    if (!data || ["resolved", "closed"].includes(data.status)) {
      localStorage.removeItem(previewKey);
      return null;
    }

    return data;
  };

  const createNewPreviewConversation = async ({
    workspace,
    user,
    bot,
    selectedChannel,
    selectedFlow,
    customerName,
    customerEmail,
    trimmedMessage,
    flowGreetingMessage,
    now,
  }) => {
    const conversationId = crypto.randomUUID();

    const { data: conversation, error: conversationError } = await supabase
      .from("conversations")
      .insert({
        id: conversationId,
        workspace_id: workspace.id,
        bot_id: bot.id,
        channel_id: selectedChannel?.id || null,
        flow_id: selectedFlow?.id || null,
        customer_name: customerName,
        customer_email: customerEmail,
        customer_phone: null,
        customer_external_id: `widget_preview_customer_${Date.now()}`,
        external_conversation_id: `widget_preview_conv_${Date.now()}`,
        channel_type: "website",
        status: "open",
        priority: "normal",
        assigned_to: null,
        last_message: trimmedMessage,
        last_message_at: now.toISOString(),
        started_at: now.toISOString(),
        metadata: {
          source: "widget_preview",
          createdBy: user.email,
          intent: "widget_preview_message",
          customer_intent: trimmedMessage,
          flow_id: selectedFlow?.id || null,
          greeting_source: selectedFlow?.id ? "flow_builder" : "widget_setting",
        },
      })
      .select()
      .single();

    if (conversationError) throw conversationError;

    const messageRows = [
      {
        id: crypto.randomUUID(),
        workspace_id: workspace.id,
        bot_id: bot.id,
        conversation_id: conversation.id,
        sender_type: "bot",
        sender_profile_id: null,
        sender_name: bot.name,
        message_type: "text",
        content: flowGreetingMessage,
        metadata: {
          source: "widget_preview",
          flow_id: selectedFlow?.id || null,
          greeting_source: selectedFlow?.id ? "flow_builder" : "widget_setting",
        },
        sent_at: new Date(now.getTime() - 1000).toISOString(),
      },
      {
        id: crypto.randomUUID(),
        workspace_id: workspace.id,
        bot_id: bot.id,
        conversation_id: conversation.id,
        sender_type: "customer",
        sender_profile_id: null,
        sender_name: customerName,
        message_type: "text",
        content: trimmedMessage,
        metadata: {
          source: "widget_preview",
        },
        sent_at: now.toISOString(),
      },
    ];

    const { error: messageError } = await supabase
      .from("messages")
      .insert(messageRows);

    if (messageError) throw messageError;

    localStorage.setItem(getPreviewConversationKey(bot.id), conversation.id);

    return conversation;
  };

  const appendPreviewMessage = async ({
    conversation,
    bot,
    customerName,
    trimmedMessage,
    now,
  }) => {
    const { error: insertMessageError } = await supabase.from("messages").insert({
      id: crypto.randomUUID(),
      workspace_id: conversation.workspace_id,
      bot_id: bot.id,
      conversation_id: conversation.id,
      sender_type: "customer",
      sender_profile_id: null,
      sender_name: customerName,
      message_type: "text",
      content: trimmedMessage,
      metadata: {
        source: "widget_preview_follow_up",
      },
      sent_at: now.toISOString(),
    });

    if (insertMessageError) throw insertMessageError;

    const { error: updateConversationError } = await supabase
      .from("conversations")
      .update({
        status: conversation.status === "resolved" ? "open" : conversation.status,
        last_message: trimmedMessage,
        last_message_at: now.toISOString(),
        updated_at: now.toISOString(),
        metadata: {
          source: "widget_preview",
          intent: "widget_preview_message",
          customer_intent: trimmedMessage,
          last_preview_message_at: now.toISOString(),
        },
      })
      .eq("id", conversation.id)
      .eq("bot_id", bot.id);

    if (updateConversationError) throw updateConversationError;

    return {
      ...conversation,
      last_message: trimmedMessage,
      last_message_at: now.toISOString(),
    };
  };

  const createPreviewConversation = async ({
    message,
    customerName = "Website Visitor",
    customerEmail = "visitor@example.com",
    greetingMessage = "Hi! Welcome to support. How can we help you today?",
  }) => {
    setLoading(true);
    setError("");

    try {
      const trimmedMessage = message?.trim();

      if (!trimmedMessage) {
        throw new Error("Message tidak boleh kosong.");
      }

      const { user, workspace } = await getCurrentWorkspace();
      const bot = await getSelectedBot(workspace.id);
      const selectedChannel = await getWebsiteChannel(bot.id);
      const selectedFlow = await getDefaultFlow(bot.id);

      const flowGreetingMessage = await getFlowGreetingMessage(
        selectedFlow?.id,
        greetingMessage
      );

      const now = new Date();

      const existingConversation = await getExistingPreviewConversation(bot.id);

      const conversation = existingConversation
        ? await appendPreviewMessage({
            conversation: existingConversation,
            bot,
            customerName,
            trimmedMessage,
            now,
          })
        : await createNewPreviewConversation({
            workspace,
            user,
            bot,
            selectedChannel,
            selectedFlow,
            customerName,
            customerEmail,
            trimmedMessage,
            flowGreetingMessage,
            now,
          });

      window.dispatchEvent(
        new CustomEvent("nexora:test-conversation-created", {
          detail: {
            botId: bot.id,
            conversationId: conversation.id,
          },
        })
      );

      return {
        conversation,
        isNewConversation: !existingConversation,
      };
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to create widget preview conversation.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const resetPreviewConversation = async () => {
    try {
      const { workspace } = await getCurrentWorkspace();
      const bot = await getSelectedBot(workspace.id);

      localStorage.removeItem(getPreviewConversationKey(bot.id));
    } catch (err) {
      console.error(err);
    }
  };

  return {
    loading,
    error,
    createPreviewConversation,
    resetPreviewConversation,
  };
}