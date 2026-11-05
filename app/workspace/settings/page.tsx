'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Settings,
  KeyRound,
  Blocks,
  Cpu,
  UserCheck,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  RefreshCw,
  Play,
  Pause,
  Monitor,
  Download,
  Trash2,
  RotateCcw,
  Globe,
  ShieldCheck,
  Sparkles,
  ArrowLeft,
  Save,
  Send,
  Store,
} from 'lucide-react';
import { useOrbit } from '@/context/OrbitContext';
import { FreeApiRouterPanel } from '@/components/workspace/FreeApiRouterPanel';
import { ToolIcon } from '@/components/workspace/ToolIcon';
import {
  evaluateToolConnectionReadiness,
  TOOL_CATALOG,
} from '@/lib/orbit-logic';
import {
  AgentModelId,
  FreeAgentApiProviderId,
  VmTimeoutOption,
} from '@/lib/types';

type SettingsSectionId = 'apis' | 'integrations' | 'runtime' | 'system';

export default function WorkspaceSettingsPage() {
  const {
    user,
    locale,
    setLocale,
    agents,
    routinesByAgent,
    executionsByAgent,
    updateAgentConfig,
    setVmStatusForAgent,
    openVmModal,
    openMarketplace,
    runHourlyCronCheck,
    clearAgentChat,
    workspaceToken,
    connectGoogleWorkspaceOAuth,
    slackWebhookUrl,
    setSlackWebhookUrl,
    githubRepo,
    setGithubRepo,
    githubToken,
    setGithubToken,
    notionToken,
    setNotionToken,
    notionParentId,
    setNotionParentId,
    toolCredentials,
    setToolCredential,
    freeApiProviders,
    autoSchedulerEnabled,
    setAutoSchedulerEnabled,
    lastSchedulerTick,
    signOutUser,
    addToast,
  } = useOrbit();

  const [activeSection, setActiveSection] = useState<SettingsSectionId>('apis');

  // Local form states for global MCP integrations
  const [slackInput, setSlackInput] = useState(slackWebhookUrl);
  const [ghRepoInput, setGhRepoInput] = useState(githubRepo);
  const [ghTokenInput, setGhTokenInput] = useState(githubToken);
  const [notionTokenInput, setNotionTokenInput] = useState(notionToken);
  const [notionParentInput, setNotionParentInput] = useState(notionParentId);
  const [discordWebhookInput, setDiscordWebhookInput] = useState(
    toolCredentials.discord?.webhookUrl || ''
  );
  const [linearKeyInput, setLinearKeyInput] = useState(
    toolCredentials.linear?.apiToken || ''
  );
  const [clickupKeyInput, setClickupKeyInput] = useState(
    toolCredentials.clickup?.apiToken || ''
  );

  const [testingSlack, setTestingSlack] = useState(false);
  const [testingGithub, setTestingGithub] = useState(false);
  const [runningGlobalCron, setRunningGlobalCron] = useState(false);
  const [confirmFactoryReset, setConfirmFactoryReset] = useState(false);

  const totalHealthyApiKeys = freeApiProviders.reduce(
    (acc, p) =>
      acc + p.keys.filter((k) => k.isEnabled && k.isHealthy).length,
    0
  );

  const verifiedToolsCount = TOOL_CATALOG.filter((tool) => {
    const r = evaluateToolConnectionReadiness(
      tool.slug,
      true,
      toolCredentials,
      workspaceToken
    );
    return r.canExecuteLiveWrite;
  }).length;

  const activeVmsCount = agents.filter((a) => a.vmStatus === 'active').length;

  const handleSaveGlobalIntegrations = () => {
    setSlackWebhookUrl(slackInput.trim());
    setGithubRepo(ghRepoInput.trim());
    setGithubToken(ghTokenInput.trim());
    setNotionToken(notionTokenInput.trim());
    setNotionParentId(notionParentInput.trim());

    if (discordWebhookInput.trim()) {
      setToolCredential('discord', {
        webhookUrl: discordWebhookInput.trim(),
        verifiedAt: new Date().toISOString(),
      });
    }
    if (linearKeyInput.trim()) {
      setToolCredential('linear', {
        apiToken: linearKeyInput.trim(),
        verifiedAt: new Date().toISOString(),
      });
    }
    if (clickupKeyInput.trim()) {
      setToolCredential('clickup', {
        apiToken: clickupKeyInput.trim(),
        verifiedAt: new Date().toISOString(),
      });
    }

    addToast({
      title: 'Identifiants MCP enregistrés',
      description:
        'Vos clés et webhooks globaux ont été mis à jour pour l’ensemble des agents.',
      type: 'success',
    });
  };

  const handleTestSlackLive = async () => {
    const targetUrl = slackInput.trim();
    if (!targetUrl) {
      addToast({
        title: 'URL Webhook Slack requise',
        description: 'Collez une URL https://hooks.slack.com/services/... valide.',
        type: 'error',
      });
      return;
    }
    setTestingSlack(true);
    try {
      setSlackWebhookUrl(targetUrl);
      const res = await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'post_slack',
          slackWebhookUrl: targetUrl,
          slackText: `*[Orbit OS — Paramètres Globaux]* Test de connexion Slack réussi (${new Date().toLocaleTimeString()}).`,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.delivered) {
        throw new Error(data.error || 'Échec de l’envoi vers Slack');
      }
      addToast({
        title: 'Webhook Slack vérifié en direct',
        description: 'Le message de test a été délivré sur votre canal Slack.',
        type: 'success',
      });
    } catch (err) {
      addToast({
        title: 'Erreur Webhook Slack',
        description: err instanceof Error ? err.message : 'Échec HTTP',
        type: 'error',
      });
    } finally {
      setTestingSlack(false);
    }
  };

  const handleTestGithubLive = async () => {
    const repo = ghRepoInput.trim();
    if (!repo || !repo.includes('/')) {
      addToast({
        title: 'Format de dépôt invalide',
        description: 'Utilisez le format owner/repo (ex: vercel/next.js).',
        type: 'error',
      });
      return;
    }
    setTestingGithub(true);
    try {
      setGithubRepo(repo);
      setGithubToken(ghTokenInput.trim());
      const res = await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'fetch_github',
          githubRepo: repo,
          githubToken: ghTokenInput.trim() || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Échec de la requête GitHub API');
      }
      const count = Array.isArray(data.githubItems) ? data.githubItems.length : 0;
      addToast({
        title: 'Connexion GitHub API vérifiée',
        description: `${count} issues/PRs récupérées en direct depuis ${repo}.`,
        type: 'success',
      });
    } catch (err) {
      addToast({
        title: 'Erreur GitHub API',
        description: err instanceof Error ? err.message : 'Échec HTTP',
        type: 'error',
      });
    } finally {
      setTestingGithub(false);
    }
  };

  const handleRunGlobalCron = async () => {
    setRunningGlobalCron(true);
    try {
      let totalTriggered = 0;
      for (const ag of agents) {
        const count = await runHourlyCronCheck(ag.agentId);
        totalTriggered += count;
      }
      addToast({
        title: 'Vérification Cron Inngest terminée',
        description:
          totalTriggered > 0
            ? `${totalTriggered} routine(s) planifiée(s) exécutée(s) avec succès.`
            : 'Toutes les routines sont à jour (aucune échéance en retard).',
        type: 'info',
      });
    } finally {
      setRunningGlobalCron(false);
    }
  };

  const handleExportConfigurationJson = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      platform: 'Orbit Agentic OS',
      locale,
      agents,
      routinesByAgent,
      executionsCount: Object.values(executionsByAgent).reduce(
        (acc, list) => acc + list.length,
        0
      ),
      integrationsConfigured: {
        googleWorkspaceOAuth: Boolean(workspaceToken),
        slackWebhookConfigured: Boolean(slackWebhookUrl),
        githubRepo,
        notionConfigured: Boolean(notionToken && notionParentId),
      },
    };
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orbit-workspace-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    addToast({
      title: 'Export JSON généré',
      description: 'La sauvegarde complète de vos agents et routines a été téléchargée.',
      type: 'success',
    });
  };

  const handleClearAllChats = async () => {
    for (const ag of agents) {
      await clearAgentChat(ag.agentId);
    }
    addToast({
      title: 'Conversations réinitialisées',
      description: 'L’historique de chat de tous les agents a été purgé.',
      type: 'info',
    });
  };

  const handleFactoryResetLocal = () => {
    if (typeof window === 'undefined') return;
    window.localStorage.clear();
    window.location.href = '/workspace';
  };

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#F8FAFC]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 space-y-6">
        {/* Top Page Header */}
        <div className="flex flex-wrap items-center justify-between gap-4 bg-white rounded-2xl border border-slate-200/90 p-5 shadow-2xs">
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="h-11 w-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-xs">
              <Settings className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                  Paramètres Généraux de la Plateforme
                </h1>
                <span className="rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 font-mono text-[10px] font-semibold text-emerald-700">
                  Zéro Mock · 100% Réel
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Gérez vos clés d’APIs d’agents gratuits, vos connecteurs MCP, le moteur Cron Inngest, les VMs Cloud E2B et vos préférences système.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Link
              href={agents[0] ? `/workspace/${agents[0].agentId}` : '/workspace'}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              <span>Retour à l’Agent</span>
            </Link>
            <Link
              href="/workspace"
              className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
            >
              <span>Tableau de bord Hub</span>
            </Link>
          </div>
        </div>

        {/* Global KPI Summary Strip */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <button
            type="button"
            onClick={() => setActiveSection('apis')}
            className={`text-left rounded-2xl border p-4 transition-all ${
              activeSection === 'apis'
                ? 'border-slate-900 bg-white shadow-sm ring-1 ring-slate-900/10'
                : 'border-slate-200/90 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                1. APIs & Modèles IA
              </span>
              <KeyRound className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="mt-2 text-lg font-bold text-slate-900 font-mono tabular-nums">
              {totalHealthyApiKeys} clé{totalHealthyApiKeys > 1 ? 's' : ''} active{totalHealthyApiKeys > 1 ? 's' : ''}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              9 fournisseurs gratuits supportés
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('integrations')}
            className={`text-left rounded-2xl border p-4 transition-all ${
              activeSection === 'integrations'
                ? 'border-slate-900 bg-white shadow-sm ring-1 ring-slate-900/10'
                : 'border-slate-200/90 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                2. Connecteurs MCP
              </span>
              <Blocks className="h-4 w-4 text-indigo-600" />
            </div>
            <p className="mt-2 text-lg font-bold text-slate-900 font-mono tabular-nums">
              {verifiedToolsCount} / {TOOL_CATALOG.length} vérifiés
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Google OAuth, Slack, GitHub, Notion...
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('runtime')}
            className={`text-left rounded-2xl border p-4 transition-all ${
              activeSection === 'runtime'
                ? 'border-slate-900 bg-white shadow-sm ring-1 ring-slate-900/10'
                : 'border-slate-200/90 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                3. Cloud VM & Cron
              </span>
              <Cpu className="h-4 w-4 text-amber-600" />
            </div>
            <p className="mt-2 text-lg font-bold text-slate-900 font-mono tabular-nums">
              {activeVmsCount} VM active{activeVmsCount > 1 ? 's' : ''}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Planificateur : {autoSchedulerEnabled ? 'Actif' : 'En pause'}
            </p>
          </button>

          <button
            type="button"
            onClick={() => setActiveSection('system')}
            className={`text-left rounded-2xl border p-4 transition-all ${
              activeSection === 'system'
                ? 'border-slate-900 bg-white shadow-sm ring-1 ring-slate-900/10'
                : 'border-slate-200/90 bg-white hover:border-slate-300'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                4. Système & Compte
              </span>
              <UserCheck className="h-4 w-4 text-slate-700" />
            </div>
            <p className="mt-2 text-lg font-bold text-slate-900 uppercase font-mono">
              Langue : {locale.toUpperCase()}
            </p>
            <p className="text-[11px] text-slate-500 mt-0.5 truncate">
              {user.email}
            </p>
          </button>
        </div>

        {/* Navigation Tabs Bar */}
        <div
          role="tablist"
          aria-label="Sections des paramètres"
          className="flex flex-wrap items-center gap-1.5 rounded-2xl border border-slate-200/90 bg-white p-1.5 shadow-2xs"
        >
          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'apis'}
            onClick={() => setActiveSection('apis')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
              activeSection === 'apis'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <KeyRound className="h-4 w-4" />
            <span>1. Passerelle d’APIs Gratuits & Modèles IA</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'integrations'}
            onClick={() => setActiveSection('integrations')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
              activeSection === 'integrations'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Blocks className="h-4 w-4" />
            <span>2. Intégrations & Clés MCP (Slack, GitHub, Notion, Google)</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'runtime'}
            onClick={() => setActiveSection('runtime')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
              activeSection === 'runtime'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <Cpu className="h-4 w-4" />
            <span>3. Cloud VM Sandbox & Automatisation Inngest</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeSection === 'system'}
            onClick={() => setActiveSection('system')}
            className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition-all ${
              activeSection === 'system'
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
            }`}
          >
            <UserCheck className="h-4 w-4" />
            <span>4. Compte, Langue & Sauvegarde</span>
          </button>
        </div>

        {/* SECTION 1: FREE AGENT APIS & AI MODEL ASSIGNMENTS */}
        {activeSection === 'apis' && (
          <div className="space-y-6">
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Passerelle d’APIs d’Agents Gratuits (Vérification HTTP en direct)
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ajoutez vos vraies clés API (Google AI Studio, Groq, OpenRouter, NVIDIA NIM, HuggingFace...). Chaque clé est testée en direct avant d’être marquée comme « sain ».
                  </p>
                </div>
              </div>

              <FreeApiRouterPanel />
            </div>

            {/* Per-Agent Model & Provider Matrix */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-4">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Attribution des Modèles IA & Fournisseurs par Agent
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Configurez d’un seul coup d’œil le moteur LLM, le fournisseur d’API et la température de chacun de vos agents.
                </p>
              </div>

              <div className="divide-y divide-slate-200/80 border border-slate-200/80 rounded-xl overflow-hidden">
                {agents.map((ag) => (
                  <div
                    key={ag.agentId}
                    className="p-3.5 bg-white hover:bg-slate-50/70 transition-colors flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative h-9 w-9 rounded-full overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                        <Image
                          src={ag.agentImage}
                          alt={ag.name}
                          fill
                          sizes="36px"
                          referrerPolicy="no-referrer"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <Link
                          href={`/workspace/${ag.agentId}`}
                          className="text-xs font-bold text-slate-900 hover:underline truncate block"
                        >
                          {ag.name}
                        </Link>
                        <p className="text-[11px] text-slate-500 truncate max-w-md">
                          {ag.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        aria-label={`Modèle IA pour ${ag.name}`}
                        value={ag.model || 'gemini-3-flash-preview'}
                        onChange={(e) =>
                          updateAgentConfig(ag.agentId, {
                            model: e.target.value as AgentModelId,
                          })
                        }
                        className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-mono text-slate-800 focus:border-slate-900 focus:outline-none"
                      >
                        <option value="gemini-3-flash-preview">
                          Gemini 3 Flash (Rapide)
                        </option>
                        <option value="gemini-3.1-pro-preview">
                          Gemini 3.1 Pro (Raisonnement)
                        </option>
                        <option value="groq/llama-3.3-70b-versatile">
                          Groq · Llama 3.3 70B
                        </option>
                        <option value="openrouter/deepseek-r1-free">
                          OpenRouter · DeepSeek R1 (Free)
                        </option>
                        <option value="nvidia/llama-3.1-405b-instruct">
                          NVIDIA NIM · Llama 3.1 405B
                        </option>
                        <option value="huggingface/qwen-2.5-72b-instruct">
                          HuggingFace · Qwen 2.5 72B
                        </option>
                        <option value="router9/shared-monthly-free">
                          Router9 · Shared Free
                        </option>
                        <option value="orcarouter/free-key-v1">
                          OrcaRouter · Free
                        </option>
                        <option value="bai/promotional-free-v1">
                          B.AI · Promo
                        </option>
                        <option value="speechify/tts-multilingual-free">
                          Speechify · TTS
                        </option>
                      </select>

                      <select
                        aria-label={`Fournisseur API pour ${ag.name}`}
                        value={ag.apiProviderId || 'google_ai_studio'}
                        onChange={(e) =>
                          updateAgentConfig(ag.agentId, {
                            apiProviderId: e.target.value as FreeAgentApiProviderId,
                          })
                        }
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 focus:border-slate-900 focus:outline-none"
                      >
                        {freeApiProviders.map((p) => (
                          <option key={p.providerId} value={p.providerId}>
                            {p.name}
                          </option>
                        ))}
                      </select>

                      <Link
                        href={`/workspace/${ag.agentId}`}
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-[11px] font-semibold text-slate-700 hover:bg-slate-100"
                      >
                        Ouvrir
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SECTION 2: GLOBAL MCP INTEGRATIONS & CREDENTIALS */}
        {activeSection === 'integrations' && (
          <div className="space-y-6">
            {/* Google Workspace OAuth 2.0 Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 bg-slate-50">
                    <ToolIcon slug="gmail" className="h-5 w-5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h2 className="text-sm font-bold text-slate-900">
                        Google Workspace OAuth 2.0 (Gmail, Calendar, Docs, Sheets, Drive)
                      </h2>
                      <span
                        className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold ${
                          workspaceToken
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-800 border border-amber-200'
                        }`}
                      >
                        {workspaceToken
                          ? 'Jeton OAuth2 Actif'
                          : 'Non connecté'}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">
                      Autorise vos agents à lire vos vrais e-mails Gmail, consulter votre agenda Google Calendar et créer des Google Docs/Sheets.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => connectGoogleWorkspaceOAuth()}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
                >
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span>
                    {workspaceToken
                      ? 'Actualiser le jeton Google OAuth'
                      : 'Connecter Google Workspace'}
                  </span>
                </button>
              </div>
            </div>

            {/* Global API Credentials Form (Slack, GitHub, Notion, Discord, Linear, ClickUp) */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    Identifiants & Webhooks des Connecteurs MCP
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Ces clés sont partagées avec tous les agents qui ont l’outil correspondant activé.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openMarketplace(agents[0]?.agentId)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100"
                  >
                    <Store className="h-3.5 w-3.5" />
                    <span>Ouvrir Marketplace (12 MCP)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveGlobalIntegrations}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
                  >
                    <Save className="h-3.5 w-3.5" />
                    <span>Enregistrer tous les identifiants</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Slack Incoming Webhook */}
                <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ToolIcon slug="slack" className="h-4 w-4" />
                      <span className="text-xs font-bold text-slate-900">
                        Slack Incoming Webhook
                      </span>
                    </div>
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                        slackWebhookUrl
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {slackWebhookUrl ? 'Configuré' : 'Non configuré'}
                    </span>
                  </div>
                  <input
                    type="url"
                    value={slackInput}
                    onChange={(e) => setSlackInput(e.target.value)}
                    placeholder="https://hooks.slack.com/services/T000.../B000.../XXXX..."
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-900 focus:border-slate-900 focus:outline-none"
                  />
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500">
                      Utilisé pour poster les rapports d’agents en direct.
                    </span>
                    <button
                      type="button"
                      disabled={testingSlack}
                      onClick={handleTestSlackLive}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-50"
                    >
                      <Send className="h-3 w-3" />
                      <span>{testingSlack ? 'Envoi...' : 'Tester en direct'}</span>
                    </button>
                  </div>
                </div>

                {/* GitHub Repository & Token */}
                <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ToolIcon slug="github" className="h-4 w-4" />
                      <span className="text-xs font-bold text-slate-900">
                        GitHub API (Dépôt & Personal Access Token)
                      </span>
                    </div>
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                        githubRepo
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {githubRepo || 'Non configuré'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="text"
                      value={ghRepoInput}
                      onChange={(e) => setGhRepoInput(e.target.value)}
                      placeholder="owner/repo (ex: vercel/next.js)"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-900 focus:border-slate-900 focus:outline-none"
                    />
                    <input
                      type="password"
                      value={ghTokenInput}
                      onChange={(e) => setGhTokenInput(e.target.value)}
                      placeholder="ghp_... (requis pour créer des issues)"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-900 focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] text-slate-500">
                      Lecture publique + création d’issues/PRs avec jeton.
                    </span>
                    <button
                      type="button"
                      disabled={testingGithub}
                      onClick={handleTestGithubLive}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-800 hover:bg-slate-100 disabled:opacity-50"
                    >
                      <RefreshCw
                        className={`h-3 w-3 ${testingGithub ? 'animate-spin' : ''}`}
                      />
                      <span>{testingGithub ? 'Test...' : 'Tester le dépôt'}</span>
                    </button>
                  </div>
                </div>

                {/* Notion Integration */}
                <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <ToolIcon slug="notion" className="h-4 w-4" />
                      <span className="text-xs font-bold text-slate-900">
                        Notion API (Token & Page Parente)
                      </span>
                    </div>
                    <span
                      className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                        notionToken && notionParentId
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {notionToken && notionParentId ? 'Configuré' : 'Non configuré'}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    <input
                      type="password"
                      value={notionTokenInput}
                      onChange={(e) => setNotionTokenInput(e.target.value)}
                      placeholder="ntn_... ou secret_..."
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-900 focus:border-slate-900 focus:outline-none"
                    />
                    <input
                      type="text"
                      value={notionParentInput}
                      onChange={(e) => setNotionParentInput(e.target.value)}
                      placeholder="ID Page Parente (32 caractères)"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-mono text-slate-900 focus:border-slate-900 focus:outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">
                    Permet la création directe de pages Notion structurées par vos agents.
                  </p>
                </div>

                {/* Discord / Linear / ClickUp Credentials */}
                <div className="rounded-xl border border-slate-200/90 bg-slate-50/50 p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-900">
                      Discord, Linear & ClickUp (Webhooks / API Keys)
                    </span>
                  </div>
                  <div className="space-y-2">
                    <input
                      type="url"
                      value={discordWebhookInput}
                      onChange={(e) => setDiscordWebhookInput(e.target.value)}
                      placeholder="Discord Webhook URL (https://discord.com/api/webhooks/...)"
                      className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono text-slate-900 focus:border-slate-900 focus:outline-none"
                    />
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <input
                        type="password"
                        value={linearKeyInput}
                        onChange={(e) => setLinearKeyInput(e.target.value)}
                        placeholder="Linear API Key (lin_api_...)"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono text-slate-900 focus:border-slate-900 focus:outline-none"
                      />
                      <input
                        type="password"
                        value={clickupKeyInput}
                        onChange={(e) => setClickupKeyInput(e.target.value)}
                        placeholder="ClickUp API Token (pk_...)"
                        className="w-full rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-mono text-slate-900 focus:border-slate-900 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* SECTION 3: CLOUD VM E2B & INNGEST SCHEDULER */}
        {activeSection === 'runtime' && (
          <div className="space-y-6">
            {/* Inngest Autonomous Scheduler Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-slate-900">
                      Planificateur Cron Durable (Inngest Engine)
                    </h2>
                    <span
                      className={`rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold ${
                        autoSchedulerEnabled
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-800 border border-amber-200'
                      }`}
                    >
                      {autoSchedulerEnabled ? 'Daemon Actif' : 'En Pause'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Surveille et déclenche automatiquement les routines planifiées de tous vos agents. Dernier battement :{' '}
                    <span className="font-mono text-slate-700">
                      {lastSchedulerTick
                        ? new Date(lastSchedulerTick).toLocaleTimeString()
                        : 'En attente'}
                    </span>
                  </p>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAutoSchedulerEnabled(!autoSchedulerEnabled)}
                    className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 text-xs font-semibold transition-colors ${
                      autoSchedulerEnabled
                        ? 'border-amber-200 bg-amber-50 text-amber-900 hover:bg-amber-100'
                        : 'border-emerald-200 bg-emerald-50 text-emerald-800 hover:bg-emerald-100'
                    }`}
                  >
                    {autoSchedulerEnabled ? (
                      <>
                        <Pause className="h-3.5 w-3.5" />
                        <span>Mettre le Cron en pause</span>
                      </>
                    ) : (
                      <>
                        <Play className="h-3.5 w-3.5" />
                        <span>Activer le Cron Auto</span>
                      </>
                    )}
                  </button>

                  <button
                    type="button"
                    disabled={runningGlobalCron}
                    onClick={handleRunGlobalCron}
                    className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                  >
                    <RefreshCw
                      className={`h-3.5 w-3.5 ${
                        runningGlobalCron ? 'animate-spin' : ''
                      }`}
                    />
                    <span>Vérifier toutes les routines maintenant</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Cloud VM E2B Sandboxes Fleet */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Flotte de Bureaux Virtuels Cloud VM (E2B Linux / Ubuntu / Win11 / XFCE)
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Gérez l’état, la région serveur et la mise en veille automatique des machines virtuelles de chaque agent.
                </p>
              </div>

              <div className="divide-y divide-slate-200/80 border border-slate-200/80 rounded-xl overflow-hidden">
                {agents.map((ag) => (
                  <div
                    key={ag.agentId}
                    className="p-4 bg-white hover:bg-slate-50/70 transition-colors flex flex-wrap items-center justify-between gap-3"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900">
                          {ag.name}
                        </span>
                        <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[10px] text-slate-600">
                          {ag.sandboxId}
                        </span>
                        <span
                          className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${
                            ag.vmStatus === 'active'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : ag.vmStatus === 'paused'
                                ? 'bg-amber-50 text-amber-800 border border-amber-200'
                                : 'bg-slate-100 text-slate-500'
                          }`}
                        >
                          VM {ag.vmStatus}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-500">
                        Région : {ag.vmRegion || 'eu-west-1'} · Pause auto après{' '}
                        {ag.vmTimeoutMinutes ?? 5} min d’inactivité
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        aria-label={`Timeout VM pour ${ag.name}`}
                        value={ag.vmTimeoutMinutes ?? 5}
                        onChange={(e) =>
                          updateAgentConfig(ag.agentId, {
                            vmTimeoutMinutes: Number(
                              e.target.value
                            ) as VmTimeoutOption,
                          })
                        }
                        className="rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700"
                      >
                        <option value={2}>Veille : 2 min</option>
                        <option value={5}>Veille : 5 min</option>
                        <option value={15}>Veille : 15 min</option>
                        <option value={30}>Veille : 30 min</option>
                      </select>

                      {ag.vmStatus === 'active' ? (
                        <button
                          type="button"
                          onClick={() => setVmStatusForAgent(ag.agentId, 'paused')}
                          className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-amber-50 px-2.5 py-1.5 text-xs font-semibold text-amber-900 hover:bg-amber-100"
                        >
                          <Pause className="h-3.5 w-3.5" />
                          <span>Pause VM</span>
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setVmStatusForAgent(ag.agentId, 'active')}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-200 bg-emerald-50 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 hover:bg-emerald-100"
                        >
                          <Play className="h-3.5 w-3.5" />
                          <span>Démarrer VM</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={async () => {
                          if (ag.vmStatus !== 'active') {
                            await setVmStatusForAgent(ag.agentId, 'active');
                          }
                          openVmModal(ag.agentId);
                        }}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
                      >
                        <Monitor className="h-3.5 w-3.5 text-emerald-400" />
                        <span>Ouvrir Bureau</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* SECTION 4: SYSTEM, PROFILE, LANGUAGE & BACKUP */}
        {activeSection === 'system' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* User Account & Language Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-5">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Profil Utilisateur & Langue de l’Interface
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Gérez votre session active et la langue par défaut de la plateforme Orbit.
                </p>
              </div>

              <div className="flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-slate-50/70 p-3.5">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative h-11 w-11 rounded-full overflow-hidden border border-slate-200 bg-white shrink-0">
                    <Image
                      src={user.avatarUrl}
                      alt={user.name}
                      fill
                      sizes="44px"
                      referrerPolicy="no-referrer"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-slate-900 truncate">
                      {user.name}
                    </p>
                    <p className="text-[11px] text-slate-500 truncate">
                      {user.email}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={signOutUser}
                  className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-700 hover:bg-red-100 shrink-0"
                >
                  Déconnexion
                </button>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-800">
                  Langue de l’application (Interface & Prompts Système)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { code: 'fr', label: 'Français (FR)' },
                      { code: 'it', label: 'Italiano (IT)' },
                      { code: 'en', label: 'English (EN)' },
                    ] as const
                  ).map((item) => (
                    <button
                      key={item.code}
                      type="button"
                      onClick={() => setLocale(item.code)}
                      className={`flex items-center justify-center gap-1.5 rounded-xl border px-3 py-2.5 text-xs font-semibold transition-all ${
                        locale === item.code
                          ? 'border-slate-900 bg-slate-900 text-white shadow-2xs'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      <Globe className="h-3.5 w-3.5" />
                      <span>{item.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Backup, Export & Reset Card */}
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-2xs space-y-4">
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  Sauvegarde JSON, Purge & Réinitialisation
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Exportez vos agents et routines au format JSON ou réinitialisez l’espace de travail.
                </p>
              </div>

              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handleExportConfigurationJson}
                  className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Download className="h-4 w-4 text-slate-700" />
                    <span>Exporter la configuration complète (.JSON)</span>
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">
                    {agents.length} agents
                  </span>
                </button>

                <button
                  type="button"
                  onClick={handleClearAllChats}
                  className="w-full flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50/70 px-4 py-3 text-xs font-semibold text-slate-800 hover:bg-slate-100 transition-colors"
                >
                  <span className="flex items-center gap-2">
                    <Trash2 className="h-4 w-4 text-slate-700" />
                    <span>Purger l’historique de chat de tous les agents</span>
                  </span>
                  <span className="font-mono text-[10px] text-slate-500">
                    Nettoyer
                  </span>
                </button>

                {!confirmFactoryReset ? (
                  <button
                    type="button"
                    onClick={() => setConfirmFactoryReset(true)}
                    className="w-full flex items-center justify-between rounded-xl border border-red-200 bg-red-50/60 px-4 py-3 text-xs font-semibold text-red-700 hover:bg-red-100/70 transition-colors"
                  >
                    <span className="flex items-center gap-2">
                      <RotateCcw className="h-4 w-4 text-red-600" />
                      <span>Réinitialiser le cache local (Factory Reset)</span>
                    </span>
                    <span className="font-mono text-[10px] text-red-600">
                      Danger
                    </span>
                  </button>
                ) : (
                  <div className="rounded-xl border border-red-300 bg-red-50 p-3 space-y-2">
                    <p className="text-xs font-semibold text-red-900">
                      Confirmer la réinitialisation complète du stockage local ?
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleFactoryResetLocal}
                        className="rounded-lg bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700"
                      >
                        Oui, tout réinitialiser
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmFactoryReset(false)}
                        className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
                      >
                        Annuler
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
