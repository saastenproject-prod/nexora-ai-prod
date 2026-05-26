import { motion } from "framer-motion";

import Topbar from "../components/layout/Topbar";

import {
  Camera,
  Globe2,
  MessageCircle,
  Send,
  Users,
} from "../lib/icons";

export default function PlatformScreen({ setScreen }) {
  const featuredChannels = [
    {
      key: "website",
      title: "Website Widget",
      desc: "Launch a floating chat bubble on any website with one script installation.",
      icon: Globe2,
      badge: "Recommended",
      gradient: "from-blue-600 to-cyan-500",
      metrics: "Fastest setup",
      provider: "web_widget",
    },
    {
      key: "whatsapp",
      title: "WhatsApp Automation",
      desc: "Connect WhatsApp to automate customer conversations, collect leads, and support agent handoff.",
      icon: MessageCircle,
      badge: "Most Used",
      gradient: "from-emerald-600 to-teal-500",
      metrics: "High conversion",
      provider: "waba",
    },
  ];

  const moreChannels = [
    {
      title: "Instagram",
      desc: "Automate DM and comment handling.",
      icon: Camera,
      status: "Soon",
    },
    {
      title: "Facebook",
      desc: "Handle Messenger-style customer chats.",
      icon: MessageCircle,
      status: "Soon",
    },
    {
      title: "Telegram",
      desc: "Build secure Telegram bot journeys.",
      icon: Send,
      status: "Soon",
    },
    {
      title: "Microsoft Teams",
      desc: "Automate internal employee support.",
      icon: Users,
      status: "Soon",
    },
  ];

  const handleSelectChannel = (channel) => {
    const selectedChannel = {
      channelType: channel.key,
      channelName: channel.title,
      provider: channel.provider,
    };

    sessionStorage.setItem(
      "nexora_create_chatbot_channel",
      JSON.stringify(selectedChannel)
    );

    setScreen("usecase");
  };

  return (
    <div className="min-h-screen bg-[#F6F8FC]">
      <Topbar step={0} />

      <main className="max-w-7xl mx-auto px-8 py-8 space-y-7">
        <div className="flex items-end justify-between gap-5">
          <div>
            <p className="text-sm font-semibold text-blue-700 mb-2">
              Step 1 of 4
            </p>

            <h1 className="text-4xl font-black tracking-tight text-slate-950">
              Select your customer channel
            </h1>

            <p className="mt-3 text-slate-500 max-w-2xl">
              Choose where Nexora will automate conversations. For MVP, Website
              Widget and WhatsApp are the priority channels.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setScreen("home")}
            className="h-11 px-5 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Back to Dashboard
          </button>
        </div>

        <section className="grid lg:grid-cols-2 gap-5">
          {featuredChannels.map((card) => {
            const Icon = card.icon;

            return (
              <motion.button
                key={card.key}
                type="button"
                whileHover={{ y: -4 }}
                onClick={() => handleSelectChannel(card)}
                className="group text-left overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm hover:shadow-xl transition"
              >
                <div
                  className={`relative h-56 bg-gradient-to-br ${card.gradient} p-7 text-white`}
                >
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.28),transparent_32%)]" />

                  <div className="relative flex items-start justify-between">
                    <div className="h-16 w-16 rounded-3xl bg-white/15 backdrop-blur grid place-items-center border border-white/20">
                      <Icon size={32} />
                    </div>

                    <span className="rounded-full bg-white/15 border border-white/20 px-4 py-1.5 text-xs font-semibold backdrop-blur">
                      {card.badge}
                    </span>
                  </div>

                  <div className="relative mt-10">
                    <p className="text-sm text-white/75 font-medium">
                      {card.metrics}
                    </p>

                    <h2 className="mt-2 text-3xl font-black tracking-tight">
                      {card.title}
                    </h2>
                  </div>
                </div>

                <div className="p-6 flex items-end justify-between gap-5">
                  <p className="text-sm leading-7 text-slate-500 max-w-md">
                    {card.desc}
                  </p>

                  <div className="h-11 px-5 rounded-2xl bg-slate-950 text-white text-sm font-semibold grid place-items-center group-hover:bg-blue-600 transition">
                    Select
                  </div>
                </div>
              </motion.button>
            );
          })}
        </section>

        <section className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-xl font-black text-slate-950">
                Additional channels
              </h2>

              <p className="text-sm text-slate-500 mt-1">
                Prepare your product roadmap without blocking the first release.
              </p>
            </div>

            <span className="rounded-full bg-amber-50 text-amber-700 px-4 py-2 text-xs font-bold">
              Roadmap
            </span>
          </div>

          <div className="grid sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {moreChannels.map((card) => {
              const Icon = card.icon;

              return (
                <div
                  key={card.title}
                  className="rounded-3xl border border-slate-200 bg-slate-50 p-5 opacity-80"
                >
                  <div className="flex items-start justify-between">
                    <div className="h-12 w-12 rounded-2xl bg-white grid place-items-center text-slate-700 shadow-sm">
                      <Icon size={22} />
                    </div>

                    <span className="rounded-full bg-white px-3 py-1 text-[11px] font-bold text-slate-500 border border-slate-200">
                      {card.status}
                    </span>
                  </div>

                  <h3 className="mt-5 font-bold text-slate-950">
                    {card.title}
                  </h3>

                  <p className="mt-2 text-sm text-slate-500 leading-6">
                    {card.desc}
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </main>
    </div>
  );
}