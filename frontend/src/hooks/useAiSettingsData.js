import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const SELECTED_BOT_KEY = "nexora_selected_bot_id";

const DEFAULT_AI_SETTINGS = {
  ai_name: "Customer Support AI",
  company_name: "",
  role_description: "Customer support assistant",
  default_language: "id",
  tone: "professional",

  main_instruction:
    "Anda adalah AI customer support. Jawab pertanyaan customer berdasarkan knowledge base yang tersedia.",
  business_context: "",
  restrictions:
    "Jangan mengarang informasi. Jangan menjanjikan harga, diskon, timeline, atau scope implementasi jika tidak tersedia di knowledge base. Jika informasi tidak tersedia, arahkan customer ke agent manusia.",
  fallback_message:
    "Informasi tersebut belum tersedia di knowledge base saya. Saya bisa bantu teruskan ke agent.",

  answer_length: "medium",
  use_bullets: true,
  ask_follow_up: true,
  show_sources: false,
  confidence_threshold: 0.7,

  handoff_when_no_answer: true,
  handoff_when_customer_requests_agent: true,
  handoff_when_pricing_request: true,
  handoff_target: "support_agent",

  is_active: true,
};

export default function useAiSettingsData() {
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingArticle, setSavingArticle] = useState(false);
  const [error, setError] = useState("");

  const [workspace, setWorkspace] = useState(null);
  const [activeBot, setActiveBot] = useState(null);

  const [settings, setSettings] = useState(DEFAULT_AI_SETTINGS);
  const [articles, setArticles] = useState([]);

  const [documents, setDocuments] = useState([]);
  const [chunks, setChunks] = useState([]);

  const getCurrentWorkspaceAndBot = async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;

    if (!user) {
      throw new Error("User belum login. Silakan login Supabase Auth dulu.");
    }

    const { data: memberships, error: membershipError } = await supabase
      .from("workspace_members")
      .select(
        `
        id,
        role,
        status,
        workspace:workspaces (
          id,
          name,
          slug,
          plan,
          status
        )
      `
      )
      .eq("profile_id", user.id)
      .eq("status", "active")
      .limit(1);

    if (membershipError) throw membershipError;

    const currentWorkspace = memberships?.[0]?.workspace;

    if (!currentWorkspace?.id) {
      throw new Error("Workspace aktif tidak ditemukan.");
    }

    const { data: bots, error: botsError } = await supabase
      .from("bots")
      .select("id, name, status, bot_type, workspace_id, created_at")
      .eq("workspace_id", currentWorkspace.id)
      .order("created_at", { ascending: false });

    if (botsError) throw botsError;

    const botRows = bots || [];

    if (botRows.length === 0) {
      throw new Error("Bot aktif tidak ditemukan.");
    }

    const storedBotId = localStorage.getItem(SELECTED_BOT_KEY);
    const storedBot = botRows.find((bot) => bot.id === storedBotId);

    const activeBots = botRows.filter((bot) => bot.status === "active");
    const selectedBot = storedBot || activeBots[0] || botRows[0] || null;

    if (!selectedBot) {
      throw new Error("Bot aktif tidak ditemukan.");
    }

    localStorage.setItem(SELECTED_BOT_KEY, selectedBot.id);

    return {
      workspace: currentWorkspace,
      bot: selectedBot,
    };
  };

  const fetchAiSettingsData = async () => {
    setLoading(true);
    setError("");

    try {
      const { workspace, bot } = await getCurrentWorkspaceAndBot();

      setWorkspace(workspace);
      setActiveBot(bot);

      const { data: settingRow, error: settingError } = await supabase
        .from("ai_settings")
        .select("*")
        .eq("bot_id", bot.id)
        .maybeSingle();

      if (settingError) throw settingError;

      if (settingRow) {
        setSettings({
          ...DEFAULT_AI_SETTINGS,
          ...settingRow,
        });
      } else {
        setSettings({
          ...DEFAULT_AI_SETTINGS,
          ai_name: bot.name ? `${bot.name} AI` : "Customer Support AI",
        });
      }

      const { data: articleRows, error: articleError } = await supabase
        .from("knowledge_articles")
        .select("*")
        .eq("bot_id", bot.id)
        .order("updated_at", { ascending: false });

      if (articleError) throw articleError;

      setArticles(articleRows || []);

      const { data: documentRows, error: documentError } = await supabase
        .from("knowledge_documents")
        .select(
          `
          id,
          workspace_id,
          bot_id,
          uploaded_by,
          file_name,
          file_type,
          file_size_bytes,
          file_url,
          source_type,
          title,
          description,
          status,
          total_chunks,
          indexed_chunks,
          error_message,
          metadata,
          uploaded_at,
          processing_started_at,
          indexed_at,
          created_at,
          updated_at
        `
        )
        .eq("bot_id", bot.id)
        .order("uploaded_at", { ascending: false });

      if (documentError) throw documentError;

      const docs = documentRows || [];
      setDocuments(docs);

      const documentIds = docs.map((doc) => doc.id);

      if (documentIds.length === 0) {
        setChunks([]);
        return;
      }

      const { data: chunkRows, error: chunkError } = await supabase
        .from("knowledge_chunks")
        .select(
          `
          id,
          workspace_id,
          bot_id,
          document_id,
          chunk_index,
          title,
          content,
          token_count,
          embedding_provider,
          embedding_model,
          embedding_id,
          status,
          metadata,
          created_at,
          updated_at
        `
        )
        .in("document_id", documentIds)
        .order("chunk_index", { ascending: true });

      if (chunkError) throw chunkError;

      setChunks(chunkRows || []);
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to fetch AI settings data.");
    } finally {
      setLoading(false);
    }
  };

  const updateSettingField = (field, value) => {
    setSettings((current) => ({
      ...current,
      [field]: value,
    }));
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    setError("");

    try {
      let currentBot = activeBot;

      if (!currentBot?.id) {
        const result = await getCurrentWorkspaceAndBot();
        currentBot = result.bot;
        setWorkspace(result.workspace);
        setActiveBot(result.bot);
      }

      const payload = {
        ...settings,
        bot_id: currentBot.id,
        updated_at: new Date().toISOString(),
      };

      delete payload.id;
      delete payload.created_at;

      const { data, error: upsertError } = await supabase
        .from("ai_settings")
        .upsert(payload, {
          onConflict: "bot_id",
        })
        .select()
        .single();

      if (upsertError) throw upsertError;

      setSettings({
        ...DEFAULT_AI_SETTINGS,
        ...data,
      });

      return data;
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to save AI settings.");
      throw err;
    } finally {
      setSavingSettings(false);
    }
  };

  const createArticle = async ({ title, category, content, tags, status }) => {
    setSavingArticle(true);
    setError("");

    try {
      let currentBot = activeBot;

      if (!currentBot?.id) {
        const result = await getCurrentWorkspaceAndBot();
        currentBot = result.bot;
        setWorkspace(result.workspace);
        setActiveBot(result.bot);
      }

      const cleanTitle = String(title || "").trim();
      const cleanContent = String(content || "").trim();

      if (!cleanTitle) throw new Error("Article title wajib diisi.");
      if (!cleanContent) throw new Error("Article content wajib diisi.");

      const tagArray = String(tags || "")
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean);

      const { data, error: createError } = await supabase
        .from("knowledge_articles")
        .insert({
          bot_id: currentBot.id,
          title: cleanTitle,
          category: String(category || "").trim() || null,
          content: cleanContent,
          tags: tagArray,
          status: status || "draft",
        })
        .select()
        .single();

      if (createError) throw createError;

      await fetchAiSettingsData();

      return data;
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to create article.");
      throw err;
    } finally {
      setSavingArticle(false);
    }
  };

  const updateArticleStatus = async (articleId, status) => {
    setError("");

    try {
      if (!activeBot?.id) {
        throw new Error("Bot aktif belum tersedia.");
      }

      const { error: updateError } = await supabase
        .from("knowledge_articles")
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq("id", articleId)
        .eq("bot_id", activeBot.id);

      if (updateError) throw updateError;

      await fetchAiSettingsData();
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to update article status.");
      throw err;
    }
  };

  const deleteArticle = async (articleId) => {
    setError("");

    try {
      if (!activeBot?.id) {
        throw new Error("Bot aktif belum tersedia.");
      }

      const { error: deleteError } = await supabase
        .from("knowledge_articles")
        .delete()
        .eq("id", articleId)
        .eq("bot_id", activeBot.id);

      if (deleteError) throw deleteError;

      await fetchAiSettingsData();
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to delete article.");
      throw err;
    }
  };

  const uploadKnowledgeDocument = async (file) => {
    setError("");

    try {
      if (!file) {
        throw new Error("File belum dipilih.");
      }

      let currentWorkspace = workspace;
      let currentBot = activeBot;

      if (!currentWorkspace?.id || !currentBot?.id) {
        const result = await getCurrentWorkspaceAndBot();
        currentWorkspace = result.workspace;
        currentBot = result.bot;

        setWorkspace(currentWorkspace);
        setActiveBot(currentBot);
      }

      const allowedExtensions = ["pdf", "docx", "txt", "csv", "xlsx"];
      const fileExtension = file.name.split(".").pop()?.toLowerCase();

      if (!allowedExtensions.includes(fileExtension)) {
        throw new Error(
          "Format file tidak didukung. Gunakan PDF, DOCX, TXT, CSV, atau XLSX."
        );
      }

      const maxFileSizeMb = 10;
      const maxFileSizeBytes = maxFileSizeMb * 1024 * 1024;

      if (file.size > maxFileSizeBytes) {
        throw new Error(`Ukuran file maksimal ${maxFileSizeMb} MB.`);
      }

      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError) throw userError;

      if (!user) {
        throw new Error("User belum login.");
      }

      const safeFileName = file.name
        .replace(/\s+/g, "-")
        .replace(/[^a-zA-Z0-9._-]/g, "")
        .toLowerCase();

      const storagePath = `${currentWorkspace.id}/${currentBot.id}/${Date.now()}-${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from("knowledge-files")
        .upload(storagePath, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type || "application/octet-stream",
        });

      if (uploadError) throw uploadError;

      const documentTitle = file.name.replace(/\.[^/.]+$/, "");

      const { error: insertError } = await supabase
        .from("knowledge_documents")
        .insert({
          workspace_id: currentWorkspace.id,
          bot_id: currentBot.id,
          uploaded_by: user.id,
          file_name: file.name,
          file_type: file.type || fileExtension,
          file_size_bytes: file.size,
          file_url: storagePath,
          source_type: "upload",
          title: documentTitle,
          description: "Uploaded document awaiting indexing.",
          status: "uploaded",
          total_chunks: 0,
          indexed_chunks: 0,
          metadata: {
            originalFileName: file.name,
            storageBucket: "knowledge-files",
            storagePath,
            extension: fileExtension,
          },
          uploaded_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      await fetchAiSettingsData();
    } catch (err) {
      console.error(err);
      setError(err?.message || "Failed to upload knowledge document.");
      throw err;
    }
  };

  const indexTextKnowledgeDocument = async (document) => {
    setError("");

    try {
      if (!document?.id) {
        throw new Error("Document tidak valid.");
      }

      if (document.status !== "uploaded") {
        throw new Error(
          "Hanya document dengan status Uploaded yang bisa di-index manual."
        );
      }

      const fileExtension =
        document.metadata?.extension ||
        document.file_name?.split(".").pop()?.toLowerCase();

      if (fileExtension !== "txt") {
        throw new Error("Index manual sementara hanya mendukung file .txt.");
      }

      const storagePath = document.file_url || document.metadata?.storagePath;

      if (!storagePath) {
        throw new Error("Storage path document tidak ditemukan.");
      }

      const { data: fileBlob, error: downloadError } = await supabase.storage
        .from("knowledge-files")
        .download(storagePath);

      if (downloadError) throw downloadError;

      const textContent = await fileBlob.text();

      const cleanText = textContent
        .replace(/\r\n/g, "\n")
        .replace(/\n{3,}/g, "\n\n")
        .trim();

      if (!cleanText) {
        throw new Error("Isi file kosong atau tidak bisa dibaca.");
      }

      const chunkSize = 800;
      const chunks = [];

      for (let i = 0; i < cleanText.length; i += chunkSize) {
        const chunkText = cleanText.slice(i, i + chunkSize).trim();

        if (chunkText) {
          chunks.push(chunkText);
        }
      }

      if (chunks.length === 0) {
        throw new Error("Tidak ada chunk yang berhasil dibuat.");
      }

      const chunkPayload = chunks.map((content, index) => ({
        workspace_id: document.workspace_id,
        bot_id: document.bot_id,
        document_id: document.id,
        chunk_index: index,
        title: `${document.title || document.file_name} - Chunk ${index + 1}`,
        content,
        token_count: Math.ceil(content.length / 4),
        embedding_provider: "manual_txt_index",
        embedding_model: "manual-text-chunk-v1",
        embedding_id: `manual_${document.id}_${index}`,
        status: "embedded",
        metadata: {
          source: "manual_txt_index",
          fileName: document.file_name,
          chunkSize,
        },
      }));

      const { error: deleteOldChunksError } = await supabase
        .from("knowledge_chunks")
        .delete()
        .eq("document_id", document.id);

      if (deleteOldChunksError) throw deleteOldChunksError;

      const { error: insertChunksError } = await supabase
        .from("knowledge_chunks")
        .insert(chunkPayload);

      if (insertChunksError) throw insertChunksError;

      const { error: updateDocumentError } = await supabase
        .from("knowledge_documents")
        .update({
          status: "indexed",
          total_chunks: chunks.length,
          indexed_chunks: chunks.length,
          indexed_at: new Date().toISOString(),
          error_message: null,
          metadata: {
            ...(document.metadata || {}),
            indexedBy: "manual_txt_index",
            indexedAt: new Date().toISOString(),
            chunkSize,
          },
        })
        .eq("id", document.id);

      if (updateDocumentError) throw updateDocumentError;

      await fetchAiSettingsData();
    } catch (err) {
      console.error(err);

      if (document?.id) {
        await supabase
          .from("knowledge_documents")
          .update({
            status: "failed",
            error_message: err?.message || "Failed to index document.",
          })
          .eq("id", document.id);
      }

      setError(err?.message || "Failed to index document.");
      await fetchAiSettingsData();
      throw err;
    }
  };

  useEffect(() => {
    fetchAiSettingsData();

    const handleSelectedBotChanged = () => {
      fetchAiSettingsData();
    };

    const handleBotCreated = (event) => {
      const botId = event?.detail?.botId;

      if (botId) {
        localStorage.setItem(SELECTED_BOT_KEY, botId);
      }

      fetchAiSettingsData();
    };

    window.addEventListener(
      "nexora:selected-bot-changed",
      handleSelectedBotChanged
    );

    window.addEventListener("nexora:bot-created", handleBotCreated);

    return () => {
      window.removeEventListener(
        "nexora:selected-bot-changed",
        handleSelectedBotChanged
      );

      window.removeEventListener("nexora:bot-created", handleBotCreated);
    };
  }, []);

  const stats = useMemo(() => {
    const totalDocuments = documents.length;

    const indexedDocuments = documents.filter(
      (doc) => doc.status === "indexed"
    ).length;

    const processingDocuments = documents.filter(
      (doc) => doc.status === "processing"
    ).length;

    const failedDocuments = documents.filter(
      (doc) => doc.status === "failed"
    ).length;

    const uploadedDocuments = documents.filter(
      (doc) => doc.status === "uploaded"
    ).length;

    const totalChunks = documents.reduce(
      (sum, doc) => sum + Number(doc.total_chunks || 0),
      0
    );

    const indexedChunks = documents.reduce(
      (sum, doc) => sum + Number(doc.indexed_chunks || 0),
      0
    );

    const publishedArticles = articles.filter(
      (article) => article.status === "published"
    ).length;

    const draftArticles = articles.filter(
      (article) => article.status === "draft"
    ).length;

    const knowledgeItems = totalDocuments + articles.length;
    const readyItems = indexedDocuments + publishedArticles;

    const knowledgeHealth =
      knowledgeItems === 0 ? 0 : Math.round((readyItems / knowledgeItems) * 100);

    return {
      totalDocuments,
      indexedDocuments,
      processingDocuments,
      failedDocuments,
      uploadedDocuments,
      totalChunks,
      indexedChunks,
      storedChunks: chunks.length,
      totalArticles: articles.length,
      publishedArticles,
      draftArticles,
      knowledgeHealth,
    };
  }, [documents, chunks, articles]);

  return {
    loading,
    savingSettings,
    savingArticle,
    error,

    workspace,
    activeBot,

    settings,
    articles,
    documents,
    chunks,
    stats,

    updateSettingField,
    saveSettings,

    createArticle,
    updateArticleStatus,
    deleteArticle,

    uploadKnowledgeDocument,
    indexTextKnowledgeDocument,

    refetch: fetchAiSettingsData,
  };
}