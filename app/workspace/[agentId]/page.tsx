'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import { useOrbit } from '@/context/OrbitContext';
import { ChatPanel } from '@/components/agent-space/ChatPanel';
import { ConfigPanel, ConfigTab } from '@/components/agent-space/ConfigPanel';

export default function AgentSpacePage() {
  const params = useParams();
  const rawAgentId = params?.agentId;
  const agentId = Array.isArray(rawAgentId) ? rawAgentId[0] : rawAgentId;

  const { agents } = useOrbit();
  const [activeTab, setActiveTab] = useState<ConfigTab>('settings');

  const agent = agents.find((a) => a.agentId === agentId) || agents[0];

  if (!agent) {
    return (
      <div className="h-screen flex flex-col items-center justify-center p-8 text-center space-y-3">
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

  return (
    <div className="flex h-screen w-full overflow-hidden">
      <ChatPanel
        agent={agent}
        onSwitchRightTab={(tab) => setActiveTab(tab)}
      />
      <ConfigPanel
        agent={agent}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
      />
    </div>
  );
}
