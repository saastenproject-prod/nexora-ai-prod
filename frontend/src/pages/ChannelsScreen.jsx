import { useEffect, useMemo, useState } from "react";

import ChatbotSubnav from "../components/layout/ChatbotSubnav";

import { Bot, MessageCircle, Plus, Workflow } from "../lib/icons";

import { supabase } from "../lib/supabaseClient";
import useAllChatbotsData from "../hooks/useAllChatbotsData";

const DEFAULT_WORKSPACE_ID = "11111111-1111-4111-8111-111111111111";
const WABA_WEBHOOK_URL =
  "https://n8n-n8n.yemz6m.easypanel.host/webhook/waba-webhook";

const emptyForm = {
  id: null,
  workspace_id: DEFAULT_WORKSPACE_ID,
  bot_id: "",
  channel_type: "whatsapp",
  provider: "meta_cloud_api",
  channel_name: "HR Agent WhatsApp",
  phone_number: "",
  phone_number_id: "",
  waba_business_id: "",
  access_token: "",
  verify_token: "nexora_verify_token_123",
  status: "active",
};

export default function ChannelsScreen({ setScreen }) {
  const {
    loading: loadingBots,
    error: botsError,
    workspace,
    chatbots,
    selectBot,
    refetch,
  } = useAllChatbotsData();

  const [connections, setConnections] = useState([]);
  const [loadingConnections, setLoadingConnections] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState("");

  const selectedBot = useMemo(() => {
    return chatbots.find((bot) => bot.id === form.bot_id);
  }, [chatbots, form.bot_id]);

  useEffect(() => {
    loadConnections();
  }, []);

  const formatStatus = (status) => {
    if (!status) return "Unknown";

    return status
      .split("_")
      .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
      .join(" ");
  };

  const getStatusClass = (status) => {
    if (status === "active") return "bg-emerald-50 text-emerald-700";
    if (status === "inactive") return "bg-slate-100 text-slate-600";
    return "bg-slate-100 text-slate-600";
  };

  const maskToken = (token) => {
    if (!token) return "-";
    if (token.length <= 12) return "••••••••";
    return `${token.slice(0, 6)}••••••••${token.slice(-6)}`;
  };

  const handleChange = (field, value) => {
    setForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const resetForm = () => {
    setForm({
      ...emptyForm,
      workspace_id: workspace?.id || DEFAULT_WORKSPACE_ID,
    });
    setError("");
  };

  const loadConnections = async () => {
    setLoadingConnections(true);
    setError("");

    const { data, error } = await supabase
      .from("channel_connections")
      .select("*")
      .eq("channel_type", "whatsapp")
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Failed to load WhatsApp connections:", error);
      setError(`Failed to load WhatsApp connections: ${error.message}`);
      setConnections([]);
    } else {
      setConnections(data || []);
    }

    setLoadingConnections(false);
  };

  const editConnection = (connection) => {
    setForm({
      id: connection.id || null,
      workspace_id:
        connection.workspace_id || workspace?.id || DEFAULT_WORKSPACE_ID,
      bot_id: connection.bot_id || "",
      channel_type: connection.channel_type || "whatsapp",
      provider: connection.provider || "meta_cloud_api",
      channel_name: connection.channel_name || "HR Agent WhatsApp",
      phone_number: connection.phone_number || "",
      phone_number_id: connection.phone_number_id || "",
      waba_business_id: connection.waba_business_id || "",
      access_token: connection.access_token || "",
      verify_token: connection.verify_token || "nexora_verify_token_123",
      status: connection.status || "active",
    });

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const saveConnection = async (event) => {
    event.preventDefault();
    setError("");

    if (!form.bot_id) {
      setError("Pilih Agent / Bot terlebih dahulu.");
      return;
    }

    if (!form.channel_name?.trim()) {
      setError("Channel Name wajib diisi.");
      return;
    }

    if (!form.phone_number?.trim()) {
      setError("WhatsApp Phone Number wajib diisi.");
      return;
    }

    if (!form.phone_number_id?.trim()) {
      setError("Phone Number ID wajib diisi.");
      return;
    }

    if (!form.waba_business_id?.trim()) {
      setError("WABA Business ID wajib diisi.");
      return;
    }

    if (!form.access_token?.trim()) {
      setError("Access Token wajib diisi.");
      return;
    }

    setSaving(true);

    const payload = {
      workspace_id: form.workspace_id || workspace?.id || DEFAULT_WORKSPACE_ID,
      bot_id: form.bot_id,
      channel_type: "whatsapp",
      provider: "meta_cloud_api",
      channel_name: form.channel_name.trim(),
      phone_number: form.phone_number.trim(),
      phone_number_id: form.phone_number_id.trim(),
      waba_business_id: form.waba_business_id.trim(),
      access_token: form.access_token.trim(),
      verify_token: form.verify_token?.trim() || "nexora_verify_token_123",
      status: form.status || "active",
      updated_at: new Date().toISOString(),
    };

    let response;

    if (form.id) {
      response = await supabase
        .from("channel_connections")
        .update(payload)
        .eq("id", form.id)
        .select()
        .single();
    } else {
      response = await supabase
        .from("channel_connections")
        .insert(payload)
        .select()
        .single();
    }

    if (response.error) {
      console.error("Failed to save WhatsApp connection:", response.error);
      setError(`Failed to save WhatsApp connection: ${response.error.message}`);
    } else {
      resetForm();
      await loadConnections();
    }

    setSaving(false);
  };

  const deactivateConnection = async (connectionId) => {
    const confirmed = window.confirm("Nonaktifkan koneksi WhatsApp ini?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("channel_connections")
      .update({
        status: "inactive",
        updated_at: new Date().toISOString(),
      })
      .eq("id", connectionId);

    if (error) {
      console.error("Failed to deactivate WhatsApp connection:", error);
      setError(`Failed to deactivate WhatsApp connection: ${error.message}`);
      return;
    }

    await loadConnections();
  };

  const activateConnection = async (connectionId) => {
    const { error } = await supabase
      .from("channel_connections")
      .update({
        status: "active",
        updated_at: new Date().toISOString(),
      })
      .eq("id", connectionId);

    if (error) {
      console.error("Failed to activate WhatsApp connection:", error);
      setError(`Failed to activate WhatsApp connection: ${error.message}`);
      return;
    }

    await loadConnections();
  };

  const handleManageBot = (botId) => {
    if (selectBot) {
      selectBot(botId);
    }

    setScreen("flows");
  };

  const handleCopyWebhookUrl = async () => {
    try {
      await navigator.clipboard.writeText(WABA_WEBHOOK_URL);
      alert("Webhook URL berhasil disalin.");
    } catch (clipboardError) {
      console.error("Failed to copy webhook URL:", clipboardError);
      alert(WABA_WEBHOOK_URL);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#F6F8FC]">
      <ChatbotSubnav setScreen={setScreen} activeMenu="channels" />

      <main className="ml-64 flex-1 min-w-0">
        <div className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl px-8 h-16 flex items-center justify-between">
          <div>
            <h1 className="font-black text-slate-950">Channels</h1>
            <p className="text-xs text-slate-500 mt-1">
              Connect Nexora agents to external channels such as Meta WhatsApp
              Cloud API.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={loadConnections}
              className="h-10 px-4 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700"
            >
              Refresh Data
            </button>

            <button
              onClick={resetForm}
              className="h-10 px-4 rounded-2xl bg-blue-600 text-white text-sm font-semibold flex items-center gap-2"
            >
              <Plus size={16} />
              New Connection
            </button>
          </div>
        </div>

        <div className="px-8 py-7 space-y-6">
          {(error || botsError) && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
              {error || botsError}
            </div>
          )}

          <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">WhatsApp Connections</p>
              <p className="mt-2 text-3xl font-black text-slate-950">
                {loadingConnections ? "..." : connections.length}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Active Channels</p>
              <p className="mt-2 text-3xl font-black text-slate-950">
                {loadingConnections
                  ? "..."
                  : connections.filter((item) => item.status === "active")
                      .length}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Available Agents</p>
              <p className="mt-2 text-3xl font-black text-slate-950">
                {loadingBots ? "..." : chatbots.length}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Provider</p>
              <p className="mt-2 text-xl font-black text-slate-950">
                Meta WABA
              </p>
            </div>
          </section>

          <section className="grid gap-6 xl:grid-cols-[1.45fr_0.85fr]">
            <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-xl font-black text-slate-950">
                  WhatsApp / WABA Connection
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Choose an agent and configure the Meta WhatsApp Cloud API
                  channel.
                </p>
              </div>

              <form onSubmit={saveConnection} className="p-6 space-y-5">
                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Agent / Bot
                  </label>
                  <select
                    value={form.bot_id}
                    onChange={(event) =>
                      handleChange("bot_id", event.target.value)
                    }
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  >
                    <option value="">Pilih Agent</option>
                    {chatbots.map((bot) => (
                      <option key={bot.id} value={bot.id}>
                        {bot.name || bot.bot_name || bot.ai_name || bot.id}
                      </option>
                    ))}
                  </select>

                  {selectedBot && (
                    <div className="mt-3 rounded-2xl bg-blue-50 px-4 py-3">
                      <p className="text-sm font-black text-blue-800">
                        {selectedBot.name ||
                          selectedBot.bot_name ||
                          selectedBot.ai_name}
                      </p>
                      <p className="mt-1 text-xs font-semibold text-blue-700 break-all">
                        Bot ID: {selectedBot.id}
                      </p>
                    </div>
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Channel Name
                    </label>
                    <input
                      value={form.channel_name}
                      onChange={(event) =>
                        handleChange("channel_name", event.target.value)
                      }
                      placeholder="HR Agent WhatsApp"
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Status
                    </label>
                    <select
                      value={form.status}
                      onChange={(event) =>
                        handleChange("status", event.target.value)
                      }
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                    >
                      <option value="active">Active</option>
                      <option value="inactive">Inactive</option>
                    </select>
                  </div>
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      WhatsApp Phone Number
                    </label>
                    <input
                      value={form.phone_number}
                      onChange={(event) =>
                        handleChange("phone_number", event.target.value)
                      }
                      placeholder="6285283137126"
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                    />
                    <p className="mt-2 text-xs font-semibold text-slate-500">
                      Use country code format without plus sign.
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-bold text-slate-700 mb-2">
                      Phone Number ID
                    </label>
                    <input
                      value={form.phone_number_id}
                      onChange={(event) =>
                        handleChange("phone_number_id", event.target.value)
                      }
                      placeholder="Meta Phone Number ID"
                      className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    WABA Business ID
                  </label>
                  <input
                    value={form.waba_business_id}
                    onChange={(event) =>
                      handleChange("waba_business_id", event.target.value)
                    }
                    placeholder="WhatsApp Business Account ID"
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  />
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Access Token
                  </label>
                  <textarea
                    value={form.access_token}
                    onChange={(event) =>
                      handleChange("access_token", event.target.value)
                    }
                    placeholder="Meta Cloud API access token"
                    rows={4}
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  />
                  <p className="mt-2 text-xs font-semibold text-amber-600">
                    For POC this can be stored in Supabase. For production,
                    encrypt the token or store it as a secret.
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-bold text-slate-700 mb-2">
                    Verify Token
                  </label>
                  <input
                    value={form.verify_token}
                    onChange={(event) =>
                      handleChange("verify_token", event.target.value)
                    }
                    placeholder="nexora_verify_token_123"
                    className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50"
                  />
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-black text-slate-800">
                        Meta Webhook URL
                      </p>
                      <p className="mt-1 text-xs font-semibold text-slate-500">
                        Use this URL in Meta Developer App webhook
                        configuration.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleCopyWebhookUrl}
                      className="h-9 px-3 rounded-2xl border border-slate-200 bg-white text-xs font-bold text-slate-700"
                    >
                      Copy
                    </button>
                  </div>

                  <code className="mt-4 block break-all rounded-2xl bg-white px-4 py-3 text-xs font-semibold text-slate-700">
                    {WABA_WEBHOOK_URL}
                  </code>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="submit"
                    disabled={saving}
                    className="h-10 px-5 rounded-2xl bg-blue-600 text-white text-sm font-semibold disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {saving
                      ? "Saving..."
                      : form.id
                      ? "Update Connection"
                      : "Save Connection"}
                  </button>

                  <button
                    type="button"
                    onClick={resetForm}
                    className="h-10 px-5 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700"
                  >
                    Reset
                  </button>
                </div>
              </form>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
              <div className="p-6 border-b border-slate-200">
                <h2 className="text-xl font-black text-slate-950">
                  Current Architecture
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Nexora UI uses n8n as the backend connector for this POC.
                </p>
              </div>

              <div className="p-6 space-y-3">
                {[
                  "WhatsApp User",
                  "Meta WABA Webhook",
                  "n8n WABA Connector",
                  "Nexora AI Reply + Pinecone",
                  "WhatsApp Reply",
                ].map((item, index, list) => (
                  <div key={item}>
                    <div className="rounded-3xl bg-slate-50 px-5 py-4 text-sm font-bold text-slate-700">
                      {item}
                    </div>
                    {index < list.length - 1 && (
                      <div className="py-2 text-center text-slate-300">↓</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  WhatsApp Connections
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Manage saved WhatsApp channel mappings from Nexora to agents.
                </p>
              </div>

              <button
                onClick={loadConnections}
                className="h-10 px-4 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700"
              >
                Refresh
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {loadingConnections && (
                <div className="p-8 text-sm font-semibold text-slate-500">
                  Loading WhatsApp connections from Supabase...
                </div>
              )}

              {!loadingConnections && connections.length === 0 && (
                <div className="p-8 text-sm font-semibold text-slate-500">
                  No WhatsApp connection found. Create your first connection to
                  map WABA to an agent.
                </div>
              )}

              {!loadingConnections &&
                connections.map((connection) => {
                  const relatedBot = chatbots.find(
                    (bot) => bot.id === connection.bot_id
                  );

                  return (
                    <div
                      key={connection.id}
                      className="p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-5 hover:bg-slate-50 transition"
                    >
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-700 grid place-items-center shrink-0">
                          <MessageCircle size={22} />
                        </div>

                        <div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <button
                              onClick={() => handleManageBot(connection.bot_id)}
                              className="text-base font-black text-slate-950 hover:text-blue-700"
                            >
                              {connection.channel_name || "WhatsApp Channel"}
                            </button>

                            <span
                              className={`rounded-full px-3 py-1 text-[11px] font-bold ${getStatusClass(
                                connection.status
                              )}`}
                            >
                              {formatStatus(connection.status)}
                            </span>

                            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">
                              {connection.provider || "meta_cloud_api"}
                            </span>
                          </div>

                          <p className="mt-2 text-sm text-slate-500 leading-6 max-w-3xl">
                            Connected to{" "}
                            <span className="font-bold text-slate-700">
                              {relatedBot?.name ||
                                relatedBot?.bot_name ||
                                relatedBot?.ai_name ||
                                "Unknown Agent"}
                            </span>
                            . Incoming WhatsApp messages for this Phone Number
                            ID will be routed to this agent.
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700">
                              WhatsApp · {connection.phone_number || "-"}
                            </span>

                            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                              Phone ID · {connection.phone_number_id || "-"}
                            </span>

                            <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-600">
                              Token · {maskToken(connection.access_token)}
                            </span>
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3 xl:w-[270px]">
                        <div className="rounded-2xl border border-slate-200 bg-white p-3">
                          <div className="flex items-center gap-2 text-slate-500">
                            <Bot size={15} />
                            <span className="text-xs font-bold">Agent</span>
                          </div>
                          <p className="mt-2 text-xs font-black text-slate-950 truncate">
                            {relatedBot?.name ||
                              relatedBot?.bot_name ||
                              relatedBot?.ai_name ||
                              "Unknown"}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-3">
                          <div className="flex items-center gap-2 text-slate-500">
                            <Workflow size={15} />
                            <span className="text-xs font-bold">Routing</span>
                          </div>
                          <p className="mt-2 text-xs font-black text-slate-950">
                            WABA → Agent
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 xl:justify-end">
                        <button
                          onClick={() => editConnection(connection)}
                          className="h-10 px-4 rounded-2xl bg-blue-600 text-white text-sm font-semibold"
                        >
                          Edit
                        </button>

                        {connection.status === "active" ? (
                          <button
                            onClick={() => deactivateConnection(connection.id)}
                            className="h-10 px-4 rounded-2xl border border-red-200 bg-white text-sm font-semibold text-red-600"
                          >
                            Disable
                          </button>
                        ) : (
                          <button
                            onClick={() => activateConnection(connection.id)}
                            className="h-10 px-4 rounded-2xl border border-emerald-200 bg-white text-sm font-semibold text-emerald-700"
                          >
                            Activate
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}
