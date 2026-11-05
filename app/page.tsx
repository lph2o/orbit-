'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import {
  ArrowRight,
  Monitor,
  CalendarClock,
  Wrench,
  CheckCircle2,
  Plus,
  Search,
  Terminal,
  ShieldCheck,
  Orbit,
} from 'lucide-react';
import { useOrbit } from '@/context/OrbitContext';
import { TOOL_CATALOG } from '@/lib/orbit-logic';
import { ToolIcon } from '@/components/workspace/ToolIcon';
import { LanguageSwitcher } from '@/components/workspace/LanguageSwitcher';
import { triggerCommandPalette } from '@/components/workspace/CommandPaletteModal';

export default function HomePage() {
  const router = useRouter();
  const {
    agents,
    signInWithGoogle,
    openMarketplace,
    openVmModal,
    setVmStatusForAgent,
    t,
  } = useOrbit();

  const [heroPreviewTab, setHeroPreviewTab] = useState<'agents' | 'vm'>('agents');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('autostart') === '1' && agents[0]) {
        router.replace(`/workspace/${agents[0].agentId}`);
      }
    }
  }, [agents, router]);

  const primaryAgentId = agents[0]?.agentId || 'agent_mickey_daily';

  return (
    <div className="min-h-screen flex flex-col bg-[#FAFBFD] text-slate-900">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="sticky top-0 z-30 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="flex items-center justify-between gap-4 sm:gap-8 px-4 sm:px-8 py-3.5 max-w-7xl w-full mx-auto">
          <Link
            href="/"
            className="flex items-center gap-2 text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
          >
            <div className="h-7 w-7 rounded-lg bg-slate-900 text-white flex items-center justify-center shadow-2xs">
              <Orbit className="h-4 w-4" />
            </div>
            <span>Orbit</span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
            <a
              href="#capabilities"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              {t.nav.capabilities}
            </a>
            <a
              href="#cloud-vm"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              {t.nav.cloudVm}
            </a>
            <a
              href="#routines"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              {t.nav.routines}
            </a>
            <a
              href="#marketplace"
              className="hover:text-slate-900 transition-colors whitespace-nowrap shrink-0"
            >
              {t.nav.marketplace}
            </a>
          </nav>

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={triggerCommandPalette}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200/90 bg-[#FAFBFD] px-3 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors"
            >
              <Search className="h-3.5 w-3.5 text-slate-400" />
              <span className="hidden sm:inline">Rechercher</span>
              <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-500">
                ⌘K
              </kbd>
            </button>

            <Link
              href={`/workspace/${primaryAgentId}`}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-xl shadow-2xs hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
            >
              {t.nav.openWorkspace}
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-8 py-8 sm:py-12 space-y-14 sm:space-y-20">
        {/* Hero Section (2-Column Split + Below-Fold KPI Strip) */}
        <section className="space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-10 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="inline-flex items-center gap-2 rounded-lg border border-slate-200/90 bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-2xs">
                  <span className="h-2 w-2 rounded-full bg-emerald-500" />
                  <span>{t.landing.eyebrow}</span>
                </div>
                <LanguageSwitcher />
              </div>

              <h1
                className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-[1.1]"
                style={{ textWrap: 'balance' }}
              >
                {t.landing.heroTitle}
              </h1>
              <p className="text-base text-slate-600 max-w-2xl leading-relaxed">
                {t.landing.heroSubtitle}
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-2">
                <Link
                  href={`/workspace/${primaryAgentId}`}
                  className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white shadow-sm hover:bg-slate-800 transition-colors whitespace-nowrap"
                >
                  <span>{t.landing.ctaPrimary}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/workspace/create-agent"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-300/90 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap"
                >
                  <Plus className="h-4 w-4" />
                  <span>{t.landing.ctaCreate}</span>
                </Link>
                <button
                  type="button"
                  onClick={signInWithGoogle}
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-200/90 bg-white px-4 py-3 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap"
                >
                  <span>{t.landing.ctaGoogle}</span>
                </button>
              </div>
            </div>

            {/* Right Column: Dual-Mode Interactive Agent & Cloud VM Preview Card */}
            <div className="lg:col-span-5 rounded-2xl border border-slate-200/90 bg-white p-5 sm:p-6 shadow-[0_8px_30px_rgba(15,23,42,0.05)] flex flex-col justify-between space-y-4">
              <div className="space-y-3.5">
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-1 rounded-lg bg-slate-100 p-0.5 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setHeroPreviewTab('agents')}
                      className={`rounded-md px-2.5 py-1 transition-all ${
                        heroPreviewTab === 'agents'
                          ? 'bg-white text-slate-900 shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {t.landing.activeAgentsTitle} ({agents.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setHeroPreviewTab('vm')}
                      className={`inline-flex items-center gap-1 rounded-md px-2.5 py-1 transition-all ${
                        heroPreviewTab === 'vm'
                          ? 'bg-slate-900 text-white shadow-2xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Terminal className="h-3 w-3" />
                      <span>Noyau VM Linux</span>
                    </button>
                  </div>

                  <span className="text-[11px] font-mono tabular-nums text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-md">
                    {t.landing.sandboxReady}
                  </span>
                </div>

                {heroPreviewTab === 'agents' ? (
                  <div className="space-y-2.5">
                    {agents.slice(0, 3).map((ag) => (
                      <Link
                        key={ag.agentId}
                        href={`/workspace/${ag.agentId}`}
                        className="group flex items-center justify-between gap-3 rounded-xl border border-slate-200/80 bg-[#FAFBFD] p-3 hover:bg-white hover:border-slate-300 hover:shadow-2xs transition-all"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="relative h-9 w-9 rounded-full overflow-hidden border border-slate-200 bg-white shrink-0">
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
                            <p className="text-xs font-bold text-slate-900 truncate">
                              {ag.name}
                            </p>
                            <p className="text-[11px] text-slate-500 truncate font-mono">
                              {ag.tools.length} {t.landing.connectedTools} · VM {ag.vmStatus}
                            </p>
                          </div>
                        </div>
                        <span className="text-xs font-semibold text-slate-900 group-hover:translate-x-0.5 transition-transform whitespace-nowrap">
                          {t.landing.chatLink}
                        </span>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-xl border border-slate-800 bg-[#0D1117] p-3.5 text-slate-200 font-mono text-[11px] space-y-2">
                    <div className="flex items-center justify-between border-b border-white/10 pb-2 text-[10px] text-slate-400">
                      <span>user@orbit-vm:~ (Ubuntu 24.04 / Win11 / XFCE)</span>
                      <span className="text-emerald-400 font-semibold">● Kernel Live</span>
                    </div>
                    <div className="space-y-1 leading-relaxed">
                      <p>
                        <span className="text-emerald-400 font-bold">$</span> uname -srm
                      </p>
                      <p className="text-slate-300">Linux 6.6.x x86_64 · Python 3.11</p>
                      <p>
                        <span className="text-emerald-400 font-bold">$</span> orbit-mcp --verify-all
                      </p>
                      <p className="text-emerald-300">
                        ✓ Garde Anti-Hallucination active sur les 12 outils MCP
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={async () => {
                        await setVmStatusForAgent(primaryAgentId, 'active');
                        openVmModal(primaryAgentId);
                      }}
                      className="mt-2 w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/20 border border-emerald-500/40 px-3 py-1.5 font-sans text-xs font-semibold text-emerald-300 hover:bg-emerald-500/30 transition-colors"
                    >
                      <Monitor className="h-3.5 w-3.5" />
                      <span>Ouvrir le Bureau Virtuel Interactif</span>
                    </button>
                  </div>
                )}
              </div>

              <div className="rounded-xl border border-slate-200/80 bg-[#FAFBFD] p-3.5 text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-900 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{t.landing.demoNoteTitle}</span>
                </p>
                <p>{t.landing.demoNoteBody}</p>
              </div>
            </div>
          </div>

          {/* 4-Column Quantitative Architecture Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-6 border-t border-slate-200/80">
            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {t.landing.stat1Value}
              </p>
              <p className="text-xs text-slate-600 mt-1">
                {t.landing.stat1Desc}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {t.landing.stat2Value}
              </p>
              <p className="text-xs text-slate-600 mt-1">
                {t.landing.stat2Desc}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {t.landing.stat3Value}
              </p>
              <p className="text-xs text-slate-600 mt-1">
                {t.landing.stat3Desc}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.03)]">
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {t.landing.stat4Value}
              </p>
              <p className="text-xs text-slate-600 mt-1">
                {t.landing.stat4Desc}
              </p>
            </div>
          </div>
        </section>

        {/* Capabilities & Bento Architecture Section */}
        <section id="capabilities" className="space-y-6 pt-4">
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              {t.landing.sec1Title}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              {t.landing.sec1Sub}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div
              id="cloud-vm"
              className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_2px_8px_rgba(15,23,42,0.03)] flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="h-9 w-9 rounded-xl border border-slate-200 bg-[#FAFBFD] flex items-center justify-center">
                  <Monitor className="h-4 w-4 text-slate-900" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {t.landing.cap1Title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {t.landing.cap1Body}
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between font-mono text-[10px] text-slate-500">
                <span>Ubuntu 24.04 · Win11 · XFCE</span>
                <span className="text-emerald-700 font-semibold">Noyau Réel</span>
              </div>
            </div>

            <div
              id="routines"
              className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_2px_8px_rgba(15,23,42,0.03)] flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="h-9 w-9 rounded-xl border border-slate-200 bg-[#FAFBFD] flex items-center justify-center">
                  <CalendarClock className="h-4 w-4 text-slate-900" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {t.landing.cap2Title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {t.landing.cap2Body}
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between font-mono text-[10px] text-slate-500">
                <span>cron(0 8 * * 1-5)</span>
                <span className="text-slate-800 font-semibold">Inngest Durable</span>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_2px_8px_rgba(15,23,42,0.03)] flex flex-col justify-between space-y-4">
              <div className="space-y-3">
                <div className="h-9 w-9 rounded-xl border border-slate-200 bg-[#FAFBFD] flex items-center justify-center">
                  <Wrench className="h-4 w-4 text-slate-900" />
                </div>
                <h3 className="text-base font-bold text-slate-900">
                  {t.landing.cap3Title}
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed">
                  {t.landing.cap3Body}
                </p>
              </div>
              <div className="pt-3 border-t border-slate-100 flex items-center justify-between font-mono text-[10px] text-slate-500">
                <span>12 Connecteurs MCP</span>
                <span className="text-emerald-700 font-semibold">Vérification API</span>
              </div>
            </div>
          </div>
        </section>

        {/* Marketplace Preview Section */}
        <section id="marketplace" className="space-y-6 pt-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold tracking-tight text-slate-900">
                {t.landing.sec2Title}
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                {t.landing.sec2Sub}
              </p>
            </div>
            <button
              type="button"
              onClick={() => openMarketplace(primaryAgentId)}
              className="rounded-xl border border-slate-200/90 bg-white px-4 py-2 text-xs font-semibold text-slate-900 shadow-2xs hover:bg-slate-50 transition-colors whitespace-nowrap"
            >
              {t.landing.openMarketplaceBtn}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {TOOL_CATALOG.slice(0, 8).map((tool) => (
              <div
                key={tool.slug}
                onClick={() => openMarketplace(primaryAgentId)}
                className="cursor-pointer rounded-2xl border border-slate-200/90 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.03)] hover:border-slate-300 hover:shadow-xs transition-all flex flex-col justify-between space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl border border-slate-200/80 bg-[#FAFBFD] flex items-center justify-center shrink-0">
                    <ToolIcon slug={tool.slug} className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{tool.name}</p>
                    <p className="text-[11px] text-slate-500">{tool.category}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                  {tool.description}
                </p>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-2 border-t border-slate-100 font-mono">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{tool.authType}</span>
                  </span>
                  <span className="text-[10px] text-slate-400">MCP</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200/80 bg-white py-5 sm:py-6 px-4 sm:px-8 text-xs text-slate-500 max-w-7xl w-full mx-auto flex flex-wrap items-center justify-between gap-2">
        <span>{t.landing.footerBrand}</span>
        <Link href={`/workspace/${primaryAgentId}`} className="hover:text-slate-900 font-semibold">
          {t.landing.footerEnter}
        </Link>
      </footer>
    </div>
  );
}
