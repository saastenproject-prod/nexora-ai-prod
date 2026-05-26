import { useState } from "react";
import { BrainCircuit, Search } from "../lib/icons";
import useInboxData from "../hooks/useInboxData";
import useCreateTestConversation from "../hooks/useCreateTestConversation";

export default function InboxScreen() {
  const {
  loading,
  messagesLoading,
  error,
  activeBot,
  conversations,
  selectedConversation,
  selectedConversationId,
  messages,
  selectConversation,
  updateConversationStatus,
  sendAgentReply,
  refetch,
} = useInboxData();

const {
  loading: creatingTestConversation,
  error: createTestConversationError,
  createTestConversation,
} = useCreateTestConversation();

  const [activeFilter, setActiveFilter] = useState("all");
  const [searchKeyword, setSearchKeyword] = useState("");

  const [replyText, setReplyText] = useState("");
  const [sendingReply, setSendingReply] = useState(false);

  const formatStatus = (status) => {
    if (!status) return "Unknown";

    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const handleCreateTestConversation = async () => {
  try {
    await createTestConversation();
    await refetch();
  } catch (err) {
    // Error sudah ditampilkan dari hook.
  }
};

  const formatChannel = (channel) => {
    if (!channel) return "-";
    if (channel === "whatsapp") return "WhatsApp";
    if (channel === "website") return "Website";
    return channel.charAt(0).toUpperCase() + channel.slice(1);
  };

  const formatTime = (value) => {
    if (!value) return "-";

    const date = new Date(value);

    return date.toLocaleTimeString("id-ID", {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getRelativeTime = (value) => {
    if (!value) return "-";

    const date = new Date(value);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.max(1, Math.floor(diffMs / 60000));

    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    return `${diffDays}d ago`;
  };

  const getStatusClass = (status) => {
    if (status === "open") return "bg-emerald-50 text-emerald-700";
    if (status === "assigned") return "bg-blue-50 text-blue-700";
    if (status === "waiting_customer") return "bg-amber-50 text-amber-700";
    if (status === "resolved") return "bg-slate-100 text-slate-600";
    if (status === "closed") return "bg-slate-100 text-slate-500";

    return "bg-slate-100 text-slate-600";
  };

 const filteredConversations = conversations.filter((conversation) => {
  const matchStatus =
    activeFilter === "all" || conversation.status === activeFilter;

  const keyword = searchKeyword.trim().toLowerCase();

  const searchableText = [
    conversation.customer_name,
    conversation.customer_email,
    conversation.customer_phone,
    conversation.channel_type,
    conversation.status,
    conversation.priority,
    conversation.last_message,
    conversation.metadata?.intent,
    conversation.metadata?.customer_intent,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  const matchSearch = !keyword || searchableText.includes(keyword);

  return matchStatus && matchSearch;
});

  const selectedInitial =
    selectedConversation?.customer_name?.charAt(0)?.toUpperCase() || "?";

  const selectedSummary =
    selectedConversation?.metadata?.intent === "product_inquiry"
      ? "Customer is asking about chatbot product capability and pricing. Recommended next step: explain available channels, handoff capability, and offer a demo."
      : selectedConversation?.metadata?.intent === "integration_question"
      ? "Customer is asking about WhatsApp and CRM integration. Recommended next step: confirm current CRM platform and integration objective."
      : selectedConversation?.metadata?.customer_intent ||
        "No AI summary available yet. This will be generated after AI processing is connected.";

  const assignedLabel = selectedConversation?.assigned_to
    ? "Assigned"
    : "Unassigned";

    const handleSendReply = async () => {
  if (!selectedConversation) return;

  setSendingReply(true);

  try {
    await sendAgentReply(selectedConversation.id, replyText);
    setReplyText("");
  } catch (err) {
    // error sudah di-handle dari hook
  } finally {
    setSendingReply(false);
  }
};

  return (
    <div className="min-h-screen bg-[#F6F8FC] flex">
      <main className="flex-1 min-w-0 flex flex-col h-screen">
        <div className="h-16 shrink-0 border-b border-slate-200 bg-white/90 backdrop-blur-xl px-8 flex items-center justify-between">
          <div>
            <h1 className="font-black text-slate-950">Inbox</h1>
            <p className="text-xs text-slate-500 mt-1">
              Manage live conversations, bot handoff, and agent replies.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={refetch}
              className="h-10 px-4 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700"
            >
              Refresh
            </button>

            <button
            onClick={handleCreateTestConversation}
            disabled={creatingTestConversation}
            className="h-10 px-4 rounded-2xl bg-blue-600 text-white text-sm font-bold disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {creatingTestConversation ? "Creating..." : "Create Test Conversation"}
          </button>
          </div>
        </div>

        {error && (
          <div className="mx-5 mt-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {createTestConversationError && (
          <div className="mx-5 mt-4 rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
            {createTestConversationError}
          </div>
        )}

        <div className="flex-1 min-h-0 grid grid-cols-[380px_1fr_340px]">
          <aside className="border-r border-slate-200 bg-white flex flex-col min-h-0">
            <div className="p-5 border-b border-slate-200">
             <div className="h-11 rounded-2xl border border-slate-200 bg-slate-50 px-4 flex items-center gap-2 text-sm text-slate-500 focus-within:ring-4 focus-within:ring-blue-100 focus-within:border-blue-400">
                <Search size={16} className="shrink-0 text-slate-400" />

                <input
                  value={searchKeyword}
                  onChange={(event) => setSearchKeyword(event.target.value)}
                  placeholder="Search conversations"
                  className="w-full bg-transparent outline-none text-sm text-slate-700 placeholder:text-slate-400"
                />

                {searchKeyword && (
                  <button
                    type="button"
                    onClick={() => setSearchKeyword("")}
                    className="text-xs font-bold text-slate-400 hover:text-slate-700"
                  >
                    Clear
                  </button>
                )}
              </div>

              <div className="mt-4 flex gap-2">
                {[
                  { label: "All", value: "all" },
                  { label: "Open", value: "open" },
                  { label: "Assigned", value: "assigned" },
                  { label: "Resolved", value: "resolved" },
                ].map((item) => (
                  <button
                    key={item.value}
                    onClick={() => setActiveFilter(item.value)}
                    className={`h-9 px-3 rounded-xl text-xs font-bold ${
                      activeFilter === item.value
                        ? "bg-blue-600 text-white"
                        : "bg-slate-100 text-slate-600"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              <div className="mt-3 text-[11px] font-semibold text-slate-400">
                Showing {filteredConversations.length} of {conversations.length} conversations
              </div>
            </div>

            <div className="overflow-y-auto flex-1 divide-y divide-slate-100">
              {loading && (
                <div className="p-5 text-sm font-semibold text-slate-500">
                  Loading conversations...
                </div>
              )}

              {!loading && filteredConversations.length === 0 && (
                <div className="p-5 text-sm font-semibold text-slate-500">
                  No conversations found.
                </div>
              )}

              {!loading &&
                filteredConversations.map((conversation) => {
                  const active = conversation.id === selectedConversationId;
                  const initial =
                    conversation.customer_name?.charAt(0)?.toUpperCase() ||
                    "?";

                  return (
                    <button
                      key={conversation.id}
                      onClick={() => selectConversation(conversation.id)}
                      className={`w-full text-left p-5 hover:bg-slate-50 transition ${
                        active ? "bg-blue-50/70" : "bg-white"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-center gap-3">
                          <div className="h-11 w-11 rounded-2xl bg-slate-950 text-white grid place-items-center font-black">
                            {initial}
                          </div>

                          <div>
                            <p className="font-black text-slate-950 text-sm">
                              {conversation.customer_name || "Unknown Customer"}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {formatChannel(conversation.channel_type)}
                            </p>
                          </div>
                        </div>

                        <span className="text-[11px] text-slate-400 font-semibold">
                          {getRelativeTime(conversation.last_message_at)}
                        </span>
                      </div>

                      <p className="mt-4 text-sm text-slate-500 leading-6 line-clamp-2">
                        {conversation.last_message || "No message yet."}
                      </p>

                      <div className="mt-4 flex items-center justify-between">
                        <span
                          className={`rounded-full px-3 py-1 text-[11px] font-bold ${getStatusClass(
                            conversation.status
                          )}`}
                        >
                          {formatStatus(conversation.status)}
                        </span>

                        <span className="text-[11px] font-bold text-slate-400 capitalize">
                          Priority: {conversation.priority || "normal"}
                        </span>
                      </div>
                    </button>
                  );
                })}
            </div>
          </aside>

          <section className="flex flex-col min-h-0 bg-slate-50">
            {!selectedConversation && (
              <div className="flex-1 grid place-items-center p-8">
                <div className="text-center">
                  <p className="text-lg font-black text-slate-950">
                    No conversation selected
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Select a conversation from the left panel.
                  </p>
                </div>
              </div>
            )}

            {selectedConversation && (
              <>
                <div className="h-20 shrink-0 border-b border-slate-200 bg-white px-6 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="h-12 w-12 rounded-2xl bg-slate-950 text-white grid place-items-center font-black">
                      {selectedInitial}
                    </div>

                    <div>
                      <h2 className="font-black text-slate-950">
                        {selectedConversation.customer_name ||
                          "Unknown Customer"}
                      </h2>
                      <p className="text-xs text-slate-500 mt-1">
                        {formatChannel(selectedConversation.channel_type)} ·{" "}
                        {formatStatus(selectedConversation.status)} ·{" "}
                        {activeBot?.name || "Bot"}
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={() =>
                        updateConversationStatus(
                          selectedConversation.id,
                          "assigned"
                        )
                      }
                      className="h-10 px-4 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700"
                    >
                      Assign
                    </button>

                    <button
                      onClick={() =>
                        updateConversationStatus(
                          selectedConversation.id,
                          "resolved"
                        )
                      }
                      className="h-10 px-4 rounded-2xl bg-emerald-600 text-white text-sm font-bold"
                    >
                      Resolve
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-5">
                  <div className="mx-auto w-fit rounded-full bg-white border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-500 shadow-sm">
                    Today
                  </div>

                  {messagesLoading && (
                    <div className="text-sm font-semibold text-slate-500 text-center">
                      Loading messages...
                    </div>
                  )}

                  {!messagesLoading && messages.length === 0 && (
                    <div className="text-sm font-semibold text-slate-500 text-center">
                      No messages found.
                    </div>
                  )}

                  {!messagesLoading &&
                    messages.map((message) => {
                      const isCustomer = message.sender_type === "customer";
                      const isAgent = message.sender_type === "agent";

                      return (
                        <div
                          key={message.id}
                          className={`flex ${
                            isCustomer ? "justify-start" : "justify-end"
                          }`}
                        >
                          <div
                            className={`max-w-xl rounded-[1.4rem] px-5 py-4 shadow-sm ${
                              isCustomer
                                ? "bg-white border border-slate-200 text-slate-700"
                                : isAgent
                                ? "bg-blue-600 text-white"
                                : "bg-slate-950 text-white"
                            }`}
                          >
                            <p className="text-sm leading-7">
                              {message.content}
                            </p>

                            <p
                              className={`mt-2 text-[11px] font-semibold ${
                                isCustomer ? "text-slate-400" : "text-white/70"
                              }`}
                            >
                              {message.sender_type.toUpperCase()} ·{" "}
                              {formatTime(message.sent_at)}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                </div>

                <div className="shrink-0 border-t border-slate-200 bg-white p-5">
                  <div className="rounded-3xl border border-slate-200 bg-slate-50 p-3">
                    <textarea
                          className="w-full h-20 bg-transparent outline-none resize-none text-sm p-2"
                          placeholder="Type your reply as agent..."
                          value={replyText}
                          onChange={(e) => setReplyText(e.target.value)}
                        />

                    <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                      <div className="flex gap-2">
                        <button className="h-9 px-3 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600">
                          Macro
                        </button>
                        <button className="h-9 px-3 rounded-xl bg-white border border-slate-200 text-xs font-bold text-slate-600">
                          Internal Note
                        </button>
                      </div>

                      <button
                        onClick={handleSendReply}
                        disabled={sendingReply || !replyText.trim()}
                        className="h-10 px-5 rounded-2xl bg-blue-600 text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {sendingReply ? "Sending..." : "Send Reply"}
                      </button>
                    </div>
                  </div>
                </div>
              </>
            )}
          </section>

          <aside className="border-l border-slate-200 bg-white p-5 overflow-y-auto">
            <h3 className="font-black text-slate-950">Customer Profile</h3>

            {selectedConversation ? (
              <>
                <div className="mt-5 rounded-3xl border border-slate-200 p-5">
                  <div className="h-14 w-14 rounded-2xl bg-slate-950 text-white grid place-items-center font-black text-xl">
                    {selectedInitial}
                  </div>

                  <p className="mt-4 font-black text-slate-950">
                    {selectedConversation.customer_name || "Unknown Customer"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedConversation.customer_phone || "No phone"}
                  </p>
                  <p className="mt-1 text-sm text-slate-500">
                    {selectedConversation.customer_email || "No email"}
                  </p>
                </div>

                <div className="mt-5 rounded-3xl border border-slate-200 p-5">
                  <h4 className="font-black text-slate-950">
                    Conversation Data
                  </h4>

                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Channel</span>
                      <span className="font-bold text-slate-900">
                        {formatChannel(selectedConversation.channel_type)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Status</span>
                      <span
                        className={`font-bold ${
                          selectedConversation.status === "open"
                            ? "text-emerald-600"
                            : selectedConversation.status === "assigned"
                            ? "text-blue-600"
                            : "text-slate-700"
                        }`}
                      >
                        {formatStatus(selectedConversation.status)}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Assigned to</span>
                      <span className="font-bold text-slate-900">
                        {assignedLabel}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Bot</span>
                      <span className="font-bold text-slate-900">
                        {activeBot?.name || "-"}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="mt-5 rounded-3xl border border-blue-100 bg-blue-50 p-5">
                  <h4 className="font-black text-slate-950 flex items-center gap-2">
                    <BrainCircuit size={18} className="text-blue-700" /> AI
                    Summary
                  </h4>

                  <p className="mt-3 text-sm leading-6 text-slate-600">
                    {selectedSummary}
                  </p>
                </div>
              </>
            ) : (
              <div className="mt-5 rounded-3xl border border-slate-200 p-5 text-sm text-slate-500">
                No customer selected.
              </div>
            )}
          </aside>
        </div>
      </main>
    </div>
  );
}