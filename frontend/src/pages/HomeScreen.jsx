import {
  Bell,
  Bot,
  BrainCircuit,
  Globe2,
  Inbox,
  MessageCircle,
  Plus,
  Search,
  Workflow,
  Zap,
  AlertTriangle,
  Clock3,
  Smile,
} from '../lib/icons';

import { APP_NAME } from '../data/dummyData';
import useDashboardData from '../hooks/useDashboardData';
import AccountMenu from '../components/layout/AccountMenu';

export default function HomeScreen({ setScreen, onLogout }) {
  const { loading, error, workspace, activeBot, stats, refetch } =
    useDashboardData();

  const dashboardCards = [
    {
      label: 'Total Bots',
      value: loading ? '...' : stats.totalBots,
      note: loading ? 'Loading...' : `${stats.activeBots} active`,
      icon: Bot,
    },
    {
      label: 'Conversations',
      value: loading ? '...' : stats.conversations,
      note: 'Total conversations',
      icon: MessageCircle,
    },
    {
      label: 'Automation Rate',
      value: loading ? '...' : '72%',
      note: 'Handled by bot',
      icon: BrainCircuit,
    },
    {
      label: 'Need Response',
      value: loading ? '...' : stats.needResponse,
      note: 'Open / assigned inbox',
      icon: Inbox,
    },
    {
      label: 'Failed Response',
      value: loading ? '...' : '120',
      note: 'Unsolved by bot',
      icon: AlertTriangle,
    },
    {
      label: 'Average Response Time',
      value: loading ? '...' : '2m 10s',
      note: 'Response time',
      icon: Clock3,
    },
    {
      label: 'User Satisfaction',
      value: loading ? '...' : '85%',
      note: 'User satisfaction score',
      icon: Smile,
    },
  ];

  const recentFlows = [
    {
      name: 'Answer Customer Queries',
      channel: 'Website / WhatsApp',
      status: 'Published',
      nodes: '7 nodes',
    },
    {
      name: 'Lead Qualification',
      channel: 'Website',
      status: 'Draft',
      nodes: '9 nodes',
    },
    {
      name: 'WhatsApp Support Intake',
      channel: 'WhatsApp',
      status: 'Published',
      nodes: '11 nodes',
    },
  ];

  return (
    <main className="min-h-screen bg-[#F6F8FC]">
      <div className="sticky top-0 z-20 border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto h-16 px-8 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-slate-950 grid place-items-center shadow-sm">
              <span className="text-white font-black">N</span>
            </div>

            <div>
              <p className="font-black text-slate-950">{APP_NAME}</p>
              <p className="text-xs text-slate-500">
                Omnichannel AI Bot Builder
              </p>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <div className="h-10 w-80 rounded-2xl border border-slate-200 bg-slate-50 px-4 flex items-center gap-2 text-sm text-slate-400">
              <Search size={16} /> Search bots, flows, conversations...
            </div>

            <button className="h-10 w-10 rounded-2xl border border-slate-200 bg-white grid place-items-center text-slate-500">
              <Bell size={17} />
            </button>

            <AccountMenu workspaceName={workspace?.name} onLogout={onLogout} />
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-8 py-7 space-y-6">
        {error && (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-5 py-4 text-sm font-semibold text-red-700">
            {error}
          </div>
        )}

        <section className="flex flex-col xl:flex-row xl:items-center justify-between gap-5">
          <div>
            <div className="h-1.5 w-40 rounded-full bg-gradient-to-r from-cyan-500 via-blue-600 to-orange-500 mb-5" />

            <p className="text-sm font-bold text-blue-700">
              Welcome back, Nexora
            </p>

            <h1 className="mt-2 text-4xl font-black tracking-tight text-slate-950">
              Bot Operations Dashboard
            </h1>

            <p className="mt-3 max-w-2xl text-slate-500 leading-7">
              Monitor bot performance, manage flows, review inbox handoffs, and
              publish chatbot widgets from one workspace.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={refetch}
              className="h-11 px-5 rounded-2xl border border-slate-200 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50 transition"
            >
              Refresh Data
            </button>

            <button
              onClick={() => setScreen('agent-marketplace')}
              className="h-11 px-5 rounded-2xl bg-blue-600 text-white text-sm font-bold shadow-sm hover:bg-blue-700 transition flex items-center gap-2"
            >
              <Plus size={17} /> Create Chatbot
            </button>

            <button
              onClick={() => setScreen('builder')}
              className="h-11 px-5 rounded-2xl border border-slate-200 bg-white text-slate-700 text-sm font-bold hover:bg-slate-50 transition flex items-center gap-2"
            >
              <Workflow size={17} /> Open Builder
            </button>
          </div>
        </section>

        <section className="grid sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {dashboardCards.map((item) => {
            const Icon = item.icon;

            return (
              <div
                key={item.label}
                className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-sm font-semibold text-slate-500">
                      {item.label}
                    </p>
                    <p className="mt-2 text-3xl font-black text-slate-950">
                      {item.value}
                    </p>
                  </div>

                  <div className="h-11 w-11 rounded-2xl bg-blue-50 text-blue-700 grid place-items-center">
                    <Icon size={20} />
                  </div>
                </div>

                <p className="mt-4 text-sm text-slate-500">{item.note}</p>
              </div>
            );
          })}
        </section>

        <section className="grid xl:grid-cols-[1.15fr_.85fr] gap-5">
          <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  Active Workspace
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  {workspace
                    ? `${workspace.name} · ${workspace.plan} plan`
                    : 'No active workspace found'}
                </p>
              </div>

              <span className="rounded-full bg-emerald-50 px-4 py-2 text-xs font-black text-emerald-700">
                {workspace?.status || 'inactive'}
              </span>
            </div>

            <div className="p-6 grid lg:grid-cols-[1fr_300px] gap-6">
              <div className="rounded-3xl bg-slate-950 p-6 text-white relative overflow-hidden min-h-[260px]">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(37,99,235,.45),transparent_34%),radial-gradient(circle_at_bottom_left,rgba(20,184,166,.30),transparent_32%)]" />

                <div className="relative">
                  <div className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/10 px-4 py-2 text-sm text-blue-50">
                    <MessageCircle size={16} /> Website & WhatsApp Bot
                  </div>

                  <h3 className="mt-6 text-3xl font-black tracking-tight">
                    {activeBot?.name || 'No active bot'}
                  </h3>

                  <p className="mt-3 text-blue-100 leading-7 max-w-xl">
                    {activeBot?.description ||
                      'Automate FAQ, capture issue details, and hand off complex conversations to agents.'}
                  </p>

                  <div className="mt-7 flex gap-3">
                    <button
                      onClick={() => setScreen('builder')}
                      className="h-11 px-5 rounded-2xl bg-white text-slate-950 text-sm font-black"
                    >
                      Edit Flow
                    </button>

                    <button
                      onClick={() => setScreen('install')}
                      className="h-11 px-5 rounded-2xl border border-white/20 bg-white/10 text-white text-sm font-black"
                    >
                      Install Widget
                    </button>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wide">
                    Current Plan
                  </p>

                  <div className="mt-3 flex items-end justify-between">
                    <p className="text-2xl font-black text-slate-950 capitalize">
                      {workspace?.plan || 'Free'}
                    </p>
                    <button className="text-sm font-black text-blue-700">
                      Upgrade
                    </button>
                  </div>
                </div>

                <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-wide">
                    Publish Status
                  </p>

                  <div className="mt-4 space-y-3 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Bot Status</span>
                      <span className="font-black text-emerald-600 capitalize">
                        {activeBot?.status || 'inactive'}
                      </span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">Widget</span>
                      <span className="font-black text-blue-600">Active</span>
                    </div>

                    <div className="flex justify-between">
                      <span className="text-slate-500">WhatsApp</span>
                      <span className="font-black text-amber-600">
                        Setup Needed
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[2rem] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  Quick Actions
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Most used actions for bot management.
                </p>
              </div>

              <Zap className="text-blue-600" size={22} />
            </div>

            <div className="mt-5 space-y-3">
              {[
                {
                  title: 'Create Chatbot',
                  desc: 'Start from agent template.',
                  icon: Plus,
                  action: () => setScreen('agent-marketplace'),
                  primary: true,
                },
                {
                  title: 'Review Inbox',
                  desc: 'Handle customer handoff conversations.',
                  icon: Inbox,
                  action: () => setScreen('inbox'),
                },
                {
                  title: 'Install Widget',
                  desc: 'Copy script and publish to website.',
                  icon: Globe2,
                  action: () => setScreen('install'),
                },
              ].map((item) => {
                const Icon = item.icon;

                return (
                  <button
                    key={item.title}
                    onClick={item.action}
                    className="w-full rounded-2xl border border-slate-200 bg-white p-4 text-left hover:bg-slate-50 transition flex items-start gap-3"
                  >
                    <div
                      className={`h-10 w-10 rounded-xl grid place-items-center ${
                        item.primary
                          ? 'bg-blue-600 text-white'
                          : 'bg-slate-100 text-slate-700'
                      }`}
                    >
                      <Icon size={18} />
                    </div>

                    <div>
                      <p className="text-sm font-black text-slate-950">
                        {item.title}
                      </p>
                      <p className="text-xs text-slate-500 mt-1 leading-5">
                        {item.desc}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <section className="grid xl:grid-cols-[1fr_360px] gap-5">
          <div className="rounded-[2rem] border border-slate-200 bg-white shadow-sm overflow-hidden">
            <div className="p-6 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-black text-slate-950">
                  Recent Flows
                </h2>
                <p className="mt-1 text-sm text-slate-500">
                  Continue editing or review your latest automation flows.
                </p>
              </div>

              <button
                onClick={() => setScreen('flows')}
                className="h-10 px-4 rounded-2xl border border-slate-200 bg-white text-sm font-bold text-slate-700"
              >
                View All
              </button>
            </div>

            <div className="divide-y divide-slate-100">
              {recentFlows.map((flow) => (
                <div
                  key={flow.name}
                  className="p-5 flex items-center justify-between hover:bg-slate-50 transition"
                >
                  <div className="flex items-center gap-4">
                    <div className="h-11 w-11 rounded-2xl bg-blue-50 text-blue-700 grid place-items-center">
                      <Workflow size={19} />
                    </div>

                    <div>
                      <p className="font-black text-slate-950">{flow.name}</p>
                      <p className="mt-1 text-xs text-slate-500">
                        {flow.channel} · {flow.nodes}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-3 py-1 text-[11px] font-black ${
                      flow.status === 'Published'
                        ? 'bg-emerald-50 text-emerald-700'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                  >
                    {flow.status}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-blue-100 bg-blue-50 p-6">
            <div className="h-12 w-12 rounded-2xl bg-white text-blue-700 grid place-items-center shadow-sm">
              <BrainCircuit size={22} />
            </div>

            <h2 className="mt-5 text-xl font-black text-slate-950">
              AI Knowledge
            </h2>

            <p className="mt-3 text-sm leading-7 text-slate-600">
              Upload FAQs, policies, product documents, and let Nexora answer
              using controlled knowledge sources.
            </p>

            <div className="mt-5 rounded-2xl bg-white border border-blue-100 p-4">
              <p className="text-xs font-black text-slate-400 uppercase tracking-wide">
                Documents Indexed
              </p>
              <p className="mt-2 text-3xl font-black text-slate-950">
                {loading ? '...' : stats.documentsIndexed}
              </p>
            </div>

            <button
              onClick={() => setScreen('ai-settings')}
              className="mt-5 h-11 w-full rounded-2xl bg-blue-600 text-white text-sm font-black"
            >
              Open AI Settings
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
