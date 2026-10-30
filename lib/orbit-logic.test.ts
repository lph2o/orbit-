import test from 'node:test';
import assert from 'node:assert/strict';
import {
  analyzeUserPromptFallback,
  buildDiceBearAvatarUrl,
  computeNextRunAt,
  filterThreeDayHistory,
  getRemainingVmSeconds,
  isGoogleWorkspaceTool,
  isRoutineDue,
  shouldAutoPauseVm,
  simulateRoutineExecutionSteps,
} from './orbit-logic';
import { getDictionary } from './i18n';
import { AgentConfig, AgentRoutine } from './types';

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

