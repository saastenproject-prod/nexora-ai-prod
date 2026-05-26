(function () {
  const WIDGET_API_URL =
    "https://eqxbozcazttqhnzhkqow.supabase.co/functions/v1/widget-message";

  const WIDGET_FETCH_MESSAGES_URL =
    "https://eqxbozcazttqhnzhkqow.supabase.co/functions/v1/widget-fetch-messages";

  const WIDGET_CONFIG_URL =
    "https://eqxbozcazttqhnzhkqow.supabase.co/functions/v1/widget-config";

  const scriptTag =
    document.currentScript || document.querySelector("script[data-bot-id]");

  const widgetKey = scriptTag?.getAttribute("data-bot-id");

  if (!widgetKey) {
    console.error("[Nexora Widget] Missing data-bot-id.");
    return;
  }

  const state = {
    isOpen: false,
    isLoaded: false,
    isSending: false,
    pollingTimer: null,
    conversationId: null,
    unreadCount: 0,
    lastMessageIds: new Set(),
    widgetSetting: {
      title: "Nexora Support",
      subtitle: "Online",
      greeting_message: "Hi! Welcome to support. How can we help you today?",
      primary_color: "#2563eb",
    },
    messages: [],
  };

  const storageKey = `nexora_widget_conversation_${widgetKey}`;

  const escapeHtml = (value) => {
    return String(value || "")
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;")
      .replaceAll('"', "&quot;")
      .replaceAll("'", "&#039;");
  };

  const getStoredConversationId = () => {
    return localStorage.getItem(storageKey);
  };

  const setStoredConversationId = (conversationId) => {
    if (!conversationId) return;

    localStorage.setItem(storageKey, conversationId);
    state.conversationId = conversationId;
  };

  const clearStoredConversationId = () => {
    localStorage.removeItem(storageKey);
    state.conversationId = null;
    state.lastMessageIds = new Set();
  };

  const normalizeSenderType = (senderType) => {
    if (senderType === "customer") return "customer";
    return "bot";
  };

  const buildDefaultGreeting = () => {
    return (
      state.widgetSetting.greeting_message ||
      "Hi! Welcome to support. How can we help you today?"
    );
  };

  const buildLoadingMessage = () => {
    return "Loading previous conversation...";
  };

  const updateUnreadBadge = () => {
    const badge = document.getElementById("nexora-widget-unread-badge");

    if (!badge) return;

    if (state.unreadCount <= 0) {
      badge.style.display = "none";
      badge.innerText = "";
      return;
    }

    badge.style.display = "grid";
    badge.innerText = state.unreadCount > 9 ? "9+" : String(state.unreadCount);
  };

  const loadWidgetConfig = async () => {
    try {
      const response = await fetch(WIDGET_CONFIG_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          widgetKey,
        }),
      });

      const result = await response.json().catch(() => null);

      if (!response.ok) {
        throw new Error(result?.error || "Failed to load widget config.");
      }

      const widget = result?.widget;

      if (!widget) return;

      state.widgetSetting = {
        title: widget.title || state.widgetSetting.title,
        subtitle: widget.subtitle || state.widgetSetting.subtitle,
        greeting_message:
          widget.greeting_message || state.widgetSetting.greeting_message,
        primary_color: widget.primary_color || state.widgetSetting.primary_color,
      };
    } catch (error) {
      console.error("[Nexora Widget Config]", error);
    }
  };

  const callWidgetMessageApi = async ({ message }) => {
    const response = await fetch(WIDGET_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        widgetKey,
        message,
        conversationId: getStoredConversationId(),
        customerName: "Website Visitor",
        customerEmail: "visitor@example.com",
      }),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(result?.error || "Failed to send message.");
    }

    return result;
  };

  const fetchMessagesFromServer = async () => {
    const conversationId = getStoredConversationId();

    if (!conversationId) return null;

    const response = await fetch(WIDGET_FETCH_MESSAGES_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        widgetKey,
        conversationId,
      }),
    });

    const result = await response.json().catch(() => null);

    if (!response.ok) {
      throw new Error(result?.error || "Failed to fetch messages.");
    }

    return result;
  };

  const syncMessagesFromServer = async () => {
    const conversationId = getStoredConversationId();

    if (!conversationId) {
      state.messages = [
        {
          sender_type: "bot",
          content: buildDefaultGreeting(),
        },
      ];

      state.lastMessageIds = new Set();
      updateUnreadBadge();
      renderMessages();
      return;
    }

    try {
      const result = await fetchMessagesFromServer();

      if (!result?.messages || !Array.isArray(result.messages)) {
        state.messages = [
          {
            sender_type: "bot",
            content: buildDefaultGreeting(),
          },
        ];

        updateUnreadBadge();
        renderMessages();
        return;
      }

      if (result.messages.length === 0) {
        state.messages = [
          {
            sender_type: "bot",
            content: buildDefaultGreeting(),
          },
        ];

        state.lastMessageIds = new Set();
        updateUnreadBadge();
        renderMessages();
        return;
      }

      const previousMessageIds = new Set(state.lastMessageIds);
      const incomingMessages = result.messages || [];

      const newAgentMessages = incomingMessages.filter((message) => {
        const isNew = !previousMessageIds.has(message.id);
        const isFromAgentOrBot = message.sender_type !== "customer";

        return isNew && isFromAgentOrBot;
      });

      if (!state.isOpen && previousMessageIds.size > 0) {
        state.unreadCount += newAgentMessages.length;
      }

      state.lastMessageIds = new Set(
        incomingMessages.map((message) => message.id)
      );

      state.messages = incomingMessages.map((message) => ({
        id: message.id,
        sender_type: normalizeSenderType(message.sender_type),
        sender_name: message.sender_name,
        message_type: message.message_type,
        content: message.content,
        sent_at: message.sent_at,
      }));

      updateUnreadBadge();
      renderMessages();
    } catch (error) {
      console.error("[Nexora Widget Sync]", error);

      clearStoredConversationId();

      state.messages = [
        {
          sender_type: "bot",
          content:
            "We could not load your previous conversation. Please start a new chat.",
        },
      ];

      updateUnreadBadge();
      renderMessages();
    }
  };

  const startPollingMessages = () => {
    if (state.pollingTimer) return;

    state.pollingTimer = window.setInterval(async () => {
      if (state.isSending) return;

      try {
        await syncMessagesFromServer();
      } catch (error) {
        console.error("[Nexora Widget Polling]", error);
      }
    }, 4000);
  };

  const stopPollingMessages = () => {
    if (!state.pollingTimer) return;

    window.clearInterval(state.pollingTimer);
    state.pollingTimer = null;
  };

  const renderMessages = () => {
    const messagesEl = document.getElementById("nexora-widget-messages");

    if (!messagesEl) return;

    const primaryColor = state.widgetSetting.primary_color || "#2563eb";

    messagesEl.innerHTML = state.messages
      .map((message) => {
        const isCustomer = message.sender_type === "customer";

        return `
          <div style="
            display: flex;
            justify-content: ${isCustomer ? "flex-end" : "flex-start"};
            margin-bottom: 10px;
          ">
            <div style="
              max-width: 230px;
              border-radius: 16px;
              padding: 10px 12px;
              font-size: 13px;
              line-height: 1.5;
              background: ${isCustomer ? primaryColor : "#f1f5f9"};
              color: ${isCustomer ? "#ffffff" : "#334155"};
              word-break: break-word;
            ">
              ${escapeHtml(message.content)}
            </div>
          </div>
        `;
      })
      .join("");

    messagesEl.scrollTop = messagesEl.scrollHeight;
  };

  const setSendingState = (isSending) => {
    state.isSending = isSending;

    const button = document.getElementById("nexora-widget-send");
    const input = document.getElementById("nexora-widget-input");

    if (!button || !input) return;

    button.disabled = isSending;
    input.disabled = isSending;
    button.innerText = isSending ? "Sending..." : "Send";
  };

  const sendMessage = async () => {
    const input = document.getElementById("nexora-widget-input");

    const message = input?.value?.trim();

    if (!message || state.isSending) return;

    input.value = "";

    state.messages.push({
      sender_type: "customer",
      content: message,
    });

    renderMessages();
    setSendingState(true);

    try {
      const result = await callWidgetMessageApi({ message });

      if (result?.conversationId) {
        setStoredConversationId(result.conversationId);
      }

      await syncMessagesFromServer();
      startPollingMessages();
    } catch (error) {
      console.error("[Nexora Widget]", error);

      state.messages.push({
        sender_type: "bot",
        content:
          "Sorry, failed to send your message. Please try again in a moment.",
      });

      renderMessages();
    } finally {
      setSendingState(false);
    }
  };

  const resetConversation = () => {
    clearStoredConversationId();
    stopPollingMessages();

    state.unreadCount = 0;
    state.lastMessageIds = new Set();

    state.messages = [
      {
        sender_type: "bot",
        content: buildDefaultGreeting(),
      },
    ];

    updateUnreadBadge();
    renderMessages();
  };

  const renderWidget = () => {
    const primaryColor = state.widgetSetting.primary_color || "#2563eb";
    const title = state.widgetSetting.title || "Nexora Support";
    const subtitle = state.widgetSetting.subtitle || "Online";
    const greeting = buildDefaultGreeting();

    state.conversationId = getStoredConversationId();

    state.messages = state.conversationId
      ? [
          {
            sender_type: "bot",
            content: buildLoadingMessage(),
          },
        ]
      : [
          {
            sender_type: "bot",
            content: greeting,
          },
        ];

    const existingRoot = document.getElementById("nexora-widget-root");

    if (existingRoot) {
      existingRoot.remove();
    }

    const root = document.createElement("div");
    root.id = "nexora-widget-root";

    root.innerHTML = `
      <style>
        #nexora-widget-root * {
          box-sizing: border-box;
          font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        }

        #nexora-widget-panel {
          position: fixed;
          right: 24px;
          bottom: 96px;
          width: 360px;
          max-width: calc(100vw - 32px);
          height: 500px;
          max-height: calc(100vh - 130px);
          background: #ffffff;
          border: 1px solid #e2e8f0;
          border-radius: 24px;
          box-shadow: 0 24px 80px rgba(15, 23, 42, 0.20);
          overflow: hidden;
          display: none;
          z-index: 999999;
        }

        #nexora-widget-header {
          padding: 16px;
          color: #ffffff;
          background: ${primaryColor};
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        #nexora-widget-header-left {
          display: flex;
          align-items: center;
          gap: 12px;
          min-width: 0;
        }

        #nexora-widget-avatar {
          width: 40px;
          height: 40px;
          border-radius: 16px;
          background: rgba(255, 255, 255, 0.18);
          display: grid;
          place-items: center;
          font-weight: 900;
          flex-shrink: 0;
        }

        #nexora-widget-title {
          font-weight: 900;
          font-size: 14px;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
          max-width: 210px;
        }

        #nexora-widget-subtitle {
          margin-top: 2px;
          font-size: 12px;
          opacity: 0.85;
        }

        #nexora-widget-reset {
          border: 0;
          border-radius: 999px;
          background: rgba(255, 255, 255, 0.16);
          color: #ffffff;
          padding: 7px 10px;
          font-size: 11px;
          font-weight: 800;
          cursor: pointer;
          flex-shrink: 0;
        }

        #nexora-widget-reset:hover {
          background: rgba(255, 255, 255, 0.24);
        }

        #nexora-widget-messages {
          height: 360px;
          overflow-y: auto;
          padding: 16px;
          background: #f8fafc;
        }

        #nexora-widget-composer {
          padding: 12px;
          border-top: 1px solid #e2e8f0;
          background: #ffffff;
          display: flex;
          gap: 8px;
        }

        #nexora-widget-input {
          flex: 1;
          border: 1px solid #e2e8f0;
          border-radius: 14px;
          padding: 10px 12px;
          font-size: 13px;
          outline: none;
          min-width: 0;
        }

        #nexora-widget-input:focus {
          border-color: ${primaryColor};
        }

        #nexora-widget-input:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        #nexora-widget-send {
          border: 0;
          border-radius: 14px;
          background: ${primaryColor};
          color: #ffffff;
          padding: 0 14px;
          font-size: 13px;
          font-weight: 800;
          cursor: pointer;
          min-width: 64px;
        }

        #nexora-widget-send:disabled {
          opacity: 0.65;
          cursor: not-allowed;
        }

        #nexora-widget-bubble {
          position: fixed;
          right: 24px;
          bottom: 24px;
          width: 60px;
          height: 60px;
          border-radius: 22px;
          border: 0;
          background: ${primaryColor};
          color: #ffffff;
          box-shadow: 0 20px 50px rgba(37, 99, 235, 0.35);
          cursor: pointer;
          display: grid;
          place-items: center;
          z-index: 999999;
        }

        #nexora-widget-unread-badge {
          position: absolute;
          top: -6px;
          right: -6px;
          width: 22px;
          height: 22px;
          border-radius: 999px;
          background: #ef4444;
          color: #ffffff;
          border: 2px solid #ffffff;
          display: none;
          place-items: center;
          font-size: 11px;
          font-weight: 900;
          line-height: 1;
        }

        @media (max-width: 480px) {
          #nexora-widget-panel {
            right: 16px;
            bottom: 88px;
            width: calc(100vw - 32px);
            height: 500px;
          }

          #nexora-widget-bubble {
            right: 16px;
            bottom: 16px;
          }
        }
      </style>

      <div id="nexora-widget-panel">
        <div id="nexora-widget-header">
          <div id="nexora-widget-header-left">
            <div id="nexora-widget-avatar">N</div>
            <div>
              <div id="nexora-widget-title">${escapeHtml(title)}</div>
              <div id="nexora-widget-subtitle">${escapeHtml(subtitle)}</div>
            </div>
          </div>

          <button id="nexora-widget-reset" type="button">
            New Chat
          </button>
        </div>

        <div id="nexora-widget-messages"></div>

        <div id="nexora-widget-composer">
          <input id="nexora-widget-input" placeholder="Type your message..." />
          <button id="nexora-widget-send" type="button">Send</button>
        </div>
      </div>

      <button id="nexora-widget-bubble" type="button" aria-label="Open chat">
        <span id="nexora-widget-unread-badge"></span>
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none">
          <path d="M21 11.5C21 16.1944 16.9706 20 12 20C10.8325 20 9.71691 19.7898 8.6936 19.4078L3 21L4.66227 15.9623C3.61365 14.6608 3 13.1224 3 11.5C3 6.80558 7.02944 3 12 3C16.9706 3 21 6.80558 21 11.5Z" stroke="white" stroke-width="2" stroke-linejoin="round"/>
        </svg>
      </button>
    `;

    document.body.appendChild(root);

    const panel = document.getElementById("nexora-widget-panel");
    const bubble = document.getElementById("nexora-widget-bubble");
    const input = document.getElementById("nexora-widget-input");
    const send = document.getElementById("nexora-widget-send");
    const reset = document.getElementById("nexora-widget-reset");

    bubble.addEventListener("click", async () => {
      state.isOpen = !state.isOpen;
      panel.style.display = state.isOpen ? "block" : "none";

      if (state.isOpen) {
        state.unreadCount = 0;
        updateUnreadBadge();

        const existingConversationId = getStoredConversationId();

        if (existingConversationId) {
          state.messages = [
            {
              sender_type: "bot",
              content: buildLoadingMessage(),
            },
          ];

          renderMessages();

          try {
            await syncMessagesFromServer();
          } catch (error) {
            console.error("[Nexora Widget]", error);

            clearStoredConversationId();

            state.messages = [
              {
                sender_type: "bot",
                content:
                  "We could not load your previous conversation. Please start a new chat.",
              },
            ];

            renderMessages();
          }
        } else {
          renderMessages();
        }

        startPollingMessages();

        setTimeout(() => input.focus(), 100);
      } else {
        startPollingMessages();
      }
    });

    send.addEventListener("click", sendMessage);

    reset.addEventListener("click", () => {
      resetConversation();
    });

    input.addEventListener("keydown", (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        sendMessage();
      }
    });

    updateUnreadBadge();
    renderMessages();

    if (state.conversationId) {
      startPollingMessages();
    }
  };

  const init = async () => {
    try {
      await loadWidgetConfig();
      renderWidget();
    } catch (error) {
      console.error("[Nexora Widget]", error);
      renderWidget();
    }
  };

  init();
})();