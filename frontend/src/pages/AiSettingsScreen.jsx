import ChatbotSubnav from "../components/layout/ChatbotSubnav";
import { useRef, useState } from "react";
import { BookOpen, BrainCircuit, Plus, Bot, Pencil, MessageCircle } from "../lib/icons";
import useAiSettingsData from "../hooks/useAiSettingsData";

const DEFAULT_ARTICLE_FORM = {
  title: "",
  category: "",
  tags: "",
  content: "",
  status: "draft",
};

const arrayToText = (value) => {
  if (Array.isArray(value)) return value.join(", ");
  if (typeof value === "string") return value;
  return "";
};

const getDocumentExtension = (document) => {
  return (
    document?.metadata?.extension ||
    document?.file_name?.split(".").pop()?.toLowerCase() ||
    ""
  );
};

const canIndexDocument = (document) => {
  const extension = getDocumentExtension(document);

  return (
    extension === "txt" &&
    ["uploaded", "indexed", "failed"].includes(document.status)
  );
};

const isComingSoonDocument = (document) => {
  const extension = getDocumentExtension(document);

  return extension && extension !== "txt";
};

const ToggleSwitch = ({ checked, onChange, label }) => {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className="flex items-center justify-between w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 hover:bg-white transition duration-200 cursor-pointer"
    >
      <span className="text-sm font-bold text-slate-700">{label}</span>
      <div
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${checked ? "bg-blue-600" : "bg-slate-200"
          }`}
      >
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${checked ? "translate-x-5" : "translate-x-0"
            }`}
        />
      </div>
    </button>
  );
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
    deleteKnowledgeDocument,
    refetch,
  } = useAiSettingsData();

  const fileInputRef = useRef(null);

  const [activeTab, setActiveTab] = useState("identify");
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

  const handleDeleteDocument = async (document) => {
    const confirmed = window.confirm(
      `Delete document "${document.file_name}"? This will also delete its indexed chunks.`
    );

    if (!confirmed) return;

    try {
      await deleteKnowledgeDocument(document);
    } catch (err) {
      // Error sudah ditampilkan dari hook.
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

  const settingInputClass =
    "mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold outline-none focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100";

  const settingTextareaClass =
    "mt-2 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 outline-none resize-none focus:border-blue-300 focus:bg-white focus:ring-4 focus:ring-blue-100";

  const settingLabelClass =
    "text-xs font-black uppercase tracking-wide text-slate-400";

  return (
    <div className="min-h-screen bg-[#F6F8FC] flex">
      <ChatbotSubnav setScreen={setScreen} activeMenu="ai-settings" />

      <main className="flex-1 min-w-0">
        <div className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl px-8 h-16 flex items-center justify-between">
          <div>
            <h1 className="font-black text-slate-950">AI Settings</h1>
            <p className="text-xs text-slate-500 mt-1">
              Configure structured behavior, instructions, restrictions,
              knowledge, and AI runtime policy.
            </p>
          </div>

          <div className="flex gap-3">
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
              className="h-10 px-4 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
            >
              Open Builder
            </button>

            <button
              type="button"
              onClick={handleSaveSettings}
              disabled={savingSettings || loading}
              className="h-10 px-4 rounded-2xl bg-blue-600 text-white text-sm font-bold disabled:opacity-60 disabled:cursor-not-allowed hover:bg-blue-700 transition"
            >
              {savingSettings ? "Saving..." : saveStatus || "Save Settings"}
            </button>
          </div>
        </div>

        <div className="sticky top-16 z-20 border-b border-slate-200 bg-white/85 backdrop-blur-xl px-8 flex gap-6">
          {[
            { id: "identify", label: "AI Identify", icon: Bot },
            { id: "behavior", label: "Behavior", icon: BrainCircuit },
            { id: "instructions", label: "Instructions", icon: Pencil },
            { id: "response_handoff", label: "Response & Handoff", icon: MessageCircle },
            { id: "knowledge", label: "Knowledge", icon: BookOpen },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-1 py-4 text-sm font-bold border-b-2 transition duration-200 -mb-px relative cursor-pointer ${isActive
                  ? "border-blue-600 text-blue-600"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
                  }`}
              >
                <Icon size={16} />
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="px-8 py-7 space-y-6">
          {error && (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          {activeTab === "identify" && (
            <div className="space-y-6 animate-fadeIn">
              <section className="grid xl:grid-cols-[1fr_360px] gap-5 items-stretch">
                <div className="relative overflow-hidden rounded-[2rem] bg-slate-950 p-8 shadow-xl">
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(124,58,237,0.45),transparent_36%),radial-gradient(circle_at_bottom_left,rgba(37,99,235,0.35),transparent_32%)]" />

                  <div className="relative max-w-3xl">
                    <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-blue-50 mb-5">
                      <BrainCircuit size={16} />
                      Bot: {activeBot?.name || "Loading..."}
                    </div>

                    <h2 className="text-4xl font-black tracking-tight text-white">
                      Behavioral AI control center.
                    </h2>

                    <p className="mt-3 text-blue-100 leading-7">
                      Manage structured AI identity, behavior configuration,
                      knowledge policy, custom instructions, guardrails, handoff
                      rules, and knowledge sources.
                    </p>
                  </div>
                </div>

                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm flex flex-col justify-center">
                  <p className="font-black text-slate-950">AI Identity Setup</p>
                  <p className="mt-2 text-sm text-slate-600">
                    Define who your AI agent is, what company it represents, and its basic traits or tone.
                  </p>
                  <div className="mt-4 flex items-center gap-2 text-xs font-bold text-blue-600">
                    <Bot size={14} />
                    Configuring {activeBot?.name || "AI Agent"}
                  </div>
                </div>
              </section>

              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <h2 className="text-xl font-black text-slate-950">
                      AI Identity
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Define the assistant name, company context, language,
                      tone, and role summary.
                    </p>
                  </div>

                  <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                    Basic Identity
                  </span>
                </div>

                <div className="mt-6 grid md:grid-cols-2 gap-5">
                  <label className="block">
                    <span className={settingLabelClass}>AI Name</span>
                    <input
                      value={settings.ai_name || ""}
                      onChange={(event) =>
                        updateSettingField("ai_name", event.target.value)
                      }
                      className={settingInputClass}
                      placeholder="Customer Support AI"
                    />
                  </label>

                  <label className="block">
                    <span className={settingLabelClass}>Company Name</span>
                    <input
                      value={settings.company_name || ""}
                      onChange={(event) =>
                        updateSettingField("company_name", event.target.value)
                      }
                      className={settingInputClass}
                      placeholder="Saasten"
                    />
                  </label>

                  <label className="block">
                    <span className={settingLabelClass}>Default Language</span>
                    <select
                      value={settings.default_language || "id"}
                      onChange={(event) =>
                        updateSettingField(
                          "default_language",
                          event.target.value
                        )
                      }
                      className={settingInputClass}
                    >
                      <option value="id">Indonesian</option>
                      <option value="en">English</option>
                      <option value="auto">Auto detect</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className={settingLabelClass}>Tone</span>
                    <select
                      value={settings.tone || "professional"}
                      onChange={(event) =>
                        updateSettingField("tone", event.target.value)
                      }
                      className={settingInputClass}
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
                  <span className={settingLabelClass}>Role Description</span>
                  <textarea
                    value={settings.role_description || ""}
                    onChange={(event) =>
                      updateSettingField("role_description", event.target.value)
                    }
                    className={`${settingTextareaClass} h-24`}
                    placeholder="Example: You are a Customer Support Specialist for a SaaS company. Your role is to assist customers with product-related questions, troubleshoot common issues, provide accurate information based on company knowledge, and escalate complex cases to human agents when necessary."
                  />
                </label>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <h2 className="text-xl font-black text-slate-950">
                      Structured Agent Identity
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      These fields make the AI behavior easier to reuse, debug,
                      and scale across templates.
                    </p>
                  </div>

                  <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-black text-indigo-700">
                    Structured Config
                  </span>
                </div>

                <div className="mt-6 grid md:grid-cols-3 gap-5">
                  <label className="block">
                    <span className={settingLabelClass}>Agent Role</span>
                    <select
                      value={settings.agent_role || ""}
                      onChange={(event) =>
                        updateSettingField("agent_role", event.target.value)
                      }
                      className={settingInputClass}
                    >
                      <option value="hr specialist">HR Specialist</option>
                      <option value="recruiter">Recruiter</option>
                      <option value="payroll officer">Payroll Officer</option>
                      <option value="general hr">General HR</option>
                      <option value="hrbp">HRBP</option>
                    </select>
                    {/* <input
                      value={settings.agent_role || ""}
                      onChange={(event) =>
                        updateSettingField("agent_role", event.target.value)
                      }
                      className={settingInputClass}
                      placeholder="HR Specialist"
                    /> */}
                  </label>

                  <label className="block">
                    <span className={settingLabelClass}>Department</span>
                    <select
                      value={settings.department || ""}
                      onChange={(event) =>
                        updateSettingField("department", event.target.value)
                      }
                      className={settingInputClass}
                    >
                      <option value="human resource">Human Resource</option>
                      <option value="finance">Finance</option>
                      <option value="legal">Legal</option>
                      <option value="it">IT</option>
                      <option value="operations">operations</option>
                    </select>
                    {/* <input
                      value={settings.department || ""}
                      onChange={(event) =>
                        updateSettingField("department", event.target.value)
                      }
                      className={settingInputClass}
                      placeholder="Human Resource"
                    /> */}
                  </label>

                  <label className="block">
                    <span className={settingLabelClass}>Primary Audience</span>
                    <select
                      value={settings.primary_audience || ""}
                      onChange={(event) =>
                        updateSettingField("primary_audience", event.target.value)
                      }
                      className={settingInputClass}
                    >
                      <option value="employee">Employee</option>
                      <option value="manager">Manager</option>
                      <option value="executive">Executive</option>
                      <option value="public">Public</option>
                      <option value="all staff">All Staff</option>
                    </select>
                    {/* <input
                      value={settings.primary_audience || ""}
                      onChange={(event) =>
                        updateSettingField(
                          "primary_audience",
                          event.target.value
                        )
                      }
                      className={settingInputClass}
                      placeholder="Employee"
                    /> */}
                  </label>
                </div>
              </div>
            </div>
          )}

          {activeTab === "behavior" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <h2 className="text-xl font-black text-slate-950">
                      Behavior Configuration
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Control how the AI should answer before the prompt
                      compiler runs.
                    </p>
                  </div>

                  <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">
                    Runtime Behavior
                  </span>
                </div>

                <div className="mt-6 grid md:grid-cols-2 gap-5">
                  <label className="block">
                    <span className={settingLabelClass}>Response Style</span>
                    <select
                      value={settings.response_style || "Helpful and concise"}
                      onChange={(event) =>
                        updateSettingField("response_style", event.target.value)
                      }
                      className={settingInputClass}
                    >
                      <option value="Helpful and concise">
                        Helpful and concise
                      </option>
                      <option value="Helpful and step-by-step">
                        Helpful and step-by-step
                      </option>
                      <option value="Consultative and concise">
                        Consultative and concise
                      </option>
                      <option value="Accurate and concise">
                        Accurate and concise
                      </option>
                      <option value="Troubleshooting steps">
                        Troubleshooting steps
                      </option>
                      <option value="Practical and friendly">
                        Practical and friendly
                      </option>
                    </select>
                  </label>

                  <label className="block">
                    <span className={settingLabelClass}>Empathy Level</span>
                    <select
                      value={settings.empathy_level || "Medium"}
                      onChange={(event) =>
                        updateSettingField("empathy_level", event.target.value)
                      }
                      className={settingInputClass}
                    >
                      <option value="Low">Low</option>
                      <option value="Medium">Medium</option>
                      <option value="High">High</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className={settingLabelClass}>Formality Level</span>
                    <select
                      value={settings.formality_level || "Professional"}
                      onChange={(event) =>
                        updateSettingField("formality_level", event.target.value)
                      }
                      className={settingInputClass}
                    >
                      <option value="Casual">Casual</option>
                      <option value="Friendly Professional">
                        Friendly Professional
                      </option>
                      <option value="Professional">Professional</option>
                      <option value="Formal">Formal</option>
                    </select>
                  </label>

                  <label className="block">
                    <span className={settingLabelClass}>Knowledge Mode</span>
                    <select
                      value={
                        settings.knowledge_mode || "Approved Knowledge Only"
                      }
                      onChange={(event) =>
                        updateSettingField("knowledge_mode", event.target.value)
                      }
                      className={settingInputClass}
                    >
                      <option value="Strict Knowledge Only">
                        Strict Knowledge Only
                      </option>
                      <option value="Approved Knowledge Only">
                        Approved Knowledge Only
                      </option>
                      <option value="General AI + Approved Knowledge">
                        General AI + Approved Knowledge
                      </option>
                    </select>
                  </label>
                </div>

                <label className="block mt-5">
                  <span className={settingLabelClass}>
                    Unknown Answer Behavior
                  </span>
                  <textarea
                    value={settings.unknown_answer_behavior || ""}
                    onChange={(event) =>
                      updateSettingField(
                        "unknown_answer_behavior",
                        event.target.value
                      )
                    }
                    className={`${settingTextareaClass} h-24`}
                    placeholder="Use fallback and offer handoff when needed."
                  />
                </label>

                <div className="mt-5 rounded-3xl border border-blue-100 bg-blue-50 p-5">
                  <p className="text-sm font-black text-slate-950">
                    Knowledge Mode Guidance
                  </p>

                  <div className="mt-3 grid md:grid-cols-3 gap-3 text-xs leading-5 text-slate-600">
                    <div className="rounded-2xl bg-white/80 border border-blue-100 p-4">
                      <p className="font-black text-slate-800">
                        Strict Knowledge Only
                      </p>
                      <p className="mt-1">
                        Best for HR, Finance, legal-sensitive, policy, payroll,
                        and company-specific agents.
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/80 border border-blue-100 p-4">
                      <p className="font-black text-slate-800">
                        Approved Knowledge Only
                      </p>
                      <p className="mt-1">
                        Best for support, IT, e-commerce, and operational
                        answers based on available knowledge.
                      </p>
                    </div>

                    <div className="rounded-2xl bg-white/80 border border-blue-100 p-4">
                      <p className="font-black text-slate-800">
                        General AI + Knowledge
                      </p>
                      <p className="mt-1">
                        Best for sales or consultative agents that can answer
                        general questions but still restrict company facts.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === "instructions" && (
            <div className="space-y-6 animate-fadeIn">
              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <h2 className="text-xl font-black text-slate-950">
                  Instructions & Guardrails
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Configure what the AI should do and what it must not do.
                </p>

                <div className="mt-6 space-y-5">
                  <label className="block">
                    <span className={settingLabelClass}>Main Instruction</span>
                    <textarea
                      value={settings.main_instruction || ""}
                      onChange={(event) =>
                        updateSettingField(
                          "main_instruction",
                          event.target.value
                        )
                      }
                      className={`${settingTextareaClass} h-32 focus:ring-indigo-100`}
                    />
                  </label>

                  <label className="block">
                    <span className={settingLabelClass}>Business Context</span>
                    <textarea
                      value={settings.business_context || ""}
                      onChange={(event) =>
                        updateSettingField(
                          "business_context",
                          event.target.value
                        )
                      }
                      className={`${settingTextareaClass} h-28 focus:ring-indigo-100`}
                      placeholder="Explain company services, support policy, target customer, product scope..."
                    />
                  </label>

                  <label className="block">
                    <span className={settingLabelClass}>
                      Restrictions / Larangan Agent & LLM
                    </span>
                    <textarea
                      value={settings.restrictions || ""}
                      onChange={(event) =>
                        updateSettingField("restrictions", event.target.value)
                      }
                      className={`${settingTextareaClass} h-32 focus:ring-indigo-100`}
                      placeholder="Jangan mengarang informasi. Jangan menjanjikan harga. Jangan menjawab di luar knowledge base..."
                    />
                  </label>

                  <label className="block">
                    <span className={settingLabelClass}>Fallback Message</span>
                    <textarea
                      value={settings.fallback_message || ""}
                      onChange={(event) =>
                        updateSettingField("fallback_message", event.target.value)
                      }
                      className={`${settingTextareaClass} h-24 focus:ring-indigo-100`}
                    />
                  </label>
                </div>
              </div>

              <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                <div className="flex items-start justify-between gap-5">
                  <div>
                    <h2 className="text-xl font-black text-slate-950">
                      Structured Guardrails
                    </h2>
                    <p className="mt-1 text-sm text-slate-500">
                      Use comma-separated values. These are stored as JSON arrays
                      and used directly by the runtime prompt compiler.
                    </p>
                  </div>

                  <span className="rounded-full bg-red-50 px-3 py-1 text-xs font-black text-red-700">
                    Safety Rules
                  </span>
                </div>

                <div className="mt-6 grid md:grid-cols-2 gap-5">
                  <label className="block">
                    <span className={settingLabelClass}>Forbidden Topics</span>
                    <textarea
                      value={arrayToText(settings.forbidden_topics)}
                      onChange={(event) =>
                        updateSettingField(
                          "forbidden_topics",
                          event.target.value
                        )
                      }
                      className={`${settingTextareaClass} h-28`}
                      placeholder="salary decision, legal advice, medical diagnosis"
                    />
                  </label>

                  <label className="block">
                    <span className={settingLabelClass}>Sensitive Topics</span>
                    <textarea
                      value={arrayToText(settings.sensitive_topics)}
                      onChange={(event) =>
                        updateSettingField(
                          "sensitive_topics",
                          event.target.value
                        )
                      }
                      className={`${settingTextareaClass} h-28`}
                      placeholder="harassment, payroll dispute, termination"
                    />
                  </label>

                  <label className="block">
                    <span className={settingLabelClass}>Escalation Topics</span>
                    <textarea
                      value={arrayToText(settings.escalation_topics)}
                      onChange={(event) =>
                        updateSettingField(
                          "escalation_topics",
                          event.target.value
                        )
                      }
                      className={`${settingTextareaClass} h-28`}
                      placeholder="pricing request, refund dispute, legal issue"
                    />
                  </label>

                  <label className="block">
                    <span className={settingLabelClass}>Never Promise</span>
                    <textarea
                      value={arrayToText(settings.never_promise)}
                      onChange={(event) =>
                        updateSettingField("never_promise", event.target.value)
                      }
                      className={`${settingTextareaClass} h-28`}
                      placeholder="salary increase, refund approval, delivery guarantee"
                    />
                  </label>
                </div>

                <label className="block mt-5">
                  <span className={settingLabelClass}>Restricted Claims</span>
                  <textarea
                    value={arrayToText(settings.restricted_claims)}
                    onChange={(event) =>
                      updateSettingField(
                        "restricted_claims",
                        event.target.value
                      )
                    }
                    className={`${settingTextareaClass} h-28`}
                    placeholder="company policy not in approved knowledge, legal contract interpretation, guaranteed ROI"
                  />
                </label>

                <label className="block mt-5">
                  <span className={settingLabelClass}>Custom Instruction</span>
                  <textarea
                    value={settings.custom_instruction || ""}
                    onChange={(event) =>
                      updateSettingField(
                        "custom_instruction",
                        event.target.value
                      )
                    }
                    className={`${settingTextareaClass} h-32`}
                    placeholder="Add custom business behavior that is not covered by structured fields..."
                  />
                </label>
              </div>
            </div>
          )}

          {activeTab === "response_handoff" && (
            <div className="grid xl:grid-cols-[1fr_420px] gap-5 animate-fadeIn">
              <div className="space-y-5">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <h2 className="text-xl font-black text-slate-950">
                        Response Behavior
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Configure answer properties and basic style settings for LLM generation.
                      </p>
                    </div>

                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                      Generation
                    </span>
                  </div>

                  <div className="mt-6 grid md:grid-cols-2 gap-5">
                    <label className="block">
                      <span className={settingLabelClass}>Answer Length</span>
                      <select
                        value={settings.answer_length || "medium"}
                        onChange={(event) =>
                          updateSettingField("answer_length", event.target.value)
                        }
                        className={settingInputClass}
                      >
                        <option value="short">Short</option>
                        <option value="medium">Medium</option>
                        <option value="detailed">Detailed</option>
                        <option value="long">Long</option>
                      </select>
                    </label>

                    <label className="block">
                      <span className={settingLabelClass}>
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
                        className={settingInputClass}
                      />
                    </label>
                  </div>

                  <div className="mt-6 grid md:grid-cols-2 gap-3">
                    {[
                      ["use_bullets", "Use bullet points"],
                      ["ask_follow_up", "Ask follow-up question"],
                      ["show_sources", "Show knowledge sources"],
                    ].map(([field, label]) => (
                      <ToggleSwitch
                        key={field}
                        checked={Boolean(settings[field])}
                        onChange={(val) => updateSettingField(field, val)}
                        label={label}
                      />
                    ))}
                  </div>
                </div>

                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                  <div className="flex items-start justify-between gap-5">
                    <div>
                      <h2 className="text-xl font-black text-slate-950">
                        Handoff Rules
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Define conditions under which the conversation should be handed off to a human agent.
                      </p>
                    </div>

                    <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-black text-violet-700">
                      Escalation
                    </span>
                  </div>

                  <div className="mt-6">
                    <label className="block">
                      <span className={settingLabelClass}>Handoff Target</span>
                      <input
                        value={settings.handoff_target || ""}
                        onChange={(event) =>
                          updateSettingField("handoff_target", event.target.value)
                        }
                        className={settingInputClass}
                        placeholder="Support Agent, HR Team, Sales Team, Finance Team"
                      />
                    </label>
                  </div>

                  <div className="mt-6 grid md:grid-cols-2 gap-3">
                    {[
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
                      <ToggleSwitch
                        key={field}
                        checked={Boolean(settings[field])}
                        onChange={(val) => updateSettingField(field, val)}
                        label={label}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <aside className="space-y-5">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                  <h2 className="text-xl font-black text-slate-950">
                    Active Configuration Summary
                  </h2>

                  <p className="mt-1 text-sm text-slate-500">
                    Quick view of the active behavior configuration.
                  </p>

                  <div className="mt-5 space-y-3 text-sm">
                    {[
                      ["Agent Role", settings.agent_role || "-"],
                      ["Department", settings.department || "-"],
                      ["Audience", settings.primary_audience || "-"],
                      ["Knowledge Mode", settings.knowledge_mode || "-"],
                      ["Handoff Target", settings.handoff_target || "-"],
                    ].map(([label, value]) => (
                      <div
                        key={label}
                        className="flex justify-between gap-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                      >
                        <span className="text-slate-500">{label}</span>
                        <span className="font-black text-slate-900 text-right">
                          {value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </aside>
            </div>
          )}

          {activeTab === "knowledge" && (
            <div className="grid xl:grid-cols-[1fr_420px] gap-5 animate-fadeIn">
              <div className="space-y-5">
                <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
                  <p className="font-black text-slate-950">Training Status</p>

                  <div className="mt-5 grid md:grid-cols-2 gap-5 items-center">
                    <div className="rounded-3xl bg-blue-50 border border-blue-100 p-5">
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

                    <div className="grid grid-cols-2 gap-3">
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
                </div>

                <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
                  <div className="p-6 border-b border-slate-200 flex items-center justify-between">
                    <div>
                      <h2 className="text-xl font-black text-slate-950">
                        Knowledge Documents
                      </h2>
                      <p className="mt-1 text-sm text-slate-500">
                        Upload knowledge documents used by AI Agent. TXT indexing
                        is available now. PDF, DOCX, CSV, and XLSX indexing are
                        coming soon.
                      </p>
                    </div>

                    <div>
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".txt"
                        className="hidden"
                        onChange={handleUploadFile}
                      />

                      <button
                        type="button"
                        onClick={handleOpenFilePicker}
                        disabled={uploading}
                        className="h-10 px-4 rounded-2xl bg-blue-600 text-white text-sm font-bold flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed hover:bg-blue-700 transition"
                      >
                        <Plus size={16} />
                        {uploading ? "Uploading..." : "Upload TXT"}
                      </button>
                    </div>
                  </div>

                  <div className="p-6">
                    <div className="rounded-3xl border-2 border-dashed border-slate-200 bg-slate-50 p-8 text-center">
                      <div className="mx-auto h-14 w-14 rounded-2xl bg-white text-blue-700 grid place-items-center shadow-sm">
                        <BookOpen size={24} />
                      </div>

                      <h3 className="mt-4 font-black text-slate-950">
                        Drop TXT file here or browse
                      </h3>

                      <p className="mt-2 text-sm text-slate-500">
                        AI indexing currently supports TXT files. PDF, DOCX, CSV,
                        and XLSX support is coming soon.
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
                            className="p-5 flex items-center justify-between gap-5 hover:bg-slate-50 transition"
                          >
                            <div className="flex items-center gap-4 min-w-0">
                              <div className="h-11 w-11 rounded-2xl bg-blue-50 text-blue-700 grid place-items-center shrink-0">
                                <BookOpen size={19} />
                              </div>

                              <div className="min-w-0">
                                <p className="font-black text-slate-950 truncate">
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

                            <div className="flex flex-col items-end gap-2 shrink-0">
                              <div className="flex items-center gap-2">
                                {canIndexDocument(doc) && (
                                  <button
                                    type="button"
                                    onClick={() => handleIndexDocument(doc)}
                                    disabled={indexingDocumentId === doc.id}
                                    className="h-8 px-3 rounded-xl bg-slate-950 text-white text-[11px] font-black disabled:opacity-60"
                                  >
                                    {indexingDocumentId === doc.id
                                      ? "Indexing..."
                                      : doc.status === "indexed"
                                        ? "Re-index"
                                        : "Index"}
                                  </button>
                                )}

                                {isComingSoonDocument(doc) && (
                                  <span className="rounded-full bg-amber-50 px-3 py-1 text-[11px] font-black text-amber-700">
                                    Indexing Soon
                                  </span>
                                )}

                                <button
                                  type="button"
                                  onClick={() => handleDeleteDocument(doc)}
                                  className="h-8 px-3 rounded-xl border border-red-100 bg-red-50 text-red-600 text-[11px] font-black hover:bg-red-100 transition"
                                >
                                  Delete
                                </button>

                                <span
                                  className={`rounded-full px-3 py-1 text-[11px] font-black ${getStatusClass(
                                    doc.status
                                  )}`}
                                >
                                  {formatStatus(doc.status)}
                                </span>
                              </div>

                              <p className="text-[11px] text-slate-400">
                                {getDocumentExtension(doc)?.toUpperCase() ||
                                  "UNKNOWN"}{" "}
                                ·{" "}
                                {doc.status === "indexed"
                                  ? "Ready for AI"
                                  : doc.status === "processing"
                                    ? "Processing"
                                    : doc.status === "failed"
                                      ? "Needs attention"
                                      : "Awaiting indexing"}
                              </p>
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
                      className="h-11 w-full rounded-2xl bg-emerald-600 text-white text-sm font-black disabled:opacity-60 hover:bg-emerald-700 transition"
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
            </div>
          )}
        </div>
      </main>
    </div>
  );
}