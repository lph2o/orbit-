'use client';

import React from 'react';
import { Monitor, ExternalLink, HelpCircle } from 'lucide-react';
import { AgentStructuredResponse } from '@/lib/types';
import { useOrbit } from '@/context/OrbitContext';
import { ToolSuggestionCard } from './ToolSuggestionCard';
import { RoutineCard } from './RoutineCard';

function formatSimpleMarkdown(text: string) {
  const lines = (text || '').split('\n');
  return lines.map((line, i) => {
    const parts = line.split(/(\*\*.*?\*\*|`.*?`)/g);
    return (
      <p key={i} className={line.trim() === '' ? 'h-2' : 'leading-relaxed'}>
        {parts.map((part, j) => {
          if (part.startsWith('**') && part.endsWith('**')) {
            return (
              <strong key={j} className="font-semibold text-slate-900">
                {part.slice(2, -2)}
              </strong>
            );
          }
          if (part.startsWith('`') && part.endsWith('`')) {
            return (
              <code
                key={j}
                className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[11px] text-slate-800"
              >
                {part.slice(1, -1)}
              </code>
            );
          }
          return <span key={j}>{part}</span>;
        })}
      </p>
    );
  });
}

export function AgentResponseView({
  agentId,
  content,
  structured,
  onRoutineSaved,
}: {
  agentId: string;
  content: string;
  structured?: AgentStructuredResponse;
  onRoutineSaved?: () => void;
}) {
  const { openVmModal, setVmStatusForAgent, t } = useOrbit();

  const messageText = structured?.message || content;

  return (
    <div className="space-y-3 text-xs text-slate-700">
      <div className="space-y-1">{formatSimpleMarkdown(messageText)}</div>

      {/* Clarification Card */}
      {structured?.type === 'clarification' && structured.question && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 flex items-start gap-2.5">
          <HelpCircle className="h-4 w-4 text-slate-700 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-semibold text-slate-900">
              {t.chat.clarificationTitle}
            </p>
            <p className="text-xs text-slate-700 mt-0.5">{structured.question}</p>
          </div>
        </div>
      )}

      {/* Tool Connection Cards */}
      {structured?.type === 'tool_connection' &&
        structured.suggestedTools &&
        structured.suggestedTools.length > 0 && (
          <div className="space-y-2 pt-1">
            {structured.suggestedTools.map((tool) => (
              <ToolSuggestionCard
                key={tool.slug}
                agentId={agentId}
                tool={tool}
              />
            ))}
          </div>
        )}

      {/* Routine Proposal Card */}
      {structured?.type === 'routine' && structured.routine && (
        <RoutineCard
          agentId={agentId}
          routine={structured.routine}
          suggestedTools={structured.suggestedTools}
          editingRoutineId={structured.editingRoutineId}
          onRoutineSaved={onRoutineSaved}
        />
      )}

      {/* Cloud VM Desktop Action Trace */}
      {structured?.type === 'vm_action' && structured.vmTrace && (
        <div className="rounded-xl border border-slate-200 bg-slate-900 text-slate-100 p-3.5 space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Monitor className="h-4 w-4 text-emerald-400 shrink-0" />
              <span className="text-xs font-semibold text-white truncate">
                {t.chat.vmTraceTitle} · {structured.vmTrace.title}
              </span>
            </div>
            <button
              type="button"
              onClick={async () => {
                await setVmStatusForAgent(agentId, 'active', structured.vmTrace);
                openVmModal(agentId);
              }}
              className="inline-flex items-center gap-1 rounded-md bg-white/10 px-2.5 py-1 text-[11px] font-medium text-white hover:bg-white/20 transition-colors whitespace-nowrap shrink-0"
            >
              <span>{t.chat.inspectLiveVm}</span>
              <ExternalLink className="h-3 w-3" />
            </button>
          </div>
          <div className="space-y-1 text-[11px] text-slate-300 font-mono">
            {structured.vmTrace.steps.map((step, i) => (
              <p key={i}>
                0{i + 1}. {step}
              </p>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
