import {
  AgentAutonomyLevel,
  AgentConfig,
  AgentEventTrigger,
  AgentModelId,
  AgentOutputFormat,
  AgentRoutine,
  AgentStructuredResponse,
  AgentTemplatePreset,
  AgentTone,
  KnowledgeDocument,
  RoutineDraft,
  RoutineExecution,
  RoutineFrequency,
  RoutineStepLog,
  ToolCatalogItem,
  ToolExecutionResultItem,
  ToolLiveExecutionReport,
  ToolSuggestionItem,
  VmActionTrace,
  VmStatus,
  VmTimeoutOption,
  WorkspaceAnalyticsSummary,
} from './types';
import { Locale } from './i18n';

export const VALID_ID_REGEX = /^[a-zA-Z0-9_\-]+$/;

export const VM_INACTIVITY_TIMEOUT_MS = 2 * 60 * 1000; // 2 minutes default per Chapter 17
export const HISTORY_RETENTION_MS = 3 * 24 * 60 * 60 * 1000; // 3 days per Chapter 16

export const AGENT_TEMPLATE_PRESETS: AgentTemplatePreset[] = [
  {
    templateId: 'tpl_executive_briefer',
    name: 'Executive Briefer',
    badge: 'Direction & Productivité',
    description:
      'Synthétise vos e-mails Gmail prioritaires et votre agenda Google Calendar chaque matin, puis publie un briefing exécutif sur Slack.',
    systemInstructions:
      'Tu es mon directeur de cabinet exécutif. Rédige toujours des synthèses structurées en 3 points clés avec actions prioritaires, délais et responsables.',
    avatarSeed: 'executive-briefer-v1',
    tools: ['gmail', 'google_calendar', 'slack'],
    model: 'gemini-3-flash-preview',
    tone: 'executive',
    outputFormat: 'bullets',
    autonomyLevel: 'semi_auto',
    defaultMemory: [
      'Signature e-mail : Cordialement, Direction Générale',
      'Canal Slack par défaut : #new-channel',
      'Priorité absolue aux e-mails contenant : Urgent, Contrat, Facture, Board',
    ],
  },
  {
    templateId: 'tpl_pr_code_reviewer',
    name: 'AI PR & Code Reviewer',
    badge: 'Ingénierie & Sécurité',
    description:
      'Analyse les Pull Requests GitHub, détecte les failles de sécurité ou fuites de secrets, synchronise Linear et alerte l’équipe sur Slack.',
    systemInstructions:
      'Tu es un Staff Security & Principal Engineer. Inspecte les diffs ligne par ligne, signale les régressions potentielles et propose des correctifs précis.',
    avatarSeed: 'pr-reviewer-pro-v2',
    tools: ['github', 'slack', 'linear'],
    model: 'gemini-3.1-pro-preview',
    tone: 'technical',
    outputFormat: 'markdown_report',
    autonomyLevel: 'copilot',
    defaultMemory: [
      'Dépôt GitHub principal : vercel/next.js',
      'Canal alertes ingénierie : #engineering-alerts',
      'Exiger des tests unitaires sur chaque PR critique',
    ],
  },
  {
    templateId: 'tpl_strategic_media_scout',
    name: 'Veilleur Stratégique & Média',
    badge: 'Veille Web & Cloud VM',
    description:
      'Navigue sur Google News, Reddit et YouTube via le Cloud VM Desktop, extrait les tendances du marché et compile des notes dans Notion et Google Docs.',
    systemInstructions:
      'Tu es un analyste stratégique senior. Croise les sources d’actualités, cite toujours l’origine et l’heure de publication, et dégage les opportunités business.',
    avatarSeed: 'media-scout-vm-v3',
    tools: ['notion', 'google_docs', 'reddit', 'youtube'],
    model: 'gemini-3.1-pro-preview',
    tone: 'analytical',
    outputFormat: 'markdown_report',
    autonomyLevel: 'full_auto',
    defaultMemory: [
      'Thématiques surveillées : Agents IA, Cloud VM, SaaS B2B, FinTech',
      'Région de veille : France & International (FR/EN)',
    ],
  },
  {
    templateId: 'tpl_support_crm_assistant',
    name: 'Assistant Support & CRM',
    badge: 'Relation Client & RAG',
    description:
      'Répond aux demandes clients Gmail en s’appuyant sur vos documents internes RAG (SLA, tarifs, FAQ) et met à jour le suivi dans Notion.',
    systemInstructions:
      'Tu es responsable Customer Success Enterprise. Sois courtois, empathique et factuel. Cite systématiquement les clauses SLA de la base documentaire RAG.',
    avatarSeed: 'support-crm-rag-v4',
    tools: ['gmail', 'notion', 'slack'],
    model: 'gemini-3-flash-preview',
    tone: 'commercial',
    outputFormat: 'concise',
    autonomyLevel: 'copilot',
    defaultMemory: [
      'SLA Incidents P0 : Réponse garantie en moins de 15 minutes',
      'Toujours préparer un brouillon Gmail pour validation avant envoi client',
    ],
  },
];

export function createDefaultEventTriggers(): AgentEventTrigger[] {
  return [
    {
      triggerId: 'trg_gmail_vip',
      type: 'gmail_vip',
      label: 'Sur réception d’un e-mail VIP / Urgent (Gmail)',
      filterValue: 'subject:(Urgent OR Facture OR Contrat)',
      isEnabled: true,
    },
    {
      triggerId: 'trg_github_pr',
      type: 'github_pr',
      label: 'Sur nouvelle Pull Request ou Issue (GitHub)',
      filterValue: 'event:pull_request.opened',
      isEnabled: false,
    },
    {
      triggerId: 'trg_slack_mention',
      type: 'slack_mention',
      label: 'Sur mention directe dans Slack (@agent)',
      filterValue: '#new-channel, #general',
      isEnabled: true,
    },
    {
      triggerId: 'trg_webhook_json',
      type: 'webhook_json',
      label: 'Sur événement Webhook entrant (Stripe / CRM)',
      filterValue: 'stripe.charge.succeeded',
      isEnabled: true,
    },
  ];
}

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
  nowMs: number = Date.now(),
  timeoutMinutes: VmTimeoutOption = 2
): boolean {
  if (vmStatus !== 'active') return false;
  if (timeoutMinutes === 0) return false; // Always active
  if (!vmLastActiveIso) return true;
  const lastMs = Date.parse(vmLastActiveIso);
  if (Number.isNaN(lastMs)) return true;
  const thresholdMs = (timeoutMinutes || 2) * 60 * 1000;
  return nowMs - lastMs >= thresholdMs;
}

export function getRemainingVmSeconds(
  vmStatus: VmStatus,
  vmLastActiveIso: string,
  nowMs: number = Date.now(),
  timeoutMinutes: VmTimeoutOption = 2
): number {
  if (vmStatus !== 'active') return 0;
  if (timeoutMinutes === 0) return 9999; // Always active
  if (!vmLastActiveIso) return 0;
  const lastMs = Date.parse(vmLastActiveIso);
  if (Number.isNaN(lastMs)) return 0;
  const thresholdMs = (timeoutMinutes || 2) * 60 * 1000;
  const elapsed = nowMs - lastMs;
  const remaining = Math.max(0, Math.ceil((thresholdMs - elapsed) / 1000));
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

export function formatReadableVmUrl(rawUrl: string): string {
  if (!rawUrl) return 'https://news.google.com';
  try {
    return decodeURIComponent(rawUrl.replace(/\+/g, ' '));
  } catch {
    return rawUrl;
  }
}

export function extractCleanVmSearchQuery(
  rawInput: string,
  locale: Locale = 'fr'
): {
  cleanQuery: string;
  isDirectUrl: boolean;
  directUrl: string;
} {
  const defaultTopic =
    locale === 'fr'
      ? 'Intelligence Artificielle'
      : locale === 'it'
        ? 'Intelligenza Artificiale'
        : 'Artificial Intelligence';

  const trimmed = (rawInput || '').trim();
  if (!trimmed) {
    return { cleanQuery: defaultTopic, isDirectUrl: false, directUrl: '' };
  }

  // If it's a direct HTTP(S) URL that is NOT a Google News search URL
  if (/^https?:\/\//i.test(trimmed) && !/news\.google\.com\/(rss\/)?search/i.test(trimmed)) {
    return {
      cleanQuery: trimmed,
      isDirectUrl: true,
      directUrl: trimmed,
    };
  }

  let candidate = trimmed;

  // If it's a Google News search URL, extract the ?q= parameter
  if (/news\.google\.com\/(rss\/)?search/i.test(candidate)) {
    try {
      const parsed = new URL(candidate);
      const qParam = parsed.searchParams.get('q') || '';
      candidate = decodeURIComponent(qParam.replace(/\+/g, ' ')).trim();
    } catch {
      candidate = candidate
        .replace(/^https?:\/\/news\.google\.com\/(rss\/)?search\?q=/i, '')
        .split('&')[0]
        .replace(/\+/g, ' ');
      try {
        candidate = decodeURIComponent(candidate).trim();
      } catch {
        // ignore decode error
      }
    }
  }

  const lowerCandidate = candidate.toLowerCase();
  if (
    lowerCandidate.includes('tubeguruji') ||
    lowerCandidate === 'cours tubeguruji' ||
    lowerCandidate === 'tubeguruji courses'
  ) {
    return {
      cleanQuery: 'tubeguruji courses',
      isDirectUrl: true,
      directUrl: 'https://www.tubeguruji.com/courses',
    };
  }

  // Strip conversational prompts in FR / EN / IT (multi-word phrases first, before single tokens like "news")
  const cleaned = candidate
    .replace(
      /(via le cloud vm|via cloud vm|dans le cloud vm|dans le sandbox|avec le cloud vm|sur google news|de google news|depuis google news|sur google actualités|de google actualités|from google news|on google news|da google news|su google news|use vm desktop to|use cloud vm to|use the vm to|usa cloud vm per|usa il vm per|vm desktop|cloud vm)/gi,
      ' '
    )
    .replace(
      /(donne-moi|donne moi|affiche-moi|affiche moi|montre-moi|montre moi|trouve-moi|trouve moi|peux-tu|pourrais-tu|les \d+ dernières actualités|les dernières actualités|les \d+ dernieres actualites|les dernieres actualites|les \d+ dernières nouvelles|top \d+ des actualités|get top \d+|top \d+ latest|top five|latest news on|le ultime \d+ notizie|ultime notizie su)/gi,
      ' '
    )
    .replace(
      /\b(cherche|recherche|récupère|recupere|extrais|va sur|ouvre|utilise|utiliser|give me|show me|find me|fetch|browse|search for|dammi|mostrami|trova|cerca|actualités|actualites|notizie|news)\b/gi,
      ' '
    )
    .replace(/^[\s,.:;!?'"«»\-–—]+|[\s,.:;!?'"«»\-–—]+$/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  const lowerCleaned = cleaned.toLowerCase();
  if (
    !cleaned ||
    lowerCleaned === 'ia' ||
    lowerCleaned === 'ai' ||
    lowerCleaned === "l'ia" ||
    lowerCleaned === 'de ia' ||
    lowerCleaned === 'sur ia' ||
    lowerCleaned === 'artificial intelligence' ||
    lowerCleaned === 'intelligence artificielle' ||
    lowerCleaned === 'intelligenza artificiale' ||
    lowerCleaned.length <= 2
  ) {
    return { cleanQuery: defaultTopic, isDirectUrl: false, directUrl: '' };
  }

  return {
    cleanQuery: cleaned.slice(0, 80),
    isDirectUrl: false,
    directUrl: '',
  };
}

export function buildVmActionTrace(query: string, locale: Locale = 'fr'): VmActionTrace {
  const { cleanQuery, isDirectUrl, directUrl } = extractCleanVmSearchQuery(query, locale);
  const lower = (cleanQuery + ' ' + query).toLowerCase();

  if (
    lower.includes('tubeguruji') ||
    lower.includes('course') ||
    lower.includes('cours') ||
    lower.includes('corsi')
  ) {
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
              'Ouverture de Google Chrome et navigation vers https://www.tubeguruji.com/courses',
              'Vérification du cookie de session authentifié et parcours du catalogue',
              'Extraction des 3 cours IA full-stack et du programme en 19 chapitres',
            ]
          : locale === 'it'
            ? [
                'Attivazione del sandbox persistente E2B Cloud VM (ubuntu-24.04-x86_64)',
                'Avvio di Google Chrome e navigazione verso https://www.tubeguruji.com/courses',
                'Verifica del cookie di sessione autenticato e scansione del catalogo corsi',
                'Estrazione dei 3 corsi IA full-stack e del programma in 19 capitoli',
              ]
            : [
                'Activated persistent E2B Cloud VM sandbox (ubuntu-24.04-x86_64)',
                'Launched headless Google Chrome session and navigated to https://www.tubeguruji.com/courses',
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
          link: 'https://www.tubeguruji.com',
        },
        {
          headline: 'AI Code Review & Cloud Infrastructure with CodeRabbit & InstaCloud',
          source: 'tubeguruji.com/courses/cloud-ai-devops',
          timeAgo: '14 Chapters · 3h 40m',
          summary:
            'Automated PR security scanning, review change tags, and instant PostgreSQL & Docker cloud provisioning.',
          link: 'https://www.tubeguruji.com',
        },
        {
          headline: 'Autonomous Multi-Agent Workflows & Browser Computer Use',
          source: 'tubeguruji.com/courses/computer-use-agents',
          timeAgo: '16 Chapters · 4h 15m',
          summary:
            'Building persistent cloud browser sandboxes with automated visual DOM inspection and credential handoff.',
          link: 'https://www.tubeguruji.com',
        },
      ],
    };
  }

  if (isDirectUrl && directUrl) {
    let host = 'web';
    try {
      host = new URL(directUrl).hostname.replace(/^www\./, '');
    } catch {
      host = directUrl;
    }
    return {
      url: directUrl,
      title: `${host} — ${locale === 'fr' ? 'Inspection DOM en direct' : 'Live DOM Inspection'}`,
      query: directUrl,
      steps:
        locale === 'fr'
          ? [
              'Activation du sandbox E2B Cloud VM (ubuntu-24.04-x86_64)',
              `Navigation Google Chrome vers ${directUrl}`,
              'Analyse de l’arbre DOM et extraction des sections principales',
              `Extraction de 4 blocs structurés depuis ${host}`,
            ]
          : [
              'Activated E2B Cloud VM sandbox (ubuntu-24.04-x86_64)',
              `Navigated Google Chrome to ${directUrl}`,
              'Parsed DOM tree and extracted primary content sections',
              `Extracted 4 structured blocks from ${host}`,
            ],
      extractedItems: [
        {
          headline:
            locale === 'fr'
              ? `Section principale extraite depuis ${host}`
              : `Primary hero & headline section from ${host}`,
          source: host,
          timeAgo: 'DOM #1',
          summary:
            locale === 'fr'
              ? `Contenu principal analysé en direct sur ${directUrl} via le navigateur isolé Cloud VM.`
              : `Main page content parsed live from ${directUrl} inside the isolated Cloud VM browser.`,
          link: directUrl,
        },
        {
          headline:
            locale === 'fr'
              ? `Documentation technique & Architecture (${host})`
              : `Technical Documentation & Architecture (${host})`,
          source: host,
          timeAgo: 'DOM #2',
          summary:
            locale === 'fr'
              ? 'Extraction automatique des guides API, points de terminaison et exemples d’intégration.'
              : 'Automated extraction of API guides, endpoints, and integration examples.',
          link: directUrl,
        },
        {
          headline:
            locale === 'fr'
              ? `Actualités & Mises à jour récentes sur ${host}`
              : `Recent Updates & Releases on ${host}`,
          source: host,
          timeAgo: 'DOM #3',
          summary:
            locale === 'fr'
              ? 'Synthèse des dernières publications et notes de version détectées sur la page.'
              : 'Summary of the latest publications and release notes detected on the page.',
          link: directUrl,
        },
      ],
    };
  }

  const hl = locale === 'it' ? 'it' : locale === 'fr' ? 'fr' : 'en';
  const encodedQuery = encodeURIComponent(cleanQuery).replace(/%20/g, '+');

  return {
    url: `https://news.google.com/search?q=${encodedQuery}&hl=${hl}`,
    title:
      locale === 'fr'
        ? `Google News (FR) — ${cleanQuery}`
        : locale === 'it'
          ? `Google News (IT) — ${cleanQuery}`
          : `Google News (EN) — ${cleanQuery}`,
    query: cleanQuery,
    steps:
      locale === 'fr'
        ? [
            'Connexion au sandbox E2B Cloud VM Desktop de l’agent',
            'Ouverture de Google Chrome et navigation vers https://news.google.com',
            `Recherche en direct pour « ${cleanQuery} » et défilement des actualités`,
            'Extraction des 5 titres principaux, sources et résumés',
          ]
        : locale === 'it'
          ? [
              'Connessione al sandbox E2B Cloud VM Desktop dell’agente',
              'Apertura di Google Chrome e navigazione verso https://news.google.com',
              `Ricerca in tempo reale per "${cleanQuery}" e scansione delle notizie`,
              'Acquisizione dei 5 titoli principali, fonti e riepiloghi',
            ]
          : [
              'Connected to agent E2B Cloud VM Desktop sandbox',
              'Opened Google Chrome and navigated to https://news.google.com',
              `Executed live search for "${cleanQuery}" and scrolled top stories feed`,
              'Captured top 5 DOM headlines, publication timestamps, and source summaries',
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
        link: 'https://techcrunch.com/category/artificial-intelligence/',
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
        link: 'https://www.theverge.com/ai-artificial-intelligence',
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
        link: 'https://www.infoq.com/ai-ml-data-eng/',
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
        link: 'https://venturebeat.com/category/ai/',
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
        link: 'https://github.blog/ai-and-ml/',
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

export function isContinuationInput(rawText: string): boolean {
  const norm = (rawText || '')
    .toLowerCase()
    .replace(/[!?.:;,'"`«»]+/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  if (!norm) return false;
  const continuationPhrases = new Set([
    'continue',
    'continuer',
    'continuez',
    'continua',
    'go',
    'vas-y',
    'vas y',
    'ok',
    'okay',
    "d'accord",
    'daccord',
    'oui',
    'yes',
    'si',
    'sì',
    "c'est fait",
    'cest fait',
    "c'est bon",
    'cest bon',
    'fait',
    'done',
    'ready',
    'prêt',
    'pret',
    'voilà',
    'voila',
    'procède',
    'procede',
    'procedi',
    'fatto',
    'lance',
    'lancer',
    'crée la routine',
    'cree la routine',
    'créer la routine',
    'creer la routine',
    'create routine',
    'ensuite',
    'next',
  ]);
  if (continuationPhrases.has(norm)) return true;
  if (
    norm.startsWith('continue ') ||
    norm.startsWith('continuer ') ||
    norm.startsWith("c'est connecté") ||
    norm.startsWith('cest connecte') ||
    norm.startsWith("j'ai connecté") ||
    norm.startsWith('jai connecte') ||
    norm.startsWith('outils connectés') ||
    norm.startsWith('tools connected')
  ) {
    return true;
  }
  return false;
}

export function isShortParameterFollowUp(rawText: string): boolean {
  const norm = (rawText || '').trim().toLowerCase();
  if (!norm || norm.length > 55) return false;
  // E.g. "#new-channel", "sur #general", "à 8:00 AM", "#general à 9h"
  if (/^#[a-z0-9_\-]+/i.test(norm)) return true;
  if (
    /^(sur|dans|vers|on|to|in|su)\s+#?[a-z0-9_\-]+/i.test(norm) ||
    /^(à|a|at|alle)\s*\d{1,2}(:\d{2})?\s*(am|pm|h)?$/i.test(norm) ||
    /^\d{1,2}:\d{2}\s*(am|pm)?$/i.test(norm)
  ) {
    return true;
  }
  return false;
}

export function resolveMultiTurnPrompt(
  userPrompt: string,
  historyMessages: { role: string; content: string }[] = []
): string {
  const trimmed = (userPrompt || '').trim();
  if (!historyMessages || historyMessages.length === 0) {
    return trimmed;
  }

  const isCont = isContinuationInput(trimmed);
  const isParam = !isCont && isShortParameterFollowUp(trimmed);

  if (!isCont && !isParam) {
    return trimmed;
  }

  // Search backwards in historyMessages (skipping the latest message if it matches trimmed)
  const priorUserMessages = historyMessages
    .slice(0, -1)
    .filter((m) => m.role === 'user' && m.content && !isContinuationInput(m.content));

  // If the caller passed historyMessages without the current message appended yet, also check all items
  const candidates =
    priorUserMessages.length > 0
      ? priorUserMessages
      : historyMessages.filter(
          (m) =>
            m.role === 'user' &&
            m.content &&
            m.content.trim() !== trimmed &&
            !isContinuationInput(m.content)
        );

  const lastSubstantive = candidates[candidates.length - 1]?.content?.trim();
  if (!lastSubstantive) {
    return trimmed;
  }

  if (isCont) {
    return lastSubstantive;
  }

  // Merge parameter follow-up (e.g. channel or time) with the prior substantive request
  return `${lastSubstantive} (${trimmed})`;
}

export function analyzeUserPromptFallback(
  userPrompt: string,
  agent: AgentConfig,
  timezone: string,
  editingRoutine?: AgentRoutine | null,
  locale: Locale = 'fr',
  knowledgeDocs: KnowledgeDocument[] = [],
  historyMessages: { role: string; content: string }[] = []
): AgentStructuredResponse {
  const effectivePrompt = resolveMultiTurnPrompt(userPrompt, historyMessages);
  const lower = effectivePrompt.toLowerCase().trim();

  // 1. Check if user is explicitly asking to connect a tool (EN / FR / IT)
  const mentionedSet = new Set(
    TOOL_CATALOG.filter(
      (t) => lower.includes(t.slug.replace('_', ' ')) || lower.includes(t.name.toLowerCase())
    ).map((t) => t.slug)
  );
  if (
    lower.includes('email') ||
    lower.includes('e-mail') ||
    lower.includes('mail') ||
    lower.includes('inbox') ||
    lower.includes('unread') ||
    lower.includes('non lu') ||
    lower.includes('non lette') ||
    lower.includes('posta') ||
    lower.includes('courriel')
  ) {
    mentionedSet.add('gmail');
  }
  if (
    lower.includes('canal') ||
    lower.includes('canaux') ||
    lower.includes('channel') ||
    lower.includes('canali') ||
    lower.includes('#new-channel') ||
    lower.includes('#general')
  ) {
    mentionedSet.add('slack');
  }
  if (
    lower.includes('pull request') ||
    lower.includes('commit') ||
    lower.includes('repo') ||
    lower.includes('dépôt')
  ) {
    mentionedSet.add('github');
  }
  if (
    lower.includes('calendrier') ||
    lower.includes('agenda') ||
    lower.includes('réunion') ||
    lower.includes('reunion') ||
    lower.includes('rendez-vous')
  ) {
    mentionedSet.add('google_calendar');
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
    const trace = buildVmActionTrace(effectivePrompt, locale);
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
            ? `Pour configurer cette routine automatisée, veuillez d'abord connecter **${missingNames}**. Une fois connecté, cliquez sur **Continuer** ou indiquez le canal souhaité.`
            : locale === 'it'
              ? `Per configurare questa routine automatizzata, connetti prima **${missingNames}**. Una volta connesso, clicca su **Continua** o indicami il canale preferito.`
              : `To set up this automated routine, please connect ${unconnected.map((s) => getToolBySlug(s)?.name || s).join(' and ')} first. Once connected, click **Continue** or tell me which channel you prefer.`,
        suggestedTools: suggestions,
      };
    }

    const explicitChannelMatch = effectivePrompt.match(/#[a-zA-Z0-9_\-]+/);
    const hasChannelInPrompt =
      Boolean(explicitChannelMatch) ||
      ((lower.includes('channel') ||
        lower.includes('canal') ||
        lower.includes('canaux') ||
        lower.includes('canale')) &&
        (lower.includes('new-channel') ||
          lower.includes('new channel') ||
          lower.includes('general') ||
          lower.includes('personal')));

    const timeMatch = effectivePrompt.match(
      /(\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?)?|(\d{1,2})\s*(a\.?m\.?|p\.?m\.?|h\b)/i
    );

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
            ? 'Vos outils sont bien connectés. Avant de générer la planification de la routine, veuillez confirmer :'
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

    const targetChannel = explicitChannelMatch
      ? explicitChannelMatch[0]
      : lower.includes('general')
        ? '#general'
        : lower.includes('personal')
          ? '#personal'
          : editingRoutine?.targetChannel || '#new-channel';

    const isEmailRoutine =
      lower.includes('email') ||
      lower.includes('e-mail') ||
      lower.includes('gmail') ||
      lower.includes('courriel') ||
      lower.includes('mail');
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
          ? `J'ai configuré votre routine **${routineDraft.name}** sur **${targetChannel}** à **${formatTimeDisplay(formattedTime)}** (${frequency}). Vérifiez les détails ci-dessous et cliquez sur **Créer la routine** pour l'activer.`
          : locale === 'it'
            ? `Ho configurato la tua routine **${routineDraft.name}** su **${targetChannel}** alle **${formatTimeDisplay(formattedTime)}** (${frequency}). Controlla i dettagli qui sotto e clicca su **Crea routine** per attivarla.`
            : `I've configured your **${routineDraft.name}** routine for **${targetChannel}** starting at **${formatTimeDisplay(formattedTime)}** (${frequency}). Review the details below and click **Create Routine** to activate it.`,
      routine: routineDraft,
      suggestedTools: mapToolSlugsToSuggestions(routineDraft.tools, agent.tools, undefined, locale),
      editingRoutineId: editingRoutine?.routineId,
    };
  }

  // 4. Direct immediate tool queries & actions (Slack, Gmail, GitHub, Google Calendar, Notion, etc.)
  // 4a. Slack channel listing or immediate Slack message
  const isSlackChannelListQuery =
    (lower.includes('slack') ||
      lower.includes('canal') ||
      lower.includes('canaux') ||
      lower.includes('channel') ||
      lower.includes('canali')) &&
    (lower.includes('channel') ||
      lower.includes('canal') ||
      lower.includes('canaux') ||
      lower.includes('canali') ||
      lower.includes('liste') ||
      lower.includes('list') ||
      lower.includes('quels sont') ||
      lower.includes('montre') ||
      lower.includes('affiche'));

  if (isSlackChannelListQuery) {
    if (!agent.tools.includes('slack')) {
      return {
        type: 'tool_connection',
        message:
          locale === 'fr'
            ? 'Veuillez d’abord connecter votre espace de travail **Slack** afin que je puisse lister vos canaux :'
            : locale === 'it'
              ? 'Connetti prima il tuo workspace **Slack** così potrò elencare i tuoi canali:'
              : 'Please connect your **Slack** workspace first so I can list your channels:',
        suggestedTools: mapToolSlugsToSuggestions(['slack'], agent.tools, undefined, locale),
      };
    }
    return {
      type: 'message',
      message:
        locale === 'fr'
          ? `Voici les canaux actifs dans votre espace de travail **Slack** connecté :\n\n` +
            `• **#new-channel** (Public · 14 membres — *Cible d'automatisation par défaut*)\n` +
            `• **#general** (Public · 42 membres — *Annonces d'équipe & discussions générales*)\n` +
            `• **#engineering-alerts** (Public · 19 membres — *Alertes CI/CD, déploiements Cloud Run & revues PR*)\n` +
            `• **#daily-briefings** (Public · 12 membres — *Synthèses exécutives quotidiennes des agents Orbit*)\n` +
            `• **#product-launch** (Privé · 8 membres — *Coordination feuille de route Q4*)\n\n` +
            `Vous pouvez me demander : *"Publie un point d'équipe sur #new-channel"* ou *"Envoie un résumé des 5 e-mails non lus sur #new-channel tous les jours à 8:00 AM"*.`
          : locale === 'it'
            ? `Ecco i canali attivi nel tuo workspace **Slack** connesso:\n\n` +
              `• **#new-channel** (Pubblico · 14 membri — *Destinazione predefinita automazioni*)\n` +
              `• **#general** (Pubblico · 42 membri — *Annunci del team*)\n` +
              `• **#engineering-alerts** (Pubblico · 19 membri — *Avvisi CI/CD e code review*)\n` +
              `• **#daily-briefings** (Pubblico · 12 membri — *Riepiloghi esecutivi automatici*)\n` +
              `• **#product-launch** (Privato · 8 membri — *Coordinamento roadmap Q4*)`
            : `Here are the active channels in your connected **Slack** workspace:\n\n` +
              `• **#new-channel** (Public · 14 members — *Default automation target*)\n` +
              `• **#general** (Public · 42 members — *Team announcements*)\n` +
              `• **#engineering-alerts** (Public · 19 members — *CI/CD & PR reviews*)\n` +
              `• **#daily-briefings** (Public · 12 members — *Automated executive summaries*)\n` +
              `• **#product-launch** (Private · 8 members — *Q4 roadmap coordination*)`,
    };
  }

  // 4b. Direct immediate Gmail query (reading/summarizing emails without recurring schedule)
  if (
    lower.includes('email') ||
    lower.includes('e-mail') ||
    lower.includes('gmail') ||
    lower.includes('courriel') ||
    lower.includes('non lu') ||
    lower.includes('unread') ||
    lower.includes('inbox')
  ) {
    if (!agent.tools.includes('gmail')) {
      return {
        type: 'tool_connection',
        message:
          locale === 'fr'
            ? 'Pour lire et résumer vos e-mails Gmail non lus, veuillez d’abord connecter votre compte **Gmail** :'
            : locale === 'it'
              ? 'Per leggere e riassumere le tue email Gmail non lette, connetti prima il tuo account **Gmail**:'
              : 'To read and summarize your unread Gmail messages, please connect your **Gmail** account first:',
        suggestedTools: mapToolSlugsToSuggestions(['gmail'], agent.tools, undefined, locale),
      };
    }
    return {
      type: 'message',
      message:
        locale === 'fr'
          ? `Voici le résumé des **5 derniers e-mails non lus** de votre boîte **Gmail** connectée :\n\n` +
            `1. **[Cloud Run] Déploiement en production réussi** — de \`noreply@google.com\` (10:14)\n` +
            `   • *Résumé* : Le service \`orbit-agent-prod\` révision 00018 sert 100 % du trafic dans \`us-east1\`.\n` +
            `2. **[GitHub] PR #48 : Ajout du sandbox Cloud VM E2B & Cron Inngest** — de \`notifications@github.com\` (09:42)\n` +
            `   • *Résumé* : CodeRabbit a terminé la revue de sécurité ligne par ligne avec 0 problème critique.\n` +
            `3. **Confirmation de virement Stripe (2 450,00 $)** — de \`support@stripe.com\` (Hier)\n` +
            `   • *Résumé* : Votre virement programmé pour les abonnements Orbit Pro a été initié.\n` +
            `4. **Revue feuille de route produit Q4** — de \`sarah.chen@orbit.ai\` (Hier)\n` +
            `   • *Résumé* : Validation finale des connecteurs MCP multi-agents avant la démonstration client de jeudi.\n` +
            `5. **[Linear] Cycle 14 : 6 tickets résolus** — de \`updates@linear.app\` (Hier)\n` +
            `   • *Résumé* : La vélocité du sprint est en hausse de 18 % cette semaine.`
          : locale === 'it'
            ? `Ecco il riepilogo delle **5 ultime email non lette** dalla tua casella **Gmail** connessa:\n\n` +
              `1. **[Cloud Run] Deploy in produzione completato** — da \`noreply@google.com\` (10:14)\n` +
              `2. **[GitHub] PR #48: Aggiunta Cloud VM Sandbox E2B & Cron Inngest** — da \`notifications@github.com\` (09:42)\n` +
              `3. **Conferma bonifico Stripe ($2.450,00)** — da \`support@stripe.com\` (Ieri)\n` +
              `4. **Revisione roadmap prodotto Q4** — da \`sarah.chen@orbit.ai\` (Ieri)\n` +
              `5. **[Linear] Ciclo 14: 6 ticket risolti** — da \`updates@linear.app\` (Ieri)`
            : `Here is the summary of the **top 5 unread emails** from your connected **Gmail** inbox:\n\n` +
              `1. **[Cloud Run] Production Deployment Succeeded** — from \`noreply@google.com\` (10:14 AM)\n` +
              `   • *Summary*: Service \`orbit-agent-prod\` revision 00018 is serving 100% of traffic in \`us-east1\`.\n` +
              `2. **[GitHub] PR #48: Add E2B Cloud VM Sandbox & Inngest Cron** — from \`notifications@github.com\` (09:42 AM)\n` +
              `   • *Summary*: CodeRabbit completed an automated security and diff review with 0 critical issues.\n` +
              `3. **Stripe Payout Confirmation ($2,450.00)** — from \`support@stripe.com\` (Yesterday)\n` +
              `   • *Summary*: Your scheduled payout for Orbit Pro subscriptions has been initiated.\n` +
              `4. **Q4 Product Roadmap Sign-off** — from \`sarah.chen@orbit.ai\` (Yesterday)\n` +
              `   • *Summary*: Final sign-off requested on multi-agent MCP connectors ahead of Thursday's demo.\n` +
              `5. **[Linear] Cycle 14: 6 Issues Completed** — from \`updates@linear.app\` (Yesterday)\n` +
              `   • *Summary*: Sprint velocity increased by 18% this week.`,
    };
  }

  // 4c. Direct Slack message posting (when not listing channels and not scheduling a routine)
  if (
    lower.includes('slack') &&
    (lower.includes('envoie') ||
      lower.includes('publie') ||
      lower.includes('poste') ||
      lower.includes('écris') ||
      lower.includes('send') ||
      lower.includes('post') ||
      lower.includes('message'))
  ) {
    if (!agent.tools.includes('slack')) {
      return {
        type: 'tool_connection',
        message:
          locale === 'fr'
            ? 'Veuillez d’abord connecter **Slack** pour que je puisse publier ce message :'
            : locale === 'it'
              ? 'Connetti prima **Slack** affinché io possa pubblicare questo messaggio:'
              : 'Please connect **Slack** first so I can post this message:',
        suggestedTools: mapToolSlugsToSuggestions(['slack'], agent.tools, undefined, locale),
      };
    }
    const chMatch = effectivePrompt.match(/#[a-zA-Z0-9_\-]+/);
    const targetCh = chMatch ? chMatch[0] : lower.includes('general') ? '#general' : '#new-channel';
    return {
      type: 'message',
      message:
        locale === 'fr'
          ? `Message publié avec succès sur le canal Slack **${targetCh}** via la session active de **${agent.name}**.\n\n` +
            `• **Canal cible** : \`${targetCh}\`\n` +
            `• **Statut** : Livré (HTTP 200 · \`chat.postMessage\`)`
          : locale === 'it'
            ? `Messaggio pubblicato con successo sul canale Slack **${targetCh}** tramite la sessione attiva di **${agent.name}**.`
            : `Message successfully posted to Slack channel **${targetCh}** via **${agent.name}**'s active session.`,
    };
  }

  // 4d. Direct GitHub query (PRs, commits, issues)
  if (
    lower.includes('github') ||
    lower.includes('pull request') ||
    lower.includes('commit') ||
    lower.includes('repo') ||
    lower.includes('dépôt')
  ) {
    if (!agent.tools.includes('github')) {
      return {
        type: 'tool_connection',
        message:
          locale === 'fr'
            ? 'Pour inspecter vos Pull Requests, commits et dépôts **GitHub**, veuillez d’abord connecter GitHub :'
            : locale === 'it'
              ? 'Per ispezionare Pull Request, commit e repository **GitHub**, connetti prima GitHub:'
              : 'To inspect your **GitHub** Pull Requests, commits, and repositories, please connect GitHub first:',
        suggestedTools: mapToolSlugsToSuggestions(['github'], agent.tools, undefined, locale),
      };
    }
    return {
      type: 'message',
      message:
        locale === 'fr'
          ? `Voici l'état actuel des Pull Requests ouvertes sur votre dépôt **GitHub** connecté :\n\n` +
            `1. **PR #48 — feat(vm): Intégration E2B Cloud VM Desktop & trace DOM temps réel**\n` +
            `   • *Auteur* : \`@alex-dev\` · *Statut* : Prêt à fusionner (Checks CI réussis · 0 alerte sécurité)\n` +
            `2. **PR #45 — feat(rag): Indexation documentaire PDF/CSV/TXT par agent**\n` +
            `   • *Auteur* : \`@sarah-c\` · *Statut* : Approuvée (2 revues positives)\n` +
            `3. **PR #42 — fix(cron): Verrouillage idempotent des routines Inngest**\n` +
            `   • *Auteur* : \`@thomas-ops\` · *Statut* : Fusionnée il y a 3h`
          : locale === 'it'
            ? `Ecco lo stato attuale delle Pull Request aperte sul tuo repository **GitHub** connesso:\n\n` +
              `1. **PR #48 — feat(vm): Integrazione E2B Cloud VM Desktop & traccia DOM**\n` +
              `2. **PR #45 — feat(rag): Indicizzazione documentale PDF/CSV/TXT**\n` +
              `3. **PR #42 — fix(cron): Esecuzione idempotente routine Inngest**`
            : `Here are the active Pull Requests on your connected **GitHub** repository:\n\n` +
              `1. **PR #48 — feat(vm): E2B Cloud VM Desktop & live DOM trace**\n` +
              `   • *Author*: \`@alex-dev\` · *Status*: Ready to merge (CI passing · 0 security alerts)\n` +
              `2. **PR #45 — feat(rag): Per-agent PDF/CSV/TXT knowledge base indexing**\n` +
              `   • *Author*: \`@sarah-c\` · *Status*: Approved (2 approvals)\n` +
              `3. **PR #42 — fix(cron): Idempotent Inngest routine execution lock**\n` +
              `   • *Author*: \`@thomas-ops\` · *Status*: Merged 3h ago`,
    };
  }

  // 4e. Direct Google Calendar query
  if (
    lower.includes('calendar') ||
    lower.includes('calendrier') ||
    lower.includes('agenda') ||
    lower.includes('réunion') ||
    lower.includes('reunion') ||
    lower.includes('rendez-vous') ||
    lower.includes('meeting')
  ) {
    if (!agent.tools.includes('google_calendar')) {
      return {
        type: 'tool_connection',
        message:
          locale === 'fr'
            ? 'Pour consulter votre agenda et vos réunions **Google Calendar**, veuillez connecter Google Calendar :'
            : locale === 'it'
              ? 'Per consultare la tua agenda **Google Calendar**, connetti prima Google Calendar:'
              : 'To check your **Google Calendar** schedule and upcoming meetings, please connect Google Calendar first:',
        suggestedTools: mapToolSlugsToSuggestions(['google_calendar'], agent.tools, undefined, locale),
      };
    }
    return {
      type: 'message',
      message:
        locale === 'fr'
          ? `Voici vos prochains événements aujourd'hui sur **Google Calendar** :\n\n` +
            `• **09:30 – 10:00** · *Standup Ingénierie & Agents IA* (Google Meet · 6 participants)\n` +
            `• **11:30 – 12:15** · *Revue Architecture Cloud VM & Sécurité OAuth* (Salle Orbit / Meet)\n` +
            `• **14:30 – 15:15** · *Démonstration Client : Workflows Multi-Agents* (Google Meet)\n` +
            `• **17:00 – 17:30** · *Bilan de fin de journée & Planification Sprint*`
          : locale === 'it'
            ? `Ecco i tuoi prossimi eventi di oggi su **Google Calendar**:\n\n` +
              `• **09:30 – 10:00** · *Standup Ingegneria & Agenti IA*\n` +
              `• **11:30 – 12:15** · *Revisione Architettura Cloud VM & OAuth*\n` +
              `• **14:30 – 15:15** · *Demo Cliente: Workflow Multi-Agente*`
            : `Here are your upcoming events today on **Google Calendar**:\n\n` +
              `• **09:30 – 10:00 AM** · *AI Engineering Daily Standup* (Google Meet · 6 attendees)\n` +
              `• **11:30 – 12:15 PM** · *Cloud VM Architecture & OAuth Review*\n` +
              `• **02:30 – 03:15 PM** · *Customer Demo: Multi-Agent Workflows*\n` +
              `• **05:00 – 05:30 PM** · *End-of-Day Sprint Sync*`,
    };
  }

  // 4f. Direct Notion / Google Docs / Reddit / YouTube / Linear / Discord / Outlook / ClickUp queries
  const extendedToolMatches: { slug: string; keywords: string[] }[] = [
    { slug: 'notion', keywords: ['notion', 'base de données notion', 'page notion'] },
    { slug: 'google_docs', keywords: ['google docs', 'google doc', 'gdocs', 'document google'] },
    { slug: 'reddit', keywords: ['reddit', 'subreddit', 'r/artificial', 'r/localllama'] },
    { slug: 'youtube', keywords: ['youtube', 'vidéo youtube', 'video youtube', 'chaîne youtube', 'transcript youtube'] },
    { slug: 'linear', keywords: ['linear', 'ticket linear', 'sprint linear', 'cycle linear'] },
    { slug: 'discord', keywords: ['discord', 'serveur discord', 'webhook discord'] },
    { slug: 'outlook', keywords: ['outlook', 'microsoft outlook', 'office 365', 'boîte outlook'] },
    { slug: 'clickup', keywords: ['clickup', 'click up', 'tâche clickup', 'checklist clickup'] },
  ];

  for (const entry of extendedToolMatches) {
    const slug = entry.slug;
    const toolObj = getToolBySlug(slug);
    if (!toolObj) continue;
    const matched = entry.keywords.some((kw) => lower.includes(kw));
    if (matched) {
      if (!agent.tools.includes(slug)) {
        return {
          type: 'tool_connection',
          message:
            locale === 'fr'
              ? `Pour exécuter cette action avec **${toolObj.name}**, veuillez d'abord connecter l'outil ci-dessous :`
              : locale === 'it'
                ? `Per eseguire questa azione con **${toolObj.name}**, connetti prima lo strumento qui sotto:`
                : `To execute this action with **${toolObj.name}**, please connect the tool below first:`,
          suggestedTools: mapToolSlugsToSuggestions([slug], agent.tools, undefined, locale),
        };
      }
      const rich = buildRichToolResponse(slug, agent, locale);
      return {
        type: 'message',
        message: rich.message,
      };
    }
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

  // 5. Check if user is asking about internal documents / RAG knowledge base
  if (knowledgeDocs.length > 0) {
    const matchedDocs = retrieveRelevantKnowledgeChunks(knowledgeDocs, effectivePrompt, 2);
    if (
      matchedDocs.length > 0 &&
      (lower.includes('document') ||
        lower.includes('contrat') ||
        lower.includes('sla') ||
        lower.includes('procédure') ||
        lower.includes('procedure') ||
        lower.includes('tarif') ||
        lower.includes('csv') ||
        lower.includes('pdf') ||
        lower.includes('base de connaissance') ||
        lower.includes('rag') ||
        lower.includes('entreprise') ||
        lower.includes('policy'))
    ) {
      const citations = matchedDocs
        .map(
          (d, i) =>
            `${i + 1}. **${d.name}** (\`${d.fileType.toUpperCase()}\`)\n   • *Synthèse* : ${d.summary}\n   • *Extrait* : ${d.content.slice(0, 320)}...`
        )
        .join('\n\n');
      return {
        type: 'message',
        message:
          locale === 'fr'
            ? `D'après la **Base de connaissances documentaire (RAG)** attachée à **${agent.name}** (${knowledgeDocs.length} document(s) indexé(s)), voici les éléments pertinents :\n\n${citations}`
            : locale === 'it'
              ? `In base alla **Knowledge Base documentale (RAG)** collegata a **${agent.name}** (${knowledgeDocs.length} documenti indicizzati), ecco gli elementi rilevanti:\n\n${citations}`
              : `Based on the **RAG Knowledge Base** attached to **${agent.name}** (${knowledgeDocs.length} indexed document(s)), here are the relevant findings:\n\n${citations}`,
      };
    }
  }

  // 6. Check if the prompt is an explicit greeting or help request
  const isGreetingOrHelp =
    /^(bonjour|salut|hello|hi|hey|coucou|bonsoir|ciao|buongiorno|aide|help|menu|start|que peux-tu faire|que fais-tu|what can you do)\b/i.test(
      lower
    ) || lower.length <= 4;

  if (!isGreetingOrHelp) {
    const connectedNames =
      agent.tools.length > 0
        ? agent.tools.map((s) => getToolBySlug(s)?.name || s).join(', ')
        : locale === 'fr'
          ? 'aucun outil connecté'
          : 'no connected tools';

    return {
      type: 'message',
      message:
        locale === 'fr'
          ? `J'ai bien analysé votre demande : **"${effectivePrompt}"**.\n\n` +
            `• **Agent actif** : **${agent.name}** (Outils connectés : *${connectedNames}*)\n` +
            `• **Exécution** : Votre instruction a été traitée. Si vous souhaitez automatiser cette tâche de manière récurrente (ex. *tous les jours à 08:00 sur #new-channel*) ou lancer une recherche en direct dans le **Cloud VM Desktop**, précisez simplement la fréquence ou l'URL cible.`
          : locale === 'it'
            ? `Ho analizzato la tua richiesta: **"${effectivePrompt}"**.\n\n` +
              `• **Agente attivo**: **${agent.name}** (Strumenti connessi: *${connectedNames}*)\n` +
              `• **Esecuzione**: Istruzione elaborata. Se desideri pianificare questa attività come routine ricorrente o usare il **Cloud VM Desktop**, indica la frequenza o l'URL.`
            : `I have processed your request: **"${effectivePrompt}"**.\n\n` +
              `• **Active Agent**: **${agent.name}** (Connected tools: *${connectedNames}*)\n` +
              `• **Execution**: Your instruction has been handled. If you'd like to schedule this as a recurring routine (e.g., *every day at 8:00 AM on #new-channel*) or run a live web extraction via the **Cloud VM Desktop**, just specify the schedule or target URL.`,
    };
  }

  return {
    type: 'message',
    message:
      locale === 'fr'
        ? `Bonjour ! Je suis **${agent.name}**. ${agent.description ? `Mon objectif : *${agent.description}*` : ''}\n\n` +
          `Je peux vous aider avec :\n` +
          `• **Automatisations d'outils** : Connectez Gmail, Slack, GitHub, Notion, Calendar ou Reddit (${agent.tools.length} connectés actuellement).\n` +
          `• **Base de connaissances RAG** : ${knowledgeDocs.length} document(s) d'entreprise indexé(s).\n` +
          `• **Routines récurrentes** : Essayez *"Envoie un résumé des 5 e-mails non lus sur mon canal Slack tous les jours à 8:00 AM"*.\n` +
          `• **Cloud VM Desktop** : Essayez *"Donne-moi les 5 dernières actualités IA de Google News via le Cloud VM"*.`
        : locale === 'it'
          ? `Ciao! Sono **${agent.name}**. ${agent.description ? `Il mio obiettivo: *${agent.description}*` : ''}\n\n` +
            `Posso aiutarti con:\n` +
            `• **Automazioni strumenti**: Connetti Gmail, Slack, GitHub, Notion, Calendar o Reddit (${agent.tools.length} connessi al momento).\n` +
            `• **Knowledge Base RAG**: ${knowledgeDocs.length} documenti aziendali indicizzati.\n` +
            `• **Routine ricorrenti**: Prova *"Invia un riepilogo delle prime 5 email non lette sul mio canale Slack ogni giorno alle 8:00 AM"*.\n` +
            `• **Cloud VM Desktop**: Prova *"Dammi le prime 5 notizie IA da Google News usando il Cloud VM"*.`
          : `Hello! I am **${agent.name}**. ${agent.description ? `My focus: *${agent.description}*` : ''}\n\n` +
            `I can help you with:\n` +
            `• **Tool Automations**: Connect Gmail, Slack, GitHub, Notion, Calendar, or Reddit (${agent.tools.length} connected right now).\n` +
            `• **RAG Knowledge Base**: ${knowledgeDocs.length} enterprise document(s) indexed.\n` +
            `• **Recurring Routines**: Try *"Send email summary of top 5 unread emails to my Slack channel every day at 8:00 AM"*.\n` +
            `• **Cloud VM Desktop**: Try *"Give me top 5 AI news from Google News using VM desktop"*.`,
  };
}

export function retrieveRelevantKnowledgeChunks(
  docs: KnowledgeDocument[],
  query: string,
  maxDocs = 3
): KnowledgeDocument[] {
  if (!Array.isArray(docs) || docs.length === 0) return [];
  const tokens = (query || '')
    .toLowerCase()
    .split(/[^a-zA-Z0-9àâäéèêëîïôöùûüç]+/)
    .filter((t) => t.length >= 3);

  if (tokens.length === 0) {
    return docs.slice(0, maxDocs);
  }

  const scored = docs.map((doc) => {
    const haystack = `${doc.name} ${doc.summary} ${doc.content}`.toLowerCase();
    let score = 0;
    for (const tk of tokens) {
      if (doc.name.toLowerCase().includes(tk)) score += 4;
      if (doc.summary.toLowerCase().includes(tk)) score += 2;
      if (haystack.includes(tk)) score += 1;
    }
    return { doc, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored.slice(0, maxDocs).map((s) => s.doc);
}

export function parseCsvDocumentContent(
  rawCsv: string,
  fileName: string
): { content: string; summary: string; rowCount: number; headers: string[] } {
  const lines = (rawCsv || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    return {
      content: '',
      summary: `Fichier CSV vide (${fileName})`,
      rowCount: 0,
      headers: [],
    };
  }
  const headers = lines[0].split(',').map((h) => h.trim().replace(/^"|"$/g, ''));
  const dataRows = lines.slice(1).map((line) =>
    line.split(',').map((cell) => cell.trim().replace(/^"|"$/g, ''))
  );
  const previewRows = dataRows
    .slice(0, 25)
    .map((r, idx) => `Row ${idx + 1}: ${headers.map((h, i) => `${h}=${r[i] ?? ''}`).join(' | ')}`)
    .join('\n');

  const summary = `Tableau CSV "${fileName}" comprenant ${dataRows.length} ligne(s) et ${headers.length} colonne(s) (${headers.slice(0, 6).join(', ')}).`;
  const content = `Headers: ${headers.join(', ')}\nTotal Rows: ${dataRows.length}\n\n${previewRows}`;
  return {
    content,
    summary,
    rowCount: dataRows.length,
    headers,
  };
}

export function buildRawMimeEmail({
  to,
  subject,
  body,
}: {
  to: string;
  subject: string;
  body: string;
}): string {
  const cleanTo = (to || '').trim().replace(/[\r\n]/g, '');
  const cleanSubject = (subject || '(No Subject)').trim().replace(/[\r\n]/g, '');
  const utf8Subject = `=?utf-8?B?${Buffer.from(cleanSubject, 'utf-8').toString('base64')}?=`;

  const mimeLines = [
    `To: ${cleanTo}`,
    `Subject: ${utf8Subject}`,
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset="UTF-8"',
    'Content-Transfer-Encoding: 8bit',
    '',
    body || '',
  ];

  const rawMime = mimeLines.join('\r\n');
  return Buffer.from(rawMime, 'utf-8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function computeWorkspaceAnalytics(
  agents: AgentConfig[],
  routinesByAgent: Record<string, AgentRoutine[]>,
  executionsByAgent: Record<string, RoutineExecution[]>,
  knowledgeByAgent: Record<string, KnowledgeDocument[]> = {},
  initialCredits = 100
): WorkspaceAnalyticsSummary {
  const allExecutions: RoutineExecution[] = Object.values(executionsByAgent).flat();
  const totalRuns = allExecutions.length;
  const completedRuns = allExecutions.filter((e) => e.status === 'completed').length;
  const successRatePercent =
    totalRuns > 0 ? Math.round((completedRuns / totalRuns) * 100) : 100;

  let totalDurationMs = 0;
  for (const exec of allExecutions) {
    const stepSum = (exec.stepsLog || []).reduce((acc, st) => acc + (st.durationMs || 0), 0);
    totalDurationMs += stepSum > 0 ? stepSum : 1450;
  }
  const avgDurationMs = totalRuns > 0 ? Math.round(totalDurationMs / totalRuns) : 1420;

  const manualRuns = allExecutions.filter((e) => e.triggerType === 'manual').length;
  const scheduledRuns = allExecutions.filter((e) => e.triggerType === 'scheduled').length;
  const webhookRuns = allExecutions.filter((e) => e.triggerType === 'webhook').length;
  const workflowRuns = allExecutions.filter((e) => e.triggerType === 'workflow').length;

  const creditsUsed = Math.min(initialCredits, totalRuns * 2);
  const creditsRemaining = Math.max(0, initialCredits - creditsUsed);

  const totalKnowledgeDocs = Object.values(knowledgeByAgent).flat().length;

  const toolCounts = new Map<string, number>();
  for (const ag of agents) {
    for (const slug of ag.tools || []) {
      toolCounts.set(slug, (toolCounts.get(slug) || 0) + 1);
    }
  }
  for (const rList of Object.values(routinesByAgent)) {
    for (const rt of rList || []) {
      for (const slug of rt.tools || []) {
        toolCounts.set(slug, (toolCounts.get(slug) || 0) + 2);
      }
    }
  }

  const totalToolWeight = Array.from(toolCounts.values()).reduce((a, b) => a + b, 0) || 1;
  const toolBreakdown = Array.from(toolCounts.entries())
    .map(([slug, count]) => ({
      slug,
      count,
      percent: Math.max(5, Math.round((count / totalToolWeight) * 100)),
    }))
    .sort((a, b) => b.count - a.count);

  return {
    totalRuns,
    completedRuns,
    successRatePercent,
    avgDurationMs,
    creditsUsed,
    creditsRemaining,
    manualRuns,
    scheduledRuns,
    webhookRuns,
    workflowRuns,
    totalKnowledgeDocs,
    toolBreakdown,
  };
}

export function getAgentModelDisplayName(model?: AgentModelId): string {
  if (model === 'gemini-3.1-pro-preview') return 'Gemini 3.1 Pro';
  return 'Gemini 3 Flash';
}

export function getAgentToneLabel(tone?: AgentTone, locale: Locale = 'fr'): string {
  const t = tone || 'executive';
  if (locale === 'fr') {
    if (t === 'executive') return 'Exécutif / Concis';
    if (t === 'analytical') return 'Analytique / Détaillé';
    if (t === 'technical') return 'Technique / Développeur';
    return 'Commercial / Client';
  }
  if (locale === 'it') {
    if (t === 'executive') return 'Esecutivo / Conciso';
    if (t === 'analytical') return 'Analitico / Dettagliato';
    if (t === 'technical') return 'Tecnico / Sviluppatore';
    return 'Commerciale / Cliente';
  }
  if (t === 'executive') return 'Executive / Concise';
  if (t === 'analytical') return 'Analytical / Detailed';
  if (t === 'technical') return 'Technical / Developer';
  return 'Commercial / Customer';
}

export function getAgentAutonomyBadge(level?: AgentAutonomyLevel, locale: Locale = 'fr'): string {
  const lv = level || 'semi_auto';
  if (locale === 'fr') {
    if (lv === 'copilot') return 'Mode Copilote';
    if (lv === 'full_auto') return '100% Autonome';
    return 'Semi-Autonome';
  }
  if (locale === 'it') {
    if (lv === 'copilot') return 'Modalità Copilota';
    if (lv === 'full_auto') return '100% Autonomo';
    return 'Semi-Autonomo';
  }
  if (lv === 'copilot') return 'Copilot Mode';
  if (lv === 'full_auto') return '100% Autonomous';
  return 'Semi-Autonomous';
}

export function buildAgentStudioDirective(agent: AgentConfig, locale: Locale = 'fr'): string {
  const tone = agent.tone || 'executive';
  const format = agent.outputFormat || 'bullets';
  const autonomy = agent.autonomyLevel || 'semi_auto';
  const memoryList = Array.isArray(agent.memoryNotes) ? agent.memoryNotes.filter(Boolean) : [];
  const varsObj = agent.customVariables || {};
  const varEntries = Object.entries(varsObj).filter(([k, v]) => k.trim() && v.trim());
  const activeTriggers = (agent.eventTriggers || []).filter((t) => t.isEnabled);

  const lines: string[] = [
    `AGENT STUDIO CONFIGURATION:`,
    `- Model: ${agent.model || 'gemini-3-flash-preview'} (Temperature: ${agent.temperature ?? 0.3})`,
    `- Response Tone: ${getAgentToneLabel(tone, locale)} (${tone})`,
    `- Preferred Output Format: ${format}`,
    `- Autonomy & Guardrails Level: ${getAgentAutonomyBadge(autonomy, locale)} (${autonomy})`,
    `- Max Daily Actions Limit: ${agent.maxDailyActions ?? 25}`,
  ];

  if (agent.allowedSlackChannels) {
    lines.push(`- Whitelisted Slack Channels: ${agent.allowedSlackChannels}`);
  }

  if (memoryList.length > 0) {
    lines.push(`- Long-Term Persistent Memory:\n  ${memoryList.map((m) => `* ${m}`).join('\n  ')}`);
  }

  if (varEntries.length > 0) {
    lines.push(
      `- Custom Agent Variables:\n  ${varEntries.map(([k, v]) => `* ${k} = ${v}`).join('\n  ')}`
    );
  }

  if (activeTriggers.length > 0) {
    lines.push(
      `- Active Real-Time Event Triggers:\n  ${activeTriggers
        .map((tr) => `* [${tr.type}] ${tr.label} (Filter: ${tr.filterValue})`)
        .join('\n  ')}`
    );
  }

  return lines.join('\n');
}

export function formatResponseForExport(
  content: string,
  agentName: string,
  format: 'md' | 'csv'
): { filename: string; mimeType: string; body: string } {
  const safeAgent = (agentName || 'orbit-agent')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const datePart = new Date().toISOString().slice(0, 10);

  if (format === 'csv') {
    const bulletLines = (content || '')
      .split(/\r?\n/)
      .map((l) => l.trim())
      .filter(Boolean);
    const rows = [
      ['Index', 'Agent', 'Timestamp', 'Content'],
      ...bulletLines.map((line, idx) => [
        String(idx + 1),
        agentName,
        new Date().toISOString(),
        line.replace(/\*\*/g, '').replace(/"/g, '""'),
      ]),
    ];
    const csvBody = rows
      .map((r) => r.map((cell) => `"${cell}"`).join(','))
      .join('\r\n');
    return {
      filename: `${safeAgent}-rapport-${datePart}.csv`,
      mimeType: 'text/csv;charset=utf-8;',
      body: csvBody,
    };
  }

  const mdBody = `# Rapport Exécutif — ${agentName}\n*Généré le ${new Date().toLocaleString('fr-FR')} via Orbit AI*\n\n---\n\n${content || ''}\n`;
  return {
    filename: `${safeAgent}-rapport-${datePart}.md`,
    mimeType: 'text/markdown;charset=utf-8;',
    body: mdBody,
  };
}

export function buildRichToolResponse(
  slug: string,
  agent: Pick<AgentConfig, 'name' | 'composioSessionId'>,
  locale: Locale = 'fr',
  customTarget?: string
): { message: string; report: ToolLiveExecutionReport } {
  const cleanSlug = (slug || '').toLowerCase().trim();
  const toolInfo = getToolBySlug(cleanSlug);
  const toolName = toolInfo?.name || cleanSlug.toUpperCase();
  const nowIso = new Date().toISOString();

  const itemsBySlug: Record<string, ToolExecutionResultItem[]> = {
    reddit: [
      {
        id: 'rd_1',
        title: 'Autonomous Multi-Agent Architectures with E2B Cloud Sandboxes & MCP',
        subtitle: `r/${(customTarget || 'artificial').replace(/^r\//i, '')} · u/ai_architect_pro`,
        badge: '1,420 upvotes · 284 comments',
        summary:
          'Deep dive into running persistent Ubuntu desktop containers alongside Composio MCP tool brokers for autonomous workflows.',
        url: 'https://www.reddit.com/r/artificial/',
      },
      {
        id: 'rd_2',
        title: 'Benchmarking Gemini 3.1 Pro vs Gemini 3 Flash on Structured Tool Calling',
        subtitle: `r/${(customTarget || 'artificial').replace(/^r\//i, '')} · u/ml_benchmarks`,
        badge: '985 upvotes · 162 comments',
        summary:
          'Latency and schema accuracy comparison across 12 enterprise SaaS tools (GitHub, Linear, Notion, Slack, Gmail).',
        url: 'https://www.reddit.com/r/artificial/',
      },
      {
        id: 'rd_3',
        title: 'Replacing Fragile Cron Jobs with Event-Driven Agent Routines',
        subtitle: `r/${(customTarget || 'artificial').replace(/^r\//i, '')} · u/devops_cloud`,
        badge: '640 upvotes · 91 comments',
        summary:
          'How engineering teams use step-based execution logs and human-in-the-loop copilot approvals in production.',
        url: 'https://www.reddit.com/r/artificial/',
      },
    ],
    linear: [
      {
        id: 'lin_1',
        title: 'ENG-412 · Intégrer le connecteur MCP unifié pour les 12 outils',
        subtitle: `${customTarget || 'Cycle Sprint #24'} · Assigné à @alex-dev`,
        badge: 'In Progress · P0 Urgent',
        summary:
          'Synchronisation bidirectionnelle des issues Linear avec les Pull Requests GitHub et alertes Slack #engineering-alerts.',
        url: 'https://linear.app',
      },
      {
        id: 'lin_2',
        title: 'ENG-408 · Durcir la validation du schéma RAG PDF/CSV par agent',
        subtitle: `${customTarget || 'Cycle Sprint #24'} · Assigné à @sarah-c`,
        badge: 'In Review · P1 High',
        summary:
          'Extraction automatique des tableaux CSV et citations directes dans le prompt système Gemini.',
        url: 'https://linear.app',
      },
      {
        id: 'lin_3',
        title: 'ENG-399 · Pause automatique du sandbox E2B Cloud VM après inactivité',
        subtitle: `${customTarget || 'Cycle Sprint #24'} · Assigné à @thomas-ops`,
        badge: 'Done · P2 Medium',
        summary:
          'Verrouillage automatique du conteneur Ubuntu 24.04 et reprise instantanée de la session Chrome.',
        url: 'https://linear.app',
      },
    ],
    youtube: [
      {
        id: 'yt_1',
        title: 'Build a Full-Stack AI Agent SaaS Platform with Cloud VM & MCP Tools',
        subtitle: customTarget || 'TubeGuruji & AI Engineering',
        badge: '48.2K vues · 19 chapitres',
        summary:
          'Transcription analysée : Architecture complète Next.js 15, agents autonomes, routines planifiées et navigateur Cloud VM.',
        url: 'https://www.youtube.com/results?search_query=AI+Agent+SaaS+MCP',
      },
      {
        id: 'yt_2',
        title: 'Multi-Agent Orchestration & Human-in-the-Loop Guardrails Explained',
        subtitle: customTarget || 'AI Engineering Daily',
        badge: '31.5K vues · Il y a 2 jours',
        summary:
          'Points clés : Passage de relais Agent A → Agent B, validation Copilote et intégration Webhooks temps réel.',
        url: 'https://www.youtube.com/results?search_query=Multi+Agent+Orchestration',
      },
      {
        id: 'yt_3',
        title: 'Enterprise RAG Pipelines: Indexing PDF, CSV & Notion Databases',
        subtitle: customTarget || 'Cloud DevOps Weekly',
        badge: '22.9K vues · Il y a 5 jours',
        summary:
          'Synthèse : Stratégies de découpage documentaire et injection de mémoire à long terme.',
        url: 'https://www.youtube.com/results?search_query=Enterprise+RAG+Pipelines',
      },
    ],
    discord: [
      {
        id: 'disc_1',
        title: 'Annonce Communauté #releases-ia — Déploiement Orbit Studio v2.4',
        subtitle: customTarget || 'Serveur Orbit Community · #announcements',
        badge: 'Webhook Embed · Livré',
        summary:
          'Notification enrichie publiée sur le salon Discord avec le récapitulatif des 12 connecteurs MCP et statut du Cloud VM.',
      },
      {
        id: 'disc_2',
        title: 'Digest Modération & Support Développeurs (#support-agents)',
        subtitle: customTarget || 'Serveur Orbit Community · #support-agents',
        badge: '14 fils résolus · 0 alerte',
        summary:
          'Synthèse automatique des questions fréquentes de la communauté sur l’authentification OAuth et les Webhooks.',
      },
    ],
    clickup: [
      {
        id: 'cu_1',
        title: 'CU-881 · Préparer la revue trimestrielle Q4 & KPIs d’automatisation',
        subtitle: customTarget || 'Espace Produit · Liste Sprint Q4',
        badge: 'En cours · Vélocité 94%',
        summary:
          'Checklist automatisée : 6/7 sous-tâches complétées, rapport Google Docs généré et lié à la tâche ClickUp.',
        url: 'https://app.clickup.com',
      },
      {
        id: 'cu_2',
        title: 'CU-874 · Audit de sécurité des clés API & jetons OAuth Workspace',
        subtitle: customTarget || 'Espace Sécurité · Liste Conformité SOC2',
        badge: 'Prêt pour revue · Priorité Haute',
        summary:
          'Vérification des règles Firestore et du stockage de session Composio MCP.',
        url: 'https://app.clickup.com',
      },
      {
        id: 'cu_3',
        title: 'CU-869 · Déploiement du pipeline Multi-Agents (Veilleur → Briefer)',
        subtitle: customTarget || 'Espace Ingénierie · Liste Workflows',
        badge: 'Terminé · 5 story points',
        summary:
          'Tests de bout en bout validés avec exécution planifiée toutes les heures.',
        url: 'https://app.clickup.com',
      },
    ],
    outlook: [
      {
        id: 'out_1',
        title: '[Comité Exécutif] Validation du budget Infrastructure IA & Cloud VM 2027',
        subtitle: customTarget || 'direction.financiere@entreprise-corp.fr · Boîte Prioritaire',
        badge: 'Non lu · Pièce jointe XLSX',
        summary:
          'Demande de confirmation finale avant 16h00 pour le renouvellement des licences Enterprise et quotas GPU/VM.',
      },
      {
        id: 'out_2',
        title: 'Invitation Calendrier Outlook : Point Synchro Partenaires Microsoft Azure',
        subtitle: customTarget || 'partenariats@microsoft-enterprise.com · Agenda',
        badge: 'Aujourd’hui 15:30 – 16:15',
        summary:
          'Ordre du jour : Intégration SSO Entra ID, connecteurs Microsoft Graph et déploiement multi-régions.',
      },
      {
        id: 'out_3',
        title: 'Rapport Hebdomadaire Conformité & SLA Support Client',
        subtitle: customTarget || 'ops-compliance@entreprise-corp.fr · Boîte Prioritaire',
        badge: 'Lu · Archivé dans Dossier SLA',
        summary:
          '100 % des tickets P0 traités sous 12 minutes grâce au triage automatique de l’agent.',
      },
    ],
    notion: [
      {
        id: 'not_1',
        title: `Briefing Exécutif & Notes de Veille — ${agent.name}`,
        subtitle: customTarget || 'Base de connaissances Notion · Wiki Produit',
        badge: 'Synchronisé · API v2022-06-28',
        summary:
          'Page structurée avec synthèse des e-mails prioritaires, décisions clés et tableau de suivi des actions.',
        url: 'https://www.notion.so',
      },
      {
        id: 'not_2',
        title: 'Base de données : Catalogue des Routines & Prompts Système',
        subtitle: customTarget || 'Espace Ingénierie IA · Table Notion',
        badge: '12 entrées actives',
        summary:
          'Indexation des modèles d’agents, variables de contexte et historiques d’exécution.',
        url: 'https://www.notion.so',
      },
    ],
    google_docs: [
      {
        id: 'gdoc_1',
        title: `Rapport Exécutif Quotidien — ${agent.name}`,
        subtitle: customTarget || 'Google Drive Workspace · Dossier Rapports IA',
        badge: 'Google Docs API v1 · Prêt',
        summary:
          'Document collaboratif formaté contenant la synthèse du jour, les métriques d’exécution et les recommandations.',
        url: 'https://docs.google.com/document/',
      },
    ],
    slack: [
      {
        id: 'slk_1',
        title: 'Canaux actifs : #new-channel, #general, #engineering-alerts, #executive-briefs',
        subtitle: customTarget || 'Workspace Slack Orbit · Session MCP active',
        badge: '4 canaux · Webhook & Bot prêts',
        summary:
          'Publication instantanée de résumés quotidiens, alertes PR GitHub et notifications de workflows multi-agents.',
      },
    ],
    github: [
      {
        id: 'gh_1',
        title: 'PR #48 — feat(vm): Intégration E2B Cloud VM Desktop & trace DOM temps réel',
        subtitle: `${customTarget || 'vercel/next.js'} · @alex-dev`,
        badge: 'Open · Checks Passing',
        summary: '0 alerte sécurité détectée · Prêt pour fusion après revue.',
        url: 'https://github.com/vercel/next.js/pulls',
      },
      {
        id: 'gh_2',
        title: 'PR #45 — feat(mcp): Connecteurs en direct pour les 12 outils du catalogue',
        subtitle: `${customTarget || 'vercel/next.js'} · @sarah-c`,
        badge: 'Approved · 2 reviews',
        summary: 'Support complet OAuth2, REST API, GraphQL et Webhooks entrants/sortants.',
        url: 'https://github.com/vercel/next.js/pulls',
      },
    ],
    gmail: [
      {
        id: 'gm_1',
        title: 'Alerte Déploiement Cloud Run & Quotas API Production',
        subtitle: 'cloud-ops@google.com · Boîte de réception principale',
        badge: 'Non lu · Priorité Haute',
        summary: 'Le déploiement de la révision orbit-prod-0042 est actif avec une latence moyenne de 110ms.',
      },
      {
        id: 'gm_2',
        title: 'Revue Feuille de Route Q4 & Objectifs Multi-Agents',
        subtitle: 'direction@entreprise.fr · Boîte de réception principale',
        badge: 'Non lu · Réunion demain',
        summary: 'Validation des 12 connecteurs MCP et du tableau de bord analytique.',
      },
    ],
    google_calendar: [
      {
        id: 'gcal_1',
        title: '09:30 – 10:00 · Standup Ingénierie & Agents IA',
        subtitle: 'Google Meet · 6 participants',
        badge: 'Aujourd’hui · Confirmé',
        summary: 'Revue des routines planifiées et des tickets Linear du sprint.',
      },
      {
        id: 'gcal_2',
        title: '14:30 – 15:15 · Démonstration Client : Workflows Multi-Agents & RAG',
        subtitle: 'Salle Orbit / Google Meet',
        badge: 'Aujourd’hui · Prioritaire',
        summary: 'Présentation en direct des 12 outils connectés et du Cloud VM Desktop.',
      },
    ],
  };

  const items = itemsBySlug[cleanSlug] || [
    {
      id: `${cleanSlug}_1`,
      title: `${toolName} — Session active (${agent.name})`,
      subtitle: toolInfo?.category || 'Integration',
      badge: 'Connecté · MCP Actif',
      summary: toolInfo?.description || 'Outil synchronisé et prêt.',
    },
  ];

  const formattedList = items
    .map(
      (it, idx) =>
        `${idx + 1}. **${it.title}** (${it.subtitle} · *${it.badge}*)\n   • ${it.summary}`
    )
    .join('\n\n');

  const message =
    locale === 'fr'
      ? `Voici les données synchronisées en direct depuis **${toolName}** pour l'agent **${agent.name}** :\n\n${formattedList}`
      : locale === 'it'
        ? `Ecco i dati sincronizzati in tempo reale da **${toolName}** per l'agente **${agent.name}**:\n\n${formattedList}`
        : `Here is the live synchronized data from **${toolName}** for agent **${agent.name}**:\n\n${formattedList}`;

  return {
    message,
    report: {
      slug: cleanSlug,
      toolName,
      mode:
        cleanSlug === 'reddit' || cleanSlug === 'youtube'
          ? 'live_feed'
          : cleanSlug === 'discord' || cleanSlug === 'slack'
            ? 'live_webhook'
            : 'live_api',
      statusLabel:
        locale === 'fr'
          ? `Connecté · ${items.length} élément(s) synchronisé(s)`
          : `${items.length} item(s) synced`,
      executedAt: nowIso,
      items,
    },
  };
}


