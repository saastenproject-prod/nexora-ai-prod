import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const SELECTED_BOT_KEY = "nexora_selected_bot_id";

const getStoredSelectedBotId = () => {
  try {
    return localStorage.getItem(SELECTED_BOT_KEY) || "";
  } catch {
    return "";
  }
};

const setStoredSelectedBotId = (botId) => {
  if (!botId) return;

  localStorage.setItem(SELECTED_BOT_KEY, botId);
};

const clearStoredSelectedBotId = () => {
  localStorage.removeItem(SELECTED_BOT_KEY);
};

const dispatchSelectedBotChanged = (botId) => {
  window.dispatchEvent(
    new CustomEvent("nexora:selected-bot-changed", {
      detail: {
        botId,
      },
    })
  );
};

export default function useBotSelection() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [workspace, setWorkspace] = useState(null);
  const [bots, setBots] = useState([]);
  const [selectedBotId, setSelectedBotIdState] = useState(
    getStoredSelectedBotId()
  );

  const selectedBot = useMemo(() => {
    if (!selectedBotId) return null;

    return bots.find((bot) => bot.id === selectedBotId) || null;
  }, [bots, selectedBotId]);

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

  const syncSelectedBot = (botRows) => {
    const storedBotId = getStoredSelectedBotId();
    const storedBotExists = botRows.some((bot) => bot.id === storedBotId);

    if (storedBotExists) {
      setSelectedBotIdState(storedBotId);
      return storedBotId;
    }

    const activeBot = botRows.find((bot) => bot.status === "active");
    const fallbackBot = activeBot || botRows[0] || null;

    if (fallbackBot?.id) {
      setStoredSelectedBotId(fallbackBot.id);
      setSelectedBotIdState(fallbackBot.id);
      dispatchSelectedBotChanged(fallbackBot.id);
      return fallbackBot.id;
    }

    clearStoredSelectedBotId();
    setSelectedBotIdState("");
    return "";
  };

  const fetchBots = async () => {
    setLoading(true);
    setError("");

    try {
      const currentWorkspace = await getCurrentWorkspace();

      setWorkspace(currentWorkspace);

      const { data, error: botsError } = await supabase
        .from("bots")
        .select(
          `
          id,
          workspace_id,
          name,
          description,
          bot_type,
          status,
          created_at,
          updated_at
        `
        )
        .eq("workspace_id", currentWorkspace.id)
        .order("created_at", { ascending: false });

      if (botsError) throw botsError;

      const botRows = data || [];

      setBots(botRows);
      syncSelectedBot(botRows);
    } catch (err) {
      console.error(err);
      setBots([]);
      setSelectedBotIdState("");
      setError(err?.message || "Failed to fetch bots.");
    } finally {
      setLoading(false);
    }
  };

  const setSelectedBotId = (botId) => {
    if (!botId) return;

    const botExists = bots.some((bot) => bot.id === botId);

    if (bots.length > 0 && !botExists) {
      setError("Selected bot tidak ditemukan pada workspace aktif.");
      return;
    }

    setStoredSelectedBotId(botId);
    setSelectedBotIdState(botId);
    dispatchSelectedBotChanged(botId);
  };

  useEffect(() => {
    fetchBots();

    const handleBotCreated = (event) => {
      const botId = event?.detail?.botId;

      if (botId) {
        setStoredSelectedBotId(botId);
        setSelectedBotIdState(botId);
        dispatchSelectedBotChanged(botId);
      }

      fetchBots();
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
    bots,
    selectedBot,
    selectedBotId,
    setSelectedBotId,
    refetch: fetchBots,
  };
}