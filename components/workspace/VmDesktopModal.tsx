'use client';

import React, { useEffect, useState } from 'react';
import {
  X,
  Globe,
  Terminal,
  FolderOpen,
  Pause,
  Play,
  RotateCcw,
  Search,
  ExternalLink,
  CheckCircle2,
  Clock,
  Loader2,
  ChevronLeft,
  ChevronRight,
  Bookmark,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { useOrbit } from '@/context/OrbitContext';
import {
  buildVmActionTrace,
  formatReadableVmUrl,
  getRemainingVmSeconds,
} from '@/lib/orbit-logic';

type DesktopAppTab = 'browser' | 'terminal' | 'files';

const QUICK_BOOKMARKS = [
  {
    labelFr: 'Google News IA',
    labelEn: 'Google News AI',
    query: 'Intelligence Artificielle',
  },
  {
    labelFr: 'Cours TubeGuruji',
    labelEn: 'TubeGuruji Courses',
    query: 'https://www.tubeguruji.com/courses',
  },
  {
    labelFr: 'Hacker News',
    labelEn: 'Hacker News',
    query: 'https://news.ycombinator.com',
  },
  {
    labelFr: 'Wikipédia IA',
    labelEn: 'Wikipedia AI',
    query: 'https://fr.wikipedia.org/wiki/Intelligence_artificielle',
  },
  {
    labelFr: 'Agents LLM & MCP',
    labelEn: 'LLM Agents & MCP',
    query: 'AI Agents MCP Cloud Sandbox',
  },
];

export function VmDesktopModal() {
  const {
    activeVmModalAgentId,
    closeVmModal,
    agents,
    activeVmTraceByAgent,
    setVmStatusForAgent,
    browseVmUrl,
    touchVmActivity,
    locale,
    t,
  } = useOrbit();

  const [activeApp, setActiveApp] = useState<DesktopAppTab>('browser');
  const [urlInput, setUrlInput] = useState<string>(
    'https://news.google.com/search?q=Intelligence+Artificielle&hl=fr'
  );
  const [historyStack, setHistoryStack] = useState<string[]>([
    'Intelligence Artificielle',
  ]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);
  const [selectedItemIdx, setSelectedItemIdx] = useState<number | null>(null);
  const [isLoadingBrowse, setIsLoadingBrowse] = useState<boolean>(false);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const agent = agents.find((a) => a.agentId === activeVmModalAgentId);
  const storedTrace = activeVmModalAgentId
    ? activeVmTraceByAgent[activeVmModalAgentId]
    : undefined;

  useEffect(() => {
    if (!activeVmModalAgentId) return;
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [activeVmModalAgentId]);

  // Keep the Chrome address bar synchronized whenever the agent's active trace URL changes
  useEffect(() => {
    if (storedTrace?.url) {
      setUrlInput(formatReadableVmUrl(storedTrace.url));
      setSelectedItemIdx(null);
    }
  }, [storedTrace?.url]);

  if (!activeVmModalAgentId || !agent) return null;

  const trace = storedTrace || buildVmActionTrace(urlInput, locale);
  const decodedTraceUrl = formatReadableVmUrl(trace.url);
  const remainingSec = getRemainingVmSeconds(
    agent.vmStatus,
    agent.vmLastActive,
    nowMs
  );

  const navigateToTarget = async (
    targetQueryOrUrl: string,
    pushToHistory = true
  ) => {
    const cleanedTarget = targetQueryOrUrl.trim() || 'Intelligence Artificielle';
    setSelectedItemIdx(null);
    touchVmActivity(agent.agentId);
    setIsLoadingBrowse(true);

    if (pushToHistory) {
      const nextStack = [
        ...historyStack.slice(0, historyIndex + 1),
        cleanedTarget,
      ];
      setHistoryStack(nextStack);
      setHistoryIndex(nextStack.length - 1);
    }

    try {
      const updatedTrace = await browseVmUrl(agent.agentId, cleanedTarget);
      if (updatedTrace?.url) {
        setUrlInput(formatReadableVmUrl(updatedTrace.url));
      } else {
        setUrlInput(formatReadableVmUrl(cleanedTarget));
      }
    } finally {
      setIsLoadingBrowse(false);
    }
  };

  const handleBrowserSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    await navigateToTarget(urlInput, true);
  };

  const handlePreset = async (targetUrl: string) => {
    setActiveApp('browser');
    await navigateToTarget(targetUrl, true);
  };

  const handleGoBack = async () => {
    if (historyIndex <= 0 || isLoadingBrowse) return;
    const prevIdx = historyIndex - 1;
    setHistoryIndex(prevIdx);
    await navigateToTarget(historyStack[prevIdx], false);
  };

  const handleGoForward = async () => {
    if (historyIndex >= historyStack.length - 1 || isLoadingBrowse) return;
    const nextIdx = historyIndex + 1;
    setHistoryIndex(nextIdx);
    await navigateToTarget(historyStack[nextIdx], false);
  };

  const selectedItem =
    selectedItemIdx !== null ? trace.extractedItems[selectedItemIdx] : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`E2B Cloud VM Desktop · ${agent.name}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-2 sm:p-4 overflow-hidden"
    >
      <div className="w-full max-w-6xl h-[90vh] max-h-[860px] min-w-0 rounded-xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl flex flex-col overflow-hidden">
        {/* VM Top Bar */}
        <div className="px-3 sm:px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-2 min-w-0 shrink-0">
          <div className="flex items-center gap-2 min-w-0 flex-1 overflow-hidden">
            <span className="h-2 w-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="text-xs font-semibold text-white truncate">
              E2B Cloud VM Sandbox · {agent.name}
            </span>
            <span className="hidden sm:inline text-xs text-slate-400 font-mono tabular-nums shrink-0">
              ({agent.sandboxId})
            </span>
            <span className="hidden md:inline text-xs text-slate-500 shrink-0">·</span>
            <span
              className={`hidden md:inline text-xs font-medium truncate ${
                agent.vmStatus === 'active'
                  ? 'text-emerald-400'
                  : agent.vmStatus === 'paused'
                    ? 'text-amber-400'
                    : 'text-slate-400'
              }`}
            >
              {agent.vmStatus === 'active'
                ? t.vm.running
                : agent.vmStatus === 'paused'
                  ? t.vm.paused
                  : t.vm.inactive}
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {agent.vmStatus === 'active' && (
              <span className="hidden sm:inline-flex items-center gap-1.5 text-xs text-slate-300 font-mono tabular-nums bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md shrink-0">
                <Clock className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                <span>
                  {t.vm.autoPauseIn} {Math.floor(remainingSec / 60)}:
                  {String(remainingSec % 60).padStart(2, '0')}
                </span>
              </span>
            )}

            {agent.vmStatus === 'active' ? (
              <button
                type="button"
                onClick={() => setVmStatusForAgent(agent.agentId, 'paused')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-2.5 sm:px-3 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors shrink-0 whitespace-nowrap"
              >
                <Pause className="h-3.5 w-3.5 shrink-0" />
                <span>{t.vm.pauseSandbox}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setVmStatusForAgent(agent.agentId, 'active', trace)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-2.5 sm:px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500 transition-colors shrink-0 whitespace-nowrap"
              >
                <Play className="h-3.5 w-3.5 shrink-0" />
                <span>{t.vm.resumeSandbox}</span>
              </button>
            )}

            <button
              type="button"
              onClick={closeVmModal}
              aria-label="Close Cloud VM Desktop"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors shrink-0"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Desktop Taskbar / App Switcher */}
        <div className="px-3 sm:px-4 py-2 bg-slate-900 border-b border-slate-800 flex flex-wrap items-center justify-between gap-2 min-w-0 shrink-0">
          <div className="flex flex-wrap items-center gap-1.5 min-w-0">
            <button
              type="button"
              onClick={() => {
                setActiveApp('browser');
                touchVmActivity(agent.agentId);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                activeApp === 'browser'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Globe className="h-3.5 w-3.5 text-blue-400 shrink-0" />
              <span>{t.vm.chromeTab}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveApp('terminal');
                touchVmActivity(agent.agentId);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                activeApp === 'terminal'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Terminal className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
              <span>{t.vm.terminalTab}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveApp('files');
                touchVmActivity(agent.agentId);
              }}
              className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 sm:px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap ${
                activeApp === 'files'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <FolderOpen className="h-3.5 w-3.5 text-amber-400 shrink-0" />
              <span>{t.vm.filesTab}</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-1.5 shrink-0">
            <button
              type="button"
              onClick={() => handlePreset('Intelligence Artificielle')}
              className="text-xs text-slate-300 hover:text-white px-2.5 py-1 rounded border border-slate-800 bg-slate-950/60 hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              {t.vm.presetNews}
            </button>
            <button
              type="button"
              onClick={() => handlePreset('https://www.tubeguruji.com/courses')}
              className="text-xs text-slate-300 hover:text-white px-2.5 py-1 rounded border border-slate-800 bg-slate-950/60 hover:bg-slate-800 transition-colors whitespace-nowrap"
            >
              {t.vm.presetCourses}
            </button>
          </div>
        </div>

        {/* Main VM Viewport */}
        {agent.vmStatus !== 'active' ? (
          <div className="flex-1 min-h-0 flex flex-col items-center justify-center p-8 text-center bg-slate-950/80">
            <p className="text-sm font-semibold text-white">
              Cloud VM Sandbox ({agent.vmStatus})
            </p>
            <p className="text-xs text-slate-400 max-w-md mt-1.5 leading-relaxed">
              {t.vm.pausedDesc} (
              <span className="font-mono text-slate-200">{agent.sandboxId}</span>)
            </p>
            <button
              type="button"
              onClick={() => setVmStatusForAgent(agent.agentId, 'active', trace)}
              className="mt-4 inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-xs font-semibold text-slate-950 hover:bg-slate-200 transition-colors"
            >
              <Play className="h-3.5 w-3.5" />
              <span>{t.vm.activateBtn}</span>
            </button>
          </div>
        ) : activeApp === 'browser' ? (
          <div className="flex-1 min-h-0 min-w-0 grid grid-cols-1 lg:grid-cols-3 overflow-hidden">
            {/* Browser Left 2 Cols */}
            <div className="lg:col-span-2 min-w-0 min-h-0 flex flex-col bg-white text-slate-900 border-b lg:border-b-0 lg:border-r border-slate-200 overflow-hidden">
              {/* Chrome Navigation & Address Bar */}
              <form
                onSubmit={handleBrowserSearch}
                className="px-3 py-2 bg-slate-100 border-b border-slate-200 flex items-center gap-1.5 min-w-0 shrink-0"
              >
                <div className="flex items-center gap-0.5 shrink-0">
                  <button
                    type="button"
                    onClick={handleGoBack}
                    disabled={historyIndex <= 0 || isLoadingBrowse}
                    aria-label="Back in VM Browser"
                    className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={handleGoForward}
                    disabled={
                      historyIndex >= historyStack.length - 1 || isLoadingBrowse
                    }
                    aria-label="Forward in VM Browser"
                    className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 disabled:opacity-30 disabled:pointer-events-none transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => navigateToTarget(urlInput, false)}
                    aria-label="Reload VM Browser"
                    className="p-1 rounded text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 transition-colors"
                  >
                    {isLoadingBrowse ? (
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-900" />
                    ) : (
                      <RotateCcw className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>

                <div className="flex-1 min-w-0 flex items-center gap-2 rounded-md border border-slate-300 bg-white px-2.5 py-1 focus-within:border-slate-500">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                  <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    placeholder={
                      locale === 'fr'
                        ? 'Rechercher sur Google News ou saisir une URL (https://...)'
                        : 'Search Google News or enter a URL (https://...)'
                    }
                    aria-label="VM Chrome URL or search query"
                    className="w-full min-w-0 text-xs text-slate-800 focus:outline-none font-mono truncate"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoadingBrowse}
                  className="rounded-md bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50 shrink-0 whitespace-nowrap"
                >
                  {t.vm.navigateBtn}
                </button>
              </form>

              {/* Quick Bookmarks Bar */}
              <div className="px-3 py-1.5 bg-slate-50 border-b border-slate-200 flex items-center gap-1.5 overflow-x-auto min-w-0 shrink-0">
                <Bookmark className="h-3 w-3 text-slate-400 shrink-0 mr-0.5" />
                {QUICK_BOOKMARKS.map((bm) => (
                  <button
                    key={bm.query}
                    type="button"
                    disabled={isLoadingBrowse}
                    onClick={() => navigateToTarget(bm.query, true)}
                    className="inline-flex items-center gap-1 rounded border border-slate-200 bg-white px-2 py-0.5 text-[11px] font-medium text-slate-700 hover:bg-slate-100 hover:text-slate-950 transition-colors whitespace-nowrap shrink-0"
                  >
                    <span>{locale === 'fr' ? bm.labelFr : bm.labelEn}</span>
                  </button>
                ))}
              </div>

              {/* Live Webpage / RSS Extracted Content */}
              <div className="flex-1 min-h-0 min-w-0 overflow-y-auto overflow-x-hidden p-4 sm:p-6 space-y-4">
                <div className="flex items-start justify-between gap-3 border-b border-slate-200 pb-3 min-w-0">
                  <div className="min-w-0 flex-1">
                    <p
                      className="text-[11px] font-mono text-slate-500 truncate"
                      title={decodedTraceUrl}
                    >
                      {decodedTraceUrl}
                    </p>
                    <h3 className="text-sm sm:text-base font-bold text-slate-900 mt-0.5 break-words">
                      {trace.title}
                    </h3>
                  </div>
                  <a
                    href={trace.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs text-emerald-700 hover:text-emerald-800 font-medium inline-flex items-center gap-1 shrink-0 whitespace-nowrap bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-md"
                  >
                    <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    <span>{t.vm.liveSession}</span>
                  </a>
                </div>

                {/* Selected Item Reader / Inspector Banner */}
                {selectedItem && (
                  <div className="rounded-xl border border-slate-300 bg-slate-900 text-white p-4 space-y-2.5 min-w-0">
                    <div className="flex items-start justify-between gap-2 min-w-0">
                      <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-400 min-w-0">
                        <Sparkles className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">
                          {locale === 'fr'
                            ? `Inspection DOM en direct · ${selectedItem.source}`
                            : `Live DOM Reader · ${selectedItem.source}`}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSelectedItemIdx(null)}
                        className="text-xs text-slate-400 hover:text-white shrink-0"
                      >
                        {locale === 'fr' ? 'Fermer l’aperçu' : 'Close preview'}
                      </button>
                    </div>
                    <h4 className="text-sm font-bold text-white break-words">
                      {selectedItem.headline}
                    </h4>
                    <p className="text-xs text-slate-300 leading-relaxed break-words">
                      {selectedItem.summary}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() =>
                          navigateToTarget(selectedItem.headline, true)
                        }
                        className="inline-flex items-center gap-1.5 rounded-md bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-900 hover:bg-slate-200 transition-colors"
                      >
                        <Search className="h-3 w-3" />
                        <span>
                          {locale === 'fr'
                            ? 'Explorer ce sujet dans Chrome'
                            : 'Explore topic in Chrome'}
                        </span>
                      </button>
                      {selectedItem.link && (
                        <a
                          href={selectedItem.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-md border border-slate-700 bg-slate-800 px-2.5 py-1 text-[11px] font-medium text-slate-200 hover:bg-slate-700 transition-colors"
                        >
                          <span>
                            {locale === 'fr'
                              ? 'Ouvrir l’article source'
                              : 'Open source article'}
                          </span>
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-2.5 min-w-0">
                  {trace.extractedItems.map((item, idx) => {
                    const isSelected = selectedItemIdx === idx;
                    return (
                      <div
                        key={idx}
                        onClick={() =>
                          setSelectedItemIdx(isSelected ? null : idx)
                        }
                        className={`rounded-lg border p-3.5 transition-colors cursor-pointer min-w-0 ${
                          isSelected
                            ? 'border-slate-900 bg-slate-50'
                            : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/60'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2 text-xs text-slate-500 min-w-0">
                          <div className="flex items-center gap-2 min-w-0 truncate">
                            <span className="font-semibold text-slate-700 truncate">
                              0{idx + 1}. {item.source}
                            </span>
                            <span>·</span>
                            <span className="font-mono tabular-nums shrink-0">
                              {item.timeAgo}
                            </span>
                          </div>
                          <span className="text-[11px] font-medium text-slate-500 hover:text-slate-900 shrink-0">
                            {locale === 'fr' ? 'Inspecter' : 'Inspect'}
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-slate-900 mt-1 break-words">
                          {item.headline}
                        </h4>
                        <p className="text-xs text-slate-600 mt-1 leading-relaxed break-words">
                          {item.summary}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Agent Computer-Use Execution Log (Right Col) */}
            <div className="bg-slate-950 p-4 flex flex-col min-w-0 min-h-0 overflow-y-auto overflow-x-hidden">
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider break-words">
                {t.vm.actionTraceTitle}
              </h4>
              <p className="text-xs text-slate-400 mt-1 break-words">
                {t.vm.actionTraceSub} ({agent.name})
              </p>

              <div className="mt-4 space-y-2.5 min-w-0">
                {trace.steps.map((step, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 rounded-lg border border-slate-800 bg-slate-900/90 p-3 text-xs min-w-0"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-slate-200">0{i + 1}</p>
                      <p className="text-slate-400 mt-0.5 leading-relaxed break-words">
                        {step}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : activeApp === 'terminal' ? (
          <div className="flex-1 min-h-0 min-w-0 bg-slate-950 p-5 font-mono text-xs text-slate-200 overflow-y-auto overflow-x-hidden space-y-2">
            <p className="text-emerald-400 break-all">
              user@{agent.sandboxId}:~/workspace$ e2b-desktop status
            </p>
            <p className="text-slate-300 break-words">
              DISPLAY=:0 · Resolution: 1440x900 · Browser: Google Chrome 134.0 (Headless-X11)
            </p>
            <p className="text-emerald-400 mt-3 break-words">
              user@{agent.sandboxId}:~/workspace$ agent-runner --query &quot;{trace.query}&quot;
            </p>
            {trace.steps.map((s, idx) => (
              <p key={idx} className="text-slate-300 break-words">
                [step 0{idx + 1}] {s}
              </p>
            ))}
            <p className="text-emerald-400 break-words">
              [done] Extracted {trace.extractedItems.length} structured items and returned JSON summary to Orbit Agent SDK.
            </p>
          </div>
        ) : (
          <div className="flex-1 min-h-0 min-w-0 bg-slate-950 p-6 text-xs text-slate-200 overflow-y-auto overflow-x-hidden">
            <h4 className="font-semibold text-sm text-white mb-3 break-words">
              /home/user/workspace ({agent.sandboxId})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-3.5 min-w-0">
                <p className="font-mono font-semibold text-amber-300 truncate">
                  google_news_digest.json
                </p>
                <p className="text-slate-400 mt-1">
                  Latest {trace.extractedItems.length} extracted headlines from Chrome computer-use run (4.2 KB)
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-3.5 min-w-0">
                <p className="font-mono font-semibold text-amber-300 truncate">
                  chrome_session_profile/
                </p>
                <p className="text-slate-400 mt-1">
                  Persistent cookies &amp; authenticated site storage across VM pauses
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-3.5 min-w-0">
                <p className="font-mono font-semibold text-amber-300 truncate">
                  last_viewport_capture.png
                </p>
                <p className="text-slate-400 mt-1">
                  1440x900 desktop frame inspected by multimodal agent model
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
