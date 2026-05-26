import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const SELECTED_BOT_KEY = "nexora_selected_bot_id";

export default function useDashboardData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [user, setUser] = useState(null);
  const [workspace, setWorkspace] = useState(null);
  const [activeBot, setActiveBot] = useState(null);

  const [stats, setStats] = useState({
    totalBots: 0,
    activeBots: 0,
    conversations: 0,
    needResponse: 0,
    documentsIndexed: 0,
  });

  const resetDashboardData = () => {
    setActiveBot(null);
    setStats({
      totalBots: 0,
      activeBots: 0,
      conversations: 0,
      needResponse: 0,
      documentsIndexed: 0,
    });
  };

  const getCurrentUser = async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;

    return user;
  };

  const getCurrentWorkspace = async (currentUserId) => {
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
      .eq("profile_id", currentUserId)
      .eq("status", "active")
      .limit(1);

    if (membershipError) throw membershipError;

    const currentWorkspace = memberships?.[0]?.workspace;

    if (!currentWorkspace?.id) {
      throw new Error("No active workspace found for this user.");
    }

    return currentWorkspace;
  };

  const getBotsAndSelectedBot = async (workspaceId) => {
    const { data: bots, error: botsError } = await supabase
      .from("bots")
      .select(
        `
        id,
        name,
        description,
        status,
        bot_type,
        workspace_id,
        created_at,
        updated_at
      `
      )
      .eq("workspace_id", workspaceId)
      .order("created_at", { ascending: false });

    if (botsError) throw botsError;

    const botRows = bots || [];
    const activeBots = botRows.filter((bot) => bot.status === "active");

    if (botRows.length === 0) {
      return {
        bots: [],
        activeBots: [],
        selectedBot: null,
      };
    }

    const storedBotId = localStorage.getItem(SELECTED_BOT_KEY);
    const storedBot = botRows.find((bot) => bot.id === storedBotId);

    if (storedBot) {
      return {
        bots: botRows,
        activeBots,
        selectedBot: storedBot,
      };
    }

    const fallbackBot = activeBots[0] || botRows[0];

    localStorage.setItem(SELECTED_BOT_KEY, fallbackBot.id);

    return {
      bots: botRows,
      activeBots,
      selectedBot: fallbackBot,
    };
  };

  const fetchSelectedBotStats = async (selectedBotId) => {
    if (!selectedBotId) {
      return {
        conversations: 0,
        needResponse: 0,
        documentsIndexed: 0,
      };
    }

    const { count: totalConversationCount, error: convError } = await supabase
      .from("conversations")
      .select("id", { count: "exact", head: true })
      .eq("bot_id", selectedBotId);

    if (convError) throw convError;

    const { count: needResponseTotal, error: needResponseError } =
      await supabase
        .from("conversations")
        .select("id", { count: "exact", head: true })
        .eq("bot_id", selectedBotId)
        .in("status", ["open", "assigned"]);

    if (needResponseError) throw needResponseError;

    const { count: indexedDocs, error: docsError } = await supabase
      .from("knowledge_documents")
      .select("id", { count: "exact", head: true })
      .eq("bot_id", selectedBotId)
      .eq("status", "indexed");

    if (docsError) throw docsError;

    return {
      conversations: totalConversationCount || 0,
      needResponse: needResponseTotal || 0,
      documentsIndexed: indexedDocs || 0,
    };
  };

  const fetchDashboardData = async () => {
    setLoading(true);
    setError("");

    try {
      const currentUser = await getCurrentUser();

      if (!currentUser) {
        setUser(null);
        setWorkspace(null);
        resetDashboardData();
        return;
      }

      setUser(currentUser);

      const currentWorkspace = await getCurrentWorkspace(currentUser.id);

      setWorkspace(currentWorkspace);

      const { bots, activeBots, selectedBot } = await getBotsAndSelectedBot(
        currentWorkspace.id
      );

      setActiveBot(selectedBot);

      const selectedBotStats = await fetchSelectedBotStats(selectedBot?.id);

      setStats({
        totalBots: bots.length,
        activeBots: activeBots.length,
        conversations: selectedBotStats.conversations,
        needResponse: selectedBotStats.needResponse,
        documentsIndexed: selectedBotStats.documentsIndexed,
      });
    } catch (err) {
      console.error(err);
      resetDashboardData();
      setError(err.message || "Failed to fetch dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();

    const handleSelectedBotChanged = () => {
      fetchDashboardData();
    };

    const handleBotCreated = (event) => {
      const botId = event?.detail?.botId;

      if (botId) {
        localStorage.setItem(SELECTED_BOT_KEY, botId);
      }

      fetchDashboardData();
    };

    window.addEventListener(
      "nexora:selected-bot-changed",
      handleSelectedBotChanged
    );

    window.addEventListener("nexora:bot-created", handleBotCreated);

    return () => {
      window.removeEventListener(
        "nexora:selected-bot-changed",
        handleSelectedBotChanged
      );

      window.removeEventListener("nexora:bot-created", handleBotCreated);
    };
  }, []);

  return {
    loading,
    error,
    user,
    workspace,
    activeBot,
    stats,
    refetch: fetchDashboardData,
  };
}