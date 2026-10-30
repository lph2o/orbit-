'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Plus,
  Store,
  LogOut,
  Orbit,
  Monitor,
} from 'lucide-react';
import { useOrbit } from '@/context/OrbitContext';
import { LanguageSwitcher } from '@/components/workspace/LanguageSwitcher';

export function AppSidebar() {
  const pathname = usePathname();
  const {
    user,
    agents,
    openMarketplace,
    signOutUser,
    t,
  } = useOrbit();

  const currentAgentId = pathname?.startsWith('/workspace/')
    ? pathname.split('/')[2]
    : undefined;

  return (
    <aside className="w-64 shrink-0 border-r border-slate-200 bg-slate-50/70 flex flex-col h-screen select-none">
      {/* Brand Header */}
      <div className="px-4 py-3.5 border-b border-slate-200 flex items-center justify-between gap-2">
        <Link
          href="/workspace"
          className="flex items-center gap-2 text-slate-900 hover:opacity-90 transition-opacity"
        >
          <div className="h-7 w-7 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0">
            <Orbit className="h-4 w-4" />
          </div>
          <span className="text-base font-bold tracking-tight whitespace-nowrap">
            Orbit
          </span>
        </Link>
        <LanguageSwitcher compact />
      </div>

      {/* Create New Agent CTA */}
      <div className="p-3.5 space-y-2">
        <Link
          href="/workspace/create-agent"
          className="w-full inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          <span>{t.sidebar.createAgent}</span>
        </Link>
        <div className="flex items-center justify-between px-0.5 text-[11px] text-slate-500">
          <span className="font-semibold">{t.sidebar.yourAgents} ({agents.length})</span>
          <Link href="/" className="hover:text-slate-900">
            {t.sidebar.overview}
          </Link>
        </div>
      </div>

      <nav
        aria-label={t.sidebar.yourAgents}
        className="flex-1 overflow-y-auto px-2.5 space-y-1"
      >
        {agents.map((agent) => {
          const isSelected = pathname === `/workspace/${agent.agentId}`;
          return (
            <Link
              key={agent.agentId}
              href={`/workspace/${agent.agentId}`}
              className={`group flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-xs transition-colors ${
                isSelected
                  ? 'bg-white text-slate-900 font-semibold border border-slate-200 shadow-2xs'
                  : 'text-slate-700 hover:bg-slate-100 hover:text-slate-900 font-medium'
              }`}
            >
              <div className="relative h-7 w-7 rounded-full overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                <Image
                  src={agent.agentImage}
                  alt={agent.name}
                  fill
                  sizes="28px"
                  referrerPolicy="no-referrer"
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs text-slate-900">{agent.name}</p>
                <p className="truncate text-[11px] text-slate-500 font-normal">
                  {agent.tools.length} {t.sidebar.toolsCount} · VM {agent.vmStatus}
                </p>
              </div>
              {agent.vmStatus === 'active' && (
                <Monitor
                  aria-label="Cloud VM Active"
                  className="h-3.5 w-3.5 text-emerald-600 shrink-0"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer: Marketplace & User Profile */}
      <div className="p-3 border-t border-slate-200 space-y-2.5 bg-white">
        <button
          type="button"
          onClick={() =>
            openMarketplace(
              currentAgentId && currentAgentId !== 'create-agent'
                ? currentAgentId
                : agents[0]?.agentId
            )
          }
          className="w-full flex items-center justify-between rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-100 transition-colors"
        >
          <span className="flex items-center gap-2 whitespace-nowrap">
            <Store className="h-4 w-4 text-slate-700" />
            <span>{t.sidebar.toolMarketplace}</span>
          </span>
          <span className="text-[11px] text-slate-500 font-mono tabular-nums">
            12+ {t.sidebar.toolsCount}
          </span>
        </button>

        <div className="flex items-center gap-2.5 pt-1">
          <div className="relative h-8 w-8 rounded-full overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
            <Image
              src={user.avatarUrl}
              alt={user.name}
              fill
              sizes="32px"
              referrerPolicy="no-referrer"
              className="object-cover"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-slate-900 truncate">
              {user.name}
            </p>
            <p className="text-[11px] text-slate-500 truncate">{user.email}</p>
          </div>
          <button
            type="button"
            onClick={signOutUser}
            title={t.sidebar.signOut}
            aria-label={t.sidebar.signOut}
            className="p-1.5 rounded-md text-slate-600 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
