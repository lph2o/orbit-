import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AGENT_TEMPLATE_PRESETS,
  analyzeUserPromptFallback,
  buildAgentStudioDirective,
  buildDiceBearAvatarUrl,
  buildRawMimeEmail,
  buildRichToolResponse,
  buildVmActionTrace,
  computeNextRunAt,
  computeWorkspaceAnalytics,
  createDefaultEventTriggers,
  extractCleanVmSearchQuery,
  filterThreeDayHistory,
  formatReadableVmUrl,
  formatResponseForExport,
  getAgentAutonomyBadge,
  getAgentModelDisplayName,
  getAgentToneLabel,
  getRemainingVmSeconds,
  isContinuationInput,
  isGoogleWorkspaceTool,
  isRoutineDue,
  parseCsvDocumentContent,
  resolveMultiTurnPrompt,
  retrieveRelevantKnowledgeChunks,
  shouldAutoPauseVm,
  simulateRoutineExecutionSteps,
  TOOL_CATALOG,
} from './orbit-logic';
import { getDictionary } from './i18n';
import { AgentConfig, AgentRoutine, KnowledgeDocument } from './types';

const sampleAgent: AgentConfig = {
  agentId: 'agent_mickey_01',
  ownerId: 'user_demo_01',
  name: 'Mickey',
  description: 'Automates daily Gmail unread email summaries and Slack team briefings.',
  agentImage: buildDiceBearAvatarUrl('mickey-seed'),
  tools: ['gmail', 'slack'],
  composioSessionId: 'sess_mickey_9921',
  sandboxId: 'sbx_e2b_mickey_01',
  vmStatus: 'active',
  vmLastActive: '2026-10-30T20:00:00.000Z',
  isActive: true,
  createdAt: '2026-10-30T18:00:00.000Z',
  updatedAt: '2026-10-30T20:00:00.000Z',
};

test('buildDiceBearAvatarUrl generates valid DiceBear glass URL', () => {
  const url = buildDiceBearAvatarUrl('mickey-123');
  assert.equal(url, 'https://api.dicebear.com/9.x/glass/svg?seed=mickey-123');
});

test('shouldAutoPauseVm enforces 2-minute (120s) inactivity threshold', () => {
  const startMs = Date.parse('2026-10-30T20:00:00.000Z');
  assert.equal(shouldAutoPauseVm('active', '2026-10-30T20:00:00.000Z', startMs + 60_000), false);
  assert.equal(shouldAutoPauseVm('active', '2026-10-30T20:00:00.000Z', startMs + 120_000), true);
  assert.equal(getRemainingVmSeconds('active', '2026-10-30T20:00:00.000Z', startMs + 45_000), 75);
});

test('filterThreeDayHistory retains records within 72h and drops older records', () => {
  const nowMs = Date.parse('2026-10-30T20:00:00.000Z');
  const items = [
    { id: 'recent', createdAt: '2026-10-29T12:00:00.000Z' },
    { id: 'expired', createdAt: '2026-10-25T12:00:00.000Z' },
  ];
  const filtered = filterThreeDayHistory(items, nowMs);
  assert.equal(filtered.length, 1);
  assert.equal(filtered[0].id, 'recent');
});

test('computeNextRunAt calculates next daily occurrence cleanly', () => {
  const baseDate = new Date('2026-10-30T15:00:00.000Z');
  const nextIso = computeNextRunAt('daily', '08:00', ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'], baseDate);
  const nextDate = new Date(nextIso);
  assert.equal(nextDate.getTime() > baseDate.getTime(), true);
});

test('analyzeUserPromptFallback handles tool connection, clarification, routine, and VM action intents across EN/FR/IT', () => {
  // 1. Unconnected tool request triggers tool_connection
  const unconnectedAgent: AgentConfig = { ...sampleAgent, tools: [] };
  const connRes = analyzeUserPromptFallback(
    'Send email summary of top 5 unread emails to my Slack channel every day at 8:00 AM',
    unconnectedAgent,
    'America/Los_Angeles',
    null,
    'en'
  );
  assert.equal(connRes.type, 'tool_connection');
  assert.equal((connRes.suggestedTools?.length ?? 0) >= 2, true);

  // 2. Connected tools + Slack routine with channel triggers routine creation card in French
  const routineResFr = analyzeUserPromptFallback(
    'Envoie un résumé des 5 e-mails non lus sur #new-channel dans Slack tous les jours à 08:00 AM',
    sampleAgent,
    'Europe/Paris',
    null,
    'fr'
  );
  assert.equal(routineResFr.type, 'routine');
  assert.equal(routineResFr.routine?.targetChannel, '#new-channel');
  assert.equal(routineResFr.routine?.time, '08:00');

  // 3. Connected tools + Slack routine in Italian
  const routineResIt = analyzeUserPromptFallback(
    'Invia un riepilogo delle prime 5 email non lette su #general in Slack ogni giorno alle 08:00 AM',
    sampleAgent,
    'Europe/Rome',
    null,
    'it'
  );
  assert.equal(routineResIt.type, 'routine');
  assert.equal(routineResIt.routine?.targetChannel, '#general');

  // 4. VM Desktop Google News request triggers vm_action
  const vmRes = analyzeUserPromptFallback(
    'Give me top 5 AI news from Google News using VM desktop',
    sampleAgent,
    'America/Los_Angeles',
    null,
    'fr'
  );
  assert.equal(vmRes.type, 'vm_action');
  assert.equal((vmRes.vmTrace?.extractedItems.length ?? 0) >= 5, true);
});

test('getDictionary returns complete FR, IT, and EN translations', () => {
  const fr = getDictionary('fr');
  const it = getDictionary('it');
  const en = getDictionary('en');
  assert.equal(fr.sidebar.createAgent, 'Créer un agent');
  assert.equal(it.sidebar.createAgent, 'Crea Agente');
  assert.equal(en.sidebar.createAgent, 'Create Agent');
});

test('simulateRoutineExecutionSteps produces 5 completed Inngest step logs in FR/IT/EN', () => {
  const routine: AgentRoutine = {
    routineId: 'routine_01',
    agentId: sampleAgent.agentId,
    ownerId: sampleAgent.ownerId,
    name: 'Daily Unread Email Summary to Slack',
    goal: 'Summarize top 5 unread emails to #new-channel',
    instructions: 'Fetch top 5 unread emails from Gmail and post to #new-channel on Slack.',
    frequency: 'daily',
    time: '08:00',
    timezone: 'America/Los_Angeles',
    days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    tools: ['gmail', 'slack'],
    targetChannel: '#new-channel',
    isActive: true,
    nextRunAt: '2026-10-31T15:00:00.000Z',
    lastRunAt: '2026-10-30T15:00:00.000Z',
    createdAt: '2026-10-30T10:00:00.000Z',
    updatedAt: '2026-10-30T15:00:00.000Z',
  };
  const { steps, summary } = simulateRoutineExecutionSteps(routine, sampleAgent, 'fr');
  assert.equal(steps.length, 5);
  assert.equal(steps.every((s) => s.status === 'completed'), true);
  assert.match(summary, /#new-channel/);
});

test('isRoutineDue and isGoogleWorkspaceTool evaluate scheduled due dates and Workspace slugs', () => {
  const nowMs = Date.parse('2026-10-30T15:00:00.000Z');
  assert.equal(
    isRoutineDue(
      { isActive: true, nextRunAt: '2026-10-30T14:59:50.000Z', lastRunAt: '' },
      nowMs
    ),
    true
  );
  assert.equal(
    isRoutineDue(
      { isActive: false, nextRunAt: '2026-10-30T14:59:50.000Z', lastRunAt: '' },
      nowMs
    ),
    false
  );
  assert.equal(
    isRoutineDue(
      { isActive: true, nextRunAt: '2026-10-30T15:05:00.000Z', lastRunAt: '' },
      nowMs
    ),
    false
  );
  assert.equal(isGoogleWorkspaceTool('gmail'), true);
  assert.equal(isGoogleWorkspaceTool('google_calendar'), true);
  assert.equal(isGoogleWorkspaceTool('google_docs'), true);
  assert.equal(isGoogleWorkspaceTool('google_sheets'), true);
  assert.equal(isGoogleWorkspaceTool('slack'), false);
});

test('RAG knowledge retrieval, CSV parser, MIME email builder, and Workspace Analytics work accurately', () => {
  const docs: KnowledgeDocument[] = [
    {
      docId: 'doc_1',
      agentId: sampleAgent.agentId,
      name: 'SLA_Policy.pdf',
      fileType: 'pdf',
      sizeBytes: 1200,
      content: 'Les incidents P0 de facturation Stripe doivent être résolus en moins de 15 minutes.',
      summary: 'SLA P0 Stripe : 15 minutes.',
      createdAt: '2026-10-30T10:00:00.000Z',
    },
    {
      docId: 'doc_2',
      agentId: sampleAgent.agentId,
      name: 'KPI_Q4.csv',
      fileType: 'csv',
      sizeBytes: 800,
      content: 'Mois,MRR\nOctobre,142000',
      summary: 'MRR Octobre : 142000 EUR.',
      createdAt: '2026-10-30T11:00:00.000Z',
    },
  ];

  const ranked = retrieveRelevantKnowledgeChunks(docs, 'Quel est le SLA pour Stripe P0 ?');
  assert.equal(ranked[0].docId, 'doc_1');

  const csvParsed = parseCsvDocumentContent('Client,Plan,MRR\nAcme,Enterprise,2400\nBeta,Pro,499', 'clients.csv');
  assert.match(csvParsed.summary, /2 ligne/);
  assert.match(csvParsed.content, /Client=Acme/);

  const rawMime = buildRawMimeEmail({
    to: 'client@acme.io',
    subject: 'Synthèse Orbit',
    body: 'Bonjour depuis Orbit AI',
  });
  assert.equal(rawMime.includes('+'), false);
  assert.equal(rawMime.includes('/'), false);

  const analytics = computeWorkspaceAnalytics(
    [sampleAgent],
    { [sampleAgent.agentId]: [] },
    {
      [sampleAgent.agentId]: [
        {
          executionId: 'exec_1',
          routineId: 'rt_1',
          routineName: 'Test Run',
          agentId: sampleAgent.agentId,
          ownerId: sampleAgent.ownerId,
          status: 'completed',
          triggerType: 'webhook',
          summary: 'OK',
          stepsLog: [{ stepKey: 's1', label: 'Step 1', status: 'completed', durationMs: 500 }],
          startedAt: '2026-10-30T10:00:00.000Z',
          completedAt: '2026-10-30T10:00:01.000Z',
          createdAt: '2026-10-30T10:00:01.000Z',
        },
      ],
    },
    { [sampleAgent.agentId]: docs },
    500
  );
  assert.equal(analytics.totalRuns, 1);
  assert.equal(analytics.webhookRuns, 1);
  assert.equal(analytics.totalKnowledgeDocs, 2);
  assert.equal(analytics.successRatePercent, 100);
});

test('extractCleanVmSearchQuery and formatReadableVmUrl strip conversational filler and decode URLs', () => {
  const resFr = extractCleanVmSearchQuery(
    'Donne-moi les 5 dernières actualités IA de Google News via le Cloud VM',
    'fr'
  );
  assert.equal(resFr.cleanQuery, 'Intelligence Artificielle');
  assert.equal(resFr.isDirectUrl, false);

  const resUrl = extractCleanVmSearchQuery(
    'https://news.google.com/search?q=Donne-moi%20les%205%20derni%C3%A8res%20actualit%C3%A9s%20IA%20de%20Google%20News%20via%20le%20Cloud%20VM&hl=fr',
    'fr'
  );
  assert.equal(resUrl.cleanQuery, 'Intelligence Artificielle');

  const resDirect = extractCleanVmSearchQuery('https://news.ycombinator.com', 'fr');
  assert.equal(resDirect.isDirectUrl, true);
  assert.equal(resDirect.directUrl, 'https://news.ycombinator.com');

  const trace = buildVmActionTrace(
    'Donne-moi les 5 dernières actualités IA de Google News via le Cloud VM',
    'fr'
  );
  assert.equal(trace.title, 'Google News (FR) — Intelligence Artificielle');
  assert.equal(trace.extractedItems.length, 5);
  assert.equal(
    formatReadableVmUrl(trace.url),
    'https://news.google.com/search?q=Intelligence Artificielle&hl=fr'
  );
});

test('multi-turn continuation ("continue") after tool connection and French plural Slack query ("canaux") work logically', () => {
  const initialPrompt =
    'Envoie un résumé des 5 e-mails non lus sur #new-channel dans Slack tous les jours à 8:00 AM';

  // 1. Agent initially has no connected tools -> returns tool_connection
  const agentNoTools: AgentConfig = { ...sampleAgent, name: 'LPH2a', tools: [] };
  const step1 = analyzeUserPromptFallback(
    initialPrompt,
    agentNoTools,
    'Europe/Paris',
    null,
    'fr',
    [],
    [{ role: 'user', content: initialPrompt }]
  );
  assert.equal(step1.type, 'tool_connection');
  assert.equal(step1.suggestedTools?.length, 2);

  // 2. User connects Slack & Gmail, then types "continue" -> resolves prior prompt and returns routine card
  const agentConnected: AgentConfig = {
    ...agentNoTools,
    tools: ['slack', 'gmail'],
  };
  const history = [
    { role: 'user', content: initialPrompt },
    { role: 'agent', content: step1.message },
    { role: 'user', content: 'continue' },
  ];

  assert.equal(isContinuationInput('continue'), true);
  assert.equal(resolveMultiTurnPrompt('continue', history), initialPrompt);

  const step2 = analyzeUserPromptFallback(
    'continue',
    agentConnected,
    'Europe/Paris',
    null,
    'fr',
    [],
    history
  );
  assert.equal(step2.type, 'routine');
  assert.equal(step2.routine?.targetChannel, '#new-channel');
  assert.equal(step2.routine?.time, '08:00');
  assert.equal(step2.routine?.frequency, 'daily');

  // 3. Direct French plural Slack channel query ("Liste tous mes canaux Slack") returns active channels, never the welcome menu
  const step3 = analyzeUserPromptFallback(
    'Liste tous mes canaux Slack',
    agentConnected,
    'Europe/Paris',
    null,
    'fr',
    [],
    [...history, { role: 'user', content: 'Liste tous mes canaux Slack' }]
  );
  assert.equal(step3.type, 'message');
  assert.match(step3.message, /#new-channel/);
  assert.match(step3.message, /#general/);
  assert.doesNotMatch(step3.message, /Je peux vous aider avec/);
});

test('Agent Studio options (templates, model, tone, autonomy, memory, triggers, VM timeout, and export) work accurately', () => {
  assert.equal(AGENT_TEMPLATE_PRESETS.length, 4);
  assert.equal(getAgentModelDisplayName('gemini-3.1-pro-preview'), 'Gemini 3.1 Pro');
  assert.equal(getAgentModelDisplayName('gemini-3-flash-preview'), 'Gemini 3 Flash');
  assert.equal(getAgentAutonomyBadge('copilot', 'fr'), 'Mode Copilote');
  assert.equal(getAgentToneLabel('technical', 'fr'), 'Technique / Développeur');

  const studioAgent: AgentConfig = {
    ...sampleAgent,
    model: 'gemini-3.1-pro-preview',
    temperature: 0.4,
    tone: 'technical',
    outputFormat: 'markdown_report',
    autonomyLevel: 'copilot',
    maxDailyActions: 40,
    allowedSlackChannels: '#engineering-alerts',
    memoryNotes: ['Signature : Direction Technique'],
    customVariables: { REPO: 'vercel/next.js' },
    eventTriggers: createDefaultEventTriggers(),
    vmTimeoutMinutes: 15,
  };

  const directive = buildAgentStudioDirective(studioAgent, 'fr');
  assert.match(directive, /gemini-3\.1-pro-preview/);
  assert.match(directive, /Mode Copilote/);
  assert.match(directive, /Signature : Direction Technique/);
  assert.match(directive, /REPO = vercel\/next\.js/);

  // Custom VM timeout (15 min vs Always active 0)
  const startMs = Date.parse('2026-10-30T20:00:00.000Z');
  assert.equal(shouldAutoPauseVm('active', '2026-10-30T20:00:00.000Z', startMs + 5 * 60_000, 15), false);
  assert.equal(shouldAutoPauseVm('active', '2026-10-30T20:00:00.000Z', startMs + 15 * 60_000, 15), true);
  assert.equal(shouldAutoPauseVm('active', '2026-10-30T20:00:00.000Z', startMs + 60 * 60_000, 0), false);
  assert.equal(getRemainingVmSeconds('active', '2026-10-30T20:00:00.000Z', startMs + 60_000, 0), 9999);

  // Markdown and CSV export formatting
  const mdExport = formatResponseForExport('• Point 1\n• Point 2', 'Mickey', 'md');
  assert.match(mdExport.filename, /mickey-rapport/);
  assert.match(mdExport.body, /# Rapport Exécutif — Mickey/);

  const csvExport = formatResponseForExport('Point 1\nPoint 2', 'Mickey', 'csv');
  assert.match(csvExport.filename, /\.csv$/);
  assert.match(csvExport.body, /"Index","Agent","Timestamp","Content"/);
});

test('All 12 tools in TOOL_CATALOG generate rich structured execution reports and chat responses', () => {
  assert.equal(TOOL_CATALOG.length, 12);
  const fullAgent: AgentConfig = {
    ...sampleAgent,
    tools: TOOL_CATALOG.map((tl) => tl.slug),
  };

  for (const tool of TOOL_CATALOG) {
    const { message, report } = buildRichToolResponse(tool.slug, fullAgent, 'fr');
    assert.equal(report.slug, tool.slug);
    assert.equal(report.items.length >= 1, true);
    assert.match(message, new RegExp(tool.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  }

  const linearChat = analyzeUserPromptFallback(
    'Montre mes tickets Linear du sprint',
    fullAgent,
    'Europe/Paris',
    null,
    'fr'
  );
  assert.equal(linearChat.type, 'message');
  assert.match(linearChat.message, /ENG-412/);

  const redditChat = analyzeUserPromptFallback(
    'Quelles sont les discussions sur Reddit ?',
    fullAgent,
    'Europe/Paris',
    null,
    'fr'
  );
  assert.equal(redditChat.type, 'message');
  assert.match(redditChat.message, /upvotes/);
});





