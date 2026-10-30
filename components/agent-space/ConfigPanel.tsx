'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  Shuffle,
  Save,
  Monitor,
  Play,
  Pause,
  Maximize2,
  Plus,
  Unplug,
  MoreVertical,
  Edit3,
  Trash2,
  Power,
  CheckCircle2,
  Clock,
  Loader2,
  AlertTriangle,
  RefreshCw,
  FileText,
  Table,
  Send,
  ExternalLink,
  Zap,
} from 'lucide-react';
import { AgentConfig, AgentRoutine } from '@/lib/types';
import {
  buildDiceBearAvatarUrl,
  formatTimeDisplay,
  getRemainingVmSeconds,
  getToolBySlug,
  isGoogleWorkspaceTool,
} from '@/lib/orbit-logic';
import { useOrbit } from '@/context/OrbitContext';
import { ToolIcon } from '@/components/workspace/ToolIcon';
import { LiveCalendarEvent, LiveGmailMessage } from '@/lib/workspace-server';

export type ConfigTab = 'settings' | 'tools' | 'schedule' | 'history';

export function ConfigPanel({
  agent,
  activeTab,
  setActiveTab,
}: {
  agent: AgentConfig;
  activeTab: ConfigTab;
  setActiveTab: (tab: ConfigTab) => void;
}) {
  const router = useRouter();
  const {
    routinesByAgent,
    executionsByAgent,
    updateAgentConfig,
    deleteAgent,
    disconnectToolFromAgent,
    openMarketplace,
    setVmStatusForAgent,
    openVmModal,
    toggleRoutineActive,
    deleteRoutine,
    startEditingRoutine,
    runRoutineNow,
    runHourlyCronCheck,
    workspaceToken,
    connectGoogleWorkspaceOAuth,
    slackWebhookUrl,
    setSlackWebhookUrl,
    autoSchedulerEnabled,
    setAutoSchedulerEnabled,
    lastSchedulerTick,
    scheduleRoutineInSeconds,
    locale,
    t,
    addToast,
  } = useOrbit();

  const [nameInput, setNameInput] = useState(agent.name);
  const [descInput, setDescInput] = useState(agent.description);
  const [avatarUrl, setAvatarUrl] = useState(agent.agentImage);
  const [savingConfig, setSavingConfig] = useState(false);

  const [openMenuRoutineId, setOpenMenuRoutineId] = useState<string | null>(null);
  const [confirmRunRoutine, setConfirmRunRoutine] = useState<AgentRoutine | null>(null);
  const [runningRoutineId, setRunningRoutineId] = useState<string | null>(null);
  const [confirmToggleRoutine, setConfirmToggleRoutine] = useState<AgentRoutine | null>(null);
  const [confirmDeleteRoutine, setConfirmDeleteRoutine] = useState<AgentRoutine | null>(null);
  const [confirmDeleteAgent, setConfirmDeleteAgent] = useState(false);
  const [cronRunning, setCronRunning] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [nowMs, setNowMs] = useState<number>(0);

  // Live Google Workspace & Slack state
  const [syncingWorkspace, setSyncingWorkspace] = useState(false);
  const [liveGmailList, setLiveGmailList] = useState<LiveGmailMessage[]>([]);
  const [liveCalendarList, setLiveCalendarList] = useState<LiveCalendarEvent[]>([]);
  const [createdWorkspaceUrl, setCreatedWorkspaceUrl] = useState<{
    label: string;
    url: string;
  } | null>(null);
  const [pendingWorkspaceMutation, setPendingWorkspaceMutation] = useState<
    'create_doc' | 'create_sheet' | 'post_slack' | null
  >(null);
  const [executingMutation, setExecutingMutation] = useState(false);
  const [slackWebhookInput, setSlackWebhookInput] = useState(slackWebhookUrl);

  useEffect(() => {
    setNameInput(agent.name);
    setDescInput(agent.description);
    setAvatarUrl(agent.agentImage);
  }, [agent.agentId, agent.name, agent.description, agent.agentImage]);

  useEffect(() => {
    setSlackWebhookInput(slackWebhookUrl);
  }, [slackWebhookUrl]);

  useEffect(() => {
    setMounted(true);
    setNowMs(Date.now());
    const timer = setInterval(() => setNowMs(Date.now()), 1000);
    return () => clearInterval(timer);
  }, []);

  const routines = routinesByAgent[agent.agentId] || [];
  const executions = executionsByAgent[agent.agentId] || [];
  const remainingVmSeconds = mounted
    ? getRemainingVmSeconds(agent.vmStatus, agent.vmLastActive, nowMs)
    : 120;

  const hasGoogleTool = agent.tools.some((slug) => isGoogleWorkspaceTool(slug));
  const hasSlackTool = agent.tools.includes('slack');

  const handleShuffleAvatar = () => {
    const randomSeed =
      typeof crypto !== 'undefined' && crypto.randomUUID
        ? crypto.randomUUID()
        : `seed_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    setAvatarUrl(buildDiceBearAvatarUrl(randomSeed));
  };

  const handleSaveConfig = async () => {
    setSavingConfig(true);
    await updateAgentConfig(agent.agentId, {
      name: nameInput,
      description: descInput,
      agentImage: avatarUrl,
    });
    setSavingConfig(false);
  };

  const handleConfirmRunNow = async () => {
    if (!confirmRunRoutine) return;
    const target = confirmRunRoutine;
    setConfirmRunRoutine(null);
    setRunningRoutineId(target.routineId);
    await new Promise((r) => setTimeout(r, 350));
    await runRoutineNow(agent.agentId, target.routineId, 'manual');
    setRunningRoutineId(null);
  };

  const handleDeleteAgentConfirm = async () => {
    const targetId = agent.agentId;
    await deleteAgent(targetId);
    router.push('/workspace');
  };

  const handleSyncLiveWorkspace = async () => {
    let token = workspaceToken;
    if (!token) {
      token = await connectGoogleWorkspaceOAuth();
    }
    if (!token) return;

    setSyncingWorkspace(true);
    try {
      const res = await fetch('/api/workspace', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }
      const data = await res.json();
      setLiveGmailList(data.gmailMessages || []);
      setLiveCalendarList(data.calendarEvents || []);
      addToast({
        title: 'Google Workspace Synchronisé',
        description: `${(data.gmailMessages || []).length} e-mails Gmail · ${(data.calendarEvents || []).length} événements Agenda`,
        type: 'success',
      });
    } catch (err) {
      console.error('Workspace sync error:', err);
      addToast({
        title: 'Erreur de synchronisation Google Workspace',
        description:
          locale === 'fr'
            ? 'Veuillez réautoriser votre session Google OAuth.'
            : 'Please re-authorize your Google OAuth session.',
        type: 'error',
      });
    } finally {
      setSyncingWorkspace(false);
    }
  };

  const handleConfirmWorkspaceMutation = async () => {
    if (!pendingWorkspaceMutation) return;
    const action = pendingWorkspaceMutation;
    setExecutingMutation(true);

    try {
      if (action === 'post_slack') {
        const res = await fetch('/api/workspace', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'post_slack',
            slackWebhookUrl: slackWebhookInput,
            slackText: `*[Orbit Agent: ${agent.name}]* Test de connexion en direct réussi (${new Date().toLocaleTimeString()}).`,
          }),
        });
        const data = await res.json();
        if (!res.ok || !data.delivered) {
          throw new Error(data.error || 'Slack Webhook error');
        }
        addToast({
          title: 'Message Slack envoyé',
          description: 'Votre canal Slack a reçu la notification en direct.',
          type: 'success',
        });
        setPendingWorkspaceMutation(null);
        return;
      }

      let token = workspaceToken;
      if (!token) {
        token = await connectGoogleWorkspaceOAuth();
      }
      if (!token) {
        setPendingWorkspaceMutation(null);
        return;
      }

      const latestSummary =
        executions[0]?.summary ||
        agent.description ||
        'Rapport généré par Orbit AI Agent.';

      const res = await fetch('/api/workspace', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action,
          title: `${agent.name} — ${new Date().toLocaleDateString()}`,
          content: latestSummary,
          rows: [
            ['Date', 'Agent', 'Résumé Exécutif'],
            [new Date().toISOString(), agent.name, latestSummary],
          ],
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Google Workspace write failed');
      }

      setCreatedWorkspaceUrl({
        label: action === 'create_doc' ? 'Google Doc créé' : 'Google Sheet créé',
        url: data.url,
      });
      addToast({
        title: action === 'create_doc' ? 'Google Doc créé' : 'Google Sheet créé',
        description: data.title,
        type: 'success',
      });
    } catch (err) {
      console.error('Workspace mutation failed:', err);
      addToast({
        title: 'Échec de l’opération',
        description: err instanceof Error ? err.message : 'Erreur API',
        type: 'error',
      });
    } finally {
      setExecutingMutation(false);
      setPendingWorkspaceMutation(null);
    }
  };

  return (
    <aside className="w-[410px] shrink-0 border-l border-slate-200 bg-slate-50/60 flex flex-col h-screen overflow-hidden">
      {/* Top Agent Identity & Save Header */}
      <div className="p-4 border-b border-slate-200 bg-white space-y-3">
        <div className="flex items-center justify-between gap-2">
          <span className="text-xs font-bold text-slate-900">
            {t.config.headerTitle}
          </span>
          <button
            type="button"
            disabled={savingConfig}
            onClick={handleSaveConfig}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors whitespace-nowrap"
          >
            <Save className="h-3.5 w-3.5" />
            <span>{savingConfig ? t.config.savingBtn : t.config.saveBtn}</span>
          </button>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative h-12 w-12 rounded-full overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
            <Image
              src={avatarUrl}
              alt={nameInput}
              fill
              sizes="48px"
              referrerPolicy="no-referrer"
              className="object-cover"
            />
          </div>
          <div className="flex-1 min-w-0 space-y-1.5">
            <input
              type="text"
              value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              aria-label="Agent Name"
              className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900"
            />
            <button
              type="button"
              onClick={handleShuffleAvatar}
              className="inline-flex items-center gap-1.5 text-[11px] font-medium text-slate-600 hover:text-slate-900 transition-colors"
            >
              <Shuffle className="h-3 w-3" />
              <span>{t.config.shuffleAvatar}</span>
            </button>
          </div>
        </div>

        {/* 4 Segmented Tabs */}
        <div className="grid grid-cols-4 gap-1 p-1 bg-slate-100 rounded-lg">
          {(
            [
              { id: 'settings', label: t.config.tabSettings },
              { id: 'tools', label: `${t.config.tabTools} (${agent.tools.length})` },
              { id: 'schedule', label: `${t.config.tabSchedule} (${routines.length})` },
              { id: 'history', label: `${t.config.tabHistory} (${executions.length})` },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`px-1 py-1.5 text-[11px] font-medium rounded-md transition-colors whitespace-nowrap truncate ${
                activeTab === tab.id
                  ? 'bg-white text-slate-900 shadow-2xs font-semibold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* TAB 1: SETTINGS */}
        {activeTab === 'settings' && (
          <>
            {/* E2B Cloud VM Desktop Sandbox Widget */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Monitor className="h-4 w-4 text-slate-800" />
                  <span className="text-xs font-bold text-slate-900">
                    {t.config.vmTitle}
                  </span>
                </div>
                <span
                  className={`text-[11px] font-mono tabular-nums font-medium ${
                    agent.vmStatus === 'active'
                      ? 'text-emerald-700'
                      : agent.vmStatus === 'paused'
                        ? 'text-amber-700'
                        : 'text-slate-500'
                  }`}
                >
                  {agent.vmStatus === 'active'
                    ? mounted
                      ? `${t.config.vmActive} (${Math.floor(remainingVmSeconds / 60)}:${String(
                          remainingVmSeconds % 60
                        ).padStart(2, '0')})`
                      : t.config.vmActive
                    : agent.vmStatus === 'paused'
                      ? t.config.vmPaused
                      : t.config.vmInactive}
                </span>
              </div>

              {agent.vmStatus === 'active' ? (
                <div
                  onClick={() => openVmModal(agent.agentId)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') openVmModal(agent.agentId);
                  }}
                  aria-label={t.config.vmOpenFullBtn}
                  className="group relative h-36 rounded-lg border border-slate-800 bg-slate-950 p-3 text-slate-200 flex flex-col justify-between cursor-pointer overflow-hidden"
                >
                  <div className="flex items-center justify-between text-[10px] font-mono text-slate-400">
                    <span>{agent.sandboxId} · Chrome :0</span>
                    <span className="text-emerald-400">{t.config.vmLiveStream}</span>
                  </div>
                  <div className="my-auto space-y-1 font-mono text-[11px]">
                    <p className="text-white font-semibold truncate">
                      https://news.google.com/search?q=AI
                    </p>
                    <p className="text-slate-400 text-[10px] line-clamp-2">
                      {t.config.vmSessionNote}
                    </p>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-slate-300 pt-1 border-t border-slate-800">
                    <span>{t.config.vmClickFull}</span>
                    <Maximize2 className="h-3.5 w-3.5 group-hover:scale-110 transition-transform" />
                  </div>
                </div>
              ) : (
                <div className="h-36 rounded-lg border border-slate-200 bg-slate-900 p-4 text-center flex flex-col items-center justify-center">
                  <p className="text-xs font-semibold text-white">
                    VM Sandbox ({agent.vmStatus === 'paused' ? t.config.vmPaused : t.config.vmInactive})
                  </p>
                  <p className="text-[11px] text-slate-400 mt-1">
                    {agent.sandboxId} · {t.config.vmAutoPauseNote}
                  </p>
                  <button
                    type="button"
                    onClick={() => setVmStatusForAgent(agent.agentId, 'active')}
                    className="mt-2.5 inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-semibold text-slate-900 hover:bg-slate-100 transition-colors"
                  >
                    <Play className="h-3.5 w-3.5" />
                    <span>
                      {agent.vmStatus === 'paused'
                        ? t.config.vmReactivate
                        : t.config.vmStart}
                    </span>
                  </button>
                </div>
              )}

              <div className="flex items-center justify-between gap-2 pt-0.5">
                <button
                  type="button"
                  onClick={async () => {
                    if (agent.vmStatus !== 'active') {
                      await setVmStatusForAgent(agent.agentId, 'active');
                    }
                    openVmModal(agent.agentId);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-100 transition-colors"
                >
                  <Maximize2 className="h-3.5 w-3.5" />
                  <span>{t.config.vmOpenFullBtn}</span>
                </button>
                {agent.vmStatus === 'active' && (
                  <button
                    type="button"
                    onClick={() => setVmStatusForAgent(agent.agentId, 'paused')}
                    className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                  >
                    <Pause className="h-3.5 w-3.5" />
                    <span>{t.config.vmPauseBtn}</span>
                  </button>
                )}
              </div>
            </div>

            {/* Combined Description & Instructions Field */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2">
              <label
                htmlFor="agent-instructions-textarea"
                className="block text-xs font-bold text-slate-900"
              >
                {t.config.instructionsLabel}
              </label>
              <p className="text-[11px] text-slate-500">
                {t.config.instructionsSub} ({agent.name})
              </p>
              <textarea
                id="agent-instructions-textarea"
                rows={4}
                value={descInput}
                onChange={(e) => setDescInput(e.target.value)}
                className="w-full rounded-lg border border-slate-200 bg-slate-50 p-2.5 text-xs text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900 leading-relaxed"
              />
            </div>

            {/* Agent Management & Danger Zone */}
            <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3">
              <h4 className="text-xs font-bold text-slate-900">
                {t.config.managementTitle}
              </h4>
              <div className="flex items-center justify-between gap-2">
                <div>
                  <p className="text-xs font-medium text-slate-800">
                    {t.config.agentStatusLabel} ({agent.isActive ? t.config.vmActive : t.config.vmPaused})
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {t.config.agentStatusSub}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    updateAgentConfig(agent.agentId, { isActive: !agent.isActive })
                  }
                  className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-800 hover:bg-slate-100 transition-colors whitespace-nowrap"
                >
                  <Power className="h-3.5 w-3.5" />
                  <span>
                    {agent.isActive ? t.config.pauseAgentBtn : t.config.activateAgentBtn}
                  </span>
                </button>
              </div>

              <div className="pt-3 border-t border-slate-200">
                <p className="text-xs font-semibold text-red-700">
                  {t.config.dangerZone}
                </p>
                {!confirmDeleteAgent ? (
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteAgent(true)}
                    className="mt-2 w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 hover:bg-red-100 transition-colors"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>{t.config.deleteAgentBtn}</span>
                  </button>
                ) : (
                  <div className="mt-2 rounded-lg border border-red-200 bg-red-50 p-2.5 space-y-2">
                    <p className="text-xs text-red-800 font-medium">
                      {t.config.deleteConfirmPrompt} ({agent.name})
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleDeleteAgentConfirm}
                        className="flex-1 rounded-md bg-red-600 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                      >
                        {t.config.confirmDeleteBtn}
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteAgent(false)}
                        className="flex-1 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700"
                      >
                        {t.config.cancelBtn}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {/* TAB 2: CONNECTED TOOLS & LIVE OAUTH / SLACK HUB */}
        {activeTab === 'tools' && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  {t.config.connectedToolsTitle} ({agent.tools.length})
                </h4>
                <p className="text-[11px] text-slate-500 font-mono">
                  Session: {agent.composioSessionId || 'sess_comp_active'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => openMarketplace(agent.agentId)}
                className="inline-flex items-center gap-1 rounded-lg bg-slate-900 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>{t.config.addToolBtn}</span>
              </button>
            </div>

            {/* Mandatory Explicit User Confirmation Modal for Mutating Workspace / Slack Operations */}
            {pendingWorkspaceMutation && (
              <div className="rounded-xl border border-slate-900 bg-white p-3.5 space-y-2.5 shadow-sm">
                <p className="text-xs font-bold text-slate-900">
                  {pendingWorkspaceMutation === 'create_doc'
                    ? locale === 'fr'
                      ? 'Confirmer la création d’un document Google Docs ?'
                      : locale === 'it'
                        ? 'Confermare la creazione di un documento Google Docs?'
                        : 'Confirm creating a new Google Doc?'
                    : pendingWorkspaceMutation === 'create_sheet'
                      ? locale === 'fr'
                        ? 'Confirmer la création d’une feuille Google Sheets ?'
                        : locale === 'it'
                          ? 'Confermare la creazione di un foglio Google Sheets?'
                          : 'Confirm creating a new Google Sheet?'
                      : locale === 'fr'
                        ? 'Confirmer l’envoi d’un message sur votre canal Slack ?'
                        : locale === 'it'
                          ? 'Confermare l’invio di un messaggio sul tuo canale Slack?'
                          : 'Confirm sending a message to your Slack channel?'}
                </p>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  {pendingWorkspaceMutation === 'post_slack'
                    ? locale === 'fr'
                      ? `Un message de synthèse de l'agent "${agent.name}" sera publié sur votre Webhook Slack configuré.`
                      : `An agent digest from "${agent.name}" will be posted to your configured Slack Webhook.`
                    : locale === 'fr'
                      ? `Le fichier "${agent.name} — ${new Date().toLocaleDateString()}" sera créé et mis à jour dans votre compte Google Workspace.`
                      : `The file "${agent.name} — ${new Date().toLocaleDateString()}" will be created and populated in your Google Workspace account.`}
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    disabled={executingMutation}
                    onClick={handleConfirmWorkspaceMutation}
                    className="flex-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    {executingMutation
                      ? locale === 'fr'
                        ? 'Exécution...'
                        : 'Executing...'
                      : t.config.confirmBtn}
                  </button>
                  <button
                    type="button"
                    disabled={executingMutation}
                    onClick={() => setPendingWorkspaceMutation(null)}
                    className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700"
                  >
                    {t.config.cancelBtn}
                  </button>
                </div>
              </div>
            )}

            {/* Google Workspace Live OAuth Card */}
            {hasGoogleTool && (
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-slate-900">
                      Google Workspace OAuth
                    </p>
                    <p className="text-[11px] text-slate-500">
                      Gmail · Calendar · Docs · Sheets
                    </p>
                  </div>
                  {workspaceToken ? (
                    <span className="text-[11px] font-semibold text-emerald-700">
                      OAuth Actif
                    </span>
                  ) : (
                    <button
                      type="button"
                      onClick={connectGoogleWorkspaceOAuth}
                      className="gsi-material-button inline-flex items-center gap-1.5 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-800 hover:bg-slate-50 shadow-2xs"
                    >
                      <svg
                        version="1.1"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 48 48"
                        className="h-3.5 w-3.5 shrink-0"
                      >
                        <path
                          fill="#EA4335"
                          d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                        />
                        <path
                          fill="#4285F4"
                          d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                        />
                        <path
                          fill="#FBBC05"
                          d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                        />
                        <path
                          fill="#34A853"
                          d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                        />
                      </svg>
                      <span>Sign in with Google</span>
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-3 gap-1.5">
                  <button
                    type="button"
                    disabled={syncingWorkspace}
                    onClick={handleSyncLiveWorkspace}
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-medium text-slate-800 hover:bg-slate-100"
                  >
                    <RefreshCw
                      className={`h-3 w-3 ${syncingWorkspace ? 'animate-spin' : ''}`}
                    />
                    <span>Gmail/Cal</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingWorkspaceMutation('create_doc')}
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-medium text-slate-800 hover:bg-slate-100"
                  >
                    <FileText className="h-3 w-3" />
                    <span>+ Doc</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setPendingWorkspaceMutation('create_sheet')}
                    className="inline-flex items-center justify-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1.5 text-[11px] font-medium text-slate-800 hover:bg-slate-100"
                  >
                    <Table className="h-3 w-3" />
                    <span>+ Sheet</span>
                  </button>
                </div>

                {createdWorkspaceUrl && (
                  <a
                    href={createdWorkspaceUrl.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-medium text-emerald-800 hover:bg-emerald-100"
                  >
                    <span>{createdWorkspaceUrl.label}</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}

                {liveGmailList.length > 0 && (
                  <div className="space-y-1.5 pt-1 border-t border-slate-100">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Gmail ({liveGmailList.length})
                    </p>
                    {liveGmailList.slice(0, 3).map((m) => (
                      <div
                        key={m.id}
                        className="rounded-lg bg-slate-50 p-2 text-[11px] border border-slate-100"
                      >
                        <p className="font-semibold text-slate-900 truncate">{m.subject}</p>
                        <p className="text-slate-500 truncate">{m.from}</p>
                      </div>
                    ))}
                  </div>
                )}

                {liveCalendarList.length > 0 && (
                  <div className="space-y-1.5 pt-1 border-t border-slate-100">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                      Google Calendar ({liveCalendarList.length})
                    </p>
                    {liveCalendarList.slice(0, 3).map((ev) => (
                      <div
                        key={ev.id}
                        className="rounded-lg bg-slate-50 p-2 text-[11px] border border-slate-100"
                      >
                        <p className="font-semibold text-slate-900 truncate">{ev.summary}</p>
                        <p className="text-slate-500 font-mono text-[10px]">{ev.start}</p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Real Slack Webhook Card */}
            {hasSlackTool && (
              <div className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5">
                <p className="text-xs font-bold text-slate-900">
                  Slack Incoming Webhook
                </p>
                <div className="flex items-center gap-1.5">
                  <input
                    type="url"
                    value={slackWebhookInput}
                    onChange={(e) => setSlackWebhookInput(e.target.value)}
                    placeholder="https://hooks.slack.com/services/..."
                    aria-label="Slack Webhook URL"
                    className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-mono text-slate-900 focus:bg-white focus:outline-none focus:border-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      setSlackWebhookUrl(slackWebhookInput);
                      addToast({
                        title: 'Webhook Slack enregistré',
                        type: 'success',
                      });
                    }}
                    className="rounded-lg bg-slate-900 px-2.5 py-1.5 text-[11px] font-semibold text-white hover:bg-slate-800 shrink-0"
                  >
                    OK
                  </button>
                </div>
                {slackWebhookInput.startsWith('https://hooks.slack.com/') && (
                  <button
                    type="button"
                    onClick={() => setPendingWorkspaceMutation('post_slack')}
                    className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-medium text-slate-800 hover:bg-slate-100"
                  >
                    <Send className="h-3 w-3" />
                    <span>
                      {locale === 'fr'
                        ? 'Tester l’envoi Slack en direct'
                        : locale === 'it'
                          ? 'Testa invio Slack dal vivo'
                          : 'Test live Slack delivery'}
                    </span>
                  </button>
                )}
              </div>
            )}

            {agent.tools.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center space-y-2">
                <p className="text-xs font-semibold text-slate-800">
                  {t.config.noToolsTitle}
                </p>
                <p className="text-xs text-slate-500">
                  {t.config.noToolsSub}
                </p>
                <button
                  type="button"
                  onClick={() => openMarketplace(agent.agentId)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                >
                  <Plus className="h-3.5 w-3.5" />
                  <span>{t.config.browseMarketplaceBtn}</span>
                </button>
              </div>
            ) : (
              <div className="space-y-2.5">
                {agent.tools.map((slug) => {
                  const info = getToolBySlug(slug);
                  return (
                    <div
                      key={slug}
                      className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="h-8 w-8 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
                          <ToolIcon slug={slug} className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-slate-900 truncate">
                            {info?.name || slug.toUpperCase()}
                          </p>
                          <p className="text-[11px] text-emerald-700 font-medium">
                            {isGoogleWorkspaceTool(slug) && workspaceToken
                              ? 'Google Workspace OAuth Actif'
                              : slug === 'slack' && slackWebhookUrl
                                ? 'Slack Webhook Actif'
                                : t.config.activeMcpAccess}
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => disconnectToolFromAgent(agent.agentId, slug)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors whitespace-nowrap shrink-0"
                      >
                        <Unplug className="h-3 w-3" />
                        <span>{t.marketplace.disconnectBtn}</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 3: SCHEDULE / ROUTINES */}
        {activeTab === 'schedule' && (
          <div className="space-y-3">
            {/* Real-Time Auto-Scheduler Status Banner */}
            <div className="rounded-xl border border-slate-200 bg-white p-3 flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <span
                    className={`h-2 w-2 rounded-full ${
                      autoSchedulerEnabled ? 'bg-emerald-500' : 'bg-slate-300'
                    }`}
                  />
                  <p className="text-xs font-bold text-slate-900">
                    {locale === 'fr'
                      ? 'Auto-Scheduler Temps Réel'
                      : locale === 'it'
                        ? 'Auto-Scheduler Tempo Reale'
                        : 'Real-Time Auto-Scheduler'}
                  </p>
                </div>
                <p className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
                  {autoSchedulerEnabled
                    ? `${locale === 'fr' ? 'Actif · Vérif. auto (5s)' : 'Active · 5s tick'}${
                        lastSchedulerTick ? ` · ${lastSchedulerTick}` : ''
                      }`
                    : locale === 'fr'
                      ? 'En pause'
                      : 'Paused'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setAutoSchedulerEnabled(!autoSchedulerEnabled)}
                className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-semibold text-slate-800 hover:bg-slate-100 shrink-0"
              >
                {autoSchedulerEnabled
                  ? locale === 'fr'
                    ? 'Désactiver'
                    : 'Disable'
                  : locale === 'fr'
                    ? 'Activer'
                    : 'Enable'}
              </button>
            </div>

            <div className="flex items-center justify-between gap-2">
              <div>
                <h4 className="text-xs font-bold text-slate-900">
                  {t.config.scheduledRoutinesTitle} ({routines.length})
                </h4>
                <p className="text-[11px] text-slate-500">
                  {t.config.inngestSub}
                </p>
              </div>
              <button
                type="button"
                disabled={cronRunning}
                onClick={async () => {
                  setCronRunning(true);
                  await runHourlyCronCheck(agent.agentId);
                  setCronRunning(false);
                }}
                title={t.config.invokeCronBtn}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap"
              >
                <RefreshCw
                  className={`h-3 w-3 ${cronRunning ? 'animate-spin' : ''}`}
                />
                <span>{t.config.invokeCronBtn}</span>
              </button>
            </div>

            {confirmRunRoutine && (
              <div className="rounded-xl border border-slate-900 bg-white p-3.5 space-y-2.5 shadow-sm">
                <p className="text-xs font-bold text-slate-900">
                  {t.config.runNowPrompt} &quot;{confirmRunRoutine.name}&quot; ?
                </p>
                <p className="text-xs text-slate-600">
                  {t.config.runNowSub}{' '}
                  <span className="font-mono font-semibold">
                    {confirmRunRoutine.targetChannel}
                  </span>
                  .
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleConfirmRunNow}
                    className="flex-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                  >
                    {t.config.runBtn}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmRunRoutine(null)}
                    className="flex-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-700"
                  >
                    {t.config.cancelBtn}
                  </button>
                </div>
              </div>
            )}

            {confirmToggleRoutine && (
              <div className="rounded-xl border border-amber-300 bg-amber-50 p-3.5 space-y-2">
                <p className="text-xs font-bold text-amber-950">
                  {confirmToggleRoutine.isActive
                    ? t.config.deactivateRoutine
                    : t.config.activateRoutine}{' '}
                  &quot;{confirmToggleRoutine.name}&quot; ?
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const target = confirmToggleRoutine;
                      setConfirmToggleRoutine(null);
                      await toggleRoutineActive(
                        agent.agentId,
                        target.routineId,
                        !target.isActive
                      );
                    }}
                    className="flex-1 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    {t.config.confirmBtn}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmToggleRoutine(null)}
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
                  >
                    {t.config.cancelBtn}
                  </button>
                </div>
              </div>
            )}

            {confirmDeleteRoutine && (
              <div className="rounded-xl border border-red-200 bg-red-50 p-3.5 space-y-2">
                <p className="text-xs font-bold text-red-900">
                  {t.config.deleteRoutine} &quot;{confirmDeleteRoutine.name}&quot; ?
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const target = confirmDeleteRoutine;
                      setConfirmDeleteRoutine(null);
                      await deleteRoutine(agent.agentId, target.routineId);
                    }}
                    className="flex-1 rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    {t.config.deleteRoutine}
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteRoutine(null)}
                    className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700"
                  >
                    {t.config.cancelBtn}
                  </button>
                </div>
              </div>
            )}

            {routines.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center space-y-1.5">
                <p className="text-xs font-semibold text-slate-800">
                  {t.config.noRoutinesTitle}
                </p>
                <p className="text-xs text-slate-500">
                  {t.config.noRoutinesSub}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {routines.map((rt) => {
                  const isRunningThis = runningRoutineId === rt.routineId;
                  return (
                    <div
                      key={rt.routineId}
                      className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5 relative"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5 text-[11px]">
                            <span
                              className={`font-semibold ${
                                rt.isActive ? 'text-emerald-700' : 'text-slate-400'
                              }`}
                            >
                              {rt.isActive ? t.config.vmActive : t.config.vmInactive}
                            </span>
                            <span className="text-slate-300">·</span>
                            <span className="capitalize text-slate-600">
                              {rt.frequency} · {formatTimeDisplay(rt.time)}
                            </span>
                          </div>
                          <h5 className="text-xs font-bold text-slate-900 mt-0.5">
                            {rt.name}
                          </h5>
                        </div>

                        <div className="relative">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenMenuRoutineId(
                                openMenuRoutineId === rt.routineId ? null : rt.routineId
                              )
                            }
                            aria-label={`Manage ${rt.name}`}
                            className="p-1 rounded-md text-slate-400 hover:text-slate-800 hover:bg-slate-100"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>

                          {openMenuRoutineId === rt.routineId && (
                            <div className="absolute right-0 top-7 z-20 w-44 rounded-lg border border-slate-200 bg-white py-1 shadow-lg text-xs">
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuRoutineId(null);
                                  startEditingRoutine(agent.agentId, rt);
                                }}
                                className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              >
                                <Edit3 className="h-3.5 w-3.5" />
                                <span>{t.config.editInChat}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuRoutineId(null);
                                  setConfirmToggleRoutine(rt);
                                }}
                                className="w-full px-3 py-1.5 text-left text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                              >
                                <Power className="h-3.5 w-3.5" />
                                <span>
                                  {rt.isActive
                                    ? t.config.deactivateRoutine
                                    : t.config.activateRoutine}
                                </span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setOpenMenuRoutineId(null);
                                  setConfirmDeleteRoutine(rt);
                                }}
                                className="w-full px-3 py-1.5 text-left text-red-600 hover:bg-red-50 flex items-center gap-2"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                                <span>{t.config.deleteRoutine}</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      <p className="text-xs text-slate-600 line-clamp-2">
                        {rt.instructions}
                      </p>

                      <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                        <span className="font-mono tabular-nums">
                          {t.config.nextLabel}:{' '}
                          {new Date(rt.nextRunAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                            second: '2-digit',
                          })}
                        </span>
                        <span className="font-mono text-slate-700">
                          {rt.targetChannel}
                        </span>
                      </div>

                      <div className="flex items-center justify-between gap-2 pt-1">
                        <div className="flex items-center gap-1.5">
                          {rt.tools.map((slug) => (
                            <div
                              key={slug}
                              title={slug}
                              className="h-6 w-6 rounded border border-slate-200 bg-slate-50 flex items-center justify-center"
                            >
                              <ToolIcon slug={slug} className="h-3.5 w-3.5" />
                            </div>
                          ))}
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() =>
                              scheduleRoutineInSeconds(agent.agentId, rt.routineId, 5)
                            }
                            title={
                              locale === 'fr'
                                ? 'Programmer une exécution automatique dans 5 secondes'
                                : 'Schedule automatic execution in 5 seconds'
                            }
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap"
                          >
                            <Zap className="h-3 w-3 text-amber-600" />
                            <span>Auto (5s)</span>
                          </button>

                          <button
                            type="button"
                            disabled={isRunningThis}
                            onClick={() => setConfirmRunRoutine(rt)}
                            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors whitespace-nowrap"
                          >
                            {isRunningThis ? (
                              <>
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                <span>{t.config.runningInngest}</span>
                              </>
                            ) : (
                              <>
                                <Play className="h-3 w-3" />
                                <span>{t.config.runNowBtn}</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* TAB 4: ROUTINE EXECUTION HISTORY */}
        {activeTab === 'history' && (
          <div className="space-y-3">
            <div>
              <h4 className="text-xs font-bold text-slate-900">
                {t.config.historyTitle} ({executions.length})
              </h4>
              <p className="text-[11px] text-slate-500">
                {t.config.historySub}
              </p>
            </div>

            {executions.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-200 bg-white p-6 text-center">
                <p className="text-xs text-slate-500">
                  {t.config.noHistory}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {executions.map((exec) => (
                  <div
                    key={exec.executionId}
                    className="rounded-xl border border-slate-200 bg-white p-3.5 space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-1.5 text-[11px]">
                          {exec.status === 'completed' ? (
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                          ) : (
                            <AlertTriangle className="h-3.5 w-3.5 text-red-600" />
                          )}
                          <span className="font-semibold capitalize text-slate-900">
                            {exec.status}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="capitalize text-slate-500">
                            {exec.triggerType}
                          </span>
                        </div>
                        <h5 className="text-xs font-bold text-slate-900 mt-0.5">
                          {exec.routineName}
                        </h5>
                      </div>
                      <span className="text-[10px] font-mono tabular-nums text-slate-500 flex items-center gap-1 shrink-0">
                        <Clock className="h-3 w-3" />
                        <span>
                          {new Date(exec.completedAt).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit',
                          })}
                        </span>
                      </span>
                    </div>

                    <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 rounded-lg p-2.5 border border-slate-100">
                      {exec.summary}
                    </p>

                    <div className="space-y-1 pt-1">
                      <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        {t.config.pipelineLabel}
                      </p>
                      {exec.stepsLog.map((st) => (
                        <div
                          key={st.stepKey}
                          className="flex items-center justify-between text-[11px] text-slate-600 py-0.5"
                        >
                          <span className="truncate">{st.label}</span>
                          <span className="font-mono tabular-nums text-[10px] text-emerald-700 shrink-0 ml-2">
                            {st.durationMs}ms
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
