import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const SELECTED_BOT_KEY = "nexora_selected_bot_id";

export default function useInboxData() {
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [error, setError] = useState("");

  const [workspace, setWorkspace] = useState(null);
  const [activeBot, setActiveBot] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [selectedConversationId, setSelectedConversationId] = useState(null);
  const [messages, setMessages] = useState([]);

  const selectedConversation = useMemo(() => {
    return (
      conversations.find((item) => item.id === selectedConversationId) || null
    );
  }, [conversations, selectedConversationId]);

  const resetData = () => {
    setActiveBot(null);
    setConversations([]);
    setSelectedConversationId(null);
    setMessages([]);
  };

  const getCurrentWorkspace = async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;

    if (!user) {
      throw new Error("User belum login. Silakan login Supabase Auth dulu.");
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

    const currentWorkspace = memberships?.[0]?.workspace;

    if (!currentWorkspace?.id) {
      throw new Error("Workspace aktif tidak ditemukan.");
    }

    return currentWorkspace;
  };

  const getSelectedBot = async (workspaceId) => {
    const { data: bots, error: botsError } = await supabase
      .from("bots")
      .select("id, name, status, bot_type, workspace_id, created_at")
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (botsError) throw botsError;

    const botRows = bots || [];

    if (botRows.length === 0) {
      throw new Error("Bot aktif tidak ditemukan.");
    }

    const storedBotId = localStorage.getItem(SELECTED_BOT_KEY);
    const storedBot = botRows.find((bot) => bot.id === storedBotId);

    if (storedBot) {
      return storedBot;
    }

    const activeBot = botRows.find((bot) => bot.status === "active");
    const fallbackBot = activeBot || botRows[0];

    localStorage.setItem(SELECTED_BOT_KEY, fallbackBot.id);

    return fallbackBot;
  };

  const getCurrentWorkspaceAndSelectedBot = async () => {
    const currentWorkspace = await getCurrentWorkspace();
    const selectedBot = await getSelectedBot(currentWorkspace.id);

    return {
      workspace: currentWorkspace,
      bot: selectedBot,
    };
  };

  const fetchMessages = async (conversationId) => {
    if (!conversationId) {
      setMessages([]);
      return;
    }

    setMessagesLoading(true);
    setError("");

    try {
      const { data, error: messagesError } = await supabase
        .from("messages")
        .select(
          `
          id,
          workspace_id,
          bot_id,
          conversation_id,
          sender_type,
          sender_profile_id,
          sender_name,
          message_type,
          content,
          media_url,
          node_id,
          metadata,
          sent_at,
          created_at
        `
        )
        .eq("conversation_id", conversationId)
        .order("sent_at", { ascending: true });

      if (messagesError) throw messagesError;

      setMessages(data || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to fetch messages.");
    } finally {
      setMessagesLoading(false);
    }
  };

  const fetchConversations = async () => {
    setLoading(true);
    setError("");

    try {
      const { workspace, bot } = await getCurrentWorkspaceAndSelectedBot();

      setWorkspace(workspace);
      setActiveBot(bot);

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
          customer_phone,
          customer_external_id,
          external_conversation_id,
          channel_type,
          status,
          priority,
          assigned_to,
          last_message,
          last_message_at,
          started_at,
          resolved_at,
          metadata,
          created_at,
          updated_at
        `
        )
        .eq("bot_id", bot.id)
        .order("last_message_at", { ascending: false });

      if (conversationError) throw conversationError;

      const rows = data || [];
      setConversations(rows);

      if (rows.length > 0) {
        const stillExists = rows.some(
          (row) => row.id === selectedConversationId
        );

        const nextSelectedId = stillExists
          ? selectedConversationId
          : rows[0].id;

        setSelectedConversationId(nextSelectedId);
        await fetchMessages(nextSelectedId);
      } else {
        setSelectedConversationId(null);
        setMessages([]);
      }
    } catch (err) {
      console.error(err);
      resetData();
      setError(err.message || "Failed to fetch inbox data.");
    } finally {
      setLoading(false);
    }
  };

  const selectConversation = async (conversationId) => {
    const conversation = conversations.find((item) => item.id === conversationId);

    if (!conversation) {
      setError("Conversation tidak ditemukan untuk bot yang sedang dipilih.");
      return;
    }

    setSelectedConversationId(conversationId);
    await fetchMessages(conversationId);
  };

  const updateConversationStatus = async (conversationId, status) => {
    setError("");

    try {
      const conversation = conversations.find((item) => item.id === conversationId);

      if (!conversation) {
        throw new Error("Conversation tidak ditemukan.");
      }

      if (activeBot?.id && conversation.bot_id !== activeBot.id) {
        throw new Error(
          "Conversation ini bukan milik bot yang sedang dipilih."
        );
      }

      const payload = {
        status,
      };

      if (status === "resolved") {
        payload.resolved_at = new Date().toISOString();
      }

      const { error: updateError } = await supabase
        .from("conversations")
        .update(payload)
        .eq("id", conversationId)
        .eq("bot_id", conversation.bot_id);

      if (updateError) throw updateError;

      await fetchConversations();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to update conversation.");
    }
  };

  const sendAgentReply = async (conversationId, replyText) => {
    setError("");

    try {
      const trimmedReply = replyText?.trim();

      if (!conversationId) {
        throw new Error("Conversation belum dipilih.");
      }

      if (!trimmedReply) {
        throw new Error("Reply tidak boleh kosong.");
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        throw new Error("User belum login.");
      }

      const conversation = conversations.find(
        (item) => item.id === conversationId
      );

      if (!conversation) {
        throw new Error("Conversation tidak ditemukan.");
      }

      if (activeBot?.id && conversation.bot_id !== activeBot.id) {
        throw new Error(
          "Conversation ini bukan milik bot yang sedang dipilih."
        );
      }

      const { error: insertMessageError } = await supabase
        .from("messages")
        .insert({
          workspace_id: conversation.workspace_id,
          bot_id: conversation.bot_id,
          conversation_id: conversation.id,
          sender_type: "agent",
          sender_profile_id: user.id,
          sender_name: user.email || "Agent",
          message_type: "text",
          content: trimmedReply,
          metadata: {
            source: "agent_inbox",
          },
          sent_at: new Date().toISOString(),
        });

      if (insertMessageError) throw insertMessageError;

      const { error: updateConversationError } = await supabase
        .from("conversations")
        .update({
          status: "assigned",
          assigned_to: user.id,
          last_message: trimmedReply,
          last_message_at: new Date().toISOString(),
        })
        .eq("id", conversation.id)
        .eq("bot_id", conversation.bot_id);

      if (updateConversationError) throw updateConversationError;

      await fetchMessages(conversation.id);
      await fetchConversations();
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to send agent reply.");
      throw err;
    }
  };

  useEffect(() => {
    fetchConversations();

    const handleSelectedBotChanged = () => {
      setSelectedConversationId(null);
      setMessages([]);
      fetchConversations();
    };

    const handleBotCreated = (event) => {
      const botId = event?.detail?.botId;

      if (botId) {
        localStorage.setItem(SELECTED_BOT_KEY, botId);
      }

      setSelectedConversationId(null);
      setMessages([]);
      fetchConversations();
    };

    window.addEventListener(
      "nexora:selected-bot-changed",
      handleSelectedBotChanged
    );



    window.addEventListener("nexora:bot-created", handleBotCreated);

    window.addEventListener(
      "nexora:test-conversation-created",
      handleSelectedBotChanged
    );

    return () => {
      window.removeEventListener(
        "nexora:selected-bot-changed",
        handleSelectedBotChanged
      );

      window.removeEventListener(
  "nexora:test-conversation-created",
  handleSelectedBotChanged
);

      window.removeEventListener("nexora:bot-created", handleBotCreated);
    };

    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    loading,
    messagesLoading,
    error,
    workspace,
    activeBot,
    conversations,
    selectedConversation,
    selectedConversationId,
    messages,
    selectConversation,
    updateConversationStatus,
    sendAgentReply,
    refetch: fetchConversations,
  };
}