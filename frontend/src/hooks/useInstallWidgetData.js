import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const SELECTED_BOT_KEY = "nexora_selected_bot_id";

const DEFAULT_WIDGET_SETTING = {
  title: "Nexora Support",
  subtitle: "Online",
  primary_color: "#2563eb",
  position: "bottom-right",
  greeting_message: "Hi! Welcome to support. How can we help?",
  is_active: true,
  config: {},
};

const getWidgetScriptUrl = () => {
  const configuredUrl = import.meta.env.VITE_WIDGET_SCRIPT_URL;

  if (configuredUrl) {
    return configuredUrl;
  }

  if (import.meta.env.DEV) {
    return `${window.location.origin}/widget.js`;
  }

  return "https://cdn.nexora.ai/widget.js";
};

const buildWidgetKey = (botId) => {
  return `bot_${botId}_widget`;
};

export default function useInstallWidgetData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [workspace, setWorkspace] = useState(null);
  const [activeBot, setActiveBot] = useState(null);
  const [channels, setChannels] = useState([]);
  const [flows, setFlows] = useState([]);
  const [widgetSetting, setWidgetSetting] = useState(null);

  const resetData = () => {
    setWorkspace(null);
    setActiveBot(null);
    setChannels([]);
    setFlows([]);
    setWidgetSetting(null);
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
      .select(
        `
        id,
        name,
        description,
        status,
        bot_type,
        workspace_id,
        created_at
      `
      )
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

    window.dispatchEvent(
      new CustomEvent("nexora:selected-bot-changed", {
        detail: {
          botId: fallbackBot.id,
        },
      })
    );

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

  const getOrCreateWidgetSetting = async (bot) => {
    if (!bot?.id) {
      throw new Error("Bot tidak valid untuk membuat widget setting.");
    }

    const { data: widgetRows, error: widgetError } = await supabase
      .from("widget_settings")
      .select(
        `
        id,
        bot_id,
        widget_key,
        title,
        subtitle,
        primary_color,
        position,
        greeting_message,
        is_active,
        config,
        created_at,
        updated_at
        `
      )
      .eq("bot_id", bot.id)
      .order("created_at", { ascending: true })
      .limit(1);

    if (widgetError) throw widgetError;

    const existingWidgetSetting = widgetRows?.[0];

    if (existingWidgetSetting) {
      return existingWidgetSetting;
    }

    const payload = {
      bot_id: bot.id,
      widget_key: buildWidgetKey(bot.id),
      title: bot.name || DEFAULT_WIDGET_SETTING.title,
      subtitle: DEFAULT_WIDGET_SETTING.subtitle,
      primary_color: DEFAULT_WIDGET_SETTING.primary_color,
      position: DEFAULT_WIDGET_SETTING.position,
      greeting_message: DEFAULT_WIDGET_SETTING.greeting_message,
      is_active: DEFAULT_WIDGET_SETTING.is_active,
      config: DEFAULT_WIDGET_SETTING.config,
    };

    const { data: createdWidgetSetting, error: createWidgetError } =
      await supabase
        .from("widget_settings")
        .insert(payload)
        .select(
          `
          id,
          bot_id,
          widget_key,
          title,
          subtitle,
          primary_color,
          position,
          greeting_message,
          is_active,
          config,
          created_at,
          updated_at
          `
        )
        .single();

    if (createWidgetError) throw createWidgetError;

    return createdWidgetSetting;
  };

  const fetchInstallWidgetData = async () => {
    setLoading(true);
    setError("");

    try {
      const { workspace, bot } = await getCurrentWorkspaceAndSelectedBot();

      setWorkspace(workspace);
      setActiveBot(bot);

      const { data: channelRows, error: channelError } = await supabase
        .from("channels")
        .select(
          `
          id,
          bot_id,
          name,
          channel_type,
          provider,
          status,
          config,
          created_at
        `
        )
        .eq("bot_id", bot.id)
        .order("created_at", { ascending: true });

      if (channelError) throw channelError;

      setChannels(channelRows || []);

      const { data: flowRows, error: flowError } = await supabase
        .from("flows")
        .select(
          `
          id,
          bot_id,
          name,
          description,
          status,
          is_default,
          version,
          published_at,
          created_at,
          updated_at
        `
        )
        .eq("bot_id", bot.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (flowError) throw flowError;

      setFlows(flowRows || []);

      const currentWidgetSetting = await getOrCreateWidgetSetting(bot);

      setWidgetSetting(currentWidgetSetting);
    } catch (err) {
      console.error(err);
      resetData();
      setError(err?.message || "Failed to fetch install widget data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInstallWidgetData();

    const handleSelectedBotChanged = () => {
      fetchInstallWidgetData();
    };

    const handleBotCreated = (event) => {
      const botId = event?.detail?.botId;

      if (botId) {
        localStorage.setItem(SELECTED_BOT_KEY, botId);
      }

      fetchInstallWidgetData();
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

  const summary = useMemo(() => {
    const defaultFlow = flows.find((flow) => flow.is_default);
    const publishedFlow = flows.find((flow) => flow.status === "published");

    const websiteChannel = channels.find(
      (channel) => channel.channel_type === "website"
    );

    const whatsappChannel = channels.find(
      (channel) => channel.channel_type === "whatsapp"
    );

    const botFlowReady = Boolean(defaultFlow || publishedFlow);

    const websiteReady = Boolean(
      widgetSetting?.is_active &&
        widgetSetting?.widget_key &&
        websiteChannel?.status === "active"
    );

    const whatsappReady = whatsappChannel?.status === "active";

    return {
      defaultFlow,
      publishedFlow,
      websiteChannel,
      whatsappChannel,
      botFlowReady,
      websiteReady,
      whatsappReady,
    };
  }, [flows, channels, widgetSetting]);

  const widgetScriptUrl = getWidgetScriptUrl();

  const embedCode = widgetSetting?.widget_key
    ? `<script src="${widgetScriptUrl}" data-bot-id="${widgetSetting.widget_key}" async></script>`
    : "";

  const copyEmbedCode = async () => {
    if (!embedCode) {
      throw new Error("Embed code belum tersedia.");
    }

    await navigator.clipboard.writeText(embedCode);
  };

  return {
    loading,
    error,
    workspace,
    activeBot,
    channels,
    flows,
    widgetSetting,
    summary,
    widgetScriptUrl,
    embedCode,
    copyEmbedCode,
    refetch: fetchInstallWidgetData,
  };
}