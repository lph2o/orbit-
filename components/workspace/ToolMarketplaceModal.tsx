'use client';

import React, { useState } from 'react';
import {
  X,
  Search,
  Check,
  Plus,
  Unplug,
  CheckCircle2,
  Webhook,
  KeyRound,
  ShieldCheck,
  ShieldAlert,
  Loader2,
  ExternalLink,
} from 'lucide-react';
import { useOrbit } from '@/context/OrbitContext';
import {
  evaluateToolConnectionReadiness,
  getToolCredentialSpec,
  TOOL_CATALOG,
} from '@/lib/orbit-logic';
import { ToolIcon } from './ToolIcon';

const CATEGORIES = ['All', 'Communication', 'Productivity', 'Development', 'Social & News'] as const;

export function ToolMarketplaceModal() {
  const {
    isMarketplaceOpen,
    marketplaceTargetAgentId,
    closeMarketplace,
    agents,
    connectToolToAgent,
    connectAllToolsToAgent,
    disconnectToolFromAgent,
    workspaceToken,
    connectGoogleWorkspaceOAuth,
    slackWebhookUrl,
    setSlackWebhookUrl,
    toolCredentials,
    setToolCredential,
    locale,
    t,
    addToast,
  } = useOrbit();

  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [connectingSlug, setConnectingSlug] = useState<string | null>(null);
  const [webhookDraft, setWebhookDraft] = useState<string>(slackWebhookUrl);

  // Unified real API / OAuth / Webhook configuration state for ANY of the 12 tools
  const [activeConfigSlug, setActiveConfigSlug] = useState<string | null>(null);
  const [configTokenDraft, setConfigTokenDraft] = useState<string>('');
  const [configWebhookDraft, setConfigWebhookDraft] = useState<string>('');
  const [configTargetDraft, setConfigTargetDraft] = useState<string>('');
  const [verifyBusy, setVerifyBusy] = useState<boolean>(false);
  const [verifyError, setVerifyError] = useState<string | null>(null);

  if (!isMarketplaceOpen) return null;

  const targetAgent =
    agents.find((a) => a.agentId === (selectedAgentId || marketplaceTargetAgentId)) ||
    agents[0];

  const connectedSlugs = new Set(targetAgent?.tools || []);

  const filteredTools = TOOL_CATALOG.filter((tool) => {
    const matchesCategory = activeCategory === 'All' || tool.category === activeCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      tool.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.slug.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  const connectedToolsList = filteredTools.filter((tl) => connectedSlugs.has(tl.slug));
  const availableToolsList = filteredTools.filter((tl) => !connectedSlugs.has(tl.slug));

  const openToolConfigDrawer = (slug: string) => {
    const clean = slug.toLowerCase().trim();
    const existing = toolCredentials[clean] || {};
    setActiveConfigSlug(clean);
    setConfigTokenDraft(existing.apiToken || '');
    setConfigWebhookDraft(existing.webhookUrl || (clean === 'slack' ? slackWebhookUrl : ''));
    setConfigTargetDraft(existing.targetParam || '');
    setVerifyError(null);
  };

  const handleConnect = async (slug: string) => {
    if (!targetAgent) return;
    const clean = slug.toLowerCase().trim();
    const spec = getToolCredentialSpec(clean);
    const readiness = evaluateToolConnectionReadiness(
      clean,
      true,
      toolCredentials,
      workspaceToken
    );

    // If this tool requires a secret/OAuth for write actions and is not verified yet, open the verification panel first!
    if (spec.requiresSecretForWrite && !readiness.canExecuteLiveWrite) {
      openToolConfigDrawer(clean);
      return;
    }

    setConnectingSlug(clean);
    await new Promise((r) => setTimeout(r, 150));
    await connectToolToAgent(targetAgent.agentId, clean);
    setConnectingSlug(null);
  };

  const handleVerifyToolInModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetAgent || !activeConfigSlug) return;
    const slug = activeConfigSlug;
    const spec = getToolCredentialSpec(slug);
    setVerifyError(null);
    setVerifyBusy(true);

    try {
      let currentGoogleToken = workspaceToken || '';
      if (spec.authKind === 'google_oauth' && !currentGoogleToken && !configTokenDraft.trim()) {
        const connectedToken = await connectGoogleWorkspaceOAuth();
        if (connectedToken) {
          currentGoogleToken = connectedToken;
        }
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (currentGoogleToken) {
        headers.Authorization = `Bearer ${currentGoogleToken}`;
      }

      const res = await fetch('/api/workspace', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'verify_tool',
          toolSlug: slug,
          apiToken: configTokenDraft.trim(),
          webhookUrl: configWebhookDraft.trim(),
          targetParam: configTargetDraft.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `Échec de vérification de l'API ${spec.name}`);
      }

      setToolCredential(slug, {
        apiToken: configTokenDraft.trim(),
        webhookUrl: configWebhookDraft.trim(),
        targetParam: data.resolvedTargetParam ?? configTargetDraft.trim(),
        verifiedAt: new Date().toISOString(),
        verifiedLabel: data.verifiedLabel || `API ${spec.name} vérifiée`,
      });

      await connectToolToAgent(targetAgent.agentId, slug);
      setActiveConfigSlug(null);
      addToast({
        title: `API ${spec.name} vérifiée et connectée`,
        description: data.verifiedLabel || `Connexion officielle ${spec.name} active.`,
        type: 'success',
      });
    } catch (err) {
      setVerifyError(
        err instanceof Error ? err.message : `Impossible de vérifier les identifiants ${spec.name}.`
      );
    } finally {
      setVerifyBusy(false);
    }
  };

  const handleConnectAll = async () => {
    if (!targetAgent) return;
    setConnectingSlug('__all__');
    await new Promise((r) => setTimeout(r, 150));
    await connectAllToolsToAgent(targetAgent.agentId);
    setConnectingSlug(null);
  };

  const handleDisconnect = async (slug: string) => {
    if (!targetAgent) return;
    setConnectingSlug(slug);
    await disconnectToolFromAgent(targetAgent.agentId, slug);
    setConnectingSlug(null);
  };

  const handleSaveWebhook = (e: React.FormEvent) => {
    e.preventDefault();
    setSlackWebhookUrl(webhookDraft);
    addToast({
      title: 'Slack Incoming Webhook',
      description:
        locale === 'fr'
          ? 'URL Webhook Slack enregistrée pour les livraisons en direct.'
          : locale === 'it'
            ? 'URL Webhook Slack salvato per le consegne in tempo reale.'
            : 'Slack Webhook URL saved for live routine deliveries.',
      type: 'success',
    });
  };

  const activeSpec = activeConfigSlug ? getToolCredentialSpec(activeConfigSlug) : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.marketplace.title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
    >
      <div className="w-full max-w-4xl rounded-xl border border-slate-200 bg-white shadow-xl flex flex-col max-h-[88vh] overflow-hidden">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between gap-4">
          <div>
            <h2 className="text-base font-bold text-slate-900">
              {t.marketplace.title}
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {t.marketplace.subtitle}
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            {targetAgent && connectedSlugs.size < TOOL_CATALOG.length && (
              <button
                type="button"
                disabled={connectingSlug === '__all__'}
                onClick={handleConnectAll}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
              >
                <Check className="h-3.5 w-3.5" />
                <span>
                  {locale === 'fr'
                    ? `Tout activer (${TOOL_CATALOG.length} outils)`
                    : locale === 'it'
                      ? `Connetti tutti (${TOOL_CATALOG.length})`
                      : `Connect All (${TOOL_CATALOG.length})`}
                </span>
              </button>
            )}
            {agents.length > 0 && (
              <div className="flex items-center gap-2">
                <label htmlFor="marketplace-agent-select" className="text-xs text-slate-600 whitespace-nowrap">
                  {t.marketplace.targetAgent}
                </label>
                <select
                  id="marketplace-agent-select"
                  value={targetAgent?.agentId || ''}
                  onChange={(e) => setSelectedAgentId(e.target.value)}
                  className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-900"
                >
                  {agents.map((ag) => (
                    <option key={ag.agentId} value={ag.agentId}>
                      {ag.name} ({ag.tools.length})
                    </option>
                  ))}
                </select>
              </div>
            )}
            <button
              type="button"
              onClick={closeMarketplace}
              aria-label="Close Marketplace"
              className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Live OAuth & Slack Webhook Configuration Banner */}
        <div className="px-6 py-3 border-b border-slate-200 bg-slate-50 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Official Google Workspace OAuth Connect */}
          <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white px-3.5 py-2 flex-1">
            <div className="min-w-0">
              <p className="text-xs font-bold text-slate-900">
                Google Workspace (Gmail, Calendar, Docs, Sheets)
              </p>
              <p className="text-[11px] text-slate-500 truncate">
                {workspaceToken
                  ? locale === 'fr'
                    ? 'Jeton OAuth actif en mémoire — Lecture et mise à jour autorisées'
                    : locale === 'it'
                      ? 'Token OAuth attivo in memoria — Lettura e modifica autorizzate'
                      : 'In-memory OAuth token active — Live Workspace API enabled'
                  : locale === 'fr'
                    ? 'Autorisez votre compte Google pour lire vos vrais e-mails et agendas'
                    : locale === 'it'
                      ? 'Autorizza il tuo account Google per leggere email ed eventi reali'
                      : 'Sign in with Google to authorize live Gmail, Calendar, Docs & Sheets'}
              </p>
            </div>

            {workspaceToken ? (
              <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 border border-emerald-200 px-2.5 py-1.5 text-xs font-semibold text-emerald-800 whitespace-nowrap shrink-0">
                <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                <span>OAuth Actif</span>
              </span>
            ) : (
              <button
                type="button"
                onClick={connectGoogleWorkspaceOAuth}
                className="gsi-material-button inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap shrink-0 shadow-2xs"
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

          {/* Real Slack Incoming Webhook Input */}
          <form
            onSubmit={handleSaveWebhook}
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 flex-1 min-w-0"
          >
            <Webhook className="h-4 w-4 text-slate-500 shrink-0" />
            <input
              type="url"
              value={webhookDraft}
              onChange={(e) => setWebhookDraft(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              aria-label="Slack Webhook URL"
              className="flex-1 w-0 min-w-0 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none font-mono"
            />
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              {locale === 'fr' ? 'Enregistrer' : locale === 'it' ? 'Salva' : 'Save'}
            </button>
          </form>
        </div>

        {/* Universal Live API / OAuth / Webhook Configuration Panel for ANY selected tool */}
        {activeSpec && (
          <form
            onSubmit={handleVerifyToolInModal}
            className="px-6 py-4 border-b border-slate-200 bg-amber-50/75 space-y-3"
          >
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-slate-900" />
                <h3 className="text-xs font-bold text-slate-900">
                  Configuration & Vérification API Officielle — {activeSpec.name}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveConfigSlug(null)}
                className="text-xs font-medium text-slate-500 hover:text-slate-900"
              >
                Fermer
              </button>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              {activeSpec.helpTextFr}{' '}
              <a
                href={activeSpec.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-blue-600 underline"
              >
                <span>{activeSpec.docsLabelFr}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </p>

            {activeSpec.authKind === 'google_oauth' && (
              <div className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3">
                <div className="text-xs text-slate-700">
                  <span className="font-semibold text-slate-900">Option 1 (Recommandée) :</span>{' '}
                  Autorisez la fenêtre OAuth 2.0 Google Workspace en 1 clic.
                </div>
                <button
                  type="button"
                  onClick={connectGoogleWorkspaceOAuth}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700 shrink-0"
                >
                  <ShieldCheck className="h-3.5 w-3.5" />
                  <span>Autoriser Google Workspace (OAuth)</span>
                </button>
              </div>
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {activeSpec.webhookLabelFr && (
                <div className="md:col-span-2">
                  <label className="block text-[11px] font-semibold text-slate-800 mb-1">
                    {activeSpec.webhookLabelFr}
                  </label>
                  <input
                    type="url"
                    value={configWebhookDraft}
                    onChange={(e) => setConfigWebhookDraft(e.target.value)}
                    placeholder={activeSpec.webhookPlaceholder}
                    aria-label={activeSpec.webhookLabelFr}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono text-slate-900 focus:border-slate-900 focus:outline-none"
                  />
                </div>
              )}

              {(activeSpec.tokenLabelFr || activeSpec.authKind === 'google_oauth') && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-800 mb-1">
                    {activeSpec.tokenLabelFr || 'Ou jeton OAuth Bearer Google (ya29...)'}
                  </label>
                  <input
                    type="password"
                    value={configTokenDraft}
                    onChange={(e) => setConfigTokenDraft(e.target.value)}
                    placeholder={activeSpec.tokenPlaceholder || 'ya29...'}
                    aria-label={activeSpec.tokenLabelFr || 'Jeton API'}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs font-mono text-slate-900 focus:border-slate-900 focus:outline-none"
                  />
                </div>
              )}

              {activeSpec.targetLabelFr && (
                <div>
                  <label className="block text-[11px] font-semibold text-slate-800 mb-1">
                    {activeSpec.targetLabelFr}
                  </label>
                  <input
                    type="text"
                    value={configTargetDraft}
                    onChange={(e) => setConfigTargetDraft(e.target.value)}
                    placeholder={activeSpec.targetPlaceholder}
                    aria-label={activeSpec.targetLabelFr}
                    className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                  />
                </div>
              )}
            </div>

            {verifyError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {verifyError}
              </div>
            )}

            <div className="flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="submit"
                  disabled={verifyBusy}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {verifyBusy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                  )}
                  <span>Vérifier & Connecter {activeSpec.name} (API Réelle)</span>
                </button>
                {activeSpec.slug === 'notion' && targetAgent && (
                  <a
                    href={`/portfolio/${encodeURIComponent(targetAgent.agentId)}`}
                    className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-semibold text-blue-700 hover:bg-blue-100"
                  >
                    <span>Ouvrir le Portfolio Public Orbit</span>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </a>
                )}
              </div>
              <button
                type="button"
                onClick={async () => {
                  if (!targetAgent) return;
                  await connectToolToAgent(targetAgent.agentId, activeSpec.slug);
                  setActiveConfigSlug(null);
                }}
                className="text-[11px] font-medium text-slate-600 underline hover:text-slate-900"
              >
                Activer en Mode Démo local (sans clé API — n’agira pas sur mon vrai compte {activeSpec.name})
              </button>
            </div>
          </form>
        )}

        {/* Search & Category Bar */}
        <div className="px-6 py-3 border-b border-slate-200 bg-slate-50/60 flex flex-wrap items-center justify-between gap-3">
          <div className="relative flex-1 min-w-60">
            <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t.marketplace.searchPlaceholder}
              aria-label={t.marketplace.searchPlaceholder}
              className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-slate-900"
            />
          </div>

          <div className="flex items-center gap-1 p-1 bg-slate-200/70 rounded-lg">
            {CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setActiveCategory(cat)}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap ${
                  activeCategory === cat
                    ? 'bg-white text-slate-900 shadow-2xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                {cat === 'All' ? t.marketplace.catAll : cat}
              </button>
            ))}
          </div>
        </div>

        {/* Tool Grid Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Connected Tools Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-semibold text-slate-900">
                {t.marketplace.connectedTitle} ({connectedToolsList.length})
              </h3>
              {targetAgent && (
                <span className="text-[11px] text-slate-500 font-mono tabular-nums">
                  {t.marketplace.sessionId}: {targetAgent.composioSessionId || 'sess_comp_active'}
                </span>
              )}
            </div>

            {connectedToolsList.length === 0 ? (
              <div className="rounded-lg border border-dashed border-slate-200 p-4 text-center text-xs text-slate-500">
                {t.marketplace.noConnectedMatch}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {connectedToolsList.map((tool) => {
                  const readiness = evaluateToolConnectionReadiness(
                    tool.slug,
                    true,
                    toolCredentials,
                    workspaceToken
                  );
                  return (
                    <div
                      key={tool.slug}
                      className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3.5"
                    >
                      <div className="flex items-start gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-lg border border-slate-200 bg-white flex items-center justify-center shrink-0">
                          <ToolIcon slug={tool.slug} className="h-4 w-4" />
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className="text-xs font-semibold text-slate-900">{tool.name}</p>
                            {readiness.mode === 'verified_live' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-700 font-semibold">
                                <ShieldCheck className="h-3 w-3" />
                                <span>{readiness.badgeTextFr}</span>
                              </span>
                            ) : readiness.mode === 'public_live' ? (
                              <span className="inline-flex items-center gap-1 text-[11px] text-blue-700 font-semibold">
                                <ShieldCheck className="h-3 w-3" />
                                <span>{readiness.badgeTextFr}</span>
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[11px] text-amber-700 font-semibold">
                                <ShieldAlert className="h-3 w-3" />
                                <span>{readiness.badgeTextFr}</span>
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">
                            {toolCredentials[tool.slug]?.verifiedLabel || tool.description}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => openToolConfigDrawer(tool.slug)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                          <span>
                            {readiness.mode === 'verified_live' ? 'Clé / OAuth' : 'Vérifier API'}
                          </span>
                        </button>
                        <button
                          type="button"
                          disabled={connectingSlug === tool.slug}
                          onClick={() => handleDisconnect(tool.slug)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors whitespace-nowrap shrink-0"
                        >
                          <Unplug className="h-3.5 w-3.5" />
                          <span>{t.marketplace.disconnectBtn}</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Available Tools Section */}
          <div>
            <h3 className="text-xs font-semibold text-slate-900 mb-3">
              {t.marketplace.availableTitle} ({availableToolsList.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableToolsList.map((tool) => {
                const spec = getToolCredentialSpec(tool.slug);
                const readiness = evaluateToolConnectionReadiness(
                  tool.slug,
                  true,
                  toolCredentials,
                  workspaceToken
                );
                return (
                  <div
                    key={tool.slug}
                    className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3.5 hover:border-slate-300 transition-colors"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
                        <ToolIcon slug={tool.slug} className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-xs flex-wrap">
                          <span className="font-semibold text-slate-900">{tool.name}</span>
                          <span className="text-slate-400">·</span>
                          <span className="text-[11px] text-slate-500">{tool.category}</span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">
                          {tool.description}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={connectingSlug === tool.slug}
                      onClick={() => handleConnect(tool.slug)}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
                    >
                      {connectingSlug === tool.slug ? (
                        <>
                          <Check className="h-3.5 w-3.5" />
                          <span>{t.marketplace.connectingBtn}</span>
                        </>
                      ) : (
                        <>
                          <Plus className="h-3.5 w-3.5" />
                          <span>
                            {spec.requiresSecretForWrite && !readiness.canExecuteLiveWrite
                              ? `Configurer ${tool.name}`
                              : t.marketplace.connectBtn}
                          </span>
                        </>
                      )}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
