import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const SELECTED_BOT_KEY = "nexora_selected_bot_id";
const SELECTED_FLOW_KEY = "nexora_selected_flow_id";

const NODE_DEFAULTS = {
  message: {
    label: "Message",
    description: "Send a message to the customer.",
    config: {
      message: "Type your message here...",
    },
  },
  single_choice: {
    label: "Single Choice",
    description: "Ask customer to choose one option.",
    config: {
      question: "Please choose one option:",
      options: ["Option 1", "Option 2"],
    },
  },
  text_question: {
  label: "Text Question",
  description: "Ask customer to provide text input.",
  config: {
    question: "Please type your answer:",
    save_as: "customer_answer",
    validation: "none",
    },
  },
  human_handoff: {
  label: "Human Handoff",
  description: "Route conversation to an available agent.",
  config: {
    message: "Please wait a moment. We are connecting you to an agent.",
    handoff_target: "support_agent",
    priority: "normal",
    include_captured_data: true,
    },
  },
  ai_agent: {
    label: "AI Agent",
    description: "Answer customer questions using AI.",
    config: {
      instruction:
        "Answer the customer question using approved knowledge sources. If unsure, route to human handoff.",
    },
  },
  condition: {
    label: "Condition",
    description: "Branch the flow based on customer data or answer.",
    config: {
      condition_type: "text_contains",
      value: "",
    },
  },
  webhook: {
    label: "Webhook",
    description: "Call an external API or automation endpoint.",
    config: {
      method: "POST",
      url: "",
      body: {},
    },
  },
  end: {
    label: "End Conversation",
    description: "Close the automated conversation flow.",
    config: {
      message: "Thank you. Have a great day!",
    },
  },
};

const buildNodeKey = (nodeType) => {
  return `${nodeType}_${Date.now()}`;
};

export default function useBuilderData() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [workspace, setWorkspace] = useState(null);
  const [activeBot, setActiveBot] = useState(null);
  const [flow, setFlow] = useState(null);
  const [nodes, setNodes] = useState([]);
  const [edges, setEdges] = useState([]);
  const [selectedNodeId, setSelectedNodeId] = useState(null);

  const selectedNode = useMemo(() => {
    return nodes.find((node) => node.id === selectedNodeId) || null;
  }, [nodes, selectedNodeId]);

  const resetData = () => {
    setActiveBot(null);
    setFlow(null);
    setNodes([]);
    setEdges([]);
    setSelectedNodeId(null);
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

  const getSelectedFlow = async (botId) => {
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
      .eq("bot_id", botId)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: false });

    if (flowError) throw flowError;

    const flows = flowRows || [];

    if (flows.length === 0) {
      localStorage.removeItem(SELECTED_FLOW_KEY);
      throw new Error("Flow belum tersedia untuk bot ini.");
    }

    const storedFlowId = localStorage.getItem(SELECTED_FLOW_KEY);
    const storedFlow = flows.find((item) => item.id === storedFlowId);

    if (storedFlow) {
      return storedFlow;
    }

    const defaultFlow = flows.find((item) => item.is_default);
    const fallbackFlow = defaultFlow || flows[0];

    localStorage.setItem(SELECTED_FLOW_KEY, fallbackFlow.id);

    return fallbackFlow;
  };

  const fetchBuilderData = async () => {
    setLoading(true);
    setError("");

    try {
      const currentWorkspace = await getCurrentWorkspace();

      setWorkspace(currentWorkspace);

      const selectedBot = await getSelectedBot(currentWorkspace.id);

      setActiveBot(selectedBot);

      const selectedFlow = await getSelectedFlow(selectedBot.id);

      setFlow(selectedFlow);

      const { data: nodeRows, error: nodeError } = await supabase
        .from("flow_nodes")
        .select(
          `
          id,
          flow_id,
          node_key,
          node_type,
          label,
          description,
          position_x,
          position_y,
          config,
          created_at,
          updated_at
        `
        )
        .eq("flow_id", selectedFlow.id)
        .order("position_x", { ascending: true })
        .order("position_y", { ascending: true });

      if (nodeError) throw nodeError;

      const mappedNodes = (nodeRows || []).map((node) => ({
        ...node,
        position_x: Number(node.position_x || 0),
        position_y: Number(node.position_y || 0),
        config: node.config || {},
      }));

      setNodes(mappedNodes);

      setSelectedNodeId((current) => {
        const currentStillExists = mappedNodes.some(
          (node) => node.id === current
        );

        if (currentStillExists) {
          return current;
        }

        return mappedNodes?.[0]?.id || null;
      });

      const { data: edgeRows, error: edgeError } = await supabase
        .from("flow_edges")
        .select(
          `
          id,
          flow_id,
          source_node_id,
          target_node_id,
          label,
          condition,
          created_at,
          updated_at
        `
        )
        .eq("flow_id", selectedFlow.id);

      if (edgeError) throw edgeError;

      setEdges(edgeRows || []);
    } catch (err) {
      console.error(err);
      resetData();
      setError(err?.message || "Failed to fetch builder data.");
    } finally {
      setLoading(false);
    }
  };

  const addNode = async (nodeType) => {
    setError("");

    try {
      if (!flow?.id) {
        throw new Error("Flow belum tersedia.");
      }

      const defaultConfig = NODE_DEFAULTS[nodeType];

      if (!defaultConfig) {
        throw new Error(`Unsupported node type: ${nodeType}`);
      }

      const nodeId = crypto.randomUUID();

      const maxX = nodes.reduce(
        (max, node) => Math.max(max, Number(node.position_x || 0)),
        80
      );

      const maxY = nodes.reduce(
        (max, node) => Math.max(max, Number(node.position_y || 0)),
        180
      );

      const nextX = Math.min(maxX + 320, 1200);
      const nextY = maxX + 320 > 1200 ? maxY + 180 : Math.max(maxY, 180);

      const { data: createdNode, error: createError } = await supabase
        .from("flow_nodes")
        .insert({
          id: nodeId,
          flow_id: flow.id,
          node_key: buildNodeKey(nodeType),
          node_type: nodeType,
          label: defaultConfig.label,
          description: defaultConfig.description,
          position_x: nextX,
          position_y: nextY,
          config: defaultConfig.config,
        })
        .select(
          `
          id,
          flow_id,
          node_key,
          node_type,
          label,
          description,
          position_x,
          position_y,
          config,
          created_at,
          updated_at
          `
        )
        .single();

      if (createError) throw createError;

      await fetchBuilderData();

      setSelectedNodeId(createdNode.id);

      return createdNode;
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to add node.");
      throw err;
    }
  };

  const deleteNode = async (nodeId) => {
    setError("");

    try {
      if (!flow?.id) {
        throw new Error("Flow belum tersedia.");
      }

      if (!nodeId) {
        throw new Error("Node belum dipilih.");
      }

      const targetNode = nodes.find((node) => node.id === nodeId);

      if (!targetNode) {
        throw new Error("Node tidak ditemukan pada flow aktif.");
      }

      if (targetNode.node_type === "start") {
        throw new Error("Start node tidak boleh dihapus.");
      }

      const { error: edgeDeleteError } = await supabase
        .from("flow_edges")
        .delete()
        .eq("flow_id", flow.id)
        .or(`source_node_id.eq.${nodeId},target_node_id.eq.${nodeId}`);

      if (edgeDeleteError) throw edgeDeleteError;

      const { error: nodeDeleteError } = await supabase
        .from("flow_nodes")
        .delete()
        .eq("id", nodeId)
        .eq("flow_id", flow.id);

      if (nodeDeleteError) throw nodeDeleteError;

      setSelectedNodeId(null);

      await fetchBuilderData();
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to delete node.");
      throw err;
    }
  };

  const updateNextStep = async (sourceNodeId, targetNodeId) => {
  setError("");

  try {
    if (!flow?.id) {
      throw new Error("Flow belum tersedia.");
    }

    if (!sourceNodeId) {
      throw new Error("Source node belum dipilih.");
    }

    const sourceNode = nodes.find(
      (node) => node.id === sourceNodeId && node.flow_id === flow.id
    );

    if (!sourceNode) {
      throw new Error("Source node tidak ditemukan pada flow aktif.");
    }

    if (sourceNode.node_type === "end") {
      throw new Error("End node tidak boleh memiliki next step.");
    }

    if (!targetNodeId) {
      const { error: deleteError } = await supabase
        .from("flow_edges")
        .delete()
        .eq("flow_id", flow.id)
        .eq("source_node_id", sourceNodeId);

      if (deleteError) throw deleteError;

      await fetchBuilderData();
      return null;
    }

    if (sourceNodeId === targetNodeId) {
      throw new Error("Node tidak boleh connect ke dirinya sendiri.");
    }

    const targetNode = nodes.find(
      (node) => node.id === targetNodeId && node.flow_id === flow.id
    );

    if (!targetNode) {
      throw new Error("Target node tidak ditemukan pada flow aktif.");
    }

    const existingOutgoingEdge = edges.find(
      (edge) =>
        edge.flow_id === flow.id && edge.source_node_id === sourceNodeId
    );

    if (existingOutgoingEdge) {
      const { data: updatedEdge, error: updateError } = await supabase
        .from("flow_edges")
        .update({
          target_node_id: targetNodeId,
          label: "Next",
          condition: {},
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingOutgoingEdge.id)
        .eq("flow_id", flow.id)
        .select(
          `
          id,
          flow_id,
          source_node_id,
          target_node_id,
          label,
          condition,
          created_at,
          updated_at
          `
        )
        .single();

      if (updateError) throw updateError;

      await fetchBuilderData();
      return updatedEdge;
    }

    const { data: createdEdge, error: createError } = await supabase
      .from("flow_edges")
      .insert({
        id: crypto.randomUUID(),
        flow_id: flow.id,
        source_node_id: sourceNodeId,
        target_node_id: targetNodeId,
        label: "Next",
        condition: {},
      })
      .select(
        `
        id,
        flow_id,
        source_node_id,
        target_node_id,
        label,
        condition,
        created_at,
        updated_at
        `
      )
      .single();

    if (createError) throw createError;

    await fetchBuilderData();
    return createdEdge;
  } catch (err) {
    console.error(err);
    setError(err?.message || "Failed to update next step.");
    throw err;
  }
};

const updateChoiceRoute = async (sourceNodeId, optionLabel, targetNodeId) => {
  setError("");

  try {
    if (!flow?.id) {
      throw new Error("Flow belum tersedia.");
    }

    if (!sourceNodeId) {
      throw new Error("Source node belum dipilih.");
    }

    const cleanOptionLabel = String(optionLabel || "").trim();

    if (!cleanOptionLabel) {
      throw new Error("Option label wajib diisi.");
    }

    const sourceNode = nodes.find(
      (node) => node.id === sourceNodeId && node.flow_id === flow.id
    );

    if (!sourceNode) {
      throw new Error("Source node tidak ditemukan pada flow aktif.");
    }

    if (sourceNode.node_type !== "single_choice") {
      throw new Error("Choice route hanya bisa digunakan untuk Single Choice node.");
    }

    const existingChoiceEdge = edges.find((edge) => {
      const condition = edge.condition || {};

      return (
        edge.flow_id === flow.id &&
        edge.source_node_id === sourceNodeId &&
        condition.type === "option_equals" &&
        condition.option === cleanOptionLabel
      );
    });

    if (!targetNodeId) {
      if (existingChoiceEdge) {
        const { error: deleteError } = await supabase
          .from("flow_edges")
          .delete()
          .eq("id", existingChoiceEdge.id)
          .eq("flow_id", flow.id);

        if (deleteError) throw deleteError;
      }

      await fetchBuilderData();
      return null;
    }

    if (sourceNodeId === targetNodeId) {
      throw new Error("Node tidak boleh connect ke dirinya sendiri.");
    }

    const targetNode = nodes.find(
      (node) => node.id === targetNodeId && node.flow_id === flow.id
    );

    if (!targetNode) {
      throw new Error("Target node tidak ditemukan pada flow aktif.");
    }

    const condition = {
      type: "option_equals",
      option: cleanOptionLabel,
    };

    if (existingChoiceEdge) {
      const { data: updatedEdge, error: updateError } = await supabase
        .from("flow_edges")
        .update({
          target_node_id: targetNodeId,
          label: cleanOptionLabel,
          condition,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingChoiceEdge.id)
        .eq("flow_id", flow.id)
        .select()
        .single();

      if (updateError) throw updateError;

      await fetchBuilderData();
      return updatedEdge;
    }

    const { data: createdEdge, error: createError } = await supabase
      .from("flow_edges")
      .insert({
        id: crypto.randomUUID(),
        flow_id: flow.id,
        source_node_id: sourceNodeId,
        target_node_id: targetNodeId,
        label: cleanOptionLabel,
        condition,
      })
      .select()
      .single();

    if (createError) throw createError;

    await fetchBuilderData();
    return createdEdge;
  } catch (err) {
    console.error(err);
    setError(err?.message || "Failed to update choice route.");
    throw err;
  }
};

const updateAiFallbackRoute = async (sourceNodeId, targetNodeId) => {
  setError("");

  try {
    if (!flow?.id) {
      throw new Error("Flow belum tersedia.");
    }

    if (!sourceNodeId) {
      throw new Error("AI Agent node belum dipilih.");
    }

    const sourceNode = nodes.find(
      (node) => node.id === sourceNodeId && node.flow_id === flow.id
    );

    if (!sourceNode) {
      throw new Error("AI Agent node tidak ditemukan pada flow aktif.");
    }

    if (sourceNode.node_type !== "ai_agent") {
      throw new Error("Fallback route hanya bisa digunakan untuk AI Agent node.");
    }

    const existingFallbackEdge = edges.find((edge) => {
      const condition = edge.condition || {};

      return (
        edge.flow_id === flow.id &&
        edge.source_node_id === sourceNodeId &&
        condition.type === "ai_fallback"
      );
    });

    if (!targetNodeId) {
      if (existingFallbackEdge) {
        const { error: deleteError } = await supabase
          .from("flow_edges")
          .delete()
          .eq("id", existingFallbackEdge.id)
          .eq("flow_id", flow.id);

        if (deleteError) throw deleteError;
      }

      await fetchBuilderData();
      return null;
    }

    if (sourceNodeId === targetNodeId) {
      throw new Error("AI Agent tidak boleh fallback ke dirinya sendiri.");
    }

    const targetNode = nodes.find(
      (node) => node.id === targetNodeId && node.flow_id === flow.id
    );

    if (!targetNode) {
      throw new Error("Target fallback node tidak ditemukan pada flow aktif.");
    }

    const condition = {
      type: "ai_fallback",
    };

    if (existingFallbackEdge) {
      const { data: updatedEdge, error: updateError } = await supabase
        .from("flow_edges")
        .update({
          target_node_id: targetNodeId,
          label: "Fallback",
          condition,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingFallbackEdge.id)
        .eq("flow_id", flow.id)
        .select()
        .single();

      if (updateError) throw updateError;

      await fetchBuilderData();
      return updatedEdge;
    }

    const { data: createdEdge, error: createError } = await supabase
      .from("flow_edges")
      .insert({
        id: crypto.randomUUID(),
        flow_id: flow.id,
        source_node_id: sourceNodeId,
        target_node_id: targetNodeId,
        label: "Fallback",
        condition,
      })
      .select()
      .single();

    if (createError) throw createError;

    await fetchBuilderData();
    return createdEdge;
  } catch (err) {
    console.error(err);
    setError(err?.message || "Failed to update AI fallback route.");
    throw err;
  }
};

const cleanupChoiceRoutes = async (sourceNodeId, validOptions = []) => {
  setError("");

  try {
    if (!flow?.id) {
      throw new Error("Flow belum tersedia.");
    }

    if (!sourceNodeId) {
      throw new Error("Source node belum dipilih.");
    }

    const normalizedOptions = validOptions
      .map((option) => String(option || "").trim())
      .filter(Boolean);

    const obsoleteEdges = edges.filter((edge) => {
      const condition = edge.condition || {};

      return (
        edge.flow_id === flow.id &&
        edge.source_node_id === sourceNodeId &&
        condition.type === "option_equals" &&
        !normalizedOptions.includes(condition.option)
      );
    });

    if (obsoleteEdges.length === 0) {
      return;
    }

    const obsoleteEdgeIds = obsoleteEdges.map((edge) => edge.id);

    const { error: deleteError } = await supabase
      .from("flow_edges")
      .delete()
      .eq("flow_id", flow.id)
      .in("id", obsoleteEdgeIds);

    if (deleteError) throw deleteError;

    await fetchBuilderData();
  } catch (err) {
    console.error(err);
    setError(err?.message || "Failed to cleanup choice routes.");
    throw err;
  }
};

  const updateNode = async (nodeId, payload) => {
    setError("");

    try {
      if (!nodeId) {
        throw new Error("Node belum dipilih.");
      }

      if (!flow?.id) {
        throw new Error("Flow belum tersedia.");
      }

      const nodeExistsInCurrentFlow = nodes.some(
        (node) => node.id === nodeId && node.flow_id === flow.id
      );

      if (!nodeExistsInCurrentFlow) {
        throw new Error("Node tidak termasuk dalam flow aktif.");
      }

      const { error: updateError } = await supabase
        .from("flow_nodes")
        .update({
          label: payload.label,
          description: payload.description,
          config: payload.config || {},
          updated_at: new Date().toISOString(),
        })
        .eq("id", nodeId)
        .eq("flow_id", flow.id);

      if (updateError) throw updateError;

      await fetchBuilderData();
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to update node.");
      throw err;
    }
  };

  const updateNodePositions = async (positionPayload = []) => {
    setError("");

    try {
      if (!flow?.id) {
        throw new Error("Flow belum tersedia.");
      }

      if (!Array.isArray(positionPayload) || positionPayload.length === 0) {
        return;
      }

      const allowedNodeIds = new Set(nodes.map((node) => node.id));

      const safePayload = positionPayload.filter((item) =>
        allowedNodeIds.has(item.id)
      );

      if (safePayload.length === 0) {
        return;
      }

      const updates = safePayload.map((item) =>
        supabase
          .from("flow_nodes")
          .update({
            position_x: Math.round(item.position_x || 0),
            position_y: Math.round(item.position_y || 0),
            updated_at: new Date().toISOString(),
          })
          .eq("id", item.id)
          .eq("flow_id", flow.id)
      );

      const results = await Promise.all(updates);

      const failed = results.find((result) => result.error);

      if (failed?.error) {
        throw failed.error;
      }

      await fetchBuilderData();
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to update node positions.");
      throw err;
    }
  };

  const saveFlow = async () => {
    setError("");

    try {
      if (!flow?.id) {
        throw new Error("Flow belum tersedia.");
      }

      if (!activeBot?.id) {
        throw new Error("Bot aktif belum tersedia.");
      }

      const { error: updateError } = await supabase
        .from("flows")
        .update({
          updated_at: new Date().toISOString(),
        })
        .eq("id", flow.id)
        .eq("bot_id", activeBot.id);

      if (updateError) throw updateError;

      await fetchBuilderData();
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to save flow.");
      throw err;
    }
  };

  useEffect(() => {
    fetchBuilderData();

    const handleSelectedBotChanged = () => {
      localStorage.removeItem(SELECTED_FLOW_KEY);
      fetchBuilderData();
    };

    const handleFlowSelected = (event) => {
      const flowId = event?.detail?.flowId;

      if (flowId) {
        localStorage.setItem(SELECTED_FLOW_KEY, flowId);
      }

      fetchBuilderData();
    };

    const handleBotCreated = (event) => {
      const botId = event?.detail?.botId;

      if (botId) {
        localStorage.setItem(SELECTED_BOT_KEY, botId);
        localStorage.removeItem(SELECTED_FLOW_KEY);
      }

      fetchBuilderData();
    };

    window.addEventListener(
      "nexora:selected-bot-changed",
      handleSelectedBotChanged
    );

    window.addEventListener("nexora:flow-selected", handleFlowSelected);

    window.addEventListener("nexora:bot-created", handleBotCreated);

    return () => {
      window.removeEventListener(
        "nexora:selected-bot-changed",
        handleSelectedBotChanged
      );

      window.removeEventListener("nexora:flow-selected", handleFlowSelected);

      window.removeEventListener("nexora:bot-created", handleBotCreated);
    };
  }, []);

  return {
    loading,
    error,
    workspace,
    activeBot,
    flow,
    nodes,
    edges,
    selectedNode,
    selectedNodeId,
    setSelectedNodeId,
    addNode,
    deleteNode,
    updateNextStep,
    updateChoiceRoute,
    cleanupChoiceRoutes,
    updateAiFallbackRoute,
    updateNode,
    updateNodePositions,
    saveFlow,
    refetch: fetchBuilderData,
  };
}