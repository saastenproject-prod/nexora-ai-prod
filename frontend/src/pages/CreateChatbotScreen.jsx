import { useEffect, useMemo, useState } from "react";

import Topbar from "../components/layout/Topbar";

import {
  Bot,
  CheckCircle2,
  Globe2,
  MessageCircle,
  Sparkles,
} from "../lib/icons";

import useCreateChatbot from "../hooks/useCreateChatbot";

export default function CreateChatbotScreen({ setScreen }) {
  const { loading, error, createChatbot } = useCreateChatbot();

  const [selectedChannel, setSelectedChannel] = useState(null);
  const [selectedUsecase, setSelectedUsecase] = useState(null);

  const [form, setForm] = useState({
    name: "",
    description: "",
  });

  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    try {
      const rawChannel = sessionStorage.getItem(
        "nexora_create_chatbot_channel"
      );
      const rawUsecase = sessionStorage.getItem(
        "nexora_create_chatbot_usecase"
      );

      const channel = rawChannel ? JSON.parse(rawChannel) : null;
      const usecase = rawUsecase ? JSON.parse(rawUsecase) : null;

      if (!channel?.channelType) {
        setScreen("platform");
        return;
      }

      if (!usecase?.useCase) {
        setScreen("usecase");
        return;
      }

      setSelectedChannel(channel);
      setSelectedUsecase(usecase);

      setForm({
        name: usecase.defaultBotName || "New Chatbot",
        description: usecase.description || "",
      });
    } catch (err) {
      setScreen("platform");
    }
  }, [setScreen]);

  const channelIcon = useMemo(() => {
    if (selectedChannel?.channelType === "whatsapp") {
      return MessageCircle;
    }

    return Globe2;
  }, [selectedChannel]);

  const ChannelIcon = channelIcon;

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedChannel || !selectedUsecase) return;

    try {
      await createChatbot({
        name: form.name,
        description: form.description,
        botType: selectedUsecase.botType,
        channelType: selectedChannel.channelType,
        useCase: selectedUsecase.useCase,
      });

      sessionStorage.removeItem("nexora_create_chatbot_channel");
      sessionStorage.removeItem("nexora_create_chatbot_usecase");

      setSuccessMessage("Chatbot created successfully.");

      setTimeout(() => {
        setScreen("flows");
      }, 900);
    } catch (err) {
      // Error sudah ditampilkan dari hook.
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FC]">
      <Topbar step={2} />

      <main className="max-w-7xl mx-auto px-8 py-8 space-y-7">
        <div className="flex items-end justify-between gap-5">
          <div>
            <p className="text-sm font-semibold text-blue-700 mb-2">
              Step 3 of 4
            </p>

            <h1 className="text-4xl font-black tracking-tight text-slate-950">
              Configure your chatbot
            </h1>

            <p className="mt-3 text-slate-500 max-w-2xl">
              Review your selected channel and objective, then create the bot.
              Nexora will generate the starter flow, widget setting, and channel
              configuration automatically.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setScreen("usecase")}
            className="h-11 px-5 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Back to Use Case
          </button>
        </div>

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {successMessage && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
            {successMessage}
          </div>
        )}

        <section className="grid xl:grid-cols-[1fr_420px] gap-5">
          <form
            onSubmit={handleSubmit}
            className="rounded-[2rem] border border-slate-200 bg-white p-7 shadow-sm"
          >
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-blue-50 text-blue-700 grid place-items-center">
                <Bot size={24} />
              </div>

              <div>
                <h2 className="text-xl font-black text-slate-950">
                  Bot Details
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  This information will be used for the generated bot and widget.
                </p>
              </div>
            </div>

            <div className="mt-7 space-y-5">
              <label className="block">
                <span className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Chatbot Name
                </span>

                <input
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Customer Support Bot"
                />
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Description
                </span>

                <textarea
                  className="mt-2 h-32 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none resize-none focus:ring-4 focus:ring-blue-100 focus:border-blue-400"
                  value={form.description}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      description: event.target.value,
                    }))
                  }
                  placeholder="Describe what this chatbot should help with..."
                />
              </label>
            </div>

            <div className="mt-7 flex flex-wrap gap-3">
              <button
                type="submit"
                disabled={loading || !form.name.trim()}
                className="h-12 px-6 rounded-2xl bg-blue-600 text-white text-sm font-black disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2"
              >
                <Sparkles size={17} />
                {loading ? "Creating Chatbot..." : "Create Chatbot"}
              </button>

              <button
                type="button"
                onClick={() => setScreen("home")}
                className="h-12 px-6 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
            </div>
          </form>

          <aside className="space-y-5">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-black text-slate-950">Setup Summary</h3>

              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-xl bg-white text-blue-700 grid place-items-center shadow-sm">
                      <ChannelIcon size={20} />
                    </div>

                    <div>
                      <p className="text-xs font-black text-slate-400 uppercase">
                        Channel
                      </p>
                      <p className="mt-1 text-sm font-black text-slate-950">
                        {selectedChannel?.channelName || "-"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black text-slate-400 uppercase">
                    Objective
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-950">
                    {selectedUsecase?.useCaseName || "-"}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {selectedUsecase?.description || ""}
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-4">
                  <p className="text-xs font-black text-emerald-700 uppercase">
                    Auto Generated
                  </p>

                  <div className="mt-3 space-y-2">
                    {[
                      "Bot record",
                      "Default flow",
                      "Starter nodes and edges",
                      "Channel configuration",
                      "Widget settings",
                    ].map((item) => (
                      <div
                        key={item}
                        className="flex items-center gap-2 text-sm font-bold text-slate-700"
                      >
                        <CheckCircle2 size={16} className="text-emerald-600" />
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-[2rem] border border-blue-100 bg-blue-50 p-6">
              <h3 className="font-black text-slate-950">After creation</h3>

              <p className="mt-2 text-sm text-slate-600 leading-6">
                You will be redirected to Chat Flows. From there, you can open
                Visual Builder, edit nodes, install widget, or upload knowledge
                documents.
              </p>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}