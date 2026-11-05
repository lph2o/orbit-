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
  Cpu,
  ShieldCheck,
  Plus,
  KeyRound,
  Search,
  Paperclip,
  Mic,
  MicOff,
  FileText,
  Pencil,
  Copy,
  Check,
  Slash,
  ArrowRight,
  GitBranch,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import {
  AgentAutonomyLevel,
  AgentChatMessage,
  AgentConfig,
  AgentModelId,
  AgentStructuredResponse,
} from '@/lib/types';
import {
  buildEmptyChatStarterCards,
  CHAT_SLASH_COMMANDS,
  ChatFilterCategory,
  ChatSlashCommand,
  evaluateToolConnectionReadiness,
  expandSlashCommandInput,
  filterChatMessages,
  getAgentAutonomyBadge,
  getAgentModelDisplayName,
  getAgentToneLabel,
  getMatchingSlashCommands,
  getProviderHealthyKeyCount,
  getToolBySlug,
  resolveProviderForModel,
} from '@/lib/orbit-logic';
import { useOrbit } from '@/context/OrbitContext';
import { ToolIcon } from '@/components/workspace/ToolIcon';
import { FreeApiRouterPanel } from '@/components/workspace/FreeApiRouterPanel';
import { AgentResponseView } from './AgentResponseView';

export function ChatPanel({
  agent,
  isRightPanelCollapsed,
  onToggleRightPanel,
  onSwitchRightTab,
}: {
  agent: AgentConfig;
  isRightPanelCollapsed?: boolean;
  onToggleRightPanel?: () => void;
  onSwitchRightTab?: (tab: 'settings' | 'tools' | 'schedule' | 'history') => void;
}) {
  const {
    agents,
    messagesByAgent,
    knowledgeByAgent,
    editingRoutineByAgent,
    startEditingRoutine,
    appendChatMessage,
    clearAgentChat,
    addKnowledgeDocument,
    setVmStatusForAgent,
    browseVmUrl,
    openVmModal,
    openMarketplace,
    updateAgentConfig,
    runMultiAgentWorkflow,
    notionToken,
    notionParentId,
    toolCredentials,
    freeApiProviders,
    workspaceToken,
    addToast,
    locale,
    t,
  } = useOrbit();

  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [isFreeApiModalOpen, setIsFreeApiModalOpen] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<ChatFilterCategory>('all');
  const [attachedFile, setAttachedFile] = useState<{
    name: string;
    content: string;
    sizeBytes: number;
    ext: 'txt' | 'md' | 'csv' | 'pdf';
  } | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [isDictating, setIsDictating] = useState(false);
  const [copiedUserMsgId, setCopiedUserMsgId] = useState<string | null>(null);
  const [activeSlashIdx, setActiveSlashIdx] = useState(0);

  const scrollEndRef = useRef<HTMLDivElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const recognitionRef = useRef<{ stop: () => void } | null>(null);

  const healthyProvidersCount = freeApiProviders.reduce(
    (acc, p) => acc + (p.isEnabled ? getProviderHealthyKeyCount(p) : 0),
    0
  );

  const messages = messagesByAgent[agent.agentId] || [];
  const knowledgeDocs = knowledgeByAgent[agent.agentId] || [];
  const editingRoutine = editingRoutineByAgent[agent.agentId] || null;
  const peerAgents = agents.filter((a) => a.agentId !== agent.agentId);
  const starterCards = buildEmptyChatStarterCards(agent);

  const filteredMessages = filterChatMessages(
    messages,
    searchQuery,
    filterCategory
  );
  const matchingSlashCommands = getMatchingSlashCommands(userInput);

  useEffect(() => {
    scrollEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length, loading]);

  const isExternalProviderHealthy = (modelId: AgentModelId) => {
    const provId = resolveProviderForModel(modelId);
    if (provId === 'google_ai_studio') return true;
    const prov = freeApiProviders.find((p) => p.providerId === provId);
    return Boolean(prov && prov.isEnabled && getProviderHealthyKeyCount(prov) > 0);
  };

  const processSelectedFile = async (file: File) => {
    try {
      const rawText = await file.text();
      const lowerName = file.name.toLowerCase();
      const ext: 'txt' | 'md' | 'csv' | 'pdf' = lowerName.endsWith('.csv')
        ? 'csv'
        : lowerName.endsWith('.md')
          ? 'md'
          : lowerName.endsWith('.pdf')
            ? 'pdf'
            : 'txt';
      const clippedContent = rawText.slice(0, 12000);

      setAttachedFile({
        name: file.name,
        content: clippedContent,
        sizeBytes: file.size || clippedContent.length,
        ext,
      });

      // Automatically index into Agent RAG Knowledge Base for persistent retrieval
      addKnowledgeDocument(agent.agentId, {
        docId: `rag_chat_${Date.now()}`,
        agentId: agent.agentId,
        name: file.name,
        fileType: ext,
        sizeBytes: file.size || clippedContent.length,
        content: clippedContent,
        summary: clippedContent.slice(0, 180).replace(/\s+/g, ' ').trim(),
        createdAt: new Date().toISOString(),
      });
    } catch {
      addToast({
        title: 'Erreur de lecture du fichier',
        description: 'Veuillez sélectionner un fichier texte (.txt, .md, .csv, .json).',
        type: 'error',
      });
    }
  };

  const handleToggleVoiceDictation = () => {
    if (isDictating && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsDictating(false);
      return;
    }

    if (typeof window === 'undefined') return;
    const SpeechRec =
      (window as unknown as { SpeechRecognition?: new () => unknown })
        .SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: new () => unknown })
        .webkitSpeechRecognition;

    if (!SpeechRec) {
      addToast({
        title: 'Dictée vocale non prise en charge',
        description:
          'Votre navigateur actuel ne supporte pas Web Speech Recognition (utilisez Chrome ou Edge).',
        type: 'info',
      });
      return;
    }

    try {
      const rec = new SpeechRec() as {
        lang: string;
        continuous: boolean;
        interimResults: boolean;
        onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }>> }) => void) | null;
        onerror: (() => void) | null;
        onend: (() => void) | null;
        start: () => void;
        stop: () => void;
      };
      rec.lang = locale === 'fr' ? 'fr-FR' : locale === 'it' ? 'it-IT' : 'en-US';
      rec.continuous = false;
      rec.interimResults = false;
      rec.onresult = (event) => {
        const transcript = event.results?.[0]?.[0]?.transcript || '';
        if (transcript) {
          setUserInput((prev) => (prev ? `${prev} ${transcript}` : transcript));
        }
      };
      rec.onerror = () => setIsDictating(false);
      rec.onend = () => setIsDictating(false);
      recognitionRef.current = rec;
      setIsDictating(true);
      rec.start();
    } catch {
      setIsDictating(false);
    }
  };

  const handleSelectSlashCommand = (cmd: ChatSlashCommand) => {
    if (cmd.isImmediateAction && cmd.command === '/clear') {
      clearAgentChat(agent.agentId);
      setUserInput('');
      return;
    }
    setUserInput(cmd.templatePromptFr);
  };

  const sendPrompt = async (promptText: string) => {
    const rawTrimmed = promptText.trim();
    if ((!rawTrimmed && !attachedFile) || loading) return;

    const slashResult = expandSlashCommandInput(rawTrimmed);
    if (slashResult.isClearCommand) {
      await clearAgentChat(agent.agentId);
      setUserInput('');
      return;
    }

    const activeAttachment = attachedFile;
    const basePrompt =
      slashResult.expandedPrompt ||
      (activeAttachment ? `Analyse le fichier joint "${activeAttachment.name}"` : '');
    const promptWithAttachment = activeAttachment
      ? `${basePrompt}\n\n[FICHIER JOINT : ${activeAttachment.name}]\n\`\`\`\n${activeAttachment.content.slice(0, 4000)}\n\`\`\``
      : basePrompt;

    const nowDate = new Date();
    const nowIso = nowDate.toISOString();
    const timeLabel = nowDate.toLocaleTimeString([], {
      hour: '2-digit',
      minute: '2-digit',
    });

    const userMsg: AgentChatMessage = {
      messageId: `msg_user_${nowDate.getTime()}`,
      agentId: agent.agentId,
      ownerId: agent.ownerId,
      role: 'user',
      content: basePrompt,
      attachedFileName: activeAttachment?.name,
      responseType: 'message',
      timeLabel,
      createdAt: nowIso,
    };

    setUserInput('');
    setAttachedFile(null);
    setLoading(true);
    await appendChatMessage(agent.agentId, userMsg);

    try {
      const timezone =
        Intl.DateTimeFormat().resolvedOptions().timeZone || 'Europe/Paris';
      const historyPayload = [
        ...messages.map((m) => ({ role: m.role, content: m.content })),
        { role: 'user', content: promptWithAttachment },
      ];

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (workspaceToken) {
        headers.Authorization = `Bearer ${workspaceToken}`;
      }

      const res = await fetch('/api/agent/chat', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          agent,
          messages: historyPayload,
          timezone,
          editingRoutine,
          locale,
          knowledgeDocs,
          notionToken: notionToken || toolCredentials.notion?.apiToken || '',
          notionParentId: notionParentId || toolCredentials.notion?.targetParam || '',
          toolCredentials,
          freeApiProviders,
          workspaceToken,
          attachedFileName: activeAttachment?.name,
        }),
      });

      const data = await res.json();
      const structured: AgentStructuredResponse = data.response || {
        type: 'message',
        message: 'Task processed.',
      };

      if (structured.type === 'vm_action') {
        const liveTrace = await browseVmUrl(agent.agentId, basePrompt);
        if (liveTrace) {
          structured.vmTrace = liveTrace;
          const itemsList = liveTrace.extractedItems
            .map(
              (item, idx) =>
                `${idx + 1}. **${item.headline}** (${item.source} · ${item.timeAgo}) — ${item.summary}`
            )
            .join('\n');
          structured.message =
            locale === 'fr'
              ? `J'ai ouvert le navigateur Cloud VM Desktop, navigué vers **${liveTrace.title}** et extrait les résultats principaux pour vous :\n\n${itemsList}`
              : locale === 'it'
                ? `Ho aperto il browser Cloud VM Desktop, navigato su **${liveTrace.title}** ed estratto i risultati principali per te:\n\n${itemsList}`
                : `I opened the Cloud VM Desktop browser, navigated to **${liveTrace.title}**, and extracted the top results for you:\n\n${itemsList}`;
        } else if (structured.vmTrace) {
          await setVmStatusForAgent(agent.agentId, 'active', structured.vmTrace);
        }
      }

      const replyDate = new Date();
      const agentMsg: AgentChatMessage = {
        messageId: `msg_agent_${replyDate.getTime()}`,
        agentId: agent.agentId,
        ownerId: agent.ownerId,
        role: 'agent',
        content: structured.message,
        responseType: structured.type,
        structured,
        executionMeta: structured.executionMeta,
        timeLabel: replyDate.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        }),
        createdAt: replyDate.toISOString(),
      };

      await appendChatMessage(agent.agentId, agentMsg);
    } catch (error) {
      console.error('Agent chat error:', error);
      const errDate = new Date();
      const errMsg: AgentChatMessage = {
        messageId: `msg_err_${errDate.getTime()}`,
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
    <section
      onDragOver={(e) => {
        e.preventDefault();
        setIsDraggingFile(true);
      }}
      onDragLeave={() => setIsDraggingFile(false)}
      onDrop={async (e) => {
        e.preventDefault();
        setIsDraggingFile(false);
        const file = e.dataTransfer.files?.[0];
        if (file) {
          await processSelectedFile(file);
        }
      }}
      className="flex-1 flex flex-col h-full min-h-0 bg-[#FAFBFD] min-w-0 relative overflow-hidden"
    >
      {/* Drag & Drop File Overlay */}
      {isDraggingFile && (
        <div className="absolute inset-3 z-40 rounded-2xl border-2 border-dashed border-emerald-500 bg-emerald-50/90 backdrop-blur-xs flex flex-col items-center justify-center gap-2 text-center p-6 pointer-events-none">
          <FileText className="h-8 w-8 text-emerald-600" />
          <p className="text-sm font-bold text-slate-900">
            Déposez votre fichier (.txt, .md, .csv, .json) pour l’analyser avec {agent.name}
          </p>
          <p className="text-xs text-slate-600">
            Le document sera également indexé dans la base RAG de l’agent.
          </p>
        </div>
      )}

      {/* Chat Header — Responsive flex-wrap with zero overlap */}
      <header className="px-3.5 py-2.5 sm:px-5 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2 bg-white/95 backdrop-blur-md shrink-0 overflow-hidden">
        <div className="flex items-center gap-2.5 min-w-[180px] flex-1">
          <div className="relative h-9 w-9 rounded-full overflow-hidden border border-slate-200 bg-slate-100 shrink-0 shadow-2xs">
            <Image
              src={agent.agentImage}
              alt={agent.name}
              fill
              sizes="36px"
              referrerPolicy="no-referrer"
              className="object-cover"
            />
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <h1 className="text-xs sm:text-sm font-bold text-slate-900 truncate tracking-tight max-w-[160px] sm:max-w-[220px]">
                {agent.name}
              </h1>
              <span
                className={`inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold whitespace-nowrap shrink-0 ${
                  agent.isActive
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/70'
                    : 'bg-amber-50 text-amber-700 border border-amber-200/70'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full ${
                    agent.isActive ? 'bg-emerald-500' : 'bg-amber-500'
                  }`}
                />
                {agent.isActive ? t.chat.activeAgent : t.chat.pausedAgent}
              </span>
              <span className="hidden xl:inline text-[10px] font-mono font-semibold text-slate-800 bg-slate-100/90 border border-slate-200/80 px-1.5 py-0.5 rounded whitespace-nowrap">
                {getAgentModelDisplayName(agent.model)}
              </span>
              {knowledgeDocs.length > 0 && (
                <span className="hidden 2xl:inline text-[10px] font-mono font-semibold text-indigo-700 bg-indigo-50/80 border border-indigo-200/70 px-1.5 py-0.5 rounded whitespace-nowrap">
                  RAG ({knowledgeDocs.length})
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500 truncate mt-0.5">
              {getAgentModelDisplayName(agent.model)} · {getAgentAutonomyBadge(agent.autonomyLevel, locale)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          {/* Toggle Chat Search & Filter Bar */}
          <button
            type="button"
            onClick={() => setShowSearchBar((v) => !v)}
            title="Rechercher et filtrer les messages"
            aria-label="Rechercher dans la conversation"
            className={`inline-flex items-center gap-1 rounded-xl border px-2 py-1.5 text-[11px] font-semibold transition-all whitespace-nowrap ${
              showSearchBar || searchQuery || filterCategory !== 'all'
                ? 'border-slate-900 bg-slate-900 text-white'
                : 'border-slate-200/90 bg-white text-slate-700 hover:bg-slate-50'
            }`}
          >
            <Search className="h-3.5 w-3.5" />
            <span className="hidden sm:inline">Filtrer</span>
          </button>

          <button
            type="button"
            onClick={() => setIsFreeApiModalOpen(true)}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-800 bg-[#101216] px-2.5 py-1.5 text-[11px] font-semibold text-white shadow-2xs hover:bg-slate-900 transition-all whitespace-nowrap"
          >
            <span
              className={`h-2 w-2 rounded-full shrink-0 ${
                healthyProvidersCount > 0 ? 'bg-emerald-400' : 'bg-slate-500'
              }`}
            />
            <span>APIs</span>
            <span
              className={`font-mono text-[10px] ${
                healthyProvidersCount > 0 ? 'text-emerald-400' : 'text-slate-400'
              }`}
            >
              ({healthyProvidersCount > 0 ? `${healthyProvidersCount} sain` : '0'})
            </span>
          </button>

          <button
            type="button"
            onClick={async () => {
              if (agent.vmStatus !== 'active') {
                await setVmStatusForAgent(agent.agentId, 'active');
              }
              openVmModal(agent.agentId);
            }}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200/90 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-800 shadow-[0_1px_2px_rgba(15,23,42,0.04)] hover:bg-slate-50 hover:border-slate-300 transition-all whitespace-nowrap"
          >
            <Monitor className="h-3.5 w-3.5 text-emerald-600" />
            <span>Cloud VM</span>
          </button>

          <button
            type="button"
            onClick={() => clearAgentChat(agent.agentId)}
            title={t.chat.resetChat}
            aria-label={t.chat.resetChat}
            className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <Trash2 className="h-4 w-4" />
          </button>

          {onToggleRightPanel && (
            <button
              type="button"
              onClick={onToggleRightPanel}
              title={
                isRightPanelCollapsed
                  ? 'Afficher le panneau de configuration'
                  : 'Masquer le panneau de configuration'
              }
              aria-label={
                isRightPanelCollapsed
                  ? 'Afficher le panneau de configuration'
                  : 'Masquer le panneau de configuration'
              }
              data-testid="right-panel-toggle-btn"
              className="hidden lg:inline-flex p-1.5 rounded-xl text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors"
            >
              {isRightPanelCollapsed ? (
                <PanelRightOpen className="h-4 w-4" />
              ) : (
                <PanelRightClose className="h-4 w-4" />
              )}
            </button>
          )}
        </div>
      </header>

      {/* Search & Category Filter Bar */}
      {showSearchBar && (
        <div
          data-testid="chat-search-filter-bar"
          className="px-3.5 py-2 sm:px-6 bg-white border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-2"
        >
          <div className="relative flex-1 min-w-[180px]">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Rechercher un mot-clé dans l'historique du chat..."
              aria-label="Rechercher dans l'historique du chat"
              className="w-full rounded-lg border border-slate-200 bg-[#FAFBFD] pl-8 pr-7 py-1 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Effacer la recherche"
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            {(
              [
                { id: 'all', label: 'Tous' },
                { id: 'tools', label: 'Actions Outils' },
                { id: 'routines', label: 'Routines' },
                { id: 'vm', label: 'Cloud VM' },
              ] as { id: ChatFilterCategory; label: string }[]
            ).map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setFilterCategory(tab.id)}
                className={`rounded-lg px-2.5 py-1 text-[11px] font-semibold transition-colors ${
                  filterCategory === tab.id
                    ? 'bg-slate-900 text-white'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200/70'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

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
      <div className="flex-1 overflow-y-auto px-3.5 py-4 sm:px-6 sm:py-5 space-y-4 sm:space-y-5">
        {messages.length > 0 && filteredMessages.length === 0 && (
          <div className="text-center py-8 text-xs text-slate-500">
            Aucun message ne correspond à votre filtre actuel.
          </div>
        )}

        {filteredMessages.map((msg, idx) => {
          if (msg.role === 'user') {
            return (
              <div key={msg.messageId} className="flex justify-end group">
                <div className="max-w-xl space-y-1">
                  <div className="rounded-2xl rounded-br-xs bg-slate-900 px-4 py-3 text-xs text-white shadow-xs leading-relaxed">
                    {msg.attachedFileName && (
                      <div className="mb-1.5 inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2 py-0.5 text-[10px] font-mono text-emerald-300">
                        <FileText className="h-3 w-3" />
                        <span>{msg.attachedFileName}</span>
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                    <div className="flex items-center justify-between gap-3 mt-1.5 pt-1 border-t border-white/10">
                      <div className="flex items-center gap-2 opacity-80 hover:opacity-100">
                        <button
                          type="button"
                          onClick={() => setUserInput(msg.content)}
                          title="Modifier et renvoyer ce message"
                          className="inline-flex items-center gap-1 text-[10px] text-slate-300 hover:text-white transition-colors"
                        >
                          <Pencil className="h-2.5 w-2.5" />
                          <span>Modifier</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard?.writeText(msg.content);
                            setCopiedUserMsgId(msg.messageId);
                            setTimeout(() => setCopiedUserMsgId(null), 1500);
                          }}
                          className="inline-flex items-center gap-1 text-[10px] text-slate-300 hover:text-white transition-colors"
                        >
                          {copiedUserMsgId === msg.messageId ? (
                            <>
                              <Check className="h-2.5 w-2.5 text-emerald-400" />
                              <span>Copié</span>
                            </>
                          ) : (
                            <>
                              <Copy className="h-2.5 w-2.5" />
                              <span>Copier</span>
                            </>
                          )}
                        </button>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                        {msg.timeLabel}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            );
          }

          // Find preceding user message so "Régénérer" can re-run it
          const precedingUserMsg = [...filteredMessages]
            .slice(0, idx)
            .reverse()
            .find((m) => m.role === 'user');

          return (
            <div key={msg.messageId} className="flex items-start gap-3 max-w-2xl">
              <div className="relative h-8 w-8 rounded-full overflow-hidden border border-slate-200 bg-white shrink-0 mt-0.5 shadow-2xs">
                <Image
                  src={agent.agentImage}
                  alt={agent.name}
                  fill
                  sizes="32px"
                  referrerPolicy="no-referrer"
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0 rounded-2xl rounded-tl-xs border border-slate-200/90 bg-white p-4 shadow-[0_2px_8px_-2px_rgba(15,23,42,0.05)]">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">
                      {agent.name}
                    </span>
                    <span className="font-mono text-[10px] text-slate-400">
                      {agent.sandboxId}
                    </span>
                  </div>
                  <span className="text-[10px] text-slate-400 font-mono tabular-nums">
                    {msg.timeLabel}
                  </span>
                </div>
                <AgentResponseView
                  agentId={agent.agentId}
                  content={msg.content}
                  structured={msg.structured}
                  executionMeta={msg.executionMeta}
                  onRoutineSaved={() => onSwitchRightTab?.('schedule')}
                  onContinuePrompt={(text) => sendPrompt(text)}
                  onRegenerate={
                    precedingUserMsg
                      ? () => sendPrompt(precedingUserMsg.content)
                      : undefined
                  }
                />
              </div>
            </div>
          );
        })}

        {loading && (
          <div className="flex items-start gap-3 max-w-lg">
            <div className="relative h-8 w-8 rounded-full overflow-hidden border border-slate-200 bg-white shrink-0">
              <Image
                src={agent.agentImage}
                alt={agent.name}
                fill
                sizes="32px"
                referrerPolicy="no-referrer"
                className="object-cover"
              />
            </div>
            <div className="rounded-2xl rounded-tl-xs border border-slate-200/90 bg-white px-4 py-3 flex items-center gap-2.5 text-xs text-slate-600 shadow-2xs">
              <Loader2 className="h-4 w-4 animate-spin text-slate-900" />
              <span>
                {agent.name} {t.chat.thinking} ({getAgentModelDisplayName(agent.model)})
              </span>
            </div>
          </div>
        )}

        <div ref={scrollEndRef} />
      </div>

      {/* Elevated "Command Center" Composer */}
      <div className="px-3.5 py-2.5 sm:px-6 sm:py-3.5 border-t border-slate-200/80 bg-white/90 backdrop-blur-md space-y-2 shrink-0 relative">
        {/* Slash Commands `/` Floating Autocomplete Menu */}
        {matchingSlashCommands.length > 0 && (
          <div
            data-testid="slash-command-menu"
            className="rounded-xl border border-slate-200 bg-white shadow-xl p-1.5 space-y-1 max-h-56 overflow-y-auto"
          >
            <div className="px-2 py-1 text-[10px] font-mono font-semibold uppercase tracking-wider text-slate-400 flex items-center justify-between">
              <span>Commandes rapides `/`</span>
              <span>↑↓ Naviguer · Tab / Clic pour insérer</span>
            </div>
            {matchingSlashCommands.map((cmd, cIdx) => {
              const isHighlighted =
                cIdx === Math.min(activeSlashIdx, matchingSlashCommands.length - 1);
              return (
                <button
                  key={cmd.command}
                  type="button"
                  onClick={() => handleSelectSlashCommand(cmd)}
                  className={`w-full flex items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 text-left transition-colors ${
                    isHighlighted ? 'bg-slate-100' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="rounded-md bg-slate-900 px-1.5 py-0.5 font-mono text-[11px] font-bold text-emerald-400 shrink-0">
                      {cmd.command}
                    </span>
                    <span className="text-xs font-semibold text-slate-900 truncate">
                      {cmd.labelFr}
                    </span>
                  </div>
                  <span className="text-[11px] text-slate-500 truncate hidden sm:inline">
                    {cmd.descriptionFr}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* Quick Prompts + Slash Trigger + Connected MCP Tool Mention Pills + Multi-Agent Handoff */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
          <button
            type="button"
            onClick={() => {
              setActiveSlashIdx(0);
              setUserInput('/');
            }}
            title="Afficher les commandes rapides /"
            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 bg-slate-900 px-2 py-1 text-[10px] font-mono font-bold text-emerald-400 hover:bg-slate-800 transition-colors shrink-0"
          >
            <Slash className="h-2.5 w-2.5" />
            <span>Commandes</span>
          </button>

          <TerminalSquare className="h-3.5 w-3.5 text-slate-400 shrink-0 mx-0.5" />
          {agent.tools.map((slug) => {
            const toolMeta = getToolBySlug(slug);
            const readiness = evaluateToolConnectionReadiness(
              slug,
              true,
              toolCredentials,
              workspaceToken
            );
            return (
              <button
                key={slug}
                type="button"
                onClick={() =>
                  setUserInput((prev) =>
                    prev ? `${prev} @${slug} ` : `Utilise @${toolMeta?.name || slug} pour `
                  )
                }
                title={
                  readiness.canExecuteLiveWrite
                    ? `API ${toolMeta?.name || slug} vérifiée`
                    : `Mentionner ${toolMeta?.name || slug}`
                }
                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[11px] font-medium transition-colors whitespace-nowrap shrink-0 ${
                  readiness.canExecuteLiveWrite
                    ? 'border-emerald-200/90 bg-emerald-50/60 text-emerald-900 hover:bg-emerald-100/70'
                    : 'border-slate-200/90 bg-[#FAFBFD] text-slate-700 hover:bg-slate-100'
                }`}
              >
                <ToolIcon slug={slug} className="h-3 w-3" />
                <span className="font-mono text-[10px]">@{slug}</span>
              </button>
            );
          })}
          <button
            type="button"
            onClick={() => openMarketplace(agent.agentId)}
            className="inline-flex items-center gap-1 rounded-lg border border-dashed border-slate-300 bg-white px-2 py-1 text-[10px] font-semibold text-slate-600 hover:border-slate-400 hover:text-slate-900 whitespace-nowrap shrink-0"
          >
            <Plus className="h-3 w-3" />
            <span>MCP</span>
          </button>

          {peerAgents.length > 0 && (
            <button
              type="button"
              onClick={async () => {
                const targetPeer =
                  peerAgents.find((p) => p.agentId === agent.handoffTargetAgentId) ||
                  peerAgents[0];
                if (!targetPeer) return;
                await runMultiAgentWorkflow(
                  agent.agentId,
                  targetPeer.agentId,
                  userInput.trim() || `Synthèse déléguée par ${agent.name}`
                );
              }}
              title="Déléguer une tâche à un autre agent de votre espace (Pipeline Multi-Agents)"
              className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 bg-indigo-50/70 hover:bg-indigo-100/80 px-2 py-1 text-[10px] font-semibold text-indigo-800 whitespace-nowrap shrink-0"
            >
              <GitBranch className="h-3 w-3 text-indigo-600" />
              <span>Déléguer → {peerAgents[0].name.split(' ')[0]}</span>
            </button>
          )}

          <span className="text-slate-300 mx-0.5">|</span>
          {t.chat.quickPrompts.map((qp) => (
            <button
              key={qp}
              type="button"
              disabled={loading}
              onClick={() => sendPrompt(qp)}
              className="rounded-lg border border-slate-200/80 bg-[#FAFBFD] px-2.5 py-1 text-[11px] font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              {qp}
            </button>
          ))}
        </div>

        {/* Attached File Preview Pill */}
        {attachedFile && (
          <div className="flex items-center justify-between gap-2 rounded-xl border border-indigo-200 bg-indigo-50/80 px-3 py-1.5 text-xs text-indigo-950">
            <div className="flex items-center gap-2 min-w-0">
              <FileText className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
              <span className="font-semibold truncate">{attachedFile.name}</span>
              <span className="text-[10px] font-mono text-indigo-700">
                ({Math.max(1, Math.round(attachedFile.sizeBytes / 1024))} Ko · Indexé dans RAG)
              </span>
            </div>
            <button
              type="button"
              onClick={() => setAttachedFile(null)}
              aria-label="Retirer la pièce jointe"
              className="p-0.5 text-indigo-700 hover:text-indigo-950"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        {/* Unified Command Center Input Box */}
        <form
          onSubmit={handleSubmit}
          className="rounded-2xl border border-slate-300/90 bg-white shadow-[0_4px_20px_-4px_rgba(15,23,42,0.06)] focus-within:border-slate-900 transition-all overflow-hidden"
        >
          <div className="px-3.5 pt-2.5 pb-1.5">
            <label htmlFor="agent-chat-input" className="sr-only">
              Message {agent.name}
            </label>
            <textarea
              id="agent-chat-input"
              rows={2}
              value={userInput}
              onChange={(e) => {
                setUserInput(e.target.value);
                setActiveSlashIdx(0);
              }}
              onKeyDown={(e) => {
                if (matchingSlashCommands.length > 0) {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setActiveSlashIdx((prev) =>
                      (prev + 1) % matchingSlashCommands.length
                    );
                    return;
                  }
                  if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setActiveSlashIdx((prev) =>
                      prev - 1 < 0 ? matchingSlashCommands.length - 1 : prev - 1
                    );
                    return;
                  }
                  if (e.key === 'Tab') {
                    e.preventDefault();
                    const chosen =
                      matchingSlashCommands[
                        Math.min(activeSlashIdx, matchingSlashCommands.length - 1)
                      ];
                    if (chosen) handleSelectSlashCommand(chosen);
                    return;
                  }
                  if (e.key === 'Escape') {
                    e.preventDefault();
                    setUserInput('');
                    return;
                  }
                }
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  sendPrompt(userInput);
                }
              }}
              placeholder={
                editingRoutine
                  ? `${t.chat.editPlaceholder} (${editingRoutine.name})`
                  : `${agent.name} — Tapez / pour les commandes rapides, @ pour un outil, ou posez votre question...`
              }
              className="w-full resize-none bg-transparent text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none leading-relaxed"
            />
          </div>

          {/* Composer Bottom Control Bar */}
          <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-[#FAFBFD] border-t border-slate-100">
            <div className="flex flex-wrap items-center gap-1.5">
              {/* Hidden File Input + Attachment Button */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.md,.csv,.json,.js,.ts,.py,.html"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    await processSelectedFile(file);
                  }
                  e.target.value = '';
                }}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                title="Joindre un fichier (.txt, .md, .csv, .json) pour analyse directe et RAG"
                aria-label="Joindre un fichier"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200/80 bg-white hover:bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-700 transition-colors"
              >
                <Paperclip className="h-3 w-3 text-slate-600 shrink-0" />
                <span className="hidden sm:inline">Fichier</span>
              </button>

              {/* Voice Dictation Button */}
              <button
                type="button"
                onClick={handleToggleVoiceDictation}
                title="Dictée vocale (Web Speech API)"
                aria-label="Dictée vocale"
                className={`inline-flex items-center gap-1 rounded-lg border px-2 py-1 text-[10px] font-semibold transition-colors ${
                  isDictating
                    ? 'border-red-300 bg-red-50 text-red-700'
                    : 'border-slate-200/80 bg-white hover:bg-slate-50 text-slate-700'
                }`}
              >
                {isDictating ? (
                  <>
                    <MicOff className="h-3 w-3 text-red-600 shrink-0" />
                    <span className="hidden sm:inline">Écoute...</span>
                  </>
                ) : (
                  <>
                    <Mic className="h-3 w-3 text-slate-600 shrink-0" />
                    <span className="hidden sm:inline">Dicter</span>
                  </>
                )}
              </button>

              {/* Inline Model Switcher with honest readiness indicator */}
              <div className="inline-flex items-center gap-1 rounded-lg border border-slate-200/80 bg-white px-2 py-1 text-[11px] text-slate-700">
                <Cpu className="h-3 w-3 text-slate-500 shrink-0" />
                <select
                  aria-label="Modèle IA de l'agent"
                  value={agent.model || 'gemini-3-flash-preview'}
                  onChange={(e) => {
                    const nextModel = e.target.value as AgentModelId;
                    updateAgentConfig(agent.agentId, {
                      model: nextModel,
                      apiProviderId: resolveProviderForModel(nextModel),
                    });
                  }}
                  className="bg-transparent font-mono text-[10px] font-semibold text-slate-800 focus:outline-none cursor-pointer max-w-[165px] sm:max-w-none"
                >
                  <option value="gemini-3-flash-preview">
                    ● Gemini 3 Flash (Actif)
                  </option>
                  <option value="gemini-3.1-pro-preview">
                    ● Gemini 3.1 Pro (Actif)
                  </option>
                  <option value="groq/llama-3.3-70b-versatile">
                    {isExternalProviderHealthy('groq/llama-3.3-70b-versatile')
                      ? '● Groq · Llama 3.3 70B (Clé vérifiée)'
                      : '○ Groq · Llama 3.3 70B (Clé requise)'}
                  </option>
                  <option value="openrouter/deepseek-r1-free">
                    {isExternalProviderHealthy('openrouter/deepseek-r1-free')
                      ? '● OpenRouter · DeepSeek R1 (Clé vérifiée)'
                      : '○ OpenRouter · DeepSeek R1 (Clé requise)'}
                  </option>
                  <option value="huggingface/qwen-2.5-72b-instruct">
                    {isExternalProviderHealthy('huggingface/qwen-2.5-72b-instruct')
                      ? '● HuggingFace · Qwen 2.5 72B (Clé vérifiée)'
                      : '○ HuggingFace · Qwen 2.5 72B (Clé requise)'}
                  </option>
                  <option value="nvidia/llama-3.1-405b-instruct">
                    {isExternalProviderHealthy('nvidia/llama-3.1-405b-instruct')
                      ? '● NVIDIA NIM · Llama 3.1 405B (Clé vérifiée)'
                      : '○ NVIDIA NIM · Llama 3.1 405B (Clé requise)'}
                  </option>
                  <option value="router9/shared-monthly-free">
                    {isExternalProviderHealthy('router9/shared-monthly-free')
                      ? '● Router9 (Clé vérifiée)'
                      : '○ Router9 (Clé requise)'}
                  </option>
                  <option value="speechify/tts-multilingual-free">
                    {isExternalProviderHealthy('speechify/tts-multilingual-free')
                      ? '● Speechify TTS (Clé vérifiée)'
                      : '○ Speechify TTS (Clé requise)'}
                  </option>
                  <option value="bai/promotional-free-v1">
                    {isExternalProviderHealthy('bai/promotional-free-v1')
                      ? '● B.AI Promo (Clé vérifiée)'
                      : '○ B.AI Promo (Clé requise)'}
                  </option>
                  <option value="orcarouter/free-key-v1">
                    {isExternalProviderHealthy('orcarouter/free-key-v1')
                      ? '● OrcaRouter (Clé vérifiée)'
                      : '○ OrcaRouter (Clé requise)'}
                  </option>
                </select>
              </div>

              <button
                type="button"
                onClick={() => setIsFreeApiModalOpen(true)}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200/80 bg-white hover:bg-slate-50 px-2 py-1 text-[10px] font-semibold text-slate-700 transition-colors"
              >
                <KeyRound className="h-3 w-3 text-emerald-600 shrink-0" />
                <span>Gérer APIs ({healthyProvidersCount})</span>
              </button>

              {/* Inline Autonomy Switcher */}
              <div className="hidden xl:inline-flex items-center gap-1 rounded-lg border border-slate-200/80 bg-white px-2 py-1 text-[11px] text-slate-700">
                <ShieldCheck className="h-3 w-3 text-emerald-600 shrink-0" />
                <select
                  aria-label="Niveau d'autonomie"
                  value={agent.autonomyLevel || 'copilot'}
                  onChange={(e) =>
                    updateAgentConfig(agent.agentId, {
                      autonomyLevel: e.target.value as AgentAutonomyLevel,
                    })
                  }
                  className="bg-transparent text-[10px] font-semibold text-slate-700 focus:outline-none cursor-pointer"
                >
                  <option value="copilot">Mode Copilote</option>
                  <option value="semi_auto">Semi-Autonome</option>
                  <option value="full_auto">100% Autonome</option>
                </select>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || (!userInput.trim() && !attachedFile)}
              aria-label={t.chat.sendBtn}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-40 disabled:pointer-events-none transition-colors whitespace-nowrap shrink-0"
            >
              {loading ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <>
                  <Send className="h-3 w-3" />
                  <span>{t.chat.sendBtn}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Free Agent APIs Router Modal */}
      {isFreeApiModalOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Routeur d'APIs d'Agents Gratuits"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/65 backdrop-blur-xs p-3 sm:p-6"
        >
          <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl bg-[#101216] border border-slate-800 shadow-2xl overflow-hidden">
            <div className="px-4 py-3 border-b border-white/10 flex items-center justify-between bg-[#14171D]">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-emerald-400" />
                <h2 className="text-xs sm:text-sm font-bold text-white">
                  Passerelle & APIs d’Agents Gratuits ({agent.name})
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsFreeApiModalOpen(false)}
                aria-label="Fermer la passerelle d'APIs gratuites"
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3 sm:p-4">
              <FreeApiRouterPanel agent={agent} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
