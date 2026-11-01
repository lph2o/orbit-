'use client';

import React, { useState } from 'react';
import {
  Check,
  ExternalLink,
  KeyRound,
  Loader2,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Unplug,
} from 'lucide-react';
import { ToolSuggestionItem } from '@/lib/types';
import { useOrbit } from '@/context/OrbitContext';
import {
  evaluateToolConnectionReadiness,
  getToolCredentialSpec,
} from '@/lib/orbit-logic';
import { ToolIcon } from '@/components/workspace/ToolIcon';

export function ToolSuggestionCard({
  agentId,
  tool,
}: {
  agentId: string;
  tool: ToolSuggestionItem;
}) {
  const {
    agents,
    connectToolToAgent,
    disconnectToolFromAgent,
    workspaceToken,
    connectGoogleWorkspaceOAuth,
    toolCredentials,
    setToolCredential,
    addToast,
    t,
  } = useOrbit();

  const cleanSlug = tool.slug.toLowerCase().trim();
  const spec = getToolCredentialSpec(cleanSlug);
  const existingCred = toolCredentials[cleanSlug] || {};

  const agent = agents.find((a) => a.agentId === agentId);
  const isConnected = Boolean(agent?.tools.includes(cleanSlug));

  const readiness = evaluateToolConnectionReadiness(
    cleanSlug,
    isConnected || true,
    toolCredentials,
    workspaceToken
  );

  const [busy, setBusy] = useState(false);
  const [showConfigDrawer, setShowConfigDrawer] = useState<boolean>(
    spec.requiresSecretForWrite && !readiness.canExecuteLiveWrite
  );
  const [tokenDraft, setTokenDraft] = useState(existingCred.apiToken || '');
  const [webhookDraft, setWebhookDraft] = useState(existingCred.webhookUrl || '');
  const [targetDraft, setTargetDraft] = useState(existingCred.targetParam || '');
  const [verifyError, setVerifyError] = useState<string | null>(null);
  const [verifiedLabel, setVerifiedLabel] = useState<string | null>(
    existingCred.verifiedLabel || null
  );
  const [createdNotionUrl, setCreatedNotionUrl] = useState<string | null>(null);

  const handleToggle = async () => {
    if (!isConnected && spec.requiresSecretForWrite && !readiness.canExecuteLiveWrite) {
      setShowConfigDrawer(true);
      return;
    }
    setBusy(true);
    await new Promise((r) => setTimeout(r, 180));
    if (isConnected) {
      await disconnectToolFromAgent(agentId, cleanSlug);
    } else {
      await connectToolToAgent(agentId, cleanSlug);
    }
    setBusy(false);
  };

  const handleVerifyAndConnect = async () => {
    setVerifyError(null);
    setBusy(true);

    try {
      let activeGoogleToken = workspaceToken || '';
      if (spec.authKind === 'google_oauth' && !activeGoogleToken && !tokenDraft.trim()) {
        const connectedToken = await connectGoogleWorkspaceOAuth();
        if (connectedToken) {
          activeGoogleToken = connectedToken;
        }
      }

      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (activeGoogleToken) {
        headers.Authorization = `Bearer ${activeGoogleToken}`;
      }

      const res = await fetch('/api/workspace', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          action: 'verify_tool',
          toolSlug: cleanSlug,
          apiToken: tokenDraft.trim(),
          webhookUrl: webhookDraft.trim(),
          targetParam: targetDraft.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || `Échec de vérification de l'API ${spec.name}`);
      }

      const resolvedTarget = data.resolvedTargetParam ?? targetDraft.trim();
      setToolCredential(cleanSlug, {
        apiToken: tokenDraft.trim(),
        webhookUrl: webhookDraft.trim(),
        targetParam: resolvedTarget,
        verifiedAt: new Date().toISOString(),
        verifiedLabel: data.verifiedLabel || `API ${spec.name} vérifiée`,
      });

      setVerifiedLabel(data.verifiedLabel || `API ${spec.name} vérifiée`);
      if (resolvedTarget) {
        setTargetDraft(resolvedTarget);
      }

      if (!isConnected) {
        await connectToolToAgent(agentId, cleanSlug);
      }
      setShowConfigDrawer(false);

      addToast({
        title: `API ${spec.name} vérifiée et connectée`,
        description: data.verifiedLabel || `Connexion officielle ${spec.name} active.`,
        type: 'success',
      });
    } catch (err) {
      setVerifyError(
        err instanceof Error ? err.message : `Identifiants ${spec.name} invalides ou inaccessibles.`
      );
    } finally {
      setBusy(false);
    }
  };

  const handleCreateLiveNotionPortfolioNow = async () => {
    const cleanToken = (existingCred.apiToken || tokenDraft).trim();
    if (!cleanToken) {
      setShowConfigDrawer(true);
      return;
    }
    setBusy(true);
    setVerifyError(null);
    try {
      const res = await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_notion_page',
          notionToken: cleanToken,
          notionParentId: (existingCred.targetParam || targetDraft).trim(),
          title: `Portfolio Professionnel — ${agent?.name || 'Orbit'}`,
          content: [
            `## À propos — ${agent?.name || 'Agent Orbit'}`,
            agent?.description || 'Portfolio professionnel généré via Orbit AI.',
            `## Projets & Réalisations`,
            `• Automatisation Multi-Outils MCP & Cloud VM Desktop`,
            `• Base de connaissances RAG & Exécutions Durables`,
            `## Contact`,
            `• Portfolio Public Orbit : /portfolio/${encodeURIComponent(agentId)}`,
          ].join('\n'),
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Impossible de créer la page Notion.');
      }
      setCreatedNotionUrl(data.url);
      addToast({
        title: 'Page créée dans votre vrai espace Notion !',
        description: data.url,
        type: 'success',
      });
    } catch (err) {
      setVerifyError(err instanceof Error ? err.message : 'Erreur API Notion.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-3 space-y-2.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="h-9 w-9 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
            <ToolIcon slug={cleanSlug} className="h-4 w-4" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5 text-xs flex-wrap">
              <span className="font-semibold text-slate-900">{tool.name}</span>
              <span className="text-slate-400">·</span>
              {isConnected ? (
                readiness.mode === 'verified_live' ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-emerald-700">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Connecté · {readiness.badgeTextFr}</span>
                  </span>
                ) : readiness.mode === 'public_live' ? (
                  <span className="inline-flex items-center gap-1 font-semibold text-blue-700">
                    <ShieldCheck className="h-3.5 w-3.5" />
                    <span>Connecté · {readiness.badgeTextFr}</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 font-semibold text-amber-700">
                    <ShieldAlert className="h-3.5 w-3.5" />
                    <span>{readiness.badgeTextFr}</span>
                  </span>
                )
              ) : (
                <span className="font-medium text-amber-700">
                  {spec.requiresSecretForWrite
                    ? `Configuration API / OAuth ${tool.name} requise`
                    : t.toolCard.required}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-600 truncate mt-0.5">
              {verifiedLabel || tool.reason || tool.description}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => setShowConfigDrawer((prev) => !prev)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <KeyRound className="h-3.5 w-3.5 text-slate-600" />
            <span>
              {readiness.mode === 'verified_live' ? 'Clé / OAuth' : 'Vérifier API'}
            </span>
          </button>

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
                    {spec.requiresSecretForWrite && !readiness.canExecuteLiveWrite
                      ? `Configurer ${tool.name}`
                      : `${t.toolCard.connect} ${tool.name}`}
                  </span>
                </>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Universal Live API / OAuth / Webhook Verification Drawer for ANY of the 12 tools */}
      {showConfigDrawer && (
        <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 space-y-2.5 text-xs">
          <div className="flex items-center justify-between gap-2 flex-wrap">
            <span className="font-semibold text-slate-900">
              Connexion API / OAuth Officielle — {spec.name}
            </span>
            <div className="flex items-center gap-3">
              {cleanSlug === 'notion' && (
                <a
                  href={`/portfolio/${encodeURIComponent(agentId)}`}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:underline"
                >
                  <span>Voir mon Portfolio Public hébergé</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
              <a
                href={spec.docsUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 underline"
              >
                <span>{spec.docsLabelFr}</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            </div>
          </div>

          <p className="text-[11px] text-slate-600 leading-relaxed">{spec.helpTextFr}</p>

          {spec.authKind === 'google_oauth' && (
            <div className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-white p-2.5">
              <span className="text-[11px] text-slate-700">
                Autorisez votre compte Google Workspace officiel (Gmail, Calendar, Docs) :
              </span>
              <button
                type="button"
                onClick={connectGoogleWorkspaceOAuth}
                className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-blue-700 shrink-0"
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>Sign in with Google OAuth</span>
              </button>
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {spec.webhookLabelFr && (
              <div className="sm:col-span-2">
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  {spec.webhookLabelFr}
                </label>
                <input
                  type="url"
                  value={webhookDraft}
                  onChange={(e) => setWebhookDraft(e.target.value)}
                  placeholder={spec.webhookPlaceholder}
                  aria-label={spec.webhookLabelFr}
                  className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>
            )}

            {(spec.tokenLabelFr || spec.authKind === 'google_oauth') && (
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  {spec.tokenLabelFr || 'Ou jeton OAuth Bearer Google (ya29...)'}
                </label>
                <input
                  type="password"
                  value={tokenDraft}
                  onChange={(e) => setTokenDraft(e.target.value)}
                  placeholder={spec.tokenPlaceholder || 'ya29...'}
                  aria-label={spec.tokenLabelFr || 'Jeton API'}
                  className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs font-mono text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>
            )}

            {spec.targetLabelFr && (
              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  {spec.targetLabelFr}
                </label>
                <input
                  type="text"
                  value={targetDraft}
                  onChange={(e) => setTargetDraft(e.target.value)}
                  placeholder={spec.targetPlaceholder}
                  aria-label={spec.targetLabelFr}
                  className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
                />
              </div>
            )}
          </div>

          {verifyError && (
            <div className="rounded-md border border-red-200 bg-red-50 px-2.5 py-1.5 text-[11px] text-red-700">
              {verifyError}
            </div>
          )}

          <div className="flex items-center justify-between gap-2 flex-wrap pt-1">
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                disabled={busy}
                onClick={handleVerifyAndConnect}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {busy ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
                )}
                <span>Vérifier & Connecter {spec.name} (API Réelle)</span>
              </button>

              {cleanSlug === 'notion' && (
                <a
                  href={`/portfolio/${encodeURIComponent(agentId)}`}
                  className="inline-flex items-center gap-1 rounded-lg border border-blue-200 bg-blue-50 px-2.5 py-1.5 text-[11px] font-semibold text-blue-700 hover:bg-blue-100"
                >
                  <span>Ouvrir mon Portfolio Public sans clé Notion</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>

            {!isConnected && (
              <button
                type="button"
                onClick={async () => {
                  await connectToolToAgent(agentId, cleanSlug);
                  setShowConfigDrawer(false);
                }}
                className="text-[11px] font-medium text-slate-600 underline hover:text-slate-900"
              >
                Continuer en Mode Démo local (sans agir sur mon vrai compte {spec.name})
              </button>
            )}
          </div>
        </div>
      )}

      {/* Action bar when Notion is verified */}
      {cleanSlug === 'notion' && readiness.canExecuteLiveWrite && (
        <div className="flex items-center justify-between gap-2 rounded-lg border border-emerald-200 bg-emerald-50/70 px-2.5 py-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <ShieldCheck className="h-4 w-4 text-emerald-600 shrink-0" />
            <span className="text-emerald-900 font-medium truncate">
              {createdNotionUrl
                ? 'Page créée sur votre espace Notion !'
                : 'Clé API Notion active — Prêt à créer une vraie page sur notion.so'}
            </span>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {createdNotionUrl ? (
              <a
                href={createdNotionUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-md bg-emerald-700 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-emerald-800"
              >
                <span>Ouvrir sur Notion.so</span>
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : (
              <button
                type="button"
                disabled={busy}
                onClick={handleCreateLiveNotionPortfolioNow}
                className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
              >
                {busy ? <Loader2 className="h-3 w-3 animate-spin" /> : <Plus className="h-3 w-3" />}
                <span>Créer la page sur Notion.so</span>
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
