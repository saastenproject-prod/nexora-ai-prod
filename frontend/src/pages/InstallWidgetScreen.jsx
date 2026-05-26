import { useEffect, useState } from "react";
import ChatbotSubnav from "../components/layout/ChatbotSubnav";

import { Globe2, MessageCircle } from "../lib/icons";
import useInstallWidgetData from "../hooks/useInstallWidgetData";
import useWidgetPreviewConversation from "../hooks/useWidgetPreviewConversation";
import { supabase } from "../lib/supabaseClient";

const DEFAULT_WIDGET_FORM = {
  title: "Nexora Support",
  subtitle: "Online",
  greeting_message: "Hi! Welcome to support. How can we help?",
  primary_color: "#2563eb",
};

export default function InstallWidgetScreen({ setScreen }) {
  const {
    loading,
    error,
    activeBot,
    widgetSetting,
    summary,
    embedCode,
    copyEmbedCode,
    refetch,
  } = useInstallWidgetData();

  const {
    loading: sendingPreviewMessage,
    error: previewConversationError,
    createPreviewConversation,
    resetPreviewConversation,
  } = useWidgetPreviewConversation();

  const [copyStatus, setCopyStatus] = useState("");
  const [previewMessage, setPreviewMessage] = useState("");

  const [savingWidgetSetting, setSavingWidgetSetting] = useState(false);
  const [widgetSettingStatus, setWidgetSettingStatus] = useState("");
  const [widgetSettingError, setWidgetSettingError] = useState("");

  const [widgetForm, setWidgetForm] = useState(DEFAULT_WIDGET_FORM);

  useEffect(() => {
    if (!widgetSetting) return;

    setWidgetForm({
      title: widgetSetting.title || DEFAULT_WIDGET_FORM.title,
      subtitle: widgetSetting.subtitle || DEFAULT_WIDGET_FORM.subtitle,
      greeting_message:
        widgetSetting.greeting_message || DEFAULT_WIDGET_FORM.greeting_message,
      primary_color:
        widgetSetting.primary_color || DEFAULT_WIDGET_FORM.primary_color,
    });
  }, [widgetSetting]);

  const widgetTitle = widgetForm.title || DEFAULT_WIDGET_FORM.title;
  const widgetSubtitle = widgetForm.subtitle || DEFAULT_WIDGET_FORM.subtitle;
  const widgetGreeting =
    widgetForm.greeting_message || DEFAULT_WIDGET_FORM.greeting_message;
  const widgetPrimaryColor =
    widgetForm.primary_color || DEFAULT_WIDGET_FORM.primary_color;

  const savedWidgetForm = {
    title: widgetSetting?.title || DEFAULT_WIDGET_FORM.title,
    subtitle: widgetSetting?.subtitle || DEFAULT_WIDGET_FORM.subtitle,
    greeting_message:
      widgetSetting?.greeting_message || DEFAULT_WIDGET_FORM.greeting_message,
    primary_color:
      widgetSetting?.primary_color || DEFAULT_WIDGET_FORM.primary_color,
  };

  const hasWidgetFormChanges =
    widgetForm.title !== savedWidgetForm.title ||
    widgetForm.subtitle !== savedWidgetForm.subtitle ||
    widgetForm.greeting_message !== savedWidgetForm.greeting_message ||
    widgetForm.primary_color !== savedWidgetForm.primary_color;

  const isValidHexColor = /^#[0-9A-Fa-f]{6}$/.test(widgetForm.primary_color);

  const canSaveWidgetSetting =
    Boolean(widgetSetting) &&
    hasWidgetFormChanges &&
    widgetForm.title.trim() &&
    widgetForm.subtitle.trim() &&
    widgetForm.greeting_message.trim() &&
    isValidHexColor &&
    !loading &&
    !savingWidgetSetting;

  const botFlowStatus = summary?.botFlowReady ? "ready" : "needed";
  const websiteStatus = summary?.websiteReady ? "active" : "needed";
  const whatsappStatus = summary?.whatsappReady ? "active" : "needed";

  const getStatusCardClass = (status) => {
    if (status === "ready" || status === "active") {
      return "bg-emerald-50 border-emerald-100 text-emerald-700";
    }

    if (status === "needed") {
      return "bg-amber-50 border-amber-100 text-amber-700";
    }

    return "bg-slate-50 border-slate-200 text-slate-600";
  };

  const updateWidgetForm = (field, value) => {
    setWidgetSettingError("");
    setWidgetSettingStatus("");

    setWidgetForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleResetWidgetForm = () => {
    setWidgetSettingError("");
    setWidgetSettingStatus("");
    setWidgetForm(DEFAULT_WIDGET_FORM);
  };

  const handleOpenTestPage = () => {
    window.open("/widget-test.html", "_blank", "noopener,noreferrer");
  };

  const handleCopyCode = async () => {
    setCopyStatus("");

    try {
      await copyEmbedCode();
      setCopyStatus("Copied");

      setTimeout(() => {
        setCopyStatus("");
      }, 1800);
    } catch (err) {
      console.error(err);
      setCopyStatus("Failed");

      setTimeout(() => {
        setCopyStatus("");
      }, 1800);
    }
  };

  const handleSaveWidgetSetting = async () => {
    setWidgetSettingStatus("");
    setWidgetSettingError("");

    if (!widgetSetting?.id && !widgetSetting?.widget_key) {
      setWidgetSettingError("Widget setting record was not found.");
      return;
    }

    if (!widgetForm.title.trim()) {
      setWidgetSettingError("Widget title is required.");
      return;
    }

    if (!widgetForm.subtitle.trim()) {
      setWidgetSettingError("Widget subtitle is required.");
      return;
    }

    if (!widgetForm.greeting_message.trim()) {
      setWidgetSettingError("Greeting message is required.");
      return;
    }

    if (!isValidHexColor) {
      setWidgetSettingError(
        "Primary color must use HEX format, for example #2563eb."
      );
      return;
    }

    if (!hasWidgetFormChanges) {
      setWidgetSettingStatus("No changes to save.");
      setTimeout(() => {
        setWidgetSettingStatus("");
      }, 1800);
      return;
    }

    setSavingWidgetSetting(true);

    try {
      const payload = {
        title: widgetForm.title.trim(),
        subtitle: widgetForm.subtitle.trim(),
        greeting_message: widgetForm.greeting_message.trim(),
        primary_color: widgetForm.primary_color.trim(),
        updated_at: new Date().toISOString(),
      };

      let query = supabase.from("widget_settings").update(payload);

      if (widgetSetting?.id) {
        query = query.eq("id", widgetSetting.id);
      } else {
        query = query.eq("widget_key", widgetSetting.widget_key);
      }

      const { error: updateError } = await query;

      if (updateError) throw updateError;

      setWidgetSettingStatus(
        "Widget settings saved. Refresh your embedded page to see the latest configuration."
      );

      await refetch();

      setTimeout(() => {
        setWidgetSettingStatus("");
      }, 3000);
    } catch (err) {
      console.error(err);
      setWidgetSettingError(
        err?.message || "Failed to save widget settings."
      );
    } finally {
      setSavingWidgetSetting(false);
    }
  };

  const handleSendPreviewMessage = async () => {
    try {
      await createPreviewConversation({
        message: previewMessage,
        customerName: "Website Visitor",
        customerEmail: "visitor@example.com",
        greetingMessage: widgetGreeting,
      });

      setPreviewMessage("");
    } catch (err) {
      console.error(err);
    }
  };

  const handleResetPreviewConversation = async () => {
    try {
      await resetPreviewConversation();
      setPreviewMessage("");
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FC] flex">
      <ChatbotSubnav setScreen={setScreen} activeMenu="install" />

      <main className="flex-1 min-w-0">
        <div className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl px-8 h-16 flex items-center justify-between">
          <div>
            <h1 className="font-black text-slate-950">
              Install Your Chatbot
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Publish Nexora widget to your website or prepare WhatsApp
              connection.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={refetch}
              className="h-10 px-4 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              Refresh Data
            </button>

            <button
              type="button"
              onClick={() => setScreen("builder")}
              className="h-10 px-4 rounded-2xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition"
            >
              Open Builder
            </button>
          </div>
        </div>

        <div className="px-8 py-7 space-y-6">
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          {previewConversationError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
              {previewConversationError}
            </div>
          )}

          {widgetSettingError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
              {widgetSettingError}
            </div>
          )}

          {widgetSettingStatus && (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
              {widgetSettingStatus}
            </div>
          )}

          <section className="grid xl:grid-cols-[1fr_380px] gap-5">
            <div className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-8 shadow-xl">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.45),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(20,184,166,0.30),transparent_32%)]" />

              <div className="relative max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-blue-50 mb-5">
                  <Globe2 size={16} />
                  Website Widget Installation
                </div>

                <h2 className="text-4xl font-black tracking-tight text-white">
                  Install the chatbot widget with one script.
                </h2>

                <p className="mt-3 text-blue-100 leading-7">
                  Copy the embed code below and place it before the closing body
                  tag on your website.
                </p>

                <div className="mt-6 inline-flex rounded-2xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-blue-50">
                  Bot:{" "}
                  {loading ? "Loading..." : activeBot?.name || "No active bot"}
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="font-black text-slate-950">Publish Status</p>

              <div className="mt-5 space-y-3">
                <div
                  className={`flex items-center justify-between rounded-2xl border p-4 ${getStatusCardClass(
                    botFlowStatus
                  )}`}
                >
                  <span className="text-sm font-bold text-slate-700">
                    Bot Flow
                  </span>
                  <span className="text-sm font-black capitalize">
                    {summary?.botFlowReady ? "Ready" : "Setup Needed"}
                  </span>
                </div>

                <div
                  className={`flex items-center justify-between rounded-2xl border p-4 ${getStatusCardClass(
                    websiteStatus
                  )}`}
                >
                  <span className="text-sm font-bold text-slate-700">
                    Website Widget
                  </span>
                  <span className="text-sm font-black capitalize">
                    {summary?.websiteReady ? "Active" : "Setup Needed"}
                  </span>
                </div>

                <div
                  className={`flex items-center justify-between rounded-2xl border p-4 ${getStatusCardClass(
                    whatsappStatus
                  )}`}
                >
                  <span className="text-sm font-bold text-slate-700">
                    WhatsApp
                  </span>
                  <span className="text-sm font-black capitalize">
                    {summary?.whatsappReady ? "Active" : "Setup Needed"}
                  </span>
                </div>
              </div>

              <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-black text-slate-400 uppercase">
                  Widget Key
                </p>
                <p className="mt-2 break-all text-sm font-bold text-slate-950">
                  {loading
                    ? "Loading..."
                    : widgetSetting?.widget_key || "No widget key found"}
                </p>
              </div>
            </div>
          </section>

          <section className="grid xl:grid-cols-[1fr_380px] gap-5">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-slate-950">
                    Widget Settings
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Configure the customer-facing widget appearance and welcome
                    message.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleResetWidgetForm}
                    disabled={savingWidgetSetting}
                    className="h-10 px-4 rounded-2xl border border-slate-200 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed transition"
                  >
                    Reset Default
                  </button>

                  <button
                    type="button"
                    onClick={handleOpenTestPage}
                    className="h-10 px-4 rounded-2xl border border-slate-200 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50 transition"
                  >
                    Open Test Page
                  </button>

                  <button
                    type="button"
                    onClick={handleSaveWidgetSetting}
                    disabled={!canSaveWidgetSetting}
                    className="h-10 px-4 rounded-2xl text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed transition"
                    style={{
                      backgroundColor: isValidHexColor
                        ? widgetPrimaryColor
                        : DEFAULT_WIDGET_FORM.primary_color,
                    }}
                  >
                    {savingWidgetSetting
                      ? "Saving..."
                      : hasWidgetFormChanges
                      ? "Save Settings"
                      : "Saved"}
                  </button>
                </div>
              </div>

              <div className="mt-6 grid md:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-black text-slate-500 uppercase">
                    Widget Title
                  </label>
                  <input
                    value={widgetForm.title}
                    onChange={(event) =>
                      updateWidgetForm("title", event.target.value)
                    }
                    placeholder="Customer Support Bot"
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-500 uppercase">
                    Widget Subtitle
                  </label>
                  <input
                    value={widgetForm.subtitle}
                    onChange={(event) =>
                      updateWidgetForm("subtitle", event.target.value)
                    }
                    placeholder="Online"
                    className="mt-2 h-11 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-800 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400"
                  />
                </div>

                <div className="md:col-span-2">
                  <label className="text-xs font-black text-slate-500 uppercase">
                    Greeting Message
                  </label>
                  <textarea
                    value={widgetForm.greeting_message}
                    onChange={(event) =>
                      updateWidgetForm("greeting_message", event.target.value)
                    }
                    placeholder="Halo! Ada yang bisa kami bantu hari ini?"
                    className="mt-2 h-24 w-full resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-800 outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400"
                  />
                </div>

                <div>
                  <label className="text-xs font-black text-slate-500 uppercase">
                    Primary Color
                  </label>

                  <div className="mt-2 flex items-center gap-3">
                    <input
                      type="color"
                      value={
                        isValidHexColor
                          ? widgetPrimaryColor
                          : DEFAULT_WIDGET_FORM.primary_color
                      }
                      onChange={(event) =>
                        updateWidgetForm("primary_color", event.target.value)
                      }
                      className="h-11 w-14 rounded-xl border border-slate-200 bg-white p-1 cursor-pointer"
                    />

                    <input
                      value={widgetForm.primary_color}
                      onChange={(event) =>
                        updateWidgetForm("primary_color", event.target.value)
                      }
                      placeholder="#2563eb"
                      className={`h-11 flex-1 rounded-2xl border bg-white px-4 text-sm font-semibold outline-none focus:ring-4 ${
                        isValidHexColor
                          ? "border-slate-200 text-slate-800 focus:ring-blue-100 focus:border-blue-400"
                          : "border-red-300 text-red-700 focus:ring-red-100 focus:border-red-400"
                      }`}
                    />
                  </div>

                  {!isValidHexColor && (
                    <p className="mt-2 text-xs font-semibold text-red-600">
                      Use HEX format, for example #2563eb.
                    </p>
                  )}
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black text-slate-400 uppercase">
                    Live Preview Color
                  </p>
                  <div className="mt-3 flex items-center gap-3">
                    <div
                      className="h-10 w-10 rounded-2xl shadow-sm"
                      style={{
                        backgroundColor: isValidHexColor
                          ? widgetPrimaryColor
                          : DEFAULT_WIDGET_FORM.primary_color,
                      }}
                    />
                    <div>
                      <p className="text-sm font-black text-slate-950">
                        {widgetForm.primary_color || "-"}
                      </p>
                      <p className="text-xs text-slate-500">
                        Used by header, bubble, send button, and customer
                        bubble.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 rounded-2xl border border-blue-100 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-800">
                  Changes are saved to{" "}
                  <span className="font-black">widget_settings</span>. After
                  saving, refresh the embedded website or test page to see the
                  latest widget configuration.
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-black text-slate-950">
                Widget Preview
              </h3>

              <p className="mt-1 text-sm text-slate-500">
                Customer-facing chat bubble simulation.
              </p>

              <div className="mt-5 rounded-3xl border border-slate-200 bg-slate-50 p-5 min-h-[440px] relative overflow-hidden">
                <div
                  className="absolute bottom-5 right-5 h-14 w-14 rounded-2xl text-white grid place-items-center shadow-xl"
                  style={{
                    backgroundColor: isValidHexColor
                      ? widgetPrimaryColor
                      : DEFAULT_WIDGET_FORM.primary_color,
                  }}
                >
                  <MessageCircle size={24} />
                </div>

                <div className="absolute bottom-24 right-5 w-72 rounded-3xl bg-white border border-slate-200 shadow-xl overflow-hidden">
                  <div
                    className="flex items-center gap-3 p-4 text-white"
                    style={{
                      backgroundColor: isValidHexColor
                        ? widgetPrimaryColor
                        : DEFAULT_WIDGET_FORM.primary_color,
                    }}
                  >
                    <div className="h-10 w-10 rounded-2xl bg-white/15 text-white grid place-items-center font-black">
                      N
                    </div>

                    <div className="min-w-0">
                      <p className="text-sm font-black truncate">
                        {widgetTitle}
                      </p>
                      <p className="text-xs text-white/85 font-bold truncate">
                        {widgetSubtitle}
                      </p>
                    </div>
                  </div>

                  <div className="p-4 space-y-3">
                    <p className="rounded-2xl bg-slate-100 p-3 text-sm text-slate-600 leading-6">
                      {widgetGreeting}
                    </p>

                    {previewMessage && (
                      <p
                        className="ml-auto max-w-[220px] rounded-2xl p-3 text-sm text-white leading-6"
                        style={{
                          backgroundColor: isValidHexColor
                            ? widgetPrimaryColor
                            : DEFAULT_WIDGET_FORM.primary_color,
                        }}
                      >
                        {previewMessage}
                      </p>
                    )}

                    <div className="pt-3 border-t border-slate-100">
                      <textarea
                        value={previewMessage}
                        onChange={(event) =>
                          setPreviewMessage(event.target.value)
                        }
                        placeholder="Type a customer message..."
                        className="h-20 w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 p-3 text-sm outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400"
                      />

                      <button
                        type="button"
                        onClick={handleSendPreviewMessage}
                        disabled={
                          sendingPreviewMessage || !previewMessage.trim()
                        }
                        className="mt-3 h-10 w-full rounded-2xl text-white text-sm font-black disabled:opacity-60 disabled:cursor-not-allowed transition"
                        style={{
                          backgroundColor: isValidHexColor
                            ? widgetPrimaryColor
                            : DEFAULT_WIDGET_FORM.primary_color,
                        }}
                      >
                        {sendingPreviewMessage
                          ? "Sending..."
                          : "Send Preview Message"}
                      </button>

                      <button
                        type="button"
                        onClick={handleResetPreviewConversation}
                        disabled={sendingPreviewMessage}
                        className="mt-2 h-9 w-full rounded-2xl border border-slate-200 bg-white text-slate-600 text-xs font-bold hover:bg-slate-50 disabled:opacity-60 disabled:cursor-not-allowed transition"
                      >
                        Start New Preview Conversation
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <section className="grid xl:grid-cols-[1fr_380px] gap-5">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-slate-950">
                    Embed Code
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Paste this snippet into your website HTML.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleCopyCode}
                  disabled={!embedCode || loading}
                  className="h-10 px-4 rounded-2xl bg-slate-950 text-white text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-slate-800 transition"
                >
                  {copyStatus || "Copy Code"}
                </button>
              </div>

              <pre className="mt-5 overflow-x-auto rounded-3xl bg-slate-950 p-5 text-sm text-blue-100">
                <code>
                  {loading
                    ? "Loading embed code..."
                    : embedCode || "Embed code is not available."}
                </code>
              </pre>

              <div className="mt-5 rounded-2xl border border-amber-100 bg-amber-50 px-5 py-4 text-sm leading-6 text-amber-800">
                For production, replace the CDN URL with your actual hosted
                widget script URL after the widget runtime is deployed.
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-xl font-black text-slate-950">
                Implementation Notes
              </h3>

              <div className="mt-4 space-y-3 text-sm leading-6 text-slate-600">
                <p>
                  Widget settings are saved into{" "}
                  <span className="font-black text-slate-800">
                    widget_settings
                  </span>{" "}
                  and consumed by the public runtime through the{" "}
                  <span className="font-black text-slate-800">
                    widget-config
                  </span>{" "}
                  Edge Function.
                </p>

                <p>
                  After saving, refresh your external page to verify that title,
                  subtitle, greeting, and color are updated.
                </p>

                <p>
                  Existing conversations will keep their message history. New
                  chat sessions will use the latest greeting message.
                </p>
              </div>
            </div>
          </section>
        </div>
      </main>
    </div>
  );
}