'use client';

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  ArrowLeft,
  Check,
  Copy,
  Download,
  ExternalLink,
  Globe,
  KeyRound,
  Loader2,
  Plus,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { useOrbit } from '@/context/OrbitContext';

interface PortfolioProjectItem {
  id: string;
  title: string;
  role: string;
  description: string;
  tags: string[];
}

const DEFAULT_PROJECTS: PortfolioProjectItem[] = [
  {
    id: 'proj_1',
    title: 'Plateforme SaaS d’Agents IA Autonomes & Cloud VM (Orbit)',
    role: 'Lead Full-Stack & AI Engineer',
    description:
      'Architecture complète combinant Next.js 15, orchestration multi-outils MCP (Gmail, Slack, GitHub, Notion), exécutions durables Inngest et bureau virtuel Cloud VM E2B.',
    tags: ['Next.js 15', 'TypeScript', 'Gemini API', 'E2B Cloud VM'],
  },
  {
    id: 'proj_2',
    title: 'Pipeline RAG Documentaire & Synthèse Exécutive Automatisée',
    role: 'AI Systems Architect',
    description:
      'Indexation de politiques SLA, contrats PDF et tableaux financiers CSV par agent avec citations vérifiables et publication quotidienne sur Slack.',
    tags: ['RAG', 'Slack API', 'Google Workspace', 'Notion API'],
  },
  {
    id: 'proj_3',
    title: 'Audit de Sécurité PR & Triage Ingénierie Temps Réel',
    role: 'Staff Security & DevOps Engineer',
    description:
      'Inspection automatisée des Pull Requests GitHub ligne par ligne, détection de secrets exposés et synchronisation bidirectionnelle avec Linear.',
    tags: ['GitHub REST API', 'Linear', 'CI/CD', 'Security'],
  },
];

export default function PublicPortfolioPage() {
  const params = useParams<{ agentId: string }>();
  const rawAgentId = decodeURIComponent(params?.agentId || 'agent_mickey_01');

  const {
    agents,
    notionToken,
    setNotionToken,
    notionParentId,
    setNotionParentId,
    connectToolToAgent,
  } = useOrbit();

  const matchedAgent =
    agents.find((a) => a.agentId === rawAgentId) ||
    agents[0] || {
      agentId: rawAgentId,
      name: rawAgentId.replace(/^agent_/, '').replace(/_/g, ' '),
      description:
        'Architecte Solutions IA, Automatisation Cloud VM & Intégrations Multi-Outils.',
      tools: ['gmail', 'slack', 'github', 'notion'],
    };

  const storageKey = `orbit_public_portfolio_v1_${rawAgentId}`;

  const [headline, setHeadline] = useState<string>(
    `Portfolio Professionnel — ${matchedAgent.name}`
  );
  const [bio, setBio] = useState<string>(
    matchedAgent.description ||
      "Ingénieur & Architecte IA spécialisé dans l'automatisation de workflows d'entreprise, le pilotage de bureaux virtuels Cloud VM et l'intégration d'outils SaaS (Notion, Slack, GitHub, Google Workspace)."
  );
  const [contactEmail, setContactEmail] = useState<string>('contact@orbit-portfolio.io');
  const [projects, setProjects] = useState<PortfolioProjectItem[]>(DEFAULT_PROJECTS);
  const [copiedLink, setCopiedLink] = useState<boolean>(false);

  // New project form state
  const [newTitle, setNewTitle] = useState<string>('');
  const [newDesc, setNewDesc] = useState<string>('');

  // Live Notion.so sync state
  const [showNotionSyncModal, setShowNotionSyncModal] = useState<boolean>(false);
  const [tokenInput, setTokenInput] = useState<string>(notionToken || '');
  const [parentInput, setParentInput] = useState<string>(notionParentId || '');
  const [syncBusy, setSyncBusy] = useState<boolean>(false);
  const [syncError, setSyncError] = useState<string | null>(null);
  const [realNotionUrl, setRealNotionUrl] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const saved = window.localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.headline) setHeadline(parsed.headline);
        if (parsed.bio) setBio(parsed.bio);
        if (parsed.contactEmail) setContactEmail(parsed.contactEmail);
        if (Array.isArray(parsed.projects) && parsed.projects.length > 0) {
          setProjects(parsed.projects);
        }
      }
    } catch {
      // ignore storage error
    }
  }, [storageKey]);

  const persistPortfolio = (next: {
    headline?: string;
    bio?: string;
    contactEmail?: string;
    projects?: PortfolioProjectItem[];
  }) => {
    if (typeof window === 'undefined') return;
    const payload = {
      headline: next.headline ?? headline,
      bio: next.bio ?? bio,
      contactEmail: next.contactEmail ?? contactEmail,
      projects: next.projects ?? projects,
    };
    window.localStorage.setItem(storageKey, JSON.stringify(payload));
  };

  const handleCopyPublicLink = () => {
    if (typeof window === 'undefined') return;
    navigator.clipboard?.writeText(window.location.href).catch(() => {});
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const md = [
      `# ${headline}`,
      '',
      `> Statut : Page Publique Active · Générée par Orbit AI (${matchedAgent.name})`,
      '',
      `## À propos / Bio`,
      bio,
      '',
      `## Projets & Réalisations`,
      ...projects.map(
        (p, idx) =>
          `### ${idx + 1}. ${p.title} (${p.role})\n${p.description}\n- **Technologies** : ${p.tags.join(', ')}`
      ),
      '',
      `## Contact`,
      `- Email : ${contactEmail}`,
    ].join('\n');

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `portfolio-${matchedAgent.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.md`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;
    const item: PortfolioProjectItem = {
      id: `proj_${Date.now()}`,
      title: newTitle.trim(),
      role: 'Créateur & Architecte',
      description:
        newDesc.trim() ||
        'Projet déployé en production avec orchestration automatisée et suivi des métriques.',
      tags: ['Production', 'Orbit AI', 'Notion'],
    };
    const next = [item, ...projects];
    setProjects(next);
    persistPortfolio({ projects: next });
    setNewTitle('');
    setNewDesc('');
  };

  const handleDeleteProject = (id: string) => {
    const next = projects.filter((p) => p.id !== id);
    setProjects(next);
    persistPortfolio({ projects: next });
  };

  const handlePublishToRealNotion = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanToken = (tokenInput || notionToken).trim();
    setSyncError(null);
    if (!cleanToken) {
      setSyncError(
        "Veuillez saisir votre Clé d'intégration Notion (ntn_... ou secret_...) créée sur notion.so/profile/integrations."
      );
      return;
    }

    setSyncBusy(true);
    try {
      const contentLines = [
        `## À propos / Bio`,
        bio,
        `## Projets & Réalisations`,
        ...projects.map((p) => `• ${p.title} (${p.role}) — ${p.description}`),
        `## Contact`,
        `• Email : ${contactEmail}`,
      ].join('\n');

      const res = await fetch('/api/workspace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_notion_page',
          notionToken: cleanToken,
          notionParentId: (parentInput || notionParentId).trim(),
          title: headline,
          content: contentLines,
        }),
      });
      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Échec de création sur api.notion.com');
      }

      setNotionToken(cleanToken);
      if (parentInput.trim()) {
        setNotionParentId(parentInput.trim());
      }
      await connectToolToAgent(matchedAgent.agentId, 'notion');
      setRealNotionUrl(data.url);
    } catch (err) {
      setSyncError(
        err instanceof Error ? err.message : 'Erreur lors de la synchronisation avec Notion.'
      );
    } finally {
      setSyncBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#FBFBFA] text-slate-900">
      {/* Top Notion-style Navigation & Public Sharing Bar */}
      <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-xs px-4 sm:px-8 py-3 flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            href="/?autostart=1"
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Retour à l’espace Agent</span>
          </Link>
          <span className="text-slate-300">/</span>
          <div className="flex items-center gap-2 min-w-0">
            <span className="inline-flex h-5 w-5 items-center justify-center rounded bg-slate-900 text-[11px] font-bold text-white shrink-0">
              N
            </span>
            <span className="text-xs font-semibold text-slate-900 truncate">{headline}</span>
            <span className="inline-flex items-center gap-1 rounded-md bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[11px] font-semibold text-emerald-700">
              <Globe className="h-3 w-3" />
              <span>Page Publique Active</span>
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            type="button"
            onClick={handleCopyPublicLink}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            {copiedLink ? (
              <>
                <Check className="h-3.5 w-3.5 text-emerald-600" />
                <span className="text-emerald-700 font-semibold">Lien copié !</span>
              </>
            ) : (
              <>
                <Copy className="h-3.5 w-3.5" />
                <span>Copier le lien public</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleDownloadMarkdown}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Exporter .MD</span>
          </button>

          <button
            type="button"
            onClick={() => setShowNotionSyncModal((prev) => !prev)}
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 transition-colors"
          >
            <KeyRound className="h-3.5 w-3.5 text-emerald-400" />
            <span>Synchroniser vers mon compte Notion.so</span>
          </button>
        </div>
      </header>

      {/* Optional Live Notion.so API Sync Drawer */}
      {showNotionSyncModal && (
        <div className="border-b border-slate-200 bg-amber-50/80 px-4 sm:px-8 py-4">
          <div className="max-w-4xl mx-auto space-y-3">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-slate-900" />
                <span>
                  Publier cette page directement dans votre vrai espace Notion (POST
                  https://api.notion.com/v1/pages)
                </span>
              </h2>
              <button
                type="button"
                onClick={() => setShowNotionSyncModal(false)}
                className="text-xs text-slate-500 hover:text-slate-900"
              >
                Fermer
              </button>
            </div>
            <p className="text-xs text-slate-700 leading-relaxed">
              Cette page publique hébergée sur Orbit est déjà accessible à tous sans erreur. Si vous
              souhaitez également en créer une copie réelle dans votre compte{' '}
              <code className="bg-white px-1 py-0.5 rounded border border-slate-200">
                notion.so
              </code>
              , renseignez votre clé d’intégration Notion (
              <code className="bg-white px-1 py-0.5 rounded border border-slate-200">ntn_...</code>)
              et assurez-vous d’avoir partagé au moins une page Notion avec votre intégration via{' '}
              <code className="bg-white px-1 py-0.5 rounded border border-slate-200">
                ... → Connexions
              </code>
              .
            </p>
            <form
              onSubmit={handlePublishToRealNotion}
              className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end"
            >
              <div>
                <label className="block text-[11px] font-semibold text-slate-800 mb-1">
                  Clé d’intégration Notion (ntn_... / secret_...)
                </label>
                <input
                  type="password"
                  value={tokenInput}
                  onChange={(e) => setTokenInput(e.target.value)}
                  placeholder="ntn_..."
                  aria-label="Clé d'intégration Notion"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-slate-800 mb-1">
                  URL ou ID de la page parente Notion (optionnel)
                </label>
                <input
                  type="text"
                  value={parentInput}
                  onChange={(e) => setParentInput(e.target.value)}
                  placeholder="https://www.notion.so/... ou auto-détecté"
                  aria-label="URL ou ID de la page parente Notion"
                  className="w-full rounded-lg border border-slate-300 bg-white px-3 py-1.5 text-xs text-slate-900"
                />
              </div>
              <div>
                <button
                  type="submit"
                  disabled={syncBusy}
                  className="w-full inline-flex items-center justify-center gap-1.5 rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50"
                >
                  {syncBusy ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
                  )}
                  <span>Créer sur Notion.so maintenant</span>
                </button>
              </div>
            </form>

            {syncError && (
              <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
                {syncError}
              </div>
            )}

            {realNotionUrl && (
              <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 flex items-center justify-between gap-2 text-xs text-emerald-900">
                <span className="font-semibold">
                  ✅ Page créée avec succès dans votre espace Notion !
                </span>
                <a
                  href={realNotionUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 font-bold text-emerald-800 underline"
                >
                  <span>Ouvrir sur Notion.so ({realNotionUrl})</span>
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Notion-Style Cover Banner */}
      <div className="h-40 sm:h-48 w-full bg-gradient-to-r from-slate-900 via-slate-800 to-indigo-950 relative overflow-hidden">
        <div className="max-w-4xl mx-auto h-full px-6 flex items-end pb-5">
          <div className="inline-flex items-center gap-2 rounded-md bg-white/10 backdrop-blur-xs border border-white/15 px-3 py-1 text-xs font-medium text-white">
            <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
            <span>Portfolio Public & Espace Documentaire Notion · Généré par {matchedAgent.name}</span>
          </div>
        </div>
      </div>

      {/* Main Notion Document Container */}
      <main className="max-w-4xl mx-auto px-6 py-8 space-y-10">
        {/* Editable Title & Bio Callout */}
        <section className="space-y-4">
          <input
            type="text"
            value={headline}
            onChange={(e) => {
              setHeadline(e.target.value);
              persistPortfolio({ headline: e.target.value });
            }}
            aria-label="Titre du portfolio"
            className="w-full text-2xl sm:text-3xl font-bold text-slate-900 bg-transparent border-b border-transparent hover:border-slate-200 focus:border-slate-900 focus:outline-none pb-1"
          />

          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-2">
            <h2 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              01 · À propos & Bio Exécutive
            </h2>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => {
                setBio(e.target.value);
                persistPortfolio({ bio: e.target.value });
              }}
              aria-label="Biographie du portfolio"
              className="w-full text-sm text-slate-700 leading-relaxed bg-transparent focus:outline-none resize-none"
            />
          </div>
        </section>

        {/* Projects & Case Studies Section */}
        <section className="space-y-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-base font-bold text-slate-900">
              02 · Projets & Réalisations ({projects.length})
            </h2>
            <span className="text-xs text-slate-500">
              Modifiable en direct · Sauvegardé automatiquement
            </span>
          </div>

          <div className="grid grid-cols-1 gap-4">
            {projects.map((proj) => (
              <div
                key={proj.id}
                className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs flex items-start justify-between gap-4"
              >
                <div className="space-y-2 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="text-sm font-bold text-slate-900">{proj.title}</h3>
                    <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-700">
                      {proj.role}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">{proj.description}</p>
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    {proj.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded bg-slate-100 border border-slate-200 px-2 py-0.5 text-[11px] font-mono text-slate-700"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteProject(proj.id)}
                  aria-label={`Supprimer ${proj.title}`}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          {/* Add Project Inline Form */}
          <form
            onSubmit={handleAddProject}
            className="rounded-xl border border-dashed border-slate-300 bg-white p-4 space-y-3"
          >
            <p className="text-xs font-semibold text-slate-800">
              + Ajouter une réalisation au Portfolio
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <input
                type="text"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                placeholder="Titre du projet (ex. Agent IA Support Client)"
                aria-label="Titre du nouveau projet"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
              />
              <input
                type="text"
                value={newDesc}
                onChange={(e) => setNewDesc(e.target.value)}
                placeholder="Description et impact mesurable..."
                aria-label="Description du nouveau projet"
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-slate-800"
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Ajouter au portfolio</span>
            </button>
          </form>
        </section>

        {/* Contact & Public Availability Section */}
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-2xs space-y-3">
          <h2 className="text-base font-bold text-slate-900">03 · Contact & Coordonnées</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Adresse e-mail professionnelle
              </label>
              <input
                type="email"
                value={contactEmail}
                onChange={(e) => {
                  setContactEmail(e.target.value);
                  persistPortfolio({ contactEmail: e.target.value });
                }}
                aria-label="Email de contact"
                className="w-full rounded-lg border border-slate-200 px-3 py-1.5 text-xs text-slate-900 focus:border-slate-900 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                Agent IA Responsable & Outils actifs
              </label>
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs text-slate-700">
                <strong>{matchedAgent.name}</strong> ·{' '}
                {matchedAgent.tools.length > 0
                  ? matchedAgent.tools.join(', ')
                  : 'Gmail, Slack, Notion, Cloud VM'}
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
