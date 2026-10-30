'use client';

import React, { useState } from 'react';
import { X, Search, Check, Plus, Unplug } from 'lucide-react';
import { useOrbit } from '@/context/OrbitContext';
import { TOOL_CATALOG } from '@/lib/orbit-logic';
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
    t,
  } = useOrbit();

  const [selectedAgentId, setSelectedAgentId] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [connectingSlug, setConnectingSlug] = useState<string | null>(null);

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
    await new Promise((r) => setTimeout(r, 200));
    await connectToolToAgent(targetAgent.agentId, slug);
    setConnectingSlug(null);
  };

  const handleDisconnect = async (slug: string) => {
    if (!targetAgent) return;
    setConnectingSlug(slug);
    await disconnectToolFromAgent(targetAgent.agentId, slug);
    setConnectingSlug(null);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t.marketplace.title}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4"
    >
      <div className="w-full max-w-4xl rounded-xl border border-slate-200 bg-white shadow-xl flex flex-col max-h-[86vh] overflow-hidden">
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
