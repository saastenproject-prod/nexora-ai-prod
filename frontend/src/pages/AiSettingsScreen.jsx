import ChatbotSubnav from "../components/layout/ChatbotSubnav";
import { useRef, useState } from "react";
import { BookOpen, BrainCircuit, Plus } from "../lib/icons";
import useAiSettingsData from "../hooks/useAiSettingsData";

const DEFAULT_ARTICLE_FORM = {
  title: "",
  category: "",
  tags: "",
  content: "",
  status: "draft",
};

export default function AiSettingsScreen({ setScreen }) {
  const {
    loading,
    savingSettings,
    savingArticle,
    error,

    activeBot,
    settings,
    articles,
    documents,
    stats,

    updateSettingField,
    saveSettings,

    createArticle,
    updateArticleStatus,
    deleteArticle,

    uploadKnowledgeDocument,
    indexTextKnowledgeDocument,
    refetch,
  } = useAiSettingsData();

  const fileInputRef = useRef(null);

  const [uploading, setUploading] = useState(false);
  const [indexingDocumentId, setIndexingDocumentId] = useState(null);
  const [saveStatus, setSaveStatus] = useState("");
  const [articleError, setArticleError] = useState("");
  const [articleForm, setArticleForm] = useState(DEFAULT_ARTICLE_FORM);

  const handleOpenFilePicker = () => {
    fileInputRef.current?.click();
  };

  const handleUploadFile = async (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    setUploading(true);

    try {
      await uploadKnowledgeDocument(file);
      event.target.value = "";
    } catch (err) {
      // Error sudah ditampilkan dari hook.
    } finally {
      setUploading(false);
    }
  };

  const handleIndexDocument = async (document) => {
    setIndexingDocumentId(document.id);

    try {
      await indexTextKnowledgeDocument(document);
    } catch (err) {
      // Error sudah ditampilkan dari hook.
    } finally {
      setIndexingDocumentId(null);
    }
  };

  const updateArticleForm = (field, value) => {
    setArticleError("");

    setArticleForm((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const handleSaveSettings = async () => {
    setSaveStatus("");

    try {
      await saveSettings();
      setSaveStatus("Saved");

      setTimeout(() => {
        setSaveStatus("");
      }, 1800);
    } catch (err) {
      setSaveStatus("Save failed");

      setTimeout(() => {
        setSaveStatus("");
      }, 1800);
    }
  };

  const handleCreateArticle = async (event) => {
    event.preventDefault();

    setArticleError("");

    if (!articleForm.title.trim()) {
      setArticleError("Article title wajib diisi.");
      return;
    }

    if (!articleForm.content.trim()) {
      setArticleError("Article content wajib diisi.");
      return;
    }

    try {
      await createArticle(articleForm);
      setArticleForm(DEFAULT_ARTICLE_FORM);
    } catch (err) {
      setArticleError(err?.message || "Failed to create article.");
    }
  };

  const handleDeleteArticle = async (article) => {
    const confirmed = window.confirm(`Delete article "${article.title}"?`);

    if (!confirmed) return;

    await deleteArticle(article.id);
  };

  const formatStatus = (status) => {
    if (!status) return "Unknown";

    return status
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatSourceType = (sourceType) => {
    if (!sourceType) return "-";

    return sourceType
      .split("_")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ");
  };

  const formatUpdatedAt = (value) => {
    if (!value) return "-";

    const date = new Date(value);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);

    if (diffMinutes < 1) return "Just now";
    if (diffMinutes < 60) return `${diffMinutes}m ago`;

    const diffHours = Math.floor(diffMinutes / 60);
    if (diffHours < 24) return `${diffHours}h ago`;

    const diffDays = Math.floor(diffHours / 24);
    if (diffDays === 1) return "Yesterday";
    if (diffDays < 7) return `${diffDays}d ago`;

    return date.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const getStatusClass = (status) => {
    if (status === "indexed") return "bg-emerald-50 text-emerald-700";
    if (status === "published") return "bg-emerald-50 text-emerald-700";
    if (status === "processing") return "bg-amber-50 text-amber-700";
    if (status === "uploaded") return "bg-blue-50 text-blue-700";
    if (status === "draft") return "bg-slate-100 text-slate-600";
    if (status === "failed") return "bg-red-50 text-red-700";
    if (status === "archived") return "bg-slate-100 text-slate-600";

    return "bg-slate-100 text-slate-600";
  };

  const getHealthDescription = () => {
    if (stats.totalDocuments === 0 && stats.totalArticles === 0) {
      return "No knowledge source has been added yet.";
    }

    if (stats.knowledgeHealth >= 80) {
      return "Most knowledge sources are ready for AI responses.";
    }

    if (stats.knowledgeHealth >= 50) {
      return "Some knowledge sources are ready, but coverage can still be improved.";
    }

    return "Knowledge coverage is still low. Upload documents or publish articles.";
  };

  return (
    <div className="min-h-screen bg-[#F6F8FC] flex">
      <ChatbotSubnav setScreen={setScreen} activeMenu="ai-settings" />

      <main className="flex-1 min-w-0">
        <div className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl px-8 h-16 flex items-center justify-between">
          <div>
            <h1 className="font-black text-slate-950">AI Settings</h1>
            <p className="text-xs text-slate-500 mt-1">
              Configure instructions, restrictions, knowledge, and AI behavior.
            </p>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={refetch}
              className="h-10 px-4 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700"
            >
              Refresh Data
            </button>

            <button
              type="button"
              onClick={() => setScreen("builder")}
              className="h-10 px-4 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700"
            >
              Open Builder
            </button>

            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={savingSettings || loading}
              className="h-10 px-4 rounded-2xl bg-blue-600 text-white text-sm font-bold disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {savingSettings ? "Saving..." : saveStatus || "Save Settings"}
            </button>
          </div>
        </div>

        <div className="px-8 py-7 space-y-6">
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          <section className="grid xl:grid-cols-[1fr_360px] gap-5">
            <div className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-8 shadow-xl">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.45),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(37,99,235,0.35),transparent_32%)]" />

              <div className="relative max-w-3xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-blue-50 mb-5">
                  <BrainCircuit size={16} />
                  Bot: {activeBot?.name || "Loading..."}
                </div>

                <h2 className="text-4xl font-black tracking-tight text-white">
                  BotPenguin-style AI control center.
                </h2>

                <p className="mt-3 text-blue-100 leading-7">
                  Configure AI identity, instructions, restrictions, response
                  behavior, knowledge documents, and manual articles for this
                  chatbot.
                </p>
              </div>
            </div>

            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <p className="font-black text-slate-950">Training Status</p>

              <div className="mt-5 rounded-3xl bg-blue-50 border border-blue-100 p-5">
                <p className="text-xs font-black text-blue-700 uppercase tracking-wide">
                  Knowledge Health
                </p>

                <p className="mt-2 text-4xl font-black text-slate-950">
                  {loading ? "..." : `${stats.knowledgeHealth}%`}
                </p>

                <p className="mt-2 text-sm text-slate-600">
                  {getHealthDescription()}
                </p>
              </div>

              <div className="mt-5 grid grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black text-slate-400 uppercase">
                    Documents
                  </p>
                  <p className="mt-2 text-2xl font-black text-slate-950">
                    {loading ? "..." : stats.totalDocuments}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black text-slate-400 uppercase">
                    Articles
                  </p>
                  <p className="mt-2 text-2xl font-black text-slate-950">
                    {loading ? "..." : stats.totalArticles}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black text-slate-400 uppercase">
                    Indexed
                  </p>
                  <p className="mt-2 text-2xl font-black text-slate-950">
                    {loading ? "..." : stats.indexedDocuments}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black text-slate-400 uppercase">
                    Published
                  </p>
                  <p className="mt-2 text-2xl font-black text-slate-950">
                    {loading ? "..." : stats.publishedArticles}
                  </p>
                </div>
              </div>
            </div>
          </section>

          <section className="grid xl:grid-cols-[1fr_420px] gap-5">
            <div className="space-y-5">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-black text-slate-950">
                  AI Identity
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Define the assistant identity, tone, language, and role.
                </p>

                <div className="mt-6 grid md:grid-cols-2 gap-5">
                  <label className="block">
                    <span className="text-xs font-black uppercase tracking-wide text-slate-400">
                      AI Name
                    </span>
                    <input
                      value={settings.ai_name || ""}
                      onChange={(event) =>
                        updateSettingField("ai_name", event.target.value)
                      }
                      className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none focus:ring-4 focus:ring-blue-100"
                      placeholder="Customer Support AI"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-black uppercase tracking-wide text-slate-400">
                      Company Name
                    </span>
                    <input
                      value={settings.company_name || ""}
                      onChange={(event) =>
                        updateSettingField("company_name", event.target.value)
                      }
                      className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none focus:ring-4 focus:ring-blue-100"
                      placeholder="Saasten"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-black uppercase tracking-wide text-slate-400">
                      Default Language
                    </span>
                    <select
                      value={settings.default_language || "id"}
                      onChange={(event) =>
                        updateSettingField("default_language", event.target.value)
                      }
                      className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none"
                    >
                      <option value="id">Indonesian</option>
                      <option value="en">English</option>
                      <option value="auto">Auto detect</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-xs font-black uppercase tracking-wide text-slate-400">
                      Tone
                    </span>
                    <select
                      value={settings.tone || "professional"}
                      onChange={(event) =>
                        updateSettingField("tone", event.target.value)
                      }
                      className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none"
                    >
                      <option value="professional">Professional</option>
                      <option value="friendly">Friendly</option>
                      <option value="concise">Concise</option>
                      <option value="formal">Formal</option>
                      <option value="casual">Casual</option>
                    </select>
                  </label>
                </div>

                <label className="block mt-5">
                  <span className="text-xs font-black uppercase tracking-wide text-slate-400">
                    Role Description
                  </span>
                  <textarea
                    value={settings.role_description || ""}
                    onChange={(event) =>
                      updateSettingField("role_description", event.target.value)
                    }
                    className="mt-2 h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none resize-none focus:ring-4 focus:ring-blue-100"
                    placeholder="Customer support assistant..."
                  />
                </label>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-black text-slate-950">
                  Instructions & Guardrails
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Configure what the AI should do and what it must not do.
                </p>

                <div className="mt-6 space-y-5">
                  <label className="block">
                    <span className="text-xs font-black uppercase tracking-wide text-slate-400">
                      Main Instruction
                    </span>
                    <textarea
                      value={settings.main_instruction || ""}
                      onChange={(event) =>
                        updateSettingField("main_instruction", event.target.value)
                      }
                      className="mt-2 h-32 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none resize-none focus:ring-4 focus:ring-indigo-100"
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-black uppercase tracking-wide text-slate-400">
                      Business Context
                    </span>
                    <textarea
                      value={settings.business_context || ""}
                      onChange={(event) =>
                        updateSettingField("business_context", event.target.value)
                      }
                      className="mt-2 h-28 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none resize-none focus:ring-4 focus:ring-indigo-100"
                      placeholder="Explain company services, support policy, target customer, product scope..."
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-black uppercase tracking-wide text-slate-400">
                      Restrictions / Larangan Agent & LLM
                    </span>
                    <textarea
                      value={settings.restrictions || ""}
                      onChange={(event) =>
                        updateSettingField("restrictions", event.target.value)
                      }
                      className="mt-2 h-32 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none resize-none focus:ring-4 focus:ring-indigo-100"
                      placeholder="Jangan mengarang informasi. Jangan menjanjikan harga. Jangan menjawab di luar knowledge base..."
                    />
                  </label>

                  <label className="block">
                    <span className="text-xs font-black uppercase tracking-wide text-slate-400">
                      Fallback Message
                    </span>
                    <textarea
                      value={settings.fallback_message || ""}
                      onChange={(event) =>
                        updateSettingField("fallback_message", event.target.value)
                      }
                      className="mt-2 h-24 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none resize-none focus:ring-4 focus:ring-indigo-100"
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-black text-slate-950">
                  Response Behavior & Handoff Rules
                </h2>

                <div className="mt-6 grid md:grid-cols-2 gap-5">
                  <label className="block">
                    <span className="text-xs font-black uppercase tracking-wide text-slate-400">
                      Answer Length
                    </span>
                    <select
                      value={settings.answer_length || "medium"}
                      onChange={(event) =>
                        updateSettingField("answer_length", event.target.value)
                      }
                      className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none"
                    >
                      <option value="short">Short</option>
                      <option value="medium">Medium</option>
                      <option value="detailed">Detailed</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-xs font-black uppercase tracking-wide text-slate-400">
                      Handoff Target
                    </span>
                    <select
                      value={settings.handoff_target || "support_agent"}
                      onChange={(event) =>
                        updateSettingField("handoff_target", event.target.value)
                      }
                      className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none"
                    >
                      <option value="support_agent">Support Agent</option>
                      <option value="sales_agent">Sales Agent</option>
                      <option value="technical_agent">Technical Agent</option>
                      <option value="general_queue">General Queue</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className="text-xs font-black uppercase tracking-wide text-slate-400">
                      Confidence Threshold
                    </span>
                    <input
                      type="number"
                      min="0"
                      max="1"
                      step="0.05"
                      value={settings.confidence_threshold ?? 0.7}
                      onChange={(event) =>
                        updateSettingField(
                          "confidence_threshold",
                          Number(event.target.value)
                        )
                      }
                      className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none"
                    />
                  </label>
                </div>

                <div className="mt-6 grid md:grid-cols-2 gap-3">
                  {[
                    ["use_bullets", "Use bullet points"],
                    ["ask_follow_up", "Ask follow-up question"],
                    ["show_sources", "Show knowledge sources"],
                    ["handoff_when_no_answer", "Handoff when no answer"],
                    [
                      "handoff_when_customer_requests_agent",
                      "Handoff when customer asks human",
                    ],
                    [
                      "handoff_when_pricing_request",
                      "Handoff for pricing/proposal request",
                    ],
                  ].map(([field, label]) => (
                    <label
                      key={field}
                      className="flex items-start gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={Boolean(settings[field])}
                        onChange={(event) =>
                          updateSettingField(field, event.target.checked)
                        }
                        className="mt-1 h-4 w-4"
                      />
                      <span className="text-sm font-bold text-slate-700">
                        {label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
                <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                  <div>
                    <h2 className="text-xl font-black text-slate-950">
                      Knowledge Documents
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Upload and index documents used by AI Agent nodes.
                    </p>
                  </div>

                  <div>
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".pdf,.docx,.txt,.csv,.xlsx"
                      className="hidden"
                      onChange={handleUploadFile}
                    />

                    <button
                      type="button"
                      onClick={handleOpenFilePicker}
                      disabled={uploading}
                      className="h-10 px-4 rounded-2xl bg-blue-600 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <Plus size={16} />
                      {uploading ? "Uploading..." : "Upload Document"}
                    </button>
                  </div>
                </div>

                <div className="p-6">
                  <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                    <div className="mx-auto h-14 w-14 rounded-2xl bg-white text-blue-700 grid place-items-center shadow-sm">
                      <BookOpen size={24} />
                    </div>

                    <h3 className="mt-4 font-black text-slate-950">
                      Drop files here or browse
                    </h3>

                    <p className="mt-2 text-sm text-slate-500">
                      Supported: PDF, DOCX, TXT, CSV, XLSX. Manual indexing
                      currently supports TXT.
                    </p>
                  </div>

                  <div className="mt-6 divide-y divide-slate-100 rounded-3xl border border-slate-200 overflow-hidden">
                    {loading && (
                      <div className="p-5 text-sm font-semibold text-slate-500">
                        Loading knowledge documents...
                      </div>
                    )}

                    {!loading && documents.length === 0 && (
                      <div className="p-5 text-sm font-semibold text-slate-500">
                        No knowledge documents found.
                      </div>
                    )}

                    {!loading &&
                      documents.map((doc) => (
                        <div
                          key={doc.id}
                          className="p-5 flex items-center justify-between hover:bg-slate-50 transition"
                        >
                          <div className="flex items-center gap-4">
                            <div className="h-11 w-11 rounded-2xl bg-blue-50 text-blue-700 grid place-items-center">
                              <BookOpen size={19} />
                            </div>

                            <div>
                              <p className="font-black text-slate-950">
                                {doc.file_name}
                              </p>

                              <p className="mt-1 text-xs text-slate-500">
                                {formatSourceType(doc.source_type)} ·{" "}
                                {doc.total_chunks || 0} chunks ·{" "}
                                {doc.indexed_chunks || 0} indexed · Updated{" "}
                                {formatUpdatedAt(doc.updated_at)}
                              </p>

                              {doc.description && (
                                <p className="mt-2 max-w-2xl text-xs leading-5 text-slate-500">
                                  {doc.description}
                                </p>
                              )}

                              {doc.error_message && (
                                <p className="mt-2 max-w-2xl text-xs leading-5 text-red-600">
                                  {doc.error_message}
                                </p>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            {doc.status === "uploaded" && (
                              <button
                                type="button"
                                onClick={() => handleIndexDocument(doc)}
                                disabled={indexingDocumentId === doc.id}
                                className="h-8 px-3 rounded-xl bg-slate-950 text-white text-[11px] font-black disabled:opacity-60"
                              >
                                {indexingDocumentId === doc.id
                                  ? "Indexing..."
                                  : "Index"}
                              </button>
                            )}

                            <span
                              className={`rounded-full px-3 py-1 text-[11px] font-black ${getStatusClass(
                                doc.status
                              )}`}
                            >
                              {formatStatus(doc.status)}
                            </span>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>

            <aside className="space-y-5">
              <form
                onSubmit={handleCreateArticle}
                className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h2 className="text-xl font-black text-slate-950">
                  Add Knowledge Article
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Add manual article like FAQ, policy, product info, or support
                  guidance.
                </p>

                {articleError && (
                  <div className="mt-5 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700">
                    {articleError}
                  </div>
                )}

                <div className="mt-5 space-y-4">
                  <input
                    value={articleForm.title}
                    onChange={(event) =>
                      updateArticleForm("title", event.target.value)
                    }
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none"
                    placeholder="Article title"
                  />

                  <div className="grid grid-cols-2 gap-3">
                    <input
                      value={articleForm.category}
                      onChange={(event) =>
                        updateArticleForm("category", event.target.value)
                      }
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none"
                      placeholder="Category"
                    />

                    <select
                      value={articleForm.status}
                      onChange={(event) =>
                        updateArticleForm("status", event.target.value)
                      }
                      className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none"
                    >
                      <option value="draft">Draft</option>
                      <option value="published">Published</option>
                    </select>
                  </div>

                  <input
                    value={articleForm.tags}
                    onChange={(event) =>
                      updateArticleForm("tags", event.target.value)
                    }
                    className="h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none"
                    placeholder="Tags: salesforce, crm, pricing"
                  />

                  <textarea
                    value={articleForm.content}
                    onChange={(event) =>
                      updateArticleForm("content", event.target.value)
                    }
                    className="h-40 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm outline-none resize-none"
                    placeholder="Write knowledge content here..."
                  />

                  <button
                    type="submit"
                    disabled={savingArticle}
                    className="h-11 w-full rounded-2xl bg-emerald-600 text-white text-sm font-black disabled:opacity-60"
                  >
                    {savingArticle ? "Adding..." : "Add Article"}
                  </button>
                </div>
              </form>

              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-black text-slate-950">
                  Knowledge Articles
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {loading ? "Loading..." : `${articles.length} articles`}
                </p>

                <div className="mt-5 space-y-3">
                  {loading && (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                      Loading articles...
                    </div>
                  )}

                  {!loading && articles.length === 0 && (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm font-semibold text-slate-500">
                      No article yet.
                    </div>
                  )}

                  {!loading &&
                    articles.map((article) => (
                      <div
                        key={article.id}
                        className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <p className="font-black text-slate-950">
                              {article.title}
                            </p>
                            <p className="mt-1 text-xs text-slate-500">
                              {article.category || "Uncategorized"} ·{" "}
                              {article.status}
                            </p>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteArticle(article)}
                            className="h-9 px-3 rounded-xl border border-red-100 bg-red-50 text-red-600 text-xs font-black"
                          >
                            Delete
                          </button>
                        </div>

                        <p className="mt-3 text-sm leading-6 text-slate-600 max-h-24 overflow-hidden">
                          {article.content}
                        </p>

                        {article.tags?.length > 0 && (
                          <div className="mt-3 flex flex-wrap gap-2">
                            {article.tags.map((tag) => (
                              <span
                                key={tag}
                                className="rounded-full bg-white border border-slate-200 px-3 py-1 text-[11px] font-bold text-slate-500"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="mt-4">
                          <select
                            value={article.status}
                            onChange={(event) =>
                              updateArticleStatus(article.id, event.target.value)
                            }
                            className="h-10 w-full rounded-2xl border border-slate-200 bg-white px-3 text-sm font-semibold outline-none"
                          >
                            <option value="draft">Draft</option>
                            <option value="published">Published</option>
                          </select>
                        </div>
                      </div>
                    ))}
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-black text-slate-950">
                  Indexing Summary
                </h2>

                <div className="mt-5 space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-slate-500">Uploaded</span>
                    <span className="font-black text-blue-600">
                      {loading ? "..." : stats.uploadedDocuments}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Processing</span>
                    <span className="font-black text-amber-600">
                      {loading ? "..." : stats.processingDocuments}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Failed</span>
                    <span className="font-black text-red-600">
                      {loading ? "..." : stats.failedDocuments}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Indexed Chunks</span>
                    <span className="font-black text-slate-950">
                      {loading ? "..." : stats.indexedChunks}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Stored Chunks</span>
                    <span className="font-black text-slate-950">
                      {loading ? "..." : stats.storedChunks}
                    </span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-slate-500">Draft Articles</span>
                    <span className="font-black text-slate-950">
                      {loading ? "..." : stats.draftArticles}
                    </span>
                  </div>
                </div>
              </div>
            </aside>
          </section>
        </div>
      </main>
    </div>
  );
}