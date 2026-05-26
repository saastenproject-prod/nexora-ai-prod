import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";

import {
  BookOpen,
  BrainCircuit,
  Headphones,
  HelpCircle,
  Inbox,
  MoreHorizontal,
  MousePointerClick,
  Send,
  Settings,
  Workflow,
  Zap,
} from "../lib/icons";

import useBuilderData from "../hooks/useBuilderData";

export default function BuilderScreen({ setScreen }) {
  const {
    loading,
    error,
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
    updateAiFallbackRoute,
    cleanupChoiceRoutes,
    updateNode,
    updateNodePositions,
    saveFlow,
    refetch,
  } = useBuilderData();

const [nodeForm, setNodeForm] = useState({
  label: "",
  mainText: "",
  optionsText: "",
  saveAs: "",
  validation: "none",
  handoffTarget: "support_agent",
  handoffPriority: "normal",
  includeCapturedData: true,
});

  const [savingNode, setSavingNode] = useState(false);
  const [savingFlow, setSavingFlow] = useState(false);
  const [addingNodeType, setAddingNodeType] = useState("");
  const [deletingNode, setDeletingNode] = useState(false);
  const [savingNextStep, setSavingNextStep] = useState(false);
  const [savingChoiceRoute, setSavingChoiceRoute] = useState("");
  const [savingAiFallbackRoute, setSavingAiFallbackRoute] = useState(false);
  const [flowSaveStatus, setFlowSaveStatus] = useState("");
  const [localNodePositions, setLocalNodePositions] = useState({});
  const [hasPositionChanges, setHasPositionChanges] = useState(false);

  const GRID_SIZE = 20;
  const MIN_NODE_X = 32;
  const MIN_NODE_Y = 32;

  const componentGroups = [
    {
      title: "Frequently used",
      items: [
        { name: "Message", nodeType: "message", icon: Send },
        {
          name: "Single Choice",
          nodeType: "single_choice",
          icon: MousePointerClick,
        },
        { name: "Text Question", nodeType: "text_question", icon: HelpCircle },
        { name: "Human Handoff", nodeType: "human_handoff", icon: Headphones },
      ],
    },
    {
      title: "AI & Automation",
      items: [
        {
          name: "AI Agent",
          nodeType: "ai_agent",
          icon: BrainCircuit,
          badge: "New",
        },
        { name: "Condition", nodeType: "condition", icon: Workflow },
        { name: "Webhook", nodeType: "webhook", icon: Settings },
        { name: "End Conversation", nodeType: "end", icon: MoreHorizontal },
      ],
    },
  ];

  const nodeTypeMeta = {
    start: {
      subtitle: "Trigger",
      icon: Zap,
      tone: "bg-slate-950 text-white",
    },
    message: {
      subtitle: "Message",
      icon: Send,
      tone: "bg-blue-50 text-blue-700",
    },
    single_choice: {
      subtitle: "Single Choice",
      icon: MousePointerClick,
      tone: "bg-violet-50 text-violet-700",
    },
    text_question: {
      subtitle: "Text Question",
      icon: Inbox,
      tone: "bg-amber-50 text-amber-700",
    },
    human_handoff: {
      subtitle: "Action",
      icon: Headphones,
      tone: "bg-rose-50 text-rose-700",
    },
    ai_agent: {
      subtitle: "AI Agent",
      icon: BrainCircuit,
      tone: "bg-indigo-50 text-indigo-700",
    },
    condition: {
      subtitle: "Condition",
      icon: Workflow,
      tone: "bg-cyan-50 text-cyan-700",
    },
    webhook: {
      subtitle: "Webhook",
      icon: Settings,
      tone: "bg-slate-100 text-slate-700",
    },
    info: {
      subtitle: "Message",
      icon: BookOpen,
      tone: "bg-emerald-50 text-emerald-700",
    },
    end: {
      subtitle: "End",
      icon: MoreHorizontal,
      tone: "bg-slate-100 text-slate-700",
    },
  };

  const snapToGrid = (value) => Math.round(value / GRID_SIZE) * GRID_SIZE;

  const normalizeNodePosition = (x, y) => ({
    x: Math.max(MIN_NODE_X, snapToGrid(x)),
    y: Math.max(MIN_NODE_Y, snapToGrid(y)),
  });

  const getNodeMeta = (node) => {
    return (
      nodeTypeMeta[node?.node_type] || {
        subtitle: node?.node_type || "Node",
        icon: Workflow,
        tone: "bg-slate-100 text-slate-700",
      }
    );
  };

  const getNodeBody = (node) => {
    if (!node) return "";

    if (node.node_type === "ai_agent") {
      return (
        node.config?.instruction ||
        node.config?.message ||
        node.description ||
        "Answer customer questions using AI."
      );
    }

    if (node.node_type === "webhook") {
      return (
        node.config?.url ||
        node.config?.message ||
        node.description ||
        "Call external webhook."
      );
    }

    if (node.node_type === "condition") {
      return (
        node.config?.value ||
        node.config?.message ||
        node.description ||
        "Configure condition logic."
      );
    }

    return (
      node.config?.message ||
      node.config?.question ||
      node.config?.body ||
      node.description ||
      "No node content configured yet."
    );
  };

  const getNodeOptions = (node) => {
    if (!node?.config) return [];

    if (Array.isArray(node.config.options)) {
      return node.config.options;
    }

    if (Array.isArray(node.config.choices)) {
      return node.config.choices;
    }

    return [];
  };

  const nodeById = useMemo(() => {
    return nodes.reduce((map, node) => {
      map[node.id] = node;
      return map;
    }, {});
  }, [nodes]);

  const getNodePosition = (node) => {
    if (!node?.id) {
      return {
        x: MIN_NODE_X,
        y: MIN_NODE_Y,
      };
    }

    return (
      localNodePositions[node.id] || {
        x: Number(node.position_x || MIN_NODE_X),
        y: Number(node.position_y || MIN_NODE_Y),
      }
    );
  };

  const canvasSize = useMemo(() => {
    const maxX = Math.max(
      1360,
      ...nodes.map((node) => {
        const position = getNodePosition(node);
        return Number(position.x || 0) + 420;
      })
    );

    const maxY = Math.max(
      760,
      ...nodes.map((node) => {
        const position = getNodePosition(node);
        return Number(position.y || 0) + 280;
      })
    );

    return {
      width: maxX,
      height: maxY,
    };
  }, [nodes, localNodePositions]);

  const edgePaths = useMemo(() => {
    return edges
      .map((edge) => {
        const source = nodeById[edge.source_node_id];
        const target = nodeById[edge.target_node_id];

        if (!source || !target) return null;

        const sourcePosition = getNodePosition(source);
        const targetPosition = getNodePosition(target);

        const sourceX = Number(sourcePosition.x || 0) + 256;
        const sourceY = Number(sourcePosition.y || 0) + 78;

        const targetX = Number(targetPosition.x || 0);
        const targetY = Number(targetPosition.y || 0) + 78;

        const midX = sourceX + Math.max(60, (targetX - sourceX) / 2);

        const labelX = (sourceX + targetX) / 2;
        const labelY = (sourceY + targetY) / 2 - 12;

        return {
          id: edge.id,
          label: edge.label,
          d: `M${sourceX} ${sourceY} C${midX} ${sourceY}, ${midX} ${targetY}, ${targetX} ${targetY}`,
          labelX,
          labelY,
        };
      })
      .filter(Boolean);
  }, [edges, nodeById, localNodePositions]);

 const selectedOutgoingEdge = useMemo(() => {
  if (!selectedNode) return null;

  return (
    edges.find((edge) => {
      const condition = edge.condition || {};

      return (
        edge.source_node_id === selectedNode.id &&
        condition.type !== "option_equals" &&
        condition.type !== "ai_fallback"
      );
    }) || null
  );
}, [edges, selectedNode]);

  const selectableNextNodes = useMemo(() => {
    if (!selectedNode) return [];

    return nodes.filter((node) => node.id !== selectedNode.id);
  }, [nodes, selectedNode]);

  const selectedChoiceOptions = useMemo(() => {
    if (selectedNode?.node_type !== "single_choice") return [];

    return getNodeOptions(selectedNode)
      .map((option) =>
        typeof option === "string" ? option : option.label || option.value || ""
      )
      .map((option) => String(option || "").trim())
      .filter(Boolean);
  }, [selectedNode]);

  const getChoiceRouteEdge = (optionLabel) => {
    return edges.find((edge) => {
      const condition = edge.condition || {};

      return (
        edge.source_node_id === selectedNode?.id &&
        condition.type === "option_equals" &&
        condition.option === optionLabel
      );
    });
  };

  const selectedAiFallbackEdge = useMemo(() => {
  if (selectedNode?.node_type !== "ai_agent") return null;

  return (
    edges.find((edge) => {
      const condition = edge.condition || {};

      return (
        edge.source_node_id === selectedNode.id &&
        condition.type === "ai_fallback"
      );
    }) || null
  );
}, [edges, selectedNode]);

  const selectedMeta = getNodeMeta(selectedNode);
  const SelectedIcon = selectedMeta.icon;

  useEffect(() => {
    const initialPositions = {};

    nodes.forEach((node) => {
      initialPositions[node.id] = normalizeNodePosition(
        Number(node.position_x || MIN_NODE_X),
        Number(node.position_y || MIN_NODE_Y)
      );
    });

    setLocalNodePositions(initialPositions);
    setHasPositionChanges(false);
  }, [nodes]);

  useEffect(() => {
      if (!selectedNode) {
          setNodeForm({
          label: "",
          mainText: "",
          optionsText: "",
          saveAs: "",
          validation: "none",
          handoffTarget: "support_agent",
          handoffPriority: "normal",
          includeCapturedData: true,
        });
          return;
        }

    const options = getNodeOptions(selectedNode);

     setNodeForm({
      label: selectedNode.label || "",
      mainText: getNodeBody(selectedNode),
      optionsText: options
        .map((option) =>
          typeof option === "string" ? option : option.label || option.value || ""
        )
        .filter(Boolean)
        .join("\n"),
      saveAs: selectedNode.config?.save_as || "",
      validation: selectedNode.config?.validation || "none",
      handoffTarget: selectedNode.config?.handoff_target || "support_agent",
      handoffPriority: selectedNode.config?.priority || "normal",
      includeCapturedData:
        selectedNode.config?.include_captured_data !== false,
    });
  }, [selectedNodeId, selectedNode]);

  const handleAddNode = async (nodeType) => {
    setAddingNodeType(nodeType);

    try {
      await addNode(nodeType);
    } catch (err) {
      console.error("[Add Node] failed:", err);
      window.alert(err?.message || "Failed to add node.");
    } finally {
      setAddingNodeType("");
    }
  };

  const handleDeleteSelectedNode = async () => {
    if (!selectedNode) return;

    if (selectedNode.node_type === "start") {
      window.alert("Start node tidak boleh dihapus.");
      return;
    }

    const confirmed = window.confirm(
      `Delete node "${
        selectedNode.label || selectedNode.node_key
      }"? Related edges will also be removed.`
    );

    if (!confirmed) return;

    setDeletingNode(true);

    try {
      await deleteNode(selectedNode.id);
    } catch (err) {
      console.error("[Delete Node] failed:", err);
      window.alert(err?.message || "Failed to delete node.");
    } finally {
      setDeletingNode(false);
    }
  };

  const handleUpdateNextStep = async (targetNodeId) => {
    if (!selectedNode) return;

    setSavingNextStep(true);

    try {
      await updateNextStep(selectedNode.id, targetNodeId || "");
    } catch (err) {
      console.error("[Next Step] failed:", err);
      window.alert(err?.message || "Failed to update next step.");
    } finally {
      setSavingNextStep(false);
    }
  };

  const handleUpdateChoiceRoute = async (optionLabel, targetNodeId) => {
    if (!selectedNode) return;

    const cleanOptionLabel = String(optionLabel || "").trim();

    if (!cleanOptionLabel) return;

    setSavingChoiceRoute(cleanOptionLabel);

    try {
      await updateChoiceRoute(
        selectedNode.id,
        cleanOptionLabel,
        targetNodeId || ""
      );
    } catch (err) {
      console.error("[Choice Route] failed:", err);
      window.alert(err?.message || "Failed to update choice route.");
    } finally {
      setSavingChoiceRoute("");
    }
  };

  const handleUpdateAiFallbackRoute = async (targetNodeId) => {
  if (!selectedNode) return;

  setSavingAiFallbackRoute(true);

  try {
    await updateAiFallbackRoute(selectedNode.id, targetNodeId || "");
  } catch (err) {
    console.error("[AI Fallback Route] failed:", err);
    window.alert(err?.message || "Failed to update AI fallback route.");
  } finally {
    setSavingAiFallbackRoute(false);
  }
};

  const handleSaveNode = async () => {
    if (!selectedNode) return;

    setSavingNode(true);

    try {
      const nextConfig = {
        ...(selectedNode.config || {}),
      };

      let nextOptions = [];

      if (selectedNode.node_type === "single_choice") {
        nextOptions = nodeForm.optionsText
          .split("\n")
          .map((item) => item.trim())
          .filter(Boolean);

        nextConfig.question = nodeForm.mainText;
        nextConfig.options = nextOptions;
      } else if (selectedNode.node_type === "text_question") {
        nextConfig.question = nodeForm.mainText;
        nextConfig.save_as = nodeForm.saveAs;
        nextConfig.validation = nodeForm.validation || "none";
      } else if (selectedNode.node_type === "ai_agent") {
        nextConfig.instruction = nodeForm.mainText;
        nextConfig.message = nodeForm.mainText;
      } else if (selectedNode.node_type === "human_handoff") {
        nextConfig.message = nodeForm.mainText;
        nextConfig.handoff_target = nodeForm.handoffTarget || "support_agent";
        nextConfig.priority = nodeForm.handoffPriority || "normal";
        nextConfig.include_captured_data = Boolean(nodeForm.includeCapturedData);
      } else if (selectedNode.node_type === "webhook") {
        nextConfig.url = nodeForm.mainText;
        nextConfig.message = nodeForm.mainText;
      } else if (selectedNode.node_type === "condition") {
        nextConfig.value = nodeForm.mainText;
        nextConfig.message = nodeForm.mainText;
      } else {
        nextConfig.message = nodeForm.mainText;
      }

      await updateNode(selectedNode.id, {
        label: nodeForm.label,
        description: nodeForm.mainText,
        config: nextConfig,
      });

      if (selectedNode.node_type === "single_choice") {
        await cleanupChoiceRoutes(selectedNode.id, nextOptions);
      }
    } catch (err) {
      console.error("[Save Node] failed:", err);
      window.alert(err?.message || "Failed to save node.");
    } finally {
      setSavingNode(false);
    }
  };

  const handleSaveFlow = async () => {
    setSavingFlow(true);
    setFlowSaveStatus("");

    try {
      if (hasPositionChanges) {
        const positionPayload = nodes.map((node) => {
          const position = getNodePosition(node);

          return {
            id: node.id,
            position_x: position.x,
            position_y: position.y,
          };
        });

        await updateNodePositions(positionPayload);
      }

      await saveFlow();

      setHasPositionChanges(false);
      setFlowSaveStatus("Flow saved");

      setTimeout(() => {
        setFlowSaveStatus("");
      }, 1800);
    } catch (err) {
      console.error("[Save Flow] failed:", err);
      setFlowSaveStatus("Save failed");

      setTimeout(() => {
        setFlowSaveStatus("");
      }, 1800);
    } finally {
      setSavingFlow(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FC] flex overflow-hidden">
      <aside className="w-80 shrink-0 border-r border-slate-200 bg-white h-screen flex flex-col">
        <div className="p-5 border-b border-slate-200">
          <button
            onClick={() => setScreen("flows")}
            className="text-sm font-semibold text-slate-500 hover:text-slate-950"
            type="button"
          >
            ← Back to flows
          </button>

          <div className="mt-5">
            <p className="text-xs font-bold text-blue-700">FLOW BUILDER</p>

            <h2 className="mt-1 text-xl font-black text-slate-950">
              {loading ? "Loading flow..." : flow?.name || "No Flow"}
            </h2>

            <p className="mt-2 text-sm text-slate-500 leading-6">
              {flow?.description ||
                "Drag components into canvas and connect each step visually."}
            </p>

            {activeBot && (
              <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-xs font-black text-slate-400 uppercase">
                  Active Bot
                </p>
                <p className="mt-1 text-sm font-bold text-slate-950">
                  {activeBot.name}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="p-5 overflow-y-auto space-y-6">
          {componentGroups.map((group) => (
            <div key={group.title}>
              <h3 className="text-xs font-black uppercase tracking-wide text-slate-400 mb-3">
                {group.title}
              </h3>

              <div className="space-y-2">
                {group.items.map((item) => {
                  const Icon = item.icon;

                  return (
                    <button
                      key={item.name}
                      type="button"
                      onClick={() => handleAddNode(item.nodeType)}
                      disabled={
                        loading || addingNodeType === item.nodeType || !flow
                      }
                      className="w-full rounded-2xl border border-slate-200 bg-white p-3 flex items-center justify-between hover:bg-slate-50 hover:border-blue-200 transition disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <span className="flex items-center gap-3 text-sm font-bold text-slate-700">
                        <span className="h-9 w-9 rounded-xl bg-blue-50 text-blue-700 grid place-items-center">
                          <Icon size={17} />
                        </span>
                        {addingNodeType === item.nodeType
                          ? "Adding..."
                          : item.name}
                      </span>

                      {item.badge && (
                        <span className="text-[10px] px-2 py-1 rounded-full bg-emerald-50 text-emerald-700 font-bold">
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </aside>

      <main className="flex-1 min-w-0 flex flex-col h-screen">
        <div className="h-16 shrink-0 border-b border-slate-200 bg-white/90 backdrop-blur-xl px-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-slate-950 text-white grid place-items-center">
              <Workflow size={18} />
            </div>

            <div>
              <h1 className="font-black text-slate-950">
                Visual Flow Builder
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                {loading
                  ? "Loading from Supabase..."
                  : flow
                  ? `${flow.status} · ${nodes.length} nodes · ${
                      edges.length
                    } edges${
                      hasPositionChanges ? " · unsaved layout changes" : ""
                    }`
                  : "No flow loaded"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              className="h-10 px-4 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700"
            >
              Preview
            </button>

            <button
              type="button"
              className="h-10 px-4 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700"
            >
              Test Bot
            </button>

            <button
              type="button"
              onClick={refetch}
              className="h-10 px-4 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700"
            >
              Refresh
            </button>

            <button
              type="button"
              onClick={handleSaveFlow}
              disabled={savingFlow || loading || !flow}
              className="h-10 px-5 rounded-2xl bg-blue-600 text-white text-sm font-bold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {savingFlow
                ? "Saving..."
                : flowSaveStatus ||
                  (hasPositionChanges ? "Save Changes" : "Save Flow")}
            </button>
          </div>
        </div>

        {error && (
          <div className="mx-5 mt-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <div className="relative flex-1 overflow-auto bg-slate-50">
          <div className="absolute inset-0 bg-[radial-gradient(#cbd5e1_1px,transparent_1px)] [background-size:20px_20px]" />

          {loading && (
            <div className="relative z-10 p-8 text-sm font-semibold text-slate-500">
              Loading builder nodes from Supabase...
            </div>
          )}

          {!loading && nodes.length === 0 && (
            <div className="relative z-10 p-8">
              <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
                <p className="font-black text-slate-950">
                  No nodes found for this flow.
                </p>
                <p className="mt-2 text-sm text-slate-500">
                  Add a node from the left sidebar to start building your flow.
                </p>
              </div>
            </div>
          )}

          {!loading && nodes.length > 0 && (
            <>
              <svg
                className="absolute left-0 top-0 pointer-events-none z-10"
                style={{
                  width: canvasSize.width,
                  height: canvasSize.height,
                }}
              >
                {edgePaths.map((edge) => (
                  <g key={edge.id}>
                    <path
                      d={edge.d}
                      fill="none"
                      stroke="#94A3B8"
                      strokeWidth="2.5"
                    />

                    {edge.label && edge.label !== "Next" && (
                      <>
                        <rect
                          x={edge.labelX - 50}
                          y={edge.labelY - 13}
                          width="100"
                          height="26"
                          rx="13"
                          fill="white"
                          stroke="#E2E8F0"
                        />
                        <text
                          x={edge.labelX}
                          y={edge.labelY + 4}
                          textAnchor="middle"
                          fontSize="11"
                          fontWeight="700"
                          fill="#475569"
                        >
                          {edge.label.length > 13
                            ? `${edge.label.slice(0, 13)}...`
                            : edge.label}
                        </text>
                      </>
                    )}
                  </g>
                ))}
              </svg>

              <div
                className="relative z-20 p-8"
                style={{
                  width: canvasSize.width,
                  height: canvasSize.height,
                }}
              >
                {nodes.map((node) => {
                  const meta = getNodeMeta(node);
                  const Icon = meta.icon;
                  const options = getNodeOptions(node);
                  const isSelected = node.id === selectedNodeId;
                  const position = getNodePosition(node);

                  return (
                    <motion.button
                      key={node.id}
                      type="button"
                      drag
                      dragMomentum={false}
                      dragElastic={0}
                      whileDrag={{
                        scale: 1.02,
                        zIndex: 50,
                      }}
                      onClick={() => setSelectedNodeId(node.id)}
                      onDragStart={() => setSelectedNodeId(node.id)}
                      onDragEnd={(_, info) => {
                        const currentPosition = getNodePosition(node);

                        const nextPosition = normalizeNodePosition(
                          currentPosition.x + info.offset.x,
                          currentPosition.y + info.offset.y
                        );

                        setLocalNodePositions((current) => ({
                          ...current,
                          [node.id]: nextPosition,
                        }));

                        setHasPositionChanges(true);
                      }}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`absolute w-64 text-left rounded-[1.4rem] border bg-white shadow-sm hover:shadow-lg transition overflow-hidden cursor-grab active:cursor-grabbing ${
                        isSelected
                          ? "border-blue-400 ring-4 ring-blue-100"
                          : "border-slate-200"
                      }`}
                      style={{
                        left: position.x,
                        top: position.y,
                      }}
                    >
                      <div className="p-4 border-b border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <div
                            className={`h-10 w-10 rounded-2xl grid place-items-center ${meta.tone}`}
                          >
                            <Icon size={18} />
                          </div>

                          <div>
                            <p className="text-sm font-black text-slate-950">
                              {node.label || node.node_key}
                            </p>
                            <p className="text-[11px] font-semibold text-slate-400">
                              {meta.subtitle}
                            </p>
                          </div>
                        </div>

                        <span className="text-slate-400">
                          <MoreHorizontal size={17} />
                        </span>
                      </div>

                      <div className="p-4">
                        <p className="text-sm leading-6 text-slate-600">
                          {getNodeBody(node)}
                        </p>

                        {options.length > 0 && (
                          <div className="mt-4 space-y-2">
                            {options.map((option) => (
                              <div
                                key={String(
                                  typeof option === "string"
                                    ? option
                                    : option.label || option.value
                                )}
                                className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-600"
                              >
                                {typeof option === "string"
                                  ? option
                                  : option.label || option.value || "Option"}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </motion.button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </main>

      <aside className="w-96 shrink-0 border-l border-slate-200 bg-white h-screen flex flex-col">
        <div className="h-16 border-b border-slate-200 px-5 flex items-center justify-between">
          <div>
            <h2 className="font-black text-slate-950">Node Settings</h2>
            <p className="text-xs text-slate-500">
              {selectedNode
                ? `${selectedNode.label || selectedNode.node_key} selected`
                : "No node selected"}
            </p>
          </div>

          <button
            type="button"
            className="h-9 w-9 rounded-xl border border-slate-200 grid place-items-center text-slate-500"
          >
            <Settings size={16} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto space-y-5">
          {!selectedNode && (
            <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
              <p className="text-sm font-semibold text-slate-500">
                Select a node from the canvas to view settings.
              </p>
            </div>
          )}

          {selectedNode && (
            <>
              <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                <div className="flex items-center gap-3">
                  <div
                    className={`h-11 w-11 rounded-2xl grid place-items-center ${selectedMeta.tone}`}
                  >
                    <SelectedIcon size={19} />
                  </div>

                  <div>
                    <p className="font-black text-slate-950">
                      {selectedNode.label || selectedNode.node_key}
                    </p>
                    <p className="text-xs text-slate-500 mt-1">
                      {selectedNode.node_type} · {selectedNode.node_key}
                    </p>
                  </div>
                </div>
              </div>

              <label className="block">
                <span className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Node Label
                </span>
                <input
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400"
                  value={nodeForm.label}
                  onChange={(event) =>
                    setNodeForm((current) => ({
                      ...current,
                      label: event.target.value,
                    }))
                  }
                />
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase tracking-wide text-slate-400">
                  {selectedNode.node_type === "ai_agent"
                    ? "AI Instruction"
                    : selectedNode.node_type === "single_choice"
                    ? "Question"
                    : selectedNode.node_type === "text_question"
                    ? "Question"
                    : selectedNode.node_type === "webhook"
                    ? "Webhook URL / Description"
                    : selectedNode.node_type === "condition"
                    ? "Condition Value"
                    : "Main Text"}
                </span>
                <textarea
                  className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-4 h-32 text-sm outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400"
                  value={nodeForm.mainText}
                  onChange={(event) =>
                    setNodeForm((current) => ({
                      ...current,
                      mainText: event.target.value,
                    }))
                  }
                />
              </label>

              {selectedNode.node_type === "text_question" && (
  <div className="rounded-3xl border border-amber-100 bg-amber-50 p-5 space-y-4">
    <div>
      <p className="text-xs font-black uppercase tracking-wide text-amber-600">
        Capture Answer
      </p>
      <p className="mt-1 text-sm text-amber-700">
        Simpan jawaban customer ke variable agar bisa digunakan di step berikutnya.
      </p>
    </div>

    <label className="block">
      <span className="text-xs font-black uppercase tracking-wide text-slate-400">
        Save Answer As
      </span>

      <input
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm outline-none focus:ring-4 focus:ring-amber-100 focus:border-amber-400"
        value={nodeForm.saveAs}
        onChange={(event) =>
          setNodeForm((current) => ({
            ...current,
            saveAs: event.target.value
              .toLowerCase()
              .replace(/\s+/g, "_")
              .replace(/[^a-z0-9_]/g, ""),
          }))
        }
        placeholder="customer_name"
      />

      <p className="mt-2 text-xs text-slate-500">
        Example: customer_name, customer_email, phone_number, company_name, requirement
      </p>
    </label>

    <label className="block">
      <span className="text-xs font-black uppercase tracking-wide text-slate-400">
        Validation
      </span>

      <select
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm outline-none"
        value={nodeForm.validation}
        onChange={(event) =>
          setNodeForm((current) => ({
            ...current,
            validation: event.target.value,
          }))
        }
      >
        <option value="none">No validation</option>
        <option value="email">Email</option>
        <option value="phone">Phone Number</option>
        <option value="number">Number</option>
        <option value="required">Required</option>
      </select>
    </label>
  </div>
)}

{selectedNode.node_type === "human_handoff" && (
  <div className="rounded-3xl border border-rose-100 bg-rose-50 p-5 space-y-4">
    <div>
      <p className="text-xs font-black uppercase tracking-wide text-rose-600">
        Handoff Settings
      </p>
      <p className="mt-1 text-sm text-rose-700">
        Tentukan tujuan handoff dan data yang akan dibawa ke agent.
      </p>
    </div>

    <label className="block">
      <span className="text-xs font-black uppercase tracking-wide text-slate-400">
        Target Queue / Team
      </span>

      <select
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm outline-none"
        value={nodeForm.handoffTarget}
        onChange={(event) =>
          setNodeForm((current) => ({
            ...current,
            handoffTarget: event.target.value,
          }))
        }
      >
        <option value="support_agent">Support Agent</option>
        <option value="sales_agent">Sales Agent</option>
        <option value="technical_agent">Technical Agent</option>
        <option value="billing_agent">Billing Agent</option>
        <option value="general_queue">General Queue</option>
      </select>
    </label>

    <label className="block">
      <span className="text-xs font-black uppercase tracking-wide text-slate-400">
        Priority
      </span>

      <select
        className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-4 text-sm outline-none"
        value={nodeForm.handoffPriority}
        onChange={(event) =>
          setNodeForm((current) => ({
            ...current,
            handoffPriority: event.target.value,
          }))
        }
      >
        <option value="low">Low</option>
        <option value="normal">Normal</option>
        <option value="high">High</option>
        <option value="urgent">Urgent</option>
      </select>
    </label>

    <label className="flex items-start gap-3 rounded-2xl border border-rose-100 bg-white p-4 cursor-pointer">
      <input
        type="checkbox"
        checked={nodeForm.includeCapturedData}
        onChange={(event) =>
          setNodeForm((current) => ({
            ...current,
            includeCapturedData: event.target.checked,
          }))
        }
        className="mt-1 h-4 w-4"
      />

      <span>
        <span className="block text-sm font-black text-slate-800">
          Include captured customer data
        </span>
        <span className="mt-1 block text-xs leading-5 text-slate-500">
          Data seperti customer_name, customer_email, phone_number, dan requirement akan dibawa sebagai context untuk agent.
        </span>
      </span>
    </label>
  </div>
)}

              {selectedNode.node_type === "single_choice" && (
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-400">
                    Options
                  </span>

                  <textarea
                    className="mt-2 w-full rounded-2xl border border-slate-200 bg-white p-4 h-32 text-sm outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400"
                    value={nodeForm.optionsText}
                    onChange={(event) =>
                      setNodeForm((current) => ({
                        ...current,
                        optionsText: event.target.value,
                      }))
                    }
                    placeholder={"General Info\nReport Issue\nTalk to Agent"}
                  />

                  <p className="mt-2 text-xs text-slate-400">
                    Write one option per line. Click Save Node after changing
                    options.
                  </p>
                </label>
              )}

              {selectedNode.node_type !== "single_choice" && (
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-400">
                    Next Step
                  </span>

                  <select
                    className="mt-2 w-full rounded-2xl border border-slate-200 p-4 text-sm bg-white outline-none disabled:opacity-60 disabled:cursor-not-allowed"
                    value={selectedOutgoingEdge?.target_node_id || ""}
                    disabled={
                      savingNextStep ||
                      !selectedNode ||
                      selectedNode.node_type === "end" ||
                      selectableNextNodes.length === 0
                    }
                    onChange={(event) =>
                      handleUpdateNextStep(event.target.value)
                    }
                  >
                    <option value="">No next step</option>

                    {selectableNextNodes.map((node) => (
                      <option key={node.id} value={node.id}>
                        {node.label || node.node_key}
                      </option>
                    ))}
                  </select>

                  {savingNextStep && (
                    <p className="mt-2 text-xs font-semibold text-blue-600">
                      Saving next step...
                    </p>
                  )}

                  {selectedNode?.node_type === "end" && (
                    <p className="mt-2 text-xs font-semibold text-slate-400">
                      End node does not require a next step.
                    </p>
                  )}

                  {selectedNode?.node_type !== "end" &&
                    selectableNextNodes.length === 0 && (
                      <p className="mt-2 text-xs font-semibold text-amber-600">
                        Tambahkan minimal 1 node lagi dari sidebar kiri agar
                        Next Step bisa dipilih.
                      </p>
                    )}
                </label>
              )}

              {selectedNode.node_type === "single_choice" && (
                <div className="rounded-3xl border border-violet-100 bg-violet-50 p-5 space-y-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-violet-500">
                      Option Routes
                    </p>
                    <p className="mt-1 text-sm text-violet-700">
                      Tentukan tujuan node untuk setiap pilihan customer.
                    </p>
                  </div>

                  {selectedChoiceOptions.length === 0 && (
                    <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-semibold text-amber-700">
                      Tambahkan option terlebih dahulu. Tulis satu option per
                      baris lalu klik Save Node.
                    </div>
                  )}

                  {selectedChoiceOptions.map((optionLabel) => {
                    const routeEdge = getChoiceRouteEdge(optionLabel);

                    return (
                      <div
                        key={optionLabel}
                        className="rounded-2xl border border-violet-100 bg-white p-4"
                      >
                        <p className="text-sm font-black text-slate-950">
                          {optionLabel}
                        </p>

                        <select
                          className="mt-3 w-full rounded-2xl border border-slate-200 p-3 text-sm bg-white outline-none disabled:opacity-60"
                          value={routeEdge?.target_node_id || ""}
                          disabled={
                            savingChoiceRoute === optionLabel ||
                            selectableNextNodes.length === 0
                          }
                          onChange={(event) =>
                            handleUpdateChoiceRoute(
                              optionLabel,
                              event.target.value
                            )
                          }
                        >
                          <option value="">No route</option>

                          {selectableNextNodes.map((node) => (
                            <option key={node.id} value={node.id}>
                              {node.label || node.node_key}
                            </option>
                          ))}
                        </select>

                        {savingChoiceRoute === optionLabel && (
                          <p className="mt-2 text-xs font-semibold text-blue-600">
                            Saving route...
                          </p>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}

              {selectedNode.node_type === "ai_agent" && (
                <div className="rounded-3xl border border-indigo-100 bg-indigo-50 p-5 space-y-4">
                  <div>
                    <p className="text-xs font-black uppercase tracking-wide text-indigo-500">
                      AI Fallback Route
                    </p>
                    <p className="mt-1 text-sm text-indigo-700">
                      Pilih node tujuan jika AI tidak menemukan jawaban yang cukup baik.
                    </p>
                  </div>

                  <select
                    className="w-full rounded-2xl border border-slate-200 p-3 text-sm bg-white outline-none disabled:opacity-60"
                    value={selectedAiFallbackEdge?.target_node_id || ""}
                    disabled={
                      savingAiFallbackRoute ||
                      selectableNextNodes.length === 0
                    }
                    onChange={(event) =>
                      handleUpdateAiFallbackRoute(event.target.value)
                    }
                  >
                    <option value="">No fallback route</option>

                    {selectableNextNodes.map((node) => (
                      <option key={node.id} value={node.id}>
                        {node.label || node.node_key}
                      </option>
                    ))}
                  </select>

                  {savingAiFallbackRoute && (
                    <p className="text-xs font-semibold text-blue-600">
                      Saving fallback route...
                    </p>
                  )}

                  {selectableNextNodes.length === 0 && (
                    <p className="text-xs font-semibold text-amber-600">
                      Tambahkan node lain seperti Human Handoff atau Message agar fallback bisa dipilih.
                    </p>
                  )}
                </div>
              )}

              <button
                type="button"
                onClick={handleSaveNode}
                disabled={
                  savingNode ||
                  !nodeForm.label.trim() ||
                  !nodeForm.mainText.trim()
                }
                className="h-11 w-full rounded-2xl bg-blue-600 text-white text-sm font-black disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {savingNode ? "Saving Node..." : "Save Node"}
              </button>

              <button
                type="button"
                onClick={handleDeleteSelectedNode}
                disabled={
                  deletingNode ||
                  !selectedNode ||
                  selectedNode.node_type === "start"
                }
                className="h-11 w-full rounded-2xl border border-red-200 bg-red-50 text-red-700 text-sm font-black disabled:opacity-50 disabled:cursor-not-allowed hover:bg-red-100 transition"
              >
                {deletingNode ? "Deleting Node..." : "Delete Node"}
              </button>

              <div className="rounded-3xl border border-blue-100 bg-blue-50 p-5">
                <div className="h-11 w-11 rounded-2xl bg-white text-blue-700 grid place-items-center shadow-sm">
                  <BrainCircuit size={20} />
                </div>

                <h3 className="mt-4 font-black text-slate-950">
                  AI Suggestion
                </h3>

                <p className="mt-2 text-sm leading-6 text-slate-600">
                  Add or connect an AI Agent node after this step when the
                  customer question should be answered from approved knowledge
                  documents.
                </p>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-white p-5">
                <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Raw Config
                </p>

                <pre className="mt-3 max-h-56 overflow-auto rounded-2xl bg-slate-950 p-4 text-xs text-blue-100">
                  {JSON.stringify(selectedNode.config || {}, null, 2)}
                </pre>
              </div>
            </>
          )}
        </div>
      </aside>
    </div>
  );
}