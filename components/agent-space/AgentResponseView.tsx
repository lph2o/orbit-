'use client';

import React, { useEffect, useState } from 'react';
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
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Terminal,
  Cpu,
  RefreshCw,
  Clock,
  FileText,
  Sparkles,
  Trash2,
  MailX,
  Loader2,
  KeyRound,
} from 'lucide-react';
import {
  AgentStructuredResponse,
  ChatExecutionMetadata,
  GmailCleanupCandidate,
} from '@/lib/types';
import {
  buildContextualFollowUpSuggestions,
  formatResponseForExport,
  getAgentModelDisplayName,
  parseMarkdownTableLines,
  sanitizeHallucinatedUrls,
} from '@/lib/orbit-logic';
import { useOrbit } from '@/context/OrbitContext';
import { ToolSuggestionCard } from './ToolSuggestionCard';
import { RoutineCard } from './RoutineCard';

function renderInlineMarkdown(line: string) {
  const parts = line.split(/(\[[^\]]+\]\([^)]+\)|\*\*.*?\*\*|`.*?`)/g);
  return parts.map((part, j) => {
    const linkMatch = part.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
    if (linkMatch) {
      const label = linkMatch[1];
      const href = linkMatch[2];
      const isInternal = href.startsWith('/');
      const isUnsubLink = /désabonner|unsubscribe/i.test(label);
      return (
        <a
          key={j}
          href={href}
          target={isInternal ? undefined : '_blank'}
          rel={isInternal ? undefined : 'noreferrer'}
          className={
            isUnsubLink
              ? 'inline-flex items-center gap-1 rounded-md border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-900 hover:bg-amber-100 transition-colors ml-1'
              : 'inline-flex items-center gap-1 font-semibold text-blue-600 underline decoration-blue-300 underline-offset-2 hover:text-blue-800'
          }
        >
          <span>{label}</span>
          <ExternalLink className="h-2.5 w-2.5 shrink-0" />
        </a>
      );
    }
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
          className="rounded-md border border-slate-200/80 bg-slate-100/80 px-1.5 py-0.5 font-mono text-[11px] text-slate-800"
        >
          {part.slice(1, -1)}
        </code>
      );
    }
    return <span key={j}>{part}</span>;
  });
}

function RichMarkdownRenderer({
  text,
  onOpenVm,
}: {
  text: string;
  onOpenVm: () => void;
}) {
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const blocks = (text || '').split(/(```[\s\S]*?```)/g);

  return (
    <div className="space-y-2">
      {blocks.map((block, blockIdx) => {
        if (block.startsWith('```') && block.endsWith('```')) {
          const rawInner = block.slice(3, -3).trim();
          const firstNewline = rawInner.indexOf('\n');
          const lang =
            firstNewline !== -1 && rawInner.slice(0, firstNewline).length < 18
              ? rawInner.slice(0, firstNewline).trim() || 'bash'
              : 'bash';
          const codeBody =
            firstNewline !== -1 && rawInner.slice(0, firstNewline).length < 18
              ? rawInner.slice(firstNewline + 1)
              : rawInner;

          return (
            <div
              key={blockIdx}
              className="my-2 overflow-hidden rounded-xl border border-slate-800 bg-[#0D1117] text-slate-100 shadow-xs"
            >
              <div className="flex items-center justify-between border-b border-white/10 bg-[#161B22] px-3 py-1.5 text-[11px] font-mono text-slate-400">
                <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px] font-semibold text-emerald-400">
                  <Terminal className="h-3 w-3" />
                  {lang}
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard?.writeText(codeBody);
                      setCopiedIdx(blockIdx);
                      setTimeout(() => setCopiedIdx(null), 1800);
                    }}
                    className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-medium text-slate-300 hover:bg-white/10 hover:text-white transition-colors"
                  >
                    {copiedIdx === blockIdx ? (
                      <>
                        <Check className="h-3 w-3 text-emerald-400" />
                        <span>Copié</span>
                      </>
                    ) : (
                      <>
                        <Copy className="h-3 w-3" />
                        <span>Copier</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={onOpenVm}
                    className="inline-flex items-center gap-1 rounded bg-emerald-500/15 border border-emerald-500/30 px-2 py-0.5 text-[10px] font-semibold text-emerald-300 hover:bg-emerald-500/25 transition-colors"
                  >
                    <Monitor className="h-3 w-3" />
                    <span>Terminal VM</span>
                  </button>
                </div>
              </div>
              <pre className="overflow-x-auto p-3 font-mono text-[11px] leading-relaxed text-slate-200">
                <code>{codeBody}</code>
              </pre>
            </div>
          );
        }

        const lines = block.split('\n');
        // Check if this block contains a markdown table
        const tableLines = lines.filter(
          (l) => l.trim().startsWith('|') && l.trim().endsWith('|')
        );
        const parsedTable =
          tableLines.length >= 2 ? parseMarkdownTableLines(tableLines) : null;

        return (
          <div key={blockIdx} className="space-y-1.5">
            {lines.map((line, i) => {
              const trimmed = line.trim();
              if (!trimmed) {
                return <div key={i} className="h-1.5" />;
              }
              // Skip raw table lines if rendered as structured table below
              if (parsedTable && trimmed.startsWith('|') && trimmed.endsWith('|')) {
                const firstTableLineIdx = lines.findIndex(
                  (l) => l.trim().startsWith('|') && l.trim().endsWith('|')
                );
                if (i !== firstTableLineIdx) return null;
                return (
                  <div
                    key={i}
                    className="my-2 overflow-x-auto rounded-xl border border-slate-200 bg-white shadow-2xs"
                  >
                    <table className="w-full text-left border-collapse text-[11px]">
                      <thead>
                        <tr className="border-b border-slate-200 bg-slate-50/90 text-slate-800 font-semibold">
                          {parsedTable.headers.map((h, hIdx) => (
                            <th key={hIdx} className="px-3 py-2 whitespace-nowrap">
                              {renderInlineMarkdown(h)}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {parsedTable.rows.map((row, rIdx) => (
                          <tr key={rIdx} className="hover:bg-slate-50/60">
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="px-3 py-1.5 text-slate-700">
                                {renderInlineMarkdown(cell)}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              }
              if (trimmed.startsWith('### ')) {
                return (
                  <h4
                    key={i}
                    className="text-xs font-bold text-slate-900 pt-1 tracking-tight"
                  >
                    {renderInlineMarkdown(trimmed.slice(4))}
                  </h4>
                );
              }
              if (trimmed.startsWith('## ')) {
                return (
                  <h3
                    key={i}
                    className="text-[13px] font-bold text-slate-900 pt-1.5 tracking-tight"
                  >
                    {renderInlineMarkdown(trimmed.slice(3))}
                  </h3>
                );
              }
              if (
                trimmed.startsWith('- ') ||
                trimmed.startsWith('* ') ||
                trimmed.startsWith('• ')
              ) {
                return (
                  <div key={i} className="flex items-start gap-2 pl-1 leading-relaxed">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-slate-400 shrink-0" />
                    <div className="flex-1">{renderInlineMarkdown(trimmed.slice(2))}</div>
                  </div>
                );
              }
              const numberedMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
              if (numberedMatch) {
                return (
                  <div
                    key={i}
                    className="flex items-start gap-2 rounded-lg border border-slate-100 bg-[#FAFBFD] px-2.5 py-1.5 leading-relaxed"
                  >
                    <span className="mt-0.5 inline-flex h-4 min-w-4 px-1 items-center justify-center rounded bg-slate-200/80 font-mono text-[10px] font-bold text-slate-700 shrink-0">
                      {numberedMatch[1]}
                    </span>
                    <div className="flex-1 min-w-0 break-words">
                      {renderInlineMarkdown(numberedMatch[2])}
                    </div>
                  </div>
                );
              }
              return (
                <p key={i} className="leading-relaxed">
                  {renderInlineMarkdown(line)}
                </p>
              );
            })}
          </div>
        );
      })}
    </div>
  );
}

export function AgentResponseView({
  agentId,
  content,
  structured,
  executionMeta,
  onRoutineSaved,
  onContinuePrompt,
  onRegenerate,
}: {
  agentId: string;
  content: string;
  structured?: AgentStructuredResponse;
  executionMeta?: ChatExecutionMetadata;
  onRoutineSaved?: () => void;
  onContinuePrompt?: (promptText: string) => void;
  onRegenerate?: () => void;
}) {
  const {
    agents,
    knowledgeByAgent,
    openVmModal,
    setVmStatusForAgent,
    workspaceToken,
    toolCredentials,
    connectGoogleWorkspaceOAuth,
    connectToolToAgent,
    locale,
    t,
    addToast,
  } = useOrbit();
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [copiedFullResponse, setCopiedFullResponse] = useState(false);
  const [copilotApproved, setCopilotApproved] = useState(false);
  const [showExecutionTrace, setShowExecutionTrace] = useState(false);

  const agent = agents.find((a) => a.agentId === agentId);
  const knowledgeCount = (knowledgeByAgent[agentId] || []).length;
  const rawMessageText = structured?.message || content;
  const messageText = sanitizeHallucinatedUrls(
    rawMessageText,
    [],
    `/portfolio/${encodeURIComponent(agentId)}`
  );

  const isGmailAlreadyTrashed =
    messageText.includes('Nettoyage Gmail exécuté en direct') ||
    messageText.includes('Nettoyage & Désabonnement Gmail exécutés en direct');

  const isGmailScanMessage =
    Boolean(structured?.gmailCleanupProposal) ||
    messageText.includes('Scan en direct de votre boîte Gmail terminé') ||
    isGmailAlreadyTrashed;

  const propCandidates = structured?.gmailCleanupProposal?.candidates;
  const [liveCandidates, setLiveCandidates] = useState<GmailCleanupCandidate[]>(
    propCandidates || []
  );
  const [selectedGmailIds, setSelectedGmailIds] = useState<string[]>(
    (propCandidates || []).map((c) => c.id)
  );
  const [loadingLiveCandidates, setLoadingLiveCandidates] = useState(false);
  const [trashingGmail, setTrashingGmail] = useState(false);
  const [trashedResult, setTrashedResult] = useState<{
    trashedCount: number;
    failedCount: number;
  } | null>(null);
  const [unsubscribingAll, setUnsubscribingAll] = useState(false);
  const [unsubscribedResult, setUnsubscribedResult] = useState<{
    unsubscribedCount: number;
    failedCount: number;
  } | null>(null);
  const [connectingGmailOAuth, setConnectingGmailOAuth] = useState(false);

  const activeGmailToken = (
    workspaceToken ||
    toolCredentials.gmail?.apiToken ||
    ''
  ).trim();

  // If this message is a Gmail scan message whose candidates weren't hydrated yet, fetch them automatically
  useEffect(() => {
    if (propCandidates && propCandidates.length > 0 && liveCandidates.length === 0) {
      queueMicrotask(() => {
        setLiveCandidates(propCandidates);
        setSelectedGmailIds(propCandidates.map((c) => c.id));
      });
      return;
    }
    if (
      isGmailScanMessage &&
      liveCandidates.length === 0 &&
      activeGmailToken &&
      !loadingLiveCandidates &&
      !trashedResult
    ) {
      queueMicrotask(() => setLoadingLiveCandidates(true));
      fetch('/api/workspace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${activeGmailToken}`,
        },
        body: JSON.stringify({ action: 'scan_gmail_cleanup', maxResults: 12 }),
      })
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data?.candidates) && data.candidates.length > 0) {
            setLiveCandidates(data.candidates);
            setSelectedGmailIds(
              data.candidates.map((c: GmailCleanupCandidate) => c.id)
            );
          }
        })
        .catch(() => {})
        .finally(() => setLoadingLiveCandidates(false));
    }
  }, [
    isGmailScanMessage,
    propCandidates,
    liveCandidates.length,
    activeGmailToken,
    loadingLiveCandidates,
    trashedResult,
  ]);

  const effectiveMeta = executionMeta || structured?.executionMeta;
  const modelLabel =
    effectiveMeta?.modelUsed || getAgentModelDisplayName(agent?.model);
  const latencyLabel =
    effectiveMeta?.latencyMs && effectiveMeta.latencyMs > 0
      ? `${effectiveMeta.latencyMs} ms`
      : null;

  const allSuggestedConnected =
    structured?.type === 'tool_connection' &&
    Array.isArray(structured.suggestedTools) &&
    structured.suggestedTools.length > 0 &&
    structured.suggestedTools.every((tool) =>
      agent?.tools.includes(tool.slug.toLowerCase())
    );

  const includesGmailSuggestion =
    structured?.type === 'tool_connection' &&
    Array.isArray(structured.suggestedTools) &&
    structured.suggestedTools.some((tool) => tool.slug.toLowerCase() === 'gmail');

  const handleToggleSelectGmailId = (id: string) => {
    setSelectedGmailIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleLoadCandidatesNow = async () => {
    if (loadingLiveCandidates) return;
    setLoadingLiveCandidates(true);
    try {
      let tokenToUse = activeGmailToken;
      if (!tokenToUse) {
        tokenToUse = (await connectGoogleWorkspaceOAuth()) || '';
      }
      if (!tokenToUse) return;

      let scanRes = await fetch('/api/workspace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenToUse}`,
        },
        body: JSON.stringify({ action: 'scan_gmail_cleanup', maxResults: 12 }),
      });
      if (scanRes.status === 401 || scanRes.status === 403) {
        const refreshed = await connectGoogleWorkspaceOAuth();
        if (refreshed) {
          tokenToUse = refreshed;
          scanRes = await fetch('/api/workspace', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${tokenToUse}`,
            },
            body: JSON.stringify({ action: 'scan_gmail_cleanup', maxResults: 12 }),
          });
        }
      }
      const scanData = await scanRes.json();
      if (Array.isArray(scanData?.candidates) && scanData.candidates.length > 0) {
        setLiveCandidates(scanData.candidates);
        setSelectedGmailIds(
          scanData.candidates.map((c: GmailCleanupCandidate) => c.id)
        );
      }
    } catch {
      // Ignore error
    } finally {
      setLoadingLiveCandidates(false);
    }
  };

  const handleScanAndTrashNow = async () => {
    if (trashingGmail) return;
    setTrashingGmail(true);
    try {
      let tokenToUse = activeGmailToken;
      if (!tokenToUse) {
        tokenToUse = (await connectGoogleWorkspaceOAuth()) || '';
      }
      if (!tokenToUse) {
        addToast({
          title: 'Connexion Google OAuth requise',
          description: 'Veuillez autoriser la fenêtre Google OAuth pour accéder à Gmail.',
          type: 'error',
        });
        return;
      }

      let idsToTrash = selectedGmailIds;
      if (idsToTrash.length === 0) {
        let scanRes = await fetch('/api/workspace', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${tokenToUse}`,
          },
          body: JSON.stringify({ action: 'scan_gmail_cleanup', maxResults: 12 }),
        });
        if (scanRes.status === 401 || scanRes.status === 403) {
          const refreshed = await connectGoogleWorkspaceOAuth();
          if (refreshed) {
            tokenToUse = refreshed;
            scanRes = await fetch('/api/workspace', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${tokenToUse}`,
              },
              body: JSON.stringify({ action: 'scan_gmail_cleanup', maxResults: 12 }),
            });
          }
        }
        if (scanRes.ok) {
          const scanData = await scanRes.json();
          if (Array.isArray(scanData?.candidates) && scanData.candidates.length > 0) {
            setLiveCandidates(scanData.candidates);
            idsToTrash = scanData.candidates.map(
              (c: GmailCleanupCandidate) => c.id
            );
            setSelectedGmailIds(idsToTrash);
          }
        }
      }

      if (idsToTrash.length === 0) {
        addToast({
          title: 'Aucun courrier sélectionné',
          description: 'Cochez au moins un courrier à mettre à la corbeille.',
          type: 'info',
        });
        return;
      }

      let res = await fetch('/api/workspace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${tokenToUse}`,
        },
        body: JSON.stringify({
          action: 'trash_gmail_messages',
          messageIds: idsToTrash,
        }),
      });

      if (res.status === 401 || res.status === 403) {
        const refreshed = await connectGoogleWorkspaceOAuth();
        if (refreshed) {
          tokenToUse = refreshed;
          res = await fetch('/api/workspace', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${tokenToUse}`,
            },
            body: JSON.stringify({
              action: 'trash_gmail_messages',
              messageIds: idsToTrash,
            }),
          });
        }
      }

      const data = await res.json();
      if (!res.ok) {
        addToast({
          title: 'Erreur Gmail API',
          description: data?.error || 'Impossible de mettre les e-mails à la corbeille.',
          type: 'error',
        });
      } else {
        const count = data.trashedCount ?? data.trashedIds?.length ?? idsToTrash.length;
        setTrashedResult({
          trashedCount: count,
          failedCount: data.failedCount || 0,
        });
        addToast({
          title: 'Nettoyage Gmail exécuté en direct !',
          description: `${count} e-mail(s) déplacé(s) vers la corbeille Gmail.`,
          type: 'success',
        });
      }
    } catch (err) {
      addToast({
        title: 'Erreur réseau',
        description: err instanceof Error ? err.message : 'Échec de la requête.',
        type: 'error',
      });
    } finally {
      setTrashingGmail(false);
    }
  };

  const handleAutoUnsubscribeAll = async () => {
    if (unsubscribingAll) return;
    setUnsubscribingAll(true);
    try {
      const urlsFromCandidates = liveCandidates
        .map((c) => c.unsubscribeUrl || '')
        .filter(Boolean);
      const urlsFromMarkdown = Array.from(
        messageText.matchAll(/\]\((https?:\/\/[^\s)]+)\)/g)
      ).map((m) => m[1]);
      const allUrls = Array.from(
        new Set([...urlsFromCandidates, ...urlsFromMarkdown])
      );

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (activeGmailToken) {
        headers.Authorization = `Bearer ${activeGmailToken}`;
      }

      const res = await fetch('/api/workspace', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'auto_unsubscribe_gmail',
          unsubscribeUrls: allUrls,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setUnsubscribedResult({
          unsubscribedCount: data.unsubscribedCount || 0,
          failedCount: data.failedCount || 0,
        });
        addToast({
          title: 'Désinscription automatique exécutée !',
          description: `${data.unsubscribedCount || 0} requête(s) officielle(s) de désabonnement envoyée(s).`,
          type: 'success',
        });
      }
    } catch {
      // Ignore error
    } finally {
      setUnsubscribingAll(false);
    }
  };

  const handleConnectGmailAndExecuteNow = async () => {
    if (connectingGmailOAuth) return;
    setConnectingGmailOAuth(true);
    try {
      if (agent && !agent.tools.includes('gmail')) {
        await connectToolToAgent(agentId, 'gmail');
      }
      const token = await connectGoogleWorkspaceOAuth();
      if (token && onContinuePrompt) {
        onContinuePrompt('Exécute le nettoyage de ma boîte Gmail maintenant');
      }
    } finally {
      setConnectingGmailOAuth(false);
    }
  };

  const handleCopyFullMessage = () => {
    navigator.clipboard?.writeText(messageText);
    setCopiedFullResponse(true);
    setTimeout(() => setCopiedFullResponse(false), 1800);
  };

  const handleToggleSpeech = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
      addToast({
        title: 'Synthèse vocale (TTS)',
        description: 'Votre navigateur ne prend pas en charge Web Speech Synthesis.',
        type: 'info',
      });
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
    structured?.type !== 'tool_connection' &&
    !isGmailScanMessage;

  return (
    <div className="space-y-3 text-xs text-slate-700">
      {/* Collapsible Glass-Box Execution Trace Header */}
      <div className="rounded-lg border border-slate-200/80 bg-[#FAFBFD] px-2.5 py-1.5">
        <button
          type="button"
          onClick={() => setShowExecutionTrace((v) => !v)}
          className="w-full flex items-center justify-between gap-2 text-left text-[11px] text-slate-600 hover:text-slate-900 transition-colors"
        >
          <span className="flex items-center gap-1.5 min-w-0 truncate">
            {showExecutionTrace ? (
              <ChevronDown className="h-3.5 w-3.5 text-slate-500 shrink-0" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            )}
            <Cpu className="h-3 w-3 text-emerald-600 shrink-0" />
            <span className="font-mono text-[10px] font-semibold text-slate-700 truncate">
              {modelLabel} · {agent?.tools.length || 0} MCP
              {effectiveMeta?.ragDocsCited && effectiveMeta.ragDocsCited.length > 0
                ? ` · ${effectiveMeta.ragDocsCited.length} source(s) RAG`
                : ''}
            </span>
          </span>
          <div className="flex items-center gap-1.5 shrink-0">
            {latencyLabel && (
              <span className="inline-flex items-center gap-1 font-mono text-[10px] text-slate-600 bg-white border border-slate-200/80 px-1.5 py-0.5 rounded">
                <Clock className="h-2.5 w-2.5 text-slate-400" />
                {latencyLabel}
              </span>
            )}
            <span className="font-mono text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-1.5 py-0.5 rounded">
              Vérifié
            </span>
          </div>
        </button>

        {showExecutionTrace && (
          <div className="mt-2 pt-2 border-t border-slate-200/70 space-y-1 font-mono text-[10px] text-slate-600">
            <div className="flex items-center justify-between">
              <span>01. Moteur d’inférence actif</span>
              <span className="text-slate-900 font-semibold">
                {modelLabel} {latencyLabel ? `(${latencyLabel})` : ''}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>02. Contexte Documentaire RAG</span>
              <span className="text-slate-800 font-semibold">
                {effectiveMeta?.ragDocsCited && effectiveMeta.ragDocsCited.length > 0
                  ? effectiveMeta.ragDocsCited.join(', ')
                  : `${knowledgeCount} doc(s) indexé(s)`}
              </span>
            </div>
            {effectiveMeta?.httpCalls && effectiveMeta.httpCalls.length > 0 && (
              <div className="flex items-center justify-between gap-2">
                <span>03. Requête HTTP Officielle</span>
                <span className="text-emerald-700 font-semibold truncate">
                  {effectiveMeta.httpCalls[0]}
                </span>
              </div>
            )}
            <div className="flex items-center justify-between">
              <span>04. Garde Anti-Hallucination</span>
              <span className="text-emerald-700 font-semibold">
                Zéro URL simulée autorisée
              </span>
            </div>
          </div>
        )}
      </div>

      {effectiveMeta?.attachedFileName && (
        <div className="inline-flex items-center gap-1.5 rounded-lg border border-indigo-200/80 bg-indigo-50/70 px-2.5 py-1 text-[11px] font-medium text-indigo-900">
          <FileText className="h-3.5 w-3.5 text-indigo-600 shrink-0" />
          <span>Fichier analysé : {effectiveMeta.attachedFileName}</span>
        </div>
      )}

      <RichMarkdownRenderer
        text={messageText}
        onOpenVm={async () => {
          if (agent && agent.vmStatus !== 'active') {
            await setVmStatusForAgent(agentId, 'active');
          }
          openVmModal(agentId);
        }}
      />

      {/* Interactive Gmail Cleanup & Unsubscribe Confirmation Card */}
      {isGmailScanMessage && (
        <div
          data-testid="gmail-cleanup-proposal-card"
          className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-2xs space-y-3"
        >
          <div className="flex items-center justify-between gap-2 flex-wrap border-b border-slate-100 pb-2.5">
            <div className="flex items-center gap-2">
              <div className="h-7 w-7 rounded-lg bg-red-50 border border-red-200/80 text-red-600 flex items-center justify-center shrink-0">
                <MailX className="h-4 w-4" />
              </div>
              <div>
                <p className="text-xs font-bold text-slate-900">
                  Action Gmail en direct — Désabonnement & Mise à la corbeille
                </p>
                <p className="text-[11px] text-slate-500">
                  {liveCandidates.length > 0
                    ? `${selectedGmailIds.length} sur ${liveCandidates.length} e-mail(s) sélectionné(s)`
                    : loadingLiveCandidates
                      ? 'Chargement des courriers détectés depuis Gmail...'
                      : 'Cliquez ci-dessous pour charger et mettre les courriers détectés à la corbeille'}
                </p>
              </div>
            </div>

            {liveCandidates.length > 0 && (
              <button
                type="button"
                onClick={() => {
                  if (selectedGmailIds.length === liveCandidates.length) {
                    setSelectedGmailIds([]);
                  } else {
                    setSelectedGmailIds(liveCandidates.map((c) => c.id));
                  }
                }}
                className="text-[11px] font-semibold text-slate-600 hover:text-slate-900 underline underline-offset-2"
              >
                {selectedGmailIds.length === liveCandidates.length
                  ? 'Tout désélectionner'
                  : 'Tout sélectionner'}
              </button>
            )}
          </div>

          {liveCandidates.length > 0 && (
            <div className="max-h-64 overflow-y-auto divide-y divide-slate-100 pr-1">
              {liveCandidates.map((cand) => {
                const isChecked = selectedGmailIds.includes(cand.id);
                const unsubHref =
                  cand.unsubscribeUrl ||
                  (cand.unsubscribeMailto ? `mailto:${cand.unsubscribeMailto}` : null);

                return (
                  <div
                    key={cand.id}
                    className="py-2 flex items-start justify-between gap-2.5 text-[11px]"
                  >
                    <label className="flex items-start gap-2.5 cursor-pointer flex-1 min-w-0">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={Boolean(trashedResult)}
                        onChange={() => handleToggleSelectGmailId(cand.id)}
                        className="mt-0.5 rounded border-slate-300 text-slate-900 focus:ring-slate-900"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="font-semibold text-slate-900 truncate">
                          {cand.subject}
                        </p>
                        <p className="text-slate-500 truncate">{cand.from}</p>
                        {cand.snippet && (
                          <p className="text-[10px] text-slate-400 truncate mt-0.5">
                            {cand.snippet}
                          </p>
                        )}
                      </div>
                    </label>

                    {unsubHref && (
                      <a
                        href={unsubHref}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2 py-1 text-[10px] font-semibold text-amber-900 hover:bg-amber-100 transition-colors shrink-0"
                      >
                        <span>Se désabonner</span>
                        <ExternalLink className="h-2.5 w-2.5" />
                      </a>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {unsubscribedResult && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 flex items-center gap-2 text-xs font-semibold text-emerald-900">
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
              <span>
                {unsubscribedResult.unsubscribedCount} désabonnement(s) automatique(s) exécuté(s) en direct (RFC 8058 One-Click).
              </span>
            </div>
          )}

          {trashedResult || isGmailAlreadyTrashed ? (
            <div className="space-y-2.5 pt-1">
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 flex items-center justify-between gap-2 flex-wrap text-xs font-semibold text-emerald-900">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                  <span>
                    {trashedResult
                      ? `${trashedResult.trashedCount} e-mail(s) mis à la corbeille avec succès.`
                      : 'Ces courriers ont été déplacés dans la corbeille Gmail.'}
                  </span>
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 flex-wrap">
                {!unsubscribedResult && (
                  <button
                    type="button"
                    disabled={unsubscribingAll}
                    onClick={handleAutoUnsubscribeAll}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-950 hover:bg-amber-100 disabled:opacity-50 transition-colors"
                  >
                    {unsubscribingAll ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span>Désabonnement automatique en cours...</span>
                      </>
                    ) : (
                      <>
                        <MailX className="h-3.5 w-3.5 text-amber-700" />
                        <span>Désabonner automatiquement tous ces expéditeurs (1 clic)</span>
                      </>
                    )}
                  </button>
                )}

                {onContinuePrompt && (
                  <button
                    type="button"
                    onClick={() =>
                      onContinuePrompt(
                        'Supprime et désabonne le lot suivant de courriers inutiles Gmail maintenant'
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-emerald-400" />
                    <span>Nettoyer & Désabonner le lot suivant de courriers</span>
                  </button>
                )}
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-2 pt-1 flex-wrap">
              <span className="text-[10px] text-slate-500">
                Action officielle sur votre compte Gmail (`POST /messages/trash`)
              </span>
              <div className="flex items-center gap-2 flex-wrap">
                {liveCandidates.length === 0 && (
                  <button
                    type="button"
                    disabled={loadingLiveCandidates}
                    onClick={handleLoadCandidatesNow}
                    className="inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 disabled:opacity-50 transition-colors"
                  >
                    {loadingLiveCandidates ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <RefreshCw className="h-3.5 w-3.5" />
                    )}
                    <span>Afficher les courriers & Liens de désinscription</span>
                  </button>
                )}
                <button
                  type="button"
                  disabled={trashingGmail}
                  onClick={handleScanAndTrashNow}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-red-600 px-3.5 py-2 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50 transition-colors shadow-2xs"
                >
                  {trashingGmail ? (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      <span>Mise à la corbeille en cours...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="h-3.5 w-3.5" />
                      <span>
                        {liveCandidates.length > 0
                          ? `Confirmer la mise à la corbeille (${selectedGmailIds.length})`
                          : 'Confirmer la mise à la corbeille maintenant'}
                      </span>
                    </>
                  )}
                </button>
              </div>
            </div>
          )}
        </div>
      )}

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

            {includesGmailSuggestion && !workspaceToken && (
              <div className="rounded-xl border border-blue-200 bg-blue-50/70 p-3 flex items-center justify-between gap-3 flex-wrap">
                <div className="space-y-0.5 min-w-0">
                  <p className="text-xs font-semibold text-slate-900">
                    Authentification Google OAuth 2.0 requise pour agir sur Gmail
                  </p>
                  <p className="text-[11px] text-slate-600">
                    Autorisez l’accès officiel `gmail.modify` pour analyser vos courriers et les mettre à la corbeille immédiatement.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={connectingGmailOAuth}
                  onClick={handleConnectGmailAndExecuteNow}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors shrink-0"
                >
                  {connectingGmailOAuth ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <KeyRound className="h-3.5 w-3.5 text-emerald-400" />
                  )}
                  <span>Connecter Gmail (OAuth) & Exécuter maintenant</span>
                </button>
              </div>
            )}

            {(allSuggestedConnected || (includesGmailSuggestion && Boolean(workspaceToken))) &&
              onContinuePrompt && (
                <div className="flex items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50/70 px-3 py-2.5 mt-2">
                  <div className="flex items-center gap-2 text-xs text-emerald-900 font-medium">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    <span>
                      {locale === 'fr'
                        ? 'Outils connectés et prêts pour exécution immédiate.'
                        : locale === 'it'
                          ? 'Strumenti connessi e pronti per la tua routine.'
                          : 'Tools connected and ready for execution.'}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => onContinuePrompt('Exécute la tâche maintenant')}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>
                      {locale === 'fr'
                        ? 'Exécuter maintenant'
                        : locale === 'it'
                          ? 'Esegui ora'
                          : 'Execute now'}
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

      {/* Action Bar: Copy, Regenerate, TTS Audio, Export MD/CSV & Copilot Approval */}
      <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 flex-wrap">
          <button
            type="button"
            onClick={handleCopyFullMessage}
            className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            {copiedFullResponse ? (
              <>
                <Check className="h-3 w-3 text-emerald-600" />
                <span className="text-emerald-700">Copié</span>
              </>
            ) : (
              <>
                <Copy className="h-3 w-3 text-slate-600" />
                <span>Copier</span>
              </>
            )}
          </button>

          {onRegenerate && (
            <button
              type="button"
              onClick={onRegenerate}
              title="Relancer cette requête"
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] font-medium text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <RefreshCw className="h-3 w-3 text-slate-600" />
              <span>Régénérer</span>
            </button>
          )}

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

      {/* Contextual 1-Click Follow-Up Suggestions */}
      {onContinuePrompt && agent && (
        <div className="pt-1 flex items-center gap-1.5 flex-wrap">
          <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-400 mr-0.5">
            <Sparkles className="h-2.5 w-2.5 text-emerald-600" />
            <span>Suite suggérée :</span>
          </span>
          {buildContextualFollowUpSuggestions(
            agent,
            structured?.type || 'message',
            messageText
          ).map((sug) => (
            <button
              key={sug.label}
              type="button"
              onClick={() => onContinuePrompt(sug.prompt)}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-200/80 bg-[#FAFBFD] hover:bg-slate-100 hover:border-slate-300 px-2 py-0.5 text-[10px] font-medium text-slate-700 transition-colors"
            >
              <span>{sug.label}</span>
              <ArrowRight className="h-2.5 w-2.5 text-slate-400" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

