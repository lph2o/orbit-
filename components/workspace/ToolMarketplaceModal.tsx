'use client';

import React, { useState } from 'react';
import { X, Search, Check, Plus, Unplug, CheckCircle2, Webhook } from 'lucide-react';
import { useOrbit } from '@/context/OrbitContext';
import { isGoogleWorkspaceTool, TOOL_CATALOG } from '@/lib/orbit-logic';
import { ToolIcon } from './ToolIcon';

const CATEGORIES = ['All', 'Communication', 'Productivity', 'Development', 'Social & News'] as const;

export function ToolMarketplaceModal() {
  const {
    isMarketplaceOpen,
    marketplaceTargetAgentId,
    closeMarketplace,
    agents,
    connectToolToAgent,
    disconnectToolFromAgent,
    workspaceToken,
    connectGoogleWorkspaceOAuth,
    slackWebhookUrl,
    setSlackWebhookUrl,
    locale,
    t,
    addToast,
  } = useOrbit();

  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [connectingSlug, setConnectingSlug] = useState<string | null>(null);
  const [webhookDraft, setWebhookDraft] = useState<string>(slackWebhookUrl);

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

  const handleConnect = async (slug: string) => {
    if (!targetAgent) return;
    setConnectingSlug(slug);
    await new Promise((r) => setTimeout(r, 150));
    await connectToolToAgent(targetAgent.agentId, slug);
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

          <div className="flex items-center gap-3">
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
            className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 flex-1"
          >
            <Webhook className="h-4 w-4 text-slate-500 shrink-0" />
            <input
              type="url"
              value={webhookDraft}
              onChange={(e) => setWebhookDraft(e.target.value)}
              placeholder="https://hooks.slack.com/services/..."
              aria-label="Slack Webhook URL"
              className="flex-1 min-w-0 text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none font-mono"
            />
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-800 whitespace-nowrap shrink-0"
            >
              {locale === 'fr' ? 'Enregistrer Slack' : locale === 'it' ? 'Salva Slack' : 'Save Slack'}
            </button>
          </form>
        </div>

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
                {connectedToolsList.map((tool) => (
                  <div
                    key={tool.slug}
                    className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50/60 p-3.5"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-lg border border-slate-200 bg-white flex items-center justify-center shrink-0">
                        <ToolIcon slug={tool.slug} className="h-4 w-4" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-semibold text-slate-900">{tool.name}</p>
                          <span className="text-[11px] text-emerald-700 font-medium">
                            · {t.marketplace.connectedStatus}
                            {isGoogleWorkspaceTool(tool.slug) && workspaceToken ? ' (OAuth Live)' : ''}
                          </span>
                        </div>
                        <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">
                          {tool.description}
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      disabled={connectingSlug === tool.slug}
                      onClick={() => handleDisconnect(tool.slug)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-red-50 hover:text-red-700 hover:border-red-200 transition-colors whitespace-nowrap shrink-0"
                    >
                      <Unplug className="h-3.5 w-3.5" />
                      <span>{t.marketplace.disconnectBtn}</span>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Available Tools Section */}
          <div>
            <h3 className="text-xs font-semibold text-slate-900 mb-3">
              {t.marketplace.availableTitle} ({availableToolsList.length})
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {availableToolsList.map((tool) => (
                <div
                  key={tool.slug}
                  className="flex items-start justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3.5 hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
                      <ToolIcon slug={tool.slug} className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-xs">
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
                        <span>{t.marketplace.connectBtn}</span>
                      </>
                    )}
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
