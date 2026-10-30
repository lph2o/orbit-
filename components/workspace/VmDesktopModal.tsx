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
} from 'lucide-react';
import { useOrbit } from '@/context/OrbitContext';
import { buildVmActionTrace, getRemainingVmSeconds } from '@/lib/orbit-logic';

type DesktopAppTab = 'browser' | 'terminal' | 'files';

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
    'https://news.google.com/search?q=Artificial+Intelligence'
  );
  const [isLoadingBrowse, setIsLoadingBrowse] = useState<boolean>(false);
  const [nowMs, setNowMs] = useState<number>(() => Date.now());

  const agent = agents.find((a) => a.agentId === activeVmModalAgentId);

  useEffect(() => {
    if (!activeVmModalAgentId) return;
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, [activeVmModalAgentId]);

  if (!activeVmModalAgentId || !agent) return null;

  const trace =
    activeVmTraceByAgent[agent.agentId] || buildVmActionTrace(urlInput, locale);
  const remainingSec = getRemainingVmSeconds(agent.vmStatus, agent.vmLastActive, nowMs);

  const handleBrowserSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    touchVmActivity(agent.agentId);
    setIsLoadingBrowse(true);
    try {
      await browseVmUrl(agent.agentId, urlInput);
    } finally {
      setIsLoadingBrowse(false);
    }
  };

  const handlePreset = async (targetUrl: string) => {
    setUrlInput(targetUrl);
    touchVmActivity(agent.agentId);
    setIsLoadingBrowse(true);
    try {
      await browseVmUrl(agent.agentId, targetUrl);
    } finally {
      setIsLoadingBrowse(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`E2B Cloud VM Desktop · ${agent.name}`}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/75 backdrop-blur-xs p-4"
    >
      <div className="w-full max-w-6xl h-[86vh] rounded-xl border border-slate-700 bg-slate-900 text-slate-100 shadow-2xl flex flex-col overflow-hidden">
        {/* VM Top Bar */}
        <div className="px-4 py-2.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <span className="text-xs font-semibold text-white truncate">
              E2B Cloud VM Sandbox · {agent.name}
            </span>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              ({agent.sandboxId})
            </span>
            <span className="text-xs text-slate-400">·</span>
            <span
              className={`text-xs font-medium ${
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

          <div className="flex items-center gap-2.5">
            {agent.vmStatus === 'active' && (
              <span className="inline-flex items-center gap-1.5 text-xs text-slate-300 font-mono tabular-nums bg-slate-900 border border-slate-800 px-2.5 py-1 rounded-md">
                <Clock className="h-3.5 w-3.5 text-amber-400" />
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
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1 text-xs font-medium text-slate-200 hover:bg-slate-700 transition-colors"
              >
                <Pause className="h-3.5 w-3.5" />
                <span>{t.vm.pauseSandbox}</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setVmStatusForAgent(agent.agentId, 'active', trace)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1 text-xs font-medium text-white hover:bg-emerald-500 transition-colors"
              >
                <Play className="h-3.5 w-3.5" />
                <span>{t.vm.resumeSandbox}</span>
              </button>
            )}

            <button
              type="button"
              onClick={closeVmModal}
              aria-label="Close Cloud VM Desktop"
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Desktop Taskbar / App Switcher */}
        <div className="px-4 py-2 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-4">
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => {
                setActiveApp('browser');
                touchVmActivity(agent.agentId);
              }}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeApp === 'browser'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Globe className="h-3.5 w-3.5 text-blue-400" />
              <span>{t.vm.chromeTab}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveApp('terminal');
                touchVmActivity(agent.agentId);
              }}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeApp === 'terminal'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <Terminal className="h-3.5 w-3.5 text-emerald-400" />
              <span>{t.vm.terminalTab}</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveApp('files');
                touchVmActivity(agent.agentId);
              }}
              className={`inline-flex items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeApp === 'files'
                  ? 'bg-slate-800 text-white border border-slate-700'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800/50'
              }`}
            >
              <FolderOpen className="h-3.5 w-3.5 text-amber-400" />
              <span>{t.vm.filesTab}</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handlePreset('Artificial Intelligence')}
              className="text-xs text-slate-300 hover:text-white px-2.5 py-1 rounded border border-slate-800 bg-slate-950/60"
            >
              {t.vm.presetNews}
            </button>
            <button
              type="button"
              onClick={() => handlePreset('tubeguruji courses')}
              className="text-xs text-slate-300 hover:text-white px-2.5 py-1 rounded border border-slate-800 bg-slate-950/60"
            >
              {t.vm.presetCourses}
            </button>
          </div>
        </div>

        {/* Main VM Viewport */}
        {agent.vmStatus !== 'active' ? (
          <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-950/80">
            <p className="text-sm font-semibold text-white">
              Cloud VM Sandbox ({agent.vmStatus})
            </p>
            <p className="text-xs text-slate-400 max-w-md mt-1.5 leading-relaxed">
              {t.vm.pausedDesc} (<span className="font-mono text-slate-200">{agent.sandboxId}</span>)
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
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-3 overflow-hidden">
            {/* Browser Left 2 Cols */}
            <div className="lg:col-span-2 flex flex-col bg-white text-slate-900 border-r border-slate-200 overflow-hidden">
              {/* Chrome Address Bar */}
              <form
                onSubmit={handleBrowserSearch}
                className="px-3 py-2 bg-slate-100 border-b border-slate-200 flex items-center gap-2"
              >
                <button
                  type="button"
                  onClick={() => handlePreset(urlInput)}
                  aria-label="Reload VM Browser"
                  className="p-1 text-slate-500 hover:text-slate-900"
                >
                  {isLoadingBrowse ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-900" />
                  ) : (
                    <RotateCcw className="h-3.5 w-3.5" />
                  )}
                </button>
                <div className="flex-1 flex items-center gap-2 rounded-md border border-slate-300 bg-white px-3 py-1">
                  <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                  <input
                    type="text"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    aria-label="VM Chrome URL or search query"
                    className="w-full text-xs text-slate-800 focus:outline-none font-mono"
                  />
                </div>
                <button
                  type="submit"
                  disabled={isLoadingBrowse}
                  className="rounded-md bg-slate-900 px-3 py-1 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {t.vm.navigateBtn}
                </button>
              </form>

              {/* Live Webpage / RSS Extracted Content */}
              <div className="flex-1 overflow-y-auto p-6 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <div>
                    <p className="text-[11px] font-mono text-slate-500">{trace.url}</p>
                    <h3 className="text-base font-bold text-slate-900 mt-0.5">
                      {trace.title}
                    </h3>
                  </div>
                  <span className="text-xs text-emerald-700 font-medium flex items-center gap-1">
                    <ExternalLink className="h-3.5 w-3.5" />
                    <span>{t.vm.liveSession}</span>
                  </span>
                </div>

                <div className="space-y-3">
                  {trace.extractedItems.map((item, idx) => (
                    <div
                      key={idx}
                      className="rounded-lg border border-slate-200 p-4 hover:border-slate-300 transition-colors"
                    >
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <span className="font-semibold text-slate-700">
                          0{idx + 1}. {item.source}
                        </span>
                        <span>·</span>
                        <span className="font-mono tabular-nums">{item.timeAgo}</span>
                      </div>
                      <h4 className="text-sm font-semibold text-slate-900 mt-1">
                        {item.headline}
                      </h4>
                      <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                        {item.summary}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Agent Computer-Use Execution Log (Right Col) */}
            <div className="bg-slate-950 p-4 flex flex-col overflow-y-auto">
              <h4 className="text-xs font-semibold text-white uppercase tracking-wider">
                {t.vm.actionTraceTitle}
              </h4>
              <p className="text-xs text-slate-400 mt-1">
                {t.vm.actionTraceSub} ({agent.name})
              </p>

              <div className="mt-4 space-y-2.5">
                {trace.steps.map((step, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-2.5 rounded-lg border border-slate-800 bg-slate-900/90 p-3 text-xs"
                  >
                    <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-medium text-slate-200">0{i + 1}</p>
                      <p className="text-slate-400 mt-0.5 leading-relaxed">{step}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ) : activeApp === 'terminal' ? (
          <div className="flex-1 bg-slate-950 p-5 font-mono text-xs text-slate-200 overflow-y-auto space-y-2">
            <p className="text-emerald-400">
              user@{agent.sandboxId}:~/workspace$ e2b-desktop status
            </p>
            <p className="text-slate-300">
              DISPLAY=:0 · Resolution: 1440x900 · Browser: Google Chrome 134.0 (Headless-X11)
            </p>
            <p className="text-emerald-400 mt-3">
              user@{agent.sandboxId}:~/workspace$ agent-runner --query &quot;{trace.query}&quot;
            </p>
            {trace.steps.map((s, idx) => (
              <p key={idx} className="text-slate-300">
                [step 0{idx + 1}] {s}
              </p>
            ))}
            <p className="text-emerald-400">
              [done] Extracted {trace.extractedItems.length} structured items and returned JSON summary to Orbit Agent SDK.
            </p>
          </div>
        ) : (
          <div className="flex-1 bg-slate-950 p-6 text-xs text-slate-200 overflow-y-auto">
            <h4 className="font-semibold text-sm text-white mb-3">
              /home/user/workspace ({agent.sandboxId})
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-3.5">
                <p className="font-mono font-semibold text-amber-300">
                  google_news_digest.json
                </p>
                <p className="text-slate-400 mt-1">
                  Latest 5 extracted headlines from Chrome computer-use run (4.2 KB)
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-3.5">
                <p className="font-mono font-semibold text-amber-300">
                  chrome_session_profile/
                </p>
                <p className="text-slate-400 mt-1">
                  Persistent cookies &amp; authenticated site storage across VM pauses
                </p>
              </div>
              <div className="rounded-lg border border-slate-800 bg-slate-900 p-3.5">
                <p className="font-mono font-semibold text-amber-300">
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
