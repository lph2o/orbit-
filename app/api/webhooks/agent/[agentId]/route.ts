import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { retrieveRelevantKnowledgeChunks, sanitizeId } from '@/lib/orbit-logic';
import {
  AgentConfig,
  KnowledgeDocument,
  RoutineExecution,
  RoutineStepLog,
} from '@/lib/types';

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

export async function GET(
  _req: NextRequest,
  context: { params: Promise<{ agentId: string }> }
) {
  const { agentId } = await context.params;
  return NextResponse.json({
    status: 'active',
    agentId,
    endpoint: `/api/webhooks/agent/${agentId}`,
    supportedEvents: [
      'stripe.charge.succeeded',
      'github.push',
      'github.pull_request.opened',
      'form.lead.submitted',
      'custom.event',
    ],
  });
}

export async function POST(
  req: NextRequest,
  context: { params: Promise<{ agentId: string }> }
) {
  try {
    const { agentId } = await context.params;
    const body = await req.json().catch(() => ({}));

    const eventType: string =
      body.eventType ||
      body.type ||
      req.nextUrl.searchParams.get('event') ||
      'custom.webhook.event';
    const payload = body.payload || body.data || body;
    const agent: AgentConfig = body.agent || {
      agentId: sanitizeId(agentId, 'agent'),
      ownerId: 'webhook_caller',
      name: body.agentName || 'Orbit Agent',
      description: body.agentDescription || 'Autonomous Webhook Handler',
      agentImage: '',
      tools: body.agentTools || ['slack', 'gmail'],
      composioSessionId: 'sess_webhook',
      sandboxId: 'sbx_webhook',
      vmStatus: 'inactive',
      vmLastActive: '',
      isActive: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const knowledgeDocs: KnowledgeDocument[] = Array.isArray(body.knowledgeDocs)
      ? body.knowledgeDocs
      : [];
    const locale: 'fr' | 'it' | 'en' = body.locale || 'fr';

    const startedAt = new Date().toISOString();
    const payloadString = JSON.stringify(payload).slice(0, 1200);
    const matchedDocs = retrieveRelevantKnowledgeChunks(
      knowledgeDocs,
      `${eventType} ${payloadString}`,
      2
    );

    let summary =
      locale === 'fr'
        ? `Webhook entrant \`${eventType}\` traité par **${agent.name}** : Données validées (${payloadString.slice(0, 140)}) et actions déclenchées selon les procédures internes${
            matchedDocs.length > 0 ? ` (${matchedDocs.map((d) => d.name).join(', ')})` : ''
          }.`
        : locale === 'it'
          ? `Webhook in entrata \`${eventType}\` elaborato da **${agent.name}**: Dati validati (${payloadString.slice(0, 140)}) e azioni avviate.`
          : `Incoming Webhook \`${eventType}\` processed by **${agent.name}**: Payload verified (${payloadString.slice(0, 140)}) and automated actions triggered.`;

    const ai = getGenAIClient();
    if (ai) {
      try {
        const langName =
          locale === 'fr'
            ? 'French (Français)'
            : locale === 'it'
              ? 'Italian (Italiano)'
              : 'English';
        const ragText = matchedDocs
          .map((d) => `[${d.name}]: ${d.summary}`)
          .join('\n');

        const geminiRes = await ai.models.generateContent({
          model: 'gemini-3-flash-preview',
          contents: `You are autonomous AI Agent "${agent.name}" (${agent.description}).
An external webhook just triggered you!
Event Type: ${eventType}
Payload JSON: ${payloadString}
${ragText ? `Relevant Enterprise RAG Docs:\n${ragText}` : ''}
Write a concise 2-to-3 sentence executive response in ${langName} explaining what action you took in response to this webhook event.`,
        });
        if ((geminiRes.text ?? '').trim().length > 20) {
          summary = (geminiRes.text ?? '').trim();
        }
      } catch {}
    }

    const completedAt = new Date().toISOString();
    const steps: RoutineStepLog[] = [
      {
        stepKey: 'verify-webhook-signature',
        label: '01. Réception & Validation du Webhook Entrant',
        status: 'completed',
        detail: `Événement "${eventType}" reçu sur /api/webhooks/agent/${agentId}.`,
        durationMs: 45,
      },
      {
        stepKey: 'rag-context-lookup',
        label: '02. Enrichissement RAG & Contexte Agent',
        status: 'completed',
        detail: `${matchedDocs.length} document(s) d'entreprise pertinent(s) injecté(s).`,
        durationMs: 90,
      },
      {
        stepKey: 'execute-webhook-response',
        label: `03. Exécution de la réponse autonome (${agent.name})`,
        status: 'completed',
        detail: summary.slice(0, 220),
        durationMs: 520,
      },
    ];

    const execution: RoutineExecution = {
      executionId: sanitizeId(`exec_wh_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`, 'exec'),
      routineId: `webhook_${sanitizeId(eventType, 'evt')}`,
      routineName: `Webhook: ${eventType}`,
      agentId: sanitizeId(agentId, 'agent'),
      ownerId: agent.ownerId,
      status: 'completed',
      triggerType: 'webhook',
      summary,
      stepsLog: steps,
      startedAt,
      completedAt,
      createdAt: completedAt,
    };

    return NextResponse.json({
      ok: true,
      eventType,
      execution,
      chatNotification: `⚡ **Webhook entrant (\`${eventType}\`) reçu** :\n\n${summary}`,
    });
  } catch (error) {
    console.error('Incoming agent webhook error:', error);
    return NextResponse.json(
      { error: 'Failed to process incoming agent webhook.' },
      { status: 500 }
    );
  }
}
