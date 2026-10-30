'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import {
  Send,
  Loader2,
  Monitor,
  Trash2,
  X,
  TerminalSquare,
} from 'lucide-react';
import { AgentChatMessage, AgentConfig, AgentStructuredResponse } from '@/lib/types';
import { useOrbit } from '@/context/OrbitContext';
import { AgentResponseView } from './AgentResponseView';

export function ChatPanel({
  agent,
  onSwitchRightTab,
}: {
  agent: AgentConfig;
  onSwitchRightTab?: (tab: 'settings' | 'tools' | 'schedule' | 'history') => void;
}) {
  const {
    messagesByAgent,
    editingRoutineByAgent,
    startEditingRoutine,
    appendChatMessage,
    clearAgentChat,
    setVmStatusForAgent,
    browseVmUrl,
    openVmModal,
    locale,
    t,
  } = useOrbit();

  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollEndRef = useRef<HTMLDivElement | null>(null);

  const messages = messagesByAgent[agent.agentId] || [];
  const editingRoutine = editingRoutineByAgent[agent.agentId] || null;

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, loading]);

  const sendPrompt = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || loading) return;

    const nowIso = new Date().toISOString();
    const timeLabel = new Date().toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const userMsg: AgentChatMessage = {
      messageId: `msg_user_${Date.now()}`,
      agentId: agent.agentId,
      ownerId: agent.ownerId,
      role: 'user',
      content: trimmed,
      responseType: 'message',
      timeLabel,
      createdAt: nowIso,
    };

    setUserInput('');
    setLoading(true);
    await appendChatMessage(agent.agentId, userMsg);

    try {
      const timezone =
        Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris';
      const historyPayload = [...messages, userMsg].map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agent,
          messages: historyPayload,
          timezone,
          editingRoutine,
          locale,
        }),
      });

      const data = await res.json();
      const structured: AgentStructuredResponse = data.response || {
        type: 'message',
        message: 'Task processed.',
      };

      if (structured.type === 'vm_action') {
        const liveTrace = await browseVmUrl(agent.agentId, trimmed);
        if (liveTrace) {
          structured.vmTrace = liveTrace;
        } else if (structured.vmTrace) {
          await setVmStatusForAgent(agent.agentId, 'active', structured.vmTrace);
        }
      }

      const agentMsg: AgentChatMessage = {
        messageId: `msg_agent_${Date.now()}`,
        agentId: agent.agentId,
        ownerId: agent.ownerId,
        role: 'agent',
        content: structured.message,
        responseType: structured.type,
        structured,
        timeLabel: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        createdAt: new Date().toISOString(),
      };

      await appendChatMessage(agent.agentId, agentMsg);
    } catch (error) {
      console.error('Agent chat error:', error);
      const errMsg: AgentChatMessage = {
        messageId: `msg_err_${Date.now()}`,
        agentId: agent.agentId,
        ownerId: agent.ownerId,
        role: 'agent',
        content:
          locale === 'fr'
            ? 'Une erreur réseau temporaire est survenue lors du traitement de votre requête.'
            : locale === 'it'
              ? 'Si è verificato un problema di rete temporaneo durante l’elaborazione della richiesta.'
              : 'I encountered a temporary network issue while processing your request. Please try again.',
        responseType: 'message',
        timeLabel: new Date().toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        createdAt: new Date().toISOString(),
      };
      await appendChatMessage(agent.agentId, errMsg);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await sendPrompt(userInput);
  };

  return (
    <section className="flex-1 flex flex-col h-screen bg-white min-w-0">
      {/* Chat Header */}
      <header className="px-6 py-3.5 border-b border-slate-200 flex items-center justify-between gap-4 bg-white shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative h-10 w-10 rounded-full overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
            <Image
              src={agent.agentImage}
              alt={agent.name}
              fill
              sizes="40px"
              referrerPolicy="no-referrer"
              className="object-cover"
            />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-900 truncate">
                {agent.name}
              </h1>
              <span className="text-xs text-slate-400">·</span>
              <span
                className={`text-xs font-medium ${
                  agent.isActive ? 'text-emerald-700' : 'text-amber-700'
                }`}
              >
                {agent.isActive ? t.chat.activeAgent : t.chat.pausedAgent}
              </span>
            </div>
            <p className="text-xs text-slate-500 truncate mt-0.5">
              {agent.description || 'Autonomous AI Agent · Composio MCP & E2B Cloud VM'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={async () => {
              if (agent.vmStatus !== 'active') {
                await setVmStatusForAgent(agent.agentId, 'active');
              }
              openVmModal(agent.agentId);
            }}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-100 transition-colors whitespace-nowrap"
          >
            <Monitor className="h-3.5 w-3.5 text-slate-700" />
            <span>
              {agent.vmStatus === 'active' ? t.chat.cloudVmLive : t.chat.cloudVmOpen}
            </span>
          </button>

          <button
            type="button"
            onClick={() => clearAgentChat(agent.agentId)}
            title={t.chat.resetChat}
            aria-label={t.chat.resetChat}
            className="p-2 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </header>

      {/* Editing Routine Banner */}
      {editingRoutine && (
        <div className="px-6 py-2.5 bg-amber-50 border-b border-amber-200 flex items-center justify-between gap-3">
          <div className="text-xs text-amber-900">
            <span className="font-semibold">
              {t.chat.editingBannerPrefix}: {editingRoutine.name}
            </span>{' '}
            — {t.chat.editingBannerHint}
          </div>
          <button
            type="button"
            onClick={() => startEditingRoutine(agent.agentId, null)}
            aria-label={t.chat.cancelEdit}
            className="text-xs text-amber-800 hover:text-amber-950 font-medium inline-flex items-center gap-1"
          >
            <X className="h-3.5 w-3.5" />
            <span>{t.chat.cancelEdit}</span>
          </button>
        </div>
      )}

      {/* Messages Viewport */}
      <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
        {messages.map((msg) => {
          if (msg.role === 'user') {
            return (
              <div key={msg.messageId} className="flex justify-end">
                <div className="max-w-xl rounded-2xl rounded-br-xs bg-slate-900 px-4 py-3 text-xs text-white leading-relaxed">
                  <p>{msg.content}</p>
                  <p className="text-[10px] text-slate-400 mt-1 text-right font-mono tabular-nums">
                    {msg.timeLabel}
                  </p>
                </div>
              </div>
            );
          }

          return (
            <div key={msg.messageId} className="flex items-start gap-3 max-w-2xl">
              <div className="relative h-8 w-8 rounded-full overflow-hidden border border-slate-200 bg-slate-100 shrink-0 mt-0.5">
                <Image
                  src={agent.agentImage}
                  alt={agent.name}
                  fill
                  sizes="32px"
                  referrerPolicy="no-referrer"
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0 rounded-2xl rounded-tl-xs border border-slate-200 bg-white p-4 shadow-2xs">
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-semibold text-slate-900">
                    {agent.name}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                    {msg.timeLabel}
                  </span>
                </div>
                <AgentResponseView
                  agentId={agent.agentId}
                  content={msg.content}
                  structured={msg.structured}
                  onRoutineSaved={() => onSwitchRightTab?.('schedule')}
                />
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-start gap-3 max-w-lg">
            <div className="relative h-8 w-8 rounded-full overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
              <Image
                src={agent.agentImage}
                alt={agent.name}
                fill
                sizes="32px"
                referrerPolicy="no-referrer"
                className="object-cover"
              />
            </div>
            <div className="rounded-2xl rounded-tl-xs border border-slate-200 bg-slate-50 px-4 py-3 flex items-center gap-2.5 text-xs text-slate-600">
              <Loader2 className="h-4 w-4 animate-spin text-slate-800" />
              <span>
                {agent.name} {t.chat.thinking}
              </span>
            </div>
          </div>
        )}

        <div ref={scrollEndRef} />
      </div>

      {/* Quick Prompt Suggestions & Input Composer */}
      <div className="px-6 py-4 border-t border-slate-200 bg-slate-50/50 space-y-3 shrink-0">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
          <TerminalSquare className="h-3.5 w-3.5 text-slate-400 shrink-0 mr-1" />
          {t.chat.quickPrompts.map((qp) => (
            <button
              key={qp}
              type="button"
              disabled={loading}
              onClick={() => sendPrompt(qp)}
              className="rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              {qp}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex items-end gap-2.5">
          <div className="flex-1">
            <label htmlFor="agent-chat-input" className="sr-only">
              Message {agent.name}
            </label>
            <textarea
              id="agent-chat-input"
              rows={2}
              value={userInput}
              onChange={(e) => setUserInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendPrompt(userInput);
                }
              }}
              placeholder={
                editingRoutine
                  ? `${t.chat.editPlaceholder} (${editingRoutine.name})`
                  : `${agent.name} — ${t.chat.inputPlaceholder}`
              }
              className="w-full resize-none rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
            />
          </div>
          <button
            type="submit"
            disabled={loading || !userInput.trim()}
            aria-label={t.chat.sendBtn}
            className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-4 py-3 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors whitespace-nowrap shrink-0"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <>
                <Send className="h-3.5 w-3.5" />
                <span>{t.chat.sendBtn}</span>
              </>
            )}
          </button>
        </form>
      </div>
    </section>
  );
}
