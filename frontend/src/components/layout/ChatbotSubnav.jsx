import { useEffect, useRef, useState } from "react";

import {
  Bot,
  BookOpen,
  BrainCircuit,
  ChevronDown,
  MessageCircle,
  Plus,
  PlugZap,
  Send,
  Workflow,
} from "../../lib/icons";

import useBotSelection from "../../hooks/useBotSelection";

export default function ChatbotSubnav({ setScreen, activeMenu = "flows" }) {
  const {
    loading,
    error,
    bots,
    selectedBot,
    selectedBotId,
    setSelectedBotId,
    refetch,
  } = useBotSelection();

  const [openBotMenu, setOpenBotMenu] = useState(false);
  const botMenuRef = useRef(null);

  const items = [
    {
      key: "all-chatbots",
      label: "All Chatbots",
      icon: Bot,
      action: () => setScreen("all-chatbots"),
    },
    {
      key: "flows",
      label: "Chat Flows",
      icon: Workflow,
      action: () => setScreen("flows"),
    },
    {
      key: "training",
      label: "Bot Training",
      icon: BookOpen,
      action: () => setScreen("ai-settings"),
    },
    {
      key: "install",
      label: "Install Your Chatbot",
      icon: PlugZap,
      action: () => setScreen("install"),
    },
    {
      key: "broadcasts",
      label: "Broadcasts",
      icon: Send,
      action: () => {},
      disabled: true,
    },
    {
      key: "ai-settings",
      label: "AI Settings",
      icon: BrainCircuit,
      action: () => setScreen("ai-settings"),
    },
  ];

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (botMenuRef.current && !botMenuRef.current.contains(event.target)) {
        setOpenBotMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  useEffect(() => {
    const handleSelectedBotChanged = () => {
      refetch();
    };

    window.addEventListener(
      "nexora:selected-bot-changed",
      handleSelectedBotChanged
    );

    window.addEventListener("nexora:bot-created", handleSelectedBotChanged);

    return () => {
      window.removeEventListener(
        "nexora:selected-bot-changed",
        handleSelectedBotChanged
      );

      window.removeEventListener(
        "nexora:bot-created",
        handleSelectedBotChanged
      );
    };
  }, [refetch]);

  const handleSelectBot = (botId) => {
    setSelectedBotId(botId);
    setOpenBotMenu(false);
  };

  const selectedBotName = selectedBot?.name || "Select Bot";

  return (
    <aside className="w-64 border-r border-slate-200 bg-white h-screen p-5 shrink-0">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="font-bold text-slate-950">Nexora Studio</h2>
          <p className="text-[11px] text-slate-400">Bot Builder</p>
        </div>

        <button
          type="button"
          onClick={() => setScreen("platform")}
          className="h-10 px-4 rounded-xl bg-blue-600 text-white text-sm font-medium flex items-center gap-2 hover:bg-blue-700 transition"
        >
          <Plus size={16} /> New Bot
        </button>
      </div>

      <div className="relative mb-5" ref={botMenuRef}>
        <button
          type="button"
          onClick={() => setOpenBotMenu((value) => !value)}
          className="w-full rounded-2xl border border-slate-200 bg-white p-3 flex items-center justify-between text-sm hover:bg-slate-50 transition"
        >
          <span className="flex items-center gap-2 min-w-0">
            <MessageCircle size={16} className="text-emerald-600 shrink-0" />

            <span className="truncate font-semibold text-slate-700">
              {loading ? "Loading bots..." : selectedBotName}
            </span>
          </span>

          <ChevronDown
            size={15}
            className={`text-slate-400 transition ${
              openBotMenu ? "rotate-180" : ""
            }`}
          />
        </button>

        {openBotMenu && (
          <div className="absolute left-0 right-0 mt-2 rounded-2xl border border-slate-200 bg-white shadow-xl z-50 overflow-hidden">
            <div className="p-2 max-h-72 overflow-y-auto">
              {error && (
                <div className="rounded-xl bg-red-50 px-3 py-2 text-xs font-semibold text-red-700">
                  {error}
                </div>
              )}

              {!error && loading && (
                <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                  Loading bot list...
                </div>
              )}

              {!error && !loading && bots.length === 0 && (
                <div className="rounded-xl bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-500">
                  No bot found.
                </div>
              )}

              {!loading &&
                bots.map((bot) => {
                  const isSelected = bot.id === selectedBotId;

                  return (
                    <button
                      key={bot.id}
                      type="button"
                      onClick={() => handleSelectBot(bot.id)}
                      className={`w-full rounded-xl px-3 py-3 text-left transition ${
                        isSelected
                          ? "bg-blue-50 text-blue-700"
                          : "hover:bg-slate-50 text-slate-700"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div
                          className={`h-8 w-8 rounded-xl grid place-items-center text-xs font-black ${
                            isSelected
                              ? "bg-blue-600 text-white"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          {bot.name?.charAt(0)?.toUpperCase() || "B"}
                        </div>

                        <div className="min-w-0">
                          <p className="text-sm font-black truncate">
                            {bot.name}
                          </p>
                          <p className="mt-0.5 text-[11px] text-slate-400 truncate">
                            {bot.bot_type || "bot"} · {bot.status || "active"}
                          </p>
                        </div>
                      </div>
                    </button>
                  );
                })}
            </div>

            <div className="border-t border-slate-100 p-2">
              <button
                type="button"
                onClick={() => {
                  setOpenBotMenu(false);
                  setScreen("platform");
                }}
                className="w-full rounded-xl px-3 py-2 text-sm font-bold text-blue-700 hover:bg-blue-50 transition flex items-center gap-2"
              >
                <Plus size={15} />
                Create new bot
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="space-y-1">
        {items.map((item) => {
          const Icon = item.icon;
          const isActive = activeMenu === item.key;

          return (
            <button
              key={item.key}
              type="button"
              disabled={item.disabled}
              onClick={() => {
                if (item.disabled) return;
                item.action?.();
              }}
              className={`w-full rounded-2xl px-4 py-3 flex items-center gap-3 text-sm transition ${
                isActive
                  ? "bg-blue-50 text-blue-700 font-medium"
                  : item.disabled
                  ? "text-slate-300 cursor-not-allowed"
                  : "text-slate-600 hover:bg-slate-50"
              }`}
            >
              <Icon size={17} />
              {item.label}

              {item.disabled && (
                <span className="ml-auto text-[10px] px-2 py-1 rounded-full bg-slate-100 text-slate-400 font-bold">
                  Soon
                </span>
              )}
            </button>
          );
        })}
      </div>
    </aside>
  );
}