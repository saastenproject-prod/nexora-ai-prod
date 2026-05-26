import { motion } from "framer-motion";

import Topbar from "../components/layout/Topbar";

import {
  BrainCircuit,
  CalendarCheck,
  Headphones,
  ShoppingBag,
  Users,
} from "../lib/icons";

export default function UsecaseScreen({ setScreen }) {
  const primaryUsecases = [
    {
      key: "customer_support",
      title: "Answer Customer Queries",
      desc: "Automate FAQ, support questions, policy information, and route complex issues to agents.",
      icon: Headphones,
      badge: "Best for Support",
      gradient: "from-blue-600 to-indigo-600",
      features: ["FAQ automation", "Agent handoff", "Knowledge-ready"],
      botType: "customer_support",
      defaultBotName: "Customer Support Bot",
    },
    {
      key: "lead_qualification",
      title: "Lead Qualification",
      desc: "Ask guided questions, score prospects, collect contact details, and pass qualified leads to sales.",
      icon: Users,
      badge: "Best for Sales",
      gradient: "from-emerald-600 to-teal-500",
      features: ["Lead capture", "Qualification flow", "CRM-ready"],
      botType: "sales",
      defaultBotName: "Lead Qualification Bot",
    },
    {
      key: "sell_products",
      title: "Sell Products",
      desc: "Recommend products, answer pricing questions, and help customers request quotation or checkout support.",
      icon: ShoppingBag,
      badge: "Commerce",
      gradient: "from-orange-500 to-rose-500",
      features: ["Product guidance", "Quote request", "Promo flow"],
      botType: "commerce",
      defaultBotName: "Product Sales Bot",
    },
    {
      key: "appointment_booking",
      title: "Appointment Booking",
      desc: "Collect booking intent, preferred time, customer details, and route requests to the right team.",
      icon: CalendarCheck,
      badge: "Service Booking",
      gradient: "from-violet-600 to-fuchsia-500",
      features: ["Schedule request", "Customer data", "Reminder-ready"],
      botType: "appointment",
      defaultBotName: "Appointment Booking Bot",
    },
  ];

  const getSelectedChannel = () => {
    try {
      const raw = sessionStorage.getItem("nexora_create_chatbot_channel");
      return raw ? JSON.parse(raw) : null;
    } catch (error) {
      return null;
    }
  };

  const handleSelectUsecase = (usecase) => {
    const selectedChannel = getSelectedChannel();

    if (!selectedChannel?.channelType) {
      setScreen("platform");
      return;
    }

    const selectedUsecase = {
      useCase: usecase.key,
      useCaseName: usecase.title,
      botType: usecase.botType,
      defaultBotName: usecase.defaultBotName,
      description: usecase.desc,
    };

    sessionStorage.setItem(
      "nexora_create_chatbot_usecase",
      JSON.stringify(selectedUsecase)
    );

    setScreen("create-chatbot");
  };

  return (
    <div className="min-h-screen bg-[#F6F8FC]">
      <Topbar step={1} />

      <main className="max-w-7xl mx-auto px-8 py-8 space-y-7">
        <div className="flex items-end justify-between gap-5">
          <div>
            <p className="text-sm font-semibold text-blue-700 mb-2">
              Step 2 of 4
            </p>

            <h1 className="text-4xl font-black tracking-tight text-slate-950">
              Choose your chatbot objective
            </h1>

            <p className="mt-3 text-slate-500 max-w-2xl">
              Select the use case that matches your business goal. Nexora will
              prepare the initial flow structure automatically.
            </p>
          </div>

          <button
            type="button"
            onClick={() => setScreen("platform")}
            className="h-11 px-5 rounded-2xl border border-slate-200 bg-white text-sm font-semibold text-slate-700 hover:bg-slate-50 transition"
          >
            Back to Platform
          </button>
        </div>

        <section className="grid lg:grid-cols-[1fr_340px] gap-5">
          <div className="grid md:grid-cols-2 gap-5">
            {primaryUsecases.map((card) => {
              const Icon = card.icon;

              return (
                <motion.button
                  key={card.key}
                  type="button"
                  whileHover={{ y: -4 }}
                  onClick={() => handleSelectUsecase(card)}
                  className="group text-left overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm hover:shadow-xl transition"
                >
                  <div
                    className={`relative h-44 bg-gradient-to-br ${card.gradient} p-6 text-white`}
                  >
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.26),transparent_34%)]" />

                    <div className="relative flex items-start justify-between">
                      <div className="h-14 w-14 rounded-3xl bg-white/15 border border-white/20 backdrop-blur grid place-items-center">
                        <Icon size={28} />
                      </div>

                      <span className="rounded-full bg-white/15 border border-white/20 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                        {card.badge}
                      </span>
                    </div>

                    <h2 className="relative mt-8 text-2xl font-black tracking-tight">
                      {card.title}
                    </h2>
                  </div>

                  <div className="p-6">
                    <p className="text-sm leading-7 text-slate-500">
                      {card.desc}
                    </p>

                    <div className="mt-5 flex flex-wrap gap-2">
                      {card.features.map((feature) => (
                        <span
                          key={feature}
                          className="rounded-full bg-slate-100 px-3 py-1.5 text-xs font-semibold text-slate-600"
                        >
                          {feature}
                        </span>
                      ))}
                    </div>

                    <div className="mt-6 h-11 rounded-2xl bg-slate-950 text-white text-sm font-semibold grid place-items-center group-hover:bg-blue-600 transition">
                      Use this template
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>

          <aside className="space-y-5">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="font-black text-slate-950">Template preview</h3>

              <p className="mt-2 text-sm text-slate-500 leading-6">
                Each objective creates a ready-to-edit flow with greeting,
                questions, response branches, and handoff path.
              </p>

              <div className="mt-5 space-y-3">
                {[
                  ["Customer Support Starter", "6 nodes · Website / WhatsApp"],
                  ["Sales Lead Capture", "6 nodes · Website"],
                  ["WhatsApp Complaint Intake", "6 nodes · WhatsApp"],
                ].map(([name, desc]) => (
                  <div
                    key={name}
                    className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                  >
                    <p className="text-sm font-bold text-slate-950">{name}</p>
                    <p className="mt-1 text-xs text-slate-500">{desc}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-blue-100 bg-blue-50 p-6">
              <div className="h-12 w-12 rounded-2xl bg-white grid place-items-center text-blue-700 shadow-sm">
                <BrainCircuit size={22} />
              </div>

              <h3 className="mt-5 font-black text-slate-950">
                AI-ready setup
              </h3>

              <p className="mt-2 text-sm text-slate-600 leading-6">
                You can add AI Agent nodes later to answer based on knowledge
                documents, product catalog, or company FAQ.
              </p>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}