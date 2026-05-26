import { useState } from "react";
import ChatbotSubnav from "../components/layout/ChatbotSubnav";

import {
  Headphones,
  MessageCircle,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Workflow,
} from "../lib/icons";

import useFlowsData from "../hooks/useFlowsData";

const SELECTED_FLOW_KEY = "nexora_selected_flow_id";

const DEFAULT_CREATE_FLOW_FORM = {
  name: "",
  description: "",
  status: "draft",
  isDefault: false,
};

export default function FlowsScreen({ setScreen }) {
  const {
    loading,
    creatingFlow,
    error,
    activeBot,
    channels,
    flows,
    defaultFlow,
    widgetSetting,
    createFlow,
    refetch,
  } = useFlowsData();

  const [showCreateFlowModal, setShowCreateFlowModal] = useState(false);
  const [createFlowForm, setCreateFlowForm] = useState(
    DEFAULT_CREATE_FLOW_FORM
  );
  const [createFlowError, setCreateFlowError] = useState("");

  const publishedFlows = flows.filter((flow) => flow.status === "published");
  const draftFlows = flows.filter((flow) => flow.status === "draft");

  const activeChannels = channels.filter(
    (channel) => channel.status === "active"
  );

  const channelLabel =
    activeChannels.length > 0
      ? activeChannels
          .map((channel) => {
            if (channel.channel_type === "website") return "Website";
            if (channel.channel_type === "whatsapp") return "WhatsApp";
            return channel.channel_type;
          })
          .join(" / ")
      : "No active channel";

  const botMessagesEstimate = flows.reduce(
    (total, flow) => total + (flow.total_nodes || 0),
    0
  );

  const flowStats = [
    {
      label: "Published Flows",
      value: loading ? "..." : publishedFlows.length,
      icon: Workflow,
    },
    {
      label: "Draft Flows",
      value: loading ? "..." : draftFlows.length,
      icon: Pencil,
    },
    {
      label: "Bot Nodes",
      value: loading ? "..." : botMessagesEstimate,
      icon: MessageCircle,
    },
    {
      label: "Widget",
      value: loading ? "..." : widgetSetting?.is_active ? "Active" : "Inactive",
      icon: Headphones,
    },
  ];

  const formatStatus = (status) => {
    if (!status) return "Unknown";
    return status.charAt(0).toUpperCase() + status.slice(1);
  };

  const formatDate = (value) => {
    if (!value) return "-";

    return new Date(value).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const updateCreateFlowForm = (field, value) => {
    setCreateFlowError("");

    setCreateFlowForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const openCreateFlowModal = () => {
    setCreateFlowError("");
    setCreateFlowForm({
      ...DEFAULT_CREATE_FLOW_FORM,
      name: activeBot?.name ? `${activeBot.name} New Flow` : "",
      isDefault: flows.length === 0,
    });
    setShowCreateFlowModal(true);
  };

  const closeCreateFlowModal = () => {
    if (creatingFlow) return;

    setShowCreateFlowModal(false);
    setCreateFlowError("");
    setCreateFlowForm(DEFAULT_CREATE_FLOW_FORM);
  };

  const openBuilderWithFlow = (flowId) => {
    if (flowId) {
      localStorage.setItem(SELECTED_FLOW_KEY, flowId);

      window.dispatchEvent(
        new CustomEvent("nexora:flow-selected", {
          detail: {
            flowId,
          },
        })
      );
    } else {
      localStorage.removeItem(SELECTED_FLOW_KEY);
    }

    setScreen("builder");
  };

  const openDefaultFlowBuilder = () => {
    if (defaultFlow?.id) {
      openBuilderWithFlow(defaultFlow.id);
      return;
    }

    localStorage.removeItem(SELECTED_FLOW_KEY);
    setScreen("builder");
  };

  const handleCreateFlow = async (event) => {
    event.preventDefault();

    setCreateFlowError("");

    if (!createFlowForm.name.trim()) {
      setCreateFlowError("Flow name wajib diisi.");
      return;
    }

    try {
      const createdFlow = await createFlow({
        name: createFlowForm.name,
        description: createFlowForm.description,
        status: createFlowForm.status,
        isDefault: createFlowForm.isDefault,
      });

      closeCreateFlowModal();

      if (createdFlow?.id) {
        openBuilderWithFlow(createdFlow.id);
      }
    } catch (err) {
      console.error(err);
      setCreateFlowError(err?.message || "Failed to create flow.");
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F6F8FC]">
      <ChatbotSubnav setScreen={setScreen} activeMenu="flows" />

      <main className="flex-1 min-w-0">
        <div className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl px-8 h-16 flex items-center justify-between">
          <div>
            <h1 className="font-black text-slate-950">Chat Flows</h1>
            <p className="text-xs text-slate-500 mt-1">
              Design automated journeys for customer conversations.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={refetch}
              className="h-10 px-4 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700"
            >
              Refresh Data
            </button>

            <button
              type="button"
              className="h-10 px-4 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700"
            >
              Import Flow
            </button>

            <button
              type="button"
              onClick={openCreateFlowModal}
              className="h-10 px-4 rounded-2xl bg-blue-600 text-white text-sm font-semibold flex items-center gap-2"
            >
              <Plus size={16} /> Create New Flow
            </button>
          </div>
        </div>

        <div className="px-8 py-7 space-y-6">
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <section className="grid xl:grid-cols-[1fr_340px] gap-5">
            <div className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-8 shadow-xl">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.45),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(20,184,166,0.30),transparent_32%)]" />

              <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-blue-50 mb-5">
                    <MessageCircle size={16} />
                    {activeBot?.name || "Loading bot..."}
                  </div>

                  <h2 className="text-4xl font-black tracking-tight text-white">
                    Build and manage conversation flows.
                  </h2>

                  <p className="mt-3 max-w-2xl text-blue-100 leading-7">
                    Create branching flows, collect customer information,
                    trigger AI responses, and route complex conversations to
                    agents.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={openDefaultFlowBuilder}
                  className="h-12 px-6 rounded-2xl bg-white text-slate-950 font-bold shadow-lg hover:bg-blue-50 transition"
                >
                  Open Visual Builder
                </button>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="font-black text-slate-950">Default Flow</p>

              <p className="mt-2 text-sm text-slate-500 leading-6">
                This flow will respond first when customers start a conversation.
              </p>

              <div className="mt-5 rounded-2xl bg-blue-50 border border-blue-100 p-4">
                <p className="text-sm font-bold text-slate-950">
                  {loading
                    ? "Loading..."
                    : defaultFlow?.name || "No default flow"}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {loading
                    ? "Loading flow data..."
                    : defaultFlow
                    ? `${defaultFlow.total_nodes} nodes · ${channelLabel}`
                    : "Please set a default flow"}
                </p>
              </div>

              <button
                type="button"
                onClick={openDefaultFlowBuilder}
                disabled={!defaultFlow}
                className="mt-5 h-11 w-full rounded-2xl bg-slate-950 text-white text-sm font-semibold disabled:opacity-60 disabled:cursor-not-allowed"
              >
                Edit Default Flow
              </button>
            </div>
          </section>

          <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
            {flowStats.map((item) => {
              const Icon = item.icon;

              return (
                <div
                  key={item.label}
                  className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-500">{item.label}</p>
                      <p className="mt-2 text-3xl font-black text-slate-950">
                        {item.value}
                      </p>
                    </div>

                    <div className="h-11 w-11 rounded-2xl bg-blue-50 text-blue-700 grid place-items-center">
                      <Icon size={20} />
                    </div>
                  </div>
                </div>
              );
            })}
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  Flow Library
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Search, edit, publish, or duplicate your chatbot flows.
                </p>
              </div>

              <div className="flex gap-3">
                <div className="h-11 w-72 rounded-2xl border border-slate-200 bg-slate-50 px-4 flex items-center gap-2 text-sm text-slate-400">
                  <Search size={16} /> Search flow by name
                </div>

                <button
                  type="button"
                  className="h-11 px-4 rounded-2xl border border-slate-200 bg-white text-sm font-semibold"
                >
                  Filter
                </button>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {loading && (
                <div className="p-8 text-sm font-semibold text-slate-500">
                  Loading flows from Supabase...
                </div>
              )}

              {!loading && flows.length === 0 && (
                <div className="p-8 text-sm font-semibold text-slate-500">
                  No flow found. Create your first flow to get started.
                </div>
              )}

              {!loading &&
                flows.map((flow) => (
                  <div
                    key={flow.id}
                    className="p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-5 hover:bg-slate-50 transition"
                  >
                    <div className="flex items-start gap-4">
                      <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-700 grid place-items-center shrink-0">
                        <Workflow size={21} />
                      </div>

                      <div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <button
                            type="button"
                            onClick={() => openBuilderWithFlow(flow.id)}
                            className="text-base font-black text-slate-950 hover:text-blue-700"
                          >
                            {flow.name}
                          </button>

                          {flow.is_default && (
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-bold text-emerald-700">
                              Default
                            </span>
                          )}

                          <span
                            className={`rounded-full px-3 py-1 text-[11px] font-bold ${
                              flow.status === "published"
                                ? "bg-emerald-50 text-emerald-700"
                                : flow.status === "draft"
                                ? "bg-amber-50 text-amber-700"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {formatStatus(flow.status)}
                          </span>
                        </div>

                        <p className="mt-2 text-sm text-slate-500">
                          {flow.total_nodes} nodes · {flow.total_edges} edges ·
                          Created {formatDate(flow.created_at)} · Modified{" "}
                          {formatDate(flow.updated_at)}
                        </p>

                        {flow.description && (
                          <p className="mt-2 text-sm text-slate-500 leading-6 max-w-3xl">
                            {flow.description}
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 xl:justify-end">
                      <button
                        type="button"
                        className="h-10 px-4 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700"
                      >
                        Preview
                      </button>

                      <button
                        type="button"
                        onClick={() => openBuilderWithFlow(flow.id)}
                        className="h-10 px-4 rounded-2xl bg-blue-600 text-white text-sm font-semibold"
                      >
                        Edit Flow
                      </button>

                      <button
                        type="button"
                        className="h-10 w-10 rounded-2xl border border-slate-200 bg-white text-slate-500 grid place-items-center"
                      >
                        <MoreHorizontal size={18} />
                      </button>
                    </div>
                  </div>
                ))}
            </div>
          </section>
        </div>
      </main>

      {showCreateFlowModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/40 backdrop-blur-sm grid place-items-center px-4">
          <form
            onSubmit={handleCreateFlow}
            className="w-full max-w-xl rounded-[2rem] bg-white border border-slate-200 shadow-2xl overflow-hidden"
          >
            <div className="p-6 border-b border-slate-200">
              <p className="text-xs font-black text-blue-700 uppercase">
                Create Flow
              </p>
              <h3 className="mt-1 text-2xl font-black text-slate-950">
                Create a new conversation flow
              </h3>
              <p className="mt-2 text-sm leading-6 text-slate-500">
                This will create a starter flow with Start and Welcome Message
                nodes for the selected bot.
              </p>
            </div>

            <div className="p-6 space-y-5">
              {createFlowError && (
                <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                  {createFlowError}
                </div>
              )}

              <label className="block">
                <span className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Flow Name
                </span>
                <input
                  value={createFlowForm.name}
                  onChange={(event) =>
                    updateCreateFlowForm("name", event.target.value)
                  }
                  placeholder="Customer Support Main Flow"
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400"
                />
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Description
                </span>
                <textarea
                  value={createFlowForm.description}
                  onChange={(event) =>
                    updateCreateFlowForm("description", event.target.value)
                  }
                  placeholder="Describe what this flow will handle..."
                  className="mt-2 h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none resize-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400"
                />
              </label>

              <div className="grid sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-400">
                    Status
                  </span>
                  <select
                    value={createFlowForm.status}
                    onChange={(event) =>
                      updateCreateFlowForm("status", event.target.value)
                    }
                    className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none"
                  >
                    <option value="draft">Draft</option>
                    <option value="published">Published</option>
                  </select>
                </label>

                <label className="mt-7 flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-4 h-12 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createFlowForm.isDefault}
                    onChange={(event) =>
                      updateCreateFlowForm("isDefault", event.target.checked)
                    }
                    className="h-4 w-4"
                  />
                  <span className="text-sm font-bold text-slate-700">
                    Set as default flow
                  </span>
                </label>
              </div>

              <div className="rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-800">
                The new flow will be created for{" "}
                <span className="font-black">
                  {activeBot?.name || "selected bot"}
                </span>{" "}
                and opened in Visual Builder after creation.
              </div>
            </div>

            <div className="p-6 border-t border-slate-200 flex justify-end gap-3">
              <button
                type="button"
                onClick={closeCreateFlowModal}
                disabled={creatingFlow}
                className="h-11 px-5 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700 disabled:opacity-60"
              >
                Cancel
              </button>

              <button
                type="submit"
                disabled={creatingFlow || !createFlowForm.name.trim()}
                className="h-11 px-5 rounded-2xl bg-blue-600 text-white text-sm font-black disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {creatingFlow ? "Creating..." : "Create Flow"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}