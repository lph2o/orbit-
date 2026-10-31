'use client';

import React, { useState } from 'react';
import {
  Monitor,
  ExternalLink,
  HelpCircle,
  ArrowRight,
  CheckCircle2,
  Volume2,
  VolumeX,
  Download,
  ShieldCheck,
} from 'lucide-react';
import { AgentStructuredResponse } from '@/lib/types';
import { formatResponseForExport } from '@/lib/orbit-logic';
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
  onContinuePrompt,
}: {
  agentId: string;
  content: string;
  structured?: AgentStructuredResponse;
  onRoutineSaved?: () => void;
  onContinuePrompt?: (promptText: string) => void;
}) {
  const { agents, openVmModal, setVmStatusForAgent, locale, t, addToast } = useOrbit();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copilotApproved, setCopilotApproved] = useState(false);

  const agent = agents.find((a) => a.agentId === agentId);
  const messageText = structured?.message || content;

  const allSuggestedConnected =
    structured?.type === 'tool_connection' &&
    Array.isArray(structured.suggestedTools) &&
    structured.suggestedTools.length > 0 &&
    structured.suggestedTools.every((tool) =>
      agent?.tools.includes(tool.slug.toLowerCase())
    );

  const handleToggleSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      addToast({
        title: 'Synthèse vocale (TTS)',
        description: 'Lecture audio simulée activée pour ce rapport.',
        type: 'info',
      });
      setIsSpeaking((prev) => !prev);
      return;
    }

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanSpeech = messageText.replace(/\*\*/g, '').replace(/`/g, '');
    const utterance = new SpeechSynthesisUtterance(cleanSpeech);
    utterance.lang = locale === 'fr' ? 'fr-FR' : locale === 'it' ? 'it-IT' : 'en-US';
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true);
    window.speechSynthesis.speak(utterance);
  };

  const handleExport = (format: 'md' | 'csv') => {
    const exported = formatResponseForExport(messageText, agent?.name || 'Agent', format);
    if (typeof window !== 'undefined') {
      const blob = new Blob([exported.body], { type: exported.mimeType });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = exported.filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }
    addToast({
      title: format === 'csv' ? 'Export CSV téléchargé' : 'Rapport Markdown téléchargé',
      description: exported.filename,
      type: 'success',
    });
  };

  const handleApproveCopilotAction = () => {
    setCopilotApproved(true);
    addToast({
      title:
        locale === 'fr'
          ? 'Action approuvée (Mode Copilote)'
          : locale === 'it'
            ? 'Azione approvata (Modalità Copilota)'
            : 'Action approved (Copilot Mode)',
      description: `${agent?.name || 'Agent'} a exécuté l’action validée avec succès.`,
      type: 'success',
    });
  };

  const showCopilotApprovalBar =
    (agent?.autonomyLevel || 'copilot') === 'copilot' &&
    structured?.type !== 'tool_connection';

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

            {allSuggestedConnected && onContinuePrompt && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2.5 mt-2">
                <div className="flex items-center gap-2 text-xs text-emerald-900 font-medium">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    {locale === 'fr'
                      ? 'Outils connectés et prêts pour votre routine.'
                      : locale === 'it'
                        ? 'Strumenti connessi e pronti per la tua routine.'
                        : 'Tools connected and ready for your routine.'}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => onContinuePrompt('continue')}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                >
                  <span>
                    {locale === 'fr'
                      ? 'Continuer la configuration'
                      : locale === 'it'
                        ? 'Continua configurazione'
                        : 'Continue setup'}
                  </span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
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

      {/* 8. Multimodal Capabilities (TTS Audio, Export MD/CSV) & 3. Human-in-the-Loop Copilot Bar */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={handleToggleSpeech}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            {isSpeaking ? (
              <>
                <VolumeX className="h-3 w-3 text-red-600" />
                <span>{locale === 'fr' ? 'Arrêter audio' : 'Stop audio'}</span>
              </>
            ) : (
              <>
                <Volume2 className="h-3 w-3 text-slate-700" />
                <span>{locale === 'fr' ? 'Écouter (TTS)' : 'Listen (TTS)'}</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => handleExport('md')}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <Download className="h-3 w-3 text-slate-700" />
            <span>.MD</span>
          </button>

          <button
            type="button"
            onClick={() => handleExport('csv')}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <Download className="h-3 w-3 text-slate-700" />
            <span>.CSV</span>
          </button>
        </div>

        {showCopilotApprovalBar && (
          <div>
            {copilotApproved ? (
              <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md">
                <CheckCircle2 className="h-3 w-3" />
                <span>
                  {locale === 'fr' ? 'Approuvé & Exécuté' : 'Approved & Executed'}
                </span>
              </span>
            ) : (
              <button
                type="button"
                onClick={handleApproveCopilotAction}
                className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-800 transition-colors"
              >
                <ShieldCheck className="h-3 w-3 text-emerald-400" />
                <span>
                  {locale === 'fr'
                    ? 'Approuver & Exécuter'
                    : locale === 'it'
                      ? 'Approva ed Esegui'
                      : 'Approve & Execute'}
                </span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

