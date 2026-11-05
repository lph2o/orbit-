'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import {
  Plus,
  Monitor,
  CalendarClock,
  ArrowRight,
  Store,
  Activity,
  Clock,
  BookOpen,
  GitBranch,
  Webhook,
  Loader2,
  Coins,
} from 'lucide-react';
import { useOrbit } from '@/context/OrbitContext';
import { ToolIcon } from '@/components/workspace/ToolIcon';
import { computeWorkspaceAnalytics, getToolBySlug } from '@/lib/orbit-logic';

export default function WorkspaceIndexPage() {
  const {
    user,
    agents,
    routinesByAgent,
    executionsByAgent,
    knowledgeByAgent,
    openMarketplace,
    runMultiAgentWorkflow,
    triggerIncomingWebhook,
    locale,
    t,
  } = useOrbit();

  const [sourceAgentId, setSourceAgentId] = useState(
    agents[0]?.agentId || 'agent_youtube_scout'
  );
  const [targetAgentId, setTargetAgentId] = useState(
    agents[1]?.agentId || 'agent_mickey_daily'
  );
  const [pipelineTopic, setPipelineTopic] = useState('');
  const [runningPipeline, setRunningPipeline] = useState(false);
  const [testingWebhookAgentId, setTestingWebhookAgentId] = useState<string | null>(
    null
  );

  const analytics = computeWorkspaceAnalytics(
    agents,
    routinesByAgent,
    executionsByAgent,
    knowledgeByAgent,
    user.credits
  );

  const handleLaunchPipeline = async () => {
    if (!sourceAgentId || !targetAgentId || sourceAgentId === targetAgentId) return;
    setRunningPipeline(true);
    await runMultiAgentWorkflow(
      sourceAgentId,
      targetAgentId,
      pipelineTopic.trim() || undefined
    );
    setRunningPipeline(false);
  };

  return (
    <div className="p-4 sm:p-8 max-w-6xl mx-auto space-y-6 sm:space-y-8">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {t.workspace.title}
          </h1>
          <p className="text-xs text-slate-600 mt-1">
            {t.workspace.subtitle}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => openMarketplace(agents[0]?.agentId)}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap"
          >
            <Store className="h-4 w-4" />
            <span>{t.sidebar.toolMarketplace}</span>
          </button>
          <Link
            href="/workspace/create-agent"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
          >
            <Plus className="h-4 w-4" />
            <span>{t.sidebar.createAgent}</span>
          </Link>
        </div>
      </div>

      {/* 6. Enterprise Analytics & Multi-Agent Pipeline Hub */}
      <section className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                {locale === 'fr'
                  ? 'Taux de succès des routines'
                  : locale === 'it'
                    ? 'Tasso di successo routine'
                    : 'Routine Success Rate'}
              </span>
              <Activity className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {analytics.successRatePercent}%
            </p>
            <p className="text-[11px] text-slate-500 font-mono">
              {analytics.completedRuns}/{analytics.totalRuns} exécutions réussies
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                {locale === 'fr'
                  ? 'Temps moyen d’exécution'
                  : locale === 'it'
                    ? 'Tempo medio di esecuzione'
                    : 'Avg Execution Time'}
              </span>
              <Clock className="h-4 w-4 text-slate-700" />
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {(analytics.avgDurationMs / 1000).toFixed(2)}s
            </p>
            <p className="text-[11px] text-slate-500 font-mono">
              {analytics.avgDurationMs} ms · Inngest Pipeline
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                {locale === 'fr'
                  ? 'Base Documentaire RAG'
                  : locale === 'it'
                    ? 'Base Documentale RAG'
                    : 'RAG Knowledge Base'}
              </span>
              <BookOpen className="h-4 w-4 text-slate-700" />
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {analytics.totalKnowledgeDocs} docs
            </p>
            <p className="text-[11px] text-slate-500 font-mono">
              PDF · CSV · TXT · Procédures
            </p>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-slate-500">
              <span>
                {locale === 'fr'
                  ? 'Crédits & Webhooks / Workflows'
                  : locale === 'it'
                    ? 'Crediti & Webhook / Workflow'
                    : 'Credits & Webhooks / Workflows'}
              </span>
              <Coins className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
              {analytics.creditsRemaining} cr.
            </p>
            <p className="text-[11px] text-slate-500 font-mono">
              {analytics.creditsUsed} utilisés · {analytics.webhookRuns} webhooks ·{' '}
              {analytics.workflowRuns} chaînes
            </p>
          </div>
        </div>

        {/* Tool Breakdown & Quick Multi-Agent Workflow Launcher */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {/* Tool Breakdown Chart */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-slate-900">
                {locale === 'fr'
                  ? 'Répartition de l’activité par connecteur MCP / API'
                  : 'Activity Breakdown by MCP / API Connector'}
              </h2>
              <span className="text-[11px] font-mono text-slate-500">
                {analytics.toolBreakdown.length} outils actifs
              </span>
            </div>
            <div className="space-y-2">
              {analytics.toolBreakdown.slice(0, 5).map((item) => {
                const toolMeta = getToolBySlug(item.slug);
                return (
                  <div key={item.slug} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <ToolIcon slug={item.slug} className="h-3.5 w-3.5" />
                        <span className="font-medium text-slate-800">
                          {toolMeta?.name || item.slug.toUpperCase()}
                        </span>
                      </div>
                      <span className="font-mono text-[11px] text-slate-600 tabular-nums">
                        {item.count} ops ({item.percent}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className="h-full bg-slate-900 rounded-full"
                        style={{ width: `${Math.max(8, item.percent)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Multi-Agent Collaboration Launcher (Agent A -> Agent B) */}
          <div className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col justify-between space-y-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-slate-900" />
                <h2 className="text-xs font-bold text-slate-900">
                  {locale === 'fr'
                    ? 'Collaboration Multi-Agents (Workflow en chaîne A → B)'
                    : 'Multi-Agent Collaboration (Chain Workflow A → B)'}
                </h2>
              </div>
              <p className="text-[11px] text-slate-500">
                {locale === 'fr'
                  ? 'L’Agent A collecte et analyse les données (RAG + Web/GitHub), puis transmet automatiquement ses conclusions à l’Agent B pour rédaction et diffusion.'
                  : 'Agent A collects and analyzes insights, then hands off its findings to Agent B for executive synthesis and delivery.'}
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div>
                <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                  Agent A (Source / Veille)
                </label>
                <select
                  value={sourceAgentId}
                  onChange={(e) => setSourceAgentId(e.target.value)}
                  aria-label="Agent A Source"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-900"
                >
                  {agents.map((a) => (
                    <option key={a.agentId} value={a.agentId}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase text-slate-500 mb-1">
                  Agent B (Destination / Action)
                </label>
                <select
                  value={targetAgentId}
                  onChange={(e) => setTargetAgentId(e.target.value)}
                  aria-label="Agent B Destination"
                  className="w-full rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-900"
                >
                  {agents.map((a) => (
                    <option key={a.agentId} value={a.agentId}>
                      {a.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="text"
                value={pipelineTopic}
                onChange={(e) => setPipelineTopic(e.target.value)}
                placeholder="Instruction optionnelle (ex. Synthétiser les KPIs Q4 et préparer le briefing Slack)"
                className="flex-1 min-w-0 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs text-slate-900"
              />
              <button
                type="button"
                disabled={runningPipeline || sourceAgentId === targetAgentId}
                onClick={handleLaunchPipeline}
                className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 shrink-0"
              >
                {runningPipeline ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    <span>Exécution...</span>
                  </>
                ) : (
                  <>
                    <GitBranch className="h-3.5 w-3.5" />
                    <span>Exécuter A → B</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Agents Grid */}
      {agents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-200 p-12 text-center space-y-3">
          <p className="text-sm font-bold text-slate-900">
            {t.workspace.emptyTitle}
          </p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            {t.workspace.emptySub}
          </p>
          <Link
            href="/workspace/create-agent"
            className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-xs font-semibold text-white hover:bg-slate-800"
          >
            <Plus className="h-4 w-4" />
            <span>{t.sidebar.createAgent}</span>
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {agents.map((ag) => {
            const routines = routinesByAgent[ag.agentId] || [];
            const execs = executionsByAgent[ag.agentId] || [];
            const docs = knowledgeByAgent[ag.agentId] || [];
            return (
              <div
                key={ag.agentId}
                className="rounded-xl border border-slate-200 bg-white p-5 flex flex-col justify-between space-y-4 hover:border-slate-300 transition-colors"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative h-11 w-11 rounded-full overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                        <Image
                          src={ag.agentImage}
                          alt={ag.name}
                          fill
                          sizes="44px"
                          referrerPolicy="no-referrer"
                          className="object-cover"
                        />
                      </div>
                      <div className="min-w-0">
                        <h2 className="text-sm font-bold text-slate-900 truncate">
                          {ag.name}
                        </h2>
                        <p className="text-[11px] text-slate-500 font-mono">
                          {ag.sandboxId}
                        </p>
                      </div>
                    </div>
                    <span
                      className={`text-[11px] font-medium ${
                        ag.isActive ? 'text-emerald-700' : 'text-amber-700'
                      }`}
                    >
                      {ag.isActive ? t.workspace.active : t.workspace.paused}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                    {ag.description}
                  </p>

                  <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-500 pt-1">
                    <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                      <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
                      <span>{routines.length} {t.workspace.routinesCount}</span>
                    </span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                      <BookOpen className="h-3.5 w-3.5 text-slate-400" />
                      <span>{docs.length} RAG</span>
                    </span>
                    <span>·</span>
                    <span className="font-mono tabular-nums">
                      {execs.length} {t.workspace.runsCount}
                    </span>
                  </div>
                </div>

                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    {ag.tools.map((slug) => (
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
                      disabled={testingWebhookAgentId === ag.agentId}
                      onClick={async () => {
                        setTestingWebhookAgentId(ag.agentId);
                        await triggerIncomingWebhook(
                          ag.agentId,
                          'stripe.charge.succeeded',
                          {
                            amount: '$299.00',
                            customer: 'enterprise@orbit.ai',
                          }
                        );
                        setTestingWebhookAgentId(null);
                      }}
                      title="Déclencher un événement Webhook entrant sur cet agent"
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100"
                    >
                      <Webhook className="h-3.5 w-3.5" />
                      <span>
                        {testingWebhookAgentId === ag.agentId ? '...' : 'Webhook'}
                      </span>
                    </button>

                    <Link
                      href={`/workspace/${ag.agentId}`}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
                    >
                      <span>{t.workspace.openAgent}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
