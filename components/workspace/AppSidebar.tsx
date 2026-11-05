'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import {
  Plus,
  Store,
  LogOut,
  Orbit,
  Monitor,
  Menu,
  X,
  Search,
  Settings,
  PanelLeftClose,
  PanelLeftOpen,
} from 'lucide-react';
import { useOrbit } from '@/context/OrbitContext';
import { LanguageSwitcher } from '@/components/workspace/LanguageSwitcher';
import { triggerCommandPalette } from '@/components/workspace/CommandPaletteModal';

const SIDEBAR_COLLAPSED_STORAGE_KEY = 'orbit_sidebar_collapsed_v1';

export function AppSidebar() {
  const pathname = usePathname();
  const {
    user,
    agents,
    openMarketplace,
    signOutUser,
    t,
  } = useOrbit();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(SIDEBAR_COLLAPSED_STORAGE_KEY);
      if (saved === 'true') {
        queueMicrotask(() => setIsCollapsed(true));
      }
    } catch {
      // Ignore storage error
    }
  }, []);

  const toggleCollapsed = () => {
    setIsCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(SIDEBAR_COLLAPSED_STORAGE_KEY, String(next));
      } catch {
        // Ignore storage error
      }
      return next;
    });
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'b') {
        e.preventDefault();
        toggleCollapsed();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const rawSegment = pathname?.startsWith('/workspace/')
    ? pathname.split('/')[2]
    : undefined;
  const currentAgentId =
    rawSegment && rawSegment !== 'create-agent' && rawSegment !== 'settings'
      ? rawSegment
      : undefined;

  const activeAgent = agents.find((a) => a.agentId === currentAgentId);

  const renderSidebarContent = (onNavigate?: () => void) => (
    <>
      {/* Brand Header */}
      <div className="px-3.5 py-3.5 border-b border-slate-200/80 flex items-center justify-between gap-1.5 bg-white/80">
        <Link
          href="/workspace"
          onClick={onNavigate}
          className="flex items-center gap-2 text-slate-900 hover:opacity-90 transition-opacity min-w-0"
        >
          <div className="h-7 w-7 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Orbit className="h-4 w-4" />
          </div>
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="text-base font-bold tracking-tight whitespace-nowrap">
              Orbit
            </span>
            <span className="rounded border border-slate-200 bg-slate-100 px-1 py-0.5 font-mono text-[9px] font-semibold uppercase tracking-wider text-slate-600">
              OS
            </span>
          </div>
        </Link>
        <div className="flex items-center gap-1 shrink-0">
          <LanguageSwitcher compact />
          {!onNavigate && (
            <button
              type="button"
              onClick={toggleCollapsed}
              title="Réduire la barre latérale (⌘B)"
              aria-label="Réduire la barre latérale"
              data-testid="sidebar-collapse-btn"
              className="hidden lg:inline-flex rounded-lg p-1.5 text-slate-500 hover:bg-slate-200/70 hover:text-slate-900 transition-colors"
            >
              <PanelLeftClose className="h-4 w-4" />
            </button>
          )}
          {onNavigate && (
            <button
              type="button"
              onClick={onNavigate}
              aria-label="Fermer le menu"
              className="lg:hidden rounded-lg p-1.5 text-slate-500 hover:bg-slate-200/70 hover:text-slate-900"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>
      </div>

      {/* Command Palette Trigger + Create New Agent CTA */}
      <div className="p-3.5 space-y-2.5">
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            triggerCommandPalette();
          }}
          className="w-full flex items-center justify-between gap-2 rounded-xl border border-slate-200/90 bg-white px-3 py-2 text-xs text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.03)] hover:border-slate-300 hover:text-slate-900 transition-all"
        >
          <span className="flex items-center gap-2 truncate">
            <Search className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <span className="truncate font-medium">Rechercher / Action...</span>
          </span>
          <kbd className="rounded border border-slate-200 bg-slate-50 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-slate-500 shrink-0">
            ⌘K
          </kbd>
        </button>

        <Link
          href="/workspace/create-agent"
          onClick={onNavigate}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-2.5 text-xs font-semibold text-white shadow-2xs hover:bg-slate-800 transition-colors whitespace-nowrap"
        >
          <Plus className="h-4 w-4" />
          <span>{t.sidebar.createAgent}</span>
        </Link>
        <div className="flex items-center justify-between px-1 pt-1 text-[11px] text-slate-500">
          <span className="font-semibold uppercase tracking-wider text-[10px] text-slate-400">
            {t.sidebar.yourAgents} ({agents.length})
          </span>
          <Link
            href="/"
            onClick={onNavigate}
            className="font-medium text-slate-500 hover:text-slate-900 transition-colors"
          >
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
              onClick={onNavigate}
              className={`group flex items-center gap-2.5 rounded-xl px-2.5 py-2.5 text-xs transition-all ${
                isSelected
                  ? 'bg-white text-slate-900 font-semibold border border-slate-200/90 shadow-[0_2px_6px_rgba(15,23,42,0.05)]'
                  : 'text-slate-700 hover:bg-white/70 hover:text-slate-900 font-medium border border-transparent'
              }`}
            >
              <div className="relative h-8 w-8 rounded-full overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                <Image
                  src={agent.agentImage}
                  alt={agent.name}
                  fill
                  sizes="32px"
                  referrerPolicy="no-referrer"
                  className="object-cover"
                />
              </div>
              <div className="flex-1 min-w-0">
                <p className="truncate text-xs text-slate-900">{agent.name}</p>
                <p className="truncate text-[11px] text-slate-500 font-normal font-mono tabular-nums">
                  {agent.tools.length} {t.sidebar.toolsCount} · VM {agent.vmStatus}
                </p>
              </div>
              {agent.vmStatus === 'active' ? (
                <span
                  title="Cloud VM Active"
                  className="relative flex h-2.5 w-2.5 shrink-0"
                >
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500" />
                </span>
              ) : (
                <Monitor
                  aria-label="Cloud VM Ready"
                  className="h-3.5 w-3.5 text-slate-300 group-hover:text-slate-500 shrink-0 transition-colors"
                />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Footer: Marketplace, Global Settings & User Profile */}
      <div className="p-3 border-t border-slate-200/80 space-y-2 bg-white">
        <button
          type="button"
          onClick={() => {
            onNavigate?.();
            openMarketplace(currentAgentId || agents[0]?.agentId);
          }}
          className="w-full flex items-center justify-between rounded-xl border border-slate-200/90 bg-[#FAFBFD] px-3 py-2 text-xs font-medium text-slate-800 hover:bg-slate-100/80 hover:border-slate-300 transition-all"
        >
          <span className="flex items-center gap-2 whitespace-nowrap">
            <Store className="h-4 w-4 text-slate-700" />
            <span>{t.sidebar.toolMarketplace}</span>
          </span>
          <span className="rounded-md bg-white border border-slate-200/80 px-1.5 py-0.5 text-[10px] text-slate-600 font-mono tabular-nums">
            12 MCP
          </span>
        </button>

        <Link
          href="/workspace/settings"
          onClick={onNavigate}
          className={`w-full flex items-center justify-between gap-2 rounded-xl border px-3 py-2 text-xs font-medium transition-all ${
            pathname === '/workspace/settings'
              ? 'border-slate-900 bg-slate-900 text-white shadow-2xs'
              : 'border-slate-200/90 bg-[#FAFBFD] text-slate-800 hover:bg-slate-100/80 hover:border-slate-300'
          }`}
        >
          <span className="flex items-center gap-2 truncate">
            <Settings
              className={`h-4 w-4 shrink-0 ${
                pathname === '/workspace/settings' ? 'text-white' : 'text-slate-700'
              }`}
            />
            <span className="truncate">Paramètres</span>
          </span>
          <span
            className={`rounded-md px-1.5 py-0.5 text-[10px] font-mono whitespace-nowrap shrink-0 ${
              pathname === '/workspace/settings'
                ? 'bg-white/15 text-white'
                : 'bg-white border border-slate-200/80 text-slate-600'
            }`}
          >
            APIs & OS
          </span>
        </Link>

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
            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  );

  const renderCollapsedRailContent = () => (
    <>
      {/* Collapsed Brand + Expand Button */}
      <div className="py-3 px-2 border-b border-slate-200/80 flex flex-col items-center gap-2 bg-white/80">
        <Link
          href="/workspace"
          title="Orbit OS"
          className="h-8 w-8 rounded-lg bg-slate-900 text-white flex items-center justify-center shrink-0 shadow-2xs hover:opacity-90 transition-opacity"
        >
          <Orbit className="h-4 w-4" />
        </Link>
        <button
          type="button"
          onClick={toggleCollapsed}
          title="Déplier la barre latérale (⌘B)"
          aria-label="Déplier la barre latérale"
          data-testid="sidebar-expand-btn"
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-200/70 hover:text-slate-900 transition-colors"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      </div>

      {/* Quick Actions Rail */}
      <div className="p-2 flex flex-col items-center gap-2 border-b border-slate-200/60">
        <button
          type="button"
          onClick={triggerCommandPalette}
          title="Rechercher / Action (⌘K)"
          aria-label="Rechercher / Action (⌘K)"
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/90 bg-white text-slate-600 hover:border-slate-300 hover:text-slate-900 shadow-2xs transition-all"
        >
          <Search className="h-4 w-4" />
        </button>
        <Link
          href="/workspace/create-agent"
          title={t.sidebar.createAgent}
          aria-label={t.sidebar.createAgent}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-slate-900 text-white hover:bg-slate-800 shadow-2xs transition-colors"
        >
          <Plus className="h-4 w-4" />
        </Link>
      </div>

      {/* Agents Avatar Rail */}
      <nav
        aria-label={t.sidebar.yourAgents}
        className="flex-1 overflow-y-auto py-2.5 px-2 flex flex-col items-center gap-2"
      >
        {agents.map((agent) => {
          const isSelected = pathname === `/workspace/${agent.agentId}`;
          return (
            <Link
              key={agent.agentId}
              href={`/workspace/${agent.agentId}`}
              title={`${agent.name} (${agent.tools.length} outils · VM ${agent.vmStatus})`}
              aria-label={agent.name}
              className={`relative flex items-center justify-center rounded-xl p-1.5 transition-all ${
                isSelected
                  ? 'bg-white border border-slate-300 shadow-xs ring-2 ring-slate-900/10'
                  : 'hover:bg-white/80 border border-transparent'
              }`}
            >
              <div className="relative h-8 w-8 rounded-full overflow-hidden border border-slate-200 bg-slate-100 shrink-0">
                <Image
                  src={agent.agentImage}
                  alt={agent.name}
                  fill
                  sizes="32px"
                  referrerPolicy="no-referrer"
                  className="object-cover"
                />
              </div>
              {agent.vmStatus === 'active' && (
                <span className="absolute -top-0.5 -right-0.5 flex h-2.5 w-2.5">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500 border border-white" />
                </span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Collapsed Footer */}
      <div className="p-2 border-t border-slate-200/80 flex flex-col items-center gap-2 bg-white">
        <button
          type="button"
          onClick={() => openMarketplace(currentAgentId || agents[0]?.agentId)}
          title={t.sidebar.toolMarketplace}
          aria-label={t.sidebar.toolMarketplace}
          className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200/90 bg-[#FAFBFD] text-slate-700 hover:bg-slate-100 transition-colors"
        >
          <Store className="h-4 w-4" />
        </button>

        <Link
          href="/workspace/settings"
          title="Paramètres (APIs & OS)"
          aria-label="Paramètres"
          className={`inline-flex h-9 w-9 items-center justify-center rounded-xl border transition-colors ${
            pathname === '/workspace/settings'
              ? 'border-slate-900 bg-slate-900 text-white'
              : 'border-slate-200/90 bg-[#FAFBFD] text-slate-700 hover:bg-slate-100'
          }`}
        >
          <Settings className="h-4 w-4" />
        </Link>

        <button
          type="button"
          onClick={signOutUser}
          title={`${user.name} — ${t.sidebar.signOut}`}
          aria-label={t.sidebar.signOut}
          className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </>
  );

  return (
    <>
      {/* Mobile Top Header Bar (< lg) */}
      <div className="lg:hidden flex items-center justify-between gap-2 px-3.5 py-2.5 border-b border-slate-200/80 bg-white/95 backdrop-blur-md shrink-0 z-30">
        <div className="flex items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(true)}
            aria-label="Ouvrir le menu de navigation"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-800 hover:bg-slate-100 shrink-0"
          >
            <Menu className="h-4 w-4" />
          </button>

          <Link
            href="/workspace"
            className="flex items-center gap-1.5 text-slate-900 shrink-0"
          >
            <div className="h-6 w-6 rounded-md bg-slate-900 text-white flex items-center justify-center">
              <Orbit className="h-3.5 w-3.5" />
            </div>
            <span className="text-sm font-bold tracking-tight">Orbit</span>
          </Link>

          {activeAgent && (
            <span className="truncate text-xs text-slate-500 font-medium border-l border-slate-200 pl-2">
              {activeAgent.name}
            </span>
          )}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={triggerCommandPalette}
            aria-label="Rechercher (⌘K)"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
          >
            <Search className="h-3.5 w-3.5" />
          </button>
          <Link
            href="/workspace/settings"
            aria-label="Paramètres Généraux"
            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
          >
            <Settings className="h-3.5 w-3.5" />
          </Link>
          <button
            type="button"
            onClick={() => openMarketplace(currentAgentId || agents[0]?.agentId)}
            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-semibold text-slate-800 hover:bg-slate-100"
          >
            <Store className="h-3.5 w-3.5 text-slate-700" />
            <span>MCP</span>
          </button>
          <LanguageSwitcher compact />
        </div>
      </div>

      {/* Mobile Slide-Over Sidebar Drawer (< lg) */}
      {mobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 z-50 flex bg-slate-950/50 backdrop-blur-xs"
          onClick={() => setMobileMenuOpen(false)}
        >
          <aside
            className="w-72 max-w-[85vw] bg-[#FAFBFD] flex flex-col h-full shadow-2xl select-none"
            onClick={(e) => e.stopPropagation()}
          >
            {renderSidebarContent(() => setMobileMenuOpen(false))}
          </aside>
        </div>
      )}

      {/* Desktop Left Sidebar (lg+): Retractable w-64 vs w-[68px] */}
      <aside
        data-testid="desktop-app-sidebar"
        data-collapsed={isCollapsed ? 'true' : 'false'}
        className={`hidden lg:flex ${
          isCollapsed ? 'w-[68px]' : 'w-64'
        } shrink-0 border-r border-slate-200/80 bg-[#FAFBFD] flex-col h-full select-none transition-[width] duration-200 ease-in-out`}
      >
        {isCollapsed ? renderCollapsedRailContent() : renderSidebarContent()}
      </aside>
    </>
  );
}

