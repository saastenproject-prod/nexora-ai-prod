import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const SELECTED_BOT_KEY = "nexora_selected_bot_id";

export default function useAllChatbotsData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [workspace, setWorkspace] = useState(null);
  const [bots, setBots] = useState([]);
  const [channels, setChannels] = useState([]);
  const [flows, setFlows] = useState([]);
  const [conversations, setConversations] = useState([]);

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

    const currentWorkspace = memberships?.[0]?.workspace;

    if (!currentWorkspace?.id) {
      throw new Error("Workspace aktif tidak ditemukan.");
    }

    return currentWorkspace;
  };

  const fetchAllChatbotsData = async () => {
    setLoading(true);
    setError("");

    try {
      const currentWorkspace = await getCurrentWorkspace();

      setWorkspace(currentWorkspace);

      const { data: botRows, error: botsError } = await supabase
        .from("bots")
        .select(
          `
          id,
          workspace_id,
          name,
          description,
          status,
          bot_type,
          created_at,
          updated_at
        `
        )
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });

      if (botsError) throw botsError;

      const botsData = botRows || [];
      setBots(botsData);

      const botIds = botsData.map((bot) => bot.id);

      if (botIds.length === 0) {
        setChannels([]);
        setFlows([]);
        setConversations([]);
        return;
      }

      const { data: channelRows, error: channelError } = await supabase
        .from("channels")
        .select("id, bot_id, name, channel_type, provider, status")
        .in("bot_id", botIds);

      if (channelError) throw channelError;

      setChannels(channelRows || []);

      const { data: flowRows, error: flowError } = await supabase
        .from("flows")
        .select("id, bot_id, name, status, is_default")
        .in("bot_id", botIds);

      if (flowError) throw flowError;

      setFlows(flowRows || []);

      const { data: conversationRows, error: conversationError } =
        await supabase
          .from("conversations")
          .select("id, bot_id, status")
          .in("bot_id", botIds);

      if (conversationError) throw conversationError;

      setConversations(conversationRows || []);
    } catch (err) {
      console.error(err);
      setError(err.message || "Failed to fetch chatbots.");
    } finally {
      setLoading(false);
    }
  };

  const chatbotRows = useMemo(() => {
    return bots.map((bot) => {
      const botChannels = channels.filter((item) => item.bot_id === bot.id);
      const botFlows = flows.filter((item) => item.bot_id === bot.id);
      const botConversations = conversations.filter(
        (item) => item.bot_id === bot.id
      );

      const needResponse = botConversations.filter((item) =>
        ["open", "assigned"].includes(item.status)
      ).length;

      return {
        ...bot,
        channels: botChannels,
        flows: botFlows,
        total_flows: botFlows.length,
        total_conversations: botConversations.length,
        need_response: needResponse,
      };
    });
  }, [bots, channels, flows, conversations]);

  const selectBot = (botId) => {
    if (!botId) return;

    localStorage.setItem(SELECTED_BOT_KEY, botId);

    window.dispatchEvent(
      new CustomEvent("nexora:selected-bot-changed", {
        detail: {
          botId,
        },
      })
    );
  };

  useEffect(() => {
    fetchAllChatbotsData();

    const handleBotCreated = () => {
      fetchAllChatbotsData();
    };

    window.addEventListener("nexora:bot-created", handleBotCreated);

    return () => {
      window.removeEventListener("nexora:bot-created", handleBotCreated);
    };
  }, []);

  return {
    loading,
    error,
    workspace,
    chatbots: chatbotRows,
    selectBot,
    refetch: fetchAllChatbotsData,
  };
}