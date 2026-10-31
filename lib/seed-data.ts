import {
  AgentChatMessage,
  AgentConfig,
  AgentRoutine,
  KnowledgeDocument,
  RoutineExecution,
} from './types';
import { buildDiceBearAvatarUrl, computeNextRunAt, createDefaultEventTriggers } from './orbit-logic';

const SEED_BASE_MS = Date.parse('2026-10-30T20:00:00.000Z');

export const DEMO_AGENTS: AgentConfig[] = [
  {
    agentId: 'agent_mickey_daily',
    ownerId: 'demo_user_orbit',
    name: 'Mickey — Daily Briefer',
    description:
      'Summarizes top 5 unread Gmail messages every morning, posts executive digests to #new-channel on Slack, and runs Google News research via the E2B Cloud VM Desktop.',
    agentImage: buildDiceBearAvatarUrl('mickey-orbit-v1'),
    tools: ['gmail', 'slack', 'google_calendar'],
    composioSessionId: 'sess_comp_mickey_8841',
    sandboxId: 'sbx_e2b_mickey_902a',
    vmStatus: 'active',
    vmLastActive: new Date(SEED_BASE_MS).toISOString(),
    isActive: true,
    handoffTargetAgentId: 'agent_youtube_scout',
    model: 'gemini-3-flash-preview',
    temperature: 0.2,
    tone: 'executive',
    outputFormat: 'bullets',
    responseLanguage: 'auto',
    autonomyLevel: 'copilot',
    maxDailyActions: 25,
    allowedSlackChannels: '#new-channel, #general, #leadership',
    memoryNotes: [
      'Signature e-mail : Cordialement, Direction Générale Orbit',
      'Prioriser les e-mails contenant : Facture, Contrat, Urgent, Production',
      'Format de briefing préféré : 3 points clés + Actions prioritaires',
    ],
    customVariables: {
      CANAL_SLACK_DEFAUT: '#new-channel',
      HEURE_BRIEFING: '08:00',
      EQUIPE_CIBLE: 'Direction & Engineering',
    },
    eventTriggers: createDefaultEventTriggers(),
    vmTimeoutMinutes: 5,
    vmRegion: 'eu-west-1',
    vmStartupScript: 'google-chrome --headless=new https://news.google.com/search?q=Intelligence+Artificielle&hl=fr',
    createdAt: new Date(SEED_BASE_MS - 2 * 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(SEED_BASE_MS).toISOString(),
  },
  {
    agentId: 'agent_code_reviewer',
    ownerId: 'demo_user_orbit',
    name: 'AI PR Reviewer Pro',
    description:
      'Monitors GitHub pull requests, runs security scans and line-by-line diff explanations, and posts review change tags to Slack #engineering-alerts.',
    agentImage: buildDiceBearAvatarUrl('reviewer-pro-v2'),
    tools: ['github', 'slack', 'linear'],
    composioSessionId: 'sess_comp_reviewer_4410',
    sandboxId: 'sbx_e2b_reviewer_311c',
    vmStatus: 'paused',
    vmLastActive: new Date(SEED_BASE_MS - 15 * 60 * 1000).toISOString(),
    isActive: true,
    handoffTargetAgentId: 'agent_mickey_daily',
    model: 'gemini-3.1-pro-preview',
    temperature: 0.1,
    tone: 'technical',
    outputFormat: 'markdown_report',
    responseLanguage: 'auto',
    autonomyLevel: 'copilot',
    maxDailyActions: 50,
    allowedSlackChannels: '#engineering-alerts, #security',
    memoryNotes: [
      'Dépôt principal : vercel/next.js',
      'Bloquer toute PR exposant des clés API ou modifiant firestore.rules sans test',
    ],
    customVariables: {
      REPO_GITHUB: 'vercel/next.js',
      CANAL_SLACK_DEFAUT: '#engineering-alerts',
    },
    eventTriggers: createDefaultEventTriggers(),
    vmTimeoutMinutes: 2,
    vmRegion: 'us-east-1',
    vmStartupScript: 'gh pr list --limit 10',
    createdAt: new Date(SEED_BASE_MS - 24 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(SEED_BASE_MS - 60 * 60 * 1000).toISOString(),
  },
  {
    agentId: 'agent_youtube_scout',
    ownerId: 'demo_user_orbit',
    name: 'YouTube & Reddit Scout',
    description:
      'Tracks trending AI engineering topics across Reddit and YouTube, compiles structured research briefs into Notion and Google Docs.',
    agentImage: buildDiceBearAvatarUrl('youtube-scout-v3'),
    tools: ['reddit', 'youtube', 'notion', 'google_docs'],
    composioSessionId: 'sess_comp_scout_7129',
    sandboxId: 'sbx_e2b_scout_778f',
    vmStatus: 'inactive',
    vmLastActive: '',
    isActive: true,
    handoffTargetAgentId: 'agent_mickey_daily',
    model: 'gemini-3.1-pro-preview',
    temperature: 0.4,
    tone: 'analytical',
    outputFormat: 'markdown_report',
    responseLanguage: 'auto',
    autonomyLevel: 'full_auto',
    maxDailyActions: 30,
    allowedSlackChannels: '#new-channel',
    memoryNotes: [
      'Subreddits suivis : r/LocalLLaMA, r/MachineLearning, r/SaaS',
      'Compiler les synthèses hebdomadaires dans Notion et Google Docs',
    ],
    customVariables: {
      SUBREDDITS: 'r/LocalLLaMA, r/MachineLearning',
      FORMAT_EXPORT: 'Google Docs + Notion',
    },
    eventTriggers: createDefaultEventTriggers(),
    vmTimeoutMinutes: 15,
    vmRegion: 'eu-west-1',
    vmStartupScript: 'google-chrome https://www.reddit.com/r/LocalLLaMA',
    createdAt: new Date(SEED_BASE_MS - 12 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(SEED_BASE_MS - 2 * 60 * 60 * 1000).toISOString(),
  },
];

export const DEMO_ROUTINES: Record<string, AgentRoutine[]> = {
  agent_mickey_daily: [
    {
      routineId: 'routine_unread_gmail_slack',
      agentId: 'agent_mickey_daily',
      ownerId: 'demo_user_orbit',
      name: 'Daily Unread Email Summary to Slack',
      goal: 'Summarize top 5 unread Gmail emails and post digest to #new-channel every morning.',
      instructions:
        'Fetch top 5 unread emails from connected Gmail account, extract sender, subject, and key action items, and post a structured summary to #new-channel on Slack.',
      frequency: 'daily',
      time: '08:00',
      timezone: 'America/Los_Angeles',
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
      tools: ['gmail', 'slack'],
      targetChannel: '#new-channel',
      isActive: true,
      nextRunAt: computeNextRunAt('daily', '08:00'),
      lastRunAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    },
    {
      routineId: 'routine_google_news_vm',
      agentId: 'agent_mickey_daily',
      ownerId: 'demo_user_orbit',
      name: 'Daily Google News AI Digest via Cloud VM',
      goal: 'Open E2B Cloud VM Chrome browser, scrape top 5 AI news from Google News, and post to #new-channel.',
      instructions:
        'Activate Cloud VM Desktop sandbox, launch Chrome to news.google.com, extract the top 5 latest AI engineering stories, and send digest to #new-channel on Slack.',
      frequency: 'weekdays',
      time: '09:00',
      timezone: 'America/Los_Angeles',
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      tools: ['slack'],
      targetChannel: '#new-channel',
      isActive: true,
      nextRunAt: computeNextRunAt('weekdays', '09:00', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']),
      lastRunAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    },
  ],
  agent_code_reviewer: [
    {
      routineId: 'routine_pr_security_audit',
      agentId: 'agent_code_reviewer',
      ownerId: 'demo_user_orbit',
      name: 'Morning GitHub PR Security & Diff Audit',
      goal: 'Scan open GitHub PRs for leaked keys or schema bugs and post summary to #engineering-alerts.',
      instructions:
        'Inspect all open pull requests on GitHub, verify schema consistency and secret hygiene, and post line-by-line review notes to #engineering-alerts on Slack.',
      frequency: 'weekdays',
      time: '08:30',
      timezone: 'America/Los_Angeles',
      days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
      tools: ['github', 'slack'],
      targetChannel: '#engineering-alerts',
      isActive: true,
      nextRunAt: computeNextRunAt('weekdays', '08:30', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri']),
      lastRunAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      updatedAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    },
  ],
};

export const DEMO_EXECUTIONS: Record<string, RoutineExecution[]> = {
  agent_mickey_daily: [
    {
      executionId: 'exec_mickey_901',
      routineId: 'routine_unread_gmail_slack',
      routineName: 'Daily Unread Email Summary to Slack',
      agentId: 'agent_mickey_daily',
      ownerId: 'demo_user_orbit',
      status: 'completed',
      triggerType: 'scheduled',
      summary:
        'Posted top 5 unread Gmail email summary to Slack channel #new-channel (1. Cloud Run Deployment Succeeded, 2. Q4 Product Roadmap Review, 3. Stripe Payout Confirmation, 4. GitHub PR #48 Review, 5. Weekly Analytics Digest).',
      stepsLog: [
        {
          stepKey: 'load-validate-routine',
          label: '01. Load & Validate Routine Schedule',
          status: 'completed',
          detail: 'Loaded routine "Daily Unread Email Summary to Slack" (daily at 8:00 AM America/Los_Angeles).',
          durationMs: 112,
        },
        {
          stepKey: 'mark-execution-running',
          label: '02. Reserve Slot & Mark Execution Running',
          status: 'completed',
          detail: 'Reserved Inngest execution slot and computed next run window.',
          durationMs: 88,
        },
        {
          stepKey: 'verify-tool-connections',
          label: '03. Verify Active Tool & Sandbox Sessions',
          status: 'completed',
          detail: 'Verified active Composio session (sess_comp_mickey_8841) for Gmail and Slack.',
          durationMs: 194,
        },
        {
          stepKey: 'execute-agent-tool-workflow',
          label: '04. Execute Agent Workflow & Tool Calls',
          status: 'completed',
          detail: 'Fetched top 5 unread Gmail messages and posted formatted summary to Slack #new-channel.',
          durationMs: 1340,
        },
        {
          stepKey: 'finalize-execution',
          label: '05. Persist Execution Log & Append Chat Notification',
          status: 'completed',
          detail: 'Recorded completed status, updated nextRunAt, and notified user in agent chat.',
          durationMs: 102,
        },
      ],
      startedAt: new Date(Date.now() - 4 * 60 * 60 * 1000 - 2000).toISOString(),
      completedAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    },
    {
      executionId: 'exec_mickey_902',
      routineId: 'routine_google_news_vm',
      routineName: 'Daily Google News AI Digest via Cloud VM',
      agentId: 'agent_mickey_daily',
      ownerId: 'demo_user_orbit',
      status: 'completed',
      triggerType: 'manual',
      summary:
        'Completed "Daily Google News AI Digest via Cloud VM": Fetched top 5 AI news headlines from Google News on E2B Cloud VM Desktop (sbx_e2b_mickey_902a) and posted digest to #new-channel.',
      stepsLog: [
        {
          stepKey: 'load-validate-routine',
          label: '01. Load & Validate Routine Schedule',
          status: 'completed',
          detail: 'Loaded routine "Daily Google News AI Digest via Cloud VM".',
          durationMs: 105,
        },
        {
          stepKey: 'mark-execution-running',
          label: '02. Reserve Slot & Mark Execution Running',
          status: 'completed',
          detail: 'Marked manual quick-run execution as running.',
          durationMs: 92,
        },
        {
          stepKey: 'verify-tool-connections',
          label: '03. Verify Active Tool & Sandbox Sessions',
          status: 'completed',
          detail: 'Verified E2B Cloud VM sandbox sbx_e2b_mickey_902a and Slack connection.',
          durationMs: 225,
        },
        {
          stepKey: 'execute-agent-tool-workflow',
          label: '04. Execute Agent Workflow & Tool Calls',
          status: 'completed',
          detail: 'Opened Chrome on Cloud VM, searched Google News for AI, and posted top 5 headlines to #new-channel.',
          durationMs: 1620,
        },
        {
          stepKey: 'finalize-execution',
          label: '05. Persist Execution Log & Append Chat Notification',
          status: 'completed',
          detail: 'Saved execution log and appended completion message to chat history.',
          durationMs: 110,
        },
      ],
      startedAt: new Date(Date.now() - 3 * 60 * 60 * 1000 - 2200).toISOString(),
      completedAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    },
  ],
};

export const DEMO_MESSAGES: Record<string, AgentChatMessage[]> = {
  agent_mickey_daily: [
    {
      messageId: 'msg_welcome_mickey',
      agentId: 'agent_mickey_daily',
      ownerId: 'demo_user_orbit',
      role: 'agent',
      content:
        'Hello! I am **Mickey — Daily Briefer**. I am connected to **Gmail**, **Slack**, and **Google Calendar**, and my persistent **E2B Cloud VM Desktop** (`sbx_e2b_mickey_902a`) is ready.\n\nHow can I automate your workflow today?',
      responseType: 'message',
      timeLabel: '08:00 AM',
      createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    },
    {
      messageId: 'msg_exec_notif_1',
      agentId: 'agent_mickey_daily',
      ownerId: 'demo_user_orbit',
      role: 'agent',
      content:
        'Routine **Daily Unread Email Summary to Slack** completed: Summarized the top 5 unread Gmail messages and posted the digest to **#new-channel** on Slack.',
      responseType: 'message',
      timeLabel: '08:01 AM',
      createdAt: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
    },
  ],
  agent_code_reviewer: [
    {
      messageId: 'msg_welcome_reviewer',
      agentId: 'agent_code_reviewer',
      ownerId: 'demo_user_orbit',
      role: 'agent',
      content:
        'Hello! I am **AI PR Reviewer Pro**. Provide a GitHub repository or pull request link, or schedule a recurring PR security & diff review routine.',
      responseType: 'message',
      timeLabel: '09:00 AM',
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    },
  ],
  agent_youtube_scout: [
    {
      messageId: 'msg_welcome_scout',
      agentId: 'agent_youtube_scout',
      ownerId: 'demo_user_orbit',
      role: 'agent',
      content:
        'Hello! I am **YouTube & Reddit Scout**. Ask me to monitor trending subreddits, analyze YouTube channels, or compile daily research briefs into Notion or Google Docs.',
      responseType: 'message',
      timeLabel: '09:30 AM',
      createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    },
  ],
};

export const DEMO_KNOWLEDGE_DOCS: Record<string, KnowledgeDocument[]> = {
  agent_mickey_daily: [
    {
      docId: 'doc_sla_enterprise_pdf',
      agentId: 'agent_mickey_daily',
      name: 'Contrat_SLA_Entreprise_Orbit_2026.pdf',
      fileType: 'pdf',
      sizeBytes: 48200,
      summary:
        'Engagement SLA disponibilité 99.95%, temps de réponse P1 < 15 minutes sur Slack #new-channel, et escalade directe vers l’astreinte Cloud Run.',
      content:
        'CONTRAT SLA ENTREPRISE ORBIT 2026\n1. Disponibilité garantie : 99.95% mensuel sur toutes les régions Cloud Run.\n2. Incidents Critiques (P1) : Temps de première réponse inférieur à 15 minutes, notification immédiate sur #new-channel.\n3. Pénalités de retard : Crédit de service de 10% par tranche de 30 minutes d’indisponibilité au-delà du seuil SLA.\n4. Interlocuteur exécutif : Direction Produit & Sécurité.',
      createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    },
    {
      docId: 'doc_pricing_catalog_csv',
      agentId: 'agent_mickey_daily',
      name: 'Catalogue_Tarifs_Clients_Q4.csv',
      fileType: 'csv',
      sizeBytes: 14500,
      summary:
        'Tableau CSV comprenant 3 offres SaaS (Starter 49€/mois, Pro 199€/mois, Enterprise 890€/mois) et quotas d’exécutions.',
      content:
        'Headers: Plan, Prix_Mensuel_EUR, Agents_Inclus, Credits_Mensuels, Support_SLA\nRow 1: Starter | 49 | 3 | 500 | 24h Email\nRow 2: Pro | 199 | 15 | 5000 | 4h Slack\nRow 3: Enterprise | 890 | Illimité | 50000 | 15min Dédié 24/7',
      createdAt: new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString(),
    },
  ],
  agent_code_reviewer: [
    {
      docId: 'doc_sec_checklist_txt',
      agentId: 'agent_code_reviewer',
      name: 'Procedure_Securite_PR_CodeReview.txt',
      fileType: 'txt',
      sizeBytes: 19400,
      summary:
        'Règles d’audit de code : interdiction de clés API en clair, validation stricte des règles Firestore et tests unitaires obligatoires.',
      content:
        'PROCÉDURE INTERNE REVUE DE CODE & SÉCURITÉ PR\n- Règle 1 : Aucune clé secrète (GEMINI_API_KEY, GitHub PAT, Notion Secret) ne doit jamais être exposée côté client.\n- Règle 2 : Toute écriture Firestore doit valider ownerId == request.auth.uid.\n- Règle 3 : Toute action destructive sur Google Workspace (gmail.send, docs) exige une boîte de confirmation explicite.',
      createdAt: new Date(Date.now() - 10 * 60 * 60 * 1000).toISOString(),
    },
  ],
  agent_youtube_scout: [
    {
      docId: 'doc_editorial_guide_txt',
      agentId: 'agent_youtube_scout',
      name: 'Charte_Editoriale_Veille_IA.txt',
      fileType: 'txt',
      sizeBytes: 11200,
      summary:
        'Format standard des synthèses de veille : 3 points clés exécutifs, sources vérifiées (GitHub, ArXiv, YouTube) et plan d’action.',
      content:
        'CHARTE ÉDITORIALE VEILLE IA & PRODUIT\nChaque rapport transmis à un autre agent ou publié dans Notion/Google Docs doit inclure : 1) Résumé exécutif en 3 phrases, 2) Liens et métriques sources, 3) Recommandation d’implémentation technique pour l’équipe.',
      createdAt: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    },
  ],
};

