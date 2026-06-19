import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import mammoth from 'mammoth';
import * as pdfjsLib from 'pdfjs-dist';
import { getDocument, GlobalWorkerOptions } from 'pdfjs-dist';
import pdfWorker from 'pdfjs-dist/build/pdf.worker.mjs?url';

GlobalWorkerOptions.workerSrc = pdfWorker;

const SELECTED_BOT_KEY = 'nexora_selected_bot_id';

const DEFAULT_AI_SETTINGS = {
  ai_name: 'Customer Support AI',
  company_name: '',
  role_description: 'Customer support assistant',
  default_language: 'id',
  tone: 'professional',

  // Structured Identity
  agent_role: '',
  department: '',
  primary_audience: '',

  // Structured Behavior
  response_style: 'Helpful and concise',
  empathy_level: 'Medium',
  formality_level: 'Professional',
  knowledge_mode: 'Approved Knowledge Only',
  unknown_answer_behavior: 'Use fallback and offer handoff when needed.',

  // Structured Guardrails
  forbidden_topics: [],
  sensitive_topics: [],
  escalation_topics: [],
  never_promise: [],
  restricted_claims: [],

  custom_instruction: '',

  main_instruction:
    'Anda adalah AI customer support. Jawab pertanyaan customer berdasarkan knowledge base yang tersedia.',
  business_context: '',
  restrictions:
    'Jangan mengarang informasi. Jangan menjanjikan harga, diskon, timeline, atau scope implementasi jika tidak tersedia di knowledge base. Jika informasi tidak tersedia, arahkan customer ke agent manusia.',
  fallback_message:
    'Informasi tersebut belum tersedia di knowledge base saya. Saya bisa bantu teruskan ke agent.',

  answer_length: 'medium',

  // Existing fields used by old UI
  use_bullets: true,
  ask_follow_up: true,
  show_sources: false,

  // Alias fields used by widget-ai-reply / new runtime
  use_bullet_points: true,
  ask_follow_up_question: true,
  show_knowledge_sources: false,

  confidence_threshold: 0.7,

  handoff_when_no_answer: true,

  // Existing fields used by old UI
  handoff_when_customer_requests_agent: true,
  handoff_when_pricing_request: true,

  // Alias fields used by widget-ai-reply / new runtime
  handoff_when_customer_asks_human: true,
  handoff_for_pricing_proposal: true,

  handoff_target: 'support_agent',

  is_active: true,
};

const STRUCTURED_ARRAY_FIELDS = [
  'forbidden_topics',
  'sensitive_topics',
  'escalation_topics',
  'never_promise',
  'restricted_claims',
];

const normalizeArrayField = (value) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);

      if (Array.isArray(parsed)) {
        return parsed.map((item) => String(item).trim()).filter(Boolean);
      }
    } catch (_err) {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean);
    }
  }

  return [];
};

const normalizeSettingsRow = (row = {}) => {
  const normalized = {
    ...DEFAULT_AI_SETTINGS,
    ...row,
  };

  STRUCTURED_ARRAY_FIELDS.forEach((field) => {
    normalized[field] = normalizeArrayField(normalized[field]);
  });

  normalized.use_bullet_points =
    normalized.use_bullet_points ?? normalized.use_bullets ?? true;

  normalized.use_bullets =
    normalized.use_bullets ?? normalized.use_bullet_points ?? true;

  normalized.ask_follow_up_question =
    normalized.ask_follow_up_question ?? normalized.ask_follow_up ?? true;

  normalized.ask_follow_up =
    normalized.ask_follow_up ?? normalized.ask_follow_up_question ?? true;

  normalized.show_knowledge_sources =
    normalized.show_knowledge_sources ?? normalized.show_sources ?? false;

  normalized.show_sources =
    normalized.show_sources ?? normalized.show_knowledge_sources ?? false;

  normalized.handoff_when_customer_asks_human =
    normalized.handoff_when_customer_asks_human ??
    normalized.handoff_when_customer_requests_agent ??
    true;

  normalized.handoff_when_customer_requests_agent =
    normalized.handoff_when_customer_requests_agent ??
    normalized.handoff_when_customer_asks_human ??
    true;

  normalized.handoff_for_pricing_proposal =
    normalized.handoff_for_pricing_proposal ??
    normalized.handoff_when_pricing_request ??
    true;

  normalized.handoff_when_pricing_request =
    normalized.handoff_when_pricing_request ??
    normalized.handoff_for_pricing_proposal ??
    true;

  return normalized;
};

const prepareSettingsPayload = (settings) => {
  const normalized = normalizeSettingsRow(settings);

  const payload = {
    ...normalized,

    forbidden_topics: normalizeArrayField(normalized.forbidden_topics),
    sensitive_topics: normalizeArrayField(normalized.sensitive_topics),
    escalation_topics: normalizeArrayField(normalized.escalation_topics),
    never_promise: normalizeArrayField(normalized.never_promise),
    restricted_claims: normalizeArrayField(normalized.restricted_claims),

    use_bullet_points:
      normalized.use_bullet_points ?? normalized.use_bullets ?? true,
    use_bullets: normalized.use_bullets ?? normalized.use_bullet_points ?? true,

    ask_follow_up_question:
      normalized.ask_follow_up_question ?? normalized.ask_follow_up ?? true,
    ask_follow_up:
      normalized.ask_follow_up ?? normalized.ask_follow_up_question ?? true,

    show_knowledge_sources:
      normalized.show_knowledge_sources ?? normalized.show_sources ?? false,
    show_sources:
      normalized.show_sources ?? normalized.show_knowledge_sources ?? false,

    handoff_when_customer_asks_human:
      normalized.handoff_when_customer_asks_human ??
      normalized.handoff_when_customer_requests_agent ??
      true,
    handoff_when_customer_requests_agent:
      normalized.handoff_when_customer_requests_agent ??
      normalized.handoff_when_customer_asks_human ??
      true,

    handoff_for_pricing_proposal:
      normalized.handoff_for_pricing_proposal ??
      normalized.handoff_when_pricing_request ??
      true,
    handoff_when_pricing_request:
      normalized.handoff_when_pricing_request ??
      normalized.handoff_for_pricing_proposal ??
      true,
  };

  return payload;
};

export default function useAiSettingsData() {
  const [loading, setLoading] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);
  const [savingArticle, setSavingArticle] = useState(false);
  const [error, setError] = useState('');

  const [workspace, setWorkspace] = useState(null);
  const [activeBot, setActiveBot] = useState(null);

  const [settings, setSettings] = useState(DEFAULT_AI_SETTINGS);
  const [articles, setArticles] = useState([]);
  const [features, setFeatures] = useState([]);
  const [templateFeatures, setTemplateFeatures] = useState([]);
  const [feedbackAnalytics, setFeedbackAnalytics] = useState({
    csat: 0,
    averageRating: 0,
    totalFeedback: 0,
    ratingDistribution: {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    },
    recentFeedbacks: [],
  });

  const [employees, setEmployees] = useState([]);
  const [vacancies, setVacancies] = useState([]);

  const [documents, setDocuments] = useState([]);
  const [chunks, setChunks] = useState([]);

  const getCurrentWorkspaceAndBot = async () => {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError) throw userError;

    if (!user) {
      throw new Error('User belum login. Silakan login Supabase Auth dulu.');
    }

    const { data: memberships, error: membershipError } = await supabase
      .from('workspace_members')
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
      `,
      )
      .eq('profile_id', user.id)
      .eq('status', 'active')
      .limit(1);

    if (membershipError) throw membershipError;

    const currentWorkspace = memberships?.[0]?.workspace;

    if (!currentWorkspace?.id) {
      throw new Error('Workspace aktif tidak ditemukan.');
    }

    const { data: bots, error: botsError } = await supabase
      .from('bots')
      .select('id, name, status, bot_type, workspace_id, created_at')
      .eq('workspace_id', currentWorkspace.id)
      .order('created_at', { ascending: false });

    if (botsError) throw botsError;

    const botRows = bots || [];

    if (botRows.length === 0) {
      throw new Error('Bot aktif tidak ditemukan.');
    }

    const storedBotId = localStorage.getItem(SELECTED_BOT_KEY);
    const storedBot = botRows.find((bot) => bot.id === storedBotId);

    const activeBots = botRows.filter((bot) => bot.status === 'active');
    const selectedBot = storedBot || activeBots[0] || botRows[0] || null;

    if (!selectedBot) {
      throw new Error('Bot aktif tidak ditemukan.');
    }

    localStorage.setItem(SELECTED_BOT_KEY, selectedBot.id);

    return {
      workspace: currentWorkspace,
      bot: selectedBot,
    };
  };

  const fetchAiSettingsData = async () => {
    setLoading(true);
    setError('');

    try {
      const { workspace, bot } = await getCurrentWorkspaceAndBot();

      setWorkspace(workspace);
      setActiveBot(bot);

      const { data: settingRow, error: settingError } = await supabase
        .from('ai_settings')
        .select('*')
        .eq('bot_id', bot.id)
        .maybeSingle();

      if (settingError) throw settingError;

      if (settingRow) {
        setSettings(normalizeSettingsRow(settingRow));
      } else {
        setSettings(
          normalizeSettingsRow({
            ai_name: bot.name ? `${bot.name} AI` : 'Customer Support AI',
          }),
        );
      }

      const { data: articleRows, error: articleError } = await supabase
        .from('knowledge_articles')
        .select('*')
        .eq('bot_id', bot.id)
        .order('updated_at', { ascending: false });

      if (articleError) throw articleError;

      setArticles(articleRows || []);

      const { data: featureRows, error: featureError } = await supabase
        .from('bot_features')
        .select('*')
        .eq('bot_id', bot.id)
        .order('feature_name', { ascending: true });

      if (featureError) throw featureError;

      setFeatures(featureRows || []);

      const { data: templateRows, error: templateError } = await supabase
        .from('agent_template_features')
        .select('*')
        .order('feature_name');

      if (templateError) throw templateError;

      setTemplateFeatures(templateRows || []);

      await fetchFeedbackAnalytics(bot.id, workspace.id);

      const fetchEmployees = await getEmployees();
      setEmployees(fetchEmployees);

      await fetchVacancies();

      const { data: documentRows, error: documentError } = await supabase
        .from('knowledge_documents')
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
        `,
        )
        .eq('bot_id', bot.id)
        .order('uploaded_at', { ascending: false });

      if (documentError) throw documentError;

      const docs = documentRows || [];

      setDocuments(docs);

      const documentIds = docs.map((doc) => doc.id);

      if (documentIds.length === 0) {
        setChunks([]);
        return;
      }

      const { data: chunkRows, error: chunkError } = await supabase
        .from('knowledge_chunks')
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
        `,
        )
        .in('document_id', documentIds)
        .order('chunk_index', { ascending: true });

      if (chunkError) throw chunkError;

      setChunks(chunkRows || []);
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Failed to fetch AI settings data.');
    } finally {
      setLoading(false);
    }
  };

  const updateSettingField = (field, value) => {
    setSettings((current) => {
      const next = {
        ...current,
        [field]: STRUCTURED_ARRAY_FIELDS.includes(field)
          ? normalizeArrayField(value)
          : value,
      };

      if (field === 'use_bullets') {
        next.use_bullet_points = value;
      }

      if (field === 'use_bullet_points') {
        next.use_bullets = value;
      }

      if (field === 'ask_follow_up') {
        next.ask_follow_up_question = value;
      }

      if (field === 'ask_follow_up_question') {
        next.ask_follow_up = value;
      }

      if (field === 'show_sources') {
        next.show_knowledge_sources = value;
      }

      if (field === 'show_knowledge_sources') {
        next.show_sources = value;
      }

      if (field === 'handoff_when_customer_requests_agent') {
        next.handoff_when_customer_asks_human = value;
      }

      if (field === 'handoff_when_customer_asks_human') {
        next.handoff_when_customer_requests_agent = value;
      }

      if (field === 'handoff_when_pricing_request') {
        next.handoff_for_pricing_proposal = value;
      }

      if (field === 'handoff_for_pricing_proposal') {
        next.handoff_when_pricing_request = value;
      }

      return next;
    });
  };

  const saveSettings = async () => {
    setSavingSettings(true);
    setError('');

    try {
      let currentBot = activeBot;

      if (!currentBot?.id) {
        const result = await getCurrentWorkspaceAndBot();

        currentBot = result.bot;

        setWorkspace(result.workspace);
        setActiveBot(result.bot);
      }

      const payload = {
        ...prepareSettingsPayload(settings),
        bot_id: currentBot.id,
        updated_at: new Date().toISOString(),
      };

      delete payload.id;
      delete payload.created_at;

      const { data, error: upsertError } = await supabase
        .from('ai_settings')
        .upsert(payload, {
          onConflict: 'bot_id',
        })
        .select()
        .single();

      if (upsertError) throw upsertError;

      setSettings(normalizeSettingsRow(data));

      return data;
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Failed to save AI settings.');
      throw err;
    } finally {
      setSavingSettings(false);
    }
  };

  const createArticle = async ({ title, category, content, tags, status }) => {
    setSavingArticle(true);
    setError('');

    try {
      let currentBot = activeBot;

      if (!currentBot?.id) {
        const result = await getCurrentWorkspaceAndBot();

        currentBot = result.bot;

        setWorkspace(result.workspace);
        setActiveBot(result.bot);
      }

      const cleanTitle = String(title || '').trim();
      const cleanContent = String(content || '').trim();

      if (!cleanTitle) throw new Error('Article title wajib diisi.');
      if (!cleanContent) throw new Error('Article content wajib diisi.');

      const tagArray = String(tags || '')
        .split(',')
        .map((tag) => tag.trim())
        .filter(Boolean);

      const { data, error: createError } = await supabase
        .from('knowledge_articles')
        .insert({
          bot_id: currentBot.id,
          title: cleanTitle,
          category: String(category || '').trim() || null,
          content: cleanContent,
          tags: tagArray,
          status: status || 'draft',
        })
        .select()
        .single();

      if (createError) throw createError;

      await fetchAiSettingsData();

      return data;
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Failed to create article.');
      throw err;
    } finally {
      setSavingArticle(false);
    }
  };

  const updateArticleStatus = async (articleId, status) => {
    setError('');

    try {
      if (!activeBot?.id) {
        throw new Error('Bot aktif belum tersedia.');
      }

      const { error: updateError } = await supabase
        .from('knowledge_articles')
        .update({
          status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', articleId)
        .eq('bot_id', activeBot.id);

      if (updateError) throw updateError;

      await fetchAiSettingsData();
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Failed to update article status.');
      throw err;
    }
  };

  const deleteArticle = async (articleId) => {
    setError('');

    try {
      if (!activeBot?.id) {
        throw new Error('Bot aktif belum tersedia.');
      }

      const { error: deleteError } = await supabase
        .from('knowledge_articles')
        .delete()
        .eq('id', articleId)
        .eq('bot_id', activeBot.id);

      if (deleteError) throw deleteError;

      await fetchAiSettingsData();
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Failed to delete article.');
      throw err;
    }
  };

  const fetchFeedbackAnalytics = async (botId, workspaceId) => {
    //const { workspace, bot } = await getCurrentWorkspaceAndBot();

    console.log(
      'Fetching feedback analytics for bot:',
      botId,
      'in workspace:',
      workspaceId,
    );

    if (!botId || !workspaceId) return;

    const { data, error } = await supabase
      .from('conversation_feedbacks')
      .select('*')
      .eq('bot_id', botId)
      .eq('workspace_id', workspaceId)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const totalFeedback = data.length;

    const totalRating = data.reduce((sum, item) => sum + (item.rating || 0), 0);

    const averageRating =
      totalFeedback > 0 ? Number((totalRating / totalFeedback).toFixed(1)) : 0;

    const satisfiedCount = data.filter((item) => item.rating >= 4).length;

    const csat =
      totalFeedback > 0
        ? Math.round((satisfiedCount / totalFeedback) * 100)
        : 0;

    const ratingDistribution = {
      1: data.filter((x) => x.rating === 1).length,
      2: data.filter((x) => x.rating === 2).length,
      3: data.filter((x) => x.rating === 3).length,
      4: data.filter((x) => x.rating === 4).length,
      5: data.filter((x) => x.rating === 5).length,
    };

    setFeedbackAnalytics({
      csat,
      averageRating,
      totalFeedback,
      ratingDistribution,
      recentFeedbacks: data.slice(0, 10),
    });
  };

  const uploadKnowledgeDocument = async (file) => {
    setError('');

    try {
      if (!file) {
        throw new Error('File belum dipilih.');
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

      const allowedExtensions = ['txt', 'pdf', 'docx', 'csv'];
      const fileExtension = file.name.split('.').pop()?.toLowerCase();

      if (!allowedExtensions.includes(fileExtension)) {
        throw new Error(
          'AI indexing untuk MVP saat ini hanya mendukung file TXT. PDF, DOCX, dan CSV.',
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
        throw new Error('User belum login.');
      }

      const safeFileName = file.name
        .replace(/\s+/g, '-')
        .replace(/[^a-zA-Z0-9._-]/g, '')
        .toLowerCase();

      const storagePath = `${currentWorkspace.id}/${
        currentBot.id
      }/${Date.now()}-${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('knowledge-files')
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: file.type || 'text/plain',
        });

      if (uploadError) throw uploadError;

      const documentTitle = file.name.replace(/\.[^/.]+$/, '');

      const { error: insertError } = await supabase
        .from('knowledge_documents')
        .insert({
          workspace_id: currentWorkspace.id,
          bot_id: currentBot.id,
          uploaded_by: user.id,
          file_name: file.name,
          file_type: file.type || fileExtension,
          file_size_bytes: file.size,
          file_url: storagePath,
          source_type: 'upload',
          title: documentTitle,
          description: 'Document uploaded and awaiting indexing.',
          status: 'uploaded',
          total_chunks: 0,
          indexed_chunks: 0,
          metadata: {
            originalFileName: file.name,
            storageBucket: 'knowledge-files',
            storagePath,
            extension: fileExtension,
          },
          uploaded_at: new Date().toISOString(),
        });

      if (insertError) throw insertError;

      await fetchAiSettingsData();
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Failed to upload knowledge document.');
      throw err;
    }
  };

  const normalizePhoneNumber = (phoneNumber) => {
    if (!phoneNumber) return '';

    const cleaned = phoneNumber.replace(/\D/g, '');

    if (cleaned.startsWith('62')) {
      return cleaned;
    }

    if (cleaned.startsWith('0')) {
      return `62${cleaned.slice(1)}`;
    }

    return cleaned;
  };

  const indexTextKnowledgeDocument = async (document) => {
    GlobalWorkerOptions.workerSrc = new URL(
      'pdfjs-dist/build/pdf.worker.mjs',
      import.meta.url,
    ).toString();

    setError('');

    try {
      if (!document?.id) {
        throw new Error('Document tidak valid.');
      }

      const allowedStatuses = ['uploaded', 'indexed', 'failed'];

      if (!allowedStatuses.includes(document.status)) {
        throw new Error(
          'Document hanya bisa di-index jika statusnya Uploaded, Indexed, atau Failed.',
        );
      }

      const fileExtension =
        document.metadata?.extension ||
        document.file_name?.split('.').pop()?.toLowerCase();

      if (!['txt', 'pdf', 'docx', 'csv'].includes(fileExtension)) {
        throw new Error(
          'AI indexing saat ini hanya mendukung file .txt, .pdf, .docx. dan .csv',
        );
      }

      const storagePath = document.file_url || document.metadata?.storagePath;

      if (!storagePath) {
        throw new Error('Storage path document tidak ditemukan.');
      }

      const { error: markProcessingError } = await supabase
        .from('knowledge_documents')
        .update({
          status: 'processing',
          processing_started_at: new Date().toISOString(),
          error_message: null,
          updated_at: new Date().toISOString(),
        })
        .eq('id', document.id);

      if (markProcessingError) throw markProcessingError;

      const { data: fileBlob, error: downloadError } = await supabase.storage
        .from('knowledge-files')
        .download(storagePath);

      if (downloadError) throw downloadError;

      let textContent = '';

      if (fileExtension === 'txt' || fileExtension === 'csv') {
        textContent = await fileBlob.text();
      } else if (fileExtension === 'pdf') {
        const arrayBuffer = await fileBlob.arrayBuffer();

        const pdf = await pdfjsLib.getDocument({
          data: arrayBuffer,
        }).promise;

        const pages = [];

        for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
          const page = await pdf.getPage(pageNumber);

          const pageContent = await page.getTextContent();

          const pageText = pageContent.items
            .map((item) => item.str)
            .filter(Boolean)
            .join(' ');

          pages.push(pageText);
        }

        textContent = pages.join('\n');
      } else if (fileExtension === 'docx') {
        const arrayBuffer = await fileBlob.arrayBuffer();

        const result = await mammoth.extractRawText({
          arrayBuffer,
        });

        textContent = result.value;
      }

      const cleanText = textContent
        .replace(/\r\n/g, '\n')
        .replace(/\n{3,}/g, '\n\n')
        .trim();

      if (!cleanText) {
        throw new Error('Isi file kosong atau tidak bisa dibaca.');
      }

      const chunkSize = 800;
      const chunksToCreate = [];

      for (let i = 0; i < cleanText.length; i += chunkSize) {
        const chunkText = cleanText.slice(i, i + chunkSize).trim();

        if (chunkText) {
          chunksToCreate.push(chunkText);
        }
      }

      if (chunksToCreate.length === 0) {
        throw new Error('Tidak ada chunk yang berhasil dibuat.');
      }

      const chunkPayload = chunksToCreate.map((content, index) => ({
        workspace_id: document.workspace_id,
        bot_id: document.bot_id,
        document_id: document.id,
        chunk_index: index,
        title: `${document.title || document.file_name} - Chunk ${index + 1}`,
        content,
        token_count: Math.ceil(content.length / 4),
        embedding_provider: 'manual_txt_index',
        embedding_model: 'manual-text-chunk-v1',
        embedding_id: `manual_${document.id}_${index}`,
        status: 'embedded',
        metadata: {
          source: 'manual_txt_index',
          fileName: document.file_name,
          chunkSize,
          reindexedAt: new Date().toISOString(),
        },
      }));

      const { error: deleteOldChunksError } = await supabase
        .from('knowledge_chunks')
        .delete()
        .eq('document_id', document.id);

      if (deleteOldChunksError) throw deleteOldChunksError;

      const { error: insertChunksError } = await supabase
        .from('knowledge_chunks')
        .insert(chunkPayload);

      if (insertChunksError) throw insertChunksError;

      const { error: updateDocumentError } = await supabase
        .from('knowledge_documents')
        .update({
          status: 'indexed',
          total_chunks: chunksToCreate.length,
          indexed_chunks: chunksToCreate.length,
          indexed_at: new Date().toISOString(),
          error_message: null,
          metadata: {
            ...(document.metadata || {}),
            indexedBy: 'manual_txt_index',
            indexedAt: new Date().toISOString(),
            chunkSize,
          },
          updated_at: new Date().toISOString(),
        })
        .eq('id', document.id);

      if (updateDocumentError) throw updateDocumentError;

      await fetchAiSettingsData();
    } catch (err) {
      console.error(err);

      if (document?.id) {
        await supabase
          .from('knowledge_documents')
          .update({
            status: 'failed',
            error_message: err?.message || 'Failed to index document.',
            updated_at: new Date().toISOString(),
          })
          .eq('id', document.id);
      }

      setError(err?.message || 'Failed to index document.');
      await fetchAiSettingsData();

      throw err;
    }
  };

  const deleteKnowledgeDocument = async (document) => {
    setError('');

    try {
      if (!document?.id) {
        throw new Error('Document tidak valid.');
      }

      if (!activeBot?.id) {
        throw new Error('Bot aktif belum tersedia.');
      }

      const storagePath = document.file_url || document.metadata?.storagePath;
      const storageBucket =
        document.metadata?.storageBucket || 'knowledge-files';

      const { error: deleteChunksError } = await supabase
        .from('knowledge_chunks')
        .delete()
        .eq('document_id', document.id)
        .eq('bot_id', activeBot.id);

      if (deleteChunksError) throw deleteChunksError;

      const { error: deleteDocumentError } = await supabase
        .from('knowledge_documents')
        .delete()
        .eq('id', document.id)
        .eq('bot_id', activeBot.id);

      if (deleteDocumentError) throw deleteDocumentError;

      if (storagePath) {
        const { error: removeStorageError } = await supabase.storage
          .from(storageBucket)
          .remove([storagePath]);

        if (removeStorageError) {
          console.warn('[Storage delete warning]', removeStorageError);
        }
      }

      await fetchAiSettingsData();
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Failed to delete knowledge document.');
      throw err;
    }
  };

  const toggleFeature = async (feature) => {
    setError('');

    try {
      const { error } = await supabase
        .from('bot_features')
        .update({
          is_enabled: !feature.is_enabled,
          updated_at: new Date().toISOString(),
        })
        .eq('id', feature.id);

      if (error) throw error;

      await fetchAiSettingsData();
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Failed to update feature.');
      throw err;
    }
  };

  const deleteFeature = async (featureId) => {
    setError('');

    try {
      const { error } = await supabase
        .from('bot_features')
        .delete()
        .eq('id', featureId);

      if (error) throw error;

      await fetchAiSettingsData();
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Failed to delete feature.');
      throw err;
    }
  };

  const isFeatureNameExistsForCreate = async (botId, featureName) => {
    const { data, error } = await supabase
      .from('bot_features')
      .select('id')
      .eq('bot_id', botId)
      .ilike('feature_name', featureName)
      .limit(1);

    if (error) throw error;

    return data.length > 0;
  };

  const isFeatureNameExistsForUpdate = async (
    botId,
    featureId,
    featureName,
  ) => {
    const { data, error } = await supabase
      .from('bot_features')
      .select('id')
      .eq('bot_id', botId)
      .neq('id', featureId)
      .ilike('feature_name', featureName)
      .limit(1);

    if (error) throw error;

    return data.length > 0;
  };

  const createFeature = async (payload) => {
    setError('');

    try {
      let currentWorkspace = workspace;
      let currentBot = activeBot;

      if (!currentWorkspace?.id || !currentBot?.id) {
        const result = await getCurrentWorkspaceAndBot();

        currentWorkspace = result.workspace;
        currentBot = result.bot;
      }

      const exists = await isFeatureNameExistsForCreate(
        currentBot.id,
        payload.feature_name,
      );

      if (exists) {
        throw new Error(`Feature "${payload.feature_name}" already exists.`);
      }

      const { error } = await supabase.from('bot_features').insert({
        workspace_id: currentWorkspace.id,
        bot_id: currentBot.id,

        feature_name: payload.feature_name,

        template_feature_id: payload.template_feature_id || null,

        feature_key: payload.feature_key || null,
        feature_type: payload.feature_type || null,
        description: payload.description || null,
        required_data: payload.required_data || null,
        is_enabled: payload.is_enabled,

        configuration_json:
          typeof payload.configuration_json === 'string'
            ? JSON.parse(payload.configuration_json || '{}')
            : payload.configuration_json,
      });

      if (error) throw error;

      await fetchAiSettingsData();
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Failed to create feature.');
      throw err;
    }
  };

  const updateFeature = async (featureId, payload) => {
    setError('');

    try {
      let currentBot = activeBot;

      if (!currentBot?.id) {
        const result = await getCurrentWorkspaceAndBot();
        currentBot = result.bot;
      }

      const exists = await isFeatureNameExistsForUpdate(
        currentBot.id,
        featureId,
        payload.feature_name,
      );

      if (exists) {
        throw new Error(`Feature "${payload.feature_name}" already exists.`);
      }

      const { error } = await supabase
        .from('bot_features')
        .update({
          feature_name: payload.feature_name,
          description: payload.description,
          configuration_json:
            typeof payload.configuration_json === 'string'
              ? JSON.parse(payload.configuration_json || '{}')
              : payload.configuration_json,
          updated_at: new Date().toISOString(),
        })
        .eq('id', featureId);

      if (error) throw error;

      await fetchAiSettingsData();
    } catch (err) {
      console.error(err);
      setError(err?.message || 'Failed to update feature.');
      throw err;
    }
  };

  const generateEmployeeId = async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('employee_id')
      .order('created_at', { ascending: false })
      .limit(1);

    if (error) {
      console.error(error);
      return 'EMP_001';
    }

    if (!data?.length) {
      return 'EMP_001';
    }

    const lastEmployeeId = data[0]?.employee_id;

    if (!lastEmployeeId) {
      return 'EMP_001';
    }

    const lastNumber = parseInt(lastEmployeeId.replace(/\D/g, ''), 10);

    if (isNaN(lastNumber)) {
      return 'EMP_001';
    }

    return `EMP_${String(lastNumber + 1).padStart(3, '0')}`;
  };

  const getEmployees = async () => {
    const { data, error } = await supabase
      .from('employees')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    setEmployees(data || []);

    return data || [];
  };

  const isEmployeeNameExistsForCreate = async (employeeName) => {
    const { data, error } = await supabase
      .from('employees')
      .select('id')
      .ilike('full_name', employeeName)
      .limit(1);

    if (error) throw error;

    return data.length > 0;
  };

  const isEmployeePhoneExistsForCreate = async (phoneNumber) => {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    const { data, error } = await supabase
      .from('employees')
      .select('id')
      .eq('phone_number_normalized', normalizedPhone)
      .limit(1);

    if (error) throw error;

    return data.length > 0;
  };

  const isEmployeeNameExistsForUpdate = async (employeeId, employeeName) => {
    const { data, error } = await supabase
      .from('employees')
      .select('id')
      .neq('id', employeeId)
      .ilike('full_name', employeeName.trim())
      .limit(1);

    if (error) throw error;

    return data.length > 0;
  };

  const isEmployeePhoneExistsForUpdate = async (employeeId, phoneNumber) => {
    const normalizedPhone = normalizePhoneNumber(phoneNumber);

    const { data, error } = await supabase
      .from('employees')
      .select('id')
      .neq('id', employeeId)
      .eq('phone_number_normalized', normalizedPhone)
      .limit(1);

    if (error) throw error;

    return data.length > 0;
  };

  const createEmployee = async (employeeData) => {
    try {
      const nameExists = await isEmployeeNameExistsForCreate(
        employeeData.full_name,
      );

      if (nameExists) {
        throw new Error(`Employee "${employeeData.full_name}" already exists.`);
      }

      const phoneExists = await isEmployeePhoneExistsForCreate(
        employeeData.phone_number,
      );

      if (phoneExists) {
        throw new Error('Phone number is already used by another employee.');
      }

      const { error } = await supabase.from('employees').insert({
        ...employeeData,
        full_name: employeeData.full_name.trim(),
        phone_number_normalized: normalizePhoneNumber(
          employeeData.phone_number,
        ),
        annual_leave_remaining:
          employeeData.annual_leave_entitlement -
          employeeData.annual_leave_used,
      });

      if (error) throw error;

      await fetchAiSettingsData();

      return true;
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const updateEmployee = async (employeeId, employeeData) => {
    try {
      const nameExists = await isEmployeeNameExistsForUpdate(
        employeeId,
        employeeData.full_name,
      );

      if (nameExists) {
        throw new Error(`Employee "${employeeData.full_name}" already exists.`);
      }

      const phoneExists = await isEmployeePhoneExistsForUpdate(
        employeeId,
        employeeData.phone_number,
      );

      if (phoneExists) {
        throw new Error('Phone number is already used by another employee.');
      }

      const { error } = await supabase
        .from('employees')
        .update({
          ...employeeData,
          full_name: employeeData.full_name.trim(),
          phone_number_normalized: normalizePhoneNumber(
            employeeData.phone_number,
          ),
          annual_leave_remaining:
            employeeData.annual_leave_entitlement -
            employeeData.annual_leave_used,
        })
        .eq('id', employeeId);

      if (error) throw error;

      await fetchAiSettingsData();

      return true;
    } catch (error) {
      console.error(error);
      throw error;
    }
  };

  const deleteEmployee = async (employeeId) => {
    const { error } = await supabase
      .from('employees')
      .delete()
      .eq('id', employeeId);

    if (error) {
      console.error(error);
      return false;
    }

    await fetchAiSettingsData();

    return true;
  };

  const handleToggleEmployeeStatus = async (employee) => {
    const { error } = await supabase
      .from('employees')
      .update({
        employee_status:
          employee.employee_status === 'active' ? 'inactive' : 'active',
      })
      .eq('id', employee.id);

    if (error) {
      console.error(error);
      return;
    }

    await fetchAiSettingsData();
  };

  // VACANCIES STUFF
  const fetchVacancies = async () => {
    try {
      setLoading(true);

      const { data, error } = await supabase
        .from('job_vacancies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setVacancies(data || []);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const createVacancy = async (payload) => {
    const { data, error } = await supabase
      .from('job_vacancies')
      .insert({
        ...payload,
        workspace_id: workspace.id,
        bot_id: activeBot.id,
      })
      .select()
      .single();

    if (error) throw error;

    setVacancies((prev) => [data, ...prev]);

    return data;
  };

  const updateVacancy = async (id, payload) => {
    const { data, error } = await supabase
      .from('job_vacancies')
      .update(payload)
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;

    setVacancies((prev) => prev.map((item) => (item.id === id ? data : item)));

    return data;
  };

  const deleteVacancy = async (vacancy) => {
    const { error } = await supabase
      .from('job_vacancies')
      .delete()
      .eq('id', vacancy.id);

    if (error) throw error;

    setVacancies((prev) => prev.filter((item) => item.id !== vacancy.id));
  };

  const toggleVacancyStatus = async (vacancy) => {
    const newStatus = vacancy.vacancy_status === 'open' ? 'closed' : 'open';

    const { data, error } = await supabase
      .from('job_vacancies')
      .update({
        vacancy_status: newStatus,
      })
      .eq('id', vacancy.id)
      .select()
      .single();

    if (error) throw error;

    setVacancies((prev) =>
      prev.map((item) => (item.id === vacancy.id ? data : item)),
    );

    return data;
  };

  const generateVacancyCode = async () => {
    const { data, error } = await supabase
      .from('job_vacancies')
      .select('vacancy_code')
      .order('created_at', {
        ascending: false,
      })
      .limit(1);

    if (error || !data?.length) {
      return 'VAC_001';
    }

    const lastCode = data[0]?.vacancy_code;

    if (!lastCode) {
      return 'VAC_001';
    }

    const lastNumber = parseInt(lastCode.replace(/\D/g, ''), 10);

    if (isNaN(lastNumber)) {
      return 'VAC_001';
    }

    return `VAC_${String(lastNumber + 1).padStart(3, '0')}`;
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
      'nexora:selected-bot-changed',
      handleSelectedBotChanged,
    );

    window.addEventListener('nexora:bot-created', handleBotCreated);

    return () => {
      window.removeEventListener(
        'nexora:selected-bot-changed',
        handleSelectedBotChanged,
      );

      window.removeEventListener('nexora:bot-created', handleBotCreated);
    };
  }, []);

  const stats = useMemo(() => {
    const totalDocuments = documents.length;

    const indexedDocuments = documents.filter(
      (doc) => doc.status === 'indexed',
    ).length;

    const processingDocuments = documents.filter(
      (doc) => doc.status === 'processing',
    ).length;

    const failedDocuments = documents.filter(
      (doc) => doc.status === 'failed',
    ).length;

    const uploadedDocuments = documents.filter(
      (doc) => doc.status === 'uploaded',
    ).length;

    const totalChunks = documents.reduce(
      (sum, doc) => sum + Number(doc.total_chunks || 0),
      0,
    );

    const indexedChunks = documents.reduce(
      (sum, doc) => sum + Number(doc.indexed_chunks || 0),
      0,
    );

    const publishedArticles = articles.filter(
      (article) => article.status === 'published',
    ).length;

    const draftArticles = articles.filter(
      (article) => article.status === 'draft',
    ).length;

    const knowledgeItems = totalDocuments + articles.length;
    const readyItems = indexedDocuments + publishedArticles;

    const knowledgeHealth =
      knowledgeItems === 0
        ? 0
        : Math.round((readyItems / knowledgeItems) * 100);

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
    features,
    templateFeatures,
    documents,
    chunks,
    stats,

    updateSettingField,
    saveSettings,

    createArticle,
    updateArticleStatus,
    deleteArticle,

    toggleFeature,
    createFeature,
    updateFeature,
    deleteFeature,

    employees,
    createEmployee,
    updateEmployee,
    deleteEmployee,
    handleToggleEmployeeStatus,
    generateEmployeeId,

    vacancies,
    createVacancy,
    updateVacancy,
    deleteVacancy,
    toggleVacancyStatus,
    generateVacancyCode,

    feedbackAnalytics,

    uploadKnowledgeDocument,
    indexTextKnowledgeDocument,
    deleteKnowledgeDocument,

    refetch: fetchAiSettingsData,
  };
}
