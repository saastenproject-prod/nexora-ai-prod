import { useEffect, useMemo, useState } from "react";
import ChatbotSubnav from "../components/layout/ChatbotSubnav";
import useAgentMarketplaceData from "../hooks/useAgentMarketplaceData";

const getIconEmoji = (icon) => {
  const map = {
    headphones: "🎧",
    briefcase: "💼",
    users: "👥",
    wallet: "💳",
    settings: "🛠️",
    "shopping-cart": "🛒",
  };

  return map[icon] || "🤖";
};

const getDifficultyLabel = (metadata) => {
  return metadata?.difficulty || "beginner";
};

const formatFeatureType = (value) => {
  if (!value) return "Feature";

  return String(value)
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
};

export default function AgentMarketplaceScreen({ setScreen }) {
  const {
    loading,
    error,

    categories,
    filteredTemplates,
    selectedCategorySlug,
    selectedTemplateId,
    selectedTemplate,
    selectedTemplateFeatures,

    selectCategory,
    selectTemplate,
    saveSelectedTemplate,
    refetch,
  } = useAgentMarketplaceData();

  const [enabledFeatureIds, setEnabledFeatureIds] = useState([]);
  const [statusMessage, setStatusMessage] = useState("");

  useEffect(() => {
    if (!selectedTemplateFeatures.length) {
      setEnabledFeatureIds([]);
      return;
    }

    const defaultEnabledIds = selectedTemplateFeatures
      .filter((feature) => feature.default_enabled)
      .map((feature) => feature.id);

    setEnabledFeatureIds(defaultEnabledIds);
  }, [selectedTemplate?.id, selectedTemplateFeatures]);

  const enabledFeatures = useMemo(() => {
    return selectedTemplateFeatures.filter((feature) =>
      enabledFeatureIds.includes(feature.id)
    );
  }, [selectedTemplateFeatures, enabledFeatureIds]);

  const disabledFeatures = useMemo(() => {
    return selectedTemplateFeatures.filter(
      (feature) => !enabledFeatureIds.includes(feature.id)
    );
  }, [selectedTemplateFeatures, enabledFeatureIds]);

  const toggleFeature = (featureId) => {
    setEnabledFeatureIds((current) => {
      if (current.includes(featureId)) {
        return current.filter((id) => id !== featureId);
      }

      return [...current, featureId];
    });
  };

  const handleUseTemplate = () => {
    setStatusMessage("");

    try {
      saveSelectedTemplate({
        enabledFeatureIds,
      });

      setStatusMessage("Template selected. Continue to Configure Bot.");

      setTimeout(() => {
        setScreen?.("create-chatbot");
      }, 350);
    } catch (err) {
      setStatusMessage(err?.message || "Failed to select template.");
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FC] flex">
      <ChatbotSubnav setScreen={setScreen} activeMenu="agent-marketplace" />

      <main className="ml-64 flex-1 min-w-0">
        {/* Header */}
        <div className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-[0_1px_0_rgba(15,23,42,0.03)]">
          <div className="px-8 h-[76px] flex items-center justify-between gap-5">
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
                Agent Marketplace
              </p>
              <h1 className="mt-1 text-2xl font-black text-slate-950">
                Pre-built AI Agent Templates
              </h1>
              <p className="mt-1 text-sm text-slate-500">
                Choose an AI agent template and configure it for your business
                workflow.
              </p>
            </div>

            <div className="flex shrink-0 items-center gap-3">
              <button
                type="button"
                onClick={refetch}
                className="h-11 px-5 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition"
              >
                Refresh 🔄️
              </button>

              {/* <button
                type="button"
                onClick={() => setScreen?.("create-chatbot")}
                className="h-11 px-5 rounded-2xl bg-blue-600 text-white text-sm font-black shadow-sm hover:bg-blue-700 transition"
              >
                Create Custom Bot
              </button> */}
            </div>
          </div>
        </div>

        <div className="px-8 py-7 space-y-6">
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          {statusMessage && (
            <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm font-semibold text-blue-700">
              {statusMessage}
            </div>
          )}

          {/* Hero */}
          <section className="relative overflow-hidden rounded-[1.75rem] bg-slate-950 p-7 lg:p-8 shadow-sm ring-1 ring-slate-900/5">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,0.45),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(16,185,129,0.32),transparent_30%)]" />
            <div className="absolute right-0 top-0 h-40 w-40 rounded-full bg-blue-500/20 blur-3xl" />
            <div className="absolute left-0 bottom-0 h-40 w-40 rounded-full bg-emerald-500/20 blur-3xl" />

            <div className="relative flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-xs font-bold text-blue-50">
                  🤖 Agent Templates
                </div>

                <h2 className="mt-5 text-2xl lg:text-3xl font-black tracking-tight text-white">
                  Launch AI agents faster with ready-to-configure templates.
                </h2>

                <p className="mt-3 max-w-3xl text-sm text-blue-100 leading-7">
                  Select a template for Customer Service, Sales, HR, Finance, IT
                  Support, or E-Commerce. Nexora prepares the role, tone,
                  greeting, and recommended features automatically.
                </p>
              </div>

              <div className="hidden xl:block rounded-3xl border border-white/10 bg-white/10 p-5 backdrop-blur">
                <p className="text-xs font-bold uppercase tracking-wide text-blue-100">
                  Setup Speed
                </p>
                <p className="mt-2 text-3xl font-black text-white">3 min</p>
                <p className="mt-1 text-xs text-blue-100">
                  From template to draft bot
                </p>
              </div>
            </div>
          </section>

          {/* Category Chips */}
          <section className="rounded-[1.75rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-950">
                  Browse Templates
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Filter by business category or select a template directly.
                </p>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => selectCategory("all")}
                  className={`h-10 px-4 rounded-full border text-sm font-black transition ${
                    selectedCategorySlug === "all"
                      ? "bg-slate-950 border-slate-950 text-white shadow-sm"
                      : "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50"
                  }`}
                >
                  ✨ All Templates
                </button>

                {categories.map((category) => {
                  const active = selectedCategorySlug === category.slug;

                  return (
                    <button
                      key={category.id}
                      type="button"
                      onClick={() => selectCategory(category.slug)}
                      className={`h-10 px-4 rounded-full border text-sm font-black transition ${
                        active
                          ? "bg-slate-950 border-slate-950 text-white shadow-sm"
                          : "bg-white border-slate-200 text-slate-700 hover:bg-slate-50"
                      }`}
                    >
                      <span className="mr-2">
                        {getIconEmoji(category.icon)}
                      </span>
                      {category.name}
                    </button>
                  );
                })}
              </div>
            </div>
          </section>

          {/* Main Layout */}
          <section className="grid grid-cols-1 2xl:grid-cols-[minmax(0,1fr)_430px] gap-6 items-start">
            {/* Templates List */}
            <section className="min-w-0 rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="mb-6 flex items-end justify-between gap-4">
                <div>
                  <h3 className="text-2xl font-black text-slate-950">
                    Agent Templates
                  </h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {loading
                      ? "Loading templates..."
                      : `${filteredTemplates.length} templates available`}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
                {loading &&
                  Array.from({ length: 6 }).map((_, index) => (
                    <div
                      key={index}
                      className="h-64 rounded-[1.75rem] border border-slate-200 bg-slate-50 animate-pulse"
                    />
                  ))}

                {!loading &&
                  filteredTemplates.map((template) => {
                    const isSelected = selectedTemplateId === template.id;
                    const categoryColor = template.category?.color || "#2563eb";

                    return (
                      <button
                        key={template.id}
                        type="button"
                        onClick={() => selectTemplate(template.id)}
                        className={`group text-left rounded-[1.75rem] border p-6 transition bg-white min-h-[270px] shadow-[0_1px_2px_rgba(15,23,42,0.04)] ${
                          isSelected
                            ? "border-blue-400 ring-4 ring-blue-100 shadow-md"
                            : "border-slate-200 hover:border-blue-200 hover:-translate-y-0.5 hover:shadow-md"
                        }`}
                      >
                        <div className="flex h-full flex-col">
                          <div className="flex items-start justify-between gap-4">
                            <div
                              className="h-12 w-12 shrink-0 rounded-2xl grid place-items-center text-xl"
                              style={{
                                backgroundColor: `${categoryColor}18`,
                              }}
                            >
                              {getIconEmoji(template.category?.icon)}
                            </div>

                            <span className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">
                              {getDifficultyLabel(template.metadata)}
                            </span>
                          </div>

                          <div className="mt-5">
                            <h4 className="text-xl font-black leading-snug text-slate-950 group-hover:text-blue-700 transition">
                              {template.name}
                            </h4>

                            <p className="mt-1 text-xs font-bold text-slate-400 uppercase tracking-wide">
                              {template.category?.name || "Uncategorized"}
                            </p>

                            <p className="mt-4 text-sm leading-6 text-slate-600 line-clamp-3">
                              {template.description}
                            </p>
                          </div>

                          <div className="mt-auto pt-5 flex flex-wrap gap-2">
                            <span className="rounded-full bg-blue-50 px-3 py-1 text-[11px] font-black text-blue-700">
                              {template.default_language || "id"}
                            </span>
                            <span className="rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700">
                              {template.default_tone || "professional"}
                            </span>
                            <span className="rounded-full bg-slate-100 px-3 py-1 text-[11px] font-black text-slate-600">
                              {template.recommended_channel || "website"}
                            </span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
              </div>

              {!loading && filteredTemplates.length === 0 && (
                <div className="rounded-[1.75rem] border border-slate-200 bg-slate-50 p-10 text-center">
                  <p className="font-black text-slate-950">
                    No template found.
                  </p>
                  <p className="mt-2 text-sm text-slate-500">
                    Try another category or refresh marketplace data.
                  </p>
                </div>
              )}
            </section>

            {/* Detail Panel */}
            <aside className="rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-sm ring-1 ring-slate-900/[0.02] 2xl:sticky 2xl:top-28">
              {!selectedTemplate && (
                <div className="rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-6 text-center">
                  <div className="mx-auto h-14 w-14 rounded-2xl bg-white border border-slate-200 grid place-items-center text-2xl shadow-sm">
                    🤖
                  </div>
                  <p className="mt-4 font-black text-slate-950">
                    Select a template
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-500">
                    Choose an agent template to preview default setup,
                    recommended features, and automation modules.
                  </p>
                </div>
              )}

              {selectedTemplate && (
                <>
                  <div className="flex items-start gap-4">
                    <div
                      className="h-14 w-14 shrink-0 rounded-2xl grid place-items-center text-2xl"
                      style={{
                        backgroundColor: `${
                          selectedTemplate.category?.color || "#2563eb"
                        }18`,
                      }}
                    >
                      {getIconEmoji(selectedTemplate.category?.icon)}
                    </div>

                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-black text-blue-600 uppercase tracking-wide">
                        {selectedTemplate.category?.name || "Template"}
                      </p>

                      <h3 className="mt-1 text-2xl font-black leading-tight text-slate-950">
                        {selectedTemplate.name}
                      </h3>

                      <p className="mt-3 text-sm leading-6 text-slate-600">
                        {selectedTemplate.description}
                      </p>
                    </div>
                  </div>

                  <div className="mt-6 rounded-3xl bg-slate-50/80 border border-slate-200 p-5">
                    <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                      Default Setup
                    </p>

                    <div className="mt-4 space-y-4 text-sm">
                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500">Role</span>
                        <span className="font-black text-slate-800 text-right">
                          {selectedTemplate.default_role_description || "-"}
                        </span>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500">Tone</span>
                        <span className="font-black text-slate-800 text-right">
                          {selectedTemplate.default_tone || "-"}
                        </span>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500">Language</span>
                        <span className="font-black text-slate-800 text-right">
                          {selectedTemplate.default_language || "-"}
                        </span>
                      </div>

                      <div className="flex justify-between gap-4">
                        <span className="text-slate-500">Channel</span>
                        <span className="font-black text-slate-800 text-right">
                          {selectedTemplate.recommended_channel || "-"}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <h4 className="text-lg font-black text-slate-950">
                          Pre-built Features
                        </h4>
                        <p className="mt-1 text-xs leading-5 text-slate-500">
                          Enable or disable features before creating the bot.
                        </p>
                      </div>

                      <span className="shrink-0 rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                        {enabledFeatures.length}/
                        {selectedTemplateFeatures.length}
                      </span>
                    </div>

                    <div className="mt-4 space-y-3 max-h-[340px] overflow-y-auto pr-1">
                      {selectedTemplateFeatures.map((feature) => {
                        const enabled = enabledFeatureIds.includes(feature.id);

                        return (
                          <label
                            key={feature.id}
                            className={`block rounded-2xl border p-4 cursor-pointer transition ${
                              enabled
                                ? "border-blue-200 bg-blue-50"
                                : "border-slate-200 bg-white hover:bg-slate-50"
                            }`}
                          >
                            <div className="flex items-start gap-3">
                              <input
                                type="checkbox"
                                checked={enabled}
                                onChange={() => toggleFeature(feature.id)}
                                className="mt-1 h-4 w-4 shrink-0 accent-blue-600"
                              />

                              <div className="min-w-0">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="font-black text-slate-950">
                                    {feature.feature_name}
                                  </p>

                                  <span className="rounded-full bg-white border border-slate-200 px-2 py-0.5 text-[10px] font-black text-slate-500">
                                    {formatFeatureType(feature.feature_type)}
                                  </span>
                                </div>

                                <p className="mt-2 text-sm leading-5 text-slate-600">
                                  {feature.description}
                                </p>

                                {feature.required_data && (
                                  <p className="mt-2 text-xs leading-5 text-slate-500">
                                    <span className="font-black">
                                      Required:
                                    </span>{" "}
                                    {feature.required_data}
                                  </p>
                                )}
                              </div>
                            </div>
                          </label>
                        );
                      })}

                      {!selectedTemplateFeatures.length && (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                          No pre-built feature configured for this template.
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="mt-6 border-t border-slate-200 pt-5">
                    <button
                      type="button"
                      onClick={handleUseTemplate}
                      className="h-12 w-full rounded-2xl bg-blue-600 text-white text-sm font-black shadow-sm hover:bg-blue-700 transition"
                    >
                      Use Template
                    </button>

                    {/* <button
                      type="button"
                      onClick={() => setScreen?.("create-chatbot")}
                      className="mt-3 h-11 w-full rounded-2xl border border-slate-200 bg-white text-sm font-black text-slate-700 hover:bg-slate-50 transition"
                    >
                      Start Without Template
                    </button> */}
                  </div>

                  {disabledFeatures.length > 0 && (
                    <p className="mt-4 text-xs leading-5 text-slate-500">
                      Disabled features can be enabled later from Feature
                      Management.
                    </p>
                  )}
                </>
              )}
            </aside>
          </section>
        </div>
      </main>
    </div>
  );
}
