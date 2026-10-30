import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { computeNextRunAt, simulateRoutineExecutionSteps } from '@/lib/orbit-logic';
import { Locale } from '@/lib/i18n';
import { AgentConfig, AgentRoutine, RoutineExecution } from '@/lib/types';
import {
  fetchLiveCalendarEvents,
  fetchLiveGmailMessages,
  LiveCalendarEvent,
  LiveGmailMessage,
  postToSlackWebhook,
} from '@/lib/workspace-server';

function getGenAIClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.trim() === '') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('Authorization');
    const body = await req.json();
    const {
      routine,
      agent,
      triggerType = 'manual',
      locale = 'fr',
      slackWebhookUrl,
    }: {
      routine: AgentRoutine;
      agent: AgentConfig;
      triggerType?: 'manual' | 'scheduled';
      locale?: Locale;
      slackWebhookUrl?: string;
    } = body;

    if (!routine || !agent) {
      return NextResponse.json(
        { error: 'Missing routine or agent configuration for Inngest execution.' },
        { status: 400 }
      );
    }

    const startedAt = new Date().toISOString();
    const { steps, summary: defaultSummary } = simulateRoutineExecutionSteps(
      routine,
      agent,
      locale
    );

    // 1. Fetch live Google Workspace data if Bearer token is provided
    let liveGmail: LiveGmailMessage[] = [];
    let liveCalendar: LiveCalendarEvent[] = [];

    const allTools = new Set([...(routine.tools || []), ...(agent.tools || [])]);

    if (authHeader && authHeader.startsWith('Bearer ')) {
      const fetchStart = Date.now();
      if (allTools.has('gmail')) {
        try {
          liveGmail = await fetchLiveGmailMessages(authHeader, 5);
        } catch (err) {
          console.warn('Live Gmail fetch skipped during routine run:', err);
        }
      }
      if (allTools.has('google_calendar')) {
        try {
          liveCalendar = await fetchLiveCalendarEvents(authHeader, 5);
        } catch (err) {
          console.warn('Live Calendar fetch skipped during routine run:', err);
        }
      }

      if (liveGmail.length > 0 || liveCalendar.length > 0) {
        const stepIdx = steps.findIndex((s) => s.stepKey === 'execute-agent-tool-workflow');
        if (stepIdx !== -1) {
          steps[stepIdx].durationMs = Math.max(250, Date.now() - fetchStart);
          steps[stepIdx].detail =
            locale === 'fr'
              ? `Données Google Workspace réelles récupérées via OAuth : ${liveGmail.length} e-mail(s) Gmail et ${liveCalendar.length} événement(s) Google Calendar.`
              : locale === 'it'
                ? `Dati Google Workspace reali recuperati tramite OAuth: ${liveGmail.length} email Gmail e ${liveCalendar.length} eventi Google Calendar.`
                : `Fetched live Google Workspace data via OAuth: ${liveGmail.length} Gmail message(s) and ${liveCalendar.length} Google Calendar event(s).`;
        }
      }
    }

    // 2. Synthesize summary with Gemini 3 Flash
    let finalSummary = defaultSummary;
    if (liveGmail.length > 0) {
      const subjects = liveGmail
        .map((m, idx) => `${idx + 1}. ${m.subject} (${m.from.split('<')[0].trim()})`)
        .join(', ');
      finalSummary =
        locale === 'fr'
          ? `Routine "${routine.name}" terminée (Gmail OAuth en direct) : ${liveGmail.length} e-mails analysés (${subjects}) et synthèse préparée pour ${routine.targetChannel || '#new-channel'}.`
          : locale === 'it'
            ? `Routine "${routine.name}" completata (Gmail OAuth live): ${liveGmail.length} email analizzate (${subjects}) e riepilogo preparato per ${routine.targetChannel || '#new-channel'}.`
            : `Completed "${routine.name}" (Live Gmail OAuth): Analyzed ${liveGmail.length} emails (${subjects}) and prepared digest for ${routine.targetChannel || '#new-channel'}.`;
    }

    const ai = getGenAIClient();
    if (ai) {
      try {
        const langName =
          locale === 'fr'
            ? 'French (Français)'
            : locale === 'it'
              ? 'Italian (Italiano)'
              : 'English';

        const workspaceContext = [
          liveGmail.length > 0
            ? `Live Gmail Inbox Messages:\n${liveGmail
                .map((m, i) => `${i + 1}. Subject: ${m.subject} | From: ${m.from} | Snippet: ${m.snippet}`)
                .join('\n')}`
            : '',
          liveCalendar.length > 0
            ? `Live Google Calendar Events:\n${liveCalendar
                .map((e, i) => `${i + 1}. Event: ${e.summary} | Start: ${e.start}`)
                .join('\n')}`
            : '',
        ]
          .filter(Boolean)
          .join('\n\n');

        const geminiRes = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `Execute this scheduled agent routine and generate a concise, executive 2-to-3 sentence digest in ${langName}.
Agent: ${agent.name}
Routine Name: ${routine.name}
Routine Goal: ${routine.goal}
Routine Instructions: ${routine.instructions}
Connected Tools: ${routine.tools.join(', ') || 'Cloud VM Browser'}
Target Channel: ${routine.targetChannel || '#new-channel'}
${workspaceContext ? `\nREAL USER WORKSPACE DATA:\n${workspaceContext}` : ''}`,
        });
        const text = (geminiRes.text ?? '').trim();
        if (text.length > 20) {
          finalSummary = text;
        }
      } catch {
        // Keep deterministic/live summary if Gemini call times out
      }
    }

    // 3. Deliver to real Slack Incoming Webhook if configured
    let slackDelivered = false;
    if (
      slackWebhookUrl &&
      slackWebhookUrl.trim().startsWith('https://hooks.slack.com/') &&
      allTools.has('slack')
    ) {
      try {
        const res = await postToSlackWebhook(
          slackWebhookUrl,
          `*[Orbit Agent: ${agent.name} — ${routine.name}]*\n${finalSummary}`
        );
        slackDelivered = res.delivered;
        if (slackDelivered) {
          const finalizeIdx = steps.findIndex((s) => s.stepKey === 'finalize-execution');
          if (finalizeIdx !== -1) {
            steps[finalizeIdx].detail =
              locale === 'fr'
                ? `Synthèse publiée en direct sur le Webhook Slack (${routine.targetChannel || '#new-channel'}) et enregistrée dans l'historique.`
                : locale === 'it'
                  ? `Riepilogo pubblicato dal vivo sul Webhook Slack (${routine.targetChannel || '#new-channel'}) e salvato nella cronologia.`
                  : `Digest delivered live to Slack Webhook (${routine.targetChannel || '#new-channel'}) and saved to execution history.`;
          }
        }
      } catch (err) {
        console.warn('Slack webhook delivery skipped:', err);
      }
    }

    const completedAt = new Date().toISOString();

    const execution: RoutineExecution = {
      executionId: `exec_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      routineId: routine.routineId,
      routineName: routine.name,
      agentId: agent.agentId,
      ownerId: agent.ownerId,
      status: 'completed',
      triggerType,
      summary: finalSummary,
      stepsLog: steps,
      startedAt,
      completedAt,
      createdAt: completedAt,
    };

    const nextRunAt = computeNextRunAt(routine.frequency, routine.time, routine.days, new Date());

    const notifPrefix =
      locale === 'fr'
        ? `Routine **${routine.name}** (${triggerType === 'manual' ? 'exécution manuelle' : 'exécution planifiée automatique'}) terminée :`
        : locale === 'it'
          ? `Routine **${routine.name}** (${triggerType === 'manual' ? 'esecuzione manuale' : 'esecuzione pianificata automatica'}) completata:`
          : `Routine **${routine.name}** (${triggerType} run) completed:`;

    return NextResponse.json({
      execution,
      nextRunAt,
      lastRunAt: completedAt,
      chatNotification: `${notifPrefix}\n\n${finalSummary}`,
      liveWorkspaceUsed: liveGmail.length > 0 || liveCalendar.length > 0,
      slackDelivered,
    });
  } catch (error) {
    console.error('Inngest routine execution error:', error);
    return NextResponse.json(
      { error: 'Failed to execute routine background job.' },
      { status: 500 }
    );
  }
}
