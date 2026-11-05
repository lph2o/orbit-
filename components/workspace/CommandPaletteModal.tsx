'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  Search,
  Monitor,
  Plus,
  Store,
  Sparkles,
  ArrowRight,
  Command,
  Globe,
  Terminal,
  CheckCircle2,
  ShieldAlert,
  LayoutGrid,
  Settings,
} from 'lucide-react';
import { useOrbit } from '@/context/OrbitContext';
import {
  evaluateToolConnectionReadiness,
  TOOL_CATALOG,
} from '@/lib/orbit-logic';
import { ToolIcon } from './ToolIcon';

interface PaletteActionItem {
  id: string;
  group: string;
  title: string;
  subtitle: string;
  badge?: string;
  badgeTone?: 'emerald' | 'amber' | 'slate';
  icon: React.ReactNode;
  onSelect: () => void;
}

export function CommandPaletteModal() {
  const router = useRouter();
  const {
    agents,
    openMarketplace,
    openVmModal,
    setVmStatusForAgent,
    toolCredentials,
    workspaceToken,
    locale,
    setLocale,
  } = useOrbit();

  const [isOpen, setIsOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsOpen((prev) => !prev);
      } else if (e.key === 'Escape' && isOpen) {
        e.preventDefault();
        setIsOpen(false);
      }
    };

    const handleCustomOpen = () => {
      setIsOpen(true);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('orbit:open-command-palette', handleCustomOpen);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('orbit:open-command-palette', handleCustomOpen);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen) {
      queueMicrotask(() => {
        setQuery('');
        setActiveIndex(0);
      });
      setTimeout(() => inputRef.current?.focus(), 40);
    }
  }, [isOpen]);

  const primaryAgent = agents[0];

  const items: PaletteActionItem[] = useMemo(() => {
    const list: PaletteActionItem[] = [];

    // 1. Agents
    for (const ag of agents) {
      list.push({
        id: `agent-${ag.agentId}`,
        group: locale === 'fr' ? 'Vos Agents IA' : 'Your AI Agents',
        title: ag.name,
        subtitle: `${ag.tools.length} outils MCP · Sandbox ${ag.sandboxId}`,
        badge: ag.vmStatus === 'active' ? 'VM Active' : 'VM Ready',
        badgeTone: ag.vmStatus === 'active' ? 'emerald' : 'slate',
        icon: <Sparkles className="h-4 w-4 text-slate-800" />,
        onSelect: () => {
          setIsOpen(false);
          router.push(`/workspace/${ag.agentId}`);
        },
      });
    }

    // 1B. Cloud VM Desktops
    for (const ag of agents) {
      list.push({
        id: `vm-${ag.agentId}`,
        group:
          locale === 'fr'
            ? 'Bureau Virtuel Cloud VM (Ubuntu / Windows 11 / XFCE)'
            : 'Cloud VM Desktop',
        title: `Ouvrir le Bureau VM de ${ag.name}`,
        subtitle: `Noyau Linux Réel · Chrome, Terminal Bash, LibreOffice (${ag.sandboxId})`,
        badge: 'Ubuntu / Win11 / XFCE',
        badgeTone: 'emerald',
        icon: <Monitor className="h-4 w-4 text-emerald-600" />,
        onSelect: async () => {
          setIsOpen(false);
          if (ag.vmStatus !== 'active') {
            await setVmStatusForAgent(ag.agentId, 'active');
          }
          openVmModal(ag.agentId);
        },
      });
    }

    // 2. Quick Navigation & Actions
    list.push(
      {
        id: 'nav-settings',
        group: locale === 'fr' ? 'Navigation & Actions Rapides' : 'Quick Actions',
        title:
          locale === 'fr'
            ? 'Paramètres Généraux de l’Application (APIs, MCP, VM, Système)'
            : 'Global Application Settings (APIs, MCP, VM, System)',
        subtitle:
          locale === 'fr'
            ? 'Configurer vos clés d’APIs d’agents gratuits, webhooks Slack/GitHub/Notion, Cron Inngest et sauvegardes'
            : 'Configure free agent API keys, Slack/GitHub/Notion webhooks, Inngest Cron, and backups',
        badge: 'Paramètres',
        badgeTone: 'emerald',
        icon: <Settings className="h-4 w-4 text-slate-900" />,
        onSelect: () => {
          setIsOpen(false);
          router.push('/workspace/settings');
        },
      },
      {
        id: 'nav-workspace-hub',
        group: locale === 'fr' ? 'Navigation & Actions Rapides' : 'Quick Actions',
        title:
          locale === 'fr'
            ? 'Tableau de bord & Analytique Workspace'
            : 'Workspace Analytics & Pipeline Hub',
        subtitle:
          locale === 'fr'
            ? 'Vue globale des agents, métriques Inngest et workflows A → B'
            : 'Global overview of agents, Inngest metrics, and A → B workflows',
        badge: 'Hub',
        badgeTone: 'slate',
        icon: <LayoutGrid className="h-4 w-4 text-slate-700" />,
        onSelect: () => {
          setIsOpen(false);
          router.push('/workspace');
        },
      },
      {
        id: 'nav-create-agent',
        group: locale === 'fr' ? 'Navigation & Actions Rapides' : 'Quick Actions',
        title:
          locale === 'fr'
            ? 'Créer un nouvel Agent IA (Templates 1-Clic)'
            : 'Create New AI Agent (1-Click Templates)',
        subtitle:
          locale === 'fr'
            ? 'Configurer le modèle Gemini, le ton, l’autonomie et les outils MCP'
            : 'Configure Gemini model, tone, autonomy, and MCP tools',
        badge: 'Nouveau',
        badgeTone: 'emerald',
        icon: <Plus className="h-4 w-4 text-slate-900" />,
        onSelect: () => {
          setIsOpen(false);
          router.push('/workspace/create-agent');
        },
      },
      {
        id: 'nav-marketplace',
        group: locale === 'fr' ? 'Navigation & Actions Rapides' : 'Quick Actions',
        title:
          locale === 'fr'
            ? 'Ouvrir le Marketplace d’Outils MCP (12 intégrations)'
            : 'Open MCP Tool Marketplace (12 integrations)',
        subtitle:
          'Slack, GitHub, Notion, Gmail, Google Calendar, Docs, Linear, Discord, ClickUp, Outlook...',
        badge: '12 Outils',
        badgeTone: 'slate',
        icon: <Store className="h-4 w-4 text-slate-800" />,
        onSelect: () => {
          setIsOpen(false);
          openMarketplace(primaryAgent?.agentId);
        },
      }
    );

    // 3. MCP Tools Verification Status
    for (const tool of TOOL_CATALOG) {
      const readiness = evaluateToolConnectionReadiness(
        tool.slug,
        true,
        toolCredentials,
        workspaceToken
      );
      list.push({
        id: `tool-${tool.slug}`,
        group:
          locale === 'fr'
            ? 'Connecteurs MCP & Vérification API Réelle'
            : 'MCP Connectors & Live API Status',
        title: `${tool.name} — ${tool.category}`,
        subtitle: tool.description,
        badge: readiness.canExecuteLiveWrite
          ? 'API Vérifiée'
          : 'Configurer API',
        badgeTone: readiness.canExecuteLiveWrite ? 'emerald' : 'amber',
        icon: <ToolIcon slug={tool.slug} className="h-4 w-4" />,
        onSelect: () => {
          setIsOpen(false);
          openMarketplace(primaryAgent?.agentId);
        },
      });
    }

    // 4. Language Switch
    list.push(
      {
        id: 'lang-fr',
        group: locale === 'fr' ? 'Langue de l’interface' : 'Interface Language',
        title: 'Passer l’interface en Français (FR)',
        subtitle: 'Traduction complète de la plateforme et des réponses agents',
        badge: locale === 'fr' ? 'Actif' : 'FR',
        badgeTone: locale === 'fr' ? 'emerald' : 'slate',
        icon: <Globe className="h-4 w-4 text-slate-600" />,
        onSelect: () => {
          setLocale('fr');
          setIsOpen(false);
        },
      },
      {
        id: 'lang-en',
        group: locale === 'fr' ? 'Langue de l’interface' : 'Interface Language',
        title: 'Switch interface to English (EN)',
        subtitle: 'Full platform and agent response localization',
        badge: locale === 'en' ? 'Active' : 'EN',
        badgeTone: locale === 'en' ? 'emerald' : 'slate',
        icon: <Globe className="h-4 w-4 text-slate-600" />,
        onSelect: () => {
          setLocale('en');
          setIsOpen(false);
        },
      }
    );

    return list;
  }, [
    agents,
    locale,
    openMarketplace,
    openVmModal,
    primaryAgent?.agentId,
    router,
    setLocale,
    setVmStatusForAgent,
    toolCredentials,
    workspaceToken,
  ]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items.slice(0, 12);
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.subtitle.toLowerCase().includes(q) ||
        item.group.toLowerCase().includes(q)
    );
  }, [items, query]);

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Palette de commandes Orbit"
      className="fixed inset-0 z-50 flex items-start justify-center bg-slate-950/45 backdrop-blur-xs p-3 pt-12 sm:pt-20"
      onClick={() => setIsOpen(false)}
    >
      <div
        className="w-full max-w-2xl rounded-2xl border border-slate-200/90 bg-white shadow-[0_24px_60px_-15px_rgba(15,23,42,0.28)] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Search Input Header */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-slate-200/80 bg-slate-50/50">
          <Search className="h-4 w-4 text-slate-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setActiveIndex(0);
            }}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                setActiveIndex((prev) =>
                  filtered.length > 0 ? (prev + 1) % filtered.length : 0
                );
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                setActiveIndex((prev) =>
                  filtered.length > 0
                    ? (prev - 1 + filtered.length) % filtered.length
                    : 0
                );
              } else if (e.key === 'Enter' && filtered[activeIndex]) {
                e.preventDefault();
                filtered[activeIndex].onSelect();
              }
            }}
            placeholder={
              locale === 'fr'
                ? 'Rechercher un agent, ouvrir le Bureau VM (Ubuntu/Win11), configurer Notion, Slack, GitHub...'
                : 'Search an agent, open Cloud VM Desktop, configure Notion, Slack, GitHub...'
            }
            className="flex-1 bg-transparent text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <kbd className="hidden sm:inline-flex items-center gap-0.5 rounded-md border border-slate-200 bg-white px-2 py-0.5 font-mono text-[10px] font-semibold text-slate-500">
            ESC
          </kbd>
        </div>

        {/* Results List */}
        <div className="max-h-[62dvh] overflow-y-auto p-2 space-y-1">
          {filtered.length === 0 ? (
            <div className="py-10 text-center text-xs text-slate-500">
              {locale === 'fr'
                ? 'Aucune commande ou intégration correspondante.'
                : 'No matching command or integration found.'}
            </div>
          ) : (
            filtered.map((item, idx) => {
              const isSelected = idx === activeIndex;
              const prevGroup = idx > 0 ? filtered[idx - 1].group : null;
              const showGroupHeader = item.group !== prevGroup;

              return (
                <React.Fragment key={item.id}>
                  {showGroupHeader && (
                    <div className="px-2.5 pt-2 pb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {item.group}
                    </div>
                  )}
                  <button
                    type="button"
                    onMouseEnter={() => setActiveIndex(idx)}
                    onClick={item.onSelect}
                    className={`w-full flex items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-colors ${
                      isSelected
                        ? 'bg-slate-900 text-white'
                        : 'text-slate-800 hover:bg-slate-100/80'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`flex h-8 w-8 items-center justify-center rounded-lg border shrink-0 ${
                          isSelected
                            ? 'border-white/15 bg-white/10 text-white'
                            : 'border-slate-200/80 bg-slate-50 text-slate-700'
                        }`}
                      >
                        {item.icon}
                      </div>
                      <div className="min-w-0">
                        <p
                          className={`text-xs font-semibold truncate ${
                            isSelected ? 'text-white' : 'text-slate-900'
                          }`}
                        >
                          {item.title}
                        </p>
                        <p
                          className={`text-[11px] truncate ${
                            isSelected ? 'text-slate-300' : 'text-slate-500'
                          }`}
                        >
                          {item.subtitle}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.badge && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-md px-2 py-0.5 font-mono text-[10px] font-semibold ${
                            isSelected
                              ? 'bg-white/15 text-white'
                              : item.badgeTone === 'emerald'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80'
                                : item.badgeTone === 'amber'
                                  ? 'bg-amber-50 text-amber-800 border border-amber-200/80'
                                  : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {item.badgeTone === 'emerald' && !isSelected && (
                            <CheckCircle2 className="h-2.5 w-2.5 text-emerald-600" />
                          )}
                          {item.badgeTone === 'amber' && !isSelected && (
                            <ShieldAlert className="h-2.5 w-2.5 text-amber-600" />
                          )}
                          {item.badge}
                        </span>
                      )}
                      <ArrowRight
                        className={`h-3.5 w-3.5 ${
                          isSelected ? 'text-white' : 'text-slate-400'
                        }`}
                      />
                    </div>
                  </button>
                </React.Fragment>
              );
            })
          )}
        </div>

        {/* Footer Shortcuts */}
        <div className="px-4 py-2.5 border-t border-slate-200/80 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px]">
                ↑↓
              </kbd>
              <span>Naviguer</span>
            </span>
            <span className="inline-flex items-center gap-1">
              <kbd className="rounded border border-slate-200 bg-white px-1.5 py-0.5 font-mono text-[10px]">
                ↵
              </kbd>
              <span>Exécuter</span>
            </span>
          </div>
          <div className="flex items-center gap-1.5 font-mono text-[10px] text-slate-500">
            <Terminal className="h-3 w-3 text-emerald-600" />
            <span>Orbit Command Center · ⌘K</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export function triggerCommandPalette() {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('orbit:open-command-palette'));
  }
}
