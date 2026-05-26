import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const SELECTED_BOT_KEY = "nexora_selected_bot_id";
const SELECTED_FLOW_KEY = "nexora_selected_flow_id";

export default function useFlowsData() {
  const [loading, setLoading] = useState(true);
  const [creatingFlow, setCreatingFlow] = useState(false);
  const [error, setError] = useState("");

  const [workspace, setWorkspace] = useState(null);
  const [activeBot, setActiveBot] = useState(null);
  const [channels, setChannels] = useState([]);
  const [flows, setFlows] = useState([]);
  const [defaultFlow, setDefaultFlow] = useState(null);
  const [widgetSetting, setWidgetSetting] = useState(null);

  const resetData = () => {
    setActiveBot(null);
    setChannels([]);
    setFlows([]);
    setDefaultFlow(null);
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
      .select("id, name, description, status, bot_type, workspace_id, created_at")
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

  const fetchFlowsData = async () => {
    setLoading(true);
    setError("");

    try {
      const currentWorkspace = await getCurrentWorkspace();

      setWorkspace(currentWorkspace);

      const selectedBot = await getSelectedBot(currentWorkspace.id);

      setActiveBot(selectedBot);

      const { data: channelRows, error: channelError } = await supabase
        .from("channels")
        .select("id, name, channel_type, status, provider, config")
        .eq("bot_id", selectedBot.id)
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
          flow_type,
          status,
          is_default,
          version,
          published_at,
          created_at,
          updated_at
        `
        )
        .eq("bot_id", selectedBot.id)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: false });

      if (flowError) throw flowError;

      const flowIds = (flowRows || []).map((flow) => flow.id);

      let nodeRows = [];
      let edgeRows = [];

      if (flowIds.length > 0) {
        const { data: nodes, error: nodeError } = await supabase
          .from("flow_nodes")
          .select("id, flow_id, node_type")
          .in("flow_id", flowIds);

        if (nodeError) throw nodeError;

        nodeRows = nodes || [];

        const { data: edges, error: edgeError } = await supabase
          .from("flow_edges")
          .select("id, flow_id")
          .in("flow_id", flowIds);

        if (edgeError) throw edgeError;

        edgeRows = edges || [];
      }

      const mappedFlows = (flowRows || []).map((flow) => {
        const totalNodes = nodeRows.filter(
          (node) => node.flow_id === flow.id
        ).length;

        const totalEdges = edgeRows.filter(
          (edge) => edge.flow_id === flow.id
        ).length;

        return {
          ...flow,
          total_nodes: totalNodes,
          total_edges: totalEdges,
        };
      });

      setFlows(mappedFlows);
      setDefaultFlow(mappedFlows.find((flow) => flow.is_default) || null);

      const { data: widgetRows, error: widgetError } = await supabase
        .from("widget_settings")
        .select(
          "id, bot_id, widget_key, title, subtitle, is_active, position, primary_color"
        )
        .eq("bot_id", selectedBot.id)
        .limit(1);

      if (widgetError) throw widgetError;

      setWidgetSetting(widgetRows?.[0] || null);
    } catch (err) {
      console.error(err);
      resetData();
      setError(err?.message || "Failed to fetch flows data.");
    } finally {
      setLoading(false);
    }
  };

  const createFlow = async ({
    name,
    description,
    status = "draft",
    isDefault = false,
  }) => {
    setCreatingFlow(true);
    setError("");

    try {
      const flowName = String(name || "").trim();
      const flowDescription = String(description || "").trim();

      if (!flowName) {
        throw new Error("Flow name wajib diisi.");
      }

      const currentWorkspace = workspace || (await getCurrentWorkspace());
      const selectedBot = activeBot || (await getSelectedBot(currentWorkspace.id));

      if (!selectedBot?.id) {
        throw new Error("Bot aktif tidak ditemukan.");
      }

      const flowId = crypto.randomUUID();
      const startNodeId = crypto.randomUUID();
      const welcomeNodeId = crypto.randomUUID();

      if (isDefault) {
        const { error: unsetDefaultError } = await supabase
          .from("flows")
          .update({
            is_default: false,
            updated_at: new Date().toISOString(),
          })
          .eq("bot_id", selectedBot.id)
          .eq("is_default", true);

        if (unsetDefaultError) throw unsetDefaultError;
      }

      const { data: createdFlow, error: flowError } = await supabase
        .from("flows")
        .insert({
          id: flowId,
          bot_id: selectedBot.id,
          name: flowName,
          description:
            flowDescription ||
            "Custom flow created from Nexora Flow Library.",
          flow_type: "main",
          status,
          is_default: Boolean(isDefault),
          version: 1,
          published_at: status === "published" ? new Date().toISOString() : null,
        })
        .select(
          `
          id,
          bot_id,
          name,
          description,
          flow_type,
          status,
          is_default,
          version,
          published_at,
          created_at,
          updated_at
          `
        )
        .single();

      if (flowError) throw flowError;

      const starterNodes = [
        {
          id: startNodeId,
          flow_id: createdFlow.id,
          node_key: "start",
          node_type: "start",
          label: "Start",
          description: "Customer starts a new conversation",
          position_x: 80,
          position_y: 220,
          config: {
            message: "Customer starts a new conversation",
          },
        },
        {
          id: welcomeNodeId,
          flow_id: createdFlow.id,
          node_key: "welcome_message",
          node_type: "message",
          label: "Welcome Message",
          description: `Hi! Welcome to ${selectedBot.name}. How can we help you today?`,
          position_x: 360,
          position_y: 180,
          config: {
            message: `Hi! Welcome to ${selectedBot.name}. How can we help you today?`,
          },
        },
      ];

      const { error: nodeError } = await supabase
        .from("flow_nodes")
        .insert(starterNodes);

      if (nodeError) throw nodeError;

      const { error: edgeError } = await supabase.from("flow_edges").insert({
        id: crypto.randomUUID(),
        flow_id: createdFlow.id,
        source_node_id: startNodeId,
        target_node_id: welcomeNodeId,
        label: "Next",
        condition: {},
      });

      if (edgeError) throw edgeError;

      localStorage.setItem(SELECTED_FLOW_KEY, createdFlow.id);

      window.dispatchEvent(
        new CustomEvent("nexora:flow-selected", {
          detail: {
            flowId: createdFlow.id,
          },
        })
      );

      await fetchFlowsData();

      return createdFlow;
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to create flow.");
      throw err;
    } finally {
      setCreatingFlow(false);
    }
  };

  useEffect(() => {
    fetchFlowsData();

    const handleSelectedBotChanged = () => {
      localStorage.removeItem(SELECTED_FLOW_KEY);
      fetchFlowsData();
    };

    const handleBotCreated = (event) => {
      const botId = event?.detail?.botId;

      if (botId) {
        localStorage.setItem(SELECTED_BOT_KEY, botId);
        localStorage.removeItem(SELECTED_FLOW_KEY);
      }

      fetchFlowsData();
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
    creatingFlow,
    error,
    workspace,
    activeBot,
    channels,
    flows,
    defaultFlow,
    widgetSetting,
    createFlow,
    refetch: fetchFlowsData,
  };
}