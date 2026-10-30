'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Plus, Monitor, CalendarClock, ArrowRight, Store } from 'lucide-react';
import { useOrbit } from '@/context/OrbitContext';
import { ToolIcon } from '@/components/workspace/ToolIcon';

export default function WorkspaceIndexPage() {
  const { agents, routinesByAgent, executionsByAgent, openMarketplace, t } = useOrbit();

  return (
    <div className="p-8 max-w-6xl mx-auto space-y-8">
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

                  <div className="flex items-center gap-3 text-xs text-slate-500 pt-1">
                    <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                      <CalendarClock className="h-3.5 w-3.5 text-slate-400" />
                      <span>{routines.length} {t.workspace.routinesCount}</span>
                    </span>
                    <span>·</span>
                    <span className="inline-flex items-center gap-1 font-mono tabular-nums">
                      <Monitor className="h-3.5 w-3.5 text-slate-400" />
                      <span>VM {ag.vmStatus}</span>
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

                  <Link
                    href={`/workspace/${ag.agentId}`}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
                  >
                    <span>{t.workspace.openAgent}</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
