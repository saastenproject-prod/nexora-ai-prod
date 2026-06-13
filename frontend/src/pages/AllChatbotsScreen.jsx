import ChatbotSubnav from "../components/layout/ChatbotSubnav";

import { Bot, MessageCircle, Plus, Workflow } from "../lib/icons";

import useAllChatbotsData from "../hooks/useAllChatbotsData";

export default function AllChatbotsScreen({ setScreen }) {
  const { loading, error, workspace, chatbots, selectBot, refetch } =
    useAllChatbotsData();

  const formatStatus = (status) => {
    if (!status) return "Unknown";

    return status
      .split("_")
      .map((item) => item.charAt(0).toUpperCase() + item.slice(1))
      .join(" ");
  };

  const formatChannel = (channelType) => {
    if (channelType === "website") return "Website";
    if (channelType === "whatsapp") return "WhatsApp";
    return channelType || "-";
  };

  const getStatusClass = (status) => {
    if (status === "active") return "bg-emerald-50 text-emerald-700";
    if (status === "draft") return "bg-amber-50 text-amber-700";
    if (status === "inactive") return "bg-slate-100 text-slate-600";
    return "bg-slate-100 text-slate-600";
  };

  const handleManageBot = (botId) => {
    selectBot(botId);
    setScreen("flows");
  };

  return (
    <div className="flex min-h-screen bg-[#F6F8FC]">
      <ChatbotSubnav setScreen={setScreen} activeMenu="all-chatbots" />

      <main className="ml-64 flex-1 min-w-0">
        <div className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl px-8 h-16 flex items-center justify-between">
          <div>
            <h1 className="font-black text-slate-950">All Chatbots</h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage all bots in {workspace?.name || "your workspace"}.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              onClick={refetch}
              className="h-10 px-4 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700"
            >
              Refresh Data
            </button>

            <button
              onClick={() => setScreen("agent-marketplace")}
              className="h-10 px-4 rounded-2xl bg-blue-600 text-white text-sm font-semibold flex items-center gap-2"
            >
              <Plus size={16} />
              Create New Bot
            </button>
          </div>
        </div>

        <div className="px-8 py-7 space-y-6">
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Total Bots</p>
              <p className="mt-2 text-3xl font-black text-slate-950">
                {loading ? "..." : chatbots.length}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Active Bots</p>
              <p className="mt-2 text-3xl font-black text-slate-950">
                {loading
                  ? "..."
                  : chatbots.filter((bot) => bot.status === "active").length}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Total Conversations</p>
              <p className="mt-2 text-3xl font-black text-slate-950">
                {loading
                  ? "..."
                  : chatbots.reduce(
                      (sum, bot) => sum + Number(bot.total_conversations || 0),
                      0
                    )}
              </p>
            </div>

            <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
              <p className="text-sm text-slate-500">Need Response</p>
              <p className="mt-2 text-3xl font-black text-slate-950">
                {loading
                  ? "..."
                  : chatbots.reduce(
                      (sum, bot) => sum + Number(bot.need_response || 0),
                      0
                    )}
              </p>
            </div>
          </section>

          <section className="rounded-[2rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  Chatbot Library
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  Select a bot to manage flows, knowledge, widget, and inbox.
                </p>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {loading && (
                <div className="p-8 text-sm font-semibold text-slate-500">
                  Loading chatbots from Supabase...
                </div>
              )}

              {!loading && chatbots.length === 0 && (
                <div className="p-8 text-sm font-semibold text-slate-500">
                  No chatbot found. Create your first bot to get started.
                </div>
              )}

              {!loading &&
                chatbots.map((bot) => {
                  const primaryChannel = bot.channels?.[0];

                  return (
                    <div
                      key={bot.id}
                      className="p-5 flex flex-col xl:flex-row xl:items-center justify-between gap-5 hover:bg-slate-50 transition"
                    >
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-700 grid place-items-center shrink-0">
                          <Bot size={22} />
                        </div>

                        <div>
                          <div className="flex items-center gap-3 flex-wrap">
                            <button
                              onClick={() => handleManageBot(bot.id)}
                              className="text-base font-black text-slate-950 hover:text-blue-700"
                            >
                              {bot.name}
                            </button>

                            <span
                              className={`rounded-full px-3 py-1 text-[11px] font-bold ${getStatusClass(
                                bot.status
                              )}`}
                            >
                              {formatStatus(bot.status)}
                            </span>

                            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-bold text-slate-600">
                              {bot.bot_type || "bot"}
                            </span>
                          </div>

                          <p className="mt-2 text-sm text-slate-500 leading-6 max-w-3xl">
                            {bot.description || "No description configured."}
                          </p>

                          <div className="mt-3 flex flex-wrap gap-2">
                            {bot.channels?.length > 0 ? (
                              bot.channels.map((channel) => (
                                <span
                                  key={channel.id}
                                  className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-blue-700"
                                >
                                  {formatChannel(channel.channel_type)} ·{" "}
                                  {formatStatus(channel.status)}
                                </span>
                              ))
                            ) : (
                              <span className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-bold text-slate-500">
                                No channel
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-3 xl:w-[360px]">
                        <div className="rounded-2xl border border-slate-200 bg-white p-3">
                          <div className="flex items-center gap-2 text-slate-500">
                            <Workflow size={15} />
                            <span className="text-xs font-bold">Flows</span>
                          </div>
                          <p className="mt-2 text-xl font-black text-slate-950">
                            {bot.total_flows}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-3">
                          <div className="flex items-center gap-2 text-slate-500">
                            <MessageCircle size={15} />
                            <span className="text-xs font-bold">Chats</span>
                          </div>
                          <p className="mt-2 text-xl font-black text-slate-950">
                            {bot.total_conversations}
                          </p>
                        </div>

                        <div className="rounded-2xl border border-slate-200 bg-white p-3">
                          <p className="text-xs font-bold text-slate-500">
                            Need Reply
                          </p>
                          <p className="mt-2 text-xl font-black text-slate-950">
                            {bot.need_response}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-3 xl:justify-end">
                        <button
                          onClick={() => handleManageBot(bot.id)}
                          className="h-10 px-4 rounded-2xl bg-blue-600 text-white text-sm font-semibold"
                        >
                          Manage Bot
                        </button>

                        <button
                          onClick={() => {
                            selectBot(bot.id);
                            setScreen("builder");
                          }}
                          className="h-10 px-4 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700"
                        >
                          Open Builder
                        </button>
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
