'use client';

import React, { useEffect } from 'react';
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
} from 'lucide-react';
import { useOrbit } from '@/context/OrbitContext';
import { TOOL_CATALOG } from '@/lib/orbit-logic';
import { ToolIcon } from '@/components/workspace/ToolIcon';
import { LanguageSwitcher } from '@/components/workspace/LanguageSwitcher';

export default function HomePage() {
  const router = useRouter();
  const { agents, signInWithGoogle, openMarketplace, t } = useOrbit();

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
    <div className="min-h-screen flex flex-col bg-white text-slate-900">
      {/* Strict 3-Zone Top Bar Contract */}
      <header className="flex items-center justify-between gap-8 px-8 py-4 border-b border-slate-200 max-w-7xl w-full mx-auto">
        <Link
          href="/"
          className="text-lg font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0"
        >
          Orbit
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

        <div className="flex items-center gap-3 shrink-0">
          <Link
            href={`/workspace/${primaryAgentId}`}
            className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 rounded-lg hover:bg-slate-800 transition-colors whitespace-nowrap shrink-0"
          >
            {t.nav.openWorkspace}
          </Link>
        </div>
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-8 py-12 space-y-20">
        {/* Hero Section (2-Column Split + Below-Fold KPI Strip) */}
        <section className="space-y-12">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
            <div className="lg:col-span-7 flex flex-col justify-center space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-xs font-semibold text-slate-600">
                  {t.landing.eyebrow}
                </p>
                <LanguageSwitcher />
              </div>

              <h1
                className="text-4xl sm:text-5xl font-bold tracking-tight text-slate-900 leading-[1.12]"
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
                  className="inline-flex items-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
                >
                  <span>{t.landing.ctaPrimary}</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <Link
                  href="/workspace/create-agent"
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 hover:bg-slate-50 transition-colors whitespace-nowrap"
                >
                  <Plus className="h-4 w-4" />
                  <span>{t.landing.ctaCreate}</span>
                </Link>
                <button
                  type="button"
                  onClick={signInWithGoogle}
                  className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors whitespace-nowrap"
                >
                  <span>{t.landing.ctaGoogle}</span>
                </button>
              </div>
            </div>

            {/* Right Column: Live Interactive Agent Preview Card */}
            <div className="lg:col-span-5 rounded-xl border border-slate-200 bg-slate-50/70 p-6 flex flex-col justify-between space-y-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3">
                  <span className="text-xs font-bold text-slate-900">
                    {t.landing.activeAgentsTitle} ({agents.length})
                  </span>
                  <span className="text-xs font-mono tabular-nums text-slate-500">
                    {t.landing.sandboxReady}
                  </span>
                </div>

                <div className="space-y-2.5">
                  {agents.slice(0, 3).map((ag) => (
                    <Link
                      key={ag.agentId}
                      href={`/workspace/${ag.agentId}`}
                      className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 hover:border-slate-300 transition-colors"
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
                          <p className="text-xs font-bold text-slate-900 truncate">
                            {ag.name}
                          </p>
                          <p className="text-[11px] text-slate-500 truncate">
                            {ag.tools.length} {t.landing.connectedTools} · VM {ag.vmStatus}
                          </p>
                        </div>
                      </div>
                      <span className="text-xs font-semibold text-slate-900 whitespace-nowrap">
                        {t.landing.chatLink}
                      </span>
                    </Link>
                  ))}
                </div>
              </div>

              <div className="rounded-lg border border-slate-200 bg-white p-3.5 text-xs text-slate-600 space-y-1">
                <p className="font-semibold text-slate-900">
                  {t.landing.demoNoteTitle}
                </p>
                <p>{t.landing.demoNoteBody}</p>
              </div>
            </div>
          </div>

          {/* 4-Column Quantitative Architecture Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-slate-200">
            <div>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {t.landing.stat1Value}
              </p>
              <p className="text-xs text-slate-600 mt-1">
                {t.landing.stat1Desc}
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {t.landing.stat2Value}
              </p>
              <p className="text-xs text-slate-600 mt-1">
                {t.landing.stat2Desc}
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {t.landing.stat3Value}
              </p>
              <p className="text-xs text-slate-600 mt-1">
                {t.landing.stat3Desc}
              </p>
            </div>
            <div>
              <p className="text-2xl font-bold font-mono tabular-nums text-slate-900">
                {t.landing.stat4Value}
              </p>
              <p className="text-xs text-slate-600 mt-1">
                {t.landing.stat4Desc}
              </p>
            </div>
          </div>
        </section>

        {/* Capabilities & Mechanism-to-Outcome Section */}
        <section id="capabilities" className="space-y-6 pt-4">
          <div>
            <h2 className="text-2xl font-bold text-slate-900">
              {t.landing.sec1Title}
            </h2>
            <p className="text-sm text-slate-600 mt-1">
              {t.landing.sec1Sub}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div id="cloud-vm" className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
              <Monitor className="h-5 w-5 text-slate-900" />
              <h3 className="text-base font-bold text-slate-900">
                {t.landing.cap1Title}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t.landing.cap1Body}
              </p>
            </div>

            <div id="routines" className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
              <CalendarClock className="h-5 w-5 text-slate-900" />
              <h3 className="text-base font-bold text-slate-900">
                {t.landing.cap2Title}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t.landing.cap2Body}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6 space-y-3">
              <Wrench className="h-5 w-5 text-slate-900" />
              <h3 className="text-base font-bold text-slate-900">
                {t.landing.cap3Title}
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                {t.landing.cap3Body}
              </p>
            </div>
          </div>
        </section>

        {/* Marketplace Preview Section */}
        <section id="marketplace" className="space-y-6 pt-4">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold text-slate-900">
                {t.landing.sec2Title}
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                {t.landing.sec2Sub}
              </p>
            </div>
            <button
              type="button"
              onClick={() => openMarketplace(primaryAgentId)}
              className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-2 text-xs font-semibold text-slate-900 hover:bg-slate-100 transition-colors whitespace-nowrap"
            >
              {t.landing.openMarketplaceBtn}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
            {TOOL_CATALOG.slice(0, 8).map((tool) => (
              <div
                key={tool.slug}
                className="rounded-xl border border-slate-200 bg-white p-4 flex flex-col justify-between space-y-3"
              >
                <div className="flex items-center gap-3">
                  <div className="h-8 w-8 rounded-lg border border-slate-200 bg-slate-50 flex items-center justify-center shrink-0">
                    <ToolIcon slug={tool.slug} className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs font-bold text-slate-900">{tool.name}</p>
                    <p className="text-[11px] text-slate-500">{tool.category}</p>
                  </div>
                </div>
                <p className="text-xs text-slate-600 line-clamp-2">{tool.description}</p>
                <div className="flex items-center gap-1.5 text-[11px] text-slate-500 pt-1 border-t border-slate-100">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  <span>{tool.authType} · MCP Ready</span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-6 px-8 text-xs text-slate-500 max-w-7xl w-full mx-auto flex items-center justify-between">
        <span>{t.landing.footerBrand}</span>
        <Link href={`/workspace/${primaryAgentId}`} className="hover:text-slate-900 font-medium">
          {t.landing.footerEnter}
        </Link>
      </footer>
    </div>
  );
}
