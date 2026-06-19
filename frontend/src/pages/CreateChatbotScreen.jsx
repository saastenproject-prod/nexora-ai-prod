import { useEffect, useMemo, useState } from 'react';
import toast from 'react-hot-toast';
import Topbar from '../components/layout/Topbar';

import {
  Bot,
  CheckCircle2,
  Globe2,
  MessageCircle,
  Sparkles,
} from '../lib/icons';

import useCreateChatbot from '../hooks/useCreateChatbot';

const SELECTED_AGENT_TEMPLATE_KEY = 'nexora_selected_agent_template';

const getSelectedAgentTemplate = () => {
  try {
    const raw = localStorage.getItem(SELECTED_AGENT_TEMPLATE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (err) {
    console.error(
      '[CreateChatbotScreen] Failed to parse selected template:',
      err,
    );
    return null;
  }
};

const getTemplateBotDescription = (template) => {
  if (!template) return '';

  if (template.defaultPrompt) {
    return template.defaultPrompt;
  }

  return `${template.templateName || 'AI Agent'} for ${
    template.categoryName || 'business automation'
  }.`;
};

export default function CreateChatbotScreen({ setScreen }) {
  const { loading, error, createChatbot } = useCreateChatbot();

  const [selectedChannel, setSelectedChannel] = useState(null);
  const [selectedUsecase, setSelectedUsecase] = useState(null);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  const [form, setForm] = useState({
    name: '',
    description: '',
  });

  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    try {
      const template = getSelectedAgentTemplate();

      const rawChannel = sessionStorage.getItem(
        'nexora_create_chatbot_channel',
      );

      const rawUsecase = sessionStorage.getItem(
        'nexora_create_chatbot_usecase',
      );

      const channel = rawChannel ? JSON.parse(rawChannel) : null;
      const usecase = rawUsecase ? JSON.parse(rawUsecase) : null;

      const resolvedChannel =
        channel ||
        (template
          ? {
              channelType:
                template.recommendedChannel === 'whatsapp'
                  ? 'whatsapp'
                  : 'website',
              channelName:
                template.recommendedChannel === 'whatsapp'
                  ? 'WhatsApp'
                  : 'Website Widget',
            }
          : null);

      const resolvedUsecase =
        usecase ||
        (template
          ? {
              useCase: template.templateSlug || 'agent-template',
              useCaseName: template.templateName || 'Agent Template',
              botType: template.templateSlug || 'custom_agent',
              defaultBotName: template.templateName || 'New AI Agent',
              description: getTemplateBotDescription(template),
            }
          : null);

      if (!resolvedChannel?.channelType) {
        setScreen('platform');
        return;
      }

      if (!resolvedUsecase?.useCase) {
        setScreen('usecase');
        return;
      }

      setSelectedChannel(resolvedChannel);
      setSelectedUsecase(resolvedUsecase);
      setSelectedTemplate(template);

      setForm({
        name:
          template?.templateName ||
          resolvedUsecase.defaultBotName ||
          'New Chatbot',
        description:
          template?.defaultPrompt || resolvedUsecase.description || '',
      });
    } catch (err) {
      console.error('[CreateChatbotScreen] init error:', err);
      setScreen('platform');
    }
  }, [setScreen]);

  const channelIcon = useMemo(() => {
    if (selectedChannel?.channelType === 'whatsapp') {
      return MessageCircle;
    }

    return Globe2;
  }, [selectedChannel]);

  const ChannelIcon = channelIcon;

  const templateFeaturesCount =
    selectedTemplate?.enabledFeatureIds?.length || 0;

  const behaviorConfig = selectedTemplate?.defaultBehaviorConfig || {};

  const behaviorConfigPreview = [
    {
      label: 'Agent Role',
      value: behaviorConfig.agent_role || '-',
    },
    {
      label: 'Department',
      value: behaviorConfig.department || '-',
    },
    {
      label: 'Knowledge Mode',
      value: behaviorConfig.knowledge_mode || '-',
    },
    {
      label: 'Response Style',
      value: behaviorConfig.response_style || '-',
    },
  ];

  const handleSubmit = async (event) => {
    event.preventDefault();

    if (!selectedChannel || !selectedUsecase) return;

    try {
      await createChatbot({
        name: form.name,
        description: form.description,

        botType:
          selectedTemplate?.templateSlug ||
          selectedUsecase.botType ||
          'custom_agent',

        channelType: selectedChannel.channelType,

        useCase:
          selectedTemplate?.templateSlug ||
          selectedUsecase.useCase ||
          'agent-template',

        templateId: selectedTemplate?.templateId || null,
        templateSlug: selectedTemplate?.templateSlug || null,
        categoryId: selectedTemplate?.categoryId || null,
        categoryName: selectedTemplate?.categoryName || null,

        defaultPrompt: selectedTemplate?.defaultPrompt || null,
        defaultRoleDescription:
          selectedTemplate?.defaultRoleDescription || null,
        defaultTone: selectedTemplate?.defaultTone || 'professional',
        defaultLanguage: selectedTemplate?.defaultLanguage || 'id',
        defaultGreetingMessage:
          selectedTemplate?.defaultGreetingMessage || null,
        defaultFallbackMessage:
          selectedTemplate?.defaultFallbackMessage || null,

        defaultBehaviorConfig: selectedTemplate?.defaultBehaviorConfig || {},

        enabledFeatureIds: selectedTemplate?.enabledFeatureIds || [],
      });

      sessionStorage.removeItem('nexora_create_chatbot_channel');
      sessionStorage.removeItem('nexora_create_chatbot_usecase');
      localStorage.removeItem(SELECTED_AGENT_TEMPLATE_KEY);

      toast.success('Chatbot berhasil dibuat');

      setTimeout(() => {
        setScreen('flows');
      }, 900);
    } catch (err) {
      console.error('[CreateChatbotScreen] create error:', err);
      toast.error(err.message || 'Gagal membuat chatbot');
    }
  };

  return (
    <div className="min-h-screen bg-[#F6F8FC]">
      <Topbar step={3} />

      <main className="mx-auto max-w-[1440px] px-6 py-7 lg:px-8 space-y-6">
        <section className="flex flex-col gap-5 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-blue-600">
              Configure Bot
            </p>

            <h1 className="mt-2 text-3xl lg:text-4xl font-black tracking-tight text-slate-950">
              Review and create your AI chatbot
            </h1>

            <p className="mt-3 text-sm lg:text-base leading-7 text-slate-500">
              Confirm the selected template, channel, bot identity, structured
              behavior configuration, and default instructions. Nexora will
              generate the bot record, starter flow, widget settings, channel
              configuration, AI settings, and selected features automatically.
            </p>
          </div>

          <button
            type="button"
            onClick={() =>
              selectedTemplate
                ? setScreen('agent-marketplace')
                : setScreen('usecase')
            }
            className="h-11 w-fit px-5 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50 transition"
          >
            {selectedTemplate ? 'Back to Marketplace' : 'Back to Use Case'}
          </button>
        </section>

        {selectedTemplate && (
          <div className="rounded-2xl border border-blue-200 bg-blue-50 px-5 py-4 text-sm text-blue-800">
            <span className="font-black">Template selected:</span>{' '}
            {selectedTemplate.templateName}{' '}
            <span className="text-blue-500">
              ({selectedTemplate.categoryName})
            </span>
          </div>
        )}

        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        {/* {successMessage && (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-4 text-sm font-semibold text-emerald-700">
            {successMessage}
          </div>
        )} */}

        <section className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_420px] gap-6 items-start">
          <form
            onSubmit={handleSubmit}
            className="rounded-[2rem] border border-slate-200 bg-white p-6 lg:p-7 shadow-sm"
          >
            <div className="flex items-start gap-4">
              <div className="h-12 w-12 shrink-0 rounded-2xl bg-blue-50 text-blue-700 grid place-items-center">
                <Bot size={24} />
              </div>

              <div>
                <h2 className="text-xl font-black text-slate-950">
                  Bot Details
                </h2>
                <p className="mt-1 text-sm leading-6 text-slate-500">
                  This information will be used as the bot identity and default
                  instruction baseline.
                </p>
              </div>
            </div>

            <div className="mt-7 grid grid-cols-1 gap-5">
              <label className="block">
                <span className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Chatbot Name
                </span>

                <input
                  className="mt-2 h-12 w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 text-sm font-semibold text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
                  value={form.name}
                  onChange={(event) =>
                    setForm((current) => ({
                      ...current,
                      name: event.target.value,
                    }))
                  }
                  placeholder="Sales Agent"
                />
              </label>

              <label className="block">
                <span className="text-xs font-black uppercase tracking-wide text-slate-400">
                  Description / Main Instruction
                </span>

                <textarea
                  className="mt-2 h-44 w-full rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm leading-6 text-slate-900 outline-none resize-none transition placeholder:text-slate-400 focus:border-blue-400 focus:bg-white focus:ring-4 focus:ring-blue-100"
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

              {selectedTemplate && (
                <div className="rounded-3xl border border-slate-200 bg-slate-50/80 p-5">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-slate-400">
                        Template Defaults
                      </p>
                      <p className="mt-1 text-sm text-slate-500">
                        These values are copied from the selected marketplace
                        template.
                      </p>
                    </div>

                    <span className="rounded-full bg-blue-50 px-3 py-1 text-xs font-black text-blue-700">
                      {selectedTemplate.categoryName || 'Template'}
                    </span>
                  </div>

                  <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-black uppercase text-slate-400">
                        Role
                      </p>
                      <p className="mt-2 font-black text-slate-900">
                        {selectedTemplate.defaultRoleDescription || '-'}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-black uppercase text-slate-400">
                        Tone
                      </p>
                      <p className="mt-2 font-black text-slate-900">
                        {selectedTemplate.defaultTone || '-'}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-black uppercase text-slate-400">
                        Language
                      </p>
                      <p className="mt-2 font-black text-slate-900">
                        {selectedTemplate.defaultLanguage || '-'}
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-200 bg-white p-4">
                      <p className="text-xs font-black uppercase text-slate-400">
                        Enabled Features
                      </p>
                      <p className="mt-2 font-black text-slate-900">
                        {templateFeaturesCount} feature
                        {templateFeaturesCount === 1 ? '' : 's'}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 rounded-2xl border border-blue-100 bg-blue-50 p-4">
                    <p className="text-xs font-black uppercase tracking-wide text-blue-700">
                      Structured Behavior Config
                    </p>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {behaviorConfigPreview.map((item) => (
                        <div
                          key={item.label}
                          className="rounded-2xl border border-blue-100 bg-white/80 p-3"
                        >
                          <p className="text-[11px] font-black uppercase text-slate-400">
                            {item.label}
                          </p>
                          <p className="mt-1 text-sm font-black text-slate-900">
                            {item.value}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-7 flex flex-wrap gap-3 border-t border-slate-200 pt-6">
              <button
                type="submit"
                disabled={loading || !form.name.trim()}
                className="h-12 px-6 rounded-2xl bg-blue-600 text-white text-sm font-black shadow-sm hover:bg-blue-700 disabled:opacity-60 disabled:cursor-not-allowed flex items-center gap-2 transition"
              >
                <Sparkles size={17} />
                {loading ? 'Creating Chatbot...' : 'Create Chatbot'}
              </button>

              <button
                type="button"
                onClick={() => setScreen('home')}
                className="h-12 px-6 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700 hover:bg-slate-50 transition"
              >
                Cancel
              </button>
            </div>
          </form>

          <aside className="space-y-5 xl:sticky xl:top-24">
            <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h3 className="text-xl font-black text-slate-950">
                    Setup Summary
                  </h3>
                  <p className="mt-1 text-sm leading-6 text-slate-500">
                    Review what will be generated after creation.
                  </p>
                </div>

                <div className="h-11 w-11 rounded-2xl bg-blue-50 text-blue-700 grid place-items-center">
                  <ChannelIcon size={20} />
                </div>
              </div>

              <div className="mt-5 space-y-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black text-slate-400 uppercase">
                    Channel
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-950">
                    {selectedChannel?.channelName || '-'}
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black text-slate-400 uppercase">
                    Objective
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-950">
                    {selectedTemplate?.templateName ||
                      selectedUsecase?.useCaseName ||
                      '-'}
                  </p>
                  <p className="mt-2 text-xs leading-5 text-slate-500">
                    {selectedUsecase?.description ||
                      selectedTemplate?.defaultRoleDescription ||
                      ''}
                  </p>
                </div>

                {selectedTemplate && (
                  <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4">
                    <p className="text-xs font-black text-blue-700 uppercase">
                      Agent Template
                    </p>

                    <p className="mt-2 text-sm font-black text-slate-950">
                      {selectedTemplate.templateName}
                    </p>

                    <p className="mt-1 text-xs text-slate-600">
                      Category: {selectedTemplate.categoryName || '-'}
                    </p>

                    <p className="mt-1 text-xs text-slate-600">
                      Features selected: {templateFeaturesCount}
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="rounded-[2rem] border border-emerald-100 bg-emerald-50 p-6 shadow-sm">
              <p className="text-xs font-black text-emerald-700 uppercase tracking-wide">
                Auto Generated
              </p>

              <div className="mt-4 space-y-3">
                {[
                  'Bot record',
                  'Default flow',
                  'Starter nodes and edges',
                  'Channel configuration',
                  'Widget settings',
                  'AI settings',
                  'Structured behavior config',
                  'Selected bot features',
                ].map((item) => (
                  <div
                    key={item}
                    className="flex items-center gap-2 text-sm font-bold text-slate-700"
                  >
                    <CheckCircle2
                      size={16}
                      className="shrink-0 text-emerald-600"
                    />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[2rem] border border-blue-100 bg-blue-50 p-6">
              <h3 className="font-black text-slate-950">After creation</h3>

              <p className="mt-2 text-sm text-slate-600 leading-6">
                You will be redirected to Chat Flows. From there, you can open
                Visual Builder, edit nodes, install widget, upload knowledge
                documents, or manage AI settings.
              </p>
            </div>
          </aside>
        </section>
      </main>
    </div>
  );
}
