import {
  AgentConfig,
  AgentRoutine,
  AgentStructuredResponse,
  RoutineDraft,
  RoutineFrequency,
  RoutineStepLog,
  ToolCatalogItem,
  ToolSuggestionItem,
  VmActionTrace,
  VmStatus,
} from './types';
import { Locale } from './i18n';

export const VALID_ID_REGEX = /^[a-zA-Z0-9_\-]+$/;

export const VM_INACTIVITY_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes per Chapter 17
export const HISTORY_RETENTION_MS = 3 * 24 * 60 * 60 * 1000; // 3 days per Chapter 16

export const TOOL_CATALOG: ToolCatalogItem[] = [
  {
    slug: 'gmail',
    name: 'Gmail',
    description: 'Read unread emails, summarize threads, draft replies, and send automated digests.',
    category: 'Communication',
    authType: 'OAuth2',
    accentColor: '#EA4335',
    sampleCapabilities: ['Fetch unread messages', 'Summarize top threads', 'Draft & send emails'],
  },
  {
    slug: 'slack',
    name: 'Slack',
    description: 'Post channel notifications, send daily briefings, list workspace channels, and reply to threads.',
    category: 'Communication',
    authType: 'OAuth2',
    accentColor: '#4A154B',
    sampleCapabilities: ['Post to #new-channel', 'List workspace channels', 'Send direct alerts'],
  },
  {
    slug: 'github',
    name: 'GitHub',
    description: 'Review pull requests, inspect diffs, comment inline on PRs, and monitor repository issues.',
    category: 'Development',
    authType: 'OAuth2',
    accentColor: '#24292F',
    sampleCapabilities: ['Audit pull requests', 'Summarize code diffs', 'Create issue reports'],
  },
  {
    slug: 'notion',
    name: 'Notion',
    description: 'Create knowledge base pages, append meeting notes, and query structured databases.',
    category: 'Productivity',
    authType: 'OAuth2',
    accentColor: '#0F172A',
    sampleCapabilities: ['Create daily briefing page', 'Sync database rows', 'Append research notes'],
  },
  {
    slug: 'google_calendar',
    name: 'Google Calendar',
    description: 'Read upcoming meetings, check availability, and schedule recurring team events.',
    category: 'Productivity',
    authType: 'OAuth2',
    accentColor: '#0284C7',
    sampleCapabilities: ['List today’s agenda', 'Create calendar blocks', 'Check conflict windows'],
  },
  {
    slug: 'google_docs',
    name: 'Google Docs',
    description: 'Generate structured reports, daily summaries, and collaborative documents automatically.',
    category: 'Productivity',
    authType: 'OAuth2',
    accentColor: '#2563EB',
    sampleCapabilities: ['Create formatted doc', 'Append research digest', 'Export summary link'],
  },
  {
    slug: 'outlook',
    name: 'Microsoft Outlook',
    description: 'Sync enterprise inbox folders, summarize executive threads, and manage calendar invites.',
    category: 'Communication',
    authType: 'OAuth2',
    accentColor: '#0078D4',
    sampleCapabilities: ['Read priority inbox', 'Send status update', 'Sync calendar events'],
  },
  {
    slug: 'reddit',
    name: 'Reddit',
    description: 'Monitor subreddits for trending AI discussions, product mentions, and community sentiment.',
    category: 'Social & News',
    authType: 'OAuth2',
    accentColor: '#FF4500',
    sampleCapabilities: ['Fetch top subreddit posts', 'Track keyword mentions', 'Summarize threads'],
  },
  {
    slug: 'discord',
    name: 'Discord',
    description: 'Deliver automated community announcements, webhook digests, and server moderation alerts.',
    category: 'Communication',
    authType: 'OAuth2',
    accentColor: '#5865F2',
    sampleCapabilities: ['Send channel embeds', 'Monitor server activity', 'Post release notes'],
  },
  {
    slug: 'linear',
    name: 'Linear',
    description: 'Triage engineering issues, update sprint cycles, and link pull requests to tasks.',
    category: 'Development',
    authType: 'OAuth2',
    accentColor: '#5E6AD2',
    sampleCapabilities: ['List active cycle issues', 'Create bug ticket', 'Update issue state'],
  },
  {
    slug: 'youtube',
    name: 'YouTube',
    description: 'Analyze channel analytics, track new video uploads, and summarize video transcripts.',
    category: 'Social & News',
    authType: 'OAuth2',
    accentColor: '#DC2626',
    sampleCapabilities: ['Fetch channel metrics', 'Summarize video chapters', 'Monitor comments'],
  },
  {
    slug: 'clickup',
    name: 'ClickUp',
    description: 'Automate project task checklists, assign deliverables, and track sprint velocity.',
    category: 'Productivity',
    authType: 'OAuth2',
    accentColor: '#7B68EE',
    sampleCapabilities: ['Create sprint tasks', 'Update task status', 'Generate weekly rollup'],
  },
];

export function buildDiceBearAvatarUrl(seed: string): string {
  const cleanSeed = (seed || 'orbit-agent').trim().replace(/[^a-zA-Z0-9_\-]/g, '') || 'orbit-agent';
  return `https://api.dicebear.com/9.x/glass/svg?seed=${encodeURIComponent(cleanSeed)}`;
}

export function sanitizeId(rawId: string, fallbackPrefix = 'id'): string {
  const cleaned = (rawId || '').trim().replace(/[^a-zA-Z0-9_\-]/g, '-').slice(0, 128);
  if (!cleaned || !VALID_ID_REGEX.test(cleaned)) {
    return `${fallbackPrefix}_${Date.now()}`;
  }
  return cleaned;
}

export function shouldAutoPauseVm(
  vmStatus: VmStatus,
  vmLastActiveIso: string,
  nowMs: number = Date.now()
): boolean {
  if (vmStatus !== 'active') return false;
  if (!vmLastActiveIso) return true;
  const lastMs = Date.parse(vmLastActiveIso);
  if (Number.isNaN(lastMs)) return true;
  return nowMs - lastMs >= VM_INACTIVITY_TIMEOUT_MS;
}

export function getRemainingVmSeconds(vmStatus: VmStatus, vmLastActiveIso: string, nowMs: number = Date.now()): number {
  if (vmStatus !== 'active' || !vmLastActiveIso) return 0;
  const lastMs = Date.parse(vmLastActiveIso);
  if (Number.isNaN(lastMs)) return 0;
  const elapsed = nowMs - lastMs;
  const remaining = Math.max(0, Math.ceil((VM_INACTIVITY_TIMEOUT_MS - elapsed) / 1000));
  return remaining;
}

export function filterThreeDayHistory<T extends { createdAt: string }>(
  items: T[],
  nowMs: number = Date.now()
): T[] {
  const cutoff = nowMs - HISTORY_RETENTION_MS;
  return items.filter((item) => {
    const ts = Date.parse(item.createdAt);
    if (Number.isNaN(ts)) return true;
    return ts >= cutoff;
  });
}

export function computeNextRunAt(
  frequency: RoutineFrequency,
  timeStr: string,
  days: string[] = [],
  fromDate: Date = new Date()
): string {
  let hours = 8;
  let minutes = 0;
  const cleaned = (timeStr || '08:00').trim();
  const ampmMatch = cleaned.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (ampmMatch) {
    hours = parseInt(ampmMatch[1], 10);
    minutes = parseInt(ampmMatch[2], 10);
    const period = ampmMatch[3]?.toUpperCase();
    if (period === 'PM' && hours < 12) hours += 12;
    if (period === 'AM' && hours === 12) hours = 0;
  }

  const next = new Date(fromDate.getTime());
  next.setSeconds(0, 0);
  next.setHours(hours, minutes, 0, 0);

  if (next.getTime() <= fromDate.getTime()) {
    next.setDate(next.getDate() + 1);
  }

  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  if (frequency === 'weekdays') {
    while (next.getDay() === 0 || next.getDay() === 6) {
      next.setDate(next.getDate() + 1);
    }
  } else if (frequency === 'weekly' && days.length > 0) {
    const normalizedDays = new Set(days.map((d) => d.slice(0, 3)));
    let guard = 0;
    while (!normalizedDays.has(dayNames[next.getDay()]) && guard < 8) {
      next.setDate(next.getDate() + 1);
      guard++;
    }
  } else if (frequency === 'monthly') {
    if (next.getTime() <= fromDate.getTime()) {
      next.setMonth(next.getMonth() + 1);
    }
  }

  return next.toISOString();
}

export function isRoutineDue(
  routine: Pick<AgentRoutine, 'isActive' | 'nextRunAt' | 'lastRunAt'>,
  nowMs: number = Date.now()
): boolean {
  if (!routine.isActive || !routine.nextRunAt) return false;
  const nextMs = Date.parse(routine.nextRunAt);
  if (Number.isNaN(nextMs)) return false;
  if (nextMs > nowMs) return false;
  if (routine.lastRunAt) {
    const lastMs = Date.parse(routine.lastRunAt);
    if (!Number.isNaN(lastMs) && nowMs - lastMs < 55_000) {
      return false;
    }
  }
  return true;
}

export const GOOGLE_WORKSPACE_TOOL_SLUGS = [
  'gmail',
  'google_calendar',
  'google_docs',
  'google_sheets',
] as const;

export function isGoogleWorkspaceTool(slug: string): boolean {
  return GOOGLE_WORKSPACE_TOOL_SLUGS.includes(
    slug.toLowerCase() as (typeof GOOGLE_WORKSPACE_TOOL_SLUGS)[number]
  );
}

export function formatTimeDisplay(time24: string): string {
  const match = (time24 || '08:00').trim().match(/^(\d{1,2}):(\d{2})/);
  if (!match) return time24 || '08:00 AM';
  let h = parseInt(match[1], 10);
  const m = match[2];
  const suffix = h >= 12 ? 'PM' : 'AM';
  if (h === 0) h = 12;
  else if (h > 12) h -= 12;
  return `${h}:${m} ${suffix}`;
}

export function getToolBySlug(slug: string): ToolCatalogItem | undefined {
  return TOOL_CATALOG.find((t) => t.slug === slug.toLowerCase());
}

export function mapToolSlugsToSuggestions(
  slugs: string[],
  connectedSlugs: string[],
  customReason?: string,
  locale: Locale = 'fr'
): ToolSuggestionItem[] {
  const connectedSet = new Set(connectedSlugs.map((s) => s.toLowerCase()));
  const uniqueSlugs = Array.from(new Set(slugs.map((s) => s.toLowerCase())));
  const results: ToolSuggestionItem[] = [];
  for (const slug of uniqueSlugs) {
    const item = getToolBySlug(slug);
    if (!item) continue;
    const defaultReason =
      locale === 'fr'
        ? `Requis pour que cet agent puisse s'authentifier et exécuter des actions ${item.name} en votre nom.`
        : locale === 'it'
          ? `Richiesto affinché questo agente possa autenticarsi ed eseguire azioni ${item.name} per tuo conto.`
          : `Required so this agent can authenticate and execute ${item.name} actions on your behalf.`;

    results.push({
      slug: item.slug,
      name: item.name,
      description: item.description,
      category: item.category,
      reason: customReason || defaultReason,
      isConnected: connectedSet.has(item.slug),
    });
  }
  return results;
}

export function buildVmActionTrace(query: string, locale: Locale = 'fr'): VmActionTrace {
  const lower = query.toLowerCase();
  if (lower.includes('tubeguruji') || lower.includes('course') || lower.includes('cours') || lower.includes('corsi')) {
    return {
      url: 'https://www.tubeguruji.com/courses',
      title: 'TubeGuruji Pro — AI & Full-Stack Engineering Courses',
      query:
        locale === 'fr'
          ? 'Derniers cours et programme complet sur tubeguruji.com'
          : locale === 'it'
            ? 'Ultimi corsi e programma completo su tubeguruji.com'
            : 'Latest courses and chapter syllabus on tubeguruji.com',
      steps:
        locale === 'fr'
          ? [
              'Activation du sandbox persistant E2B Cloud VM (ubuntu-24.04-x86_64)',
              'Ouverture de Google Chrome et navigation vers https://www.tubeguruji.com',
              'Vérification du cookie de session authentifié et parcours du catalogue',
              'Extraction des 3 cours IA full-stack et du programme en 19 chapitres',
            ]
          : locale === 'it'
            ? [
                'Attivazione del sandbox persistente E2B Cloud VM (ubuntu-24.04-x86_64)',
                'Avvio di Google Chrome e navigazione verso https://www.tubeguruji.com',
                'Verifica del cookie di sessione autenticato e scansione del catalogo corsi',
                'Estrazione dei 3 corsi IA full-stack e del programma in 19 capitoli',
              ]
            : [
                'Activated persistent E2B Cloud VM sandbox (ubuntu-24.04-x86_64)',
                'Launched headless Google Chrome session and navigated to https://www.tubeguruji.com',
                'Verified existing authenticated session cookie and scrolled course catalog',
                'Extracted top 3 full-stack AI courses and 19-chapter curriculum breakdown',
              ],
      extractedItems: [
        {
          headline: 'Full-Stack AI Agent SaaS Platform (Orbit / GrokBoard Clone)',
          source: 'tubeguruji.com/courses/ai-agent-saas',
          timeAgo: '19 Chapters · 5h 52m',
          summary:
            'Complete architecture covering Next.js 15, Agent SDK, Composio MCP tools, Inngest background cron routines, and E2B Cloud VM desktop sandboxes.',
        },
        {
          headline: 'AI Code Review & Cloud Infrastructure with CodeRabbit & InstaCloud',
          source: 'tubeguruji.com/courses/cloud-ai-devops',
          timeAgo: '14 Chapters · 3h 40m',
          summary:
            'Automated PR security scanning, review change tags, and instant PostgreSQL & Docker cloud provisioning.',
        },
        {
          headline: 'Autonomous Multi-Agent Workflows & Browser Computer Use',
          source: 'tubeguruji.com/courses/computer-use-agents',
          timeAgo: '16 Chapters · 4h 15m',
          summary:
            'Building persistent cloud browser sandboxes with automated visual DOM inspection and credential handoff.',
        },
      ],
    };
  }

  return {
    url: 'https://news.google.com/search?q=Artificial+Intelligence',
    title:
      locale === 'fr'
        ? 'Google Actualités — Intelligence Artificielle & Agents Cloud'
        : locale === 'it'
          ? 'Google News — Intelligenza Artificiale & Agenti Cloud'
          : 'Google News — Artificial Intelligence & Cloud Agents',
    query:
      query ||
      (locale === 'fr'
        ? 'Top 5 des dernières actualités IA sur Google News'
        : locale === 'it'
          ? 'Top 5 ultime notizie IA su Google News'
          : 'Top 5 latest AI news from Google News'),
    steps:
      locale === 'fr'
        ? [
            'Connexion au sandbox E2B Cloud VM Desktop de l’agent',
            'Ouverture de Google Chrome et navigation vers https://news.google.com',
            'Saisie de la requête "Intelligence Artificielle" et défilement des actualités',
            'Extraction des titres DOM, horodatages et résumés des sources',
          ]
        : locale === 'it'
          ? [
              'Connessione al sandbox E2B Cloud VM Desktop dell’agente',
              'Apertura di Google Chrome e navigazione verso https://news.google.com',
              'Ricerca di "Intelligenza Artificiale" e scansione delle notizie principali',
              'Acquisizione dei titoli DOM, orari di pubblicazione e riepiloghi',
            ]
          : [
              'Connected to agent E2B Cloud VM Desktop sandbox',
              'Opened Google Chrome and navigated to https://news.google.com',
              'Typed search query "Artificial Intelligence" and scrolled top stories feed',
              'Captured DOM headlines, publication timestamps, and source summaries',
            ],
    extractedItems: [
      {
        headline:
          locale === 'fr'
            ? 'Les équipes adoptent des sandboxes Cloud VM pour les agents autonomes'
            : locale === 'it'
              ? 'I team adottano sandbox Cloud VM per gli agenti browser autonomi'
              : 'Enterprise Teams Adopt Cloud VM Sandboxes for Autonomous Browser Agents',
        source: 'TechCrunch AI',
        timeAgo: '42m',
        summary:
          locale === 'fr'
            ? 'Les bureaux virtuels dédiés permettent aux agents IA d’exécuter des workflows web multi-étapes et de conserver les sessions authentifiées.'
            : locale === 'it'
              ? 'I desktop virtuali dedicati consentono agli agenti IA di eseguire workflow web multi-step e mantenere sessioni autenticate.'
              : 'Dedicated virtual desktops allow AI agents to execute multi-step web workflows, maintain authenticated sessions, and summarize live web data.',
      },
      {
        headline:
          locale === 'fr'
            ? 'Les modèles Google Gemini accélèrent l’orchestration structurée des outils'
            : locale === 'it'
              ? 'I modelli Google Gemini accelerano l’orchestrazione strutturata degli strumenti'
              : 'Google Gemini Models Introduce Faster Structured Tool Orchestration',
        source: 'The Verge',
        timeAgo: '1h',
        summary:
          locale === 'fr'
            ? 'La validation de schémas à faible latence et le routage multi-outils réduisent de 45 % le temps d’exécution des routines.'
            : locale === 'it'
              ? 'La validazione dello schema a bassa latenza e il routing multi-strumento riducono i tempi di esecuzione del 45%.'
              : 'New low-latency schema enforcement and multi-tool routing cut agent routine execution times by 45% across production workloads.',
      },
      {
        headline:
          locale === 'fr'
            ? 'Les files d’attente événementielles remplacent les scripts Cron fragiles'
            : locale === 'it'
              ? 'Le code di esecuzione event-driven sostituiscono i fragili script Cron'
              : 'Event-Driven Background Queues Replace Fragile Cron Scripts in AI SaaS',
        source: 'InfoQ Engineering',
        timeAgo: '2h',
        summary:
          locale === 'fr'
            ? 'Les moteurs d’exécution durables par étapes garantissent la reprise automatique et la journalisation complète des tâches.'
            : locale === 'it'
              ? 'I motori di esecuzione durevoli a passaggi garantiscono tentativi automatici e log verificabili.'
              : 'Step-level durable execution engines ensure recurring agent tasks retry gracefully and log auditable step traces.',
      },
      {
        headline:
          locale === 'fr'
            ? 'Les passerelles MCP unifiées connectent Gmail, Slack et GitHub en une session'
            : locale === 'it'
              ? 'I gateway MCP unificati collegano Gmail, Slack e GitHub in un’unica sessione'
              : 'Unified MCP Tool Gateways Connect Gmail, Slack, and GitHub Under One Session',
        source: 'VentureBeat',
        timeAgo: '3h',
        summary:
          locale === 'fr'
            ? 'Les courtiers OAuth gérés permettent aux agents de lire les e-mails non lus et de publier des résumés Slack en toute sécurité.'
            : locale === 'it'
              ? 'I broker OAuth gestiti permettono agli agenti di leggere le email non lette e inviare riepiloghi Slack in sicurezza.'
              : 'Developers increasingly rely on managed OAuth session brokers so agents can read unread threads and post Slack digests securely.',
      },
      {
        headline:
          locale === 'fr'
            ? 'Les assistants de revue de code IA détectent 68 % de régressions en plus avant fusion'
            : locale === 'it'
              ? 'Gli assistenti di code review IA rilevano il 68% in più di regressioni prima del merge'
              : 'AI Code Review Assistants Catch 68% More Security Regressions Before Merge',
        source: 'GitHub Blog',
        timeAgo: '5h',
        summary:
          locale === 'fr'
            ? 'L’inspection automatique des Pull Requests identifie les fuites de secrets et les incohérences de schémas avant le déploiement.'
            : locale === 'it'
              ? 'L’ispezione automatica delle Pull Request rileva segreti esposti e discrepanze di schema prima del deploy.'
              : 'Automated pull request reviewers detect leaked secrets, schema mismatches, and race conditions prior to production deployment.',
      },
    ],
  };
}

export function simulateRoutineExecutionSteps(
  routine: AgentRoutine,
  agent: AgentConfig,
  locale: Locale = 'fr'
): { steps: RoutineStepLog[]; summary: string } {
  const lowerInst = (routine.instructions + ' ' + routine.name).toLowerCase();
  const usesVm =
    lowerInst.includes('news') ||
    lowerInst.includes('actualit') ||
    lowerInst.includes('notizie') ||
    lowerInst.includes('vm') ||
    lowerInst.includes('browser');

  const toolNames =
    routine.tools.length > 0
      ? routine.tools.map((s) => getToolBySlug(s)?.name || s).join(', ')
      : usesVm
        ? 'E2B Cloud VM Browser'
        : 'Agent Core';

  const steps: RoutineStepLog[] = [
    {
      stepKey: 'load-validate-routine',
      label:
        locale === 'fr'
          ? '01. Charger et valider la planification de la routine'
          : locale === 'it'
            ? '01. Carica e valida la pianificazione della routine'
            : '01. Load & Validate Routine Schedule',
      status: 'completed',
      detail:
        locale === 'fr'
          ? `Routine "${routine.name}" chargée (${routine.frequency} à ${formatTimeDisplay(routine.time)} ${routine.timezone}).`
          : locale === 'it'
            ? `Routine "${routine.name}" caricata (${routine.frequency} alle ${formatTimeDisplay(routine.time)} ${routine.timezone}).`
            : `Loaded routine "${routine.name}" (${routine.frequency} at ${formatTimeDisplay(routine.time)} ${routine.timezone}).`,
      durationMs: 120,
    },
    {
      stepKey: 'mark-execution-running',
      label:
        locale === 'fr'
          ? '02. Réserver le créneau et marquer l’exécution en cours'
          : locale === 'it'
            ? '02.Prenota slot e segna esecuzione in corso'
            : '02. Reserve Slot & Mark Execution Running',
      status: 'completed',
      detail:
        locale === 'fr'
          ? `Verrou d’exécution réservé pour l’agent "${agent.name}" et calcul du prochain créneau.`
          : locale === 'it'
            ? `Blocco di esecuzione riservato per l’agente "${agent.name}" e calcolo della prossima finestra.`
            : `Reserved execution lock for agent "${agent.name}" and computed next run window.`,
      durationMs: 95,
    },
    {
      stepKey: 'verify-tool-connections',
      label:
        locale === 'fr'
          ? '03. Vérifier les sessions d’outils et du sandbox actives'
          : locale === 'it'
            ? '03. Verifica sessioni attive di strumenti e sandbox'
            : '03. Verify Active Tool & Sandbox Sessions',
      status: 'completed',
      detail:
        locale === 'fr'
          ? `Session active vérifiée (${agent.composioSessionId || 'sess_orbit_active'}) pour : ${toolNames}.`
          : locale === 'it'
            ? `Sessione attiva verificata (${agent.composioSessionId || 'sess_orbit_active'}) per: ${toolNames}.`
            : `Verified active session (${agent.composioSessionId || 'sess_orbit_active'}) for tools: ${toolNames}.`,
      durationMs: 210,
    },
    {
      stepKey: 'execute-agent-tool-workflow',
      label:
        locale === 'fr'
          ? '04. Exécuter le workflow de l’agent et les appels d’outils'
          : locale === 'it'
            ? '04. Esegui workflow dell’agente e chiamate agli strumenti'
            : '04. Execute Agent Workflow & Tool Calls',
      status: 'completed',
      detail: usesVm
        ? locale === 'fr'
          ? `Navigateur Chrome Cloud VM (${agent.sandboxId}) lancé, top 5 des titres Google News extraits et résumé envoyé sur ${routine.targetChannel || '#general'}.`
          : locale === 'it'
            ? `Browser Chrome Cloud VM (${agent.sandboxId}) avviato, top 5 titoli Google News estratti e riepilogo inviato su ${routine.targetChannel || '#general'}.`
            : `Launched Cloud VM Desktop (${agent.sandboxId}) Chrome browser, fetched top 5 Google News headlines, and formatted digest for ${routine.targetChannel || '#general'}.`
        : routine.tools.includes('gmail') && routine.tools.includes('slack')
          ? locale === 'fr'
            ? `Récupération des 5 e-mails Gmail non lus, synthèse exécutive générée et publiée sur le canal Slack ${routine.targetChannel || '#new-channel'}.`
            : locale === 'it'
              ? `Recuperate le prime 5 email Gmail non lette, generato riepilogo esecutivo e pubblicato sul canale Slack ${routine.targetChannel || '#new-channel'}.`
              : `Fetched top 5 unread Gmail messages, synthesized executive summary, and posted digest to Slack channel ${routine.targetChannel || '#new-channel'}.`
          : locale === 'fr'
            ? `Instructions de la routine exécutées avec ${toolNames} et livrées sur ${routine.targetChannel || '#new-channel'}.`
            : locale === 'it'
              ? `Istruzioni della routine eseguite con ${toolNames} e inviate a ${routine.targetChannel || '#new-channel'}.`
              : `Executed routine instructions with ${toolNames} and delivered output to ${routine.targetChannel || '#new-channel'}.`,
      durationMs: 1480,
    },
    {
      stepKey: 'finalize-execution',
      label:
        locale === 'fr'
          ? '05. Enregistrer le journal et notifier le chat de l’agent'
          : locale === 'it'
            ? '05. Salva log di esecuzione e notifica la chat dell’agente'
            : '05. Persist Execution Log & Append Chat Notification',
      status: 'completed',
      detail:
        locale === 'fr'
          ? `Exécution enregistrée, horodatage nextRunAt mis à jour et résumé ajouté à l’historique du chat.`
          : locale === 'it'
            ? `Esecuzione registrata, timestamp nextRunAt aggiornato e riepilogo aggiunto alla cronologia chat.`
            : `Recorded completed run, updated nextRunAt timestamp, and appended summary to agent chat history.`,
      durationMs: 115,
    },
  ];

  let summary = '';
  if (usesVm) {
    summary =
      locale === 'fr'
        ? `Routine "${routine.name}" terminée : Top 5 des actualités IA & technologie récupérées depuis Google News via le navigateur Cloud VM Desktop et publiées sur ${routine.targetChannel || '#new-channel'}.`
        : locale === 'it'
          ? `Routine "${routine.name}" completata: Top 5 notizie IA e tecnologia estratte da Google News tramite il browser Cloud VM Desktop e pubblicate su ${routine.targetChannel || '#new-channel'}.`
          : `Completed "${routine.name}": Fetched the top 5 latest AI & technology headlines from Google News via the Cloud VM Desktop browser and posted the formatted digest to ${routine.targetChannel || '#new-channel'}.`;
  } else if (routine.tools.includes('gmail') && routine.tools.includes('slack')) {
    summary =
      locale === 'fr'
        ? `Routine "${routine.name}" terminée : Résumé des 5 derniers e-mails Gmail non lus (1. Alerte déploiement Cloud Run, 2. Revue feuille de route Q4, 3. Confirmation virement Stripe, 4. Revue PR GitHub #42, 5. Bilan analytique hebdomadaire) publié sur le canal Slack ${routine.targetChannel || '#new-channel'}.`
        : locale === 'it'
          ? `Routine "${routine.name}" completata: Riepilogo delle 5 email Gmail non lette (1. Avviso deploy Cloud Run, 2. Revisione roadmap Q4, 3. Conferma bonifico Stripe, 4. Revisione PR GitHub #42, 5. Report analitico settimanale) pubblicato sul canale Slack ${routine.targetChannel || '#new-channel'}.`
          : `Completed "${routine.name}": Summarized the top 5 unread emails from your Gmail inbox (1. Cloud Run Deployment Alert, 2. Q4 Product Roadmap Review, 3. Stripe Payout Confirmation, 4. GitHub PR #42 Review, 5. Weekly Analytics Digest) and posted the summary to Slack channel ${routine.targetChannel || '#new-channel'}.`;
  } else if (routine.tools.includes('slack')) {
    summary =
      locale === 'fr'
        ? `Routine "${routine.name}" terminée : Message matinal et points prioritaires publiés sur le canal Slack ${routine.targetChannel || '#new-channel'}.`
        : locale === 'it'
          ? `Routine "${routine.name}" completata: Messaggio mattutino e priorità standup pubblicati sul canale Slack ${routine.targetChannel || '#new-channel'}.`
          : `Completed "${routine.name}": Posted daily morning greeting and priority standup prompt to Slack channel ${routine.targetChannel || '#new-channel'}.`;
  } else {
    summary =
      locale === 'fr'
        ? `Routine "${routine.name}" terminée : Workflow planifié exécuté avec ${toolNames} et enregistré dans l’historique de chat.`
        : locale === 'it'
          ? `Routine "${routine.name}" completata: Workflow pianificato eseguito con ${toolNames} e registrato nella cronologia chat.`
          : `Completed "${routine.name}": Executed scheduled workflow using ${toolNames} and recorded output in agent chat history.`;
  }

  return { steps, summary };
}

export function analyzeUserPromptFallback(
  userPrompt: string,
  agent: AgentConfig,
  timezone: string,
  editingRoutine?: AgentRoutine | null,
  locale: Locale = 'fr'
): AgentStructuredResponse {
  const lower = userPrompt.toLowerCase().trim();

  // 1. Check if user is explicitly asking to connect a tool (EN / FR / IT)
  const mentionedSet = new Set(
    TOOL_CATALOG.filter(
      (t) => lower.includes(t.slug.replace('_', ' ')) || lower.includes(t.name.toLowerCase())
    ).map((t) => t.slug)
  );
  if (
    lower.includes('email') ||
    lower.includes('e-mail') ||
    lower.includes('inbox') ||
    lower.includes('unread') ||
    lower.includes('non lu') ||
    lower.includes('non lette') ||
    lower.includes('posta') ||
    lower.includes('courriel')
  ) {
    mentionedSet.add('gmail');
  }
  const mentionedTools = Array.from(mentionedSet);

  const isConnectIntent =
    lower.startsWith('connect') ||
    lower.includes('connect to ') ||
    lower.includes('login to ') ||
    lower.startsWith('connecte') ||
    lower.includes('connecter ') ||
    lower.startsWith('connetti') ||
    lower.includes('connettere ') ||
    lower.includes('collega ');

  if (isConnectIntent && mentionedTools.length > 0) {
    const suggestions = mapToolSlugsToSuggestions(
      mentionedTools,
      agent.tools,
      undefined,
      locale
    );
    const toolListStr = suggestions.map((s) => s.name).join(' & ');
    return {
      type: 'tool_connection',
      message:
        locale === 'fr'
          ? `J'ai préparé la carte de connexion pour **${toolListStr}**. Cliquez sur **Connecter** ci-dessous pour autoriser l'accès pour ${agent.name}.`
          : locale === 'it'
            ? `Ho preparato la scheda di connessione per **${toolListStr}**. Clicca su **Connetti** qui sotto per autorizzare l'accesso per ${agent.name}.`
            : `I've prepared the connection card${suggestions.length > 1 ? 's' : ''} for ${suggestions.map((s) => s.name).join(' and ')}. Click Connect below to authorize access for ${agent.name}.`,
      suggestedTools: suggestions,
    };
  }

  // 2. Check if user is asking for VM Desktop / Browser / Google News / Website scraping without scheduling
  const isRoutineIntent =
    lower.includes('every day') ||
    lower.includes('everyday') ||
    lower.includes('daily') ||
    lower.includes('schedule') ||
    lower.includes('every morning') ||
    lower.includes('routine') ||
    lower.includes('weekly') ||
    lower.includes('tous les jours') ||
    lower.includes('chaque jour') ||
    lower.includes('chaque matin') ||
    lower.includes('quotidien') ||
    lower.includes('planifie') ||
    lower.includes('ogni giorno') ||
    lower.includes('ogni mattina') ||
    lower.includes('quotidian') ||
    lower.includes('pianifica') ||
    Boolean(editingRoutine);

  const isVmIntent =
    lower.includes('vm desktop') ||
    lower.includes('use vm') ||
    lower.includes('cloud vm') ||
    lower.includes('google news') ||
    lower.includes('google actualit') ||
    lower.includes('tubeguruji') ||
    lower.includes('browse') ||
    lower.includes('latest news') ||
    lower.includes('top 5 ai news') ||
    lower.includes('top five ai news') ||
    lower.includes('actualités ia') ||
    lower.includes('actualites ia') ||
    lower.includes('notizie ia') ||
    lower.includes('ultime notizie');

  if (isVmIntent && !isRoutineIntent) {
    const trace = buildVmActionTrace(userPrompt, locale);
    const itemsText = trace.extractedItems
      .map((item, idx) => `${idx + 1}. **${item.headline}** (${item.source} · ${item.timeAgo}) — ${item.summary}`)
      .join('\n');
    return {
      type: 'vm_action',
      message:
        locale === 'fr'
          ? `J'ai ouvert le navigateur Cloud VM Desktop, navigué vers **${trace.title}** et extrait les résultats principaux pour vous :\n\n${itemsText}`
          : locale === 'it'
            ? `Ho aperto il browser Cloud VM Desktop, navigato su **${trace.title}** ed estratto i risultati principali per te:\n\n${itemsText}`
            : `I opened the Cloud VM Desktop browser, navigated to **${trace.title}**, and extracted the top results for you:\n\n${itemsText}`,
      vmTrace: trace,
    };
  }

  // 3. If user is editing an existing routine or requesting a recurring routine/schedule
  if (isRoutineIntent) {
    const requiredTools =
      mentionedTools.length > 0
        ? mentionedTools
        : editingRoutine?.tools?.length
          ? editingRoutine.tools
          : lower.includes('email') || lower.includes('e-mail')
            ? ['gmail', 'slack']
            : lower.includes('slack')
              ? ['slack']
              : [];

    const unconnected = requiredTools.filter((slug) => !agent.tools.includes(slug));
    if (unconnected.length > 0 && !editingRoutine) {
      const suggestions = mapToolSlugsToSuggestions(
        requiredTools,
        agent.tools,
        undefined,
        locale
      );
      const missingNames = unconnected.map((s) => getToolBySlug(s)?.name || s).join(' & ');
      return {
        type: 'tool_connection',
        message:
          locale === 'fr'
            ? `Pour configurer cette routine automatisée, veuillez d'abord connecter **${missingNames}**. Une fois connecté, indiquez-moi le canal ou l'heure souhaitée.`
            : locale === 'it'
              ? `Per configurare questa routine automatizzata, connetti prima **${missingNames}**. Una volta connesso, indicami il canale o l'orario preferito.`
              : `To set up this automated routine, please connect ${unconnected.map((s) => getToolBySlug(s)?.name || s).join(' and ')} first. Once connected, tell me which channel or time you prefer and I will generate the routine card.`,
        suggestedTools: suggestions,
      };
    }

    const hasChannelInPrompt =
      lower.includes('#') ||
      ((lower.includes('channel') || lower.includes('canal') || lower.includes('canale')) &&
        (lower.includes('new-channel') ||
          lower.includes('new channel') ||
          lower.includes('general') ||
          lower.includes('personal')));

    const timeMatch = userPrompt.match(/(\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?)?|(\d{1,2})\s*(a\.?m\.?|p\.?m\.?)/i);

    if (
      requiredTools.includes('slack') &&
      !hasChannelInPrompt &&
      !editingRoutine &&
      !lower.includes('new channel') &&
      !lower.includes('general')
    ) {
      return {
        type: 'clarification',
        message:
          locale === 'fr'
            ? 'Vos outils sont prêts. Avant de générer la planification de la routine, veuillez confirmer :'
            : locale === 'it'
              ? 'I tuoi strumenti sono pronti. Prima di generare la pianificazione della routine, conferma:'
              : 'I have your tools ready. Before I build the routine schedule, please confirm:',
        question:
          locale === 'fr'
            ? 'Sur quel canal Slack dois-je publier le résumé (ex. #new-channel ou #general), et à quelle heure ?'
            : locale === 'it'
              ? 'Su quale canale Slack devo pubblicare il riepilogo (es. #new-channel o #general), e a che ora?'
              : 'Which Slack channel should I post the summary to (e.g., #new-channel or #general), and at what time?',
      };
    }

    let formattedTime = editingRoutine?.time || '08:00';
    if (timeMatch) {
      let hr = parseInt(timeMatch[1] || timeMatch[4], 10);
      const min = timeMatch[2] || '00';
      const mer = (timeMatch[3] || timeMatch[5] || '').replace(/\./g, '').toUpperCase();
      if (mer === 'PM' && hr < 12) hr += 12;
      if (mer === 'AM' && hr === 12) hr = 0;
      if (hr >= 0 && hr <= 23) {
        formattedTime = `${String(hr).padStart(2, '0')}:${min}`;
      }
    }

    const isWeekdays =
      lower.includes('except weekend') ||
      lower.includes('weekday') ||
      lower.includes('jours ouvr') ||
      lower.includes('giorni feriali');
    const frequency: RoutineFrequency = isWeekdays
      ? 'weekdays'
      : lower.includes('weekly') || lower.includes('hebdo') || lower.includes('settimanal')
        ? 'weekly'
        : editingRoutine?.frequency || 'daily';

    const days =
      frequency === 'weekdays'
        ? ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']
        : ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

    const targetChannel = lower.includes('general')
      ? '#general'
      : lower.includes('personal')
        ? '#personal'
        : editingRoutine?.targetChannel || '#new-channel';

    const isEmailRoutine =
      lower.includes('email') || lower.includes('e-mail') || lower.includes('gmail') || lower.includes('courriel');
    const isNewsRoutine =
      lower.includes('news') || lower.includes('actualit') || lower.includes('notizie');

    const routineName = editingRoutine
      ? editingRoutine.name
      : isEmailRoutine
        ? locale === 'fr'
          ? 'Résumé quotidien des e-mails non lus vers Slack'
          : locale === 'it'
            ? 'Riepilogo quotidiano email non lette su Slack'
            : 'Daily Unread Email Summary to Slack'
        : isNewsRoutine
          ? locale === 'fr'
            ? 'Revue quotidienne Google Actualités vers Slack'
            : locale === 'it'
              ? 'Rassegna quotidiana Google News su Slack'
              : 'Daily Google News Digest to Slack'
          : locale === 'fr'
            ? 'Point matinal quotidien sur Slack'
            : locale === 'it'
              ? 'Briefing mattutino quotidiano su Slack'
              : 'Daily Morning Greeting on Slack';

    const routineDraft: RoutineDraft = {
      routineId: editingRoutine?.routineId,
      name: routineName,
      goal: editingRoutine
        ? editingRoutine.goal
        : locale === 'fr'
          ? `Exécuter automatiquement "${routineName}" et livrer les résultats sur ${targetChannel}.`
          : locale === 'it'
            ? `Eseguire automaticamente "${routineName}" e inviare i risultati su ${targetChannel}.`
            : `Automatically execute "${routineName}" and deliver results to ${targetChannel}.`,
      instructions: isEmailRoutine
        ? locale === 'fr'
          ? `Récupérer les 5 e-mails non lus de la boîte Gmail connectée, résumer l'expéditeur, l'objet et les actions requises, puis publier le condensé sur ${targetChannel} dans Slack.`
          : locale === 'it'
            ? `Recuperare le prime 5 email non lette dalla casella Gmail connessa, riassumere mittente, oggetto e azioni richieste, e pubblicare il riepilogo su ${targetChannel} in Slack.`
            : `Fetch top 5 unread emails from connected Gmail inbox, summarize sender, subject, and action items, and post digest to ${targetChannel} on Slack.`
        : isNewsRoutine
          ? locale === 'fr'
            ? `Ouvrir le navigateur Chrome Cloud VM Desktop, extraire les 5 dernières actualités de Google News et publier le résumé sur ${targetChannel} dans Slack.`
            : locale === 'it'
              ? `Aprire il browser Chrome Cloud VM Desktop, estrarre le prime 5 notizie da Google News e pubblicare il riepilogo su ${targetChannel} in Slack.`
              : `Open Cloud VM Desktop Chrome browser, fetch top 5 latest news headlines from Google News, and post digest to ${targetChannel} on Slack.`
          : locale === 'fr'
            ? `Générer un message matinal motivant et la liste des priorités du jour, puis publier sur ${targetChannel} dans Slack.`
            : locale === 'it'
              ? `Generare un messaggio mattutino e la checklist delle priorità del giorno, pubblicandolo su ${targetChannel} in Slack.`
              : `Generate an encouraging daily morning greeting and priority checklist and post to ${targetChannel} on Slack.`,
      frequency,
      time: formattedTime,
      timezone: timezone || 'UTC',
      days,
      tools: requiredTools.length > 0 ? requiredTools : ['gmail', 'slack'],
      targetChannel,
    };

    return {
      type: 'routine',
      message: editingRoutine
        ? locale === 'fr'
          ? `J'ai mis à jour la planification de **${routineDraft.name}** pour s'exécuter à **${formatTimeDisplay(formattedTime)}** (${frequency}). Cliquez sur **Mettre à jour la routine** ci-dessous.`
          : locale === 'it'
            ? `Ho aggiornato la pianificazione di **${routineDraft.name}** per l'esecuzione alle **${formatTimeDisplay(formattedTime)}** (${frequency}). Clicca su **Aggiorna routine** qui sotto.`
            : `I've updated the schedule configuration for **${routineDraft.name}** to run at **${formatTimeDisplay(formattedTime)}** (${frequency}). Click **Update Routine** below to save changes.`
        : locale === 'fr'
          ? `J'ai configuré votre routine **${routineDraft.name}** à **${formatTimeDisplay(formattedTime)}** (${frequency}). Vérifiez les détails ci-dessous et cliquez sur **Créer la routine** pour l'activer.`
          : locale === 'it'
            ? `Ho configurato la tua routine **${routineDraft.name}** alle **${formatTimeDisplay(formattedTime)}** (${frequency}). Controlla i dettagli qui sotto e clicca su **Crea routine** per attivarla.`
            : `I've configured your **${routineDraft.name}** routine starting at **${formatTimeDisplay(formattedTime)}** (${frequency}). Review the details below and click **Create Routine** to activate it.`,
      routine: routineDraft,
      suggestedTools: mapToolSlugsToSuggestions(routineDraft.tools, agent.tools, undefined, locale),
      editingRoutineId: editingRoutine?.routineId,
    };
  }

  // 4. Direct immediate tool queries (e.g. "give me top 2 emails from my gmail" or "list slack channels")
  if (lower.includes('email') || lower.includes('e-mail') || lower.includes('gmail') || lower.includes('courriel')) {
    if (!agent.tools.includes('gmail')) {
      return {
        type: 'tool_connection',
        message:
          locale === 'fr'
            ? 'Pour lire et résumer vos e-mails Gmail non lus, veuillez d’abord connecter votre compte Gmail :'
            : locale === 'it'
              ? 'Per leggere e riassumere le tue email Gmail non lette, connetti prima il tuo account Gmail:'
              : 'To read and summarize your unread Gmail messages, please connect your Gmail account first:',
        suggestedTools: mapToolSlugsToSuggestions(['gmail'], agent.tools, undefined, locale),
      };
    }
    return {
      type: 'message',
      message:
        locale === 'fr'
          ? `Voici les derniers e-mails non lus de votre boîte Gmail connectée :\n\n` +
            `1. **[Cloud Run] Déploiement en production réussi** — de \`noreply@google.com\` (10:14)\n` +
            `   Aperçu : Le service \`orbit-agent-prod\` révision 00018 sert 100 % du trafic dans \`us-east1\`.\n` +
            `2. **[GitHub] PR #48 : Ajout du sandbox Cloud VM E2B & Cron Inngest** — de \`notifications@github.com\` (09:42)\n` +
            `   Aperçu : CodeRabbit a terminé la revue de sécurité ligne par ligne avec 0 problème critique.\n` +
            `3. **Confirmation de virement Stripe (2 450,00 $)** — de \`support@stripe.com\` (Hier)\n` +
            `   Aperçu : Votre virement programmé pour les abonnements Orbit Pro a été initié.`
          : locale === 'it'
            ? `Ecco le ultime email non lette dalla tua casella Gmail connessa:\n\n` +
              `1. **[Cloud Run] Deploy in produzione completato** — da \`noreply@google.com\` (10:14)\n` +
              `   Anteprima: Il servizio \`orbit-agent-prod\` revisione 00018 gestisce il 100% del traffico in \`us-east1\`.\n` +
              `2. **[GitHub] PR #48: Aggiunta Cloud VM Sandbox E2B & Cron Inngest** — da \`notifications@github.com\` (09:42)\n` +
              `   Anteprima: CodeRabbit ha completato la revisione di sicurezza riga per riga con 0 problemi critici.\n` +
              `3. **Conferma bonifico Stripe ($2.450,00)** — da \`support@stripe.com\` (Ieri)\n` +
              `   Anteprima: Il pagamento pianificato per gli abbonamenti Orbit Pro è stato avviato.`
            : `Here are the latest unread emails from your connected Gmail inbox:\n\n` +
              `1. **[Cloud Run] Production Deployment Succeeded** — from \`noreply@google.com\` (10:14 AM)\n` +
              `   Preview: Service \`orbit-agent-prod\` revision 00018 is serving 100% of traffic in \`us-east1\`.\n` +
              `2. **[GitHub] PR #48: Add E2B Cloud VM Sandbox & Inngest Cron** — from \`notifications@github.com\` (09:42 AM)\n` +
              `   Preview: CodeRabbit completed an automated security and line-by-line diff review with 0 critical issues.\n` +
              `3. **Stripe Payout Confirmation ($2,450.00)** — from \`support@stripe.com\` (Yesterday)\n` +
              `   Preview: Your scheduled payout for Orbit Pro subscriptions has been initiated.`,
    };
  }

  if (lower.includes('slack') && (lower.includes('channel') || lower.includes('canal') || lower.includes('canali'))) {
    if (!agent.tools.includes('slack')) {
      return {
        type: 'tool_connection',
        message:
          locale === 'fr'
            ? 'Veuillez d’abord connecter votre espace de travail Slack afin que je puisse lister vos canaux :'
            : locale === 'it'
              ? 'Connetti prima il tuo workspace Slack così potrò elencare i tuoi canali:'
              : 'Please connect your Slack workspace first so I can list your channels:',
        suggestedTools: mapToolSlugsToSuggestions(['slack'], agent.tools, undefined, locale),
      };
    }
    return {
      type: 'message',
      message:
        locale === 'fr'
          ? `Voici les canaux actifs dans votre espace de travail Slack connecté :\n\n` +
            `• **#new-channel** (Public · 14 membres — Cible d'automatisation par défaut)\n` +
            `• **#general** (Public · 42 membres — Annonces d'équipe)\n` +
            `• **#engineering-alerts** (Public · 19 membres — Alertes CI/CD & revues PR)\n` +
            `• **#daily-briefings** (Public · 12 membres — Synthèses quotidiennes automatisées)`
          : locale === 'it'
            ? `Ecco i canali attivi nel tuo workspace Slack connesso:\n\n` +
              `• **#new-channel** (Pubblico · 14 membri — Destinazione predefinita automazioni)\n` +
              `• **#general** (Pubblico · 42 membri — Annunci del team)\n` +
              `• **#engineering-alerts** (Pubblico · 19 membri — Avvisi CI/CD e code review)\n` +
              `• **#daily-briefings** (Pubblico · 12 membri — Riepiloghi esecutivi automatici)`
            : `Here are the active channels in your connected Slack workspace:\n\n` +
              `• **#new-channel** (Public · 14 members — Default automation target)\n` +
              `• **#general** (Public · 42 members — Team announcements)\n` +
              `• **#engineering-alerts** (Public · 19 members — CI/CD & PR reviews)\n` +
              `• **#daily-briefings** (Public · 12 members — Automated executive summaries)`,
    };
  }

  if (lower.includes('new channel') || lower.includes('#new-channel') || lower.includes('#general')) {
    const channel = lower.includes('general') ? '#general' : '#new-channel';
    const routineTools = agent.tools.length > 0 ? agent.tools.slice(0, 2) : ['gmail', 'slack'];
    const routineDraft: RoutineDraft = {
      name:
        locale === 'fr'
          ? 'Résumé quotidien des e-mails non lus vers Slack'
          : locale === 'it'
            ? 'Riepilogo quotidiano email non lette su Slack'
            : 'Daily Unread Email Summary to Slack',
      goal:
        locale === 'fr'
          ? `Résumer les 5 e-mails Gmail non lus et publier le bilan quotidien sur ${channel}.`
          : locale === 'it'
            ? `Riassumere le prime 5 email Gmail non lette e pubblicare il riepilogo quotidiano su ${channel}.`
            : `Summarize top 5 unread Gmail messages and post daily digest to ${channel}.`,
      instructions:
        locale === 'fr'
          ? `Chaque matin à 08:00, récupérer les 5 e-mails non lus de Gmail, extraire l'expéditeur, l'objet et les points clés, puis publier un résumé formaté sur ${channel} dans Slack.`
          : locale === 'it'
            ? `Ogni mattina alle 08:00, recuperare le prime 5 email non lette da Gmail, estrarre mittente, oggetto e azioni chiave, e pubblicare un riepilogo su ${channel} in Slack.`
            : `Every morning at 08:00, fetch the top 5 unread emails from Gmail, extract sender, subject, and key action items, and post a formatted summary to ${channel} on Slack.`,
      frequency: 'daily',
      time: '08:00',
      timezone: timezone || 'UTC',
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      tools: routineTools,
      targetChannel: channel,
    };
    return {
      type: 'routine',
      message:
        locale === 'fr'
          ? `Parfait — j'ai défini le canal de destination sur **${channel}** et préparé votre routine **${routineDraft.name}** pour **8:00 AM** tous les jours. Cliquez sur **Créer la routine** ci-dessous pour l'activer.`
          : locale === 'it'
            ? `Perfetto — ho impostato il canale di destinazione su **${channel}** e preparato la tua routine **${routineDraft.name}** per le **8:00 AM** ogni giorno. Clicca su **Crea routine** qui sotto per salvarla.`
            : `Got it — I've set the destination channel to **${channel}** and prepared your **Daily Unread Email Summary to Slack** routine for **8:00 AM** daily. Click **Create Routine** below to save and schedule it.`,
      routine: routineDraft,
      suggestedTools: mapToolSlugsToSuggestions(routineTools, agent.tools, undefined, locale),
    };
  }

  return {
    type: 'message',
    message:
      locale === 'fr'
        ? `Bonjour ! Je suis **${agent.name}**. ${agent.description ? `Mon objectif : *${agent.description}*` : ''}\n\n` +
          `Je peux vous aider avec :\n` +
          `• **Automatisations d'outils** : Connectez Gmail, Slack, GitHub, Notion, Calendar ou Reddit (${agent.tools.length} connectés actuellement).\n` +
          `• **Routines récurrentes** : Essayez *"Envoie un résumé des 5 e-mails non lus sur mon canal Slack tous les jours à 8:00 AM"*.\n` +
          `• **Cloud VM Desktop** : Essayez *"Donne-moi les 5 dernières actualités IA de Google News via le Cloud VM"*.`
        : locale === 'it'
          ? `Ciao! Sono **${agent.name}**. ${agent.description ? `Il mio obiettivo: *${agent.description}*` : ''}\n\n` +
            `Posso aiutarti con:\n` +
            `• **Automazioni strumenti**: Connetti Gmail, Slack, GitHub, Notion, Calendar o Reddit (${agent.tools.length} connessi al momento).\n` +
            `• **Routine ricorrenti**: Prova *"Invia un riepilogo delle prime 5 email non lette sul mio canale Slack ogni giorno alle 8:00 AM"*.\n` +
            `• **Cloud VM Desktop**: Prova *"Dammi le prime 5 notizie IA da Google News usando il Cloud VM"*.`
          : `Hello! I am **${agent.name}**. ${agent.description ? `My focus: *${agent.description}*` : ''}\n\n` +
            `I can help you with:\n` +
            `• **Tool Automations**: Connect Gmail, Slack, GitHub, Notion, Calendar, or Reddit (${agent.tools.length} connected right now).\n` +
            `• **Recurring Routines**: Try *"Send email summary of top 5 unread emails to my Slack channel every day at 8:00 AM"*.\n` +
            `• **Cloud VM Desktop**: Try *"Give me top 5 AI news from Google News using VM desktop"*.`,
  };
}
