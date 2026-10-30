'use client';

import React, { useState } from 'react';
import { Check, Plus, Unplug } from 'lucide-react';
import { ToolSuggestionItem } from '@/lib/types';
import { useOrbit } from '@/context/OrbitContext';
import { ToolIcon } from '@/components/workspace/ToolIcon';

export function ToolSuggestionCard({
  agentId,
  tool,
}: {
  agentId: string;
  tool: ToolSuggestionItem;
}) {
  const { agents, connectToolToAgent, disconnectToolFromAgent, t } = useOrbit();
  const [busy, setBusy] = useState(false);

  const agent = agents.find((a) => a.agentId === agentId);
  const isConnected = Boolean(agent?.tools.includes(tool.slug.toLowerCase()));

  const handleToggle = async () => {
    setBusy(true);
    await new Promise((r) => setTimeout(r, 200));
    if (isConnected) {
      await disconnectToolFromAgent(agentId, tool.slug);
    } else {
      await connectToolToAgent(agentId, tool.slug);
    }
    setBusy(false);
  };

  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="h-9 w-9 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
          <ToolIcon slug={tool.slug} className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-semibold text-slate-900">{tool.name}</span>
            <span className="text-slate-400">·</span>
            <span
              className={`font-medium ${
                isConnected ? 'text-emerald-700' : 'text-amber-700'
              }`}
            >
              {isConnected ? t.toolCard.connected : t.toolCard.required}
            </span>
          </div>
          <p className="text-xs text-slate-600 truncate mt-0.5">
            {tool.reason || tool.description}
          </p>
        </div>
      </div>

      {isConnected ? (
        <button
          type="button"
          disabled={busy}
          onClick={handleToggle}
          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors whitespace-nowrap shrink-0"
        >
          <Unplug className="h-3.5 w-3.5" />
          <span>{t.toolCard.disconnect}</span>
        </button>
      ) : (
        <button
          type="button"
          disabled={busy}
          onClick={handleToggle}
          className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
        >
          {busy ? (
            <>
              <Check className="h-3.5 w-3.5" />
              <span>{t.toolCard.connecting}</span>
            </>
          ) : (
            <>
              <Plus className="h-3.5 w-3.5" />
              <span>
                {t.toolCard.connect} {tool.name}
              </span>
            </>
          )}
        </button>
      )}
    </div>
  );
}
