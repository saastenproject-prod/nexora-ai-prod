import { useState } from "react";
import { supabase } from "../lib/supabaseClient";

const SELECTED_BOT_KEY = "nexora_selected_bot_id";

export default function useCreateTestConversation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

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

  const createTestConversation = async () => {
    setLoading(true);
    setError("");

    try {
      const { user, workspace } = await getCurrentWorkspace();
      const bot = await getSelectedBot(workspace.id);

      const { data: channels, error: channelError } = await supabase
        .from("channels")
        .select("id, channel_type, status")
        .eq("bot_id", bot.id)
        .order("created_at", { ascending: true });

      if (channelError) throw channelError;

      const selectedChannel =
        channels?.find((channel) => channel.status === "active") ||
        channels?.[0] ||
        null;

      const { data: flows, error: flowError } = await supabase
        .from("flows")
        .select("id, name, is_default, status")
        .eq("bot_id", bot.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (flowError) throw flowError;

      const selectedFlow =
        flows?.find((flow) => flow.is_default) || flows?.[0] || null;

      const now = new Date();
      const conversationId = crypto.randomUUID();

      const customerNames = [
        "Ahmad Ramadhan",
        "Siti Maharani",
        "Budi Santoso",
        "Nadia Putri",
        "Rizky Pratama",
      ];

      const randomName =
        customerNames[Math.floor(Math.random() * customerNames.length)];

      const customerEmail = randomName
        .toLowerCase()
        .replace(/\s+/g, ".")
        .concat("@example.com");

      const channelType = selectedChannel?.channel_type || "website";

      const initialCustomerMessage =
        channelType === "whatsapp"
          ? "Halo, saya ingin bertanya tentang layanan chatbot WhatsApp."
          : "Hi, I want to know more about this chatbot service.";

      const botMessage =
        "Hi! Welcome to support. How can we help you today?";

      const customerFollowUp =
        "Saya ingin demo dan informasi harga untuk kebutuhan customer service.";

      const lastMessage = customerFollowUp;

      const { data: conversation, error: conversationError } = await supabase
        .from("conversations")
        .insert({
          id: conversationId,
          workspace_id: workspace.id,
          bot_id: bot.id,
          channel_id: selectedChannel?.id || null,
          flow_id: selectedFlow?.id || null,
          customer_name: randomName,
          customer_email: customerEmail,
          customer_phone: "+6281234567890",
          customer_external_id: `test_customer_${Date.now()}`,
          external_conversation_id: `test_conv_${Date.now()}`,
          channel_type: channelType,
          status: "open",
          priority: "normal",
          assigned_to: null,
          last_message: lastMessage,
          last_message_at: now.toISOString(),
          started_at: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
          metadata: {
            source: "test_conversation",
            createdBy: user.email,
            intent: "product_inquiry",
            customer_intent:
              "Customer is asking for demo and pricing information.",
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
          sender_type: "customer",
          sender_profile_id: null,
          sender_name: randomName,
          message_type: "text",
          content: initialCustomerMessage,
          metadata: {
            source: "test_conversation",
          },
          sent_at: new Date(now.getTime() - 5 * 60 * 1000).toISOString(),
        },
        {
          id: crypto.randomUUID(),
          workspace_id: workspace.id,
          bot_id: bot.id,
          conversation_id: conversation.id,
          sender_type: "bot",
          sender_profile_id: null,
          sender_name: bot.name,
          message_type: "text",
          content: botMessage,
          metadata: {
            source: "test_conversation",
            botId: bot.id,
          },
          sent_at: new Date(now.getTime() - 4 * 60 * 1000).toISOString(),
        },
        {
          id: crypto.randomUUID(),
          workspace_id: workspace.id,
          bot_id: bot.id,
          conversation_id: conversation.id,
          sender_type: "customer",
          sender_profile_id: null,
          sender_name: randomName,
          message_type: "text",
          content: customerFollowUp,
          metadata: {
            source: "test_conversation",
          },
          sent_at: new Date(now.getTime() - 3 * 60 * 1000).toISOString(),
        },
      ];

      const { error: messageError } = await supabase
        .from("messages")
        .insert(messageRows);

      if (messageError) throw messageError;

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
      };
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to create test conversation.");
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    error,
    createTestConversation,
  };
}