'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  Plus,
  MessageSquare,
  Sliders,
  Wrench,
  CalendarClock,
  History,
} from 'lucide-react';
import { useOrbit } from '@/context/OrbitContext';
import { ChatPanel } from '@/components/agent-space/ChatPanel';
import { ConfigPanel, ConfigTab } from '@/components/agent-space/ConfigPanel';

export default function AgentSpacePage() {
  const params = useParams();
  const rawAgentId = params?.agentId;
  const agentId = Array.isArray(rawAgentId) ? rawAgentId[0] : rawAgentId;

  const { agents, routinesByAgent, executionsByAgent, t } = useOrbit();
  const [activeTab, setActiveTab] = useState<ConfigTab>('settings');
  const [mobileView, setMobileView] = useState<'chat' | 'config'>('chat');
  const [isRightPanelCollapsed, setIsRightPanelCollapsed] = useState(false);

  const agent = agents.find((a) => a.agentId === agentId) || agents[0];

  if (!agent) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-6 text-center space-y-3">
        <p className="text-sm font-bold text-slate-900">No Agent Found</p>
        <p className="text-xs text-slate-500">
          Create an AI Agent to start chatting and scheduling routines.
        </p>
        <Link
          href="/workspace/create-agent"
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
        >
          <Plus className="h-4 w-4" />
          <span>Create New Agent</span>
        </Link>
      </div>
    );
  }

  const routinesCount = (routinesByAgent[agent.agentId] || []).length;
  const executionsCount = (executionsByAgent[agent.agentId] || []).length;

  const handleSelectConfigTab = (tab: ConfigTab) => {
    setActiveTab(tab);
    setMobileView('config');
  };

  return (
    <div className="flex flex-col lg:flex-row h-full w-full overflow-hidden">
      {/* Mobile Segmented Switcher (< lg): Chat vs Settings / Tools / Schedule / History */}
      <div
        role="tablist"
        aria-label="Vue de l'espace agent"
        className="lg:hidden flex items-center gap-1 overflow-x-auto border-b border-slate-200 bg-slate-100/90 px-2.5 py-1.5 shrink-0"
      >
        <button
          type="button"
          role="tab"
          aria-selected={mobileView === 'chat'}
          onClick={() => setMobileView('chat')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold whitespace-nowrap transition-colors ${
            mobileView === 'chat'
              ? 'bg-slate-900 text-white shadow-2xs'
              : 'bg-white/70 text-slate-700 hover:bg-white'
          }`}
        >
          <MessageSquare className="h-3.5 w-3.5" />
          <span>Chat</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={mobileView === 'config' && activeTab === 'settings'}
          onClick={() => handleSelectConfigTab('settings')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
            mobileView === 'config' && activeTab === 'settings'
              ? 'bg-slate-900 text-white font-semibold shadow-2xs'
              : 'bg-white/70 text-slate-700 hover:bg-white'
          }`}
        >
          <Sliders className="h-3.5 w-3.5" />
          <span>{t.config.tabSettings}</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={mobileView === 'config' && activeTab === 'tools'}
          onClick={() => handleSelectConfigTab('tools')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
            mobileView === 'config' && activeTab === 'tools'
              ? 'bg-slate-900 text-white font-semibold shadow-2xs'
              : 'bg-white/70 text-slate-700 hover:bg-white'
          }`}
        >
          <Wrench className="h-3.5 w-3.5" />
          <span>
            {t.config.tabTools} ({agent.tools.length})
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={mobileView === 'config' && activeTab === 'schedule'}
          onClick={() => handleSelectConfigTab('schedule')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
            mobileView === 'config' && activeTab === 'schedule'
              ? 'bg-slate-900 text-white font-semibold shadow-2xs'
              : 'bg-white/70 text-slate-700 hover:bg-white'
          }`}
        >
          <CalendarClock className="h-3.5 w-3.5" />
          <span>
            {t.config.tabSchedule} ({routinesCount})
          </span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={mobileView === 'config' && activeTab === 'history'}
          onClick={() => handleSelectConfigTab('history')}
          className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium whitespace-nowrap transition-colors ${
            mobileView === 'config' && activeTab === 'history'
              ? 'bg-slate-900 text-white font-semibold shadow-2xs'
              : 'bg-white/70 text-slate-700 hover:bg-white'
          }`}
        >
          <History className="h-3.5 w-3.5" />
          <span>
            {t.config.tabHistory} ({executionsCount})
          </span>
        </button>
      </div>

      {/* Chat Pane */}
      <div
        className={`${
          mobileView === 'chat' ? 'flex' : 'hidden'
        } lg:flex flex-1 min-w-0 min-h-0 h-full`}
      >
        <ChatPanel
          agent={agent}
          isRightPanelCollapsed={isRightPanelCollapsed}
          onToggleRightPanel={() => setIsRightPanelCollapsed((prev) => !prev)}
          onSwitchRightTab={(tab) => {
            setActiveTab(tab);
            setIsRightPanelCollapsed(false);
            setMobileView('config');
          }}
        />
      </div>

      {/* Config / Tools / Schedule / History Pane */}
      <div
        className={`${
          mobileView === 'config' ? 'flex' : 'hidden'
        } ${
          isRightPanelCollapsed ? 'lg:hidden' : 'lg:flex'
        } w-full lg:w-[410px] shrink-0 min-h-0 h-full transition-all`}
      >
        <ConfigPanel
          agent={agent}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
        />
      </div>
    </div>
  );
}
