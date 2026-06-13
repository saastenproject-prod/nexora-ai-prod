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
  const [collapsed, setCollapsed] = useState(false);
  const botMenuRef = useRef(null);

  const items = [
    {
      key: "all-chatbots",
      label: "All Chatbots",
      icon: Bot,
      action: () => setScreen("all-chatbots"),
    },
    // {
    //   key: "flows",
    //   label: "Chat Flows",
    //   icon: Workflow,
    //   action: () => setScreen("flows"),
    // },
    // {
    //   key: 'training',
    //   label: 'Bot Training',
    //   icon: BookOpen,
    //   action: () => setScreen('ai-settings'),
    // },
    {
      key: "install",
      label: "Install Your Chatbot",
      icon: PlugZap,
      action: () => setScreen("install"),
    },
    {
      key: "channels",
      label: "Channels",
      icon: MessageCircle,
      action: () => setScreen("channels"),
    },
    // {
    //   key: "broadcasts",
    //   label: "Broadcasts",
    //   icon: Send,
    //   action: () => {},
    //   disabled: true,
    // },
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

  useEffect(() => {
    if (collapsed) {
      setOpenBotMenu(false);
    }
  }, [collapsed]);

  const handleSelectBot = (botId) => {
    setSelectedBotId(botId);
    setOpenBotMenu(false);
  };

  const selectedBotName = selectedBot?.name || "Select Bot";

  return (
    <aside
      className={`fixed left-[84px] top-0 z-40 h-screen shrink-0 border-r border-slate-200 bg-white transition-all duration-300 ease-in-out ${
        collapsed ? "w-[76px]" : "w-64"
      }`}
    >
      <div className="flex h-full flex-col p-4">
        {/* Header */}
        <div
          className={`mb-5 flex items-center ${
            collapsed ? "justify-center" : "justify-between"
          }`}
        >
          {!collapsed && (
            <div className="min-w-0">
              <h2 className="truncate text-sm font-black text-slate-950">
                Nexora Studio
              </h2>
              <p className="mt-0.5 text-[11px] text-slate-400">Bot Builder</p>
            </div>
          )}

          <button
            type="button"
            onClick={() => setCollapsed((value) => !value)}
            className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            <span className="text-base font-black">
              {collapsed ? "›" : "‹"}
            </span>
          </button>
        </div>

        {/* Bot Selector */}
        <div className="relative mb-5" ref={botMenuRef}>
          {collapsed ? (
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              className="grid h-11 w-full place-items-center rounded-2xl border border-slate-200 bg-white text-emerald-600 transition hover:bg-slate-50"
              title={loading ? "Loading bots..." : selectedBotName}
            >
              <MessageCircle size={18} />
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setOpenBotMenu((value) => !value)}
              className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white p-3 text-sm transition hover:bg-slate-50"
            >
              <span className="flex min-w-0 items-center gap-2">
                <MessageCircle
                  size={16}
                  className="shrink-0 text-emerald-600"
                />

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
          )}

          {!collapsed && openBotMenu && (
            <div className="absolute left-0 right-0 z-50 mt-2 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl">
              <div className="max-h-72 overflow-y-auto p-2">
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
                            : "text-slate-700 hover:bg-slate-50"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className={`grid h-8 w-8 place-items-center rounded-xl text-xs font-black ${
                              isSelected
                                ? "bg-blue-600 text-white"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {bot.name?.charAt(0)?.toUpperCase() || "B"}
                          </div>

                          <div className="min-w-0">
                            <p className="truncate text-sm font-black">
                              {bot.name}
                            </p>
                            <p className="mt-0.5 truncate text-[11px] text-slate-400">
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
                    setScreen("agent-marketplace");
                  }}
                  className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-blue-700 transition hover:bg-blue-50"
                >
                  <Plus size={15} />
                  Create new bot
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Menu Items */}
        <nav className="space-y-1">
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
                title={collapsed ? item.label : undefined}
                className={`group flex w-full items-center rounded-2xl text-sm transition ${
                  collapsed ? "justify-center px-0 py-3" : "gap-3 px-4 py-3"
                } ${
                  isActive
                    ? "bg-blue-50 text-blue-700 font-bold"
                    : item.disabled
                    ? "cursor-not-allowed text-slate-300"
                    : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
                }`}
              >
                <Icon size={18} className="shrink-0" />

                {!collapsed && (
                  <>
                    <span className="truncate">{item.label}</span>

                    {item.disabled && (
                      <span className="ml-auto rounded-full bg-slate-100 px-2 py-1 text-[10px] font-bold text-slate-400">
                        Soon
                      </span>
                    )}
                  </>
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer hint */}
        {!collapsed && (
          <div className="mt-auto rounded-2xl border border-slate-200 bg-slate-50 p-3">
            <p className="text-xs font-bold text-slate-700">Workspace</p>
            <p className="mt-1 text-[11px] leading-5 text-slate-500">
              Manage bot flows, training data, widget installation, and AI
              settings.
            </p>
          </div>
        )}
      </div>
    </aside>
  );
}
